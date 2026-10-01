import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { RouterLink } from '@angular/router';
import { ApiService, Currency, Sale, friendlyError } from './api.service';
import { MoneyPipe } from './money.pipe';
import { ConfirmDialog, SaleViewDialog } from './sale-dialogs';

@Component({
  selector: 'app-sales-list',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, DatePipe, MoneyPipe, MatDialogModule],
  template: `
    <section class="page">
      <div class="page-head">
        <div>
          <h1>Sales</h1>
          <p class="muted">Every sale you've recorded.</p>
        </div>
        <a class="btn btn-primary" routerLink="/sales/new">+ Add sale</a>
      </div>

      <div class="card">
        <div class="filter field">
          <label for="filter">Filter by date</label>
          <div class="row">
            <input id="filter" type="date" [value]="search()" (change)="setSearch($any($event.target).value)" />
            @if (search()) { <button class="btn btn-ghost" (click)="setSearch('')">Clear</button> }
          </div>
        </div>

        @if (error()) {
          <div class="error-box" role="alert">{{ error() }} <button class="btn btn-ghost btn-sm" (click)="load()">Retry</button></div>
        } @else if (loading()) {
          <div aria-busy="true" class="skels">
            @for (i of [1, 2, 3, 4]; track i) { <div class="skeleton" style="height: 48px"></div> }
          </div>
        } @else if (!sales().length) {
          <div class="state">
            <span class="emoji">🧾</span>
            @if (search()) {
              <h3>No sales on this date.</h3>
              <p class="muted">Try another date or clear the filter.</p>
            } @else {
              <h3>No sales recorded yet.</h3>
              <p class="muted">Add today's sales to start tracking your progress.</p>
              <a class="btn btn-primary" routerLink="/sales/new">Add a sale</a>
            }
          </div>
        } @else {
          <div class="table-wrap">
            <table>
              <thead>
                <tr><th>Date</th><th class="num">Sales</th><th class="num">Target</th><th class="num">Achievement</th><th>Note</th><th><span class="sr-only">Actions</span></th></tr>
              </thead>
              <tbody>
                @for (s of sales(); track s.id) {
                  <tr>
                    <td data-l="Date">{{ s.date | date: 'd MMM y' }}</td>
                    <td data-l="Sales" class="num strong">{{ s.amount | money: currency() }}</td>
                    <td data-l="Target" class="num">{{ target() | money: currency() }}</td>
                    <td data-l="Achievement" class="num">
                      <span class="pill" [class]="pillClass(s)">{{ achievement(s) }}%</span>
                    </td>
                    <td data-l="Note" class="note">{{ s.note || '—' }}</td>
                    <td class="actions">
                      <button class="btn btn-ghost btn-sm" (click)="view(s)" [attr.aria-label]="'View sale from ' + s.date">View</button>
                      <a class="btn btn-ghost btn-sm" [routerLink]="['/sales', s.id, 'edit']" [attr.aria-label]="'Edit sale from ' + s.date">Edit</a>
                      <button class="btn btn-danger btn-sm" (click)="remove(s)" [attr.aria-label]="'Delete sale from ' + s.date">Delete</button>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }
      </div>
    </section>
  `,
  styles: `
    .filter { max-width: 320px; margin-bottom: 1rem; }
    .row { display: flex; gap: 0.5rem; }
    .skels { display: grid; gap: 0.6rem; }
    .table-wrap { overflow-x: auto; }
    table { width: 100%; border-collapse: collapse; }
    th { text-align: left; font-size: 0.78rem; text-transform: uppercase; letter-spacing: 0.05em; color: var(--ink-soft); padding: 0.6rem 0.8rem; border-bottom: 1px solid var(--line); }
    td { padding: 0.8rem; border-bottom: 1px solid var(--line); vertical-align: middle; }
    tbody tr:hover { background: #faf9ff; }
    .num { text-align: right; white-space: nowrap; } .strong { font-weight: 700; }
    .note { max-width: 240px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--ink-soft); }
    .actions { display: flex; gap: 0.4rem; justify-content: flex-end; }
    .pill { padding: 0.2rem 0.6rem; border-radius: 99px; font-weight: 700; font-size: 0.82rem; }
    .pill.achieved { background: var(--green-soft); color: #0b7a50; }
    .pill.near { background: var(--orange-soft); color: #a45a00; }
    .pill.below { background: var(--red-soft); color: #b0272d; }
    @media (max-width: 760px) {
      thead { display: none; }
      tr { display: grid; grid-template-columns: 1fr 1fr; gap: 0.2rem 1rem; padding: 0.8rem 0; border-bottom: 1px solid var(--line); }
      td { border: 0; padding: 0.2rem 0; text-align: left; }
      td[data-l]::before { content: attr(data-l); display: block; font-size: 0.72rem; color: var(--ink-soft); text-transform: uppercase; }
      .note { max-width: none; grid-column: 1 / -1; white-space: normal; }
      .actions { grid-column: 1 / -1; justify-content: flex-start; padding-top: 0.4rem; }
    }
  `,
})
export class SalesListPage implements OnInit {
  private api = inject(ApiService);
  private dialog = inject(MatDialog);
  private snack = inject(MatSnackBar);

  sales = signal<Sale[]>([]);
  target = signal(0);
  currency = signal<Currency>('USD');
  search = signal('');
  loading = signal(true);
  error = signal('');

  ngOnInit(): void {
    this.api.settings().subscribe({
      next: (s) => { this.target.set(s.dailyTarget); this.currency.set(s.currency); },
      error: (e) => this.error.set(friendlyError(e)),
    });
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set('');
    this.api.sales(this.search()).subscribe({
      next: (s) => { this.sales.set(s); this.loading.set(false); },
      error: (e) => { this.error.set(friendlyError(e)); this.loading.set(false); },
    });
  }

  setSearch(v: string): void { this.search.set(v); this.load(); }

  achievement(s: Sale): number {
    return this.target() > 0 ? Math.round((s.amount / this.target()) * 1000) / 10 : s.amount > 0 ? 100 : 0;
  }
  pillClass(s: Sale): string {
    const a = this.achievement(s);
    return a >= 100 ? 'achieved' : a >= 80 ? 'near' : 'below';
  }

  view(s: Sale): void {
    this.dialog.open(SaleViewDialog, { data: { sale: s, currency: this.currency(), target: this.target() }, width: '420px', maxWidth: '92vw' });
  }

  remove(s: Sale): void {
    this.dialog
      .open(ConfirmDialog, { data: s, width: '400px', maxWidth: '92vw' })
      .afterClosed()
      .subscribe((yes) => {
        if (!yes) return;
        this.api.deleteSale(s.id).subscribe({
          next: () => { this.snack.open('Sale deleted.', 'OK', { duration: 3000, panelClass: 'snack-ok' }); this.load(); },
          error: (e) => this.snack.open(friendlyError(e), 'OK', { duration: 5000, panelClass: 'snack-err' }),
        });
      });
  }
}
