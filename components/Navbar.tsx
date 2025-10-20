'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import clsx from 'clsx';
import { useEffect, useState } from 'react';
import { useSession, signOut } from 'next-auth/react';
import Image from 'next/image';

const baseLinks = [
  { href: '/marketplace', label: 'Marketplace' },
  // { href: '/listings/new', label: 'Adaugă anunț' }, // removed per redesign request
  // { href: '/dashboard', label: 'Panou' } // will be conditionally added for MODERATOR/ADMIN
];

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session } = useSession();
  const user: any = session?.user ? { role: (session.user as any).role, status: (session.user as any).status } : null;
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [initials, setInitials] = useState<string>('USR');
  const [handle, setHandle] = useState<string | null>(null);
  const [openMenu, setOpenMenu] = useState(false);
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        if (!user) { setAvatarUrl(null); return; }
        const res = await fetch('/api/profile');
        if (!res.ok) return;
        const js = await res.json();
        if (active) {
          setAvatarUrl(js.avatarUrl || null);
          setHandle(js.handle || null);
          const dn = (js.displayName || '').trim();
          const parts = dn.split(/\s+/).filter(Boolean);
          const ini = parts.length >= 2 ? `${parts[0][0]}${parts[1][0]}` : (parts[0]?.slice(0,2) || 'US');
          setInitials(ini.toUpperCase());
        }
      } catch {}
    })();
    return () => { active = false; };
  }, [user]);
  function logout() { signOut({ callbackUrl: '/' }); }
  const links = (() => {
    if (!user) return [];
    const isMod = user && (user.role === 'MODERATOR' || user.role === 'ADMIN');
    const modLinks = isMod ? [...baseLinks, { href: '/dashboard', label: 'Panou' }] : baseLinks;
    const isAdmin = user && user.role === 'ADMIN';
    return isAdmin ? [...modLinks, { href: '/admin', label: 'Admin' }] : modLinks;
  })();
  return (
    <nav className="navbar mb-4">
      <div className="container h-full flex items-center gap-6">
        <Link href="/" className="font-bold text-brand-gold hover:text-yellow-300 transition">Paladins Palace</Link>
        <div className="flex gap-4">
          {links.map(l => (
            <Link key={l.href} href={l.href} className={clsx('text-sm font-medium text-brand-white/80 hover:text-brand-white', pathname?.startsWith(l.href) && 'text-brand-blue')}>{l.label}</Link>
          ))}
        </div>
        <div className="ml-auto flex gap-3 items-center">
          {user ? (
            <div className="relative">
              <button aria-haspopup="menu" aria-expanded={openMenu} onClick={() => setOpenMenu(v => !v)} className="block h-8 w-8 rounded-full overflow-hidden border border-glass bg-white/5 hover:ring-2 hover:ring-brand-blue/40 transition" title="Meniu utilizator">
                {avatarUrl ? (
                  <Image src={avatarUrl} alt="avatar" width={32} height={32} className="h-8 w-8 object-cover" />
                ) : (
                  <div className="h-8 w-8 flex items-center justify-center text-[10px] text-brand-white/70">{initials}</div>
                )}
              </button>
              {openMenu && (
                <div className="absolute right-0 mt-2 w-44 rounded-md border border-glass bg-[#14161c] shadow-lg z-50">
                  <button onClick={() => { setOpenMenu(false); router.push(handle ? `/users/${handle.replace(/^@/, '')}` : '/users/me'); }} className="w-full text-left px-3 py-2 text-sm hover:bg-white/10">Profil</button>
                  <button onClick={() => { setOpenMenu(false); router.push('/profile'); }} className="w-full text-left px-3 py-2 text-sm hover:bg-white/10">Account</button>
                  <button onClick={() => { setOpenMenu(false); router.push('/help'); }} className="w-full text-left px-3 py-2 text-sm hover:bg-white/10">Ajutor</button>
                  <button onClick={() => { setOpenMenu(false); logout(); }} className="w-full text-left px-3 py-2 text-sm hover:bg-white/10 text-red-300">Logout</button>
                </div>
              )}
              {openMenu && (
                <button aria-label="close menu" className="fixed inset-0 z-40 cursor-default" onClick={() => setOpenMenu(false)} />
              )}
            </div>
          ) : (
            <>
              <Link href="/login" className="btn btn-ghost">Autentificare</Link>
              <Link href="/register" className="btn btn-primary">Înregistrare</Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}