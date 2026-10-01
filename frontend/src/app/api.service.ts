import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

export type Currency = 'USD' | 'EUR' | 'GBP' | 'PKR';
export const CURRENCIES: Currency[] = ['USD', 'EUR', 'GBP', 'PKR'];
export type Status = 'Target Achieved' | 'Near Target' | 'Below Target';

export interface Sale {
  id: number;
  date: string;
  amount: number;
  note: string | null;
  createdAt: string;
  updatedAt: string;
}
export type SaleInput = Pick<Sale, 'date' | 'amount' | 'note'>;

export interface Settings {
  dailyTarget: number;
  currency: Currency;
}

export interface Dashboard {
  today: string;
  todaySales: number;
  dailyTarget: number;
  currency: Currency;
  achievement: number;
  remaining: number;
  status: Status;
  trend: { date: string; sales: number }[];
}

export const API_URL = 'http://localhost:3000/api';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private http = inject(HttpClient);

  dashboard(): Observable<Dashboard> {
    return this.http.get<Dashboard>(`${API_URL}/dashboard`);
  }
  sales(search = ''): Observable<Sale[]> {
    return this.http.get<Sale[]>(`${API_URL}/sales`, { params: search ? { search } : {} });
  }
  sale(id: number): Observable<Sale> {
    return this.http.get<Sale>(`${API_URL}/sales/${id}`);
  }
  createSale(input: SaleInput): Observable<Sale> {
    return this.http.post<Sale>(`${API_URL}/sales`, input);
  }
  updateSale(id: number, input: SaleInput): Observable<Sale> {
    return this.http.put<Sale>(`${API_URL}/sales/${id}`, input);
  }
  deleteSale(id: number): Observable<void> {
    return this.http.delete<void>(`${API_URL}/sales/${id}`);
  }
  settings(): Observable<Settings> {
    return this.http.get<Settings>(`${API_URL}/settings`);
  }
  updateSettings(input: Settings): Observable<Settings> {
    return this.http.put<Settings>(`${API_URL}/settings`, input);
  }
}

/** Turns any HTTP failure into a short, friendly, non-technical message. */
export function friendlyError(err: unknown): string {
  if (err instanceof HttpErrorResponse) {
    if (err.status === 0) return "Can't reach the server. Make sure the API is running and try again.";
    if (err.status === 400) return (err.error?.details as string[] | undefined)?.[0] ?? 'Please check the values you entered.';
    if (err.status === 404) return 'That item no longer exists.';
  }
  return 'Something went wrong. Please try again.';
}

export function formatMoney(value: number, currency: Currency): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value);
}

export function todayString(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function statusClass(status: Status): string {
  return status === 'Target Achieved' ? 'achieved' : status === 'Near Target' ? 'near' : 'below';
}
