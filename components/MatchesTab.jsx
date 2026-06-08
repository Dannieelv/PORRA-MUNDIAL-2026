'use client';
import { useState } from 'react';
import { MATCHES, GROUPS, TEAMS } from '@/lib/data';
import { standings, fmtDate } from '@/lib/scoring';
import TeamFlag from './TeamFlag';
import Countdown from './Countdown';
import styles from './Tabs.module.css';

export default function MatchesTab({ config }) {
  const [view, setView] = useState('results');

  return (
    <div className={styles.tabWrap}>
      <div className={styles.seg}>
        <button className={view === 'results' ? styles.segActive : ''} onClick={() => setView('results')}>Resultados</button>
        <button className={view === 'tables' ? styles.segActive : ''} onClick={() => setView('tables')}>Grupos</button>
      </div>

      {view === 'results' && [1, 2, 3].map(md => (
        <div key={md}>
          <div className={styles.mdTitle}>Jornada {md}</div>
          {MATCHES.filter(m => m.md === md).map(m => {
            const r = config.results[m.id];
            return (
              <div key={m.id}>
                <div className={styles.match}>
                  <div className={styles.team}><TeamFlag name={m.t1} size={20} /><span className={styles.teamName}>{m.t1}</span></div>
                  <div className={styles.resPill}>{r && r.h !== '' ? `${r.h}-${r.a}` : '—'}</div>
                  <div className={`${styles.team} ${styles.away}`}><span className={styles.teamName}>{m.t2}</span><TeamFlag name={m.t2} size={20} /></div>
                </div>
                <div className={styles.meta} style={{marginBottom: 8}}>
                  {fmtDate(m.date)} · <Countdown match={m} />
                </div>
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
