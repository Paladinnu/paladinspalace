"use client";
import { useEffect, useMemo, useState } from 'react';
import { useSession } from 'next-auth/react';
import Image from 'next/image';
import { SafeImage } from '../../../components/SafeImage';
import Link from 'next/link';

interface ListingCard { id: string; title: string; price?: number|null; category?: string|null; createdAt: string; thumb?: string|null; blurDataURL?: string|null; isGold?: boolean; descriptionExcerpt?: string }
interface ProfileData { displayName: string; avatarUrl?: string|null; discordTag?: string|null; inGameName?: string|null; bio?: string|null; coverUrl?: string|null; }

function slugifyHandle(name?: string|null, fallback?: string|null) {
  if (fallback && /^@/.test(fallback)) return fallback;
  const base = (name || '').toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '').replace(/[^a-z0-9]+/g, '').slice(0, 20);
  return base ? `@${base}` : '@user';
}

export default function MyPublicProfilePage() {
  const { data: session } = useSession();
  const [items, setItems] = useState<ListingCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string|null>(null);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const userId = (session?.user as any)?.id || (session as any)?.sub;

  const displayName = useMemo(() => (
    (profile?.displayName) || (session?.user as any)?.name || (session?.user as any)?.displayName || 'Canalul meu'
  ), [profile?.displayName, session?.user]);
  const avatarUrl = profile?.avatarUrl || (session?.user as any)?.avatarUrl || null;
  const coverUrl = profile?.coverUrl || (session?.user as any)?.coverUrl || null;
  const handle = useMemo(() => (
    slugifyHandle((session?.user as any)?.displayName || profile?.displayName, (session?.user as any)?.discordTag || profile?.discordTag)
  ), [session?.user, profile]);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch('/api/profile');
        const js = await res.json();
        if (!res.ok) throw new Error(js.error || 'Eroare profil');
        if (active) setProfile({ displayName: js.displayName, avatarUrl: js.avatarUrl || null, discordTag: js.discordTag || null, inGameName: js.inGameName || null, bio: js.bio || null, coverUrl: js.coverUrl || null });
        // Redirect to /users/@handle if handle set and different route
        if (js.handle && typeof window !== 'undefined') {
          const path = window.location.pathname;
          if (path === '/users/me') {
            const seg = (js.handle as string).replace(/^@/, '');
            window.location.replace(`/users/${seg}`);
            return;
          }
        }
      } catch (e:any) { /* non-blocking */ }
    })();
    (async () => {
      if (!userId) { setLoading(false); return; }
      try {
        const res = await fetch(`/api/listings?sellerId=${encodeURIComponent(userId)}&limit=50`);
        const js = await res.json();
        if (!res.ok) throw new Error(js.error || 'Eroare listări');
        if (active) setItems(js.items || []);
      } catch (e:any) { if (active) setError(e.message); }
      finally { if (active) setLoading(false); }
    })();
    return () => { active = false; };
  }, [userId]);

  function timeAgo(iso: string) {
    const now = Date.now();
    const t = new Date(iso).getTime();
    const s = Math.max(1, Math.floor((now - t) / 1000));
    if (s < 60) return `acum ${s}s`;
    const m = Math.floor(s / 60);
    if (m < 60) return `acum ${m} min`;
    const h = Math.floor(m / 60);
    if (h < 24) return `acum ${h} h`;
    const d = Math.floor(h / 24);
    return d === 1 ? 'ieri' : `${d} zile`;
  }

  // YouTube-like layout
  return (
    <div className="container">
      {/* Banner */}
      <div className="relative h-44 sm:h-56 md:h-64 w-full rounded-2xl overflow-hidden border border-glass">
        {coverUrl ? (
          <SafeImage src={coverUrl} alt="cover" fill sizes="100vw" className="object-cover" />
        ) : (
          <div className="w-full h-full bg-gradient-to-r from-indigo-600/40 via-purple-600/30 to-pink-600/20" />
        )}
      </div>

      {/* Header with avatar overlapping banner */}
      <div className="px-4 sm:px-6 -mt-8 sm:-mt-10 relative">
        <div className="flex items-end gap-4">
          <div className="h-20 w-20 sm:h-24 sm:w-24 rounded-full overflow-hidden border-4 border-black/40 shadow-lg bg-white/5">
            {avatarUrl ? (
              <SafeImage src={avatarUrl} alt="avatar" width={96} height={96} className="h-full w-full object-cover" />
            ) : (
              <div className="h-full w-full flex items-center justify-center text-sm text-brand-white/60">{displayName.slice(0,2).toUpperCase()}</div>
            )}
          </div>
          <div className="flex-1 pb-3">
            <h1 className="text-2xl sm:text-3xl font-bold">{displayName}</h1>
            <div className="text-sm text-brand-white/70">{handle}</div>
            {profile?.bio && <div className="mt-2 text-sm text-brand-white/80 line-clamp-2">{profile.bio}</div>}
          </div>
          <div className="pb-3 hidden sm:flex gap-2">
            <Link href="/profile" className="btn btn-ghost text-sm">Personalizează</Link>
            <Link href="/listings/new" className="btn btn-primary text-sm">Publică anunț</Link>
          </div>
        </div>
      </div>

      {/* Single tab header like YouTube */}
      <div className="mt-3 px-4 sm:px-6 border-b border-glass/60">
        <div className="flex items-center gap-6 text-sm">
          <span className="py-3 border-b-2 border-brand-white text-brand-white">Postări</span>
        </div>
      </div>

      {/* Content area */}
      <div className="px-4 sm:px-6 py-5 space-y-3">
        {loading && (
          <>
            <div className="skeleton skeleton-row" />
            <div className="skeleton skeleton-row" />
          </>
        )}
        {error && <div className="text-red-500">{error}</div>}
        {!loading && !error && items.length === 0 && (
          <div className="card p-5 text-sm text-brand-white/70">Nu ai anunțuri în ultimele 7 zile.</div>
        )}
        {!loading && !error && items.length > 0 && (
          <div className="flex flex-col gap-3">
            {items.map(it => (
              <Link key={it.id} href={`/listings/${it.id}`} className={"row-card row-card-noavatar" + (it.isGold ? " row-card-premium" : "")} title={it.title}>
                {/* thumbnail */}
                <div className="row-thumb">
                  {it.thumb ? (
                    <Image src={it.thumb} alt={it.title} fill sizes="(max-width: 1024px) 40vw, 220px" className="object-cover" placeholder={it.blurDataURL ? 'blur' : 'empty'} blurDataURL={it.blurDataURL || undefined} />
                  ) : (
                    <div className="absolute inset-0 grid place-items-center text-xs text-brand-white/60">Fără imagine</div>
                  )}
                  {it.isGold && <span className="ribbon-gold">GOLD</span>}
                  <span className="badge absolute bottom-2 left-2 text-[10px]">{timeAgo(it.createdAt)}</span>
                </div>
                {/* details */}
                <div className="p-4 flex flex-col gap-2">
                  <div className="lc-header">
                    <h2 className="lc-title line-clamp-2">{it.title}</h2>
                    <div className="lc-price">
                      <div className="label">Preț</div>
                      <div className={"value " + (it.isGold ? "text-gold-gradient" : "text-brand-white")}>{it.price != null ? `${it.price.toLocaleString('ro-RO')} $` : 'Nespecificat'}</div>
                    </div>
                  </div>
                  {it.descriptionExcerpt && (
                    <div className="desc-bar" title={it.descriptionExcerpt}>{it.descriptionExcerpt}</div>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
