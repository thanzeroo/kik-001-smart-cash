// ========================================================
// CONFIG KONEKSI SUPABASE
// ========================================================

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const url = (process.env.SUPABASE_URL || '').trim();
const key = (process.env.SUPABASE_KEY || '').trim();

// Peringatan jika lupa isi file .env
if (!url || !key) {
  console.warn('⚠️ Waduh! SUPABASE_URL atau SUPABASE_KEY belum diisi di file .env');
}

// Buat client koneksi supabase
const supabase = createClient(
  url || 'https://placeholder.supabase.co',
  key || 'placeholder-key'
);

module.exports = supabase;
