import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { catchError, finalize, of } from 'rxjs';

import { AuthenticationService } from '../../core/services/authentication.service';

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
  protected errorMessage = signal<string | null>(null);

  protected readonly loginForm: FormGroup;

  constructor(
    private readonly fb: FormBuilder,
    private readonly authService: AuthenticationService,
    private readonly router: Router
  ) {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(8)]],
      rememberMe: [true]
    });
  }

  protected togglePassword(): void {
    this.showPassword = !this.showPassword;
  }

  protected submit(): void {
    debugger
    this.errorMessage.set(null);
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    const { email, password } = this.loginForm.value;
    this.submitting.set(true);

    this.authService
      .login({ email, password })
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
        this.authService.setCurrentPdv(this.authService.getCurrentPdv()??"");
        this.authService.setCurrentEtabFNE(this.authService.getCurrentEtabFNE()??"");
         this.authService.setCurrentIdRole(this.authService.getCurrentIdRole()??"");
        this.authService.setCurrentId(this.authService.getCurrentId()??"");
        this.authService.setCurrentAuthorities(this.authService.getCurrentAuthorities());
        console.log('Login successful, authorities:', this.authService.getCurrentAuthorities());
       
        // redirect to default page once authenticated
        this.router.navigate(['/dashboard']);
      });
  }

  protected navigateToForgotPassword(): void {
    this.router.navigate(['/forgot-password']);
  }
}
