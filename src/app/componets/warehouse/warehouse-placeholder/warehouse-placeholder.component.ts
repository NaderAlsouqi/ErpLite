import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';

/**
 * Shared placeholder for not-yet-built warehouse screens. The screen name is
 * supplied per-route via `data.titleKey` so a single component serves every
 * warehouse menu item until its real page is implemented.
 */
@Component({
  selector: 'app-warehouse-placeholder',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  template: `
    <div class="card">
      <div class="card-body text-center py-5">
        <i class="ti ti-tools text-muted d-block mb-3" style="font-size:2.5rem"></i>
        <h3 class="mb-2">{{ titleKey | translate }}</h3>
        <p class="text-muted mb-0">{{ 'Warehouse.UnderConstruction' | translate }}</p>
      </div>
    </div>
  `,
})
export class WarehousePlaceholderComponent {
  titleKey = 'Nav.Warehouse.Title';
  constructor(route: ActivatedRoute) {
    route.data.subscribe(d => { this.titleKey = d['titleKey'] || this.titleKey; });
  }
}
