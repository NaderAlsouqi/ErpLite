import { Component, ContentChild, ElementRef, Input, Renderer2, ViewChild } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-showcode-card',
  templateUrl: './showcode-card.component.html',
  styleUrl: './showcode-card.component.scss',
  standalone: true,
  imports: [RouterOutlet]
})
export class ShowcodeCardComponent {

  @Input('title') title!: string;
  @Input('prism') prism!: string;
  @Input('classbody') classbody!: string;
  toggleStatus = false;

  toggleShowCode() {
    this.toggleStatus = !this.toggleStatus;
  }
}
