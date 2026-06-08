'use client';
import { useState } from 'react';
import styles from './OnboardingModal.module.css';

const STEPS = [
  {
    icon: '⚽',
    title: 'Apuesta los resultados',
    desc: 'Para cada partido, predice el marcador final. Tienes hasta el día anterior al partido para apostar.',
    points: [
      { label: 'Signo correcto (1X2)', val: '+3 pts' },
      { label: 'Diferencia de goles exacta', val: '+1 pt' },
      { label: 'Marcador exacto', val: '+5 pts' },
      { label: 'Total goles igual', val: '+1 pt' },
      { label: 'Ambos equipos marcan', val: '+1 pt' },
    ],
  },
  {
    icon: '📊',
    title: 'Clasifica grupos',
    desc: 'Según tus resultados, se calcula automáticamente qué equipos quedan 1º y 2º de cada grupo.',
    points: [
      { label: '1º de grupo acertado', val: '+4 pts' },
      { label: '2º de grupo acertado', val: '+3 pts' },
    ],
  },
  {
    icon: '🌍',
    title: 'Predice el torneo',
    desc: 'En la sección Torneo elige quién llega a semis, quien gana y los premios individuales.',
    points: [
      { label: 'Campeón', val: '+10 pts' },
      { label: 'Subcampeón', val: '+6 pts' },
      { label: 'Semifinalista (c/u)', val: '+3 pts' },
      { label: 'Bota de Oro / Guante / MVP', val: '+5 pts c/u' },
      { label: 'Revelación', val: '+3 pts' },
    ],
  },
  {
    icon: '😂',
    title: 'Reacciona y compite',
    desc: 'En la pestaña Porras puedes ver las apuestas de los demás y reaccionar con 😂 a las más locas. ¡Y recibirás notificación si te reaccionan a ti!',
    points: [],
  },
];

export default function OnboardingModal({ onClose }) {
  const [step, setStep] = useState(0);
  const s = STEPS[step];
  const isLast = step === STEPS.length - 1;

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <div className={styles.header}>
          <span className={styles.logo}>⚽ PORRA MUNDIAL 2026</span>
          <span className={styles.stepCount}>{step + 1}/{STEPS.length}</span>
        </div>

        <div className={styles.body}>
          <div className={styles.icon}>{s.icon}</div>
          <h2 className={styles.title}>{s.title}</h2>
          <p className={styles.desc}>{s.desc}</p>

          {s.points.length > 0 && (
            <div className={styles.pts}>
              {s.points.map(p => (
                <div key={p.label} className={styles.ptRow}>
                  <span className={styles.ptLabel}>{p.label}</span>
                  <span className={styles.ptVal}>{p.val}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className={styles.dots}>
          {STEPS.map((_, i) => (
            <span key={i} className={`${styles.dot} ${i === step ? styles.dotActive : ''}`} onClick={() => setStep(i)} />
          ))}
        </div>

        <div className={styles.footer}>
          {step > 0 && (
            <button className={styles.btnBack} onClick={() => setStep(s => s - 1)}>← Atrás</button>
          )}
          <button className={styles.btnNext} onClick={() => isLast ? onClose() : setStep(s => s + 1)}>
            {isLast ? '¡Empezar a apostar!' : 'Siguiente →'}
          </button>
        </div>
      </div>
    </div>
  );
}
