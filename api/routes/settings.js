import express from 'express';
import { createClient } from '@supabase/supabase-js';

const router = express.Router();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);


router.get('/:key', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('app_settings')
      .select('value')
      .eq('key', req.params.key)
      .eq('user_id', req.user.id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({ error: 'Setting not found' });
      }
      throw error;
    }
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


router.put('/:key', async (req, res) => {
  try {
    const { value } = req.body;

    const { data, error } = await supabase
      .from('app_settings')
      .upsert({ key: req.params.key, value: value, user_id: req.user.id })
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
