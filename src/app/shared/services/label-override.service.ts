import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { tap, map, catchError } from 'rxjs/operators';
import { TranslateService } from '@ngx-translate/core';
import { environment } from '../../../environments/environment';

export interface LabelOverride {
  Lang: string;
  LabelKey: string;
  LabelValue: string;
}

/**
 * Loads per-tenant label (translation) overrides and merges them on top of the
 * static ar.json / en.json inside ngx-translate, so customized labels apply for
 * every user. Re-applies overrides whenever ngx-translate reloads a language.
 */
@Injectable({ providedIn: 'root' })
export class LabelOverrideService {
  private readonly apiUrl = `${environment.apiUrl}/Labels`;
  private overrides: LabelOverride[] = [];
  private hooked = false;

  constructor(private http: HttpClient, private translate: TranslateService) {}

  /** Fetch overrides once and apply them; keeps them applied across language switches. */
  load(): Observable<LabelOverride[]> {
    return this.http.get<LabelOverride[]>(`${this.apiUrl}/GetAll`).pipe(
      map(list => list || []),
      tap(list => {
        this.overrides = list;
        this.apply();
        if (!this.hooked) {
          this.hooked = true;
          // ngx-translate replaces a language's table when it (re)loads the JSON,
          // wiping our merge — re-apply for the language that just changed.
          this.translate.onLangChange.subscribe(e => this.apply(e.lang));
        }
      }),
      catchError(() => of([] as LabelOverride[])),
    );
  }

  /** Persist a single override and apply it live. Requires Labels.Edit (server-enforced). */
  save(lang: string, key: string, value: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/Save`, { Lang: lang, LabelKey: key, LabelValue: value }).pipe(
      tap(() => {
        const ex = this.overrides.find(o => o.Lang === lang && o.LabelKey === key);
        if (ex) ex.LabelValue = value;
        else this.overrides.push({ Lang: lang, LabelKey: key, LabelValue: value });
        this.translate.setTranslation(lang, this.unflatten([{ key, value }]), true);
      }),
    );
  }

  /** Reset a label to its JSON default. */
  remove(lang: string, key: string): Observable<any> {
    const params = new HttpParams().set('lang', lang).set('labelKey', key);
    return this.http.delete(`${this.apiUrl}/Delete`, { params }).pipe(
      tap(() => { this.overrides = this.overrides.filter(o => !(o.Lang === lang && o.LabelKey === key)); }),
    );
  }

  /** Delete every override and revert all labels to their JSON defaults (live). */
  resetAll(): Observable<any> {
    return this.http.delete(`${this.apiUrl}/ResetAll`).pipe(
      tap(() => {
        this.overrides = [];
        // Re-fetch the JSON and REPLACE the tables (getTranslation, not reloadLang):
        // reloadLang deletes the table first, leaving a window where translate.instant
        // returns raw keys (e.g. the success toast). getTranslation swaps in the fresh
        // JSON in one step — no empty gap, no flash of raw keys.
        this.translate.getTranslation('ar').subscribe();
        this.translate.getTranslation('en').subscribe();
      }),
    );
  }

  /** Merge cached overrides into the given language (or every language present). */
  private apply(lang?: string): void {
    const langs = lang ? [lang] : Array.from(new Set(this.overrides.map(o => o.Lang)));
    for (const lg of langs) {
      const entries = this.overrides
        .filter(o => o.Lang === lg && o.LabelKey)
        .map(o => ({ key: o.LabelKey, value: o.LabelValue ?? '' }));
      if (!entries.length) continue;
      this.translate.setTranslation(lg, this.unflatten(entries), true);
    }
  }

  /** Turn dotted keys ('A.B.C') into a nested object for ngx-translate's deep merge. */
  private unflatten(entries: { key: string; value: string }[]): any {
    const root: any = {};
    for (const { key, value } of entries) {
      const parts = key.split('.');
      let node = root;
      for (let i = 0; i < parts.length - 1; i++) {
        if (typeof node[parts[i]] !== 'object' || node[parts[i]] === null) node[parts[i]] = {};
        node = node[parts[i]];
      }
      node[parts[parts.length - 1]] = value;
    }
    return root;
  }
}
