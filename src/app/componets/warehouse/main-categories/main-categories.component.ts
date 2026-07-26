import { Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ToastrService } from 'ngx-toastr';
import { SharedModule } from '../../../shared/common/sharedmodule';
import { MainCategoryDto, MainCategoryService } from '../../../shared/services/main-category.service';
import { ConfirmationModalComponent } from '../../../shared/common/confirmation-modal/confirmation-modal.component';
import { HasPermissionDirective } from '../../../shared/directives/has-permission.directive';
import { ReportService } from '../../../shared/services/report.service';
import { ReportExportComponent } from '../../../shared/components/report-export/report-export.component';
import { PaginatorComponent } from '../../../shared/components/paginator/paginator.component';
import { PaginatePipe } from '../../../shared/pipes/paginate.pipe';

@Component({
  selector: 'app-main-categories',
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
  templateUrl: './main-categories.component.html',
  styleUrl: './main-categories.component.scss',
})
export class MainCategoriesComponent implements OnInit {
  @ViewChild('confirmModal') confirmModal!: ConfirmationModalComponent;

  categories: MainCategoryDto[] = [];
  filteredCategories: MainCategoryDto[] = [];
  filterName = '';
  page = 1;
  pageSize = 10;

  currentCategory: MainCategoryDto = this.initForm();
  loading = false;
  saving = false;
  activeTab: 'form' | 'list' = 'form';

  switchToForm(): void { this.activeTab = 'form'; }
  switchToList(): void { this.activeTab = 'list'; }

  constructor(
    private categoryService: MainCategoryService,
    private toastr: ToastrService,
    private translate: TranslateService,
    public reportService: ReportService,
  ) {}

  ngOnInit(): void {
    this.loadData();
  }

  private initForm(): MainCategoryDto {
    return { TypeNo: 0, TypeName: '', Etname: '', ViewMe: false, NonStk: false };
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
    const max = this.categories.length > 0 ? Math.max(...this.categories.map(c => +c.TypeNo)) : 0;
    this.currentCategory.TypeNo = max + 1;
  }

  applyFilters(): void {
    const term = this.filterName.toLowerCase();
    this.filteredCategories = this.categories.filter(c =>
      !term ||
      c.TypeNo.toString().includes(term) ||
      c.TypeName?.toLowerCase().includes(term) ||
      c.Etname?.toLowerCase().includes(term)
    );
    this.page = 1;
  }

  clearFilters(): void {
    this.filterName = '';
    this.applyFilters();
  }

  onNoChange(): void {
    const no = +this.currentCategory.TypeNo;
    if (!no) return;
    const existing = this.categories.find(c => +c.TypeNo === no);
    if (existing) this.currentCategory = { ...existing };
  }

  onSelectRow(category: MainCategoryDto): void {
    this.currentCategory = { ...category };
    this.activeTab = 'form';   // open the selected record in the entry tab for editing
  }

  save(): void {
    if (!this.validate()) return;
    const isEdit = this.categories.some(c => +c.TypeNo === +this.currentCategory.TypeNo);
    this.saving = true;
    const req = isEdit
      ? this.categoryService.update(this.currentCategory.TypeNo, this.currentCategory)
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
    if (!this.currentCategory.TypeNo) return;
    this.confirmModal.show();
  }

  confirmDelete(): void {
    this.categoryService.delete(this.currentCategory.TypeNo).subscribe({
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
    if (!this.currentCategory.TypeNo || this.currentCategory.TypeNo <= 0) {
      this.toastr.warning(this.translate.instant('MainCategories.NoRequired'));
      return false;
    }
    if (!this.currentCategory.TypeName?.trim()) {
      this.toastr.warning(this.translate.instant('MainCategories.ArabicNameRequired'));
      return false;
    }
    return true;
  }

  print(): void {
    const t = (k: string) => this.translate.instant(k);
    const yes = t('General.Yes');
    const no = t('General.No');
    const cols = [
      { label: t('MainCategories.No') },
      { label: t('MainCategories.ArabicName') },
      { label: t('MainCategories.EnglishName') },
      { label: t('MainCategories.Visible') },
      { label: t('MainCategories.NonStock') },
    ];
    const rows = this.filteredCategories.map(c =>
      `<tr><td>${c.TypeNo ?? '—'}</td><td>${c.TypeName ?? '—'}</td><td>${c.Etname ?? '—'}</td>` +
      `<td>${c.ViewMe ? yes : no}</td><td>${c.NonStk ? yes : no}</td></tr>`
    ).join('');
    this.reportService.printReport(t('MainCategories.Title'), cols, rows);
  }
}
