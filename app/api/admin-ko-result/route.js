// Admin API: guardar resultado de partido de eliminatorias manualmente
// POST { matchId, h, a, winner }

const FIRESTORE_URL = 'https://firestore.googleapis.com/v1/projects/porramundial2026-11161/databases/(default)/documents';
const FIREBASE_API_KEY = 'AIzaSyA07l3z5LqMDwMI1QTCELMzMIt-liudg_w';
const KEY = `?key=${FIREBASE_API_KEY}`;

async function getAllGroupIds() {
  try {
    const res = await fetch(`${FIRESTORE_URL}/groups${KEY}`);
    if (!res.ok) return [];
    const body = await res.json();
    return (body.documents || []).map(d => d.name.split('/').pop());
  } catch { return []; }
}

async function saveToDoc(docUrl, matchId, h, a, winner) {
  const resultFields = {
    h: { integerValue: String(h) },
    a: { integerValue: String(a) },
  };
  if (winner) resultFields.winner = { stringValue: winner };
  await fetch(`${docUrl}?key=${FIREBASE_API_KEY}&updateMask.fieldPaths=knockoutResults.${matchId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fields: {
        knockoutResults: { mapValue: { fields: {
          [matchId]: { mapValue: { fields: resultFields }}
        }}}
      }
    }),
  });
}

export async function POST(req) {
  try {
    const { matchId, h, a, winner } = await req.json();
    if (!matchId || h === undefined || a === undefined) {
      return Response.json({ ok: false, error: 'matchId, h y a son obligatorios' }, { status: 400 });
    }

    const hNum = parseInt(h, 10);
    const aNum = parseInt(a, 10);
    if (isNaN(hNum) || isNaN(aNum)) {
      return Response.json({ ok: false, error: 'h y a deben ser números' }, { status: 400 });
    }

    // Guardar en porra/config (global)
    await saveToDoc(`${FIRESTORE_URL}/porra/config`, matchId, hNum, aNum, winner);

    // Propagar a todos los grupos
    const groupIds = await getAllGroupIds();
    for (const gId of groupIds) {
      await saveToDoc(`${FIRESTORE_URL}/groups/${gId}/settings/config`, matchId, hNum, aNum, winner).catch(() => {});
    }

    return Response.json({ ok: true, matchId, h: hNum, a: aNum, winner, groups: groupIds.length });
  } catch (e) {
    return Response.json({ ok: false, error: String(e) }, { status: 500 });
  }
}
