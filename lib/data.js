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

export const DEFAULT_POINTS = { sign: 1, diff: 1, exact: 3, clasif: 2 };
