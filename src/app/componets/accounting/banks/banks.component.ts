import { Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { NgSelectModule } from '@ng-select/ng-select';
import { ToastrService } from 'ngx-toastr';
import { SharedModule } from '../../../shared/common/sharedmodule';
import { BankDto, BankService } from '../../../shared/services/bank.service';
import { ChartOfAccountDto, ChartOfAccountsService } from '../../../shared/services/chart-of-accounts.service';
import { ConfirmationModalComponent } from '../../../shared/common/confirmation-modal/confirmation-modal.component';
import { HasPermissionDirective } from '../../../shared/directives/has-permission.directive';
import { ReportService } from '../../../shared/services/report.service';
import { ReportExportComponent } from '../../../shared/components/report-export/report-export.component';
import { PaginatorComponent } from '../../../shared/components/paginator/paginator.component';
import { PaginatePipe } from '../../../shared/pipes/paginate.pipe';

@Component({
  selector: 'app-banks',
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
  templateUrl: './banks.component.html',
  styleUrl: './banks.component.scss',
})
export class BanksComponent implements OnInit {
  @ViewChild('confirmModal') confirmModal!: ConfirmationModalComponent;

  banks: BankDto[] = [];
  filteredBanks: BankDto[] = [];
  accounts: ChartOfAccountDto[] = [];
  filterName = '';

  currentBank: BankDto = this.initForm();
  loading = false;
  saving = false;
  activeTab: 'form' | 'list' = 'form';
  page = 1;
  pageSize = 10;

  switchToForm(): void { this.activeTab = 'form'; }
  switchToList(): void { this.activeTab = 'list'; }

  constructor(
    private bankService: BankService,
    private accService: ChartOfAccountsService,
    private toastr: ToastrService,
    private translate: TranslateService,
    public reportService: ReportService,
  ) {}

  ngOnInit(): void {
    this.loadData();
    this.accService.getAll().subscribe(data => this.accounts = data);
  }

  private initForm(): BankDto {
    return { bank_num: 0, Bank: '', BEName: '', Accno: null, CCntrNo: null };
  }

  loadData(): void {
    this.loading = true;
    this.bankService.getAll().subscribe({
      next: (data) => {
        this.banks = data;
        this.applyFilters();
        this.setNextNo();
        this.loading = false;
      },
      error: () => { this.loading = false; }
    });
  }

  private setNextNo(): void {
    const max = this.banks.length > 0 ? Math.max(...this.banks.map(b => b.bank_num ?? 0)) : 0;
    this.currentBank.bank_num = max + 1;
  }

  applyFilters(): void {
    const term = this.filterName.toLowerCase();
    this.filteredBanks = this.banks.filter(b =>
      !term ||
      (b.bank_num ?? 0).toString().includes(term) ||
      b.Bank?.toLowerCase().includes(term) ||
      b.BEName?.toLowerCase().includes(term)
    );
    this.page = 1;
  }

  clearFilters(): void {
    this.filterName = '';
    this.applyFilters();
  }

  onNoChange(): void {
    const no = +this.currentBank.bank_num;
    if (!no) return;
    const existing = this.banks.find(b => +b.bank_num === no);
    if (existing) this.currentBank = { ...existing };
  }

  onSelectRow(bank: BankDto): void {
    this.currentBank = { ...bank };
    this.activeTab = 'form';   // open the selected record in the entry tab for editing
  }

  save(): void {
    if (!this.validate()) return;
    const isEdit = this.banks.some(b => +b.bank_num === +this.currentBank.bank_num);
    this.saving = true;
    const req = isEdit
      ? this.bankService.update(this.currentBank.bank_num, this.currentBank)
      : this.bankService.add(this.currentBank);
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
    if (!this.currentBank.bank_num) return;
    this.confirmModal.show();
  }

  confirmDelete(): void {
    this.bankService.delete(this.currentBank.bank_num).subscribe({
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
    this.currentBank = this.initForm();
    this.setNextNo();
  }

  validate(): boolean {
    if (!this.currentBank.bank_num || this.currentBank.bank_num <= 0) {
      this.toastr.warning(this.translate.instant('Banks.BankNumberRequired'));
      return false;
    }
    if (!this.currentBank.Bank?.trim()) {
      this.toastr.warning(this.translate.instant('Banks.ArabicNameRequired'));
      return false;
    }
    if (!this.currentBank.BEName?.trim()) {
      this.toastr.warning(this.translate.instant('Banks.EnglishNameRequired'));
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
      { label: t('Banks.BankNumber') },
      { label: t('Banks.ArabicName') },
      { label: t('Banks.EnglishName') },
    ];
    const rows = this.filteredBanks.map(b =>
      `<tr><td>${b.bank_num ?? '—'}</td><td>${b.Bank ?? '—'}</td><td>${b.BEName ?? '—'}</td></tr>`
    ).join('');
    this.reportService.printReport(t('Banks.Title'), cols, rows);
  }
}
