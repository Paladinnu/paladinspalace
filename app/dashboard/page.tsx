"use client";
import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';

interface PendingUser { id: string; email: string; displayName: string; createdAt: string; fullNameIC?: string | null; phoneIC?: string | null; inGameId?: number | null; discordLinked?: boolean; discordTag?: string | null; }

export default function DashboardPage() {
  const { data: session } = useSession();
  const role = (session?.user as any)?.role;
  const [pending, setPending] = useState<PendingUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [errorUsers, setErrorUsers] = useState<string | null>(null);
  const [selected, setSelected] = useState<PendingUser | null>(null);

  useEffect(() => {
    if (role !== 'MODERATOR' && role !== 'ADMIN') return;
  loadPending();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role]);

  async function loadPending() {
    setLoadingUsers(true); setErrorUsers(null);
    try {
      const res = await fetch('/api/users/pending');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Eroare');
      setPending(data);
    } catch (e: any) { setErrorUsers(e.message); }
    finally { setLoadingUsers(false); }
  }

  async function actOnUser(userId: string, action: 'approve' | 'suspend') {
    const prev = pending;
    setPending(p => p.filter(u => u.id !== userId));
    try {
      const res = await fetch('/api/users/pending', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId, action }) });
      if (!res.ok) throw new Error('Actiune esuata');
    } catch (e) {
      // revert on error
      setPending(prev);
      alert('Eroare actiune');
    }
  }

  function maskEmail(email: string) {
    if (!email) return '';
    const first = email.charAt(0);
    return `${first}********`;
  }

  if (role !== 'MODERATOR' && role !== 'ADMIN') {
    return <div><h1 className="text-2xl font-bold mb-4">Dashboard</h1><p>Nu ai permisiuni de moderator.</p></div>;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-brand-white">Dashboard Moderator</h1>
        <a href="/dashboard/users" className="ghost text-sm">Vezi toți utilizatorii</a>
      </div>
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-brand-white/90">Utilizatori în așteptare</h2>
      </div>
      <div>
        {loadingUsers && <p className="text-brand-white/70">Se încarcă...</p>}
        {errorUsers && <p className="text-red-500">{errorUsers}</p>}
        {!loadingUsers && pending.length === 0 && <p className="text-brand-white/60 text-sm">Niciun utilizator în așteptare.</p>}
        <ul className="space-y-3">
          {pending.map(u => (
            <li key={u.id} className="panel p-3 flex flex-col sm:flex-row sm:items-center gap-3">
              <button
                type="button"
                onClick={() => setSelected(u)}
                className="flex-1 text-left cursor-pointer"
              >
                <p className="font-medium text-sm text-brand-white">
                  <span className="text-xs px-2 py-1 rounded border border-glass bg-white/5 mr-2">ID: {u.id}</span>
                  <span className="mr-2">{u.fullNameIC || 'Nume Prenume IC necunoscut'}</span>
                  <span className="text-brand-white/60 ml-2">({maskEmail(u.email)})</span>
                </p>
                <div className="text-[11px] text-brand-white/60 mt-1 flex flex-wrap gap-x-4 gap-y-1">
                  {u.phoneIC && <span>Număr Telefon IC: {u.phoneIC}</span>}
                  {typeof u.inGameId === 'number' && <span>IBAN (ID): {u.inGameId}</span>}
                  <span>Display Name: {u.displayName}</span>
                  <span>Discord: {u.discordLinked ? (u.discordTag || 'conectat') : 'neconectat'}</span>
                  <span>Creat: {new Date(u.createdAt).toLocaleString('ro-RO')}</span>
                </div>
              </button>
              <div className="flex gap-2 w-full sm:w-auto sm:min-w-[240px]">
                <button
                  onClick={(e) => { e.stopPropagation(); actOnUser(u.id, 'approve'); }}
                  className="success text-sm flex-1"
                >Aprobă</button>
                <button
                  onClick={(e) => { e.stopPropagation(); actOnUser(u.id, 'suspend'); }}
                  className="danger text-sm flex-1"
                >Suspendă</button>
              </div>
            </li>
          ))}
        </ul>
      </div>

      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setSelected(null)} />
          <div className="panel relative z-10 w-full max-w-lg p-5">
            <div className="flex items-start justify-between mb-3">
              <h3 className="text-brand-white font-semibold">Detalii utilizator</h3>
              <button onClick={() => setSelected(null)} className="ghost text-xs">Închide</button>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-brand-white/70">ID</span><span className="text-brand-white font-medium">{selected.id}</span></div>
              <div className="flex justify-between"><span className="text-brand-white/70">Nume Prenume IC</span><span className="text-brand-white">{selected.fullNameIC || '-'}</span></div>
              <div className="flex justify-between"><span className="text-brand-white/70">Număr Telefon IC</span><span className="text-brand-white">{selected.phoneIC || '-'}</span></div>
              <div className="flex justify-between"><span className="text-brand-white/70">IBAN (ID)</span><span className="text-brand-white">{typeof selected.inGameId === 'number' ? selected.inGameId : '-'}</span></div>
              <div className="flex justify-between"><span className="text-brand-white/70">Display Name</span><span className="text-brand-white">{selected.displayName}</span></div>
                <div className="flex justify-between"><span className="text-brand-white/70">Discord</span><span className="text-brand-white">{selected.discordLinked ? (selected.discordTag || 'conectat') : 'neconectat'}</span></div>
              <div className="flex justify-between"><span className="text-brand-white/70">Email</span><span className="text-brand-white">{maskEmail(selected.email)}</span></div>
              <div className="flex justify-between"><span className="text-brand-white/70">Creat</span><span className="text-brand-white">{new Date(selected.createdAt).toLocaleString('ro-RO')}</span></div>
            </div>
            <div className="mt-4 flex items-center justify-end gap-2">
              <button onClick={() => { setSelected(null); actOnUser(selected.id, 'approve'); }} className="success text-sm">Aprobă</button>
              <button onClick={() => { setSelected(null); actOnUser(selected.id, 'suspend'); }} className="danger text-sm">Suspendă</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
