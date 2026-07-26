import { Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ToastrService } from 'ngx-toastr';
import { NgSelectModule } from '@ng-select/ng-select';
import { Subject, of } from 'rxjs';
import { debounceTime, distinctUntilChanged, switchMap, catchError } from 'rxjs/operators';
import { SharedModule } from '../../../shared/common/sharedmodule';
import { HasPermissionDirective } from '../../../shared/directives/has-permission.directive';
import { ConfirmationModalComponent } from '../../../shared/common/confirmation-modal/confirmation-modal.component';
import { ReplaceItemCodeService, ItemLookup } from '../../../shared/services/replace-item-code.service';

@Component({
  selector: 'app-replace-item-code',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslateModule, SharedModule, NgSelectModule, HasPermissionDirective, ConfirmationModalComponent],
  templateUrl: './replace-item-code.component.html',
  styleUrl: './replace-item-code.component.scss',
})
export class ReplaceItemCodeComponent implements OnInit {
  @ViewChild('confirmModal') confirmModal!: ConfirmationModalComponent;

  // old item (the one being replaced)
  items: ItemLookup[] = [];
  itemsLoading = false;
  itemInput$ = new Subject<string>();
  oldItemNo: string | null = null;
  selectedOld: ItemLookup | null = null;

  // new code (free text)
  newItemNo = '';

  saving = false;

  get isAr(): boolean { return this.translate.currentLang === 'ar'; }

  constructor(
    private service: ReplaceItemCodeService,
    private toastr: ToastrService,
    private translate: TranslateService,
  ) {}

  ngOnInit(): void {
    this.service.searchItems('').subscribe({ next: (r) => this.items = r, error: () => {} });
    this.itemInput$.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      switchMap(term => {
        this.itemsLoading = true;
        return this.service.searchItems(term || '').pipe(catchError(() => of([] as ItemLookup[])));
      })
    ).subscribe((res) => { this.items = res; this.itemsLoading = false; });
  }

  onOldChange(item: ItemLookup | null): void {
    this.selectedOld = item || null;
  }

  attemptReplace(): void {
    if (!this.selectedOld) { this.toastr.warning(this.translate.instant('ReplaceItemCode.SelectOld')); return; }
    const nw = (this.newItemNo || '').trim();
    if (!nw) { this.toastr.warning(this.translate.instant('ReplaceItemCode.NewRequired')); return; }
    if (nw === this.selectedOld.ItemNo) { this.toastr.warning(this.translate.instant('ReplaceItemCode.MustDiffer')); return; }
    this.confirmModal.show();
  }

  confirmReplace(): void {
    if (!this.selectedOld) return;
    const nw = (this.newItemNo || '').trim();
    this.saving = true;
    this.service.replace(this.selectedOld.ItemNo, nw).subscribe({
      next: (res: any) => {
        this.toastr.success(res?.message || this.translate.instant('ReplaceItemCode.Success'));
        this.saving = false;
        this.reset();
      },
      error: (err: any) => {
        this.toastr.error(err.error?.message || err.error?.Message || this.translate.instant('General.Error'));
        this.saving = false;
      }
    });
  }

  reset(): void {
    this.oldItemNo = null;
    this.selectedOld = null;
    this.newItemNo = '';
  }
}
