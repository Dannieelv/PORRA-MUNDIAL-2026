'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import { slugify, autoGroupPicks, getDeadline, getKnockoutDeadline, playerScore } from '@/lib/scoring';
import { createStore, normalizeConfig } from '@/lib/store';
import { GROUPS, MATCHES } from '@/lib/data';
import PredictTab from './PredictTab';
import RankingTab from './RankingTab';
import MatchesTab from './MatchesTab';
import AdminTab from './AdminTab';
import BetsTab from './BetsTab';
import ScorePopup from './ScorePopup';
import OnboardingModal from './OnboardingModal';
import styles from './PorraApp.module.css';

const VAPID_PUBLIC = 'BCtEG7SpkyP_evxcDd4cErkyoJcXscRJeoRUc4XiqogdCWKHoeJ_mzrDia5repb75qRc__dcyW4K5ZRjYoyqU5g';

async function subscribePush(playerId) {
  try {
    if (!('Notification' in window) || !('serviceWorker' in navigator)) return;
    const perm = await Notification.requestPermission();
    if (perm !== 'granted') return;
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: VAPID_PUBLIC,
    });
    await fetch('/api/push', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'subscribe', playerId, subscription: sub.toJSON() }),
    });
  } catch (e) { console.warn('Push subscribe failed:', e); }
}

async function sendPushNotification(toPlayerId, payload) {
  try {
    await fetch('/api/push', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'notify', playerId: toPlayerId, payload }),
    });
  } catch (e) { console.warn('Push notify failed:', e); }
}

const TABS = [
  { id: 'predict', label: 'Mi Porrita', icon: '/icons/tab-predict.svg' },
  { id: 'ranking', label: 'Ranking',    icon: '/icons/tab-ranking.svg' },
  { id: 'bets',    label: 'Porras',     icon: '/icons/tab-bets.svg' },
  { id: 'matches', label: 'Partidos',   icon: '/icons/tab-matches.svg' },
  { id: 'admin',   label: 'Admin',      icon: '/icons/tab-admin.svg' },
];

export default function PorraApp() {
  const [store, setStore]       = useState(null);
  const [config, setConfig]     = useState(normalizeConfig());
  const [players, setPlayers]   = useState({});
  const [reactions, setReactions] = useState({});
  const [me, setMe]             = useState(null);
  const [tab, setTab]           = useState('predict');
  const [banner, setBanner]     = useState({ msg: '', kind: '' });
  const [showScore, setShowScore]     = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [reactionNote, setReactionNote] = useState('');
  const lastSeenRef    = useRef(0);
  const reminderTimers = useRef([]);
  const myRankRef      = useRef(null); // posición anterior en el ranking

  // Inicializar lastSeen desde localStorage (solo en cliente)
  useEffect(() => {
    lastSeenRef.current = +(localStorage.getItem('porra_reactions_seen') || 0);
  }, []);

  // Escuchar SW_UPDATED y recargar para aplicar el nuevo service worker
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    const handler = (e) => {
      if (e.data?.type === 'SW_UPDATED') window.location.reload();
    };
    navigator.serviceWorker.addEventListener('message', handler);
    return () => navigator.serviceWorker.removeEventListener('message', handler);
  }, []);

  // ── Detectar cuando alguien te adelanta en el ranking ──────────
  useEffect(() => {
    if (!me || Object.keys(players).length === 0) return;
    const ranking = Object.entries(players)
      .map(([id, p]) => ({ id, total: playerScore(p, config).total }))
      .sort((a, b) => b.total - a.total);
    const myPos = ranking.findIndex(r => r.id === me.id);
    if (myPos === -1) return;
    const prevPos = myRankRef.current;
    if (prevPos !== null && myPos > prevPos) {
      // Alguien nos ha adelantado
      const who = ranking[myPos - 1];
      const whoName = players[who?.id]?.name || 'Alguien';
      setReactionNote(`${whoName} te ha adelantado en el ranking`);
      setTimeout(() => setReactionNote(''), 6000);
      // Push notification si la app está en segundo plano
      if ('serviceWorker' in navigator && Notification.permission === 'granted') {
        navigator.serviceWorker.ready.then(reg => {
          reg.showNotification(`${whoName} te ha adelantado`, {
            body: 'Revisa el ranking y remonta en la Porra 2026',
            icon: '/icons/icon-192.png',
            badge: '/icons/icon-192.png',
            tag: 'rank_change',
            data: { url: '/' },
          });
        }).catch(() => {});
      }
    }
    myRankRef.current = myPos;
  }, [players, config, me?.id]);

  // ── Recordatorios 1h antes del cierre de apuesta ──────────────
  useEffect(() => {
    if (!me) return;

    // Limpiar timers anteriores
    reminderTimers.current.forEach(clearTimeout);
    reminderTimers.current = [];

    const ONE_HOUR = 3_600_000;
    const now      = Date.now();

    async function showReminder(matchLabel) {
      if ('serviceWorker' in navigator && Notification.permission === 'granted') {
        try {
          const reg = await navigator.serviceWorker.ready;
          reg.showNotification('Apuesta antes de que cierre', {
            body: `Menos de 1 hora para ${matchLabel} — ¡aún no has apostado!`,
            icon: '/icons/icon-192.png',
            badge: '/icons/icon-192.png',
            tag: `reminder_${matchLabel}`,
            vibrate: [200, 100, 200],
            data: { url: '/' },
          });
          return;
        } catch { /* fallback */ }
      }
      // Fallback: banner in-app
      setReactionNote(`Cierra en menos de 1h sin apostar: ${matchLabel}`);
      setTimeout(() => setReactionNote(''), 8000);
    }

    function schedule(match, deadline, hasBet) {
      if (hasBet) return;
      const timeToDeadline = deadline - now;
      if (timeToDeadline <= 0) return;           // ya cerrado
      const timeToReminder = timeToDeadline - ONE_HOUR;
      const label = `${match.t1} vs ${match.t2}`;
      if (timeToReminder <= 0) {
        // Ya estamos dentro de la ventana de 1h — aviso inmediato
        showReminder(label);
      } else {
        // Programar para T-1h
        const t = setTimeout(() => showReminder(label), timeToReminder);
        reminderTimers.current.push(t);
      }
    }

    // Partidos de grupos
    MATCHES.forEach(m => {
      const hasBet = me.scores?.[m.id]?.h !== '' && me.scores?.[m.id]?.h !== undefined;
      schedule(m, getDeadline(m).getTime(), hasBet);
    });

    // Partidos de eliminatorias
    (config?.knockoutMatches || []).forEach(m => {
      const hasBet = me.knockoutScores?.[m.id]?.h !== '' && me.knockoutScores?.[m.id]?.h !== undefined;
      schedule(m, getKnockoutDeadline(m).getTime(), hasBet);
    });

    return () => reminderTimers.current.forEach(clearTimeout);
  }, [me, config?.knockoutMatches]);
  // Se re-ejecuta si el jugador guarda una apuesta (scores/knockoutScores cambian en `me`)
  // y cuando llegan nuevos fixtures de eliminatorias

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
      const unsub = s.subscribe(({ config: c, players: p, reactions: r }) => {
        setConfig(normalizeConfig(c));
        setPlayers(p);
        setReactions(r || {});
      });
      return unsub;
    });
  }, []);

  // Detectar nuevas reacciones dirigidas a mí
  useEffect(() => {
    const meId = localStorage.getItem('porra_me');
    if (!meId || !reactions) return;
    const myReactions = Object.values(reactions).filter(r => r.to === meId);
    const newest = myReactions.reduce((max, r) => Math.max(max, r.at || 0), 0);
    if (newest > lastSeenRef.current && myReactions.length > 0) {
      const last = myReactions.sort((a, b) => (b.at || 0) - (a.at || 0))[0];
      const matchLabel = last.matchId
        ? (() => {
            const m = MATCHES.find(x => x.id === last.matchId);
            return m ? `${m.t1} vs ${m.t2}` : 'tu predicción';
          })()
        : 'tu predicción';
      setReactionNote(`⚡ ${last.fromName} se ha flipado con tu pronóstico: ${matchLabel}`);
      setTimeout(() => setReactionNote(''), 5000);
      lastSeenRef.current = newest;
      localStorage.setItem('porra_reactions_seen', String(newest));
    }
  }, [reactions]);

  // Restore me from localStorage + re-subscribe push on every load
  useEffect(() => {
    const savedId = localStorage.getItem('porra_me');
    if (savedId) {
      setPlayers(prev => {
        if (prev[savedId]) setMe({ id: savedId, ...prev[savedId] });
        return prev;
      });
      // Re-register push subscription silently (fixes stale/missing subs)
      subscribePush(savedId);
    }
  }, [players]);

  const enter = useCallback((name, pin) => {
    if (!store) return;
    const id = slugify(name);
    const existing = players[id];
    const isNew = !existing;
    if (existing) {
      if (existing.pin && existing.pin !== pin) return 'PIN incorrecto para ese nombre';
      setMe({ id, ...existing });
      localStorage.setItem('porra_me', id);
    } else {
      const player = { id, name, pin, scores: {}, groupPicks: {}, tournament: {} };
      setMe(player);
      store.savePlayer(id, { name, pin, scores: {}, groupPicks: {}, tournament: {} });
      localStorage.setItem('porra_me', id);
    }
    // Mostrar onboarding si es nuevo jugador o nunca lo ha visto
    const seen = localStorage.getItem('porra_onboarding_done');
    if (!seen || isNew) setShowOnboarding(true);
    // Suscribir a push notifications
    subscribePush(id);
    return null;
  }, [store, players]);

  const savePlayer = useCallback(async ({ scores, groupPicks, tournament, knockoutScores }) => {
    if (!me || !store) return;
    const updated = { ...me, scores, groupPicks, tournament, knockoutScores };
    setMe(updated);
    await store.savePlayer(me.id, {
      name: me.name,
      pin: me.pin || '',
      scores,
      groupPicks,
      tournament:     tournament     || {},
      knockoutScores: knockoutScores || {},
    });
  }, [me, store]);

  const saveConfig = useCallback(async (newConfig) => {
    if (!store) return;
    await store.saveConfig(newConfig);
    setConfig(normalizeConfig(newConfig));
  }, [store]);

  const handleReact = useCallback(async (toPlayerId, matchId) => {
    if (!store || !me) return;
    const reactionId = `${me.id}_${matchId}_${toPlayerId}`;
    const existing = reactions[reactionId];
    if (existing) {
      await store.saveReaction(reactionId, null);
    } else {
      const match = MATCHES.find(x => x.id === matchId);
      const matchLabel = match ? `${match.t1} vs ${match.t2}` : 'un partido';
      await store.saveReaction(reactionId, {
        from: me.id, fromName: me.name, to: toPlayerId, matchId, emoji: '😂', at: Date.now(),
      });
      // Push notification al jugador reaccionado
      sendPushNotification(toPlayerId, {
        title: `${me.name} piensa que te has flipado`,
        body: `Ha reaccionado a tu predicción de ${matchLabel}`,
        tag: `reaction_${matchId}`,
        url: '/',
      });
    }
  }, [store, me, reactions]);

  if (!me) {
    return <Welcome players={players} onEnter={enter} loading={!store} />;
  }

  const meWithLatest = players[me.id]
    ? { ...me, ...players[me.id], id: me.id }
    : me;

  // Badge en tab Porras si hay nuevas reacciones a mí
  const myNewReactions = Object.values(reactions).filter(
    r => r.to === me.id && (r.at || 0) > lastSeenRef.current
  ).length;

  return (
    <div className={styles.root}>
      <header className={styles.header}>
        <div className={styles.brand}>
          <img src="/icons/logo.svg" alt="Logo" className={styles.logoImg} />
          <h1>Porra Mundial <span>2026</span></h1>
        </div>
        <div className={styles.who}>
          <span className={styles.whoName}>{me.name}</span>
          <button className={styles.infoBtn} onClick={() => setShowScore(true)} title="Ver puntuación" aria-label="Ver reglas de puntuación">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="1" y="7" width="3" height="8" fill="currentColor"/><rect x="6" y="4" width="3" height="11" fill="currentColor"/><rect x="11" y="1" width="3" height="14" fill="currentColor"/></svg>
          </button>
        </div>
      </header>

      {banner.msg && <div className={`${styles.banner} ${styles[banner.kind]}`}>{banner.msg}</div>}
      {reactionNote && <div className={`${styles.banner} ${styles.reaction}`}>{reactionNote}</div>}

      <main className={styles.main}>
        {tab === 'predict' && <PredictTab me={meWithLatest} config={config} onSave={savePlayer} />}
        {tab === 'ranking' && <RankingTab players={players} me={me} config={config} />}
        {tab === 'bets'    && <BetsTab players={players} me={me} config={config} reactions={reactions} onReact={handleReact} />}
        {tab === 'matches' && <MatchesTab config={config} players={players} me={meWithLatest} />}
        {tab === 'admin'   && <AdminTab config={config} onSaveConfig={saveConfig} />}
      </main>

      <nav className={styles.tabbar}>
        {TABS.map(t => (
          <button key={t.id}
            className={`${styles.tabBtn} ${tab === t.id ? styles.tabActive : ''}`}
            onClick={() => setTab(t.id)}>
            <span style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
              <img src={t.icon} alt={t.label} style={{ width: 24, height: 24 }} />
              {t.id === 'bets' && myNewReactions > 0 && (
                <span style={{
                  position: 'absolute', top: -4, right: -6,
                  background: '#EF4444', color: '#fff',
                  fontSize: 9, fontWeight: 900,
                  borderRadius: '50%', width: 14, height: 14,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>{myNewReactions}</span>
              )}
            </span>
            {t.label}
          </button>
        ))}
      </nav>

      {showScore && <ScorePopup points={config.points} onClose={() => setShowScore(false)} />}
      {showOnboarding && (
        <OnboardingModal onClose={() => {
          setShowOnboarding(false);
          localStorage.setItem('porra_onboarding_done', '1');
        }} />
      )}
    </div>
  );
}

function Welcome({ players, onEnter, loading }) {
  const [name, setName] = useState('');
  const [pin, setPin]   = useState('');
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
        <img src="/icons/logo.svg" alt="Logo Porra 2026" className={styles.welcomeLogo} />
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
            {loading ? 'Cargando…' : 'Entrar'}
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
