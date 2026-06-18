import { Component, OnInit, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ToastrService } from 'ngx-toastr';
import { NgSelectModule } from '@ng-select/ng-select';
import { SharedModule } from '../../../shared/common/sharedmodule';
import {
  DocumentPostingFilterDto,
  UnpostedDocumentDto,
} from '../../../shared/services/document-posting.service';
import {
  DocumentUnpostingService,
} from '../../../shared/services/document-unposting.service';
import {
  JournalVoucherReportService,
  JvVoucherTypeDto,
} from '../../../shared/services/journal-voucher-report.service';
import { VoucherSerialService, VoucherSerial } from '../../../shared/services/voucher-serial.service';

@Component({
  selector: 'app-document-unposting',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TranslateModule,
    SharedModule,
    NgSelectModule,
  ],
  templateUrl: './document-unposting.component.html',
  styleUrl: './document-unposting.component.scss',
  encapsulation: ViewEncapsulation.None,
})
export class DocumentUnpostingComponent implements OnInit {

  // ─── Filters ───────────────────────────────────────────────
  filterMode: 'Date' | 'DocNum' = 'Date';
  readonly currentYear = new Date().getFullYear();
  myYear     = new Date().getFullYear();
  dateFrom   = this.toDateStr(new Date(new Date().getFullYear(), 0, 1));
  dateTo     = this.toDateStr(new Date());
  docNumFrom: number | null = null;
  docNumTo:   number | null = null;

  docTypeSpecific: number | null = null;
  vTypeSpecific:   number | null = null;

  // ─── Lookups ───────────────────────────────────────────────
  voucherTypes:   JvVoucherTypeDto[] = [];
  voucherSerials: VoucherSerial[]    = [];

  // ─── Results ───────────────────────────────────────────────
  rows:     UnpostedDocumentDto[] = [];
  loading   = false;
  unposting = false;
  fetched   = false;

  get docCount(): number { return this.rows.length; }
  get isAr(): boolean    { return this.translate.currentLang === 'ar'; }

  constructor(
    private translate:         TranslateService,
    private toastr:            ToastrService,
    private unpostingService:  DocumentUnpostingService,
    private jvReportService:   JournalVoucherReportService,
    private serialService:     VoucherSerialService,
  ) {}

  ngOnInit(): void {
    this.loadVoucherTypes();
  }

  private loadVoucherTypes(): void {
    this.jvReportService.getVoucherTypes().subscribe({
      next: data => {
        this.voucherTypes = data;
        if (data.length) {
          this.docTypeSpecific = data[0].VTypeNo;
          this.loadSerials(data[0].VTypeNo);
        }
      },
      error: () => {},
    });
  }

  private loadSerials(vTypeNo?: number): void {
    this.serialService.getAll(vTypeNo).subscribe({
      next: data => { this.voucherSerials = data; },
      error: () => { this.voucherSerials = []; },
    });
  }

  onDocTypeChange(item: JvVoucherTypeDto | null): void {
    this.vTypeSpecific = null;
    this.rows          = [];
    this.fetched       = false;
    this.loadSerials(item?.VTypeNo);
  }

  fetch(): void {
    if (!this.docTypeSpecific) {
      this.toastr.warning(
        this.translate.instant('DocPosting.DocTypeRequired'),
        this.translate.instant('General.ValidationError')
      );
      return;
    }

    this.loading = true;
    this.fetched = false;
    this.rows    = [];

    this.unpostingService.getPosted(this.buildFilter()).subscribe({
      next: data => {
        this.rows    = data;
        this.fetched = true;
        this.loading = false;
        if (!data.length) this.toastr.info(this.translate.instant('General.NoDataFound'));
      },
      error: () => { this.loading = false; },
    });
  }

  unpostAll(): void {
    if (!this.fetched || !this.rows.length) {
      this.toastr.warning(
        this.translate.instant('DocUnposting.NoDocumentsToUnpost'),
        this.translate.instant('General.Warning')
      );
      return;
    }

    this.unposting = true;
    this.unpostingService.unpostDocuments(this.buildFilter()).subscribe({
      next: result => {
        this.toastr.success(
          this.translate.instant('DocUnposting.UnpostedSuccessfully', { count: result.UnpostedCount }),
          this.translate.instant('General.Success')
        );
        this.unposting = false;
        this.rows      = [];
        this.fetched   = false;
      },
      error: () => { this.unposting = false; },
    });
  }

  private buildFilter(): DocumentPostingFilterDto {
    return {
      FilterMode: this.filterMode,
      DocNumFrom: this.filterMode === 'DocNum' ? this.docNumFrom : null,
      DocNumTo:   this.filterMode === 'DocNum' ? this.docNumTo   : null,
      DateFrom:   this.filterMode === 'Date'   ? this.dateFrom   : null,
      DateTo:     this.filterMode === 'Date'   ? this.dateTo     : null,
      DocType:    this.docTypeSpecific!,
      VType:      this.vTypeSpecific,
      MyYear:     this.myYear,
    };
  }

  private toDateStr(d: Date): string {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }
}
