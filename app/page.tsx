export default function Home() {
  return (
    <div className="space-y-4">
      <h1 className="text-3xl font-bold text-brand-white">Bun venit la Paladins Palace</h1>
      <p className="text-brand-white/70 max-w-2xl">
        Marketplace privat pentru iteme virtuale, creat pentru comunitatea noastră. Intră cu o invitație,
        primește aprobarea și începe să vinzi sau să găsești oferte care merită.
      </p>
      <div className="flex gap-3">
        <a href="/login?next=/marketplace" className="primary">Vezi Marketplace</a>
        <a href="/login?next=/listings/new" className="ghost">Publică un anunț</a>
      </div>
    </div>
  );
}
