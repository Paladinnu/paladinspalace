"use client";
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [fullNameIC, setFullNameIC] = useState('');
  const [inGameId, setInGameId] = useState<number | ''>('');
  const [phoneIC, setPhoneIC] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    if (!email || !password || !displayName || !fullNameIC || !inGameId || !phoneIC) {
      setError('Te rugăm să completezi toate câmpurile.');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, displayName, fullNameIC, inGameId: Number(inGameId), phoneIC })
      });
      const data = await res.json();
      if (!res.ok) {
        const msg = typeof data?.error === 'string' ? data.error : 'Înregistrare eșuată. Verifică datele.';
        setError(msg);
      } else {
        setSuccess('Cererea ta a fost trimisă. Un moderator va aproba accesul.');
        // opțional: redirect la login după scurt timp
        setTimeout(() => router.push('/login'), 1500);
      }
    } catch (e: any) {
      setError('Eroare de rețea. Încearcă din nou.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-xl mx-auto p-6">
      <h1 className="text-2xl font-semibold mb-4">Înregistrare</h1>
      <p className="text-sm text-gray-500 mb-6">Creează cont pentru a solicita acces. Vei primi aprobarea de la un moderator.</p>
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Email</label>
          <input type="email" className="w-full border rounded px-3 py-2" value={email} onChange={e=>setEmail(e.target.value)} required />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Parola</label>
          <input type="password" className="w-full border rounded px-3 py-2" value={password} onChange={e=>setPassword(e.target.value)} required minLength={6} />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Nume afișat</label>
            <input type="text" className="w-full border rounded px-3 py-2" value={displayName} onChange={e=>setDisplayName(e.target.value)} required minLength={3} maxLength={30} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Nume Prenume IC</label>
            <input type="text" className="w-full border rounded px-3 py-2" value={fullNameIC} onChange={e=>setFullNameIC(e.target.value)} required />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">In‑Game ID</label>
            <input type="number" className="w-full border rounded px-3 py-2" value={inGameId} onChange={e=>setInGameId(e.target.value ? Number(e.target.value) : '')} required min={1} max={200000} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Telefon IC</label>
            <input type="tel" className="w-full border rounded px-3 py-2" value={phoneIC} onChange={e=>setPhoneIC(e.target.value)} required placeholder="+407xxxxxxxx" />
          </div>
        </div>
        {error && <div className="text-red-600 text-sm">{error}</div>}
        {success && <div className="text-green-600 text-sm">{success}</div>}
        <button type="submit" disabled={loading} className="bg-black text-white px-4 py-2 rounded disabled:opacity-50">
          {loading ? 'Se trimite…' : 'Trimite cererea'}
        </button>
      </form>
    </div>
  );
}
