'use client';
import { useState } from 'react';
import { playerScore, matchPoints, knockoutMatchPoints, standings, groupComplete, defaultPicks } from '@/lib/scoring';
import { playerStats, pointsHistory } from '@/lib/stats';
import { MATCHES, GROUPS } from '@/lib/data';
import TeamFlag from './TeamFlag';
import styles from './Tabs.module.css';
import bk from './Bracket.module.css';

// ── helpers ─────────────────────────────────────────────────────────
function getMatchdayPts(player, config, md) {
  const results = config?.results || {};
  const points  = config?.points  || {};
  return MATCHES
    .filter(m => m.md === md)
    .reduce((sum, m) => {
      const pred = player.scores?.[m.id];
      const res  = results[m.id];
      if (!pred || res?.h === '' || res?.h === undefined) return sum;
      return sum + matchPoints(pred, res, m.mult, points);
    }, 0);
}

function matchdayHasResults(config, md) {
  const results = config?.results || {};
  return MATCHES.filter(m => m.md === md).some(
    m => results[m.id]?.h !== '' && results[m.id]?.h !== undefined
  );
}

function countMatchdayResults(config, md) {
  const results = config?.results || {};
  return MATCHES.filter(m => m.md === md).filter(
    m => results[m.id]?.h !== '' && results[m.id]?.h !== undefined
  ).length;
}

function countExacts(player, config, md) {
  const results = config?.results || {};
  return MATCHES.filter(m => m.md === md).filter(m => {
    const p = player.scores?.[m.id];
    const r = results[m.id];
    if (!p || r?.h === '' || r?.h === undefined) return false;
    return String(p.h) === String(r.h) && String(p.a) === String(r.a);
  }).length;
}

function countSigns(player, config, md) {
  const results = config?.results || {};
  return MATCHES.filter(m => m.md === md).filter(m => {
    const p = player.scores?.[m.id];
    const r = results[m.id];
    if (!p || r?.h === '' || r?.h === undefined) return false;
    return Math.sign(+p.h - +p.a) === Math.sign(+r.h - +r.a);
  }).length;
}

const MODES = [
  { key: 'total',      label: 'Total'    },
  { key: 'match',      label: 'Partidos' },
  { key: 'clasif',     label: 'Grupos'   },
  { key: 'knockout',   label: 'Elim.'    },
  { key: 'tournament', label: 'Torneo'   },
];

const STAGE_LABELS = {
  LAST_16: 'Dieciseisavos', QUARTER_FINALS: 'Cuartos',
  SEMI_FINALS: 'Semifinales', FINAL: 'Final',
};

// ── Bracket final ────────────────────────────────────────────────────
function Bracket({ players, config }) {
  const trR      = config?.tournament || {};
  const allPicks = Object.values(players).map(p => p.tournament || {});
  const semiCount = {};
  allPicks.forEach(t => (t.semis || []).forEach(s => { semiCount[s] = (semiCount[s] || 0) + 1; }));
  const semisReal  = trR.semis || [];
  const champReal  = trR.champion;
  const runnerReal = trR.runnerUp;
  const topSemis   = semisReal.length === 4 ? semisReal
    : Object.entries(semiCount).sort((a, b) => b[1] - a[1]).slice(0, 4).map(([t]) => t);

  const Team = ({ name, align }) => (
    <div className={`${bk.team} ${semisReal.includes(name) ? bk.real : ''}`}
         style={align === 'right' ? { flexDirection: 'row-reverse' } : {}}>
      {name ? <><TeamFlag name={name} size={16} /><span>{name}</span></> : <span className={bk.empty}>—</span>}
      {semiCount[name] > 0 && <span className={bk.count}>{semiCount[name]}</span>}
    </div>
  );

  return (
    <div className={bk.wrap}>
      <div className={bk.header}>BRACKET FINAL</div>
      <div className={bk.grid}>
        <div className={bk.col}>
          <div className={bk.colLabel}>SF 1</div>
          <Team name={topSemis[0]} />
          <div className={bk.connector} />
          <Team name={topSemis[1]} />
        </div>
        <div className={bk.colCenter}>
          <div className={bk.colLabel}>FINAL</div>
          <div className={`${bk.finalist} ${runnerReal ? bk.real : ''}`}>
            {runnerReal ? <><TeamFlag name={runnerReal} size={16} /><span>{runnerReal}</span></> : <span className={bk.empty}>Subcampeón</span>}
          </div>
          <div className={bk.trophy}>
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none"><path d="M14 2L7 8H3v6c0 3.3 2.7 6 6 6h1.4c1 1.7 2.5 3 4.6 3.5V26H9v2h10v-2h-6v-2.5C15.1 23 16.6 21.7 17.6 20H19c3.3 0 6-2.7 6-6V8h-4L14 2z" fill="#F59E0B"/></svg>
          </div>
          <div className={`${bk.finalist} ${bk.champBox} ${champReal ? bk.real : ''}`}>
            {champReal ? <><TeamFlag name={champReal} size={16} /><span>{champReal}</span></> : <span className={bk.empty}>Campeón</span>}
          </div>
        </div>
        <div className={bk.col}>
          <div className={bk.colLabel}>SF 2</div>
          <Team name={topSemis[2]} align="right" />
          <div className={bk.connector} />
          <Team name={topSemis[3]} align="right" />
        </div>
      </div>
      <p className={bk.hint}>{semisReal.length === 4 ? 'Resultado oficial' : 'Top predicciones del grupo'}</p>
    </div>
  );
}

// ── Gráfica de historial ─────────────────────────────────────────────
function HistoryChart({ history }) {
  if (!history.length) return null;
  const maxPts = Math.max(...history.map(h => h.cumulative), 1);
  const W = 280, H = 80, PAD = 4;
  const pts = history.map((h, i) => {
    const x = PAD + (i / Math.max(history.length - 1, 1)) * (W - PAD * 2);
    const y = H - PAD - ((h.cumulative / maxPts) * (H - PAD * 2));
    return { x, y, ...h };
  });
  const pathD = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ');
  return (
    <div style={{ overflowX: 'auto', marginTop: 8 }}>
      <svg width={W} height={H + 20} style={{ display: 'block', margin: '0 auto' }}>
        <line x1={PAD} y1={H - PAD} x2={W - PAD} y2={H - PAD} stroke="var(--surface-3)" strokeWidth="1" />
        <path d={`${pathD} L${pts[pts.length - 1].x},${H - PAD} L${pts[0].x},${H - PAD} Z`}
          fill="var(--accent)" fillOpacity="0.12" />
        <path d={pathD} fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinejoin="round" />
        {pts.map((p, i) => <circle key={i} cx={p.x} cy={p.y} r="3" fill="var(--accent)" />)}
        {pts.map((p, i) => (
          <text key={i} x={p.x} y={H + 14} textAnchor="middle" fontSize="9" fill="var(--text-muted)" fontWeight="700">
            {p.label}
          </text>
        ))}
        {pts.length > 0 && (
          <text x={pts[pts.length - 1].x} y={pts[pts.length - 1].y - 6}
            textAnchor="middle" fontSize="10" fill="var(--accent)" fontWeight="900">
            {pts[pts.length - 1].cumulative}
          </text>
        )}
      </svg>
    </div>
  );
}

// ── StatBox ──────────────────────────────────────────────────────────
function StatBox({ label, value, sub, accent, warn }) {
  return (
    <div style={{
      background: 'var(--bg-deep)', border: '1px solid var(--surface-3)',
      padding: '10px 12px', borderRadius: 4,
    }}>
      <div style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase',
        letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: 2 }}>
        {label}
      </div>
      <div style={{ fontSize: 22, fontFamily: 'var(--font-bebas)', letterSpacing: '0.04em',
        color: warn ? '#EF4444' : accent ? 'var(--accent)' : 'var(--text)', lineHeight: 1 }}>
        {value}
      </div>
      {sub && <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 600, marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

// ── Panel de estadísticas ────────────────────────────────────────────
function StatsPanel({ player, config, allPlayers }) {
  const stats   = playerStats(player, config);
  const history = pointsHistory(player, config);
  const pct     = v => `${Math.round(v * 100)}%`;

  const allScores  = Object.values(allPlayers || {}).map(p => playerScore(p, config).total).sort((a, b) => b - a);
  const rank       = allScores.indexOf(stats.total) + 1;
  const totalPlayers = allScores.length;
  const avgPerMatch  = stats.totalWithResult > 0 ? (stats.total / stats.totalWithResult).toFixed(1) : '—';

  const playerList = Object.values(allPlayers || {});
  const jAvg = {};
  [1, 2, 3].forEach(md => {
    if (!matchdayHasResults(config, md)) return;
    const tot = playerList.reduce((s, p) => s + getMatchdayPts(p, config, md), 0);
    jAvg[md] = playerList.length > 0 ? tot / playerList.length : 0;
  });

  const jornadas = [1, 2, 3].filter(md => matchdayHasResults(config, md)).map(md => ({
    md,
    pts:    getMatchdayPts(player, config, md),
    played: countMatchdayResults(config, md),
    ex:     countExacts(player, config, md),
    sg:     countSigns(player, config, md),
  }));

  return (
    <div>
      {history.length > 1 && (
        <div className={styles.card} style={{ marginTop: 12 }}>
          <div className={styles.cardTitle}>Evolución de puntos</div>
          <HistoryChart history={history} />
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
            {history.map((h, i) => (
              <div key={i} style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 700 }}>
                {h.label}: <span style={{ color: h.pts > 0 ? 'var(--accent)' : 'inherit' }}>+{h.pts}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {jornadas.length > 0 && (
        <div className={styles.card} style={{ marginTop: 12 }}>
          <div className={styles.cardTitle}>Desglose por jornada</div>
          {jornadas.map(({ md, pts, played, ex, sg }) => {
            const avg   = jAvg[md] ?? 0;
            const color = pts > avg ? '#4ade80' : pts < avg ? '#f87171' : 'var(--text-muted)';
            return (
              <div key={md} style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '10px 0', borderBottom: '1px solid var(--surface-3)',
              }}>
                <div style={{ fontFamily: 'var(--font-bebas)', fontSize: 18, letterSpacing: '0.06em',
                  color: 'var(--text-muted)', width: 28, flexShrink: 0 }}>J{md}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 700 }}>
                      Media: <span style={{ color: 'var(--text)' }}>{avg.toFixed(1)}pt</span>
                    </span>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 700 }}>
                      Exactos: <span style={{ color: ex > 0 ? 'var(--accent)' : 'inherit' }}>{ex}</span>
                    </span>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 700 }}>
                      1X2: <span style={{ color: sg > 0 ? '#60a5fa' : 'inherit' }}>{sg}/{played}</span>
                    </span>
                  </div>
                </div>
                <div style={{ fontFamily: 'var(--font-bebas)', fontSize: 26, color,
                  letterSpacing: '0.04em', lineHeight: 1, flexShrink: 0 }}>
                  {pts}<small style={{ fontSize: 12, fontWeight: 700, marginLeft: 2 }}>pt</small>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className={styles.card} style={{ marginTop: 12 }}>
        <div className={styles.cardTitle}>Estadísticas</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 8 }}>
          <StatBox label="Posición" value={rank > 0 ? `${rank}/${totalPlayers}` : '—'} accent />
          <StatBox label="Media/partido" value={avgPerMatch}
            sub={stats.totalWithResult > 0 ? `${stats.totalWithResult} con resultado` : ''} />
          <StatBox label="Apostados" value={`${stats.totalBet}`} />
          <StatBox label="Con resultado" value={`${stats.totalWithResult}`} />
          <StatBox label="Exactos" value={`${stats.exactCount}`}
            sub={stats.totalWithResult > 0 ? pct(stats.exactRate) : ''} accent />
          <StatBox label="1X2 correctos" value={`${stats.signCount}`}
            sub={stats.totalWithResult > 0 ? pct(stats.signRate) : ''} accent />
          <StatBox label="Racha 1X2" value={`${stats.curSignStreak}`} sub={`máx. ${stats.maxSignStreak}`} />
          <StatBox label="Racha exactos" value={`${stats.curExactStreak}`} sub={`máx. ${stats.maxExactStreak}`} />
          {stats.bestMatch && (
            <StatBox label="Mejor partido" value={`+${stats.bestPts}pt`}
              sub={`${stats.bestMatch.t1} vs ${stats.bestMatch.t2}`} accent />
          )}
          {stats.curMissStreak > 2 && (
            <StatBox label="Racha fallos" value={`${stats.curMissStreak}`}
              sub={`máx. ${stats.maxMissStreak}`} warn />
          )}
          {stats.predictedChampion && (
            <StatBox label="¡Campeón!" value="✓" sub="Acertaste el campeón" accent />
          )}
        </div>
      </div>
    </div>
  );
}

// ── Desglose completo de puntos ──────────────────────────────────────
function Breakdown({ player, config, onClose, allPlayers }) {
  const [view, setView] = useState('puntos');
  if (!player) return null;

  const results   = config?.results         || {};
  const koResults = config?.knockoutResults || {};
  const koMatches = config?.knockoutMatches || [];
  const points    = config?.points          || {};
  const trResult  = config?.tournament      || {};

  const matchRows = MATCHES.map(m => {
    const pred = player?.scores?.[m.id];
    const res  = results[m.id];
    const pts  = matchPoints(pred, res, m.mult, points);
    return { m, pred, res, pts };
  }).filter(r => r.pred || r.res);

  const koRows = koMatches.map(m => {
    const pred = player?.knockoutScores?.[m.id];
    const res  = koResults[m.id];
    const pts  = knockoutMatchPoints(pred, res, m.mult, points);
    return { m, pred, res, pts };
  }).filter(r => r.pred || r.res);

  const { clasif, tournament, knockout } = playerScore(player, config);

  return (
    <div>
      <button className={styles.backBtn2} onClick={onClose}>‹ Volver</button>
      <div className={styles.breakdownTitle}>{player.name}</div>

      <div className={styles.seg} style={{ marginTop: 12 }}>
        <button className={view === 'puntos' ? styles.segActive : ''} onClick={() => setView('puntos')}>Puntos</button>
        <button className={view === 'stats'  ? styles.segActive : ''} onClick={() => setView('stats')}>Stats</button>
      </div>

      {view === 'stats' && <StatsPanel player={player} config={config} allPlayers={allPlayers} />}

      {view === 'puntos' && (
        <>
          {matchRows.length > 0 && (
            <div className={styles.card} style={{ marginTop: 12 }}>
              <div className={styles.cardTitle}>Partidos de grupos</div>
              {matchRows.map(({ m, pred, res, pts }) => (
                <div key={m.id} className={styles.bdRow}>
                  <div className={styles.bdMatch}>
                    <TeamFlag name={m.t1} size={14} />
                    <span className={styles.bdScore}>{pred ? `${pred.h}-${pred.a}` : '—'}</span>
                    <TeamFlag name={m.t2} size={14} />
                  </div>
                  {res?.h !== '' && <span className={styles.bdRes}>{res.h}-{res.a}</span>}
                  <div className={`${styles.bdPts} ${res && pts > 0 ? styles.bdPtsPos : ''}`}>
                    {res?.h !== '' ? `+${pts}` : '—'}
                  </div>
                </div>
              ))}
            </div>
          )}

          {koRows.length > 0 && (
            <div className={styles.card} style={{ marginTop: 12 }}>
              <div className={styles.cardTitle}>Eliminatorias · {knockout}pt</div>
              {koRows.map(({ m, pred, res, pts }) => (
                <div key={m.id} className={styles.bdRow}>
                  <div className={styles.bdMatch}>
                    <TeamFlag name={m.t1} size={14} />
                    <span className={styles.bdScore}>{pred ? `${pred.h}-${pred.a}` : '—'}</span>
                    <span style={{ fontSize: 9, color: 'var(--text-muted)', fontWeight: 800 }}>
                      {STAGE_LABELS[m.stage] || ''} ×{m.mult}
                    </span>
                    <TeamFlag name={m.t2} size={14} />
                  </div>
                  {res?.h !== '' && <span className={styles.bdRes}>{res.h}-{res.a}</span>}
                  <div className={`${styles.bdPts} ${res && pts > 0 ? styles.bdPtsPos : ''}`}>
                    {res?.h !== '' ? `+${pts}` : '—'}
                  </div>
                </div>
              ))}
            </div>
          )}

          {clasif > 0 && (
            <div className={styles.card} style={{ marginTop: 12 }}>
              <div className={styles.cardTitle}>Grupos · {clasif}pt</div>
              {GROUPS.map(g => {
                if (!groupComplete(g, results)) return null;
                const real  = standings(g, results).map(t => t.name);
                const picks = player.groupPicks?.[g] || defaultPicks(g);
                const p1 = picks[0] === real[0] ? (points.clasif1 ?? 4) : 0;
                const p2 = picks[1] === real[1] ? (points.clasif2 ?? 3) : 0;
                if (!p1 && !p2) return null;
                return (
                  <div key={g} className={styles.bdRow}>
                    <div className={styles.bdMatch}>Grupo {g}: {picks[0]} · {picks[1]}</div>
                    <div className={`${styles.bdPts} ${styles.bdPtsPos}`}>+{p1 + p2}</div>
                  </div>
                );
              })}
            </div>
          )}

          {tournament > 0 && (
            <div className={styles.card} style={{ marginTop: 12 }}>
              <div className={styles.cardTitle}>Torneo · {tournament}pt</div>
              {[
                { key: 'champion',    label: 'Campeón',       p: points.champion    ?? 10 },
                { key: 'runnerUp',    label: 'Subcampeón',    p: points.runnerUp    ?? 6  },
                { key: 'revelation',  label: 'Revelación',    p: points.revelation  ?? 3  },
                { key: 'goldenBoot',  label: 'Bota de Oro',   p: points.goldenBoot  ?? 5  },
                { key: 'goldenGlove', label: 'Guante de Oro', p: points.goldenGlove ?? 5  },
                { key: 'mvp',         label: 'MVP',           p: points.mvp         ?? 5  },
              ].map(({ key, label, p }) => {
                const t = player.tournament || {};
                const r = trResult[key];
                if (!r || !t[key]) return null;
                const hit = t[key]?.trim().toLowerCase() === r?.trim().toLowerCase();
                if (!hit) return null;
                return (
                  <div key={key} className={styles.bdRow}>
                    <div className={styles.bdMatch}>{label}: {t[key]}</div>
                    <div className={`${styles.bdPts} ${styles.bdPtsPos}`}>+{p}</div>
                  </div>
                );
              })}
              {(trResult.semis || []).map(s => {
                if (!(player.tournament?.semis || []).includes(s)) return null;
                return (
                  <div key={s} className={styles.bdRow}>
                    <div className={styles.bdMatch}>Semifinal: {s}</div>
                    <div className={`${styles.bdPts} ${styles.bdPtsPos}`}>+{points.semi ?? 3}</div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ── Chips de jornada (inline en el ranking) ──────────────────────────
function JornadaChips({ player, config, avgs, activeMds }) {
  if (!activeMds.length) return null;
  return (
    <div className={styles.mdChips}>
      {activeMds.map(md => {
        const pts = getMatchdayPts(player, config, md);
        const avg = avgs[md] ?? 0;
        const chipCls = pts > avg ? styles.mdChipGreen
          : pts < avg         ? styles.mdChipRed
          : styles.mdChipGrey;
        return (
          <span key={md} className={`${styles.mdChip} ${chipCls}`}>
            J{md} {pts}
          </span>
        );
      })}
    </div>
  );
}

// ── Componente principal ─────────────────────────────────────────────
export default function RankingTab({ players, me, config }) {
  const [mode, setMode]               = useState('total');
  const [detail, setDetail]           = useState(null);
  const [showBracket, setShowBracket] = useState(false);

  const rows = Object.entries(players)
    .map(([id, p]) => ({ id, name: p.name, ...playerScore(p, config) }))
    .sort((a, b) => b[mode] - a[mode] || b.total - a.total);

  const activeMds  = [1, 2, 3].filter(md => matchdayHasResults(config, md));
  const playerList = Object.values(players);
  const jAvgs      = {};
  activeMds.forEach(md => {
    const tot = playerList.reduce((s, p) => s + getMatchdayPts(p, config, md), 0);
    jAvgs[md] = playerList.length > 0 ? tot / playerList.length : 0;
  });

  const medals = ['gold', 'silver', 'bronze'];

  if (detail) {
    const detailPlayer = players[detail];
    if (!detailPlayer) { setTimeout(() => setDetail(null), 0); return null; }
    return (
      <div className={styles.tabWrap}>
        <Breakdown player={detailPlayer} config={config} onClose={() => setDetail(null)} allPlayers={players} />
      </div>
    );
  }

  return (
    <div className={styles.tabWrap}>
      <div className={styles.card}>
        <h2 className={styles.cardTitle}>Clasificación</h2>
        <div className={styles.seg}>
          {MODES.map(m => (
            <button key={m.key} className={mode === m.key ? styles.segActive : ''} onClick={() => setMode(m.key)}>
              {m.label}
            </button>
          ))}
        </div>
        <button className={styles.bracketBtn} onClick={() => setShowBracket(v => !v)}>
          {showBracket ? '▲ Ocultar bracket' : 'Ver bracket final'}
        </button>
      </div>

      {showBracket && <Bracket players={players} config={config} />}

      {rows.length === 0 && <div className={styles.empty}>Aún no hay jugadores.</div>}

      {rows.map((r, i) => (
        <div key={r.id}
          className={`${styles.rankRow} ${r.id === me?.id ? styles.rankMe : ''}`}
          onClick={() => setDetail(r.id)}
          style={{ cursor: 'pointer' }}>
          <div className={`${styles.rankPos} ${medals[i] ? styles[medals[i]] : ''}`}>{i + 1}</div>
          <div className={styles.rankInfo}>
            <div className={styles.rankName}>{r.name}</div>
            <JornadaChips player={players[r.id]} config={config} avgs={jAvgs} activeMds={activeMds} />
          </div>
          <div className={styles.rankPts}>{r[mode]} <small>pt</small></div>
          <span className={styles.rankArrow}>›</span>
        </div>
      ))}
    </div>
  );
}
