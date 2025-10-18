#!/usr/bin/env ts-node
/**
 * Cleanup old audit events.
 * Usage: ts-node scripts/cleanupAudit.ts [--days 90] [--dry-run]
 */
import prisma from '../lib/prisma';

async function main() {
  const args = process.argv.slice(2);
  let days = 90;
  let dry = false;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--days' && args[i+1]) { days = parseInt(args[i+1], 10); i++; }
    else if (args[i] === '--dry-run') dry = true;
  }
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const count = await prisma.auditEvent.count({ where: { createdAt: { lt: cutoff } } });
  if (dry) {
    console.log(`[DRY RUN] Would delete ${count} audit events older than ${days} days (before ${cutoff.toISOString()})`);
    return;
  }
  const del = await prisma.auditEvent.deleteMany({ where: { createdAt: { lt: cutoff } } });
  console.log(`Deleted ${del.count} audit events older than ${days} days.`);
}

main().catch(e => { console.error(e); process.exit(1); }).finally(async () => { await prisma.$disconnect(); });
