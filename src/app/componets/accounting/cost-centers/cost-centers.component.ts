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
import { CostCenterDto, CostCenterService } from '../../../shared/services/cost-center.service';
import { ReportService } from '../../../shared/services/report.service';
import { ConfirmationModalComponent } from '../../../shared/common/confirmation-modal/confirmation-modal.component';

@Component({
  selector: 'app-cost-centers',
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
  templateUrl: './cost-centers.component.html',
  styleUrl: './cost-centers.component.scss',
  encapsulation: ViewEncapsulation.None,
})
export class CostCentersComponent implements OnInit {
  @ViewChild('costCenterFormModal') costCenterFormModal!: TemplateRef<any>;
  @ViewChild('confirmModal') confirmModal!: ConfirmationModalComponent;

  displayedColumns: string[] = ['CcntrNo', 'CcAname', 'Ccename', 'level', 'belong', 'Actions'];
  dataSource = new MatTableDataSource<CostCenterDto>([]);
  allData: CostCenterDto[] = [];

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

  costCenterForm: CostCenterDto = this.emptyForm();

  constructor(
    private costCenterService: CostCenterService,
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
    this.loadData();
  }

  private emptyForm(): CostCenterDto {
    return {
      CcntrNo: 0, CcAname: '', Ccename: '',
      belong: 0, branch: 0, bb: 0, level: 1,
      balance1: null, accorder: null, fatherorder: '',
      CurNo: 1, LRate: 1, budgetF: null, ProfL: null, total: null
    };
  }

  private getNextCcntrNo(): number {
    return this.allData.reduce((m, cc) => Math.max(m, cc.CcntrNo ?? 0), 0) + 1;
  }

  private getNextAccOrder(): string {
    const orders = this.allData
      .map(cc => cc.accorder?.trim().toUpperCase())
      .filter((o): o is string => !!o && /^[A-Z]{2}$/.test(o));
    if (orders.length === 0) return 'AA';
    orders.sort();
    const last = orders[orders.length - 1];
    const c1 = last.charCodeAt(0), c2 = last.charCodeAt(1);
    if (c2 < 90) return String.fromCharCode(c1) + String.fromCharCode(c2 + 1);
    if (c1 < 90) return String.fromCharCode(c1 + 1) + 'A';
    return 'AA';
  }

  loadData(): void {
    this.loading = true;
    this.costCenterService.getAll().subscribe({
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
    this.costCenterForm = this.emptyForm();
    this.costCenterForm.CcntrNo  = this.getNextCcntrNo();
    this.costCenterForm.accorder = this.getNextAccOrder();
    this.modalRef = this.modalService.open(this.costCenterFormModal, {
      centered: true, size: 'lg', windowClass: 'form-modal-dialog animate__animated animate__fadeIn',
    });
  }

  openEditModal(row: CostCenterDto): void {
    this.isEditMode = true;
    this.submitted = false;
    this.selectedId = row.CcntrNo;
    this.costCenterForm = { ...row };
    this.modalRef = this.modalService.open(this.costCenterFormModal, {
      centered: true, size: 'lg', windowClass: 'form-modal-dialog animate__animated animate__fadeIn',
    });
  }

  saveCostCenter(): void {
    this.submitted = true;
    if (!this.costCenterForm.CcAname?.trim() || !this.costCenterForm.Ccename?.trim()) return;

    this.loading = true;

    if (this.isEditMode && this.selectedId != null) {
      this.costCenterService.update(this.selectedId, this.costCenterForm).subscribe({
        next: () => {
          this.toastr.success(this.translate.instant('CostCenters.UpdateSuccess'));
          this.modalRef?.close();
          this.loadData();
          this.loading = false;
        },
        error: () => { this.loading = false; },
      });
    } else {
      this.costCenterService.add(this.costCenterForm).subscribe({
        next: () => {
          this.toastr.success(this.translate.instant('CostCenters.AddSuccess'));
          this.modalRef?.close();
          this.loadData();
          this.loading = false;
        },
        error: () => { this.loading = false; },
      });
    }
  }

  confirmDelete(row: CostCenterDto): void {
    this.selectedId = row.CcntrNo;
    this.confirmModal.show();
  }

  deleteCostCenter(): void {
    if (this.selectedId == null) return;
    this.loading = true;
    this.costCenterService.delete(this.selectedId).subscribe({
      next: () => {
        this.toastr.success(this.translate.instant('CostCenters.DeleteSuccess'));
        this.confirmModal.hide();
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
          (c) =>
            c.CcAname?.toLowerCase().includes(term) ||
            c.Ccename?.toLowerCase().includes(term) ||
            c.CcntrNo?.toString().includes(term)
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
        case 'CcntrNo':  return this.compare(a.CcntrNo, b.CcntrNo, asc);
        case 'CcAname':  return this.compare(a.CcAname, b.CcAname, asc);
        case 'Ccename':  return this.compare(a.Ccename, b.Ccename, asc);
        case 'level':    return this.compare(a.level, b.level, asc);
        case 'belong':   return this.compare(a.belong, b.belong, asc);
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
    const title = this.translate.instant('CostCenters.Title');
    const cols = [
      { label: this.translate.instant('CostCenters.CcntrNo'),     key: 'CcntrNo' },
      { label: this.translate.instant('CostCenters.ArabicName'),  key: 'CcAname' },
      { label: this.translate.instant('CostCenters.EnglishName'), key: 'Ccename' },
      { label: this.translate.instant('CostCenters.Level'),       key: 'level' },
      { label: this.translate.instant('CostCenters.Belong'),      key: 'belong' },
    ];
    const rows = this.allData.map(r =>
      cols.map(c => (r as any)[c.key] ?? '—').join('</td><td>')
    ).map(r => `<tr><td>${r}</td></tr>`).join('');
    
    this.reportService.printReport(title, cols, rows);
  }
}
