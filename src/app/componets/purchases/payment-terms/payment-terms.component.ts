import { Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ToastrService } from 'ngx-toastr';
import { SharedModule } from '../../../shared/common/sharedmodule';
import { PaymentTermDto, PaymentTermService } from '../../../shared/services/payment-term.service';
import { ConfirmationModalComponent } from '../../../shared/common/confirmation-modal/confirmation-modal.component';
import { HasPermissionDirective } from '../../../shared/directives/has-permission.directive';
import { ReportService } from '../../../shared/services/report.service';
import { ReportExportComponent } from '../../../shared/components/report-export/report-export.component';
import { PaginatorComponent } from '../../../shared/components/paginator/paginator.component';
import { PaginatePipe } from '../../../shared/pipes/paginate.pipe';

@Component({
  selector: 'app-payment-terms',
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
  templateUrl: './payment-terms.component.html',
  styleUrl: './payment-terms.component.scss',
})
export class PaymentTermsComponent implements OnInit {
  @ViewChild('confirmModal') confirmModal!: ConfirmationModalComponent;

  terms: PaymentTermDto[] = [];
  filteredTerms: PaymentTermDto[] = [];
  filterName = '';

  current: PaymentTermDto = this.initForm();
  loading = false;
  saving = false;
  activeTab: 'form' | 'list' = 'form';
  page = 1;
  pageSize = 10;

  switchToForm(): void { this.activeTab = 'form'; }
  switchToList(): void { this.activeTab = 'list'; }

  constructor(
    private termService: PaymentTermService,
    private toastr: ToastrService,
    private translate: TranslateService,
    public reportService: ReportService,
  ) {}

  ngOnInit(): void {
    this.loadData();
  }

  private initForm(): PaymentTermDto {
    return { TermNo: 0, TermName: '', TermEname: '' };
  }

  loadData(): void {
    this.loading = true;
    this.termService.getAll().subscribe({
      next: (data) => {
        this.terms = data;
        this.applyFilters();
        this.setNextNo();
        this.loading = false;
      },
      error: () => { this.loading = false; }
    });
  }

  private setNextNo(): void {
    const max = this.terms.length > 0 ? Math.max(...this.terms.map(t => +t.TermNo)) : 0;
    this.current.TermNo = max + 1;
  }

  applyFilters(): void {
    const term = this.filterName.toLowerCase();
    this.filteredTerms = this.terms.filter(t =>
      !term ||
      t.TermNo.toString().includes(term) ||
      t.TermName?.toLowerCase().includes(term) ||
      t.TermEname?.toLowerCase().includes(term)
    );
    this.page = 1;
  }

  clearFilters(): void {
    this.filterName = '';
    this.applyFilters();
  }

  onNoChange(): void {
    const no = +this.current.TermNo;
    if (!no) return;
    const existing = this.terms.find(t => +t.TermNo === no);
    if (existing) this.current = { ...existing };
  }

  onSelectRow(term: PaymentTermDto): void {
    this.current = { ...term };
    this.activeTab = 'form';
  }

  save(): void {
    if (!this.validate()) return;
    const isEdit = this.terms.some(t => +t.TermNo === +this.current.TermNo);
    this.saving = true;
    const req = isEdit
      ? this.termService.update(this.current.TermNo, this.current)
      : this.termService.add(this.current);
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
    if (!this.current.TermNo) return;
    this.confirmModal.show();
  }

  confirmDelete(): void {
    this.termService.delete(this.current.TermNo).subscribe({
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
    if (!this.current.TermNo || this.current.TermNo <= 0) {
      this.toastr.warning(this.translate.instant('PaymentTerms.NoRequired'));
      return false;
    }
    if (!this.current.TermName?.trim()) {
      this.toastr.warning(this.translate.instant('PaymentTerms.ArabicNameRequired'));
      return false;
    }
    return true;
  }

  print(): void {
    const t = (k: string) => this.translate.instant(k);
    const cols = [
      { label: t('PaymentTerms.No') },
      { label: t('PaymentTerms.ArabicName') },
      { label: t('PaymentTerms.EnglishName') },
    ];
    const rows = this.filteredTerms.map(x =>
      `<tr><td>${x.TermNo ?? '—'}</td><td>${x.TermName ?? '—'}</td><td>${x.TermEname ?? '—'}</td></tr>`
    ).join('');
    this.reportService.printReport(t('PaymentTerms.Title'), cols, rows);
  }
}
