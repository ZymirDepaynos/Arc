import express from 'express';
import { createClient } from '@supabase/supabase-js';

const router = express.Router();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// POST bulk create (for CSV Import)
router.post('/bulk', async (req, res) => {
  try {
    const customers = req.body; // Array of customer objects
    if (!Array.isArray(customers)) {
      return res.status(400).json({ error: 'Data must be an array of customers' });
    }

    const { data, error } = await supabase
      .from('debtors')
      .insert(customers.map(c => ({
        name: c.name,
        balance: parseFloat(c.balance) || 0,
        advance_payment: parseFloat(c.advance_payment) || 0,
        date_borrowed: c.date_borrowed || new Date().toISOString().split('T')[0],
        notes: c.notes || '',
        receipt_numbers: c.receipt_numbers || [],
        status: (parseFloat(c.balance) || 0) <= 0 ? 'paid' : (parseFloat(c.advance_payment) > 0 ? 'partial' : 'active')
      })))
      .select();

    if (error) throw error;
    res.status(201).json(data);
  } catch (err) {
    console.error('API Error [POST /bulk]:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET all debtors (with optional search)
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
    console.error('API Error [GET /]:', err);
    res.status(500).json({ error: 'Fetch failed', details: err.message });
  }
});

// GET single debtor
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

// POST create debtor
router.post('/', async (req, res) => {
  try {
    console.log('Attempting to create debtor with data:', req.body);
    
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error('CRITICAL: Missing Supabase environment variables!');
      return res.status(500).json({ error: 'Server configuration error: Missing DB credentials.' });
    }

    const {
      name,
      balance,
      advance_payment,
      advance_payment_date,
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
        advance_payment_date: advance_payment_date || null,
        receipt_numbers: receipt_numbers || [],
        date_borrowed,
        notes: notes || '',
        status: advance_payment && parseFloat(advance_payment) > 0 ? 'partial' : 'active',
      }])
      .select();

    if (error) {
      console.error('Supabase Insert Error:', error);
      return res.status(500).json({ error: error.message });
    }
    
    if (!data || data.length === 0) {
      return res.status(500).json({ error: 'Failed to create record: No data returned from database.' });
    }

    res.status(201).json(data[0]);
  } catch (err) {
    console.error('API Error [POST /]:', err);
    res.status(500).json({ error: err.message });
  }
});

// PUT update debtor
router.put('/:id', async (req, res) => {
  try {
    const {
      name,
      balance,
      advance_payment,
      advance_payment_date,
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
        advance_payment_date: advance_payment_date || null,
        receipt_numbers: receipt_numbers || [],
        date_borrowed,
        notes: notes || '',
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

// DELETE debtor
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

// POST record a payment
router.post('/:id/pay', async (req, res) => {
  try {
    const { amount, date } = req.body;

    // Get current record
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
    
    // PHT Compliance: Use client date or fallback to server local YYYY-MM-DD
    const paymentDate = date || new Date().toISOString().split('T')[0];

    const paymentEntry = {
      date: paymentDate,
      amount: payAmount,
      balance_after: newBalance
    };
    
    const history = Array.isArray(current.payment_history) ? [...current.payment_history, paymentEntry] : [paymentEntry];

    if (newBalance <= 0) {
      const { data, error: updateError } = await supabase
        .from('debtors')
        .update({
          balance: 0,
          advance_payment: newAdvance,
          advance_payment_date: paymentDate,
          payment_history: history,
          status: 'paid',
          updated_at: new Date().toISOString(),
        })
        .eq('id', req.params.id)
        .select()
        .single();
      
      if (updateError) throw updateError;
      return res.json({ message: 'Debt fully settled and marked as paid', settled: true, data });
    }

    const { data, error } = await supabase
      .from('debtors')
      .update({
        balance: newBalance,
        advance_payment: newAdvance,
        advance_payment_date: paymentDate,
        payment_history: history,
        status: 'partial',
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

export default router;
