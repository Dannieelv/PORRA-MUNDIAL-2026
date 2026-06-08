// Endpoint temporal para borrar jugadores — se elimina tras usar
const FIRESTORE_URL = 'https://firestore.googleapis.com/v1/projects/porra-mundial-2026/databases/(default)/documents';

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) return Response.json({ ok: false, error: 'Missing id' });

  const results = {};
  for (const col of ['players', 'pushSubs']) {
    const res = await fetch(`${FIRESTORE_URL}/${col}/${id}`, { method: 'DELETE' });
    results[col] = res.status;
  }
  return Response.json({ ok: true, results });
}
