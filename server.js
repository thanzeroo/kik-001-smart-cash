// ========================================================
// SERVER UTAMA - EXPRESS JS (BACKEND SMART CASH)
// ========================================================

const express = require('express');
const cors = require('cors');
require('dotenv').config();

// Import Route / Jalur API
const authRoutes = require('./src/routes/auth');
const transactionRoutes = require('./src/routes/transactions');
const summaryRoutes = require('./src/routes/summary');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware Aplikasi
app.use(cors());
app.use(express.json());
app.use(express.static('public')); // Melayani tampilan Web GUI Dashboard

// Hubungkan Jalur API
app.use('/api/auth', authRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/summary', summaryRoutes);

// Jalankan Server Express
app.listen(PORT, () => {
  console.log(`\n🚀 Server Smart Cash Berjalan di http://localhost:${PORT}`);
});
