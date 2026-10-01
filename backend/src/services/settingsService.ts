import { Db } from '../database/db';
import { Settings, SettingsInput } from '../models/types';

export class SettingsService {
  constructor(private db: Db) {}

  get(): Settings {
    return this.db.prepare('SELECT * FROM settings WHERE id = 1').get() as Settings;
  }

  update(input: SettingsInput): Settings {
    this.db
      .prepare('UPDATE settings SET dailyTarget = ?, currency = ?, updatedAt = ? WHERE id = 1')
      .run(input.dailyTarget, input.currency, new Date().toISOString());
    return this.get();
  }
}
