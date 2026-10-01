import cors from 'cors';
import express, { NextFunction, Request, Response } from 'express';
import { Db } from './database/db';
import { HttpError } from './errors';
import { DashboardService } from './services/dashboardService';
import { SalesService } from './services/salesService';
import { SettingsService } from './services/settingsService';
import { parseId, parseSaleInput, parseSettingsInput } from './validation';

export function createApp(db: Db, corsOrigin = 'http://localhost:4200') {
  const sales = new SalesService(db);
  const settings = new SettingsService(db);
  const dashboard = new DashboardService(db);

  const app = express();
  app.disable('x-powered-by');
  app.use(cors({ origin: corsOrigin }));
  app.use(express.json({ limit: '10kb' }));

  app.get('/api/dashboard', (_req, res) => res.json(dashboard.get()));

  app.get('/api/sales', (req, res) => {
    const search = typeof req.query.search === 'string' ? req.query.search.trim().slice(0, 20) : undefined;
    res.json(sales.list(search));
  });
  app.get('/api/sales/:id', (req, res) => res.json(sales.get(parseId(req.params.id))));
  app.post('/api/sales', (req, res) => res.status(201).json(sales.create(parseSaleInput(req.body))));
  app.put('/api/sales/:id', (req, res) =>
    res.json(sales.update(parseId(req.params.id), parseSaleInput(req.body))),
  );
  app.delete('/api/sales/:id', (req, res) => {
    sales.remove(parseId(req.params.id));
    res.status(204).end();
  });

  app.get('/api/settings', (_req, res) => res.json(settings.get()));
  app.put('/api/settings', (req, res) => res.json(settings.update(parseSettingsInput(req.body))));

  app.use('/api', (_req, _res, next) => next(new HttpError(404, 'Route not found.')));

  // Centralized error handler: never leaks internals to the client.
  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    if (err instanceof HttpError) {
      return res.status(err.status).json({ error: err.message, details: err.details });
    }
    const status = (err as { status?: number })?.status;
    if (status === 400 || status === 413) {
      return res.status(status).json({ error: 'Invalid request body.' });
    }
    console.error('[error]', err);
    res.status(500).json({ error: 'Something went wrong. Please try again.' });
  });

  return app;
}
