import { Component, Input, OnChanges, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ToastrService } from 'ngx-toastr';
import { AttachmentService, Attachment } from '../../services/attachment.service';
import { AuthService } from '../../services/auth.service';
import { ConfirmationModalComponent } from '../../common/confirmation-modal/confirmation-modal.component';

/**
 * Reusable attachments panel — drop on ANY page to let users attach files.
 *
 *   <app-attachments moduleKey="JournalVouchers"></app-attachments>          (page-level)
 *   <app-attachments moduleKey="JournalVouchers" [entityId]="docNum"></app-attachments>  (record-level)
 *
 * Gated by the Attachments.View / Attachments.Upload / Attachments.Delete permissions.
 */
@Component({
  selector: 'app-attachments',
  standalone: true,
  imports: [CommonModule, TranslateModule, ConfirmationModalComponent],
  template: `
    <div class="card custom-card attachments-panel mb-3" *ngIf="canView">
      <div class="card-header d-flex align-items-center justify-content-between">
        <div class="card-title mb-0">
          <i class="ti ti-paperclip me-1"></i>{{ 'Attachments.Title' | translate }}
          <span class="badge bg-primary-transparent ms-1">{{ items.length }}</span>
        </div>
        <button *ngIf="canUpload" type="button" class="btn btn-primary btn-sm" (click)="fileInput.click()" [disabled]="uploading">
          <span *ngIf="uploading" class="spinner-border spinner-border-sm me-1"></span>
          <i *ngIf="!uploading" class="ti ti-upload me-1"></i>{{ 'Attachments.Upload' | translate }}
        </button>
        <input #fileInput type="file" hidden (change)="onFileSelected($event)" />
      </div>

      <div class="card-body py-2">
        <div *ngIf="loading" class="text-center py-3"><span class="spinner-border spinner-border-sm text-primary"></span></div>

        <div *ngIf="!loading && items.length === 0" class="text-muted text-center py-3">
          <i class="ti ti-paperclip-off me-1"></i>{{ 'Attachments.Empty' | translate }}
        </div>

        <ul *ngIf="!loading && items.length > 0" class="list-group list-group-flush">
          <li *ngFor="let a of items" class="list-group-item d-flex align-items-center justify-content-between px-0 py-2 gap-2">
            <div class="d-flex align-items-center gap-2 text-truncate">
              <i class="ti {{ icon(a) }} fs-4 text-primary"></i>
              <div class="text-truncate">
                <div class="fw-semibold text-truncate att-name">{{ a.FileName }}</div>
                <small class="text-muted">{{ size(a.FileSize) }}<span *ngIf="a.UploadedAt"> · {{ a.UploadedAt | date:'yyyy-MM-dd HH:mm' }}</span><span *ngIf="a.UploadedBy"> · {{ a.UploadedBy }}</span></small>
              </div>
            </div>
            <div class="d-flex gap-1 flex-shrink-0">
              <button type="button" class="btn btn-sm btn-outline-primary" (click)="download(a)" [title]="'Attachments.Download' | translate">
                <i class="ti ti-download"></i>
              </button>
              <button *ngIf="canDelete" type="button" class="btn btn-sm btn-outline-danger" (click)="askDelete(a)" [title]="'General.Delete' | translate">
                <i class="ti ti-trash"></i>
              </button>
            </div>
          </li>
        </ul>
      </div>

      <app-confirmation-modal #delModal
        [title]="'Attachments.DeleteTitle' | translate"
        [message]="('Attachments.DeleteConfirm' | translate) + (pending ? ' (' + pending.FileName + ')' : '')"
        [confirmButtonText]="'General.Delete' | translate"
        [cancelButtonText]="'General.Cancel' | translate"
        confirmButtonClass="btn-danger"
        [processing]="deleting"
        (confirm)="doDelete()">
      </app-confirmation-modal>
    </div>
  `,
  styles: [`
    .attachments-panel .att-name { max-width: 320px; }
    .attachments-panel .list-group-item { border-color: var(--default-border, #eef0f7); }
  `],
})
export class AttachmentsComponent implements OnInit, OnChanges {
  /** Page/screen key the attachments belong to (required). */
  @Input() moduleKey!: string;
  /** Optional record reference within the module (e.g. a document number). */
  @Input() entityId?: string | number | null;

  @ViewChild('delModal') delModal!: ConfirmationModalComponent;

  items: Attachment[] = [];
  loading = false;
  uploading = false;
  deleting = false;
  pending: Attachment | null = null;

  canView = false;
  canUpload = false;
  canDelete = false;

  constructor(
    private svc: AttachmentService,
    private auth: AuthService,
    private toastr: ToastrService,
    private translate: TranslateService,
  ) {}

  ngOnInit(): void {
    this.canView = this.auth.hasPermission('Attachments.View');
    this.canUpload = this.auth.hasPermission('Attachments.Upload');
    this.canDelete = this.auth.hasPermission('Attachments.Delete');
    if (this.canView) this.load();
  }

  ngOnChanges(): void { if (this.canView && this.moduleKey) this.load(); }

  private get eid(): string | null {
    return (this.entityId == null || `${this.entityId}` === '') ? null : `${this.entityId}`;
  }

  load(): void {
    if (!this.moduleKey) return;
    this.loading = true;
    this.svc.list(this.moduleKey, this.eid).subscribe({
      next: (r) => { this.items = r || []; this.loading = false; },
      error: () => { this.loading = false; }
    });
  }

  onFileSelected(ev: Event): void {
    const input = ev.target as HTMLInputElement;
    const file = input.files && input.files[0];
    if (!file) return;
    this.uploading = true;
    this.svc.upload(this.moduleKey, this.eid, file).subscribe({
      next: () => {
        this.toastr.success(this.translate.instant('Attachments.Uploaded'));
        this.uploading = false;
        input.value = '';
        this.load();
      },
      error: (err) => {
        this.toastr.error(err?.error?.message || err?.error || this.translate.instant('General.Error'));
        this.uploading = false;
        input.value = '';
      }
    });
  }

  download(a: Attachment): void { this.svc.download(a); }

  askDelete(a: Attachment): void { this.pending = a; this.delModal.show(); }

  doDelete(): void {
    if (!this.pending) return;
    this.deleting = true;
    this.svc.delete(this.pending.Id).subscribe({
      next: () => {
        this.toastr.success(this.translate.instant('Attachments.Deleted'));
        this.deleting = false;
        this.pending = null;
        this.load();
      },
      error: () => { this.deleting = false; this.toastr.error(this.translate.instant('General.Error')); }
    });
  }

  size(bytes: number): string {
    if (!bytes && bytes !== 0) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  }

  icon(a: Attachment): string {
    const ext = (a.FileName.split('.').pop() || '').toLowerCase();
    if (['pdf'].includes(ext)) return 'ti-file-type-pdf';
    if (['xls', 'xlsx', 'csv'].includes(ext)) return 'ti-file-spreadsheet';
    if (['doc', 'docx'].includes(ext)) return 'ti-file-text';
    if (['png', 'jpg', 'jpeg', 'gif', 'bmp', 'webp', 'svg'].includes(ext)) return 'ti-photo';
    if (['zip', 'rar', '7z'].includes(ext)) return 'ti-file-zip';
    return 'ti-file';
  }
}
