'use client';
import { useState } from 'react';
import { MATCHES, GROUPS } from '@/lib/data';
import { standings, fmtDate, matchPoints, knockoutMatchPoints, playerScore } from '@/lib/scoring';
import TeamFlag from './TeamFlag';
import Countdown from './Countdown';
import styles from './Tabs.module.css';
import mt from './MatchesTab.module.css';

const STAGE_LABELS = {
  LAST_16:        'Dieciseisavos de Final',
  QUARTER_FINALS: 'Cuartos de Final',
  SEMI_FINALS:    'Semifinales',
  FINAL:          'Final',
};
const STAGE_SHORT = { LAST_16:'1/8', QUARTER_FINALS:'1/4', SEMI_FINALS:'SF', FINAL:'Final' };
const STAGE_ORDER = ['LAST_16', 'QUARTER_FINALS', 'SEMI_FINALS', 'FINAL'];

/* ── Bracket visual de eliminatorias ── */
function KnockoutBracket({ config, players, me }) {
  const koMatches  = config.knockoutMatches  || [];
  const koResults  = config.knockoutResults  || {};
  const mePlayer   = me ? players[me.id] : null;

  if (!koMatches.length) return null;

  const stagesInUse = STAGE_ORDER.filter(s => koMatches.some(m => m.stage === s));

  return (
    <div style={{ overflowX: 'auto', marginBottom: 16 }}>
      <div style={{ display: 'flex', gap: 0, minWidth: stagesInUse.length * 160 }}>
        {stagesInUse.map(stage => {
          const sm = koMatches.filter(m => m.stage === stage);
          return (
            <div key={stage} style={{ flex: 1, minWidth: 150 }}>
              {/* Cabecera columna */}
              <div style={{
                background: 'var(--accent)', color: '#000',
                fontFamily: 'var(--font-bebas), Bebas Neue, sans-serif',
                fontSize: 13, letterSpacing: '0.1em',
                padding: '5px 8px', textAlign: 'center',
                borderRight: stage !== stagesInUse[stagesInUse.length - 1] ? '1px solid var(--surface-3)' : 'none',
              }}>
                {STAGE_SHORT[stage]}
              </div>
              {/* Partidos */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, padding: '6px 4px' }}>
                {sm.map(m => {
                  const res      = koResults[m.id];
                  const hasRes   = res && res.h !== '';
                  const myPred   = mePlayer?.knockoutScores?.[m.id];
                  const hasPred  = myPred && myPred.h !== '';
                  const pts      = hasRes && hasPred ? knockoutMatchPoints(myPred, res, m.mult, config.points) : null;
                  const winnerT  = hasRes ? (+res.h > +res.a ? m.t1 : +res.a > +res.h ? m.t2 : null) : null;

                  return (
                    <div key={m.id} style={{
                      background: 'var(--bg-deep)',
                      border: '1px solid var(--surface-3)',
                      padding: '6px 7px', fontSize: 11,
                    }}>
                      {/* Equipo local */}
                      <div style={{
                        display: 'flex', alignItems: 'center', gap: 4,
                        fontWeight: 800,
                        color: winnerT === m.t1 ? 'var(--accent)' : 'var(--text)',
                        opacity: hasRes && winnerT !== m.t1 ? 0.5 : 1,
                        marginBottom: 4,
                      }}>
                        <TeamFlag name={m.t1} size={14} />
                        <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.t1}</span>
                        {hasRes && <span style={{ fontFamily: 'var(--font-bebas)', fontSize: 15, color: 'var(--text)' }}>{res.h}</span>}
                      </div>
                      {/* Equipo visitante */}
                      <div style={{
                        display: 'flex', alignItems: 'center', gap: 4,
                        fontWeight: 800,
                        color: winnerT === m.t2 ? 'var(--accent)' : 'var(--text)',
                        opacity: hasRes && winnerT !== m.t2 ? 0.5 : 1,
                      }}>
                        <TeamFlag name={m.t2} size={14} />
                        <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.t2}</span>
                        {hasRes && <span style={{ fontFamily: 'var(--font-bebas)', fontSize: 15, color: 'var(--text)' }}>{res.a}</span>}
                      </div>
                      {/* Tu predicción */}
                      {hasPred && (
                        <div style={{
                          marginTop: 5, paddingTop: 4,
                          borderTop: '1px solid var(--surface-3)',
                          fontSize: 10, color: pts > 0 ? 'var(--accent)' : 'var(--text-muted)',
                          fontWeight: 700,
                        }}>
                          Tú: {myPred.h}-{myPred.a}{pts !== null ? ` · +${pts}pt` : ''}
                        </div>
                      )}
                      {/* Multiplicador */}
                      {m.mult > 1 && (
                        <div style={{ marginTop: 3, fontSize: 9, color: 'var(--gold)', fontWeight: 900 }}>×{m.mult}</div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function MatchesTab({ config, players, me }) {
  const hasKnockout = (config.knockoutMatches || []).length > 0;
  const [view, setView]         = useState('results');
  const [openMatch, setOpenMatch] = useState(null);

  const knockoutByStage = STAGE_ORDER
    .map(stage => ({
      stage,
      label: STAGE_LABELS[stage],
      matches: (config.knockoutMatches || []).filter(m => m.stage === stage),
    }))
    .filter(s => s.matches.length > 0);

  return (
    <div className={styles.tabWrap}>
      <div className={styles.seg}>
        <button className={view === 'results'  ? styles.segActive : ''} onClick={() => setView('results')}>Grupos</button>
        {hasKnockout && (
          <button className={view === 'knockout' ? styles.segActive : ''} onClick={() => setView('knockout')}>Resultados</button>
        )}
        {hasKnockout && (
          <button className={view === 'bracket'  ? styles.segActive : ''} onClick={() => setView('bracket')}>Bracket</button>
        )}
        <button className={view === 'tables'   ? styles.segActive : ''} onClick={() => setView('tables')}>Tablas</button>
      </div>

      {/* ── Resultados grupos ── */}
      {view === 'results' && [1, 2, 3].map(md => (
        <div key={md}>
          <div className={styles.mdTitle}>Jornada {md}</div>
          {MATCHES.filter(m => m.md === md).map(m => {
            const r      = config.results[m.id];
            const hasRes = r && r.h !== '';
            const isOpen = openMatch === m.id;
            return (
              <div key={m.id}>
                <div
                  className={`${styles.match} ${hasRes ? mt.clickable : ''}`}
                  onClick={() => hasRes && setOpenMatch(isOpen ? null : m.id)}
                >
                  <div className={styles.team}><TeamFlag name={m.t1} size={20} /><span className={styles.teamName}>{m.t1}</span></div>
                  <div className={styles.resPill}>{hasRes ? `${r.h}-${r.a}` : '—'}</div>
                  <div className={`${styles.team} ${styles.away}`}><span className={styles.teamName}>{m.t2}</span><TeamFlag name={m.t2} size={20} /></div>
                  {hasRes && <span className={mt.expandIcon}>{isOpen ? '▲' : '▼'}</span>}
                </div>
                <div className={styles.meta} style={{ marginBottom: isOpen ? 0 : 8 }}>
                  {fmtDate(m.date)} · <Countdown match={m} />
                </div>
                {isOpen && hasRes && (
                  <WhoGotIt match={m} result={r} players={players} config={config} isKnockout={false} />
                )}
              </div>
            );
          })}
        </div>
      ))}

      {/* ── Eliminatorias ── */}
      {view === 'knockout' && hasKnockout && knockoutByStage.map(({ stage, label, matches }) => (
        <div key={stage}>
          <div className={styles.mdTitle}>{label}</div>
          {matches.map(m => {
            const r      = (config.knockoutResults || {})[m.id];
            const hasRes = r && r.h !== '';
            const isOpen = openMatch === m.id;
            return (
              <div key={m.id}>
                <div
                  className={`${styles.match} ${hasRes ? mt.clickable : ''}`}
                  onClick={() => hasRes && setOpenMatch(isOpen ? null : m.id)}
                >
                  <div className={styles.team}><TeamFlag name={m.t1} size={20} /><span className={styles.teamName}>{m.t1}</span></div>
                  <div className={styles.resPill}>{hasRes ? `${r.h}-${r.a}` : '—'}</div>
                  <div className={`${styles.team} ${styles.away}`}><span className={styles.teamName}>{m.t2}</span><TeamFlag name={m.t2} size={20} /></div>
                  {hasRes && <span className={mt.expandIcon}>{isOpen ? '▲' : '▼'}</span>}
                </div>
                <div className={styles.meta} style={{ marginBottom: isOpen ? 0 : 8 }}>
                  {fmtDate(m.date)}
                  {m.mult > 1 && <span className={styles.badgeMult}>×{m.mult}</span>}
                </div>
                {isOpen && hasRes && (
                  <WhoGotIt match={m} result={r} players={players} config={config} isKnockout={true} />
                )}
              </div>
            );
          })}
        </div>
      ))}

      {/* ── Bracket visual ── */}
      {view === 'bracket' && hasKnockout && (
        <KnockoutBracket config={config} players={players} me={me} />
      )}

      {/* ── Tablas de grupos ── */}
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

/* ── Componente "¿Quién acertó?" (grupos y eliminatorias) ── */
function WhoGotIt({ match, result, players, config, isKnockout }) {
  const pts = config.points;

  const rows = Object.entries(players)
    .map(([id, p]) => {
      const predScores = isKnockout ? p.knockoutScores : p.scores;
      const prd = predScores?.[match.id];
      if (!prd || prd.h === '' || prd.a === '') return null;

      const earned = isKnockout
        ? knockoutMatchPoints(prd, result, match.mult, pts)
        : matchPoints(prd, result, match.mult, pts);

      const exact = String(prd.h) === String(result.h) && String(prd.a) === String(result.a);
      const signP = Math.sign(+prd.h - +prd.a);
      const signR = Math.sign(+result.h - +result.a);
      const sign  = signP === signR;
      const diff  = (+prd.h - +prd.a) === (+result.h - +result.a);
      const total = (+prd.h + +prd.a) === (+result.h + +result.a);
      return { id, name: p.name, prd, earned, exact, sign, diff, total };
    })
    .filter(Boolean)
    .sort((a, b) => b.earned - a.earned);

  if (rows.length === 0) return (
    <div className={mt.whoWrap}>
      <p className={styles.empty} style={{ padding: '16px 0' }}>Nadie ha apostado este partido.</p>
    </div>
  );

  return (
    <div className={mt.whoWrap}>
      <div className={mt.whoTitle}>Pronósticos</div>
      {rows.map(r => (
        <div key={r.id} className={`${mt.whoRow} ${r.exact ? mt.whoExact : ''}`}>
          <span className={mt.whoName}>{r.name}</span>
          <span className={mt.whoPred}>{r.prd.h}–{r.prd.a}</span>
          <div className={mt.whoBadges}>
            {r.exact  && <span className={`${mt.badge} ${mt.badgeExact}`}>Exacto</span>}
            {!r.exact && r.sign  && <span className={`${mt.badge} ${mt.badgeSign}`}>1X2</span>}
            {!r.exact && r.diff  && <span className={`${mt.badge} ${mt.badgeDiff}`}>DG</span>}
            {!r.exact && r.total && <span className={`${mt.badge} ${mt.badgeTotal}`}>Goles</span>}
            {!r.sign  && !r.exact && <span className={`${mt.badge} ${mt.badgeMiss}`}>Fallo</span>}
          </div>
          <span className={`${mt.whoPts} ${r.earned > 0 ? mt.whoPtsPos : ''}`}>
            {r.earned > 0 ? `+${r.earned}` : '0'}
          </span>
        </div>
      ))}
    </div>
  );
}
