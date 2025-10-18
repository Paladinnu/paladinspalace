'use client';
import clsx from 'clsx';
import ThemedSelect from './ui/Select';
import { brandOptions, CAR_VEHICLE_TYPES } from '../lib/data/cars';
import { WEAPON_GROUPS, WEAPON_OPTIONS } from '../lib/weapons';

type SortKey = 'new' | 'cheap' | 'expensive' | 'alpha' | 'old';

const categories = [
  { key: '', label: 'Toate', icon: '✨' },
  { key: 'arme', label: 'Arme', icon: '🔫' },
  { key: 'masini', label: 'Vehicule', icon: '🚗' },
  { key: 'droguri', label: 'Droguri', icon: '💊' },
  { key: 'bani', label: 'Bani', icon: '💰' },
  
];

export function MarketplaceFilters(props: {
  q: string;
  setQ: (v: string) => void;
  category: string;
  setCategory: (v: string) => void;
  sort: SortKey;
  setSort: (v: SortKey) => void;
  // Vehicle-specific filters (shown only when category === 'masini')
  brand?: string;
  setBrand?: (v: string) => void;
  vtype?: string;
  setVtype?: (v: string) => void;
  priceMin?: number | undefined;
  setPriceMin?: (n: number | undefined) => void;
  priceMax?: number | undefined;
  setPriceMax?: (n: number | undefined) => void;
  // Other categories filters
  armeTip?: string;
  setArmeTip?: (v: string) => void;
  armeCalibru?: string;
  setArmeCalibru?: (v: string) => void;
  armeStare?: string;
  setArmeStare?: (v: string) => void;
  droguriTip?: string;
  setDroguriTip?: (v: string) => void;
  droguriUnitate?: string;
  setDroguriUnitate?: (v: string) => void;
  droguriCantMin?: number | undefined;
  setDroguriCantMin?: (n: number | undefined) => void;
  droguriCantMax?: number | undefined;
  setDroguriCantMax?: (n: number | undefined) => void;
  // Bani sub-filters
  baniActiune?: string;
  setBaniActiune?: (v: string) => void;
  baniProcent?: number | undefined;
  setBaniProcent?: (n: number | undefined) => void;
  baniSumaMin?: number | undefined;
  setBaniSumaMin?: (n: number | undefined) => void;
  baniSumaMax?: number | undefined;
  setBaniSumaMax?: (n: number | undefined) => void;
  itemeTip?: string;
  setItemeTip?: (v: string) => void;
  itemeStare?: string;
  setItemeStare?: (v: string) => void;
  serviciiTip?: string;
  setServiciiTip?: (v: string) => void;
  serviciiLocatie?: string;
  setServiciiLocatie?: (v: string) => void;
}) {
  const { q, setQ, category, setCategory, sort, setSort, brand, setBrand, vtype, setVtype, priceMin, setPriceMin, priceMax, setPriceMax,
    armeTip, setArmeTip, armeCalibru, setArmeCalibru, armeStare, setArmeStare,
  droguriTip, setDroguriTip, droguriUnitate, setDroguriUnitate, droguriCantMin, setDroguriCantMin, droguriCantMax, setDroguriCantMax,
    baniActiune, setBaniActiune, baniProcent, setBaniProcent, baniSumaMin, setBaniSumaMin, baniSumaMax, setBaniSumaMax,
  itemeTip, setItemeTip, itemeStare, setItemeStare,
  serviciiTip, setServiciiTip, serviciiLocatie, setServiciiLocatie } = props as any;

  // Weapons filters from centralized module
  return (
    <div className="filter-bar relative z-10 rounded-md">
      <div className="p-3 flex flex-col gap-3">
        {/* Top row: search + sort */}
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Caută după nume..."
            className="flex-1"
          />
          <ThemedSelect
            value={sort}
            onChange={(v) => setSort(v as SortKey)}
            placeholder="Sortare"
            options={[
              { label: 'Cele mai noi', value: 'new' },
              { label: 'Cele mai vechi', value: 'old' },
              { label: 'Cele mai ieftine', value: 'cheap' },
              { label: 'Cele mai scumpe', value: 'expensive' },
              { label: 'Ordine alfabetică', value: 'alpha' },
            ]}
            className="sm:min-w-[200px]"
          />
        </div>

        {/* Category chips */}
        <div className="-mx-1 overflow-x-auto">
          <div className="px-1 py-1 flex gap-3 min-w-max">
            {categories.map((c) => {
              const active = (category || '') === c.key;
              return (
                <button
                  key={c.key}
                  onClick={() => setCategory(c.key)}
                  className={clsx('chip-lg transition', active ? 'active' : undefined)}
                  aria-pressed={active}
                >
                  <span className="text-xl">{c.icon}</span>
                  <span className="tracking-wide">{c.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Vehicle sub-filters */}
        {category === 'masini' && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
            <ThemedSelect
              value={brand || ''}
              onChange={(v) => setBrand && setBrand(v as string)}
              placeholder="Marcă"
              options={[{ label: 'Orice marcă', value: '' }, ...brandOptions()]}
            />
            <ThemedSelect
              value={vtype || ''}
              onChange={(v) => setVtype && setVtype(v as string)}
              placeholder="Tip vehicul"
              options={[{ label: 'Orice tip', value: '' }, ...CAR_VEHICLE_TYPES]}
            />
            <input
              type="number"
              inputMode="numeric"
              min={0}
              value={priceMin ?? ''}
              onChange={(e) => {
                const v = e.target.value ? Math.max(0, Number(e.target.value)) : undefined;
                setPriceMin && setPriceMin(v);
              }}
              placeholder="Preț min"
            />
            <input
              type="number"
              inputMode="numeric"
              min={0}
              value={priceMax ?? ''}
              onChange={(e) => {
                const v = e.target.value ? Math.max(0, Number(e.target.value)) : undefined;
                setPriceMax && setPriceMax(v);
              }}
              placeholder="Preț max"
            />
          </div>
        )}
        {category === 'arme' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            <ThemedSelect
              value={armeTip || ''}
              onChange={(v) => { setArmeTip && setArmeTip(String(v || '')); setArmeCalibru && setArmeCalibru(''); }}
              placeholder="Tip armă"
              options={[{ label: 'Alege tipul', value: '' }, ...WEAPON_GROUPS]}
            />
            <ThemedSelect
              value={armeCalibru || ''}
              onChange={(v) => setArmeCalibru && setArmeCalibru(String(v || ''))}
              placeholder={armeTip ? 'Alege arma' : 'Alege tipul de armă'}
              options={[{ label: armeTip ? 'Selectează arma' : 'Alege tipul de armă', value: '' }, ...((WEAPON_OPTIONS as any)[armeTip || ''] || [])]}
              disabled={!armeTip}
            />
            <ThemedSelect value={armeStare || ''} onChange={(v)=> setArmeStare && setArmeStare(v as string)} placeholder="Stare" options={[{ label: 'Orice', value: '' }, { label: 'nou', value: 'nou' }, { label: 'bun', value: 'bun' }, { label: 'folosit', value: 'folosit' }]} />
          </div>
        )}
        {category === 'droguri' && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
            <ThemedSelect
              value={droguriTip || ''}
              onChange={(v)=> setDroguriTip && setDroguriTip(v as string)}
              placeholder="Tip"
              options={[
                { label: 'Orice', value: '' },
                { label: 'Cocaină', value: 'cocaina' },
                { label: 'Crack', value: 'crack' },
                { label: 'Marijuana', value: 'marijuana' },
                { label: 'Țigări', value: 'tigari' },
                { label: 'Meth', value: 'meth' },
              ]}
            />
            <ThemedSelect value={droguriUnitate || ''} onChange={(v)=> setDroguriUnitate && setDroguriUnitate(v as string)} placeholder="Unitate" options={[{ label: 'Orice', value: '' }, { label: 'g', value: 'g' }, { label: 'kg', value: 'kg' }, { label: 'buc', value: 'buc' }]} />
            <input
              type="number"
              inputMode="numeric"
              min={1}
              value={droguriCantMin ?? ''}
              onChange={(e)=>{
                const v = e.target.value ? Math.max(1, Number(e.target.value)) : undefined;
                setDroguriCantMin && setDroguriCantMin(v);
              }}
              placeholder="Cant. min"
            />
            <input
              type="number"
              inputMode="numeric"
              min={1}
              value={droguriCantMax ?? ''}
              onChange={(e)=>{
                const v = e.target.value ? Math.max(1, Number(e.target.value)) : undefined;
                setDroguriCantMax && setDroguriCantMax(v);
              }}
              placeholder="Cant. max"
            />
          </div>
        )}
        {category === 'bani' && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
            <ThemedSelect
              value={baniActiune || ''}
              onChange={(v) => setBaniActiune && setBaniActiune(v as string)}
              placeholder="Acțiune"
              options={[{ label: 'Oricare', value: '' }, { label: 'Cumpără', value: 'cumpara' }, { label: 'Vinde', value: 'vinde' }]}
            />
            <ThemedSelect
              value={(baniProcent ?? '').toString()}
              onChange={(v) => setBaniProcent && setBaniProcent(v ? Number(v) : undefined)}
              placeholder="Procent"
              options={[
                { label: 'Oricare', value: '' },
                ...Array.from({ length: 31 }, (_, i) => 15 + i).map(n => ({ label: `${n}%`, value: String(n) }))
              ]}
            />
            <input
              type="number"
              inputMode="numeric"
              min={0}
              value={baniSumaMin ?? ''}
              onChange={(e) => {
                const v = e.target.value ? Math.max(0, Number(e.target.value)) : undefined;
                setBaniSumaMin && setBaniSumaMin(v);
              }}
              placeholder="Sumă min"
            />
            <input
              type="number"
              inputMode="numeric"
              min={0}
              value={baniSumaMax ?? ''}
              onChange={(e) => {
                const v = e.target.value ? Math.max(0, Number(e.target.value)) : undefined;
                setBaniSumaMax && setBaniSumaMax(v);
              }}
              placeholder="Sumă max"
            />
          </div>
        )}
        
      </div>
    </div>
  );
}
