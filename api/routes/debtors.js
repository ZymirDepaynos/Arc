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
    
    let newAdvance = parseFloat(current.advance_payment) || 0;
    let newBalance = parseFloat(current.balance) || 0;

    // If original debt changed (only allowed when there is no advance payment)
    if (newOriginalDebt !== current.original_debt && (parseFloat(current.advance_payment) || 0) === 0) {
      newBalance = newOriginalDebt;
      newAdvance = 0;
    }

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

// POST edit history item
router.post('/:id/edit-history', async (req, res) => {
  try {
    const { index, newAmount } = req.body;
    
    const { data: current, error: fetchError } = await supabase
      .from('debtors')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (fetchError) throw fetchError;

    const history = [...(current.payment_history || [])];
    if (index < 0 || index >= history.length) {
      return res.status(400).json({ error: 'Invalid history index' });
    }

    const item = history[index];
    if (item.type === 'edit' || item.type === 'manual_adjustment') {
      return res.status(400).json({ error: 'Cannot edit this type of history item' });
    }

    const oldAmount = parseFloat(item.amount) || 0;
    const diff = parseFloat(newAmount) - oldAmount;

    // Update the item
    item.amount = parseFloat(newAmount);
    
    // Req 3: Append [Edited] tag
    if (!item.note) item.note = 'Advance Payment';
    if (!item.note.includes('[Edited]')) {
      item.note = `${item.note} [Edited]`;
    }

    // Recalculate balance_after for subsequent items
    for (let i = index; i < history.length; i++) {
      if (history[i].balance_after !== undefined) {
        history[i].balance_after = parseFloat(history[i].balance_after) - diff;
      }
    }

    // Update main debtor record
    const newBalance = parseFloat(current.balance) - diff;
    const newAdvance = parseFloat(current.advance_payment) + diff;
    const newStatus = newBalance <= 0 ? 'paid' : (newAdvance > 0 ? 'partial' : 'active');

    const { data, error } = await supabase
      .from('debtors')
      .update({
        balance: newBalance,
        advance_payment: newAdvance,
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
    console.error('API Error [POST /:id/edit-history]:', err);
    res.status(500).json({ error: err.message });
  }
});

// ── Req 7.4–7.6: DELETE individual history entry + rollback ─────────────────
router.delete('/:id/history/:index', async (req, res) => {
  try {
    const index = parseInt(req.params.index, 10);

    const { data: current, error: fetchError } = await supabase
      .from('debtors')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (fetchError) throw fetchError;

    const history = [...(current.payment_history || [])];

    if (isNaN(index) || index < 0 || index >= history.length) {
      return res.status(400).json({ error: 'Invalid history index' });
    }

    const item = history[index];

    // Guard: cannot delete profile edit entries (no financial impact)
    if (item.type === 'edit') {
      return res.status(400).json({ error: 'Profile edit entries cannot be deleted' });
    }

    // Req 7.5: Capture deleted amount for rollback calculation
    const deletedAmount = parseFloat(item.amount) || 0;

    // Remove the entry from the history array
    history.splice(index, 1);

    // Req 7.6: Recalculate balance_after for ALL subsequent entries
    // Reversing a payment (credit) adds the amount back to each running balance
    // Reversing a debit adjustment (negative amount) subtracts it back
    for (let i = index; i < history.length; i++) {
      if (history[i].balance_after !== undefined) {
        history[i].balance_after = parseFloat(history[i].balance_after) + deletedAmount;
      }
    }

    // Rollback root balance and advance_payment
    const newBalance = parseFloat(current.balance) + deletedAmount;
    const newAdvance = Math.max(0, parseFloat(current.advance_payment) - deletedAmount);
    const newStatus = newBalance <= 0 ? 'paid' : (newAdvance > 0 ? 'partial' : 'active');

    const { data, error } = await supabase
      .from('debtors')
      .update({
        balance: newBalance,
        advance_payment: newAdvance,
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
    console.error('API Error [DELETE /:id/history/:index]:', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
