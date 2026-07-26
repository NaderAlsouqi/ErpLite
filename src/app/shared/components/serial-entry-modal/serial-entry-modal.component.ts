import { Component, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { NgSelectModule } from '@ng-select/ng-select';
import { ToastrService } from 'ngx-toastr';
import { SerialsService } from '../../services/serials.service';

export interface SerialEntryRequest {
  /** 'enter' = type new serials (inbound); 'pick' = choose in-stock serials (outbound/damage). */
  mode: 'enter' | 'pick';
  itemNo: string;
  itemName: string;
  store: number | null;
  /** How many serials the line needs (base-unit quantity). */
  requiredCount: number;
  /** Serials already chosen for the line. */
  current: string[];
}

/**
 * Reusable per-line serial-number entry dialog, shared by inbound/outbound/damage.
 * Open it with `open(req)` and await the Promise: resolves to the chosen serials, or
 * `null` if the user cancelled. Self-contained styling so it drops into any voucher page.
 */
@Component({
  selector: 'app-serial-entry-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslateModule, NgSelectModule],
  templateUrl: './serial-entry-modal.component.html',
  styleUrls: ['./serial-entry-modal.component.scss'],
})
export class SerialEntryModalComponent {
  @Output() changed = new EventEmitter<string[]>();

  visible = false;
  mode: 'enter' | 'pick' = 'enter';
  itemNo = '';
  itemName = '';
  store: number | null = null;
  requiredCount = 0;
  serials: string[] = [];
  available: string[] = [];
  loading = false;
  newSerial = '';

  private resolver?: (v: string[] | null) => void;

  constructor(
    private svc: SerialsService,
    private toastr: ToastrService,
    private translate: TranslateService,
  ) {}

  get isPick(): boolean { return this.mode === 'pick'; }
  get remaining(): number { return this.requiredCount - this.serials.length; }
  get countOk(): boolean { return this.serials.length === this.requiredCount; }

  /** Open the dialog for a line; resolves with the chosen serials or null (cancel). */
  open(req: SerialEntryRequest): Promise<string[] | null> {
    this.mode = req.mode;
    this.itemNo = req.itemNo;
    this.itemName = req.itemName;
    this.store = req.store;
    this.requiredCount = Math.max(0, Math.round(req.requiredCount || 0));
    this.serials = [...(req.current || [])];
    this.available = [];
    this.newSerial = '';
    this.visible = true;

    if (req.mode === 'pick' && req.itemNo && req.store) {
      this.loading = true;
      this.svc.available(req.itemNo, req.store).subscribe({
        next: (r) => {
          // Keep already-chosen serials selectable even if the API list is fresh.
          const set = new Set([...(r || []), ...this.serials]);
          this.available = Array.from(set);
          this.loading = false;
        },
        error: () => { this.available = [...this.serials]; this.loading = false; },
      });
    }
    return new Promise<string[] | null>((res) => { this.resolver = res; });
  }

  // ── enter mode ──────────────────────────────────────────────
  addSerial(): void {
    const s = (this.newSerial || '').trim();
    if (!s) return;
    if (this.serials.includes(s)) { this.toastr.warning(this.translate.instant('Serials.Duplicate')); return; }
    if (this.requiredCount && this.serials.length >= this.requiredCount) {
      this.toastr.warning(this.translate.instant('Serials.EnoughEntered', { n: this.requiredCount }));
      return;
    }
    this.serials.push(s);
    this.newSerial = '';
  }
  removeSerial(i: number): void { this.serials.splice(i, 1); }

  // ── close ───────────────────────────────────────────────────
  confirm(): void {
    if (this.requiredCount && this.serials.length !== this.requiredCount) {
      this.toastr.warning(this.translate.instant('Serials.CountMismatch', { have: this.serials.length, need: this.requiredCount }));
      return;
    }
    this.visible = false;
    const out = [...this.serials];
    this.changed.emit(out);
    this.resolver?.(out);
    this.resolver = undefined;
  }

  cancel(): void {
    this.visible = false;
    this.resolver?.(null);
    this.resolver = undefined;
  }
}
