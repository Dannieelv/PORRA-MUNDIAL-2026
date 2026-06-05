'use client';
import { useState } from 'react';
import { MATCHES, GROUPS } from '@/lib/data';
import { fmtDate, isMatchLocked, matchPoints, defaultPicks } from '@/lib/scoring';
import TeamFlag from './TeamFlag';
import styles from './Tabs.module.css';
import bets from './BetsTab.module.css';

export default function BetsTab({ players, me, config }) {
  const list = Object.values(players).sort((a, b) => a.name.localeCompare(b.name));
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
          {list.map(p => {
            const id = Object.keys(players).find(k => players[k] === p);
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

  const scores = player.scores || {};
  const groupPicks = player.groupPicks || {};

  return (
    <div className={styles.tabWrap}>
      {/* Header del jugador */}
      <div className={bets.playerHeader}>
        <button className={bets.backBtn} onClick={() => setSelected(null)}>← Volver</button>
        <div className={bets.playerTitle}>
          <span className={bets.bigAvatar}>{player.name[0].toUpperCase()}</span>
          <span className={bets.playerName}>{player.name}</span>
          {selected === me?.id && <span className={bets.meBadge}>Tú</span>}
        </div>
      </div>

      {/* Selector Resultados / Grupos */}
      <div className={styles.seg}>
        <button className={phase === 'scores' ? styles.segActive : ''} onClick={() => setPhase('scores')}>
          Resultados
        </button>
        <button className={phase === 'groups' ? styles.segActive : ''} onClick={() => setPhase('groups')}>
          Clasificación grupos
        </button>
      </div>

      {/* Resultados */}
      {phase === 'scores' && (
        <>
          {[1, 2, 3].map(md => (
            <div key={md}>
              <div className={styles.mdTitle}>Jornada {md}</div>
              {MATCHES.filter(m => m.md === md).map(m => {
                const pred = scores[m.id] || { h: '', a: '' };
                const res = config.results?.[m.id];
                const locked = isMatchLocked(m, config.locked);
                const hasPred = pred.h !== '' && pred.a !== '';
                const pts = res && hasPred ? matchPoints(pred, res, m.mult, config.points) : null;

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
          <p className={styles.hint}>Clasificación que predice {player.name} para cada grupo.</p>
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

      <div style={{ height: 72 }} />
    </div>
  );
}
