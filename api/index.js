import express from 'express';
import cors from 'cors';

import debtorsRouter from './routes/debtors.js';

const app = express();

app.use(cors());
app.use(express.json());

app.use('/api/debtors', debtorsRouter);

app.get('/api', (req, res) => {
  res.json({ message: 'Arc API is running ✓' });
});

export default app;
