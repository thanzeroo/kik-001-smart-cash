// ========================================================
// ROUTE AUTENTIKASI (REGISTER, LOGIN, & PROFILE)
// ========================================================

const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');
const cekLogin = require('../middleware/auth');

// 1. DAFTAR AKUN BARU (REGISTER)
router.post('/register', async (req, res) => {
  try {
    const { email, password, username, full_name, role } = req.body;

    // Validasi sederhana
    if (!email || !password) {
      return res.status(400).json({ error: 'Email dan Password wajib diisi!' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password minimal 6 karakter!' });
    }

    const usernameBaru = (username || email.split('@')[0]).trim();
    const cleanEmail = email.trim().toLowerCase();

    let authUser = null;

    // Buat user di Supabase (Gunakan admin jika tersedia agar otomatis email_confirm: true)
    if (supabase.auth.admin && typeof supabase.auth.admin.createUser === 'function') {
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: cleanEmail,
        password: password,
        email_confirm: true, // Langsung aktif tanpa perlu klik tautan email
        user_metadata: {
          username: usernameBaru,
          full_name: (full_name || '').trim(),
          role: role || 'user',
        }
      });

      if (authError) {
        return res.status(400).json({ error: authError.message });
      }
      authUser = authData?.user;
    } else {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: cleanEmail,
        password: password,
        options: {
          data: {
            username: usernameBaru,
            full_name: (full_name || '').trim(),
            role: role || 'user',
          }
        }
      });

      if (authError) {
        return res.status(400).json({ error: authError.message });
      }
      authUser = authData?.user;
    }

    if (!authUser) {
      return res.status(400).json({ error: 'Gagal membuat pengguna baru.' });
    }

    // Masukkan data profil tambahan ke tabel public.profiles di database jika ada
    try {
      await supabase.from('profiles').upsert([{
        id: authUser.id,
        username: usernameBaru,
        full_name: (full_name || '').trim(),
        role: role || 'user',
      }]);
    } catch (upsertErr) {
      console.warn('Upsert profile warning:', upsertErr.message);
    }

    return res.status(201).json({
      message: 'Pendaftaran akun berhasil! Silakan Login.',
      user: authUser
    });
  } catch (err) {
    console.error('Register error:', err);
    return res.status(500).json({ error: err.message || 'Gagal mendaftarkan akun.' });
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
      email: email.trim().toLowerCase(),
      password,
    });

    if (loginError) {
      return res.status(400).json({ error: 'Email atau password salah! (' + loginError.message + ')' });
    }

    if (!loginData.session) {
      return res.status(400).json({ error: 'Sesi login tidak didapatkan. Pastikan email sudah terkonfirmasi.' });
    }

    // Ambil detail profil user dari tabel profiles jika ada
    let profileData = null;
    try {
      const { data: prof } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', loginData.user.id)
        .single();
      profileData = prof;
    } catch (e) {
      console.warn('Profile fetch warning:', e.message);
    }

    const userProfile = profileData || loginData.user.user_metadata || {};

    return res.json({
      message: 'Login Berhasil!',
      access_token: loginData.session.access_token,
      user: {
        ...loginData.user,
        profile: userProfile
      }
    });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ error: err.message || 'Terjadi masalah saat login.' });
  }
});

// 3. AMBIL DATA PROFIL AKUN SAYA (ME)
router.get('/me', cekLogin, async (req, res) => {
  try {
    let profile = null;
    try {
      const { data: prof } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', req.user.id)
        .single();
      profile = prof;
    } catch (e) {
      console.warn('Fetch profile warning:', e.message);
    }

    const userProfile = profile || req.user.user_metadata || {};

    return res.json({
      user: {
        ...req.user,
        profile: userProfile
      },
      profile: userProfile
    });
  } catch (err) {
    console.error('Me endpoint error:', err);
    return res.status(500).json({ error: 'Gagal mengambil data user.' });
  }
});

module.exports = router;
