import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ToastrService } from 'ngx-toastr';
import { NgSelectModule } from '@ng-select/ng-select';
import { Subject, of } from 'rxjs';
import { debounceTime, distinctUntilChanged, switchMap, catchError } from 'rxjs/operators';
import { ActivatedRoute } from '@angular/router';
import { SharedModule } from '../../../shared/common/sharedmodule';
import { HasPermissionDirective } from '../../../shared/directives/has-permission.directive';
import {
  ItemBarcodeService, ItemLookup, ItemUnit
} from '../../../shared/services/item-barcode.service';

interface BarcodeRow {
  Barcode: string;
  Old: number;       // 1 = primary (read-only)
  isNew: boolean;
}

@Component({
  selector: 'app-item-barcode',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslateModule, SharedModule, NgSelectModule, HasPermissionDirective],
  templateUrl: './item-barcode.component.html',
  styleUrl: './item-barcode.component.scss',
})
export class ItemBarcodeComponent implements OnInit {
  // item picker (server typeahead)
  items: ItemLookup[] = [];
  itemsLoading = false;
  itemInput$ = new Subject<string>();
  itemNo: string | null = null;
  selectedItem: ItemLookup | null = null;

  // units
  units: ItemUnit[] = [];
  unitNo: number | null = null;
  selectedUnit: ItemUnit | null = null;

  rows: BarcodeRow[] = [];
  loading = false;
  saving = false;

  get isAr(): boolean { return this.translate.currentLang === 'ar'; }

  constructor(
    private service: ItemBarcodeService,
    private toastr: ToastrService,
    private translate: TranslateService,
    private route: ActivatedRoute,
  ) {}

  ngOnInit(): void {
    // if opened from the item card with ?item=<code>, preselect that item
    const pre = this.route.snapshot.queryParamMap.get('item');
    if (pre) {
      this.service.searchItems(pre).subscribe({
        next: (r) => {
          this.items = r;
          const found = r.find(x => x.ItemNo === pre) || (r.length ? r[0] : null);
          if (found) { this.itemNo = found.ItemNo; this.onItemChange(found); }
        }, error: () => {}
      });
    } else {
      // initial item list (top 50)
      this.service.searchItems('').subscribe({ next: (r) => this.items = r, error: () => {} });
    }
    // typeahead search
    this.itemInput$.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      switchMap(term => {
        this.itemsLoading = true;
        return this.service.searchItems(term || '').pipe(catchError(() => of([] as ItemLookup[])));
      })
    ).subscribe((res) => { this.items = res; this.itemsLoading = false; });
  }

  onItemChange(item: ItemLookup | null): void {
    this.selectedItem = item || null;
    this.units = [];
    this.unitNo = null;
    this.selectedUnit = null;
    this.rows = [];
    if (!item) return;
    this.service.getItemUnits(item.ItemNo).subscribe({
      next: (u) => { this.units = u; },
      error: () => { this.toastr.error(this.translate.instant('General.Error')); }
    });
  }

  onUnitChange(unit: ItemUnit | null): void {
    this.selectedUnit = unit || null;
    this.rows = [];
    if (!unit || !this.itemNo) return;
    this.loading = true;
    this.service.getBarcodes(this.itemNo, unit.UnitNo).subscribe({
      next: (bcs) => {
        this.rows = (bcs || []).map(b => ({ Barcode: b.Barcode, Old: b.Old, isNew: false }));
        this.loading = false;
      },
      error: () => { this.loading = false; }
    });
  }

  addRow(): void {
    this.rows.push({ Barcode: '', Old: 0, isNew: true });
  }

  removeRow(i: number): void {
    if (this.rows[i].Old === 1) {
      this.toastr.warning(this.translate.instant('ItemBarcode.CannotRemovePrimary'));
      return;
    }
    this.rows.splice(i, 1);
  }

  save(): void {
    if (!this.selectedItem) { this.toastr.warning(this.translate.instant('ItemBarcode.SelectItem')); return; }
    if (!this.selectedUnit) { this.toastr.warning(this.translate.instant('ItemBarcode.SelectUnit')); return; }

    // additional (old=0) barcodes from the grid
    const barcodes = this.rows
      .filter(r => r.Old === 0)
      .map(r => (r.Barcode || '').trim())
      .filter(b => b !== '');

    // duplicate check on the client (clear message)
    const seen = new Set<string>();
    for (const b of barcodes) {
      if (seen.has(b)) { this.toastr.warning(this.translate.instant('ItemBarcode.Duplicate')); return; }
      seen.add(b);
    }

    this.saving = true;
    this.service.save({
      ItemNo: this.selectedItem.ItemNo,
      UnitNo: this.selectedUnit.UnitNo,
      Operand: this.selectedUnit.Operand ?? 1,
      Barcodes: barcodes,
    }).subscribe({
      next: (res: any) => {
        this.toastr.success(res?.message || this.translate.instant('General.SaveSuccess'));
        this.saving = false;
        this.onUnitChange(this.selectedUnit);  // reload
      },
      error: (err: any) => {
        this.toastr.error(err.error?.message || err.error?.Message || this.translate.instant('General.Error'));
        this.saving = false;
      }
    });
  }

  reset(): void {
    this.itemNo = null; this.selectedItem = null;
    this.units = []; this.unitNo = null; this.selectedUnit = null;
    this.rows = [];
  }
}
