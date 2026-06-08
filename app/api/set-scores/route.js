const PROJECT = 'porramundial2026-11161';
const API_KEY = 'AIzaSyA07l3z5LqMDwMI1QTCELMzMIt-liudg_w';
const BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents`;

export async function POST(req) {
  const { playerId, scores } = await req.json();
  if (!playerId || !scores) return Response.json({ ok: false, error: 'Missing params' });

  // Build Firestore map format
  const scoresFields = {};
  for (const [matchId, { h, a }] of Object.entries(scores)) {
    scoresFields[matchId] = {
      mapValue: {
        fields: {
          h: { stringValue: String(h) },
          a: { stringValue: String(a) },
        },
      },
    };
  }

  const res = await fetch(
    `${BASE}/players/${playerId}?key=${API_KEY}&updateMask.fieldPaths=scores`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fields: {
          scores: { mapValue: { fields: scoresFields } },
        },
      }),
    }
  );

  return Response.json({ ok: res.ok, status: res.status });
}
