import { Component } from '@angular/core';
import { SharedModule } from '../../../shared/common/sharedmodule';
import { UnderConstructionComponent } from '../../../shared/common/under-construction/under-construction.component';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-general-ledger',
  standalone: true,
  imports: [SharedModule, UnderConstructionComponent, TranslateModule],
  template: `
    <app-page-header [title]="'Nav.Accounting.GeneralLedger' | translate" [title1]="'Nav.Accounting.Title' | translate"></app-page-header>
    <app-under-construction pageNameKey="Nav.Accounting.GeneralLedger"></app-under-construction>
  `
})
export class GeneralLedgerComponent {}
