import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'cfa'
})
export class CfaPipe implements PipeTransform {

  transform(
    value: number | string | null | undefined,
    withCurrency: boolean = true
  ): string {

    if (value === null || value === undefined || value === '') {
      return withCurrency ? '0 CFA' : '0';
    }

    const numberValue = Number(value);

    if (isNaN(numberValue)) {
      return withCurrency ? '0 CFA' : '0';
    }

    // Format avec espace comme séparateur de milliers
    const formatted = Math.round(numberValue)
      .toString()
      .replace(/\B(?=(\d{3})+(?!\d))/g, ' ');

    return withCurrency ? `${formatted} CFA` : formatted;
  }
}
