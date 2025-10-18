import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../lib/listings';
import { sendDiscordWebhook } from '../../../lib/discord';

export async function POST(req: NextRequest) {
  try {
    const { listingId, reason } = await req.json();
    if (!listingId || !reason || !String(reason).trim()) {
      return NextResponse.json({ error: 'Parametri invalizi' }, { status: 400 });
    }
    // Persist as a Ticket for moderators under a synthetic subject
    const listing = await prisma.listing.findUnique({ where: { id: String(listingId) }, include: { seller: true } });
    if (!listing) return NextResponse.json({ error: 'Anunț inexistent' }, { status: 404 });

    const subject = `Raport anunț ${listing.title.slice(0, 60)} (#${listing.id.slice(0, 6)})`;
    const ticket = await prisma.ticket.create({ data: { userId: listing.sellerId, subject } });
    await prisma.ticketMessage.create({ data: { ticketId: ticket.id, body: `Raport utilizator: ${String(reason).trim()}\n\nLink: /listings/${listing.id}` } });

    // Optional: Discord notify
    const msg = [
      '```',
      'Raport anunț nou',
      '',
      `Titlu: ${listing.title}`,
      `Listing ID: ${listing.id}`,
      `Vânzător: ${listing.seller.displayName} (${listing.seller.email || '—'})`,
      `Motiv: ${String(reason).trim()}`,
      '```',
      `/listings/${listing.id}`
    ].join('\n');
    sendDiscordWebhook(msg).catch(()=>{});

    return NextResponse.json({ ok: true, ticketId: ticket.id });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Eroare raportare' }, { status: 500 });
  }
}
