import { Component, HostBinding, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { Subject, takeUntil } from 'rxjs';
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
    MatButtonModule,
    MatIconModule
  ],
  template: `
    <div class="auth-shell" *ngIf="!isAuthenticated">
      <div class="auth-card">
        <img class="logo" src="assets/aurofly-logo.png" alt="aurofly" />
        <form [formGroup]="form" (ngSubmit)="submit()">
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
            Login
          </button>
          <p class="error" *ngIf="errorMessage">{{ errorMessage }}</p>
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
      :host {
        display: block;
        height: 100vh;
        overflow: hidden;
      }
      :host.hidden {
        display: none;
      }
      .auth-shell {
        height: 100%;
        display: flex;
        justify-content: center;
        align-items: center;
        padding: 32px 20px;
        background: #ffffff;
        box-sizing: border-box;
        overflow: hidden;
      }
      .auth-card {
        width: min(360px, 100%);
        display: grid;
        gap: 18px;
        padding: 32px 26px 28px;
        border-radius: 28px;
        background: rgba(255, 255, 255, 0.92);
        border: 1px solid rgba(255, 255, 255, 0.7);
        box-shadow: 0 24px 60px rgba(224, 30, 90, 0.15);
        justify-items: center;
        text-align: center;
      }
      .auth-card form,
      .auth-card .divider,
      .auth-card .google-btn,
      .auth-card .muted {
        width: 100%;
        text-align: left;
      }
      .auth-card .muted {
        text-align: center;
      }
      form {
        display: grid;
        gap: 12px;
      }
      .logo {
        height: 156px;
        width: auto;
        max-width: 320px;
        display: block;
        margin-bottom: 6px;
        filter: drop-shadow(0 10px 24px rgba(224, 30, 90, 0.2));
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
      .error {
        margin: 4px 0 0;
        color: #d92d20;
        font-size: 13px;
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
        border: 1.5px solid #111;
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
        width: 28px;
        height: 28px;
        border-radius: 50%;
        background: #f5f5f5;
        display: grid;
        place-items: center;
        font-weight: 700;
        color: #4285f4;
      }

      .auth-shell {
        position: relative;
        overflow: hidden;
      }

      .auth-shell::before,
      .auth-shell::after {
        content: '';
        position: absolute;
        border-radius: 50%;
        filter: blur(0);
        opacity: 0.35;
        pointer-events: none;
      }

      .auth-shell::before {
        width: 240px;
        height: 240px;
        background: radial-gradient(circle, rgba(255, 77, 79, 0.25), transparent 70%);
        top: -60px;
        left: -80px;
      }

      .auth-shell::after {
        width: 280px;
        height: 280px;
        background: radial-gradient(circle, rgba(255, 142, 58, 0.25), transparent 70%);
        bottom: -120px;
        right: -80px;
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
export class LoginComponent implements OnInit, OnDestroy {
  loading = false;
  showPassword = false;
  errorMessage = '';
  isAuthenticated = false;
  @HostBinding('class.hidden') hostHidden = false;
  private destroy$ = new Subject<void>();
  form = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required]]
  });

  constructor(private fb: FormBuilder, private auth: AuthService, private router: Router) {}

  ngOnInit() {
    this.isAuthenticated = !!this.auth.getToken();
    this.hostHidden = this.isAuthenticated;
    if (this.isAuthenticated) {
      this.router.navigateByUrl('/dashboard', { replaceUrl: true });
    }

    this.auth.user$.pipe(takeUntil(this.destroy$)).subscribe((user) => {
      this.isAuthenticated = !!user || !!this.auth.getToken();
      this.hostHidden = this.isAuthenticated;
    });
  }

  submit() {
    this.errorMessage = '';
    const email = (this.form.value.email ?? '').trim();
    const password = (this.form.value.password ?? '').trim();
    this.form.patchValue({ email, password }, { emitEvent: false });
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.loading = true;
    this.auth.login(email!, password!).subscribe({
      next: () => {
        this.loading = false;
        this.isAuthenticated = true;
        this.hostHidden = true;
        this.router.navigate(['/dashboard']);
      },
      error: (err) => {
        this.loading = false;
        this.errorMessage = err?.error?.message || 'Login failed. Please try again.';
      }
    });
  }

  togglePassword() {
    this.showPassword = !this.showPassword;
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
