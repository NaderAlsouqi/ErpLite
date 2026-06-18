import { ApplicationConfig, APP_INITIALIZER, ErrorHandler, importProvidersFrom } from '@angular/core';
import { provideRouter } from '@angular/router';
import { App_Route} from './app.routes';
import { provideAnimations } from '@angular/platform-browser/animations';
import { ToastrModule } from 'ngx-toastr';
import { MatTableModule } from '@angular/material/table';
import { NgApexchartsModule } from "ng-apexcharts";
import { provideHttpClient, withInterceptors, HttpClient } from '@angular/common/http';
import { ColorPickerModule } from 'ngx-color-picker';
import { FlatpickrModule } from 'angularx-flatpickr';
import { NgbCollapseModule, NgbNavModule } from '@ng-bootstrap/ng-bootstrap';
import { AppStateService } from './shared/services/app-state.service';
import { authInterceptor } from './shared/interceptor/auth.interceptor';
import { activityLogInterceptor } from './shared/interceptor/activity-log.interceptor';
import { TranslateModule, TranslateLoader, TranslateService, MissingTranslationHandler } from '@ngx-translate/core';
import { TranslateHttpLoader } from '@ngx-translate/http-loader';
import { GlobalErrorHandlerService } from './shared/handlers/error-handler.service';
import { CustomMissingTranslationHandler } from './shared/handlers/custom-missing-translation.handler';
import { environment } from '../environments/environment';
import { AuthService } from './shared/services/auth.service';
import { firstValueFrom } from 'rxjs';

// Factory function for TranslateHttpLoader
export function httpTranslateLoaderFactory(http: HttpClient) {
  return new TranslateHttpLoader(http, './assets/i18n/', `.json?v=${environment.appVersion}`);
}

/**
 * Demo mode: when the app is loaded with ?demo=1 (e.g. embedded in the Skyline
 * marketing iframe) and there is no valid session, auto sign-in as the dedicated
 * read-only demo account BEFORE the router/guards run, then land on the dashboard.
 * Without the flag this is a no-op, so normal login is completely unchanged.
 */
export function initDemoFactory(authService: AuthService): () => Promise<void> {
  return async () => {
    const isDemo = new URLSearchParams(window.location.search).get('demo') === '1';
    if (!isDemo) return;                              // normal boot — untouched

    if (!authService.isLoggedIn) {
      try {
        await firstValueFrom(authService.demoLogin());
      } catch {
        return;                                        // fail open → show the login screen
      }
    }

    if (authService.isLoggedIn) {
      // The default '/' route redirects to /auth/login; rewrite the URL so the
      // router lands on the dashboard instead (no routing/login changes needed).
      try { window.history.replaceState({}, '', authService.getHomepageByRole()); } catch { /* noop */ }
    }
  };
}

export function initLanguageFactory(translate: TranslateService): () => Promise<void> {
  return () => {
    const lang = localStorage.getItem('language') || 'ar';
    document.documentElement.setAttribute('dir', lang === 'ar' ? 'rtl' : 'ltr');
    return new Promise(resolve => {
      translate.use(lang).subscribe({ complete: () => resolve() });
    });
  };
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(App_Route),
    provideAnimations(),
    provideHttpClient(
      withInterceptors([authInterceptor, activityLogInterceptor])
    ),
    importProvidersFrom(
      AppStateService,
      ColorPickerModule,
      ToastrModule.forRoot({ positionClass: 'top' }),
      NgbNavModule,
      NgbCollapseModule,
      FlatpickrModule,
      MatTableModule,
      NgApexchartsModule,
      ColorPickerModule,
      // Add TranslateModule with proper configuration
      TranslateModule.forRoot({
        loader: {
          provide: TranslateLoader,
          useFactory: httpTranslateLoaderFactory,
          deps: [HttpClient]
        },
        defaultLanguage: 'ar',
        isolate: false,
        missingTranslationHandler: {
          provide: MissingTranslationHandler,
          useClass: CustomMissingTranslationHandler
        }
      }),
      ToastrModule.forRoot({
        timeOut: 5000,
        positionClass: 'toast-top-right',
        preventDuplicates: true,
        closeButton: true,
        progressBar: true,
        enableHtml: true
      }),
    ),
    {
      provide: APP_INITIALIZER,
      useFactory: initLanguageFactory,
      deps: [TranslateService],
      multi: true
    },
    {
      provide: APP_INITIALIZER,
      useFactory: initDemoFactory,
      deps: [AuthService],
      multi: true
    },
    {
      provide: ErrorHandler,
      useClass: GlobalErrorHandlerService
    }
  ]
};
