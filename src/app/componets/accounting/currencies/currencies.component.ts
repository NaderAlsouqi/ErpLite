import { Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ToastrService } from 'ngx-toastr';
import { SharedModule } from '../../../shared/common/sharedmodule';
import { CurrencyDto, CurrencyService } from '../../../shared/services/currency.service';
import { ConfirmationModalComponent } from '../../../shared/common/confirmation-modal/confirmation-modal.component';
import { HasPermissionDirective } from '../../../shared/directives/has-permission.directive';
import { ReportService } from '../../../shared/services/report.service';

@Component({
  selector: 'app-currencies',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TranslateModule,
    SharedModule,
    ConfirmationModalComponent,
    HasPermissionDirective,
  ],
  templateUrl: './currencies.component.html',
  styleUrl: './currencies.component.scss',
})
export class CurrenciesComponent implements OnInit {
  @ViewChild('confirmModal') confirmModal!: ConfirmationModalComponent;

  currencies: CurrencyDto[] = [];
  filteredCurrencies: CurrencyDto[] = [];
  filterName = '';

  currentCurrency: CurrencyDto = this.initForm();
  loading = false;
  saving = false;
  activeTab: 'form' | 'list' = 'form';

  switchToForm(): void { this.activeTab = 'form'; }
  switchToList(): void { this.activeTab = 'list'; }

  constructor(
    private currencyService: CurrencyService,
    private toastr: ToastrService,
    private translate: TranslateService,
    private reportService: ReportService,
  ) {}

  ngOnInit(): void {
    this.loadData();
  }

  private initForm(): CurrencyDto {
    return {
      cur_no: 0, cur: '', ename: '', dec: null, lrate: null,
      bank_num: null, BoxOffice: null, CodeNo: null, AccountNo: null,
      SwiftCode: null, CurSmallAr: null, CurSmallEn: null,
      CurShortCutAR: null, CurShortCutEn: null,
    };
  }

  loadData(): void {
    this.loading = true;
    this.currencyService.getAll().subscribe({
      next: (data) => {
        this.currencies = data;
        this.applyFilters();
        this.setNextNo();
        this.loading = false;
      },
      error: () => { this.loading = false; }
    });
  }

  private setNextNo(): void {
    const max = this.currencies.length > 0 ? Math.max(...this.currencies.map(c => c.cur_no)) : 0;
    this.currentCurrency.cur_no = max + 1;
  }

  applyFilters(): void {
    const term = this.filterName.toLowerCase();
    this.filteredCurrencies = this.currencies.filter(c =>
      !term ||
      c.cur_no.toString().includes(term) ||
      c.cur?.toLowerCase().includes(term) ||
      c.ename?.toLowerCase().includes(term)
    );
  }

  clearFilters(): void {
    this.filterName = '';
    this.applyFilters();
  }

  onNoChange(): void {
    const no = +this.currentCurrency.cur_no;
    if (!no) return;
    const existing = this.currencies.find(c => +c.cur_no === no);
    if (existing) this.currentCurrency = { ...existing };
  }

  onSelectRow(currency: CurrencyDto): void {
    this.currentCurrency = { ...currency };
    this.activeTab = 'form';   // open the selected record in the entry tab for editing
  }

  save(): void {
    if (!this.validate()) return;
    const isEdit = this.currencies.some(c => +c.cur_no === +this.currentCurrency.cur_no);
    this.saving = true;
    const req = isEdit
      ? this.currencyService.update(this.currentCurrency.cur_no, this.currentCurrency)
      : this.currencyService.add(this.currentCurrency);
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
    if (!this.currentCurrency.cur_no) return;
    this.confirmModal.show();
  }

  confirmDelete(): void {
    this.currencyService.delete(this.currentCurrency.cur_no).subscribe({
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
    this.currentCurrency = this.initForm();
    this.setNextNo();
  }

  validate(): boolean {
    if (!this.currentCurrency.cur_no || this.currentCurrency.cur_no <= 0) {
      this.toastr.warning(this.translate.instant('Currencies.CurrencyNumberRequired'));
      return false;
    }
    if (!this.currentCurrency.cur?.trim()) {
      this.toastr.warning(this.translate.instant('Currencies.ArabicNameRequired'));
      return false;
    }
    if (!this.currentCurrency.ename?.trim()) {
      this.toastr.warning(this.translate.instant('Currencies.EnglishNameRequired'));
      return false;
    }
    return true;
  }

  print(): void {
    const t = (k: string) => this.translate.instant(k);
    const cols = [
      { label: t('Currencies.CurrencyNo') },
      { label: t('Currencies.ArabicName') },
      { label: t('Currencies.EnglishName') },
      { label: t('Currencies.ExchangeRate') },
      { label: t('Currencies.Decimals') },
    ];
    const rows = this.filteredCurrencies.map(c =>
      `<tr><td>${c.cur_no ?? '—'}</td><td>${c.cur ?? '—'}</td><td>${c.ename ?? '—'}</td><td>${c.lrate ?? '—'}</td><td>${c.dec ?? '—'}</td></tr>`
    ).join('');
    this.reportService.printReport(t('Currencies.Title'), cols, rows);
  }
}
