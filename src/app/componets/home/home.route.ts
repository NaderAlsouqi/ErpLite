import { Routes } from '@angular/router';

export const homeRoutes: Routes = [
  {
    path: 'home',
    loadComponent: () =>
      import('./home.component').then(m => m.HomeComponent),
  },
  {
    path: 'home2',
    loadComponent: () =>
      import('../home2/home2.component').then(m => m.Home2Component),
  },
];
