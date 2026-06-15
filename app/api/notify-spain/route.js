// Cron: 0 7 * * * (09:00 hora España CEST)
// Manda push a todos si España juega hoy

const SPAIN_MATCHES = [
  { date: '2026-06-15', rival: 'Cabo Verde',     hora: '21:00' },
  { date: '2026-06-21', rival: 'Arabia Saudita', hora: '18:00' },
  { date: '2026-06-27', rival: 'Uruguay',        hora: '21:00' },
];

const MESSAGES = [
  (rival, hora) => ({
    title: '🇪🇸 ALERTA ROJA — HOY JUEGA ESPAÑA 🇪🇸',
    body: `Esta tarde a las ${hora} España se mide a ${rival}. Cancela lo que tengas, pon la cerveza a enfriar y avisa a tu madre. Que es LA ROJA. 🔴🟡`,
  }),
  (rival, hora) => ({
    title: '🔔 AVISO IMPORTANTE DEL GOBIERNO',
    body: `El ejecutivo comunica que esta tarde a las ${hora} España juega contra ${rival}. Se recomienda proveerse de snacks, evitar las llamadas y no hacer planes. Firmado: La afición. 🇪🇸`,
  }),
  (rival, hora) => ({
    title: '🚨 PARTIDO HOY — ESPAÑA VS ${rival.toUpperCase()}',
    body: `Hoy a las ${hora}. Si tienes trabajo, que espere. Si tienes reunión, cancélala. Si tienes suegra, que se vaya. El fútbol es lo primero. ¡Vamos España! 💪`,
  }),
];

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL
  || 'https://porra-mundial-2026-dannieelvs-projects.vercel.app';

export async function GET() {
  // Fecha actual en Spain (CEST = UTC+2)
  const nowUTC  = new Date();
  const spainMs = nowUTC.getTime() + 2 * 60 * 60 * 1000;
  const spainDate = new Date(spainMs).toISOString().slice(0, 10);

  const match = SPAIN_MATCHES.find(m => m.date === spainDate);
  if (!match) {
    return Response.json({ ok: true, sent: 0, reason: 'España no juega hoy' });
  }

  // Elegir mensaje aleatorio
  const msgFn = MESSAGES[Math.floor(Math.random() * MESSAGES.length)];
  const payload = {
    ...msgFn(match.rival, match.hora),
    tag: `spain_${match.date}`,
    url: '/',
  };

  try {
    const res  = await fetch(`${SITE_URL}/api/push`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'notify-all', payload }),
    });
    const data = await res.json();
    return Response.json({ ok: true, sent: data.sent ?? 0, match, payload });
  } catch (e) {
    return Response.json({ ok: false, error: e.message }, { status: 500 });
  }
}
