import { NextRequest, NextResponse } from 'next/server';
import prisma from '../../../../lib/prisma';
import { getToken } from 'next-auth/jwt';

async function requireModerator(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token) throw new Error('Unauthorized');
  const role = (token as any).role;
  if (role !== 'MODERATOR' && role !== 'ADMIN') throw new Error('Forbidden');
  return token;
}

export async function GET(req: NextRequest, { params }: { params: { listingId: string } }) {
  try {
    await requireModerator(req);
    const { listingId } = params;
    const snapshot = await (prisma as any).listingSnapshot.findFirst({
      where: { listingId },
      orderBy: { createdAt: 'desc' }
    });
    if (!snapshot) return NextResponse.json({ error: 'Nu există arhivă pentru acest anunț' }, { status: 404 });
    return NextResponse.json({ id: snapshot.id, listingId: snapshot.listingId, sellerId: snapshot.sellerId, createdAt: snapshot.createdAt, reason: snapshot.reason || null, data: JSON.parse(snapshot.data) });
  } catch (e: any) {
    const code = e.message === 'Forbidden' ? 403 : 401;
    return NextResponse.json({ error: e.message }, { status: code });
  }
}
