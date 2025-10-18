import https from 'https';

export function sendDiscordWebhook(message: string, webhookUrl = process.env.DISCORD_WEBHOOK_URL) {
  const debug = (process.env.DISCORD_WEBHOOK_DEBUG || '').toLowerCase() === '1' || (process.env.DISCORD_WEBHOOK_DEBUG || '').toLowerCase() === 'true';
  if (!webhookUrl) {
    if (debug) console.log('[discord] No DISCORD_WEBHOOK_URL set');
    return Promise.resolve(false);
  }
  return new Promise<boolean>((resolve) => {
    try {
      const url = new URL(webhookUrl);
      const payload = JSON.stringify({ content: message.slice(0, 1900) });
      const options: https.RequestOptions = {
        method: 'POST',
        hostname: url.hostname,
        path: url.pathname + (url.search || ''),
        headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) }
      };
      const req = https.request(options, (res) => {
        const ok = res.statusCode ? (res.statusCode >= 200 && res.statusCode < 300) : false;
        if (debug) console.log('[discord] webhook response', res.statusCode, ok ? 'ok' : 'fail');
        resolve(ok);
      });
      req.on('error', (err) => {
        if (debug) console.log('[discord] webhook error', err?.message || err);
        resolve(false);
      });
      req.write(payload);
      req.end();
    } catch (e: any) {
      if (debug) console.log('[discord] webhook exception', e?.message || e);
      resolve(false);
    }
  });
}