/**
 * sync-results.mjs
 * Descarga los resultados del Mundial 2026 de football-data.org
 * y los sube a Firestore via REST API (sin necesidad de credenciales Firebase).
 *
 * Ejecutado por GitHub Actions cada 30 minutos durante el torneo.
 */

import { readFileSync } from 'fs';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const cleanData = JSON.parse(readFileSync(new URL('../lib/clean.json', import.meta.url)));

const API_KEY     = process.env.FOOTBALL_DATA_KEY;
const PROJECT_ID  = 'porramundial2026-11161';
const FIRESTORE   = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;

// ── Mapeo: nombre en football-data.org → nombre en nuestros datos ──────────
const NAME_MAP = {
  'Mexico':                   'México',
  'South Africa':             'Sudáfrica',
  'South Korea':              'Corea del Sur',
  'Korea Republic':           'Corea del Sur',
  'Republic of Korea':        'Corea del Sur',
  'Czechia':                  'República Checa',
  'Czech Republic':           'República Checa',
  'Canada':                   'Canadá',
  'Bosnia and Herzegovina':   'Bosnia y Herzegovina',
  'Bosnia-Herzegovina':       'Bosnia y Herzegovina',
  'Qatar':                    'Catar',
  'Switzerland':              'Suiza',
  'Brazil':                   'Brasil',
  'Morocco':                  'Marruecos',
  'Haiti':                    'Haití',
  'Scotland':                 'Escocia',
  'United States':            'Estados Unidos',
  'USA':                      'Estados Unidos',
  'Paraguay':                 'Paraguay',
  'Australia':                'Australia',
  'Turkey':                   'Turquía',
  'Türkiye':                  'Turquía',
  'Germany':                  'Alemania',
  'Curaçao':                  'Curazao',
  'Curacao':                  'Curazao',
  "Côte d'Ivoire":            'Costa de Marfil',
  'Ivory Coast':              'Costa de Marfil',
  'Ecuador':                  'Ecuador',
  'Netherlands':              'Países Bajos',
  'Japan':                    'Japón',
  'Sweden':                   'Suecia',
  'Tunisia':                  'Túnez',
  'Belgium':                  'Bélgica',
  'Egypt':                    'Egipto',
  'Iran':                     'Irán',
  'New Zealand':              'Nueva Zelanda',
  'Spain':                    'España',
  'Cape Verde':               'Cabo Verde',
  'Saudi Arabia':             'Arabia Saudita',
  'Uruguay':                  'Uruguay',
  'France':                   'Francia',
  'Senegal':                  'Senegal',
  'Iraq':                     'Irak',
  'Norway':                   'Noruega',
  'Argentina':                'Argentina',
  'Algeria':                  'Argelia',
  'Austria':                  'Austria',
  'Jordan':                   'Jordania',
  'Portugal':                 'Portugal',
  'DR Congo':                 'RD Congo',
  'Congo DR':                 'RD Congo',
  'Democratic Republic of Congo': 'RD Congo',
  'Uzbekistan':               'Uzbekistán',
  'Colombia':                 'Colombia',
  'England':                  'Inglaterra',
  'Croatia':                  'Croacia',
  'Ghana':                    'Ghana',
  'Panama':                   'Panamá',
};

function normalize(name) {
  return NAME_MAP[name] || name;
}

// Construir índice de nuestros partidos: "t1|t2|fecha" → "mN"
const OUR_MATCHES = cleanData.group.map((m, i) => ({
  id:   `m${i + 1}`,
  t1:   m.t1,
  t2:   m.t2,
  date: m.date, // "YYYY-MM-DD"
}));

function findMatchId(homeTeam, awayTeam, utcDate) {
  const h   = normalize(homeTeam);
  const a   = normalize(awayTeam);
  const day = utcDate.slice(0, 10); // "YYYY-MM-DD"

  const hit = OUR_MATCHES.find(m =>
    m.date === day &&
    ((m.t1 === h && m.t2 === a) || (m.t1 === a && m.t2 === h))
  );
  if (!hit) return null;
  // Si los equipos están invertidos, también invertimos el marcador
  return { id: hit.id, swapped: hit.t1 === a };
}

// ── Leer config actual de Firestore ────────────────────────────────────────
async function readConfig() {
  const res = await fetch(`${FIRESTORE}/porra/config`);
  if (!res.ok) return {};
  const doc = await res.json();
  // Parsear campos Firestore → objeto plano
  const fields = doc.fields || {};
  const results = {};
  const resultsFields = fields.results?.mapValue?.fields || {};
  for (const [matchId, val] of Object.entries(resultsFields)) {
    const mf = val?.mapValue?.fields || {};
    results[matchId] = {
      h: String(mf.h?.integerValue ?? mf.h?.doubleValue ?? ''),
      a: String(mf.a?.integerValue ?? mf.a?.doubleValue ?? ''),
    };
  }
  return results;
}

// ── Escribir resultados en Firestore (solo el campo 'results') ─────────────
async function writeResults(results) {
  // Construir el value Firestore para el mapa de resultados
  const matchFields = {};
  for (const [matchId, r] of Object.entries(results)) {
    matchFields[matchId] = {
      mapValue: {
        fields: {
          h: { integerValue: String(r.h) },
          a: { integerValue: String(r.a) },
        },
      },
    };
  }

  const body = {
    fields: {
      results: { mapValue: { fields: matchFields } },
    },
  };

  const res = await fetch(
    `${FIRESTORE}/porra/config?updateMask.fieldPaths=results`,
    {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(body),
    }
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Firestore PATCH failed: ${err}`);
  }
  return res.json();
}

// ── Obtener resultados del Mundial de football-data.org ────────────────────
async function fetchWCResults() {
  const res = await fetch('https://api.football-data.org/v4/competitions/WC/matches?status=FINISHED', {
    headers: { 'X-Auth-Token': API_KEY },
  });
  if (!res.ok) throw new Error(`football-data.org error: ${res.status} ${await res.text()}`);
  const data = await res.json();
  return data.matches || [];
}

// ── Main ───────────────────────────────────────────────────────────────────
async function main() {
  if (!API_KEY) throw new Error('Falta FOOTBALL_DATA_KEY en las variables de entorno');

  console.log('📡 Descargando resultados del Mundial...');
  const apiMatches = await fetchWCResults();
  console.log(`   ${apiMatches.length} partidos terminados encontrados`);

  console.log('📖 Leyendo config actual de Firestore...');
  const existingResults = await readConfig();

  let updated = 0;
  const newResults = { ...existingResults };

  for (const m of apiMatches) {
    // Solo partidos de fase de grupos (matchday 1-3)
    if (!m.stage?.includes('GROUP')) continue;
    if (m.score?.fullTime?.home == null) continue;

    const found = findMatchId(m.homeTeam.name, m.awayTeam.name, m.utcDate);
    if (!found) {
      console.warn(`  ⚠️  No encontrado: ${m.homeTeam.name} vs ${m.awayTeam.name} (${m.utcDate.slice(0,10)})`);
      continue;
    }

    const h = m.score.fullTime.home;
    const a = m.score.fullTime.away;
    const result = found.swapped
      ? { h: String(a), a: String(h) }
      : { h: String(h), a: String(a) };

    const existing = existingResults[found.id];
    if (!existing || existing.h !== result.h || existing.a !== result.a) {
      newResults[found.id] = result;
      console.log(`  ✅ ${found.id}: ${m.homeTeam.name} ${h}-${a} ${m.awayTeam.name}`);
      updated++;
    }
  }

  if (updated === 0) {
    console.log('✔️  Sin cambios, Firestore no modificado.');
    return;
  }

  console.log(`💾 Guardando ${updated} resultado(s) en Firestore...`);
  await writeResults(newResults);
  console.log('✔️  Firestore actualizado.');
}

main().catch(e => { console.error('❌', e.message); process.exit(1); });
