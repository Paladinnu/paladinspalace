import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import prisma from '../../../../lib/prisma';
import { ERR } from '../../../../lib/errors';

// Simple in-memory cache (per build/runtime instance)
let cache: { ts: number; data: any } | null = null;
const TTL_MS = 60_000; // 1 minute

export async function GET(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token || !['MODERATOR','ADMIN'].includes((token as any).role)) return ERR.UNAUTHORIZED();
  if (cache && Date.now() - cache.ts < TTL_MS) {
    return NextResponse.json(cache.data);
  }
  // Distinct actions & entityTypes (limited)
  const actions = await prisma.auditEvent.findMany({ distinct: ['action'], select: { action: true }, take: 200, orderBy: { action: 'asc' } });
  const entityTypes = await prisma.auditEvent.findMany({ distinct: ['entityType'], select: { entityType: true }, where: { NOT: { entityType: null } }, take: 50, orderBy: { entityType: 'asc' } });
  const data = {
    actions: actions.map((a: { action: string }) => a.action).filter(Boolean),
    entityTypes: entityTypes.map((e: { entityType: string | null }) => e.entityType).filter(Boolean)
  };
  cache = { ts: Date.now(), data };
  return NextResponse.json(data);
}
