import { Injectable } from '@angular/core';

const PRIVATE_JWK_KEY = 'zingo_e2ee_private_jwk';
const PUBLIC_JWK_KEY = 'zingo_e2ee_public_jwk';
const PREFIX = 'enc:v1:';

@Injectable({ providedIn: 'root' })
export class E2eeService {
  async ensureLocalPublicKey(): Promise<string> {
    const { publicJwk } = await this.getOrCreateKeyPair();
    return JSON.stringify(publicJwk);
  }

  async encryptForConversation(plainText: string, remotePublicJwkString: string, conversationId: number): Promise<string> {
    const { privateKey } = await this.getOrCreateKeyPair();
    const remotePublicKey = await this.importPublicKey(remotePublicJwkString);
    const aesKey = await this.deriveConversationKey(privateKey, remotePublicKey, conversationId);
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

    const { privateKey } = await this.getOrCreateKeyPair();
    const remotePublicKey = await this.importPublicKey(remotePublicJwkString);
    const aesKey = await this.deriveConversationKey(privateKey, remotePublicKey, conversationId);
    const plainBuffer = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: this.fromBase64(payload.iv) },
      aesKey,
      this.fromBase64(payload.ct)
    );
    return new TextDecoder().decode(plainBuffer);
  }

  private async deriveConversationKey(privateKey: CryptoKey, remotePublicKey: CryptoKey, conversationId: number): Promise<CryptoKey> {
    const sharedBits = await crypto.subtle.deriveBits({ name: 'ECDH', public: remotePublicKey }, privateKey, 256);
    const convBytes = new TextEncoder().encode(String(conversationId));
    const mix = new Uint8Array(sharedBits.byteLength + convBytes.byteLength);
    mix.set(new Uint8Array(sharedBits), 0);
    mix.set(convBytes, sharedBits.byteLength);
    const digest = await crypto.subtle.digest('SHA-256', mix);
    return crypto.subtle.importKey('raw', digest, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']);
  }

  private async getOrCreateKeyPair(): Promise<{ privateKey: CryptoKey; publicJwk: JsonWebKey }> {
    const storedPrivate = this.readStorage(PRIVATE_JWK_KEY);
    const storedPublic = this.readStorage(PUBLIC_JWK_KEY);
    if (storedPrivate && storedPublic) {
      const privateJwk = JSON.parse(storedPrivate) as JsonWebKey;
      const publicJwk = JSON.parse(storedPublic) as JsonWebKey;
      const privateKey = await crypto.subtle.importKey('jwk', privateJwk, { name: 'ECDH', namedCurve: 'P-256' }, true, [
        'deriveBits'
      ]);
      return { privateKey, publicJwk };
    }

    const keyPair = await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']);
    const privateJwk = await crypto.subtle.exportKey('jwk', keyPair.privateKey);
    const publicJwk = await crypto.subtle.exportKey('jwk', keyPair.publicKey);
    this.writeStorage(PRIVATE_JWK_KEY, JSON.stringify(privateJwk));
    this.writeStorage(PUBLIC_JWK_KEY, JSON.stringify(publicJwk));
    return { privateKey: keyPair.privateKey, publicJwk };
  }

  private async importPublicKey(publicJwkString: string): Promise<CryptoKey> {
    const publicJwk = JSON.parse(publicJwkString) as JsonWebKey;
    return crypto.subtle.importKey('jwk', publicJwk, { name: 'ECDH', namedCurve: 'P-256' }, true, []);
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
