import { Component, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ToastrService } from 'ngx-toastr';
import { SharedModule } from '../../../shared/common/sharedmodule';
import { AppStateService } from '../../../shared/services/app-state.service';
import { AuthService } from '../../../shared/services/auth.service';
import { LabelOverrideService } from '../../../shared/services/label-override.service';
import { ConfirmationModalComponent } from '../../../shared/common/confirmation-modal/confirmation-modal.component';

@Component({
  selector: 'app-appearance',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslateModule, SharedModule, ConfirmationModalComponent],
  templateUrl: './appearance.component.html',
  styleUrl: './appearance.component.scss',
})
export class AppearanceComponent {
  @ViewChild('resetLabelsModal') resetLabelsModal!: ConfirmationModalComponent;

  appTheme: string = 'classic';
  colorMode: string = 'light';
  boldLabels: boolean = false;
  resettingLabels = false;

  constructor(
    private appState: AppStateService,
    private auth: AuthService,
    private labelOverrides: LabelOverrideService,
    private toastr: ToastrService,
    private translate: TranslateService,
  ) {
    this.appState.state$.subscribe(s => {
      this.appTheme = s?.appTheme || 'classic';
      this.colorMode = s?.theme || 'light';
      this.boldLabels = !!s?.boldLabels;
    });
  }

  /** The reset-labels card is only shown to users allowed to edit labels. */
  get canEditLabels(): boolean { return this.auth.hasPermission('Labels.Edit'); }

  askResetLabels(): void { this.resetLabelsModal.show(); }

  confirmResetLabels(): void {
    this.resettingLabels = true;
    // Resolve the message BEFORE the reset re-fetches translations, so the toast
    // never shows the raw key mid-reload.
    const successMsg = this.translate.instant('Appearance.LabelsReset');
    this.labelOverrides.resetAll().subscribe({
      next: () => {
        this.resettingLabels = false;
        this.toastr.success(successMsg);
      },
      error: (err) => {
        this.resettingLabels = false;
        this.toastr.error(err?.error?.message || this.translate.instant('General.Error'));
      },
    });
  }

  setAppTheme(t: string) {
    this.appTheme = t;
    this.appState.updateState({ appTheme: t });
  }

  setColorMode(m: string) {
    this.colorMode = m;
    this.appState.updateState({ theme: m, menuColor: m, headerColor: m });
  }

  setBoldLabels(v: boolean) {
    this.boldLabels = v;
    this.appState.updateState({ boldLabels: v });
  }
}
