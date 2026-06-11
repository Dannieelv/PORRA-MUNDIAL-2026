// One-time migration: copia datos legacy (players/, porra/config, reactions/)
// a la nueva estructura multi-grupo: groups/lonjas/...

const FIRESTORE_URL    = 'https://firestore.googleapis.com/v1/projects/porramundial2026-11161/databases/(default)/documents';
const FIREBASE_API_KEY = 'AIzaSyA07l3z5LqMDwMI1QTCELMzMIt-liudg_w';
const KEY              = `?key=${FIREBASE_API_KEY}`;
const GROUP_ID         = 'lonjas';

// Leer una colección completa de Firestore REST
async function readCollection(path) {
  const docs = [];
  let pageToken = null;
  do {
    const url = `${FIRESTORE_URL}/${path}${KEY}${pageToken ? `&pageToken=${pageToken}` : ''}`;
    const res  = await fetch(url);
    if (!res.ok) break;
    const body = await res.json();
    (body.documents || []).forEach(d => {
      const id = d.name.split('/').pop();
      docs.push({ id, fields: d.fields || {} });
    });
    pageToken = body.nextPageToken || null;
  } while (pageToken);
  return docs;
}

// Escribir un documento via REST (PATCH = create/overwrite)
async function writeDoc(path, fields) {
  const res = await fetch(`${FIRESTORE_URL}/${path}${KEY}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields }),
  });
  return res.ok;
}

export async function GET() {
  const summary = { config: false, players: 0, reactions: 0, errors: [] };

  try {
    // 1. Crear metadata del grupo lonjas
    await writeDoc(`groups/${GROUP_ID}`, {
      name:      { stringValue: 'Las Lonjas' },
      createdAt: { integerValue: String(Date.now()) },
      plan:      { stringValue: 'free' },
    });

    // 2. Migrar config (porra/config → groups/lonjas/settings/config)
    // Si no hay config legacy, crear uno vacío para que el app no falle
    const cfgRes = await fetch(`${FIRESTORE_URL}/porra/config${KEY}`);
    let cfgFields = null;
    if (cfgRes.ok) {
      const cfgDoc = await cfgRes.json();
      if (cfgDoc.fields) cfgFields = cfgDoc.fields;
    }
    if (!cfgFields) {
      // Config vacío inicial — los resultados se llenarán via sync-results
      cfgFields = {
        results:         { mapValue: { fields: {} } },
        knockoutMatches: { arrayValue: { values: [] } },
        knockoutResults: { mapValue: { fields: {} } },
        tournamentLocked: { booleanValue: false },
      };
    }
    summary.config = await writeDoc(`groups/${GROUP_ID}/settings/config`, cfgFields);

    // 3. Migrar jugadores (players/* → groups/lonjas/players/*)
    const players = await readCollection('players');
    for (const p of players) {
      const ok = await writeDoc(`groups/${GROUP_ID}/players/${p.id}`, p.fields);
      if (ok) summary.players++;
      else summary.errors.push(`player:${p.id}`);
    }

    // 4. Migrar reacciones (reactions/* → groups/lonjas/reactions/*)
    const reactions = await readCollection('reactions');
    for (const r of reactions) {
      const ok = await writeDoc(`groups/${GROUP_ID}/reactions/${r.id}`, r.fields);
      if (ok) summary.reactions++;
      else summary.errors.push(`reaction:${r.id}`);
    }

    return Response.json({ ok: true, summary });
  } catch (e) {
    return Response.json({ ok: false, error: e.message, summary }, { status: 500 });
  }
}
