'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import styles from './LandingPage.module.css';

export default function LandingPage() {
  const router = useRouter();
  const [mode, setMode]       = useState(null); // 'create' | 'join'
  const [name, setName]       = useState('');
  const [code, setCode]       = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  const handleCreate = async () => {
    if (name.trim().length < 2) { setError('Escribe al menos 2 caracteres'); return; }
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/create-group', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim() }),
      });
      if (!res.ok) throw new Error('Error al crear el grupo');
      const { groupId } = await res.json();
      router.push(`/g/${groupId}`);
    } catch (e) {
      setError(e.message);
      setLoading(false);
    }
  };

  const handleJoin = () => {
    const trimmed = code.trim();
    if (!trimmed) { setError('Introduce el código o pega el link'); return; }
    // Accept full URL or just the code
    const match = trimmed.match(/\/g\/([^/?#]+)/);
    const gId = match ? match[1] : trimmed;
    router.push(`/g/${gId}`);
  };

  return (
    <div className={styles.root}>
      {/* Fondo con ruido y gradiente */}
      <div className={styles.noise} />

      <div className={styles.inner}>
        {/* Logo + título */}
        <div className={styles.hero}>
          <img src="/icons/logo.svg" alt="Logo" className={styles.logo} />
          <h1 className={styles.title}>PORRA<br /><span>MUNDIAL</span><br />2026</h1>
          <p className={styles.sub}>
            Predice los resultados del Mundial · Compite con tus amigos · Demuestra que lo sabes
          </p>
        </div>

        {/* Cards de acción */}
        {!mode && (
          <div className={styles.actions}>
            <button className={`${styles.cta} ${styles.ctaPrimary}`} onClick={() => setMode('create')}>
              <span className={styles.ctaIcon}>+</span>
              <div>
                <div className={styles.ctaLabel}>Crear grupo</div>
                <div className={styles.ctaHint}>Nuevo grupo para tus amigos</div>
              </div>
            </button>
            <button className={`${styles.cta} ${styles.ctaSecondary}`} onClick={() => setMode('join')}>
              <span className={styles.ctaIcon}>→</span>
              <div>
                <div className={styles.ctaLabel}>Unirse a un grupo</div>
                <div className={styles.ctaHint}>Tengo un código o link</div>
              </div>
            </button>
          </div>
        )}

        {/* Formulario crear */}
        {mode === 'create' && (
          <div className={styles.form}>
            <button className={styles.back} onClick={() => { setMode(null); setError(''); }}>← Volver</button>
            <h2 className={styles.formTitle}>Nombre de tu grupo</h2>
            <p className={styles.formHint}>Ponle un nombre que identifique a vuestro grupo de amigos.</p>
            <input
              className={styles.input}
              placeholder="Ej. Los del curro, Cracks del barrio…"
              value={name}
              onChange={e => { setName(e.target.value); setError(''); }}
              onKeyDown={e => e.key === 'Enter' && handleCreate()}
              autoFocus
            />
            {error && <p className={styles.error}>{error}</p>}
            <button className={styles.submit} onClick={handleCreate} disabled={loading}>
              {loading ? 'Creando…' : 'Crear grupo'}
            </button>
          </div>
        )}

        {/* Formulario unirse */}
        {mode === 'join' && (
          <div className={styles.form}>
            <button className={styles.back} onClick={() => { setMode(null); setError(''); }}>← Volver</button>
            <h2 className={styles.formTitle}>Código o link de tu grupo</h2>
            <p className={styles.formHint}>Pega el link que te mandaron o escribe el código del grupo.</p>
            <input
              className={styles.input}
              placeholder="Ej. amigos-del-curro-a3f7k2"
              value={code}
              onChange={e => { setCode(e.target.value); setError(''); }}
              onKeyDown={e => e.key === 'Enter' && handleJoin()}
              autoFocus
            />
            {error && <p className={styles.error}>{error}</p>}
            <button className={styles.submit} onClick={handleJoin}>
              Entrar al grupo
            </button>
          </div>
        )}

        {/* Features */}
        {!mode && (
          <div className={styles.features}>
            <div className={styles.feat}>
              <span className={styles.featN}>48</span>
              <span className={styles.featL}>Partidos</span>
            </div>
            <div className={styles.featDivider} />
            <div className={styles.feat}>
              <span className={styles.featN}>∞</span>
              <span className={styles.featL}>Jugadores</span>
            </div>
            <div className={styles.featDivider} />
            <div className={styles.feat}>
              <span className={styles.featN}>FREE</span>
              <span className={styles.featL}>Por ahora</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
