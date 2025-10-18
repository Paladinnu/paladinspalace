"use client";
import { useEffect, useState } from 'react';
import Image from 'next/image';
import ListingGallery from '../../../components/ListingGallery';
import ListingQuickStats from '../../../components/ListingQuickStats';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useConfirm } from '../../../components/ConfirmProvider';

interface ListingImageObj { original: string; thumb?: string; blurDataURL?: string | null; }
interface ListingDetail {
  id: string;
  title: string;
  description: string;
  price: number | null;
  category: string | null;
  images: (string | ListingImageObj)[];
  createdAt: string;
  updatedAt?: string;
  isGold?: boolean;
  itemName?: string | null;
  attributes?: any;
  seller: { id: string; displayName: string; discordTag: string | null; inGameName: string | null; inGameId?: number | null; phoneIC?: string | null; avatarUrl?: string | null; role?: string; status?: string; premiumUntil?: string | null; createdAt?: string };
}

export default function ListingDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;
  const [data, setData] = useState<ListingDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [formTitle, setFormTitle] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formPrice, setFormPrice] = useState('');
  const [formCategory, setFormCategory] = useState('');
  const [saving, setSaving] = useState(false);
  const { data: session } = useSession();
  const [saved, setSaved] = useState(false);
  const [toast, setToast] = useState<string>('');
  const [showPhone, setShowPhone] = useState(false);
  const [copied, setCopied] = useState(false);
  // Report modal state
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [reportSending, setReportSending] = useState(false);
  const confirmModal = useConfirm();

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch(`/api/listings/${id}`);
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || 'Eroare');
        if (active) {
          setData(json);
          setFormTitle(json.title);
          setFormDesc(json.description);
          setFormPrice(json.price != null ? String(json.price) : '');
          setFormCategory(json.category || '');
        }
      } catch (e: any) {
        if (active) setError(e.message);
      } finally { if (active) setLoading(false); }
    })();
    return () => { active = false; };
  }, [id]);

  // Auto-hide toast after 5 seconds
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(''), 5000);
    return () => clearTimeout(t);
  }, [toast]);

  useEffect(() => {
    if (!id) return;
    try {
      const v = localStorage.getItem(`saved:${id}`);
      setSaved(v === '1');
    } catch {}
  }, [id]);

  if (loading) return <p className="p-4">Se incarca...</p>;
  if (error) return <div className="p-4"><p className="text-red-600 mb-4">{error}</p><button onClick={() => router.back()} className="text-sm underline">Inapoi</button></div>;
  if (!data) return <p className="p-4">Nu s-a gasit anuntul.</p>;

  const role = (session?.user as any)?.role;
  const isPrivileged = role === 'MODERATOR' || role === 'ADMIN';
  const canManage = session && data && (isPrivileged || (session as any).user?.id === data.seller.id || (session?.user as any)?.sub === data.seller.id);
  const createdMs = data?.createdAt ? new Date(data.createdAt).getTime() : 0;
  const updatedMs = data?.updatedAt ? new Date(data.updatedAt).getTime() : createdMs;
  const hasBeenUpdated = updatedMs > createdMs;
  const within24h = hasBeenUpdated && (Date.now() - updatedMs < 24 * 60 * 60 * 1000);

  const formatPrice = (n: number | null) => n == null ? 'Nespecificat' : new Intl.NumberFormat('ro-RO').format(n) + ' $';
  const formatBaniPrice = (attrs?: any) => {
    if (!attrs) return '—';
    const suma = typeof attrs.suma === 'number' ? attrs.suma : null;
    const procent = typeof attrs.procent === 'number' ? attrs.procent : null;
    if (suma == null || procent == null) return '—';
    return `${new Intl.NumberFormat('ro-RO').format(suma)}$ (${procent}%)`;
  };

  async function onShare() {
    const url = typeof window !== 'undefined' ? window.location.href : '';
    try {
      if (navigator.share) {
        await navigator.share({ title: data?.title || 'Anunț', url });
      } else {
        await navigator.clipboard.writeText(url);
        setToast('Link copiat în clipboard');
      }
    } catch {}
  }

  function onSaveToggle() {
    try {
      const next = !saved;
      setSaved(next);
      if (typeof window !== 'undefined') localStorage.setItem(`saved:${id}`, next ? '1' : '0');
      setToast(next ? 'Anunț salvat' : 'Anunț scos din salvate');
    } catch {}
  }

  async function onDelete() {
    const ok = await confirmModal({ title: 'Șterge anunțul', message: 'Sigur ștergi acest anunț? Această acțiune nu poate fi anulată.', confirmText: 'Șterge', cancelText: 'Anulează', danger: true });
    if (!ok) return;
    const res = await fetch(`/api/listings/${id}`, { method: 'DELETE' });
    let msg = '';
    try { const j = await res.json(); msg = j?.error || ''; } catch {}
    if (res.ok) {
      router.push('/marketplace');
    } else {
      setToast(msg || 'Ștergere eșuată');
    }
  }

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch(`/api/listings/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title: formTitle, description: formDesc, price: formPrice ? Number(formPrice) : null, category: formCategory || null }) });
      if (!res.ok) throw new Error('Eroare salvare');
      setEditing(false);
      // refetch
      const fresh = await fetch(`/api/listings/${id}`);
      const json = await fresh.json();
      setData(json);
    } catch (e: any) {
      alert(e.message);
    } finally { setSaving(false); }
  }

  return (
    <div className={`container animate-[slideUp_.22s_ease-out] ${data.isGold ? 'gold-theme' : ''}`}>
      <div className="mb-3">
        <button onClick={() => router.back()} className="ghost text-xs">&larr; Înapoi</button>
      </div>
      <div className="flex items-center gap-3 mb-1">
        <h1 className="text-3xl font-bold text-brand-white">{data.title}</h1>
        {data.isGold && (
          <span title="Gold" className="badge badge-gold">GOLD</span>
        )}
      </div>
      <p className="text-xs text-brand-white/60">Publicat {new Date(data.createdAt).toLocaleString('ro-RO')}</p>
      <div className="mt-4">
        <ListingQuickStats price={data.price} category={data.category} createdAt={data.createdAt} sellerName={data.seller.displayName} itemName={data.itemName} />
      </div>
      {/* Top-level edit/delete bar removed for cleaner layout; controls available under seller info */}
      {editing && (
        <form onSubmit={onSave} className="mb-8 space-y-3 panel p-4">
          <div>
            <label className="block text-xs font-medium mb-1">Titlu</label>
            <input className="w-full text-sm" value={formTitle} onChange={e => setFormTitle(e.target.value)} required />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">Descriere</label>
            <textarea className="w-full text-sm min-h-[120px]" value={formDesc} onChange={e => setFormDesc(e.target.value)} required />
          </div>
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="block text-xs font-medium mb-1">Pret</label>
              <input type="number" className="w-full text-sm" value={formPrice} onChange={e => setFormPrice(e.target.value)} />
            </div>
            <div className="flex-1">
              <label className="block text-xs font-medium mb-1">Categorie</label>
              <input className="w-full text-sm" value={formCategory} onChange={e => setFormCategory(e.target.value)} />
            </div>
          </div>
          <div className="pt-2 flex gap-3">
            <button disabled={saving} className="btn btn-primary text-xs disabled:opacity-50">{saving ? 'Se salvează...' : 'Salvează'}</button>
            <button type="button" onClick={() => setEditing(false)} className="btn btn-ghost text-xs">Renunță</button>
          </div>
        </form>
      )}
      <div className="grid lg:grid-cols-[1.7fr_1fr] gap-6 mt-6 mb-10">
        {/* LEFT: gallery + details */}
        <div className="space-y-5">
          <div className="panel p-2">
            <ListingGallery images={data.images as any} gold={!!data.isGold} />
          </div>
          <div className="card p-4">
            <h2 className="font-semibold mb-2 text-brand-white">Detalii</h2>
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-brand-white/80">{data.description}</p>
          </div>
          <div className="card p-4">
            <h2 className="font-semibold mb-2 text-brand-white">Informații</h2>
            <ul className="text-sm space-y-2 text-brand-white/80">
              <li className="flex items-center gap-2"><span className="font-medium">Preț:</span> <span className={`${data.isGold ? 'text-gold' : 'text-brand-white'}`}>{data.category === 'bani' ? formatBaniPrice((data as any).attributes) : formatPrice(data.price)}</span></li>
              {data.category && (
                <li className="flex items-center gap-2"><span className="font-medium">Categorie:</span> <span className="badge">{data.category}</span></li>
              )}
            </ul>
          </div>
        </div>

        {/* RIGHT: sticky summary card */}
        <aside className="space-y-5">
          <div className="card p-4 sticky top-[calc(var(--nav-h)+12px)]">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-xs text-brand-white/60">Preț</div>
                <div className={`text-3xl font-bold ${data.isGold ? 'text-gold-gradient' : 'text-brand-white'}`}>{data.category === 'bani' ? formatBaniPrice((data as any).attributes) : formatPrice(data.price)}</div>
              </div>
              {/* Category pill removed */}
            </div>
              <div className="mt-4 grid grid-cols-2 gap-2">
                <button onClick={onSaveToggle} className={`btn ${saved ? 'btn-gold' : 'btn-ghost'}`}>{saved ? 'Salvat' : 'Salvează'}</button>
                <button onClick={() => setReportOpen(true)} className="btn btn-primary">Raportează</button>
              </div>
            <div className="mt-4">
              <div className="text-xs text-brand-white/60 mb-2">Vânzător</div>
              <div className="flex items-center gap-3">
                <div className="relative h-14 w-14 rounded overflow-hidden bg-white/10 border border-glass">
                  {data.seller.avatarUrl ? (
                    <Image src={data.seller.avatarUrl} alt="avatar" fill sizes="40px" className="object-cover" />
                  ) : (
                    <div className="h-full w-full grid place-items-center text-xs text-brand-white/60">—</div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-brand-white truncate flex items-center gap-2">
                    <span className="truncate">{data.seller.displayName}</span>
                    {data.seller.role && (data.seller.role === 'ADMIN' || data.seller.role === 'MODERATOR') && (
                      <span className="badge">{data.seller.role === 'ADMIN' ? 'Admin' : 'Moderator'}</span>
                    )}
                    {data.seller && (data.seller as any).verified && (
                      <span className="badge">Verificat</span>
                    )}
                    {(() => {
                      const pu = data.seller.premiumUntil ? new Date(data.seller.premiumUntil).getTime() : 0;
                      return pu > Date.now();
                    })() && (
                      <span className="badge badge-gold">Premium</span>
                    )}
                  </div>
                  {/* Discord ID hidden in public UI as requested */}
                  {data.seller.createdAt && (
                    <div className="text-[11px] text-brand-white/50">Membru din {new Date(data.seller.createdAt).toLocaleDateString('ro-RO')}</div>
                  )}
                </div>
              </div>
              <div className="mt-3">
                <button
                  onClick={async () => {
                    const val = data.seller.phoneIC || '';
                    if (!val) return;
                    if (!showPhone) {
                      setShowPhone(true);
                      return;
                    }
                    try {
                      await navigator.clipboard.writeText(val);
                      setToast('Număr copiat');
                    } catch {}
                  }}
                  className="btn btn-primary w-full"
                  disabled={!data.seller.phoneIC}
                >
                  {data.seller.phoneIC ? (showPhone ? data.seller.phoneIC : 'Vezi numărul') : '—'}
                </button>
              </div>
              {/* Owner controls */}
              <div className="mt-3 border-t border-glass pt-3">
                {canManage && (
                  <div className="mt-3 border-t border-glass pt-3 grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setEditing(e => !e)}
                      className="btn btn-ghost"
                      disabled={!isPrivileged && within24h && !editing}
                      title={!isPrivileged && within24h && !editing ? 'Poți șterge/edita un anunț doar o dată la 24h.' : ''}
                    >
                      {editing ? 'Anulează editarea' : 'Editează anunțul'}
                    </button>
                    <button
                      onClick={onDelete}
                      className="btn btn-primary"
                      disabled={!isPrivileged && within24h}
                      title={!isPrivileged && within24h ? 'Poți șterge/edita un anunț doar o dată la 24h.' : ''}
                    >
                      Șterge anunțul
                    </button>
                    {!isPrivileged && within24h && (
                      <div className="col-span-2 text-[11px] text-brand-white/50">
                        Poți edita/șterge din nou la {new Date((updatedMs || Date.now()) + 24 * 60 * 60 * 1000).toLocaleString('ro-RO')}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </aside>
      </div>
      {toast && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-white/10 text-brand-white border border-glass rounded px-4 py-2 text-sm shadow-lg" role="status" onAnimationEnd={()=>{}}>
          {toast}
        </div>
      )}
      {reportOpen && (
        <div className="backdrop" role="dialog" aria-modal="true">
          <div className="modal max-w-md w-[92vw] mx-auto mt-24 p-4">
            <h3 className="text-lg font-semibold mb-2">Raportează anunțul</h3>
            <p className="text-sm text-brand-white/70 mb-3">Spune-ne pe scurt de ce raportezi acest anunț. Moderarea va fi notificată și va primi link direct.</p>
            <textarea
              className="w-full min-h-[100px] text-sm"
              placeholder="Motivul raportării..."
              value={reportReason}
              onChange={e => setReportReason(e.target.value)}
            />
            <div className="mt-3 flex justify-end gap-2">
              <button className="btn btn-ghost" onClick={()=> setReportOpen(false)} disabled={reportSending}>Anulează</button>
              <button
                className="btn btn-primary"
                disabled={reportSending || !reportReason.trim()}
                onClick={async ()=>{
                  try {
                    setReportSending(true);
                    const res = await fetch('/api/reports', {
                      method: 'POST', headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ listingId: data.id, reason: reportReason })
                    });
                    const js = await res.json();
                    if (!res.ok) throw new Error(js.error || 'Nu am putut trimite raportul');
                    setReportOpen(false);
                    setReportReason('');
                    setToast('Raport trimis moderatorilor');
                  } catch (e:any) {
                    setToast(e.message || 'Eroare raportare');
                  } finally {
                    setReportSending(false);
                  }
                }}
              >Trimite</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}