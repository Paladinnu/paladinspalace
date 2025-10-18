import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function parseEmailArg(): string {
  const argv = process.argv.slice(2);
  // Supports: --email foo@bar.com OR positional first arg
  const emailFlagIdx = argv.findIndex((a) => a === '--email');
  if (emailFlagIdx >= 0 && argv[emailFlagIdx + 1]) return argv[emailFlagIdx + 1];
  const emailKV = argv.find((a) => a.startsWith('--email='));
  if (emailKV) return emailKV.split('=')[1];
  if (argv[0]) return argv[0];
  const envEmail = process.env.EMAIL || process.env.USER_EMAIL;
  if (envEmail) return envEmail;
  throw new Error('Usage: ts-node scripts/promoteUser.ts --email user@example.com');
}

async function main() {
  const email = parseEmailArg().trim().toLowerCase();
  console.log(`[promoteUser] Promoting ${email} to MODERATOR...`);

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    console.error(`[promoteUser] User not found: ${email}`);
    process.exitCode = 1;
    return;
  }

  // Update role and status. Do not auto-verify; that remains a moderator action.
  const updated = await prisma.user.update({
    where: { id: user.id },
    data: {
      role: 'MODERATOR',
      status: 'APPROVED',
    },
  });

  console.log('[promoteUser] Success:', {
    id: updated.id,
    email: updated.email,
    role: updated.role,
    status: updated.status,
  });
}

main()
  .catch((err) => {
    console.error('[promoteUser] Error:', err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
