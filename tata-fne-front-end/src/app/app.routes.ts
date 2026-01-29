import { Routes } from '@angular/router';
import { LoginComponent } from './pages/login/login.component';
import { FacturesNonCertifieesComponent } from './pages/factures-non-certifiees/factures-non-certifiees.component';
import { DashboardComponent } from './pages/dashboard/dashboard.component';
import { CertifiedInvoicesComponent } from './pages/certified-invoices/certified-invoices.component';
import { ParametresComponent } from './pages/parametres/parametres.component';
import { FactureAvoirComponent } from './pages/facture-avoir/facture-avoir.component';
import { ForgotPasswordComponent } from './pages/forgot-password/forgot-password.component';
import { ResetPasswordComponent } from './pages/reset-password/reset-password.component';

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
    component: DashboardComponent
  },
  {
    path: 'factures-certifiees',
    component: CertifiedInvoicesComponent
  },
  {
    path: 'factures-certifiees/:id/avoir',
    component: FactureAvoirComponent
  },
  {
    path: 'factures-non-certifiees',
    component: FacturesNonCertifieesComponent
  },
  {
    path: 'parametres',
    component: ParametresComponent
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
