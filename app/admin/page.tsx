"use client";
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useConfirm } from '../../components/ConfirmProvider';

interface AdminUser { id: string; email: string; displayName: string; handle?: string | null; role: string; status: string; verified: boolean; createdAt: string; avatarUrl?: string|null; coverUrl?: string|null; fullNameIC?: string|null; phoneIC?: string|null; inGameId?: number|null; discordTag?: string|null; hasDiscord?: boolean }

export default function AdminDashboard() {
  const [q, setQ] = useState('');
  const [sort, setSort] = useState<'createdAt'|'role'|'status'|'verified'|'email'|'displayName'>('createdAt');
  const [dir, setDir] = useState<'asc'|'desc'>('desc');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState<AdminUser | null>(null);
  const [draft, setDraft] = useState<Partial<AdminUser> | null>(null);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const router = useRouter();
  const confirmModal = useConfirm();

  async function load() {
    setLoading(true); setError(null);
    try {
      const params = new URLSearchParams({ q, sort, dir, page: String(page), limit: String(limit) });
      const res = await fetch(`/api/admin/users?${params.toString()}`);
      const js = await res.json();
      if (!res.ok) throw new Error(js.error || 'Unauthorized');
      setUsers(js.users || []);
      setTotal(js.total || 0);
      setTotalPages(js.totalPages || 1);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [q, sort, dir, page, limit]);

  async function updateUser(u: AdminUser, patch: Partial<Pick<AdminUser, 'role' | 'status' | 'verified' | 'email' | 'displayName' | 'avatarUrl' | 'coverUrl' | 'fullNameIC' | 'phoneIC' | 'inGameId'>>) {
    const res = await fetch('/api/admin/users', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: u.id, ...patch }) });
    const js = await res.json();
    if (!res.ok) { alert(js.error || 'Eroare'); return; }
    await load();
  }

  async function modAction(userId: string, action: 'revoke'|'extend'|'setPremium'|'removePremium', days?: number) {
    const res = await fetch('/api/mod/users', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId, action, days }) });
    const js = await res.json();
    if (!res.ok) { alert(js.error || 'Eroare'); return; }
    await load();
  }

  async function adminAction(userId: string, action: 'unlinkDiscord'|'ban'|'suspend7'|'deleteAccount') {
    let proceed = true;
    if (action === 'ban') proceed = await confirmModal({ title: 'Ban utilizator', message: 'Ești sigur că vrei să banezi acest utilizator?', confirmText: 'Ban', cancelText: 'Anulează', danger: true });
    if (action === 'suspend7') proceed = await confirmModal({ title: 'Suspendă 7 zile', message: 'Suspendați acest utilizator pentru 7 zile?', confirmText: 'Suspendă', cancelText: 'Anulează' });
    if (action === 'unlinkDiscord') proceed = await confirmModal({ title: 'Deconectează Discord', message: 'Deconectați contul de Discord al utilizatorului?', confirmText: 'Deconectează', cancelText: 'Anulează' });
    if (action === 'deleteAccount') proceed = await confirmModal({ title: 'Șterge cont', message: 'Ștergeți acest cont? Această acțiune este ireversibilă.', confirmText: 'Șterge', cancelText: 'Anulează', danger: true });
    if (!proceed) return;
    const res = await fetch('/api/admin/users', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId, action }) });
    const js = await res.json();
    if (!res.ok) { alert(js.error || 'Eroare'); return; }
    await load();
    if (open) setOpen(null);
  }

  return (
    <div className="container animate-[slideUp_.22s_ease-out]">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-brand-white">Admin Dashboard</h1>
        <button className="ghost" onClick={() => router.push('/marketplace')}>Înapoi</button>
      </div>
      <div className="panel p-3 mb-4 grid grid-cols-1 sm:grid-cols-5 gap-2 items-center">
        <input value={q} onChange={(e)=> { setPage(1); setQ(e.target.value); }} placeholder="Caută (email, nume, @handle, id, IC, inGameId)" className="sm:col-span-2" />
        <select value={sort} onChange={(e)=> { setPage(1); setSort(e.target.value as any); }} className="text-sm">
          <option value="createdAt">Creat</option>
          <option value="displayName">Nume</option>
          <option value="email">Email</option>
          <option value="role">Rol</option>
          <option value="status">Status</option>
          <option value="verified">Verificat</option>
        </select>
        <select value={dir} onChange={(e)=> { setPage(1); setDir(e.target.value as any); }} className="text-sm">
          <option value="desc">Desc</option>
          <option value="asc">Asc</option>
        </select>
        <select value={limit} onChange={(e)=> { setPage(1); setLimit(Number(e.target.value)); }} className="text-sm">
          <option value={10}>10</option>
          <option value={20}>20</option>
          <option value={50}>50</option>
          <option value={100}>100</option>
        </select>
        <button className="btn btn-primary" onClick={load} disabled={loading}>Caută</button>
      </div>
      {error && <div className="text-red-400 mb-3">{error}</div>}
      <div className="card">
  <div className="p-3 text-sm text-brand-white/70 border-b border-glass">Utilizatori ({total})</div>
        <div className="divide-y divide-[color:var(--border-glass)]">
          {users.map(u => (
            <div key={u.id} className="p-3 flex flex-wrap items-center gap-3 justify-between cursor-pointer hover:bg-white/5" onClick={() => setOpen(u)}>
              <div className="min-w-[220px]">
                <div className="font-semibold text-brand-white">{u.displayName} <span className="text-brand-white/60">{u.handle ? `(${u.handle})` : ''}</span></div>
                <div className="text-brand-white/70 text-xs">{u.email}</div>
                <div className="text-brand-white/50 text-[11px]">creat: {new Date(u.createdAt).toLocaleString('ro-RO')}</div>
              </div>
              <div className="flex items-center gap-2">
                <select className="text-sm bg-white/5 border border-glass rounded px-2 py-1" value={u.role} onChange={(e)=> updateUser(u, { role: e.target.value as any })} onClick={(e)=> e.stopPropagation()}>
                  <option value="USER">USER</option>
                  <option value="MODERATOR">MODERATOR</option>
                  <option value="ADMIN">ADMIN</option>
                </select>
                <select className="text-sm bg-white/5 border border-glass rounded px-2 py-1" value={u.status} onChange={(e)=> updateUser(u, { status: e.target.value as any })} onClick={(e)=> e.stopPropagation()}>
                  <option value="PENDING">PENDING</option>
                  <option value="APPROVED">APPROVED</option>
                  <option value="SUSPENDED">SUSPENDED</option>
                </select>
                <label className="text-sm inline-flex items-center gap-1" onClick={(e)=> e.stopPropagation()}>
                  <input type="checkbox" checked={u.verified} onChange={(e)=> updateUser(u, { verified: e.target.checked })} />
                  Verificat
                </label>
              </div>
            </div>
          ))}
          {!users.length && !loading && (
            <div className="p-6 text-brand-white/70">Niciun utilizator găsit.</div>
          )}
          {loading && (
            <div className="p-6 text-brand-white/70">Se încarcă...</div>
          )}
        </div>
      </div>
      <div className="mt-3 flex items-center justify-between">
        <div className="text-xs text-brand-white/60">Pagina {page} din {totalPages} • {total} rezultate</div>
        <div className="flex items-center gap-2">
          <button className="ghost text-sm" disabled={page<=1 || loading} onClick={()=> setPage(p=> Math.max(1, p-1))}>Înapoi</button>
          <button className="ghost text-sm" disabled={page>=totalPages || loading} onClick={()=> setPage(p=> Math.min(totalPages, p+1))}>Înainte</button>
        </div>
      </div>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={() => setOpen(null)}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div className="panel relative z-10 w-full max-w-2xl p-5" onClick={(e)=> e.stopPropagation()}>
            <div className="flex items-start justify-between mb-4">
              <h3 className="text-xl font-semibold">{open.displayName || open.email}</h3>
              <button className="ghost" onClick={()=> setOpen(null)}>Închide</button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              <div className="sm:col-span-2 flex items-center gap-2 p-2 rounded border border-glass">
                <span className="text-xs text-brand-white/60">Discord:</span>
                <span className="text-xs">{open.hasDiscord ? (open.discordTag || 'conectat') : 'neconectat'}</span>
                {open.hasDiscord && <button className="ghost text-xs ml-auto" onClick={()=> adminAction(open.id, 'unlinkDiscord')}>Deconectează Discord</button>}
              </div>
              <div>
                <label className="block text-xs text-brand-white/60 mb-1">Email</label>
                <input className="w-full" value={draft?.email ?? open.email} onChange={e=> setDraft(d=> ({ ...(d||{}), email: e.target.value }))} />
              </div>
              <div>
                <label className="block text-xs text-brand-white/60 mb-1">Display name</label>
                <input className="w-full" value={draft?.displayName ?? open.displayName} onChange={e=> setDraft(d=> ({ ...(d||{}), displayName: e.target.value }))} />
              </div>
              <div>
                <label className="block text-xs text-brand-white/60 mb-1">Avatar URL</label>
                <input className="w-full" value={(draft?.avatarUrl ?? open.avatarUrl) || ''} placeholder="/uploads/avatars/.." onChange={e=> setDraft(d=> ({ ...(d||{}), avatarUrl: e.target.value }))} />
              </div>
              <div>
                <label className="block text-xs text-brand-white/60 mb-1">Cover URL</label>
                <input className="w-full" value={(draft?.coverUrl ?? open.coverUrl) || ''} placeholder="/uploads/covers/.." onChange={e=> setDraft(d=> ({ ...(d||{}), coverUrl: e.target.value }))} />
              </div>
              <div>
                <label className="block text-xs text-brand-white/60 mb-1">Nume Prenume (IC)</label>
                <input className="w-full" value={(draft?.fullNameIC ?? open.fullNameIC) || ''} onChange={e=> setDraft(d=> ({ ...(d||{}), fullNameIC: e.target.value }))} />
              </div>
              <div>
                <label className="block text-xs text-brand-white/60 mb-1">Telefon (IC)</label>
                <input className="w-full" value={(draft?.phoneIC ?? open.phoneIC) || ''} onChange={e=> setDraft(d=> ({ ...(d||{}), phoneIC: e.target.value }))} />
              </div>
              <div>
                <label className="block text-xs text-brand-white/60 mb-1">In-Game ID</label>
                <input className="w-full" type="number" value={draft?.inGameId ?? (open.inGameId ?? '')} min={1} max={200000} onChange={(e)=> setDraft(d=> ({ ...(d||{}), inGameId: e.target.value ? Number(e.target.value) : null }))} />
              </div>
              <div className="sm:col-span-2 flex items-center gap-2 mt-2">
                <button className="danger text-xs" onClick={()=> adminAction(open.id, 'ban')}>Ban</button>
                <button className="ghost text-xs" onClick={()=> adminAction(open.id, 'suspend7')}>Suspendă 7 zile</button>
                <button className="ghost text-xs" onClick={()=> adminAction(open.id, 'deleteAccount')}>Șterge cont</button>
                <div className="ml-auto flex items-center gap-2">
                  <button className="ghost text-xs" onClick={()=> setDraft(null)}>Renunță</button>
                  <button className="success text-xs" onClick={async ()=>{ if (!draft) return; await updateUser(open, draft as any); setDraft(null); }}>Salvează</button>
                </div>
              </div>
              <div className="sm:col-span-2 text-[11px] text-brand-white/60 mt-2">ID: {open.id} • Creat: {new Date(open.createdAt).toLocaleString('ro-RO')}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
