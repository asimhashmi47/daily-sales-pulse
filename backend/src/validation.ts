import { badRequest } from './errors';
import { CURRENCIES, Currency, SaleInput, SettingsInput } from './models/types';

const MAX_AMOUNT = 1_000_000_000;
const MAX_NOTE = 200;

export function isValidDate(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const d = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value;
}

function isValidMoney(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= MAX_AMOUNT;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

export function parseSaleInput(body: unknown): SaleInput {
  const b = (body ?? {}) as Record<string, unknown>;
  const errors: string[] = [];
  if (!isValidDate(b.date)) errors.push('Date is required and must be a valid date (YYYY-MM-DD).');
  if (!isValidMoney(b.amount)) errors.push(`Sales amount must be a number between 0 and ${MAX_AMOUNT}.`);
  let note: string | null = null;
  if (b.note !== undefined && b.note !== null) {
    if (typeof b.note !== 'string' || b.note.length > MAX_NOTE) {
      errors.push(`Note must be text of at most ${MAX_NOTE} characters.`);
    } else {
      note = b.note.trim() || null;
    }
  }
  if (errors.length) throw badRequest('Invalid sale.', errors);
  return { date: b.date as string, amount: round2(b.amount as number), note };
}

export function parseSettingsInput(body: unknown): SettingsInput {
  const b = (body ?? {}) as Record<string, unknown>;
  const errors: string[] = [];
  if (!isValidMoney(b.dailyTarget)) errors.push(`Daily target must be a number between 0 and ${MAX_AMOUNT}.`);
  if (!CURRENCIES.includes(b.currency as Currency)) errors.push(`Currency must be one of ${CURRENCIES.join(', ')}.`);
  if (errors.length) throw badRequest('Invalid settings.', errors);
  return { dailyTarget: round2(b.dailyTarget as number), currency: b.currency as Currency };
}

export function parseId(raw: string): number {
  if (!/^\d+$/.test(raw)) throw badRequest('Invalid id.');
  return Number(raw);
}
