import { NextRequest, NextResponse } from 'next/server';
import { prisma, fetchListingById, serializeListingDetail } from '../../../../lib/listings';
import { listingUpdateSchema } from '../../../../lib/validation';
import { getWeaponPresetImage } from '../../../../lib/weaponPresets';
import { audit } from '../../../../lib/audit';
import { getDrugPresetImage } from '../../../../lib/drugPresets';
import { getMoneyPresetImage } from '../../../../lib/moneyPresets';
import { getToken } from 'next-auth/jwt';
import { ERR } from '../../../../lib/errors';
import { buildListingSearchIndex } from '../../../../lib/search';
import { rateLimit } from '../../../../lib/rateLimit';

async function getAuth(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  return token || null;
}

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
  const listing = await fetchListingById(params.id);
  if (!listing) return ERR.NOT_FOUND();
    // phone only for approved authenticated viewers
    // Need the token; _req renamed locally to req for clarity
    // (We can't rename parameter now; getToken expects the original request object, so reuse _req)
    const token = await getToken({ req: _req, secret: process.env.NEXTAUTH_SECRET });
    const approved = !!token && (token as any).status === 'APPROVED';
    return NextResponse.json(serializeListingDetail(listing, approved));
  } catch (e: any) {
    return ERR.SERVER_ERROR();
  }
}

// Placeholders for future edit/delete logic
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await getAuth(req);
  if (!auth) return ERR.UNAUTHORIZED();
  try {
    const listing = await prisma.listing.findUnique({ where: { id: params.id }, include: { seller: true } });
    if (!listing) return ERR.NOT_FOUND();
    // Prevent edits after 7 days lifetime
    if (Date.now() - new Date(listing.createdAt).getTime() > 7 * 24 * 60 * 60 * 1000) {
      return NextResponse.json({ error: 'Anunțul a expirat și nu mai poate fi modificat.' }, { status: 400 });
    }
    if (listing.sellerId !== (auth as any).sub && (auth as any).role !== 'MODERATOR' && (auth as any).role !== 'ADMIN') {
      return ERR.FORBIDDEN();
    }
    // Normal users: allow delete at most once la 24h per listing AFTER a first edit; premium/mod: no restriction
    const role = (auth as any).role as string;
    const premiumUntil = (auth as any).premiumUntil ? new Date((auth as any).premiumUntil) : null;
    const isPremium = role === 'MODERATOR' || role === 'ADMIN' || (premiumUntil && premiumUntil.getTime() > Date.now());
    if (!isPremium && listing.updatedAt) {
      const updatedMs = new Date(listing.updatedAt).getTime();
      const createdMs = new Date(listing.createdAt).getTime();
      const hasEdits = updatedMs > createdMs;
      if (hasEdits && (Date.now() - updatedMs < 24 * 60 * 60 * 1000)) {
        return NextResponse.json({ error: 'Poți șterge/edita un anunț doar o dată la 24h.' }, { status: 400 });
      }
    }
    // Create snapshot before deletion to preserve state
    try {
      const detail = serializeListingDetail(listing as any, true);
      await (prisma as any).listingSnapshot.create({
        data: {
          listingId: listing.id,
          sellerId: listing.sellerId,
          data: JSON.stringify(detail),
          reason: 'DELETED'
        }
      });
    } catch {}
    await prisma.listing.delete({ where: { id: params.id } });
    audit({ userId: (auth as any).sub, action: 'LISTING_DELETE', entityType: 'LISTING', entityId: params.id });
    return NextResponse.json({ ok: true });
  } catch {
    return ERR.SERVER_ERROR();
  }
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await getAuth(req);
  if (!auth) return ERR.UNAUTHORIZED();
  const body = await req.json();
  try {
    const listing = await prisma.listing.findUnique({ where: { id: params.id } });
    if (!listing) return ERR.NOT_FOUND();
    if (listing.sellerId !== (auth as any).sub && (auth as any).role !== 'MODERATOR' && (auth as any).role !== 'ADMIN') {
      return ERR.FORBIDDEN();
    }
    // Normal users: throttle edit to once per 24h AFTER a first edit; premium/mod unlimited
    const role = (auth as any).role as string;
    const premiumUntil = (auth as any).premiumUntil ? new Date((auth as any).premiumUntil) : null;
    const isPremium = role === 'MODERATOR' || role === 'ADMIN' || (premiumUntil && premiumUntil.getTime() > Date.now());
    if (!isPremium && listing.updatedAt) {
      const updatedMs = new Date(listing.updatedAt).getTime();
      const createdMs = new Date(listing.createdAt).getTime();
      const hasEdits = updatedMs > createdMs;
      if (hasEdits && (Date.now() - updatedMs < 24 * 60 * 60 * 1000)) {
        return NextResponse.json({ error: 'Poți șterge/edita un anunț doar o dată la 24h.' }, { status: 400 });
      }
    }
    const parsed = listingUpdateSchema.safeParse(body);
    if (!parsed.success) return ERR.INVALID_INPUT(parsed.error.flatten());
  let { title, description, price, category, images, attributes } = parsed.data as any;
    const data: any = {};
    if (title !== undefined) data.title = title;
    if (description !== undefined) data.description = description;
    if (price !== undefined) data.price = price ?? null;
    if (category !== undefined) data.category = category ?? null;
  if (images !== undefined) {
      // Determine effective category and attributes after this update
      const effectiveCategory = category !== undefined ? category : listing.category;
      const effectiveAttrs = attributes !== undefined ? attributes : (() => { try { return JSON.parse(listing.attributesJson || '{}'); } catch { return {}; } })();
      // For restricted categories: always replace with preset
      if (effectiveCategory === 'arme') {
        const preset = effectiveAttrs && typeof (effectiveAttrs as any).tip === 'string' ? getWeaponPresetImage((effectiveAttrs as any).tip) : null;
        images = preset ? ([{ original: preset, thumb: preset } as any]) : [];
      } else if (effectiveCategory === 'droguri') {
        const preset = effectiveAttrs && typeof (effectiveAttrs as any).tip === 'string' ? getDrugPresetImage((effectiveAttrs as any).tip) : null;
        images = preset ? ([{ original: preset, thumb: preset } as any]) : [];
      } else if (effectiveCategory === 'bani') {
        const preset = getMoneyPresetImage();
        images = preset ? ([{ original: preset, thumb: preset } as any]) : [];
      } else {
        // Enforce max 3 images for other categories
        if (Array.isArray(images) && images.length > 3) images = images.slice(0, 3);
      }
      data.imagesJson = JSON.stringify(images || []);
    }
    // If images weren't provided but category/attributes are changing for restricted categories, update preset image accordingly
    if (images === undefined && (category !== undefined || attributes !== undefined)) {
      const effectiveCategory = category !== undefined ? category : listing.category;
      const effectiveAttrs = attributes !== undefined ? attributes : (() => { try { return JSON.parse(listing.attributesJson || '{}'); } catch { return {}; } })();
      if (effectiveCategory === 'arme') {
        const preset = effectiveAttrs && typeof (effectiveAttrs as any).tip === 'string' ? getWeaponPresetImage((effectiveAttrs as any).tip) : null;
        if (preset) data.imagesJson = JSON.stringify([{ original: preset, thumb: preset } as any]);
      } else if (effectiveCategory === 'droguri') {
        const preset = effectiveAttrs && typeof (effectiveAttrs as any).tip === 'string' ? getDrugPresetImage((effectiveAttrs as any).tip) : null;
        if (preset) data.imagesJson = JSON.stringify([{ original: preset, thumb: preset } as any]);
      } else if (effectiveCategory === 'bani') {
        const preset = getMoneyPresetImage();
        if (preset) data.imagesJson = JSON.stringify([{ original: preset, thumb: preset } as any]);
      }
    }
  if (attributes !== undefined) data.attributesJson = JSON.stringify(attributes || {});
    // If title or description changed, recompute searchIndex
    if (title !== undefined || description !== undefined) {
      const newTitle = title !== undefined ? title : listing.title;
      const newDesc = description !== undefined ? description : listing.description;
      data.searchIndex = buildListingSearchIndex(newTitle, newDesc);
    }
    // Optional: if category changed, enforce rate limit on new category (light protection)
    if (category !== undefined && category) {
      const rl = await rateLimit({ key: `listingCatUpdate:${(auth as any).sub}:${category}`, limit: 30, windowMs: 30 * 60 * 1000 });
      if (!rl.allowed) {
        const retrySec = Math.max(1, Math.ceil((rl.reset - Date.now()) / 1000));
        return ERR.RATE_LIMIT(retrySec);
      }
    }
  const updated = await prisma.listing.update({ where: { id: params.id }, data });
    audit({ userId: (auth as any).sub, action: 'LISTING_UPDATE', entityType: 'LISTING', entityId: params.id, metadata: { changed: Object.keys(data) } });
    return NextResponse.json({ id: updated.id });
  } catch {
    return ERR.SERVER_ERROR();
  }
}