import { Injectable, OnDestroy } from '@angular/core';
import { Subject, BehaviorSubject, fromEvent } from 'rxjs';
import { takeUntil, debounceTime } from 'rxjs/operators';
import { Router } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { AuthService } from './auth.service';

// Menu
export interface Menu {
  headTitle?: string;
  headTitle2?: string;
  path?: string;
  dirchange?: boolean;
  title?: string;
  translationKey?: string; // Add this field for translation
  icon?: string;
  type?: string;
  badgeValue?: string;
  badgeClass?: string;
  active?: boolean;
  selected?: boolean;
  bookmark?: boolean;
  children?: Menu[];
  Menusub?: boolean;
  target?: boolean;
  menutype?: string;
  roles?: string[]; // Add this property for role-based access control
}

@Injectable({
  providedIn: 'root',
})
export class NavService implements OnDestroy {
  private unsubscriber: Subject<any> = new Subject();
  public screenWidth: BehaviorSubject<number> = new BehaviorSubject(
    window.innerWidth
  );

  // Search Box
  public search = false;

  // Language
  public language = false;

  // Mega Menu
  public megaMenu = false;
  public levelMenu = false;
  public megaMenuColapse: boolean = window.innerWidth < 1199 ? true : false;

  // Collapse Sidebar
  public collapseSidebar: boolean = window.innerWidth < 991 ? true : false;

  // For Horizontal Layout Mobile
  public horizontal: boolean = window.innerWidth < 991 ? false : true;

  // Full screen
  public fullScreen = false;
  active: any;

  constructor(
    private router: Router,
    private translateService: TranslateService,
    private authService: AuthService // Inject AuthService
  ) {
    this.setScreenWidth(window.innerWidth);
    fromEvent(window, 'resize')
      .pipe(debounceTime(1000), takeUntil(this.unsubscriber))
      .subscribe((evt: any) => {
        this.setScreenWidth(evt.target.innerWidth);
        if (evt.target.innerWidth < 991) {
          this.collapseSidebar = true;
          this.megaMenu = false;
          this.levelMenu = false;
        }
        if (evt.target.innerWidth < 1199) {
          this.megaMenuColapse = true;
        }
      });
    if (window.innerWidth < 991) {
      // Detect Route change sidebar close
      this.router.events.subscribe((event) => {
        this.collapseSidebar = true;
        this.megaMenu = false;
        this.levelMenu = false;
      });
    }

    // Subscribe to language changes to update menu titles and layout direction
    this.translateService.onLangChange.subscribe((event) => {
      this.updateMenuItems();
      this.updateLayoutDirection(event.lang);
    });

    // Set initial layout direction
    const initialLang = this.translateService.currentLang || this.translateService.defaultLang || 'en';
    this.updateLayoutDirection(initialLang);

    // Subscribe to auth changes to update menu when user logs in/out
    this.authService.currentUser$.subscribe(() => {
      this.updateMenuItems();
    });

    // Set initial menu items
    this.updateMenuItems();
  }

  private updateLayoutDirection(lang: string) {
    const dir = lang === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.setAttribute('dir', dir);
    document.documentElement.setAttribute('lang', lang);
  }

  ngOnDestroy() {
    this.unsubscriber.next;
    this.unsubscriber.complete();
  }

  private setScreenWidth(width: number): void {
    this.screenWidth.next(width);
  }

  // Original menu items with translation keys and role restrictions
  ORIGINALMENU: Menu[] = [
    { headTitle: 'Nav.Accounting.Title' },
    {
      title: 'Accounting',
      translationKey: 'Nav.Accounting.Title',
      icon: 'bi-cash-coin',
      dirchange: false,
      type: 'sub',
      active: false,
      roles: ['Admin', 'Manager', 'Sales', 'VirtualSales', 'CashLink', 'VirtualCashLink', 'CashLinkLimit', 'VirtualCashLinkLimit'],
      children: [
        // {
        //   title: 'Receipt Vouchers',
        //   translationKey: 'Nav.Accounting.ReceiptVouchers',
        //   dirchange: false,
        //   type: 'link',
        //   active: false,
        //   selected: false,
        //   path: '/accounting/receipt-vouchers',
        //   roles: ['Admin', 'Manager', 'Sales', 'CashLink', 'VirtualCashLink', 'CashLinkLimit', 'VirtualCashLinkLimit'],
        // },
        {
          title: 'Virtual Receipt Vouchers',
          translationKey: 'Nav.Accounting.VirtualReceiptVouchers',
          dirchange: false,
          type: 'link',
          active: false,
          selected: false,
          path: '/accounting/virtual/receipt-vouchers',
          roles: ['Admin', 'Manager', 'VirtualSales', 'CashLink', 'VirtualCashLink', 'CashLinkLimit', 'VirtualCashLinkLimit'],
        },
        // General Ledger
        {
          title: 'General Ledger',
          translationKey: 'Nav.Accounting.GeneralLedger',
          dirchange: false,
          type: 'sub',
          active: false,
          children: [
            {
              title: 'شاشات الادخال',
              translationKey: 'Nav.Accounting.InputScreens',
              dirchange: false,
              type: 'sub',
              active: false,
              children: [
                { title: 'سندات القيد',  translationKey: 'Nav.Accounting.JournalVouchers', dirchange: false, type: 'link', active: false, selected: false, path: '/accounting/vouchers/journal' },
                { title: 'زمر الحسابات', translationKey: 'Nav.Accounting.AccountGroups',  dirchange: false, type: 'link', active: false, selected: false, path: '/accounting/definitions/account-groups' },
                { title: 'الضراىب',      translationKey: 'Nav.Accounting.Taxes',           dirchange: false, type: 'link', active: false, selected: false, path: '/accounting/definitions/taxes' },
                { title: 'مراكز الكلف',  translationKey: 'Nav.Accounting.CostCenters',     dirchange: false, type: 'link', active: false, selected: false, path: '/accounting/definitions/cost-centers' },
                { title: 'البنوك',        translationKey: 'Nav.Accounting.Banks',           dirchange: false, type: 'link', active: false, selected: false, path: '/accounting/definitions/banks' },
                { title: 'العملات',       translationKey: 'Nav.Accounting.Currencies',      dirchange: false, type: 'link', active: false, selected: false, path: '/accounting/definitions/currencies' },
              ]
            },
            {
              title: 'اعداد الحسابات',
              translationKey: 'Nav.Accounting.AccountSetup',
              dirchange: false,
              type: 'sub',
              active: false,
              children: [
                { title: 'قائمة الحسابات',       translationKey: 'Nav.Accounting.AccountsList',              dirchange: false, type: 'link', active: false, selected: false, path: '/accounting/gl/accounts-list' },
                { title: 'الأرصدة الافتتاحية',  translationKey: 'Nav.Accounting.OpeningBalances',           dirchange: false, type: 'link', active: false, selected: false, path: '/accounting/gl/opening-balances' },
                { title: 'الغاء حساب',           translationKey: 'Nav.Accounting.CancelAccount',            dirchange: false, type: 'link', active: false, selected: false, path: '/accounting/gl/cancel-account' },
                { title: 'ربط الزمر بالحسابات',  translationKey: 'Nav.Accounting.LinkGroupsToAccounts',     dirchange: false, type: 'link', active: false, selected: false, path: '/accounting/gl/link-groups-accounts' },
                { title: 'ربط الحسابات',          translationKey: 'Nav.Accounting.LinkAccounts',             dirchange: false, type: 'link', active: false, selected: false, path: '/accounting/gl/link-accounts' },
                { title: 'تعديل اسم حساب',        translationKey: 'Nav.Accounting.EditAccountName',          dirchange: false, type: 'link', active: false, selected: false, path: '/accounting/gl/edit-account-name' },
                { title: 'تفريغ مراكز الكلف',     translationKey: 'Nav.Accounting.ClearCostCenters',         dirchange: false, type: 'link', active: false, selected: false, path: '/accounting/gl/clear-cost-centers' },
                { title: 'نقل حركات حساب',        translationKey: 'Nav.Accounting.TransferAccountMovements', dirchange: false, type: 'link', active: false, selected: false, path: '/accounting/gl/transfer-account-movements' },
                { title: 'الارصدة الافتتاحية لمراكز الكلف', translationKey: 'Nav.Accounting.CcOpeningBalances', dirchange: false, type: 'link', active: false, selected: false, path: '/accounting/gl/cc-opening-balances' },
              ]
            },
            {
              title: 'التقارير',
              translationKey: 'Nav.Accounting.GLReports',
              dirchange: false,
              type: 'sub',
              active: false,
              children: []
            },
          ]
        },
        // Accounts Receivable
        {
          title: 'Accounts Receivable',
          translationKey: 'Nav.Accounting.AccountsReceivable',
          dirchange: false,
          type: 'sub',
          active: false,
          children: [
            {
              title: 'شاشات الادخال',
              translationKey: 'Nav.Accounting.InputScreens',
              dirchange: false,
              type: 'sub',
              active: false,
              children: [
                { title: 'سندات القبض', translationKey: 'Nav.Accounting.ReceiptVouchers', dirchange: false, type: 'link', active: false, selected: false, path: '/accounting/receipt-vouchers' },
                { title: 'العملاء',            translationKey: 'Nav.Accounting.Customers',          dirchange: false, type: 'link', active: false, selected: false, path: '/accounting/ar/customers' },
              ]
            },
            {
              title: 'التقارير',
              translationKey: 'Nav.Accounting.ARReports',
              dirchange: false,
              type: 'sub',
              active: false,
              children: []
            },
          ]
        },
        // Accounts Payable
        {
          title: 'Accounts Payable',
          translationKey: 'Nav.Accounting.AccountsPayable',
          dirchange: false,
          type: 'sub',
          active: false,
          children: [
            {
              title: 'شاشات الادخال',
              translationKey: 'Nav.Accounting.InputScreens',
              dirchange: false,
              type: 'sub',
              active: false,
              children: [
                { title: 'سند صرف نقدي',  translationKey: 'Nav.Accounting.CashPaymentVoucher',  dirchange: false, type: 'link', active: false, selected: false, path: '/accounting/vouchers/cash-payment' },
                { title: 'الموردين',       translationKey: 'Nav.Accounting.Suppliers',            dirchange: false, type: 'link', active: false, selected: false, path: '/accounting/ap/suppliers' },
              ]
            },
            {
              title: 'التقارير',
              translationKey: 'Nav.Accounting.APReports',
              dirchange: false,
              type: 'sub',
              active: false,
              children: []
            },
          ]
        },
        // الشيكات
        {
          title: 'الشيكات',
          translationKey: 'Nav.Accounting.Cheques',
          dirchange: false,
          type: 'sub',
          active: false,
          children: [
            {
              title: 'شاشات الادخال',
              translationKey: 'Nav.Accounting.InputScreens',
              dirchange: false,
              type: 'sub',
              active: false,
              children: [
                { title: 'سند قبض شيكات',        translationKey: 'Nav.Accounting.ChequeReceiptVoucher', dirchange: false, type: 'link', active: false, selected: false, path: '/accounting/ar/cheque-receipt-vouchers' },
                { title: 'شيكات واردة اول مرة',  translationKey: 'Nav.Accounting.IncomingCheques',   dirchange: false, type: 'link', active: false, selected: false, path: '/accounting/cheques/incoming-first' },
                { title: 'شيكات صادرة اول مرة',  translationKey: 'Nav.Accounting.OutgoingCheques',   dirchange: false, type: 'link', active: false, selected: false, path: '/accounting/cheques/outgoing-first' },
                { title: 'ايداع الشيكات',         translationKey: 'Nav.Accounting.ChequeDeposit',     dirchange: false, type: 'link', active: false, selected: false, path: '/accounting/cheques/deposit' },
                { title: 'تحصيل الشيكات',         translationKey: 'Nav.Accounting.ChequeCollection',  dirchange: false, type: 'link', active: false, selected: false, path: '/accounting/cheques/collection' },
                { title: 'ارجاع الشيكات',         translationKey: 'Nav.Accounting.ChequeReturn',      dirchange: false, type: 'link', active: false, selected: false, path: '/accounting/cheques/return' },
                { title: 'اعادة شيكات راجعة',     translationKey: 'Nav.Accounting.ChequeReReturn',    dirchange: false, type: 'link', active: false, selected: false, path: '/accounting/cheques/re-return' },
                { title: 'سحب الشيكات',           translationKey: 'Nav.Accounting.ChequeWithdrawal',  dirchange: false, type: 'link', active: false, selected: false, path: '/accounting/cheques/withdrawal' },
                { title: 'تجيير الشيكات',         translationKey: 'Nav.Accounting.ChequeEndorsement', dirchange: false, type: 'link', active: false, selected: false, path: '/accounting/cheques/endorse' },
              ]
            },
            {
              title: 'التقارير',
              translationKey: 'Nav.Accounting.ChequesReports',
              dirchange: false,
              type: 'sub',
              active: false,
              children: []
            },
          ]
        },
      ]
    },
    { headTitle: 'Nav.Warehouse.Title' },
    {
      title: 'نظام ادارة المستودعات',
      translationKey: 'Nav.Warehouse.Title',
      icon: 'bi-boxes',
      dirchange: false,
      type: 'sub',
      active: false,
      children: []
    },
    { headTitle: 'Nav.Purchases.Title' },
    {
      title: 'نظام ادارة المشتريات',
      translationKey: 'Nav.Purchases.Title',
      icon: 'bi-cart',
      dirchange: false,
      type: 'sub',
      active: false,
      children: []
    },
    { headTitle: 'Nav.Sales.Title' },
    {
      title: 'Sales',
      translationKey: 'Nav.Sales.Title',
      icon: 'bi-shop',
      dirchange: false,
      type: 'sub',
      active: false,
      roles: ['Admin', 'Manager', 'Sales', 'VirtualSales', 'DeliveryDriver', 'ServiceInvoices', 'CashLink', 'VirtualCashLink', 'CashLinkLimit', 'VirtualCashLinkLimit'],
      children: [
        {
          title: 'Invoices',
          translationKey: 'Nav.Sales.InvoicesCategory',
          dirchange: false,
          type: 'sub',
          active: false,
          roles: ['Admin', 'Manager', 'Sales', 'CashLink', 'CashLinkLimit'],
          children: [
            {
              title: 'Invoices',
              translationKey: 'Nav.Sales.Invoices',
              dirchange: false,
              type: 'link',
              active: false,
              selected: false,
              path: '/sales/invoice',
              roles: ['Admin', 'Manager', 'Sales', 'CashLink', 'CashLinkLimit'],
            },
            {
              title: 'Transfer Invoices',
              translationKey: 'Nav.Sales.TransferInvoices',
              dirchange: false,
              type: 'link',
              active: false,
              selected: false,
              path: '/sales/transfer-invoices',
              roles: ['Admin', 'Manager', 'Sales', 'CashLink', 'CashLinkLimit'],
            },
            {
              title: 'Transferred Invoices',
              translationKey: 'Nav.Sales.TransferredInvoices',
              dirchange: false,
              type: 'link',
              active: false,
              selected: false,
              path: '/sales/transfered-invoices',
              roles: ['Admin', 'Manager', 'Sales', 'DeliveryDriver', 'CashLink', 'CashLinkLimit'],
            },
          ]
        },
        {
          title: 'Service Invoices',
          translationKey: 'Nav.Sales.ServiceInvoicesCategory',
          dirchange: false,
          type: 'sub',
          active: false,
          roles: ['Admin', 'Manager', 'ServiceInvoices'],
          children: [
            {
              title: 'Service Invoices',
              translationKey: 'Nav.Sales.ServiceInvoices',
              dirchange: false,
              type: 'link',
              active: false,
              selected: false,
              path: '/sales/service/invoice',
              roles: ['Admin', 'Manager', 'ServiceInvoices'],
            },
            {
              title: 'Transfer Service Invoices',
              translationKey: 'Nav.Sales.TransferServiceInvoices',
              dirchange: false,
              type: 'link',
              active: false,
              selected: false,
              path: '/sales/service/transfer-invoices',
              roles: ['Admin', 'Manager', 'ServiceInvoices'],
            },
            {
              title: 'Transferred Service Invoices',
              translationKey: 'Nav.Sales.TransferredServiceInvoices',
              dirchange: false,
              type: 'link',
              active: false,
              selected: false,
              path: '/sales/service/transfered-invoices',
              roles: ['Admin', 'Manager', 'ServiceInvoices'],
            },
          ]
        },
        {
          title: 'Service Refunds',
          translationKey: 'Nav.Sales.ServiceRefundsCategory',
          dirchange: false,
          type: 'sub',
          active: false,
          roles: ['Admin', 'Manager', 'ServiceInvoices'],
          children: [
            {
              title: 'Service Refund',
              translationKey: 'Nav.Sales.ServiceRefund',
              dirchange: false,
              type: 'link',
              active: false,
              selected: false,
              path: '/sales/service/refunds',
              roles: ['Admin', 'Manager', 'ServiceInvoices'],
            },
            {
              title: 'Transfer Service Refunds',
              translationKey: 'Nav.Sales.TransferServiceRefunds',
              dirchange: false,
              type: 'link',
              active: false,
              selected: false,
              path: '/sales/service/transfer-refunds',
              roles: ['Admin', 'Manager', 'ServiceInvoices'],
            },
            {
              title: 'Transferred Service Refunds',
              translationKey: 'Nav.Sales.TransferredServiceRefunds',
              dirchange: false,
              type: 'link',
              active: false,
              selected: false,
              path: '/sales/service/transfered-refunds',
              roles: ['Admin', 'Manager', 'ServiceInvoices'],
            },
          ]
        },
        {
          title: 'Refunds',
          translationKey: 'Nav.Sales.RefundsCategory',
          dirchange: false,
          type: 'sub',
          active: false,
          roles: ['Admin', 'Manager', 'Sales', 'CashLink', 'CashLinkLimit'],
          children: [
            {
              title: 'Refund',
              translationKey: 'Nav.Sales.Refund',
              dirchange: false,
              type: 'link',
              active: false,
              selected: false,
              path: '/sales/refund',
              roles: ['Admin', 'Manager', 'Sales', 'CashLink', 'CashLinkLimit'],
            },
            {
              title: 'Transfer Refunds',
              translationKey: 'Nav.Sales.TransferRefunds',
              dirchange: false,
              type: 'link',
              active: false,
              selected: false,
              path: '/sales/transfer-refunds',
              roles: ['Admin', 'Manager', 'Sales', 'CashLink', 'CashLinkLimit'],
            },
            {
              title: 'Transferred Refunds',
              translationKey: 'Nav.Sales.TransferredRefunds',
              dirchange: false,
              type: 'link',
              active: false,
              selected: false,
              path: '/sales/transfered-refunds',
              roles: ['Admin', 'Manager', 'Sales', 'DeliveryDriver', 'CashLink', 'CashLinkLimit'],
            },
          ]
        },
        {
          title: 'Virtual Sales',
          translationKey: 'Nav.Sales.VirtualSalesCategory',
          dirchange: false,
          type: 'sub',
          active: false,
          roles: ['Admin', 'Manager', 'VirtualSales', 'VirtualCashLink', 'VirtualCashLinkLimit'],
          children: [
            {
              title: 'Virtual Invoices',
              translationKey: 'Nav.Sales.VirtualInvoicesCategory',
              dirchange: false,
              type: 'sub',
              active: false,
              roles: ['Admin', 'Manager', 'VirtualSales', 'VirtualCashLink', 'VirtualCashLinkLimit'],
              children: [
                {
                  title: 'Virtual Invoices List',
                  translationKey: 'Nav.Sales.VirtualInvoicesList',
                  dirchange: false,
                  type: 'link',
                  active: false,
                  selected: false,
                  path: '/sales/virtual/invoices',
                  roles: ['Admin', 'Manager', 'VirtualSales', 'VirtualCashLink', 'VirtualCashLinkLimit'],
                },
                // {
                //   title: 'Add Virtual Invoice',
                //   translationKey: 'Nav.Sales.AddVirtualInvoice',
                //   dirchange: false,
                //   type: 'link',
                //   active: false,
                //   selected: false,
                //   path: '/sales/virtual/add-invoice',
                //   roles: ['Admin', 'Manager', 'VirtualSales'],
                // },
                {
                  title: 'Transfer Virtual Invoices',
                  translationKey: 'Nav.Sales.TransferVirtualInvoices',
                  dirchange: false,
                  type: 'link',
                  active: false,
                  selected: false,
                  path: '/sales/virtual/transfer-invoices',
                  roles: ['Admin', 'Manager', 'VirtualSales', 'VirtualCashLink', 'VirtualCashLinkLimit'],
                },
                {
                  title: 'Transferred Virtual Invoices',
                  translationKey: 'Nav.Sales.TransferredVirtualInvoices',
                  dirchange: false,
                  type: 'link',
                  active: false,
                  selected: false,
                  path: '/sales/virtual/transfered-invoices',
                  roles: ['Admin', 'Manager', 'VirtualSales', 'DeliveryDriver', 'VirtualCashLink', 'VirtualCashLinkLimit'],
                }
              ]
            },
            {
              title: 'Virtual Refunds',
              translationKey: 'Nav.Sales.VirtualRefundsCategory',
              dirchange: false,
              type: 'sub',
              active: false,
              roles: ['Admin', 'Manager', 'VirtualSales'],
              children: [
                {
                  title: 'Virtual Refunds List',
                  translationKey: 'Nav.Sales.VirtualRefundsList',
                  dirchange: false,
                  type: 'link',
                  active: false,
                  selected: false,
                  path: '/sales/virtual/refunds',
                  roles: ['Admin', 'Manager', 'VirtualSales', 'VirtualCashLink', 'VirtualCashLinkLimit'],
                },
                // {
                //   title: 'Add Virtual Refund',
                //   translationKey: 'Nav.Sales.AddVirtualRefund',
                //   dirchange: false,
                //   type: 'link',
                //   active: false,
                //   selected: false,
                //   path: '/sales/virtual/add-refund',
                //   roles: ['Admin', 'Manager', 'VirtualSales'],
                // },
                {
                  title: 'Transfer Virtual Refunds',
                  translationKey: 'Nav.Sales.TransferVirtualRefunds',
                  dirchange: false,
                  type: 'link',
                  active: false,
                  selected: false,
                  path: '/sales/virtual/transfer-refunds',
                  roles: ['Admin', 'Manager', 'VirtualSales', 'VirtualCashLink', 'VirtualCashLinkLimit'],
                },
                {
                  title: 'Transferred Virtual Refunds',
                  translationKey: 'Nav.Sales.TransferredVirtualRefunds',
                  dirchange: false,
                  type: 'link',
                  active: false,
                  selected: false,
                  path: '/sales/virtual/transfered-refunds',
                  roles: ['Admin', 'Manager', 'VirtualSales', 'DeliveryDriver', 'VirtualCashLink', 'VirtualCashLinkLimit'],
                }
              ]
            }
          ]
        }
      ]
    },
    { headTitle: 'Nav.Assets.Title' },
    {
      title: 'نظام ادارة الاصول',
      translationKey: 'Nav.Assets.Title',
      icon: 'bi-building',
      dirchange: false,
      type: 'sub',
      active: false,
      children: []
    },
    { headTitle: 'Nav.Production.Title' },
    {
      title: 'نظام ادارة الانتاج',
      translationKey: 'Nav.Production.Title',
      icon: 'bi-gear',
      dirchange: false,
      type: 'sub',
      active: false,
      children: []
    },
    { headTitle: 'Nav.Reports.Title' },
    {
      title: 'Reports',
      translationKey: 'Nav.Reports.Title',
      icon: 'bi-file-earmark-text',
      dirchange: false,
      type: 'sub',
      active: false,
      roles: ['Admin', 'Manager', 'Sales', 'VirtualSales', 'CashLink', 'VirtualCashLink', 'CashLinkLimit', 'VirtualCashLinkLimit'],
      children: [
        {
          title: 'Account Statement',
          translationKey: 'Nav.Reports.AccountStatement',
          dirchange: false,
          type: 'link',
          active: false,
          selected: false,
          path: '/reports/account-statement',
          roles: ['Admin', 'Manager', 'Sales', 'VirtualSales', 'CashLink', 'VirtualCashLink', 'CashLinkLimit', 'VirtualCashLinkLimit'],
        },
      ]
    },
    { headTitle: 'Nav.Notes.Title' },
    {
      title: 'Notes',
      translationKey: 'Nav.Notes.Title',
      icon: 'bi-file-earmark-text',
      dirchange: false,
      type: 'link',
      active: false,
      path: '/reseller/notes',
      roles: ['Admin', 'Manager', 'Sales', 'VirtualSales', 'CashLink', 'VirtualCashLink', 'CashLinkLimit', 'VirtualCashLinkLimit'],
    },
    { headTitle: 'Nav.Notes.Title' },
    {
      title: 'Quotation',
      translationKey: 'Nav.Quotation.Title',
      icon: 'bi-file-earmark-text',
      dirchange: false,
      type: 'link',
      active: false,
      path: '/reseller/quotation',
      roles: ['Admin', 'Manager', 'Sales', 'VirtualSales', 'CashLink', 'VirtualCashLink', 'CashLinkLimit', 'VirtualCashLinkLimit'],
    },

    { headTitle: 'Nav.Settings.Title' },
    {
      title: 'Settings',
      translationKey: 'Nav.Settings.Title',
      icon: 'bi-gear',
      type: 'sub',
      active: false,
      children: [
        {
          title: 'Permissions',
          translationKey: 'Nav.Settings.Permissions',
          type: 'link',
          path: '/accounting/admin/permissions',
          active: false,
          roles: ['Admin', 'Manager', 'Administrator'],
        },
      ],
    },
  ];

  // Menu items to display (will be updated with translations)
  MENUITEMS: Menu[] = JSON.parse(JSON.stringify(this.ORIGINALMENU));

  // Update menu items
  updateMenuItems() {
    // Create a deep copy of the original menu
    const translatedMenu = JSON.parse(JSON.stringify(this.ORIGINALMENU));

    // Apply translations recursively
    this.translateMenuItems(translatedMenu);

    // Filter by user roles
    const filteredMenu = this.filterMenuByRoles(translatedMenu);

    // Clean up empty sections
    const cleanedMenu = this.cleanupEmptySections(filteredMenu);

    // Update the menu items
    this.MENUITEMS = cleanedMenu;
    this.items.next(this.MENUITEMS);
  }

  // New method to filter menu by user roles
  private filterMenuByRoles(items: Menu[]): Menu[] {
    return items.filter(item => {
      // If no roles are specified, keep the item
      if (!item.roles || item.roles.length === 0) {
        // Still filter children if present
        if (item.children && item.children.length > 0) {
          item.children = this.filterMenuByRoles(item.children);
        }
        return true;
      }

      // Check if user has any of the required roles
      const hasAccess = this.authService.hasAnyRole(item.roles);

      if (hasAccess && item.children && item.children.length > 0) {
        // Filter children recursively
        item.children = this.filterMenuByRoles(item.children);

        // Remove parent if all children were filtered out and it's a submenu
        if (item.children.length === 0 && item.type === 'sub') {
          return false;
        }
      }

      return hasAccess;
    });
  }

  // Clean up empty sections (headers with no items)
  private cleanupEmptySections(items: Menu[]): Menu[] {
    if (!items || items.length === 0) return [];

    const result: Menu[] = [];
    let lastWasHeader = false;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];

      // If it's a section header
      if (item.headTitle && !item.type) {
        // Only add if next item exists and isn't another header
        if (i < items.length - 1 && items[i + 1].type) {
          result.push(item);
          lastWasHeader = true;
        }
      } else {
        result.push(item);
        lastWasHeader = false;
      }
    }

    // Remove trailing header if it's the last item
    if (lastWasHeader && result.length > 0) {
      result.pop();
    }

    return result;
  }

  // Recursively translate menu items
  private translateMenuItems(items: Menu[]) {
    items.forEach(item => {
      // Translate head title if present
      if (item.headTitle && item.headTitle.includes('Nav.')) {
        item.headTitle = this.translateService.instant(item.headTitle);
      }

      // Translate item title if translation key exists
      if (item.translationKey) {
        item.title = this.translateService.instant(item.translationKey);
      }

      // Recursively translate children
      if (item.children && item.children.length > 0) {
        this.translateMenuItems(item.children);
      }
    });
  }

  // Array
  items = new BehaviorSubject<Menu[]>(this.MENUITEMS);
}