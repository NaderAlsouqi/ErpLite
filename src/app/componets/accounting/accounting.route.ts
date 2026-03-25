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
        data: { roles: ['Admin', 'Manager', 'Sales', 'CashLink', 'VirtualCashLink', 'CashLinkLimit', 'VirtualCashLinkLimit'] }
      },
      {
        path: 'virtual/receipt-vouchers',
        loadComponent: () => import('./virtual-receipt-vouchers/virtual-receipt-vouchers.component').then(m => m.VirtualReceiptVouchersComponent),
        canActivate: [RoleGuard],
        data: { roles: ['Admin', 'Manager', 'VirtualSales', 'CashLink', 'VirtualCashLink', 'CashLinkLimit', 'VirtualCashLinkLimit'] }
      },
      {
        path: 'general-ledger',
        loadComponent: () => import('./general-ledger/general-ledger.component').then(m => m.GeneralLedgerComponent),
        canActivate: [RoleGuard],
        data: { roles: ['Admin', 'Manager', 'Sales', 'VirtualSales', 'CashLink', 'VirtualCashLink', 'CashLinkLimit', 'VirtualCashLinkLimit'] }
      },
      {
        path: 'accounts-receivable',
        loadComponent: () => import('./accounts-receivable/accounts-receivable.component').then(m => m.AccountsReceivableComponent),
        canActivate: [RoleGuard],
        data: { roles: ['Admin', 'Manager', 'Sales', 'VirtualSales', 'CashLink', 'VirtualCashLink', 'CashLinkLimit', 'VirtualCashLinkLimit'] }
      },
      {
        path: 'accounts-payable',
        loadComponent: () => import('./accounts-payable/accounts-payable.component').then(m => m.AccountsPayableComponent),
        canActivate: [RoleGuard],
        data: { roles: ['Admin', 'Manager', 'Sales', 'VirtualSales', 'CashLink', 'VirtualCashLink', 'CashLinkLimit', 'VirtualCashLinkLimit'] }
      },
      {
        path: 'cheques',
        loadComponent: () => import('./cheques/cheques.component').then(m => m.ChequesComponent),
        canActivate: [RoleGuard],
        data: { roles: ['Admin', 'Manager', 'Sales', 'VirtualSales', 'CashLink', 'VirtualCashLink', 'CashLinkLimit', 'VirtualCashLinkLimit'] }
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