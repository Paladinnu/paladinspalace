"use client";
import { useEffect, useState } from 'react';
import Image from 'next/image';
import { SafeImage } from '../../components/SafeImage';
import { signIn, useSession } from 'next-auth/react';

interface ProfileData {
  id: string;
  email: string;
  displayName: string;
  status?: 'PENDING' | 'APPROVED' | 'SUSPENDED' | string;
  fullNameIC?: string | null;
  inGameId?: number | null;
  phoneIC?: string | null;
  avatarUrl?: string | null;
  discordTag?: string | null;
  accessUntil?: string | null;
  premiumUntil?: string | null;
}

export default function ProfilePage() {
  const { data: session } = useSession();
  const [data, setData] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [bio, setBio] = useState('');
  const [handle, setHandle] = useState('');
  const [coverUrl, setCoverUrl] = useState('');
  const [coverFileName, setCoverFileName] = useState<string>('');
  const [coverUploading, setCoverUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [avatarFileName, setAvatarFileName] = useState<string>('');
  const [discord, setDiscord] = useState<string | null>(null);
  const [discordAvailable, setDiscordAvailable] = useState<boolean | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const approved = ((session?.user as any)?.status || (data as any)?.status) === 'APPROVED';
  const role = (session?.user as any)?.role;

  function maskDiscordTag(tag: string | null): string {
    if (!tag) return '';
    // If it's a numeric-looking ID, avoid exposing it; show a generic label
    if (/^\d{6,}$/.test(tag)) return 'Conectat';
    // If it looks like name#1234, mask the middle of the name but keep discriminator
    const m = tag.match(/^(.*?)(#\d{1,4})$/);
    if (m) {
      const name = m[1] || '';
      const disc = m[2] || '';
      if (name.length <= 2) return `${name[0] || ''}*${disc}`;
      const visible = name.slice(0, 2);
      return `${visible}${'*'.repeat(Math.max(1, name.length - 2))}${disc}`;
    }
    // Fallback: mask middle of plain name
    if (tag.length <= 2) return `${tag[0] || ''}*`;
    const start = tag.slice(0, 2);
    return `${start}${'*'.repeat(Math.max(1, tag.length - 2))}`;
  }

  function daysLeft(until?: string | null) {
    if (!until) return null;
    const ms = new Date(until).getTime() - Date.now();
    const d = Math.ceil(ms / (24 * 60 * 60 * 1000));
    return d;
  }

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch('/api/profile');
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || 'Eroare');
        if (active) {
          setData(json);
          setDisplayName(json.displayName);
          setAvatarUrl(json.avatarUrl || '');
          setDiscord(json.discordTag || null);
          setBio(json.bio || '');
          setHandle(json.handle || '');
          setCoverUrl(json.coverUrl || '');
        }
      } catch (e: any) {
        if (active) setError(e.message);
      } finally { if (active) setLoading(false); }
    })();
    (async () => {
      try {
        const res = await fetch('/api/auth/providers');
        const js = await res.json();
        if (active) setDiscordAvailable(!!js.discord);
      } catch { if (active) setDiscordAvailable(false); }
    })();
    return () => { active = false; };
  }, []);
  useEffect(() => {
    // Show toast if redirected after successful Discord link: /profile?linked=1
    if (typeof window !== 'undefined') {
      const sp = new URLSearchParams(window.location.search);
      if (sp.get('linked') === '1') {
        setToast('Discord conectat');
        const url = new URL(window.location.href);
        url.searchParams.delete('linked');
        window.history.replaceState({}, '', url.toString());
        setTimeout(() => setToast(null), 2500);
      }
    }
  }, []);

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch('/api/profile', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ displayName, avatarUrl: avatarUrl || null, bio: bio || undefined, handle: handle || undefined, coverUrl: coverUrl || undefined }) });
      const js = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(js.error || 'Eroare salvare');
      setToast('Profil salvat');
      setTimeout(() => setToast(null), 2000);
    } catch (e: any) {
      alert(e.message);
    } finally { setSaving(false); }
  }

  if (loading) return <p className="p-4">Se încarcă...</p>;
  if (error) return <p className="p-4 text-red-600">{error}</p>;
  if (!data) return <p className="p-4">Profil indisponibil</p>;

  return (
    <div className="container">
      {toast && (
        <div className="fixed top-4 right-4 z-50 bg-green-600 text-white text-sm rounded px-3 py-2 shadow-lg">{toast}</div>
      )}

      <div className="mb-4">
        <h1 className="text-2xl font-bold">Personalizarea canalului</h1>
        <div className="text-sm text-brand-white/70">Setează bannerul, fotografia, numele, handle-ul și descrierea canalului tău.</div>
      </div>

      <div className="flex items-center justify-between mb-2">
        <div className="text-sm text-brand-white/70">Status cont</div>
        <span
          className={`text-[11px] px-2 py-0.5 rounded border ${approved
            ? 'bg-green-500/10 text-green-300 border-green-500/30'
            : (data?.status === 'SUSPENDED'
                ? 'bg-red-500/10 text-red-300 border-red-500/30'
                : 'bg-yellow-500/10 text-yellow-300 border-yellow-500/30')
          }`}
          title={`Status cont: ${data?.status || (session?.user as any)?.status || 'necunoscut'}`}
        >
          {data?.status || (session?.user as any)?.status || 'NECUNOSCUT'}
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left column: Banner & Avatar cards */}
        <div className="space-y-4">
          {/* Banner card */}
          <div className="panel p-4 space-y-3">
            <div className="font-semibold">Imaginea bannerului</div>
            <div className="text-xs text-brand-white/70">Pentru rezultate optime pe toate dispozitivele, folosește o imagine de cel puțin 2048 x 1152 pixeli și cel mult 6 MB.</div>
            <div className="relative h-32 w-full rounded-xl overflow-hidden border border-glass">
              {coverUrl ? (
                <SafeImage src={coverUrl} alt="cover" fill sizes="100vw" className="object-cover" />
              ) : (
                <div className="w-full h-full bg-gradient-to-r from-indigo-600/30 via-purple-600/20 to-pink-600/10" />
              )}
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Încarcă banner</label>
              <label className="inline-flex items-center gap-2 btn btn-ghost text-xs cursor-pointer">
                Încarcă
                <input type="file" accept="image/*" className="hidden" onChange={async e => {
                const file = e.target.files?.[0];
                if (!file) return;
                setCoverFileName(file.name);
                setCoverUploading(true);
                const fd = new FormData();
                fd.append('file', file);
                try {
                  const res = await fetch('/api/profile/cover', { method: 'POST', body: fd });
                  const js = await res.json();
                  if (!res.ok) {
                    if (res.status === 429 || js?.code === 'RATE_LIMIT' || js?.code === 'PROFILE_THROTTLE') {
                      throw new Error('Nu poți schimba acum bannerul. Încearcă mai târziu.');
                    }
                    throw new Error(js.error || 'Upload cover esuat');
                  }
                  setCoverUrl(js.coverUrl);
                } catch (err:any) {
                  alert(err.message);
                } finally { setCoverUploading(false); }
              }} />
              </label>
              {coverFileName && <span className="ml-2 text-xs text-brand-white/60 align-middle">{coverFileName}</span>}
              {coverUploading && <p className="text-xs text-gray-500 mt-1">Se încarcă cover-ul...</p>}
            </div>
          </div>

          {/* Avatar card */}
          <div className="panel p-4 space-y-3">
            <div className="font-semibold">Fotografie</div>
            <div className="text-xs text-brand-white/70">Recomandat: pătrat, minim 98 x 98 px, până la 4 MB. Formate PNG sau GIF (fără animație).
            </div>
            <div className="h-24 w-24 rounded-full overflow-hidden border-4 border-black/40 shadow-lg bg-white/5">
              {avatarUrl ? (
                <SafeImage src={avatarUrl} alt="avatar" width={96} height={96} className="h-full w-full object-cover" />
              ) : (
                <div className="h-full w-full flex items-center justify-center text-sm text-brand-white/60">AV</div>
              )}
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Încarcă fotografie</label>
              <label className="inline-flex items-center gap-2 btn btn-ghost text-xs cursor-pointer">
                Încarcă
                <input type="file" accept="image/*" className="hidden" onChange={async e => {
                const file = e.target.files?.[0];
                if (!file) return;
                setAvatarFileName(file.name);
                setUploading(true);
                const fd = new FormData();
                fd.append('file', file);
                try {
                  const res = await fetch('/api/profile/avatar', { method: 'POST', body: fd });
                  const js = await res.json();
                  if (!res.ok) {
                    if (res.status === 429 || js?.code === 'RATE_LIMIT' || js?.code === 'PROFILE_THROTTLE') {
                      throw new Error('Nu poți schimba acum fotografia. Încearcă mai târziu.');
                    }
                    throw new Error(js.error || 'Upload esuat');
                  }
                  setAvatarUrl(js.avatarUrl);
                } catch (err:any) {
                  alert(err.message);
                } finally { setUploading(false); }
              }} />
              </label>
              {avatarFileName && <span className="ml-2 text-xs text-brand-white/60 align-middle">{avatarFileName}</span>}
              {uploading && <p className="text-xs text-gray-500 mt-1">Se încarcă...</p>}
            </div>
          </div>
        </div>

        {/* Right column(s): Channel settings */}
        <div className="lg:col-span-2">
          <div className="panel p-4 space-y-4">
            {/* Account status/premium */}
            <div className="flex flex-wrap items-center gap-3 text-sm">
              {(() => {
                const d = daysLeft(data?.accessUntil || (session?.user as any)?.accessUntil);
                if (role !== 'USER') return null;
                if (d == null) {
                  return <span className="text-xs px-2 py-1 rounded border border-glass bg-white/5">Acces: —</span>;
                }
                if (d <= 0) {
                  return <span className="text-xs px-2 py-1 rounded border border-red-500/30 bg-red-500/10 text-red-300">Acces expirat</span>;
                }
                return <span className="text-xs px-2 py-1 rounded border border-green-500/30 bg-green-500/10 text-green-300">Acces: {d} zile rămase</span>;
              })()}
              {(() => {
                const p = daysLeft(data?.premiumUntil || (session?.user as any)?.premiumUntil);
                if (p == null) return null;
                if (p <= 0) return <span className="text-xs px-2 py-1 rounded border border-indigo-500/30 bg-indigo-500/10 text-indigo-500/70">Premium expirat</span>;
                return <span className="text-xs px-2 py-1 rounded border border-indigo-500/30 bg-indigo-500/10 text-indigo-500">Premium: {p} zile rămase</span>;
              })()}
            </div>

            {!discord && (
              <div className="text-amber-300/90 text-xs bg-amber-500/10 border border-amber-400/30 rounded p-2">
                Pentru a putea publica anunțuri, leagă-ți contul de Discord folosind butonul de mai jos.
              </div>
            )}

            {/* Channel form */}
            <form onSubmit={onSave} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium mb-1">Nume</label>
                  <input className="w-full" value={displayName} onChange={e => setDisplayName(e.target.value)} required />
                </div>
                <div>
              <label className="block text-xs font-medium mb-1">Handle</label>
              <input className="w-full" value={handle} onChange={e => setHandle(e.target.value)} placeholder="@handle" />
              <p className="text-[11px] text-brand-white/60 mt-1">Poți schimba handle-ul o dată la 14 zile. Format: @litere/cifre, 2–20 caractere.</p>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Descriere</label>
                <textarea className="w-full min-h-[100px]" value={bio} onChange={e => setBio(e.target.value)} placeholder="Prezintă-le spectatorilor canalul tău..." />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium mb-1">Discord</label>
                  <div className="flex items-center gap-2">
                    <input className="w-full bg-gray-900/50" value={maskDiscordTag(discord)} readOnly placeholder="Neconectat" />
                    <button type="button" disabled={discordAvailable === false || !!discord} onClick={() => signIn('discord', { callbackUrl: '/profile' })} className="primary text-sm whitespace-nowrap disabled:opacity-50">
                      {discord ? 'Discord conectat' : 'Leagă Discord'}
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Necesită autentificare prin Discord. Emailul/parola nu sunt partajate.</p>
                </div>
              </div>

              <div className="text-right">
                <button disabled={saving} className="primary disabled:opacity-50 text-sm">{saving ? 'Se salvează...' : 'Salvează'}</button>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* IC data */}
      <div className="panel p-4 mt-4">
        <h2 className="font-semibold text-sm mb-3">Date IC</h2>
        <ul className="text-sm space-y-1">
          <li><span className="font-medium">Nume IC:</span> {data.fullNameIC || '-'}</li>
          <li><span className="font-medium">ID In-Game:</span> {data.inGameId ?? '-'}</li>
          <li><span className="font-medium">Telefon IC:</span> {data.phoneIC || '-'}</li>
        </ul>
      </div>
    </div>
  );
}