import express from 'express';
import { createClient } from '@supabase/supabase-js';

const router = express.Router();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

router.get('/', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .eq('user_id', req.user.id)
      .not('archived_at', 'is', null)
      .order('archived_at', { ascending: false });

    if (error) throw error;
    res.json(data);
  } catch (err) {
    console.error('API Error [GET /archive]:', err);
    res.status(500).json({ error: err.message });
  }
});

router.post('/:id/restore', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('customers')
      .update({ archived_at: null })
      .eq('id', req.params.id)
      .eq('user_id', req.user.id)
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (err) {
    console.error('API Error [POST /archive/:id/restore]:', err);
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const { error } = await supabase
      .from('customers')
      .delete()
      .eq('id', req.params.id)
      .eq('user_id', req.user.id)
      .not('archived_at', 'is', null);

    if (error) throw error;
    res.json({ message: 'Permanently deleted' });
  } catch (err) {
    console.error('API Error [DELETE /archive/:id]:', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
