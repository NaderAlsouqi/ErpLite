import { Injectable } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { ToastrService } from 'ngx-toastr';
import { forkJoin } from 'rxjs';
import { AuthService } from './auth.service';
import { LabelOverrideService } from './label-override.service';

/**
 * Inline label editor. When the user has the Labels.Edit permission, double-clicking
 * any translated label reverse-maps its text to the i18n key(s) and lets them edit it
 * in place; saving persists the override (system-wide) and updates the label live.
 */
@Injectable({ providedIn: 'root' })
export class LabelEditService {
  private started = false;
  private editing: HTMLInputElement | null = null;
  private readonly PERM = 'Labels.Edit';

  constructor(
    private translate: TranslateService,
    private overrides: LabelOverrideService,
    private auth: AuthService,
    private toastr: ToastrService,
  ) {}

  /** Attach the double-click editor once, only for permitted users. */
  init(): void {
    if (this.started || !this.auth.hasPermission(this.PERM)) return;
    this.started = true;
    document.addEventListener('dblclick', this.onDblClick, true);
    document.body.classList.add('label-edit-enabled');
  }

  private onDblClick = (ev: MouseEvent): void => {
    if (this.editing) return;
    const el = ev.target as HTMLElement | null;
    if (!el || el.nodeType !== 1) return;
    if (el.closest('.label-edit-input')) return;
    // don't hijack real inputs / editable areas
    const tag = el.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || (el as any).isContentEditable) return;

    const lang = this.translate.currentLang || this.translate.defaultLang || 'ar';
    const match = this.findLabel(el, lang);
    if (!match) return; // not a translated label — leave normal double-click behaviour

    ev.preventDefault();
    ev.stopPropagation();
    window.getSelection()?.removeAllRanges();
    this.openEditor(el, match.text, lang, match.keys);
  };

  /**
   * Resolve the translation key(s) for the double-clicked label. Tries, most
   * specific first: the element's own text nodes (so an icon or a required "*"
   * in a sibling span is ignored), the whole element text, then the selected
   * word — each also with trailing/leading markers (* : ：) stripped.
   */
  private findLabel(el: HTMLElement, lang: string): { text: string; keys: string[] } | null {
    const sources = [this.directText(el), this.norm(el.textContent), this.norm(window.getSelection()?.toString())];
    const tried = new Set<string>();
    for (const src of sources) {
      for (const cand of this.variants(src)) {
        if (!cand || tried.has(cand)) continue;
        tried.add(cand);
        const keys = this.reverseLookup(lang, cand);
        if (keys.length) return { text: cand, keys };
      }
    }
    return null;
  }

  /** Concatenate only the element's immediate text nodes (skips icons / asterisk spans). */
  private directText(el: HTMLElement): string {
    let s = '';
    el.childNodes.forEach(n => { if (n.nodeType === 3) s += n.nodeValue || ''; });
    return this.norm(s);
  }

  /** A string plus a copy with surrounding required/colon markers removed. */
  private variants(s: string): string[] {
    if (!s) return [];
    const out = [s];
    const stripped = s.replace(/^[\s*:：]+/, '').replace(/[\s*:：]+$/, '').trim();
    if (stripped && stripped !== s) out.push(stripped);
    return out;
  }

  private openEditor(el: HTMLElement, text: string, lang: string, keys: string[]): void {
    const rect = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'label-edit-input';
    input.value = text;
    input.dir = cs.direction || 'rtl';
    Object.assign(input.style, {
      position: 'fixed',
      left: `${Math.max(4, rect.left - 4)}px`,
      top: `${Math.max(4, rect.top - 2)}px`,
      minWidth: `${Math.max(140, rect.width + 12)}px`,
      height: `${Math.max(28, rect.height + 4)}px`,
      font: cs.font || `${cs.fontSize} ${cs.fontFamily}`,
      padding: '2px 6px',
      border: '2px solid #4b49ac',
      borderRadius: '5px',
      background: '#fff',
      color: '#111',
      boxShadow: '0 3px 12px rgba(0,0,0,.25)',
      zIndex: '2147483647',
      boxSizing: 'border-box',
    });

    document.body.appendChild(input);
    this.editing = input;
    input.focus();
    input.select();

    let done = false;
    const cleanup = () => { done = true; input.remove(); this.editing = null; };
    const commit = () => {
      if (done) return;
      const val = input.value.trim();
      cleanup();
      if (val && val !== text) this.persist(lang, keys, val);
    };

    input.addEventListener('keydown', (e: KeyboardEvent) => {
      if (e.key === 'Enter') { e.preventDefault(); commit(); }
      else if (e.key === 'Escape') { e.preventDefault(); cleanup(); }
    });
    input.addEventListener('blur', () => commit());
  }

  private persist(lang: string, keys: string[], value: string): void {
    forkJoin(keys.map(k => this.overrides.save(lang, k, value))).subscribe({
      next: () => {
        const msg = this.translate.instant('LabelEdit.Saved')
          + (keys.length > 1 ? ` (${keys.length})` : '');
        this.toastr.success(msg);
      },
      error: (err) => {
        const m = err?.status === 403
          ? this.translate.instant('LabelEdit.NoPermission')
          : (err?.error?.message || this.translate.instant('General.Error'));
        this.toastr.error(m);
      },
    });
  }

  /** Find every translation key whose current value equals the clicked text. */
  private reverseLookup(lang: string, text: string): string[] {
    const table = (this.translate as any).translations?.[lang];
    if (!table) return [];
    const out: string[] = [];
    this.walk(table, '', text, out);
    return out;
  }

  private walk(node: any, prefix: string, target: string, out: string[]): void {
    for (const k of Object.keys(node)) {
      const v = node[k];
      const key = prefix ? `${prefix}.${k}` : k;
      if (typeof v === 'string') {
        if (this.norm(v) === target) out.push(key);
      } else if (v && typeof v === 'object') {
        this.walk(v, key, target, out);
      }
    }
  }

  private norm(s: string | null | undefined): string {
    return (s ?? '').replace(/\s+/g, ' ').trim();
  }
}
