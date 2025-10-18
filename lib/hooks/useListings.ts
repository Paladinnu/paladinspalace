"use client";
import { useCallback, useEffect, useRef, useState } from 'react';

export interface ListingCard {
  id: string;
  title: string;
  price: number | null;
  category?: string | null;
  createdAt: string;
  seller: { id: string; displayName: string; inGameName: string | null; avatarUrl?: string | null; handle?: string | null };
  thumb?: string | null;
  blurDataURL?: string | null;
  isGold?: boolean;
  descriptionExcerpt?: string;
  attributes?: any;
}

interface QueryParams {
  q?: string;
  category?: string;
  limit?: number;
  sort?: 'new' | 'cheap' | 'expensive' | 'alpha' | 'old';
  // Vehicle-specific filters
  brand?: string;
  vtype?: string;
  priceMin?: number;
  priceMax?: number;
  // Other categories filters
  armeTip?: string;
  armeCalibru?: string;
  armeStare?: string;
  droguriTip?: string;
  droguriUnitate?: string;
  droguriCantMin?: number;
  droguriCantMax?: number;
  // Bani filters
  baniActiune?: string;
  baniProcent?: number;
  baniSumaMin?: number;
  baniSumaMax?: number;
  
}

interface UseListingsResult {
  listings: ListingCard[];
  loading: boolean;
  error: string | null;
  hasMore: boolean;
  loadMore: () => void;
  setSearch: (p: { q?: string; category?: string; sort?: QueryParams['sort']; brand?: string; vtype?: string; priceMin?: number; priceMax?: number; armeTip?: string; armeCalibru?: string; armeStare?: string; droguriTip?: string; droguriUnitate?: string; droguriCantMin?: number; droguriCantMax?: number; baniActiune?: string; baniProcent?: number; baniSumaMin?: number; baniSumaMax?: number; }) => void;
}

export function useListings(initialParams: QueryParams = {}): UseListingsResult {
  const [listings, setListings] = useState<ListingCard[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const paramsRef = useRef<QueryParams>(initialParams);
  const fetchingRef = useRef(false);
  const lastAbortRef = useRef<AbortController | null>(null);
  const reqSeqRef = useRef(0);

  const fetchPage = useCallback(async (reset = false) => {
    // Allow a reset fetch to preempt an ongoing one; only block non-reset pagination
    if (fetchingRef.current && !reset) return;
    fetchingRef.current = true;
    setLoading(true);
    setError(null);
    let mySeq = 0;
    try {
      // Cancel previous in-flight request if we're resetting the list
      if (reset && lastAbortRef.current) {
        try { lastAbortRef.current.abort(); } catch {}
      }
      const ac = new AbortController();
      lastAbortRef.current = ac;
      // Tag this request; only the latest response should be applied
      mySeq = ++reqSeqRef.current;
    const search = new URLSearchParams();
  const { q, category, limit, sort, brand, vtype, priceMin, priceMax, armeTip, armeCalibru, armeStare, droguriTip, droguriUnitate, droguriCantMin, droguriCantMax, baniActiune, baniProcent, baniSumaMin, baniSumaMax } = paramsRef.current;
      if (q) search.set('q', q);
      if (category) search.set('category', category);
  if (sort) search.set('sort', sort);
      if (limit) search.set('limit', String(limit)); else search.set('limit', '20');
  if (brand) search.set('brand', brand);
    if (vtype) search.set('vtype', vtype);
    if (priceMin != null) search.set('priceMin', String(priceMin));
    if (priceMax != null) search.set('priceMax', String(priceMax));
  if (armeTip) search.set('armeTip', armeTip);
  if (armeCalibru) search.set('armeCalibru', armeCalibru);
  if (armeStare) search.set('armeStare', armeStare);
  if (droguriTip) search.set('droguriTip', droguriTip);
  if (droguriUnitate) search.set('droguriUnitate', droguriUnitate);
  if (droguriCantMin != null) search.set('droguriCantMin', String(droguriCantMin));
  if (droguriCantMax != null) search.set('droguriCantMax', String(droguriCantMax));
  if (baniActiune) search.set('baniActiune', baniActiune);
  if (baniProcent != null) search.set('baniProcent', String(baniProcent));
  if (baniSumaMin != null) search.set('baniSumaMin', String(baniSumaMin));
  if (baniSumaMax != null) search.set('baniSumaMax', String(baniSumaMax));
  
      if (!reset && cursor) search.set('cursor', cursor);
  const res = await fetch(`/api/listings?${search.toString()}` , { signal: ac.signal, cache: 'no-store' as RequestCache });
      // Be resilient to non-JSON errors (e.g., HTML error pages)
      const ctype = res.headers.get('content-type') || '';
      let data: any = null;
      if (ctype.includes('application/json')) {
        data = await res.json();
      } else {
        const text = await res.text();
        if (!res.ok) {
          // Use first slice as message to avoid dumping HTML
          const snippet = text.replace(/\s+/g, ' ').slice(0, 200);
          throw new Error(`Eroare server (non-JSON): ${snippet}`);
        }
        try { data = JSON.parse(text); } catch { data = { items: [] }; }
      }
      if (!res.ok) throw new Error(data?.error || 'Eroare');
      // Ignore stale responses from older requests
      if (mySeq === reqSeqRef.current) {
        const newItems: ListingCard[] = data.items || [];
        setListings(prev => reset ? newItems : [...prev, ...newItems]);
        setCursor(data.nextCursor || null);
        setHasMore(!!data.nextCursor);
      }
    } catch (e: any) {
      if (e?.name === 'AbortError') {
        // ignore aborted request
      } else {
        setError(e.message);
      }
    } finally {
      // Only clear loading if this is the latest request
      if (mySeq === reqSeqRef.current) {
        setLoading(false);
      }
      // Always allow subsequent fetches
      fetchingRef.current = false;
    }
  }, [cursor]);

  const loadMore = useCallback(() => {
    if (!hasMore || loading) return;
    fetchPage(false);
  }, [hasMore, loading, fetchPage]);

  const pendingSearchRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const setSearch = useCallback((p: { q?: string; category?: string; sort?: QueryParams['sort']; brand?: string; vtype?: string; priceMin?: number; priceMax?: number; armeTip?: string; armeCalibru?: string; armeStare?: string; droguriTip?: string; droguriUnitate?: string; droguriCantMin?: number; droguriCantMax?: number; baniActiune?: string; baniProcent?: number; baniSumaMin?: number; baniSumaMax?: number; }) => {
    // Merge changes and clear unrelated filters when switching category
    const next = { ...paramsRef.current, ...p } as QueryParams;
    if (p.category && p.category !== paramsRef.current.category) {
      if (p.category === 'masini') {
        next.armeTip = undefined; next.armeCalibru = undefined; next.armeStare = undefined;
        next.droguriTip = undefined; next.droguriUnitate = undefined; next.droguriCantMin = undefined; next.droguriCantMax = undefined;
        next.baniActiune = undefined; next.baniProcent = undefined; next.baniSumaMin = undefined; next.baniSumaMax = undefined;
      } else if (p.category === 'arme') {
        next.brand = undefined; next.vtype = undefined; next.priceMin = undefined; next.priceMax = undefined;
        next.droguriTip = undefined; next.droguriUnitate = undefined; next.droguriCantMin = undefined; next.droguriCantMax = undefined;
        next.baniActiune = undefined; next.baniProcent = undefined; next.baniSumaMin = undefined; next.baniSumaMax = undefined;
      } else if (p.category === 'droguri') {
        next.brand = undefined; next.vtype = undefined; next.priceMin = undefined; next.priceMax = undefined;
        next.armeTip = undefined; next.armeCalibru = undefined; next.armeStare = undefined;
        next.baniActiune = undefined; next.baniProcent = undefined; next.baniSumaMin = undefined; next.baniSumaMax = undefined;
      } else if (p.category === 'bani') {
        next.brand = undefined; next.vtype = undefined; next.priceMin = undefined; next.priceMax = undefined;
        next.armeTip = undefined; next.armeCalibru = undefined; next.armeStare = undefined;
        next.droguriTip = undefined; next.droguriUnitate = undefined; next.droguriCantMin = undefined; next.droguriCantMax = undefined;
      }
    }
    paramsRef.current = next;
    // Immediately reflect reset intent in UI to avoid cross-category flashes
    setListings([]);
    setError(null);
    setCursor(null);
    setHasMore(true);
    setLoading(true);
    // Abort any in-flight fetch right away; the upcoming fetchPage(true) will create a new controller
    try { lastAbortRef.current?.abort(); } catch {}
    // Bump sequence so any late responses are ignored
    reqSeqRef.current++;
    if (pendingSearchRef.current) clearTimeout(pendingSearchRef.current);
    pendingSearchRef.current = setTimeout(() => {
      fetchPage(true);
    }, 300);
  }, [fetchPage]);

  useEffect(() => {
    fetchPage(true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Abort in-flight requests on unmount
  useEffect(() => {
    return () => {
      try { lastAbortRef.current?.abort(); } catch {}
      if (pendingSearchRef.current) clearTimeout(pendingSearchRef.current);
    };
  }, []);

  return { listings, loading, error, hasMore, loadMore, setSearch };
}
