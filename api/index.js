import express from 'express';
import cors from 'cors';
import { requireAuth } from './middleware/auth.js';

import customersRoutes from './routes/customers.js';
import settingsRoutes from './routes/settings.js';
import archiveRoutes from './routes/archive.js';

const app = express();

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

app.use('/api/customers', requireAuth, customersRoutes);
app.use('/api/settings', requireAuth, settingsRoutes);
app.use('/api/archive', requireAuth, archiveRoutes);

app.get('/api', (req, res) => {
  res.json({ message: 'Arc API is running ✓' });
});

export default app;
