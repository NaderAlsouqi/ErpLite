import { Component } from '@angular/core';
import { SharedModule } from '../../../shared/common/sharedmodule';
import { UnderConstructionComponent } from '../../../shared/common/under-construction/under-construction.component';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-accounts-receivable',
  standalone: true,
  imports: [SharedModule, UnderConstructionComponent, TranslateModule],
  template: `
    <app-page-header [title]="'Nav.Accounting.AccountsReceivable' | translate" [title1]="'Nav.Accounting.Title' | translate"></app-page-header>
    <app-under-construction pageNameKey="Nav.Accounting.AccountsReceivable"></app-under-construction>
  `
})
export class AccountsReceivableComponent {}
