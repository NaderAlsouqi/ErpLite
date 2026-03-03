import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'sum',
  standalone: true
})
export class SumPipe implements PipeTransform {
  transform(items: any[], attr: string): number {
    if (!items || !items.length) return 0;
    return items.reduce((a, b) => a + (b[attr] || 0), 0);
  }
}
