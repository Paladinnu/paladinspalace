import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import prisma from '../../../lib/prisma';
import { ERR } from '../../../lib/errors';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token || !['MODERATOR','ADMIN'].includes((token as any).role)) {
    return ERR.UNAUTHORIZED();
  }
  const { searchParams } = new URL(req.url);
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '50', 10)));
  const cursor = searchParams.get('cursor');
  const action = searchParams.get('action');
  const userId = searchParams.get('userId');
  const entityType = searchParams.get('entityType');

  const where: any = {};
  if (action) where.action = action;
  if (userId) where.userId = userId;
  if (entityType) where.entityType = entityType;

  const query: any = {
    where,
    orderBy: { createdAt: 'desc' },
    take: limit + 1
  };
  if (cursor) { query.skip = 1; query.cursor = { id: cursor }; }

  const rows = await prisma.auditEvent.findMany(query);
  let nextCursor: string | null = null;
  if (rows.length > limit) { const next = rows.pop(); nextCursor = next!.id; }

  return NextResponse.json({ items: rows, nextCursor });
}
