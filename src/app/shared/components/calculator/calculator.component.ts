import {
  Component,
  ElementRef,
  EventEmitter,
  HostListener,
  Input,
  Output,
  ViewChild,
  AfterViewInit,
  ViewEncapsulation,
} from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * Floating calculator panel. Opened (via CalculatorService) on F2 while a
 * numeric input is focused anywhere under نظام ادارة المحاسبة.
 *
 *  • Buttons or the physical keyboard drive the expression.
 *  • `=` evaluates and keeps the panel open (chain further math).
 *  • Enter / "OK" evaluates and applies the result back to the field, then closes.
 *  • Esc / backdrop closes without applying.
 */
@Component({
  selector: 'app-calculator',
  standalone: true,
  imports: [CommonModule],
  encapsulation: ViewEncapsulation.None,
  template: `
    <div #panel class="calc-panel" tabindex="0">
      <div class="calc-display">
        <div class="calc-expr">{{ expr || '0' }}</div>
        <div class="calc-result" *ngIf="preview !== null">= {{ preview }}</div>
      </div>

      <div class="calc-grid">
        <button type="button" class="calc-btn fn" (click)="clear()">C</button>
        <button type="button" class="calc-btn fn" (click)="backspace()">⌫</button>
        <button type="button" class="calc-btn op" (click)="push('%')">%</button>
        <button type="button" class="calc-btn op" (click)="push('/')">÷</button>

        <button type="button" class="calc-btn" (click)="push('7')">7</button>
        <button type="button" class="calc-btn" (click)="push('8')">8</button>
        <button type="button" class="calc-btn" (click)="push('9')">9</button>
        <button type="button" class="calc-btn op" (click)="push('*')">×</button>

        <button type="button" class="calc-btn" (click)="push('4')">4</button>
        <button type="button" class="calc-btn" (click)="push('5')">5</button>
        <button type="button" class="calc-btn" (click)="push('6')">6</button>
        <button type="button" class="calc-btn op" (click)="push('-')">−</button>

        <button type="button" class="calc-btn" (click)="push('1')">1</button>
        <button type="button" class="calc-btn" (click)="push('2')">2</button>
        <button type="button" class="calc-btn" (click)="push('3')">3</button>
        <button type="button" class="calc-btn op" (click)="push('+')">+</button>

        <button type="button" class="calc-btn zero" (click)="push('0')">0</button>
        <button type="button" class="calc-btn" (click)="push('.')">.</button>
        <button type="button" class="calc-btn eq" (click)="equals()">=</button>
      </div>

      <button type="button" class="calc-apply" (click)="apply()">
        {{ applyLabel }}
      </button>
    </div>
  `,
  styles: [`
    .calc-panel {
      width: 260px;
      background: var(--custom-white, #fff);
      color: var(--default-text-color, #1e293b);
      border: 1px solid var(--default-border, #e2e8f0);
      border-radius: 14px;
      box-shadow: 0 18px 48px rgba(15, 23, 42, .28);
      padding: 12px;
      outline: none;
      user-select: none;
      font-family: 'Segoe UI', system-ui, sans-serif;
    }
    .calc-display {
      background: var(--default-background, #f8fafc);
      border-radius: 10px;
      padding: 10px 12px;
      margin-bottom: 10px;
      min-height: 56px;
      text-align: end;
      overflow: hidden;
    }
    .calc-expr {
      font-size: 1.35rem;
      font-weight: 700;
      line-height: 1.2;
      word-break: break-all;
    }
    .calc-result {
      font-size: .85rem;
      color: var(--primary-color, #4f46e5);
      font-weight: 600;
      margin-top: 2px;
    }
    .calc-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 7px;
    }
    .calc-btn {
      border: 0;
      border-radius: 10px;
      padding: 11px 0;
      font-size: 1.05rem;
      font-weight: 600;
      cursor: pointer;
      background: var(--default-background, #f1f5f9);
      color: var(--default-text-color, #1e293b);
      transition: filter .12s ease, transform .04s ease;
    }
    .calc-btn:hover { filter: brightness(.94); }
    .calc-btn:active { transform: scale(.96); }
    .calc-btn.op  { background: rgba(var(--primary-rgb, 79,70,229), .12); color: var(--primary-color, #4f46e5); }
    .calc-btn.fn  { background: rgba(220, 38, 38, .10); color: #dc2626; }
    .calc-btn.eq  { background: var(--primary-color, #4f46e5); color: #fff; }
    .calc-btn.zero { grid-column: span 1; }
    .calc-apply {
      width: 100%;
      margin-top: 9px;
      border: 0;
      border-radius: 10px;
      padding: 10px 0;
      font-weight: 700;
      cursor: pointer;
      background: var(--primary-color, #4f46e5);
      color: #fff;
    }
    .calc-apply:hover { filter: brightness(1.05); }

    [data-theme-mode="dark"] .calc-panel {
      background: var(--custom-white, #1c1f2b);
      border-color: rgba(255,255,255,.10);
    }
  `],
})
export class CalculatorComponent implements AfterViewInit {
  /** Seed value taken from the field when the panel opens. */
  @Input() set initial(v: string) {
    this._initial = v ?? '';
    this.expr = this._initial;
    this.recalcPreview();
  }
  @Input() applyLabel = 'OK';

  /** Emitted with the final numeric result (as string) when applied. */
  @Output() applied = new EventEmitter<string>();
  @Output() closed  = new EventEmitter<void>();

  @ViewChild('panel') panelRef!: ElementRef<HTMLDivElement>;

  expr = '';
  preview: string | null = null;
  private _initial = '';

  ngAfterViewInit(): void {
    // Focus the panel so it receives the keyboard immediately.
    setTimeout(() => this.panelRef?.nativeElement?.focus(), 0);
  }

  push(ch: string): void {
    if ('+-*/%.'.includes(ch)) {
      // Avoid two operators in a row (allow replacing the last one).
      const last = this.expr.slice(-1);
      if (this.expr === '' && ch !== '-' && ch !== '.') return;
      if ('+-*/%'.includes(last) && '+-*/%'.includes(ch)) {
        this.expr = this.expr.slice(0, -1) + ch;
        this.recalcPreview();
        return;
      }
    }
    this.expr += ch;
    this.recalcPreview();
  }

  clear(): void { this.expr = ''; this.preview = null; }

  backspace(): void { this.expr = this.expr.slice(0, -1); this.recalcPreview(); }

  /** Evaluate but keep the panel open, replacing the expression with the result. */
  equals(): void {
    const r = this.compute(this.expr);
    if (r !== null) { this.expr = this.format(r); this.preview = null; }
  }

  /** Evaluate and send the result back to the field, then close. */
  apply(): void {
    const r = this.compute(this.expr);
    this.applied.emit(r !== null ? this.format(r) : (this._initial || '0'));
  }

  close(): void { this.closed.emit(); }

  private recalcPreview(): void {
    const r = this.compute(this.expr);
    // Only show a preview when the expression actually contains an operator.
    this.preview = (r !== null && /[+\-*/%]/.test(this.expr.slice(1))) ? this.format(r) : null;
  }

  private format(n: number): string {
    // Trim float noise, keep up to 6 decimals.
    return String(parseFloat(n.toFixed(6)));
  }

  /** Safe expression evaluator (shunting-yard, no eval). */
  private compute(raw: string): number | null {
    if (!raw) return null;
    // % → divide by 100 as a postfix on the preceding number.
    let expr = raw.replace(/(\d+\.?\d*)%/g, '($1/100)');
    const tokens = expr.match(/(\d+\.?\d*|\.\d+|[+\-*/()])/g);
    if (!tokens) return null;

    const prec: Record<string, number> = { '+': 1, '-': 1, '*': 2, '/': 2 };
    const out: string[] = [];
    const ops: string[] = [];
    let prev = '';

    for (const tk of tokens) {
      if (/[\d.]/.test(tk[0])) {
        out.push(tk);
      } else if (tk in prec) {
        // Unary minus/plus at start or after another operator / '('.
        if ((tk === '-' || tk === '+') && (prev === '' || prev in prec || prev === '(')) {
          out.push('0');
        }
        while (ops.length && ops[ops.length - 1] in prec &&
               prec[ops[ops.length - 1]] >= prec[tk]) {
          out.push(ops.pop()!);
        }
        ops.push(tk);
      } else if (tk === '(') {
        ops.push(tk);
      } else if (tk === ')') {
        while (ops.length && ops[ops.length - 1] !== '(') out.push(ops.pop()!);
        ops.pop();
      }
      prev = tk;
    }
    while (ops.length) out.push(ops.pop()!);

    const st: number[] = [];
    for (const tk of out) {
      if (tk in prec) {
        const b = st.pop(); const a = st.pop();
        if (a === undefined || b === undefined) return null;
        st.push(tk === '+' ? a + b : tk === '-' ? a - b : tk === '*' ? a * b : a / b);
      } else {
        st.push(parseFloat(tk));
      }
    }
    const r = st.pop();
    return (st.length === 0 && r !== undefined && isFinite(r)) ? r : null;
  }

  // ─── Keyboard while the panel is open ───────────────────────────────────
  @HostListener('keydown', ['$event'])
  onKey(e: KeyboardEvent): void {
    const k = e.key;
    if (/^[0-9]$/.test(k))       { this.push(k); }
    else if (k === '.')          { this.push('.'); }
    else if (k === '+' || k === '-' || k === '*' || k === '/') { this.push(k); }
    else if (k === '%')          { this.push('%'); }
    else if (k === 'Enter' || k === '=') {
      if (k === '=') { this.equals(); } else { this.apply(); }
    }
    else if (k === 'Backspace')  { this.backspace(); }
    else if (k === 'Escape')     { this.close(); }
    else if (k === 'Delete')     { this.clear(); }
    else { return; }
    e.preventDefault();
    e.stopPropagation();
  }
}
