// Endpoint temporal admin — se elimina tras usar
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// Usa Firebase Admin con Application Default Credentials
// o directamente el SDK cliente vía fetch con las reglas públicas

const FIRESTORE_BASE = `https://firestore.googleapis.com/v1/projects/porra-mundial-2026/databases/(default)/documents`;

async function firestoreRequest(path, method = 'GET', body = null) {
  const opts = { method, headers: { 'Content-Type': 'application/json' } };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(`${FIRESTORE_BASE}/${path}`, opts);
  const text = await res.text();
  try { return { status: res.status, data: JSON.parse(text) }; }
  catch { return { status: res.status, data: text }; }
}

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const action = searchParams.get('action') || 'list';
  const id = searchParams.get('id');

  if (action === 'list') {
    // List all players
    const r = await firestoreRequest('players');
    const docs = r.data?.documents || [];
    const players = docs.map(d => ({
      id: d.name.split('/').pop(),
      name: d.fields?.name?.stringValue || '?',
    }));
    return Response.json({ ok: true, players, raw_status: r.status });
  }

  if (action === 'delete' && id) {
    const r1 = await firestoreRequest(`players/${id}`, 'DELETE');
    const r2 = await firestoreRequest(`pushSubs/${id}`, 'DELETE');
    return Response.json({ ok: true, players: r1.status, pushSubs: r2.status });
  }

  return Response.json({ ok: false, error: 'Unknown action' });
}
