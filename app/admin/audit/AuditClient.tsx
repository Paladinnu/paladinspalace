"use client";
import { useEffect, useState, useCallback, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

interface AuditEvent {
  id: string;
  createdAt: string;
  userId: string | null;
  action: string;
  entityType: string | null;
  entityId: string | null;
  ip: string | null;
  userAgent: string | null;
  metadata: string | null; // JSON string
}

interface ApiError {
  error: string;
  code: string;
  details?: any;
  requestId?: string;
}

interface FetchState {
  loading: boolean;
  error: ApiError | null;
  items: AuditEvent[];
  nextCursor: string | null;
}

export default function AuditClient() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const [filters, setFilters] = useState({ action: '', userId: '', entityType: '' });
  const [refreshTick, setRefreshTick] = useState(0);
  const [meta, setMeta] = useState<{ actions: string[]; entityTypes: (string|null)[] } | null>(null);

  // Redirect if not authorized once session known
  useEffect(() => {
    if (status === 'loading') return;
    const role = (session?.user as any)?.role;
    if (!session || !['MODERATOR','ADMIN'].includes(role)) {
      router.replace('/login');
    }
  }, [session, status, router]);

  const filtersRef = useRef(filters);
  useEffect(() => { filtersRef.current = filters; }, [filters]);

  const fetchEvents = useCallback(async (opts: { reset: boolean; cursorOverride?: string | null } = { reset: false }) => {
    if (status !== 'authenticated') return; // wait for auth
    const { reset, cursorOverride } = opts;
    setLoading(true); setError(null);
    try {
      const f = filtersRef.current;
      const params = new URLSearchParams();
      params.set('limit', '50');
      const effectiveCursor = cursorOverride !== undefined ? cursorOverride : cursor;
      if (!reset && effectiveCursor) params.set('cursor', effectiveCursor);
      if (f.action) params.set('action', f.action);
      if (f.userId) params.set('userId', f.userId);
      if (f.entityType) params.set('entityType', f.entityType);
      const res = await fetch(`/api/audit?${params.toString()}`, { cache: 'no-store' });
      if (!res.ok) {
        const err: ApiError = await res.json();
        setError(err); return;
      }
      const data = await res.json();
      setNextCursor(data.nextCursor || null);
      if (reset) setEvents(data.items);
      else setEvents(prev => [...prev, ...data.items]);
    } catch (e: any) {
      setError({ error: e.message || 'Fetch error', code: 'FETCH' });
    } finally {
      setLoading(false);
    }
  }, [cursor, status]);

  // Refetch on filters / periodic refresh
  useEffect(() => { fetchEvents({ reset: true }); }, [filters, refreshTick, fetchEvents]);

  // Fetch meta (actions/entityTypes)
  useEffect(() => {
    if (status !== 'authenticated') return;
    (async () => {
      try {
        const res = await fetch('/api/audit/meta');
        if (res.ok) {
          const js = await res.json();
            setMeta(js);
        }
      } catch {}
    })();
  }, [status]);

  const loadMore = () => { if (nextCursor) { setCursor(nextCursor); fetchEvents({ reset: false, cursorOverride: nextCursor }); } };

  // Auto refresh every 30s
  useEffect(() => { const t = setInterval(() => setRefreshTick(t => t + 1), 30000); return () => clearInterval(t); }, []);

  const resetAndSearch = () => { setCursor(null); fetchEvents({ reset: true, cursorOverride: null }); };

  return (
    <div className="p-4 space-y-4">
  <h1 className="text-xl font-semibold">Audit Events {status === 'loading' && '(auth...)'}</h1>
      <div className="flex flex-wrap gap-2 items-end">
        <div className="flex flex-col">
          <label className="text-xs">Action</label>
          {meta?.actions ? (
            <select value={filters.action} onChange={e => setFilters(f => ({ ...f, action: e.target.value }))} className="border px-2 py-1 rounded min-w-[150px]">
              <option value="">(toate)</option>
              {meta.actions.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          ) : (
            <input value={filters.action} onChange={e => setFilters(f => ({ ...f, action: e.target.value }))} className="border px-2 py-1 rounded" placeholder="LOGIN_SUCCESS" />
          )}
        </div>
        <div className="flex flex-col">
          <label className="text-xs">User ID</label>
          <input value={filters.userId} onChange={e => setFilters(f => ({ ...f, userId: e.target.value }))} className="border px-2 py-1 rounded" placeholder="user id" />
        </div>
        <div className="flex flex-col">
          <label className="text-xs">Entity Type</label>
          {meta?.entityTypes ? (
            <select value={filters.entityType} onChange={e => setFilters(f => ({ ...f, entityType: e.target.value }))} className="border px-2 py-1 rounded min-w-[140px]">
              <option value="">(toate)</option>
              {meta.entityTypes.map(et => et && <option key={et} value={et}>{et}</option>)}
            </select>
          ) : (
            <input value={filters.entityType} onChange={e => setFilters(f => ({ ...f, entityType: e.target.value }))} className="border px-2 py-1 rounded" placeholder="LISTING" />
          )}
        </div>
        <button onClick={resetAndSearch} className="bg-blue-600 text-white px-3 py-1 rounded">Apply</button>
        <button onClick={() => setRefreshTick(t => t + 1)} className="border px-3 py-1 rounded">Refresh</button>
        <button onClick={() => {
          // CSV export
          const header = ['id','createdAt','action','userId','entityType','entityId','ip','metadata'];
          const rows = events.map(e => header.map(h => {
            const val: any = (e as any)[h];
            if (val == null) return '';
            const s = typeof val === 'string' ? val : JSON.stringify(val);
            return '"' + s.replace(/"/g,'""') + '"';
          }).join(','));
          const csv = [header.join(','), ...rows].join('\n');
          const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url; a.download = 'audit.csv'; a.click();
          URL.revokeObjectURL(url);
        }} className="border px-3 py-1 rounded">CSV</button>
      </div>
      {error && <div className="text-red-600 text-sm">Error: {error.error} ({error.code})</div>}
      <div className="overflow-auto border rounded max-h-[600px]">
        <table className="min-w-full text-xs">
          <thead className="bg-gray-50">
            <tr>
              <th className="p-1 text-left">Time</th>
              <th className="p-1 text-left">Action</th>
              <th className="p-1 text-left">User</th>
              <th className="p-1 text-left">Entity</th>
              <th className="p-1 text-left">IP</th>
              <th className="p-1 text-left">Meta</th>
            </tr>
          </thead>
          <tbody>
            {events.map(ev => {
              let meta: any = null;
              try { meta = ev.metadata ? JSON.parse(ev.metadata) : null; } catch {}
              return (
                <tr key={ev.id} className="border-t">
                  <td className="p-1 whitespace-nowrap" title={ev.createdAt}>{new Date(ev.createdAt).toLocaleTimeString()}</td>
                  <td className="p-1">{ev.action}</td>
                  <td className="p-1">{ev.userId || '-'}</td>
                  <td className="p-1">{ev.entityType ? `${ev.entityType}:${ev.entityId}` : '-'}</td>
                  <td className="p-1">{ev.ip || '-'}</td>
                  <td className="p-1 max-w-[300px] truncate" title={ev.metadata || ''}>{meta ? JSON.stringify(meta) : '-'}</td>
                </tr>
              );
            })}
            {!loading && events.length === 0 && <tr><td colSpan={6} className="p-2 text-center text-gray-500">No events</td></tr>}
          </tbody>
        </table>
      </div>
      <div className="flex gap-2">
        {nextCursor && <button disabled={loading} onClick={loadMore} className="border px-3 py-1 rounded">Load more</button>}
        {loading && <span className="text-xs text-gray-500">Loading...</span>}
      </div>
    </div>
  );
}
