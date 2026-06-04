const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);


router.get('/', async (req, res) => {
  try {
    const { search } = req.query;
    let query = supabase
      .from('debtors')
      .select('*')
      .order('created_at', { ascending: false });

    if (search) {
      query = query.ilike('name', `%${search}%`);
    }

    const { data, error } = await query;
    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


router.get('/:id', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('debtors')
      .select('*')
      .eq('id', req.params.id)
      .single();
    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


router.post('/', async (req, res) => {
  try {
    const {
      name,
      balance,
      advance_payment,
      receipt_numbers,
      date_borrowed,
      notes,
    } = req.body;

    const { data, error } = await supabase
      .from('debtors')
      .insert([{
        name,
        balance: parseFloat(balance),
        advance_payment: parseFloat(advance_payment) || 0,
        receipt_numbers: receipt_numbers || [],
        date_borrowed,
        notes: notes || '',
        status: advance_payment && parseFloat(advance_payment) > 0 ? 'partial' : 'active',
      }])
      .select()
      .single();

    if (error) throw error;
    res.status(201).json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


router.put('/:id', async (req, res) => {
  try {
    const {
      name,
      balance,
      advance_payment,
      receipt_numbers,
      date_borrowed,
      notes,
      status,
    } = req.body;

    const { data, error } = await supabase
      .from('debtors')
      .update({
        name,
        balance: parseFloat(balance),
        advance_payment: parseFloat(advance_payment) || 0,
        receipt_numbers: receipt_numbers || [],
        date_borrowed,
        notes: notes || '',
        payment_history: req.body.payment_history,
        status,
        updated_at: new Date().toISOString(),
      })
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


router.delete('/:id', async (req, res) => {
  try {
    const { error } = await supabase
      .from('debtors')
      .delete()
      .eq('id', req.params.id);

    if (error) throw error;
    res.json({ message: 'Debtor deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


router.post('/:id/pay', async (req, res) => {
  try {
    const { amount, date } = req.body;

    
    const { data: current, error: fetchError } = await supabase
      .from('debtors')
      .select('balance, advance_payment, payment_history')
      .eq('id', req.params.id)
      .single();

    if (fetchError) throw fetchError;

    const payAmount = parseFloat(amount);
    const currentBalance = parseFloat(current.balance);

    if (payAmount > currentBalance) {
      return res.status(400).json({ error: 'Payment amount cannot exceed outstanding balance' });
    }

    const newBalance = currentBalance - payAmount;
    const newAdvance = parseFloat(current.advance_payment) + payAmount;
    const newStatus = newBalance === 0 ? 'paid' : 'partial';
    
    
    const paymentDate = date || new Date().toISOString().split('T')[0];

    const newPaymentEntry = {
      amount: payAmount,
      date: paymentDate,
      balance_after: newBalance,
      created_at: new Date().toISOString()
    };

    const updatedHistory = [...(current.payment_history || []), newPaymentEntry];

    const { data, error } = await supabase
      .from('debtors')
      .update({
        balance: newBalance,
        advance_payment: newAdvance,
        payment_history: updatedHistory,
        status: newStatus,
        updated_at: new Date().toISOString(),
      })
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
