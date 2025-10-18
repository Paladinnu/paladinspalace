import { NextRequest, NextResponse } from 'next/server';
import { registerSchema } from '../../../lib/validation';
import { registerUser } from '../../../lib/auth';
import { sendDiscordWebhook } from '../../../lib/discord';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = registerSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }
    const { email, password, displayName, fullNameIC, inGameId, phoneIC } = parsed.data;
    const cleanedEmail = email.toLowerCase().trim();
    const user = await registerUser({ email: cleanedEmail, password, displayName, fullNameIC, inGameId, phoneIC });
    // Fire-and-forget Discord webhook (do not block response)
    const name = (fullNameIC && fullNameIC.trim().length) ? fullNameIC : displayName;
    const phoneDisplay = (()=>{
      const v = String(phoneIC ?? '').trim();
      return v.length ? v : '—';
    })();
    const msg = [
      '```',
      'Cerere acces nouă',
      '',
      `Nume: ${name}`,
      `In-Game ID: ${inGameId}`,
      `Numar Telefon: ${phoneDisplay}`,
      'Status: PENDING',
      '```'
    ].join('\n');
    sendDiscordWebhook(msg).catch(()=>{});
    return NextResponse.json({ ok: true, userId: user.id, status: user.status });
  } catch (e: any) {
    const msg = e?.message || 'Eroare la înregistrare';
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
