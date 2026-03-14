import express from 'express';
import cors from 'cors';
import db from './db.js';
import seed from './seed.js';
import domainsRouter from './routes/domains.js';
import elementsRouter from './routes/elements.js';
import relationshipsRouter from './routes/relationships.js';
import viewsRouter from './routes/views.js';
import exportRouter from './routes/export.js';
import batchRouter from './routes/batch.js';
import archimateIoRouter from './routes/archimate-io.js';
import csvIoRouter from './routes/csv-io.js';

const PORT = 3001;

// Importing db triggers schema creation; now seed if needed
seed();

const app = express();

app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
}));
app.use(express.json());

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

// CRUD routes
app.use('/api', domainsRouter);
app.use('/api', elementsRouter);
app.use('/api', relationshipsRouter);
app.use('/api', viewsRouter);
app.use('/api', exportRouter);
app.use('/api', batchRouter);
app.use('/api', archimateIoRouter);
app.use('/api', csvIoRouter);

app.listen(PORT, '0.0.0.0', () => {
  console.log(`[arch-vis] Server listening on 0.0.0.0:${PORT}`);
  // Quick sanity check that the DB is alive
  const count = (db.prepare('SELECT COUNT(*) AS cnt FROM elements').get() as { cnt: number }).cnt;
  console.log(`[arch-vis] Database has ${count} elements`);
});
