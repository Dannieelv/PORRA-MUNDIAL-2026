import rawData from './clean.json';

// ISO 3166-1 alpha-2 codes → flagcdn.com images (más fiable que emoji en todos los navegadores)
const TEAM_CODES = {
  'México': 'mx', 'Sudáfrica': 'za', 'Corea del Sur': 'kr', 'República Checa': 'cz',
  'Canadá': 'ca', 'Bosnia y Herzegovina': 'ba', 'Catar': 'qa', 'Suiza': 'ch',
  'Brasil': 'br', 'Marruecos': 'ma', 'Haití': 'ht', 'Escocia': 'gb-sct',
  'Estados Unidos': 'us', 'Paraguay': 'py', 'Australia': 'au', 'Turquía': 'tr',
  'Alemania': 'de', 'Curazao': 'cw', 'Costa de Marfil': 'ci', 'Ecuador': 'ec',
  'Países Bajos': 'nl', 'Japón': 'jp', 'Suecia': 'se', 'Túnez': 'tn',
  'Bélgica': 'be', 'Egipto': 'eg', 'Irán': 'ir', 'Nueva Zelanda': 'nz',
  'España': 'es', 'Cabo Verde': 'cv', 'Arabia Saudita': 'sa', 'Uruguay': 'uy',
  'Francia': 'fr', 'Senegal': 'sn', 'Irak': 'iq', 'Noruega': 'no',
  'Argentina': 'ar', 'Argelia': 'dz', 'Austria': 'at', 'Jordania': 'jo',
  'Portugal': 'pt', 'RD Congo': 'cd', 'Uzbekistán': 'uz', 'Colombia': 'co',
  'Inglaterra': 'gb-eng', 'Croacia': 'hr', 'Ghana': 'gh', 'Panamá': 'pa',
};

export function flagUrl(name) {
  const code = TEAM_CODES[name];
  if (!code) return null;
  return `https://flagcdn.com/32x24/${code}.png`;
}

export const TEAMS = rawData.teams.map(t => ({ ...t, flagCode: TEAM_CODES[t.name] || null }));

export const MATCHES = rawData.group.map((m, i) => ({ ...m, id: 'm' + (i + 1) }));

export const TEAM_MAP = Object.fromEntries(TEAMS.map(t => [t.name, t]));

export const GROUPS = [...new Set(TEAMS.map(t => t.group))];

export const DEFAULT_POINTS = {
  // Fase de grupos
  sign:      3,  // signo 1X2 correcto
  exact:     5,  // bonus marcador exacto
  diff:      1,  // bonus diferencia de goles
  total:     1,  // bonus total de goles
  bothScore: 1,  // bonus ambos equipos marcan
  // Clasificación de grupo
  clasif1:   4,  // 1º de grupo acertado
  clasif2:   3,  // 2º de grupo acertado
  // Premios de grupo
  groupTopScorer: 3,
  groupKeeper:    3,
  groupTopTeam:   2,
  // Torneo (fase final)
  champion:   10,
  runnerUp:    6,
  semi:        3,  // por cada semifinalista
  goldenBoot:  5,
  goldenGlove: 5,
  mvp:         5,
  revelation:  3,
  // Eliminatorias
  knockoutQualified: 4,
  knockoutSign:      3,
  knockoutExact:     5,
  knockoutDiff:      1,
  knockoutTotal:     1,
};
