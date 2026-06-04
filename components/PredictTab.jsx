'use client';
import { useState } from 'react';
import { MATCHES, GROUPS, TEAMS, flag } from '@/lib/data';
import { fmtDate, isMatchLocked, matchPoints, defaultPicks } from '@/lib/scoring';
import styles from './Tabs.module.css';

export default function PredictTab({ me, config, onSave }) {
  const [phase, setPhase] = useState('scores');
  const [scores, setScores] = useState({ ...me.scores });
  const [groupPicks, setGroupPicks] = useState({ ...me.groupPicks });
  const [dirty, setDirty] = useState(false);

  const handleScore = (id, side, val) => {
    setScores(prev => ({ ...prev, [id]: { ...prev[id], [side]: val } }));
    setDirty(true);
  };
  const handleGroupPick = (group, idx, dir) => {
    const arr = [...(groupPicks[group] || defaultPicks(group))];
    [arr[idx], arr[idx + dir]] = [arr[idx + dir], arr[idx]];
    setGroupPicks(prev => ({ ...prev, [group]: arr }));
    setDirty(true);
  };
  const save = async () => {
    await onSave({ scores, groupPicks });
    setDirty(false);
  };

  return (
    <div className={styles.tabWrap}>
      <div className={styles.seg}>
        <button className={phase === 'scores' ? styles.segActive : ''} onClick={() => setPhase('scores')}>Resultados</button>
        <button className={phase === 'groups' ? styles.segActive : ''} onClick={() => setPhase('groups')}>Clasificación grupos</button>
      </div>

      {phase === 'scores' && [1, 2, 3].map(md => (
        <div key={md}>
          <div className={styles.mdTitle}>Jornada {md}</div>
          {MATCHES.filter(m => m.md === md).map(m => {
            const pred = scores[m.id] || { h: '', a: '' };
            const res = config.results[m.id];
            const locked = isMatchLocked(m, config.locked);
            const pts = res ? matchPoints(pred, res, m.mult, config.points) : null;
            return (
              <div key={m.id}>
                <div className={`${styles.match} ${locked ? styles.locked : ''}`}>
                  <div className={styles.team}>
                    <span className={styles.teamName}>{flag(m.t1)} {m.t1}</span>
                  </div>
                  <div className={styles.scoreIn}>
                    <input type="number" min="0" max="20" inputMode="numeric"
                      value={pred.h} disabled={locked}
                      onChange={e => handleScore(m.id, 'h', e.target.value)} />
                    <span className={styles.vs}>-</span>
                    <input type="number" min="0" max="20" inputMode="numeric"
                      value={pred.a} disabled={locked}
                      onChange={e => handleScore(m.id, 'a', e.target.value)} />
                  </div>
                  <div className={`${styles.team} ${styles.away}`}>
                    <span className={styles.teamName}>{m.t2} {flag(m.t2)}</span>
                  </div>
                </div>
                <div className={styles.meta}>
                  {fmtDate(m.date)}
                  {m.mult > 1 && <span className={styles.badgeMult}>×{m.mult}</span>}
                  {locked && <span className={styles.badgeLock}>cerrado</span>}
                  {res && <><span className={styles.resPill}>{res.h}-{res.a}</span>{pts != null && <span className={styles.badgePts}>+{pts}</span>}</>}
                </div>
              </div>
            );
          })}
        </div>
      ))}

      {phase === 'groups' && (
        <div>
          <p className={styles.hint}>Ordena cada grupo del 1.º al 4.º · +{config.points.clasif} pt por posición exacta</p>
          {GROUPS.map(g => {
            const picks = groupPicks[g] || defaultPicks(g);
            return (
              <div key={g} className={styles.card}>
                <h2 className={styles.cardTitle}>Grupo {g}</h2>
                {picks.map((nm, i) => (
                  <div key={nm} className={styles.match}>
                    <div className={styles.rankPos}>{i + 1}º</div>
                    <div className={styles.team}><span className={styles.teamName}>{flag(nm)} {nm}</span></div>
                    <div className={styles.arrows}>
                      <button disabled={i === 0} onClick={() => handleGroupPick(g, i, -1)} aria-label="subir">▲</button>
                      <button disabled={i === picks.length - 1} onClick={() => handleGroupPick(g, i, 1)} aria-label="bajar">▼</button>
                    </div>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      )}

      <div style={{ height: 72 }} />
      {dirty && (
        <div className={styles.stickyBar}>
          <button className={styles.btn} onClick={save}>💾 Guardar mi porra</button>
        </div>
      )}
    </div>
  );
}
