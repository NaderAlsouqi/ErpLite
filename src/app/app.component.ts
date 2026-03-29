import { Component, OnInit, OnDestroy } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ToastrModule } from 'ngx-toastr';
import { ColorPickerModule } from 'ngx-color-picker';
import { AppStateService } from './shared/services/app-state.service';
import { AuthService } from './shared/services/auth.service';
import { Subscription, interval } from 'rxjs';

@Component({
  selector: 'app-root',
  standalone: true,
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
  imports: [RouterOutlet, ToastrModule, ColorPickerModule]
})
export class AppComponent implements OnInit, OnDestroy {
  title = 'ErpLite';
  private tokenCheckSubscription?: Subscription;

  constructor(
    private appState: AppStateService,
    private authService: AuthService,
  ) {
    this.appState.updateState();
  }

  ngOnInit(): void {
    // Add this version check on startup
    const currentVersion = '1.0.5';
    const storedVersion = localStorage.getItem('appVersion');

    if (storedVersion !== currentVersion) {
      localStorage.clear();
      sessionStorage.clear();
      localStorage.setItem('appVersion', currentVersion);

      if (storedVersion) {
        window.location.reload();
      }
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
