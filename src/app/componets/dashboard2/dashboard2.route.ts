import { Routes } from '@angular/router';

export const dashboard2Routes: Routes = [
  {
    path: 'dashboard2',
    loadComponent: () =>
      import('./dashboard2.component').then(m => m.Dashboard2Component),
  },
];
