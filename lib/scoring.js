import { TEAMS, MATCHES, GROUPS, DEFAULT_POINTS } from './data';

export function matchPoints(pred, res, mult, points = DEFAULT_POINTS) {
  if (!pred || !res) return 0;
  const ph = +pred.h, pa = +pred.a, rh = +res.h, ra = +res.a;
  if ([ph, pa, rh, ra].some(v => v === '' || isNaN(v))) return 0;
  const P = points; let pts = 0;
  if (Math.sign(ph - pa) === Math.sign(rh - ra)) {
    pts += P.sign;
    if ((ph - pa) === (rh - ra)) pts += P.diff;
    if (ph === rh && pa === ra) pts += P.exact;
  }
  return pts * (mult || 1);
}

export function standings(group, results) {
  const ts = TEAMS.filter(t => t.group === group).map(t => ({
    name: t.name, flag: t.flag, pj: 0, pts: 0, gf: 0, gc: 0, seed: t.rank,
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

export function playerScore(player, config) {
  const points = config?.points || DEFAULT_POINTS;
  const results = config?.results || {};
  let mp = 0, cp = 0;
  MATCHES.forEach(m => {
    mp += matchPoints(player.scores?.[m.id], results[m.id], m.mult, points);
  });
  GROUPS.forEach(g => {
    if (!groupComplete(g, results)) return;
    const real = standings(g, results).map(t => t.name);
    const picks = player.groupPicks?.[g] || defaultPicks(g);
    picks.forEach((nm, i) => { if (real[i] === nm) cp += points.clasif; });
  });
  return { match: mp, clasif: cp, total: mp + cp };
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
