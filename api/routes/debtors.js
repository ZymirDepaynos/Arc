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
            note: 'Advance Payment',
            created_at: new Date().toISOString()
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
        note: 'Advance Payment',
        created_at: new Date().toISOString()
      });
    }

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
        notes: notes || '',
        status: rawAdvance > 0 && storedBalance > 0 ? 'partial' : storedBalance <= 0 ? 'paid' : 'active',
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

    let history = Array.isArray(current.payment_history) ? [...current.payment_history] : [];
    const processedAdvanceDate = processDate(advance_payment_date || current.advance_payment_date);

    const historySum = history.reduce((sum, p) => sum + parseFloat(p.amount), 0);
    
    if (newAdvance !== historySum) {
        // Amount changed - add new entry
        history.push({
            date: processedAdvanceDate,
            amount: newAdvance - historySum,
            balance_after: newBalance,
            note: 'Advance Payment',
            created_at: new Date().toISOString()
        });
    } else if (advance_payment_date && advance_payment_date !== current.advance_payment_date) {
        // Date changed but amount is same - find and update the first "Advance Payment" entry
        const advIdx = history.findIndex(p => p.note === 'Advance Payment');
        if (advIdx !== -1) {
            history[advIdx].date = processedAdvanceDate;
        }
    }

    const newStatus = newAdvance > 0 && newBalance > 0 ? 'partial' : newBalance <= 0 ? 'paid' : 'active';

    // Track Profile Changes
    const changes = [];
    if (name && current.name !== name) changes.push(`Name to "${name}"`);
    
    const oldDate = (current.date_borrowed || '').substring(0, 10);
    const newDate = (date_borrowed || '').substring(0, 10);
    if (oldDate && newDate && oldDate !== newDate) {
      changes.push(`Purchase Date from ${oldDate} to ${newDate}`);
    }
    
    if (current.original_debt !== newOriginalDebt) changes.push(`Initial Balance to ₱${newOriginalDebt}`);
    
    const currentReceipts = current.receipt_numbers || [];
    const newReceipts = receipt_numbers || [];
    if (currentReceipts.join(',') !== newReceipts.join(',')) {
      changes.push(`Receipt No. to "${newReceipts.join(', ')}"`);
    }

    if (current.notes !== (notes || '')) changes.push(`Items Purchased updated`);

    if (changes.length > 0) {
      history.push({
        type: 'edit',
        note: 'Profile Updated',
        changes: changes.join(' • '),
        date: new Date().toISOString().split('T')[0],
        created_at: new Date().toISOString(),
        amount: 0,
        balance_after: newBalance
      });
    }

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
      amount: payAmount,
      balance_after: newBalance,
      note: 'Advance Payment',
      created_at: new Date().toISOString()
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
