import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ToastrService } from 'ngx-toastr';
import { SharedModule } from '../../../shared/common/sharedmodule';
import { CostCenterDto, CostCenterService } from '../../../shared/services/cost-center.service';
import { ConfirmationModalComponent } from '../../../shared/common/confirmation-modal/confirmation-modal.component';
import { HasPermissionDirective } from '../../../shared/directives/has-permission.directive';
import { ReportService } from '../../../shared/services/report.service';

@Component({
  selector: 'app-cost-centers',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TranslateModule,
    SharedModule,
    ConfirmationModalComponent,
    HasPermissionDirective,
  ],
  templateUrl: './cost-centers.component.html',
  styleUrl: './cost-centers.component.scss',
})
export class CostCentersComponent implements OnInit {
  @ViewChild('confirmModal') confirmModal!: ConfirmationModalComponent;

  costCenters: CostCenterDto[] = [];
  filteredCostCenters: CostCenterDto[] = [];
  filterName = '';

  currentCC: CostCenterDto = this.initForm();
  loading = false;
  saving = false;
  activeTab: 'form' | 'list' = 'form';

  switchToForm(): void { this.activeTab = 'form'; }
  switchToList(): void { this.activeTab = 'list'; }

  // ── Deep-link focus (e.g. from the Cost-Center Account Balances report) ──
  highlightedNo: number | null = null;
  private pendingFocus: number | null = null;

  constructor(
    private ccService: CostCenterService,
    private toastr: ToastrService,
    private translate: TranslateService,
    private reportService: ReportService,
    private route: ActivatedRoute,
    private el: ElementRef,
  ) {}

  ngOnInit(): void {
    const focusParam = this.route.snapshot.queryParamMap.get('focus');
    const focusNo = focusParam != null ? Number(focusParam) : NaN;
    if (!isNaN(focusNo) && focusNo > 0) this.pendingFocus = focusNo;

    this.loadData();
  }

  /**
   * Select a cost center, scroll to its row, and briefly highlight it.
   * Called when arriving with ?focus=<ccntrNo>.
   */
  private focusCostCenter(no: number): void {
    const target = this.costCenters.find(c => +c.CcntrNo === no);
    if (!target) {
      this.toastr.warning(this.translate.instant('CostCenters.NotFound') + ' ' + no);
      return;
    }
    this.filterName = '';
    this.applyFilters();
    this.currentCC = { ...target };

    this.activeTab = 'list';   // show the table so the focused row is visible
    this.highlightedNo = no;
    setTimeout(() => {
      const row = this.el.nativeElement.querySelector(`#cc-row-${no}`);
      row?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 120);
    setTimeout(() => { this.highlightedNo = null; }, 4500);
  }

  private initForm(): CostCenterDto {
    return {
      CcntrNo: 0, CcAname: '', Ccename: '',
      belong: 0, branch: 0, bb: 0, level: 1,
      balance1: null, accorder: null, fatherorder: '',
      CurNo: 1, LRate: 1, budgetF: null, ProfL: null, total: null
    };
  }

  loadData(): void {
    this.loading = true;
    this.ccService.getAll().subscribe({
      next: (data) => {
        this.costCenters = data;
        this.applyFilters();
        this.setNextNo();
        this.loading = false;
        if (this.pendingFocus != null) {
          const no = this.pendingFocus;
          this.pendingFocus = null;
          this.focusCostCenter(no);
        }
      },
      error: () => { this.loading = false; }
    });
  }

  private setNextNo(): void {
    const max = this.costCenters.length > 0 ? Math.max(...this.costCenters.map(c => c.CcntrNo ?? 0)) : 0;
    this.currentCC.CcntrNo = max + 1;
  }

  applyFilters(): void {
    const term = this.filterName.toLowerCase();
    this.filteredCostCenters = this.costCenters.filter(c =>
      !term ||
      (c.CcntrNo ?? 0).toString().includes(term) ||
      c.CcAname?.toLowerCase().includes(term) ||
      c.Ccename?.toLowerCase().includes(term)
    );
  }

  clearFilters(): void {
    this.filterName = '';
    this.applyFilters();
  }

  onNoChange(): void {
    const no = +this.currentCC.CcntrNo;
    if (!no) return;
    const existing = this.costCenters.find(c => +c.CcntrNo === no);
    if (existing) this.currentCC = { ...existing };
  }

  onSelectRow(cc: CostCenterDto): void {
    this.currentCC = { ...cc };
    this.activeTab = 'form';   // open the selected record in the entry tab for editing
  }

  save(): void {
    if (!this.validate()) return;
    const isEdit = this.costCenters.some(c => +c.CcntrNo === +this.currentCC.CcntrNo);
    this.saving = true;
    const req = isEdit
      ? this.ccService.update(this.currentCC.CcntrNo, this.currentCC)
      : this.ccService.add(this.currentCC);
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
    if (!this.currentCC.CcntrNo) return;
    this.confirmModal.show();
  }

  confirmDelete(): void {
    this.ccService.delete(this.currentCC.CcntrNo).subscribe({
      next: (res: any) => {
        this.toastr.success(res?.message || this.translate.instant('General.DeleteSuccess'));
        this.loadData();
        this.reset();
      },
      error: (err: any) => {
        this.toastr.error(err.error?.message || this.translate.instant('General.Error'));
      }
    });
  }

  reset(): void {
    this.currentCC = this.initForm();
    this.setNextNo();
  }

  validate(): boolean {
    if (!this.currentCC.CcntrNo || this.currentCC.CcntrNo <= 0) {
      this.toastr.warning(this.translate.instant('CostCenters.CcntrNoRequired'));
      return false;
    }
    if (!this.currentCC.CcAname?.trim()) {
      this.toastr.warning(this.translate.instant('CostCenters.ArabicNameRequired'));
      return false;
    }
    if (!this.currentCC.Ccename?.trim()) {
      this.toastr.warning(this.translate.instant('CostCenters.EnglishNameRequired'));
      return false;
    }
    return true;
  }

  print(): void {
    const t = (k: string) => this.translate.instant(k);
    const cols = [
      { label: t('CostCenters.CcntrNo') },
      { label: t('CostCenters.ArabicName') },
      { label: t('CostCenters.EnglishName') },
      { label: t('CostCenters.Level') },
      { label: t('CostCenters.Belong') },
    ];
    const rows = this.filteredCostCenters.map(c =>
      `<tr><td>${c.CcntrNo ?? '—'}</td><td>${c.CcAname ?? '—'}</td><td>${c.Ccename ?? '—'}</td><td>${c.level ?? '—'}</td><td>${c.belong ?? '—'}</td></tr>`
    ).join('');
    this.reportService.printReport(t('CostCenters.Title'), cols, rows);
  }
}
