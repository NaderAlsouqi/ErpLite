import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

export const admin: Routes = [
  {
    path: 'reports', children: [
      {
        path: 'account-statement',
        loadComponent: () => import('./account-statment/account-statment.component').then(m => m.AccountStatmentComponent)
      },
    ]
  }
];
@NgModule({
  imports: [RouterModule.forChild(admin)],
  exports: [RouterModule],
})
export class reportsRoutingModule {
  static routes = admin;
}