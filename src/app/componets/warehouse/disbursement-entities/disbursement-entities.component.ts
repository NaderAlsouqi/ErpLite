import { Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ToastrService } from 'ngx-toastr';
import { SharedModule } from '../../../shared/common/sharedmodule';
import { DisbursementEntityDto, DisbursementEntityService } from '../../../shared/services/disbursement-entity.service';
import { ConfirmationModalComponent } from '../../../shared/common/confirmation-modal/confirmation-modal.component';
import { HasPermissionDirective } from '../../../shared/directives/has-permission.directive';
import { ReportService } from '../../../shared/services/report.service';
import { ReportExportComponent } from '../../../shared/components/report-export/report-export.component';
import { PaginatorComponent } from '../../../shared/components/paginator/paginator.component';
import { PaginatePipe } from '../../../shared/pipes/paginate.pipe';

@Component({
  selector: 'app-disbursement-entities',
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
  templateUrl: './disbursement-entities.component.html',
  styleUrl: './disbursement-entities.component.scss',
})
export class DisbursementEntitiesComponent implements OnInit {
  @ViewChild('confirmModal') confirmModal!: ConfirmationModalComponent;

  entities: DisbursementEntityDto[] = [];
  filteredEntities: DisbursementEntityDto[] = [];
  filterName = '';

  currentEntity: DisbursementEntityDto = this.initForm();
  loading = false;
  saving = false;
  activeTab: 'form' | 'list' = 'form';
  page = 1;
  pageSize = 10;

  switchToForm(): void { this.activeTab = 'form'; }
  switchToList(): void { this.activeTab = 'list'; }

  constructor(
    private entityService: DisbursementEntityService,
    private toastr: ToastrService,
    private translate: TranslateService,
    public reportService: ReportService,
  ) {}

  ngOnInit(): void {
    this.loadData();
  }

  private initForm(): DisbursementEntityDto {
    return { Tg: 0, Name: '', Ename: '', Tel: '' };
  }

  loadData(): void {
    this.loading = true;
    this.entityService.getAll().subscribe({
      next: (data) => {
        this.entities = data;
        this.applyFilters();
        this.setNextNo();
        this.loading = false;
      },
      error: () => { this.loading = false; }
    });
  }

  private setNextNo(): void {
    const max = this.entities.length > 0 ? Math.max(...this.entities.map(e => +e.Tg)) : 0;
    this.currentEntity.Tg = max + 1;
  }

  applyFilters(): void {
    const term = this.filterName.toLowerCase();
    this.filteredEntities = this.entities.filter(e =>
      !term ||
      e.Tg.toString().includes(term) ||
      e.Name?.toLowerCase().includes(term) ||
      e.Ename?.toLowerCase().includes(term) ||
      e.Tel?.toLowerCase().includes(term)
    );
    this.page = 1;
  }

  clearFilters(): void {
    this.filterName = '';
    this.applyFilters();
  }

  onNoChange(): void {
    const no = +this.currentEntity.Tg;
    if (!no) return;
    const existing = this.entities.find(e => +e.Tg === no);
    if (existing) this.currentEntity = { ...existing };
  }

  onSelectRow(entity: DisbursementEntityDto): void {
    this.currentEntity = { ...entity };
    this.activeTab = 'form';   // open the selected record in the entry tab for editing
  }

  save(): void {
    if (!this.validate()) return;
    const isEdit = this.entities.some(e => +e.Tg === +this.currentEntity.Tg);
    this.saving = true;
    const req = isEdit
      ? this.entityService.update(this.currentEntity.Tg, this.currentEntity)
      : this.entityService.add(this.currentEntity);
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
    if (!this.currentEntity.Tg) return;
    this.confirmModal.show();
  }

  confirmDelete(): void {
    this.entityService.delete(this.currentEntity.Tg).subscribe({
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
    this.currentEntity = this.initForm();
    this.setNextNo();
  }

  validate(): boolean {
    if (!this.currentEntity.Tg || this.currentEntity.Tg <= 0) {
      this.toastr.warning(this.translate.instant('DisbursementEntities.NoRequired'));
      return false;
    }
    if (!this.currentEntity.Name?.trim()) {
      this.toastr.warning(this.translate.instant('DisbursementEntities.ArabicNameRequired'));
      return false;
    }
    if (!this.currentEntity.Ename?.trim()) {
      this.toastr.warning(this.translate.instant('DisbursementEntities.EnglishNameRequired'));
      return false;
    }
    return true;
  }

  print(): void {
    const t = (k: string) => this.translate.instant(k);
    const cols = [
      { label: t('DisbursementEntities.No') },
      { label: t('DisbursementEntities.ArabicName') },
      { label: t('DisbursementEntities.EnglishName') },
      { label: t('DisbursementEntities.Tel') },
    ];
    const rows = this.filteredEntities.map(e =>
      `<tr><td>${e.Tg ?? '—'}</td><td>${e.Name ?? '—'}</td><td>${e.Ename ?? '—'}</td><td>${e.Tel ?? '—'}</td></tr>`
    ).join('');
    this.reportService.printReport(t('DisbursementEntities.Title'), cols, rows);
  }
}
