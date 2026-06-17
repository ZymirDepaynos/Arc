import { fileURLToPath } from 'url';
import path from 'path';
import express from 'express';
import os from 'os';

function getLocalIpAddress() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      // Skip internal and non-IPv4 addresses
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return '<Your-Computer-IP>';
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Set environment variables BEFORE importing the API
process.env.NODE_ENV = 'production';
process.env.PORT = '5000';
process.env.JWT_SECRET = 'basic-ventures-offline-desktop-secret-key-2024';
process.env.DB_PATH = path.join(__dirname, 'data', 'local_database.sqlite');

try {
  const { default: apiServer } = await import('./api/index.js');
  
  // Serve the static compiled React frontend files
  apiServer.use(express.static(path.join(__dirname, 'frontend', 'dist')));

  // For any other route, serve index.html (React Router fallback)
  apiServer.use((req, res) => {
    res.sendFile(path.join(__dirname, 'frontend', 'dist', 'index.html'));
  });

  const PORT = process.env.PORT || 5000;
  
  // Bind to 0.0.0.0 so that devices on the local network can connect
  apiServer.listen(PORT, '0.0.0.0', () => {
    const localIp = getLocalIpAddress();
    console.log(`\n======================================================`);
    console.log(`[Server] Basic Ventures server is running!`);
    console.log(`[Server] Access locally at: http://localhost:${PORT}`);
    console.log(`[Server] Access from tablet at: http://${localIp}:${PORT}`);
    console.log(`======================================================\n`);
  });
} catch (err) {
  console.error(`[Server] Critical failure starting server:`, err);
  process.exit(1);
}
