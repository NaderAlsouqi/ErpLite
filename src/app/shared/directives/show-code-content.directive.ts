import { Directive, TemplateRef } from '@angular/core';

@Directive({
  selector: '[appShowCodeContent]',
  standalone: true
})
export class ShowCodeContentDirective {

  constructor(public templateRef: TemplateRef<any>) { }

}
