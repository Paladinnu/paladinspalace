"use client";
import { useParams, useRouter } from 'next/navigation';
import { useState } from 'react';

export default function ResetWithTokenPage() {
  const params = useParams();
  const router = useRouter();
  const token = (params?.token as string) || '';
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault(); setErr(null);
    if (password.length < 8) { setErr('Parola trebuie să aibă minim 8 caractere.'); return; }
    if (password !== confirm) { setErr('Parolele nu coincid.'); return; }
    setLoading(true);
    try {
      const res = await fetch('/api/password/reset', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token, password }) });
      const js = await res.json();
      if (!res.ok) throw new Error(js.error || 'Eroare');
      setOk(true);
      setTimeout(()=> router.push('/login'), 1200);
    } catch (e:any) {
      setErr(e.message);
    } finally { setLoading(false); }
  }

  return (
    <div className="max-w-md mx-auto panel p-6">
      <h1 className="text-xl font-semibold mb-4 text-brand-white">Setează o parolă nouă</h1>
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Parolă nouă</label>
          <input type="password" className="w-full" value={password} onChange={e=>setPassword(e.target.value)} required />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Confirmă parola</label>
          <input type="password" className="w-full" value={confirm} onChange={e=>setConfirm(e.target.value)} required />
        </div>
        {err && <p className="text-sm text-red-500">{err}</p>}
        {ok && <p className="text-sm text-green-400">Parola a fost actualizată. Redirecționare...</p>}
        <button disabled={loading} className="w-full primary text-sm disabled:opacity-50">{loading ? 'Se salvează...' : 'Resetează parola'}</button>
      </form>
    </div>
  );
}
