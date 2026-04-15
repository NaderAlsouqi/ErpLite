import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-under-construction',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="uc-wrapper">
      <div class="uc-card">
        <div class="uc-icon">🚧</div>
        <h2 class="uc-title">قيد الإنشاء</h2>
        <p class="uc-subtitle">Under Construction</p>
        <p class="uc-desc">هذه الصفحة قيد التطوير وستكون متاحة قريباً.</p>
      </div>
    </div>
  `,
  styles: [`
    .uc-wrapper {
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 60vh;
    }
    .uc-card {
      text-align: center;
      padding: 3rem 4rem;
      background: #fff;
      border-radius: 16px;
      box-shadow: 0 4px 24px rgba(0,0,0,.08);
      border: 1px solid #eee;
    }
    .uc-icon { font-size: 4rem; margin-bottom: 1rem; }
    .uc-title { font-size: 1.75rem; font-weight: 700; color: #1b2b4a; margin-bottom: .25rem; }
    .uc-subtitle { font-size: 1rem; color: #6b7a99; margin-bottom: 1rem; }
    .uc-desc { font-size: .9rem; color: #6b7a99; }
  `]
})
export class UnderConstructionComponent {}
