import { Component, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ToastrService } from 'ngx-toastr';
import { SharedModule } from '../../../shared/common/sharedmodule';
import { TaxConditionDto, TaxConditionService } from '../../../shared/services/tax-condition.service';
import { ConfirmationModalComponent } from '../../../shared/common/confirmation-modal/confirmation-modal.component';
import { HasPermissionDirective } from '../../../shared/directives/has-permission.directive';
import { ReportService } from '../../../shared/services/report.service';
import { ReportExportComponent } from '../../../shared/components/report-export/report-export.component';
import { PaginatorComponent } from '../../../shared/components/paginator/paginator.component';
import { PaginatePipe } from '../../../shared/pipes/paginate.pipe';

@Component({
  selector: 'app-tax-conditions',
  standalone: true,
  imports: [
    ReportExportComponent,
    CommonModule,
    FormsModule,
    TranslateModule,
    SharedModule,
    ConfirmationModalComponent,
    HasPermissionDirective,
    PaginatorComponent,
    PaginatePipe,
  ],
  templateUrl: './tax-conditions.component.html',
  styleUrl: './tax-conditions.component.scss',
})
export class TaxConditionsComponent implements OnInit {
  @ViewChild('confirmModal') confirmModal!: ConfirmationModalComponent;

  items: TaxConditionDto[] = [];
  filteredItems: TaxConditionDto[] = [];
  filterName = '';

  current: TaxConditionDto = this.initForm();
  /** The code of the record loaded for editing ('' when adding a new one). */
  private loadedNo = '';
  loading = false;
  saving = false;
  activeTab: 'form' | 'list' = 'form';
  page = 1;
  pageSize = 10;

  switchToForm(): void { this.activeTab = 'form'; }
  switchToList(): void { this.activeTab = 'list'; }

  /** Permission module prefix — 'TaxConditions' under Purchases, 'AccTaxConditions'
   *  under Accounting (set via route data.permPrefix). Lets one component serve
   *  both modules with independent permission sets. */
  permPrefix = 'TaxConditions';
  get pCreate(): string { return `${this.permPrefix}.Create`; }
  get pDelete(): string { return `${this.permPrefix}.Delete`; }
  get pPrint(): string { return `${this.permPrefix}.Print`; }
  /** Breadcrumb parent — reflects which module the screen is opened from. */
  get parentTitleKey(): string {
    return this.permPrefix === 'AccTaxConditions' ? 'Nav.Accounting.InputScreens' : 'Nav.Purchases.InputScreens';
  }

  constructor(
    private svc: TaxConditionService,
    private toastr: ToastrService,
    private translate: TranslateService,
    public reportService: ReportService,
    private route: ActivatedRoute,
  ) {}

  ngOnInit(): void {
    this.permPrefix = this.route.snapshot.data['permPrefix'] || 'TaxConditions';
    this.loadData();
  }

  private initForm(): TaxConditionDto {
    return { No: '', Des: '', Clename: '', Type: null };
  }

  loadData(): void {
    this.loading = true;
    this.svc.getAll().subscribe({
      next: (data) => { this.items = data || []; this.applyFilters(); this.loading = false; },
      error: () => { this.loading = false; }
    });
  }

  applyFilters(): void {
    const term = this.filterName.toLowerCase().trim();
    this.filteredItems = this.items.filter(x =>
      !term ||
      (x.No || '').toLowerCase().includes(term) ||
      (x.Des || '').toLowerCase().includes(term) ||
      (x.Clename || '').toLowerCase().includes(term)
    );
    this.page = 1;
  }

  clearFilters(): void {
    this.filterName = '';
    this.applyFilters();
  }

  /** When the typed code matches an existing record, load it for editing. */
  onNoChange(): void {
    const code = (this.current.No || '').trim();
    const existing = this.items.find(x => (x.No || '').trim() === code);
    if (existing) { this.current = { ...existing }; this.loadedNo = code; }
    else { this.loadedNo = ''; }
  }

  onSelectRow(row: TaxConditionDto): void {
    this.current = { ...row };
    this.loadedNo = (row.No || '').trim();
    this.activeTab = 'form';
  }

  save(): void {
    if (!this.validate()) return;
    const code = (this.current.No || '').trim();
    const isEdit = this.items.some(x => (x.No || '').trim() === code);
    this.saving = true;
    const req = isEdit ? this.svc.update(code, this.current) : this.svc.add(this.current);
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
    if (!this.loadedNo) return;
    this.confirmModal.show();
  }

  confirmDelete(): void {
    this.svc.delete(this.loadedNo).subscribe({
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
    this.loadedNo = '';
  }

  get isExisting(): boolean { return !!this.loadedNo; }

  validate(): boolean {
    if (!this.current.No?.trim()) {
      this.toastr.warning(this.translate.instant('TaxConditions.NoRequired'));
      return false;
    }
    if (!this.current.Des?.trim()) {
      this.toastr.warning(this.translate.instant('TaxConditions.ArabicNameRequired'));
      return false;
    }
    return true;
  }

  print(): void {
    const t = (k: string) => this.translate.instant(k);
    const cols = [
      { label: t('TaxConditions.No') },
      { label: t('TaxConditions.ArabicName') },
      { label: t('TaxConditions.EnglishName') },
      { label: t('TaxConditions.Type') },
    ];
    const rows = this.filteredItems.map(x =>
      `<tr><td>${x.No ?? '—'}</td><td>${x.Des ?? '—'}</td><td>${x.Clename ?? '—'}</td><td>${x.Type ?? '—'}</td></tr>`
    ).join('');
    this.reportService.printReport(t('TaxConditions.Title'), cols, rows);
  }
}
