'use client';
import { useState } from 'react';
import { MATCHES, GROUPS } from '@/lib/data';
import { fmtDate, isMatchLocked, matchPoints, defaultPicks } from '@/lib/scoring';
import TeamFlag from './TeamFlag';
import styles from './Tabs.module.css';
import bets from './BetsTab.module.css';

export default function BetsTab({ players, me, config, reactions, onReact }) {
  const list = Object.entries(players).sort((a, b) => a[1].name.localeCompare(b[1].name, 'es'));
  const [selected, setSelected] = useState(null);
  const [phase, setPhase] = useState('scores');

  const player = selected ? players[selected] : null;

  if (!player) {
    return (
      <div className={styles.tabWrap}>
        <div className={styles.card}>
          <h2 className={styles.cardTitle}>👀 Ver apuestas</h2>
          <p className={styles.hint}>Elige un jugador para ver sus predicciones.</p>
        </div>

        {list.length === 0 && <div className={styles.empty}>Aún no hay jugadores.</div>}

        <div className={bets.grid}>
          {list.map(([id, p]) => {
            const isMe = id === me?.id;
            return (
              <button key={id} className={`${bets.playerCard} ${isMe ? bets.meCard : ''}`}
                onClick={() => { setSelected(id); setPhase('scores'); }}>
                <span className={bets.avatar}>{p.name[0].toUpperCase()}</span>
                <span className={bets.pname}>{p.name}</span>
                {isMe && <span className={bets.meBadge}>Tú</span>}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  const isOther = selected !== me?.id;
  const scores = player.scores || {};
  const groupPicks = player.groupPicks || {};
  const tournament = player.tournament || {};

  // Cuenta reacciones por partido
  const reactionCount = (matchId) =>
    Object.values(reactions || {}).filter(r => r.to === selected && r.matchId === matchId).length;
  const iReacted = (matchId) =>
    !!(reactions || {})[`${me?.id}_${matchId}_${selected}`];

  return (
    <div className={styles.tabWrap}>
      {/* Header */}
      <div className={bets.playerHeader}>
        <button className={bets.backBtn} onClick={() => setSelected(null)}>← Volver</button>
        <div className={bets.playerTitle}>
          <span className={bets.bigAvatar}>{player.name[0].toUpperCase()}</span>
          <span className={bets.playerName}>{player.name}</span>
          {!isOther && <span className={bets.meBadge}>Tú</span>}
        </div>
      </div>

      {/* Tabs */}
      <div className={styles.seg}>
        <button className={phase === 'scores'  ? styles.segActive : ''} onClick={() => setPhase('scores')}>Resultados</button>
        <button className={phase === 'groups'  ? styles.segActive : ''} onClick={() => setPhase('groups')}>Grupos</button>
        <button className={phase === 'torneo'  ? styles.segActive : ''} onClick={() => setPhase('torneo')}>🌍 Torneo</button>
      </div>

      {/* Resultados */}
      {phase === 'scores' && (
        <>
          {[1, 2, 3].map(md => (
            <div key={md}>
              <div className={styles.mdTitle}>Jornada {md}</div>
              {MATCHES.filter(m => m.md === md).map(m => {
                const pred = scores[m.id] || { h: '', a: '' };
                const res  = config.results?.[m.id];
                const locked = isMatchLocked(m, config.locked);
                const hasPred = pred.h !== '' && pred.a !== '';
                const pts = res && hasPred ? matchPoints(pred, res, m.mult, config.points) : null;
                const count = reactionCount(m.id);
                const myReact = iReacted(m.id);

                return (
                  <div key={m.id}>
                    <div className={`${styles.match} ${locked ? styles.locked : ''}`}>
                      <div className={styles.team}>
                        <TeamFlag name={m.t1} size={20} />
                        <span className={styles.teamName}>{m.t1}</span>
                      </div>
                      <div className={bets.predScore}>
                        {hasPred
                          ? <span className={bets.scoreDisplay}>{pred.h} - {pred.a}</span>
                          : <span className={bets.noPred}>{locked ? '—' : '?'}</span>
                        }
                      </div>
                      <div className={`${styles.team} ${styles.away}`}>
                        <span className={styles.teamName}>{m.t2}</span>
                        <TeamFlag name={m.t2} size={20} />
                      </div>
                    </div>

                    <div className={styles.meta}>
                      {fmtDate(m.date)}
                      {m.mult > 1 && <span className={styles.badgeMult}>×{m.mult}</span>}
                      {locked && <span className={styles.badgeLock}>cerrado</span>}
                      {res && (
                        <>
                          <span className={styles.resPill}>{res.h}-{res.a}</span>
                          {pts != null && <span className={styles.badgePts}>+{pts}</span>}
                        </>
                      )}
                      {!locked && !hasPred && <span className={bets.badgePending}>Sin rellenar</span>}

                      {/* Reacción 😂 — en cualquier predicción ya rellenada de otro jugador */}
                      {isOther && hasPred && (
                        <button
                          className={`${bets.reactBtn} ${myReact ? bets.reactActive : ''}`}
                          onClick={() => onReact(selected, m.id)}
                          title={myReact ? 'Quitar reacción' : '¡Qué locura! 😂'}
                        >
                          <img src="/icons/reaction-flipado.svg" alt="flipado" style={{ width: 18, height: 18, verticalAlign: 'middle' }} />
                          {' '}{count > 0 && <span className={bets.reactCount}>{count}</span>}
                        </button>
                      )}
                      {/* Mostrar reacciones recibidas (sin poder reaccionar a las propias) */}
                      {!isOther && count > 0 && (
                        <span className={bets.reactReceived}><img src="/icons/reaction-flipado.svg" alt="flipado" style={{ width: 14, height: 14, verticalAlign: 'middle' }} /> ×{count}</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </>
      )}

      {/* Grupos */}
      {phase === 'groups' && (
        <div>
          <p className={styles.hint}>Clasificación de grupos según sus predicciones.</p>
          {GROUPS.map(g => {
            const picks = groupPicks[g] || defaultPicks(g);
            return (
              <div key={g} className={styles.card}>
                <h2 className={styles.cardTitle}>Grupo {g}</h2>
                {picks.map((name, i) => (
                  <div key={name} className={bets.groupRow}>
                    <span className={bets.groupPos}>{i + 1}º</span>
                    <TeamFlag name={name} size={22} />
                    <span className={bets.groupName}>{name}</span>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      )}

      {/* Torneo */}
      {phase === 'torneo' && (
        <div>
          <div className={styles.card}>
            <h2 className={styles.cardTitle}>🏆 Ganadores</h2>
            <TRow label="Campeón" value={tournament.champion} />
            <TRow label="Subcampeón" value={tournament.runnerUp} />
            <TRow label="Equipo revelación" value={tournament.revelation} />
          </div>

          {(tournament.semis || []).length > 0 && (
            <div className={styles.card}>
              <h2 className={styles.cardTitle}>🥈 Semifinalistas</h2>
              {(tournament.semis || []).map(t => (
                <div key={t} className={bets.groupRow}>
                  <TeamFlag name={t} size={22} />
                  <span className={bets.groupName}>{t}</span>
                </div>
              ))}
            </div>
          )}

          <div className={styles.card}>
            <h2 className={styles.cardTitle}>🌟 Premios individuales</h2>
            <TRow label="Bota de Oro" value={tournament.goldenBoot} />
            <TRow label="Guante de Oro" value={tournament.goldenGlove} />
            <TRow label="MVP del torneo" value={tournament.mvp} />
          </div>
        </div>
      )}

      <div style={{ height: 72 }} />
    </div>
  );
}

function TRow({ label, value }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 4px', borderBottom: '1px solid #f0ecfa' }}>
      <span style={{ fontWeight: 700, color: '#7a7266', fontSize: 14 }}>{label}</span>
      <span style={{ fontWeight: 800, color: value ? '#2d2540' : '#c5b8e8', fontSize: 14 }}>
        {value || '—'}
      </span>
    </div>
  );
}
