// Auto-sync World Cup 2026 results from football-data.org
// Called by Vercel Cron every 5 minutes during the tournament

const FOOTBALL_API_KEY = process.env.FOOTBALL_API_KEY || '';
const FIRESTORE_URL = 'https://firestore.googleapis.com/v1/projects/porra-mundial-2026/databases/(default)/documents';
const WC_COMPETITION = 2000;

// Map football-data.org team names → our app's Spanish names
const TEAM_MAP = {
  'Mexico':                'México',
  'South Africa':          'Sudáfrica',
  'South Korea':           'Corea del Sur',
  'Czechia':               'República Checa',
  'Canada':                'Canadá',
  'Bosnia-Herzegovina':    'Bosnia y Herzegovina',
  'Qatar':                 'Catar',
  'Switzerland':           'Suiza',
  'Brazil':                'Brasil',
  'Morocco':               'Marruecos',
  'Haiti':                 'Haití',
  'Scotland':              'Escocia',
  'United States':         'Estados Unidos',
  'Paraguay':              'Paraguay',
  'Australia':             'Australia',
  'Turkey':                'Turquía',
  'Germany':               'Alemania',
  'Curaçao':               'Curazao',
  'Ivory Coast':           'Costa de Marfil',
  'Ecuador':               'Ecuador',
  'Netherlands':           'Países Bajos',
  'Japan':                 'Japón',
  'Sweden':                'Suecia',
  'Tunisia':               'Túnez',
  'Belgium':               'Bélgica',
  'Egypt':                 'Egipto',
  'Iran':                  'Irán',
  'New Zealand':           'Nueva Zelanda',
  'Spain':                 'España',
  'Cape Verde Islands':    'Cabo Verde',
  'Saudi Arabia':          'Arabia Saudita',
  'Uruguay':               'Uruguay',
  'France':                'Francia',
  'Senegal':               'Senegal',
  'Iraq':                  'Irak',
  'Norway':                'Noruega',
  'Argentina':             'Argentina',
  'Algeria':               'Argelia',
  'Austria':               'Austria',
  'Jordan':                'Jordania',
  'Portugal':              'Portugal',
  'Congo DR':              'RD Congo',
  'Uzbekistan':            'Uzbekistán',
  'Colombia':              'Colombia',
  'England':               'Inglaterra',
  'Croatia':               'Croacia',
  'Ghana':                 'Ghana',
  'Panama':                'Panamá',
};

// Our match list (index = match number m1..m48 for group stage)
const OUR_MATCHES = [
  { id: 'm1',  t1: 'México',           t2: 'Sudáfrica',          date: '2026-06-11' },
  { id: 'm2',  t1: 'Corea del Sur',    t2: 'República Checa',    date: '2026-06-12' },
  { id: 'm3',  t1: 'Canadá',           t2: 'Bosnia y Herzegovina',date: '2026-06-12' },
  { id: 'm4',  t1: 'Catar',            t2: 'Suiza',              date: '2026-06-13' },
  { id: 'm5',  t1: 'Brasil',           t2: 'Marruecos',          date: '2026-06-14' },
  { id: 'm6',  t1: 'Haití',            t2: 'Escocia',            date: '2026-06-14' },
  { id: 'm7',  t1: 'Estados Unidos',   t2: 'Paraguay',           date: '2026-06-13' },
  { id: 'm8',  t1: 'Australia',        t2: 'Turquía',            date: '2026-06-14' },
  { id: 'm9',  t1: 'Alemania',         t2: 'Curazao',            date: '2026-06-14' },
  { id: 'm10', t1: 'Costa de Marfil',  t2: 'Ecuador',            date: '2026-06-14' },
  { id: 'm11', t1: 'Países Bajos',     t2: 'Japón',              date: '2026-06-14' },
  { id: 'm12', t1: 'Suecia',           t2: 'Túnez',              date: '2026-06-15' },
  { id: 'm13', t1: 'España',           t2: 'Cabo Verde',         date: '2026-06-15' },
  { id: 'm14', t1: 'Bélgica',          t2: 'Egipto',             date: '2026-06-15' },
  { id: 'm15', t1: 'Arabia Saudita',   t2: 'Uruguay',            date: '2026-06-15' },
  { id: 'm16', t1: 'Irán',             t2: 'Nueva Zelanda',      date: '2026-06-16' },
  { id: 'm17', t1: 'Francia',          t2: 'Senegal',            date: '2026-06-16' },
  { id: 'm18', t1: 'Irak',             t2: 'Noruega',            date: '2026-06-16' },
  { id: 'm19', t1: 'Argentina',        t2: 'Argelia',            date: '2026-06-17' },
  { id: 'm20', t1: 'Austria',          t2: 'Jordania',           date: '2026-06-17' },
  { id: 'm21', t1: 'Portugal',         t2: 'RD Congo',           date: '2026-06-17' },
  { id: 'm22', t1: 'Uzbekistán',       t2: 'Colombia',           date: '2026-06-17' },
  { id: 'm23', t1: 'Inglaterra',       t2: 'Croacia',            date: '2026-06-18' },
  { id: 'm24', t1: 'Ghana',            t2: 'Panamá',             date: '2026-06-18' },
];

async function getFirestoreConfig() {
  try {
    const res = await fetch(`${FIRESTORE_URL}/config/main`);
    if (!res.ok) return null;
    const doc = await res.json();
    if (!doc.fields?.results) return null;
    // Parse results from Firestore map format
    const resultsField = doc.fields.results?.mapValue?.fields || {};
    const results = {};
    for (const [k, v] of Object.entries(resultsField)) {
      const inner = v?.mapValue?.fields || {};
      results[k] = {
        h: inner.h?.integerValue ?? inner.h?.stringValue ?? '',
        a: inner.a?.integerValue ?? inner.a?.stringValue ?? '',
      };
    }
    return { results };
  } catch { return null; }
}

async function saveResultToFirestore(matchId, h, a) {
  // We use a PATCH to update just the result field
  const url = `${FIRESTORE_URL}/config/main?updateMask.fieldPaths=results.${matchId}`;
  await fetch(url, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fields: {
        results: {
          mapValue: {
            fields: {
              [matchId]: {
                mapValue: {
                  fields: {
                    h: { integerValue: String(h) },
                    a: { integerValue: String(a) },
                  },
                },
              },
            },
          },
        },
      },
    }),
  });
}

async function notifyAll(match, h, a) {
  try {
    await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || 'https://porra-mundial-2026-5m1u7emtx-dannieelvs-projects.vercel.app'}/api/push`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'notify-all',
        payload: {
          title: `Resultado: ${match.t1} ${h}-${a} ${match.t2}`,
          body: 'Comprueba tus puntos en la Porra Mundial 2026',
          tag: `result_${match.id}`,
          url: '/',
        },
      }),
    });
  } catch { /* non-critical */ }
}

export async function GET(req) {
  // Allow manual trigger or cron
  if (!FOOTBALL_API_KEY) {
    return Response.json({ ok: false, error: 'FOOTBALL_API_KEY not set' }, { status: 500 });
  }

  try {
    // Fetch finished matches from football-data.org
    const apiRes = await fetch(
      `https://api.football-data.org/v4/competitions/${WC_COMPETITION}/matches?stage=GROUP_STAGE&status=FINISHED`,
      { headers: { 'X-Auth-Token': FOOTBALL_API_KEY } }
    );
    if (!apiRes.ok) {
      return Response.json({ ok: false, error: `API error ${apiRes.status}` }, { status: 500 });
    }
    const apiData = await apiRes.json();
    const finishedMatches = apiData.matches || [];

    // Get current results from Firestore
    const currentConfig = await getFirestoreConfig();
    const currentResults = currentConfig?.results || {};

    // Compare and find new results
    const newResults = [];

    for (const apiMatch of finishedMatches) {
      const home = TEAM_MAP[apiMatch.homeTeam?.name] || apiMatch.homeTeam?.name;
      const away = TEAM_MAP[apiMatch.awayTeam?.name] || apiMatch.awayTeam?.name;
      const h    = apiMatch.score?.fullTime?.home;
      const a    = apiMatch.score?.fullTime?.away;

      if (h === null || a === null) continue;

      // Find corresponding match in our list
      const ourMatch = OUR_MATCHES.find(
        m => m.t1 === home && m.t2 === away
      );
      if (!ourMatch) continue;

      // Check if result is new or changed
      const existing = currentResults[ourMatch.id];
      if (!existing || String(existing.h) !== String(h) || String(existing.a) !== String(a)) {
        newResults.push({ match: ourMatch, h, a });
      }
    }

    // Save new results and notify
    for (const { match, h, a } of newResults) {
      await saveResultToFirestore(match.id, h, a);
      await notifyAll(match, h, a);
    }

    return Response.json({
      ok: true,
      checked: finishedMatches.length,
      updated: newResults.length,
      newResults: newResults.map(r => `${r.match.t1} ${r.h}-${r.a} ${r.match.t2}`),
    });

  } catch (e) {
    return Response.json({ ok: false, error: e.message }, { status: 500 });
  }
}
