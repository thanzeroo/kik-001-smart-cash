const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');
const authenticateUser = require('../middleware/auth');

// Semuanya menggunakan middleware autentikasi
router.use(authenticateUser);

// GET /api/transactions - Ambil daftar transaksi user
router.get('/', async (req, res) => {
  const { type, category } = req.query;
  
  let query = supabase
    .from('transactions')
    .select('*')
    .eq('user_id', req.user.id)
    .order('date', { ascending: false });

  if (type) {
    query = query.eq('type', type);
  }
  if (category) {
    query = query.eq('category', category);
  }

  const { data, error } = await query;

  if (error) {
    return res.status(400).json({ error: error.message });
  }

  return res.json({ transactions: data });
});

// POST /api/transactions - Tambah transaksi baru
router.post('/', async (req, res) => {
  const { title, amount, type, category, date } = req.body;

  if (!title || amount === undefined || !type) {
    return res.status(400).json({ error: 'Title, amount, dan type (income/expense) wajib diisi.' });
  }

  if (!['income', 'expense'].includes(type)) {
    return res.status(400).json({ error: "Type harus berupa 'income' atau 'expense'." });
  }

  const { data, error } = await supabase
    .from('transactions')
    .insert([
      {
        user_id: req.user.id,
        title,
        amount: Number(amount),
        type,
        category: category || 'Lainnya',
        date: date || new Date().toISOString().split('T')[0],
      },
    ])
    .select();

  if (error) {
    return res.status(400).json({ error: error.message });
  }

  return res.status(201).json({
    message: 'Transaksi berhasil ditambahkan.',
    transaction: data[0],
  });
});

// PUT /api/transactions/:id - Update transaksi
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { title, amount, type, category, date } = req.body;

  const updateData = {};
  if (title !== undefined) updateData.title = title;
  if (amount !== undefined) updateData.amount = Number(amount);
  if (type !== undefined) {
    if (!['income', 'expense'].includes(type)) {
      return res.status(400).json({ error: "Type harus berupa 'income' atau 'expense'." });
    }
    updateData.type = type;
  }
  if (category !== undefined) updateData.category = category;
  if (date !== undefined) updateData.date = date;

  const { data, error } = await supabase
    .from('transactions')
    .update(updateData)
    .eq('id', id)
    .eq('user_id', req.user.id)
    .select();

  if (error) {
    return res.status(400).json({ error: error.message });
  }

  if (!data || data.length === 0) {
    return res.status(404).json({ error: 'Transaksi tidak ditemukan atau Anda tidak memiliki akses.' });
  }

  return res.json({
    message: 'Transaksi berhasil diperbarui.',
    transaction: data[0],
  });
});

// DELETE /api/transactions/:id - Hapus transaksi
router.delete('/:id', async (req, res) => {
  const { id } = req.params;

  const { data, error } = await supabase
    .from('transactions')
    .delete()
    .eq('id', id)
    .eq('user_id', req.user.id)
    .select();

  if (error) {
    return res.status(400).json({ error: error.message });
  }

  if (!data || data.length === 0) {
    return res.status(404).json({ error: 'Transaksi tidak ditemukan atau Anda tidak memiliki akses.' });
  }

  return res.json({
    message: 'Transaksi berhasil dihapus.',
    deleted: data[0],
  });
});

module.exports = router;
