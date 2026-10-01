import { Db } from '../database/db';
import { notFound } from '../errors';
import { Sale, SaleInput } from '../models/types';

export class SalesService {
  constructor(private db: Db) {}

  list(search?: string): Sale[] {
    if (search) {
      return this.db
        .prepare('SELECT * FROM sales WHERE date LIKE ? ORDER BY date DESC, id DESC')
        .all(`%${search.replace(/[%_\\]/g, '')}%`) as Sale[];
    }
    return this.db.prepare('SELECT * FROM sales ORDER BY date DESC, id DESC').all() as Sale[];
  }

  get(id: number): Sale {
    const sale = this.db.prepare('SELECT * FROM sales WHERE id = ?').get(id) as Sale | undefined;
    if (!sale) throw notFound('Sale not found.');
    return sale;
  }

  create(input: SaleInput): Sale {
    const now = new Date().toISOString();
    const res = this.db
      .prepare('INSERT INTO sales (date, amount, note, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?)')
      .run(input.date, input.amount, input.note, now, now);
    return this.get(Number(res.lastInsertRowid));
  }

  update(id: number, input: SaleInput): Sale {
    const res = this.db
      .prepare('UPDATE sales SET date = ?, amount = ?, note = ?, updatedAt = ? WHERE id = ?')
      .run(input.date, input.amount, input.note, new Date().toISOString(), id);
    if (res.changes === 0) throw notFound('Sale not found.');
    return this.get(id);
  }

  remove(id: number): void {
    const res = this.db.prepare('DELETE FROM sales WHERE id = ?').run(id);
    if (res.changes === 0) throw notFound('Sale not found.');
  }
}
