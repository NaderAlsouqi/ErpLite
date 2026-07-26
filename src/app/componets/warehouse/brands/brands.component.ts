import { Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ToastrService } from 'ngx-toastr';
import { SharedModule } from '../../../shared/common/sharedmodule';
import { BrandDto, BrandService } from '../../../shared/services/brand.service';
import { ConfirmationModalComponent } from '../../../shared/common/confirmation-modal/confirmation-modal.component';
import { HasPermissionDirective } from '../../../shared/directives/has-permission.directive';
import { ReportService } from '../../../shared/services/report.service';
import { ReportExportComponent } from '../../../shared/components/report-export/report-export.component';
import { PaginatorComponent } from '../../../shared/components/paginator/paginator.component';
import { PaginatePipe } from '../../../shared/pipes/paginate.pipe';

@Component({
  selector: 'app-brands',
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
  templateUrl: './brands.component.html',
  styleUrl: './brands.component.scss',
})
export class BrandsComponent implements OnInit {
  @ViewChild('confirmModal') confirmModal!: ConfirmationModalComponent;

  brands: BrandDto[] = [];
  filteredBrands: BrandDto[] = [];
  filterName = '';

  currentBrand: BrandDto = this.initForm();
  loading = false;
  saving = false;
  activeTab: 'form' | 'list' = 'form';
  page = 1;
  pageSize = 10;

  switchToForm(): void { this.activeTab = 'form'; }
  switchToList(): void { this.activeTab = 'list'; }

  constructor(
    private brandService: BrandService,
    private toastr: ToastrService,
    private translate: TranslateService,
    public reportService: ReportService,
  ) {}

  ngOnInit(): void {
    this.loadData();
  }

  private initForm(): BrandDto {
    return { BrandNo: 0, BrandName: '', BrandEname: '' };
  }

  loadData(): void {
    this.loading = true;
    this.brandService.getAll().subscribe({
      next: (data) => {
        this.brands = data;
        this.applyFilters();
        this.setNextNo();
        this.loading = false;
      },
      error: () => { this.loading = false; }
    });
  }

  private setNextNo(): void {
    const max = this.brands.length > 0 ? Math.max(...this.brands.map(b => +b.BrandNo)) : 0;
    this.currentBrand.BrandNo = max + 1;
  }

  applyFilters(): void {
    const term = this.filterName.toLowerCase();
    this.filteredBrands = this.brands.filter(b =>
      !term ||
      b.BrandNo.toString().includes(term) ||
      b.BrandName?.toLowerCase().includes(term) ||
      b.BrandEname?.toLowerCase().includes(term)
    );
    this.page = 1;
  }

  clearFilters(): void {
    this.filterName = '';
    this.applyFilters();
  }

  onNoChange(): void {
    const no = +this.currentBrand.BrandNo;
    if (!no) return;
    const existing = this.brands.find(b => +b.BrandNo === no);
    if (existing) this.currentBrand = { ...existing };
  }

  onSelectRow(brand: BrandDto): void {
    this.currentBrand = { ...brand };
    this.activeTab = 'form';
  }

  save(): void {
    if (!this.validate()) return;
    const isEdit = this.brands.some(b => +b.BrandNo === +this.currentBrand.BrandNo);
    this.saving = true;
    const req = isEdit
      ? this.brandService.update(this.currentBrand.BrandNo, this.currentBrand)
      : this.brandService.add(this.currentBrand);
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
    if (!this.currentBrand.BrandNo) return;
    this.confirmModal.show();
  }

  confirmDelete(): void {
    this.brandService.delete(this.currentBrand.BrandNo).subscribe({
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
    this.currentBrand = this.initForm();
    this.setNextNo();
  }

  validate(): boolean {
    if (!this.currentBrand.BrandNo || this.currentBrand.BrandNo <= 0) {
      this.toastr.warning(this.translate.instant('Brands.NoRequired'));
      return false;
    }
    if (!this.currentBrand.BrandName?.trim()) {
      this.toastr.warning(this.translate.instant('Brands.ArabicNameRequired'));
      return false;
    }
    return true;
  }

  print(): void {
    const t = (k: string) => this.translate.instant(k);
    const cols = [
      { label: t('Brands.No') },
      { label: t('Brands.ArabicName') },
      { label: t('Brands.EnglishName') },
    ];
    const rows = this.filteredBrands.map(b =>
      `<tr><td>${b.BrandNo ?? '—'}</td><td>${b.BrandName ?? '—'}</td><td>${b.BrandEname ?? '—'}</td></tr>`
    ).join('');
    this.reportService.printReport(t('Brands.Title'), cols, rows);
  }
}
