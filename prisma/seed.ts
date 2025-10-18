import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { buildListingSearchIndex } from '../lib/search';

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash('moderat0r!', 10);
  const existing = await prisma.user.findFirst({ where: { email: 'moderator@local.test' } });
  let moderator = existing;
  if (!moderator) {
    moderator = await prisma.user.create({
      data: {
        email: 'moderator@local.test',
        passwordHash,
        displayName: 'Moderator',
        fullNameIC: 'Moderator IC',
        inGameId: 12345,
        phoneIC: '0712345678',
        role: 'MODERATOR',
        status: 'APPROVED',
        accessUntil: null,
        premiumUntil: null,
      } as any
    });
  }

  // Sample listings (idempotent-ish: only add if none exist for this user)
  const listingCount = await prisma.listing.count({ where: { sellerId: moderator!.id } });
  if (listingCount === 0) {
    const samples = [
      { title: 'Sabie legendara', description: 'Sabie veche, foarte rara, aproape noua.', price: 5000, category: 'arme' },
      { title: 'Lamborghini Huracan', description: 'Supercar impecabil, 150m.', price: 150000000, category: 'masini' },
  { title: 'Pachet cannabis', description: '100g cannabis de calitate.', price: 9000, category: 'droguri' }
    ];
    for (const s of samples) {
      await prisma.listing.create({
        data: {
          title: s.title,
          description: s.description,
          price: s.price,
          category: s.category,
          imagesJson: '[]',
          searchIndex: buildListingSearchIndex(s.title, s.description),
          sellerId: moderator!.id
        }
      });
    }
  }
  console.log('Seed completed');
}

main().catch(e => {
  console.error(e);
  process.exit(1);
}).finally(async () => {
  await prisma.$disconnect();
});
