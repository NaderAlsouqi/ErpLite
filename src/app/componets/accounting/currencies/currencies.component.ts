import { Component, OnInit, TemplateRef, ViewChild, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { RouterModule } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { NgbModal, NgbModalConfig, NgbModalRef, NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatSortModule, Sort } from '@angular/material/sort';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { SharedModule } from '../../../shared/common/sharedmodule';
import { CurrencyDto, CurrencyService } from '../../../shared/services/currency.service';
import { ReportService } from '../../../shared/services/report.service';
import { ConfirmationModalComponent } from '../../../shared/common/confirmation-modal/confirmation-modal.component';

@Component({
  selector: 'app-currencies',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TranslateModule,
    RouterModule,
    SharedModule,
    NgbModule,
    MatTableModule,
    MatSortModule,
    MatPaginatorModule,
    ConfirmationModalComponent,
  ],
  providers: [NgbModalConfig, NgbModal],
  templateUrl: './currencies.component.html',
  styleUrl: './currencies.component.scss',
  encapsulation: ViewEncapsulation.None,
})
export class CurrenciesComponent implements OnInit {
  @ViewChild('currencyFormModal') currencyFormModal!: TemplateRef<any>;
  @ViewChild('confirmModal') confirmModal!: ConfirmationModalComponent;

  displayedColumns: string[] = ['cur_no', 'cur', 'ename', 'lrate', 'dec', 'Actions'];
  dataSource = new MatTableDataSource<CurrencyDto>([]);
  allData: CurrencyDto[] = [];

  pageSize = 10;
  pageSizeOptions = [5, 10, 25, 50];
  pageIndex = 0;
  totalItems = 0;

  loading = false;
  submitted = false;
  isEditMode = false;
  modalRef!: NgbModalRef;
  searchTerm = '';
  selectedId: number | null = null;

  currencyForm: CurrencyDto = this.emptyForm();

  constructor(
    private currencyService: CurrencyService,
    private toastr: ToastrService,
    private translate: TranslateService,
    private modalService: NgbModal,
    private modalConfig: NgbModalConfig,
    private reportService: ReportService
  ) {
    this.modalConfig.backdrop = 'static';
    this.modalConfig.keyboard = false;
  }

  ngOnInit(): void {
    this.loadCurrencies();
  }

  private emptyForm(): CurrencyDto {
    return {
      cur_no: 0, cur: '', ename: '', dec: null, lrate: null,
      bank_num: null, BoxOffice: null, CodeNo: null, AccountNo: null,
      SwiftCode: null, CurSmallAr: null, CurSmallEn: null,
      CurShortCutAR: null, CurShortCutEn: null,
    };
  }

  loadCurrencies(): void {
    this.loading = true;
    this.currencyService.getAll().subscribe({
      next: (data) => {
        this.allData = data;
        this.totalItems = data.length;
        this.applyFilter();
        this.loading = false;
      },
      error: () => { this.loading = false; },
    });
  }

  openAddModal(): void {
    this.isEditMode = false;
    this.submitted = false;
    const nextNo = this.allData.length > 0
      ? Math.max(...this.allData.map(c => c.cur_no)) + 1
      : 1;
    this.currencyForm = { ...this.emptyForm(), cur_no: nextNo };
    this.modalRef = this.modalService.open(this.currencyFormModal, {
      centered: true, size: 'lg', windowClass: 'form-modal-dialog animate__animated animate__fadeIn',
    });
  }

  openEditModal(currency: CurrencyDto): void {
    this.isEditMode = true;
    this.submitted = false;
    this.selectedId = currency.cur_no;
    this.currencyForm = { ...currency };
    this.modalRef = this.modalService.open(this.currencyFormModal, {
      centered: true, size: 'lg', windowClass: 'form-modal-dialog animate__animated animate__fadeIn',
    });
  }

  saveCurrency(): void {
    this.submitted = true;
    if (!this.currencyForm.cur?.trim() || !this.currencyForm.ename?.trim()) return;
    if (!this.isEditMode && (!this.currencyForm.cur_no || this.currencyForm.cur_no <= 0)) return;

    this.loading = true;

    if (this.isEditMode && this.selectedId != null) {
      this.currencyService.update(this.selectedId, this.currencyForm).subscribe({
        next: () => {
          this.toastr.success(this.translate.instant('Currencies.UpdateSuccess'));
          this.modalRef?.close();
          this.loadCurrencies();
          this.loading = false;
        },
        error: () => { this.loading = false; },
      });
    } else {
      this.currencyService.add(this.currencyForm).subscribe({
        next: () => {
          this.toastr.success(this.translate.instant('Currencies.AddSuccess'));
          this.modalRef?.close();
          this.loadCurrencies();
          this.loading = false;
        },
        error: () => { this.loading = false; },
      });
    }
  }

  confirmDelete(currency: CurrencyDto): void {
    this.selectedId = currency.cur_no;
    this.confirmModal.show();
  }

  deleteCurrency(): void {
    if (this.selectedId == null) return;
    this.loading = true;
    this.currencyService.delete(this.selectedId).subscribe({
      next: () => {
        this.toastr.success(this.translate.instant('Currencies.DeleteSuccess'));
        this.loadCurrencies();
        this.loading = false;
      },
      error: () => { this.loading = false; },
    });
  }

  onSearch(): void {
    this.pageIndex = 0;
    this.applyFilter();
  }

  private applyFilter(): void {
    const term = this.searchTerm.toLowerCase();
    const filtered = term
      ? this.allData.filter(
          (c) =>
            c.cur.toLowerCase().includes(term) ||
            c.ename.toLowerCase().includes(term) ||
            c.cur_no?.toString().includes(term)
        )
      : [...this.allData];

    this.totalItems = filtered.length;
    const start = this.pageIndex * this.pageSize;
    this.dataSource.data = filtered.slice(start, start + this.pageSize);
  }

  onSortChange(sort: Sort): void {
    if (!sort.direction) return;
    this.allData.sort((a, b) => {
      const asc = sort.direction === 'asc';
      switch (sort.active) {
        case 'cur_no': return this.compare(a.cur_no, b.cur_no, asc);
        case 'cur':    return this.compare(a.cur, b.cur, asc);
        case 'ename':  return this.compare(a.ename, b.ename, asc);
        case 'lrate':  return this.compare(a.lrate ?? 0, b.lrate ?? 0, asc);
        case 'dec':    return this.compare(a.dec ?? 0, b.dec ?? 0, asc);
        default: return 0;
      }
    });
    this.pageIndex = 0;
    this.applyFilter();
  }

  onPageChange(event: PageEvent): void {
    this.pageIndex = event.pageIndex;
    this.pageSize = event.pageSize;
    this.applyFilter();
  }

  private compare(a: any, b: any, asc: boolean): number {
    return (a < b ? -1 : 1) * (asc ? 1 : -1);
  }

  printTable(): void {
    const title = this.translate.instant('Currencies.Title');
    const cols = [
      { label: this.translate.instant('Currencies.CurrencyNumber'), key: 'cur_no' },
      { label: this.translate.instant('Currencies.ArabicName'),     key: 'cur' },
      { label: this.translate.instant('Currencies.EnglishName'),    key: 'ename' },
      { label: this.translate.instant('Currencies.ExchangeRate'),   key: 'lrate' },
      { label: this.translate.instant('Currencies.DecimalPlaces'),  key: 'dec' },
    ];
    const rows = this.allData.map(r =>
      cols.map(c => (r as any)[c.key] ?? '—').join('</td><td>')
    ).map(r => `<tr><td>${r}</td></tr>`).join('');
    
    this.reportService.printReport(title, cols, rows);
  }
}
