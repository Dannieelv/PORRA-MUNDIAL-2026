'use client';
import { useEffect, useRef } from 'react';
import styles from './ScorePopup.module.css';

export default function ScorePopup({ points, onClose }) {
  const cardRef = useRef(null);
  const total = points.sign + points.diff + points.exact;

  useEffect(() => {
    const handler = (e) => {
      if (cardRef.current && !cardRef.current.contains(e.target)) onClose();
    };
    document.addEventListener('mousedown', handler);
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', handler); document.removeEventListener('keydown', onKey); };
  }, [onClose]);

  return (
    <div className={styles.overlay} role="dialog" aria-modal="true" aria-label="Reglas de puntuación">
      <div className={styles.card} ref={cardRef}>
        <div className={styles.head}>
          <span>📊 Puntuación</span>
          <button className={styles.close} onClick={onClose} aria-label="Cerrar">✕</button>
        </div>
        <div className={styles.body}>
          <Row label="Signo 1X2 correcto" val={`+${points.sign} pt`} />
          <Row label="Diferencia de goles" sub="requiere 1X2 ✓" val={`+${points.diff} pt`} />
          <Row label="Resultado exacto" sub="requiere 1X2 ✓" val={`+${points.exact} pt`} />
          <Row label="Posición en clasificación de grupo" val={`+${points.clasif} pt`} />
          <Row label="Partido con multiplicador" val="× puntos" muted />
        </div>
        <div className={styles.footer}>
          Resultado exacto = <strong>{total} pt</strong> en total
        </div>
      </div>
    </div>
  );
}

function Row({ label, sub, val, muted }) {
  return (
    <div className={styles.row}>
      <div className={styles.rowLabel}>
        {label}
        {sub && <small>{sub}</small>}
      </div>
      <div className={`${styles.rowVal} ${muted ? styles.muted : ''}`}>{val}</div>
    </div>
  );
}
