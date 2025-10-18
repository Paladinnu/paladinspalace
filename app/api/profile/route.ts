import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { prisma } from '../../../lib/listings';
import { profileUpdateSchema } from '../../../lib/validation';
import { audit } from '../../../lib/audit';
import { ERR, respondError } from '../../../lib/errors';
import { rateLimit } from '../../../lib/rateLimit';

async function requireAuth(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token) return null;
  return token as any;
}

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if (!auth) return ERR.UNAUTHORIZED();
  const user = await prisma.user.findUnique({ where: { id: auth.sub } });
  if (!user) return ERR.NOT_FOUND();
  return NextResponse.json({
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    handle: (user as any).handle ?? null,
    bio: (user as any).bio ?? null,
    coverUrl: (user as any).coverUrl ?? null,
    status: user.status,
    discordTag: user.discordTag,
    fullNameIC: user.fullNameIC,
    inGameId: user.inGameId,
    phoneIC: user.phoneIC,
    avatarUrl: user.avatarUrl,
    accessUntil: (user as any).accessUntil ?? null,
    premiumUntil: (user as any).premiumUntil ?? null
  });
}

export async function PUT(req: NextRequest) {
  const auth = await requireAuth(req);
  if (!auth) return ERR.UNAUTHORIZED();
  const raw = await req.json();
  const parsed = profileUpdateSchema.safeParse(raw);
  if (!parsed.success) return ERR.INVALID_INPUT(parsed.error.flatten());
  const { displayName, bio, handle } = parsed.data as any;
  const avatarUrl = typeof (raw as any).avatarUrl === 'string' ? (raw as any).avatarUrl : undefined;
  const coverUrl = typeof (raw as any).coverUrl === 'string' ? (raw as any).coverUrl : undefined;

  // Fetch current to detect changes and apply throttles
  const current: any = await (prisma as any).user.findUnique({ where: { id: auth.sub }, select: { displayName: true, handle: true, avatarUrl: true, coverUrl: true } });
  if (!current) return ERR.NOT_FOUND();

  // Throttle windows
  const TEN_MIN = 10 * 60 * 1000;
  const FOURTEEN_DAYS = 14 * 24 * 60 * 60 * 1000;

  // Helper: enforce a throttle and return a friendly error
  async function enforceThrottle(key: string, windowMs: number, field: 'displayName' | 'handle' | 'avatar' | 'cover') {
    const rl = await rateLimit({ key, limit: 1, windowMs });
    if (!rl.allowed) {
      const retrySec = Math.max(1, Math.ceil((rl.reset - Date.now()) / 1000));
      const label = field === 'handle' ? 'handle-ul' : field === 'displayName' ? 'numele' : field === 'avatar' ? 'fotografia' : 'bannerul';
      return respondError('PROFILE_THROTTLE', `Nu poți schimba acum ${label}. Încearcă mai târziu.`, 429, { field, retryAfter: retrySec });
    }
    return null;
  }

  // Apply throttles only when the value is actually changing
  if (displayName && current.displayName !== displayName) {
    const err = await enforceThrottle(`profile:displayName:${auth.sub}`, TEN_MIN, 'displayName');
    if (err) return err;
  }
  if (typeof handle === 'string' && handle !== current.handle) {
    const err = await enforceThrottle(`profile:handle:${auth.sub}`, FOURTEEN_DAYS, 'handle');
    if (err) return err;
  }
  if (typeof avatarUrl === 'string' && avatarUrl !== current.avatarUrl) {
    const err = await enforceThrottle(`profile:avatar:${auth.sub}`, TEN_MIN, 'avatar');
    if (err) return err;
  }
  if (typeof coverUrl === 'string' && coverUrl !== current.coverUrl) {
    const err = await enforceThrottle(`profile:cover:${auth.sub}`, TEN_MIN, 'cover');
    if (err) return err;
  }
  try {
  const updated = await prisma.user.update({ where: { id: auth.sub }, data: { displayName, avatarUrl, ...(bio !== undefined ? { bio } : {}), ...(handle !== undefined ? { handle } : {}), ...(coverUrl !== undefined ? { coverUrl } : {}), } as any });
    audit({ userId: auth.sub, action: 'PROFILE_UPDATE', entityType: 'USER', entityId: auth.sub, metadata: { displayNameChanged: true, avatarUpdated: !!avatarUrl, bioUpdated: !!bio, handleUpdated: !!handle, coverUpdated: !!coverUrl } });
    return NextResponse.json({ id: updated.id });
  } catch (e:any) {
    // Unique handle constraint
    return NextResponse.json({ error: 'Handle indisponibil' }, { status: 400 });
  }
}