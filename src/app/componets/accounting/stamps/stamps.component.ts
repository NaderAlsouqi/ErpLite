import { Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ToastrService } from 'ngx-toastr';
import { SharedModule } from '../../../shared/common/sharedmodule';
import { SignatureDto, SignatureService } from '../../../shared/services/signature.service';
import { ConfirmationModalComponent } from '../../../shared/common/confirmation-modal/confirmation-modal.component';
import { HasPermissionDirective } from '../../../shared/directives/has-permission.directive';
import { ReportService } from '../../../shared/services/report.service';

@Component({
  selector: 'app-stamps',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TranslateModule,
    SharedModule,
    ConfirmationModalComponent,
    HasPermissionDirective,
  ],
  templateUrl: './stamps.component.html',
  styleUrl: './stamps.component.scss',
})
export class StampsComponent implements OnInit {
  @ViewChild('confirmModal') confirmModal!: ConfirmationModalComponent;

  stamps: SignatureDto[] = [];
  filteredStamps: SignatureDto[] = [];
  filterTerm = '';

  current: SignatureDto = this.initForm();
  loading = false;
  saving = false;
  activeTab: 'form' | 'list' = 'form';

  switchToForm(): void { this.activeTab = 'form'; }
  switchToList(): void { this.activeTab = 'list'; }

  constructor(
    private signatureService: SignatureService,
    private toastr: ToastrService,
    private translate: TranslateService,
    private reportService: ReportService,
  ) {}

  ngOnInit(): void {
    this.loadData();
  }

  private initForm(): SignatureDto {
    return { SigNo: 0, Desc: '', eDesc: '' };
  }

  loadData(): void {
    this.loading = true;
    this.signatureService.getAll().subscribe({
      next: (data) => {
        this.stamps = data;
        this.applyFilter();
        this.setNextNo();
        this.loading = false;
      },
      error: () => { this.loading = false; }
    });
  }

  private setNextNo(): void {
    const max = this.stamps.length > 0 ? Math.max(...this.stamps.map(s => s.SigNo)) : 0;
    this.current.SigNo = max + 1;
  }

  applyFilter(): void {
    const term = this.filterTerm.toLowerCase();
    this.filteredStamps = this.stamps.filter(s =>
      !term ||
      s.SigNo.toString().includes(term) ||
      s.Desc?.toLowerCase().includes(term) ||
      s.eDesc?.toLowerCase().includes(term)
    );
  }

  clearFilter(): void {
    this.filterTerm = '';
    this.applyFilter();
  }

  onNoChange(): void {
    const no = +this.current.SigNo;
    if (!no) return;
    const existing = this.stamps.find(s => s.SigNo === no);
    if (existing) this.current = { ...existing };
  }

  onSelectRow(stamp: SignatureDto): void {
    this.current = { ...stamp };
    this.activeTab = 'form';   // open the selected record in the entry tab for editing
  }

  save(): void {
    if (!this.validate()) return;
    const isEdit = this.stamps.some(s => s.SigNo === +this.current.SigNo);
    this.saving = true;
    const req = isEdit
      ? this.signatureService.update(this.current.SigNo, this.current)
      : this.signatureService.add(this.current);
    req.subscribe({
      next: (res: any) => {
        this.toastr.success(res?.message || this.translate.instant('General.SaveSuccess'));
        this.loadData();
        this.reset();
        this.saving = false;
      },
      error: () => { this.saving = false; }
    });
  }

  delete(): void {
    if (!this.current.SigNo) return;
    this.confirmModal.show();
  }

  confirmDelete(): void {
    this.signatureService.delete(this.current.SigNo).subscribe({
      next: (res: any) => {
        this.toastr.success(res?.message || this.translate.instant('General.DeleteSuccess'));
        this.loadData();
        this.reset();
      },
      error: () => {}
    });
  }

  reset(): void {
    this.current = this.initForm();
    this.setNextNo();
  }

  validate(): boolean {
    if (!this.current.SigNo || this.current.SigNo <= 0) {
      this.toastr.warning(this.translate.instant('Stamps.StampNoRequired'));
      return false;
    }
    if (!this.current.Desc?.trim()) {
      this.toastr.warning(this.translate.instant('Stamps.ArabicNameRequired'));
      return false;
    }
    if (!this.current.eDesc?.trim()) {
      this.toastr.warning(this.translate.instant('Stamps.EnglishNameRequired'));
      return false;
    }
    return true;
  }

  print(): void {
    const t = (k: string) => this.translate.instant(k);
    const cols = [
      { label: t('Stamps.StampNo') },
      { label: t('Stamps.ArabicName') },
      { label: t('Stamps.EnglishName') },
    ];
    const rows = this.filteredStamps.map(s =>
      `<tr><td>${s.SigNo}</td><td>${s.Desc ?? '—'}</td><td>${s.eDesc ?? '—'}</td></tr>`
    ).join('');
    this.reportService.printReport(t('Stamps.Title'), cols, rows);
  }
}
