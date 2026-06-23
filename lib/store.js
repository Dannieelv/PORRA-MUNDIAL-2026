'use client';
import { DEFAULT_POINTS } from './data';
import { firebaseConfig, isFirebaseConfigured } from './firebase';

export function normalizeConfig(c = {}) {
  return {
    points:          { ...DEFAULT_POINTS, ...(c.points || {}) },
    results:         c.results          || {},
    locked:          !!c.locked,
    tournament:      c.tournament       || {},
    knockoutMatches: c.knockoutMatches  || [],
    knockoutResults: c.knockoutResults  || {},
    tournamentLocked: !!c.tournamentLocked,
  };
}

// ---- Local store (localStorage) ----
export function makeLocalStore() {
  const load = () => {
    try {
      return {
        config:    normalizeConfig(JSON.parse(localStorage.getItem('porra_config')  || '{}')),
        players:   JSON.parse(localStorage.getItem('porra_players')   || '{}'),
        reactions: JSON.parse(localStorage.getItem('porra_reactions') || '{}'),
      };
    } catch { return { config: normalizeConfig(), players: {}, reactions: {} }; }
  };
  return {
    type: 'local',
    load,
    savePlayer: (id, data) => {
      const p = JSON.parse(localStorage.getItem('porra_players') || '{}');
      p[id] = data;
      localStorage.setItem('porra_players', JSON.stringify(p));
    },
    saveConfig: (data) => {
      localStorage.setItem('porra_config', JSON.stringify(data));
    },
    saveReaction: (id, data) => {
      const r = JSON.parse(localStorage.getItem('porra_reactions') || '{}');
      if (data === null) { delete r[id]; } else { r[id] = data; }
      localStorage.setItem('porra_reactions', JSON.stringify(r));
    },
    subscribe: (onData) => {
      onData(load());
      const handler = () => onData(load());
      window.addEventListener('storage', handler);
      return () => window.removeEventListener('storage', handler);
    },
  };
}

// ---- Firebase store ----
export async function makeFirebaseStore(groupId = null) {
  const { initializeApp, getApps } = await import('firebase/app');
  const { getFirestore, doc, setDoc, deleteDoc, onSnapshot, collection } = await import('firebase/firestore');
  const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
  const db  = getFirestore(app);

  // Scoped paths: groups use groups/{id}/... ; legacy (lonjas) uses old flat paths
  const configRef    = groupId ? doc(db, 'groups', groupId, 'settings', 'config') : doc(db, 'porra', 'config');
  const playersCol   = groupId ? collection(db, 'groups', groupId, 'players')     : collection(db, 'players');
  const reactionsCol = groupId ? collection(db, 'groups', groupId, 'reactions')   : collection(db, 'reactions');

  return {
    type: 'firebase',
    groupId,
    savePlayer:   (id, data) => setDoc(doc(playersCol, id), data, { merge: true }),
    saveConfig:   (data)     => setDoc(configRef, data),
    saveReaction: (id, data) => data === null
      ? deleteDoc(doc(reactionsCol, id))
      : setDoc(doc(reactionsCol, id), data),
    subscribe: (onData) => {
      let config    = normalizeConfig();
      let players   = {};
      let reactions = {};
      const unsub1 = onSnapshot(configRef, snap => {
        if (snap.exists()) config = normalizeConfig(snap.data());
        onData({ config, players, reactions });
      });
      const unsub2 = onSnapshot(playersCol, snap => {
        players = {};
        snap.forEach(d => { players[d.id] = d.data(); });
        onData({ config, players, reactions });
      });
      const unsub3 = onSnapshot(reactionsCol, snap => {
        reactions = {};
        snap.forEach(d => { reactions[d.id] = d.data(); });
        onData({ config, players, reactions });
      });
      return () => { unsub1(); unsub2(); unsub3(); };
    },
  };
}

export async function createStore(groupId = null) {
  if (isFirebaseConfigured()) {
    try { return await makeFirebaseStore(groupId); } catch (e) { console.error('Firebase failed:', e); }
  }
  return makeLocalStore();
}
