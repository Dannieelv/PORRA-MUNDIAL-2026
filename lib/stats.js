import { MATCHES, GROUPS } from './data';
import { matchPoints, knockoutMatchPoints, playerScore, standings, groupComplete, defaultPicks } from './scoring';

// ── Estadísticas detalladas de un jugador ─────────────────────────
export function playerStats(player, config) {
  const results   = config?.results         || {};
  const koResults = config?.knockoutResults || {};
  const koMatches = config?.knockoutMatches || [];
  const points    = config?.points          || {};

  // Ordenar todos los partidos con resultado por fecha
  const allMatches = [
    ...MATCHES.map(m => ({
      ...m,
      result: results[m.id],
      pred:   player.scores?.[m.id],
      isKO:   false,
    })),
    ...[...koMatches]
      .sort((a, b) => new Date(a.datetime || a.date) - new Date(b.datetime || b.date))
      .map(m => ({
        ...m,
        result: koResults[m.id],
        pred:   player.knockoutScores?.[m.id],
        isKO:   true,
      })),
  ];

  let totalBet = 0, totalWithResult = 0;
  let exactCount = 0, signCount = 0;
  let bestPts = 0, bestMatch = null;

  let curSignStreak = 0, maxSignStreak = 0;
  let curExactStreak = 0, maxExactStreak = 0;
  let curMissStreak = 0, maxMissStreak = 0;

  for (const m of allMatches) {
    const { pred, result: res } = m;
    if (!pred || pred.h === '' || pred.h === undefined) continue;
    totalBet++;
    if (!res || res.h === '' || res.h === undefined) continue;
    totalWithResult++;

    const pts = m.isKO
      ? knockoutMatchPoints(pred, res, m.mult, points)
      : matchPoints(pred, res, m.mult, points);

    if (pts > bestPts) { bestPts = pts; bestMatch = m; }

    const exact = String(pred.h) === String(res.h) && String(pred.a) === String(res.a);
    const sign  = Math.sign(+pred.h - +pred.a) === Math.sign(+res.h - +res.a);

    if (exact) {
      exactCount++; curExactStreak++;
      maxExactStreak = Math.max(maxExactStreak, curExactStreak);
    } else {
      curExactStreak = 0;
    }

    if (sign) {
      signCount++; curSignStreak++; curMissStreak = 0;
      maxSignStreak = Math.max(maxSignStreak, curSignStreak);
    } else {
      curSignStreak = 0; curMissStreak++;
      maxMissStreak = Math.max(maxMissStreak, curMissStreak);
    }
  }

  const { total } = playerScore(player, config);

  const trResult      = config?.tournament || {};
  const t             = player.tournament  || {};
  const predictedChampion = !!(trResult.champion && t.champion === trResult.champion);

  return {
    totalBet,
    totalWithResult,
    exactCount,
    signCount,
    signRate:     totalWithResult > 0 ? signCount  / totalWithResult : 0,
    exactRate:    totalWithResult > 0 ? exactCount / totalWithResult : 0,
    bestPts,
    bestMatch,
    curSignStreak,
    maxSignStreak,
    curExactStreak,
    maxExactStreak,
    curMissStreak,
    maxMissStreak,
    total,
    predictedChampion,
  };
}

// ── Head-to-head entre dos jugadores ─────────────────────────────
export function headToHead(playerA, playerB, config) {
  const results   = config?.results         || {};
  const koResults = config?.knockoutResults || {};
  const koMatches = config?.knockoutMatches || [];
  const points    = config?.points          || {};

  const allMatches = [
    ...MATCHES.map(m => ({
      ...m,
      result: results[m.id],
      predA: playerA.scores?.[m.id],
      predB: playerB.scores?.[m.id],
      isKO:  false,
    })),
    ...[...koMatches]
      .sort((a, b) => new Date(a.datetime || a.date) - new Date(b.datetime || b.date))
      .map(m => ({
        ...m,
        result: koResults[m.id],
        predA: playerA.knockoutScores?.[m.id],
        predB: playerB.knockoutScores?.[m.id],
        isKO:  true,
      })),
  ];

  let winsA = 0, winsB = 0, draws = 0;
  const results5 = []; // últimos 5: 'A' | 'B' | 'D'
  const matchRows = []; // para mostrar partido a partido

  for (const m of allMatches) {
    const res = m.result;
    if (!res || res.h === '') continue;
    const { predA, predB } = m;
    const hasBothPred = predA && predA.h !== '' && predB && predB.h !== '';
    if (!predA?.h && !predB?.h) continue;

    const ptsA = (predA && predA.h !== '') ? (m.isKO ? knockoutMatchPoints(predA, res, m.mult, points) : matchPoints(predA, res, m.mult, points)) : 0;
    const ptsB = (predB && predB.h !== '') ? (m.isKO ? knockoutMatchPoints(predB, res, m.mult, points) : matchPoints(predB, res, m.mult, points)) : 0;

    let winner;
    if (ptsA > ptsB)       { winsA++; winner = 'A'; }
    else if (ptsB > ptsA)  { winsB++; winner = 'B'; }
    else                   { draws++;  winner = 'D'; }

    results5.push(winner);
    matchRows.push({ m, predA, predB, res, ptsA, ptsB, winner });
  }

  // Racha actual
  let streak = 0;
  const last = results5[results5.length - 1];
  for (let i = results5.length - 1; i >= 0 && results5[i] === last; i--) streak++;

  return {
    winsA, winsB, draws,
    total: winsA + winsB + draws,
    last5: results5.slice(-5),
    streak,
    streakWinner: last || null,
    matchRows: matchRows.slice(-10).reverse(), // últimos 10, más reciente primero
  };
}

// ── Historial de puntos acumulados por fase ───────────────────────
export function pointsHistory(player, config) {
  const results   = config?.results         || {};
  const koResults = config?.knockoutResults || {};
  const koMatches = config?.knockoutMatches || [];
  const points    = config?.points          || {};

  const history = [];
  let cumulative = 0;

  // Jornadas de grupos
  for (let md = 1; md <= 3; md++) {
    const mdMatches = MATCHES.filter(m => m.md === md);
    const hasSomeResult = mdMatches.some(m => results[m.id]?.h !== '');
    if (!hasSomeResult) break;

    let mdPts = 0;
    mdMatches.forEach(m => {
      const pred = player.scores?.[m.id];
      const res  = results[m.id];
      if (pred && res && res.h !== '') mdPts += matchPoints(pred, res, m.mult, points);
    });
    cumulative += mdPts;
    history.push({ label: `J${md}`, pts: mdPts, cumulative });
  }

  // Puntos de clasificación de grupos (post-jornada 3)
  let clasifPts = 0;
  GROUPS.forEach(g => {
    if (!groupComplete(g, results)) return;
    const real  = standings(g, results).map(t => t.name);
    const picks = player.groupPicks?.[g] || defaultPicks(g);
    if (real[0] && picks[0] === real[0]) clasifPts += points.clasif1 ?? 4;
    if (real[1] && picks[1] === real[1]) clasifPts += points.clasif2 ?? 3;
  });
  if (clasifPts > 0) {
    cumulative += clasifPts;
    history.push({ label: 'Clas.', pts: clasifPts, cumulative });
  }

  // Rondas de eliminatorias
  const STAGE_LABELS = { LAST_16: '1/8', QUARTER_FINALS: '1/4', SEMI_FINALS: 'SF', FINAL: 'Final' };
  for (const stage of ['LAST_16', 'QUARTER_FINALS', 'SEMI_FINALS', 'FINAL']) {
    const sm = koMatches.filter(m => m.stage === stage);
    if (!sm.length) continue;
    const hasSomeResult = sm.some(m => koResults[m.id]?.h !== '');
    if (!hasSomeResult) continue;
    let stagePts = 0;
    sm.forEach(m => {
      const pred = player.knockoutScores?.[m.id];
      const res  = koResults[m.id];
      if (pred && res && res.h !== '') stagePts += knockoutMatchPoints(pred, res, m.mult, points);
    });
    cumulative += stagePts;
    history.push({ label: STAGE_LABELS[stage], pts: stagePts, cumulative });
  }

  return history;
}
