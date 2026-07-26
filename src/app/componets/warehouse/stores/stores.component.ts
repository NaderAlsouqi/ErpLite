import { Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { NgSelectModule } from '@ng-select/ng-select';
import { ToastrService } from 'ngx-toastr';
import { SharedModule } from '../../../shared/common/sharedmodule';
import { StoreDto, StoreService } from '../../../shared/services/store.service';
import { ChartOfAccountDto, ChartOfAccountsService } from '../../../shared/services/chart-of-accounts.service';
import { ConfirmationModalComponent } from '../../../shared/common/confirmation-modal/confirmation-modal.component';
import { HasPermissionDirective } from '../../../shared/directives/has-permission.directive';
import { ReportService } from '../../../shared/services/report.service';
import { ReportExportComponent } from '../../../shared/components/report-export/report-export.component';
import { PaginatorComponent } from '../../../shared/components/paginator/paginator.component';
import { PaginatePipe } from '../../../shared/pipes/paginate.pipe';

@Component({
  selector: 'app-stores',
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
  templateUrl: './stores.component.html',
  styleUrl: './stores.component.scss',
})
export class StoresComponent implements OnInit {
  @ViewChild('confirmModal') confirmModal!: ConfirmationModalComponent;

  stores: StoreDto[] = [];
  filteredStores: StoreDto[] = [];
  accounts: ChartOfAccountDto[] = [];
  filterName = '';
  page = 1;
  pageSize = 10;

  currentStore: StoreDto = this.initForm();
  loading = false;
  saving = false;
  activeTab: 'form' | 'list' = 'form';

  switchToForm(): void { this.activeTab = 'form'; }
  switchToList(): void { this.activeTab = 'list'; }

  constructor(
    private storeService: StoreService,
    private accService: ChartOfAccountsService,
    private toastr: ToastrService,
    private translate: TranslateService,
    public reportService: ReportService,
  ) {}

  ngOnInit(): void {
    this.loadData();
    this.accService.getAll().subscribe(data => this.accounts = data);
  }

  private initForm(): StoreDto {
    return { StoreNo: 0, StoreName: '', StoreEname: '', AccountNo: null };
  }

  loadData(): void {
    this.loading = true;
    this.storeService.getAll().subscribe({
      next: (data) => {
        this.stores = data;
        this.applyFilters();
        this.setNextNo();
        this.loading = false;
      },
      error: () => { this.loading = false; }
    });
  }

  private setNextNo(): void {
    const max = this.stores.length > 0 ? Math.max(...this.stores.map(s => +s.StoreNo)) : 0;
    this.currentStore.StoreNo = max + 1;
  }

  applyFilters(): void {
    const term = this.filterName.toLowerCase();
    this.filteredStores = this.stores.filter(s =>
      !term ||
      s.StoreNo.toString().includes(term) ||
      s.StoreName?.toLowerCase().includes(term) ||
      s.StoreEname?.toLowerCase().includes(term)
    );
    this.page = 1;
  }

  clearFilters(): void {
    this.filterName = '';
    this.applyFilters();
  }

  onNoChange(): void {
    const no = +this.currentStore.StoreNo;
    if (!no) return;
    const existing = this.stores.find(s => +s.StoreNo === no);
    if (existing) this.currentStore = { ...existing };
  }

  onSelectRow(store: StoreDto): void {
    this.currentStore = { ...store };
    this.activeTab = 'form';   // open the selected record in the entry tab for editing
  }

  save(): void {
    if (!this.validate()) return;
    const isEdit = this.stores.some(s => +s.StoreNo === +this.currentStore.StoreNo);
    this.saving = true;
    const req = isEdit
      ? this.storeService.update(this.currentStore.StoreNo, this.currentStore)
      : this.storeService.add(this.currentStore);
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
    if (!this.currentStore.StoreNo) return;
    this.confirmModal.show();
  }

  confirmDelete(): void {
    this.storeService.delete(this.currentStore.StoreNo).subscribe({
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
    this.currentStore = this.initForm();
    this.setNextNo();
  }

  validate(): boolean {
    if (!this.currentStore.StoreNo || this.currentStore.StoreNo <= 0) {
      this.toastr.warning(this.translate.instant('Stores.StoreNoRequired'));
      return false;
    }
    if (!this.currentStore.StoreName?.trim()) {
      this.toastr.warning(this.translate.instant('Stores.ArabicNameRequired'));
      return false;
    }
    if (!this.currentStore.StoreEname?.trim()) {
      this.toastr.warning(this.translate.instant('Stores.EnglishNameRequired'));
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
      { label: t('Stores.StoreNo') },
      { label: t('Stores.ArabicName') },
      { label: t('Stores.EnglishName') },
      { label: t('Stores.AccountNo') },
    ];
    const rows = this.filteredStores.map(s =>
      `<tr><td>${s.StoreNo ?? '—'}</td><td>${s.StoreName ?? '—'}</td><td>${s.StoreEname ?? '—'}</td><td>${s.AccountNo ?? '—'}</td></tr>`
    ).join('');
    this.reportService.printReport(t('Stores.Title'), cols, rows);
  }
}
