import { Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ToastrService } from 'ngx-toastr';
import { SharedModule } from '../../../shared/common/sharedmodule';
import { PriceCategoryDto, PriceCategoryService } from '../../../shared/services/price-category.service';
import { ConfirmationModalComponent } from '../../../shared/common/confirmation-modal/confirmation-modal.component';
import { HasPermissionDirective } from '../../../shared/directives/has-permission.directive';
import { ReportService } from '../../../shared/services/report.service';
import { ReportExportComponent } from '../../../shared/components/report-export/report-export.component';
import { PaginatorComponent } from '../../../shared/components/paginator/paginator.component';
import { PaginatePipe } from '../../../shared/pipes/paginate.pipe';

@Component({
  selector: 'app-price-categories',
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
  templateUrl: './price-categories.component.html',
  styleUrl: './price-categories.component.scss',
})
export class PriceCategoriesComponent implements OnInit {
  @ViewChild('confirmModal') confirmModal!: ConfirmationModalComponent;

  categories: PriceCategoryDto[] = [];
  filteredCategories: PriceCategoryDto[] = [];
  filterName = '';
  page = 1;
  pageSize = 10;

  currentCategory: PriceCategoryDto = this.initForm();
  loading = false;
  saving = false;
  activeTab: 'form' | 'list' = 'form';

  switchToForm(): void { this.activeTab = 'form'; }
  switchToList(): void { this.activeTab = 'list'; }

  constructor(
    private categoryService: PriceCategoryService,
    private toastr: ToastrService,
    private translate: TranslateService,
    public reportService: ReportService,
  ) {}

  ngOnInit(): void {
    this.loadData();
  }

  private initForm(): PriceCategoryDto {
    return { CatNo: 0, CatName: '', CatEname: '' };
  }

  loadData(): void {
    this.loading = true;
    this.categoryService.getAll().subscribe({
      next: (data) => {
        this.categories = data;
        this.applyFilters();
        this.setNextNo();
        this.loading = false;
      },
      error: () => { this.loading = false; }
    });
  }

  private setNextNo(): void {
    const max = this.categories.length > 0 ? Math.max(...this.categories.map(c => +c.CatNo)) : 0;
    this.currentCategory.CatNo = max + 1;
  }

  applyFilters(): void {
    const term = this.filterName.toLowerCase();
    this.filteredCategories = this.categories.filter(c =>
      !term ||
      c.CatNo.toString().includes(term) ||
      c.CatName?.toLowerCase().includes(term) ||
      c.CatEname?.toLowerCase().includes(term)
    );
    this.page = 1;
  }

  clearFilters(): void {
    this.filterName = '';
    this.applyFilters();
  }

  onNoChange(): void {
    const no = +this.currentCategory.CatNo;
    if (!no) return;
    const existing = this.categories.find(c => +c.CatNo === no);
    if (existing) this.currentCategory = { ...existing };
  }

  onSelectRow(category: PriceCategoryDto): void {
    this.currentCategory = { ...category };
    this.activeTab = 'form';   // open the selected record in the entry tab for editing
  }

  save(): void {
    if (!this.validate()) return;
    const isEdit = this.categories.some(c => +c.CatNo === +this.currentCategory.CatNo);
    this.saving = true;
    const req = isEdit
      ? this.categoryService.update(this.currentCategory.CatNo, this.currentCategory)
      : this.categoryService.add(this.currentCategory);
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
    if (!this.currentCategory.CatNo) return;
    this.confirmModal.show();
  }

  confirmDelete(): void {
    this.categoryService.delete(this.currentCategory.CatNo).subscribe({
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
    this.currentCategory = this.initForm();
    this.setNextNo();
  }

  validate(): boolean {
    if (!this.currentCategory.CatNo || this.currentCategory.CatNo <= 0) {
      this.toastr.warning(this.translate.instant('PriceCategory.CatNoRequired'));
      return false;
    }
    if (!this.currentCategory.CatName?.trim()) {
      this.toastr.warning(this.translate.instant('PriceCategory.ArabicNameRequired'));
      return false;
    }
    if (!this.currentCategory.CatEname?.trim()) {
      this.toastr.warning(this.translate.instant('PriceCategory.EnglishNameRequired'));
      return false;
    }
    return true;
  }

  print(): void {
    const t = (k: string) => this.translate.instant(k);
    const cols = [
      { label: t('PriceCategory.CatNo') },
      { label: t('PriceCategory.ArabicName') },
      { label: t('PriceCategory.EnglishName') },
    ];
    const rows = this.filteredCategories.map(c =>
      `<tr><td>${c.CatNo ?? '—'}</td><td>${c.CatName ?? '—'}</td><td>${c.CatEname ?? '—'}</td></tr>`
    ).join('');
    this.reportService.printReport(t('PriceCategory.Title'), cols, rows);
  }
}
