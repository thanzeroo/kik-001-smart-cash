// ========================================================
// AUTOMATED TEST SUITE - SMART CASH BACKEND
// ========================================================

const http = require('http');
const express = require('express');
const cors = require('cors');
require('dotenv').config();

const authRoutes = require('./src/routes/auth');
const transactionRoutes = require('./src/routes/transactions');
const categoryRoutes = require('./src/routes/categories');
const summaryRoutes = require('./src/routes/summary');

async function runTests() {
  console.log('🧪 Memulai Pengujian Otomatis Sistem Smart Cash...\n');

  const app = express();
  app.use(cors());
  app.use(express.json());

  app.use('/api/auth', authRoutes);
  app.use('/api/transactions', transactionRoutes);
  app.use('/api/categories', categoryRoutes);
  app.use('/api/summary', summaryRoutes);

  const server = http.createServer(app);
  await new Promise(resolve => server.listen(0, resolve));
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}`;
  console.log(`✅ Test server aktif pada port ${port}`);

  let passed = 0;
  let failed = 0;

  async function testCase(name, fn) {
    try {
      await fn();
      console.log(`  ✅ [PASS] ${name}`);
      passed++;
    } catch (err) {
      console.error(`  ❌ [FAIL] ${name}: ${err.message}`);
      failed++;
    }
  }

  // TEST 1: Register tanpa email/password harus ditolak (400)
  await testCase('Auth Register - Validasi input kosong (400)', async () => {
    const res = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    });
    if (res.status !== 400) throw new Error(`Expected 400, got ${res.status}`);
  });

  // TEST 2: Register password < 6 karakter harus ditolak (400)
  await testCase('Auth Register - Validasi panjang password (400)', async () => {
    const res = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'test@example.com', password: '123' })
    });
    if (res.status !== 400) throw new Error(`Expected 400, got ${res.status}`);
  });

  // TEST 3: Login tanpa input harus ditolak (400)
  await testCase('Auth Login - Validasi input kosong (400)', async () => {
    const res = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    });
    if (res.status !== 400) throw new Error(`Expected 400, got ${res.status}`);
  });

  // TEST 4: Akses rute yang butuh auth tanpa token harus 401
  await testCase('Middleware Auth - Akses tanpa token di /api/transactions (401)', async () => {
    const res = await fetch(`${baseUrl}/api/transactions`);
    if (res.status !== 401) throw new Error(`Expected 401, got ${res.status}`);
  });

  await testCase('Middleware Auth - Akses tanpa token di /api/categories (401)', async () => {
    const res = await fetch(`${baseUrl}/api/categories`);
    if (res.status !== 401) throw new Error(`Expected 401, got ${res.status}`);
  });

  await testCase('Middleware Auth - Akses tanpa token di /api/summary (401)', async () => {
    const res = await fetch(`${baseUrl}/api/summary`);
    if (res.status !== 401) throw new Error(`Expected 401, got ${res.status}`);
  });

  await testCase('Middleware Auth - Format token salah atau Bearer kosong (401)', async () => {
    const res = await fetch(`${baseUrl}/api/transactions`, {
      headers: { 'Authorization': 'Bearer ' }
    });
    if (res.status !== 401) throw new Error(`Expected 401, got ${res.status}`);
  });

  await new Promise(resolve => server.close(resolve));
  console.log(`\n📊 Hasil Pengujian: ${passed} Passed, ${failed} Failed`);

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});

