import { NextRequest, NextResponse } from 'next/server';
import prisma from '../../../../lib/prisma';
import { rateLimit } from '../../../../lib/rateLimit';
import crypto from 'crypto';

export async function POST(req: NextRequest) {
  const { email } = await req.json();
  if (!email || typeof email !== 'string') return NextResponse.json({ error: 'Email invalid' }, { status: 400 });
  const normalized = email.toLowerCase().trim();

  // Rate limit by email
  const rl = await rateLimit({ key: `pwreset:req:${normalized}`, limit: 5, windowMs: 60 * 60 * 1000 });
  if (!rl.allowed) return NextResponse.json({ error: 'Prea multe încercări. Încearcă mai târziu.' }, { status: 429 });

  // Create a token if user exists (do not reveal existence)
  const user = await prisma.user.findUnique({ where: { email: normalized } });
  if (user) {
    const token = crypto.randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 60 * 60 * 1000); // 1h
    // Store token in VerificationToken (identifier = email)
    await prisma.verificationToken.create({ data: { identifier: normalized, token, expires } });
    // In production, send email/Discord DM. For now, log to server and return generic message.
    console.log(`[reset-request] email=${normalized} token=${token}`);
  }
  return NextResponse.json({ ok: true });
}
