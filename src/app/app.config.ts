import { ApplicationConfig, ErrorHandler, importProvidersFrom } from '@angular/core';
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
import { TranslateModule, TranslateLoader, MissingTranslationHandler } from '@ngx-translate/core';
import { TranslateHttpLoader } from '@ngx-translate/http-loader';
import { GlobalErrorHandlerService } from './shared/handlers/error-handler.service';
import { CustomMissingTranslationHandler } from './shared/handlers/custom-missing-translation.handler';

// Factory function for TranslateHttpLoader
export function httpTranslateLoaderFactory(http: HttpClient) {
  return new TranslateHttpLoader(http, './assets/i18n/', '.json');
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(App_Route),
    provideAnimations(),
    provideHttpClient(
      withInterceptors([authInterceptor])
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
        defaultLanguage: 'en',
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
      provide: ErrorHandler,
      useClass: GlobalErrorHandlerService
    }
  ]
};