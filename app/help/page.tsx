"use client";
import { useState } from 'react';

export default function HelpPage() {
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<string>('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await fetch('/api/tickets', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ subject, message }) });
      const js = await res.json();
      if (!res.ok) throw new Error(js.error || 'Eroare');
      setSubject(''); setMessage('');
      setToast('Ticket trimis. Un moderator va răspunde în curând.');
      setTimeout(() => setToast(''), 2500);
    } catch (e:any) {
      alert(e.message);
    } finally { setBusy(false); }
  }

  return (
    <div className="max-w-xl mx-auto space-y-4">
      <h1 className="text-2xl font-bold">Ajutor</h1>
      <div className="panel p-4">
        <form onSubmit={submit} className="space-y-3">
          <div>
            <label className="block text-xs font-medium mb-1">Subiect</label>
            <input className="w-full border rounded px-3 py-2 text-sm" value={subject} onChange={e => setSubject(e.target.value)} required />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">Mesaj</label>
            <textarea className="w-full border rounded px-3 py-2 text-sm min-h-[120px]" value={message} onChange={e => setMessage(e.target.value)} required />
          </div>
          <button disabled={busy} className="primary disabled:opacity-50 text-sm">{busy ? 'Se trimite...' : 'Trimite ticket'}</button>
        </form>
      </div>
      {toast && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-white/10 text-brand-white border border-glass rounded px-4 py-2 text-sm shadow-lg" role="status">{toast}</div>
      )}
    </div>
  );
}
