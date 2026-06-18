import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { SharedModule } from '../../../shared/common/sharedmodule';
import { AppStateService } from '../../../shared/services/app-state.service';

@Component({
  selector: 'app-appearance',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslateModule, SharedModule],
  templateUrl: './appearance.component.html',
  styleUrl: './appearance.component.scss',
})
export class AppearanceComponent {
  appTheme: string = 'classic';
  colorMode: string = 'light';

  constructor(private appState: AppStateService) {
    this.appState.state$.subscribe(s => {
      this.appTheme = s?.appTheme || 'classic';
      this.colorMode = s?.theme || 'light';
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
}
