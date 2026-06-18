import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ToastrService } from 'ngx-toastr';
import { SharedModule } from '../../../shared/common/sharedmodule';
import { HasPermissionDirective } from '../../../shared/directives/has-permission.directive';
import { FotaraDataDto, FotaraSettingsService } from '../../../shared/services/fotara-settings.service';

@Component({
  selector: 'app-fotara-settings',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslateModule, SharedModule, HasPermissionDirective],
  templateUrl: './fotara-settings.component.html',
  styleUrl: './fotara-settings.component.scss'
})
export class FotaraSettingsComponent implements OnInit {
  form: FotaraDataDto = this.emptyForm();
  loading = false;
  saving = false;
  showSecret = false;

  constructor(
    private fotaraSettings: FotaraSettingsService,
    private toastr: ToastrService,
    private translate: TranslateService
  ) {}

  ngOnInit(): void {
    this.load();
  }

  private emptyForm(): FotaraDataDto {
    return {
      id: 0,
      the_tax_number: '',
      the_global_tax_number: '',
      income_source_sequence: '',
      Client_Id: '',
      Secret_Key: '',
      the_company_name: '',
      zip_code: '',
      city_code: ''
    };
  }

  load(): void {
    this.loading = true;
    this.fotaraSettings.get().subscribe({
      next: data => {
        this.form = data && Object.keys(data).length ? data : this.emptyForm();
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

  validate(): boolean {
    if (!this.form.the_tax_number?.trim()) {
      this.toastr.warning(this.translate.instant('FotaraSettings.TaxNumberRequired'));
      return false;
    }
    if (!this.form.the_company_name?.trim()) {
      this.toastr.warning(this.translate.instant('FotaraSettings.CompanyNameRequired'));
      return false;
    }
    if (!this.form.Client_Id?.trim()) {
      this.toastr.warning(this.translate.instant('FotaraSettings.ClientIdRequired'));
      return false;
    }
    if (!this.form.Secret_Key?.trim()) {
      this.toastr.warning(this.translate.instant('FotaraSettings.SecretKeyRequired'));
      return false;
    }
    return true;
  }

  save(): void {
    if (!this.validate()) return;
    this.saving = true;
    this.fotaraSettings.save(this.form).subscribe({
      next: () => {
        this.saving = false;
        this.toastr.success(
          this.translate.instant('FotaraSettings.SaveSuccess'),
          this.translate.instant('General.Success')
        );
        this.load();
      },
      error: (err) => {
        this.saving = false;
        const msg = err.error?.message || err.error?.Message || this.translate.instant('General.Error');
        this.toastr.error(msg, this.translate.instant('General.Error'));
      }
    });
  }
}
