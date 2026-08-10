// ========================================================
// CONFIG KONEKSI SUPABASE
// ========================================================
// Berisi inisialisasi koneksi antara Express ke Supabase
// Supabase menyediakan 2 kunci: URL dan API Key (Anon/Service Role)

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_KEY;

// Peringatan jika lupa isi file .env
if (!url || !key) {
  console.log('⚠️ Waduh! SUPABASE_URL atau SUPABASE_KEY belum diisi di file .env');
}

// Buat client koneksi supabase
const supabase = createClient(url || '', key || '');

module.exports = supabase;
