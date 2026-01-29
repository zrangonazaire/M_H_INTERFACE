import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { catchError, finalize, of } from 'rxjs';

import { AuthenticationService } from '../../core/services/authentication.service';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './forgot-password.component.html',
  styleUrl: './forgot-password.component.scss'
})
export class ForgotPasswordComponent {
  protected showPassword = false;
  protected submitting = signal(false);
  protected errorMessage = signal<string | null>(null);
  protected step = signal<'email' | 'reset' | 'success'>('email');
  protected otp: string[] = ['', '', '', '', '', ''];

  protected readonly forgotPasswordForm: FormGroup;
  protected readonly resetPasswordForm: FormGroup;

  constructor(
    private readonly fb: FormBuilder,
    private readonly authService: AuthenticationService,
    private readonly router: Router
  ) {
    this.forgotPasswordForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]]
    });

    this.resetPasswordForm = this.fb.group({
      token: ['', [Validators.required]],
      newPassword: ['', [Validators.required, Validators.minLength(8)]],
      confirmPassword: ['', [Validators.required]]
    }, {
      validators: this.passwordMatchValidator
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

  protected submitEmail(): void {
    this.errorMessage.set(null);
    if (this.forgotPasswordForm.invalid) {
      this.forgotPasswordForm.markAllAsTouched();
      return;
    }

    const { email } = this.forgotPasswordForm.value;
    this.submitting.set(true);

    this.authService
      .forgotPassword({ email: email! })
      .pipe(
        catchError((err) => {
          if (err?.status === 404 || err?.error?.message?.includes('User not found')) {
            this.errorMessage.set('Le mail n\'est pas associ� � un compte');
          } else {
            this.errorMessage.set(err?.error?.message || 'Une erreur est survenue');
          }
          return of(null);
        }),
        finalize(() => this.submitting.set(false))
      )
      .subscribe((res) => {
       // if (!res) return;
    
        this.step.set('reset');
      });
  }

  protected submitReset(): void {
    console.log('=== SUBMIT RESET START ===');
    console.log('Form valid:', this.resetPasswordForm.valid);
    console.log('Form value:', this.resetPasswordForm.value);
    console.log('OTP array:', this.otp);
    console.log('OTP value:', this.getOtpValue());
    
    this.errorMessage.set(null);
    
    // Validation manuelle du formulaire
    const { newPassword, confirmPassword } = this.resetPasswordForm.value;
    const token = this.getOtpValue();
    
    console.log('Token:', token);
    console.log('Token length:', token.length);
    console.log('New password:', newPassword);
    console.log('Confirm password:', confirmPassword);
    
    // Validation des champs requis
    if (!token || token.length !== 6) {
      console.log('Token is invalid');
      this.errorMessage.set('Le code de sécurité doit contenir 6 chiffres');
      return;
    }
    
    if (!newPassword || newPassword.length < 8) {
      console.log('New password is invalid');
      this.errorMessage.set('Le mot de passe doit contenir au moins 8 caractères');
      return;
    }
    
    if (!confirmPassword) {
      console.log('Confirm password is required');
      this.errorMessage.set('Veuillez confirmer votre mot de passe');
      return;
    }
    
    // Validation de la correspondance des mots de passe
    if (newPassword !== confirmPassword) {
      console.log('Passwords do not match');
      this.errorMessage.set('Les mots de passe ne correspondent pas');
      return;
    }

    console.log('Calling resetPassword service...');
    console.log('Sending data:', { token, newPassword, confirmPassword });
    this.submitting.set(true);

    this.authService
      .resetPassword({ token, newPassword, confirmPassword })
      .pipe(
        catchError((err) => {
          console.log('=== CATCH ERROR ===');
          console.log('Error object:', err);
          console.log('Error status:', err?.status);
          console.log('Error message:', err?.error?.message);
          
          if (err?.error?.message?.includes('Invalid token')) {
            this.errorMessage.set('Le code de sécurité est invalide');
          } else if (err?.error?.message?.includes('Token has expired')) {
            this.errorMessage.set('Le code de sécurité a expiré');
          } else if (err?.error?.message?.includes('Passwords do not match')) {
            this.errorMessage.set('Les mots de passe ne correspondent pas');
          } else {
            this.errorMessage.set(err?.error?.message || 'Une erreur est survenue');
          }
          return of(null);
        }),
        finalize(() => {
          console.log('=== FINALIZE ===');
          this.submitting.set(false);
        })
      )
      .subscribe({
        next: (res) => {
          console.log('=== NEXT ===');
          console.log('Response:', res);
          console.log('Setting step to success');
          this.step.set('success');
          // Redirection automatique vers la page de login après 2 secondes
          // setTimeout(() => {
          //   console.log('Navigating to login...');
          //   this.router.navigate(['/login']);
          // }, 2000);
        },
        error: (err) => {
          console.log('=== SUBSCRIBE ERROR ===');
          console.log('Error:', err);
        },
        complete: () => {
          console.log('=== COMPLETE ===');
        }
      });
      
    console.log('=== SUBMIT RESET END ===');
  }

  protected goToLogin(): void {
    this.router.navigate(['/login']);
  }

  protected passwordMatchValidator(form: FormGroup) {
    const newPassword = form.get('newPassword');
    const confirmPassword = form.get('confirmPassword');

    if (newPassword && confirmPassword && newPassword.value !== confirmPassword.value) {
      confirmPassword.setErrors({ mismatch: true });
    } else {
      confirmPassword?.setErrors(null);
    }
  }
}