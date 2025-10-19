import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import prisma from '../../../../lib/prisma';
import { sendDiscordWebhook } from '../../../../lib/discord';

export async function POST(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token || !['MODERATOR','ADMIN'].includes((token as any).role)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const { userId } = await req.json();
    const user = await prisma.user.update({ where: { id: userId }, data: { status: 'APPROVED' } });
    sendDiscordWebhook(`🟢 Utilizator aprobat: ${user.displayName} (${user.email})`).catch(()=>{});
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Eroare' }, { status: 400 });
  }
}