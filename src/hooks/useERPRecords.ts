import { useCallback, useEffect, useRef, useState } from 'react';
import { erpApi } from '../context/AuthContext';
import { errorMessage, type ERPRecord } from '../services/erpApi';
export function useERPRecords(entity: string | null, revision = 0) {
  const [records, setRecords] = useState<ERPRecord[]>([]);
  const [loading, setLoading] = useState(!!entity);
  const [error, setError] = useState('');
  const generation = useRef(0);
  const refresh = useCallback(async () => {
    const version = ++generation.current;
    setRecords([]); setError(''); setLoading(!!entity);
    if (!entity) return;
    try { const rows = await erpApi.list(entity); if (version === generation.current) setRecords(rows); }
    catch (e) { if (version === generation.current) setError(errorMessage(e)); }
    finally { if (version === generation.current) setLoading(false); }
  }, [entity]);
  useEffect(() => { void refresh(); return () => { generation.current++; }; }, [refresh, revision]);
  return { records, loading, error, refresh };
}
