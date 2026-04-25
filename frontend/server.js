import 'dotenv/config';

import app from './api/index.js';

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Arc local backend running on port ${PORT}`);
});
