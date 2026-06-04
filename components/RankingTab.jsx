'use client';
import { useState } from 'react';
import { playerScore } from '@/lib/scoring';
import styles from './Tabs.module.css';

const MODES = [
  { key: 'total', label: 'Total' },
  { key: 'match', label: 'Partidos' },
  { key: 'clasif', label: 'Grupos' },
];

export default function RankingTab({ players, me, config }) {
  const [mode, setMode] = useState('total');

  const rows = Object.entries(players)
    .map(([id, p]) => ({ id, name: p.name, ...playerScore(p, config) }))
    .sort((a, b) => b[mode] - a[mode] || b.total - a.total);

  const medals = ['gold', 'silver', 'bronze'];

  return (
    <div className={styles.tabWrap}>
      <div className={styles.card}>
        <h2 className={styles.cardTitle}>🏆 Clasificación</h2>
        <div className={styles.seg}>
          {MODES.map(m => (
            <button key={m.key} className={mode === m.key ? styles.segActive : ''} onClick={() => setMode(m.key)}>
              {m.label}
            </button>
          ))}
        </div>
      </div>

      {rows.length === 0 && <div className={styles.empty}>Aún no hay jugadores.</div>}

      {rows.map((r, i) => (
        <div key={r.id} className={`${styles.rankRow} ${r.id === me?.id ? styles.rankMe : ''}`}>
          <div className={`${styles.rankPos} ${medals[i] ? styles[medals[i]] : ''}`}>{i + 1}</div>
          <div className={styles.rankName}>{r.name}</div>
          <div className={styles.rankPts}>{r[mode]} <small>pt</small></div>
        </div>
      ))}
    </div>
  );
}
