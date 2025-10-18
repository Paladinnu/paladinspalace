import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { sendDiscordWebhook } from '../../../../lib/discord';

export async function GET(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token || !['ADMIN','MODERATOR'].includes((token as any).role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const ok = await sendDiscordWebhook(`Test webhook ${new Date().toISOString()}`);
  return NextResponse.json({ ok });
}