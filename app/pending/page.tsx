"use client";
import Link from 'next/link';
import { signOut } from 'next-auth/react';

export default function PendingPage() {
  return (
    <div className="max-w-lg mx-auto panel p-6 text-brand-white/90">
      <h1 className="text-2xl font-bold mb-2">Cont în verificare</h1>
      <p className="text-sm text-brand-white/80">Cererea ta de acces a fost înregistrată. Un moderator îți va verifica datele în cel mai scurt timp.</p>
      <ul className="list-disc pl-5 text-sm text-brand-white/70 mt-3 space-y-1">
        <li>Vei primi notificare după aprobare.</li>
        <li>Între timp poți să-ți completezi profilul (avatar, nume afișat) din pagina de profil.</li>
      </ul>
      <div className="mt-5 flex gap-2">
        <Link href="/profile" className="btn btn-ghost">Profil</Link>
        <button onClick={() => signOut({ callbackUrl: '/login' })} className="btn btn-primary">Înapoi la autentificare</button>
      </div>
    </div>
  );
}
