// ========================================================
// MIDDLEWARE AUTENTIKASI (PENJAGA PINTU API)
// ========================================================
// Fungsi middleware ini bertugas mengecek token JWT dari frontend.
// Jika token valid -> Boleh lanjut (next).
// Jika token tidak ada / palsu -> Ditolak (401 Unauthorized).

const supabase = require('../config/supabase');

async function cekLogin(req, res, next) {
  try {
    // Ambil header Authorization dari request browser/frontend
    const headerAuth = req.headers.authorization;
    
    // Cek apakah ada format: "Bearer <token>"
    if (!headerAuth || !headerAuth.startsWith('Bearer ')) {
      return res.status(401).json({ pesan: 'Akses ditolak! Kamu belum login.' });
    }

    // Ambil string token-nya saja
    const token = headerAuth.split(' ')[1];

    // Minta Supabase verifikasi siapa pemilik token ini
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      return res.status(401).json({ pesan: 'Sesi login kamu sudah habis, silakan login lagi.' });
    }

    // Simpan data user yang sedang login di req.user supaya bisa dipakai di route lain
    req.user = user;
    
    // Lanjut ke handler berikutnya!
    next();
  } catch (err) {
    return res.status(500).json({ pesan: 'Terjadi masalah pada sistem login server.' });
  }
}

module.exports = cekLogin;
