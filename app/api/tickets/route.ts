import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import prisma from '../../../lib/prisma';
import { audit } from '../../../lib/audit';
import { sendDiscordWebhook } from '../../../lib/discord';

async function requireAuth(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token) return null;
  return token as any;
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const raw = await req.json().catch(() => ({}));
  const subject = typeof raw.subject === 'string' ? raw.subject.trim() : '';
  const message = typeof raw.message === 'string' ? raw.message.trim() : '';
  if (!subject || !message) return NextResponse.json({ error: 'Subiect și mesaj obligatorii' }, { status: 400 });
  try {
  const ticket = await (prisma as any).ticket.create({ data: { userId: auth.sub, subject } });
  await (prisma as any).ticketMessage.create({ data: { ticketId: ticket.id, userId: auth.sub, body: message } });
    await audit({ userId: auth.sub, action: 'TICKET_CREATE', entityType: 'TICKET', entityId: ticket.id, metadata: { subjectLen: subject.length } });
    // Fire-and-forget Discord notification (best-effort)
    const display = (auth as any).name || (auth as any).displayName || (auth as any).email || 'Utilizator';
    const subShort = subject.length > 80 ? subject.slice(0, 77) + '…' : subject;
    const msgShort = message.length > 180 ? message.slice(0, 177) + '…' : message;
    void sendDiscordWebhook(`🎟️ Ticket nou creat (#${ticket.id})\nDe: ${display}\nSubiect: ${subShort}\nMesaj: ${msgShort}`);
    return NextResponse.json({ id: ticket.id });
  } catch (e:any) {
    return NextResponse.json({ error: 'Eroare server' }, { status: 500 });
  }
}
