'use client';
import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import styles from './WelcomePopup.module.css';

export default function WelcomePopup() {
  const [phase, setPhase] = useState('hidden'); // hidden | entering | visible | closing
  const timerRef = useRef(null);

  useEffect(() => {
    // Arranca siempre al montar (cada vez que se abre la app)
    timerRef.current = setTimeout(() => setPhase('entering'), 80);
    return () => clearTimeout(timerRef.current);
  }, []);

  const close = () => {
    if (phase === 'closing' || phase === 'hidden') return;
    setPhase('closing');
    setTimeout(() => setPhase('hidden'), 320);
  };

  if (phase === 'hidden') return null;

  return (
    <div
      className={`${styles.overlay} ${phase === 'closing' ? styles.fadeOut : styles.fadeIn}`}
      onClick={close}
      role="dialog"
      aria-modal="true"
      aria-label="Bienvenida"
    >
      <div className={styles.card} onClick={close}>

        {/* Círculo verde decorativo */}
        <div className={`${styles.circle} ${phase === 'entering' ? styles.circleIn : ''}`} />

        {/* Imagen del jugador */}
        <div className={`${styles.imageWrap} ${phase === 'entering' ? styles.imageIn : ''}`}>
          <Image
            src="/jugador.png"
            alt="Jugador"
            width={260}
            height={300}
            style={{ objectFit: 'contain' }}
            priority
          />
        </div>

        {/* Texto */}
        <div className={`${styles.textWrap} ${phase === 'entering' ? styles.textIn : ''}`}>
          <p className={styles.textTop}>Porrita del</p>
          <p className={styles.textBottom}>Mundial 2026</p>
        </div>

      </div>
    </div>
  );
}
