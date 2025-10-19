import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { promises as fs } from 'fs';
import path from 'path';
import sharp from 'sharp';
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
    const rl = await rateLimit({ key: `cover:${token.sub}`, limit: LIMIT, windowMs: WINDOW_MS });
    if (!rl.allowed) return ERR.RATE_LIMIT(Math.ceil(WINDOW_MS/1000));

    const formData = await req.formData();
    const file = formData.get('file');
    if (!file || typeof file === 'string') return ERR.INVALID_INPUT({ field: 'file', message: 'Lipseste fisierul' });
    const blob = file as unknown as File;
    const arrayBuffer = await blob.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const sniff = sniffImageMime(new Uint8Array(buffer.subarray(0, 32)));
    if (!sniff.mime) return ERR.INVALID_INPUT({ field: 'file', message: 'Format necunoscut' });
    if (buffer.length > 5 * 1024 * 1024) return ERR.INVALID_INPUT({ field: 'file', message: 'Fisier prea mare (max 5MB)' });
    const allowed = ['image/png', 'image/jpeg', 'image/webp'];
    // @ts-ignore
    if (!allowed.includes(sniff.mime)) return ERR.INVALID_INPUT({ field: 'file', message: 'Tip fisier invalid' });

    // NSFW moderation for covers
    const mod = await moderateImage(buffer, sniff.mime);
    if (!mod.allowed) {
      return ERR.INVALID_INPUT({ field: 'file', message: 'Imagine cover respinsă de moderare', code: 'NSFW', details: { score: mod.score, reason: mod.reason } });
    }

    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'covers');
    await fs.mkdir(uploadDir, { recursive: true });
    const fileName = `cover_${token.sub}_${Date.now()}.jpg`;
    const fullPath = path.join(uploadDir, fileName);

    // Auto-crop/resize to 1120x255, cover fit, center gravity
    await sharp(buffer)
      .resize(1120, 255, { fit: 'cover', position: 'centre' })
      .jpeg({ quality: 82 })
      .toFile(fullPath);

    const publicPath = `/uploads/covers/${fileName}`;

    // Delete previous cover if it's under our covers directory to avoid orphans
    const user = await prisma.user.findUnique({ where: { id: token.sub as string }, select: { coverUrl: true } as any }) as any;
    if (user?.coverUrl && user.coverUrl.startsWith('/uploads/covers/') && user.coverUrl !== publicPath) {
      const oldPath = path.join(process.cwd(), 'public', user.coverUrl as string);
      fs.unlink(oldPath).catch(()=>{});
    }

    await prisma.user.update({ where: { id: token.sub as string }, data: { coverUrl: publicPath } as any });
    return NextResponse.json({ coverUrl: publicPath });
  } catch (e:any) {
    return ERR.SERVER_ERROR();
  }
}
