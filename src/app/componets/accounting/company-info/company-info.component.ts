import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ToastrService } from 'ngx-toastr';
import { SharedModule } from '../../../shared/common/sharedmodule';
import { CompanyInfoDto, ComfService } from '../../../shared/services/comf.service';
import { CompanySettingsService } from '../../../shared/services/company-settings.service';
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

  constructor(
    private comfService: ComfService,
    private companySettings: CompanySettingsService,
    private toastr: ToastrService,
    private translate: TranslateService
  ) {}

  ngOnInit(): void {
    this.load();
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
}
