import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ToastrModule } from 'ngx-toastr';
import { ColorPickerModule } from 'ngx-color-picker';
import { AppStateService } from './shared/services/app-state.service';
import { AuthService } from './shared/services/auth.service';
import { CompanySettingsService } from './shared/services/company-settings.service';
import { CalculatorService } from './shared/services/calculator.service';
import { Subscription, interval } from 'rxjs';
import { TranslateModule } from '@ngx-translate/core';
import { ChatWidgetComponent } from './shared/components/chat-widget/chat-widget.component';

@Component({
  selector: 'app-root',
  standalone: true,
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
  imports: [RouterOutlet, ToastrModule, ColorPickerModule, TranslateModule, ChatWidgetComponent]
})
export class AppComponent implements OnInit, OnDestroy {
  title = 'ErpLite';

  /** True while the public demo session is active (shows the demo banner). */
  get isDemo(): boolean { return this.authService.isDemoMode; }
  private tokenCheckSubscription?: Subscription;

  constructor(
    private appState: AppStateService,
    private authService: AuthService,
    private companySettings: CompanySettingsService,
    private calculator: CalculatorService,
  ) {
    this.appState.updateState();
  }

  /**
   * F2 opens a calculator on the focused numeric field (نظام ادارة المحاسبة).
   * Scoped to the accounting module so it doesn't fire elsewhere.
   */
  @HostListener('document:keydown', ['$event'])
  onGlobalKeydown(e: KeyboardEvent): void {
    if (e.key !== 'F2') return;
    if (!window.location.pathname.includes('/accounting')) return;

    const el = document.activeElement as HTMLElement | null;
    if (!el || el.tagName !== 'INPUT') return;
    const input = el as HTMLInputElement;
    const type = (input.getAttribute('type') || '').toLowerCase();
    if (type !== 'number') return;

    e.preventDefault();
    this.calculator.open(input);
  }

  ngOnInit(): void {
    // Add this version check on startup
    const currentVersion = '1.0.18';
    const storedVersion = localStorage.getItem('appVersion');

    if (storedVersion !== currentVersion) {
      localStorage.clear();
      sessionStorage.clear();
      localStorage.setItem('appVersion', currentVersion);

      if (storedVersion) {
        window.location.reload();
      }
    }

    // Load company settings once (used by all components for decimals, name, etc.)
    if (this.authService.isLoggedIn) {
      this.companySettings.load().subscribe();
    }

    // Check token validity every minute (skip if already on auth pages)
    this.tokenCheckSubscription = interval(60000).subscribe(() => {
      if (!this.authService.isLoggedIn && !window.location.pathname.includes('/auth/')) {
        this.authService.logout();
      }
    });
  }

  ngOnDestroy(): void {
    if (this.tokenCheckSubscription) {
      this.tokenCheckSubscription.unsubscribe();
    }
  }
}
