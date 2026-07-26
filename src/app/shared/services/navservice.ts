import { Injectable, OnDestroy } from '@angular/core';
import { Subject, BehaviorSubject, fromEvent } from 'rxjs';
import { takeUntil, debounceTime } from 'rxjs/operators';
import { Router, NavigationEnd } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { AuthService } from './auth.service';
import { WorkflowService } from './workflow.service';
import { filter } from 'rxjs/operators';

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

  // Pending-tasks badge on the المهمات nav item
  public pendingTasks = 0;
  private badgeTimer: any;

  constructor(
    private router: Router,
    private translateService: TranslateService,
    private authService: AuthService, // Inject AuthService
    private workflowSvc: WorkflowService,
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
      this.router.events.subscribe((_event) => {
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
    const initialLang = this.translateService.currentLang || this.translateService.defaultLang || 'ar';
    this.updateLayoutDirection(initialLang);

    // Subscribe to auth changes to update menu when user logs in/out
    this.authService.currentUser$.subscribe(() => {
      this.updateMenuItems();
      this.refreshTaskBadge();
    });

    // Set initial menu items
    this.updateMenuItems();

    // Keep the قيد الانتظار badge fresh: on load, on each navigation, and periodically.
    this.refreshTaskBadge();
    this.router.events.pipe(filter(e => e instanceof NavigationEnd), takeUntil(this.unsubscriber))
      .subscribe(() => this.refreshTaskBadge());
    this.badgeTimer = setInterval(() => this.refreshTaskBadge(), 60000);
  }

  /** Fetch the current user's pending-tasks count and stamp it on the المهمات item. */
  refreshTaskBadge(): void {
    if (!this.authService.currentUserValue) { this.pendingTasks = 0; this.applyTaskBadge(this.MENUITEMS); this.items.next(this.MENUITEMS); return; }
    this.workflowSvc.listTasks(true, 'Pending').subscribe({
      next: (r) => {
        this.pendingTasks = (r || []).length;
        this.applyTaskBadge(this.MENUITEMS);
        this.items.next(this.MENUITEMS);
      },
      error: () => {},
    });
  }

  private applyTaskBadge(items: Menu[]): void {
    (items || []).forEach(it => {
      if (it.path === '/workflow/tasks') {
        it.badgeValue = this.pendingTasks > 0 ? String(this.pendingTasks) : undefined;
        it.badgeClass = 'nav-badge-danger';
      }
      if (it.children && it.children.length) this.applyTaskBadge(it.children);
    });
  }

  private updateLayoutDirection(lang: string) {
    const dir = lang === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.setAttribute('dir', dir);
    document.documentElement.setAttribute('lang', lang);
  }

  ngOnDestroy() {
    this.unsubscriber.next;
    this.unsubscriber.complete();
    if (this.badgeTimer) clearInterval(this.badgeTimer);
  }

  private setScreenWidth(width: number): void {
    this.screenWidth.next(width);
  }

  // Original menu items with translation keys and role restrictions
  ORIGINALMENU: Menu[] = [
    { headTitle: 'Nav.Dashboard.HeadTitle' },
    {
      title: 'Home',
      translationKey: 'Nav.Home',
      icon: 'bi-house',
      dirchange: false,
      type: 'link',
      active: false,
      selected: false,
      path: '/home2',
    },
    {
      title: 'Dashboard',
      translationKey: 'Nav.Dashboard.Title',
      icon: 'bi-speedometer2',
      dirchange: false,
      type: 'link',
      active: false,
      selected: false,
      path: '/dashboard',
    },
    {
      title: 'Dashboard Builder',
      translationKey: 'Nav.DashboardBuilder',
      icon: 'bi-grid-1x2',
      dirchange: false,
      type: 'link',
      active: false,
      selected: false,
      path: '/dashboard-builder',
    },
    { headTitle: 'Nav.Accounting.Title' },
    {
      title: 'Accounting',
      translationKey: 'Nav.Accounting.Title',
      icon: 'bi-cash-coin',
      dirchange: false,
      type: 'sub',
      active: false,
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
                { title: 'ادخال شروط الضريبة (خاص بالفوترة)', translationKey: 'Nav.Accounting.TaxConditions', dirchange: false, type: 'link', active: false, selected: false, path: '/accounting/definitions/tax-conditions' },
                { title: 'مراكز الكلف',  translationKey: 'Nav.Accounting.CostCenters',     dirchange: false, type: 'link', active: false, selected: false, path: '/accounting/definitions/cost-centers' },
                { title: 'البنوك',        translationKey: 'Nav.Accounting.Banks',           dirchange: false, type: 'link', active: false, selected: false, path: '/accounting/definitions/banks' },
                { title: 'العملات',       translationKey: 'Nav.Accounting.Currencies',      dirchange: false, type: 'link', active: false, selected: false, path: '/accounting/definitions/currencies' },
                { title: 'الاختام',       translationKey: 'Nav.Accounting.Stamps',           dirchange: false, type: 'link', active: false, selected: false, path: '/accounting/definitions/stamps' },
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
              children: [
                { title: 'تقارير القيود اليومية', translationKey: 'Nav.Accounting.JournalVoucherReport', dirchange: false, type: 'link', active: false, selected: false, path: '/accounting/vouchers/journal-report' },
                { title: 'كشف حساب متفرع',       translationKey: 'Nav.Accounting.AccBelongReport',       dirchange: false, type: 'link', active: false, selected: false, path: '/accounting/vouchers/acc-belong-report' },
                { title: 'كشف حساب تفصيلي',      translationKey: 'Nav.Accounting.DetailedStatement',     dirchange: false, type: 'link', active: false, selected: false, path: '/accounting/reports/detailed-statement' },
                { title: 'كشف تحليل الذمم',      translationKey: 'Nav.Accounting.AgingAnalysis',         dirchange: false, type: 'link', active: false, selected: false, path: '/accounting/reports/aging-analysis' },
                { title: 'ميزان مراجعة خلال فترة', translationKey: 'Nav.Accounting.TrialBalance',          dirchange: false, type: 'link', active: false, selected: false, path: '/accounting/reports/trial-balance' },
                { title: 'قائمة الدخل',           translationKey: 'Nav.Accounting.IncomeStatement',       dirchange: false, type: 'link', active: false, selected: false, path: '/accounting/reports/income-statement' },
                { title: 'الميزانية العمومية',     translationKey: 'Nav.Accounting.BalanceSheet',          dirchange: false, type: 'link', active: false, selected: false, path: '/accounting/reports/balance-sheet' },
                { title: 'قائمة الحسابات',         translationKey: 'Nav.Accounting.AccountsListReport',    dirchange: false, type: 'link', active: false, selected: false, path: '/accounting/reports/accounts-list' },
                { title: 'الأرصدة الافتتاحية',     translationKey: 'Nav.Accounting.BeginningBalances',     dirchange: false, type: 'link', active: false, selected: false, path: '/accounting/reports/beginning-balances' },
                { title: 'كشف الأرصدة الشهرية',    translationKey: 'Nav.Accounting.MonthlyBalances',       dirchange: false, type: 'link', active: false, selected: false, path: '/accounting/reports/monthly-balances' },
                { title: 'كشف زمر الحسابات',       translationKey: 'Nav.Accounting.AccountsGroupsReport',  dirchange: false, type: 'link', active: false, selected: false, path: '/accounting/reports/accounts-groups' },
                { title: 'كشف أرصدة مراكز الكلف',  translationKey: 'Nav.Accounting.CostCenterAccBalances', dirchange: false, type: 'link', active: false, selected: false, path: '/accounting/reports/cost-center-account-balances' },
                { title: 'كشف حركات مراكز الكلفة', translationKey: 'Nav.Accounting.CostCenterTransactions', dirchange: false, type: 'link', active: false, selected: false, path: '/accounting/reports/cost-center-transactions' },
                { title: 'كشف حركة شيك وارد', translationKey: 'Nav.Accounting.IncomingChequeMovement', dirchange: false, type: 'link', active: false, selected: false, path: '/accounting/reports/incoming-cheque-movement' },
                { title: 'الشيكات الواردة خلال فترة', translationKey: 'Nav.Accounting.InwardCheques', dirchange: false, type: 'link', active: false, selected: false, path: '/accounting/reports/inward-cheques' },
                { title: 'الشيكات الصادرة خلال فترة', translationKey: 'Nav.Accounting.OutwardCheques', dirchange: false, type: 'link', active: false, selected: false, path: '/accounting/reports/outward-cheques' },
                { title: 'الشيكات الصادرة الى مستفيد', translationKey: 'Nav.Accounting.ChequesToBeneficiary', dirchange: false, type: 'link', active: false, selected: false, path: '/accounting/reports/cheques-to-beneficiary' },
                { title: 'كشف سندات الصرف', translationKey: 'Nav.Accounting.PaymentVouchers', dirchange: false, type: 'link', active: false, selected: false, path: '/accounting/reports/payment-vouchers' },
              ]
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
                { title: 'سندات القبض',           translationKey: 'Nav.Accounting.ReceiptVouchers',        dirchange: false, type: 'link', active: false, selected: false, path: '/accounting/receipt-vouchers' },
                { title: 'العملاء',                translationKey: 'Nav.Accounting.Customers',               dirchange: false, type: 'link', active: false, selected: false, path: '/accounting/ar/customers' },
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
                { title: 'سند صرف شيكات',        translationKey: 'Nav.Accounting.ChequePaymentVoucher', dirchange: false, type: 'link', active: false, selected: false, path: '/accounting/cheques/payment-voucher' },
                { title: 'شيكات واردة اول مرة',  translationKey: 'Nav.Accounting.IncomingCheques',   dirchange: false, type: 'link', active: false, selected: false, path: '/accounting/cheques/incoming-first' },
                { title: 'شيكات صادرة اول مرة',  translationKey: 'Nav.Accounting.OutgoingCheques',   dirchange: false, type: 'link', active: false, selected: false, path: '/accounting/cheques/outgoing-first' },
                { title: 'ايداع الشيكات',          translationKey: 'Nav.Accounting.ChequeDeposit',    dirchange: false, type: 'link', active: false, selected: false, path: '/accounting/cheques/deposit' },

                { title: 'تحصيل الشيكات',         translationKey: 'Nav.Accounting.ChequeCollection',  dirchange: false, type: 'link', active: false, selected: false, path: '/accounting/cheques/collection' },
                { title: 'ارجاع الشيكات',         translationKey: 'Nav.Accounting.ChequeReturn',      dirchange: false, type: 'link', active: false, selected: false, path: '/accounting/cheques/return' },
                { title: 'اعادة شيكات راجعة',     translationKey: 'Nav.Accounting.ChequeReReturn',    dirchange: false, type: 'link', active: false, selected: false, path: '/accounting/cheques/re-return' },
                { title: 'سحب الشيكات',           translationKey: 'Nav.Accounting.ChequeWithdrawal',  dirchange: false, type: 'link', active: false, selected: false, path: '/accounting/cheques/withdrawal' },
                { title: 'تجيير الشيكات',         translationKey: 'Nav.Accounting.ChequeEndorsement', dirchange: false, type: 'link', active: false, selected: false, path: '/accounting/cheques/endorse' },
                { title: 'متابعة الشيكات الرئيسية', translationKey: 'Nav.Accounting.CheqTracking',      dirchange: false, type: 'link', active: false, selected: false, path: '/accounting/cheques/tracking' },
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
        // الفواتير
        {
          title: 'الفواتير',
          translationKey: 'Nav.Accounting.Invoices',
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
                { title: 'فاتورة خدمات', translationKey: 'Nav.Accounting.ServiceInvoice', dirchange: false, type: 'link', active: false, selected: false, path: '/accounting/invoices/service' },
              ]
            },
          ]
        },
        // متفرقات
        {
          title: 'متفرقات',
          translationKey: 'Nav.Accounting.Misc',
          dirchange: false,
          type: 'sub',
          active: false,
          children: [
            { title: 'ترحيل المستندات', translationKey: 'Nav.Accounting.DocumentPosting', dirchange: false, type: 'link', active: false, selected: false, path: '/accounting/misc/document-posting' },
            { title: 'فك ترحيل المستندات', translationKey: 'Nav.Accounting.DocumentUnposting', dirchange: false, type: 'link', active: false, selected: false, path: '/accounting/misc/document-unposting' },
            { title: 'كشف حركات السندات المفقودة', translationKey: 'Nav.Accounting.MissingVouchers', dirchange: false, type: 'link', active: false, selected: false, path: '/accounting/misc/missing-vouchers' },
            { title: 'الاقفال السنوي', translationKey: 'Nav.Accounting.YearEndClosing', dirchange: false, type: 'link', active: false, selected: false, path: '/accounting/misc/year-end-closing' },
            { title: 'كشف حركات ورصيد حساب', translationKey: 'Nav.Accounting.AccountLedger', dirchange: false, type: 'link', active: false, selected: false, path: '/accounting/misc/account-ledger' },
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
      children: [
        {
          title: 'السندات',
          translationKey: 'Nav.Warehouse.Vouchers',
          dirchange: false,
          type: 'sub',
          active: false,
          children: [
            { title: 'سندات الإدخال',      translationKey: 'Nav.Warehouse.InboundVouchers',   dirchange: false, type: 'link', active: false, selected: false, path: '/warehouse/vouchers/inbound' },
            { title: 'سندات الإخراج',      translationKey: 'Nav.Warehouse.OutboundVouchers',  dirchange: false, type: 'link', active: false, selected: false, path: '/warehouse/vouchers/outbound' },
            { title: 'سندات الإتلاف',      translationKey: 'Nav.Warehouse.DamageVouchers',     dirchange: false, type: 'link', active: false, selected: false, path: '/warehouse/vouchers/damage' },
            { title: 'سندات النقل',        translationKey: 'Nav.Warehouse.TransferVouchers',   dirchange: false, type: 'link', active: false, selected: false, path: '/warehouse/vouchers/transfer' },
            { title: 'تسوية الجرد',        translationKey: 'Nav.Warehouse.InventoryAdjustment', dirchange: false, type: 'link', active: false, selected: false, path: '/warehouse/vouchers/inventory-adjustment' },
            { title: 'طباعة الباركود',     translationKey: 'Nav.Warehouse.BarcodePrinting',    dirchange: false, type: 'link', active: false, selected: false, path: '/warehouse/vouchers/barcode-print' },
            { title: 'إقفال الكلف الشهري', translationKey: 'Nav.Warehouse.MonthlyCostClosing', dirchange: false, type: 'link', active: false, selected: false, path: '/warehouse/vouchers/monthly-cost-closing' },
          ]
        },
        {
          title: 'شاشات الإدخال',
          translationKey: 'Nav.Warehouse.InputScreens',
          dirchange: false,
          type: 'sub',
          active: false,
          children: [
            { title: 'ادخال الوحدات',          translationKey: 'Nav.Warehouse.EntryUnits',                dirchange: false, type: 'link', active: false, selected: false, path: '/warehouse/entry/units' },
            { title: 'ادخال المستودعات',       translationKey: 'Nav.Warehouse.EntryWarehouses',           dirchange: false, type: 'link', active: false, selected: false, path: '/warehouse/entry/warehouses' },
            { title: 'ادخال الموردين',         translationKey: 'Nav.Warehouse.EntrySuppliers',            dirchange: false, type: 'link', active: false, selected: false, path: '/warehouse/entry/suppliers' },
            { title: 'ادخال جهات الصرف',       translationKey: 'Nav.Warehouse.EntryDisbursementEntities', dirchange: false, type: 'link', active: false, selected: false, path: '/warehouse/entry/disbursement-entities' },
            { title: 'ادخال بلد المنشأ',       translationKey: 'Nav.Warehouse.EntryOriginCountry',        dirchange: false, type: 'link', active: false, selected: false, path: '/warehouse/entry/origin-country' },
            { title: 'ادخال فئات الأسعار',     translationKey: 'Nav.Warehouse.EntryPriceCategories',      dirchange: false, type: 'link', active: false, selected: false, path: '/warehouse/entry/price-categories' },
            { title: 'إدخال الأصناف الرئيسية', translationKey: 'Nav.Warehouse.EntryMainItems',            dirchange: false, type: 'link', active: false, selected: false, path: '/warehouse/entry/main-items' },
            { title: 'تفريع الأصناف الرئيسية', translationKey: 'Nav.Warehouse.EntrySubItems',             dirchange: false, type: 'link', active: false, selected: false, path: '/warehouse/entry/sub-items' },
            { title: 'بطاقة المادة',           translationKey: 'Nav.Warehouse.ItemCard',                  dirchange: false, type: 'link', active: false, selected: false, path: '/warehouse/entry/item-card' },
            { title: 'ادخال عروض المواد',      translationKey: 'Nav.Warehouse.MaterialOffers',            dirchange: false, type: 'link', active: false, selected: false, path: '/warehouse/entry/material-offers' },
            { title: 'ادخال الباركود',         translationKey: 'Nav.Warehouse.EntryBarcode',              dirchange: false, type: 'link', active: false, selected: false, path: '/warehouse/entry/barcode' },
            { title: 'استبدال رمز مادة',       translationKey: 'Nav.Warehouse.ReplaceItemCode',           dirchange: false, type: 'link', active: false, selected: false, path: '/warehouse/entry/replace-item-code' },
            { title: 'ادخال الماركات',         translationKey: 'Nav.Warehouse.Brands',                    dirchange: false, type: 'link', active: false, selected: false, path: '/warehouse/entry/brands' },
          ]
        },
        {
          title: 'التقارير',
          translationKey: 'Nav.Warehouse.Reports',
          dirchange: false,
          type: 'sub',
          active: false,
          children: [
            { title: 'كشف أرصدة المواد', translationKey: 'Nav.Warehouse.MaterialBalances', dirchange: false, type: 'link', active: false, selected: false, path: '/warehouse/reports/material-balances' },
            { title: 'المواد الواصلة حد الطلب', translationKey: 'Nav.Warehouse.ReorderLevel', dirchange: false, type: 'link', active: false, selected: false, path: '/warehouse/reports/reorder-level' },
            { title: 'كشف حركات مادة', translationKey: 'Nav.Warehouse.MaterialMovement', dirchange: false, type: 'link', active: false, selected: false, path: '/warehouse/reports/material-movement' },
            { title: 'كشف الجرد', translationKey: 'Nav.Warehouse.StockList', dirchange: false, type: 'link', active: false, selected: false, path: '/warehouse/reports/stock-list' },
            { title: 'كشف المواد المصفرة', translationKey: 'Nav.Warehouse.ZeroedItems', dirchange: false, type: 'link', active: false, selected: false, path: '/warehouse/reports/zeroed-items' },
            { title: 'كشف فئات أسعار المواد', translationKey: 'Nav.Warehouse.ItemPrices', dirchange: false, type: 'link', active: false, selected: false, path: '/warehouse/reports/item-prices' },
            { title: 'كشف المواد وأسعارها', translationKey: 'Nav.Warehouse.ItemsPricing', dirchange: false, type: 'link', active: false, selected: false, path: '/warehouse/reports/items-pricing' },
            { title: 'كشف الباتش وتاريخ الصلاحية', translationKey: 'Nav.Warehouse.BatchExpiry', dirchange: false, type: 'link', active: false, selected: false, path: '/warehouse/reports/batch-expiry' },
            { title: 'كشف حركات المستودع', translationKey: 'Nav.Warehouse.StoreMovements', dirchange: false, type: 'link', active: false, selected: false, path: '/warehouse/reports/store-movements' },
            { title: 'طباعة سند إدخال', translationKey: 'Nav.Warehouse.InboundPrint', dirchange: false, type: 'link', active: false, selected: false, path: '/warehouse/reports/inbound-print' },
            { title: 'طباعة سند إخراج', translationKey: 'Nav.Warehouse.OutboundPrint', dirchange: false, type: 'link', active: false, selected: false, path: '/warehouse/reports/outbound-print' },
            { title: 'طباعة سند إتلاف', translationKey: 'Nav.Warehouse.DamagePrint', dirchange: false, type: 'link', active: false, selected: false, path: '/warehouse/reports/damage-print' },
            { title: 'طباعة سند نقل', translationKey: 'Nav.Warehouse.TransferPrint', dirchange: false, type: 'link', active: false, selected: false, path: '/warehouse/reports/transfer-print' },
            { title: 'كشف أصناف المواد', translationKey: 'Nav.Warehouse.CategoriesList', dirchange: false, type: 'link', active: false, selected: false, path: '/warehouse/reports/categories-list' },
            { title: 'كشف المواد الراكدة', translationKey: 'Nav.Warehouse.StagnantItems', dirchange: false, type: 'link', active: false, selected: false, path: '/warehouse/reports/stagnant-items' },
            { title: 'كشف المواد بطيئة الحركة', translationKey: 'Nav.Warehouse.SlowMoving', dirchange: false, type: 'link', active: false, selected: false, path: '/warehouse/reports/slow-moving' },
            { title: 'كشف حركة صرف المواد', translationKey: 'Nav.Warehouse.DisbursementMovement', dirchange: false, type: 'link', active: false, selected: false, path: '/warehouse/reports/disbursement-movement' },
            { title: 'كشف حركة العميل التفصيلي', translationKey: 'Nav.Warehouse.ClientMovement', dirchange: false, type: 'link', active: false, selected: false, path: '/warehouse/reports/client-movement' },
            { title: 'كشف حركة الصرف للاصناف', translationKey: 'Nav.Warehouse.CategoryDisbursement', dirchange: false, type: 'link', active: false, selected: false, path: '/warehouse/reports/category-disbursement' },
          ]
        },
      ]
    },
    { headTitle: 'Nav.Purchases.Title' },
    {
      title: 'نظام ادارة المشتريات',
      translationKey: 'Nav.Purchases.Title',
      icon: 'bi-cart',
      dirchange: false,
      type: 'sub',
      active: false,
      children: [
        {
          title: 'شاشات الإدخال',
          translationKey: 'Nav.Purchases.InputScreens',
          dirchange: false,
          type: 'sub',
          active: false,
          children: [
            { title: 'بطاقة المادة', translationKey: 'Nav.Purchases.ItemCard', dirchange: false, type: 'link', active: false, selected: false, path: '/purchases/entry/item-card' },
            { title: 'ادخال الموردين', translationKey: 'Nav.Purchases.EntrySuppliers', dirchange: false, type: 'link', active: false, selected: false, path: '/purchases/entry/suppliers' },
            { title: 'ادخال شروط الدفع', translationKey: 'Nav.Purchases.PaymentTerms', dirchange: false, type: 'link', active: false, selected: false, path: '/purchases/entry/payment-terms' },
            { title: 'ادخال مصاريف الشراء', translationKey: 'Nav.Purchases.PurchaseExpenses', dirchange: false, type: 'link', active: false, selected: false, path: '/purchases/entry/purchase-expenses' },
            { title: 'سند الادخال', translationKey: 'Nav.Purchases.Inbound', dirchange: false, type: 'link', active: false, selected: false, path: '/purchases/entry/inbound' },
            { title: 'سند الاخراج', translationKey: 'Nav.Purchases.Outbound', dirchange: false, type: 'link', active: false, selected: false, path: '/purchases/entry/outbound' },
            { title: 'ادخال الضرائب', translationKey: 'Nav.Purchases.Taxes', dirchange: false, type: 'link', active: false, selected: false, path: '/purchases/entry/taxes' },
            { title: 'ادخال شروط الضريبة (خاص بالفوترة)', translationKey: 'Nav.Purchases.TaxConditions', dirchange: false, type: 'link', active: false, selected: false, path: '/purchases/entry/tax-conditions' },
          ]
        },
        {
          title: 'المستندات',
          translationKey: 'Nav.Purchases.Documents',
          dirchange: false,
          type: 'sub',
          active: false,
          children: [
            { title: 'طلب مواد شراء', translationKey: 'Nav.Purchases.MaterialRequest', dirchange: false, type: 'link', active: false, selected: false, path: '/purchases/documents/material-request' },
            { title: 'طلب شراء المواد', translationKey: 'Nav.Purchases.PurchaseOrder', dirchange: false, type: 'link', active: false, selected: false, path: '/purchases/documents/purchase-order' },
            { title: 'عرض سعر', translationKey: 'Nav.Purchases.SupplierQuotation', dirchange: false, type: 'link', active: false, selected: false, path: '/purchases/documents/supplier-quotation' },
            { title: 'طلب عروض الأسعار', translationKey: 'Nav.Purchases.Rfq', dirchange: false, type: 'link', active: false, selected: false, path: '/purchases/documents/rfq' },
            { title: 'تجميع طلبات شراء المواد', translationKey: 'Nav.Purchases.PoConsolidation', dirchange: false, type: 'link', active: false, selected: false, path: '/purchases/documents/po-consolidation' },
            { title: 'أمر الشراء', translationKey: 'Nav.Purchases.PurchaseOrderDoc', dirchange: false, type: 'link', active: false, selected: false, path: '/purchases/documents/purchase-order-doc' },
            { title: 'سند استلام بضاعة', translationKey: 'Nav.Purchases.GoodsReceipt', dirchange: false, type: 'link', active: false, selected: false, path: '/purchases/documents/goods-receipt' },
            { title: 'فاتورة مشتريات', translationKey: 'Nav.Purchases.PurchaseInvoice', dirchange: false, type: 'link', active: false, selected: false, path: '/purchases/documents/purchase-invoice' },
          ]
        },
      ]
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
          title: 'Quotation',
          translationKey: 'Nav.Quotation.Title',
          dirchange: false,
          type: 'link',
          active: false,
          selected: false,
          path: '/reseller/quotation',
          roles: ['Admin', 'Manager', 'Sales', 'VirtualSales', 'CashLink', 'VirtualCashLink', 'CashLinkLimit', 'VirtualCashLinkLimit'],
        },
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
    { headTitle: 'Nav.Workflow.HeadTitle' },
    {
      title: 'Workflow Automation',
      translationKey: 'Nav.Workflow.Title',
      icon: 'bi-diagram-3',
      dirchange: false,
      type: 'sub',
      active: false,
      children: [
        { title: 'Workflow Builder', translationKey: 'Nav.Workflow.Builder', dirchange: false, type: 'link', active: false, selected: false, path: '/workflow/builder' },
        { title: 'Tasks',            translationKey: 'Nav.Workflow.Tasks',   dirchange: false, type: 'link', active: false, selected: false, path: '/workflow/tasks' },
      ]
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
    {
      title: 'Service Misc',
      translationKey: 'Nav.ServiceMisc.Title',
      icon: 'bi-grid',
      type: 'sub',
      active: false,
      roles: ['Admin', 'Manager'],
      children: [
        {
          title: 'Voucher Serials',
          translationKey: 'Nav.ServiceMisc.VoucherSerials',
          dirchange: false,
          type: 'link',
          active: false,
          selected: false,
          path: '/accounting/service-misc/voucher-serials',
          roles: ['Admin', 'Manager'],
        },
        {
          title: 'Branches',
          translationKey: 'Nav.ServiceMisc.Branches',
          dirchange: false,
          type: 'link',
          active: false,
          selected: false,
          path: '/accounting/service-misc/branches',
          roles: ['Admin', 'Manager'],
        }
      ]
    },

    { headTitle: 'Nav.SystemAdmin.HeadTitle' },
    {
      title: 'System Administration',
      translationKey: 'Nav.SystemAdmin.Title',
      icon: 'bi-building-gear',
      type: 'sub',
      active: false,
      roles: ['Admin', 'Manager', 'Administrator'],
      children: [
        {
          title: 'Company Information',
          translationKey: 'Nav.SystemAdmin.CompanyInfo',
          type: 'link',
          path: '/accounting/system/company-info',
          active: false,
          roles: ['Admin', 'Manager', 'Administrator'],
        },
        {
          title: 'Billing System Linkage',
          translationKey: 'Nav.SystemAdmin.FotaraSettings',
          type: 'link',
          path: '/accounting/system/fotara-settings',
          active: false,
          roles: ['Admin', 'Manager', 'Administrator'],
        }
      ]
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
          title: 'Appearance',
          translationKey: 'Nav.Settings.Appearance',
          type: 'link',
          path: '/accounting/settings/appearance',
          active: false,
        },
        {
          title: 'Report Print Settings',
          translationKey: 'Nav.Settings.ReportPrint',
          type: 'link',
          path: '/accounting/settings/report-print',
          active: false,
        },
        {
          title: 'Permissions',
          translationKey: 'Nav.Settings.Permissions',
          type: 'link',
          path: '/accounting/admin/permissions',
          active: false,
          roles: ['Admin', 'Manager', 'Administrator'],
        },
        {
          title: 'Activity Log',
          translationKey: 'Nav.Settings.ActivityLog',
          icon: 'bi-journal-text',
          type: 'link',
          path: '/activity-log',
          active: false,
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
    this.applyTaskBadge(this.MENUITEMS);
    this.items.next(this.MENUITEMS);
  }

  // Role-based menu filtering has been removed. Page/feature access is now
  // governed entirely by the fine-grained permission system (the *hasPermission
  // directive on buttons/sections, managed from accounting/admin/permissions).
  // Menu items are no longer hidden by role, so a user is not required to be
  // Admin/Manager/etc. to reach a page — the permissions decide what they can do.
  private filterMenuByRoles(items: Menu[]): Menu[] {
    return items;
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