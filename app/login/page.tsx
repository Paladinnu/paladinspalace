"use client";
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    if (!email || !password) {
      setError('Completeaza email si parola');
      return;
    }
    setLoading(true);
    try {
      const res = await signIn('credentials', { email, password, redirect: false });
      if (res?.error) {
        // Localize common NextAuth credential error
        const msg = res.error.includes('CredentialsSignin')
          ? 'Emailul sau parola sunt greșite.'
          : 'Autentificare eșuată. Încearcă din nou.';
        throw new Error(msg);
      }
      setSuccess(true);
      // After login, send non-approved users to /pending; approved -> /marketplace
      try {
        const me = await fetch('/api/profile');
        const js = await me.json();
        const approved = js?.status === 'APPROVED';
        setTimeout(() => router.push(approved ? '/marketplace' : '/pending'), 400);
      } catch {
        setTimeout(() => router.push('/marketplace'), 400);
      }
    } catch (err: any) {
      setError(err.message || 'Eroare la autentificare');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-md mx-auto panel p-6">
      <h1 className="text-xl font-semibold mb-4 text-brand-white">Autentificare</h1>
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Email</label>
          <input type="email" className="w-full" value={email} onChange={e => setEmail(e.target.value)} required />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Parola</label>
          <input type="password" className="w-full" value={password} onChange={e => setPassword(e.target.value)} required />
          <div className="mt-1 text-xs text-brand-white/70">
            <a href="/reset" className="underline hover:text-brand-white">Ai uitat parola?</a>
          </div>
        </div>
        {error && <p className="text-sm text-red-500">{error}</p>}
        {success && <p className="text-sm text-green-400">Autentificat! Redirecționare...</p>}
        <button disabled={loading} className="w-full primary text-sm disabled:opacity-50">{loading ? 'Se conectează...' : 'Intră'}</button>
      </form>
      <div className="mt-3 text-xs text-brand-white/70">
        Nu ai cont? <a href="/register" className="underline hover:text-brand-white">Creează-ți unul</a>
      </div>
      <div className="my-4 flex items-center gap-3">
        <div className="h-px flex-1 bg-white/10" />
        <span className="text-xs text-brand-white/60">sau</span>
        <div className="h-px flex-1 bg-white/10" />
      </div>
      <button onClick={() => signIn('discord', { callbackUrl: '/profile' })} className="w-full ghost text-sm">
        Conectează cu Discord
      </button>
    </div>
  );
}
