'use client';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import clsx from 'clsx';

const items = [
  { key: '', label: 'Toate categoriile', href: '/marketplace', icon: '✨' },
  { key: 'arme', label: 'Arme', href: '/marketplace?category=arme', icon: '🔫' },
  { key: 'masini', label: 'Vehicule', href: '/marketplace?category=masini', icon: '🚗' },
  { key: 'droguri', label: 'Droguri', href: '/marketplace?category=droguri', icon: '💊' },
  { key: 'bani', label: 'Bani', href: '/marketplace?category=bani', icon: '💰' },
  
];

export function Sidebar() {
  const pathname = usePathname();
  const search = useSearchParams();
  const activeCategory = search.get('category');
  return (
    <aside className="hidden md:block w-56">
      <div className="panel p-3 sticky top-16">
        <div className="mb-3 text-xs uppercase tracking-wider text-brand-white/50">Categorii</div>
        <nav className="space-y-1">
          {items.map((it) => (
            <Link key={it.key} href={it.href} className={clsx(
              'flex items-center gap-3 px-3 py-2 rounded-md hover:bg-white/10 transition text-sm',
              pathname?.startsWith('/marketplace') && (activeCategory === it.key ? 'bg-white/15 border border-brand-blue/40 text-brand-white shadow-glow-blue' : 'text-brand-white/80 hover:text-brand-white')
            )}>
              <span className="text-lg">{it.icon}</span>
              <span>{it.label}</span>
            </Link>
          ))}
        </nav>
        <div className="mt-4 border-t border-glass pt-3">
          <div className="mb-2 text-xs uppercase tracking-wider text-brand-white/50">Contul meu</div>
          <nav className="space-y-1">
            <Link href="/favorites" className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-white/10 transition text-sm text-brand-white/80 hover:text-brand-white">❤️ Favorite</Link>
            <Link href="/my-listings" className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-white/10 transition text-sm text-brand-white/80 hover:text-brand-white">📦 Anunturile mele</Link>
          </nav>
        </div>
      </div>
    </aside>
  );
}
