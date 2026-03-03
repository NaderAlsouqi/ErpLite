import { Directive, ElementRef, HostListener, Input } from '@angular/core';
import { NgControl } from '@angular/forms';

@Directive({
  selector: '[validateNumber]'
})
export class ValidateNumberDirective {

  @Input('validateNumber') decimals = '';
  /**
   * Value before the decimal point specifies the number of digits before decimal and value after the decimal specifies the number of digits after decimal.
   * Example: 7.3 (Before decimal 7 digits & 3 digits after decimal)
   */

  private check(value: string) {
      let [length, precision] = this.decimals.split('.'),
      regExpString = `^([\\d]{0,${+length}})((\\.{1})([\\d]{1,${+precision}})?)?$`;
      console.log(regExpString)
      return String(value).match(new RegExp(regExpString));
  }

  private run(oldValue: string) {
      setTimeout(() => {
          let currentValue: string = this.el.nativeElement.value;
          if (currentValue && !this.check(currentValue)) {
              this.control.control.patchValue(oldValue);
          }
      });
  }

  constructor(private el: ElementRef, private control: NgControl) {}

  @HostListener("keydown", ["$event"])
  onKeyDown(event: KeyboardEvent) {
      this.run(this.el.nativeElement.value);
  }

  @HostListener("paste", ["$event"])
  onPaste(event: ClipboardEvent) {
      this.run(this.el.nativeElement.value);
  }

}