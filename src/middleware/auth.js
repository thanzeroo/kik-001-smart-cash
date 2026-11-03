// ========================================================
// MIDDLEWARE AUTENTIKASI (PENJAGA PINTU MASUK API)
// ========================================================

const supabase = require('../config/supabase');

async function cekLogin(req, res, next) {
  try {
    // Ambil header Authorization dari request browser/frontend
    const headerAuth = req.headers.authorization;
    
    // Cek apakah ada format: "Bearer <token>"
    if (!headerAuth || !headerAuth.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'Akses ditolak! Kamu belum login.',
        pesan: 'Akses ditolak! Kamu belum login.'
      });
    }

    // Ambil string token-nya saja
    const token = headerAuth.split(' ')[1]?.trim();

    if (!token || token === 'null' || token === 'undefined') {
      return res.status(401).json({
        error: 'Sesi login tidak valid, silakan login lagi.',
        pesan: 'Sesi login tidak valid, silakan login lagi.'
      });
    }

    // Minta Supabase verifikasi siapa pemilik token ini
    const { data, error } = await supabase.auth.getUser(token);

    if (error || !data || !data.user) {
      return res.status(401).json({
        error: 'Sesi login kamu sudah habis, silakan login lagi.',
        pesan: 'Sesi login kamu sudah habis, silakan login lagi.'
      });
    }

    // Simpan data user yang sedang login di req.user supaya bisa dipakai di route lain
    req.user = data.user;
    
    // Lanjut ke handler berikutnya!
    next();
  } catch (err) {
    console.error('Middleware Auth Error:', err);
    return res.status(500).json({
      error: 'Terjadi masalah pada sistem login server.',
      pesan: 'Terjadi masalah pada sistem login server.'
    });
  }
}

module.exports = cekLogin;
