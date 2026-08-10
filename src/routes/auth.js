// ========================================================
// ROUTE AUTENTIKASI (REGISTER & LOGIN)
// ========================================================

const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');
const cekLogin = require('../middleware/auth');

// 1. DAFAR AKUN BARU (REGISTER)
router.post('/register', async (req, res) => {
  try {
    const { email, password, username, full_name, role } = req.body;

    // Validasi sederhana
    if (!email || !password) {
      return res.status(400).json({ error: 'Email dan Password wajib diisi!' });
    }

    const usernameBaru = username || email.split('@')[0];

    // Buat user di Auth Supabase
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: email,
      password: password,
      email_confirm: true, // Langsung aktif tanpa perlu klik link email
      user_metadata: {
        username: usernameBaru,
        full_name: full_name || '',
        role: role || 'user',
      }
    });

    if (authError) {
      return res.status(400).json({ error: authError.message });
    }

    // Masukkan data profil tambahan ke tabel public.profiles di database
    await supabase.from('profiles').upsert([{
      id: authData.user.id,
      username: usernameBaru,
      full_name: full_name || '',
      role: role || 'user',
    }]);

    return res.status(201).json({
      message: 'Pendaftaran akun berhasil! Silakan Login.',
      user: authData.user
    });
  } catch (err) {
    return res.status(500).json({ error: 'Gagal mendaftarkan akun.' });
  }
});

// 2. MASUK AKUN (LOGIN)
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email dan Password wajib diisi!' });
    }

    // Login ke Supabase
    const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (loginError) {
      return res.status(400).json({ error: 'Email atau password salah!' });
    }

    // Ambil detail profil user dari tabel profiles
    const { data: profileData } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', loginData.user.id)
      .single();

    return res.json({
      message: 'Login Berhasil!',
      access_token: loginData.session.access_token,
      user: {
        ...loginData.user,
        profile: profileData || loginData.user.user_metadata
      }
    });
  } catch (err) {
    return res.status(500).json({ error: 'Terjadi masalah saat login.' });
  }
});

// 3. AMBIL DATA PROFIL AKUN SAYA (ME)
router.get('/me', cekLogin, async (req, res) => {
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', req.user.id)
    .single();

  return res.json({
    user: req.user,
    profile: profile || null
  });
});

module.exports = router;
