import { NextRequest, NextResponse } from 'next/server';
import prisma from '../../../../lib/prisma';
import bcrypt from 'bcryptjs';

export async function POST(req: NextRequest) {
  const { token, password } = await req.json();
  if (!token || typeof token !== 'string') return NextResponse.json({ error: 'Token invalid' }, { status: 400 });
  if (!password || typeof password !== 'string' || password.length < 8) return NextResponse.json({ error: 'Parolă invalidă' }, { status: 400 });

  // Lookup token
  const vt = await prisma.verificationToken.findFirst({ where: { token } });
  if (!vt || vt.expires < new Date()) {
    return NextResponse.json({ error: 'Link de resetare invalid sau expirat' }, { status: 400 });
  }
  const email = vt.identifier;
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    // Clean token anyway
    try { await prisma.verificationToken.deleteMany({ where: { token } }); } catch {}
    return NextResponse.json({ error: 'Utilizator inexistent' }, { status: 400 });
  }

  const hash = await bcrypt.hash(password, 10);
  await prisma.user.update({ where: { id: user.id }, data: { passwordHash: hash } });
  // Invalidate token after use
  await prisma.verificationToken.deleteMany({ where: { token } });

  return NextResponse.json({ ok: true });
}
