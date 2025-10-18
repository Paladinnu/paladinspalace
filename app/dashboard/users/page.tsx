"use client";
import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';

interface UserRow {
  id: string;
  displayName: string;
  fullNameIC?: string | null;
  inGameId?: number | null;
  phoneIC?: string | null;
  avatarUrl?: string | null;
  status: string;
  role: string;
  createdAt: string;
  updatedAt: string;
  accessUntil?: string | null;
  premiumUntil?: string | null;
  discordLinked: boolean;
  discordTag?: string | null;
  discordId?: string | null;
  listings: { id: string; title: string; createdAt: string; category?: string | null; price?: number | null; isGold?: boolean; deleted?: boolean }[];
}

export default function AllUsersPage() {
  const { data: session } = useSession();
  const role = (session?.user as any)?.role;
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<string>('');
  const [roleFilter, setRoleFilter] = useState<string>('');
  const [busyId, setBusyId] = useState<string>('');
  const [openId, setOpenId] = useState<string | null>(null);
  const [expiredOnly, setExpiredOnly] = useState<boolean>(false);
  const [toast, setToast] = useState<string>('');
  const [snapshot, setSnapshot] = useState<any | null>(null);
  const [premiumOnly, setPremiumOnly] = useState<boolean>(false);
  // derived counters
  const approvedCount = users.filter(u => u.status === 'APPROVED').length;
  const pendingCount = users.filter(u => u.status === 'PENDING').length;
  const premiumCount = users.filter(u => u.premiumUntil && new Date(u.premiumUntil).getTime() > Date.now()).length;

  async function mutateUser(userId: string, action: 'revoke'|'extend'|'setPremium'|'removePremium', days?: number) {
    try {
      setBusyId(userId);
      const res = await fetch('/api/mod/users', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId, action, days }) });
      const js = await res.json();
      if (!res.ok) throw new Error(js.error || 'Eroare');
  setUsers(prev => prev.map(u => u.id === userId ? { ...u, accessUntil: js.accessUntil, premiumUntil: js.premiumUntil } : u));
  setToast(action === 'revoke' ? 'Acces revocat' : action === 'extend' ? `Acces prelungit cu ${days || 30} zile` : action === 'removePremium' ? 'Premium eliminat' : `Premium +${days || 30} zile`);
    } catch (e: any) { alert(e.message); }
    finally { setBusyId(''); }
  }

  useEffect(() => {
    if (role !== 'MODERATOR' && role !== 'ADMIN') return;
    const fetchUsers = async () => {
      setLoading(true); setError(null);
      try {
  const params = new URLSearchParams();
        if (query.trim()) params.set('q', query.trim());
        if (status) params.set('status', status);
        if (roleFilter) params.set('role', roleFilter);
  if (expiredOnly) params.set('expired', '1');
  const res = await fetch('/api/mod/users' + (params.toString() ? `?${params.toString()}` : ''));
        const js = await res.json();
        if (!res.ok) throw new Error(js.error || 'Eroare');
        setUsers(js);
      } catch (e: any) { setError(e.message); }
      finally { setLoading(false); }
    };
    fetchUsers();
    const t = setTimeout(fetchUsers, 0); // ensure first run
    return () => clearTimeout(t);
  }, [role, query, status, roleFilter, expiredOnly]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(''), 2000);
    return () => clearTimeout(t);
  }, [toast]);

  if (role !== 'MODERATOR' && role !== 'ADMIN') {
    return <div><h1 className="text-2xl font-bold mb-4">Utilizatori</h1><p>Nu ai permisiuni de moderator.</p></div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h1 className="text-2xl font-bold text-brand-white flex items-center gap-3">
          Toți utilizatorii
          <span className="text-xs px-2 py-1 rounded border border-green-500/30 bg-green-500/10 text-green-300">{approvedCount}</span>
          <span className="text-xs px-2 py-1 rounded border border-yellow-400/30 bg-yellow-400/10 text-yellow-200">{premiumCount}</span>
          <span className="text-xs px-2 py-1 rounded border border-blue-500/30 bg-blue-500/10 text-blue-200">{pendingCount}</span>
        </h1>
        <span className="text-xs text-brand-white/70">Ultimele 3 luni de anunțuri incluse</span>
      </div>
      <div className="panel p-3 flex flex-col sm:flex-row gap-3 items-center">
  <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Caută după nume/ID/IBAN" className="w-full sm:flex-1 border rounded px-3 py-2 text-sm bg-white/5 border-glass" />
        <select value={status} onChange={e => setStatus(e.target.value)} className="border rounded px-3 py-2 text-sm bg-white/5 border-glass">
          <option value="">Toate statusurile</option>
          <option value="PENDING">PENDING</option>
          <option value="APPROVED">APPROVED</option>
          <option value="SUSPENDED">SUSPENDED</option>
        </select>
        <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)} className="border rounded px-3 py-2 text-sm bg-white/5 border-glass">
          <option value="">Toate rolurile</option>
          <option value="USER">USER</option>
          <option value="MODERATOR">MODERATOR</option>
          <option value="ADMIN">ADMIN</option>
        </select>
        <label className="flex items-center gap-2 text-sm text-brand-white/80 cursor-pointer select-none"><input type="checkbox" checked={expiredOnly} onChange={e => setExpiredOnly(e.target.checked)} /> Doar expirați</label>
        {/* Quick chips */}
        <div className="w-full sm:w-auto flex flex-wrap gap-2 mt-1 sm:mt-0">
          <button onClick={() => setPremiumOnly(v => !v)} className={(premiumOnly ? 'border-yellow-400/60 bg-yellow-400/20 text-yellow-100 ' : 'border-yellow-400/30 bg-yellow-400/10 text-yellow-200 ') + 'text-xs px-2 py-1 rounded border'}>Premium</button>
          <button onClick={() => setStatus(s => s === 'PENDING' ? '' : 'PENDING')} className={(status==='PENDING' ? 'border-blue-500/60 bg-blue-500/20 text-blue-100 ' : 'border-blue-500/30 bg-blue-500/10 text-blue-200 ') + 'text-xs px-2 py-1 rounded border'}>Pending</button>
          <button onClick={() => setRoleFilter(r => r === 'MODERATOR' ? '' : 'MODERATOR')} className={(roleFilter==='MODERATOR' ? 'border-indigo-400/60 bg-indigo-400/20 text-indigo-100 ' : 'border-indigo-400/30 bg-indigo-400/10 text-indigo-200 ') + 'text-xs px-2 py-1 rounded border'}>Moderatori</button>
          <button onClick={() => setRoleFilter(r => r === 'USER' ? '' : 'USER')} className={(roleFilter==='USER' ? 'border-white/40 bg-white/20 text-brand-white ' : 'border-white/20 bg-white/10 text-brand-white/80 ') + 'text-xs px-2 py-1 rounded border'}>Utilizatori</button>
        </div>
      </div>
      {loading && <p className="text-brand-white/70">Se încarcă...</p>}
      {error && <p className="text-red-500">{error}</p>}
      <ul className="space-y-3">
        {users
          .filter(u => !premiumOnly || (u.premiumUntil && new Date(u.premiumUntil).getTime() > Date.now()))
          .map(u => (
          <li key={u.id} className="panel p-4 cursor-pointer hover:border-white/10 transition-colors" onClick={() => setOpenId(u.id)}>
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <span className="text-xs px-2 py-1 rounded border border-glass bg-white/5 shrink-0">ID: {u.id}</span>
                <div className="truncate">
                  <div className="font-medium text-brand-white truncate">{u.fullNameIC || u.displayName}</div>
                  <div className="text-xs text-brand-white/60 truncate">{typeof u.inGameId === 'number' ? u.inGameId : '—'}</div>
                </div>
              </div>
              <div className="text-brand-white/60 text-lg">›</div>
            </div>
          </li>
        ))}
      </ul>

      {/* Modal details */}
      {openId && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => setOpenId(null)}>
          <div className="panel p-5 max-w-2xl w-[92vw]" onClick={(e) => e.stopPropagation()}>
            {(() => { const u = users.find(x => x.id === openId)!; return (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-xl font-semibold text-brand-white">{u.fullNameIC || u.displayName}</h2>
                  <button onClick={() => setOpenId(null)} className="text-brand-white/70 hover:text-brand-white">Închide</button>
                </div>
                {/* Date IC (prioritar) */}
                <div className="space-y-2 text-sm text-brand-white/80">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div><span className="text-brand-white/60">Nume Prenume IC:</span> {u.fullNameIC || '—'}</div>
                    <div><span className="text-brand-white/60">IBAN (ID):</span> {typeof u.inGameId === 'number' ? u.inGameId : '—'}</div>
                    <div><span className="text-brand-white/60">Telefon IC:</span> {u.phoneIC || '—'}</div>
                  </div>
                  <hr className="border-white/10" />
                  {/* Alte informații cont */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div><span className="text-brand-white/60">Status:</span> {u.status}</div>
                    <div><span className="text-brand-white/60">Rol:</span> {u.role}</div>
                    <div><span className="text-brand-white/60">Discord:</span> {u.discordLinked ? (u.discordId ? <a className="underline" target="_blank" rel="noreferrer" href={`https://discord.com/users/${u.discordId}`}>{u.discordTag || 'conectat'}</a> : (u.discordTag || 'conectat')) : 'neconectat'}</div>
                    <div><span className="text-brand-white/60">Acces până la:</span> {u.accessUntil ? new Date(u.accessUntil).toLocaleString('ro-RO') : '—'}</div>
                    <div><span className="text-brand-white/60">Premium până la:</span> {u.premiumUntil ? new Date(u.premiumUntil).toLocaleString('ro-RO') : '—'}</div>
                    <div className="sm:col-span-2"><span className="text-brand-white/60">ID:</span> {u.id}</div>
                    <div className="sm:col-span-2"><span className="text-brand-white/60">Creat:</span> {new Date(u.createdAt).toLocaleString('ro-RO')} • <span className="text-brand-white/60">Actualizat:</span> {new Date(u.updatedAt).toLocaleString('ro-RO')}</div>
                  </div>
                </div>
                {u.role === 'USER' && (
                  <div className="mt-4 grid grid-cols-2 sm:flex sm:flex-wrap gap-2 text-[13px]">
                    <button disabled={busyId===u.id} onClick={() => mutateUser(u.id, 'revoke')} className="danger disabled:opacity-50">Revocă acces</button>
                    <button disabled={busyId===u.id} onClick={() => mutateUser(u.id, 'extend', 7)} className="success disabled:opacity-50">+7 zile</button>
                    <button disabled={busyId===u.id} onClick={() => mutateUser(u.id, 'extend', 30)} className="success disabled:opacity-50">+30 zile</button>
                    <button disabled={busyId===u.id} onClick={() => mutateUser(u.id, 'extend', 90)} className="success disabled:opacity-50">+90 zile</button>
                    <button disabled={busyId===u.id} onClick={() => mutateUser(u.id, 'setPremium', 30)} className="ghost disabled:opacity-50">Premium +30 zile</button>
                    <button disabled={busyId===u.id} onClick={() => mutateUser(u.id, 'removePremium')} className="ghost disabled:opacity-50">Remove premium</button>
                  </div>
                )}
                {u.listings.length > 0 ? (
                  <div className="mt-4">
                    <p className="text-xs text-brand-white/80 mb-1">Anunțuri în ultimele 3 luni ({u.listings.length}):</p>
                    <ul className="text-[11px] text-brand-white/70 grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-auto pr-1">
                      {u.listings.map(l => (
                        <li key={l.id} className={"bg-white/5 border rounded px-2 py-1 flex items-center justify-between " + (l.isGold ? 'border-yellow-400/40' : 'border-glass')}>
                          {l.deleted ? (
                            <button className="truncate mr-2 underline text-left" title={l.title}
                              onClick={async (e)=> { e.stopPropagation(); try { const res = await fetch(`/api/listing-snapshots/${l.id}`); const js = await res.json(); if (!res.ok) throw new Error(js.error || 'Nu s-a putut încărca arhiva'); setSnapshot(js); } catch (err: any) { alert(err.message); } }}>
                              [șters] {l.title}
                            </button>
                          ) : (
                            <Link href={`/listings/${l.id}`} className="truncate mr-2 underline flex items-center gap-2" title={l.title} onClick={(e)=> e.stopPropagation()}>
                              {l.isGold && <span className="ribbon-gold text-[9px] relative top-0">GOLD</span>}
                              <span className={l.isGold ? 'text-gold-gradient' : ''}>{l.title}</span>
                            </Link>
                          )}
                          <span className={(l.isGold ? 'text-gold-gradient ' : 'text-brand-white/50 ') + 'whitespace-nowrap'}>
                            {l.price != null ? `${l.price.toLocaleString('ro-RO')} $` : new Date(l.createdAt).toLocaleDateString('ro-RO')}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  <p className="text-[11px] text-brand-white/60 mt-4">Nu are anunțuri în ultimele 3 luni.</p>
                )}
              </div>
            )})()}
          </div>
        </div>
      )}
      {toast && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-white/10 text-brand-white border border-glass rounded px-4 py-2 text-sm shadow-lg" role="status">
          {toast}
        </div>
      )}
      {snapshot && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => setSnapshot(null)}>
          <div className="panel p-4 max-w-2xl w-[92vw]" onClick={(e)=> e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold">Arhivă anunț</h3>
              <button className="text-brand-white/70" onClick={()=> setSnapshot(null)}>Închide</button>
            </div>
            {(() => { const d = snapshot.data; return (
              <div className="space-y-3">
                <div className="text-sm text-brand-white/70">Creat la: {new Date(snapshot.createdAt).toLocaleString('ro-RO')}</div>
                <div>
                  <div className="text-xl font-semibold">{d.title}</div>
                  <div className="text-brand-white/70 whitespace-pre-wrap mt-1">{d.description}</div>
                  {typeof d.price === 'number' && <div className="mt-1">Preț: {d.price}</div>}
                  {d.images?.length > 0 && (
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      {d.images.map((img: any, idx: number) => <img key={idx} src={img.thumb || img.original} alt="" className="rounded" />)}
                    </div>
                  )}
                </div>
              </div>
            ); })()}
          </div>
        </div>
      )}
    </div>
  );
}
