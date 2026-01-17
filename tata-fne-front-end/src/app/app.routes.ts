import { Routes } from '@angular/router';
import { FacturesNonCertifieesComponent } from './pages/factures-non-certifiees/factures-non-certifiees.component';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'factures-non-certifiees'
  },
  {
    path: 'factures-non-certifiees',
    component: FacturesNonCertifieesComponent
  }
];
