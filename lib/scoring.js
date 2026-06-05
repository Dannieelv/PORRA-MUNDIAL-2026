import { TEAMS, MATCHES, GROUPS, DEFAULT_POINTS } from './data';

export function matchPoints(pred, res, mult, points = DEFAULT_POINTS) {
  if (!pred || !res) return 0;
  const ph = +pred.h, pa = +pred.a, rh = +res.h, ra = +res.a;
  if ([ph, pa, rh, ra].some(v => v === '' || isNaN(v))) return 0;
  const P = points;
  let pts = 0;

  if (Math.sign(ph - pa) === Math.sign(rh - ra)) {
    pts += P.sign;
    if ((ph - pa) === (rh - ra)) pts += P.diff ?? 0;
    if (ph === rh && pa === ra)  pts += P.exact ?? 0;
  }
  // Total goles igual
  if ((ph + pa) === (rh + ra)) pts += P.total ?? 0;
  // Ambos equipos marcan
  if (rh > 0 && ra > 0 && ph > 0 && pa > 0) pts += P.bothScore ?? 0;

  return pts * (mult || 1);
}

export function standings(group, results) {
  const ts = TEAMS.filter(t => t.group === group).map(t => ({
    name: t.name, pj: 0, pts: 0, gf: 0, gc: 0, seed: t.rank,
  }));
  const idx = Object.fromEntries(ts.map(t => [t.name, t]));
  MATCHES.filter(m => m.group === group).forEach(m => {
    const r = results[m.id];
    if (!r || r.h === '' || r.a === '') return;
    const h = +r.h, a = +r.a;
    if (isNaN(h) || isNaN(a)) return;
    const A = idx[m.t1], B = idx[m.t2];
    A.pj++; B.pj++; A.gf += h; A.gc += a; B.gf += a; B.gc += h;
    if (h > a) { A.pts += 3; } else if (h < a) { B.pts += 3; } else { A.pts++; B.pts++; }
  });
  return ts.sort((x, y) =>
    y.pts - x.pts || (y.gf - y.gc) - (x.gf - x.gc) || y.gf - x.gf || x.seed - y.seed
  );
}

export function groupComplete(group, results) {
  return MATCHES.filter(m => m.group === group).every(m => {
    const r = results[m.id];
    return r && r.h !== '' && r.a !== '' && !isNaN(+r.h) && !isNaN(+r.a);
  });
}

export function defaultPicks(group) {
  return TEAMS.filter(t => t.group === group)
    .sort((a, b) => a.rank - b.rank)
    .map(t => t.name);
}

// Calcula la clasificación de grupo a partir de las predicciones de resultados del jugador
export function autoGroupPicks(group, playerScores) {
  return standings(group, playerScores).map(t => t.name);
}

export function playerScore(player, config) {
  const points = config?.points || DEFAULT_POINTS;
  const results = config?.results || {};
  const trResult = config?.tournament || {};
  let mp = 0, cp = 0, tp = 0;

  // Partidos de grupos
  MATCHES.forEach(m => {
    mp += matchPoints(player.scores?.[m.id], results[m.id], m.mult, points);
  });

  // Clasificación de grupos (1º y 2º)
  GROUPS.forEach(g => {
    if (!groupComplete(g, results)) return;
    const real = standings(g, results).map(t => t.name);
    const picks = player.groupPicks?.[g] || defaultPicks(g);
    if (real[0] && picks[0] === real[0]) cp += points.clasif1 ?? 4;
    if (real[1] && picks[1] === real[1]) cp += points.clasif2 ?? 3;
  });

  // Predicciones del torneo
  const t = player.tournament || {};
  if (trResult.champion   && t.champion   === trResult.champion)   tp += points.champion   ?? 10;
  if (trResult.runnerUp   && t.runnerUp   === trResult.runnerUp)   tp += points.runnerUp   ?? 6;
  if (trResult.revelation && t.revelation === trResult.revelation) tp += points.revelation ?? 3;

  const resultSemis = trResult.semis || [];
  (t.semis || []).forEach(s => {
    if (resultSemis.includes(s)) tp += points.semi ?? 3;
  });

  const cmpName = (a, b) => a && b && a.trim().toLowerCase() === b.trim().toLowerCase();
  if (cmpName(t.goldenBoot,  trResult.goldenBoot))  tp += points.goldenBoot  ?? 5;
  if (cmpName(t.goldenGlove, trResult.goldenGlove)) tp += points.goldenGlove ?? 5;
  if (cmpName(t.mvp,         trResult.mvp))         tp += points.mvp         ?? 5;

  return { match: mp, clasif: cp, tournament: tp, total: mp + cp + tp };
}

export function fmtDate(d) {
  const [, m, dd] = d.split('-');
  const mes = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
  return `${+dd} ${mes[+m - 1]}`;
}

export function isMatchLocked(match, locked) {
  if (locked) return true;
  return new Date() >= new Date(match.date + 'T12:00:00');
}

export function slugify(s) {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}
