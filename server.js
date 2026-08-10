const express = require('express');
const cors = require('cors');
require('dotenv').config();

const authRoutes = require('./src/routes/auth');
const transactionRoutes = require('./src/routes/transactions');
const summaryRoutes = require('./src/routes/summary');

const app = express();
const PORT = process.env.PORT || 5000;

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.static('public'));


// Base Route / Health Check
app.get('/', (req, res) => {
  res.json({
    status: 'online',
    message: 'Backend Keuangan API - Terhubung dengan Supabase',
    endpoints: {
      auth: '/api/auth',
      transactions: '/api/transactions',
      summary: '/api/summary',
    },
  });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/summary', summaryRoutes);

// Error Handling Middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Terjadi kesalahan internal server.' });
});

app.listen(PORT, () => {
  console.log(`🚀 Server backend berjalan di http://localhost:${PORT}`);
});
