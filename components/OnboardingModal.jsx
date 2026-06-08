'use client';
import { useState } from 'react';
import styles from './OnboardingModal.module.css';

const STEPS = [
  {
    icon: (
      <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
        <rect x="6" y="4" width="22" height="30" stroke="#EA580B" strokeWidth="2.5"/>
        <line x1="11" y1="13" x2="23" y2="13" stroke="#EA580B" strokeWidth="2.5"/>
        <line x1="11" y1="18" x2="21" y2="18" stroke="#EA580B" strokeWidth="2.5"/>
        <line x1="11" y1="23" x2="19" y2="23" stroke="#EA580B" strokeWidth="2.5"/>
        <rect x="24" y="22" width="5" height="12" rx="0" transform="rotate(-45 24 22)" fill="#F59E0B"/>
        <polygon points="31,31 34,34 28,34" fill="#EA580B"/>
      </svg>
    ),
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
    icon: (
      <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
        <rect x="4"  y="22" width="9"  height="14" fill="#EA580B" opacity="0.6"/>
        <rect x="15" y="14" width="9"  height="22" fill="#EA580B"/>
        <rect x="26" y="26" width="9"  height="10" fill="#EA580B" opacity="0.6"/>
        <polygon points="19,2 21,8 27,8 22,12 24,18 19,14 14,18 16,12 11,8 17,8" fill="#F59E0B"/>
      </svg>
    ),
    title: 'Clasifica grupos',
    desc: 'Según tus resultados, se calcula automáticamente qué equipos quedan 1º y 2º de cada grupo.',
    points: [
      { label: '1º de grupo acertado', val: '+4 pts' },
      { label: '2º de grupo acertado', val: '+3 pts' },
    ],
  },
  {
    icon: (
      <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
        <path d="M20 3 L36 10 L36 22 C36 30 28 36 20 40 C12 36 4 30 4 22 L4 10 Z" stroke="#EA580B" strokeWidth="2.5" fill="#EA580B" fillOpacity="0.1"/>
        <polygon points="22,12 17,22 21,22 17,32 27,19 22,19" fill="#F59E0B"/>
      </svg>
    ),
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
    icon: (
      <img src="/icons/reaction-flipado.svg" alt="Flipado" width="40" height="40" />
    ),
    title: 'Reacciona y compite',
    desc: 'En la pestaña Porras puedes ver las apuestas de los demás y reaccionar con el Flipado a las más locas. Recibirás notificación si te reaccionan a ti.',
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
          <img src="/icons/logo.svg" alt="Logo" style={{ width: 28, height: 28 }} />
          <span className={styles.logo}>PORRA MUNDIAL 2026</span>
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
            <button className={styles.btnBack} onClick={() => setStep(s => s - 1)}>‹ Atrás</button>
          )}
          <button className={styles.btnNext} onClick={() => isLast ? onClose() : setStep(s => s + 1)}>
            {isLast ? 'Empezar a apostar' : 'Siguiente ›'}
          </button>
        </div>
      </div>
    </div>
  );
}
