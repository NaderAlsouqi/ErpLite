import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { NgbDropdownModule } from '@ng-bootstrap/ng-bootstrap';
import { ReportFormat } from '../../services/report.service';

/**
 * Reusable export control for report screens. Replaces a single Print button:
 * clicking the main part prints (old behavior); the caret opens a menu to
 * export the SAME report as Excel (.xlsx) or Word (.doc).
 *
 *   <app-report-export [disabled]="!hasResults"
 *                      (formatSelected)="print($event)"></app-report-export>
 *
 * The host's print() takes a ReportFormat and forwards it to
 * ReportService.output(format, title, cols, rows, filters, footer).
 */
@Component({
  selector: 'app-report-export',
  standalone: true,
  imports: [CommonModule, TranslateModule, NgbDropdownModule],
  template: `
    <div ngbDropdown class="btn-group">
      <button type="button" class="btn btn-primary" [disabled]="disabled"
        (click)="formatSelected.emit('print')">
        <i class="ti ti-printer me-1"></i>{{ label | translate }}
      </button>
      <button type="button" class="btn btn-primary dropdown-toggle-split" ngbDropdownToggle
        [disabled]="disabled" aria-label="export menu"></button>
      <div ngbDropdownMenu>
        <button type="button" ngbDropdownItem (click)="formatSelected.emit('print')">
          <i class="ti ti-printer me-2"></i>{{ 'Reports.Print' | translate }}
        </button>
        <button type="button" ngbDropdownItem (click)="formatSelected.emit('excel')">
          <i class="ti ti-file-spreadsheet me-2 text-success"></i>{{ 'Reports.ExportExcel' | translate }}
        </button>
        <button type="button" ngbDropdownItem (click)="formatSelected.emit('word')">
          <i class="ti ti-file-text me-2 text-primary"></i>{{ 'Reports.ExportWord' | translate }}
        </button>
      </div>
    </div>
  `,
})
export class ReportExportComponent {
  /** Label for the main button (defaults to "Print"). */
  @Input() label = 'General.Print';
  @Input() disabled = false;
  @Output() formatSelected = new EventEmitter<ReportFormat>();
}
