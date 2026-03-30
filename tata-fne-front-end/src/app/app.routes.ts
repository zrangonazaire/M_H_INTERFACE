import { Routes } from '@angular/router';
import { LoginComponent } from './pages/login/login.component';
import { FacturesNonCertifieesComponent } from './pages/factures-non-certifiees/factures-non-certifiees.component';
import { DashboardComponent } from './pages/dashboard/dashboard.component';
import { CertifiedInvoicesComponent } from './pages/certified-invoices/certified-invoices.component';
import { ParametresComponent } from './pages/parametres/parametres.component';
import { FactureAvoirComponent } from './pages/facture-avoir/facture-avoir.component';
import { ForgotPasswordComponent } from './pages/forgot-password/forgot-password.component';
import { ResetPasswordComponent } from './pages/reset-password/reset-password.component';
import { ActivateAccountComponent } from './pages/activate-account/activate-account.component';
import { AuthGuard } from './core/guards/auth.guard';
import { ListeFacturesClientsComponent } from './pages/liste-factures-clients/liste-factures-clients.component';
import { MetriquesComponent } from './pages/metriques/metriques.component';
import { ActiviteCompteComponent } from './pages/activite-compte/activite-compte.component';
import { HistoriqueExcelComponent } from './pages/historique-excel/historique-excel.component';
import { ConfigurationFneActiveComponent } from './pages/configuration-fne-active/configuration-fne-active.component';
import { SocietesComponent } from './pages/societes/societes.component';
import { UtilisateursComponent } from './pages/utilisateurs/utilisateurs.component';
import { RolesComponent } from './pages/roles/roles.component';
import { AttributionRolesComponent } from './pages/attribution-roles/attribution-roles.component';

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
    path: 'liste-factures-clients',
    component: ListeFacturesClientsComponent,
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
    path: 'metriques',
    component: MetriquesComponent,
    canActivate: [AuthGuard]
  },
  {
    path: 'journal-audit',
    component: ActiviteCompteComponent,
    canActivate: [AuthGuard]
  },
  {
    path: 'activite-compte',
    component: ActiviteCompteComponent,
    canActivate: [AuthGuard]
  },
  {
    path: 'historique-excel',
    component: HistoriqueExcelComponent,
    canActivate: [AuthGuard]
  },
  {
    path: 'configuration-fne-active',
    component: ConfigurationFneActiveComponent,
    canActivate: [AuthGuard]
  },
  {
    path: 'societes',
    component: SocietesComponent,
    canActivate: [AuthGuard]
  },
  {
    path: 'utilisateurs',
    component: UtilisateursComponent,
    canActivate: [AuthGuard]
  },
  {
    path: 'roles',
    component: RolesComponent,
    canActivate: [AuthGuard]
  },
  {
    path: 'attribution-roles',
    component: AttributionRolesComponent,
    canActivate: [AuthGuard]
  },
  {
    path: 'forgot-password',
    component: ForgotPasswordComponent
  },
  {
    path: 'activate-account',
    component: ActivateAccountComponent
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
