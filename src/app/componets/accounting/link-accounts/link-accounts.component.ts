import { Component, OnInit, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { RouterModule } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { NgSelectModule } from '@ng-select/ng-select';
import { SharedModule } from '../../../shared/common/sharedmodule';
import { ComfLinkAccountsDto, ComfService } from '../../../shared/services/comf.service';
import { ChartOfAccountDto, ChartOfAccountsService } from '../../../shared/services/chart-of-accounts.service';
import { ReportService } from '../../../shared/services/report.service';
import { forkJoin } from 'rxjs';

interface AccountRow {
  key: keyof ComfLinkAccountsDto;
  labelKey: string;
  required?: boolean;
}

@Component({
  selector: 'app-link-accounts',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TranslateModule,
    RouterModule,
    SharedModule,
    NgSelectModule,
  ],
  templateUrl: './link-accounts.component.html',
  styleUrl: './link-accounts.component.scss',
  encapsulation: ViewEncapsulation.None,
})
export class LinkAccountsComponent implements OnInit {

  rows: AccountRow[] = [
    { key: 'acc_debit',      labelKey: 'LinkAccounts.Debit' },
    { key: 'acc_credit',     labelKey: 'LinkAccounts.Credit' },
    { key: 'acc_stock',      labelKey: 'LinkAccounts.Stock' },
    { key: 'acc_sales',      labelKey: 'LinkAccounts.CashSales' },
    { key: 'acc_sales_cr',   labelKey: 'LinkAccounts.CreditSales' },
    { key: 'acc_rsales',     labelKey: 'LinkAccounts.SalesReturns' },
    { key: 'acc_purchase',   labelKey: 'LinkAccounts.Purchases' },
    { key: 'acc_rpurchase',  labelKey: 'LinkAccounts.PurchaseReturns' },
    { key: 'acc_profitloss', labelKey: 'LinkAccounts.ProfitLoss', required: true },
    { key: 'acc_cash',       labelKey: 'LinkAccounts.Cash' },
    { key: 'chequesaccno',   labelKey: 'LinkAccounts.Cheques' },
    { key: 'acc_fxcomm',     labelKey: 'LinkAccounts.CurrentAssets', required: true },
    { key: 'defferdcheqacc', labelKey: 'LinkAccounts.DeferredCheques' },
    { key: 'costgoodsacc',   labelKey: 'LinkAccounts.CostOfGoods' },
  ];

  form: ComfLinkAccountsDto = {
    acc_debit:      null,
    acc_credit:     null,
    acc_stock:      null,
    acc_sales:      null,
    acc_sales_cr:   null,
    acc_rsales:     null,
    acc_purchase:   null,
    acc_rpurchase:  null,
    acc_profitloss: null,
    acc_cash:       null,
    chequesaccno:   null,
    acc_fxcomm:     null,
    defferdcheqacc: null,
    costgoodsacc:   null,
  };

  accounts: ChartOfAccountDto[] = [];
  loading = false;
  saving = false;

  constructor(
    private comfService: ComfService,
    private accountsService: ChartOfAccountsService,
    private toastr: ToastrService,
    private translate: TranslateService,
    private reportService: ReportService,
  ) {}

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.loading = true;
    forkJoin({
      accounts:     this.accountsService.getAll(),
      linkAccounts: this.comfService.getLinkAccounts(),
    }).subscribe({
      next: ({ accounts, linkAccounts }) => {
        this.accounts = accounts.filter(a => !a.branch || a.branch === 0).sort((a, b) => a.no - b.no);
        this.form = { ...this.form, ...linkAccounts };
        this.loading = false;
      },
      error: () => { this.loading = false; },
    });
  }

  getAccountName(accNo: number | null | undefined): string {
    if (!accNo) return '';
    const acc = this.accounts.find(a => a.no === accNo);
    return acc?.name ?? '';
  }

  getFormValue(key: keyof ComfLinkAccountsDto): number | null {
    return (this.form[key] as number | null) ?? null;
  }

  setFormValue(key: keyof ComfLinkAccountsDto, value: number | null): void {
    (this.form as any)[key] = value;
  }

  accountSearchFn = (term: string, item: ChartOfAccountDto): boolean => {
    const t = term.toLowerCase();
    return String(item.no).includes(t) ||
      (item.name?.toLowerCase().includes(t) ?? false) ||
      (item.Ename?.toLowerCase().includes(t) ?? false);
  };

  save(): void {
    if (!this.form.acc_profitloss) {
      this.toastr.warning(this.translate.instant('LinkAccounts.ValidationProfitLoss'));
      return;
    }
    if (!this.form.acc_fxcomm) {
      this.toastr.warning(this.translate.instant('LinkAccounts.ValidationCurrentAssets'));
      return;
    }

    this.saving = true;
    this.comfService.updateLinkAccounts(this.form).subscribe({
      next: () => {
        this.toastr.success(this.translate.instant('LinkAccounts.SaveSuccess'));
        this.saving = false;
      },
      error: (err) => {
        this.toastr.error(err?.error?.message ?? this.translate.instant('LinkAccounts.SaveError'));
        this.saving = false;
      },
    });
  }

  trackByKey(_: number, row: AccountRow): string {
    return row.key;
  }

  printTable(): void {
    const title = this.translate.instant('LinkAccounts.Title');
    const cols = [
      { label: this.translate.instant('LinkAccounts.AccountType') },
      { label: this.translate.instant('LinkAccounts.AccountNumber') },
      { label: this.translate.instant('LinkAccounts.AccountName') },
    ];
    const rows = this.rows.map(row => {
      const accNo = this.getFormValue(row.key);
      return `<tr><td>${this.translate.instant(row.labelKey)}</td><td>${accNo ?? '—'}</td><td>${accNo ? this.getAccountName(accNo) : '—'}</td></tr>`;
    }).join('');
    this.reportService.printReport(title, cols, rows);
  }
}
