// Auto-sync World Cup 2026 results from football-data.org
// Called by Vercel Cron every day at 21:00 UTC (23:00 Spain)

const FOOTBALL_API_KEY  = process.env.FOOTBALL_API_KEY || '';
const FIRESTORE_URL     = 'https://firestore.googleapis.com/v1/projects/porramundial2026-11161/databases/(default)/documents';
const FIREBASE_API_KEY  = 'AIzaSyA07l3z5LqMDwMI1QTCELMzMIt-liudg_w';
const WC_COMPETITION    = 2000;
const KEY               = `?key=${FIREBASE_API_KEY}`;

// Map football-data.org team names → Spanish names in the app
const TEAM_MAP = {
  'Mexico':'México','South Africa':'Sudáfrica','South Korea':'Corea del Sur',
  'Czechia':'República Checa','Canada':'Canadá','Bosnia-Herzegovina':'Bosnia y Herzegovina',
  'Qatar':'Catar','Switzerland':'Suiza','Brazil':'Brasil','Morocco':'Marruecos',
  'Haiti':'Haití','Scotland':'Escocia','United States':'Estados Unidos',
  'Paraguay':'Paraguay','Australia':'Australia','Turkey':'Turquía','Germany':'Alemania',
  'Curaçao':'Curazao','Ivory Coast':'Costa de Marfil','Ecuador':'Ecuador',
  'Netherlands':'Países Bajos','Japan':'Japón','Sweden':'Suecia','Tunisia':'Túnez',
  'Belgium':'Bélgica','Egypt':'Egipto','Iran':'Irán','New Zealand':'Nueva Zelanda',
  'Spain':'España','Cape Verde Islands':'Cabo Verde','Saudi Arabia':'Arabia Saudita',
  'Uruguay':'Uruguay','France':'Francia','Senegal':'Senegal','Iraq':'Irak',
  'Norway':'Noruega','Argentina':'Argentina','Algeria':'Argelia','Austria':'Austria',
  'Jordan':'Jordania','Portugal':'Portugal','Congo DR':'RD Congo','Uzbekistan':'Uzbekistán',
  'Colombia':'Colombia','England':'Inglaterra','Croatia':'Croacia','Ghana':'Ghana',
  'Panama':'Panamá',
};

// Group stage matches (m1–m24)
const OUR_MATCHES = [
  { id:'m1',  t1:'México',         t2:'Sudáfrica',           date:'2026-06-11' },
  { id:'m2',  t1:'Corea del Sur',  t2:'República Checa',     date:'2026-06-12' },
  { id:'m3',  t1:'Canadá',         t2:'Bosnia y Herzegovina',date:'2026-06-12' },
  { id:'m4',  t1:'Catar',          t2:'Suiza',               date:'2026-06-13' },
  { id:'m5',  t1:'Brasil',         t2:'Marruecos',           date:'2026-06-14' },
  { id:'m6',  t1:'Haití',          t2:'Escocia',             date:'2026-06-14' },
  { id:'m7',  t1:'Estados Unidos', t2:'Paraguay',            date:'2026-06-13' },
  { id:'m8',  t1:'Australia',      t2:'Turquía',             date:'2026-06-14' },
  { id:'m9',  t1:'Alemania',       t2:'Curazao',             date:'2026-06-14' },
  { id:'m10', t1:'Costa de Marfil',t2:'Ecuador',             date:'2026-06-14' },
  { id:'m11', t1:'Países Bajos',   t2:'Japón',               date:'2026-06-14' },
  { id:'m12', t1:'Suecia',         t2:'Túnez',               date:'2026-06-15' },
  { id:'m13', t1:'España',         t2:'Cabo Verde',          date:'2026-06-15' },
  { id:'m14', t1:'Bélgica',        t2:'Egipto',              date:'2026-06-15' },
  { id:'m15', t1:'Arabia Saudita', t2:'Uruguay',             date:'2026-06-15' },
  { id:'m16', t1:'Irán',           t2:'Nueva Zelanda',       date:'2026-06-16' },
  { id:'m17', t1:'Francia',        t2:'Senegal',             date:'2026-06-16' },
  { id:'m18', t1:'Irak',           t2:'Noruega',             date:'2026-06-16' },
  { id:'m19', t1:'Argentina',      t2:'Argelia',             date:'2026-06-17' },
  { id:'m20', t1:'Austria',        t2:'Jordania',            date:'2026-06-17' },
  { id:'m21', t1:'Portugal',       t2:'RD Congo',            date:'2026-06-17' },
  { id:'m22', t1:'Uzbekistán',     t2:'Colombia',            date:'2026-06-17' },
  { id:'m23', t1:'Inglaterra',     t2:'Croacia',             date:'2026-06-18' },
  { id:'m24', t1:'Ghana',          t2:'Panamá',              date:'2026-06-18' },
];

const KNOCKOUT_STAGES = [
  { stage:'LAST_16',        code:'r16',  mult:1, label:'Dieciseisavos' },
  { stage:'QUARTER_FINALS', code:'qf',   mult:2, label:'Cuartos de Final' },
  { stage:'SEMI_FINALS',    code:'sf',   mult:3, label:'Semifinales' },
  { stage:'FINAL',          code:'fin',  mult:4, label:'Final' },
];

// ── Firestore helpers ────────────────────────────────────────────

async function getFirestoreConfig() {
  try {
    const res = await fetch(`${FIRESTORE_URL}/porra/config${KEY}`);
    if (!res.ok) return null;
    const doc = await res.json();
    const f   = doc.fields || {};

    // Group results
    const results = {};
    for (const [k, v] of Object.entries(f.results?.mapValue?.fields || {})) {
      const inner = v?.mapValue?.fields || {};
      results[k] = {
        h: inner.h?.integerValue ?? inner.h?.stringValue ?? '',
        a: inner.a?.integerValue ?? inner.a?.stringValue ?? '',
      };
    }

    // Knockout matches (array)
    const knockoutMatches = (f.knockoutMatches?.arrayValue?.values || []).map(v => {
      const mf = v?.mapValue?.fields || {};
      return {
        id:       mf.id?.stringValue      || '',
        stage:    mf.stage?.stringValue    || '',
        mult:     +(mf.mult?.integerValue  || 1),
        t1:       mf.t1?.stringValue       || '',
        t2:       mf.t2?.stringValue       || '',
        date:     mf.date?.stringValue     || '',
        datetime: mf.datetime?.stringValue || '',
      };
    }).filter(m => m.id);

    // Knockout results (map)
    const knockoutResults = {};
    for (const [k, v] of Object.entries(f.knockoutResults?.mapValue?.fields || {})) {
      const inner = v?.mapValue?.fields || {};
      knockoutResults[k] = {
        h: inner.h?.integerValue ?? inner.h?.stringValue ?? '',
        a: inner.a?.integerValue ?? inner.a?.stringValue ?? '',
      };
    }

    return {
      results,
      knockoutMatches,
      knockoutResults,
      tournamentLocked: f.tournamentLocked?.booleanValue || false,
    };
  } catch { return null; }
}

async function saveGroupResult(matchId, h, a) {
  await fetch(`${FIRESTORE_URL}/porra/config?key=${FIREBASE_API_KEY}&updateMask.fieldPaths=results.${matchId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fields: {
        results: { mapValue: { fields: {
          [matchId]: { mapValue: { fields: {
            h: { integerValue: String(h) },
            a: { integerValue: String(a) },
          }}}
        }}}
      }
    }),
  });
}

async function saveKnockoutMatches(matches) {
  await fetch(`${FIRESTORE_URL}/porra/config?key=${FIREBASE_API_KEY}&updateMask.fieldPaths=knockoutMatches`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fields: {
        knockoutMatches: {
          arrayValue: {
            values: matches.map(m => ({
              mapValue: { fields: {
                id:       { stringValue: m.id },
                stage:    { stringValue: m.stage },
                mult:     { integerValue: String(m.mult) },
                t1:       { stringValue: m.t1 },
                t2:       { stringValue: m.t2 },
                date:     { stringValue: m.date },
                datetime: { stringValue: m.datetime },
              }}
            }))
          }
        }
      }
    }),
  });
}

async function saveKnockoutResult(matchId, h, a) {
  await fetch(`${FIRESTORE_URL}/porra/config?key=${FIREBASE_API_KEY}&updateMask.fieldPaths=knockoutResults.${matchId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fields: {
        knockoutResults: { mapValue: { fields: {
          [matchId]: { mapValue: { fields: {
            h: { integerValue: String(h) },
            a: { integerValue: String(a) },
          }}}
        }}}
      }
    }),
  });
}

async function setTournamentLocked() {
  await fetch(`${FIRESTORE_URL}/porra/config?key=${FIREBASE_API_KEY}&updateMask.fieldPaths=tournamentLocked`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields: { tournamentLocked: { booleanValue: true } } }),
  });
}

async function notifyAll(payload) {
  try {
    const base = process.env.NEXT_PUBLIC_SITE_URL
      || 'https://porra-mundial-2026-dannieelvs-projects.vercel.app';
    await fetch(`${base}/api/push`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'notify-all', payload }),
    });
  } catch { /* non-critical */ }
}

// ── Main handler ─────────────────────────────────────────────────

export async function GET() {
  if (!FOOTBALL_API_KEY) {
    return Response.json({ ok: false, error: 'FOOTBALL_API_KEY not set' }, { status: 500 });
  }

  try {
    const cfg = await getFirestoreConfig();
    const currentResults   = cfg?.results         || {};
    const currentKOMatches = cfg?.knockoutMatches  || [];
    const currentKOResults = cfg?.knockoutResults  || {};
    const tournamentLocked = cfg?.tournamentLocked || false;

    const summary = {
      groupsUpdated:         [],
      knockoutFixturesAdded: [],
      knockoutResultsAdded:  [],
    };

    // ── 1. Group stage results ──────────────────────────────────
    const grRes = await fetch(
      `https://api.football-data.org/v4/competitions/${WC_COMPETITION}/matches?stage=GROUP_STAGE&status=FINISHED`,
      { headers: { 'X-Auth-Token': FOOTBALL_API_KEY } }
    );
    if (grRes.ok) {
      const { matches: finishedGroups = [] } = await grRes.json();
      for (const apiMatch of finishedGroups) {
        const home = TEAM_MAP[apiMatch.homeTeam?.name] || apiMatch.homeTeam?.name;
        const away = TEAM_MAP[apiMatch.awayTeam?.name] || apiMatch.awayTeam?.name;
        const h    = apiMatch.score?.fullTime?.home;
        const a    = apiMatch.score?.fullTime?.away;
        if (h === null || a === null) continue;
        const ourMatch = OUR_MATCHES.find(m => m.t1 === home && m.t2 === away);
        if (!ourMatch) continue;
        const existing = currentResults[ourMatch.id];
        if (!existing || String(existing.h) !== String(h) || String(existing.a) !== String(a)) {
          await saveGroupResult(ourMatch.id, h, a);
          await notifyAll({
            title: `Resultado: ${home} ${h}-${a} ${away}`,
            body: 'Comprueba tus puntos en la Porra Mundial 2026',
            tag: `result_${ourMatch.id}`, url: '/',
          });
          summary.groupsUpdated.push(`${home} ${h}-${a} ${away}`);
          currentResults[ourMatch.id] = { h, a };
        }
      }
    }

    // ── 2. Auto-lock tournament when all group matches done ─────
    const allGroupsDone = OUR_MATCHES.every(m => {
      const r = currentResults[m.id];
      return r && r.h !== '' && r.a !== '';
    });
    if (allGroupsDone && !tournamentLocked) {
      await setTournamentLocked();
      summary.tournamentLocked = true;
    }

    // ── 3. Knockout stages: fixtures + results ──────────────────
    let knockoutMatchesCopy = [...currentKOMatches];
    let fixturesChanged = false;

    for (const { stage, mult, label } of KNOCKOUT_STAGES) {
      const koRes = await fetch(
        `https://api.football-data.org/v4/competitions/${WC_COMPETITION}/matches?stage=${stage}`,
        { headers: { 'X-Auth-Token': FOOTBALL_API_KEY } }
      );
      if (!koRes.ok) continue;
      const { matches: koMatches = [] } = await koRes.json();

      for (const apiMatch of koMatches) {
        const homeRaw = apiMatch.homeTeam?.name;
        const awayRaw = apiMatch.awayTeam?.name;
        // Skip TBD fixtures
        if (!homeRaw || !awayRaw || homeRaw === 'TBD' || awayRaw === 'TBD') continue;

        const t1       = TEAM_MAP[homeRaw] || homeRaw;
        const t2       = TEAM_MAP[awayRaw] || awayRaw;
        const matchId  = `ko_${apiMatch.id}`;
        const date     = apiMatch.utcDate?.slice(0, 10) || '';
        const datetime = apiMatch.utcDate || '';

        // Save fixture if new
        const exists = knockoutMatchesCopy.find(m => m.id === matchId);
        if (!exists) {
          knockoutMatchesCopy.push({ id: matchId, stage, mult, t1, t2, date, datetime });
          fixturesChanged = true;
          summary.knockoutFixturesAdded.push(`${label}: ${t1} vs ${t2}`);
          // Notify: round open for betting (24h window)
          await notifyAll({
            title: `Cruces de ${label} disponibles`,
            body: `Apuesta antes de 24h: ${t1} vs ${t2} y más`,
            tag: `fixture_open_${matchId}`, url: '/',
          });
        }

        // Save result if finished
        if (apiMatch.status === 'FINISHED') {
          const h = apiMatch.score?.fullTime?.home;
          const a = apiMatch.score?.fullTime?.away;
          if (h === null || a === null) continue;
          const existingResult = currentKOResults[matchId];
          if (!existingResult || String(existingResult.h) !== String(h) || String(existingResult.a) !== String(a)) {
            await saveKnockoutResult(matchId, h, a);
            await notifyAll({
              title: `${label}: ${t1} ${h}-${a} ${t2}`,
              body: 'Comprueba tus puntos en la Porra Mundial 2026',
              tag: `koresult_${matchId}`, url: '/',
            });
            summary.knockoutResultsAdded.push(`${label}: ${t1} ${h}-${a} ${t2}`);
          }
        }
      }
    }

    if (fixturesChanged) {
      await saveKnockoutMatches(knockoutMatchesCopy);
    }

    return Response.json({ ok: true, summary });

  } catch (e) {
    return Response.json({ ok: false, error: e.message }, { status: 500 });
  }
}
