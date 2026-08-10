// ========================================================
// ROUTE TRANSAKSI KEUANGAN (CRUD)
// ========================================================

const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');
const cekLogin = require('../middleware/auth');

// Pastikan semua endpoint transaksi wajib Login dulu!
router.use(cekLogin);

// 1. LIHAT SEMUA TRANSAKSI SAYA
router.get('/', async (req, res) => {
  try {
    const { data: daftarTransaksi, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', req.user.id) // Kunci: Hanya data milik user ini saja
      .order('date', { ascending: false });

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    return res.json({ transactions: daftarTransaksi });
  } catch (err) {
    return res.status(500).json({ error: 'Gagal mengambil data transaksi.' });
  }
});

// 2. TAMBAH TRANSAKSI BARU (PEMASUKAN / PENGELUARAN)
router.post('/', async (req, res) => {
  try {
    const { title, amount, type, category } = req.body;

    if (!title || !amount || !type) {
      return res.status(400).json({ error: 'Judul, Jumlah, dan Jenis transaksi wajib diisi!' });
    }

    // Simpan ke database Supabase
    const { data: transaksiBaru, error } = await supabase
      .from('transactions')
      .insert([
        {
          user_id: req.user.id, // Otomatis mengikat ke ID user yang sedang login
          title: title,
          amount: Number(amount),
          type: type, // 'income' atau 'expense'
          category: category || 'Lainnya',
          date: new Date().toISOString().split('T')[0]
        }
      ])
      .select();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    return res.status(201).json({
      message: 'Berhasil menambah transaksi!',
      transaction: transaksiBaru[0]
    });
  } catch (err) {
    return res.status(500).json({ error: 'Gagal menyimpan transaksi.' });
  }
});

// 3. HAPUS TRANSAKSI
router.delete('/:id', async (req, res) => {
  try {
    const idTransaksi = req.params.id;

    const { data, error } = await supabase
      .from('transactions')
      .delete()
      .eq('id', idTransaksi)
      .eq('user_id', req.user.id) // Keamanan ganda: pastikan pemiliknya sama
      .select();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    return res.json({
      message: 'Transaksi berhasil dihapus.',
      deleted: data[0]
    });
  } catch (err) {
    return res.status(500).json({ error: 'Gagal menghapus transaksi.' });
  }
});

module.exports = router;
