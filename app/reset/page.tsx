"use client";
import { useState } from 'react';

export default function RequestResetPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault(); setMsg(null); setErr(null); setLoading(true);
    try {
      const res = await fetch('/api/password/reset-request', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email }) });
      const js = await res.json();
      if (!res.ok) throw new Error(js.error || 'Eroare');
      setMsg('Dacă adresa există în sistem, ți-am trimis instrucțiuni pentru resetarea parolei.');
    } catch (e:any) {
      setErr(e.message);
    } finally { setLoading(false); }
  }

  return (
    <div className="max-w-md mx-auto panel p-6">
      <h1 className="text-xl font-semibold mb-4 text-brand-white">Resetează parola</h1>
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Email</label>
          <input type="email" className="w-full" value={email} onChange={e=>setEmail(e.target.value)} required />
        </div>
        {err && <p className="text-sm text-red-500">{err}</p>}
        {msg && <p className="text-sm text-green-400">{msg}</p>}
        <button disabled={loading} className="w-full primary text-sm disabled:opacity-50">{loading ? 'Se trimite...' : 'Trimite link de resetare'}</button>
      </form>
    </div>
  );
}
