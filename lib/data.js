import rawData from './clean.json';

const FLAGS = {
  'México':'🇲🇽','Sudáfrica':'🇿🇦','Corea del Sur':'🇰🇷','República Checa':'🇨🇿','Canadá':'🇨🇦',
  'Bosnia y Herzegovina':'🇧🇦','Catar':'🇶🇦','Suiza':'🇨🇭','Brasil':'🇧🇷','Marruecos':'🇲🇦','Haití':'🇭🇹',
  'Escocia':'🏴󠁧󠁢󠁳󠁣󠁴󠁿','Estados Unidos':'🇺🇸','Paraguay':'🇵🇾','Australia':'🇦🇺','Turquía':'🇹🇷','Alemania':'🇩🇪',
  'Curazao':'🇨🇼','Costa de Marfil':'🇨🇮','Ecuador':'🇪🇨','Países Bajos':'🇳🇱','Japón':'🇯🇵','Suecia':'🇸🇪',
  'Túnez':'🇹🇳','Bélgica':'🇧🇪','Egipto':'🇪🇬','Irán':'🇮🇷','Nueva Zelanda':'🇳🇿','España':'🇪🇸',
  'Cabo Verde':'🇨🇻','Arabia Saudita':'🇸🇦','Uruguay':'🇺🇾','Francia':'🇫🇷','Senegal':'🇸🇳','Irak':'🇮🇶',
  'Noruega':'🇳🇴','Argentina':'🇦🇷','Argelia':'🇩🇿','Austria':'🇦🇹','Jordania':'🇯🇴','Portugal':'🇵🇹',
  'RD Congo':'🇨🇩','Uzbekistán':'🇺🇿','Colombia':'🇨🇴','Inglaterra':'🏴󠁧󠁢󠁥󠁮󠁧󠁿','Croacia':'🇭🇷','Ghana':'🇬🇭','Panamá':'🇵🇦'
};

export const TEAMS = rawData.teams.map(t => ({ ...t, flag: FLAGS[t.name] || '🏳️' }));

export const MATCHES = rawData.group.map((m, i) => ({ ...m, id: 'm' + (i + 1) }));

export const TEAM_MAP = Object.fromEntries(TEAMS.map(t => [t.name, t]));

export const flag = name => TEAM_MAP[name]?.flag || '🏳️';

export const GROUPS = [...new Set(TEAMS.map(t => t.group))];

export const DEFAULT_POINTS = { sign: 1, diff: 1, exact: 3, clasif: 2 };
