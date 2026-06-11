'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import styles from './LandingPage.module.css';

const APP_URL = 'https://porra-mundial-2026-amber.vercel.app';

export default function LandingPage() {
  const router = useRouter();
  const [groupName, setGroupName] = useState('');
  const [code, setCode]           = useState('');
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState('');
  const [copied, setCopied]       = useState(false);

  const handleShare = () => {
    const msg = `⚽ ¿Crees que sabes de fútbol? Demuéstralo en la Porra del Mundial 2026 antes de que te deje en ridículo 😈\n\n👉 ${APP_URL}`;
    const waUrl = `https://wa.me/?text=${encodeURIComponent(msg)}`;
    window.open(waUrl, '_blank');
  };

  const handleCreate = async () => {
    if (groupName.trim().length < 2) { setError('Escribe al menos 2 caracteres'); return; }
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/create-group', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: groupName.trim() }),
      });
      if (!res.ok) throw new Error('Error al crear el grupo');
      const { groupId } = await res.json();
      localStorage.setItem(`porra_group_name_${groupId}`, groupName.trim());
      router.push(`/g/${groupId}`);
    } catch (e) {
      setError(e.message);
      setLoading(false);
    }
  };

  const handleJoin = () => {
    const trimmed = code.trim();
    if (!trimmed) { setError('Introduce el código o pega el link'); return; }
    const match = trimmed.match(/\/g\/([^/?#]+)/);
    const gId = (match ? match[1] : trimmed).toLowerCase();
    router.push(`/g/${gId}`);
  };

  return (
    <div className={styles.root}>
      <div className={styles.noise} />

      <div className={styles.inner}>
        <div className={styles.hero}>
          <img src="/icons/logo.svg" alt="Logo" className={styles.logo} />
          <h1 className={styles.title}>PORRA<br /><span>MUNDIAL</span><br />2026</h1>
          <p className={styles.sub}>
            Predice los resultados del Mundial · Compite con tus amigos · Demuestra que lo sabes
          </p>
        </div>

        <div className={styles.twoCol}>
          {/* Crear grupo */}
          <div className={styles.card}>
            <div className={styles.cardLabel}>Crear grupo nuevo</div>
            <input
              className={styles.input}
              placeholder="Nombre del grupo"
              value={groupName}
              onChange={e => { setGroupName(e.target.value); setError(''); }}
              onKeyDown={e => e.key === 'Enter' && handleCreate()}
            />
            <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={handleCreate} disabled={loading}>
              {loading ? 'Creando…' : 'Crear'}
            </button>
          </div>

          <div className={styles.divider}>O</div>

          {/* Unirse */}
          <div className={styles.card}>
            <div className={styles.cardLabel}>Unirse a un grupo</div>
            <input
              className={styles.input}
              placeholder="Código o link del grupo"
              value={code}
              onChange={e => { setCode(e.target.value); setError(''); }}
              onKeyDown={e => e.key === 'Enter' && handleJoin()}
            />
            <button className={`${styles.btn} ${styles.btnSecondary}`} onClick={handleJoin}>
              Entrar
            </button>
          </div>
        </div>

        {error && <p className={styles.error}>{error}</p>}

        <button className={styles.shareBtn} onClick={handleShare}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.127.558 4.122 1.532 5.849L0 24l6.335-1.652A11.954 11.954 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.9 0-3.681-.524-5.205-1.435l-.373-.223-3.865 1.008 1.035-3.763-.243-.386A9.958 9.958 0 012 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/></svg>
          Invitar amigos por WhatsApp
        </button>

        <div className={styles.features}>
          <div className={styles.feat}><span className={styles.featN}>48</span><span className={styles.featL}>Partidos</span></div>
          <div className={styles.featDivider} />
          <div className={styles.feat}><span className={styles.featN}>∞</span><span className={styles.featL}>Jugadores</span></div>
          <div className={styles.featDivider} />
          <div className={styles.feat}><span className={styles.featN}>FREE</span><span className={styles.featL}>Por ahora</span></div>
        </div>
      </div>
    </div>
  );
}
