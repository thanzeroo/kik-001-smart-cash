// ========================================================
// ROUTE TRANSAKSI KEUANGAN (CRUD DENGAN RELASI CATEGORIES)
// ========================================================

const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');
const cekLogin = require('../middleware/auth');

router.use(cekLogin);

// 1. LIHAT SEMUA TRANSAKSI SAYA (TERMASUK DETAIL KATEGORI VIA JOIN)
router.get('/', async (req, res) => {
  try {
    const { data: daftarTransaksi, error } = await supabase
      .from('transactions')
      .select('*, category:categories(id, name, type, icon)')
      .eq('user_id', req.user.id)
      .order('date', { ascending: false });

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    return res.json({ transactions: daftarTransaksi });
  } catch (err) {
    return res.status(500).json({ error: 'Gagal mengambil data transaksi.' });
  }
});

// 2. TAMBAH TRANSAKSI BARU
router.post('/', async (req, res) => {
  try {
    const { title, amount, type, category_id, description, date } = req.body;

    if (!title || amount === undefined || !type) {
      return res.status(400).json({ error: 'Judul, Jumlah, dan Jenis transaksi wajib diisi!' });
    }

    const { data: transaksiBaru, error } = await supabase
      .from('transactions')
      .insert([
        {
          user_id: req.user.id,
          title: title,
          amount: Number(amount),
          type: type,
          category_id: category_id || null,
          description: description || '',
          date: date || new Date().toISOString().split('T')[0]
        }
      ])
      .select('*, category:categories(id, name, type, icon)');

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
      .eq('user_id', req.user.id)
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
