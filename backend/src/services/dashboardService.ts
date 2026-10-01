import { Db } from '../database/db';
import { Dashboard, Status, TrendPoint } from '../models/types';
import { SettingsService } from './settingsService';

export function calcAchievement(sales: number, target: number): number {
  if (target <= 0) return sales > 0 ? 100 : 0; // no target set: any sale counts as achieved
  return Math.round((sales / target) * 1000) / 10;
}

export function calcRemaining(sales: number, target: number): number {
  return Math.max(Math.round((target - sales) * 100) / 100, 0);
}

export function calcStatus(sales: number, target: number): Status {
  if (sales >= target && (target > 0 || sales > 0)) return 'Target Achieved';
  if (target > 0 && sales >= target * 0.8) return 'Near Target';
  return 'Below Target';
}

/** Local calendar date as YYYY-MM-DD. */
export function toDateString(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function lastNDates(n: number, today: Date): string[] {
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() - (n - 1 - i));
    return toDateString(d);
  });
}

export class DashboardService {
  private settings: SettingsService;

  constructor(private db: Db) {
    this.settings = new SettingsService(db);
  }

  get(now: Date = new Date()): Dashboard {
    const { dailyTarget, currency } = this.settings.get();
    const dates = lastNDates(7, now);
    const rows = this.db
      .prepare('SELECT date, SUM(amount) AS total FROM sales WHERE date BETWEEN ? AND ? GROUP BY date')
      .all(dates[0], dates[6]) as { date: string; total: number }[];
    const totals = new Map(rows.map((r) => [r.date, r.total]));
    const trend: TrendPoint[] = dates.map((date) => ({ date, sales: totals.get(date) ?? 0 }));
    const today = dates[6];
    const todaySales = totals.get(today) ?? 0;

    return {
      today,
      todaySales,
      dailyTarget,
      currency,
      achievement: calcAchievement(todaySales, dailyTarget),
      remaining: calcRemaining(todaySales, dailyTarget),
      status: calcStatus(todaySales, dailyTarget),
      trend,
    };
  }
}
