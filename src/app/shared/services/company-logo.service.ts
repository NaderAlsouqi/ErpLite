import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { ComfService } from './comf.service';

/**
 * Caches the company profile image (logo) as a ready-to-use data URL and shares it
 * across the app (sidebar avatar, etc.). Updated live when the logo is changed on
 * the company-info page so consumers reflect the new image without a reload.
 */
@Injectable({ providedIn: 'root' })
export class CompanyLogoService {
  private readonly _logoUrl = new BehaviorSubject<string | null>(null);
  readonly logoUrl$ = this._logoUrl.asObservable();
  private loaded = false;

  constructor(private comf: ComfService) {}

  get current(): string | null {
    return this._logoUrl.value;
  }

  /** Fetch the logo once (no-op if already loaded, unless forced). */
  load(force = false): void {
    if (this.loaded && !force) return;
    this.loaded = true;
    this.comf.getCompanyLogo().subscribe({
      next: data => this._logoUrl.next(this.toDataUrl(data?.imageBase64, data?.contentType)),
      error: () => this._logoUrl.next(null)
    });
  }

  /** Push a new logo (or null) into the shared stream. */
  set(dataUrl: string | null): void {
    this.loaded = true;
    this._logoUrl.next(dataUrl);
  }

  clear(): void {
    this._logoUrl.next(null);
  }

  private toDataUrl(base64?: string | null, contentType?: string | null): string | null {
    return base64 ? `data:${contentType || 'image/png'};base64,${base64}` : null;
  }
}
