import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import prisma from '../../../lib/prisma';
import { ERR, respondError } from '../../../lib/errors';

// GET /api/ratings?sellerId=... -> { avg, count, recent: [{score, comment, rater:{id,displayName}, createdAt}] }
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const sellerId = searchParams.get('sellerId');
  if (!sellerId) return ERR.INVALID_INPUT({ sellerId: 'required' });
  try {
    const p: any = prisma as any;
    const [agg, recent] = await Promise.all([
      p.rating.aggregate({ where: { sellerId }, _avg: { score: true }, _count: { _all: true } }),
      p.rating.findMany({ where: { sellerId }, include: { rater: { select: { id: true, displayName: true, avatarUrl: true } } }, orderBy: { createdAt: 'desc' }, take: 10 })
    ]);
    return NextResponse.json({ avg: agg._avg.score || 0, count: agg._count._all || 0, recent: (recent as any[]).map((r: any) => ({ id: r.id, score: r.score, comment: r.comment || null, createdAt: r.createdAt, rater: r.rater })) });
  } catch {
    return ERR.SERVER_ERROR();
  }
}

// POST /api/ratings -> { sellerId, score, comment? }
export async function POST(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token) return ERR.UNAUTHORIZED();
  const userId = (token as any).sub as string;
  try {
    const body = await req.json();
    const { sellerId, score, comment } = body || {};
    if (!sellerId || typeof score !== 'number') return ERR.INVALID_INPUT({ sellerId: 'required', score: 'required' });
    if (sellerId === userId) return respondError('SELF_RATING_FORBIDDEN', 'Nu poți să-ți dai rating singur.', 400);
    const s = Math.max(1, Math.min(5, Math.floor(score)));
    // Upsert to allow updating your rating later
  const p: any = prisma as any;
  const created = await p.rating.upsert({
      where: { sellerId_raterId: { sellerId, raterId: userId } },
      update: { score: s, comment: comment || null },
      create: { sellerId, raterId: userId, score: s, comment: comment || null }
    });
    return NextResponse.json({ id: created.id });
  } catch {
    return ERR.SERVER_ERROR();
  }
}
