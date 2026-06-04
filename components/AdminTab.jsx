'use client';
import { useState } from 'react';
import { MATCHES } from '@/lib/data';
import TeamFlag from './TeamFlag';
import { ADMIN_PIN } from '@/lib/firebase';
import { fmtDate } from '@/lib/scoring';
import styles from './Tabs.module.css';

export default function AdminTab({ config, onSaveConfig }) {
  const [unlocked, setUnlocked] = useState(false);
  const [pin, setPin] = useState('');
  const [points, setPoints] = useState({ ...config.points });
  const [locked, setLocked] = useState(config.locked);
  const [results, setResults] = useState({ ...config.results });
  const [toast, setToast] = useState('');

  const showToast = (msg, ok = true) => { setToast(msg); setTimeout(() => setToast(''), 2200); };

  if (!unlocked) {
    return (
      <div className={styles.tabWrap}>
        <div className={styles.card}>
          <h2 className={styles.cardTitle}>⚙️ Administración</h2>
          <p className={styles.hint}>Introduce el PIN de administrador para gestionar resultados y configuración.</p>
          <div className={styles.field}>
            <input type="password" inputMode="numeric" placeholder="PIN admin" value={pin}
              onChange={e => setPin(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && pin === ADMIN_PIN) setUnlocked(true); }} />
          </div>
          <button className={styles.btn} onClick={() => { if (pin === ADMIN_PIN) setUnlocked(true); else showToast('PIN incorrecto', false); }}>
            Entrar
          </button>
          {toast && <div className={`${styles.toast} ${styles.toastErr}`}>{toast}</div>}
        </div>
      </div>
    );
  }

  const saveCfg = async () => {
    await onSaveConfig({ ...config, points, locked });
    showToast('Ajustes guardados ✓');
  };
  const saveRes = async () => {
    const clean = {};
    Object.entries(results).forEach(([id, r]) => { if (r.h !== '' || r.a !== '') clean[id] = r; });
    await onSaveConfig({ ...config, points, locked, results: clean });
    showToast('Resultados guardados ✓');
  };
  const setRes = (id, side, val) => setResults(prev => ({ ...prev, [id]: { ...(prev[id] || { h: '', a: '' }), [side]: val } }));

  return (
    <div className={styles.tabWrap}>
      {toast && <div className={`${styles.toast} ${styles.toastOk}`}>{toast}</div>}

      <div className={styles.card}>
        <h2 className={styles.cardTitle}>Puntuación</h2>
        <div className={styles.row2}>
          {[['sign','Signo 1X2'],['diff','Dif. goles'],['exact','Exacto'],['clasif','Pos. grupo']].map(([k, label]) => (
            <div key={k} className={styles.field}>
              <label>{label}</label>
              <input type="number" value={points[k]} onChange={e => setPoints(p => ({ ...p, [k]: +e.target.value }))} />
            </div>
          ))}
        </div>
        <label className={styles.checkRow}>
          <input type="checkbox" checked={locked} onChange={e => setLocked(e.target.checked)} />
          Cerrar TODAS las predicciones
        </label>
        <button className={styles.btn} onClick={saveCfg}>Guardar ajustes</button>
      </div>

      <div className={styles.card}>
        <h2 className={styles.cardTitle}>Resultados reales</h2>
        <p className={styles.hint}>Introduce el marcador final de cada partido.</p>
        {[1, 2, 3].map(md => (
          <div key={md}>
            <div className={styles.mdTitle}>Jornada {md}</div>
            {MATCHES.filter(m => m.md === md).map(m => {
              const r = results[m.id] || { h: '', a: '' };
              return (
                <div key={m.id} className={styles.match}>
                  <div className={styles.team}><TeamFlag name={m.t1} size={20} /><span className={styles.teamName}>{m.t1}</span></div>
                  <div className={styles.scoreIn}>
                    <input type="number" min="0" inputMode="numeric" value={r.h} onChange={e => setRes(m.id, 'h', e.target.value)} />
                    <span className={styles.vs}>-</span>
                    <input type="number" min="0" inputMode="numeric" value={r.a} onChange={e => setRes(m.id, 'a', e.target.value)} />
                  </div>
                  <div className={`${styles.team} ${styles.away}`}><span className={styles.teamName}>{m.t2}</span><TeamFlag name={m.t2} size={20} /></div>
                </div>
              );
            })}
          </div>
        ))}
        <button className={styles.btn} style={{ marginTop: 14 }} onClick={saveRes}>Guardar resultados</button>
      </div>
      <div style={{ height: 40 }} />
    </div>
  );
}
