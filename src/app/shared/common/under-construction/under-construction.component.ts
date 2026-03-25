import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-under-construction',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  template: `
    <div class="under-construction-container">
      <div class="under-construction-card">
        <div class="icon-wrapper">
          <i class="bi bi-tools"></i>
        </div>
        <h2>{{ 'UnderConstruction.Title' | translate }}</h2>
        <p>{{ pageNameKey ? (pageNameKey | translate) : pageName }} {{ 'UnderConstruction.BeingBuilt' | translate }}</p>
        <p class="sub-text">{{ 'UnderConstruction.CheckBack' | translate }}</p>
      </div>
    </div>
  `,
  styles: [`
    .under-construction-container {
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 60vh;
      padding: 2rem;
    }
    .under-construction-card {
      text-align: center;
      padding: 3rem 4rem;
      background: #fff;
      border-radius: 16px;
      box-shadow: 0 4px 24px rgba(0,0,0,0.08);
    }
    .icon-wrapper {
      font-size: 4rem;
      color: #1b2b4a;
      margin-bottom: 1rem;
    }
    h2 {
      font-size: 1.8rem;
      font-weight: 700;
      color: #1b2b4a;
      margin-bottom: 0.5rem;
    }
    p {
      color: #555;
      font-size: 1rem;
      margin: 0;
    }
    .sub-text {
      margin-top: 0.5rem;
      color: #999;
      font-size: 0.875rem;
    }
  `]
})
export class UnderConstructionComponent {
  @Input() pageName: string = 'This page';
  @Input() pageNameKey: string = '';
}
