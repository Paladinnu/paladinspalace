import { NextRequest, NextResponse } from 'next/server';
import prisma from '../../../lib/prisma';
import { rateLimit } from '../../../lib/rateLimit';

export const runtime = 'nodejs';

// Basic in-memory marker for cache provider detection
let lastHealth: any = null;

export async function GET(_req: NextRequest) {
  const started = Date.now();
  const result: any = {
    version: process.env.npm_package_version || '0.0.0',
    timestamp: new Date().toISOString(),
    db: { ok: false },
    cache: { ok: true, provider: 'memory' },
    uptimeSec: Math.floor(process.uptime())
  };
  try {
    // Simple DB ping: lightweight query
    await prisma.$queryRaw`SELECT 1`; // supported by sqlite
    result.db.ok = true;
  } catch (e: any) {
    result.db.error = e.message;
  }
  // Try a rateLimit call with a temp key to infer redis availability
  try {
    const rl = await rateLimit({ key: 'healthprobe', limit: 1, windowMs: 1000 });
    if ((rl as any).backend === 'redis') {
      result.cache.provider = 'redis';
    }
  } catch (e: any) {
    result.cache.ok = false;
    result.cache.error = e.message;
  }
  result.latencyMs = Date.now() - started;
  return NextResponse.json(result, { status: result.db.ok ? 200 : 500 });
}
