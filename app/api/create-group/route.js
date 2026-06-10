const FIRESTORE_URL  = 'https://firestore.googleapis.com/v1/projects/porramundial2026-11161/databases/(default)/documents';
const FIREBASE_API_KEY = 'AIzaSyA07l3z5LqMDwMI1QTCELMzMIt-liudg_w';
const KEY = `?key=${FIREBASE_API_KEY}`;

function slugify(s) {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function rand(n = 6) {
  return Math.random().toString(36).slice(2, 2 + n);
}

export async function POST(req) {
  try {
    const { name } = await req.json();
    if (!name || name.trim().length < 2) {
      return Response.json({ error: 'Nombre demasiado corto' }, { status: 400 });
    }

    const groupId = slugify(name.trim()) + '-' + rand(6);

    // Crear metadata del grupo en Firestore
    const metaUrl = `${FIRESTORE_URL}/groups/${groupId}${KEY}`;
    const metaRes = await fetch(metaUrl, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fields: {
          name:      { stringValue: name.trim() },
          createdAt: { integerValue: String(Date.now()) },
          plan:      { stringValue: 'free' },
        }
      }),
    });

    if (!metaRes.ok) {
      const err = await metaRes.text();
      return Response.json({ error: `Firestore error: ${err}` }, { status: 500 });
    }

    // Copiar config global (resultados) al nuevo grupo para que arranque con datos actualizados
    const globalCfgRes = await fetch(`${FIRESTORE_URL}/porra/config${KEY}`);
    if (globalCfgRes.ok) {
      const globalCfg = await globalCfgRes.json();
      // Solo copiar results, knockoutMatches, knockoutResults (no locked ni tournamentLocked)
      const fields = {};
      const gf = globalCfg.fields || {};
      if (gf.results)         fields.results         = gf.results;
      if (gf.knockoutMatches) fields.knockoutMatches  = gf.knockoutMatches;
      if (gf.knockoutResults) fields.knockoutResults  = gf.knockoutResults;
      if (gf.points)          fields.points           = gf.points;

      if (Object.keys(fields).length > 0) {
        await fetch(`${FIRESTORE_URL}/groups/${groupId}/settings/config${KEY}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fields }),
        });
      }
    }

    return Response.json({ groupId });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}
