import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { getToken } from 'next-auth/jwt';
import sharp from 'sharp';
import { rateLimit } from '../../../lib/rateLimit';
import { sniffImageMime } from '../../../lib/mimeSniff';
import { ERR } from '../../../lib/errors';
import prisma from '../../../lib/prisma';
import { moderateImage } from '../../../lib/moderation';

export const runtime = 'nodejs';

async function requireApproved(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token || (token as any).status !== 'APPROVED') return null;
  return token;
}

const MAX_FILE_SIZE = 3 * 1024 * 1024; // 3MB
const ALLOWED_MIME = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];

export async function POST(req: NextRequest) {
  const token = await requireApproved(req);
  if (!token) return ERR.UNAUTHORIZED();
  try {
    const rl = await rateLimit({ key: `listingUpload:${(token as any).sub}`, limit: 15, windowMs: 10 * 60 * 1000 });
    if (!rl.allowed) return ERR.RATE_LIMIT(600); // 10 min window

    const formData = await req.formData();
    const file = formData.get('file');
  if (!file || !(file instanceof File)) return ERR.INVALID_INPUT({ field: 'file', message: 'Missing file' });
  if (file.size > MAX_FILE_SIZE) return ERR.INVALID_INPUT({ field: 'file', message: 'Fisier prea mare (max 3MB)' });
  const origBuffer = Buffer.from(await file.arrayBuffer());
  const sniff = sniffImageMime(new Uint8Array(origBuffer.subarray(0, 32)));
  if (!sniff.mime || !ALLOWED_MIME.includes(sniff.mime)) return ERR.INVALID_INPUT({ field: 'file', message: 'Tip fisier invalid' });

  // NSFW moderation
  const mod = await moderateImage(origBuffer, sniff.mime);
  if (!mod.allowed) {
    return ERR.INVALID_INPUT({ field: 'file', message: 'Imagine respinsă de moderare (conținut nepotrivit)', code: 'NSFW', details: { score: mod.score, reason: mod.reason } });
  }
    // Compute SHA256 hash for deduplication
  // Cast to any to satisfy TS BinaryLike typing mismatch in some environments
  const hash = crypto.createHash('sha256').update(origBuffer as any).digest('hex');
    // Attempt to find existing asset
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

    await fs.writeFile(originalPath, new Uint8Array(origBuffer));
    let thumbGenerated = false;
    try {
      await sharp(origBuffer).resize({ width: 400, withoutEnlargement: true }).webp({ quality: 80 }).toFile(thumbPath);
      thumbGenerated = true;
    } catch (e) {
      console.warn('Thumbnail generation failed', e);
    }
    // Attempt to extract dimensions (non-fatal) & blur placeholder
    let meta: any = {};
    let blurDataURL: string | null = null;
    try {
      meta = await sharp(origBuffer).metadata();
      const blur = await sharp(origBuffer)
        .resize({ width: 16 })
        .webp({ quality: 30 })
        .toBuffer();
      blurDataURL = `data:image/webp;base64,${blur.toString('base64')}`;
    } catch {}

    // Persist asset record (best-effort; ignore if fails after file write)
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
    } catch (e) {
      console.warn('Failed to persist ImageAsset', e);
    }

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
  } catch (e: any) {
    return ERR.SERVER_ERROR();
  }
}
