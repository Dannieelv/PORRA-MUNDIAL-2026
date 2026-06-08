// Endpoint temporal admin — se elimina tras usar
const FIRESTORE_BASE = `https://firestore.googleapis.com/v1/projects/porra-mundial-2026/databases/(default)/documents`;

async function fsr(path, method = 'GET') {
  const res = await fetch(`${FIRESTORE_BASE}/${path}`, { method });
  return res.status;
}

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const action = searchParams.get('action') || 'list';
  const id = searchParams.get('id');

  if (action === 'list') {
    const res = await fetch(`${FIRESTORE_BASE}/players`);
    const data = await res.json();
    const players = (data.documents || []).map(d => ({
      id: d.name.split('/').pop(),
      name: d.fields?.name?.stringValue || '?',
    }));
    return Response.json({ ok: true, players, rawStatus: res.status, count: players.length });
  }

  if (action === 'delete' && id) {
    const s1 = await fsr(`players/${id}`, 'DELETE');
    const s2 = await fsr(`pushSubs/${id}`, 'DELETE');
    return Response.json({ ok: true, players: s1, pushSubs: s2 });
  }

  return Response.json({ ok: false, error: 'Unknown action or missing id' });
}
