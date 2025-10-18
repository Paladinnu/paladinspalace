import prisma from './prisma';
import { weaponGroupMap, WEAPON_ALIASES, WEAPON_GROUP_SLUGS } from './weapons';

interface ListingImageObj { original: string; thumb?: string; mime?: string; width?: number|null; height?: number|null; blurDataURL?: string|null; }

function parseImages(raw: string): ListingImageObj[] {
  try {
    const parsed = JSON.parse(raw || '[]');
    if (Array.isArray(parsed)) {
      return parsed.filter((o: any) => o && typeof o === 'object' && typeof o.original === 'string');
    }
  } catch {}
  return [];
}

export function serializeListingCard(l: any) {
  const images = parseImages(l.imagesJson);
  const thumb = images[0]?.thumb || images[0]?.original || null;
  const blurDataURL = images[0]?.blurDataURL || null;
  let attrs: any = {};
  try { attrs = JSON.parse(l.attributesJson || '{}') || {}; } catch {}
  const rawDesc = String(l.description || '');
  const descriptionExcerpt = (() => {
    const s = rawDesc.replace(/\s+/g, ' ').trim();
    if (!s) return '';
    return s.length > 140 ? s.slice(0, 137) + '…' : s;
  })();
  return {
    id: l.id,
    title: l.title,
    price: l.price,
    category: l.category,
    createdAt: l.createdAt,
    isGold: !!l.isGold,
    attributes: attrs,
    seller: { id: l.sellerId, displayName: l.seller.displayName, inGameName: l.seller.inGameName, avatarUrl: l.seller.avatarUrl || null, handle: l.seller.handle || null },
    descriptionExcerpt,
    thumb,
    blurDataURL
  };
}

export function serializeListingDetail(l: any, approvedViewer: boolean) {
  const images = parseImages(l.imagesJson);
  // Parse attributesJson to derive a human-friendly item name per category
  let attrs: any = {};
  try { attrs = JSON.parse(l.attributesJson || '{}') || {}; } catch {}
  const itemName: string | null = (() => {
    const cat = l.category as string | null;
    if (!cat || !attrs) return null;
    if (cat === 'arme' && typeof attrs.tip === 'string' && attrs.tip) return attrs.tip as string;
    if (cat === 'droguri' && typeof attrs.tip === 'string' && attrs.tip) return attrs.tip as string;
    if (cat === 'masini' && typeof attrs.brand === 'string' && attrs.brand) return attrs.brand as string;
    if (cat === 'bani') return 'Bani murdari';
    return null;
  })();
  return {
    id: l.id,
    title: l.title,
    description: l.description,
    price: l.price,
    category: l.category,
    isGold: !!l.isGold,
    updatedAt: l.updatedAt,
    images,
    createdAt: l.createdAt,
    itemName,
    attributes: attrs,
    seller: {
      id: l.sellerId,
      displayName: l.seller.displayName,
      discordTag: l.seller.discordTag,
      inGameName: l.seller.inGameName,
      inGameId: l.seller.inGameId,
      phoneIC: approvedViewer ? l.seller.phoneIC : undefined,
      avatarUrl: l.seller.avatarUrl || null,
      // extra metadata for badges/trust signals
      role: l.seller.role,
      status: l.seller.status,
      verified: l.seller.verified,
      premiumUntil: l.seller.premiumUntil,
      createdAt: l.seller.createdAt
    }
  };
}

export async function fetchListingById(id: string) {
  return prisma.listing.findUnique({ where: { id }, include: { seller: true } });
}

export interface ListingsQuery {
  limit?: number;
  cursor?: string | null; // listing id
  q?: string | null;
  category?: string | null;
  sort?: 'new' | 'old' | 'cheap' | 'expensive' | 'alpha';
  sellerId?: string | null;
  // Vehicle-specific filters (category = 'masini')
  brand?: string | null;
  vtype?: string | null; // saloon | coupe | suv (free text match for now)
  priceMin?: number | null;
  priceMax?: number | null;
  // Other categories filters
  armeTip?: string | null;
  armeCalibru?: string | null;
  armeStare?: string | null;
  droguriTip?: string | null;
  droguriUnitate?: string | null;
  droguriCantMin?: number | null;
  droguriCantMax?: number | null;
  // Bani
  baniActiune?: string | null; // 'cumpara' | 'vinde'
  baniProcent?: number | null;
  baniSumaMin?: number | null;
  baniSumaMax?: number | null;
  
}

export async function fetchListings(params: ListingsQuery = {}) {
  const { limit = 20, cursor, q, category, sort = 'new', sellerId, brand, vtype, priceMin, priceMax,
    armeTip, armeCalibru, armeStare, droguriTip, droguriUnitate, droguriCantMin, droguriCantMax, baniActiune, baniProcent, baniSumaMin, baniSumaMax } = params;
  const where: any = {};
  // Show all listings by default (no time window), sorting will surface the most recent
  if (q) {
    // Use precomputed normalized searchIndex (simple contains)
    // Normalize incoming q similarly (lowercase, remove diacritics, strip non-alphanum)
    const norm = q.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
    if (norm) {
      where.searchIndex = { contains: norm }; // already lowercase ascii
    }
  }
  if (category) where.category = category;
  if (sellerId) where.sellerId = sellerId;
  // Price range (if provided). Note: null prices will be excluded when bounds are set.
  if (priceMin != null || priceMax != null) {
    where.price = {};
    if (priceMin != null) where.price.gte = priceMin;
    if (priceMax != null) where.price.lte = priceMax;
  }
  // Vehicle filters via searchIndex contains for now (until dedicated fields exist)
  const and: any[] = [];
  // allow composed OR blocks when needed (e.g., weapon group mapping, vehicle brand fallback)
  function pushOr(orConds: any[]) {
    if (!orConds || !orConds.length) return;
    and.push({ OR: orConds });
  }
  function normTerm(s?: string | null) {
    if (!s) return '';
    return s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  }
  const nb = normTerm(brand);
  const nt = normTerm(vtype);
  // Vehicle filters: prefer attributesJson exact key matches, but support searchIndex fallback for older posts
  if (brand) {
    const or: any[] = [];
    or.push({ attributesJson: { contains: `"brand":"${brand}"` } });
    if (nb) or.push({ searchIndex: { contains: nb } });
    pushOr(or);
  }
  if (vtype) {
    const or: any[] = [];
    or.push({ attributesJson: { contains: `"vtype":"${vtype}"` } });
    if (nt) or.push({ searchIndex: { contains: nt } });
    pushOr(or);
  }
  // Attribute JSON filters for other categories (simple string contains on JSON)
  function jsonContainsKV(key: string, val?: string | null) {
    if (!val) return;
    // Exact key/value snippet match; values are lowercased for controlled selects
    and.push({ attributesJson: { contains: `"${key}":"${val}"` } });
  }
  function jsonContainsText(val?: string | null) {
    if (!val) return;
    and.push({ attributesJson: { contains: String(val) } });
  }
  if (category === 'arme') {
    // If a specific weapon is selected (second dropdown), match tip exactly.
    if (armeCalibru) {
      // Expand to aliases for legacy/variant naming and include searchIndex fallback
      const aliases = WEAPON_ALIASES[armeCalibru] || [armeCalibru];
      const or: any[] = [];
      for (const a of aliases) {
        or.push({ attributesJson: { contains: `"tip":"${a}"` } });
        const na = normTerm(a);
        if (na) or.push({ searchIndex: { contains: na } });
      }
      pushOr(or);
    } else if (armeTip) {
      // Use strict slugs and expand to aliases + searchIndex fallback
      const slugs = WEAPON_GROUP_SLUGS[armeTip] || [];
      if (slugs.length) {
        const orConds: any[] = [];
        for (const slug of slugs) {
          const aliases = WEAPON_ALIASES[slug] || [slug];
          for (const a of aliases) {
            // For group-only filtering, require attributesJson match to avoid overly broad searchIndex hits
            orConds.push({ attributesJson: { contains: `"tip":"${a}"` } });
          }
        }
        pushOr(orConds);
      }
    }
    jsonContainsKV('stare', armeStare);
  } else if (category === 'droguri') {
    // Prefer exact tip match when user typed an exact drug; fall back to contains
    if (droguriTip && droguriTip.length > 1) {
      // Use OR of exact and loose contains to be forgiving
      pushOr([
        { attributesJson: { contains: `"tip":"${droguriTip}"` } },
        { attributesJson: { contains: String(droguriTip) } }
      ]);
    }
    jsonContainsKV('unitate', droguriUnitate);
  }
  // Bani: filter by action in DB via JSON contains; stricter numeric filters applied post-fetch to keep indexing simple on SQLite
  if (category === 'bani') {
    if (baniActiune) {
      and.push({ attributesJson: { contains: `"actiune":"${baniActiune}"` } });
    }
    if (baniProcent != null) {
      // store as integer in JSON; we can prefilter roughly via contains
      const pstr = String(Math.floor(baniProcent));
      and.push({ attributesJson: { contains: `"procent":${pstr}` } });
    }
    // For suma ranges, we'll do post-filtering below after fetching a page
  }

  if (and.length) {
    if (!where.AND) where.AND = [];
    where.AND.push(...and);
  }

  const query: any = {
    where,
    include: { seller: true },
    orderBy: (() => {
      switch (sort) {
        case 'old': return [{ isGold: 'desc' as const }, { createdAt: 'asc' as const }];
        case 'alpha': return [{ isGold: 'desc' as const }, { title: 'asc' as const }];
        case 'cheap': return [
          { isGold: 'desc' as const },
          { price: 'asc' as const }, // prisma will put nulls first; we'll adjust in post
          { createdAt: 'desc' as const }
        ];
        case 'expensive': return [
          { isGold: 'desc' as const },
          { price: 'desc' as const },
          { createdAt: 'desc' as const }
        ];
        default: return [{ isGold: 'desc' as const }, { createdAt: 'desc' as const }];
      }
    })(),
    take: limit + 1
  };
  if (cursor) {
    query.skip = 1;
    query.cursor = { id: cursor };
  }
  let rows: any[] = await prisma.listing.findMany(query);
  // Safety net: strictly enforce Arme group membership post-fetch by inspecting attributesJson.tip
  if (category === 'arme' && armeTip && !armeCalibru) {
    const slugs = WEAPON_GROUP_SLUGS[armeTip] || [];
    const allowed: string[] = [];
    for (const slug of slugs) {
      const aliases = WEAPON_ALIASES[slug] || [slug];
      allowed.push(...aliases);
    }
    const allowedNorm = new Set(allowed.map(a => normTerm(a)).filter(Boolean));
    rows = rows.filter(r => {
      try {
        const attrs = JSON.parse(r.attributesJson || '{}') || {};
        const tip = typeof attrs.tip === 'string' ? attrs.tip : '';
        const nt = normTerm(tip);
        return !!nt && allowedNorm.has(nt);
      } catch { return false; }
    });
  }
  // Post-filter for droguri quantity ranges
  if (category === 'droguri' && (droguriCantMin != null || droguriCantMax != null)) {
    rows = rows.filter(r => {
      let attrs: any = {};
      try { attrs = JSON.parse(r.attributesJson || '{}') || {}; } catch {}
      const cant = typeof attrs.cantitate === 'number' ? attrs.cantitate : null;
      if (droguriCantMin != null && cant != null && cant < droguriCantMin) return false;
      if (droguriCantMax != null && cant != null && cant > droguriCantMax) return false;
      return true;
    });
  }
  // Post-filter for bani sum min/max and ensure exact percent match if driver returned loose matches
  if (category === 'bani' && (baniSumaMin != null || baniSumaMax != null || baniProcent != null)) {
    rows = rows.filter(r => {
      let attrs: any = {};
      try { attrs = JSON.parse(r.attributesJson || '{}') || {}; } catch {}
      const suma = typeof attrs.suma === 'number' ? attrs.suma : null;
      const procent = typeof attrs.procent === 'number' ? attrs.procent : null;
      if (baniProcent != null && procent != null && procent !== Math.floor(baniProcent)) return false;
      if (baniSumaMin != null && suma != null && suma < baniSumaMin) return false;
      if (baniSumaMax != null && suma != null && suma > baniSumaMax) return false;
      return true;
    });
  }
  // Move null prices to the end for cheap/expensive sorts to mimic nulls last
  if (sort === 'cheap' || sort === 'expensive') {
    const withPrice = rows.filter(r => r.price != null);
    const noPrice = rows.filter(r => r.price == null);
    rows = sort === 'cheap' ? [...withPrice, ...noPrice] : [...withPrice, ...noPrice];
  }
  let nextCursor: string | null = null;
  if (rows.length > limit) {
    const next = rows.pop();
    nextCursor = next!.id;
  }
  return { items: rows, nextCursor };
}

export { prisma };
