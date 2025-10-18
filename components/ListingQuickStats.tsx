"use client";
import React from 'react';

type Props = {
  price: number | null;
  category: string | null;
  createdAt: string;
  sellerName: string;
  itemName?: string | null;
};

function StatTile({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 flex items-center gap-3">
      <div className="h-9 w-9 rounded-lg bg-white/10 border border-white/10 grid place-items-center text-brand-white/80">
        {icon}
      </div>
      <div className="leading-tight">
        <div className="text-[11px] text-brand-white/60">{label}</div>
        <div className="text-sm text-brand-white">{value}</div>
      </div>
    </div>
  );
}

export default function ListingQuickStats({ price, category, createdAt, sellerName, itemName }: Props) {
  const date = new Date(createdAt).toLocaleDateString('ro-RO');
  return (
    <div className="panel p-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <StatTile
          icon={<span aria-hidden>🎒</span>}
          label="Articol"
          value={itemName || 'Nespecificat'}
        />
        <StatTile
          icon={<span aria-hidden>🏷️</span>}
          label="Categorie"
          value={category || '—'}
        />
        <StatTile
          icon={<span aria-hidden>📅</span>}
          label="Publicat"
          value={date}
        />
        <StatTile
          icon={<span aria-hidden>👤</span>}
          label="Vânzător"
          value={sellerName}
        />
      </div>
    </div>
  );
}
