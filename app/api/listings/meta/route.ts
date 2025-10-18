import { NextRequest, NextResponse } from 'next/server';
import prisma from '../../../../lib/prisma';
import { ERR } from '../../../../lib/errors';
import { CATEGORY_VALUES } from '../../../../lib/validation';

export const runtime = 'nodejs';

// Return distinct non-empty categories; public (no auth) since only exposes values.
// Cached in-memory for a short period to reduce DB hits.
let cache: { categories: string[]; ts: number } | null = null;
const CACHE_MS = 60 * 1000; // 60s

export async function GET(_req: NextRequest) {
  try {
    // Fixed categories, no DB roundtrip needed. Keep cache logic minimal.
  const cats = [...CATEGORY_VALUES];
    return NextResponse.json({ categories: cats });
  } catch (e) {
    return ERR.SERVER_ERROR();
  }
}
