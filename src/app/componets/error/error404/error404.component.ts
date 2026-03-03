import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { CommonModule } from '@angular/common';
import { SharedModule } from '../../../shared/common/sharedmodule';

@Component({
  selector: 'app-error404',
  standalone: true,
  imports: [RouterModule, TranslateModule, CommonModule, SharedModule],
  templateUrl: './error404.component.html',
  styleUrl: './error404.component.scss'
})
export class Error404Component {
  constructor() {
    // Add title to the page
    document.title = '404 - Page Not Found';
  }
}
