import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import prisma from '../../../../lib/prisma';

async function requireModerator(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token) throw new Error('Unauthorized');
  const role = (token as any).role;
  if (role !== 'MODERATOR' && role !== 'ADMIN') throw new Error('Forbidden');
  return token;
}

export async function GET(req: NextRequest) {
  try {
    await requireModerator(req);
    const url = new URL(req.url);
  const q = (url.searchParams.get('q') || '').trim();
  const status = url.searchParams.get('status') || undefined; // PENDING/APPROVED/SUSPENDED
    const role = url.searchParams.get('role') || undefined; // USER/MODERATOR/ADMIN
  const expiredOnly = url.searchParams.get('expired') === '1';
    const since = new Date();
    since.setMonth(since.getMonth() - 3);
    const where: any = {};
    if (status) where.status = status;
    if (role) where.role = role;
    if (q) {
      const isDigits = /^\d+$/.test(q);
      const or: any[] = [
        { id: { contains: q } },
        { displayName: { contains: q } },
        { fullNameIC: { contains: q } }
      ];
      if (isDigits) {
        const num = Number(q);
        or.push({ inGameId: num });
      }
      where.OR = or;
    }
    const users = await prisma.user.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        listings: {
          where: { createdAt: { gte: since } },
          orderBy: { createdAt: 'desc' }
        },
        accounts: true
      }
    });
    // Fetch snapshots for these users within the same window
    const userIds = users.map((u: any) => u.id);
    const snapshots = await (prisma as any).listingSnapshot.findMany({
      where: { sellerId: { in: userIds }, createdAt: { gte: since } },
      orderBy: { createdAt: 'desc' }
    });
    const snapsByUser: Record<string, any[]> = {};
    for (const s of snapshots) {
      (snapsByUser[s.sellerId] ||= []).push(s);
    }
    // If expiredOnly, filter in-memory to keep SQLite compat with Date comparisons in OR
    const now = new Date();
    const filtered = expiredOnly
      ? users.filter((u: any) => u.role === 'USER' && (!u.accessUntil || new Date(u.accessUntil) < now))
      : users;
    const data = filtered.map((u: any) => ({
      id: u.id,
      displayName: u.displayName,
      fullNameIC: u.fullNameIC ?? null,
      inGameId: u.inGameId ?? null,
      phoneIC: u.phoneIC ?? null,
      avatarUrl: u.avatarUrl ?? null,
      status: u.status,
      role: u.role,
  verified: (u as any).verified ?? false,
      createdAt: u.createdAt,
      updatedAt: u.updatedAt,
      accessUntil: u.accessUntil ?? null,
      premiumUntil: u.premiumUntil ?? null,
      discordLinked: !!u.accounts.find((a: any) => a.provider === 'discord'),
      discordId: u.accounts.find((a: any) => a.provider === 'discord')?.providerAccountId || null,
      discordTag: u.discordTag ?? null,
      listings: (
        [
          // active listings
          ...u.listings.map((l: any) => ({ id: l.id, title: l.title, createdAt: l.createdAt, category: l.category, price: l.price, isGold: !!l.isGold, deleted: false })),
          // deleted listings from snapshots
          ...((snapsByUser[u.id] || []).map((s: any) => {
            let payload: any = {};
            try { payload = JSON.parse(s.data || '{}'); } catch {}
            return { id: s.listingId, title: payload.title || '(fără titlu)', createdAt: s.createdAt, category: payload.category ?? null, price: payload.price ?? null, isGold: !!payload.isGold, deleted: true };
          }))
        ]
      ).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    }));
    return NextResponse.json(data);
  } catch (e: any) {
    const code = e.message === 'Forbidden' ? 403 : 401;
    return NextResponse.json({ error: e.message }, { status: code });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    await requireModerator(req);
    const body = await req.json().catch(() => ({}));
  const { userId, action, days, verified } = body as { userId?: string; action?: string; days?: number; verified?: boolean };
    if (!userId || !action) return NextResponse.json({ error: 'Date invalide' }, { status: 400 });
  if (!['revoke', 'extend', 'setPremium', 'removePremium', 'setVerified'].includes(action)) return NextResponse.json({ error: 'Acțiune invalidă' }, { status: 400 });
  const user = await prisma.user.findUnique({ where: { id: userId } }) as any;
    if (!user) return NextResponse.json({ error: 'Utilizator inexistent' }, { status: 404 });
    if (user.role === 'MODERATOR' || user.role === 'ADMIN') return NextResponse.json({ error: 'Nu poți modifica accesul moderatorilor/adminilor' }, { status: 403 });
    let data: any = {};
    const now = new Date();
    if (action === 'revoke') {
      data.accessUntil = new Date(now.getTime() - 1000); // set in past
    } else if (action === 'extend') {
      const addDays = typeof days === 'number' && days > 0 ? days : 30;
      const base = user.accessUntil && user.accessUntil > now ? user.accessUntil : now;
      data.accessUntil = new Date(base.getTime() + addDays * 24 * 60 * 60 * 1000);
    } else if (action === 'setPremium') {
      const addDays = typeof days === 'number' && days > 0 ? days : 30;
      const base = user.premiumUntil && user.premiumUntil > now ? user.premiumUntil : now;
      data.premiumUntil = new Date(base.getTime() + addDays * 24 * 60 * 60 * 1000);
    } else if (action === 'removePremium') {
      data.premiumUntil = null;
    } else if (action === 'setVerified') {
      data.verified = !!verified;
    }
  const updated = await prisma.user.update({ where: { id: userId }, data });
  return NextResponse.json({ id: updated.id, accessUntil: (updated as any).accessUntil, premiumUntil: (updated as any).premiumUntil, verified: (updated as any).verified });
  } catch (e: any) {
    const code = e.message === 'Forbidden' ? 403 : 401;
    return NextResponse.json({ error: e.message }, { status: code });
  }
}
