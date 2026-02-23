import { Injectable } from '@angular/core';

const PRIVATE_JWK_KEY = 'zingo_e2ee_private_jwk';
const PUBLIC_JWK_KEY = 'zingo_e2ee_public_jwk';
const PREFIX = 'enc:v1:';
const PRIVATE_BUNDLE_PREFIX = 'pke:v1:';
const PASSWORD_KEY_ITERATIONS = 250000;

type KeyPairState = { privateKey: CryptoKey; publicJwk: JsonWebKey; privateJwk: JsonWebKey };
type KeySyncResult = { publicJwk: string; encryptedPrivateKey: string; keySalt: string };

@Injectable({ providedIn: 'root' })
export class E2eeService {
  private keyPairPromise?: Promise<KeyPairState>;
  private publicKeyCache = new Map<string, Promise<CryptoKey>>();
  private aesKeyCache = new Map<string, Promise<CryptoKey>>();

  async ensureLocalPublicKey(): Promise<string> {
    const { publicJwk } = await this.getOrCreateKeyPair();
    return JSON.stringify(publicJwk);
  }

  async syncKeysForPassword(
    password: string,
    remotePublicJwkString?: string | null,
    remoteEncryptedPrivateKey?: string | null,
    remoteKeySalt?: string | null
  ): Promise<KeySyncResult> {
    let keyPair = await this.getStoredKeyPair();
    const localPublicJwkString = keyPair ? JSON.stringify(keyPair.publicJwk) : null;
    if (remoteEncryptedPrivateKey && remoteKeySalt && remotePublicJwkString) {
      const localMatchesRemote = localPublicJwkString === remotePublicJwkString;
      if (!keyPair || !localMatchesRemote) {
        const restored = await this.tryRestoreKeyPairFromRemote(password, remoteEncryptedPrivateKey, remoteKeySalt);
        if (restored) {
          keyPair = restored;
        }
      }
    }
    if (!keyPair) {
      keyPair = await this.loadOrCreateKeyPair();
    }
    this.keyPairPromise = Promise.resolve(keyPair);
    this.aesKeyCache.clear();

    const keySalt = remoteKeySalt || this.toBase64(crypto.getRandomValues(new Uint8Array(16)));
    const encryptedPrivateKey = await this.encryptPrivateJwk(password, keyPair.privateJwk, keySalt);
    return {
      publicJwk: JSON.stringify(keyPair.publicJwk),
      encryptedPrivateKey,
      keySalt
    };
  }

  async encryptForConversation(plainText: string, remotePublicJwkString: string, conversationId: number): Promise<string> {
    const aesKey = await this.getConversationKey(remotePublicJwkString, conversationId);
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encoded = new TextEncoder().encode(plainText);
    const cipherBuffer = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, aesKey, encoded);
    const payload = JSON.stringify({
      iv: this.toBase64(iv),
      ct: this.toBase64(new Uint8Array(cipherBuffer))
    });
    return PREFIX + this.toBase64(new TextEncoder().encode(payload));
  }

  async decryptFromConversation(text: string, remotePublicJwkString: string, conversationId: number): Promise<string> {
    if (!text.startsWith(PREFIX)) {
      return text;
    }
    const encodedPayload = text.slice(PREFIX.length);
    const payloadJson = new TextDecoder().decode(this.fromBase64(encodedPayload));
    const payload = JSON.parse(payloadJson) as { iv: string; ct: string };

    const aesKey = await this.getConversationKey(remotePublicJwkString, conversationId);
    const plainBuffer = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: this.fromBase64(payload.iv) },
      aesKey,
      this.fromBase64(payload.ct)
    );
    return new TextDecoder().decode(plainBuffer);
  }

  private async getConversationKey(remotePublicJwkString: string, conversationId: number): Promise<CryptoKey> {
    const cacheKey = `${conversationId}:${remotePublicJwkString}`;
    let promise = this.aesKeyCache.get(cacheKey);
    if (!promise) {
      promise = this.deriveConversationKey(remotePublicJwkString, conversationId);
      this.aesKeyCache.set(cacheKey, promise);
    }
    return promise;
  }

  private async deriveConversationKey(remotePublicJwkString: string, conversationId: number): Promise<CryptoKey> {
    const { privateKey } = await this.getOrCreateKeyPair();
    const remotePublicKey = await this.importPublicKey(remotePublicJwkString);
    const sharedBits = await crypto.subtle.deriveBits({ name: 'ECDH', public: remotePublicKey }, privateKey, 256);
    const convBytes = new TextEncoder().encode(String(conversationId));
    const mix = new Uint8Array(sharedBits.byteLength + convBytes.byteLength);
    mix.set(new Uint8Array(sharedBits), 0);
    mix.set(convBytes, sharedBits.byteLength);
    const digest = await crypto.subtle.digest('SHA-256', mix);
    return crypto.subtle.importKey('raw', digest, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']);
  }

  private async getOrCreateKeyPair(): Promise<KeyPairState> {
    if (this.keyPairPromise) {
      return this.keyPairPromise;
    }
    this.keyPairPromise = this.loadOrCreateKeyPair();
    return this.keyPairPromise;
  }

  private async loadOrCreateKeyPair(): Promise<KeyPairState> {
    const stored = await this.getStoredKeyPair();
    if (stored) {
      return stored;
    }

    const keyPair = await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']);
    const privateJwk = await crypto.subtle.exportKey('jwk', keyPair.privateKey);
    const publicJwk = await crypto.subtle.exportKey('jwk', keyPair.publicKey);
    const state: KeyPairState = { privateKey: keyPair.privateKey, publicJwk, privateJwk };
    this.persistKeyPair(state);
    return state;
  }

  private async getStoredKeyPair(): Promise<KeyPairState | null> {
    const storedPrivate = this.readStorage(PRIVATE_JWK_KEY);
    const storedPublic = this.readStorage(PUBLIC_JWK_KEY);
    if (!storedPrivate || !storedPublic) {
      return null;
    }
    try {
      const privateJwk = JSON.parse(storedPrivate) as JsonWebKey;
      const publicJwk = JSON.parse(storedPublic) as JsonWebKey;
      const privateKey = await crypto.subtle.importKey('jwk', privateJwk, { name: 'ECDH', namedCurve: 'P-256' }, true, [
        'deriveBits'
      ]);
      return { privateKey, publicJwk, privateJwk };
    } catch {
      return null;
    }
  }

  private persistKeyPair(state: KeyPairState) {
    this.writeStorage(PRIVATE_JWK_KEY, JSON.stringify(state.privateJwk));
    this.writeStorage(PUBLIC_JWK_KEY, JSON.stringify(state.publicJwk));
  }

  private async tryRestoreKeyPairFromRemote(
    password: string,
    remoteEncryptedPrivateKey: string,
    remoteKeySalt: string
  ): Promise<KeyPairState | null> {
    try {
      const privateJwk = await this.decryptPrivateJwk(password, remoteEncryptedPrivateKey, remoteKeySalt);
      const privateKey = await crypto.subtle.importKey('jwk', privateJwk, { name: 'ECDH', namedCurve: 'P-256' }, true, [
        'deriveBits'
      ]);
      const publicJwk = this.toPublicJwk(privateJwk);
      const state: KeyPairState = { privateKey, publicJwk, privateJwk };
      this.persistKeyPair(state);
      return state;
    } catch {
      return null;
    }
  }

  private toPublicJwk(privateJwk: JsonWebKey): JsonWebKey {
    const { kty, crv, x, y } = privateJwk;
    return { kty, crv, x, y };
  }

  private async encryptPrivateJwk(password: string, privateJwk: JsonWebKey, saltBase64: string): Promise<string> {
    const salt = this.fromBase64(saltBase64);
    const wrappingKey = await this.derivePasswordWrappingKey(password, salt, ['encrypt']);
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encoded = new TextEncoder().encode(JSON.stringify(privateJwk));
    const cipherBuffer = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, wrappingKey, encoded);
    const payload = JSON.stringify({
      iv: this.toBase64(iv),
      ct: this.toBase64(new Uint8Array(cipherBuffer))
    });
    return PRIVATE_BUNDLE_PREFIX + this.toBase64(new TextEncoder().encode(payload));
  }

  private async decryptPrivateJwk(password: string, encryptedPrivateJwk: string, saltBase64: string): Promise<JsonWebKey> {
    if (!encryptedPrivateJwk.startsWith(PRIVATE_BUNDLE_PREFIX)) {
      throw new Error('Unsupported private key bundle format');
    }
    const salt = this.fromBase64(saltBase64);
    const wrappingKey = await this.derivePasswordWrappingKey(password, salt, ['decrypt']);
    const payloadBase64 = encryptedPrivateJwk.slice(PRIVATE_BUNDLE_PREFIX.length);
    const payloadJson = new TextDecoder().decode(this.fromBase64(payloadBase64));
    const payload = JSON.parse(payloadJson) as { iv: string; ct: string };
    const plainBuffer = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: this.fromBase64(payload.iv) },
      wrappingKey,
      this.fromBase64(payload.ct)
    );
    const privateJwkJson = new TextDecoder().decode(new Uint8Array(plainBuffer));
    return JSON.parse(privateJwkJson) as JsonWebKey;
  }

  private async derivePasswordWrappingKey(
    password: string,
    salt: Uint8Array,
    usages: KeyUsage[]
  ): Promise<CryptoKey> {
    const passwordBytes = new TextEncoder().encode(password);
    const baseKey = await crypto.subtle.importKey('raw', passwordBytes, 'PBKDF2', false, ['deriveKey']);
    return crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt,
        iterations: PASSWORD_KEY_ITERATIONS,
        hash: 'SHA-256'
      },
      baseKey,
      { name: 'AES-GCM', length: 256 },
      false,
      usages
    );
  }

  private async importPublicKey(publicJwkString: string): Promise<CryptoKey> {
    let promise = this.publicKeyCache.get(publicJwkString);
    if (!promise) {
      promise = (async () => {
        const publicJwk = JSON.parse(publicJwkString) as JsonWebKey;
        return crypto.subtle.importKey('jwk', publicJwk, { name: 'ECDH', namedCurve: 'P-256' }, true, []);
      })();
      this.publicKeyCache.set(publicJwkString, promise);
    }
    return promise;
  }

  private readStorage(key: string): string | null {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  }

  private writeStorage(key: string, value: string) {
    try {
      localStorage.setItem(key, value);
    } catch {
      // ignore storage write errors
    }
  }

  private toBase64(bytes: Uint8Array): string {
    let binary = '';
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  private fromBase64(value: string): Uint8Array {
    const binary = atob(value);
    const out = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      out[i] = binary.charCodeAt(i);
    }
    return out;
  }
}
