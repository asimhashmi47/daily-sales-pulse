import { DatePipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { Currency, Sale } from './api.service';
import { MoneyPipe } from './money.pipe';

@Component({
  selector: 'app-sale-view-dialog',
  imports: [MatDialogModule, DatePipe, MoneyPipe],
  template: `
    <h2 mat-dialog-title>Sale details</h2>
    <mat-dialog-content>
      <dl>
        <dt>Date</dt><dd>{{ data.sale.date | date: 'EEEE, d MMM y' }}</dd>
        <dt>Sales</dt><dd class="big">{{ data.sale.amount | money: data.currency }}</dd>
        <dt>Current daily target</dt><dd>{{ data.target | money: data.currency }}</dd>
        <dt>Note</dt><dd>{{ data.sale.note || '—' }}</dd>
      </dl>
    </mat-dialog-content>
    <mat-dialog-actions align="end"><button class="btn btn-ghost" mat-dialog-close>Close</button></mat-dialog-actions>
  `,
  styles: `dl { margin: 0; display: grid; gap: 0.2rem; } dt { font-size: 0.78rem; text-transform: uppercase; color: var(--ink-soft); margin-top: 0.7rem; } dd { margin: 0; overflow-wrap: anywhere; } .big { font-size: 1.6rem; font-weight: 800; }`,
})
export class SaleViewDialog {
  data = inject<{ sale: Sale; currency: Currency; target: number }>(MAT_DIALOG_DATA);
}

@Component({
  selector: 'app-confirm-dialog',
  imports: [MatDialogModule, DatePipe],
  template: `
    <h2 mat-dialog-title>Delete this sale?</h2>
    <mat-dialog-content>The sale from {{ data.date | date: 'd MMM y' }} will be removed permanently.</mat-dialog-content>
    <mat-dialog-actions align="end">
      <button class="btn btn-ghost" [mat-dialog-close]="false">Cancel</button>
      <button class="btn btn-danger" [mat-dialog-close]="true">Delete</button>
    </mat-dialog-actions>
  `,
})
export class ConfirmDialog {
  data = inject<Sale>(MAT_DIALOG_DATA);
}
