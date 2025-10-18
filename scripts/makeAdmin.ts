import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function parseEmailArg(): string {
  const argv = process.argv.slice(2);
  const flagIdx = argv.findIndex(a => a === '--email');
  if (flagIdx >= 0 && argv[flagIdx + 1]) return argv[flagIdx + 1];
  const kv = argv.find(a => a.startsWith('--email='));
  if (kv) return kv.split('=')[1];
  if (argv[0]) return argv[0];
  const envEmail = process.env.EMAIL || process.env.USER_EMAIL;
  if (envEmail) return envEmail;
  throw new Error('Usage: ts-node scripts/makeAdmin.ts --email user@example.com');
}

async function main() {
  const email = parseEmailArg().trim().toLowerCase();
  console.log(`[makeAdmin] Promoting ${email} to ADMIN...`);
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) { console.error(`[makeAdmin] User not found: ${email}`); process.exitCode = 1; return; }
  const updated = await prisma.user.update({ where: { id: user.id }, data: { role: 'ADMIN', status: 'APPROVED' } });
  console.log('[makeAdmin] Success:', { id: updated.id, email: updated.email, role: updated.role, status: updated.status });
}

main().catch(err => { console.error('[makeAdmin] Error:', err); process.exitCode = 1; }).finally(async ()=> { await prisma.$disconnect(); });
