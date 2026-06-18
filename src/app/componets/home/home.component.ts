import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { SharedModule } from '../../shared/common/sharedmodule';
import { FinancialDashboardComponent } from './financial-dashboard/financial-dashboard.component';
import { HOME_ACTION_GROUPS, ActionGroup } from './home-actions';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterModule, TranslateModule, SharedModule, FinancialDashboardComponent],
  templateUrl: './home.component.html',
  styleUrl:    './home.component.scss',
})
export class HomeComponent {

  get isAr(): boolean {
    return this.translate.currentLang === 'ar';
  }

  readonly groups: ActionGroup[] = HOME_ACTION_GROUPS;

  constructor(
    private router: Router,
    private translate: TranslateService,
  ) {}

  navigate(path: string): void {
    this.router.navigate([path]);
  }
}
