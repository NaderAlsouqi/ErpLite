import { Component, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ToastrService } from 'ngx-toastr';
import { NgSelectModule } from '@ng-select/ng-select';
import { SharedModule } from '../../../shared/common/sharedmodule';
import { VendorDto, VendorService } from '../../../shared/services/vendor.service';
import { ConfirmationModalComponent } from '../../../shared/common/confirmation-modal/confirmation-modal.component';
import { HasPermissionDirective } from '../../../shared/directives/has-permission.directive';
import { ReportService } from '../../../shared/services/report.service';
import { ReportExportComponent } from '../../../shared/components/report-export/report-export.component';
import { PaginatorComponent } from '../../../shared/components/paginator/paginator.component';
import { PaginatePipe } from '../../../shared/pipes/paginate.pipe';
import * as XLSX from 'xlsx';

@Component({
  selector: 'app-vendors',
  standalone: true,
  imports: [
    ReportExportComponent,
    CommonModule,
    FormsModule,
    TranslateModule,
    NgSelectModule,
    SharedModule,
    ConfirmationModalComponent,
    HasPermissionDirective,
    PaginatorComponent,
    PaginatePipe,
  ],
  templateUrl: './vendors.component.html',
  styleUrl: './vendors.component.scss',
})
export class VendorsComponent implements OnInit {
  @ViewChild('confirmModal') confirmModal!: ConfirmationModalComponent;

  vendors: VendorDto[] = [];
  vendorOptions: VendorDto[] = [];   // dropdown items (existing vendors only)
  nextNo = 0;                        // suggested number for a new vendor (used on save)
  filteredVendors: VendorDto[] = [];
  filterName = '';
  page = 1;
  pageSize = 10;

  current: VendorDto = this.initForm();
  loading = false;
  saving = false;
  importing = false;
  activeTab: 'form' | 'list' = 'form';

  /** Permission module prefix — 'Vendors' under Warehouse, 'PurchVendors' under
   *  Purchases (set via route data.permPrefix). Lets one component serve both
   *  modules with independent permission sets. */
  permPrefix = 'Vendors';
  get pCreate(): string { return `${this.permPrefix}.Create`; }
  get pDelete(): string { return `${this.permPrefix}.Delete`; }
  get pPrint(): string { return `${this.permPrefix}.Print`; }
  /** Breadcrumb parent — reflects which module the screen is opened from. */
  get parentTitleKey(): string {
    return this.permPrefix === 'PurchVendors' ? 'Nav.Purchases.InputScreens' : 'Nav.Warehouse.InputScreens';
  }

  /** Excel header -> vendor field aliases (Arabic + English). */
  private readonly importAliases: { [field: string]: string[] } = {
    No: ['no', 'number', 'رقم', 'رقم المورد', 'الرقم'],
    Name: ['name', 'الاسم', 'اسم المورد', 'اسم المورد عربي', 'اسم المورد (عربي)', 'arabic name', 'name (arabic)'],
    Ename: ['ename', 'english name', 'name (english)', 'اسم المورد انجليزي', 'اسم المورد إنجليزي', 'اسم المورد (إنجليزي)'],
    Person: ['person', 'contact', 'contact person', 'الشخص', 'اسم الشخص', 'اسم الشخص الذي يتم الاتصال به'],
    Address: ['address', 'العنوان', 'عنوان'],
    Tel: ['tel', 'tel1', 'tel - 1', 'phone', 'هاتف', 'هاتف 1', 'هاتف - 1'],
    Tel2: ['tel2', 'tel - 2', 'هاتف 2', 'هاتف - 2'],
    MobileNo: ['mobile', 'mobileno', 'الموبايل', 'رقم الموبايل', 'جوال'],
    Fax: ['fax', 'الفاكس', 'فاكس'],
    Pobox: ['pobox', 'po box', 'p.o. box', 'صندوق بريد', 'صندوق البريد'],
    Zipcode: ['zipcode', 'zip', 'zip code', 'الرمز البريدي', 'الرمز'],
    Email: ['email', 'ايميل', 'إيميل', 'بريد', 'بريد الكتروني'],
    Skype: ['skype', 'سكايب'],
    Website: ['website', 'web', 'ويب', 'الموقع'],
    Nickname: ['nickname', 'اللقب', 'لقب'],
    Tradename: ['tradename', 'trade name', 'الاسم التجاري', 'اسم الشركة التجاري', 'إسم الشركة التجاري'],
    Ceiling: ['ceiling', 'credit ceiling', 'سقف', 'سقف التسهيلات'],
    TaxNo: ['taxno', 'tax', 'tax number', 'الرقم الضريبي', 'رقم ضريبي', 'الرقم الضريبي للمورد'],
  };

  switchToForm(): void { this.activeTab = 'form'; }
  switchToList(): void { this.activeTab = 'list'; }

  get isAr(): boolean { return this.translate.currentLang === 'ar'; }

  /** Search the vendor dropdown by number / Arabic name / English name. */
  vendorSearchFn = (term: string, item: VendorDto): boolean => {
    term = (term || '').toLowerCase();
    return String(item.No).includes(term)
      || (item.Name || '').toLowerCase().includes(term)
      || (item.Ename || '').toLowerCase().includes(term);
  };

  /** Allow typing a brand-new vendor number to add a new vendor. */
  addVendorTag = (term: string): VendorDto | null => {
    const n = parseInt(term, 10);
    if (!n || n <= 0) return null;
    return { No: n, Name: '', Ename: '' };
  };

  /** Vendor picked (or a new number tagged) in the dropdown. */
  onNoSelect(item: VendorDto | null): void {
    if (!item || !item.No) { this.reset(); return; }
    const no = +item.No;
    const existing = this.vendors.some(v => +v.No === no);
    if (existing) {
      this.vendorService.getById(no).subscribe({
        next: (v) => { if (v) { this.current = { ...this.initForm(), ...v, PDate: (v.PDate || '').toString().slice(0, 10) || this.todayIso() }; this.rebuildOptions(); } },
        error: () => {}
      });
    } else {
      // new vendor with this number
      this.current = { ...this.initForm(), No: no };
      this.rebuildOptions();
    }
  }

  constructor(
    private vendorService: VendorService,
    private toastr: ToastrService,
    private translate: TranslateService,
    public reportService: ReportService,
    private route: ActivatedRoute,
  ) {}

  ngOnInit(): void {
    this.permPrefix = this.route.snapshot.data['permPrefix'] || 'Vendors';
    this.loadData();
  }

  private todayIso(): string {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  private initForm(): VendorDto {
    return {
      No: 0, Name: '', Ename: '', Person: '', Address: '',
      Tel: '', Tel2: '', MobileNo: '', Fax: '', Pobox: '', Zipcode: '',
      Email: '', Skype: '', Website: '', Nickname: '', Tradename: '',
      Ceiling: 0, TaxNo: null, PDate: this.todayIso(), Related: false,
      Pur: 0, Year: new Date().getFullYear(), Balance: 0
    };
  }

  loadData(): void {
    this.loading = true;
    this.vendorService.getAll().subscribe({
      next: (data) => {
        this.vendors = data;
        this.applyFilters();
        this.setNextNo();
        this.loading = false;
      },
      error: () => { this.loading = false; }
    });
  }

  private setNextNo(): void {
    const max = this.vendors.length > 0 ? Math.max(...this.vendors.map(v => +v.No)) : 0;
    this.nextNo = max + 1;
    this.current.No = null as any;   // leave the dropdown empty (placeholder) for a new vendor
    this.rebuildOptions();
  }

  /** Dropdown items = existing vendors only (new numbers are added by typing). */
  private rebuildOptions(): void {
    this.vendorOptions = [...this.vendors];
  }

  applyFilters(): void {
    const term = this.filterName.toLowerCase();
    this.filteredVendors = this.vendors.filter(v =>
      !term ||
      v.No.toString().includes(term) ||
      v.Name?.toLowerCase().includes(term) ||
      v.Ename?.toLowerCase().includes(term) ||
      v.Person?.toLowerCase().includes(term) ||
      v.Tel?.toLowerCase().includes(term) ||
      v.MobileNo?.toLowerCase().includes(term)
    );
    this.page = 1;
  }

  clearFilters(): void { this.filterName = ''; this.applyFilters(); }

  onNoChange(): void {
    const no = +this.current.No;
    if (!no) return;
    const exists = this.vendors.some(v => +v.No === no);
    if (exists) {
      // load the full record for editing
      this.vendorService.getById(no).subscribe({
        next: (v) => { if (v) this.current = { ...this.initForm(), ...v, PDate: (v.PDate || '').toString().slice(0, 10) || this.todayIso() }; },
        error: () => {}
      });
    }
  }

  onSelectRow(vendor: VendorDto): void {
    this.activeTab = 'form';
    this.vendorService.getById(vendor.No).subscribe({
      next: (v) => { if (v) this.current = { ...this.initForm(), ...v, PDate: (v.PDate || '').toString().slice(0, 10) || this.todayIso() }; },
      error: () => {}
    });
  }

  save(): void {
    if (!this.current.No || +this.current.No <= 0) this.current.No = this.nextNo;  // auto-assign next number
    if (!this.validate()) return;
    const isEdit = this.vendors.some(v => +v.No === +this.current.No);
    this.saving = true;
    const payload: VendorDto = { ...this.current };
    const req = isEdit
      ? this.vendorService.update(this.current.No, payload)
      : this.vendorService.add(payload);
    req.subscribe({
      next: (res: any) => {
        this.toastr.success(res?.message || this.translate.instant('General.SaveSuccess'));
        this.loadData();
        this.reset();
        this.saving = false;
      },
      error: (err: any) => {
        this.toastr.error(err.error?.message || err.error?.Message || this.translate.instant('General.Error'));
        this.saving = false;
      }
    });
  }

  delete(): void {
    if (!this.current.No) return;
    this.confirmModal.show();
  }

  confirmDelete(): void {
    this.vendorService.delete(this.current.No).subscribe({
      next: (res: any) => {
        this.toastr.success(res?.message || this.translate.instant('General.DeleteSuccess'));
        this.loadData();
        this.reset();
      },
      error: (err: any) => {
        this.toastr.error(err.error?.message || err.error?.Message || this.translate.instant('General.Error'));
      }
    });
  }

  reset(): void {
    this.current = this.initForm();
    this.setNextNo();
  }

  validate(): boolean {
    if (!this.current.No || this.current.No <= 0) {
      this.toastr.warning(this.translate.instant('Vendors.NoRequired'));
      return false;
    }
    if (!this.current.Name?.trim()) {
      this.toastr.warning(this.translate.instant('Vendors.NameRequired'));
      return false;
    }
    return true;
  }

  // ─── Purchases year navigator ────────────────────────────────
  changeYear(delta: number): void {
    const y = (this.current.Year || new Date().getFullYear()) + delta;
    if (y < 1) return;
    this.current.Year = y;
    this.loadPurchases();
  }

  /** Re-query the vendor's purchases for the selected year (0 if no row). */
  loadPurchases(): void {
    const no = +this.current.No;
    const year = +(this.current.Year || 0);
    if (!no || !year || !this.vendors.some(v => +v.No === no)) { this.current.Pur = 0; return; }
    this.vendorService.getPurchases(no, year).subscribe({
      next: (r) => { this.current.Pur = r?.pur ?? 0; },
      error: () => { this.current.Pur = 0; }
    });
  }

  // ─── Excel import ────────────────────────────────────────────
  private norm(s: any): string {
    return String(s ?? '').trim().toLowerCase().replace(/\s+/g, ' ');
  }

  triggerImport(input: HTMLInputElement): void {
    input.value = '';
    input.click();
  }

  onImportFile(ev: Event): void {
    const input = ev.target as HTMLInputElement;
    const file = input.files && input.files[0];
    if (!file) return;
    this.importing = true;
    const reader = new FileReader();
    reader.onload = (e: any) => {
      try {
        const wb = XLSX.read(new Uint8Array(e.target.result), { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
        if (!rows || rows.length < 2) { this.importing = false; this.toastr.warning(this.translate.instant('Vendors.ImportEmpty')); input.value = ''; return; }

        const headers = rows[0].map(h => this.norm(h));
        const colField: (string | null)[] = headers.map(h => {
          for (const f of Object.keys(this.importAliases)) {
            if (this.importAliases[f].some(a => this.norm(a) === h)) return f;
          }
          return null;
        });
        if (!colField.includes('No')) { this.importing = false; this.toastr.error(this.translate.instant('Vendors.ImportNoCol')); input.value = ''; return; }

        const vendors: VendorDto[] = [];
        for (let r = 1; r < rows.length; r++) {
          const row = rows[r] || [];
          if (row.every(c => String(c ?? '').trim() === '')) continue;
          const v: any = { No: 0, Related: false };
          colField.forEach((f, ci) => {
            if (!f) return;
            const val = row[ci];
            if (val === '' || val == null) return;
            if (f === 'No') v.No = parseInt(String(val).replace(/[^\d]/g, ''), 10) || 0;
            else if (f === 'Ceiling' || f === 'TaxNo') v[f] = parseFloat(String(val).replace(/[^\d.]/g, '')) || 0;
            else v[f] = String(val).trim();
          });
          if (v.No > 0) vendors.push(v);
        }
        if (vendors.length === 0) { this.importing = false; this.toastr.warning(this.translate.instant('Vendors.ImportEmpty')); input.value = ''; return; }

        this.vendorService.import(vendors).subscribe({
          next: (res) => {
            this.importing = false;
            const msg = this.translate.instant('Vendors.ImportSummary', { added: res.Added, updated: res.Updated, failed: res.Failed });
            if (res.Failed > 0) { this.toastr.warning(msg); console.warn('Vendor import errors:', res.Errors); }
            else { this.toastr.success(msg); }
            this.loadData();
          },
          error: (err) => { this.importing = false; this.toastr.error(err.error?.message || this.translate.instant('General.Error')); }
        });
      } catch {
        this.importing = false;
        this.toastr.error(this.translate.instant('Vendors.ImportError'));
      } finally {
        input.value = '';
      }
    };
    reader.readAsArrayBuffer(file);
  }

  print(): void {
    const t = (k: string) => this.translate.instant(k);
    const cols = [
      { label: t('Vendors.No') },
      { label: t('Vendors.Name') },
      { label: t('Vendors.EnglishName') },
      { label: t('Vendors.Person') },
      { label: t('Vendors.Tel') },
      { label: t('Vendors.Mobile') },
    ];
    const rows = this.filteredVendors.map(v =>
      `<tr><td>${v.No ?? '—'}</td><td>${v.Name ?? '—'}</td><td>${v.Ename ?? '—'}</td>` +
      `<td>${v.Person ?? '—'}</td><td>${v.Tel ?? '—'}</td><td>${v.MobileNo ?? '—'}</td></tr>`
    ).join('');
    this.reportService.printReport(t('Vendors.Title'), cols, rows);
  }
}
