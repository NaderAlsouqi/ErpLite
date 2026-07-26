import { Component, OnInit, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ToastrService } from 'ngx-toastr';
import { SharedModule } from '../../../shared/common/sharedmodule';
import { HasPermissionDirective } from '../../../shared/directives/has-permission.directive';
import {
  ReportPrintSettingsService, ReportPrintSettings, DEFAULT_PRINT_SETTINGS,
} from '../../../shared/services/report-print-settings.service';

@Component({
  selector: 'app-report-print-settings',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslateModule, SharedModule, HasPermissionDirective],
  templateUrl: './report-print-settings.component.html',
  styleUrl: './report-print-settings.component.scss',
  encapsulation: ViewEncapsulation.None,
})
export class ReportPrintSettingsComponent implements OnInit {

  form: ReportPrintSettings = { ...DEFAULT_PRINT_SETTINGS };
  loading = false;
  saving = false;

  fontOptions = [
    { value: 'Segoe UI, Tahoma, Geneva, Verdana, sans-serif', label: 'Segoe UI' },
    { value: 'Almarai, sans-serif', label: 'Almarai' },
    { value: 'Cairo, sans-serif', label: 'Cairo' },
    { value: 'Tahoma, Arial, sans-serif', label: 'Tahoma' },
    { value: 'Arial, Helvetica, sans-serif', label: 'Arial' },
    { value: '"Times New Roman", serif', label: 'Times New Roman' },
  ];

  constructor(
    private svc: ReportPrintSettingsService,
    private translate: TranslateService,
    private toastr: ToastrService,
  ) {}

  get isAr(): boolean { return this.translate.currentLang === 'ar'; }
  get previewDir(): string { return this.isAr ? 'rtl' : 'ltr'; }
  get previewAlign(): string { return this.isAr ? 'right' : 'left'; }

  ngOnInit(): void {
    this.loading = true;
    this.svc.get().subscribe({
      next: s => { this.form = s; this.loading = false; },
      error: () => { this.form = { ...DEFAULT_PRINT_SETTINGS }; this.loading = false; },
    });
  }

  resetDefaults(): void { this.form = { ...DEFAULT_PRINT_SETTINGS }; }

  save(): void {
    this.saving = true;
    this.svc.save(this.form).subscribe({
      next: () => { this.saving = false; this.toastr.success(this.translate.instant('ReportPrintSettings.SaveSuccess')); },
      error: (err) => { this.saving = false; this.toastr.error(err.error?.message || this.translate.instant('General.Error')); },
    });
  }
}
