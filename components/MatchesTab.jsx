'use client';
import { useState } from 'react';
import { MATCHES, GROUPS } from '@/lib/data';
import { standings, fmtDate, matchPoints, isMatchLocked } from '@/lib/scoring';
import TeamFlag from './TeamFlag';
import Countdown from './Countdown';
import styles from './Tabs.module.css';
import mt from './MatchesTab.module.css';

export default function MatchesTab({ config, players }) {
  const [view, setView]       = useState('results');
  const [openMatch, setOpenMatch] = useState(null);

  return (
    <div className={styles.tabWrap}>
      <div className={styles.seg}>
        <button className={view === 'results' ? styles.segActive : ''} onClick={() => setView('results')}>Resultados</button>
        <button className={view === 'tables'  ? styles.segActive : ''} onClick={() => setView('tables')}>Grupos</button>
      </div>

      {view === 'results' && [1, 2, 3].map(md => (
        <div key={md}>
          <div className={styles.mdTitle}>Jornada {md}</div>
          {MATCHES.filter(m => m.md === md).map(m => {
            const r       = config.results[m.id];
            const hasRes  = r && r.h !== '';
            const isOpen  = openMatch === m.id;

            return (
              <div key={m.id}>
                <div
                  className={`${styles.match} ${hasRes ? mt.clickable : ''}`}
                  onClick={() => hasRes && setOpenMatch(isOpen ? null : m.id)}
                >
                  <div className={styles.team}><TeamFlag name={m.t1} size={20} /><span className={styles.teamName}>{m.t1}</span></div>
                  <div className={styles.resPill}>{hasRes ? `${r.h}-${r.a}` : '—'}</div>
                  <div className={`${styles.team} ${styles.away}`}><span className={styles.teamName}>{m.t2}</span><TeamFlag name={m.t2} size={20} /></div>
                  {hasRes && (
                    <span className={mt.expandIcon}>{isOpen ? '▲' : '▼'}</span>
                  )}
                </div>
                <div className={styles.meta} style={{ marginBottom: isOpen ? 0 : 8 }}>
                  {fmtDate(m.date)} · <Countdown match={m} />
                </div>

                {/* ── Panel ¿Quién acertó? ── */}
                {isOpen && hasRes && (
                  <WhoGotIt match={m} result={r} players={players} config={config} />
                )}
              </div>
            );
          })}
        </div>
      ))}

      {view === 'tables' && GROUPS.map(g => {
        const st = standings(g, config.results);
        return (
          <div key={g} className={styles.card}>
            <h2 className={styles.cardTitle}>Grupo {g}</h2>
            <table className={styles.gtable}>
              <thead><tr><th></th><th className={styles.tn}>Equipo</th><th>PJ</th><th>DG</th><th>Pts</th></tr></thead>
              <tbody>
                {st.map((t, i) => (
                  <tr key={t.name} className={i < 2 ? styles[`q${i + 1}`] : ''}>
                    <td>{i + 1}</td>
                    <td className={styles.tn}><TeamFlag name={t.name} size={18} /> {t.name}</td>
                    <td>{t.pj}</td>
                    <td>{t.gf - t.gc > 0 ? '+' : ''}{t.gf - t.gc}</td>
                    <td><strong>{t.pts}</strong></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      })}
    </div>
  );
}

/* ── Componente "¿Quién acertó?" ── */
function WhoGotIt({ match, result, players, config }) {
  const pts = config.points;

  const rows = Object.entries(players)
    .map(([id, p]) => {
      const pred = p.scores?.[match.id];
      if (!pred || pred.h === '' || pred.a === '') return null;
      const earned = matchPoints(pred, result, match.mult, pts);
      const exact  = pred.h === result.h && pred.a === result.a;
      const signP  = Math.sign(+pred.h - +pred.a);
      const signR  = Math.sign(+result.h - +result.a);
      const sign   = signP === signR;
      const diff   = (+pred.h - +pred.a) === (+result.h - +result.a);
      const total  = (+pred.h + +pred.a) === (+result.h + +result.a);
      return { id, name: p.name, pred, earned, exact, sign, diff, total };
    })
    .filter(Boolean)
    .sort((a, b) => b.earned - a.earned);

  if (rows.length === 0) return (
    <div className={mt.whoWrap}><p className={styles.empty} style={{padding: '16px 0'}}>Nadie ha apostado este partido.</p></div>
  );

  return (
    <div className={mt.whoWrap}>
      <div className={mt.whoTitle}>Pronósticos</div>
      {rows.map(r => (
        <div key={r.id} className={`${mt.whoRow} ${r.exact ? mt.whoExact : ''}`}>
          <span className={mt.whoName}>{r.name}</span>
          <span className={mt.whoPred}>{r.pred.h}–{r.pred.a}</span>
          <div className={mt.whoBadges}>
            {r.exact && <span className={`${mt.badge} ${mt.badgeExact}`}>Exacto</span>}
            {!r.exact && r.sign  && <span className={`${mt.badge} ${mt.badgeSign}`}>1X2</span>}
            {!r.exact && r.diff  && <span className={`${mt.badge} ${mt.badgeDiff}`}>DG</span>}
            {!r.exact && r.total && <span className={`${mt.badge} ${mt.badgeTotal}`}>Goles</span>}
            {!r.sign && !r.exact && <span className={`${mt.badge} ${mt.badgeMiss}`}>Fallo</span>}
          </div>
          <span className={`${mt.whoPts} ${r.earned > 0 ? mt.whoPtsPos : ''}`}>
            {r.earned > 0 ? `+${r.earned}` : '0'}
          </span>
        </div>
      ))}
    </div>
  );
}
