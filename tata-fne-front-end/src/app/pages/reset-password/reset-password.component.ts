import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { catchError, finalize, of } from 'rxjs';

import { AuthenticationService } from '../../core/services/authentication.service';

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './reset-password.component.html',
  styleUrl: './reset-password.component.scss'
})
export class ResetPasswordComponent {
  protected showPassword = false;
  protected showConfirmPassword = false;
  protected submitting = signal(false);
  protected errorMessage = signal<string | null>(null);
  protected successMessage = signal<string | null>(null);
  protected otp: string[] = ['', '', '', '', '', ''];

  protected readonly resetPasswordForm: FormGroup;

  constructor(
    private readonly fb: FormBuilder,
    private readonly authService: AuthenticationService,
    private readonly router: Router,
    private readonly route: ActivatedRoute
  ) {
    this.resetPasswordForm = this.fb.group({
      token: ['', [Validators.required]],
      newPassword: ['', [Validators.required, Validators.minLength(8)]],
      confirmPassword: ['', [Validators.required]]
    });
  }

  protected onOtpChange(index: number, event: any): void {
    const value = event.target.value;
    if (value.length === 1 && /^\d$/.test(value)) {
      this.otp[index] = value;
      if (index < 5) {
        const nextInput = document.getElementById(`otp-${index + 1}`);
        if (nextInput) nextInput.focus();
      }
    } else if (value.length === 0) {
      this.otp[index] = '';
      if (index > 0) {
        const prevInput = document.getElementById(`otp-${index - 1}`);
        if (prevInput) prevInput.focus();
      }
    }
  }

  protected onOtpPaste(event: ClipboardEvent): void {
    event.preventDefault();
    const pastedData = event.clipboardData?.getData('text') || '';
    const digits = pastedData.replace(/\D/g, '').slice(0, 6);
    
    if (digits.length === 6) {
      this.otp = digits.split('');
      // Focus on the last input
      const lastInput = document.getElementById('otp-5');
      if (lastInput) lastInput.focus();
    }
  }

  protected getOtpValue(): string {
    return this.otp.join('');
  }

  protected togglePassword(): void {
    this.showPassword = !this.showPassword;
  }

  protected toggleConfirmPassword(): void {
    this.showConfirmPassword = !this.showConfirmPassword;
  }

  protected submit(): void {
    this.errorMessage.set(null);
    this.successMessage.set(null);
    
    if (this.resetPasswordForm.invalid) {
      this.resetPasswordForm.markAllAsTouched();
      return;
    }

    const { token, newPassword, confirmPassword } = this.resetPasswordForm.value;
    
    if (newPassword !== confirmPassword) {
      this.errorMessage.set('Les mots de passe ne correspondent pas');
      return;
    }

    this.submitting.set(true);

    this.authService
      .resetPassword({ token, newPassword, confirmPassword })
      .pipe(
        catchError((err) => {
          if (err?.error?.message?.includes('Invalid token')) {
            this.errorMessage.set('Le token est invalide');
          } else if (err?.error?.message?.includes('Token has expired')) {
            this.errorMessage.set('Le token a expiré');
          } else if (err?.error?.message?.includes('Passwords do not match')) {
            this.errorMessage.set('Les mots de passe ne correspondent pas');
          } else {
            this.errorMessage.set(err?.error?.message || 'Une erreur est survenue');
          }
          return of(null);
        }),
        finalize(() => this.submitting.set(false))
      )
      .subscribe((res) => {
        if (!res) return;
        this.successMessage.set('Mot de passe réinitialisé avec succès');
        setTimeout(() => {
          this.router.navigate(['/login']);
        }, 2000);
      });
  }
}