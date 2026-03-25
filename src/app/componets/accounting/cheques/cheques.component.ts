import { Component } from '@angular/core';
import { SharedModule } from '../../../shared/common/sharedmodule';
import { UnderConstructionComponent } from '../../../shared/common/under-construction/under-construction.component';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-cheques',
  standalone: true,
  imports: [SharedModule, UnderConstructionComponent, TranslateModule],
  template: `
    <app-page-header [title]="'Nav.Accounting.Cheques' | translate" [title1]="'Nav.Accounting.Title' | translate"></app-page-header>
    <app-under-construction pageNameKey="Nav.Accounting.Cheques"></app-under-construction>
  `
})
export class ChequesComponent {}
