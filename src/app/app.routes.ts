import { Routes } from '@angular/router';
import { MainLayoutComponent } from './shared/layouts/main-layout/main-layout.component';
import { content } from './shared/routes/content.route';
import { AuthenticationLayoutComponent } from './shared/layouts/authentication-layout/authentication-layout.component';
import { authen } from './shared/routes/auth.route';
import { AuthGuard } from './shared/guards/auth.guard';
import { NonAuthGuard } from './shared/guards/non-auth.guard';

export const App_Route: Routes = [
  { 
    path: '', 
    redirectTo: 'auth/login',  
    pathMatch: 'full' 
  },
  {
    path: 'auth/login',
    loadComponent: () =>
      import('../app/authentication/login/login.component').then((m) => m.LoginComponent),
  },
  { 
    path: '', 
    component: MainLayoutComponent,
    children: content,
    canActivate: [AuthGuard] 
  },
  { 
    path: '', 
    component: AuthenticationLayoutComponent,
    children: authen 
  },
  // Add the wildcard route for 404 errors - IMPORTANT: This must be the LAST route
  { 
    path: '**', 
    loadComponent: () =>
      import('./componets/error/error404/error404.component').then((m) => m.Error404Component)
  }
];
