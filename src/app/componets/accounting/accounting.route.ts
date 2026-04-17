import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { RoleGuard } from '../../shared/guards/role.guard';
import { PermissionGuard } from '../../shared/guards/permission.guard';

const uc = () => import('../shared/under-construction/under-construction.component').then(m => m.UnderConstructionComponent);

export const admin: Routes = [
  {
    path: 'accounting', children: [
      // Existing
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

      { path: 'ar/customers',                  loadComponent: uc },
      { path: 'ar/cheque-receipt-vouchers',    loadComponent: uc },
      { path: 'ap/suppliers',                  loadComponent: uc },
      {
        path: 'gl/accounts-list',
        loadComponent: () => import('./chart-of-accounts/chart-of-accounts.component').then(m => m.ChartOfAccountsComponent),
        canActivate: [RoleGuard],
        data: { roles: ['Admin', 'Manager', 'Accountant'] }
      },
      {
        path: 'gl/opening-balances',
        loadComponent: () => import('./opening-balances/opening-balances.component').then(m => m.OpeningBalancesComponent),
        canActivate: [RoleGuard],
        data: { roles: ['Admin', 'Manager', 'Accountant'] }
      },
      { path: 'gl/cancel-account',             loadComponent: uc },
      {
        path: 'gl/link-groups-accounts',
        loadComponent: () => import('./link-groups-accounts/link-groups-accounts.component').then(m => m.LinkGroupsAccountsComponent),
        canActivate: [RoleGuard],
        data: { roles: ['Admin', 'Manager', 'Accountant'] }
      },
      {
        path: 'gl/link-accounts',
        loadComponent: () => import('./link-accounts/link-accounts.component').then(m => m.LinkAccountsComponent),
        canActivate: [RoleGuard],
        data: { roles: ['Admin', 'Manager', 'Accountant'] }
      },
      {
        path: 'gl/edit-account-name',
        loadComponent: () => import('./edit-account-name/edit-account-name.component').then(m => m.EditAccountNameComponent),
        canActivate: [RoleGuard],
        data: { roles: ['Admin', 'Manager', 'Accountant'] }
      },
      {
        path: 'gl/clear-cost-centers',
        loadComponent: () => import('./clear-cost-centers/clear-cost-centers.component').then(m => m.ClearCostCentersComponent),
        canActivate: [RoleGuard],
        data: { roles: ['Admin', 'Manager', 'Accountant'] }
      },
      {
        path: 'gl/transfer-account-movements',
        loadComponent: () => import('./transfer-account-movements/transfer-account-movements.component').then(m => m.TransferAccountMovementsComponent),
        canActivate: [RoleGuard],
        data: { roles: ['Admin', 'Manager', 'Accountant'] }
      },
      {
        path: 'gl/cc-opening-balances',
        loadComponent: () => import('./cc-opening-balances/cc-opening-balances.component').then(m => m.CcOpeningBalancesComponent),
        canActivate: [RoleGuard],
        data: { roles: ['Admin', 'Manager', 'Accountant'] }
      },
      {
        path: 'admin/permissions',
        loadComponent: () => import('./permissions/permissions.component').then(m => m.PermissionsComponent),
        canActivate: [PermissionGuard],
        data: { permissions: ['Admin.ManagePermissions'] }
      },
      { path: 'accounts-receivable',  loadComponent: uc },
      { path: 'accounts-payable',     loadComponent: uc },

      // تسوية البنك
      { path: 'bank-reconciliation', loadComponent: uc },

      // سندات
      {
        path: 'vouchers/journal',
        loadComponent: () => import('./journal-vouchers/journal-vouchers.component').then(m => m.JournalVouchersComponent),
        canActivate: [RoleGuard],
        data: { roles: ['Admin', 'Manager', 'Accountant'] }
      },
      { path: 'vouchers/receipt',        loadComponent: uc },
      { path: 'vouchers/check-payment',  loadComponent: uc },
      { path: 'vouchers/cash-payment',   loadComponent: uc },

      // التعريفات
      {
        path: 'definitions/banks',
        loadComponent: () => import('./banks/banks.component').then(m => m.BanksComponent),
        canActivate: [RoleGuard],
        data: { roles: ['Admin', 'Manager', 'Accountant'] }
      },
      {
        path: 'definitions/currencies',
        loadComponent: () => import('./currencies/currencies.component').then(m => m.CurrenciesComponent),
        canActivate: [RoleGuard],
        data: { roles: ['Admin', 'Manager', 'Accountant'] }
      },
      {
        path: 'definitions/account-groups',
        loadComponent: () => import('./account-groups/account-groups.component').then(m => m.AccountGroupsComponent),
        canActivate: [RoleGuard],
        data: { roles: ['Admin', 'Manager', 'Accountant'] }
      },
      {
        path: 'definitions/cost-centers',
        loadComponent: () => import('./cost-centers/cost-centers.component').then(m => m.CostCentersComponent),
        canActivate: [RoleGuard],
        data: { roles: ['Admin', 'Manager', 'Accountant'] }
      },
      { path: 'definitions/stamps',          loadComponent: uc },
      {
        path: 'definitions/taxes',
        loadComponent: () => import('./taxes/taxes.component').then(m => m.TaxesComponent),
        canActivate: [RoleGuard],
        data: { roles: ['Admin', 'Manager', 'Accountant'] }
      },

      // الشيكات
      { path: 'cheques/incoming-first',  loadComponent: uc },
      { path: 'cheques/outgoing-first',  loadComponent: uc },
      { path: 'cheques/deposit',         loadComponent: uc },
      { path: 'cheques/collection',      loadComponent: uc },
      { path: 'cheques/return',          loadComponent: uc },
      { path: 'cheques/re-return',       loadComponent: uc },
      { path: 'cheques/withdrawal',      loadComponent: uc },
      { path: 'cheques/endorse',         loadComponent: uc },

      // الفواتير
      { path: 'invoices/service',        loadComponent: uc },

      // الرواتب - التعريفات
      { path: 'salaries/definitions/allowances', loadComponent: uc },
      { path: 'salaries/definitions/employees',  loadComponent: uc },

      // الرواتب
      { path: 'salaries/calculate',          loadComponent: uc },
      { path: 'salaries/employee-info',      loadComponent: uc },
      { path: 'salaries/payslips',           loadComponent: uc },
      { path: 'salaries/collective-payroll', loadComponent: uc },
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
