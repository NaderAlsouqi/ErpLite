import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { RoleGuard } from '../../shared/guards/role.guard';

export const admin: Routes = [
  {
    path: 'accounting', children: [
      {
        path: 'receipt-vouchers',
        loadComponent: () => import('./receipt-vouchers/receipt-vouchers.component').then(m => m.ReceiptVouchersComponent),
        canActivate: [RoleGuard],
        data: { roles: ['Admin', 'Manager', 'Accountant'] }
      },
      {
        path: 'virtual/receipt-vouchers',
        loadComponent: () => import('./virtual-receipt-vouchers/virtual-receipt-vouchers.component').then(m => m.VirtualReceiptVouchersComponent),
        canActivate: [RoleGuard],
        data: { roles: ['Admin', 'Manager', 'VirtualAccountant'] }
      },
    ]
  }
];
@NgModule({
  imports: [RouterModule.forChild(admin)],
  exports: [RouterModule],
})
export class accountingsRoutingModule {
  static routes = admin;
}