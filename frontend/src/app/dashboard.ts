import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ApiService, Dashboard, friendlyError, statusClass } from './api.service';
import { MoneyPipe } from './money.pipe';
import { TrendChart } from './trend-chart';

@Component({
  selector: 'app-dashboard',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, DatePipe, MoneyPipe, TrendChart],
  template: `
    <section class="page">
      <div class="page-head">
        <div>
          <h1>{{ greeting }} 👋</h1>
          <p class="muted">{{ todayDate | date: 'EEEE, d MMMM y' }}</p>
        </div>
        <a class="btn btn-primary" routerLink="/sales/new">+ Add today's sales</a>
      </div>

      @if (error()) {
        <div class="error-box" role="alert">
          {{ error() }} <button class="btn btn-ghost btn-sm" (click)="load()">Retry</button>
        </div>
      } @else if (!data()) {
        <div class="stats" aria-busy="true" aria-label="Loading dashboard">
          @for (i of [1, 2, 3, 4]; track i) { <div class="skeleton" style="height: 112px"></div> }
        </div>
        <div class="skeleton" style="height: 340px"></div>
      } @else {
        @let d = data()!;
        <div class="stats">
          <div class="card stat blue">
            <span class="label">Today's Sales</span>
            <strong class="value">{{ d.todaySales | money: d.currency }}</strong>
          </div>
          <div class="card stat purple">
            <span class="label">Today's Target</span>
            <strong class="value">{{ d.dailyTarget | money: d.currency }}</strong>
          </div>
          <div class="card stat green">
            <span class="label">Achievement</span>
            <strong class="value">{{ d.achievement }}%</strong>
            <div class="bar" role="progressbar" [attr.aria-valuenow]="progress()" aria-valuemin="0" aria-valuemax="100" aria-label="Target progress">
              <span [style.width.%]="progress()" [class]="cls()"></span>
            </div>
          </div>
          <div class="card stat orange">
            <span class="label">Remaining</span>
            <strong class="value">{{ d.remaining | money: d.currency }}</strong>
          </div>
        </div>

        <div class="grid">
          <div class="card">
            <h2>7-Day Sales Trend</h2>
            @if (hasAnySales()) {
              <app-trend-chart [data]="d.trend" [target]="d.dailyTarget" [currency]="d.currency" />
            } @else {
              <div class="state">
                <span class="emoji">📈</span>
                <h3>No sales recorded yet.</h3>
                <p class="muted">Add today's sales to start tracking your progress.</p>
                <a class="btn btn-primary" routerLink="/sales/new">Add a sale</a>
              </div>
            }
          </div>

          <div class="card perf" [class]="cls()">
            <h2>Today's Performance</h2>
            <span class="badge" [class]="cls()">{{ d.status }}</span>
            <p class="muted">{{ message() }}</p>
          </div>
        </div>
      }
    </section>
  `,
  styles: `
    .stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 1rem; }
    .stat { display: grid; gap: 0.35rem; align-content: start; border-top: 4px solid var(--c); min-width: 0; }
    .stat.blue { --c: var(--blue); } .stat.purple { --c: var(--brand); }
    .stat.green { --c: var(--green); } .stat.orange { --c: var(--orange); }
    .label { color: var(--ink-soft); font-weight: 600; font-size: 0.85rem; }
    .value { font-size: clamp(1.4rem, 2.6vw, 2rem); letter-spacing: -0.02em; overflow-wrap: anywhere; line-height: 1.15; }
    .bar { height: 8px; border-radius: 99px; background: var(--green-soft); overflow: hidden; margin-top: 0.3rem; }
    .bar span { display: block; height: 100%; border-radius: 99px; background: var(--red); transition: width 0.6s cubic-bezier(0.22, 1, 0.36, 1); }
    .bar span.near { background: var(--orange); } .bar span.achieved { background: var(--green); }
    .grid { display: grid; grid-template-columns: 2fr 1fr; gap: 1rem; align-items: start; }
    .grid h2 { margin-bottom: 0.75rem; }
    .perf { display: grid; gap: 0.9rem; justify-items: start; }
    .perf.achieved { background: linear-gradient(160deg, #fff, var(--green-soft)); }
    .perf.near { background: linear-gradient(160deg, #fff, var(--orange-soft)); }
    .perf.below { background: linear-gradient(160deg, #fff, var(--red-soft)); }
    .perf .badge { font-size: 1rem; padding: 0.5rem 1rem; }
    @media (max-width: 1000px) { .stats { grid-template-columns: repeat(2, 1fr); } .grid { grid-template-columns: 1fr; } }
    @media (max-width: 480px) { .stats { grid-template-columns: 1fr 1fr; gap: 0.7rem; } .stat { padding: 1rem; } }
  `,
})
export class DashboardPage implements OnInit {
  private api = inject(ApiService);
  data = signal<Dashboard | null>(null);
  error = signal('');

  todayDate = new Date();
  greeting = (() => {
    const h = this.todayDate.getHours();
    return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
  })();

  progress = computed(() => Math.min(this.data()?.achievement ?? 0, 100));
  cls = computed(() => (this.data() ? statusClass(this.data()!.status) : ''));
  hasAnySales = computed(() => this.data()?.trend.some((t) => t.sales > 0) ?? false);
  message = computed(() => {
    switch (this.data()?.status) {
      case 'Target Achieved': return 'Great work — you hit today\'s target.';
      case 'Near Target': return 'Almost there. A little more to reach today\'s target.';
      default: return 'Below today\'s target. Keep going!';
    }
  });

  ngOnInit(): void { this.load(); }

  load(): void {
    this.error.set('');
    this.api.dashboard().subscribe({
      next: (d) => this.data.set(d),
      error: (e) => this.error.set(friendlyError(e)),
    });
  }
}
