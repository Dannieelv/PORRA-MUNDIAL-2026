'use client';
import { useState, useEffect, useCallback } from 'react';
import { slugify } from '@/lib/scoring';
import { createStore, normalizeConfig } from '@/lib/store';
import PredictTab from './PredictTab';
import RankingTab from './RankingTab';
import MatchesTab from './MatchesTab';
import AdminTab from './AdminTab';
import ScorePopup from './ScorePopup';
import BetsTab from './BetsTab';
import styles from './PorraApp.module.css';

const TABS = [
  { id: 'predict', label: 'Mi Porrita', icon: '📝' },
  { id: 'ranking', label: 'Ranking',   icon: '🏆' },
  { id: 'bets',    label: 'Porras',    icon: '👀' },
  { id: 'matches', label: 'Partidos',  icon: '📅' },
  { id: 'admin',   label: 'Admin',     icon: '⚙️' },
];

export default function PorraApp() {
  const [store, setStore] = useState(null);
  const [config, setConfig] = useState(normalizeConfig());
  const [players, setPlayers] = useState({});
  const [me, setMe] = useState(null);
  const [tab, setTab] = useState('predict');
  const [banner, setBanner] = useState({ msg: '', kind: '' });
  const [showScore, setShowScore] = useState(false);

  // Init store
  useEffect(() => {
    createStore().then(s => {
      setStore(s);
      if (s.type === 'local') {
        setBanner({ msg: 'Modo LOCAL · Configura Firebase para compartir con todos', kind: 'warn' });
        setTimeout(() => setBanner({ msg: '', kind: '' }), 6000);
      } else {
        setBanner({ msg: '☁️ Conectado · datos en tiempo real', kind: 'ok' });
        setTimeout(() => setBanner({ msg: '', kind: '' }), 3000);
      }
      const unsub = s.subscribe(({ config: c, players: p }) => {
        setConfig(normalizeConfig(c));
        setPlayers(p);
      });
      return unsub;
    });
  }, []);

  // Restore me from localStorage
  useEffect(() => {
    const savedId = localStorage.getItem('porra_me');
    if (savedId) {
      setPlayers(prev => {
        if (prev[savedId]) {
          setMe({ id: savedId, ...prev[savedId] });
        }
        return prev;
      });
    }
  }, [players]);

  const enter = useCallback((name, pin) => {
    if (!store) return;
    const id = slugify(name);
    const existing = players[id];
    if (existing) {
      if (existing.pin && existing.pin !== pin) return 'PIN incorrecto para ese nombre';
      const player = { id, ...existing };
      setMe(player);
      localStorage.setItem('porra_me', id);
    } else {
      const player = { id, name, pin, scores: {}, groupPicks: {} };
      setMe(player);
      store.savePlayer(id, { name, pin, scores: {}, groupPicks: {} });
      localStorage.setItem('porra_me', id);
    }
    return null;
  }, [store, players]);

  const savePlayer = useCallback(async ({ scores, groupPicks }) => {
    if (!me || !store) return;
    const updated = { ...me, scores, groupPicks };
    setMe(updated);
    await store.savePlayer(me.id, { name: me.name, pin: me.pin || '', scores, groupPicks });
  }, [me, store]);

  const saveConfig = useCallback(async (newConfig) => {
    if (!store) return;
    await store.saveConfig(newConfig);
    setConfig(normalizeConfig(newConfig));
  }, [store]);

  if (!me) {
    return <Welcome players={players} onEnter={enter} loading={!store} />;
  }

  const meWithLatest = players[me.id] ? { ...me, ...players[me.id], id: me.id } : me;

  return (
    <div className={styles.root}>
      <header className={styles.header}>
        <div className={styles.brand}>
          <span className={styles.ball}>⚽</span>
          <h1>Porra Mundial <span>2026</span></h1>
        </div>
        <div className={styles.who}>
          <span className={styles.whoName}>👤 {me.name}</span>
          <button className={styles.infoBtn} onClick={() => setShowScore(true)} title="Ver puntuación" aria-label="Ver reglas de puntuación">📊</button>
        </div>
      </header>

      {banner.msg && <div className={`${styles.banner} ${styles[banner.kind]}`}>{banner.msg}</div>}

      <main className={styles.main}>
        {tab === 'predict' && <PredictTab me={meWithLatest} config={config} onSave={savePlayer} />}
        {tab === 'ranking' && <RankingTab players={players} me={me} config={config} />}
        {tab === 'bets'    && <BetsTab players={players} me={me} config={config} />}
        {tab === 'matches' && <MatchesTab config={config} />}
        {tab === 'admin'   && <AdminTab config={config} onSaveConfig={saveConfig} />}
      </main>

      <nav className={styles.tabbar}>
        {TABS.map(t => (
          <button key={t.id} className={`${styles.tabBtn} ${tab === t.id ? styles.tabActive : ''}`} onClick={() => setTab(t.id)}>
            <span>{t.icon}</span>{t.label}
          </button>
        ))}
      </nav>

      {showScore && <ScorePopup points={config.points} onClose={() => setShowScore(false)} />}
    </div>
  );
}

function Welcome({ players, onEnter, loading }) {
  const [name, setName] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const names = Object.values(players).map(p => p.name);

  const submit = () => {
    if (name.trim().length < 2) { setError('Escribe al menos 2 caracteres'); return; }
    const err = onEnter(name.trim(), pin.trim());
    if (err) setError(err);
  };

  return (
    <div className={styles.welcomeWrap}>
      <div className={styles.welcomeInner}>
        <div className={styles.bigBall}>⚽🏆</div>
        <h1 className={styles.bigTitle}>Porra Mundial 2026</h1>
        <p className={styles.sub}>Pon tu nombre, predice los partidos y compite con todos en la clasificación.</p>

        <div className={styles.welcomeCard}>
          <div className={styles.field}>
            <label htmlFor="nm">Tu nombre</label>
            <input id="nm" list="existing" placeholder="Ej. Daniel" autoComplete="off"
              value={name} onChange={e => { setName(e.target.value); setError(''); }}
              onKeyDown={e => e.key === 'Enter' && submit()} />
            <datalist id="existing">{names.map(n => <option key={n} value={n} />)}</datalist>
          </div>
          <div className={styles.field}>
            <label htmlFor="pin">PIN (opcional, para proteger tu porra)</label>
            <input id="pin" type="password" inputMode="numeric" maxLength={6} placeholder="4 dígitos"
              value={pin} onChange={e => setPin(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && submit()} />
          </div>
          {error && <p className={styles.errMsg}>{error}</p>}
          <button className={styles.enterBtn} onClick={submit} disabled={loading}>
            {loading ? 'Cargando…' : 'Entrar ⚽'}
          </button>
        </div>

        {names.length > 0 && (
          <p className={styles.players}>
            Ya juegan: {names.map(n => <span key={n} className={styles.chip}>{n}</span>)}
          </p>
        )}
      </div>
    </div>
  );
}

// Field helper
function Field({ id, label, children }) {
  return (
    <div className={styles.field}>
      {label && <label htmlFor={id}>{label}</label>}
      {children}
    </div>
  );
}
