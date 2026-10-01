import { Pipe, PipeTransform } from '@angular/core';
import { Currency, formatMoney } from './api.service';

@Pipe({ name: 'money' })
export class MoneyPipe implements PipeTransform {
  transform(value: number, currency: Currency = 'USD'): string {
    return formatMoney(value, currency);
  }
}
