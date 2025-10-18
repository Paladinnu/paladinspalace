import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import prisma from '../../../../lib/prisma';

async function requireAdmin(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token || (token as any).role !== 'ADMIN') return null;
  return token as any;
}

export async function GET(req: NextRequest) {
  const admin = await requireAdmin(req);
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get('q') || '').trim().toLowerCase();
  const take = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)));
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
  const sort = (searchParams.get('sort') || 'createdAt') as 'createdAt'|'role'|'status'|'verified'|'email'|'displayName';
  const dir = ((searchParams.get('dir') || 'desc').toLowerCase() === 'asc' ? 'asc' : 'desc') as 'asc'|'desc';
  const where: any = {};
  if (q) {
    const maybeNum = Number(q);
    where.OR = [
      { email: { contains: q } },
      { displayName: { contains: q } },
      { handle: { contains: q } },
      { id: q.length > 6 ? { contains: q } : undefined },
      { fullNameIC: { contains: q } },
      { phoneIC: { contains: q } },
      ...(Number.isFinite(maybeNum) ? [{ inGameId: maybeNum }] as any : [])
    ].filter(Boolean);
  }
  const orderBy = (() => {
    switch (sort) {
      case 'role': return { role: dir } as const;
      case 'status': return { status: dir } as const;
      case 'verified': return { verified: dir } as const;
      case 'email': return { email: dir } as const;
      case 'displayName': return { displayName: dir } as const;
      default: return { createdAt: dir } as const;
    }
  })();
  const [total, users] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({ where, take, skip: (page - 1) * take, orderBy, include: { accounts: true } })
  ]);
  const totalPages = Math.max(1, Math.ceil(total / take));
  const shaped = users.map(u => ({
    id: u.id,
    email: u.email,
    displayName: u.displayName,
    handle: (u as any).handle,
    role: u.role,
    status: u.status,
    verified: u.verified,
    createdAt: u.createdAt,
    avatarUrl: u.avatarUrl,
    coverUrl: u.coverUrl,
    fullNameIC: u.fullNameIC,
    phoneIC: u.phoneIC,
    inGameId: u.inGameId,
    discordTag: (u as any).discordTag,
    hasDiscord: !!u.accounts.find(a => a.provider === 'discord')
  }));
  return NextResponse.json({ users: shaped, page, total, totalPages });
}

export async function PATCH(req: NextRequest) {
  const admin = await requireAdmin(req);
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const body = await req.json();
    const { userId, role, status, verified, email, displayName, avatarUrl, coverUrl, fullNameIC, phoneIC, inGameId } = body as {
      userId: string;
      role?: string;
      status?: string;
      verified?: boolean;
      email?: string;
      displayName?: string;
      avatarUrl?: string | null;
      coverUrl?: string | null;
      fullNameIC?: string | null;
      phoneIC?: string | null;
      inGameId?: number | null;
    };
    if (!userId) return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
    const data: any = {};
    if (role && ['USER','MODERATOR','ADMIN'].includes(role)) data.role = role;
    if (status && ['PENDING','APPROVED','SUSPENDED'].includes(status)) data.status = status;
    if (typeof verified === 'boolean') data.verified = verified;
    if (typeof displayName === 'string' && displayName.trim()) data.displayName = displayName.trim();
    if (typeof email === 'string') {
      const em = email.trim().toLowerCase();
      const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em);
      if (!valid) return NextResponse.json({ error: 'Email invalid' }, { status: 400 });
      data.email = em;
    }
    if (typeof avatarUrl !== 'undefined') data.avatarUrl = avatarUrl || null;
    if (typeof coverUrl !== 'undefined') data.coverUrl = coverUrl || null;
    if (typeof fullNameIC !== 'undefined') data.fullNameIC = (fullNameIC || '').trim() || null;
    if (typeof phoneIC !== 'undefined') data.phoneIC = (phoneIC || '').trim() || null;
    if (typeof inGameId !== 'undefined') {
      if (inGameId === null) data.inGameId = null; else {
        const num = Number(inGameId);
        if (!Number.isInteger(num) || num < 1 || num > 200000) return NextResponse.json({ error: 'inGameId trebuie 1..200000' }, { status: 400 });
        data.inGameId = num;
      }
    }
    if (!Object.keys(data).length) return NextResponse.json({ error: 'No valid fields' }, { status: 400 });
    try {
      const updated = await prisma.user.update({ where: { id: userId }, data });
      return NextResponse.json({ ok: true, user: updated });
    } catch (e: any) {
      // Handle unique constraint errors (e.g., email, handle)
      const msg = String(e?.message || '');
      if (msg.includes('Unique constraint failed') || msg.toLowerCase().includes('unique')) {
        return NextResponse.json({ error: 'Email deja folosit' }, { status: 409 });
      }
      throw e;
    }
  } catch (e: any) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const admin = await requireAdmin(req);
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const body = await req.json();
    const { action, userId } = body as { action: 'unlinkDiscord'|'ban'|'suspend7'|'deleteAccount'; userId: string };
    if (!userId || !action) return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    if (action === 'unlinkDiscord') {
      await prisma.account.deleteMany({ where: { userId, provider: 'discord' } });
      await prisma.user.update({ where: { id: userId }, data: { discordTag: null } as any });
      return NextResponse.json({ ok: true });
    }
    if (action === 'ban') {
      await prisma.user.update({ where: { id: userId }, data: { status: 'SUSPENDED' } });
      return NextResponse.json({ ok: true });
    }
    if (action === 'suspend7') {
      const until = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      await prisma.user.update({ where: { id: userId }, data: { status: 'SUSPENDED', accessUntil: until } });
      return NextResponse.json({ ok: true });
    }
    if (action === 'deleteAccount') {
      // Hard delete: remove all content associated with the user
      // Order matters due to FKs
      await prisma.session.deleteMany({ where: { userId } });
      await prisma.account.deleteMany({ where: { userId } });
      await prisma.ticketMessage.deleteMany({ where: { userId } });
      await prisma.ticket.deleteMany({ where: { userId } });
      await prisma.listingSnapshot.deleteMany({ where: { sellerId: userId } });
      await prisma.listing.deleteMany({ where: { sellerId: userId } });
      await prisma.auditEvent.deleteMany({ where: { userId } }).catch(()=>{});
      // Finally delete the user
      await prisma.user.delete({ where: { id: userId } });
      return NextResponse.json({ ok: true });
    }
    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (e: any) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
