import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

export function useDebtors() {
  const [debtors, setDebtors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');

  const API_URL = import.meta.env.VITE_API_URL || '';

  const fetchDebtors = useCallback(async (searchTerm = '') => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_URL}/api/debtors`, {
        params: searchTerm ? { search: searchTerm } : {},
      });
      if (Array.isArray(res.data)) {
        setDebtors(res.data);
        setError(null);
      } else {
        throw new Error('API returned invalid data format. Did you forget to set VITE_API_URL?');
      }
    } catch (err) {
      setError(err.message || err.response?.data?.error || 'Failed to fetch debtors');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchDebtors(search);
    }, 300);
    return () => clearTimeout(timer);
  }, [search, fetchDebtors]);

  const createDebtor = async (data) => {
    const res = await axios.post(`${API_URL}/api/debtors`, data);
    await fetchDebtors(search);
    return res.data;
  };

  const updateDebtor = async (id, data) => {
    const res = await axios.put(`${API_URL}/api/debtors/${id}`, data);
    await fetchDebtors(search);
    return res.data;
  };

  const deleteDebtor = async (id) => {
    await axios.delete(`${API_URL}/api/debtors/${id}`);
    await fetchDebtors(search);
  };

  const recordPayment = async (id, amount) => {
    // Send local date to avoid timezone issues
    const localDate = new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD
    const res = await axios.post(`${API_URL}/api/debtors/${id}/pay`, { amount, date: localDate });
    await fetchDebtors(search);
    return res.data;
  };

  const totals = Array.isArray(debtors) ? debtors.reduce(
    (acc, d) => {
      acc.totalBalance += parseFloat(d.balance) || 0;
      acc.totalAdvance += parseFloat(d.advance_payment) || 0;
      if (d.status === 'active') acc.activeCount++;
      if (d.status === 'partial') acc.partialCount++;
      if (d.status === 'paid') acc.paidCount++;
      return acc;
    },
    { totalBalance: 0, totalAdvance: 0, activeCount: 0, partialCount: 0, paidCount: 0 }
  ) : { totalBalance: 0, totalAdvance: 0, activeCount: 0, partialCount: 0, paidCount: 0 };

  return {
    debtors,
    loading,
    error,
    search,
    setSearch,
    createDebtor,
    updateDebtor,
    deleteDebtor,
    recordPayment,
    refetch: fetchDebtors,
    totals,
  };
}
