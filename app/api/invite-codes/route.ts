// Legacy invite-codes API removed. Keeping empty route file to avoid 404 regressions.
import { NextResponse } from 'next/server';
export async function GET() { return NextResponse.json({ error: 'Gone' }, { status: 410 }); }
export async function POST() { return NextResponse.json({ error: 'Gone' }, { status: 410 }); }
