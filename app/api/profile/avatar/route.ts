import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { promises as fs } from 'fs';
import path from 'path';
import prisma from '../../../../lib/prisma';
import { rateLimit } from '../../../../lib/rateLimit';
import { sniffImageMime } from '../../../../lib/mimeSniff';
import { ERR } from '../../../../lib/errors';
import { moderateImage } from '../../../../lib/moderation';

const LIMIT = 5;
const WINDOW_MS = 10 * 60 * 1000; // 10 minutes

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token) return ERR.UNAUTHORIZED();
  try {
    // Rate limiting (Redis or memory fallback)
    const rl = await rateLimit({ key: `avatar:${token.sub}`, limit: LIMIT, windowMs: WINDOW_MS });
    if (!rl.allowed) {
      return ERR.RATE_LIMIT(Math.ceil((WINDOW_MS/1000))); // coarse retry hint
    }

    const formData = await req.formData();
    const file = formData.get('file');
  if (!file || typeof file === 'string') return ERR.INVALID_INPUT({ field: 'file', message: 'Lipseste fisierul' });
    const blob = file as unknown as File;
  const arrayBuffer = await blob.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const sniff = sniffImageMime(new Uint8Array(buffer.subarray(0, 32)));
  if (!sniff.mime) return ERR.INVALID_INPUT({ field: 'file', message: 'Format necunoscut' });
    if (buffer.length > 2 * 1024 * 1024) { // 2MB
      return ERR.INVALID_INPUT({ field: 'file', message: 'Fisier prea mare (max 2MB)' });
    }
  const allowed = ['image/png', 'image/jpeg', 'image/webp'];
  // @ts-ignore
  if (!allowed.includes(sniff.mime)) return ERR.INVALID_INPUT({ field: 'file', message: 'Tip fisier invalid' });

    // NSFW moderation for avatars
    const mod = await moderateImage(buffer, sniff.mime);
    if (!mod.allowed) {
      return ERR.INVALID_INPUT({ field: 'file', message: 'Imagine avatar respinsă de moderare', code: 'NSFW', details: { score: mod.score, reason: mod.reason } });
    }
  const ext = sniff.mime === 'image/png' ? 'png' : sniff.mime === 'image/webp' ? 'webp' : 'jpg';
    const fileName = `avatar_${token.sub}_${Date.now()}.${ext}`;
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'avatars');
    await fs.mkdir(uploadDir, { recursive: true });
    const fullPath = path.join(uploadDir, fileName);
  await fs.writeFile(fullPath, new Uint8Array(buffer));
    const publicPath = `/uploads/avatars/${fileName}`;
    // Delete old avatar if exists and different
    const user = await prisma.user.findUnique({ where: { id: token.sub as string }, select: { avatarUrl: true } });
    if (user?.avatarUrl && user.avatarUrl.startsWith('/uploads/avatars/') && user.avatarUrl !== publicPath) {
      const oldPath = path.join(process.cwd(), 'public', user.avatarUrl);
      fs.unlink(oldPath).catch(()=>{});
    }
    await prisma.user.update({ where: { id: token.sub as string }, data: { avatarUrl: publicPath } });
    return NextResponse.json({ avatarUrl: publicPath });
  } catch (e: any) {
    return ERR.SERVER_ERROR();
  }
}