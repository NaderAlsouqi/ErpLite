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
import { TaxDto, TaxService } from '../../../shared/services/tax.service';
import { ReportService } from '../../../shared/services/report.service';
import { ChartOfAccountDto, ChartOfAccountsService } from '../../../shared/services/chart-of-accounts.service';
import { ConfirmationModalComponent } from '../../../shared/common/confirmation-modal/confirmation-modal.component';

@Component({
  selector: 'app-taxes',
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
  templateUrl: './taxes.component.html',
  styleUrl: './taxes.component.scss',
  encapsulation: ViewEncapsulation.None,
})
export class TaxesComponent implements OnInit {
  @ViewChild('taxFormModal') taxFormModal!: TemplateRef<any>;
  @ViewChild('confirmModal') confirmModal!: ConfirmationModalComponent;

  displayedColumns: string[] = ['TaxNo', 'TaxNameA', 'TaxNameE', 'TaxPerc', 'Actions'];
  accounts: ChartOfAccountDto[] = [];
  dataSource = new MatTableDataSource<TaxDto>([]);
  allData: TaxDto[] = [];

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

  taxForm: TaxDto = this.emptyForm();

  constructor(
    private taxService: TaxService,
    private toastr: ToastrService,
    private translate: TranslateService,
    private modalService: NgbModal,
    private modalConfig: NgbModalConfig,
    private reportService: ReportService,
    private chartOfAccountsService: ChartOfAccountsService
  ) {
    this.modalConfig.backdrop = 'static';
    this.modalConfig.keyboard = false;
  }

  ngOnInit(): void {
    this.loadData();
    this.loadAccounts();
  }

  private emptyForm(): TaxDto {
    return { TaxNo: 0, TaxNameA: '', TaxNameE: '', TaxPerc: null, Branched: 0, Belong: null, TaxAcc: null };
  }

  private loadAccounts(): void {
    this.chartOfAccountsService.getAll().subscribe({
      next: (data) => { this.accounts = data; },
      error: () => {},
    });
  }

  loadData(): void {
    this.loading = true;
    this.taxService.getAll().subscribe({
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
      ? Math.max(...this.allData.map(t => t.TaxNo)) + 1
      : 1;
    this.taxForm = { ...this.emptyForm(), TaxNo: nextNo };
    this.modalRef = this.modalService.open(this.taxFormModal, {
      centered: true, size: 'md', windowClass: 'form-modal-dialog animate__animated animate__fadeIn',
    });
  }

  openEditModal(row: TaxDto): void {
    this.isEditMode = true;
    this.submitted = false;
    this.selectedId = row.TaxNo;
    this.taxForm = { ...row };
    this.modalRef = this.modalService.open(this.taxFormModal, {
      centered: true, size: 'md', windowClass: 'form-modal-dialog animate__animated animate__fadeIn',
    });
  }

  saveTax(): void {
    this.submitted = true;
    if (!this.taxForm.TaxNameA?.trim() || !this.taxForm.TaxNameE?.trim()) return;
    if (!this.isEditMode && (!this.taxForm.TaxNo || this.taxForm.TaxNo <= 0)) return;

    this.loading = true;

    if (this.isEditMode && this.selectedId != null) {
      this.taxService.update(this.selectedId, this.taxForm).subscribe({
        next: () => {
          this.toastr.success(this.translate.instant('Taxes.UpdateSuccess'));
          this.modalRef?.close();
          this.loadData();
          this.loading = false;
        },
        error: () => { this.loading = false; },
      });
    } else {
      this.taxService.add(this.taxForm).subscribe({
        next: () => {
          this.toastr.success(this.translate.instant('Taxes.AddSuccess'));
          this.modalRef?.close();
          this.loadData();
          this.loading = false;
        },
        error: () => { this.loading = false; },
      });
    }
  }

  confirmDelete(row: TaxDto): void {
    this.selectedId = row.TaxNo;
    this.confirmModal.show();
  }

  deleteTax(): void {
    if (this.selectedId == null) return;
    this.loading = true;
    this.taxService.delete(this.selectedId).subscribe({
      next: () => {
        this.toastr.success(this.translate.instant('Taxes.DeleteSuccess'));
        this.loadData();
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
          (t) =>
            t.TaxNameA?.toLowerCase().includes(term) ||
            t.TaxNameE?.toLowerCase().includes(term) ||
            t.TaxNo?.toString().includes(term)
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
        case 'TaxNo':      return this.compare(a.TaxNo, b.TaxNo, asc);
        case 'TaxNameA':   return this.compare(a.TaxNameA, b.TaxNameA, asc);
        case 'TaxNameE':   return this.compare(a.TaxNameE, b.TaxNameE, asc);
        case 'TaxPerc':    return this.compare(a.TaxPerc, b.TaxPerc, asc);
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
    const title = this.translate.instant('Taxes.Title');
    const cols = [
      { label: this.translate.instant('Taxes.TaxNo'),       key: 'TaxNo' },
      { label: this.translate.instant('Taxes.ArabicName'),  key: 'TaxNameA' },
      { label: this.translate.instant('Taxes.EnglishName'), key: 'TaxNameE' },
      { label: this.translate.instant('Taxes.TaxPerc'),     key: 'TaxPerc' },
    ];
    const rows = this.allData.map(r =>
      cols.map(c => (r as any)[c.key] ?? '—').join('</td><td>')
    ).map(r => `<tr><td>${r}</td></tr>`).join('');
    
    this.reportService.printReport(title, cols, rows);
  }
}
