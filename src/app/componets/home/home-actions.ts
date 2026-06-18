// Shared action-shortcut definitions used by both Home (home.component)
// and Home 2 (home2.component) so the two pages never drift apart.

export interface ActionCard {
  icon:  string;
  labelKey: string;
  path:  string;
  color: string;
}

export interface ActionGroup {
  titleKey: string;
  icon:     string;
  color:    string;
  cards:    ActionCard[];
}

export const HOME_ACTION_GROUPS: ActionGroup[] = [
  {
    titleKey: 'Home.Groups.Vouchers',
    icon:  'ti ti-notebook',
    color: 'primary',
    cards: [
      { icon: 'ti ti-notebook',       labelKey: 'Nav.Accounting.JournalVouchers', path: '/accounting/vouchers/journal',          color: 'primary' },
      { icon: 'ti ti-receipt',        labelKey: 'Nav.Accounting.ReceiptVouchers', path: '/accounting/receipt-vouchers',          color: 'primary' },
      { icon: 'ti ti-cash-banknote',  labelKey: 'Nav.Accounting.CashPayment',     path: '/accounting/vouchers/cash-payment',     color: 'primary' },
      { icon: 'ti ti-writing-sign',   labelKey: 'Nav.Accounting.ChequePayment',   path: '/accounting/cheques/payment-voucher',   color: 'primary' },
    ],
  },
  {
    titleKey: 'Home.Groups.Cheques',
    icon:  'ti ti-writing',
    color: 'warning',
    cards: [
      { icon: 'ti ti-writing',          labelKey: 'Nav.Accounting.IncomingCheques',   path: '/accounting/cheques/incoming-first', color: 'warning' },
      { icon: 'ti ti-send',             labelKey: 'Nav.Accounting.OutgoingCheques',   path: '/accounting/cheques/outgoing-first', color: 'warning' },
      { icon: 'ti ti-building-bank',    labelKey: 'Nav.Accounting.ChequeDeposit',     path: '/accounting/cheques/deposit',        color: 'warning' },
      { icon: 'ti ti-coin',             labelKey: 'Nav.Accounting.ChequeCollection',  path: '/accounting/cheques/collection',     color: 'warning' },
      { icon: 'ti ti-arrow-back-up',    labelKey: 'Nav.Accounting.ChequeReturn',      path: '/accounting/cheques/return',         color: 'warning' },
      { icon: 'ti ti-arrows-exchange',  labelKey: 'Nav.Accounting.ChequeEndorsement', path: '/accounting/cheques/endorse',        color: 'warning' },
      { icon: 'ti ti-list-search',      labelKey: 'Nav.Accounting.ChequeTracking',    path: '/accounting/cheques/tracking',       color: 'warning' },
    ],
  },
  {
    titleKey: 'Home.Groups.Sales',
    icon:  'ti ti-shopping-cart',
    color: 'success',
    cards: [
      { icon: 'ti ti-file-invoice',      labelKey: 'Nav.Sales.Invoices',         path: '/sales/invoice',                  color: 'success' },
      { icon: 'ti ti-transfer',          labelKey: 'Nav.Sales.TransferInvoices', path: '/sales/transfer-invoices',        color: 'success' },
      { icon: 'ti ti-clipboard-list',    labelKey: 'Nav.Sales.ServiceInvoices',  path: '/sales/service-invoices',         color: 'success' },
      { icon: 'ti ti-receipt-refund',    labelKey: 'Nav.Sales.Refunds',          path: '/sales/invoice-refund',           color: 'success' },
      { icon: 'ti ti-file-check',        labelKey: 'Nav.Accounting.ServBill',    path: '/accounting/invoices/service',    color: 'success' },
    ],
  },
  {
    titleKey: 'Home.Groups.Reports',
    icon:  'ti ti-chart-bar',
    color: 'info',
    cards: [
      { icon: 'ti ti-file-description', labelKey: 'Nav.Accounting.DetailedStatement',    path: '/accounting/reports/detailed-statement',    color: 'info' },
      { icon: 'ti ti-report',           labelKey: 'Nav.Accounting.JvReport',              path: '/accounting/vouchers/journal-report',        color: 'info' },
      { icon: 'ti ti-report-analytics', labelKey: 'Nav.Accounting.AccBelongReport',       path: '/accounting/vouchers/acc-belong-report',     color: 'info' },
      { icon: 'ti ti-cash-banknote',    labelKey: 'Nav.Accounting.AgingAnalysis',          path: '/accounting/reports/aging-analysis',         color: 'info' },
      { icon: 'ti ti-scale',            labelKey: 'Nav.Accounting.TrialBalance',           path: '/accounting/reports/trial-balance',          color: 'info' },
      { icon: 'ti ti-coin',             labelKey: 'Nav.Accounting.IncomeStatement',        path: '/accounting/reports/income-statement',       color: 'info' },
      { icon: 'ti ti-book',             labelKey: 'Nav.Accounting.BalanceSheet',           path: '/accounting/reports/balance-sheet',          color: 'info' },
      { icon: 'ti ti-list-numbers',     labelKey: 'Nav.Accounting.AccountsListReport',     path: '/accounting/reports/accounts-list',          color: 'info' },
      { icon: 'ti ti-database-export',  labelKey: 'Nav.Accounting.BeginningBalances',      path: '/accounting/reports/beginning-balances',     color: 'info' },
      { icon: 'ti ti-calendar-stats',   labelKey: 'Nav.Accounting.MonthlyBalances',        path: '/accounting/reports/monthly-balances',       color: 'info' },
      { icon: 'ti ti-folders',          labelKey: 'Nav.Accounting.AccountsGroupsReport',   path: '/accounting/reports/accounts-groups',        color: 'info' },
      { icon: 'ti ti-map-pin-dollar',   labelKey: 'Nav.Accounting.CostCenterAccBalances',  path: '/accounting/reports/cost-center-account-balances', color: 'info' },
      { icon: 'ti ti-arrows-exchange',  labelKey: 'Nav.Accounting.CostCenterTransactions', path: '/accounting/reports/cost-center-transactions', color: 'info' },
      { icon: 'ti ti-checkbook',        labelKey: 'Nav.Accounting.IncomingChequeMovement', path: '/accounting/reports/incoming-cheque-movement', color: 'info' },
      { icon: 'ti ti-cash-banknote',    labelKey: 'Nav.Accounting.InwardCheques', path: '/accounting/reports/inward-cheques', color: 'info' },
      { icon: 'ti ti-cash-banknote-off', labelKey: 'Nav.Accounting.OutwardCheques', path: '/accounting/reports/outward-cheques', color: 'info' },
      { icon: 'ti ti-user-dollar',      labelKey: 'Nav.Accounting.ChequesToBeneficiary', path: '/accounting/reports/cheques-to-beneficiary', color: 'info' },
      { icon: 'ti ti-file-invoice',     labelKey: 'Nav.Accounting.PaymentVouchers', path: '/accounting/reports/payment-vouchers', color: 'info' },
      { icon: 'ti ti-file-alert',       labelKey: 'Nav.Accounting.MissingVouchers', path: '/accounting/misc/missing-vouchers', color: 'info' },
      { icon: 'ti ti-calendar-stats',   labelKey: 'Nav.Accounting.YearEndClosing', path: '/accounting/misc/year-end-closing', color: 'info' },
      { icon: 'ti ti-list-search',      labelKey: 'Nav.Accounting.AccountLedger', path: '/accounting/misc/account-ledger', color: 'info' },
    ],
  },
  {
    titleKey: 'Home.Groups.Accounts',
    icon:  'ti ti-list-details',
    color: 'purple',
    cards: [
      { icon: 'ti ti-list-details',     labelKey: 'Nav.Accounting.AccountsList',       path: '/accounting/gl/accounts-list',             color: 'purple' },
      { icon: 'ti ti-database-plus',    labelKey: 'Nav.Accounting.OpeningBalances',    path: '/accounting/gl/opening-balances',          color: 'purple' },
      { icon: 'ti ti-link',             labelKey: 'Nav.Accounting.LinkAccounts',       path: '/accounting/gl/link-accounts',             color: 'purple' },
      { icon: 'ti ti-link-plus',        labelKey: 'Nav.Accounting.LinkGroupsToAccounts', path: '/accounting/gl/link-groups-accounts',    color: 'purple' },
    ],
  },
  {
    titleKey: 'Home.Groups.Definitions',
    icon:  'ti ti-settings',
    color: 'secondary',
    cards: [
      { icon: 'ti ti-building-bank',   labelKey: 'Nav.Accounting.Banks',        path: '/accounting/definitions/banks',        color: 'secondary' },
      { icon: 'ti ti-currency-dollar', labelKey: 'Nav.Accounting.Currencies',   path: '/accounting/definitions/currencies',   color: 'secondary' },
      { icon: 'ti ti-folder-open',     labelKey: 'Nav.Accounting.AccountGroups', path: '/accounting/definitions/account-groups', color: 'secondary' },
      { icon: 'ti ti-map-pin',         labelKey: 'Nav.Accounting.CostCenters',  path: '/accounting/definitions/cost-centers', color: 'secondary' },
      { icon: 'ti ti-percentage',      labelKey: 'Nav.Accounting.Taxes',        path: '/accounting/definitions/taxes',        color: 'secondary' },
      { icon: 'ti ti-stamp',           labelKey: 'Nav.Accounting.Stamps',       path: '/accounting/definitions/stamps',       color: 'secondary' },
    ],
  },
  {
    titleKey: 'Home.Groups.System',
    icon:  'ti ti-settings-2',
    color: 'danger',
    cards: [
      { icon: 'ti ti-lock-access',   labelKey: 'Nav.Accounting.Permissions',  path: '/accounting/admin/permissions',    color: 'danger' },
      { icon: 'ti ti-building',      labelKey: 'Nav.System.CompanyInfo',      path: '/accounting/system/company-info', color: 'danger' },
      { icon: 'ti ti-palette',       labelKey: 'Nav.System.Appearance',       path: '/accounting/settings/appearance', color: 'danger' },
      { icon: 'ti ti-activity',      labelKey: 'Nav.ActivityLog',             path: '/activity-log',                  color: 'danger' },
    ],
  },
];
