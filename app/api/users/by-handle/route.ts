import { NextRequest, NextResponse } from 'next/server';
import prisma from '../../../../lib/prisma';

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const handle = (url.searchParams.get('handle') || '').trim();
  if (!handle || !/^@[a-z0-9]{2,20}$/.test(handle)) return NextResponse.json({ error: 'Handle invalid' }, { status: 400 });
  const h = handle.startsWith('@') ? handle.slice(1) : handle;
  try {
    const user = await prisma.user.findFirst({ where: { handle: `@${h}` } as any });
    if (!user) return NextResponse.json({ error: 'Nu s-a găsit utilizatorul' }, { status: 404 });
    return NextResponse.json({ id: user.id, displayName: user.displayName, avatarUrl: (user as any).avatarUrl || null, coverUrl: (user as any).coverUrl || null, bio: (user as any).bio || '' });
  } catch {
    return NextResponse.json({ error: 'Eroare server' }, { status: 500 });
  }
}
