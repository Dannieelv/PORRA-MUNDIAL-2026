// Endpoint temporal admin — se elimina tras usar
const PROJECT = 'porramundial2026-11161';
const API_KEY = 'AIzaSyA07l3z5LqMDwMI1QTCELMzMIt-liudg_w';
const BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents`;

async function fsr(path, method = 'GET') {
  const res = await fetch(`${BASE}/${path}?key=${API_KEY}`, { method });
  return res.status;
}

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const action = searchParams.get('action') || 'list';
  const id = searchParams.get('id');

  if (action === 'list') {
    const res = await fetch(`${BASE}/players?key=${API_KEY}`);
    const data = await res.json();
    const players = (data.documents || []).map(d => ({
      id: d.name.split('/').pop(),
      name: d.fields?.name?.stringValue || '?',
    }));
    return Response.json({ ok: true, players, rawStatus: res.status });
  }

  if (action === 'delete' && id) {
    const s1 = await fsr(`players/${id}`, 'DELETE');
    const s2 = await fsr(`pushSubs/${id}`, 'DELETE');
    return Response.json({ ok: true, players: s1, pushSubs: s2 });
  }

  return Response.json({ ok: false, error: 'Unknown action or missing id' });
}
