import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../src/app';
import { openDatabase } from '../src/database/db';
import { calcAchievement, calcRemaining, calcStatus, DashboardService, lastNDates, toDateString } from '../src/services/dashboardService';

let app: ReturnType<typeof createApp>;
let db: ReturnType<typeof openDatabase>;
const today = toDateString(new Date());

beforeEach(() => {
  db = openDatabase(':memory:');
  app = createApp(db);
});

describe('sales CRUD', () => {
  it('creates, reads, updates and deletes a sale', async () => {
    const created = await request(app).post('/api/sales').send({ date: today, amount: 850, note: 'Good' });
    expect(created.status).toBe(201);
    const id = created.body.id;

    const updated = await request(app).put(`/api/sales/${id}`).send({ date: today, amount: 900, note: '' });
    expect(updated.body.amount).toBe(900);
    expect(updated.body.note).toBeNull();

    expect((await request(app).get(`/api/sales/${id}`)).status).toBe(200);
    expect((await request(app).delete(`/api/sales/${id}`)).status).toBe(204);
    expect((await request(app).get(`/api/sales/${id}`)).status).toBe(404);
  });

  it.each([
    [{ date: today, amount: -5 }],
    [{ date: '2026-13-45', amount: 5 }],
    [{ amount: 5 }],
    [{ date: today, amount: 'abc' }],
    [{ date: today, amount: 5, note: 'x'.repeat(201) }],
  ])('rejects invalid sale %j', async (body) => {
    const res = await request(app).post('/api/sales').send(body);
    expect(res.status).toBe(400);
    expect(res.body.details.length).toBeGreaterThan(0);
  });

  it('returns 404 for unknown id and 400 for bad id', async () => {
    expect((await request(app).put('/api/sales/999').send({ date: today, amount: 1 })).status).toBe(404);
    expect((await request(app).get('/api/sales/abc')).status).toBe(400);
  });

  it('filters by date text and treats SQL as plain text', async () => {
    await request(app).post('/api/sales').send({ date: '2026-01-05', amount: 1 });
    await request(app).post('/api/sales').send({ date: '2026-02-05', amount: 2 });
    expect((await request(app).get('/api/sales?search=2026-01')).body).toHaveLength(1);
    expect((await request(app).get("/api/sales?search=' OR 1=1 --")).body).toHaveLength(0);
  });

  it('returns 400 for malformed JSON without leaking details', async () => {
    const res = await request(app).post('/api/sales').set('Content-Type', 'application/json').send('{bad');
    expect(res.status).toBe(400);
    expect(JSON.stringify(res.body)).not.toMatch(/SyntaxError|at /);
  });
});

describe('settings', () => {
  it('has defaults, updates and validates', async () => {
    expect((await request(app).get('/api/settings')).body).toMatchObject({ dailyTarget: 1000, currency: 'USD' });
    const ok = await request(app).put('/api/settings').send({ dailyTarget: 1500, currency: 'PKR' });
    expect(ok.body).toMatchObject({ dailyTarget: 1500, currency: 'PKR' });
    expect((await request(app).put('/api/settings').send({ dailyTarget: -1, currency: 'USD' })).status).toBe(400);
    expect((await request(app).put('/api/settings').send({ dailyTarget: 1, currency: 'XXX' })).status).toBe(400);
  });
});

describe('dashboard', () => {
  it('is sane on an empty database', async () => {
    const { body } = await request(app).get('/api/dashboard');
    expect(body).toMatchObject({ todaySales: 0, dailyTarget: 1000, achievement: 0, remaining: 1000, status: 'Below Target' });
    expect(body.trend).toHaveLength(7);
  });

  it('sums multiple sales today and computes progress', async () => {
    await request(app).post('/api/sales').send({ date: today, amount: 500 });
    await request(app).post('/api/sales').send({ date: today, amount: 350 });
    const { body } = await request(app).get('/api/dashboard');
    expect(body).toMatchObject({ todaySales: 850, achievement: 85, remaining: 150, status: 'Near Target' });
  });

  it('returns exactly 7 days with zeros for missing days', () => {
    const now = new Date(2026, 8, 29);
    db.prepare("INSERT INTO sales (date, amount, createdAt, updatedAt) VALUES ('2026-09-27', 700, 'x', 'x')").run();
    db.prepare("INSERT INTO sales (date, amount, createdAt, updatedAt) VALUES ('2026-09-01', 999, 'x', 'x')").run();
    const { trend } = new DashboardService(db).get(now);
    expect(trend.map((t) => t.date)).toEqual(lastNDates(7, now));
    expect(trend[0].date).toBe('2026-09-23');
    expect(trend.map((t) => t.sales)).toEqual([0, 0, 0, 0, 700, 0, 0]);
  });
});

describe('business rules', () => {
  it('computes status thresholds', () => {
    expect(calcStatus(1000, 1000)).toBe('Target Achieved');
    expect(calcStatus(800, 1000)).toBe('Near Target');
    expect(calcStatus(799, 1000)).toBe('Below Target');
  });

  it('handles zero target without dividing by zero', () => {
    expect(calcAchievement(0, 0)).toBe(0);
    expect(calcAchievement(50, 0)).toBe(100);
    expect(calcRemaining(50, 0)).toBe(0);
    expect(calcStatus(0, 0)).toBe('Below Target');
    expect(calcStatus(50, 0)).toBe('Target Achieved');
  });

  it('caps remaining at zero', () => {
    expect(calcRemaining(1200, 1000)).toBe(0);
    expect(calcAchievement(1200, 1000)).toBe(120);
  });
});
