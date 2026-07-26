import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

// NOTE: Role-based route guarding has been removed. These routes are already
// behind the parent AuthGuard (login required); what a user can see/do on each
// page is now governed by the fine-grained permission system (*hasPermission,
// managed from accounting/admin/permissions). A user is NOT required to hold a
// specific role (Admin/Manager/Sales/…) to open these pages.
export const admin: Routes = [
  {
    path: 'sales', children: [
      {
        path: 'invoice',
        loadComponent: () => import('./sales-invoice/sales-invoice.component').then(m => m.SalesInvoiceComponent),
      },
      {
        path: 'add-invoice',
        loadComponent: () => import('./add-invoice/add-invoice.component').then(m => m.AddInvoiceComponent),
      },
      {
        path: 'invoice-details/:TransactionNumber',
        loadComponent: () => import('./invoice-details/invoice-details.component').then(m => m.InvoiceDetailsComponent),
      },
      {
        path: 'refund-details',
        loadComponent: () => import('./refund-details/refund-details.component').then(m => m.RefundDetailsComponent),
      },
      {
        path: 'add-refund',
        loadComponent: () => import('./add-refund/add-refund.component').then(m => m.AddRefundComponent),
      },
      {
        path: 'refund',
        loadComponent: () => import('./invoice-refund/invoice-refund.component').then(m => m.InvoiceRefundComponent),
      },
      {
        path: 'transfer-invoices',
        loadComponent: () => import('./transfer-invoices/transfer-invoices.component').then(m => m.TransferInvoicesComponent),
      },
      {
        path: 'transfer-refunds',
        loadComponent: () => import('./transfer-refunds/transfer-refunds.component').then(m => m.TransferRefundsComponent),
      },
      {
        path: 'transfered-invoices',
        loadComponent: () => import('./transfered-invoices/transfered-invoices.component').then(m => m.TransferedInvoicesComponent),
      },
      {
        path: 'transfered-refunds',
        loadComponent: () => import('./transfered-refunds/transfered-refunds.component').then(m => m.TransferedRefundsComponent),
      },
      {
        path: 'virtual/add-invoice',
        loadComponent: () => import('./Virtual/virtual-add-invoice/virtual-add-invoice.component').then(m => m.VirtualAddInvoiceComponent),
      },
      {
        path: 'virtual/transfer-invoices',
        loadComponent: () => import('./Virtual/virtual-transfer-invoices/virtual-transfer-invoices.component').then(m => m.VirtualTransferInvoicesComponent),
      },
      {
        path: 'virtual/invoice-details/:TransactionNumber',
        loadComponent: () => import('./Virtual/virtual-invoice-details/virtual-invoice-details.component').then(m => m.VirtualInvoiceDetailsComponent),
      },
      {
        path: 'virtual/transfered-invoices',
        loadComponent: () => import('./Virtual/virtual-transfered-invoices/virtual-transfered-invoices.component').then(m => m.VirtualTransferedInvoicesComponent),
      },
      {
        path: 'virtual/invoices',
        loadComponent: () => import('./Virtual/virtual-invoices/virtual-invoices.component').then(m => m.VirtualInvoicesComponent),
      },
      // these routes for service invoices
      {
        path: 'service/invoice',
        loadComponent: () => import('./ServiceInvoices/service-invoices/service-invoices.component').then(m => m.ServiceInvoicesComponent),
      },
      {
        path: 'service/invoice-details/:TransactionNumber',
        loadComponent: () => import('./ServiceInvoices/service-invoice-details/service-invoice-details.component').then(m => m.ServiceInvoiceDetailsComponent),
      },
      {
        path: 'service/add-invoice',
        loadComponent: () => import('./ServiceInvoices/service-add-invoice/service-add-invoice.component').then(m => m.ServiceAddInvoiceComponent),
      },
      {
        path: 'service/transfer-invoices',
        loadComponent: () => import('./ServiceInvoices/service-transfer-invoices/service-transfer-invoices.component').then(m => m.ServiceTransferInvoicesComponent),
      },
      {
        path: 'service/transfered-invoices',
        loadComponent: () => import('./ServiceInvoices/service-transfered-invoices/service-transfered-invoices.component').then(m => m.ServiceTransferedInvoicesComponent),
      },
      {
        path: 'service/refunds',
        loadComponent: () => import('./ServiceInvoices/service-invoice-refund/service-invoice-refund.component').then(m => m.ServiceInvoiceRefundComponent),
      },
      {
        path: 'service/add-refund',
        loadComponent: () => import('./ServiceInvoices/service-add-refund/service-add-refund.component').then(m => m.ServiceAddRefundComponent),
      },
      {
        path: 'service/refund-details',
        loadComponent: () => import('./ServiceInvoices/service-refund-details/service-refund-details.component').then(m => m.ServiceRefundDetailsComponent),
      },
      {
        path: 'service/transfer-refunds',
        loadComponent: () => import('./ServiceInvoices/service-transfer-refunds/service-transfer-refunds.component').then(m => m.ServiceTransferRefundsComponent),
      },
      {
        path: 'service/transfered-refunds',
        loadComponent: () => import('./ServiceInvoices/service-transfered-refunds/service-transfered-refunds.component').then(m => m.ServiceTransferedRefundsComponent),
      },
      {
        path: 'virtual/refunds',
        loadComponent: () => import('./Virtual/virtual-invoice-refund/virtual-invoice-refund.component').then(m => m.VirtualInvoiceRefundComponent),
      },
      {
        path: 'virtual/add-refund',
        loadComponent: () => import('./Virtual/virtual-add-refund/virtual-add-refund.component').then(m => m.VirtualAddRefundComponent),
      },
      {
        path: 'virtual/refund-details',
        loadComponent: () => import('./Virtual/virtual-refund-details/virtual-refund-details.component').then(m => m.VirtualRefundDetailsComponent),
      },
      {
        path: 'virtual/transfer-refunds',
        loadComponent: () => import('./Virtual/virtual-transfer-refunds/virtual-transfer-refunds.component').then(m => m.VirtualTransferRefundsComponent),
      },
      {
        path: 'virtual/transfered-refunds',
        loadComponent: () => import('./Virtual/virtual-transfered-refunds/virtual-transfered-refunds.component').then(m => m.VirtualTransferedRefundsComponent),
      },
    ]
  }
];
@NgModule({
  imports: [RouterModule.forChild(admin)],
  exports: [RouterModule],
})
export class salesRoutingModule {
  static routes = admin;
}
