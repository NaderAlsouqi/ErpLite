// AUTO-GENERATED from the Angular route modules (src/app/componets/**/*.route.ts).
// Regenerate with: node scripts/extract-routes.cjs  (see README).
// 133 navigable routes across all modules.

export interface RouteEntry {
  /** Feature module the route belongs to. */
  module: string;
  /** Absolute app path (Angular router URL). */
  path: string;
  /** True when the route currently loads an 'under construction' / placeholder page. */
  isPlaceholder: boolean;
  /** True when the path has a required :param and cannot be visited blindly. */
  hasParam: boolean;
  /** True when a PermissionGuard protects the route. */
  requiresPermission: boolean;
  /** Permission keys required by the guard (empty unless requiresPermission). */
  permissions: string[];
}

export const ROUTES: RouteEntry[] = [
  {
    "module": "home",
    "path": "/home",
    "isPlaceholder": false,
    "hasParam": false,
    "requiresPermission": false,
    "permissions": []
  },
  {
    "module": "home",
    "path": "/home2",
    "isPlaceholder": false,
    "hasParam": false,
    "requiresPermission": false,
    "permissions": []
  },
  {
    "module": "dashboard",
    "path": "/dashboard",
    "isPlaceholder": false,
    "hasParam": false,
    "requiresPermission": false,
    "permissions": []
  },
  {
    "module": "dashboard2",
    "path": "/dashboard2",
    "isPlaceholder": false,
    "hasParam": false,
    "requiresPermission": false,
    "permissions": []
  },
  {
    "module": "activity-log",
    "path": "/activity-log",
    "isPlaceholder": false,
    "hasParam": false,
    "requiresPermission": false,
    "permissions": []
  },
  {
    "module": "sales",
    "path": "/sales/invoice",
    "isPlaceholder": false,
    "hasParam": false,
    "requiresPermission": false,
    "permissions": []
  },
  {
    "module": "sales",
    "path": "/sales/add-invoice",
    "isPlaceholder": false,
    "hasParam": false,
    "requiresPermission": false,
    "permissions": []
  },
  {
    "module": "sales",
    "path": "/sales/invoice-details/:TransactionNumber",
    "isPlaceholder": false,
    "hasParam": true,
    "requiresPermission": false,
    "permissions": []
  },
  {
    "module": "sales",
    "path": "/sales/refund-details",
    "isPlaceholder": false,
    "hasParam": false,
    "requiresPermission": false,
    "permissions": []
  },
  {
    "module": "sales",
    "path": "/sales/add-refund",
    "isPlaceholder": false,
    "hasParam": false,
    "requiresPermission": false,
    "permissions": []
  },
  {
    "module": "sales",
    "path": "/sales/refund",
    "isPlaceholder": false,
    "hasParam": false,
    "requiresPermission": false,
    "permissions": []
  },
  {
    "module": "sales",
    "path": "/sales/transfer-invoices",
    "isPlaceholder": false,
    "hasParam": false,
    "requiresPermission": false,
    "permissions": []
  },
  {
    "module": "sales",
    "path": "/sales/transfer-refunds",
    "isPlaceholder": false,
    "hasParam": false,
    "requiresPermission": false,
    "permissions": []
  },
  {
    "module": "sales",
    "path": "/sales/transfered-invoices",
    "isPlaceholder": false,
    "hasParam": false,
    "requiresPermission": false,
    "permissions": []
  },
  {
    "module": "sales",
    "path": "/sales/transfered-refunds",
    "isPlaceholder": false,
    "hasParam": false,
    "requiresPermission": false,
    "permissions": []
  },
  {
    "module": "sales",
    "path": "/sales/virtual/add-invoice",
    "isPlaceholder": false,
    "hasParam": false,
    "requiresPermission": false,
    "permissions": []
  },
  {
    "module": "sales",
    "path": "/sales/virtual/transfer-invoices",
    "isPlaceholder": false,
    "hasParam": false,
    "requiresPermission": false,
    "permissions": []
  },
  {
    "module": "sales",
    "path": "/sales/virtual/invoice-details/:TransactionNumber",
    "isPlaceholder": false,
    "hasParam": true,
    "requiresPermission": false,
    "permissions": []
  },
  {
    "module": "sales",
    "path": "/sales/virtual/transfered-invoices",
    "isPlaceholder": false,
    "hasParam": false,
    "requiresPermission": false,
    "permissions": []
  },
  {
    "module": "sales",
    "path": "/sales/virtual/invoices",
    "isPlaceholder": false,
    "hasParam": false,
    "requiresPermission": false,
    "permissions": []
  },
  {
    "module": "sales",
    "path": "/sales/service/invoice",
    "isPlaceholder": false,
    "hasParam": false,
    "requiresPermission": false,
    "permissions": []
  },
  {
    "module": "sales",
    "path": "/sales/service/invoice-details/:TransactionNumber",
    "isPlaceholder": false,
    "hasParam": true,
    "requiresPermission": false,
    "permissions": []
  },
  {
    "module": "sales",
    "path": "/sales/service/add-invoice",
    "isPlaceholder": false,
    "hasParam": false,
    "requiresPermission": false,
    "permissions": []
  },
  {
    "module": "sales",
    "path": "/sales/service/transfer-invoices",
    "isPlaceholder": false,
    "hasParam": false,
    "requiresPermission": false,
    "permissions": []
  },
  {
    "module": "sales",
    "path": "/sales/service/transfered-invoices",
    "isPlaceholder": false,
    "hasParam": false,
    "requiresPermission": false,
    "permissions": []
  },
  {
    "module": "sales",
    "path": "/sales/service/refunds",
    "isPlaceholder": false,
    "hasParam": false,
    "requiresPermission": false,
    "permissions": []
  },
  {
    "module": "sales",
    "path": "/sales/service/add-refund",
    "isPlaceholder": false,
    "hasParam": false,
    "requiresPermission": false,
    "permissions": []
  },
  {
    "module": "sales",
    "path": "/sales/service/refund-details",
    "isPlaceholder": false,
    "hasParam": false,
    "requiresPermission": false,
    "permissions": []
  },
  {
    "module": "sales",
    "path": "/sales/service/transfer-refunds",
    "isPlaceholder": false,
    "hasParam": false,
    "requiresPermission": false,
    "permissions": []
  },
  {
    "module": "sales",
    "path": "/sales/service/transfered-refunds",
    "isPlaceholder": false,
    "hasParam": false,
    "requiresPermission": false,
    "permissions": []
  },
  {
    "module": "sales",
    "path": "/sales/virtual/refunds",
    "isPlaceholder": false,
    "hasParam": false,
    "requiresPermission": false,
    "permissions": []
  },
  {
    "module": "sales",
    "path": "/sales/virtual/add-refund",
    "isPlaceholder": false,
    "hasParam": false,
    "requiresPermission": false,
    "permissions": []
  },
  {
    "module": "sales",
    "path": "/sales/virtual/refund-details",
    "isPlaceholder": false,
    "hasParam": false,
    "requiresPermission": false,
    "permissions": []
  },
  {
    "module": "sales",
    "path": "/sales/virtual/transfer-refunds",
    "isPlaceholder": false,
    "hasParam": false,
    "requiresPermission": false,
    "permissions": []
  },
  {
    "module": "sales",
    "path": "/sales/virtual/transfered-refunds",
    "isPlaceholder": false,
    "hasParam": false,
    "requiresPermission": false,
    "permissions": []
  },
  {
    "module": "reports",
    "path": "/reports/account-statement",
    "isPlaceholder": false,
    "hasParam": false,
    "requiresPermission": false,
    "permissions": []
  },
  {
    "module": "accounting",
    "path": "/accounting/service-misc/voucher-serials",
    "isPlaceholder": false,
    "hasParam": false,
    "requiresPermission": false,
    "permissions": []
  },
  {
    "module": "accounting",
    "path": "/accounting/service-misc/branches",
    "isPlaceholder": false,
    "hasParam": false,
    "requiresPermission": false,
    "permissions": []
  },
  {
    "module": "accounting",
    "path": "/accounting/receipt-vouchers",
    "isPlaceholder": false,
    "hasParam": false,
    "requiresPermission": false,
    "permissions": []
  },
  {
    "module": "accounting",
    "path": "/accounting/virtual/receipt-vouchers",
    "isPlaceholder": false,
    "hasParam": false,
    "requiresPermission": false,
    "permissions": []
  },
  {
    "module": "accounting",
    "path": "/accounting/ar/customers",
    "isPlaceholder": true,
    "hasParam": false,
    "requiresPermission": false,
    "permissions": []
  },
  {
    "module": "accounting",
    "path": "/accounting/ar/cheque-receipt-vouchers",
    "isPlaceholder": true,
    "hasParam": false,
    "requiresPermission": false,
    "permissions": []
  },
  {
    "module": "accounting",
    "path": "/accounting/cheques/payment-voucher",
    "isPlaceholder": false,
    "hasParam": false,
    "requiresPermission": false,
    "permissions": []
  },
  {
    "module": "accounting",
    "path": "/accounting/ap/suppliers",
    "isPlaceholder": true,
    "hasParam": false,
    "requiresPermission": false,
    "permissions": []
  },
  {
    "module": "accounting",
    "path": "/accounting/gl/accounts-list",
    "isPlaceholder": false,
    "hasParam": false,
    "requiresPermission": false,
    "permissions": []
  },
  {
    "module": "accounting",
    "path": "/accounting/gl/opening-balances",
    "isPlaceholder": false,
    "hasParam": false,
    "requiresPermission": false,
    "permissions": []
  },
  {
    "module": "accounting",
    "path": "/accounting/gl/link-groups-accounts",
    "isPlaceholder": false,
    "hasParam": false,
    "requiresPermission": false,
    "permissions": []
  },
  {
    "module": "accounting",
    "path": "/accounting/gl/link-accounts",
    "isPlaceholder": false,
    "hasParam": false,
    "requiresPermission": false,
    "permissions": []
  },
  {
    "module": "accounting",
    "path": "/accounting/gl/edit-account-name",
    "isPlaceholder": false,
    "hasParam": false,
    "requiresPermission": false,
    "permissions": []
  },
  {
    "module": "accounting",
    "path": "/accounting/gl/clear-cost-centers",
    "isPlaceholder": false,
    "hasParam": false,
    "requiresPermission": false,
    "permissions": []
  },
  {
    "module": "accounting",
    "path": "/accounting/gl/transfer-account-movements",
    "isPlaceholder": false,
    "hasParam": false,
    "requiresPermission": false,
    "permissions": []
  },
  {
    "module": "accounting",
    "path": "/accounting/gl/cc-opening-balances",
    "isPlaceholder": false,
    "hasParam": false,
    "requiresPermission": false,
    "permissions": []
  },
  {
    "module": "accounting",
    "path": "/accounting/admin/permissions",
    "isPlaceholder": false,
    "hasParam": false,
    "requiresPermission": true,
    "permissions": [
      "Admin.ManagePermissions"
    ]
  },
  {
    "module": "accounting",
    "path": "/accounting/system/company-info",
    "isPlaceholder": false,
    "hasParam": false,
    "requiresPermission": true,
    "permissions": [
      "Comf.View"
    ]
  },
  {
    "module": "accounting",
    "path": "/accounting/system/fotara-settings",
    "isPlaceholder": false,
    "hasParam": false,
    "requiresPermission": true,
    "permissions": [
      "Comf.View"
    ]
  },
  {
    "module": "accounting",
    "path": "/accounting/settings/appearance",
    "isPlaceholder": false,
    "hasParam": false,
    "requiresPermission": false,
    "permissions": []
  },
  {
    "module": "accounting",
    "path": "/accounting/accounts-receivable",
    "isPlaceholder": true,
    "hasParam": false,
    "requiresPermission": false,
    "permissions": []
  },
  {
    "module": "accounting",
    "path": "/accounting/accounts-payable",
    "isPlaceholder": true,
    "hasParam": false,
    "requiresPermission": false,
    "permissions": []
  },
  {
    "module": "accounting",
    "path": "/accounting/bank-reconciliation",
    "isPlaceholder": true,
    "hasParam": false,
    "requiresPermission": false,
    "permissions": []
  },
  {
    "module": "accounting",
    "path": "/accounting/vouchers/journal",
    "isPlaceholder": false,
    "hasParam": false,
    "requiresPermission": false,
    "permissions": []
  },
  {
    "module": "accounting",
    "path": "/accounting/vouchers/journal-report",
    "isPlaceholder": false,
    "hasParam": false,
    "requiresPermission": false,
    "permissions": []
  },
  {
    "module": "accounting",
    "path": "/accounting/vouchers/acc-belong-report",
    "isPlaceholder": false,
    "hasParam": false,
    "requiresPermission": false,
    "permissions": []
  },
  {
    "module": "accounting",
    "path": "/accounting/reports/aging-analysis",
    "isPlaceholder": false,
    "hasParam": false,
    "requiresPermission": false,
    "permissions": []
  },
  {
    "module": "accounting",
    "path": "/accounting/reports/trial-balance",
    "isPlaceholder": false,
    "hasParam": false,
    "requiresPermission": false,
    "permissions": []
  },
  {
    "module": "accounting",
    "path": "/accounting/reports/income-statement",
    "isPlaceholder": false,
    "hasParam": false,
    "requiresPermission": false,
    "permissions": []
  },
  {
    "module": "accounting",
    "path": "/accounting/reports/balance-sheet",
    "isPlaceholder": false,
    "hasParam": false,
    "requiresPermission": false,
    "permissions": []
  },
  {
    "module": "accounting",
    "path": "/accounting/reports/accounts-list",
    "isPlaceholder": false,
    "hasParam": false,
    "requiresPermission": false,
    "permissions": []
  },
  {
    "module": "accounting",
    "path": "/accounting/reports/beginning-balances",
    "isPlaceholder": false,
    "hasParam": false,
    "requiresPermission": false,
    "permissions": []
  },
  {
    "module": "accounting",
    "path": "/accounting/reports/monthly-balances",
    "isPlaceholder": false,
    "hasParam": false,
    "requiresPermission": false,
    "permissions": []
  },
  {
    "module": "accounting",
    "path": "/accounting/reports/accounts-groups",
    "isPlaceholder": false,
    "hasParam": false,
    "requiresPermission": false,
    "permissions": []
  },
  {
    "module": "accounting",
    "path": "/accounting/reports/cost-center-account-balances",
    "isPlaceholder": false,
    "hasParam": false,
    "requiresPermission": false,
    "permissions": []
  },
  {
    "module": "accounting",
    "path": "/accounting/reports/cost-center-transactions",
    "isPlaceholder": false,
    "hasParam": false,
    "requiresPermission": false,
    "permissions": []
  },
  {
    "module": "accounting",
    "path": "/accounting/reports/incoming-cheque-movement",
    "isPlaceholder": false,
    "hasParam": false,
    "requiresPermission": false,
    "permissions": []
  },
  {
    "module": "accounting",
    "path": "/accounting/reports/inward-cheques",
    "isPlaceholder": false,
    "hasParam": false,
    "requiresPermission": false,
    "permissions": []
  },
  {
    "module": "accounting",
    "path": "/accounting/reports/outward-cheques",
    "isPlaceholder": false,
    "hasParam": false,
    "requiresPermission": false,
    "permissions": []
  },
  {
    "module": "accounting",
    "path": "/accounting/reports/cheques-to-beneficiary",
    "isPlaceholder": false,
    "hasParam": false,
    "requiresPermission": false,
    "permissions": []
  },
  {
    "module": "accounting",
    "path": "/accounting/reports/payment-vouchers",
    "isPlaceholder": false,
    "hasParam": false,
    "requiresPermission": false,
    "permissions": []
  },
  {
    "module": "accounting",
    "path": "/accounting/misc/missing-vouchers",
    "isPlaceholder": false,
    "hasParam": false,
    "requiresPermission": false,
    "permissions": []
  },
  {
    "module": "accounting",
    "path": "/accounting/misc/year-end-closing",
    "isPlaceholder": false,
    "hasParam": false,
    "requiresPermission": false,
    "permissions": []
  },
  {
    "module": "accounting",
    "path": "/accounting/misc/account-ledger",
    "isPlaceholder": false,
    "hasParam": false,
    "requiresPermission": false,
    "permissions": []
  },
  {
    "module": "accounting",
    "path": "/accounting/reports/detailed-statement",
    "isPlaceholder": false,
    "hasParam": false,
    "requiresPermission": false,
    "permissions": []
  },
  {
    "module": "accounting",
    "path": "/accounting/vouchers/receipt",
    "isPlaceholder": true,
    "hasParam": false,
    "requiresPermission": false,
    "permissions": []
  },
  {
    "module": "accounting",
    "path": "/accounting/vouchers/check-payment",
    "isPlaceholder": true,
    "hasParam": false,
    "requiresPermission": false,
    "permissions": []
  },
  {
    "module": "accounting",
    "path": "/accounting/vouchers/cash-payment",
    "isPlaceholder": false,
    "hasParam": false,
    "requiresPermission": false,
    "permissions": []
  },
  {
    "module": "accounting",
    "path": "/accounting/definitions/banks",
    "isPlaceholder": false,
    "hasParam": false,
    "requiresPermission": false,
    "permissions": []
  },
  {
    "module": "accounting",
    "path": "/accounting/definitions/currencies",
    "isPlaceholder": false,
    "hasParam": false,
    "requiresPermission": false,
    "permissions": []
  },
  {
    "module": "accounting",
    "path": "/accounting/definitions/account-groups",
    "isPlaceholder": false,
    "hasParam": false,
    "requiresPermission": false,
    "permissions": []
  },
  {
    "module": "accounting",
    "path": "/accounting/definitions/cost-centers",
    "isPlaceholder": false,
    "hasParam": false,
    "requiresPermission": false,
    "permissions": []
  },
  {
    "module": "accounting",
    "path": "/accounting/definitions/stamps",
    "isPlaceholder": false,
    "hasParam": false,
    "requiresPermission": false,
    "permissions": []
  },
  {
    "module": "accounting",
    "path": "/accounting/definitions/taxes",
    "isPlaceholder": false,
    "hasParam": false,
    "requiresPermission": false,
    "permissions": []
  },
  {
    "module": "accounting",
    "path": "/accounting/cheques/incoming-first",
    "isPlaceholder": false,
    "hasParam": false,
    "requiresPermission": false,
    "permissions": []
  },
  {
    "module": "accounting",
    "path": "/accounting/cheques/outgoing-first",
    "isPlaceholder": false,
    "hasParam": false,
    "requiresPermission": false,
    "permissions": []
  },
  {
    "module": "accounting",
    "path": "/accounting/cheques/deposit",
    "isPlaceholder": false,
    "hasParam": false,
    "requiresPermission": false,
    "permissions": []
  },
  {
    "module": "accounting",
    "path": "/accounting/cheques/collection",
    "isPlaceholder": false,
    "hasParam": false,
    "requiresPermission": false,
    "permissions": []
  },
  {
    "module": "accounting",
    "path": "/accounting/cheques/return",
    "isPlaceholder": false,
    "hasParam": false,
    "requiresPermission": false,
    "permissions": []
  },
  {
    "module": "accounting",
    "path": "/accounting/cheques/re-return",
    "isPlaceholder": false,
    "hasParam": false,
    "requiresPermission": false,
    "permissions": []
  },
  {
    "module": "accounting",
    "path": "/accounting/cheques/withdrawal",
    "isPlaceholder": false,
    "hasParam": false,
    "requiresPermission": false,
    "permissions": []
  },
  {
    "module": "accounting",
    "path": "/accounting/cheques/endorse",
    "isPlaceholder": false,
    "hasParam": false,
    "requiresPermission": false,
    "permissions": []
  },
  {
    "module": "accounting",
    "path": "/accounting/cheques/tracking",
    "isPlaceholder": false,
    "hasParam": false,
    "requiresPermission": false,
    "permissions": []
  },
  {
    "module": "accounting",
    "path": "/accounting/invoices/service",
    "isPlaceholder": false,
    "hasParam": false,
    "requiresPermission": true,
    "permissions": [
      "ServBill.View"
    ]
  },
  {
    "module": "accounting",
    "path": "/accounting/misc/document-posting",
    "isPlaceholder": false,
    "hasParam": false,
    "requiresPermission": false,
    "permissions": []
  },
  {
    "module": "accounting",
    "path": "/accounting/misc/document-unposting",
    "isPlaceholder": false,
    "hasParam": false,
    "requiresPermission": false,
    "permissions": []
  },
  {
    "module": "accounting",
    "path": "/accounting/salaries/definitions/allowances",
    "isPlaceholder": true,
    "hasParam": false,
    "requiresPermission": false,
    "permissions": []
  },
  {
    "module": "accounting",
    "path": "/accounting/salaries/definitions/employees",
    "isPlaceholder": true,
    "hasParam": false,
    "requiresPermission": false,
    "permissions": []
  },
  {
    "module": "accounting",
    "path": "/accounting/salaries/calculate",
    "isPlaceholder": true,
    "hasParam": false,
    "requiresPermission": false,
    "permissions": []
  },
  {
    "module": "accounting",
    "path": "/accounting/salaries/employee-info",
    "isPlaceholder": true,
    "hasParam": false,
    "requiresPermission": false,
    "permissions": []
  },
  {
    "module": "accounting",
    "path": "/accounting/salaries/payslips",
    "isPlaceholder": true,
    "hasParam": false,
    "requiresPermission": false,
    "permissions": []
  },
  {
    "module": "accounting",
    "path": "/accounting/salaries/collective-payroll",
    "isPlaceholder": true,
    "hasParam": false,
    "requiresPermission": false,
    "permissions": []
  },
  {
    "module": "reseller",
    "path": "/reseller/notes",
    "isPlaceholder": false,
    "hasParam": false,
    "requiresPermission": false,
    "permissions": []
  },
  {
    "module": "reseller",
    "path": "/reseller/quotation",
    "isPlaceholder": false,
    "hasParam": false,
    "requiresPermission": false,
    "permissions": []
  },
  {
    "module": "warehouse",
    "path": "/warehouse/vouchers/inbound",
    "isPlaceholder": false,
    "hasParam": false,
    "requiresPermission": false,
    "permissions": []
  },
  {
    "module": "warehouse",
    "path": "/warehouse/vouchers/outbound",
    "isPlaceholder": false,
    "hasParam": false,
    "requiresPermission": false,
    "permissions": []
  },
  {
    "module": "warehouse",
    "path": "/warehouse/vouchers/damage",
    "isPlaceholder": false,
    "hasParam": false,
    "requiresPermission": false,
    "permissions": []
  },
  {
    "module": "warehouse",
    "path": "/warehouse/vouchers/transfer",
    "isPlaceholder": false,
    "hasParam": false,
    "requiresPermission": false,
    "permissions": []
  },
  {
    "module": "warehouse",
    "path": "/warehouse/vouchers/inventory-adjustment",
    "isPlaceholder": true,
    "hasParam": false,
    "requiresPermission": false,
    "permissions": []
  },
  {
    "module": "warehouse",
    "path": "/warehouse/vouchers/barcode-print",
    "isPlaceholder": false,
    "hasParam": false,
    "requiresPermission": false,
    "permissions": []
  },
  {
    "module": "warehouse",
    "path": "/warehouse/vouchers/monthly-cost-closing",
    "isPlaceholder": true,
    "hasParam": false,
    "requiresPermission": false,
    "permissions": []
  },
  {
    "module": "warehouse",
    "path": "/warehouse/entry/units",
    "isPlaceholder": false,
    "hasParam": false,
    "requiresPermission": false,
    "permissions": []
  },
  {
    "module": "warehouse",
    "path": "/warehouse/entry/warehouses",
    "isPlaceholder": false,
    "hasParam": false,
    "requiresPermission": false,
    "permissions": []
  },
  {
    "module": "warehouse",
    "path": "/warehouse/entry/suppliers",
    "isPlaceholder": false,
    "hasParam": false,
    "requiresPermission": false,
    "permissions": []
  },
  {
    "module": "warehouse",
    "path": "/warehouse/entry/disbursement-entities",
    "isPlaceholder": false,
    "hasParam": false,
    "requiresPermission": false,
    "permissions": []
  },
  {
    "module": "warehouse",
    "path": "/warehouse/entry/origin-country",
    "isPlaceholder": false,
    "hasParam": false,
    "requiresPermission": false,
    "permissions": []
  },
  {
    "module": "warehouse",
    "path": "/warehouse/entry/price-categories",
    "isPlaceholder": false,
    "hasParam": false,
    "requiresPermission": false,
    "permissions": []
  },
  {
    "module": "warehouse",
    "path": "/warehouse/entry/main-items",
    "isPlaceholder": false,
    "hasParam": false,
    "requiresPermission": false,
    "permissions": []
  },
  {
    "module": "warehouse",
    "path": "/warehouse/entry/sub-items",
    "isPlaceholder": false,
    "hasParam": false,
    "requiresPermission": false,
    "permissions": []
  },
  {
    "module": "warehouse",
    "path": "/warehouse/entry/item-card",
    "isPlaceholder": false,
    "hasParam": false,
    "requiresPermission": false,
    "permissions": []
  },
  {
    "module": "warehouse",
    "path": "/warehouse/entry/material-offers",
    "isPlaceholder": true,
    "hasParam": false,
    "requiresPermission": false,
    "permissions": []
  },
  {
    "module": "warehouse",
    "path": "/warehouse/entry/barcode",
    "isPlaceholder": false,
    "hasParam": false,
    "requiresPermission": false,
    "permissions": []
  },
  {
    "module": "warehouse",
    "path": "/warehouse/entry/replace-item-code",
    "isPlaceholder": false,
    "hasParam": false,
    "requiresPermission": false,
    "permissions": []
  },
  {
    "module": "warehouse",
    "path": "/warehouse/entry/brands",
    "isPlaceholder": false,
    "hasParam": false,
    "requiresPermission": false,
    "permissions": []
  },
  {
    "module": "workflow",
    "path": "/workflow/builder",
    "isPlaceholder": false,
    "hasParam": false,
    "requiresPermission": false,
    "permissions": []
  },
  {
    "module": "workflow",
    "path": "/workflow/tasks",
    "isPlaceholder": false,
    "hasParam": false,
    "requiresPermission": false,
    "permissions": []
  },
  {
    "module": "error",
    "path": "/error404",
    "isPlaceholder": false,
    "hasParam": false,
    "requiresPermission": false,
    "permissions": []
  }
];

/** Routes safe to smoke-test by direct navigation (no :param, real component). */
export const NAVIGABLE_ROUTES = ROUTES.filter(r => !r.hasParam);

/** Routes that render a real feature page (exclude placeholders + params). */
export const REAL_PAGE_ROUTES = ROUTES.filter(r => !r.hasParam && !r.isPlaceholder);

/** Placeholder / under-construction routes. */
export const PLACEHOLDER_ROUTES = ROUTES.filter(r => r.isPlaceholder);

/** Permission-guarded routes. */
export const GUARDED_ROUTES = ROUTES.filter(r => r.requiresPermission);

/** Routes with a required path parameter (need a real id to visit). */
export const PARAM_ROUTES = ROUTES.filter(r => r.hasParam);

export const ROUTES_BY_MODULE: Record<string, RouteEntry[]> =
  ROUTES.reduce((acc, r) => { (acc[r.module] ||= []).push(r); return acc; }, {} as Record<string, RouteEntry[]>);
