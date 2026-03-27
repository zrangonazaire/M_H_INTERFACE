import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { catchError, finalize, of } from 'rxjs';

import { AuthenticationService } from '../../core/services/authentication.service';
import { environment } from '../../../environments/environment';

const formatPolicyDuration = (durationMs: number): string => {
  const totalMinutes = Math.round(durationMs / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours > 0 && minutes > 0) {
    return `${hours} h ${minutes} min`;
  }

  if (hours > 0) {
    return `${hours} h`;
  }

  return `${minutes} min`;
};

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss'
})
export class LoginComponent {
  protected showPassword = false;
  protected submitting = signal(false);
  protected infoMessage = signal<string | null>(null);
  protected errorMessage = signal<string | null>(null);
  protected readonly sessionPolicyLabel =
    `Deconnexion apres ${formatPolicyDuration(environment.session.inactivityTimeoutMs)} d'inactivite, ` +
    `alerte ${formatPolicyDuration(environment.session.warningThresholdMs)} avant la fermeture.`;

  protected readonly loginForm: FormGroup;

  constructor(
    private readonly fb: FormBuilder,
    private readonly authService: AuthenticationService,
    private readonly router: Router
  ) {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(8)]],
      rememberMe: [environment.session.defaultRememberMe]
    });

    this.infoMessage.set(this.authService.consumeLogoutReasonMessage());
  }

  protected togglePassword(): void {
    this.showPassword = !this.showPassword;
  }

  protected submit(): void {
    this.infoMessage.set(null);
    this.errorMessage.set(null);
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    const { email, password, rememberMe } = this.loginForm.getRawValue();
    this.submitting.set(true);

    this.authService
      .login({ email, password }, { rememberMe: Boolean(rememberMe) })
      .pipe(
        catchError((err) => {
          this.errorMessage.set(err?.error?.message || 'Identifiants invalides');
          return of(null);
        }),
        finalize(() => this.submitting.set(false))
      )
      .subscribe((res) => {
        if (!res) return;
        
        this.authService.setCurrentUserEmail(email);
        this.authService.setCurrentPdv(this.authService.getCurrentPdv() ?? '');
        this.authService.setCurrentEtabFNE(this.authService.getCurrentEtabFNE() ?? '');
        this.authService.setCurrentIdRole(this.authService.getCurrentIdRole() ?? '');
        this.authService.setCurrentId(this.authService.getCurrentId() ?? '');
        this.authService.setCurrentAuthorities(this.authService.getCurrentAuthorities());

        this.router.navigate(['/dashboard']);
      });
  }

  protected navigateToForgotPassword(): void {
    this.router.navigate(['/forgot-password']);
  }
}
