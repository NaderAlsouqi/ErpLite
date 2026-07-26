import { Component, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { NgSelectModule } from '@ng-select/ng-select';
import { ToastrService } from 'ngx-toastr';
import { SharedModule } from '../../../shared/common/sharedmodule';
import { TaxDto, TaxService } from '../../../shared/services/tax.service';
import { ChartOfAccountDto, ChartOfAccountsService } from '../../../shared/services/chart-of-accounts.service';
import { ConfirmationModalComponent } from '../../../shared/common/confirmation-modal/confirmation-modal.component';
import { HasPermissionDirective } from '../../../shared/directives/has-permission.directive';
import { ReportService } from '../../../shared/services/report.service';
import { ReportExportComponent } from '../../../shared/components/report-export/report-export.component';
import { PaginatorComponent } from '../../../shared/components/paginator/paginator.component';
import { PaginatePipe } from '../../../shared/pipes/paginate.pipe';

@Component({
  selector: 'app-taxes',
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
  templateUrl: './taxes.component.html',
  styleUrl: './taxes.component.scss',
})
export class TaxesComponent implements OnInit {
  @ViewChild('confirmModal') confirmModal!: ConfirmationModalComponent;

  taxes: TaxDto[] = [];
  filteredTaxes: TaxDto[] = [];
  accounts: ChartOfAccountDto[] = [];
  filterName = '';

  currentTax: TaxDto = this.initForm();
  loading = false;
  saving = false;
  activeTab: 'form' | 'list' = 'form';
  page = 1;
  pageSize = 10;

  switchToForm(): void { this.activeTab = 'form'; }
  switchToList(): void { this.activeTab = 'list'; }

  /** Permission module prefix — 'Taxes' under Accounting, 'PurchTaxes' under
   *  Purchases (set via route data.permPrefix). Lets one component serve both
   *  modules with independent permission sets. */
  permPrefix = 'Taxes';
  get pCreate(): string { return `${this.permPrefix}.Create`; }
  get pDelete(): string { return `${this.permPrefix}.Delete`; }
  get pPrint(): string { return `${this.permPrefix}.Print`; }
  /** Breadcrumb parent — reflects which module the screen is opened from. */
  get parentTitleKey(): string {
    return this.permPrefix === 'PurchTaxes' ? 'Nav.Purchases.InputScreens' : 'Nav.Accounting.Definitions';
  }

  constructor(
    private taxService: TaxService,
    private accService: ChartOfAccountsService,
    private toastr: ToastrService,
    private translate: TranslateService,
    public reportService: ReportService,
    private route: ActivatedRoute,
  ) {}

  ngOnInit(): void {
    this.permPrefix = this.route.snapshot.data['permPrefix'] || 'Taxes';
    this.loadData();
    this.accService.getAll().subscribe(data => this.accounts = data);
  }

  private initForm(): TaxDto {
    return { TaxNo: 0, TaxNameA: '', TaxNameE: '', TaxPerc: null, Branched: 0, Belong: null, TaxAcc: null };
  }

  loadData(): void {
    this.loading = true;
    this.taxService.getAll().subscribe({
      next: (data) => {
        this.taxes = data;
        this.applyFilters();
        this.setNextNo();
        this.loading = false;
      },
      error: () => { this.loading = false; }
    });
  }

  private setNextNo(): void {
    const max = this.taxes.length > 0 ? Math.max(...this.taxes.map(t => t.TaxNo)) : 0;
    this.currentTax.TaxNo = max + 1;
  }

  applyFilters(): void {
    const term = this.filterName.toLowerCase();
    this.filteredTaxes = this.taxes.filter(t =>
      !term ||
      t.TaxNo.toString().includes(term) ||
      t.TaxNameA?.toLowerCase().includes(term) ||
      t.TaxNameE?.toLowerCase().includes(term)
    );
    this.page = 1;
  }

  clearFilters(): void {
    this.filterName = '';
    this.applyFilters();
  }

  onNoChange(): void {
    const no = +this.currentTax.TaxNo;
    if (!no) return;
    const existing = this.taxes.find(t => +t.TaxNo === no);
    if (existing) this.currentTax = { ...existing };
  }

  onSelectRow(tax: TaxDto): void {
    this.currentTax = { ...tax };
    this.activeTab = 'form';   // open the selected record in the entry tab for editing
  }

  save(): void {
    if (!this.validate()) return;
    const isEdit = this.taxes.some(t => +t.TaxNo === +this.currentTax.TaxNo);
    this.saving = true;
    const req = isEdit
      ? this.taxService.update(this.currentTax.TaxNo, this.currentTax)
      : this.taxService.add(this.currentTax);
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
    if (!this.currentTax.TaxNo) return;
    this.confirmModal.show();
  }

  confirmDelete(): void {
    this.taxService.delete(this.currentTax.TaxNo).subscribe({
      next: (res: any) => {
        this.toastr.success(res?.message || this.translate.instant('General.DeleteSuccess'));
        this.loadData();
        this.reset();
      },
      error: (err: any) => {
        this.toastr.error(err.error?.message || this.translate.instant('General.Error'));
      }
    });
  }

  reset(): void {
    this.currentTax = this.initForm();
    this.setNextNo();
  }

  validate(): boolean {
    if (!this.currentTax.TaxNo || this.currentTax.TaxNo <= 0) {
      this.toastr.warning(this.translate.instant('Taxes.TaxNoRequired'));
      return false;
    }
    if (!this.currentTax.TaxNameA?.trim()) {
      this.toastr.warning(this.translate.instant('Taxes.ArabicNameRequired'));
      return false;
    }
    if (!this.currentTax.TaxNameE?.trim()) {
      this.toastr.warning(this.translate.instant('Taxes.EnglishNameRequired'));
      return false;
    }
    return true;
  }

  accountSearchFn = (term: string, item: ChartOfAccountDto): boolean => {
    const t = term.toLowerCase();
    return String(item.no).includes(t) ||
      (item.name?.toLowerCase().includes(t) ?? false) ||
      (item.Ename?.toLowerCase().includes(t) ?? false);
  };

  print(): void {
    const t = (k: string) => this.translate.instant(k);
    const cols = [
      { label: t('Taxes.TaxNo') },
      { label: t('Taxes.ArabicName') },
      { label: t('Taxes.EnglishName') },
      { label: t('Taxes.TaxPerc') },
    ];
    const rows = this.filteredTaxes.map(tx =>
      `<tr><td>${tx.TaxNo ?? '—'}</td><td>${tx.TaxNameA ?? '—'}</td><td>${tx.TaxNameE ?? '—'}</td><td>${tx.TaxPerc ?? '—'}</td></tr>`
    ).join('');
    this.reportService.printReport(t('Taxes.Title'), cols, rows);
  }
}
