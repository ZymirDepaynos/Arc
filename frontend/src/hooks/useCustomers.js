import { useState, useEffect, useCallback, useMemo } from 'react';
import api from '../lib/api';

export function useCustomers() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');

  const fetchCustomers = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get('/api/customers');
      if (Array.isArray(res.data)) {
        setCustomers(res.data);
        setError(null);
      } else {
        throw new Error('API returned invalid data format.');
      }
    } catch (err) {
      setError(err.message || err.response?.data?.error || 'Failed to fetch customers');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  const createCustomer = async (data) => {
    const res = await api.post('/api/customers', data);
    await fetchCustomers();
    return res.data;
  };

  const bulkCreateCustomers = async (list) => {
    const res = await api.post('/api/customers/import-all', list);
    await fetchCustomers();
    return res.data;
  };

  const updateCustomer = async (id, data) => {
    const res = await api.put(`/api/customers/${id}`, data);
    await fetchCustomers();
    return res.data;
  };

  const deleteCustomer = async (id) => {
    await api.delete(`/api/customers/${id}`);
    await fetchCustomers();
  };

  const recordPayment = async (id, amount, customDate = null) => {
    const localDate = customDate || new Date().toLocaleDateString('en-CA');
    const res = await api.post(`/api/customers/${id}/pay`, { amount, date: localDate });
    await fetchCustomers();
    return res.data;
  };

  const totals = useMemo(() => Array.isArray(customers) ? customers.reduce(
    (acc, d) => {
      acc.totalBalance += parseFloat(d.balance) || 0;
      acc.totalAdvance += parseFloat(d.advance_payment) || 0;
      if (d.status === 'active') acc.activeCount++;
      if (d.status === 'partial') acc.partialCount++;
      if (d.status === 'paid') acc.paidCount++;
      return acc;
    },
    { totalBalance: 0, totalAdvance: 0, activeCount: 0, partialCount: 0, paidCount: 0 }
  ) : { totalBalance: 0, totalAdvance: 0, activeCount: 0, partialCount: 0, paidCount: 0 }, [customers]);

  return {
    customers,
    loading,
    error,
    search,
    setSearch,
    createCustomer,
    bulkCreateCustomers,
    updateCustomer,
    deleteCustomer,
    recordPayment,
    refetch: fetchCustomers,
    totals,
  };
}
