export default function ExpiredPage() {
  return (
    <div className="max-w-xl mx-auto mt-16 panel p-6 text-brand-white">
      <h1 className="text-2xl font-bold mb-2">Acces expirat</h1>
      <p className="text-brand-white/80 mb-4">Accesul tău la platformă a expirat. Te rugăm să contactezi un moderator pentru prelungire sau upgrade de cont.</p>
      <ul className="list-disc list-inside text-sm text-brand-white/70 space-y-1 mb-6">
        <li>Dacă ai premium, verifică dacă este activ pe contul tău.</li>
        <li>Poți încerca să te reconectezi după ce primești prelungirea.</li>
      </ul>
      <div className="flex gap-3">
        <a href="/" className="primary px-4 py-2 rounded">Înapoi acasă</a>
        <a href="/logout" className="border border-glass bg-white/5 px-4 py-2 rounded">Deloghează-te</a>
      </div>
    </div>
  );
}
