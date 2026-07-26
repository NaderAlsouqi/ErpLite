import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ToastrService } from 'ngx-toastr';
import { SharedModule } from '../../../shared/common/sharedmodule';
import { CompanyInfoDto, ComfService } from '../../../shared/services/comf.service';
import { CompanySettingsService } from '../../../shared/services/company-settings.service';
import { CompanyLogoService } from '../../../shared/services/company-logo.service';
import { HasPermissionDirective } from '../../../shared/directives/has-permission.directive';

@Component({
  selector: 'app-company-info',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslateModule, SharedModule, HasPermissionDirective],
  templateUrl: './company-info.component.html',
  styleUrl: './company-info.component.scss'
})
export class CompanyInfoComponent implements OnInit {
  form: CompanyInfoDto = this.emptyForm();
  loading = false;
  saving = false;

  // Company profile image / logo
  logoUrl: string | null = null;   // data URL used for the preview
  logoSaving = false;
  private readonly maxLogoBytes = 3 * 1024 * 1024; // 3 MB

  constructor(
    private comfService: ComfService,
    private companySettings: CompanySettingsService,
    private companyLogo: CompanyLogoService,
    private toastr: ToastrService,
    private translate: TranslateService
  ) {}

  ngOnInit(): void {
    this.load();
    this.loadLogo();
  }

  private emptyForm(): CompanyInfoDto {
    return {
      name: '',
      eName: '',
      address: '',
      tel: '',
      fax: '',
      bbd: '',
      cur: '',
      taxNum: '',
      decimals: 3,
      compYear: new Date().getFullYear(),
      compNo: 1,
      billDecimals: 3,
      compName: '',
      billTaxType: 0,
      autoSireal: true,
      alowItem: false,
      alowDateMoreThanToday: false,
      alowMultiCCnter: false,
      allowTax: true,
      allowCostCloseM: false,
      allowAutoSerialInvf: false,
      hiddenCurrency: false,
      enableAccfAuto: false
    };
  }

  load(): void {
    this.loading = true;
    this.comfService.getCompanyInfo().subscribe({
      next: data => {
        this.form = data;
        // Ensure bbd is in YYYY-MM-DD format for date input
        if (this.form.bbd) {
          const d = new Date(this.form.bbd);
          if (!isNaN(d.getTime())) {
            this.form.bbd = d.toISOString().substring(0, 10);
          }
        }
        this.loading = false;
      },
      error: (err) => {
        this.form = this.emptyForm();
        this.loading = false;
        const msg = err.error?.message || err.error?.Message || this.translate.instant('General.Error');
        this.toastr.error(msg, this.translate.instant('General.Error'));
      }
    });
  }

  // Inverted binding for "المؤسسة غير ضريبية" (non-taxable = !allowTax)
  get notTaxable(): boolean { return !this.form.allowTax; }
  set notTaxable(v: boolean) { this.form.allowTax = !v; }

  // Inverted binding for "السماح بالتعديل على تسلسلات الفواتير" (allow manual = !autoSireal)
  get allowSerialModification(): boolean { return !this.form.autoSireal; }
  set allowSerialModification(v: boolean) { this.form.autoSireal = !v; }

  validate(): boolean {
    if (!this.form.name?.trim()) {
      this.toastr.warning(this.translate.instant('CompanyInfo.NameRequired'));
      return false;
    }
    if (!this.form.bbd) {
      this.toastr.warning(this.translate.instant('CompanyInfo.DateRequired'));
      return false;
    }
    if (!this.form.decimals || this.form.decimals <= 0) {
      this.toastr.warning(this.translate.instant('CompanyInfo.DecimalsRequired'));
      return false;
    }
    return true;
  }

  save(): void {
    if (!this.validate()) return;
    this.saving = true;
    this.comfService.saveCompanyInfo(this.form).subscribe({
      next: () => {
        this.saving = false;
        this.companySettings.load().subscribe();
        this.toastr.success(
          this.translate.instant('CompanyInfo.SaveSuccess'),
          this.translate.instant('General.Success')
        );
      },
      error: (err) => {
        this.saving = false;
        const msg = err.error?.message || err.error?.Message || this.translate.instant('General.Error');
        this.toastr.error(msg, this.translate.instant('General.Error'));
      }
    });
  }

  // ── Company profile image / logo ──────────────────────────────
  private loadLogo(): void {
    this.comfService.getCompanyLogo().subscribe({
      next: data => {
        this.logoUrl = data?.imageBase64
          ? `data:${data.contentType || 'image/png'};base64,${data.imageBase64}`
          : null;
      },
      error: () => { this.logoUrl = null; }
    });
  }

  onLogoSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files && input.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      this.toastr.warning(this.translate.instant('CompanyInfo.LogoInvalidType'));
      input.value = '';
      return;
    }
    if (file.size > this.maxLogoBytes) {
      this.toastr.warning(this.translate.instant('CompanyInfo.LogoTooLarge'));
      input.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;          // "data:<type>;base64,<data>"
      const base64 = dataUrl.substring(dataUrl.indexOf(',') + 1);
      this.uploadLogo(base64, file.type, dataUrl);
      input.value = '';
    };
    reader.readAsDataURL(file);
  }

  private uploadLogo(base64: string, contentType: string, previewUrl: string): void {
    this.logoSaving = true;
    const previous = this.logoUrl;
    this.logoUrl = previewUrl; // optimistic preview
    this.comfService.saveCompanyLogo({ imageBase64: base64, contentType }).subscribe({
      next: () => {
        this.logoSaving = false;
        this.companyLogo.set(previewUrl); // live-update sidebar avatar
        this.toastr.success(
          this.translate.instant('CompanyInfo.LogoSaved'),
          this.translate.instant('General.Success')
        );
      },
      error: (err) => {
        this.logoSaving = false;
        this.logoUrl = previous; // revert on failure
        const msg = err.error?.message || err.error?.Message || this.translate.instant('General.Error');
        this.toastr.error(msg, this.translate.instant('General.Error'));
      }
    });
  }

  removeLogo(): void {
    if (!this.logoUrl) return;
    this.logoSaving = true;
    this.comfService.deleteCompanyLogo().subscribe({
      next: () => {
        this.logoSaving = false;
        this.logoUrl = null;
        this.companyLogo.clear(); // live-update sidebar avatar
        this.toastr.success(
          this.translate.instant('CompanyInfo.LogoRemoved'),
          this.translate.instant('General.Success')
        );
      },
      error: (err) => {
        this.logoSaving = false;
        const msg = err.error?.message || err.error?.Message || this.translate.instant('General.Error');
        this.toastr.error(msg, this.translate.instant('General.Error'));
      }
    });
  }
}
