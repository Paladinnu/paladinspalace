import { prisma } from '../lib/listings';
import fs from 'fs/promises';

/*
  Migration script: converts legacy Listing.imagesJson (array of strings)
  into array of objects { original, thumb? } if not already migrated.
*/
async function main() {
  const listings = await prisma.listing.findMany({ select: { id: true, imagesJson: true } });
  let converted = 0;
  for (const l of listings) {
    let parsed: any;
    try { parsed = JSON.parse(l.imagesJson || '[]'); } catch { continue; }
    if (!Array.isArray(parsed) || !parsed.length) continue;
    if (typeof parsed[0] === 'object' && parsed[0] && parsed[0].original) continue; // already migrated
    if (typeof parsed[0] === 'string') {
      const objs = parsed.map((p: string) => ({ original: p, thumb: p.replace(/\.(png|jpg|jpeg|webp)$/i, '_thumb.webp') }));
      await prisma.listing.update({ where: { id: l.id }, data: { imagesJson: JSON.stringify(objs) } });
      converted++;
    }
  }
  console.log(`Converted ${converted} listings.`);
}

main().then(()=>process.exit(0)).catch(e=>{ console.error(e); process.exit(1); });
