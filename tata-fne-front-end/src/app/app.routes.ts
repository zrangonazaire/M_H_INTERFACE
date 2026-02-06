import { Routes } from '@angular/router';
import { LoginComponent } from './pages/login/login.component';
import { FacturesNonCertifieesComponent } from './pages/factures-non-certifiees/factures-non-certifiees.component';
import { DashboardComponent } from './pages/dashboard/dashboard.component';
import { CertifiedInvoicesComponent } from './pages/certified-invoices/certified-invoices.component';
import { ParametresComponent } from './pages/parametres/parametres.component';
import { FactureAvoirComponent } from './pages/facture-avoir/facture-avoir.component';
import { ForgotPasswordComponent } from './pages/forgot-password/forgot-password.component';
import { ResetPasswordComponent } from './pages/reset-password/reset-password.component';
import { AuthGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'login'
  },
  {
    path: 'login',
    component: LoginComponent
  },
  {
    path: 'dashboard',
    component: DashboardComponent,
    canActivate: [AuthGuard]
  },
  {
    path: 'factures-certifiees',
    component: CertifiedInvoicesComponent,
    canActivate: [AuthGuard]
  },
  {
    path: 'factures-certifiees/:id/avoir',
    component: FactureAvoirComponent,
    canActivate: [AuthGuard]
  },
  {
    path: 'factures-non-certifiees',
    component: FacturesNonCertifieesComponent,
    canActivate: [AuthGuard]
  },
  {
    path: 'parametres',
    component: ParametresComponent,
    canActivate: [AuthGuard]
  },
  {
    path: 'forgot-password',
    component: ForgotPasswordComponent
  },
  {
    path: 'reset-password',
    component: ResetPasswordComponent
  },
  {
    path: '**',
    redirectTo: 'login'
  }
];
