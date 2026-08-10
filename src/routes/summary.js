const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');
const authenticateUser = require('../middleware/auth');

router.use(authenticateUser);

// GET /api/summary - Kalkulasi total pemasukan, pengeluaran, dan sisa saldo
router.get('/', async (req, res) => {
  const { data, error } = await supabase
    .from('transactions')
    .select('amount, type')
    .eq('user_id', req.user.id);

  if (error) {
    return res.status(400).json({ error: error.message });
  }

  let totalIncome = 0;
  let totalExpense = 0;

  data.forEach((tx) => {
    const amt = Number(tx.amount);
    if (tx.type === 'income') {
      totalIncome += amt;
    } else if (tx.type === 'expense') {
      totalExpense += amt;
    }
  });

  const balance = totalIncome - totalExpense;

  return res.json({
    summary: {
      total_income: totalIncome,
      total_expense: totalExpense,
      balance: balance,
      transaction_count: data.length,
    },
  });
});

module.exports = router;
