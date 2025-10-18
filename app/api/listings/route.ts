import { NextRequest, NextResponse } from 'next/server';
import { fetchListings, serializeListingCard, prisma } from '../../../lib/listings';
import { LISTING_ACTIVE_WINDOW_DAYS } from '../../../lib/config';
import { listingCreateSchema, CATEGORY_VALUES } from '../../../lib/validation';
import { getWeaponPresetImage } from '../../../lib/weaponPresets';
import { audit } from '../../../lib/audit';
import { getDrugPresetImage } from '../../../lib/drugPresets';
import { getMoneyPresetImage } from '../../../lib/moneyPresets';
import { getToken } from 'next-auth/jwt';
import { ERR, respondError } from '../../../lib/errors';
import { buildListingSearchIndex } from '../../../lib/search';
import { rateLimit } from '../../../lib/rateLimit';

async function requireApprovedUser(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token || (token as any).status !== 'APPROVED') return null;
  return token;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)));
    const cursor = searchParams.get('cursor');
    const q = searchParams.get('q');
    const categoryRaw = searchParams.get('category');
    const category = categoryRaw && categoryRaw.length ? categoryRaw : undefined;
    const sellerId = searchParams.get('sellerId');
    const countOnly = searchParams.get('countOnly');
    const sort = (searchParams.get('sort') as any) || undefined;
  // Vehicle-specific filters (brand, type, price range)
  const brand = searchParams.get('brand') || undefined;
    const vtype = searchParams.get('vtype') || undefined;
    const priceMinStr = searchParams.get('priceMin');
    const priceMaxStr = searchParams.get('priceMax');
    const priceMin = priceMinStr != null ? Number(priceMinStr) : undefined;
    const priceMax = priceMaxStr != null ? Number(priceMaxStr) : undefined;
    // Other categories filters
    const armeTip = searchParams.get('armeTip') || undefined;
    const armeCalibru = searchParams.get('armeCalibru') || undefined;
    const armeStare = searchParams.get('armeStare') || undefined;
    const droguriTip = searchParams.get('droguriTip') || undefined;
    const droguriUnitate = searchParams.get('droguriUnitate') || undefined;
  const droguriCantMinStr = searchParams.get('droguriCantMin');
  const droguriCantMaxStr = searchParams.get('droguriCantMax');
  const droguriCantMin = droguriCantMinStr != null ? Number(droguriCantMinStr) : undefined;
  const droguriCantMax = droguriCantMaxStr != null ? Number(droguriCantMaxStr) : undefined;
  // Bani sub-filters
  const baniActiune = searchParams.get('baniActiune') || undefined; // 'cumpara' | 'vinde'
  const baniProcentStr = searchParams.get('baniProcent');
  const baniProcent = baniProcentStr != null ? Number(baniProcentStr) : undefined;
  const baniSumaMinStr = searchParams.get('baniSumaMin');
  const baniSumaMaxStr = searchParams.get('baniSumaMax');
  const baniSumaMin = baniSumaMinStr != null ? Number(baniSumaMinStr) : undefined;
  const baniSumaMax = baniSumaMaxStr != null ? Number(baniSumaMaxStr) : undefined;
    const itemeTip = searchParams.get('itemeTip') || undefined;
    const itemeStare = searchParams.get('itemeStare') || undefined;
    const serviciiTip = searchParams.get('serviciiTip') || undefined;
    const serviciiLocatie = searchParams.get('serviciiLocatie') || undefined;
    // If countOnly requested and sellerId provided, return fast counts for the seller (last 7 days)
    if (countOnly && sellerId) {
      const since = new Date(Date.now() - LISTING_ACTIVE_WINDOW_DAYS * 24 * 60 * 60 * 1000);
      const [total, gold, normal, byCat] = await Promise.all([
        prisma.listing.count({ where: { sellerId, createdAt: { gte: since } } }),
        prisma.listing.count({ where: { sellerId, createdAt: { gte: since }, isGold: true } }),
        prisma.listing.count({ where: { sellerId, createdAt: { gte: since }, isGold: false } }),
        prisma.listing.groupBy({ by: ['category'], where: { sellerId, createdAt: { gte: since } }, _count: { _all: true } }).catch(() => [])
      ]);
      const countsByCategory = Object.fromEntries((byCat as any[]).map(r => [r.category || 'other', r._count?._all || 0]));
      return NextResponse.json({ counts: { total, gold, normal }, countsByCategory });
    }

    const { items, nextCursor } = await fetchListings({ limit, cursor, q, category, sort, ...(sellerId ? { sellerId } : {}), brand, vtype, priceMin: isFinite(priceMin as any) ? priceMin : undefined, priceMax: isFinite(priceMax as any) ? priceMax : undefined,
  armeTip, armeCalibru, armeStare, droguriTip, droguriUnitate, droguriCantMin: isFinite(droguriCantMin as any) ? droguriCantMin : undefined, droguriCantMax: isFinite(droguriCantMax as any) ? droguriCantMax : undefined, baniActiune, baniProcent: isFinite(baniProcent as any) ? baniProcent : undefined, baniSumaMin: isFinite(baniSumaMin as any) ? baniSumaMin : undefined, baniSumaMax: isFinite(baniSumaMax as any) ? baniSumaMax : undefined,
      itemeTip, itemeStare, serviciiTip, serviciiLocatie } as any);
    return NextResponse.json({ items: items.map(serializeListingCard), nextCursor });
  } catch (e: any) {
    const msg = process.env.NODE_ENV !== 'production' ? (e?.message || 'Server error') : 'Server error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireApprovedUser(req);
  if (!auth) return ERR.UNAUTHORIZED();
  // Require linked Discord via OAuth before posting
  try {
    const acc = await prisma.account.findFirst({ where: { userId: (auth as any).sub, provider: 'discord' } });
    if (!acc) {
      return respondError('DISCORD_REQUIRED', 'Conectează-ți contul de Discord în profil pentru a posta anunțuri.', 400, { profilePath: '/profile' });
    }
  } catch {}
  const bodyRaw = await req.json();
  // Server-side attribute sanitation for droguri to be forgiving
  function sanitizeDroguriAttributes(a: any) {
    const tip = (a?.tip ?? '').toString().trim();
    const cantRaw = Number(a?.cantitate);
    const cantitate = Number.isFinite(cantRaw) ? Math.max(1, Math.round(cantRaw)) : undefined;
    const unit = (a?.unitate ?? '').toString();
    return {
      ...(tip ? { tip } : {}),
      ...(cantitate != null ? { cantitate } : {}),
      ...(unit && ['g','kg','buc'].includes(unit) ? { unitate: unit } : {})
    };
  }
  // Sanitize empty category string to null to satisfy schema (min(1) if present), and sanitize droguri attrs
  const body = {
    ...bodyRaw,
    ...(bodyRaw.category === '' ? { category: null } : {}),
    ...(bodyRaw.category === 'droguri' && bodyRaw.attributes ? { attributes: sanitizeDroguriAttributes(bodyRaw.attributes) } : {})
  };
  const parsed = listingCreateSchema.safeParse(body);
  if (!parsed.success) {
    // Forward flattened errors to the client to aid debugging
    return ERR.INVALID_INPUT(parsed.error.flatten());
  }
  const { title, description, price, category, isGold, attributes } = parsed.data as any;
  let images = (parsed.data as any).images || [];
  // For restricted categories, always override with preset images (no custom uploads)
  if (category === 'arme') {
    const preset = attributes && typeof (attributes as any).tip === 'string' ? getWeaponPresetImage((attributes as any).tip) : null;
    if (preset) images = [{ original: preset, thumb: preset } as any];
    else images = [];
  } else if (category === 'droguri') {
    const preset = attributes && typeof (attributes as any).tip === 'string' ? getDrugPresetImage((attributes as any).tip) : null;
    if (preset) images = [{ original: preset, thumb: preset } as any];
    else images = [];
  } else if (category === 'bani') {
    const preset = getMoneyPresetImage();
    images = preset ? ([{ original: preset, thumb: preset } as any]) : [];
  } else {
    // Enforce max 3 images server-side as well (defense in depth)
    if (images.length > 3) images = images.slice(0, 3);
  }
  const imagesJson = JSON.stringify(images || []);
  const attributesJson = JSON.stringify(attributes || {});
  // Limits:
  // - Normal users: max 5 active total
  // - Premium subscribers: max 5 Gold + 15 Normal active
  // - Staff (Moderator/Admin): max 25 Gold + 100 Normal active
  const role = (auth as any).role as string;
  const premiumUntil = (auth as any).premiumUntil ? new Date((auth as any).premiumUntil) : null;
  const isStaff = role === 'MODERATOR' || role === 'ADMIN';
  const isPremiumSub = !!(premiumUntil && premiumUntil.getTime() > Date.now());
  const goldEligible = isStaff || isPremiumSub;
  const since = new Date(Date.now() - LISTING_ACTIVE_WINDOW_DAYS * 24 * 60 * 60 * 1000);
  if (!goldEligible) {
    const activeTotal = await prisma.listing.count({ where: { sellerId: (auth as any).sub, createdAt: { gte: since } } });
    if (activeTotal >= 5) {
      return respondError('LISTING_LIMIT', 'Ai atins limita de 5 anunțuri active. Așteaptă să expire unele sau șterge un anunț.', 400);
    }
  } else {
    const p: any = prisma as any;
    const [goldCount, normalCount] = await Promise.all([
      p.listing.count({ where: { sellerId: (auth as any).sub, createdAt: { gte: since }, isGold: true } }),
      p.listing.count({ where: { sellerId: (auth as any).sub, createdAt: { gte: since }, isGold: false } })
    ]);
    const goldCap = isStaff ? 25 : 5;
    const normalCap = isStaff ? 100 : 15;
    if (isGold && goldCount >= goldCap) {
      return respondError('LISTING_LIMIT_GOLD', `Ai atins limita de ${goldCap} anunțuri Gold active.`, 400);
    }
    if (!isGold && normalCount >= normalCap) {
      return respondError('LISTING_LIMIT_NORMAL', `Ai atins limita de ${normalCap} anunțuri normale active.`, 400);
    }
  }
  // Per-category rate limit (e.g., max 10 listings per 30 min per category per user)
  if (category) {
    const rlKey = `listingCat:${(auth as any).sub}:${category}`;
    const rl = await rateLimit({ key: rlKey, limit: 10, windowMs: 30 * 60 * 1000 });
    if (!rl.allowed) {
      const retrySec = Math.max(1, Math.ceil((rl.reset - Date.now()) / 1000));
      return ERR.RATE_LIMIT(retrySec);
    }
  }
  const searchIndex = buildListingSearchIndex(title, description);
  const p2: any = prisma as any;
  const listing = await p2.listing.create({ data: { title, description, price: price ?? null, category: category ?? null, imagesJson, attributesJson, sellerId: (auth as any).sub, searchIndex, isGold: !!isGold } });
  audit({ userId: (auth as any).sub, action: 'LISTING_CREATE', entityType: 'LISTING', entityId: listing.id, metadata: { titleLength: title.length } });
  return NextResponse.json({ id: listing.id });
}
