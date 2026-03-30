import { CommonModule } from '@angular/common';
import { Component, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { catchError, finalize, of } from 'rxjs';

import { AuthenticationService } from '../../core/services/authentication.service';

@Component({
  selector: 'app-activate-account',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './activate-account.component.html',
  styleUrl: './activate-account.component.scss'
})
export class ActivateAccountComponent {
  protected submitting = signal(false);
  protected errorMessage = signal<string | null>(null);
  protected successMessage = signal<string | null>(null);
  protected otp: string[] = ['', '', '', '', '', ''];

  protected readonly activationForm: FormGroup;

  constructor(
    private readonly fb: FormBuilder,
    private readonly authService: AuthenticationService,
    private readonly router: Router,
    private readonly route: ActivatedRoute
  ) {
    this.activationForm = this.fb.group({
      token: ['', [Validators.required, Validators.pattern(/^\d{6}$/)]]
    });

    const tokenFromUrl = this.route.snapshot.queryParamMap.get('token');
    if (tokenFromUrl) {
      this.prefillToken(tokenFromUrl);
    }
  }

  private prefillToken(rawToken: string): void {
    const digits = rawToken.replace(/\D/g, '').slice(0, 6);
    if (digits.length !== 6) return;

    this.otp = digits.split('');
    this.activationForm.patchValue({ token: digits });
  }

  protected onOtpChange(index: number, event: Event): void {
    const target = event.target as HTMLInputElement | null;
    const value = target?.value ?? '';

    if (value.length === 1 && /^\d$/.test(value)) {
      this.otp[index] = value;
      if (index < 5) {
        const nextInput = document.getElementById(`otp-${index + 1}`) as HTMLInputElement | null;
        nextInput?.focus();
      }
    } else if (value.length === 0) {
      this.otp[index] = '';
      if (index > 0) {
        const prevInput = document.getElementById(`otp-${index - 1}`) as HTMLInputElement | null;
        prevInput?.focus();
      }
    } else {
      this.otp[index] = value.replace(/\D/g, '').slice(0, 1);
    }

    this.activationForm.patchValue({ token: this.getOtpValue() }, { emitEvent: false });
  }

  protected onOtpPaste(event: ClipboardEvent): void {
    event.preventDefault();
    const pastedData = event.clipboardData?.getData('text') || '';
    const digits = pastedData.replace(/\D/g, '').slice(0, 6);

    if (digits.length !== 6) {
      return;
    }

    this.otp = digits.split('');
    this.activationForm.patchValue({ token: digits }, { emitEvent: false });

    const lastInput = document.getElementById('otp-5') as HTMLInputElement | null;
    lastInput?.focus();
  }

  protected getOtpValue(): string {
    return this.otp.join('');
  }

  protected submit(): void {
    this.errorMessage.set(null);
    this.successMessage.set(null);

    const token = this.getOtpValue();
    this.activationForm.patchValue({ token }, { emitEvent: false });

    if (this.activationForm.invalid) {
      this.activationForm.markAllAsTouched();
      this.errorMessage.set('Veuillez saisir le code à 6 chiffres.');
      return;
    }

    this.submitting.set(true);

    this.authService
      .activateAccount(token)
      .pipe(
        catchError((err) => {
          const rawMessage = err?.error?.message || err?.message || 'Activation impossible.';
          const message = String(rawMessage);

          if (message.includes('Invalid token')) {
            this.errorMessage.set('Code invalide.');
          } else if (message.toLowerCase().includes('expired')) {
            this.errorMessage.set('Code expiré. Un nouveau code a été envoyé par email.');
          } else {
            this.errorMessage.set(message);
          }

          return of(null);
        }),
        finalize(() => this.submitting.set(false))
      )
      .subscribe((res) => {
        if (res === null) return;

        this.successMessage.set('Compte activé avec succès.');
        window.setTimeout(() => {
          this.router.navigate(['/login']);
        }, 2000);
      });
  }

  protected goToLogin(): void {
    this.router.navigate(['/login']);
  }
}

