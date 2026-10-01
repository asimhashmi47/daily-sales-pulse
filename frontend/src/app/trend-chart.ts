import { ChangeDetectionStrategy, Component, ElementRef, OnChanges, OnDestroy, ViewChild, input } from '@angular/core';
import { Chart, registerables } from 'chart.js';
import { Currency, formatMoney } from './api.service';

Chart.register(...registerables);

@Component({
  selector: 'app-trend-chart',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="wrap">
      <canvas #canvas role="img" [attr.aria-label]="'Bar chart of sales for the last 7 days'"></canvas>
    </div>
  `,
  styles: `.wrap { position: relative; height: 280px; }`,
})
export class TrendChart implements OnChanges, OnDestroy {
  data = input.required<{ date: string; sales: number }[]>();
  target = input.required<number>();
  currency = input.required<Currency>();

  @ViewChild('canvas', { static: true }) canvas!: ElementRef<HTMLCanvasElement>;
  private chart?: Chart;

  ngOnChanges(): void {
    this.chart?.destroy();
    const points = this.data();
    const last = points.length - 1;
    const currency = this.currency();
    const labels = points.map((p, i) =>
      i === last ? 'Today' : new Date(`${p.date}T00:00:00`).toLocaleDateString('en-US', { weekday: 'short', day: 'numeric' }),
    );
    const ctx = this.canvas.nativeElement.getContext('2d')!;
    const gradient = ctx.createLinearGradient(0, 0, 0, 280);
    gradient.addColorStop(0, '#7b6af5');
    gradient.addColorStop(1, '#a99dfa');

    this.chart = new Chart(ctx, {
      data: {
        labels,
        datasets: [
          {
            type: 'bar',
            label: 'Sales',
            data: points.map((p) => p.sales),
            backgroundColor: points.map((_, i) => (i === last ? '#2f7df6' : gradient)),
            borderRadius: 10,
            maxBarThickness: 44,
            order: 2,
          },
          {
            type: 'line',
            label: 'Daily target',
            data: points.map(() => this.target()),
            borderColor: '#e8830c',
            borderDash: [6, 6],
            borderWidth: 2,
            pointRadius: 0,
            order: 1,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 500 },
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: { position: 'bottom', labels: { usePointStyle: true, boxWidth: 8, font: { family: 'Plus Jakarta Sans' } } },
          tooltip: { callbacks: { label: (c) => ` ${c.dataset.label}: ${formatMoney(c.parsed.y ?? 0, currency)}` } },
        },
        scales: {
          x: { grid: { display: false }, border: { display: false } },
          y: {
            beginAtZero: true,
            border: { display: false },
            grid: { color: '#eeecf8' },
            ticks: { maxTicksLimit: 5, callback: (v) => formatMoney(Number(v), currency) },
          },
        },
      },
    });
  }

  ngOnDestroy(): void {
    this.chart?.destroy();
  }
}
