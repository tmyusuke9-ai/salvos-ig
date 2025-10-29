import express from 'express';
import cors from 'cors';
import { router } from './routes/index.js';

export const app = express();
app.use(cors());
app.use(express.json({ limit: '5mb' }));
app.use('/api', router);

app.get('/health', (_req, res) => res.json({ ok: true }));
