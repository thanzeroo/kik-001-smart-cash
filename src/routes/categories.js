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

    return res.json({ categories: daftarKategori });
  } catch (err) {
    return res.status(500).json({ error: 'Gagal mengambil data kategori.' });
  }
});

// 2. TAMBAH KATEGORI CUSTOM BARU UNTUK USER
router.post('/', async (req, res) => {
  try {
    const { name, type, icon } = req.body;

    if (!name || !type) {
      return res.status(400).json({ error: 'Nama dan Tipe kategori wajib diisi!' });
    }

    const { data: kategoriBaru, error } = await supabase
      .from('categories')
      .insert([
        {
          user_id: req.user.id,
          name: name,
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
      category: kategoriBaru[0]
    });
  } catch (err) {
    return res.status(500).json({ error: 'Gagal membuat kategori.' });
  }
});

module.exports = router;
