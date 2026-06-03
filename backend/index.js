const express = require('express');
const cors = require('cors');
require('dotenv').config();

const debtorsRouter = require('./routes/debtors');
const settingsRouter = require('./routes/settings');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

app.use('/api/debtors', debtorsRouter);
app.use('/api/settings', settingsRouter);

app.get('/', (req, res) => {
  res.json({ message: 'Arc API is running ✓' });
});

app.listen(PORT, () => {
  console.log(`Arc backend running on port ${PORT}`);
});
