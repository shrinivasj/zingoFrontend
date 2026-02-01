import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { AuthService } from '../core/auth.service';

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
    MatButtonModule
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
            <input matInput formControlName="password" type="password" />
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
      .auth-shell {
        display: flex;
        justify-content: center;
        padding: 40px 16px;
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
  form = this.fb.group({
    displayName: ['', [Validators.required, Validators.maxLength(80)]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]]
  });

  constructor(private fb: FormBuilder, private auth: AuthService, private router: Router) {}

  submit() {
    if (this.form.invalid) return;
    this.loading = true;
    const { email, password, displayName } = this.form.value;
    this.auth.register(email!, password!, displayName!).subscribe({
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
