import { prisma } from '../lib/listings';
import fs from 'fs/promises';
import path from 'path';

/*
  This script scans the public/uploads/listings directory and removes files
  (originals + thumbnails) that are not referenced by any Listing.imagesJson.
  Safety features:
    - Only touches files with pattern /^[a-f0-9]{16}(?:_thumb)?\.(?:png|jpg|jpeg|webp)$/
    - Dry-run mode by default; pass --apply to actually delete.
*/

async function main() {
  const apply = process.argv.includes('--apply');
  const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'listings');
  let existing: string[] = [];
  try {
    existing = await fs.readdir(uploadDir);
  } catch (e) {
    console.error('Cannot read directory', uploadDir);
    return;
  }
  const filePattern = /^[a-f0-9]{16}(?:_thumb)?\.(png|jpg|jpeg|webp)$/;
  const candidateFiles = existing.filter(f => filePattern.test(f));

  const listings = await prisma.listing.findMany({ select: { imagesJson: true } });
  const referenced = new Set<string>();
  for (const l of listings) {
    try {
      const arr: string[] = JSON.parse(l.imagesJson || '[]');
      for (const rel of arr) {
        if (typeof rel === 'string') {
          const base = path.basename(rel);
          referenced.add(base);
          // thumbnail naming convention
          const thumb = base.replace(/\.(png|jpg|jpeg|webp)$/i, '_thumb.webp');
            referenced.add(thumb);
        }
      }
    } catch {}
  }

  const orphans = candidateFiles.filter(f => !referenced.has(f));
  if (!orphans.length) {
    console.log('No orphan images.');
    return;
  }
  if (!apply) {
    console.log('Orphan images (dry-run):');
    orphans.forEach(o => console.log('  ', o));
    console.log(`Run with --apply to delete (${orphans.length}) files.`);
    return;
  }
  for (const f of orphans) {
    try {
      await fs.unlink(path.join(uploadDir, f));
      console.log('Deleted', f);
    } catch (e) {
      console.warn('Failed to delete', f, (e as Error).message);
    }
  }
  console.log('Cleanup complete.');
}

main().then(()=>process.exit(0)).catch(e=>{ console.error(e); process.exit(1); });
