"use client";
import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import clsx from 'clsx';

export interface Option { label: string; value: string; }

interface SelectProps {
  options: Option[];
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export default function Select({ options, value, onChange, placeholder = 'Selecteaza', className, disabled = false }: SelectProps) {
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const btnRef = useRef<HTMLButtonElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);
  const [coords, setCoords] = useState<{ top: number; left: number; width: number } | null>(null);
  const rafRef = useRef<number | null>(null);

  const idx = useMemo(() => options.findIndex(o => o.value === value), [options, value]);
  useEffect(() => { setHighlight(idx >= 0 ? idx : 0); }, [idx]);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!open) return;
      const t = e.target as Node;
      if (!btnRef.current?.contains(t) && !listRef.current?.contains(t)) setOpen(false);
    }
    function onRelayout() {
      if (!open || !btnRef.current) return;
      const r = btnRef.current.getBoundingClientRect();
      // For position: fixed, use viewport coordinates directly
      setCoords({ top: Math.round(r.bottom), left: Math.round(r.left), width: Math.round(r.width) });
    }
    // During scroll/touch/wheel, only re-calc the position; throttle with rAF
    function scheduleRelayout() {
      if (!open) return;
      if (rafRef.current != null) return;
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = null;
        onRelayout();
      });
    }
    document.addEventListener('mousedown', onDoc);
    window.addEventListener('resize', onRelayout);
    // Reposition on scroll/wheel/touch to keep the dropdown aligned while moving the page
    window.addEventListener('scroll', scheduleRelayout, true);
    window.addEventListener('wheel', scheduleRelayout as any, { passive: true } as any);
    window.addEventListener('touchmove', scheduleRelayout as any, { passive: true } as any);
    onRelayout();
    return () => {
      document.removeEventListener('mousedown', onDoc);
      window.removeEventListener('resize', onRelayout);
      window.removeEventListener('scroll', scheduleRelayout, true);
      window.removeEventListener('wheel', scheduleRelayout as any);
      window.removeEventListener('touchmove', scheduleRelayout as any);
      if (rafRef.current != null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [open]);

  function commit(i: number) {
    const opt = options[i];
    if (!opt) return;
    onChange(opt.value);
    setOpen(false);
  }

  function onKey(e: React.KeyboardEvent) {
    if (!open) {
      if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') { setOpen(true); e.preventDefault(); }
      return;
    }
    if (e.key === 'Escape') { setOpen(false); return; }
    if (e.key === 'ArrowDown') { setHighlight(h => Math.min(options.length - 1, h + 1)); e.preventDefault(); }
    if (e.key === 'ArrowUp') { setHighlight(h => Math.max(0, h - 1)); e.preventDefault(); }
    if (e.key === 'Enter') { commit(highlight); e.preventDefault(); }
  }

  return (
    <div className={clsx('relative z-30', className)}>
      <button ref={btnRef} type="button" disabled={disabled} onClick={() => !disabled && setOpen(o => !o)} onKeyDown={onKey}
        className={clsx('w-full text-left bg-white/5 border border-glass rounded-md px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-brand-blue/40 focus:border-brand-blue transition flex items-center justify-between', open && 'ring-1 ring-brand-blue/50 border-brand-blue', disabled && 'opacity-60 cursor-not-allowed')}>
        <span className={clsx(!value && 'text-brand-white/60')}>{value ? options[idx]?.label ?? value : placeholder}</span>
        <svg className={clsx('w-4 h-4 ml-2 transition', open && 'rotate-180')} viewBox="0 0 20 20" fill="currentColor"><path d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.24a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z"/></svg>
      </button>
      {open && !disabled && coords && createPortal(
        <div
          ref={listRef}
          className="fixed z-[1000] panel p-1 max-h-60 overflow-auto shadow-xl"
          style={{ top: coords.top + 4, left: coords.left, width: coords.width, overscrollBehavior: 'contain' as any }}
          onWheel={(e) => {
            // Trap scroll inside the dropdown; prevent page from scrolling
            const el = e.currentTarget;
            const atTop = el.scrollTop === 0 && e.deltaY < 0;
            const atBottom = Math.ceil(el.scrollTop + el.clientHeight) >= el.scrollHeight && e.deltaY > 0;
            // Always stop propagation so the page doesn't scroll underneath
            e.stopPropagation();
            if (atTop || atBottom) {
              e.preventDefault();
            }
          }}
          onTouchMove={(e) => {
            // Prevent parent/page scroll when touching inside dropdown
            e.stopPropagation();
          }}
        >
          {placeholder && (
            <div className="px-2 py-1 text-xs uppercase tracking-wide text-brand-white/50">{placeholder}</div>
          )}
          {options.map((o, i) => (
            <div key={o.value} role="option" aria-selected={i===idx}
              className={clsx('px-3 py-2 text-sm rounded cursor-pointer flex items-center justify-between', i===highlight ? 'bg-white/10 text-brand-white' : 'hover:bg-white/10 text-brand-white/90', i===idx && 'font-medium')}
              onMouseEnter={() => setHighlight(i)} onClick={() => commit(i)}>
              <span>{o.label}</span>
              {i===idx && (<span className="text-brand-blue">●</span>)}
            </div>
          ))}
        </div>, document.body
      )}
    </div>
  );
}
