// ========================================================
// ROUTE TRANSAKSI KEUANGAN (CRUD DENGAN COMPATIBILITY CATEGORIES)
// ========================================================

const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');
const cekLogin = require('../middleware/auth');

router.use(cekLogin);

// Cache untuk mengecek apakah kolom 'category_id' ada di tabel transactions
let hasCategoryIdCache = null;
let lastCheckTime = 0;

async function checkCategoryIdSupport() {
  const now = Date.now();
  if (hasCategoryIdCache !== null && (now - lastCheckTime < 30000)) {
    return hasCategoryIdCache;
  }
  const { error } = await supabase.from('transactions').select('category_id').limit(1);
  hasCategoryIdCache = !error;
  lastCheckTime = now;
  return hasCategoryIdCache;
}

// 1. LIHAT SEMUA TRANSAKSI SAYA (TERMASUK DETAIL KATEGORI)
router.get('/', async (req, res) => {
  try {
    const hasCatId = await checkCategoryIdSupport();

    if (hasCatId) {
      // Skema baru: query dengan join category:categories
      const { data: txWithJoin, error: joinErr } = await supabase
        .from('transactions')
        .select('*, category:categories(id, name, type, icon)')
        .eq('user_id', req.user.id)
        .order('date', { ascending: false });

      if (!joinErr && txWithJoin) {
        return res.json({ transactions: txWithJoin });
      }
    }

    // Fallback: select '*' biasa (kompatibel dengan schema lama di mana category bertipe TEXT)
    const { data: daftarTransaksi, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', req.user.id)
      .order('date', { ascending: false });

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    const items = daftarTransaksi || [];

    // Ambil daftar kategori agar bisa dipetakan
    let categoriesList = [];
    try {
      const { data: cats } = await supabase
        .from('categories')
        .select('id, name, type, icon');
      categoriesList = cats || [];
    } catch (_) {}

    const catById = new Map();
    const catByName = new Map();
    categoriesList.forEach(c => {
      catById.set(c.id, c);
      catByName.set(c.name.toLowerCase(), c);
    });

    const normalized = items.map(tx => {
      let catObj = null;

      if (tx.category && typeof tx.category === 'object') {
        catObj = tx.category;
      } else if (tx.category_id && catById.has(tx.category_id)) {
        catObj = catById.get(tx.category_id);
      } else if (typeof tx.category === 'string') {
        const found = catByName.get(tx.category.toLowerCase()) || catById.get(tx.category);
        catObj = found || { name: tx.category, icon: 'grid' };
      }

      return {
        ...tx,
        category: catObj || { name: 'Lainnya', icon: 'grid' }
      };
    });

    return res.json({ transactions: normalized });
  } catch (err) {
    console.error('Get transactions error:', err);
    return res.status(500).json({ error: 'Gagal mengambil data transaksi.' });
  }
});

// 2. TAMBAH TRANSAKSI BARU
router.post('/', async (req, res) => {
  try {
    const { title, amount, type, category_id, category, description, date } = req.body;

    if (!title || title.trim() === '') {
      return res.status(400).json({ error: 'Keterangan transaksi wajib diisi!' });
    }

    const parsedAmount = Number(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      return res.status(400).json({ error: 'Nominal transaksi harus berupa angka lebih dari 0!' });
    }

    if (!type || !['income', 'expense'].includes(type)) {
      return res.status(400).json({ error: 'Tipe transaksi harus income atau expense!' });
    }

    const txDate = date || new Date().toISOString().split('T')[0];
    const hasCatId = await checkCategoryIdSupport();

    let insertPayload = {
      user_id: req.user.id,
      title: title.trim(),
      amount: parsedAmount,
      type: type,
      date: txDate
    };

    let categoryObj = null;

    if (hasCatId) {
      // Skema baru: menggunakan category_id UUID
      insertPayload.category_id = category_id || null;
      if (description !== undefined) insertPayload.description = description;

      const { data: newTx, error: insertErr } = await supabase
        .from('transactions')
        .insert([insertPayload])
        .select('*, category:categories(id, name, type, icon)');

      if (insertErr) {
        return res.status(400).json({ error: insertErr.message });
      }

      return res.status(201).json({
        message: 'Berhasil menambah transaksi!',
        transaction: newTx?.[0] || null
      });
    } else {
      // Skema lama: menggunakan kolom 'category' (TEXT)
      let catName = category || 'Lainnya';
      if (category_id) {
        try {
          const { data: catData } = await supabase
            .from('categories')
            .select('id, name, type, icon')
            .eq('id', category_id)
            .single();
          if (catData && catData.name) {
            catName = catData.name;
            categoryObj = catData;
          }
        } catch (_) {}
      }

      insertPayload.category = catName;

      const { data: newTx, error: insertErr } = await supabase
        .from('transactions')
        .insert([insertPayload])
        .select('*');

      if (insertErr) {
        return res.status(400).json({ error: insertErr.message });
      }

      const txResult = newTx?.[0] || null;
      if (txResult) {
        txResult.category = categoryObj || { name: catName, icon: 'grid' };
      }

      return res.status(201).json({
        message: 'Berhasil menambah transaksi!',
        transaction: txResult
      });
    }
  } catch (err) {
    console.error('Create transaction error:', err);
    return res.status(500).json({ error: err.message || 'Gagal menyimpan transaksi.' });
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

    if (!data || data.length === 0) {
      return res.status(404).json({ error: 'Transaksi tidak ditemukan atau bukan milik kamu.' });
    }

    return res.json({
      message: 'Transaksi berhasil dihapus.',
      deleted: data[0]
    });
  } catch (err) {
    console.error('Delete transaction error:', err);
    return res.status(500).json({ error: 'Gagal menghapus transaksi.' });
  }
});

module.exports = router;
