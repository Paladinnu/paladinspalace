import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function parseEmailArg(): string {
  const argv = process.argv.slice(2);
  const emailFlagIdx = argv.findIndex((a) => a === '--email');
  if (emailFlagIdx >= 0 && argv[emailFlagIdx + 1]) return argv[emailFlagIdx + 1];
  const emailKV = argv.find((a) => a.startsWith('--email='));
  if (emailKV) return emailKV.split('=')[1];
  if (argv[0]) return argv[0];
  const envEmail = process.env.EMAIL || process.env.USER_EMAIL;
  if (envEmail) return envEmail;
  throw new Error('Usage: ts-node scripts/checkUser.ts --email user@example.com');
}

async function main() {
  const email = parseEmailArg().trim().toLowerCase();
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    console.error(`[checkUser] User not found: ${email}`);
    process.exitCode = 1;
    return;
  }
  console.log('[checkUser] User:', {
    id: user.id,
    email: user.email,
    role: user.role,
    status: user.status,
    verified: user.verified,
  });
}

main()
  .catch((err) => {
    console.error('[checkUser] Error:', err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
