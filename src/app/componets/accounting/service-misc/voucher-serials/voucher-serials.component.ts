import { Component, OnInit, TemplateRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { NgSelectModule } from '@ng-select/ng-select';
import { ToastrService } from 'ngx-toastr';
import { SharedModule } from '../../../../shared/common/sharedmodule';
import { VoucherSerial, VoucherSerialService } from '../../../../shared/services/voucher-serial.service';
import { LookupItem, LookupService } from '../../../../shared/services/lookup.service';
import { ChartOfAccountDto, ChartOfAccountsService } from '../../../../shared/services/chart-of-accounts.service';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { HasPermissionDirective } from '../../../../shared/directives/has-permission.directive';
import { ReportService } from '../../../../shared/services/report.service';

@Component({
  selector: 'app-voucher-serials',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TranslateModule,
    NgSelectModule,
    SharedModule,
    HasPermissionDirective
  ],
  providers: [NgbModal],
  templateUrl: './voucher-serials.component.html',
  styleUrl: './voucher-serials.component.scss'
})
export class VoucherSerialsComponent implements OnInit {
  @ViewChild('deleteConfirmModal') deleteConfirmModal!: TemplateRef<any>;

  vSerials: VoucherSerial[] = [];
  filteredVSerials: VoucherSerial[] = [];
  voucherTypes: LookupItem[] = [];
  branches: LookupItem[] = [];
  stores: LookupItem[] = [];
  accounts: ChartOfAccountDto[] = [];
  leafAccounts: ChartOfAccountDto[] = [];

  filterVTypeNo: number | null = null;
  filterBrNo: number | null = null;
  filterName: string = '';

  currentVSerial: VoucherSerial = this.initForm();
  loading = false;
  saving = false;

  constructor(
    private vSerialService: VoucherSerialService,
    private lookupService: LookupService,
    private accService: ChartOfAccountsService,
    private toastr: ToastrService,
    private translate: TranslateService,
    private modalService: NgbModal,
    private reportService: ReportService,
  ) {}

  ngOnInit(): void {
    this.loadLookups();
    this.loadVSerials();
  }

  private initForm(): VoucherSerial {
    return {
      VtypeNo: 0,
      VSerialNo: 0,
      InvoiceType: 1, // Default to Cash (1)
      BR_No: 0,
      SName: '',
      Sename: '',
      StoreNo: 0,
      ACCNO1: undefined,
      ACCNO2: undefined
    };
  }

  loadLookups(): void {
    this.lookupService.getVoucherTypes().subscribe(data => this.voucherTypes = data);
    this.lookupService.getBranches().subscribe(data => this.branches = data);
    this.lookupService.getStores().subscribe(data => this.stores = data);
    this.accService.getAll().subscribe(data => {
      this.accounts = data;
      this.leafAccounts = data.filter(a => !a.branch);
    });
  }

  loadVSerials(): void {
    this.loading = true;
    this.vSerialService.getAll().subscribe({
      next: (data) => {
        this.vSerials = data;
        this.applyFilters();
        this.setNextSerialNo();
        this.loading = false;
      },
      error: () => this.loading = false
    });
  }

  private setNextSerialNo(): void {
    const max = this.vSerials.length > 0
      ? Math.max(...this.vSerials.map(v => v.VSerialNo))
      : 0;
    this.currentVSerial.VSerialNo = max + 1;
  }

  applyFilters(): void {
    this.filteredVSerials = this.vSerials.filter(v => {
      const matchType = !this.filterVTypeNo || v.VtypeNo === this.filterVTypeNo;
      const matchBranch = !this.filterBrNo || v.BR_No === this.filterBrNo;
      const matchName = !this.filterName ||
        (v.SName?.toLowerCase().includes(this.filterName.toLowerCase())) ||
        (v.Sename?.toLowerCase().includes(this.filterName.toLowerCase()));
      return matchType && matchBranch && matchName;
    });
  }

  clearFilters(): void {
    this.filterVTypeNo = null;
    this.filterBrNo = null;
    this.filterName = '';
    this.applyFilters();
  }

  onSerialNoChange(): void {
    const vtypeNo = +this.currentVSerial.VtypeNo;
    const vSerialNo = +this.currentVSerial.VSerialNo;
    if (!vSerialNo) return;

    const existing = vtypeNo
      ? this.vSerials.find(v => +v.VtypeNo === vtypeNo && +v.VSerialNo === vSerialNo)
      : this.vSerials.find(v => +v.VSerialNo === vSerialNo);

    if (existing) {
      this.currentVSerial = { ...existing };
    }
  }

  onSelectVoucher(vSerial: VoucherSerial): void {
    this.currentVSerial = { ...vSerial };
  }

  save(): void {
    if (!this.validate()) return;

    const payload: VoucherSerial = {
      VtypeNo: this.currentVSerial.VtypeNo ?? 0,
      VSerialNo: this.currentVSerial.VSerialNo ?? 0,
      InvoiceType: this.currentVSerial.InvoiceType ?? 1,
      BR_No: this.currentVSerial.BR_No ?? 0,
      SName: this.currentVSerial.SName || '',
      Sename: this.currentVSerial.Sename || '',
      StoreNo: this.currentVSerial.StoreNo ?? 0,
      ACCNO1: this.currentVSerial.ACCNO1,
      ACCNO2: this.currentVSerial.ACCNO2,
    };

    this.saving = true;
    this.vSerialService.save(payload).subscribe({
      next: (res: any) => {
        this.toastr.success(res.message || this.translate.instant('General.SaveSuccess'));
        this.loadVSerials();
        this.reset();
        this.saving = false;
      },
      error: (err) => {
        const msg = err.error?.message || err.error?.Message || JSON.stringify(err.error) || this.translate.instant('General.Error');
        this.toastr.error(msg);
        this.saving = false;
      }
    });
  }

  delete(): void {
    if (!this.currentVSerial.VtypeNo || !this.currentVSerial.VSerialNo) return;

    const modalRef = this.modalService.open(this.deleteConfirmModal, {
      centered: true,
      backdrop: 'static',
      keyboard: false,
      size: 'sm',
      windowClass: 'animate__animated animate__fadeIn'
    });

    modalRef.result.then((confirmed) => {
      if (!confirmed) return;
      this.vSerialService.delete(this.currentVSerial.VtypeNo, this.currentVSerial.VSerialNo).subscribe({
        next: (res: any) => {
          this.toastr.success(res.message || this.translate.instant('General.DeleteSuccess'));
          this.loadVSerials();
          this.reset();
        },
        error: (err) => {
          this.toastr.error(err.error?.message || this.translate.instant('General.Error'));
        }
      });
    }, () => {});
  }

  reset(): void {
    this.currentVSerial = this.initForm();
    this.setNextSerialNo();
  }

  validate(): boolean {
    if (!this.currentVSerial.VtypeNo) {
      this.toastr.warning(this.translate.instant('VoucherSerial.EnterVoucherType'));
      return false;
    }
    if (!this.currentVSerial.VSerialNo) {
      this.toastr.warning(this.translate.instant('VoucherSerial.EnterSerialNo'));
      return false;
    }
    if (!this.currentVSerial.SName) {
      this.toastr.warning(this.translate.instant('VoucherSerial.EnterName'));
      return false;
    }
    if (!this.currentVSerial.BR_No) {
      this.toastr.warning(this.translate.instant('VoucherSerial.EnterBranch'));
      return false;
    }
    return true;
  }

  print(): void {
    const t = (k: string) => this.translate.instant(k);
    const cols = [
      { label: t('VoucherSerial.VoucherType') },
      { label: t('VoucherSerial.SerialNo') },
      { label: t('VoucherSerial.ArabicName') },
      { label: t('VoucherSerial.Branch') },
      { label: t('VoucherSerial.Store') },
    ];
    const rows = this.filteredVSerials.map(v =>
      `<tr><td>${v.VoucherTypeName ?? ''} (${v.VtypeNo})</td><td>${v.VSerialNo}</td><td>${v.SName ?? '—'}</td><td>${v.BranchArName ?? '—'}</td><td>${v.StoreName ?? '—'}</td></tr>`
    ).join('');
    this.reportService.printReport(t('VoucherSerial.List'), cols, rows);
  }

  accountSearchFn(term: string, item: ChartOfAccountDto) {
    term = term.toLowerCase();
    return item.no.toString().includes(term) || (item.name && item.name.toLowerCase().includes(term)) || (item.Ename && item.Ename.toLowerCase().includes(term));
  }
}
