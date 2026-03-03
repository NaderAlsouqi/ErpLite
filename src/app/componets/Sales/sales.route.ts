import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { RoleGuard } from '../../shared/guards/role.guard';

export const admin: Routes = [
  {
    path: 'sales', children: [
      {
        path: 'invoice',
        loadComponent: () => import('./sales-invoice/sales-invoice.component').then(m => m.SalesInvoiceComponent),
        canActivate: [RoleGuard],
        data: { roles: ['Admin', 'Manager', 'Sales', 'CashLink','CashLinkLimit'] }
      },
      {
        path: 'add-invoice',
        loadComponent: () => import('./add-invoice/add-invoice.component').then(m => m.AddInvoiceComponent),
        canActivate: [RoleGuard],
        data: { roles: ['Admin', 'Manager', 'Sales', 'CashLink','CashLinkLimit'] }
      },
      {
        path: 'invoice-details/:TransactionNumber',
        loadComponent: () => import('./invoice-details/invoice-details.component').then(m => m.InvoiceDetailsComponent),
        canActivate: [RoleGuard],
        data: { roles: ['Admin', 'Manager', 'Sales', 'CashLink','CashLinkLimit'] }
      },
      {
        path: 'refund-details',
        loadComponent: () => import('./refund-details/refund-details.component').then(m => m.RefundDetailsComponent),
        canActivate: [RoleGuard],
        data: { roles: ['Admin', 'Manager', 'Sales', 'CashLink','CashLinkLimit'] }
      },
      {
        path: 'add-refund',
        loadComponent: () => import('./add-refund/add-refund.component').then(m => m.AddRefundComponent),
        canActivate: [RoleGuard],
        data: { roles: ['Admin', 'Manager', 'Sales', 'CashLink','CashLinkLimit'] }
      },
     {
      path: 'refund',
      loadComponent: () => import('./invoice-refund/invoice-refund.component').then(m => m.InvoiceRefundComponent),
      canActivate: [RoleGuard],
       data: { roles: ['Admin', 'Manager', 'Sales', 'CashLink','CashLinkLimit'] }
    },
      {
        path: 'transfer-invoices',
        loadComponent: () => import('./transfer-invoices/transfer-invoices.component').then(m => m.TransferInvoicesComponent),
        canActivate: [RoleGuard],
        data: { roles: ['Admin', 'Manager', 'Sales', 'CashLink','CashLinkLimit'] }
      },
      {
        path: 'transfer-refunds',
        loadComponent: () => import('./transfer-refunds/transfer-refunds.component').then(m => m.TransferRefundsComponent),
        canActivate: [RoleGuard],
        data: { roles: ['Admin', 'Manager', 'Sales', 'CashLink','CashLinkLimit'] }
      },
      {
        path: 'transfered-invoices',
        loadComponent: () => import('./transfered-invoices/transfered-invoices.component').then(m => m.TransferedInvoicesComponent),
        canActivate: [RoleGuard],
        data: { roles: ['Admin', 'Manager', 'Sales', 'CashLink','CashLinkLimit'] }
      },
      {
        path: 'transfered-refunds',
        loadComponent: () => import('./transfered-refunds/transfered-refunds.component').then(m => m.TransferedRefundsComponent),
        canActivate: [RoleGuard],
        data: { roles: ['Admin', 'Manager', 'Sales', 'CashLink','CashLinkLimit'] }
      },
      {
        path: 'virtual/add-invoice',
        loadComponent: () => import('./Virtual/virtual-add-invoice/virtual-add-invoice.component').then(m => m.VirtualAddInvoiceComponent),
        canActivate: [RoleGuard],
        data: { roles: ['Admin', 'Manager', 'VirtualSales','VirtualCashLink','VirtualCashLinkLimit'] }
      },
      {
        path: 'virtual/transfer-invoices',
        loadComponent: () => import('./Virtual/virtual-transfer-invoices/virtual-transfer-invoices.component').then(m => m.VirtualTransferInvoicesComponent),
        canActivate: [RoleGuard],
        data: { roles: ['Admin', 'Manager', 'VirtualSales','VirtualCashLink','VirtualCashLinkLimit'] }
      },
      {
        path: 'virtual/invoice-details/:TransactionNumber',
        loadComponent: () => import('./Virtual/virtual-invoice-details/virtual-invoice-details.component').then(m => m.VirtualInvoiceDetailsComponent),
        canActivate: [RoleGuard],
        data: { roles: ['Admin', 'Manager', 'VirtualSales','VirtualCashLink','VirtualCashLinkLimit'] }
      },
      {
        path: 'virtual/transfered-invoices',
        loadComponent: () => import('./Virtual/virtual-transfered-invoices/virtual-transfered-invoices.component').then(m => m.VirtualTransferedInvoicesComponent),
        canActivate: [RoleGuard],
        data: { roles: ['Admin', 'Manager', 'VirtualSales','VirtualCashLink','VirtualCashLinkLimit'] }
      },
      {
        path: 'virtual/invoices',
        loadComponent: () => import('./Virtual/virtual-invoices/virtual-invoices.component').then(m => m.VirtualInvoicesComponent),
        canActivate: [RoleGuard],
        data: { roles: ['Admin', 'Manager', 'VirtualSales','VirtualCashLink','VirtualCashLinkLimit'] }
      },
      // these routes for service invoices
      {
        path: 'service/invoice',
        loadComponent: () => import('./ServiceInvoices/service-invoices/service-invoices.component').then(m => m.ServiceInvoicesComponent),
        canActivate: [RoleGuard],
        data: { roles: ['Admin', 'Manager', 'ServiceInvoices'] }
      },
      {
        path: 'service/invoice-details/:TransactionNumber',
        loadComponent: () => import('./ServiceInvoices/service-invoice-details/service-invoice-details.component').then(m => m.ServiceInvoiceDetailsComponent),
        canActivate: [RoleGuard],
        data: { roles: ['Admin', 'Manager', 'ServiceInvoices'] }
      },
      {
        path: 'service/add-invoice',
        loadComponent: () => import('./ServiceInvoices/service-add-invoice/service-add-invoice.component').then(m => m.ServiceAddInvoiceComponent),
        canActivate: [RoleGuard],
        data: { roles: ['Admin', 'Manager', 'ServiceInvoices'] }
      },
      {
        path: 'service/transfer-invoices',
        loadComponent: () => import('./ServiceInvoices/service-transfer-invoices/service-transfer-invoices.component').then(m => m.ServiceTransferInvoicesComponent),
        canActivate: [RoleGuard],
        data: { roles: ['Admin', 'Manager', 'ServiceInvoices'] }
      },
      {
        path: 'service/transfered-invoices',
        loadComponent: () => import('./ServiceInvoices/service-transfered-invoices/service-transfered-invoices.component').then(m => m.ServiceTransferedInvoicesComponent),
        canActivate: [RoleGuard],
        data: { roles: ['Admin', 'Manager', 'ServiceInvoices'] }
      },
      {
        path: 'virtual/refunds',
        loadComponent: () => import('./Virtual/virtual-invoice-refund/virtual-invoice-refund.component').then(m => m.VirtualInvoiceRefundComponent),
        canActivate: [RoleGuard],
        data: { roles: ['Admin', 'Manager', 'VirtualSales','VirtualCashLink','VirtualCashLinkLimit'] }
      },
      {
        path: 'virtual/add-refund',
        loadComponent: () => import('./Virtual/virtual-add-refund/virtual-add-refund.component').then(m => m.VirtualAddRefundComponent),
        canActivate: [RoleGuard],
        data: { roles: ['Admin', 'Manager', 'VirtualSales','VirtualCashLink','VirtualCashLinkLimit'] }
      },
      {
        path: 'virtual/refund-details',
        loadComponent: () => import('./Virtual/virtual-refund-details/virtual-refund-details.component').then(m => m.VirtualRefundDetailsComponent),
        canActivate: [RoleGuard],
        data: { roles: ['Admin', 'Manager', 'VirtualSales','VirtualCashLink','VirtualCashLinkLimit'] }
      },
      {
        path: 'virtual/transfer-refunds',
        loadComponent: () => import('./Virtual/virtual-transfer-refunds/virtual-transfer-refunds.component').then(m => m.VirtualTransferRefundsComponent),
        canActivate: [RoleGuard],
        data: { roles: ['Admin', 'Manager', 'VirtualSales','VirtualCashLink','VirtualCashLinkLimit'] }
      },
      {
        path: 'virtual/transfered-refunds',
        loadComponent: () => import('./Virtual/virtual-transfered-refunds/virtual-transfered-refunds.component').then(m => m.VirtualTransferedRefundsComponent),
        canActivate: [RoleGuard],
        data: { roles: ['Admin', 'Manager', 'VirtualSales','VirtualCashLink','VirtualCashLinkLimit'] }
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