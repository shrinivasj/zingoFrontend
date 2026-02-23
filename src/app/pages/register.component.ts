import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '../core/auth.service';
import { ApiService } from '../core/api.service';
import { E2eeService } from '../core/e2ee.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule
  ],
  template: `
    <div class="auth-shell">
      <mat-card class="auth-card">
        <h1>Create your aurofly profile</h1>
        <p class="muted">No swipes. No rankings. Just real people going together.</p>
        <form [formGroup]="form" (ngSubmit)="submit()">
          <mat-form-field appearance="outline">
            <mat-label>Display name</mat-label>
            <input matInput formControlName="displayName" />
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Email</mat-label>
            <input matInput formControlName="email" type="email" />
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Password</mat-label>
            <input matInput formControlName="password" [type]="showPassword ? 'text' : 'password'" />
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
          <button mat-flat-button color="primary" type="submit" [disabled]="form.invalid || loading">
            Join aurofly
          </button>
        </form>
        <p class="muted">Already have an account? <a routerLink="/login">Log in</a></p>
      </mat-card>
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
        height: 100vh;
        overflow: hidden;
      }
      .auth-shell {
        height: 100%;
        display: flex;
        justify-content: center;
        align-items: center;
        padding: 32px 16px;
        box-sizing: border-box;
        overflow: hidden;
      }
      .auth-card {
        width: min(420px, 100%);
        padding: 24px;
        display: grid;
        gap: 16px;
      }
      form {
        display: grid;
        gap: 12px;
      }
      .muted {
        color: var(--zingo-muted);
      }
      h1 {
        margin: 0;
      }
    `
  ]
})
export class RegisterComponent {
  loading = false;
  showPassword = false;
  form = this.fb.group({
    displayName: ['', [Validators.required, Validators.maxLength(80)]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]]
  });

  constructor(
    private fb: FormBuilder,
    private auth: AuthService,
    private api: ApiService,
    private e2ee: E2eeService,
    private router: Router
  ) {}

  submit() {
    if (this.form.invalid) return;
    this.loading = true;
    const { email, password, displayName } = this.form.value;
    this.auth.register(email!, password!, displayName!).subscribe({
      next: async () => {
        await this.syncE2eeKeys(password!);
        this.loading = false;
        this.router.navigate(['/dashboard']);
      },
      error: () => {
        this.loading = false;
      }
    });
  }

  togglePassword() {
    this.showPassword = !this.showPassword;
  }

  private async syncE2eeKeys(password: string) {
    try {
      const profile = await firstValueFrom(this.api.getProfile());
      const keyState = await this.e2ee.syncKeysForPassword(password, profile.e2eePublicKey || null);
      const needsUpdate =
        profile.e2eePublicKey !== keyState.publicJwk ||
        profile.e2eeEncryptedPrivateKey !== keyState.encryptedPrivateKey ||
        profile.e2eeKeySalt !== keyState.keySalt;
      if (!needsUpdate) {
        return;
      }
      await firstValueFrom(
        this.api.updateProfile({
          e2eePublicKey: keyState.publicJwk,
          e2eeEncryptedPrivateKey: keyState.encryptedPrivateKey,
          e2eeKeySalt: keyState.keySalt
        })
      );
    } catch {
      // non-blocking: registration should still complete even if key sync fails
    }
  }
}
