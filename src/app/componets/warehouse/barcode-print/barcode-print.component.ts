import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ToastrService } from 'ngx-toastr';
import { NgSelectModule } from '@ng-select/ng-select';
import { ActivatedRoute } from '@angular/router';
import JsBarcode from 'jsbarcode';
import { SharedModule } from '../../../shared/common/sharedmodule';
import { ItemCardService, ItemListRow } from '../../../shared/services/item-card.service';

interface PrintLabel { value: string; name: string; price: string; }

@Component({
  selector: 'app-barcode-print',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslateModule, NgSelectModule, SharedModule],
  templateUrl: './barcode-print.component.html',
  styleUrls: ['./barcode-print.component.scss'],
})
export class BarcodePrintComponent implements OnInit {
  @ViewChild('printArea') printArea!: ElementRef<HTMLElement>;

  items: ItemListRow[] = [];
  loading = false;

  fromItem: string | null = null;
  toItem: string | null = null;
  copies = 1;
  showName = true;
  showPrice = false;

  labels: PrintLabel[] = [];

  constructor(
    private svc: ItemCardService,
    private toastr: ToastrService,
    private translate: TranslateService,
    private route: ActivatedRoute,
  ) {}

  get isAr(): boolean { return this.translate.currentLang === 'ar'; }

  searchFn = (term: string, item: ItemListRow): boolean => {
    term = (term || '').toLowerCase();
    return (item.ItemNo || '').toLowerCase().includes(term)
      || (item.ItemName || '').toLowerCase().includes(term)
      || (item.Ename || '').toLowerCase().includes(term);
  };

  ngOnInit(): void {
    this.loading = true;
    this.svc.list().subscribe({
      next: (r) => {
        this.items = r || [];
        this.loading = false;
        const f = this.route.snapshot.queryParamMap.get('from');
        const t = this.route.snapshot.queryParamMap.get('to');
        if (f) this.fromItem = f;
        if (t) this.toItem = t;
        if (this.fromItem && this.toItem) this.generate();
      },
      error: () => { this.loading = false; }
    });
  }

  /** Build the label set for the chosen item range and render the barcodes. */
  generate(): void {
    if (!this.fromItem || !this.toItem) { this.toastr.warning(this.translate.instant('BarcodePrint.SelectRange')); return; }
    if (!this.copies || this.copies < 1) { this.toastr.warning(this.translate.instant('BarcodePrint.EnterCopies')); return; }

    let lo = this.fromItem, hi = this.toItem;
    if (lo > hi) { const t = lo; lo = hi; hi = t; }

    const labels: PrintLabel[] = [];
    for (const it of this.items) {
      const code = it.ItemNo || '';
      if (code < lo || code > hi) continue;
      const value = (it.Barcode && it.Barcode.trim()) ? it.Barcode.trim() : code;
      if (!value) continue;
      const name = this.isAr ? (it.ItemName || '') : (it.Ename || it.ItemName || '');
      const price = (it.Price != null) ? ('JD ' + Number(it.Price).toFixed(3)) : '';
      for (let c = 0; c < this.copies; c++) labels.push({ value, name, price });
    }
    if (!labels.length) { this.labels = []; this.toastr.warning(this.translate.instant('BarcodePrint.NoData')); return; }
    this.labels = labels;
    setTimeout(() => this.renderBarcodes(), 0);
  }

  private renderBarcodes(): void {
    const svgs = this.printArea?.nativeElement.querySelectorAll('svg.label-bc');
    svgs?.forEach((el: any) => {
      try {
        JsBarcode(el, el.getAttribute('data-value') || '', {
          format: 'CODE128', displayValue: true, fontSize: 11, height: 38, width: 1.4, margin: 2,
        });
      } catch { /* invalid value for the symbology — skip */ }
    });
  }

  /** Open an isolated window with just the labels and print it. */
  print(): void {
    if (!this.labels.length) { this.generate(); }
    if (!this.labels.length || !this.printArea) return;
    setTimeout(() => {
      const html = this.printArea.nativeElement.innerHTML;
      const w = window.open('', '_blank', 'width=900,height=700');
      if (!w) { window.print(); return; }
      w.document.write(
        '<html><head><title>Barcodes</title><style>' +
        '@page{margin:6mm} body{margin:0;font-family:Tahoma,Arial,sans-serif;direction:rtl}' +
        '.labels{display:flex;flex-wrap:wrap;gap:4px}' +
        '.label{width:48mm;border:1px solid #ccc;border-radius:4px;padding:3px 4px;text-align:center;page-break-inside:avoid;display:flex;flex-direction:column;align-items:center}' +
        '.label .nm{font-size:10px;font-weight:600;white-space:nowrap;overflow:hidden;max-width:100%}' +
        '.label .pr{font-size:11px;font-weight:700}' +
        '.label svg{max-width:100%}' +
        '</style></head><body><div class="labels">' + html + '</div></body></html>'
      );
      w.document.close();
      w.focus();
      setTimeout(() => { w.print(); w.close(); }, 350);
    }, 60);
  }

  clear(): void { this.labels = []; }
}
