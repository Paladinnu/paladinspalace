import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { getToken } from 'next-auth/jwt';
import sharp from 'sharp';
import { rateLimit } from '../../../../lib/rateLimit';
import { sniffImageMime } from '../../../../lib/mimeSniff';
import { ERR } from '../../../../lib/errors';
import prisma from '../../../../lib/prisma';
import { moderateImage } from '../../../../lib/moderation';

export const runtime = 'nodejs';

async function requireApproved(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token || (token as any).status !== 'APPROVED') return null;
  return token as any;
}

const MAX_FILE_SIZE = 3 * 1024 * 1024; // 3MB
const ALLOWED_MIME = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];

export async function POST(req: NextRequest) {
  const token = await requireApproved(req);
  if (!token) return ERR.UNAUTHORIZED();
  try {
    const rl = await rateLimit({ key: `listingUpload:${token.sub}`, limit: 15, windowMs: 10 * 60 * 1000 });
    if (!rl.allowed) return ERR.RATE_LIMIT(600);

    const { url } = await req.json().catch(() => ({ url: '' }));
    if (!url || typeof url !== 'string' || !/^https?:\/\//i.test(url)) {
      return ERR.INVALID_INPUT({ field: 'url', message: 'URL invalid' });
    }

    // Fetch the image server-side (no CORS). Limit size to 3MB.
    const r = await fetch(url);
    if (!r.ok) return ERR.INVALID_INPUT({ field: 'url', message: 'Nu am putut prelua imaginea' });
    const arrayBuf = await r.arrayBuffer();
    const buf = Buffer.from(arrayBuf);
    if (buf.length > MAX_FILE_SIZE) return ERR.INVALID_INPUT({ field: 'url', message: 'Fisier prea mare (max 3MB)' });

    const sniff = sniffImageMime(new Uint8Array(buf.subarray(0, 32)));
    if (!sniff.mime || !ALLOWED_MIME.includes(sniff.mime)) return ERR.INVALID_INPUT({ field: 'url', message: 'Tip fisier invalid' });

    // NSFW moderation
    const mod = await moderateImage(buf, sniff.mime);
    if (!mod.allowed) {
      return ERR.INVALID_INPUT({ field: 'url', message: 'Imagine respinsă de moderare (conținut nepotrivit)', code: 'NSFW', details: { score: mod.score, reason: mod.reason } });
    }

    const hash = crypto.createHash('sha256').update(buf as any).digest('hex');
    const existing = await prisma.imageAsset.findUnique({ where: { hash } }).catch(() => null);
    if (existing) {
      return NextResponse.json({
        image: {
          original: existing.original,
          thumb: existing.thumb || undefined,
          mime: existing.mime,
          width: existing.width || null,
          height: existing.height || null,
          blurDataURL: existing.blurDataURL || null,
          reused: true
        }
      });
    }

    const base = crypto.randomBytes(8).toString('hex');
    const ext = sniff.mime === 'image/png' ? 'png' : sniff.mime === 'image/webp' ? 'webp' : 'jpg';
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'listings');
    await fs.mkdir(uploadDir, { recursive: true });
    const originalName = `${base}.${ext}`;
    const thumbName = `${base}_thumb.webp`;
    const originalPath = path.join(uploadDir, originalName);
    const thumbPath = path.join(uploadDir, thumbName);

    await fs.writeFile(originalPath, new Uint8Array(buf));
    let thumbGenerated = false;
    try {
      await sharp(buf).resize({ width: 400, withoutEnlargement: true }).webp({ quality: 80 }).toFile(thumbPath);
      thumbGenerated = true;
    } catch {}

    let meta: any = {};
    let blurDataURL: string | null = null;
    try {
      meta = await sharp(buf).metadata();
      const blur = await sharp(buf).resize({ width: 16 }).webp({ quality: 30 }).toBuffer();
      blurDataURL = `data:image/webp;base64,${blur.toString('base64')}`;
    } catch {}

    try {
      await prisma.imageAsset.create({
        data: {
          hash,
          original: `/uploads/listings/${originalName}`,
          thumb: thumbGenerated ? `/uploads/listings/${thumbName}` : null,
          mime: sniff.mime!,
          width: meta.width || null,
          height: meta.height || null,
          blurDataURL
        }
      });
    } catch {}

    return NextResponse.json({
      image: {
        original: `/uploads/listings/${originalName}`,
        thumb: thumbGenerated ? `/uploads/listings/${thumbName}` : undefined,
        mime: sniff.mime,
        width: meta.width || null,
        height: meta.height || null,
        blurDataURL,
        reused: false
      }
    });
  } catch (e:any) {
    return ERR.SERVER_ERROR();
  }
}
