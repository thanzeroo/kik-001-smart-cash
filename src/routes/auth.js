const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');
const authenticateUser = require('../middleware/auth');

// Register User (Otomatis Verified via Admin Client & Sync ke public.profiles)
router.post('/register', async (req, res) => {
  const { email, password, username, full_name, role } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email dan password wajib diisi.' });
  }

  const generatedUsername = username || email.split('@')[0];

  // 1. Buat user di Auth Supabase
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      username: generatedUsername,
      full_name: full_name || '',
      role: role || 'user',
    }
  });

  if (error) {
    return res.status(400).json({ error: error.message });
  }

  const user = data.user;

  // 2. Simpan/Sync data profil ke tabel public.profiles di Database
  const { error: profileError } = await supabase
    .from('profiles')
    .upsert([
      {
        id: user.id,
        username: generatedUsername,
        full_name: full_name || '',
        role: role || 'user',
      }
    ]);

  if (profileError) {
    console.warn('Profile sync warning:', profileError.message);
  }

  return res.status(201).json({
    message: 'Registrasi user baru berhasil! Tersimpan di tabel profiles.',
    user: {
      id: user.id,
      email: user.email,
      username: generatedUsername,
      full_name: full_name || '',
      role: role || 'user',
    },
  });
});

// Login User
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email dan password wajib diisi.' });
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return res.status(400).json({ error: error.message });
  }

  // Ambil data profile lengkap dari public.profiles
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', data.user.id)
    .single();

  return res.json({
    message: 'Login berhasil.',
    access_token: data.session.access_token,
    user: {
      ...data.user,
      profile: profile || {
        username: data.user.user_metadata?.username,
        full_name: data.user.user_metadata?.full_name,
        role: data.user.user_metadata?.role || 'user'
      }
    },
  });
});

// Get User Profile
router.get('/me', authenticateUser, async (req, res) => {
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', req.user.id)
    .single();

  return res.json({
    user: req.user,
    profile: profile || null,
  });
});

module.exports = router;
