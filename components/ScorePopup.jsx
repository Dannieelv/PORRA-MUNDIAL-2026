'use client';
import { useEffect, useRef } from 'react';
import styles from './ScorePopup.module.css';

export default function ScorePopup({ points, onClose }) {
  const cardRef = useRef(null);
  const P = points;

  useEffect(() => {
    const handler = (e) => { if (cardRef.current && !cardRef.current.contains(e.target)) onClose(); };
    const onKey   = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('mousedown', handler);
    document.addEventListener('keydown',   onKey);
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

          <div className={styles.section}>⚽ Fase de grupos</div>
          <Row label="Signo acertado (1X2)"          val={P.sign}      />
          <Row label="Bonus marcador exacto"          val={P.exact}     />
          <Row label="Bonus diferencia de goles"      val={P.diff}      />
          <Row label="Bonus total de goles"           val={P.total}     />
          <Row label="Bonus ambos equipos marcan"     val={P.bothScore} />

          <div className={styles.section}>📊 Clasificación de grupo</div>
          <Row label="1º de grupo acertado"           val={P.clasif1}   />
          <Row label="2º de grupo acertado"           val={P.clasif2}   />

          <div className={styles.section}>🌍 Fase final</div>
          <Row label="Campeón del Mundial"            val={P.champion}   />
          <Row label="Subcampeón"                     val={P.runnerUp}   />
          <Row label="Cada semifinalista"             val={P.semi}       />
          <Row label="Bota de Oro"                    val={P.goldenBoot} />
          <Row label="Guante de Oro"                  val={P.goldenGlove}/>
          <Row label="MVP del torneo"                 val={P.mvp}        />
          <Row label="Equipo revelación"              val={P.revelation} />

        </div>
        <div className={styles.footer}>
          Marcador exacto en grupos = <strong>{(P.sign ?? 0) + (P.diff ?? 0) + (P.exact ?? 0)} pt</strong> base
        </div>
      </div>
    </div>
  );
}

function Row({ label, val }) {
  return (
    <div className={styles.row}>
      <div className={styles.rowLabel}>{label}</div>
      <div className={styles.rowVal}>+{val} pt</div>
    </div>
  );
}
