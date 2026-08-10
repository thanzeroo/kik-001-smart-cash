require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Harap pastikan SUPABASE_URL dan SUPABASE_KEY ada di .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function runTest() {
  console.log('🚀 Memulai Pengujian Automated Testing API Supabase Backend...\n');

  const randomId = Math.floor(Math.random() * 1000000);
  const testEmail = `user${randomId}@gmail.com`;
  const testPassword = 'Password123!';

  // 1. Create User dengan Admin API (Bypass email confirmation untuk testing)
  console.log(`1. Testing Create User (Email: ${testEmail})...`);
  const { data: regData, error: regError } = await supabase.auth.admin.createUser({
    email: testEmail,
    password: testPassword,
    email_confirm: true
  });

  if (regError) {
    console.error('❌ Gagal Create User:', regError.message);
    return;
  }
  console.log('✅ Success Create User ID:', regData.user?.id);

  // 2. Test Login
  console.log('\n2. Testing Login...');
  const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
    email: testEmail,
    password: testPassword,
  });

  if (loginError) {
    console.error('❌ Gagal Login:', loginError.message);
    return;
  }
  const token = loginData.session.access_token;
  const userId = loginData.user.id;
  console.log('✅ Success Login! Access Token Didapatkan.');

  // 3. Test Insert Transaction (Pemasukan)
  console.log('\n3. Testing Insert Transaction (Income)...');
  const { data: incomeData, error: incomeError } = await supabase
    .from('transactions')
    .insert([
      {
        user_id: userId,
        title: 'Gaji Proyek A',
        amount: 5000000,
        type: 'income',
        category: 'Gaji'
      }
    ])
    .select();

  if (incomeError) {
    console.error('❌ Gagal Insert Income:', incomeError.message);
    return;
  }
  console.log('✅ Success Insert Income:', incomeData[0]);

  // 4. Test Insert Transaction (Pengeluaran)
  console.log('\n4. Testing Insert Transaction (Expense)...');
  const { data: expenseData, error: expenseError } = await supabase
    .from('transactions')
    .insert([
      {
        user_id: userId,
        title: 'Beli Kopi & Makan',
        amount: 50000,
        type: 'expense',
        category: 'Makanan'
      }
    ])
    .select();

  if (expenseError) {
    console.error('❌ Gagal Insert Expense:', expenseError.message);
    return;
  }
  console.log('✅ Success Insert Expense:', expenseData[0]);

  // 5. Test Select & Calculate Summary
  console.log('\n5. Testing Select & Summary Calculation...');
  const { data: allTx, error: selectError } = await supabase
    .from('transactions')
    .select('*')
    .eq('user_id', userId);

  if (selectError) {
    console.error('❌ Gagal Select Transactions:', selectError.message);
    return;
  }

  let totalIncome = 0;
  let totalExpense = 0;
  allTx.forEach(tx => {
    if (tx.type === 'income') totalIncome += Number(tx.amount);
    if (tx.type === 'expense') totalExpense += Number(tx.amount);
  });

  console.log('✅ Ringkasan Keuangan:');
  console.log(`   - Total Income  : Rp ${totalIncome.toLocaleString('id-ID')}`);
  console.log(`   - Total Expense : Rp ${totalExpense.toLocaleString('id-ID')}`);
  console.log(`   - Total Balance : Rp ${(totalIncome - totalExpense).toLocaleString('id-ID')}`);

  // 6. Test Delete Transaction
  console.log('\n6. Testing Cleanup / Delete Transaction...');
  const { error: deleteError } = await supabase
    .from('transactions')
    .delete()
    .eq('id', expenseData[0].id);

  if (deleteError) {
    console.error('❌ Gagal Delete Transaction:', deleteError.message);
    return;
  }
  console.log('✅ Success Delete Transaction ID:', expenseData[0].id);

  console.log('\n🎉 SELURUH SKENARIO TESTING BERHASIL 100%!\n');
}

runTest();
