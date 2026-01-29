import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { AuthService } from '../core/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule
  ],
  template: `
    <div class="auth-shell">
      <div class="auth-card">
        <div class="logo">Z</div>
        <h1>Welcome</h1>
        <p class="subtitle">Go together. No pressure.</p>
        <form [formGroup]="form" (ngSubmit)="submit()">
          <mat-form-field appearance="outline" class="field">
            <mat-label>Email</mat-label>
            <input matInput formControlName="email" type="email" />
          </mat-form-field>
          <mat-form-field appearance="outline" class="field">
            <mat-label>Password</mat-label>
            <input matInput formControlName="password" type="password" />
          </mat-form-field>
          <button class="cta" type="submit" [disabled]="form.invalid || loading">
            Login
          </button>
        </form>
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
      .auth-shell {
        min-height: 100vh;
        display: flex;
        justify-content: center;
        align-items: center;
        padding: 48px 20px;
        background: #ffffff;
      }
      .auth-card {
        width: min(360px, 100%);
        display: grid;
        gap: 18px;
      }
      form {
        display: grid;
        gap: 12px;
      }
      h1 {
        margin: 0;
        font-size: 38px;
        color: #111;
        font-family: "SF Pro Display", -apple-system, BlinkMacSystemFont, "SF Pro Text", "Helvetica Neue", sans-serif;
      }
      .logo {
        width: 84px;
        height: 84px;
        border-radius: 22px;
        background: #ff4d4f;
        color: #fff;
        display: grid;
        place-items: center;
        font-size: 40px;
        font-weight: 700;
      }
      .subtitle {
        margin: 0;
        color: #6a6a6a;
        font-size: 18px;
      }
      .field {
        background: #fff;
        border-radius: 18px;
      }
      .cta {
        margin-top: 8px;
        width: 100%;
        border: none;
        padding: 16px;
        border-radius: 18px;
        font-size: 16px;
        font-weight: 600;
        color: #fff;
        background: #ff4d4f;
        cursor: pointer;
      }
      .cta:disabled {
        opacity: 0.6;
        cursor: not-allowed;
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
        padding: 16px;
        border-radius: 18px;
        border: 2px solid #111;
        background: #fff;
        font-weight: 600;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 12px;
        cursor: pointer;
      }
      .g {
        width: 28px;
        height: 28px;
        border-radius: 50%;
        background: #fff;
        display: grid;
        place-items: center;
        font-weight: 700;
        color: #4285f4;
      }

      :host ::ng-deep .mdc-text-field--outlined {
        border-radius: 18px;
        height: 56px;
      }

      :host ::ng-deep .mdc-notched-outline__leading,
      :host ::ng-deep .mdc-notched-outline__trailing {
        border-color: rgba(0, 0, 0, 0.12) !important;
      }

      :host ::ng-deep .mdc-floating-label {
        color: #9b9b9b !important;
      }
    `
  ]
})
export class LoginComponent {
  loading = false;
  form = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]]
  });

  constructor(private fb: FormBuilder, private auth: AuthService, private router: Router) {}

  submit() {
    if (this.form.invalid) return;
    this.loading = true;
    const { email, password } = this.form.value;
    this.auth.login(email!, password!).subscribe({
      next: () => {
        this.loading = false;
        this.router.navigate(['/dashboard']);
      },
      error: () => {
        this.loading = false;
      }
    });
  }
}
