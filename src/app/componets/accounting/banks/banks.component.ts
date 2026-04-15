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
import { BankDto, BankService } from '../../../shared/services/bank.service';
import { ReportService } from '../../../shared/services/report.service';
import { ChartOfAccountDto, ChartOfAccountsService } from '../../../shared/services/chart-of-accounts.service';
import { ConfirmationModalComponent } from '../../../shared/common/confirmation-modal/confirmation-modal.component';

@Component({
  selector: 'app-banks',
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
  templateUrl: './banks.component.html',
  styleUrl: './banks.component.scss',
  encapsulation: ViewEncapsulation.None,
})
export class BanksComponent implements OnInit {
  @ViewChild('bankFormModal') bankFormModal!: TemplateRef<any>;
  @ViewChild('confirmModal') confirmModal!: ConfirmationModalComponent;

  displayedColumns: string[] = ['bank_num', 'Bank', 'BEName', 'Accno', 'Actions'];
  dataSource = new MatTableDataSource<BankDto>([]);
  allData: BankDto[] = [];

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

  bankForm: BankDto = { bank_num: 0, Bank: '', BEName: '', Accno: null, CCntrNo: null };
  accounts: ChartOfAccountDto[] = [];

  constructor(
    private bankService: BankService,
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
    this.loadBanks();
    this.chartOfAccountsService.getAll().subscribe({
      next: (data) => { this.accounts = data; },
      error: () => {},
    });
  }

  loadBanks(): void {
    this.loading = true;
    this.bankService.getAll().subscribe({
      next: (data) => {
        this.allData = data;
        this.totalItems = data.length;
        this.applyFilter();
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      },
    });
  }

  openAddModal(): void {
    this.isEditMode = false;
    this.submitted = false;
    const nextNo = this.allData.length > 0
      ? Math.max(...this.allData.map(b => b.bank_num ?? 0)) + 1
      : 1;
    this.bankForm = { bank_num: nextNo, Bank: '', BEName: '', Accno: null, CCntrNo: null };
    this.modalRef = this.modalService.open(this.bankFormModal, {
      centered: true,
      size: 'md',
      windowClass: 'form-modal-dialog animate__animated animate__fadeIn',
    });
  }

  openEditModal(bank: BankDto): void {
    this.isEditMode = true;
    this.submitted = false;
    this.selectedId = bank.bank_num;
    this.bankForm = { bank_num: bank.bank_num, Bank: bank.Bank, BEName: bank.BEName, Accno: bank.Accno ?? null, CCntrNo: bank.CCntrNo ?? null };
    this.modalRef = this.modalService.open(this.bankFormModal, {
      centered: true,
      size: 'md',
      windowClass: 'form-modal-dialog animate__animated animate__fadeIn',
    });
  }

  saveBank(): void {
    this.submitted = true;
    if (!this.bankForm.Bank?.trim() || !this.bankForm.BEName?.trim()) {
      return;
    }
    if (!this.isEditMode && (!this.bankForm.bank_num || this.bankForm.bank_num <= 0)) {
      return;
    }

    this.loading = true;

    if (this.isEditMode && this.selectedId != null) {
      this.bankService.update(this.selectedId, this.bankForm).subscribe({
        next: () => {
          this.toastr.success(this.translate.instant('Banks.UpdateSuccess'));
          this.modalRef?.close();
          this.loadBanks();
          this.loading = false;
        },
        error: () => {
          this.loading = false;
        },
      });
    } else {
      this.bankService.add(this.bankForm).subscribe({
        next: () => {
          this.toastr.success(this.translate.instant('Banks.AddSuccess'));
          this.modalRef?.close();
          this.loadBanks();
          this.loading = false;
        },
        error: () => {
          this.loading = false;
        },
      });
    }
  }

  confirmDelete(bank: BankDto): void {
    this.selectedId = bank.bank_num!;
    this.confirmModal.show();
  }

  deleteBank(): void {
    if (this.selectedId == null) return;
    this.loading = true;
    this.bankService.delete(this.selectedId).subscribe({
      next: () => {
        this.toastr.success(this.translate.instant('Banks.DeleteSuccess'));
        this.loadBanks();
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      },
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
          (b) =>
            b.Bank.toLowerCase().includes(term) ||
            b.BEName.toLowerCase().includes(term) ||
            b.bank_num?.toString().includes(term) ||
            b.Accno?.toString().includes(term)
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
        case 'bank_num':
          return this.compare(a.bank_num ?? 0, b.bank_num ?? 0, asc);
        case 'Bank':
          return this.compare(a.Bank, b.Bank, asc);
        case 'BEName':
          return this.compare(a.BEName, b.BEName, asc);
        case 'Accno':
          return this.compare(a.Accno ?? 0, b.Accno ?? 0, asc);
        default:
          return 0;
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
    const title = this.translate.instant('Banks.Title');
    const cols = [
      { label: this.translate.instant('Banks.BankNumber'),   key: 'bank_num' },
      { label: this.translate.instant('Banks.ArabicName'),   key: 'Bank' },
      { label: this.translate.instant('Banks.EnglishName'),  key: 'BEName' },
      { label: this.translate.instant('Banks.AccountNumber'),key: 'Accno' },
    ];
    const rows = this.allData.map(r =>
      cols.map(c => (r as any)[c.key] ?? '—').join('</td><td>')
    ).map(r => `<tr><td>${r}</td></tr>`).join('');

    this.reportService.printReport(title, cols, rows);
  }
}
