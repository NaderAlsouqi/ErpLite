import { MissingTranslationHandler, MissingTranslationHandlerParams } from '@ngx-translate/core';

export class CustomMissingTranslationHandler implements MissingTranslationHandler {
  handle(params: MissingTranslationHandlerParams) {
    // Log missing keys in development mode
    if (!environment.production) {
      console.warn(`TRANSLATION MISSING: "${params.key}"`);
    }
    
    // Return the key itself or a formatted version
    return `⚠️ ${params.key}`;
  }
}

// Import environment
import { environment } from '../../../environments/environment';