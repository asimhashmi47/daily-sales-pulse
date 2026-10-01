import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { API_URL, Dashboard, formatMoney, friendlyError } from './api.service';
import { DashboardPage } from './dashboard';
import { SaleFormPage } from './sale-form';
import { HttpErrorResponse } from '@angular/common/http';

const setup = () =>
  TestBed.configureTestingModule({
    providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
  });

describe('SaleFormPage validation', () => {
  beforeEach(() => setup());

  it('rejects empty, negative and invalid values, accepts valid ones', () => {
    const c = TestBed.createComponent(SaleFormPage).componentInstance;
    c.form.patchValue({ date: '', amount: null });
    expect(c.form.invalid).toBeTrue();
    c.form.patchValue({ date: '2026-09-29', amount: -1 });
    expect(c.form.controls.amount.hasError('min')).toBeTrue();
    c.form.patchValue({ date: '2026-02-31', amount: 10 });
    expect(c.form.controls.date.hasError('date')).toBeTrue();
    c.form.patchValue({ date: '2026-09-29', amount: 850 });
    expect(c.form.valid).toBeTrue();
  });

  it('does not call the API when the form is invalid', () => {
    const fixture = TestBed.createComponent(SaleFormPage);
    const http = TestBed.inject(HttpTestingController);
    fixture.componentInstance.form.patchValue({ amount: null });
    fixture.componentInstance.save();
    http.expectNone(`${API_URL}/sales`);
    expect(fixture.componentInstance.form.controls.amount.touched).toBeTrue();
  });
});

describe('DashboardPage', () => {
  beforeEach(() => setup());
  const data: Dashboard = {
    today: '2026-09-29', todaySales: 850, dailyTarget: 1000, currency: 'USD', achievement: 85, remaining: 150,
    status: 'Near Target',
    trend: Array.from({ length: 7 }, (_, i) => ({ date: `2026-09-${23 + i}`, sales: i * 100 })),
  };

  it('renders numbers and status from the API', () => {
    const fixture = TestBed.createComponent(DashboardPage);
    fixture.detectChanges();
    TestBed.inject(HttpTestingController).expectOne(`${API_URL}/dashboard`).flush(data);
    fixture.detectChanges();
    const text = (fixture.nativeElement as HTMLElement).textContent!;
    expect(text).toContain('$850');
    expect(text).toContain('$1,000');
    expect(text).toContain('85%');
    expect(text).toContain('$150');
    expect(text).toContain('Near Target');
  });

  it('shows a friendly message when the API is down', () => {
    const fixture = TestBed.createComponent(DashboardPage);
    fixture.detectChanges();
    TestBed.inject(HttpTestingController).expectOne(`${API_URL}/dashboard`).error(new ProgressEvent('error'), { status: 0 });
    fixture.detectChanges();
    const text = (fixture.nativeElement as HTMLElement).textContent!;
    expect(text).toContain("Can't reach the server");
    expect(text).not.toContain('HttpErrorResponse');
  });

  it('shows the empty state when there are no sales', () => {
    const fixture = TestBed.createComponent(DashboardPage);
    fixture.detectChanges();
    TestBed.inject(HttpTestingController).expectOne(`${API_URL}/dashboard`).flush({
      ...data, todaySales: 0, achievement: 0, remaining: 1000, status: 'Below Target', trend: data.trend.map((t) => ({ ...t, sales: 0 })),
    });
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('No sales recorded yet.');
  });
});

describe('helpers', () => {
  it('formats money', () => expect(formatMoney(1000, 'USD')).toBe('$1,000'));
  it('maps errors to friendly text', () => {
    expect(friendlyError(new HttpErrorResponse({ status: 500 }))).toBe('Something went wrong. Please try again.');
    expect(friendlyError(new HttpErrorResponse({ status: 400, error: { details: ['Bad amount'] } }))).toBe('Bad amount');
  });
});
