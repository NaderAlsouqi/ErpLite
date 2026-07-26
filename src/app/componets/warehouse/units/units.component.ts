import { Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ToastrService } from 'ngx-toastr';
import { SharedModule } from '../../../shared/common/sharedmodule';
import { UnitDto, UnitService } from '../../../shared/services/unit.service';
import { ConfirmationModalComponent } from '../../../shared/common/confirmation-modal/confirmation-modal.component';
import { HasPermissionDirective } from '../../../shared/directives/has-permission.directive';
import { ReportService } from '../../../shared/services/report.service';
import { ReportExportComponent } from '../../../shared/components/report-export/report-export.component';
import { PaginatorComponent } from '../../../shared/components/paginator/paginator.component';
import { PaginatePipe } from '../../../shared/pipes/paginate.pipe';

@Component({
  selector: 'app-units',
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
  templateUrl: './units.component.html',
  styleUrl: './units.component.scss',
})
export class UnitsComponent implements OnInit {
  @ViewChild('confirmModal') confirmModal!: ConfirmationModalComponent;

  units: UnitDto[] = [];
  filteredUnits: UnitDto[] = [];
  filterName = '';
  page = 1;
  pageSize = 10;

  currentUnit: UnitDto = this.initForm();
  loading = false;
  saving = false;
  activeTab: 'form' | 'list' = 'form';

  switchToForm(): void { this.activeTab = 'form'; }
  switchToList(): void { this.activeTab = 'list'; }

  constructor(
    private unitService: UnitService,
    private toastr: ToastrService,
    private translate: TranslateService,
    public reportService: ReportService,
  ) {}

  ngOnInit(): void {
    this.loadData();
  }

  private initForm(): UnitDto {
    return { UnitNo: 0, UnitName: '', UnitEname: '' };
  }

  loadData(): void {
    this.loading = true;
    this.unitService.getAll().subscribe({
      next: (data) => {
        this.units = data;
        this.applyFilters();
        this.setNextNo();
        this.loading = false;
      },
      error: () => { this.loading = false; }
    });
  }

  private setNextNo(): void {
    const max = this.units.length > 0 ? Math.max(...this.units.map(u => +u.UnitNo)) : 0;
    this.currentUnit.UnitNo = max + 1;
  }

  applyFilters(): void {
    const term = this.filterName.toLowerCase();
    this.filteredUnits = this.units.filter(u =>
      !term ||
      u.UnitNo.toString().includes(term) ||
      u.UnitName?.toLowerCase().includes(term) ||
      u.UnitEname?.toLowerCase().includes(term)
    );
    this.page = 1;
  }

  clearFilters(): void {
    this.filterName = '';
    this.applyFilters();
  }

  onNoChange(): void {
    const no = +this.currentUnit.UnitNo;
    if (!no) return;
    const existing = this.units.find(u => +u.UnitNo === no);
    if (existing) this.currentUnit = { ...existing };
  }

  onSelectRow(unit: UnitDto): void {
    this.currentUnit = { ...unit };
    this.activeTab = 'form';   // open the selected record in the entry tab for editing
  }

  save(): void {
    if (!this.validate()) return;
    const isEdit = this.units.some(u => +u.UnitNo === +this.currentUnit.UnitNo);
    this.saving = true;
    const req = isEdit
      ? this.unitService.update(this.currentUnit.UnitNo, this.currentUnit)
      : this.unitService.add(this.currentUnit);
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
    if (!this.currentUnit.UnitNo) return;
    this.confirmModal.show();
  }

  confirmDelete(): void {
    this.unitService.delete(this.currentUnit.UnitNo).subscribe({
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
    this.currentUnit = this.initForm();
    this.setNextNo();
  }

  validate(): boolean {
    if (!this.currentUnit.UnitNo || this.currentUnit.UnitNo <= 0) {
      this.toastr.warning(this.translate.instant('Units.UnitNoRequired'));
      return false;
    }
    if (!this.currentUnit.UnitName?.trim()) {
      this.toastr.warning(this.translate.instant('Units.ArabicNameRequired'));
      return false;
    }
    if (!this.currentUnit.UnitEname?.trim()) {
      this.toastr.warning(this.translate.instant('Units.EnglishNameRequired'));
      return false;
    }
    return true;
  }

  print(): void {
    const t = (k: string) => this.translate.instant(k);
    const cols = [
      { label: t('Units.UnitNo') },
      { label: t('Units.ArabicName') },
      { label: t('Units.EnglishName') },
    ];
    const rows = this.filteredUnits.map(u =>
      `<tr><td>${u.UnitNo ?? '—'}</td><td>${u.UnitName ?? '—'}</td><td>${u.UnitEname ?? '—'}</td></tr>`
    ).join('');
    this.reportService.printReport(t('Units.Title'), cols, rows);
  }
}
