"use client";
import { useCallback, useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import ThemedSelect from '../../../components/ui/Select';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { brandOptions, CAR_VEHICLE_TYPES } from '../../../lib/data/cars';
import { WEAPON_GROUPS, WEAPON_OPTIONS } from '../../../lib/weapons';
import { LISTING_ACTIVE_WINDOW_DAYS } from '../../../lib/config';

interface UploadedImage { tempId: string; path: string; blurDataURL?: string | null; }
const MAX_PRICE = 200_000_000;
const MAX_IMAGE_SIZE = 3 * 1024 * 1024; // 3MB (align with API)
const MAX_ACTIVE_LISTINGS = 5; // Normal users

export default function NewListingPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState<string>('');
  const [category, setCategory] = useState('');
  const [images, setImages] = useState<UploadedImage[]>([]);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorMeta, setErrorMeta] = useState<{ code?: string; retryAfter?: number } | null>(null);
  const [success, setSuccess] = useState(false);
  const [errorDetails, setErrorDetails] = useState<any | null>(null);
  const [hasDiscord, setHasDiscord] = useState<boolean | null>(null);
  const [profileCheckError, setProfileCheckError] = useState<string | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [myUserId, setMyUserId] = useState<string | null>(null);
  const [activeCount, setActiveCount] = useState<number | null>(null);
  const [goldCount, setGoldCount] = useState<number | null>(null);
  const [normalCount, setNormalCount] = useState<number | null>(null);
  const [isGold, setIsGold] = useState(false);
  // Subcategory attributes
  const [attr, setAttr] = useState<any>({});
  // Weapons grouped options from centralized module
  const carBrandOpts = useMemo(() => brandOptions(), []);
  // Gate flow: hide Title/Description until required selections are made
  // - category required
  // - weapons: selected weapon (attr.tip)
  // - vehicles: selected brand (attr.brand)
  // - drugs: selected tip (attr.tip)
  const hasCategory = !!category;
  const requireWeapon = category === 'arme' && !attr?.tip;
  const requireVehicleBrand = category === 'masini' && !attr?.brand;
  const requireDrugTip = category === 'droguri' && !attr?.tip;
  const lockTitleDesc = category === 'bani' || !hasCategory || requireWeapon || requireVehicleBrand || requireDrugTip;
  const disablePrice = category === 'bani' ? true : (!hasCategory || requireWeapon || requireVehicleBrand || requireDrugTip);
  // Do not allow custom images for arme, droguri, bani. Use presets instead.
  const showUploader = hasCategory && !requireWeapon && category !== 'droguri' && category !== 'arme' && category !== 'bani';

  const role = (session?.user as any)?.role as string | undefined;
  const premiumUntilIso = (session?.user as any)?.premiumUntil as string | undefined;
  const isStaff = role === 'MODERATOR' || role === 'ADMIN';
  const isPremiumSub = useMemo(() => {
    if (!premiumUntilIso) return false;
    const d = new Date(premiumUntilIso);
    return d.getTime() > Date.now();
  }, [premiumUntilIso]);
  const isGoldEligible = isStaff || isPremiumSub;

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch('/api/profile');
        if (!res.ok) throw new Error('Nu am putut verifica profilul');
        const js = await res.json();
        // Consider linked if we have a discordTag (set by OAuth linking) or an account exists
        if (alive) {
          setHasDiscord(!!(js.discordTag && String(js.discordTag).trim().length));
          setMyUserId(js.id);
        }
      } catch (e:any) {
        if (alive) {
          setHasDiscord(false);
          setProfileCheckError(e.message);
        }
      }
    })();
    return () => { alive = false; };
  }, []);

  // Load my active listings count when user id is known
  useEffect(() => {
    let alive = true;
    (async () => {
      if (!myUserId) return;
      try {
        const listingsRes = await fetch(`/api/listings?sellerId=${encodeURIComponent(myUserId)}&countOnly=1`);
        const j = await listingsRes.json();
        if (!alive) return;
        if (listingsRes.ok && j?.counts) {
          setActiveCount(j.counts.total ?? 0);
          setGoldCount(j.counts.gold ?? 0);
          setNormalCount(j.counts.normal ?? 0);
        } else {
          setActiveCount(0);
          setGoldCount(0);
          setNormalCount(0);
        }
      } catch {
        if (alive) {
          setActiveCount(0);
          setGoldCount(0);
          setNormalCount(0);
        }
      }
    })();
    return () => { alive = false; };
  }, [myUserId]);

  // Stable upload helpers
  const uploadOne = useCallback(async (f: File) => {
    if (images.length >= 5) { setImageError('Poți încărca maxim 5 imagini'); return; }
    if (!f.type.startsWith('image/')) { setImageError('Doar imagini acceptate'); return; }
    if (f.size > MAX_IMAGE_SIZE) { setImageError('Fișiere >3MB sunt omise'); return; }
    const formData = new FormData();
    formData.append('file', f);
    setUploading(true);
    try {
      const res = await fetch('/api/upload', { method: 'POST', body: formData });
      const data = await res.json();
      if (!res.ok) {
        setErrorMeta({ code: data.code, retryAfter: data.details?.retryAfter });
        throw new Error(data.error || 'Eroare upload');
      }
      const img = data.image || data;
      const path = img?.original || img?.path;
      setImages(prev => [...prev, { tempId: crypto.randomUUID(), path, blurDataURL: img?.blurDataURL }]);
    } catch (err:any) {
      setImageError(err.message);
    } finally {
      setUploading(false);
    }
  }, [images.length]);

  const uploadFromUrl = useCallback(async (url: string) => {
    try {
      const res = await fetch('/api/upload/by-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url })
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMeta({ code: data.code, retryAfter: data.details?.retryAfter });
        throw new Error(data.error || 'Eroare upload');
      }
      const img = data.image || data;
      const path = img?.original || img?.path;
      setImages(prev => [...prev, { tempId: crypto.randomUUID(), path, blurDataURL: img?.blurDataURL }]);
    } catch {
      setImageError('Nu am putut prelua imaginea din clipboard');
    }
  }, []);

  // Handle paste-to-upload (Ctrl+V). Accepts image files from clipboard or image URLs.
  useEffect(() => {
    function onPaste(e: ClipboardEvent) {
      if (!showUploader) return; // block paste uploads when uploader is hidden for category
      setImageError(null);
      setErrorMeta(null);
      const items = e.clipboardData?.items;
      if (!items || !items.length) return;
      let handled = false;
      // 1) Files from clipboard
      for (const it of items) {
        if (it.kind === 'file') {
          const file = it.getAsFile();
          if (file && file.type.startsWith('image/')) {
            handled = true;
            void uploadOne(file);
          }
        }
      }
      // 2) If not files, maybe a direct image URL
      if (!handled) {
        const text = e.clipboardData?.getData('text');
        if (text && /^https?:\/\//i.test(text) && /(\.png|\.jpe?g|\.webp|\.gif)(\?.*)?$/i.test(text)) {
          handled = true;
          void uploadFromUrl(text);
        }
      }
      if (handled) e.preventDefault();
    }
    window.addEventListener('paste', onPaste as any);
    return () => window.removeEventListener('paste', onPaste as any);
  }, [uploadOne, uploadFromUrl, showUploader]);

  

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files) return;
    setImageError(null);
    setErrorMeta(null);
    let remaining = Math.max(0, 5 - images.length);
    if (remaining <= 0) { setImageError('Ai atins limita de 5 imagini'); return; }
    const list = Array.from(files).slice(0, remaining);
    for (const f of list) {
      if (!f.type.startsWith('image/')) { setImageError('Doar imagini acceptate'); continue; }
      if (f.size > MAX_IMAGE_SIZE) { setImageError('Fișiere >3MB sunt omise'); continue; }
      const formData = new FormData();
      formData.append('file', f);
      setUploading(true);
      try {
        const res = await fetch('/api/upload', { method: 'POST', body: formData });
        const data = await res.json();
        if (!res.ok) {
          setErrorMeta({ code: data.code, retryAfter: data.details?.retryAfter });
          throw new Error(data.error || 'Eroare upload');
        }
        // New API returns data.image
        const img = data.image || data; // fallback
        const path = img?.original || img?.path;
        setImages(prev => [...prev, { tempId: crypto.randomUUID(), path, blurDataURL: img?.blurDataURL }]);
      } catch (err: any) {
        setImageError(err.message);
      } finally {
        setUploading(false);
      }
    }
  }

  function removeImage(tempId: string) {
    setImages(prev => prev.filter(i => i.tempId !== tempId));
  }

  async function onSubmit(e?: React.FormEvent) {
    if (e) e.preventDefault();
    setError(null);
    setErrorMeta(null);
    setErrorDetails(null);
  if (category !== 'bani') {
    if (!title || !description) { setError('Titlu si descriere obligatorii'); return; }
    if (description.trim().length < 3) { setError('Descrierea trebuie sa aiba minim 3 caractere'); return; }
  }
    // price required for all listings except bani
    if (category !== 'bani') {
      if (price === '') { setError('Completează prețul'); return; }
      const p = Number(price);
      if (!Number.isFinite(p) || p < 0) { setError('Preț invalid'); return; }
      if (p > MAX_PRICE) { setError(`Preț prea mare (max ${MAX_PRICE.toLocaleString('ro-RO')})`); return; }
    }
    // Basic client-side require attributes per category
    if (category === 'masini') {
      if (!attr.brand) { setError('Selectează marca'); return; }
    } else if (category === 'arme') {
      if (!attr.tip) { setError('Selectează arma'); return; }
    } else if (category === 'droguri') {
      if (!attr.tip || !attr.cantitate) { setError('Completează tip și cantitate'); return; }
    } else if (category === 'iteme') {
      if (!attr.tip) { setError('Completează tipul itemului'); return; }
    } else if (category === 'bani') {
      if (!attr.suma || Number(attr.suma) <= 0) { setError('Completează o sumă validă'); return; }
      if (!attr.actiune || !['cumpara','vinde'].includes(attr.actiune)) { setError('Alege dacă cumperi sau vinzi'); return; }
      if (!attr.procent || Number(attr.procent) < 1 || Number(attr.procent) > 100) { setError('Alege procentul (1-100)'); return; }
    } else if (category === 'servicii') {
      if (!attr.tip) { setError('Completează tipul serviciului'); return; }
    }
    setSubmitting(true);
    try {
  // Auto-title for bani: use suma + actiune
  let finalTitle = title;
  let finalDescription = description;
  if (category === 'bani' && attr?.suma) {
    const sumaFmt = Number(attr.suma).toLocaleString('ro-RO');
    const act = attr?.actiune === 'cumpara' ? 'Cumpără' : 'Vinde';
    finalTitle = `${act} ${sumaFmt} bani murdari`;
    if (!finalDescription || finalDescription.trim().length < 3) {
      const act2 = attr?.actiune === 'cumpara' ? 'cumpăr' : 'vând';
      const pct = attr?.procent ? `${attr.procent}%` : '';
      finalDescription = `${act2} ${sumaFmt} bani murdari${pct ? ` la ${pct}` : ''}.`;
    }
  }
  // sanitize attributes
  let cleanAttr: any = {};
  if (category === 'droguri') {
    const tip = (attr?.tip ?? '').toString().trim();
    const cantRaw = Number(attr?.cantitate);
    const cantitate = Number.isFinite(cantRaw) ? Math.max(1, Math.round(cantRaw)) : undefined;
    const unit = (attr?.unitate ?? '') as string;
    cleanAttr = {
      ...(tip ? { tip } : {}),
      ...(cantitate != null ? { cantitate } : {}),
      ...(unit && ['g','kg','buc'].includes(unit) ? { unitate: unit } : {})
    };
  } else {
    Object.entries(attr || {}).forEach(([k,v]) => {
      if (v === '' || v == null) return; // drop empty
      cleanAttr[k] = v;
    });
  }
  const payload: any = { title: finalTitle, description: finalDescription, category: category.trim(), images: showUploader ? images.map(i => ({ original: i.path, thumb: i.path, blurDataURL: i.blurDataURL })) : [], isGold: isGoldEligible ? isGold : false, attributes: cleanAttr };
  if (category !== 'bani') payload.price = Number(price);
      const res = await fetch('/api/listings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMeta({ code: data.code, retryAfter: data.details?.retryAfter });
        setErrorDetails(data.details || null);
        throw new Error(data.error || 'Eroare creare');
      }
      setSuccess(true);
      setTimeout(() => router.push('/marketplace'), 700);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  const goldCap = isStaff ? 25 : (isPremiumSub ? 5 : 0);
  const normalCap = isStaff ? 100 : (isPremiumSub ? 15 : MAX_ACTIVE_LISTINGS);
  const publishDisabled = (
    submitting || hasDiscord === false ||
    (!isGoldEligible && (activeCount !== null && activeCount >= MAX_ACTIVE_LISTINGS)) ||
    (isGoldEligible && (
      (isGold && (goldCount !== null && goldCount >= goldCap)) ||
      (!isGold && (normalCount !== null && normalCount >= normalCap))
    ))
  );

  return (
    <div className="container">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-brand-white">Adaugă anunț</h1>
        <a href="/marketplace" className="btn btn-ghost text-sm">Înapoi la marketplace</a>
      </div>
      <div className="grid lg:grid-cols-[1.6fr_1fr] gap-6">
        {/* LEFT: form + uploader */}
        <div className="space-y-5">
          <form id="new-listing-form" onSubmit={onSubmit} className="card p-5 space-y-5">
            {/* Title & Description moved below; they appear only after required selections */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Categorie</label>
                <ThemedSelect
                  value={category}
                  onChange={(v) => { setCategory(v); setAttr({}); setImages([]); }}
                  options={[
                    { label: 'Alege categoria', value: '' },
                    { label: 'arme', value: 'arme' },
                    { label: 'droguri', value: 'droguri' },
                    { label: 'masini', value: 'masini' },
                    { label: 'bani', value: 'bani' },
                  ]}
                  placeholder="Alege o categorie"
                />
                {errorDetails?.fieldErrors?.category?.length ? (
                  <p className="text-xs text-red-500 mt-1">{errorDetails.fieldErrors.category[0]}</p>
                ) : null}
              </div>
              {category !== 'bani' && (
                <div>
                  <label className="block text-sm font-medium mb-1">Preț</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    className="w-full text-sm"
                    value={price ? Number(price).toLocaleString('ro-RO') : ''}
                    onChange={(e) => {
                      const raw = e.target.value.replace(/\./g, '').replace(/\s+/g, '');
                      const num = raw ? Number(raw) : 0;
                      if (Number.isFinite(num)) setPrice(String(num));
                    }}
                    disabled={disablePrice}
                    placeholder="ex: 150.000"
                  />
                  {disablePrice && (
                    <p className="text-[11px] text-brand-white/50 mt-1">
                      Selectează {(!hasCategory && 'categoria') || (requireWeapon && 'tipul de armă') || (requireVehicleBrand && 'marca') || (requireDrugTip && 'tipul de drog')} pentru a alege prețul.
                    </p>
                  )}
                  {errorDetails?.fieldErrors?.price?.length ? (
                    <p className="text-xs text-red-500 mt-1">{errorDetails.fieldErrors.price[0]}</p>
                  ) : null}
                </div>
              )}
            </div>

            {/* Subcategory fields */}
            {category === 'masini' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Marcă</label>
                  <ThemedSelect value={attr.brand || ''} onChange={(v)=> setAttr((a:any)=> ({ ...a, brand: v }))} options={[{ label: 'Alege marca', value: '' }, ...carBrandOpts]} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Tip vehicul</label>
                  <ThemedSelect value={attr.vtype || ''} onChange={(v)=> setAttr((a:any)=> ({ ...a, vtype: v }))} options={[{ label: '—', value: '' }, ...CAR_VEHICLE_TYPES]} />
                </div>
              </div>
            )}
            {category === 'arme' && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Tip armă</label>
                  <ThemedSelect
                    value={attr.tipGrup || ''}
                    onChange={(v)=> setAttr((a:any)=> ({ ...a, tipGrup: v, tip: '', calibru: '' }))}
                    options={[{ label: 'Alege tipul', value: '' }, ...WEAPON_GROUPS]}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Alege arma</label>
                  <ThemedSelect
                    value={attr.tip || ''}
                    onChange={(v)=> setAttr((a:any)=> ({ ...a, tip: v }))}
                    options={[{ label: attr.tipGrup ? 'Selectează arma' : 'Alege tipul de armă', value: '' }, ...(WEAPON_OPTIONS[attr.tipGrup || ''] || [])]}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Stare</label>
                  <ThemedSelect value={attr.stare || ''} onChange={(v)=> setAttr((a:any)=> ({ ...a, stare: v }))} options={[{ label: '—', value: '' }, { label: 'nou', value: 'nou' }, { label: 'bun', value: 'bun' }, { label: 'folosit', value: 'folosit' }]} />
                </div>
              </div>
            )}
            {(category === 'arme' && requireWeapon) && (
              <p className="text-[11px] text-brand-white/50 -mt-2">Selectează tipul de armă pentru a continua.</p>
            )}
            {category === 'droguri' && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Tip</label>
                  <ThemedSelect
                    value={attr.tip || ''}
                    onChange={(v)=> setAttr((a:any)=> ({ ...a, tip: v }))}
                    options={[
                      { label: 'Alege tipul', value: '' },
                      { label: 'Cocaina', value: 'cocaina' },
                      { label: 'Crack', value: 'crack' },
                      { label: 'Marijuana', value: 'marijuana' },
                      { label: 'Tigari', value: 'tigari' },
                      { label: 'Meth', value: 'meth' },
                    ]}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Cantitate</label>
                  <input type="number" min={1} className="w-full text-sm" value={attr.cantitate || ''} onChange={(e)=> setAttr((a:any)=> ({ ...a, cantitate: e.target.value ? Number(e.target.value) : '' }))} placeholder="ex: 100" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Unitate</label>
                  <ThemedSelect value={attr.unitate || ''} onChange={(v)=> setAttr((a:any)=> ({ ...a, unitate: v }))} options={[{ label: '—', value: '' }, { label: 'g', value: 'g' }, { label: 'kg', value: 'kg' }, { label: 'buc', value: 'buc' }]} />
                </div>
                {errorDetails?.fieldErrors?.attributes?.length ? (
                  <div className="sm:col-span-3 text-xs text-red-500">{errorDetails.fieldErrors.attributes[0]}</div>
                ) : null}
              </div>
            )}

            {/* After subcategory attributes are chosen, reveal Title & Description */}
            {!lockTitleDesc && (
              <>
                <div>
                  <label className="block text-sm font-medium mb-1">Titlu</label>
                  <input className="w-full text-sm" value={title} onChange={e => setTitle(e.target.value)} required />
                  {errorDetails?.fieldErrors?.title?.length ? (
                    <p className="text-xs text-red-500 mt-1">{errorDetails.fieldErrors.title[0]}</p>
                  ) : null}
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Descriere</label>
                  <textarea className="w-full text-sm min-h-[180px]" value={description} onChange={e => setDescription(e.target.value)} required />
                  <div className="flex justify-between text-xs mt-1">
                    <span className={description.trim().length < 3 ? 'text-red-500' : 'text-brand-white/60'}>
                      {description.trim().length}/3 min
                    </span>
                    <span className="text-brand-white/50">max 5000</span>
                  </div>
                  {errorDetails?.fieldErrors?.description?.length ? (
                    <p className="text-xs text-red-500 mt-1">{errorDetails.fieldErrors.description[0]}</p>
                  ) : null}
                </div>
              </>
            )}
            {category === 'bani' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Sumă</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    className="w-full text-sm"
                    value={attr.suma != null && attr.suma !== '' ? Number(attr.suma).toLocaleString('ro-RO') : ''}
                    onChange={(e)=> {
                      const raw = e.target.value.replace(/\./g, '').replace(/\s+/g, '');
                      const num = raw ? Number(raw) : '';
                      setAttr((a:any)=> ({ ...a, suma: (num === '' || Number.isFinite(num)) ? num : a.suma }));
                    }}
                    placeholder="ex: 100.000"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Tip bani</label>
                  <ThemedSelect value={attr.moneda || ''} onChange={(v)=> setAttr((a:any)=> ({ ...a, moneda: v }))} options={[{ label: 'Selectează', value: '' }, { label: 'Bani murdari', value: 'bani_murdari' }]} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Cumpără sau Vinde</label>
                  <ThemedSelect value={attr.actiune || ''} onChange={(v)=> setAttr((a:any)=> ({ ...a, actiune: v }))} options={[{ label: 'Selectează', value: '' }, { label: 'Cumpără', value: 'cumpara' }, { label: 'Vinde', value: 'vinde' }]} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Procentaj %</label>
                  <ThemedSelect value={attr.procent || ''} onChange={(v)=> setAttr((a:any)=> ({ ...a, procent: v ? Number(v) : '' }))} options={[
                    { label: 'Selectează', value: '' },
                    ...Array.from({ length: 7 }, (_, i) => 15 + i * 5).map(n => ({ label: `${n}%`, value: String(n) }))
                  ]} />
                </div>
              </div>
            )}
            
            {error && (
              <div className="text-sm text-red-500 space-y-1">
                <p>{error}</p>
                {errorMeta?.code && <p className="text-xs">Cod: {errorMeta.code}{errorMeta.retryAfter ? ` (incearcă din nou în ~${errorMeta.retryAfter}s)` : ''}</p>}
              </div>
            )}
          </form>

          {showUploader && (
          <div className="card p-5">
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium">Imagini</label>
              <span className="text-xs text-brand-white/60">{images.length}/5 • max 3MB</span>
            </div>
            <div
              className={`relative border-2 ${dragActive ? 'border-indigo-500/80 bg-indigo-500/5' : 'border-dashed border-white/20'} rounded-lg p-4 min-h-[220px] flex flex-col gap-3`}
              onDragEnter={(e) => { e.preventDefault(); setDragActive(true); }}
              onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
              onDragLeave={(e) => { e.preventDefault(); setDragActive(false); }}
              onDrop={(e) => {
                e.preventDefault();
                setDragActive(false);
                setImageError(null);
                const dt = e.dataTransfer;
                if (dt?.files && dt.files.length) {
                  const arr = Array.from(dt.files);
                  for (const f of arr) {
                    void uploadOne(f);
                  }
                  return;
                }
                const uri = dt?.getData('text/uri-list') || dt?.getData('text/plain');
                if (uri && /^https?:\/\//i.test(uri)) {
                  void uploadFromUrl(uri.trim());
                }
              }}
              onClick={() => {
                if (!showUploader) return;
                const el = document.getElementById('file-input-hidden') as HTMLInputElement | null;
                el?.click();
              }}
              role="button"
              tabIndex={0}
            >
              {images.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center">
                  <div className="text-sm text-brand-white/80">Trage și plasează imaginile aici sau apasă pentru a selecta</div>
                  <div className="text-xs text-brand-white/60 mt-1">Poți și lipi (Ctrl+V) imagini sau URL direct către o imagine (png/jpg/webp)</div>
                  {uploading && <p className="text-xs text-indigo-400 mt-2">Se încarcă...</p>}
                </div>
              ) : (
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
                  {images.map(img => (
                    <div key={img.tempId} className="relative w-full aspect-square border rounded overflow-hidden group">
                      <Image src={img.path} alt="img" fill placeholder={img.blurDataURL ? 'blur' : undefined} blurDataURL={img.blurDataURL || undefined} sizes="160px" className="object-cover" />
                      <button type="button" onClick={(ev) => { ev.stopPropagation(); removeImage(img.tempId); }} className="absolute top-1 right-1 bg-black/60 text-white text-xs px-1 rounded opacity-0 group-hover:opacity-100">X</button>
                    </div>
                  ))}
                  {uploading && <div className="text-xs text-indigo-400 self-center">Se încarcă...</div>}
                </div>
              )}
              <input id="file-input-hidden" type="file" accept="image/*" multiple onChange={handleFileChange} className="hidden" />
            </div>
            {imageError && (
              <div className="mt-2 text-xs text-red-500">
                {imageError}
                {errorMeta?.code && <span className="ml-2">Cod: {errorMeta.code}{errorMeta.retryAfter ? ` (încearcă din nou în ~${errorMeta.retryAfter}s)` : ''}</span>}
              </div>
            )}
            <p className="text-xs text-brand-white/60 mt-2">Sugestie: prima imagine ar trebui să arate cel mai bine produsul/serviciul.</p>
          </div>
          )}
        </div>

        {/* RIGHT: sticky summary */}
        <aside className="space-y-5">
          <div className="card p-5 sticky top-[calc(var(--nav-h)+12px)]">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-xs text-brand-white/60">Statut cont</div>
                <div className="text-sm text-brand-white/80">{isStaff ? 'Staff' : (isPremiumSub ? 'Premium' : 'Normal')}</div>
              </div>
              {isGoldEligible && (
                <span className="badge badge-gold">GOLD</span>
              )}
            </div>

            {isGoldEligible ? (
              <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                <div className="card p-2 text-center">
                  <div className="text-xs text-brand-white/60">Gold</div>
                  <div className={`text-lg font-semibold ${((goldCount ?? 0) >= goldCap) ? 'text-red-400' : 'text-brand-white'}`}>{goldCount ?? '…'}<span className="text-brand-white/50 text-sm">/{goldCap || '—'}</span></div>
                </div>
                <div className="card p-2 text-center">
                  <div className="text-xs text-brand-white/60">Normal</div>
                  <div className={`text-lg font-semibold ${((normalCount ?? 0) >= normalCap) ? 'text-red-400' : 'text-brand-white'}`}>{normalCount ?? '…'}
                    <span className="text-brand-white/50 text-sm">/{normalCap}</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="mt-3 card p-2 text-center">
                <div className="text-xs text-brand-white/60">Anunțuri active</div>
                <div className={`text-lg font-semibold ${((activeCount ?? 0) >= MAX_ACTIVE_LISTINGS) ? 'text-red-400' : 'text-brand-white'}`}>{activeCount ?? '…'}<span className="text-brand-white/50 text-sm">/{MAX_ACTIVE_LISTINGS}</span></div>
              </div>
            )}
            <div className="mt-2 text-[11px] text-brand-white/50">Fereastră de activitate: ultimele {LISTING_ACTIVE_WINDOW_DAYS} zile.</div>

            {isGoldEligible && (
              <div className="mt-3 flex items-center justify-between p-3 rounded border border-yellow-400/30 bg-yellow-500/10">
                <label htmlFor="gold-toggle" className="text-sm font-medium">Marchează ca Gold</label>
                <input id="gold-toggle" type="checkbox" checked={isGold} onChange={e => setIsGold(e.target.checked)} className="accent-yellow-400 scale-110" />
              </div>
            )}

            {hasDiscord === false && (
              <div className="mt-3 text-amber-300/90 bg-amber-500/10 border border-amber-400/30 rounded p-3 text-sm">
                Trebuie să îți legi contul de Discord. Mergi la <a className="underline" href="/profile">profil</a> și conectează-te cu Discord.
              </div>
            )}

            {error && (
              <div className="mt-3 text-sm text-red-500 space-y-1">
                <p>{error}</p>
                {errorMeta?.code && <p className="text-xs">Cod: {errorMeta.code}{errorMeta.retryAfter ? ` (incearcă din nou în ~${errorMeta.retryAfter}s)` : ''}</p>}
              </div>
            )}

            <div className="mt-4 flex flex-col sm:flex-row gap-2">
              {hasDiscord === false && (
                <a href="/profile" className="btn btn-ghost w-full sm:w-auto text-sm">Conectează Discord</a>
              )}
              <button type="submit" form="new-listing-form" disabled={publishDisabled} className="btn btn-primary w-full sm:w-auto text-sm disabled:opacity-50">
                {submitting ? 'Se trimite…' : (hasDiscord === false ? 'Conectează Discord pentru a publica' : 'Publică anunțul')}
              </button>
            </div>
            {success && <div className="mt-2 text-green-400 text-sm">Creat! Redirecționare…</div>}
          </div>
        </aside>
      </div>
    </div>
  );
}
