import express from 'express';
import { createClient } from '@supabase/supabase-js';

const router = express.Router();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const processDate = (inputDate) => {
  if (!inputDate) return new Date().toISOString();
  // Ensure we compare against Manila today string YYYY-MM-DD
  const todayStr = new Date().toLocaleString("en-CA", {timeZone: "Asia/Manila"}).split(',')[0];
  if (inputDate === todayStr) {
    return new Date().toISOString();
  }
  return inputDate;
};

// POST bulk create (for CSV Import)
router.post('/import-all', async (req, res) => {
  try {
    const customers = req.body; // Array of customer objects
    if (!Array.isArray(customers)) {
      return res.status(400).json({ error: 'Data must be an array of customers' });
    }

    const { data, error } = await supabase
      .from('debtors')
      .insert(customers.map(c => {
        const rawBalance = parseFloat(c.balance) || 0;
        const rawAdvance = parseFloat(c.advance_payment) || 0;
        const storedBalance = Math.max(0, rawBalance - rawAdvance);
        const history = [];
        if (rawAdvance > 0) {
          history.push({
            date: c.advance_payment_date || c.date_borrowed || new Date().toISOString().split('T')[0],
            amount: rawAdvance,
            balance_after: storedBalance,
            note: 'Advance Payment'
          });
        }
        return {
          name: c.name,
          original_debt: rawBalance,
          balance: storedBalance,
          advance_payment: rawAdvance,
          advance_payment_date: c.advance_payment_date || (rawAdvance > 0 ? (c.date_borrowed || new Date().toISOString().split('T')[0]) : null),
          payment_history: history,
          date_borrowed: c.date_borrowed || new Date().toISOString().split('T')[0],
          notes: c.notes || '',
          receipt_numbers: c.receipt_numbers || [],
          status: rawAdvance > 0 && storedBalance > 0 ? 'partial' : storedBalance <= 0 ? 'paid' : 'active'
        };
      }))
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
    const {
      name,
      balance,
      advance_payment,
      advance_payment_date,
      receipt_numbers,
      date_borrowed,
      due_date,
      notes,
      original_debt: requestedOriginalDebt,
    } = req.body;

    const rawBalance = parseFloat(balance) || 0;
    const rawAdvance = parseFloat(advance_payment) || 0;
    const originalDebt = parseFloat(requestedOriginalDebt) || rawBalance;

    if (rawAdvance > originalDebt) {
      return res.status(400).json({ error: 'Advance payment cannot be greater than the initial balance' });
    }

    const storedBalance = Math.max(0, originalDebt - rawAdvance);

    // Add advance payment to history if provided
    const history = [];
    if (rawAdvance > 0) {
      history.push({
        date: processDate(advance_payment_date || date_borrowed),
        amount: rawAdvance,
        balance_after: storedBalance,
        note: 'Advance Payment'
      });
    }

    console.log('[CREATE] rawBalance:', rawBalance, 'rawAdvance:', rawAdvance, 'storedBalance:', storedBalance, 'originalDebt:', originalDebt);

    const { data, error } = await supabase
      .from('debtors')
      .insert([{
        name,
        original_debt: originalDebt,
        balance: storedBalance,
        advance_payment: rawAdvance,
        advance_payment_date: advance_payment_date || null,
        payment_history: history,
        receipt_numbers: receipt_numbers || [],
        date_borrowed,
        due_date: due_date || null,
        notes: notes || '',
        status: rawAdvance > 0 && storedBalance > 0 ? 'partial' : storedBalance <= 0 ? 'paid' : 'active',
      }])
      .select()
      .single();

    if (error) throw error;
    res.status(201).json(data);
  } catch (err) {
    console.error('[CREATE ERROR]', err.message);
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
      due_date,
      notes,
      original_debt: requestedOriginalDebt,
    } = req.body;

    // Fetch current
    const { data: current, error: fetchError } = await supabase
      .from('debtors')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (fetchError) throw fetchError;

    const newOriginalDebt = parseFloat(requestedOriginalDebt || balance) || current.original_debt;
    const newAdvance = parseFloat(advance_payment) || 0;

    if (newAdvance > newOriginalDebt) {
      return res.status(400).json({ error: 'Total payments cannot exceed the initial balance' });
    }

    const newBalance = Math.max(0, newOriginalDebt - newAdvance);

    const history = req.body.payment_history || current.payment_history || [];
    const newStatus = newAdvance > 0 && newBalance > 0 ? 'partial' : newBalance <= 0 ? 'paid' : 'active';

    const { data, error } = await supabase
      .from('debtors')
      .update({
        name,
        original_debt: newOriginalDebt,
        balance: newBalance,
        advance_payment: newAdvance,
        advance_payment_date: advance_payment_date || current.advance_payment_date,
        receipt_numbers: receipt_numbers || [],
        date_borrowed,
        due_date: due_date || null,
        notes: notes || '',
        status: newStatus,
        payment_history: history,
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
    
    // PHT Compliance: Use exact timestamp if today, otherwise keep date
    const paymentDate = processDate(date);

    const paymentEntry = {
      date: paymentDate,
      amount: payAmt,
      balance_after: newBalance,
      note: 'Advance Payment'
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

// POST adjust balance
router.post('/:id/adjust', async (req, res) => {
  try {
    const { newBalance, reason } = req.body;
    
    // Get current record
    const { data: current, error: fetchError } = await supabase
      .from('debtors')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (fetchError) throw fetchError;

    const oldBalance = parseFloat(current.balance);
    const parsedNewBalance = parseFloat(newBalance);

    const changes = [`Manual Adjustment: Balance changed from ₱${oldBalance.toLocaleString('en-PH', {minimumFractionDigits:2})} to ₱${parsedNewBalance.toLocaleString('en-PH', {minimumFractionDigits:2})}. Reason: ${reason}`];
    
    const paymentEntry = {
      id: Date.now().toString(),
      type: 'manual_adjustment',
      amount: oldBalance - parsedNewBalance,
      balance_after: parsedNewBalance,
      date: new Date().toISOString(),
      note: 'Manual Adjustment',
      changes: changes.join(' | '),
      created_at: new Date().toISOString()
    };
    
    const history = Array.isArray(current.payment_history) ? [...current.payment_history, paymentEntry] : [paymentEntry];

    const newStatus = parsedNewBalance <= 0 ? 'paid' : (parseFloat(current.advance_payment) > 0 ? 'partial' : 'active');

    const { data, error } = await supabase
      .from('debtors')
      .update({
        balance: parsedNewBalance,
        payment_history: history,
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

export default router;
