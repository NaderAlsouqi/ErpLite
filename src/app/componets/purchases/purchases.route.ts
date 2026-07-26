import { Routes } from '@angular/router';
import { PermissionGuard } from '../../shared/guards/permission.guard';

/**
 * Purchases module (نظام ادارة المشتريات).
 * The item card reuses the Warehouse ItemCardComponent but is gated by its own
 * permission set (PurchItemCard.*) via route data.permPrefix.
 */
export const purchasesRoutes: Routes = [
  {
    path: 'purchases/entry/item-card',
    loadComponent: () => import('../warehouse/item-card/item-card.component').then(m => m.ItemCardComponent),
    canActivate: [PermissionGuard],
    data: { permissions: ['PurchItemCard.View'], permPrefix: 'PurchItemCard' },
  },
  {
    path: 'purchases/entry/suppliers',
    loadComponent: () => import('../warehouse/vendors/vendors.component').then(m => m.VendorsComponent),
    canActivate: [PermissionGuard],
    data: { permissions: ['PurchVendors.View'], permPrefix: 'PurchVendors' },
  },
  {
    path: 'purchases/entry/payment-terms',
    loadComponent: () => import('./payment-terms/payment-terms.component').then(m => m.PaymentTermsComponent),
    canActivate: [PermissionGuard],
    data: { permissions: ['PaymentTerms.View'] },
  },
  {
    path: 'purchases/entry/purchase-expenses',
    loadComponent: () => import('./purchase-expenses/purchase-expenses.component').then(m => m.PurchaseExpensesComponent),
    canActivate: [PermissionGuard],
    data: { permissions: ['PurchaseExpenses.View'] },
  },
  {
    path: 'purchases/entry/inbound',
    loadComponent: () => import('../warehouse/inbound-voucher/inbound-voucher.component').then(m => m.InboundVoucherComponent),
    canActivate: [PermissionGuard],
    data: { permissions: ['PurchInbound.View'], permPrefix: 'PurchInbound' },
  },
  {
    path: 'purchases/entry/outbound',
    loadComponent: () => import('../warehouse/outbound-voucher/outbound-voucher.component').then(m => m.OutboundVoucherComponent),
    canActivate: [PermissionGuard],
    data: { permissions: ['PurchOutbound.View'], permPrefix: 'PurchOutbound' },
  },
  {
    path: 'purchases/entry/taxes',
    loadComponent: () => import('../accounting/taxes/taxes.component').then(m => m.TaxesComponent),
    canActivate: [PermissionGuard],
    data: { permissions: ['PurchTaxes.View'], permPrefix: 'PurchTaxes' },
  },
  {
    path: 'purchases/entry/tax-conditions',
    loadComponent: () => import('./tax-conditions/tax-conditions.component').then(m => m.TaxConditionsComponent),
    canActivate: [PermissionGuard],
    data: { permissions: ['TaxConditions.View'], permPrefix: 'TaxConditions' },
  },
  {
    path: 'purchases/documents/material-request',
    loadComponent: () => import('./material-request/material-request.component').then(m => m.MaterialRequestComponent),
    canActivate: [PermissionGuard],
    data: { permissions: ['MaterialRequest.View'] },
  },
  {
    path: 'purchases/documents/purchase-order',
    loadComponent: () => import('./purchase-order/purchase-order.component').then(m => m.PurchaseOrderComponent),
    canActivate: [PermissionGuard],
    data: { permissions: ['PurchaseOrder.View'] },
  },
  {
    path: 'purchases/documents/supplier-quotation',
    loadComponent: () => import('./supplier-quotation/supplier-quotation.component').then(m => m.SupplierQuotationComponent),
    canActivate: [PermissionGuard],
    data: { permissions: ['SupplierQuotation.View'] },
  },
  {
    path: 'purchases/documents/rfq',
    loadComponent: () => import('./rfq/rfq.component').then(m => m.RfqComponent),
    canActivate: [PermissionGuard],
    data: { permissions: ['Rfq.View'] },
  },
  {
    path: 'purchases/documents/po-consolidation',
    loadComponent: () => import('./po-consolidation/po-consolidation.component').then(m => m.PoConsolidationComponent),
    canActivate: [PermissionGuard],
    data: { permissions: ['PoConsolidation.View'] },
  },
  {
    path: 'purchases/documents/purchase-order-doc',
    loadComponent: () => import('./purchase-order-doc/purchase-order-doc.component').then(m => m.PurchaseOrderDocComponent),
    canActivate: [PermissionGuard],
    data: { permissions: ['PurchaseOrderDoc.View'] },
  },
  {
    path: 'purchases/documents/goods-receipt',
    loadComponent: () => import('../warehouse/goods-receipt/goods-receipt.component').then(m => m.GoodsReceiptComponent),
    canActivate: [PermissionGuard],
    data: { permissions: ['GoodsReceipt.View'] },
  },
  {
    path: 'purchases/documents/purchase-invoice',
    loadComponent: () => import('./purchase-invoice/purchase-invoice.component').then(m => m.PurchaseInvoiceComponent),
    canActivate: [PermissionGuard],
    data: { permissions: ['PurchaseInvoice.View'] },
  },
];
