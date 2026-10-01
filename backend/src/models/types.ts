export const CURRENCIES = ['USD', 'EUR', 'GBP', 'PKR'] as const;
export type Currency = (typeof CURRENCIES)[number];

export type Status = 'Target Achieved' | 'Near Target' | 'Below Target';

export interface Sale {
  id: number;
  date: string; // YYYY-MM-DD
  amount: number;
  note: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Settings {
  id: number;
  dailyTarget: number;
  currency: Currency;
  updatedAt: string;
}

export interface SaleInput {
  date: string;
  amount: number;
  note: string | null;
}

export interface SettingsInput {
  dailyTarget: number;
  currency: Currency;
}

export interface TrendPoint {
  date: string;
  sales: number;
}

export interface Dashboard {
  today: string;
  todaySales: number;
  dailyTarget: number;
  currency: Currency;
  achievement: number;
  remaining: number;
  status: Status;
  trend: TrendPoint[];
}
