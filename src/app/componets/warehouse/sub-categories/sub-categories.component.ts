import { Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ToastrService } from 'ngx-toastr';
import { NgSelectModule } from '@ng-select/ng-select';
import { SharedModule } from '../../../shared/common/sharedmodule';
import { ConfirmationModalComponent } from '../../../shared/common/confirmation-modal/confirmation-modal.component';
import { HasPermissionDirective } from '../../../shared/directives/has-permission.directive';
import { SubCategoryService, BranchingParent } from '../../../shared/services/sub-category.service';
import { MainCategoryDto, MainCategoryService } from '../../../shared/services/main-category.service';

interface Row {
  Code: number | null;
  ArName: string;
  EnName: string;
  CanDelete: boolean;
  isNew: boolean;
}

@Component({
  selector: 'app-sub-categories',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TranslateModule,
    SharedModule,
    NgSelectModule,
    ConfirmationModalComponent,
    HasPermissionDirective,
  ],
  templateUrl: './sub-categories.component.html',
  styleUrl: './sub-categories.component.scss',
})
export class SubCategoriesComponent implements OnInit {
  @ViewChild('convertModal') convertModal!: ConfirmationModalComponent;

  mainCategories: MainCategoryDto[] = [];
  parentNo: number | null = null;
  parent: BranchingParent | null = null;
  rows: Row[] = [];
  loading = false;
  saving = false;

  get isAr(): boolean { return this.translate.currentLang === 'ar'; }

  constructor(
    private subService: SubCategoryService,
    private mainService: MainCategoryService,
    private toastr: ToastrService,
    private translate: TranslateService,
  ) {}

  ngOnInit(): void {
    this.mainService.getAll().subscribe({
      next: (d) => { this.mainCategories = d; },
      error: () => {}
    });
  }

  onParentChange(): void {
    this.parent = null;
    this.rows = [];
    if (!this.parentNo) return;
    this.loading = true;
    this.subService.getParent(+this.parentNo).subscribe({
      next: (p) => {
        if (!p) { this.loading = false; this.toastr.warning(this.translate.instant('SubCategories.ParentNotFound')); return; }
        this.parent = p;
        this.loadChildren();
      },
      error: () => { this.loading = false; this.toastr.error(this.translate.instant('General.Error')); }
    });
  }

  private loadChildren(): void {
    this.subService.getChildren(+this.parentNo!).subscribe({
      next: (ch) => {
        this.rows = (ch || []).map(c => ({
          Code: c.Code, ArName: c.ArName || '', EnName: c.EnName || '', CanDelete: c.CanDelete, isNew: false
        }));
        if (this.rows.length === 0) this.addRow();
        this.loading = false;
      },
      error: () => { this.loading = false; }
    });
  }

  addRow(): void {
    this.rows.push({ Code: null, ArName: '', EnName: '', CanDelete: true, isNew: true });
  }

  removeRow(i: number): void {
    const r = this.rows[i];
    if (!r.isNew && !r.CanDelete) {
      this.toastr.warning(this.translate.instant('SubCategories.CannotRemove'));
      return;
    }
    this.rows.splice(i, 1);
  }

  private validChildren(): Row[] {
    return this.rows.filter(r => r.Code != null && +r.Code > 0 && (r.ArName || '').trim() !== '');
  }

  save(): void {
    if (!this.parent) {
      this.toastr.warning(this.translate.instant('SubCategories.SelectParent'));
      return;
    }
    // a row with a code but no name is invalid
    if (this.rows.some(r => r.Code != null && +r.Code > 0 && !(r.ArName || '').trim())) {
      this.toastr.warning(this.translate.instant('SubCategories.NameRequired'));
      return;
    }
    if (this.validChildren().length === 0) {
      this.toastr.warning(this.translate.instant('SubCategories.AtLeastOne'));
      return;
    }
    // parent has item cards -> they must be moved to the first child (or abort)
    if (this.parent.HasItems) {
      this.convertModal.show();
    } else {
      this.doSave(false);
    }
  }

  /** Called by the convert-items confirmation (Yes -> convert + save). */
  confirmConvert(): void {
    this.doSave(true);
  }

  private doSave(convert: boolean): void {
    if (!this.parent) return;
    const children = this.validChildren().map(r => ({ Code: +r.Code!, ArName: r.ArName, EnName: r.EnName }));
    this.saving = true;
    this.subService.save({ ParentNo: this.parent.TypeNo, ConvertItems: convert, Children: children }).subscribe({
      next: (res: any) => {
        this.toastr.success(res?.message || this.translate.instant('General.SaveSuccess'));
        this.saving = false;
        // refresh parent (HasItems may have changed) + children (CanDelete flags)
        this.onParentChange();
        this.mainService.getAll().subscribe({ next: (d) => this.mainCategories = d, error: () => {} });
      },
      error: (err: any) => {
        this.toastr.error(err.error?.message || err.error?.Message || this.translate.instant('General.Error'));
        this.saving = false;
      }
    });
  }

  reset(): void {
    this.parentNo = null;
    this.parent = null;
    this.rows = [];
  }
}
