// Plain Node.js script to promote a user to MODERATOR
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

function getEmailArg() {
  const args = process.argv.slice(2);
  const idx = args.indexOf('--email');
  if (idx !== -1 && args[idx + 1]) return args[idx + 1];
  const kv = args.find((a) => a.startsWith('--email='));
  if (kv) return kv.split('=')[1];
  if (args[0]) return args[0];
  if (process.env.EMAIL) return process.env.EMAIL;
  throw new Error('Usage: node scripts/promoteUser.js --email user@example.com');
}

async function run() {
  const email = getEmailArg().trim().toLowerCase();
  console.log(`[promoteUser.js] Promoting ${email} to MODERATOR...`);
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    console.error('[promoteUser.js] User not found:', email);
    process.exitCode = 1;
    return;
  }
  const updated = await prisma.user.update({
    where: { id: user.id },
    data: { role: 'MODERATOR', status: 'APPROVED' },
  });
  console.log('[promoteUser.js] Success:', {
    id: updated.id,
    email: updated.email,
    role: updated.role,
    status: updated.status,
  });
}

run()
  .catch((e) => {
    console.error('[promoteUser.js] Error:', e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
