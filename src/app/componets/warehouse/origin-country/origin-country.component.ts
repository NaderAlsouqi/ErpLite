import { Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ToastrService } from 'ngx-toastr';
import { SharedModule } from '../../../shared/common/sharedmodule';
import { OriginCountryDto, OriginCountryService } from '../../../shared/services/origin-country.service';
import { ConfirmationModalComponent } from '../../../shared/common/confirmation-modal/confirmation-modal.component';
import { HasPermissionDirective } from '../../../shared/directives/has-permission.directive';
import { ReportService } from '../../../shared/services/report.service';
import { ReportExportComponent } from '../../../shared/components/report-export/report-export.component';
import { PaginatorComponent } from '../../../shared/components/paginator/paginator.component';
import { PaginatePipe } from '../../../shared/pipes/paginate.pipe';

@Component({
  selector: 'app-origin-country',
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
  templateUrl: './origin-country.component.html',
  styleUrl: './origin-country.component.scss',
})
export class OriginCountryComponent implements OnInit {
  @ViewChild('confirmModal') confirmModal!: ConfirmationModalComponent;

  countries: OriginCountryDto[] = [];
  filteredCountries: OriginCountryDto[] = [];
  filterName = '';
  page = 1;
  pageSize = 10;

  currentCountry: OriginCountryDto = this.initForm();
  loading = false;
  saving = false;
  activeTab: 'form' | 'list' = 'form';

  switchToForm(): void { this.activeTab = 'form'; }
  switchToList(): void { this.activeTab = 'list'; }

  constructor(
    private countryService: OriginCountryService,
    private toastr: ToastrService,
    private translate: TranslateService,
    public reportService: ReportService,
  ) {}

  ngOnInit(): void {
    this.loadData();
  }

  private initForm(): OriginCountryDto {
    return { OriginNo: 0, OriginName: '', OriginEname: '' };
  }

  loadData(): void {
    this.loading = true;
    this.countryService.getAll().subscribe({
      next: (data) => {
        this.countries = data;
        this.applyFilters();
        this.setNextNo();
        this.loading = false;
      },
      error: () => { this.loading = false; }
    });
  }

  private setNextNo(): void {
    const max = this.countries.length > 0 ? Math.max(...this.countries.map(c => +c.OriginNo)) : 0;
    this.currentCountry.OriginNo = max + 1;
  }

  applyFilters(): void {
    const term = this.filterName.toLowerCase();
    this.filteredCountries = this.countries.filter(c =>
      !term ||
      c.OriginNo.toString().includes(term) ||
      c.OriginName?.toLowerCase().includes(term) ||
      c.OriginEname?.toLowerCase().includes(term)
    );
    this.page = 1;
  }

  clearFilters(): void {
    this.filterName = '';
    this.applyFilters();
  }

  onNoChange(): void {
    const no = +this.currentCountry.OriginNo;
    if (!no) return;
    const existing = this.countries.find(c => +c.OriginNo === no);
    if (existing) this.currentCountry = { ...existing };
  }

  onSelectRow(country: OriginCountryDto): void {
    this.currentCountry = { ...country };
    this.activeTab = 'form';   // open the selected record in the entry tab for editing
  }

  save(): void {
    if (!this.validate()) return;
    const isEdit = this.countries.some(c => +c.OriginNo === +this.currentCountry.OriginNo);
    this.saving = true;
    const req = isEdit
      ? this.countryService.update(this.currentCountry.OriginNo, this.currentCountry)
      : this.countryService.add(this.currentCountry);
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
    if (!this.currentCountry.OriginNo) return;
    this.confirmModal.show();
  }

  confirmDelete(): void {
    this.countryService.delete(this.currentCountry.OriginNo).subscribe({
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
    this.currentCountry = this.initForm();
    this.setNextNo();
  }

  validate(): boolean {
    if (!this.currentCountry.OriginNo || this.currentCountry.OriginNo <= 0) {
      this.toastr.warning(this.translate.instant('OriginCountry.OriginNoRequired'));
      return false;
    }
    if (!this.currentCountry.OriginName?.trim()) {
      this.toastr.warning(this.translate.instant('OriginCountry.ArabicNameRequired'));
      return false;
    }
    if (!this.currentCountry.OriginEname?.trim()) {
      this.toastr.warning(this.translate.instant('OriginCountry.EnglishNameRequired'));
      return false;
    }
    return true;
  }

  print(): void {
    const t = (k: string) => this.translate.instant(k);
    const cols = [
      { label: t('OriginCountry.OriginNo') },
      { label: t('OriginCountry.ArabicName') },
      { label: t('OriginCountry.EnglishName') },
    ];
    const rows = this.filteredCountries.map(c =>
      `<tr><td>${c.OriginNo ?? '—'}</td><td>${c.OriginName ?? '—'}</td><td>${c.OriginEname ?? '—'}</td></tr>`
    ).join('');
    this.reportService.printReport(t('OriginCountry.Title'), cols, rows);
  }
}
