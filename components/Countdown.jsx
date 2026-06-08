'use client';
import { useState, useEffect } from 'react';
import { getCountdown } from '@/lib/scoring';
import styles from './Countdown.module.css';

export default function Countdown({ match }) {
  const [cd, setCd] = useState(() => getCountdown(match));

  useEffect(() => {
    setCd(getCountdown(match));
    const id = setInterval(() => setCd(getCountdown(match)), 60000);
    return () => clearInterval(id);
  }, [match.date]);

  if (cd.expired) return (
    <span className={styles.expired}>CERRADO</span>
  );

  return (
    <span className={`${styles.cd} ${cd.urgent ? styles.urgent : ''} ${cd.veryUrgent ? styles.veryUrgent : ''}`}>
      {cd.text}
    </span>
  );
}
