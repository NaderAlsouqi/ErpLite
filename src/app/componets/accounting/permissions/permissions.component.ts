import { Component, OnInit, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ToastrService } from 'ngx-toastr';
import { SharedModule } from '../../../shared/common/sharedmodule';
import {
  AdminUserDto,
  PermissionMatrixItemDto,
  PermissionService
} from '../../../shared/services/permission.service';
import { AuthService } from '../../../shared/services/auth.service';
import { NgSelectModule } from '@ng-select/ng-select';

interface PermissionGroup {
  module: string;
  items: PermissionMatrixItemDto[];
  allChecked: boolean;
  indeterminate: boolean;
}

interface SystemDef {
  key: string;
  labelKey: string;   // i18n key
  modules: string[];
}

const SYSTEMS: SystemDef[] = [
  { key: 'Sales',      labelKey: 'Nav.Sales.Title',             modules: ['Invoices', 'ServiceInvoices', 'VirtualInvoices', 'Refunds'] },
  { key: 'Accounting', labelKey: 'Nav.Accounting.Title',        modules: ['ChartOfAccounts', 'JournalVouchers', 'CashPayment', 'IncomingCheq1', 'OutgoingCheq1', 'ChequeDeposit', 'Cheques', 'CostCenters', 'CenterBal', 'Accounts', 'AccountGroups', 'Receipts', 'Banks', 'Currencies', 'Taxes', 'Stamps', 'VoucherSerials', 'Branches', 'CheckPayment', 'CheqDeposit', 'CheqTracking', 'ChequeCollection', 'ChequeReturn', 'ChequeWithdrawal', 'ChequeEndorsement', 'ReDepositRet', 'CostCenterAccBalances', 'CostCenterTransactions', 'IncomingChequeMovement', 'InwardCheques', 'OutwardCheques', 'ChequesToBeneficiary', 'PaymentVouchers', 'AccountLedger', 'MissingVouchers', 'YearEndClosing', 'ServBill'] },
  { key: 'Contacts',   labelKey: 'Nav.Accounting.Contacts',     modules: ['Customers', 'Vendors'] },
  { key: 'Inventory',  labelKey: 'Nav.Inventory.Title',         modules: ['Items'] },
  { key: 'Settings',   labelKey: 'Nav.Settings.Title',          modules: ['Accf', 'Comf'] },
  { key: 'Reports',    labelKey: 'Nav.Reports.Title',           modules: ['Reports'] },
  { key: 'Files',      labelKey: 'Nav.Files.Title',             modules: ['Notes', 'Images'] },
  { key: 'Admin',      labelKey: 'Nav.Accounting.Admin',        modules: ['Admin'] },
];

@Component({
  selector: 'app-permissions',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslateModule, SharedModule, NgSelectModule],
  templateUrl: './permissions.component.html',
  styleUrl: './permissions.component.scss',
  encapsulation: ViewEncapsulation.None
})
export class PermissionsComponent implements OnInit {
  users: AdminUserDto[] = [];
  selectedUserId: number | null = null;
  searchUser = '';
  searchPermission = '';
  selectedSystem: string | null = null;

  matrix: PermissionMatrixItemDto[] = [];
  groups: PermissionGroup[] = [];
  filteredGroups: PermissionGroup[] = [];
  availableSystems: SystemDef[] = [];
  tableColumns: string[] = [];
  loading = false;
  saving = false;

  userSearchFn = (term: string, item: AdminUserDto): boolean => {
    const t = term.toLowerCase();
    return item.Login_Name?.toLowerCase().includes(t) ||
           item.FullName?.toLowerCase().includes(t);
  };

  private readonly COLUMN_ORDER = [
    'View', 'Create', 'Edit', 'Delete', 'Print', 'Export',
    'Transfer', 'Refund', 'GenerateQR', 'Rename', 'Statement',
    'Link', 'LinkAccounts', 'Units', 'StoreQuantity', 'Clear',
    'Adjust', 'Upload', 'AccountStatement', 'InvoicesReport',
    'BalanceReport', 'AccessPanel', 'ManageUsers', 'ManageRoles',
    'ManagePermissions'
  ];

  private itemLookup = new Map<string, Map<string, PermissionMatrixItemDto>>();

  constructor(
    private permissionService: PermissionService,
    private authService: AuthService,
    private toastr: ToastrService,
    private translate: TranslateService
  ) {}

  ngOnInit(): void {
    this.loadUsers();
  }

  get filteredUsers(): AdminUserDto[] {
    const q = (this.searchUser || '').toLowerCase().trim();
    if (!q) return this.users;
    return this.users.filter(u =>
      (u.Login_Name || '').toLowerCase().includes(q) ||
      (u.FullName || '').toLowerCase().includes(q)
    );
  }

  loadUsers(): void {
    this.permissionService.getUsers().subscribe({
      next: data => this.users = data || [],
      error: () => this.users = []
    });
  }

  onSelectUser(userId: number): void {
    this.selectedUserId = userId;
    this.loadMatrix();
  }

  loadMatrix(): void {
    if (this.selectedUserId == null) return;
    this.loading = true;
    this.permissionService.getUserPermissionsMatrix(this.selectedUserId).subscribe({
      next: data => {
        this.matrix = data || [];
        this.buildGroups();
        this.loading = false;
      },
      error: () => {
        this.matrix = [];
        this.groups = [];
        this.loading = false;
      }
    });
  }

  private buildGroups(): void {
    const map = new Map<string, PermissionMatrixItemDto[]>();
    for (const p of this.matrix) {
      if (!map.has(p.Module)) map.set(p.Module, []);
      map.get(p.Module)!.push(p);
    }
    this.groups = Array.from(map.entries())
      .map(([module, items]) => ({
        module,
        items,
        allChecked: items.every(i => i.IsGranted),
        indeterminate: items.some(i => i.IsGranted) && !items.every(i => i.IsGranted)
      }))
      .sort((a, b) => a.module.localeCompare(b.module));

    // Build O(1) item lookup: module -> action -> item
    this.itemLookup = new Map();
    for (const g of this.groups) {
      const actionMap = new Map<string, PermissionMatrixItemDto>();
      for (const item of g.items) {
        actionMap.set(this.getActionKey(item.PermissionKey), item);
      }
      this.itemLookup.set(g.module, actionMap);
    }

    // Only expose systems that have at least one module present in the data
    const presentModules = new Set(this.groups.map(g => g.module));
    this.availableSystems = SYSTEMS.filter(s => s.modules.some(m => presentModules.has(m)));

    this.updateFilteredGroups();
  }

  onItemToggle(group: PermissionGroup): void {
    group.allChecked = group.items.every(i => i.IsGranted);
    group.indeterminate = group.items.some(i => i.IsGranted) && !group.allChecked;
  }

  onToggleGroup(group: PermissionGroup): void {
    const newVal = !group.allChecked;
    for (const i of group.items) i.IsGranted = newVal;
    group.allChecked = newVal;
    group.indeterminate = false;
  }

  selectAll(): void {
    for (const g of this.groups) {
      for (const i of g.items) i.IsGranted = true;
      g.allChecked = true;
      g.indeterminate = false;
    }
  }

  clearAll(): void {
    for (const g of this.groups) {
      for (const i of g.items) i.IsGranted = false;
      g.allChecked = false;
      g.indeterminate = false;
    }
  }

  matchesSearch(item: PermissionMatrixItemDto): boolean {
    const q = (this.searchPermission || '').toLowerCase().trim();
    if (!q) return true;
    return (item.DisplayName || '').toLowerCase().includes(q) ||
           (item.PermissionKey || '').toLowerCase().includes(q) ||
           (item.Module || '').toLowerCase().includes(q);
  }

  updateFilteredGroups(): void {
    let filtered = this.groups;

    if (this.selectedSystem) {
      const sys = SYSTEMS.find(s => s.key === this.selectedSystem);
      if (sys) {
        const allowed = new Set(sys.modules);
        filtered = filtered.filter(g => allowed.has(g.module));
      }
    }

    if (this.searchPermission) {
      filtered = filtered
        .map(g => ({ ...g, items: g.items.filter(i => this.matchesSearch(i)) }))
        .filter(g => g.items.length > 0);
    }

    this.filteredGroups = filtered;
    this.rebuildTableColumns();
  }

  private rebuildTableColumns(): void {
    const present = new Set<string>();
    for (const g of this.filteredGroups) {
      for (const item of g.items) present.add(this.getActionKey(item.PermissionKey));
    }
    this.tableColumns = this.COLUMN_ORDER
      .filter(a => present.has(a))
      .concat(Array.from(present).filter(a => !this.COLUMN_ORDER.includes(a)));
  }

  getActionKey(permissionKey: string): string {
    const dot = permissionKey.indexOf('.');
    return dot >= 0 ? permissionKey.slice(dot + 1) : permissionKey;
  }

  getActionName(permissionKey: string): string {
    const action = this.getActionKey(permissionKey);
    const translated = this.translate.instant('Permissions.Actions.' + action);
    return translated !== 'Permissions.Actions.' + action ? translated : action;
  }

  getItemForAction(group: PermissionGroup, action: string): PermissionMatrixItemDto | null {
    return this.itemLookup.get(group.module)?.get(action) ?? null;
  }

  isColumnAllChecked(action: string): boolean {
    return this.filteredGroups.every(g => {
      const item = this.getItemForAction(g, action);
      return !item || item.IsGranted;
    });
  }

  isColumnIndeterminate(action: string): boolean {
    const items = this.filteredGroups
      .map(g => this.getItemForAction(g, action))
      .filter((i): i is PermissionMatrixItemDto => i !== null);
    const granted = items.filter(i => i.IsGranted).length;
    return granted > 0 && granted < items.length;
  }

  onToggleColumn(action: string): void {
    const allChecked = this.isColumnAllChecked(action);
    for (const g of this.filteredGroups) {
      const item = this.getItemForAction(g, action);
      if (item) {
        item.IsGranted = !allChecked;
        this.onItemToggle(g);
      }
    }
  }

  getSystemLabel(sys: SystemDef): string {
    return this.translate.instant(sys.labelKey) || sys.key;
  }

  getModuleName(mod: string): string {
    const map: { [key: string]: string } = {
      'Invoices': this.translate.instant('Nav.Sales.Invoices') || 'Invoices',
      'ServiceInvoices': this.translate.instant('Nav.Sales.ServiceInvoices') || 'Service Invoices',
      'VirtualInvoices': this.translate.instant('Nav.Sales.VirtualInvoices') || 'Virtual Invoices',
      'Accounts': this.translate.instant('AccountStatement.Account') || 'Accounts',
      'AccountGroups': this.translate.instant('AccountGroups.Title') || 'Account Groups',
      'Customers': this.translate.instant('Nav.Accounting.Customers') || 'Customers',
      'Vendors': this.translate.instant('Nav.Accounting.Suppliers') || 'Vendors',
      'Accf': this.translate.instant('ChartOfAccounts.Title') || 'Chart of Accounts (Accf)',
      'Comf': this.translate.instant('General.Companies') || 'Companies',
      'Items': this.translate.instant('InvoiceDetails.Items') || 'Items',
      'Banks': this.translate.instant('Banks.Title') || 'Banks',
      'Currencies': this.translate.instant('Currencies.Title') || 'Currencies',
      'Taxes': this.translate.instant('Taxes.Title') || 'Taxes',
      'Stamps': this.translate.instant('Stamps.Title') || 'Stamps',
      'CostCenters': this.translate.instant('CostCenters.Title') || 'Cost Centers',
      'JournalVouchers': this.translate.instant('Nav.Accounting.JournalVouchers') || 'Journal Vouchers',
      'ChartOfAccounts': this.translate.instant('ChartOfAccounts.Title') || 'Chart of Accounts',
      'CenterBal': this.translate.instant('Nav.Accounting.CcOpeningBalances') || 'Center Balance',
      'Notes': this.translate.instant('NotesPage.Title') || 'Notes',
      'Images': this.translate.instant('General.Images') || 'Images',
      'Reports': this.translate.instant('Nav.Reports.Title') || 'Reports',
      'Refunds': this.translate.instant('RefundsPage.Title') || 'Refunds',
      'Receipts': this.translate.instant('Nav.Accounting.ReceiptVouchers') || 'Receipts',
      'CashPayment': this.translate.instant('CashPayment.Title') || 'سند صرف',
      'IncomingCheq1': this.translate.instant('IncomingCheq1.Title') || 'شيكات واردة اول مرة',
      'OutgoingCheq1': this.translate.instant('OutgoingCheq1.Title') || 'شيكات صادرة اول مرة',
      'ChequeDeposit': this.translate.instant('ChequeDeposit.Title') || 'ايداع الشيكات',
      'Cheques': this.translate.instant('Nav.Accounting.Cheques') || 'Cheques',
      'Admin': this.translate.instant('Nav.Accounting.Admin') || 'Admin',
      'VoucherSerials': this.translate.instant('Nav.ServiceMisc.VoucherSerials') || 'Voucher Serials',
      'Branches': this.translate.instant('Nav.ServiceMisc.Branches') || 'Branches',

      // ── Cheque modules ──────────────────────────────────────────────
      'CheckPayment': this.translate.instant('Nav.Accounting.ChequePaymentVoucher') || 'سند صرف شيكات',
      'CheqDeposit': this.translate.instant('ChequeDeposit.Title') || 'ايداع الشيكات',
      'CheqTracking': this.translate.instant('Nav.Accounting.CheqTracking') || 'متابعة الشيكات',
      'ChequeCollection': this.translate.instant('Nav.Accounting.ChequeCollection') || 'تحصيل الشيكات',
      'ChequeReturn': this.translate.instant('Nav.Accounting.ChequeReturn') || 'ارجاع الشيكات',
      'ChequeWithdrawal': this.translate.instant('Nav.Accounting.ChequeWithdrawal') || 'سحب الشيكات',
      'ChequeEndorsement': this.translate.instant('Nav.Accounting.ChequeEndorsement') || 'تجيير الشيكات',
      'ReDepositRet': this.translate.instant('Nav.Accounting.ChequeReReturn') || 'اعادة شيكات راجعة',

      // ── Newly-added report / misc pages ─────────────────────────────
      'CostCenterAccBalances': this.translate.instant('Nav.Accounting.CostCenterAccBalances') || 'كشف أرصدة مراكز الكلف',
      'CostCenterTransactions': this.translate.instant('Nav.Accounting.CostCenterTransactions') || 'كشف حركات مراكز الكلفة',
      'IncomingChequeMovement': this.translate.instant('Nav.Accounting.IncomingChequeMovement') || 'كشف حركة شيك وارد',
      'InwardCheques': this.translate.instant('Nav.Accounting.InwardCheques') || 'الشيكات الواردة خلال فترة',
      'OutwardCheques': this.translate.instant('Nav.Accounting.OutwardCheques') || 'الشيكات الصادرة خلال فترة',
      'ChequesToBeneficiary': this.translate.instant('Nav.Accounting.ChequesToBeneficiary') || 'الشيكات الصادرة الى مستفيد',
      'PaymentVouchers': this.translate.instant('Nav.Accounting.PaymentVouchers') || 'كشف سندات الصرف',
      'AccountLedger': this.translate.instant('Nav.Accounting.AccountLedger') || 'كشف حركات ورصيد حساب',
      'MissingVouchers': this.translate.instant('Nav.Accounting.MissingVouchers') || 'كشف حركات السندات المفقودة',
      'YearEndClosing': this.translate.instant('Nav.Accounting.YearEndClosing') || 'الاقفال السنوي',
      'ServBill': this.translate.instant('Nav.Accounting.ServBill') || 'فاتورة خدمات'
    };
    return map[mod] || mod;
  }

  save(): void {
    if (this.selectedUserId == null) return;
    const ids = this.matrix.filter(m => m.IsGranted).map(m => m.PermissionID);
    this.saving = true;
    this.permissionService.setUserPermissions({
      User_ID: this.selectedUserId,
      PermissionIDs: ids
    }).subscribe({
      next: () => {
        this.saving = false;
        this.toastr.success(
          this.translate.instant('Permissions.SavedMessage') || 'Permissions saved.',
          this.translate.instant('General.Success') || 'Success'
        );
        // If the edited user is me, refresh my own permissions live.
        const me = this.authService.currentUserValue;
        if (me && me.ID === this.selectedUserId) {
          const keys = this.matrix.filter(m => m.IsGranted).map(m => m.PermissionKey);
          this.authService.refreshPermissions(keys);
        }
      },
      error: () => { this.saving = false; }
    });
  }
}
