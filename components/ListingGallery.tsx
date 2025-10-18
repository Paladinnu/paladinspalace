"use client";
import Image from 'next/image';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

type Img = { src: string; thumb?: string; blurDataURL?: string | null };

function normalize(images: (string | { original: string; thumb?: string; blurDataURL?: string | null })[]): Img[] {
  return (images || []).map((it) => {
    if (typeof it === 'string') return { src: it };
    return { src: it.original || it.thumb || '', thumb: it.thumb || it.original, blurDataURL: it.blurDataURL ?? undefined };
  }).filter((x) => !!x.src);
}

export default function ListingGallery({ images, gold = false }: { images: (string | { original: string; thumb?: string; blurDataURL?: string | null })[]; gold?: boolean }) {
  const imgs = useMemo(() => normalize(images), [images]);
  const [idx, setIdx] = useState(0);
  const [lightbox, setLightbox] = useState(false);
  const touchStart = useRef<number | null>(null);
  const [fade, setFade] = useState(false);
  const [mounted, setMounted] = useState(false);
  const canCloseRef = useRef(false);

  const prev = useCallback(() => setIdx((i) => (i === 0 ? imgs.length - 1 : i - 1)), [imgs.length]);
  const next = useCallback(() => setIdx((i) => (i === imgs.length - 1 ? 0 : i + 1)), [imgs.length]);

  useEffect(() => {
    // trigger cross-fade on image change
    setFade(true);
    const t = setTimeout(() => setFade(false), 180);
    return () => clearTimeout(t);
  }, [idx]);

  useEffect(() => {
    if (!lightbox) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setLightbox(false);
      else if (e.key === 'ArrowLeft') prev();
      else if (e.key === 'ArrowRight') next();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [lightbox, prev, next]);

  // Mount flag for portals and body scroll lock when lightbox is open
  useEffect(() => { setMounted(true); }, []);
  useEffect(() => {
    if (!lightbox) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    // small delay to avoid closing on the same click that opened the modal
    canCloseRef.current = false;
    const t = setTimeout(() => { canCloseRef.current = true; }, 180);
    return () => { document.body.style.overflow = prevOverflow; clearTimeout(t); };
  }, [lightbox]);

  if (!imgs.length) return <div className="aspect-video bg-gray-200 rounded flex items-center justify-center text-xs text-gray-500">Fără imagini</div>;

  const main = imgs[idx];

  return (
    <div className="space-y-3">
      {/* Main image with arrows */}
      <div
        className={`relative aspect-video bg-gradient-to-b from-black/20 to-black/40 border border-white/10 rounded-xl overflow-hidden group shadow-xl shadow-black/20 backdrop-blur-sm ${gold ? 'gold-glow' : ''}`}
        onTouchStart={(e) => { touchStart.current = e.changedTouches[0]?.clientX ?? null; }}
        onTouchEnd={(e) => {
          const start = touchStart.current; touchStart.current = null;
          if (start == null) return;
          const dx = (e.changedTouches[0]?.clientX ?? start) - start;
          if (Math.abs(dx) > 40) { if (dx < 0) next(); else prev(); }
        }}
      >
        {gold && (
          <div className="ribbon-gold">GOLD</div>
        )}
        {/* index chip */}
        <div className="absolute top-3 left-3 z-10 text-[11px] px-2 py-1 rounded-md bg-black/60 border border-white/15 text-white/90">
          {idx + 1}/{imgs.length}
        </div>

        <div className={`absolute inset-0 transition-opacity duration-200 ${fade ? 'opacity-0' : 'opacity-100'}`}>
          <Image
            key={main.src}
            src={main.src}
            alt="image"
            fill
            placeholder={main.blurDataURL ? 'blur' : undefined}
            blurDataURL={main.blurDataURL || undefined}
            sizes="(max-width: 768px) 100vw, 50vw"
            className="object-cover cursor-zoom-in"
            onClick={() => setLightbox(true)}
          />
        </div>
        {/* Controls */}
        {imgs.length > 1 && (
          <>
            <button aria-label="Prev" onClick={prev} className="absolute left-3 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-black/50 backdrop-blur text-white grid place-items-center opacity-0 group-hover:opacity-100 transition hover:scale-105">‹</button>
            <button aria-label="Next" onClick={next} className="absolute right-3 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-black/50 backdrop-blur text-white grid place-items-center opacity-0 group-hover:opacity-100 transition hover:scale-105">›</button>
          </>
        )}
        {/* Bottom toolbar + dots */}
        {imgs.length > 1 && (
          <>
            <div className="absolute bottom-3 left-3 flex items-center gap-2">
              <button onClick={() => setLightbox(true)} className="text-[11px] px-2 py-1 rounded-md bg-white/10 text-white border border-white/20 hover:bg-white/15">{imgs.length} imagini</button>
              <button onClick={() => setLightbox(true)} className="text-[11px] px-2 py-1 rounded-md bg-white/10 text-white border border-white/20 hover:bg-white/15">Maximizează</button>
            </div>
            <div className="absolute bottom-3 right-3 inset-x-auto flex items-center justify-center gap-1">
              {imgs.map((_, i) => (
                <button key={i} onClick={() => setIdx(i)} className={`h-1.5 rounded-full transition-all duration-200 ${i === idx ? 'w-5 bg-white' : 'w-2 bg-white/60 hover:bg-white/80'}`} />
              ))}
            </div>
          </>
        )}
      </div>

      {/* Thumbnails */}
      {imgs.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {imgs.map((im, i) => (
            <button key={i} onClick={() => setIdx(i)} className={`relative h-16 w-24 rounded-md overflow-hidden flex-shrink-0 border border-white/10 bg-white/5 transition transform ${i === idx ? 'ring-2 ring-indigo-400' : 'hover:scale-[1.03] hover:border-white/20'}`}>
              <Image src={im.thumb || im.src} alt="thumb" fill sizes="120px" className="object-cover" />
            </button>
          ))}
        </div>
      )}

      {/* Lightbox via portal to avoid clipping/z-index bugs */}
      {mounted && lightbox && createPortal(
        <div role="dialog" aria-modal="true" className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm animate-[fadeIn_.18s_ease-out]" onClick={() => { if (!canCloseRef.current) return; setLightbox(false); }}>
          <div className="absolute inset-0 flex items-center justify-center px-4">
            {/* Click areas for prev/next on sides */}
            {imgs.length > 1 && <div className="absolute inset-y-0 left-0 w-1/3" onClick={(e)=>{ e.stopPropagation(); prev(); }} />}
            {imgs.length > 1 && <div className="absolute inset-y-0 right-0 w-1/3" onClick={(e)=>{ e.stopPropagation(); next(); }} />}

            <div className="relative w-[92vw] max-w-6xl h-[82vh] scale-100 animate-[popIn_.18s_ease-out]" onClick={(e)=> e.stopPropagation()}>
              <Image
                key={`lb-${imgs[idx].src}`}
                src={imgs[idx].src}
                alt="image large"
                fill
                priority
                sizes="100vw"
                className="object-contain"
              />
              <button aria-label="Close" onClick={() => setLightbox(false)} className="absolute top-3 right-3 h-9 px-3 rounded bg-black/60 text-white border border-white/20 hover:bg-black/70">Închide ✕</button>
            </div>

            {/* Bottom thumbnails inside lightbox */}
            {imgs.length > 1 && (
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-[96vw] max-w-6xl px-4">
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {imgs.map((im, i) => (
                    <button key={i} onClick={(e)=>{ e.stopPropagation(); setIdx(i); }} className={`relative h-14 w-20 rounded-md overflow-hidden flex-shrink-0 border ${i === idx ? 'ring-2 ring-indigo-400 border-transparent' : 'border-white/15 hover:border-white/25'}`}>
                      <Image src={im.thumb || im.src} alt="thumb" fill sizes="80px" className="object-cover" />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
