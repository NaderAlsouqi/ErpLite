import { Routes } from '@angular/router';

export const activityLogRoutes: Routes = [
  {
    path: 'activity-log',
    loadComponent: () =>
      import('./activity-log.component').then(m => m.ActivityLogComponent),
  },
];
