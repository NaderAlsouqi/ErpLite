import { Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ToastrService } from 'ngx-toastr';
import { SharedModule } from '../../../shared/common/sharedmodule';
import { PurchaseExpenseDto, PurchaseExpenseService } from '../../../shared/services/purchase-expense.service';
import { ConfirmationModalComponent } from '../../../shared/common/confirmation-modal/confirmation-modal.component';
import { HasPermissionDirective } from '../../../shared/directives/has-permission.directive';
import { ReportService } from '../../../shared/services/report.service';
import { ReportExportComponent } from '../../../shared/components/report-export/report-export.component';
import { PaginatorComponent } from '../../../shared/components/paginator/paginator.component';
import { PaginatePipe } from '../../../shared/pipes/paginate.pipe';

@Component({
  selector: 'app-purchase-expenses',
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
  templateUrl: './purchase-expenses.component.html',
  styleUrl: './purchase-expenses.component.scss',
})
export class PurchaseExpensesComponent implements OnInit {
  @ViewChild('confirmModal') confirmModal!: ConfirmationModalComponent;

  expenses: PurchaseExpenseDto[] = [];
  filteredExpenses: PurchaseExpenseDto[] = [];
  filterName = '';

  current: PurchaseExpenseDto = this.initForm();
  loading = false;
  saving = false;
  activeTab: 'form' | 'list' = 'form';
  page = 1;
  pageSize = 10;

  switchToForm(): void { this.activeTab = 'form'; }
  switchToList(): void { this.activeTab = 'list'; }

  constructor(
    private expenseService: PurchaseExpenseService,
    private toastr: ToastrService,
    private translate: TranslateService,
    public reportService: ReportService,
  ) {}

  ngOnInit(): void {
    this.loadData();
  }

  private initForm(): PurchaseExpenseDto {
    return { ExpNo: 0, ExpName: '', ExpEname: '' };
  }

  loadData(): void {
    this.loading = true;
    this.expenseService.getAll().subscribe({
      next: (data) => {
        this.expenses = data;
        this.applyFilters();
        this.setNextNo();
        this.loading = false;
      },
      error: () => { this.loading = false; }
    });
  }

  private setNextNo(): void {
    const max = this.expenses.length > 0 ? Math.max(...this.expenses.map(e => +e.ExpNo)) : 0;
    this.current.ExpNo = max + 1;
  }

  applyFilters(): void {
    const term = this.filterName.toLowerCase();
    this.filteredExpenses = this.expenses.filter(e =>
      !term ||
      e.ExpNo.toString().includes(term) ||
      e.ExpName?.toLowerCase().includes(term) ||
      e.ExpEname?.toLowerCase().includes(term)
    );
    this.page = 1;
  }

  clearFilters(): void {
    this.filterName = '';
    this.applyFilters();
  }

  onNoChange(): void {
    const no = +this.current.ExpNo;
    if (!no) return;
    const existing = this.expenses.find(e => +e.ExpNo === no);
    if (existing) this.current = { ...existing };
  }

  onSelectRow(exp: PurchaseExpenseDto): void {
    this.current = { ...exp };
    this.activeTab = 'form';
  }

  save(): void {
    if (!this.validate()) return;
    const isEdit = this.expenses.some(e => +e.ExpNo === +this.current.ExpNo);
    this.saving = true;
    const req = isEdit
      ? this.expenseService.update(this.current.ExpNo, this.current)
      : this.expenseService.add(this.current);
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
    if (!this.current.ExpNo) return;
    this.confirmModal.show();
  }

  confirmDelete(): void {
    this.expenseService.delete(this.current.ExpNo).subscribe({
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
    if (!this.current.ExpNo || this.current.ExpNo <= 0) {
      this.toastr.warning(this.translate.instant('PurchaseExpenses.NoRequired'));
      return false;
    }
    if (!this.current.ExpName?.trim()) {
      this.toastr.warning(this.translate.instant('PurchaseExpenses.ArabicNameRequired'));
      return false;
    }
    return true;
  }

  print(): void {
    const t = (k: string) => this.translate.instant(k);
    const cols = [
      { label: t('PurchaseExpenses.No') },
      { label: t('PurchaseExpenses.ArabicName') },
      { label: t('PurchaseExpenses.EnglishName') },
    ];
    const rows = this.filteredExpenses.map(x =>
      `<tr><td>${x.ExpNo ?? '—'}</td><td>${x.ExpName ?? '—'}</td><td>${x.ExpEname ?? '—'}</td></tr>`
    ).join('');
    this.reportService.printReport(t('PurchaseExpenses.Title'), cols, rows);
  }
}
