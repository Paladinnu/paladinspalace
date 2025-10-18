import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import prisma from '../../../../lib/prisma';

async function requireModerator(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token) throw new Error('Unauthorized');
  if ((token as any).role !== 'MODERATOR' && (token as any).role !== 'ADMIN') throw new Error('Forbidden');
  return token.sub as string;
}

export async function GET(req: NextRequest) {
  try {
    await requireModerator(req);
    const users = await prisma.user.findMany({ where: { status: 'PENDING' }, orderBy: { createdAt: 'asc' }, include: { accounts: true } });
    return NextResponse.json(users.map((u: any) => ({
      id: u.id,
      email: u.email,
      displayName: u.displayName,
      createdAt: u.createdAt,
      fullNameIC: u.fullNameIC ?? null,
      phoneIC: u.phoneIC ?? null,
      inGameId: u.inGameId ?? null,
      discordLinked: !!u.accounts.find((a: any) => a.provider === 'discord'),
      discordTag: u.discordTag ?? null
    })));
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 401 });
  }
}

export async function POST(req: NextRequest) { // approve/suspend
  try {
    await requireModerator(req);
    const body = await req.json();
    const { userId, action } = body;
    if (!userId || !['approve','suspend'].includes(action)) return NextResponse.json({ error: 'Date invalide' }, { status: 400 });
    const status = action === 'approve' ? 'APPROVED' : 'SUSPENDED';
  const user = await prisma.user.update({ where: { id: userId }, data: { status } });
    return NextResponse.json({ id: user.id, status: user.status });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 401 });
  }
}
