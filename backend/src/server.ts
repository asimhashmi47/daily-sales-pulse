import path from 'path';
import { createApp } from './app';
import { openDatabase } from './database/db';

const port = Number(process.env.PORT ?? 3000);
const dbFile = process.env.DB_FILE ?? path.join(__dirname, '..', 'data', 'sales.db');
const app = createApp(openDatabase(dbFile), process.env.CORS_ORIGIN);

app.listen(port, '127.0.0.1', () => console.log(`DailySalesPulse API on http://localhost:${port}`));
