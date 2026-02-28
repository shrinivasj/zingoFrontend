import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '../core/auth.service';
import { ApiService } from '../core/api.service';
import { E2eeService } from '../core/e2ee.service';

type LoginMode = 'password' | 'otp';

@Component({
  selector: 'app-login',
  standalone: true,
  host: {
    '[class.hidden]': 'redirecting'
  },
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule
  ],
  template: `
    <div class="auth-shell">
      <div class="bg-orb orb-1" aria-hidden="true"></div>
      <div class="bg-orb orb-2" aria-hidden="true"></div>
      <div class="bg-orb orb-3" aria-hidden="true"></div>

      <div class="auth-card">
        <div class="hero">
          <img class="logo" src="assets/aurofly-logo.png" alt="aurofly" />
          <p class="eyebrow">Plan together, not alone</p>
          <h1>Welcome back</h1>
          <p class="hero-copy">Jump into lobbies, groups, and chats already waiting for you.</p>
          <div class="chips">
            <span>Live lobby</span>
            <span>Instant group chat</span>
            <span>Verified plans</span>
          </div>
        </div>

        <div class="mode-switch">
          <button type="button" [class.active]="mode === 'password'" (click)="setMode('password')">Password</button>
          <button type="button" [class.active]="mode === 'otp'" (click)="setMode('otp')">Email code</button>
        </div>

        <form *ngIf="mode === 'password'" [formGroup]="form" (ngSubmit)="submitPassword()">
          <mat-form-field appearance="outline" class="field">
            <mat-label>Email</mat-label>
            <input matInput formControlName="email" type="email" name="email" autocomplete="email" />
          </mat-form-field>
          <mat-form-field appearance="outline" class="field">
            <mat-label>Password</mat-label>
            <input
              matInput
              formControlName="password"
              [type]="showPassword ? 'text' : 'password'"
              name="password"
              autocomplete="current-password"
            />
            <button
              mat-icon-button
              matSuffix
              type="button"
              aria-label="Toggle password visibility"
              (click)="togglePassword()"
            >
              <mat-icon>{{ showPassword ? 'visibility_off' : 'visibility' }}</mat-icon>
            </button>
          </mat-form-field>
          <button class="cta" type="submit" [disabled]="form.invalid || loading">
            {{ loading ? 'Signing in...' : 'Login' }}
          </button>
        </form>

        <form *ngIf="mode === 'otp'" [formGroup]="otpForm" (ngSubmit)="otpStep === 'request' ? requestOtp() : verifyOtp()">
          <mat-form-field appearance="outline" class="field">
            <mat-label>Email</mat-label>
            <input matInput formControlName="email" type="email" name="otpEmail" autocomplete="email" />
          </mat-form-field>
          <mat-form-field appearance="outline" class="field" *ngIf="otpStep === 'verify'">
            <mat-label>6-digit code</mat-label>
            <input matInput formControlName="code" inputmode="numeric" maxlength="6" />
          </mat-form-field>
          <mat-form-field appearance="outline" class="field" *ngIf="otpStep === 'verify'">
            <mat-label>Display name (only for new users)</mat-label>
            <input matInput formControlName="displayName" maxlength="80" />
          </mat-form-field>

          <button class="cta" type="submit" [disabled]="otpLoading || otpEmailInvalid() || (otpStep === 'verify' && otpCodeInvalid())">
            {{ otpLoading ? (otpStep === 'request' ? 'Sending code...' : 'Verifying...') : (otpStep === 'request' ? 'Send code' : 'Verify and continue') }}
          </button>

          <button class="secondary-btn" *ngIf="otpStep === 'verify'" type="button" (click)="requestOtp()" [disabled]="otpLoading">
            Resend code
          </button>

          <p class="otp-note" *ngIf="otpMessage">{{ otpMessage }}</p>
          <p class="otp-note dev-code" *ngIf="devOtpCode">Dev code: {{ devOtpCode }}</p>
        </form>

        <p class="error" *ngIf="errorMessage">{{ errorMessage }}</p>

        <div class="divider">
          <span>or</span>
        </div>
        <button class="google-btn" type="button">
          <span class="g">G</span>
          Continue with Google
        </button>
        <p class="muted">New here? <a routerLink="/register">Create an account</a></p>
      </div>
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
        height: 100vh;
        overflow: hidden;
      }
      :host.hidden {
        display: none;
      }
      .auth-shell {
        position: relative;
        height: 100%;
        display: flex;
        justify-content: center;
        align-items: center;
        padding: 24px 16px;
        background: linear-gradient(160deg, #faf8f5 0%, #f6f2ec 46%, #f2eee8 100%);
        box-sizing: border-box;
        overflow: hidden;
      }
      .auth-card {
        position: relative;
        width: min(390px, 100%);
        display: grid;
        gap: 16px;
        padding: 20px 18px 22px;
        border-radius: 28px;
        background: rgba(255, 255, 255, 0.88);
        border: 1px solid rgba(255, 255, 255, 0.75);
        box-shadow:
          0 24px 60px rgba(56, 42, 26, 0.12),
          0 2px 10px rgba(0, 0, 0, 0.05);
        backdrop-filter: blur(14px);
      }
      .hero {
        background: linear-gradient(130deg, rgba(230, 170, 118, 0.16), rgba(201, 145, 96, 0.1));
        border-radius: 20px;
        padding: 14px;
        border: 1px solid rgba(255, 255, 255, 0.65);
      }
      .eyebrow {
        margin: 4px 0 6px;
        font-size: 11px;
        font-weight: 700;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        color: #8b5e34;
      }
      h1 {
        margin: 0;
        font-size: 29px;
        line-height: 1.1;
        font-weight: 800;
        color: #1f1320;
      }
      .hero-copy {
        margin: 8px 0 0;
        font-size: 14px;
        color: rgba(31, 19, 32, 0.72);
      }
      .chips {
        margin-top: 12px;
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
      }
      .chips span {
        font-size: 11px;
        font-weight: 700;
        letter-spacing: 0.01em;
        color: #7b5531;
        background: rgba(255, 255, 255, 0.8);
        padding: 6px 10px;
        border-radius: 999px;
        border: 1px solid rgba(123, 85, 49, 0.16);
      }
      .mode-switch {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 8px;
        background: rgba(88, 60, 34, 0.06);
        border-radius: 14px;
        padding: 4px;
      }
      .mode-switch button {
        border: none;
        background: transparent;
        border-radius: 10px;
        padding: 10px 12px;
        font-weight: 700;
        color: rgba(31, 19, 32, 0.6);
        cursor: pointer;
      }
      .mode-switch button.active {
        background: #ffffff;
        color: #1f1320;
        box-shadow: 0 4px 14px rgba(56, 42, 26, 0.08);
      }
      .auth-card form,
      .auth-card .divider,
      .auth-card .google-btn,
      .auth-card .muted {
        width: 100%;
      }
      form {
        display: grid;
        gap: 10px;
      }
      .logo {
        height: 60px;
        width: auto;
        max-width: 180px;
        display: block;
        margin-bottom: 8px;
        filter: drop-shadow(0 8px 14px rgba(181, 101, 54, 0.18));
      }
      .field {
        background: #fff;
        border-radius: 14px;
      }
      .cta,
      .secondary-btn {
        width: 100%;
        border: none;
        padding: 14px;
        border-radius: 14px;
        font-size: 16px;
        font-weight: 700;
        cursor: pointer;
      }
      .cta {
        margin-top: 6px;
        color: #fff;
        background: linear-gradient(90deg, #ef7d4e 0%, #d8693d 100%);
        box-shadow: 0 12px 24px rgba(185, 95, 49, 0.28);
      }
      .secondary-btn {
        background: rgba(88, 60, 34, 0.08);
        color: #5b3d25;
      }
      .cta:disabled,
      .secondary-btn:disabled {
        opacity: 0.68;
        cursor: not-allowed;
      }
      .error {
        margin: 0;
        color: #d92d20;
        font-size: 13px;
      }
      .otp-note {
        margin: 0;
        font-size: 13px;
        color: rgba(31, 19, 32, 0.68);
      }
      .otp-note.dev-code {
        font-weight: 700;
        color: #8b5e34;
      }
      .divider {
        display: grid;
        grid-template-columns: 1fr auto 1fr;
        align-items: center;
        gap: 12px;
        color: #9b9b9b;
        font-size: 14px;
      }
      .divider::before,
      .divider::after {
        content: '';
        height: 1px;
        background: rgba(0, 0, 0, 0.12);
      }
      .google-btn {
        width: 100%;
        padding: 14px;
        border-radius: 14px;
        border: 1px solid rgba(0, 0, 0, 0.18);
        background: #fff;
        font-weight: 600;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 12px;
        cursor: pointer;
        box-shadow: 0 10px 20px rgba(0, 0, 0, 0.08);
      }
      .g {
        width: 24px;
        height: 24px;
        border-radius: 50%;
        background: #f5f5f5;
        display: grid;
        place-items: center;
        font-weight: 700;
        color: #4285f4;
        font-size: 13px;
      }
      .muted {
        margin: 0;
        text-align: center;
        color: rgba(0, 0, 0, 0.58);
        font-size: 14px;
      }
      .muted a {
        color: #b25d31;
        font-weight: 700;
        text-decoration: none;
      }
      .bg-orb {
        position: absolute;
        border-radius: 999px;
        pointer-events: none;
        filter: blur(2px);
        opacity: 0.55;
      }
      .orb-1 {
        width: 280px;
        height: 280px;
        top: -80px;
        left: -120px;
        background: radial-gradient(circle, rgba(232, 170, 113, 0.35), transparent 70%);
      }
      .orb-2 {
        width: 360px;
        height: 360px;
        bottom: -170px;
        right: -120px;
        background: radial-gradient(circle, rgba(216, 157, 104, 0.30), transparent 70%);
      }
      .orb-3 {
        width: 220px;
        height: 220px;
        top: 30%;
        right: -80px;
        background: radial-gradient(circle, rgba(191, 133, 83, 0.22), transparent 72%);
      }
      :host ::ng-deep .mdc-text-field--outlined {
        border-radius: 14px;
        height: 56px;
      }
      :host ::ng-deep .mdc-notched-outline__leading,
      :host ::ng-deep .mdc-notched-outline__trailing {
        border-color: rgba(0, 0, 0, 0.12) !important;
      }
      :host ::ng-deep .mdc-floating-label {
        color: #9b9b9b !important;
      }
      @media (min-width: 640px) {
        .auth-card {
          padding: 24px;
          gap: 18px;
        }
      }
    `
  ]
})
export class LoginComponent implements OnInit {
  private readonly authTraceEnabled = true;
  loading = false;
  otpLoading = false;
  showPassword = false;
  redirecting = false;
  errorMessage = '';
  mode: LoginMode = 'password';
  otpStep: 'request' | 'verify' = 'request';
  otpMessage = '';
  devOtpCode: string | null = null;
  form = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required]]
  });
  otpForm = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    code: ['', [Validators.minLength(6), Validators.maxLength(6)]],
    displayName: ['', [Validators.maxLength(80)]]
  });

  constructor(
    private fb: FormBuilder,
    private auth: AuthService,
    private api: ApiService,
    private e2ee: E2eeService,
    private router: Router
  ) {}

  ngOnInit() {
    this.traceAuth('ngOnInit', { hasToken: !!this.auth.getToken() });
    if (this.auth.getToken()) {
      this.redirecting = true;
      this.traceAuth('token found on init, redirecting', { to: '/dashboard' });
      this.redirectToDashboard();
    }
  }

  setMode(mode: LoginMode) {
    this.mode = mode;
    this.errorMessage = '';
  }

  submitPassword() {
    this.errorMessage = '';
    const email = (this.form.value.email ?? '').trim();
    const password = (this.form.value.password ?? '').trim();
    this.form.patchValue({ email, password }, { emitEvent: false });
    if (this.form.invalid) {
      this.traceAuth('submit blocked: invalid form');
      this.form.markAllAsTouched();
      return;
    }
    this.loading = true;
    this.traceAuth('login request started', { email });
    this.auth.login(email!, password!).subscribe({
      next: () => {
        this.loading = false;
        this.redirecting = true;
        this.traceAuth('login success, syncing keys', { to: '/dashboard' });
        void this.syncE2eeKeys(password).finally(() => this.redirectToDashboard());
      },
      error: (err) => {
        this.loading = false;
        this.traceAuth('login error', { status: err?.status, message: err?.error?.message || err?.message });
        this.errorMessage = err?.error?.error || err?.error?.message || 'Login failed. Please try again.';
      }
    });
  }

  requestOtp() {
    this.errorMessage = '';
    this.otpMessage = '';
    this.devOtpCode = null;
    const email = (this.otpForm.value.email ?? '').trim();
    this.otpForm.patchValue({ email }, { emitEvent: false });
    if (this.otpEmailInvalid()) {
      this.otpForm.controls.email.markAsTouched();
      return;
    }
    this.otpLoading = true;
    this.auth.requestEmailOtp(email!).subscribe({
      next: (resp) => {
        this.otpLoading = false;
        this.otpStep = 'verify';
        this.otpMessage = `Code sent to ${resp.email}. It expires in ${Math.round(resp.expiresInSeconds / 60)} minutes.`;
        this.devOtpCode = resp.devCode || null;
      },
      error: (err) => {
        this.otpLoading = false;
        this.errorMessage = err?.error?.error || err?.error?.message || 'Could not send code.';
      }
    });
  }

  verifyOtp() {
    this.errorMessage = '';
    this.otpMessage = '';
    const email = (this.otpForm.value.email ?? '').trim();
    const code = (this.otpForm.value.code ?? '').trim();
    const displayName = (this.otpForm.value.displayName ?? '').trim();
    this.otpForm.patchValue({ email, code, displayName }, { emitEvent: false });
    if (this.otpEmailInvalid() || this.otpCodeInvalid()) {
      this.otpForm.markAllAsTouched();
      return;
    }
    this.otpLoading = true;
    this.auth.verifyEmailOtp(email!, code!, displayName || undefined).subscribe({
      next: () => {
        this.otpLoading = false;
        this.redirecting = true;
        this.redirectToDashboard();
      },
      error: (err) => {
        this.otpLoading = false;
        this.errorMessage = err?.error?.error || err?.error?.message || 'Could not verify code.';
      }
    });
  }

  otpEmailInvalid() {
    return !!this.otpForm.controls.email.invalid;
  }

  otpCodeInvalid() {
    const code = (this.otpForm.value.code ?? '').trim();
    return code.length !== 6;
  }

  togglePassword() {
    this.showPassword = !this.showPassword;
  }

  private async syncE2eeKeys(password: string) {
    try {
      const profile = await firstValueFrom(this.api.getProfile());
      const keyState = await this.e2ee.syncKeysForPassword(
        password,
        profile.e2eePublicKey || null,
        profile.e2eeEncryptedPrivateKey || null,
        profile.e2eeKeySalt || null
      );
      const needsUpdate =
        profile.e2eePublicKey !== keyState.publicJwk ||
        profile.e2eeEncryptedPrivateKey !== keyState.encryptedPrivateKey ||
        profile.e2eeKeySalt !== keyState.keySalt;
      if (needsUpdate) {
        await firstValueFrom(
          this.api.updateProfile({
            e2eePublicKey: keyState.publicJwk,
            e2eeEncryptedPrivateKey: keyState.encryptedPrivateKey,
            e2eeKeySalt: keyState.keySalt
          })
        );
      }
      this.traceAuth('e2ee key sync complete');
    } catch (error) {
      this.traceAuth('e2ee key sync failed', { error: String(error) });
    }
  }

  private redirectToDashboard() {
    this.router.navigateByUrl('/dashboard', { replaceUrl: true }).then((navigated) => {
      this.traceAuth('router redirect result', { navigated, url: this.router.url });
      queueMicrotask(() => {
        if (this.router.url.startsWith('/login') || this.router.url.startsWith('/register')) {
          this.traceAuth('forcing hard redirect fallback', { to: '/dashboard' });
          window.location.replace('/dashboard');
        }
      });
    });
  }

  private traceAuth(message: string, data?: Record<string, unknown>) {
    if (!this.authTraceEnabled) {
      return;
    }
    console.debug(`[auth-trace][LoginComponent] ${message}`, data ?? {});
  }
}
