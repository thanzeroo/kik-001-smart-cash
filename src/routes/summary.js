// ========================================================
// ROUTE RINGKASAN KEUANGAN (SUMMARY)
// ========================================================

const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');
const cekLogin = require('../middleware/auth');

router.use(cekLogin);

// MENGHITUNG TOTAL PEMASUKAN, PENGELUARAN & SISA SALDO
router.get('/', async (req, res) => {
  try {
    // Ambil semua transaksi milik user yang login
    const { data: daftarTransaksi, error } = await supabase
      .from('transactions')
      .select('amount, type')
      .eq('user_id', req.user.id);

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    let totalPemasukan = 0;
    let totalPengeluaran = 0;

    const list = daftarTransaksi || [];

    // Hitung total dari masing-masing jenis transaksi
    list.forEach((item) => {
      const nominal = Number(item.amount) || 0;
      if (item.type === 'income') {
        totalPemasukan += nominal;
      } else if (item.type === 'expense') {
        totalPengeluaran += nominal;
      }
    });

    const sisaSaldo = totalPemasukan - totalPengeluaran;

    return res.json({
      summary: {
        total_income: totalPemasukan,
        total_expense: totalPengeluaran,
        balance: sisaSaldo,
        total_transactions: list.length
      }
    });
  } catch (err) {
    console.error('Summary calculation error:', err);
    return res.status(500).json({ error: 'Gagal mengkalkulasi ringkasan keuangan.' });
  }
});

module.exports = router;
