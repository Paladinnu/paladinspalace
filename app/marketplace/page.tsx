"use client";
import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { useListings } from '../../lib/hooks/useListings';
import Image from 'next/image';
import { MarketplaceFilters } from '../../components/MarketplaceFilters';
import { useSearchParams, useRouter } from 'next/navigation';

function MarketplaceInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const initialCat = searchParams.get('category') || '';
  const { listings, loading, error, hasMore, loadMore, setSearch } = useListings({ category: initialCat || undefined, sort: 'new' });
  const [q, setQ] = useState('');
  const [category, setCategory] = useState(initialCat);
  const [sort, setSort] = useState<'new'|'cheap'|'expensive'|'alpha'|'old'>('new');
  // Vehicle sub-filters
  const [brand, setBrand] = useState('');
  const [vtype, setVtype] = useState('');
  const [priceMin, setPriceMin] = useState<number | undefined>(undefined);
  const [priceMax, setPriceMax] = useState<number | undefined>(undefined);
  // Other categories filters
  const [armeTip, setArmeTip] = useState('');
  const [armeCalibru, setArmeCalibru] = useState('');
  const [armeStare, setArmeStare] = useState('');
  const [droguriTip, setDroguriTip] = useState('');
  const [droguriUnitate, setDroguriUnitate] = useState('');
  const [droguriCantMin, setDroguriCantMin] = useState<number | undefined>(undefined);
  const [droguriCantMax, setDroguriCantMax] = useState<number | undefined>(undefined);
  // Bani sub-filters
  const [baniActiune, setBaniActiune] = useState('');
  const [baniProcent, setBaniProcent] = useState<number | undefined>(undefined);
  const [baniSumaMin, setBaniSumaMin] = useState<number | undefined>(undefined);
  const [baniSumaMax, setBaniSumaMax] = useState<number | undefined>(undefined);
  // Category is controlled via Sidebar/URL; no category dropdown here.
  const [ioSupported, setIoSupported] = useState(true);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const [overlayActive, setOverlayActive] = useState(false);
  const overlayTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const overlayStartRef = useRef<number>(0);
  const STORAGE_KEY = 'mp:filters:v1';

  // Helper: update URL to reflect current filters (shareable/search-friendly)
  function updateUrl(next: { q?: string; category?: string; sort?: 'new'|'cheap'|'expensive'|'alpha'|'old'; brand?: string; vtype?: string; priceMin?: number; priceMax?: number; armeTip?: string; armeCalibru?: string; armeStare?: string; droguriTip?: string; droguriUnitate?: string; droguriCantMin?: number; droguriCantMax?: number; baniActiune?: string; baniProcent?: number; baniSumaMin?: number; baniSumaMax?: number; }) {
    const params = new URLSearchParams();
    const qv = next.q ?? q;
    const cv = next.category ?? category;
    const sv = next.sort ?? sort;
    if (qv) params.set('q', qv);
    if (cv) params.set('category', cv);
    if (sv) params.set('sort', sv);
  const bv = next.brand ?? brand;
    const tv = next.vtype ?? vtype;
    const pmin = next.priceMin ?? priceMin;
    const pmax = next.priceMax ?? priceMax;
    if (cv === 'masini') {
  if (bv) params.set('brand', bv);
      if (tv) params.set('vtype', tv);
      if (pmin != null) params.set('priceMin', String(pmin));
      if (pmax != null) params.set('priceMax', String(pmax));
    } else if (cv === 'arme') {
      const at = next.armeTip ?? armeTip; if (at) params.set('armeTip', at);
      const ac = next.armeCalibru ?? armeCalibru; if (ac) params.set('armeCalibru', ac);
      const as = next.armeStare ?? armeStare; if (as) params.set('armeStare', as);
    } else if (cv === 'droguri') {
      const dt = next.droguriTip ?? droguriTip; if (dt) params.set('droguriTip', dt);
      const du = next.droguriUnitate ?? droguriUnitate; if (du) params.set('droguriUnitate', du);
      const dmin = next.droguriCantMin ?? droguriCantMin; if (dmin != null) params.set('droguriCantMin', String(dmin));
      const dmax = next.droguriCantMax ?? droguriCantMax; if (dmax != null) params.set('droguriCantMax', String(dmax));
    } else if (cv === 'bani') {
      const ba = next.baniActiune ?? baniActiune; if (ba) params.set('baniActiune', ba);
      const bp = next.baniProcent ?? baniProcent; if (bp != null) params.set('baniProcent', String(bp));
      const smin = next.baniSumaMin ?? baniSumaMin; if (smin != null) params.set('baniSumaMin', String(smin));
      const smax = next.baniSumaMax ?? baniSumaMax; if (smax != null) params.set('baniSumaMax', String(smax));
    }
    const query = params.toString();
    router.push(query ? `/marketplace?${query}` : '/marketplace', { scroll: false });
  }

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

  // Ensure descriptions start with a capital letter
  function capitalizeFirst(str: string | null | undefined) {
    if (!str || str.length === 0) return str || '';
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  // Sync category with URL changes (e.g., when clicking Sidebar links)
  useEffect(() => {
    const current = searchParams.get('category') || '';
    if (current !== category) {
      setCategory(current);
      // Show overlay loader for at least 1 second on category switch
      try { if (overlayTimerRef.current) clearTimeout(overlayTimerRef.current); } catch {}
      overlayStartRef.current = Date.now();
      setOverlayActive(true);
      setSearch({ q: q || undefined, category: current || undefined, brand: current === 'masini' ? (brand || undefined) : undefined, vtype: current === 'masini' ? (vtype || undefined) : undefined, priceMin: current === 'masini' ? priceMin : undefined, priceMax: current === 'masini' ? priceMax : undefined,
        armeTip: current === 'arme' ? (armeTip || undefined) : undefined, armeCalibru: current === 'arme' ? (armeCalibru || undefined) : undefined, armeStare: current === 'arme' ? (armeStare || undefined) : undefined,
        droguriTip: current === 'droguri' ? (droguriTip || undefined) : undefined, droguriUnitate: current === 'droguri' ? (droguriUnitate || undefined) : undefined,
        baniActiune: current === 'bani' ? (baniActiune || undefined) : undefined, baniProcent: current === 'bani' ? baniProcent : undefined, baniSumaMin: current === 'bani' ? baniSumaMin : undefined, baniSumaMax: current === 'bani' ? baniSumaMax : undefined,
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  // Detect IntersectionObserver support
  useEffect(() => {
    if (typeof window === 'undefined') return;
    setIoSupported('IntersectionObserver' in window);
  }, []);

  // On first render, restore filters from localStorage if URL doesn't specify them
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const f = JSON.parse(raw || '{}') as any;
      // Merge URL params over stored values; URL wins when present
      const urlQ = searchParams.get('q') || '';
      const urlCat = searchParams.get('category') || '';
      const urlSort = (searchParams.get('sort') as any) || '';
      const nextCategory = urlCat || f.category || '';
      const next: any = {
        q: urlQ || f.q || '',
        category: nextCategory,
        sort: (['new','cheap','expensive','alpha','old'].includes(urlSort) ? urlSort : (f.sort || 'new')) as typeof sort,
        brand: nextCategory === 'masini' ? (searchParams.get('brand') || f.brand || '') : '',
        vtype: nextCategory === 'masini' ? (searchParams.get('vtype') || f.vtype || '') : '',
        priceMin: nextCategory === 'masini' ? (searchParams.get('priceMin') ? Number(searchParams.get('priceMin')) : (typeof f.priceMin === 'number' ? f.priceMin : undefined)) : undefined,
        priceMax: nextCategory === 'masini' ? (searchParams.get('priceMax') ? Number(searchParams.get('priceMax')) : (typeof f.priceMax === 'number' ? f.priceMax : undefined)) : undefined,
        armeTip: nextCategory === 'arme' ? (searchParams.get('armeTip') || f.armeTip || '') : '',
        armeCalibru: nextCategory === 'arme' ? (searchParams.get('armeCalibru') || f.armeCalibru || '') : '',
        armeStare: nextCategory === 'arme' ? (searchParams.get('armeStare') || f.armeStare || '') : '',
  droguriTip: nextCategory === 'droguri' ? (searchParams.get('droguriTip') || f.droguriTip || '') : '',
  droguriUnitate: nextCategory === 'droguri' ? (searchParams.get('droguriUnitate') || f.droguriUnitate || '') : '',
  droguriCantMin: nextCategory === 'droguri' ? (searchParams.get('droguriCantMin') ? Number(searchParams.get('droguriCantMin')) : (typeof f.droguriCantMin === 'number' ? f.droguriCantMin : undefined)) : undefined,
  droguriCantMax: nextCategory === 'droguri' ? (searchParams.get('droguriCantMax') ? Number(searchParams.get('droguriCantMax')) : (typeof f.droguriCantMax === 'number' ? f.droguriCantMax : undefined)) : undefined,
        baniActiune: nextCategory === 'bani' ? (searchParams.get('baniActiune') || f.baniActiune || '') : '',
        baniProcent: nextCategory === 'bani' ? (searchParams.get('baniProcent') ? Number(searchParams.get('baniProcent')) : (typeof f.baniProcent === 'number' ? f.baniProcent : undefined)) : undefined,
        baniSumaMin: nextCategory === 'bani' ? (searchParams.get('baniSumaMin') ? Number(searchParams.get('baniSumaMin')) : (typeof f.baniSumaMin === 'number' ? f.baniSumaMin : undefined)) : undefined,
        baniSumaMax: nextCategory === 'bani' ? (searchParams.get('baniSumaMax') ? Number(searchParams.get('baniSumaMax')) : (typeof f.baniSumaMax === 'number' ? f.baniSumaMax : undefined)) : undefined,
      };
      // Apply into state
      setQ(next.q);
      setCategory(next.category);
      setSort(next.sort);
      setBrand(next.brand || '');
      setVtype(next.vtype || '');
      setPriceMin(next.priceMin);
      setPriceMax(next.priceMax);
      setArmeTip(next.armeTip || '');
      setArmeCalibru(next.armeCalibru || '');
      setArmeStare(next.armeStare || '');
    setDroguriTip(next.droguriTip || '');
    setDroguriUnitate(next.droguriUnitate || '');
    setDroguriCantMin(next.droguriCantMin);
    setDroguriCantMax(next.droguriCantMax);
  setBaniActiune(next.baniActiune || '');
  setBaniProcent(next.baniProcent);
  setBaniSumaMin(next.baniSumaMin);
  setBaniSumaMax(next.baniSumaMax);
      // Trigger search and ensure URL reflects the merged filters
      setSearch({
        q: next.q || undefined,
        category: next.category || undefined,
        sort: next.sort,
        brand: next.category === 'masini' ? (next.brand || undefined) : undefined,
        vtype: next.category === 'masini' ? (next.vtype || undefined) : undefined,
        priceMin: next.category === 'masini' ? next.priceMin : undefined,
        priceMax: next.category === 'masini' ? next.priceMax : undefined,
        armeTip: next.category === 'arme' ? (next.armeTip || undefined) : undefined,
        armeCalibru: next.category === 'arme' ? (next.armeCalibru || undefined) : undefined,
        armeStare: next.category === 'arme' ? (next.armeStare || undefined) : undefined,
        droguriTip: next.category === 'droguri' ? (next.droguriTip || undefined) : undefined,
        droguriUnitate: next.category === 'droguri' ? (next.droguriUnitate || undefined) : undefined,
        droguriCantMin: next.category === 'droguri' ? next.droguriCantMin : undefined,
        droguriCantMax: next.category === 'droguri' ? next.droguriCantMax : undefined,
        baniActiune: next.category === 'bani' ? (next.baniActiune || undefined) : undefined,
        baniProcent: next.category === 'bani' ? next.baniProcent : undefined,
        baniSumaMin: next.category === 'bani' ? next.baniSumaMin : undefined,
        baniSumaMax: next.category === 'bani' ? next.baniSumaMax : undefined,
      });
      updateUrl(next);
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Initialize vehicle sub-filters from URL on first render
  useEffect(() => {
  const b = searchParams.get('brand') || '';
  const t = searchParams.get('vtype') || '';
    const pmin = searchParams.get('priceMin');
    const pmax = searchParams.get('priceMax');
  if (b) setBrand(b);
    if (t) setVtype(t);
    if (pmin != null) {
      const n = Number(pmin);
      if (Number.isFinite(n)) setPriceMin(n);
    }
    if (pmax != null) {
      const n = Number(pmax);
      if (Number.isFinite(n)) setPriceMax(n);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  // Initialize other category filters from URL on first render
  useEffect(() => {
    const at = searchParams.get('armeTip') || ''; if (at) setArmeTip(at);
    const ac = searchParams.get('armeCalibru') || ''; if (ac) setArmeCalibru(ac);
    const as = searchParams.get('armeStare') || ''; if (as) setArmeStare(as);
  const dt = searchParams.get('droguriTip') || ''; if (dt) setDroguriTip(dt);
  const du = searchParams.get('droguriUnitate') || ''; if (du) setDroguriUnitate(du);
  const dmin = searchParams.get('droguriCantMin'); if (dmin != null) { const n = Number(dmin); if (Number.isFinite(n)) setDroguriCantMin(n); }
  const dmax = searchParams.get('droguriCantMax'); if (dmax != null) { const n = Number(dmax); if (Number.isFinite(n)) setDroguriCantMax(n); }
    const ba = searchParams.get('baniActiune') || ''; if (ba) setBaniActiune(ba);
    const bp = searchParams.get('baniProcent'); if (bp != null) { const n = Number(bp); if (Number.isFinite(n)) setBaniProcent(n); }
    const smin = searchParams.get('baniSumaMin'); if (smin != null) { const n = Number(smin); if (Number.isFinite(n)) setBaniSumaMin(n); }
    const smax = searchParams.get('baniSumaMax'); if (smax != null) { const n = Number(smax); if (Number.isFinite(n)) setBaniSumaMax(n); }
  // removed: iteme, servicii filters
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Force an initial search so "Toate" loads immediately without toggling
  useEffect(() => {
    setSearch({
      q: q || undefined,
      category: category || undefined,
      sort,
  brand: category === 'masini' ? (brand || undefined) : undefined,
      vtype: category === 'masini' ? (vtype || undefined) : undefined,
      priceMin: category === 'masini' ? priceMin : undefined,
      priceMax: category === 'masini' ? priceMax : undefined,
      armeTip: category === 'arme' ? (armeTip || undefined) : undefined,
      armeCalibru: category === 'arme' ? (armeCalibru || undefined) : undefined,
      armeStare: category === 'arme' ? (armeStare || undefined) : undefined,
  droguriTip: category === 'droguri' ? (droguriTip || undefined) : undefined,
  droguriUnitate: category === 'droguri' ? (droguriUnitate || undefined) : undefined,
  droguriCantMin: category === 'droguri' ? droguriCantMin : undefined,
  droguriCantMax: category === 'droguri' ? droguriCantMax : undefined,
      baniActiune: category === 'bani' ? (baniActiune || undefined) : undefined,
      baniProcent: category === 'bani' ? baniProcent : undefined,
      baniSumaMin: category === 'bani' ? baniSumaMin : undefined,
      baniSumaMax: category === 'bani' ? baniSumaMax : undefined,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Persist filters to localStorage whenever they change
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const payload = {
      q, category, sort,
      brand, vtype, priceMin: priceMin ?? null, priceMax: priceMax ?? null,
      armeTip, armeCalibru, armeStare,
      droguriTip, droguriUnitate,
      droguriCantMin: droguriCantMin ?? null,
      droguriCantMax: droguriCantMax ?? null,
    };
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(payload)); } catch {}
  }, [q, category, sort, brand, vtype, priceMin, priceMax, armeTip, armeCalibru, armeStare, droguriTip, droguriUnitate, droguriCantMin, droguriCantMax]);

  // Infinite scroll via IntersectionObserver
  useEffect(() => {
    if (!ioSupported) return;
    if (!sentinelRef.current) return;
    if (!hasMore || loading || listings.length === 0) return;
    const el = sentinelRef.current;
    const obs = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (e.isIntersecting) {
          loadMore();
        }
      }
    }, { rootMargin: '600px 0px' });
    obs.observe(el);
    return () => obs.disconnect();
  }, [ioSupported, hasMore, loading, listings.length, loadMore]);

  // Cleanup any pending overlay timers on unmount
  useEffect(() => {
    return () => {
      try { if (overlayTimerRef.current) clearTimeout(overlayTimerRef.current); } catch {}
    };
  }, []);

  // Sync overlay timing with real fetch time: show for at least 1s, then hide when loading turns false
  useEffect(() => {
    if (loading) {
      // If loading starts without an explicit user change that set overlayActive,
      // ensure overlay starts and remember start time.
      if (!overlayActive) {
        overlayStartRef.current = Date.now();
        setOverlayActive(true);
      }
      // Keep overlay until we get loading=false and min duration elapsed
      if (overlayTimerRef.current) { try { clearTimeout(overlayTimerRef.current); } catch {} }
    } else {
      if (overlayActive) {
        const elapsed = Date.now() - (overlayStartRef.current || Date.now());
        const remain = Math.max(0, 1000 - elapsed);
        if (overlayTimerRef.current) { try { clearTimeout(overlayTimerRef.current); } catch {} }
        overlayTimerRef.current = setTimeout(() => setOverlayActive(false), remain);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading]);

  // No category meta fetch needed anymore

  // Debounce este în hook; apelăm setSearch la fiecare schimbare.

  return (
    <div className="space-y-4">
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-brand-white">Marketplace</h1>
          <a href="/listings/new" className="btn btn-primary">Adaugă</a>
        </div>
        <MarketplaceFilters
          q={q}
          setQ={(v)=>{ setQ(v); 
            // overlay for direct text search as well
            try { if (overlayTimerRef.current) clearTimeout(overlayTimerRef.current); } catch {}
            overlayStartRef.current = Date.now();
            setOverlayActive(true);
            setSearch({ q: v || undefined, category: category || undefined, sort, brand: category==='masini' ? (brand||undefined) : undefined, vtype: category==='masini' ? (vtype||undefined) : undefined, priceMin: category==='masini' ? priceMin : undefined, priceMax: category==='masini' ? priceMax : undefined,
            armeTip: category==='arme' ? (armeTip || undefined) : undefined, armeCalibru: category==='arme' ? (armeCalibru || undefined) : undefined, armeStare: category==='arme' ? (armeStare || undefined) : undefined,
            droguriTip: category==='droguri' ? (droguriTip || undefined) : undefined, droguriUnitate: category==='droguri' ? (droguriUnitate || undefined) : undefined,
            baniActiune: category==='bani' ? (baniActiune || undefined) : undefined, baniProcent: category==='bani' ? baniProcent : undefined, baniSumaMin: category==='bani' ? baniSumaMin : undefined, baniSumaMax: category==='bani' ? baniSumaMax : undefined,
          }); updateUrl({ q: v || undefined }); }}
          category={category}
          setCategory={(v)=>{ setCategory(v); 
            try { if (overlayTimerRef.current) clearTimeout(overlayTimerRef.current); } catch {}
            overlayStartRef.current = Date.now();
            setOverlayActive(true);
            setSearch({ q: q || undefined, category: v || undefined, sort, brand: v==='masini' ? (brand||undefined) : undefined, vtype: v==='masini' ? (vtype||undefined) : undefined, priceMin: v==='masini' ? priceMin : undefined, priceMax: v==='masini' ? priceMax : undefined,
            armeTip: v==='arme' ? (armeTip || undefined) : undefined, armeCalibru: v==='arme' ? (armeCalibru || undefined) : undefined, armeStare: v==='arme' ? (armeStare || undefined) : undefined,
            droguriTip: v==='droguri' ? (droguriTip || undefined) : undefined, droguriUnitate: v==='droguri' ? (droguriUnitate || undefined) : undefined,
            baniActiune: v==='bani' ? (baniActiune || undefined) : undefined, baniProcent: v==='bani' ? baniProcent : undefined, baniSumaMin: v==='bani' ? baniSumaMin : undefined, baniSumaMax: v==='bani' ? baniSumaMax : undefined,
          }); updateUrl({ category: v || undefined }); }}
          sort={sort}
          setSort={(s)=>{ setSort(s);
            try { if (overlayTimerRef.current) clearTimeout(overlayTimerRef.current); } catch {}
            overlayStartRef.current = Date.now();
            setOverlayActive(true);
            setSearch({ q: q || undefined, category: category || undefined, sort: s, brand: category==='masini' ? (brand||undefined) : undefined, vtype: category==='masini' ? (vtype||undefined) : undefined, priceMin: category==='masini' ? priceMin : undefined, priceMax: category==='masini' ? priceMax : undefined,
            armeTip: category==='arme' ? (armeTip || undefined) : undefined, armeCalibru: category==='arme' ? (armeCalibru || undefined) : undefined, armeStare: category==='arme' ? (armeStare || undefined) : undefined,
            droguriTip: category==='droguri' ? (droguriTip || undefined) : undefined, droguriUnitate: category==='droguri' ? (droguriUnitate || undefined) : undefined,
            baniActiune: category==='bani' ? (baniActiune || undefined) : undefined, baniProcent: category==='bani' ? baniProcent : undefined, baniSumaMin: category==='bani' ? baniSumaMin : undefined, baniSumaMax: category==='bani' ? baniSumaMax : undefined,
          }); updateUrl({ sort: s }); }}
          brand={brand}
          setBrand={(v)=>{ setBrand(v); if (category==='masini'){ 
              try { if (overlayTimerRef.current) clearTimeout(overlayTimerRef.current); } catch {}
              overlayStartRef.current = Date.now();
              setOverlayActive(true);
              setSearch({ q: q || undefined, category: category || undefined, sort, brand: v || undefined, vtype: vtype || undefined, priceMin, priceMax }); updateUrl({ brand: v || undefined }); }}}
          vtype={vtype}
          setVtype={(v)=>{ setVtype(v); if (category==='masini'){ 
              try { if (overlayTimerRef.current) clearTimeout(overlayTimerRef.current); } catch {}
              overlayStartRef.current = Date.now();
              setOverlayActive(true);
              setSearch({ q: q || undefined, category: category || undefined, sort, brand: brand || undefined, vtype: v || undefined, priceMin, priceMax }); updateUrl({ vtype: v || undefined }); }}}
          priceMin={priceMin}
          setPriceMin={(n)=>{ setPriceMin(n); if (category==='masini'){ 
              try { if (overlayTimerRef.current) clearTimeout(overlayTimerRef.current); } catch {}
              overlayStartRef.current = Date.now();
              setOverlayActive(true);
              setSearch({ q: q || undefined, category: category || undefined, sort, brand: brand || undefined, vtype: vtype || undefined, priceMin: n, priceMax }); updateUrl({ priceMin: n }); }}}
          priceMax={priceMax}
          setPriceMax={(n)=>{ setPriceMax(n); if (category==='masini'){ 
              try { if (overlayTimerRef.current) clearTimeout(overlayTimerRef.current); } catch {}
              overlayStartRef.current = Date.now();
              setOverlayActive(true);
              setSearch({ q: q || undefined, category: category || undefined, sort, brand: brand || undefined, vtype: vtype || undefined, priceMin, priceMax: n }); updateUrl({ priceMax: n }); }}}
          // other categories props wiring
          armeTip={armeTip}
      setArmeTip={(v)=>{ setArmeTip(v); if (category==='arme'){ 
        try { if (overlayTimerRef.current) clearTimeout(overlayTimerRef.current); } catch {}
        overlayStartRef.current = Date.now();
        setOverlayActive(true);
        setSearch({ q: q || undefined, category: category || undefined, sort, armeTip: v || undefined, armeCalibru: undefined, armeStare }); updateUrl({ armeTip: v || undefined, armeCalibru: undefined }); }}}
          armeCalibru={armeCalibru}
      setArmeCalibru={(v)=>{ setArmeCalibru(v); if (category==='arme'){ 
        try { if (overlayTimerRef.current) clearTimeout(overlayTimerRef.current); } catch {}
        overlayStartRef.current = Date.now();
        setOverlayActive(true);
        setSearch({ q: q || undefined, category: category || undefined, sort, armeTip, armeCalibru: v || undefined, armeStare }); updateUrl({ armeCalibru: v || undefined }); }}}
          armeStare={armeStare}
      setArmeStare={(v)=>{ setArmeStare(v); if (category==='arme'){ 
        try { if (overlayTimerRef.current) clearTimeout(overlayTimerRef.current); } catch {}
        overlayStartRef.current = Date.now();
        setOverlayActive(true);
        setSearch({ q: q || undefined, category: category || undefined, sort, armeTip, armeCalibru, armeStare: v || undefined }); updateUrl({ armeStare: v || undefined }); }}}
          droguriTip={droguriTip}
      setDroguriTip={(v)=>{ setDroguriTip(v); if (category==='droguri'){ 
        try { if (overlayTimerRef.current) clearTimeout(overlayTimerRef.current); } catch {}
        overlayStartRef.current = Date.now();
        setOverlayActive(true);
        setSearch({ q: q || undefined, category: category || undefined, sort, droguriTip: v || undefined, droguriUnitate, droguriCantMin, droguriCantMax }); updateUrl({ droguriTip: v || undefined }); }}}
          droguriUnitate={droguriUnitate}
      setDroguriUnitate={(v)=>{ setDroguriUnitate(v); if (category==='droguri'){ 
        try { if (overlayTimerRef.current) clearTimeout(overlayTimerRef.current); } catch {}
        overlayStartRef.current = Date.now();
        setOverlayActive(true);
        setSearch({ q: q || undefined, category: category || undefined, sort, droguriTip, droguriUnitate: v || undefined, droguriCantMin, droguriCantMax }); updateUrl({ droguriUnitate: v || undefined }); }}}
          droguriCantMin={droguriCantMin}
          setDroguriCantMin={(n)=>{ setDroguriCantMin(n); if (category==='droguri'){
            try { if (overlayTimerRef.current) clearTimeout(overlayTimerRef.current); } catch {}
            overlayStartRef.current = Date.now();
            setOverlayActive(true);
            setSearch({ q: q || undefined, category: category || undefined, sort, droguriTip, droguriUnitate, droguriCantMin: n, droguriCantMax }); updateUrl({ droguriCantMin: n }); }}}
          droguriCantMax={droguriCantMax}
          setDroguriCantMax={(n)=>{ setDroguriCantMax(n); if (category==='droguri'){
            try { if (overlayTimerRef.current) clearTimeout(overlayTimerRef.current); } catch {}
            overlayStartRef.current = Date.now();
            setOverlayActive(true);
            setSearch({ q: q || undefined, category: category || undefined, sort, droguriTip, droguriUnitate, droguriCantMin, droguriCantMax: n }); updateUrl({ droguriCantMax: n }); }}}
          baniActiune={baniActiune}
          setBaniActiune={(v)=>{ setBaniActiune(v); if (category==='bani'){
            try { if (overlayTimerRef.current) clearTimeout(overlayTimerRef.current); } catch {}
            overlayStartRef.current = Date.now();
            setOverlayActive(true);
            setSearch({ q: q || undefined, category: category || undefined, sort, baniActiune: v || undefined, baniProcent, baniSumaMin, baniSumaMax }); updateUrl({ baniActiune: v || undefined }); }}}
          baniProcent={baniProcent}
          setBaniProcent={(n)=>{ setBaniProcent(n); if (category==='bani'){
            try { if (overlayTimerRef.current) clearTimeout(overlayTimerRef.current); } catch {}
            overlayStartRef.current = Date.now();
            setOverlayActive(true);
            setSearch({ q: q || undefined, category: category || undefined, sort, baniActiune: baniActiune || undefined, baniProcent: n, baniSumaMin, baniSumaMax }); updateUrl({ baniProcent: n }); }}}
          baniSumaMin={baniSumaMin}
          setBaniSumaMin={(n)=>{ setBaniSumaMin(n); if (category==='bani'){
            try { if (overlayTimerRef.current) clearTimeout(overlayTimerRef.current); } catch {}
            overlayStartRef.current = Date.now();
            setOverlayActive(true);
            setSearch({ q: q || undefined, category: category || undefined, sort, baniActiune: baniActiune || undefined, baniProcent, baniSumaMin: n, baniSumaMax }); updateUrl({ baniSumaMin: n }); }}}
          baniSumaMax={baniSumaMax}
          setBaniSumaMax={(n)=>{ setBaniSumaMax(n); if (category==='bani'){
            try { if (overlayTimerRef.current) clearTimeout(overlayTimerRef.current); } catch {}
            overlayStartRef.current = Date.now();
            setOverlayActive(true);
            setSearch({ q: q || undefined, category: category || undefined, sort, baniActiune: baniActiune || undefined, baniProcent, baniSumaMin, baniSumaMax: n }); updateUrl({ baniSumaMax: n }); }}}
          
        />
        {/* Results header */}
        <div className="flex items-center justify-between text-sm text-brand-white/70">
          <div className="flex items-center gap-2">
            <span className="uppercase tracking-wide text-[11px]">Rezultate</span>
            <span className="badge">{listings.length}{hasMore ? '+' : ''}</span>
          </div>
        </div>
  {loading && listings.length === 0 && (
    <div className="space-y-3">
      <div className="skeleton skeleton-row" />
      <div className="skeleton skeleton-row" />
      <div className="skeleton skeleton-row" />
    </div>
  )}
  {error && <p className="text-red-600">{error}</p>}
  {!loading && !error && listings.length === 0 && (
    <div className="card p-6 text-brand-white/80">
      <div className="text-2xl mb-2">😕 Nimic găsit aici</div>
      <p className="mb-4">Încearcă să schimbi categoria, să ajustezi căutarea sau adaugă primul anunț în această zonă.</p>
      <div className="flex gap-2">
        <a className="btn btn-primary" href="/listings/new">Adaugă anunț</a>
        <button className="btn btn-ghost" onClick={()=>{ setQ(''); setCategory(''); setSort('new'); setSearch({ q: undefined, category: undefined, sort: 'new' }); updateUrl({ q: undefined, category: undefined, sort: 'new' }); }}>Resetează filtrele</button>
      </div>
    </div>
  )}
  <div className="flex flex-col gap-3 relative z-0">
          {(overlayActive || (loading && listings.length === 0)) && (
            <div className="loading-overlay">
              <div>
                <div className="spinner mx-auto" />
                <div className="label text-center">Se încarcă rezultate...</div>
              </div>
            </div>
          )}
          {listings.map(l => (
          <a href={`/listings/${l.id}`} key={l.id} className={"row-card" + (l.isGold ? " row-card-premium" : "")}
             title={l.title}>
            {/* thumbnail */}
            <div className="row-thumb">
              {l.thumb ? (
                <Image src={l.thumb} alt="thumb" fill placeholder={l.blurDataURL ? 'blur' : undefined} blurDataURL={l.blurDataURL || undefined} sizes="(max-width: 1024px) 40vw, 220px" className="object-cover" />
              ) : (
                <div className="absolute inset-0 grid place-items-center text-xs text-brand-white/60">Fără imagine</div>
              )}
              {l.isGold && <span className="ribbon-gold">GOLD</span>}
              <span className="badge absolute bottom-2 left-2 text-[10px]">{timeAgo(l.createdAt)}</span>
            </div>
            {/* details */}
            <div className="p-4 flex flex-col gap-2">
              <div className="lc-header">
                <h2 className="lc-title line-clamp-2 flex items-center gap-2">
                  {/* For bani: show only the sum as title, e.g. 500.000$ */}
                  {l.category === 'bani' && typeof l.attributes?.suma === 'number'
                    ? `${l.attributes.suma.toLocaleString('ro-RO')}$`
                    : l.title}
                  {l.category === 'bani' && l.attributes?.actiune && (
                    <span className={"badge text-[10px] " + (l.attributes.actiune === 'cumpara' ? 'bg-emerald-600/20 border-emerald-500/40 text-emerald-300' : 'bg-sky-600/20 border-sky-500/40 text-sky-300')}>
                      {l.attributes.actiune === 'cumpara' ? 'CUMPĂRĂ' : 'VINDE'}
                    </span>
                  )}
                </h2>
                <div className="lc-price">
                  <div className="label">{l.category === 'bani' && l.attributes?.actiune ? (l.attributes.actiune === 'cumpara' ? 'CUMPĂRĂ' : 'VINDE') : 'Preț'}</div>
                  <div className={"value " + (l.isGold ? "text-gold-gradient" : "text-brand-white")}>
                    {l.category === 'bani'
                      ? (l.attributes?.procent != null ? `${l.attributes.procent}%` : '—')
                      : (l.price != null ? `${l.price.toLocaleString('ro-RO')} $` : 'Nespecificat')}
                  </div>
                </div>
              </div>
              {l.descriptionExcerpt && (
                <div className="desc-bar" title={l.descriptionExcerpt}>{capitalizeFirst(l.descriptionExcerpt)}</div>
              )}
            </div>
            {/* right avatar column */}
            <div className="lc-avatar">
              <div>
                <div className="img">
                  {l.seller?.avatarUrl ? (
                    <Image src={l.seller.avatarUrl} alt={l.seller.displayName || 'avatar'} width={40} height={40} />
                  ) : (
                    <div className="w-[40px] h-[40px] grid place-items-center text-xs text-brand-white/60">@</div>
                  )}
                </div>
                {l.seller?.handle && <span className="handle">{l.seller.handle.startsWith('@') ? l.seller.handle : `@${l.seller.handle}`}</span>}
              </div>
            </div>
          </a>
          ))}
        </div>
        {/* Infinite scroll sentinel and subtle loader */}
        {listings.length > 0 && (
          <div className="mt-6 flex flex-col items-center gap-3">
            <div ref={sentinelRef} className="h-6" />
            {loading && <div className="h-2 w-24 bg-white/10 rounded animate-pulse" />}
            {!ioSupported && hasMore && !loading && (
              <button onClick={loadMore} className="ghost text-sm">Incarca mai multe</button>
            )}
          </div>
        )}
      </section>
    </div>
  );
}

export default function MarketplacePage() {
  return (
    <Suspense fallback={<div className="p-4 text-sm text-brand-white/70">Încărcăm marketplace-ul...</div>}>
      <MarketplaceInner />
    </Suspense>
  );
}
