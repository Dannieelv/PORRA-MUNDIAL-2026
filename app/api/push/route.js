import webpush from 'web-push';

const VAPID_PUBLIC  = process.env.VAPID_PUBLIC_KEY  || '';
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY || '';
const VAPID_SUBJECT = process.env.VAPID_SUBJECT     || 'mailto:admin@porra2026.app';

const FIRESTORE_URL = 'https://firestore.googleapis.com/v1/projects/porramundial2026-11161/databases/(default)/documents';
const K = `key=AIzaSyA07l3z5LqMDwMI1QTCELMzMIt-liudg_w`;

if (VAPID_PUBLIC && VAPID_PRIVATE) {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE);
}

async function getSubscription(playerId) {
  try {
    const res = await fetch(`${FIRESTORE_URL}/pushSubs/${playerId}?${K}`);
    if (!res.ok) return null;
    const doc = await res.json();
    if (!doc.fields?.endpoint) return null;
    return {
      endpoint: doc.fields.endpoint.stringValue,
      keys: {
        p256dh: doc.fields.p256dh.stringValue,
        auth:   doc.fields.auth.stringValue,
      },
    };
  } catch { return null; }
}

async function getAllSubscriptions() {
  try {
    const res = await fetch(`${FIRESTORE_URL}/pushSubs?${K}`);
    if (!res.ok) return [];
    const data = await res.json();
    if (!data.documents) return [];
    return data.documents.map(doc => {
      const id = doc.name.split('/').pop();
      if (!doc.fields?.endpoint) return null;
      return {
        playerId: id,
        sub: {
          endpoint: doc.fields.endpoint.stringValue,
          keys: {
            p256dh: doc.fields.p256dh.stringValue,
            auth:   doc.fields.auth.stringValue,
          },
        },
      };
    }).filter(Boolean);
  } catch { return []; }
}

export async function POST(req) {
  if (!VAPID_PUBLIC || !VAPID_PRIVATE) {
    return Response.json({ ok: false, error: 'VAPID keys not configured' }, { status: 500 });
  }

  const body = await req.json();
  const { action, playerId, subscription, payload } = body;

  // Guardar suscripción
  if (action === 'subscribe') {
    try {
      await fetch(`${FIRESTORE_URL}/pushSubs/${playerId}?${K}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fields: {
            endpoint: { stringValue: subscription.endpoint },
            p256dh:   { stringValue: subscription.keys.p256dh },
            auth:     { stringValue: subscription.keys.auth },
          },
        }),
      });
      return Response.json({ ok: true });
    } catch (e) {
      return Response.json({ ok: false, error: e.message }, { status: 500 });
    }
  }

  // Enviar notificación a un jugador
  if (action === 'notify') {
    const sub = await getSubscription(playerId);
    if (!sub) return Response.json({ ok: false, error: 'No subscription' });
    try {
      await webpush.sendNotification(sub, JSON.stringify(payload));
      return Response.json({ ok: true });
    } catch (e) {
      if (e.statusCode === 410) {
        await fetch(`${FIRESTORE_URL}/pushSubs/${playerId}?${K}`, { method: 'DELETE' });
      }
      return Response.json({ ok: false, error: e.message }, { status: 500 });
    }
  }

  // Enviar notificación a TODOS los jugadores suscritos
  if (action === 'notify-all') {
    const subs = await getAllSubscriptions();
    if (subs.length === 0) return Response.json({ ok: true, sent: 0 });

    const results = await Promise.allSettled(
      subs.map(async ({ playerId: pid, sub }) => {
        try {
          await webpush.sendNotification(sub, JSON.stringify(payload));
          return { pid, ok: true };
        } catch (e) {
          if (e.statusCode === 410) {
            await fetch(`${FIRESTORE_URL}/pushSubs/${pid}?${K}`, { method: 'DELETE' });
          }
          return { pid, ok: false };
        }
      })
    );

    const sent = results.filter(r => r.status === 'fulfilled' && r.value.ok).length;
    return Response.json({ ok: true, sent, total: subs.length });
  }

  return Response.json({ ok: false, error: 'Unknown action' }, { status: 400 });
}
