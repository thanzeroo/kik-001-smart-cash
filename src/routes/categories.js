// ========================================================
// ROUTE KATEGORI (CATEGORIES)
// ========================================================

const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');
const cekLogin = require('../middleware/auth');

router.use(cekLogin);

// 1. LIHAT SEMUA KATEGORI (Kategori Sistem + Kategori Milik User)
router.get('/', async (req, res) => {
  try {
    const { data: daftarKategori, error } = await supabase
      .from('categories')
      .select('*')
      .or(`user_id.is.null,user_id.eq.${req.user.id}`)
      .order('name', { ascending: true });

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    return res.json({ categories: daftarKategori || [] });
  } catch (err) {
    console.error('Get categories error:', err);
    return res.status(500).json({ error: 'Gagal mengambil data kategori.' });
  }
});

// 2. TAMBAH KATEGORI CUSTOM BARU UNTUK USER
router.post('/', async (req, res) => {
  try {
    const { name, type, icon } = req.body;

    if (!name || name.trim() === '') {
      return res.status(400).json({ error: 'Nama kategori wajib diisi!' });
    }

    if (!type || !['income', 'expense'].includes(type)) {
      return res.status(400).json({ error: 'Tipe kategori harus income atau expense!' });
    }

    const { data: kategoriBaru, error } = await supabase
      .from('categories')
      .insert([
        {
          user_id: req.user.id,
          name: name.trim(),
          type: type,
          icon: icon || 'grid'
        }
      ])
      .select();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    return res.status(201).json({
      message: 'Kategori baru berhasil ditambahkan!',
      category: kategoriBaru?.[0] || null
    });
  } catch (err) {
    console.error('Create category error:', err);
    return res.status(500).json({ error: err.message || 'Gagal membuat kategori.' });
  }
});

// 3. HAPUS KATEGORI CUSTOM MILIK USER
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from('categories')
      .delete()
      .eq('id', id)
      .eq('user_id', req.user.id)
      .select();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    if (!data || data.length === 0) {
      return res.status(404).json({ error: 'Kategori tidak ditemukan atau kategori sistem bawaan tidak dapat dihapus.' });
    }

    return res.json({
      message: 'Kategori berhasil dihapus.',
      deleted: data[0]
    });
  } catch (err) {
    console.error('Delete category error:', err);
    return res.status(500).json({ error: 'Gagal menghapus kategori.' });
  }
});

module.exports = router;
