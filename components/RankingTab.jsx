'use client';
import { useState } from 'react';
import { playerScore, matchPoints, standings, groupComplete, defaultPicks } from '@/lib/scoring';
import { MATCHES, GROUPS } from '@/lib/data';
import TeamFlag from './TeamFlag';
import styles from './Tabs.module.css';
import bk from './Bracket.module.css';

const MODES = [
  { key: 'total',      label: 'Total'    },
  { key: 'match',      label: 'Partidos' },
  { key: 'clasif',     label: 'Grupos'   },
  { key: 'tournament', label: 'Torneo' },
];

/* ── Bracket visual ── */
function Bracket({ players, config }) {
  const trR      = config?.tournament || {};
  const allPicks = Object.values(players).map(p => p.tournament || {});
  const semiCount = {};
  allPicks.forEach(t => (t.semis || []).forEach(s => { semiCount[s] = (semiCount[s] || 0) + 1; }));
  const semisReal = trR.semis || [];
  const champReal = trR.champion;
  const runnerReal = trR.runnerUp;
  const topSemis = semisReal.length === 4 ? semisReal
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
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none"><path d="M14 2L7 8H3v6c0 3.3 2.7 6 6 6h1.4c1 1.7 2.5 3 4.6 3.5V26H9v2h10v-2h-6v-2.5C15.1 23 16.6 21.7 17.6 20H19c3.3 0 6-2.7 6-6V8h-4L14 2z" fill="#F59E0B"/><path d="M14 2L7 8H3v6c0 3.3 2.7 6 6 6h1.4c1 1.7 2.5 3 4.6 3.5V26H9v2h10v-2h-6v-2.5C15.1 23 16.6 21.7 17.6 20H19c3.3 0 6-2.7 6-6V8h-4L14 2z" fill="none" stroke="#EA580B" strokeWidth="1"/></svg>
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
      <p className={bk.hint}>
        {semisReal.length === 4 ? 'Resultado oficial' : 'Top predicciones del grupo'}
      </p>
    </div>
  );
}

/* ── Desglose de puntos ── */
function Breakdown({ player, config, onClose }) {
  const results  = config?.results   || {};
  const points   = config?.points    || {};
  const trResult = config?.tournament || {};

  const matchRows = MATCHES.map(m => {
    const pred = player.scores?.[m.id];
    const res  = results[m.id];
    const pts  = matchPoints(pred, res, m.mult, points);
    return { m, pred, res, pts };
  }).filter(r => r.pred || r.res);

  const { clasif, tournament } = playerScore(player, config);

  return (
    <div>
      <button className={styles.backBtn2} onClick={onClose}>‹ Volver</button>
      <div className={styles.breakdownTitle}>{player.name}</div>

      {matchRows.length > 0 && (
        <div className={styles.card} style={{marginTop: 12}}>
          <div className={styles.cardTitle}>Partidos</div>
          {matchRows.map(({ m, pred, res, pts }) => (
            <div key={m.id} className={styles.bdRow}>
              <div className={styles.bdMatch}>
                <TeamFlag name={m.t1} size={14} />
                <span className={styles.bdScore}>{pred ? `${pred.h}-${pred.a}` : '—'}</span>
                <TeamFlag name={m.t2} size={14} />
              </div>
              {res && res.h !== '' && <span className={styles.bdRes}>{res.h}-{res.a}</span>}
              <div className={`${styles.bdPts} ${res && pts > 0 ? styles.bdPtsPos : ''}`}>
                {res && res.h !== '' ? `+${pts}` : '—'}
              </div>
            </div>
          ))}
        </div>
      )}

      {clasif > 0 && (
        <div className={styles.card} style={{marginTop: 12}}>
          <div className={styles.cardTitle}>Grupos · {clasif} pts</div>
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
        <div className={styles.card} style={{marginTop: 12}}>
          <div className={styles.cardTitle}>Torneo · {tournament} pts</div>
          {[
            { key: 'champion',    label: 'Campeón',      p: points.champion    ?? 10 },
            { key: 'runnerUp',    label: 'Subcampeón',   p: points.runnerUp    ?? 6  },
            { key: 'revelation',  label: 'Revelación',   p: points.revelation  ?? 3  },
            { key: 'goldenBoot',  label: 'Bota de Oro',  p: points.goldenBoot  ?? 5  },
            { key: 'goldenGlove', label: 'Guante de Oro',p: points.goldenGlove ?? 5  },
            { key: 'mvp',         label: 'MVP',          p: points.mvp         ?? 5  },
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
    </div>
  );
}

/* ── Componente principal ── */
export default function RankingTab({ players, me, config }) {
  const [mode, setMode]         = useState('total');
  const [detail, setDetail]     = useState(null);
  const [showBracket, setShowBracket] = useState(false);

  const rows = Object.entries(players)
    .map(([id, p]) => ({ id, name: p.name, ...playerScore(p, config) }))
    .sort((a, b) => b[mode] - a[mode] || b.total - a.total);

  const medals = ['gold', 'silver', 'bronze'];

  if (detail) {
    return (
      <div className={styles.tabWrap}>
        <Breakdown player={players[detail]} config={config} onClose={() => setDetail(null)} />
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
          <div className={styles.rankName}>{r.name}</div>
          <div className={styles.rankPts}>{r[mode]} <small>pt</small></div>
          <span className={styles.rankArrow}>›</span>
        </div>
      ))}
    </div>
  );
}
