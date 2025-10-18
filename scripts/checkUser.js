// Plain Node.js script to print a user's role/status by email
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
  throw new Error('Usage: node scripts/checkUser.js --email user@example.com');
}

async function run() {
  const email = getEmailArg().trim().toLowerCase();
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    console.error('[checkUser.js] User not found:', email);
    process.exitCode = 1;
    return;
  }
  console.log('[checkUser.js] User:', {
    id: user.id,
    email: user.email,
    role: user.role,
    status: user.status,
    verified: user.verified,
  });
}

run()
  .catch((e) => {
    console.error('[checkUser.js] Error:', e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
