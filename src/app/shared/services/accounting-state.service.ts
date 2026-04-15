import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class AccountingStateService {
  private _chartOfAccountsDirty = new BehaviorSubject<boolean>(false);

  readonly chartOfAccountsDirty$ = this._chartOfAccountsDirty.asObservable();

  setChartOfAccountsDirty(dirty: boolean): void {
    this._chartOfAccountsDirty.next(dirty);
  }

  get isChartOfAccountsDirty(): boolean {
    return this._chartOfAccountsDirty.getValue();
  }
}
