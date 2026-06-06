import express from 'express';
import cors from 'cors';
import { requireAuth } from './middleware/auth.js';

import debtorsRoutes from './routes/debtors.js';
import settingsRoutes from './routes/settings.js';

const app = express();

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

app.use('/api/debtors', requireAuth, debtorsRoutes);
app.use('/api/settings', requireAuth, settingsRoutes);

app.get('/api', (req, res) => {
  res.json({ message: 'Arc API is running ✓' });
});

export default app;
