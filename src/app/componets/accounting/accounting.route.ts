import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { PermissionGuard } from '../../shared/guards/permission.guard';
import { VoucherSerialsComponent } from './service-misc/voucher-serials/voucher-serials.component';
import { BranchesComponent } from './service-misc/branches/branches.component';

const uc = () => import('../shared/under-construction/under-construction.component').then(m => m.UnderConstructionComponent);

export const admin: Routes = [
  {
    path: 'accounting', children: [
      // Existing
      {
        path: 'service-misc/voucher-serials',
        component: VoucherSerialsComponent,
      },
      {
        path: 'service-misc/branches',
        component: BranchesComponent,
      },
      {
        path: 'receipt-vouchers',
        loadComponent: () => import('./receipt-vouchers/receipt-vouchers.component').then(m => m.ReceiptVouchersComponent),
      },
      {
        path: 'virtual/receipt-vouchers',
        loadComponent: () => import('./virtual-receipt-vouchers/virtual-receipt-vouchers.component').then(m => m.VirtualReceiptVouchersComponent),
      },

      { path: 'ar/customers',                  loadComponent: uc },
      { path: 'ar/cheque-receipt-vouchers',    loadComponent: uc },
      {
        path: 'cheques/payment-voucher',
        loadComponent: () => import('./cheques-payment/cheques-payment.component').then(m => m.ChequesPaymentComponent),
      },
      { path: 'ap/suppliers',                  loadComponent: uc },
      {
        path: 'gl/accounts-list',
        loadComponent: () => import('./chart-of-accounts/chart-of-accounts.component').then(m => m.ChartOfAccountsComponent),
      },
      {
        path: 'gl/opening-balances',
        loadComponent: () => import('./opening-balances/opening-balances.component').then(m => m.OpeningBalancesComponent),
      },
      {
        path: 'gl/link-groups-accounts',
        loadComponent: () => import('./link-groups-accounts/link-groups-accounts.component').then(m => m.LinkGroupsAccountsComponent),
      },
      {
        path: 'gl/link-accounts',
        loadComponent: () => import('./link-accounts/link-accounts.component').then(m => m.LinkAccountsComponent),
      },
      {
        path: 'gl/edit-account-name',
        loadComponent: () => import('./edit-account-name/edit-account-name.component').then(m => m.EditAccountNameComponent),
      },
      {
        path: 'gl/clear-cost-centers',
        loadComponent: () => import('./clear-cost-centers/clear-cost-centers.component').then(m => m.ClearCostCentersComponent),
      },
      {
        path: 'gl/transfer-account-movements',
        loadComponent: () => import('./transfer-account-movements/transfer-account-movements.component').then(m => m.TransferAccountMovementsComponent),
      },
      {
        path: 'gl/cc-opening-balances',
        loadComponent: () => import('./cc-opening-balances/cc-opening-balances.component').then(m => m.CcOpeningBalancesComponent),
      },
      {
        path: 'admin/permissions',
        loadComponent: () => import('./permissions/permissions.component').then(m => m.PermissionsComponent),
        canActivate: [PermissionGuard],
        data: { permissions: ['Admin.ManagePermissions'] }
      },
      {
        path: 'system/company-info',
        loadComponent: () => import('./company-info/company-info.component').then(m => m.CompanyInfoComponent),
        canActivate: [PermissionGuard],
        data: { permissions: ['Comf.View'] }
      },
      {
        path: 'system/fotara-settings',
        loadComponent: () => import('./fotara-settings/fotara-settings.component').then(m => m.FotaraSettingsComponent),
        canActivate: [PermissionGuard],
        data: { permissions: ['Comf.View'] }
      },
      {
        path: 'settings/appearance',
        loadComponent: () => import('./appearance/appearance.component').then(m => m.AppearanceComponent),
      },
      { path: 'accounts-receivable',  loadComponent: uc },
      { path: 'accounts-payable',     loadComponent: uc },

      // تسوية البنك
      { path: 'bank-reconciliation', loadComponent: uc },

      // سندات
      {
        path: 'vouchers/journal',
        loadComponent: () => import('./journal-vouchers/journal-vouchers.component').then(m => m.JournalVouchersComponent),
      },
      {
        path: 'vouchers/journal-report',
        loadComponent: () => import('./journal-voucher-report/journal-voucher-report.component').then(m => m.JournalVoucherReportComponent),
      },
      {
        path: 'vouchers/acc-belong-report',
        loadComponent: () => import('./acc-belong-report/acc-belong-report.component').then(m => m.AccBelongReportComponent),
      },
      {
        path: 'reports/aging-analysis',
        loadComponent: () => import('./aging-analysis/aging-analysis.component').then(m => m.AgingAnalysisComponent),
      },
      {
        path: 'reports/trial-balance',
        loadComponent: () => import('./trial-balance/trial-balance.component').then(m => m.TrialBalanceComponent),
      },
      {
        path: 'reports/income-statement',
        loadComponent: () => import('./income-statement/income-statement.component').then(m => m.IncomeStatementComponent),
      },
      {
        path: 'reports/balance-sheet',
        loadComponent: () => import('./balance-sheet/balance-sheet.component').then(m => m.BalanceSheetComponent),
      },
      {
        path: 'reports/accounts-list',
        loadComponent: () => import('./accounts-list-report/accounts-list-report.component').then(m => m.AccountsListReportComponent),
      },
      {
        path: 'reports/beginning-balances',
        loadComponent: () => import('./beginning-balances-report/beginning-balances-report.component').then(m => m.BeginningBalancesReportComponent),
      },
      {
        path: 'reports/monthly-balances',
        loadComponent: () => import('./monthly-balances-report/monthly-balances-report.component').then(m => m.MonthlyBalancesReportComponent),
      },
      {
        path: 'reports/accounts-groups',
        loadComponent: () => import('./accounts-groups-report/accounts-groups-report.component').then(m => m.AccountsGroupsReportComponent),
      },
      {
        path: 'reports/cost-center-account-balances',
        loadComponent: () => import('./cost-center-account-balances-report/cost-center-account-balances-report.component').then(m => m.CostCenterAccountBalancesReportComponent),
      },
      {
        path: 'reports/cost-center-transactions',
        loadComponent: () => import('./cost-center-transactions-report/cost-center-transactions-report.component').then(m => m.CostCenterTransactionsReportComponent),
      },
      {
        path: 'reports/incoming-cheque-movement',
        loadComponent: () => import('./incoming-cheque-movement-report/incoming-cheque-movement-report.component').then(m => m.IncomingChequeMovementReportComponent),
      },
      {
        path: 'reports/inward-cheques',
        loadComponent: () => import('./inward-cheques-report/inward-cheques-report.component').then(m => m.InwardChequesReportComponent),
      },
      {
        path: 'reports/outward-cheques',
        loadComponent: () => import('./outward-cheques-report/outward-cheques-report.component').then(m => m.OutwardChequesReportComponent),
      },
      {
        path: 'reports/cheques-to-beneficiary',
        loadComponent: () => import('./cheques-to-beneficiary-report/cheques-to-beneficiary-report.component').then(m => m.ChequesToBeneficiaryReportComponent),
      },
      {
        path: 'reports/payment-vouchers',
        loadComponent: () => import('./payment-vouchers-report/payment-vouchers-report.component').then(m => m.PaymentVouchersReportComponent),
      },
      {
        path: 'misc/missing-vouchers',
        loadComponent: () => import('./missing-vouchers-report/missing-vouchers-report.component').then(m => m.MissingVouchersReportComponent),
      },
      {
        path: 'misc/year-end-closing',
        loadComponent: () => import('./year-end-closing/year-end-closing.component').then(m => m.YearEndClosingComponent),
      },
      {
        path: 'misc/account-ledger',
        loadComponent: () => import('./account-ledger/account-ledger.component').then(m => m.AccountLedgerComponent),
      },
      {
        path: 'reports/detailed-statement',
        loadComponent: () => import('./acc-detailed-statement/acc-detailed-statement.component').then(m => m.AccDetailedStatementComponent),
      },
      { path: 'vouchers/receipt',        loadComponent: uc },
      { path: 'vouchers/check-payment',  loadComponent: uc },
      {
        path: 'vouchers/cash-payment',
        loadComponent: () => import('./cash-payment/cash-payment.component').then(m => m.CashPaymentComponent),
      },

      // التعريفات
      {
        path: 'definitions/banks',
        loadComponent: () => import('./banks/banks.component').then(m => m.BanksComponent),
      },
      {
        path: 'definitions/currencies',
        loadComponent: () => import('./currencies/currencies.component').then(m => m.CurrenciesComponent),
      },
      {
        path: 'definitions/account-groups',
        loadComponent: () => import('./account-groups/account-groups.component').then(m => m.AccountGroupsComponent),
      },
      {
        path: 'definitions/cost-centers',
        loadComponent: () => import('./cost-centers/cost-centers.component').then(m => m.CostCentersComponent),
      },
      {
        path: 'definitions/stamps',
        loadComponent: () => import('./stamps/stamps.component').then(m => m.StampsComponent),
      },
      {
        path: 'definitions/taxes',
        loadComponent: () => import('./taxes/taxes.component').then(m => m.TaxesComponent),
      },

      // الشيكات
      {
        path: 'cheques/incoming-first',
        loadComponent: () => import('./incoming-cheq1/incoming-cheq1.component').then(m => m.IncomingCheq1Component),
      },
      {
        path: 'cheques/outgoing-first',
        loadComponent: () => import('./outgoing-cheq1/outgoing-cheq1.component').then(m => m.OutgoingCheq1Component),
      },
      {
        path: 'cheques/deposit',
        loadComponent: () => import('./cheque-deposit/cheque-deposit.component').then(m => m.ChequeDepositComponent),
      },

      {
        path: 'cheques/collection',
        loadComponent: () => import('./cheque-collection/cheque-collection.component').then(m => m.ChequeCollectionComponent),
      },
      {
        path: 'cheques/return',
        loadComponent: () => import('./cheque-return/cheque-return.component').then(m => m.ChequeReturnComponent),
      },
      {
        path: 'cheques/re-return',
        loadComponent: () => import('./re-deposit-ret/re-deposit-ret.component').then(m => m.ReDepositRetComponent),
      },
      {
        path: 'cheques/withdrawal',
        loadComponent: () => import('./cheque-withdrawal/cheque-withdrawal.component').then(m => m.ChequeWithdrawalComponent),
      },
      {
        path: 'cheques/endorse',
        loadComponent: () => import('./cheque-endorsement/cheque-endorsement.component').then(m => m.ChequeEndorsementComponent),
      },
      {
        path: 'cheques/tracking',
        loadComponent: () => import('./cheq-tracking/cheq-tracking.component').then(m => m.CheqTrackingComponent),
      },

      // الفواتير
      {
        path: 'invoices/service',
        loadComponent: () => import('./serv-bill/serv-bill.component').then(m => m.ServBillComponent),
      },

      // متفرقات
      {
        path: 'misc/document-posting',
        loadComponent: () => import('./document-posting/document-posting.component').then(m => m.DocumentPostingComponent),
      },
      {
        path: 'misc/document-unposting',
        loadComponent: () => import('./document-unposting/document-unposting.component').then(m => m.DocumentUnpostingComponent),
      },

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
