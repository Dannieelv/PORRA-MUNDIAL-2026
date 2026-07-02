'use client';
import { useState } from 'react';
import { MATCHES, TEAMS } from '@/lib/data';
import TeamFlag from './TeamFlag';
import { ADMIN_PIN } from '@/lib/firebase';
import { fmtDate } from '@/lib/scoring';
import styles from './Tabs.module.css';

const ALL_TEAMS = [...TEAMS].sort((a, b) => a.name.localeCompare(b.name, 'es'));

export default function AdminTab({ config, onSaveConfig }) {
  const [unlocked, setUnlocked] = useState(false);
  const [pin,      setPin]      = useState('');
  const [points,   setPoints]   = useState({ ...config.points });
  const [locked,   setLocked]   = useState(config.locked);
  const [results,  setResults]  = useState({ ...config.results });
  const [trn,      setTrn]      = useState({ semis: [], ...(config.tournament || {}) });
  const [toast,    setToast]    = useState('');
  const [section,  setSection]  = useState('results');
  const [syncing,  setSyncing]  = useState(false);
  const [koResults, setKoResults] = useState(() => {
    const out = {};
    (config.knockoutResults || {}) && Object.entries(config.knockoutResults || {}).forEach(([id, r]) => {
      out[id] = { h: r.h ?? '', a: r.a ?? '', winner: r.winner || '' };
    });
    return out;
  });
  const [koSaving, setKoSaving] = useState({});

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 2200); };

  if (!unlocked) {
    return (
      <div className={styles.tabWrap}>
        <div className={styles.card}>
          <h2 className={styles.cardTitle}>Administración</h2>
          <p className={styles.hint}>Introduce el PIN de administrador para gestionar resultados y configuración.</p>
          <div className={styles.field}>
            <input type="password" inputMode="numeric" placeholder="PIN admin" value={pin}
              onChange={e => setPin(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && pin === ADMIN_PIN) setUnlocked(true); }} />
          </div>
          <button className={styles.btn} onClick={() => { if (pin === ADMIN_PIN) setUnlocked(true); else showToast('PIN incorrecto'); }}>
            Entrar
          </button>
          {toast && <div className={`${styles.toast} ${styles.toastErr}`}>{toast}</div>}
        </div>
      </div>
    );
  }

  const saveAll = async () => {
    const clean = {};
    Object.entries(results).forEach(([id, r]) => { if (r.h !== '' || r.a !== '') clean[id] = r; });
    await onSaveConfig({ ...config, points, locked, results: clean, tournament: trn });
    showToast('Guardado ✓');
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      const res  = await fetch('/api/sync-results');
      const data = await res.json();
      if (data.ok) {
        const updated = data.summary?.groupsUpdated?.length || 0;
        const ko      = data.summary?.knockoutFixturesAdded?.length || 0;
        showToast(updated + ko > 0
          ? `Sync OK · ${updated} resultados, ${ko} fixtures KO`
          : 'Sync OK · Sin cambios nuevos');
      } else {
        showToast('Error en sync: ' + (data.error || 'desconocido'));
      }
    } catch { showToast('Error al sincronizar'); }
    setSyncing(false);
  };

  const notifyResult = async (matchId) => {
    const m = MATCHES.find(x => x.id === matchId);
    const r = results[matchId];
    if (!m || !r || r.h === '') return;
    try {
      const res = await fetch('/api/push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'notify-all',
          payload: {
            title: `Resultado: ${m.t1} ${r.h}-${r.a} ${m.t2}`,
            body: 'Ya puedes ver tus puntos en la Porra Mundial 2026',
            tag: `result_${matchId}`,
            url: '/',
          },
        }),
      });
      const data = await res.json();
      showToast(`Notificado a ${data.sent ?? 0} jugadores ✓`);
    } catch { showToast('Error al notificar'); }
  };

  const setRes = (id, side, val) =>
    setResults(prev => ({ ...prev, [id]: { ...(prev[id] || { h: '', a: '' }), [side]: val } }));

  const setT = (key, val) => setTrn(prev => ({ ...prev, [key]: val }));
  const toggleSemiResult = (team) => {
    setTrn(prev => {
      const s = prev.semis || [];
      return { ...prev, semis: s.includes(team) ? s.filter(x => x !== team) : [...s, team] };
    });
  };

  return (
    <div className={styles.tabWrap}>
      {toast && <div className={`${styles.toast} ${styles.toastOk}`}>{toast}</div>}

      <button className={styles.syncBtn} onClick={handleSync} disabled={syncing}>
        {syncing ? '⏳ Sincronizando…' : '🔄 Sincronizar resultados ahora'}
      </button>

      <div className={styles.seg}>
        <button className={section === 'results' ? styles.segActive : ''} onClick={() => setSection('results')}>Grupos</button>
        <button className={section === 'ko'      ? styles.segActive : ''} onClick={() => setSection('ko')}>Eliminatorias</button>
        <button className={section === 'torneo'  ? styles.segActive : ''} onClick={() => setSection('torneo')}>🌍 Torneo</button>
        <button className={section === 'config'  ? styles.segActive : ''} onClick={() => setSection('config')}>Ajustes</button>
      </div>

      {/* ── Resultados partidos ── */}
      {section === 'results' && (
        <div className={styles.card}>
          <h2 className={styles.cardTitle}>Resultados reales</h2>
          <p className={styles.hint}>Introduce el marcador final de cada partido.</p>
          {[1, 2, 3].map(md => (
            <div key={md}>
              <div className={styles.mdTitle}>Jornada {md}</div>
              {MATCHES.filter(m => m.md === md).map(m => {
                const r = results[m.id] || { h: '', a: '' };
                return (
                  <div key={m.id} className={styles.match}>
                    <div className={styles.team}><TeamFlag name={m.t1} size={20} /><span className={styles.teamName}>{m.t1}</span></div>
                    <div className={styles.scoreIn}>
                      <input type="number" min="0" inputMode="numeric" value={r.h} onChange={e => setRes(m.id, 'h', e.target.value)} />
                      <span className={styles.vs}>-</span>
                      <input type="number" min="0" inputMode="numeric" value={r.a} onChange={e => setRes(m.id, 'a', e.target.value)} />
                    </div>
                    <div className={`${styles.team} ${styles.away}`}><span className={styles.teamName}>{m.t2}</span><TeamFlag name={m.t2} size={20} /></div>
                    {r.h !== '' && (
                      <button className={styles.notifyBtn} onClick={() => notifyResult(m.id)} title="Notificar resultado a todos">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" stroke="currentColor" strokeWidth="2.5"/><path d="M13.73 21a2 2 0 0 1-3.46 0" stroke="currentColor" strokeWidth="2.5"/></svg>
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
          <button className={styles.btn} style={{ marginTop: 14 }} onClick={saveAll}>Guardar resultados</button>
        </div>
      )}

      {/* ── Eliminatorias ── */}
      {section === 'ko' && (
        <div className={styles.card}>
          <h2 className={styles.cardTitle}>Resultados eliminatorias</h2>
          <p className={styles.hint}>Marcador a 90 min + quién clasifica (para penaltis).</p>
          {(config.knockoutMatches || []).length === 0 && (
            <p className={styles.hint}>Aún no hay partidos de eliminatorias.</p>
          )}
          {(config.knockoutMatches || []).map(m => {
            const r = koResults[m.id] || { h: '', a: '', winner: '' };
            const saving = koSaving[m.id];
            const setKoField = (field, val) =>
              setKoResults(prev => ({ ...prev, [m.id]: { ...(prev[m.id] || { h: '', a: '', winner: '' }), [field]: val } }));
            const saveKo = async () => {
              setKoSaving(prev => ({ ...prev, [m.id]: true }));
              try {
                const res = await fetch('/api/admin-ko-result', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ matchId: m.id, h: r.h, a: r.a, winner: r.winner || null }),
                });
                const data = await res.json();
                showToast(data.ok ? `${m.t1} ${r.h}-${r.a} ${m.t2} guardado ✓` : 'Error: ' + data.error);
              } catch { showToast('Error al guardar'); }
              setKoSaving(prev => ({ ...prev, [m.id]: false }));
            };
            return (
              <div key={m.id} style={{ marginBottom: 14, paddingBottom: 14, borderBottom: '1px solid #f0eaf8' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#9b8ab8', marginBottom: 4, textTransform: 'uppercase' }}>
                  {m.stage} · {m.date}
                </div>
                <div className={styles.match}>
                  <div className={styles.team}><TeamFlag name={m.t1} size={20} /><span className={styles.teamName}>{m.t1}</span></div>
                  <div className={styles.scoreIn}>
                    <input type="number" min="0" inputMode="numeric" value={r.h}
                      onChange={e => setKoField('h', e.target.value)} />
                    <span className={styles.vs}>-</span>
                    <input type="number" min="0" inputMode="numeric" value={r.a}
                      onChange={e => setKoField('a', e.target.value)} />
                  </div>
                  <div className={`${styles.team} ${styles.away}`}><span className={styles.teamName}>{m.t2}</span><TeamFlag name={m.t2} size={20} /></div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
                  <span style={{ fontSize: 12, color: '#7C61D4', fontWeight: 700 }}>Clasificado:</span>
                  {[
                    { val: '', label: '— Sin resultado —' },
                    { val: 'HOME_TEAM', label: m.t1 },
                    { val: 'AWAY_TEAM', label: m.t2 },
                  ].map(opt => (
                    <button key={opt.val} onClick={() => setKoField('winner', opt.val)}
                      style={{
                        padding: '4px 10px', borderRadius: 8, fontSize: 12, fontWeight: 700,
                        fontFamily: 'inherit', cursor: 'pointer',
                        background: r.winner === opt.val ? '#7C61D4' : '#f4f1fb',
                        color: r.winner === opt.val ? '#fff' : '#2d2540',
                        border: `2px solid ${r.winner === opt.val ? '#7C61D4' : '#e7e1f4'}`,
                      }}>
                      {opt.label}
                    </button>
                  ))}
                </div>
                <button className={styles.btn} style={{ marginTop: 8, padding: '6px 14px', fontSize: 13 }}
                  onClick={saveKo} disabled={saving}>
                  {saving ? 'Guardando…' : 'Guardar'}
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Torneo ── */}
      {section === 'torneo' && (
        <>
          <div className={styles.card}>
            <h2 className={styles.cardTitle}>🏆 Ganadores reales</h2>
            <TSelect label="Campeón del Mundial" value={trn.champion || ''} onChange={v => setT('champion', v)} />
            <TSelect label="Subcampeón" value={trn.runnerUp || ''} onChange={v => setT('runnerUp', v)} />
            <TSelect label="Equipo revelación" value={trn.revelation || ''} onChange={v => setT('revelation', v)} />
          </div>

          <div className={styles.card}>
            <h2 className={styles.cardTitle}>🥈 Semifinalistas reales</h2>
            <p className={styles.hint}>Selecciona los 4 equipos que llegaron a semis.</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
              {ALL_TEAMS.map(t => {
                const sel = (trn.semis || []).includes(t.name);
                return (
                  <button key={t.name}
                    onClick={() => toggleSemiResult(t.name)}
                    style={{
                      padding: '5px 10px', borderRadius: 8, fontSize: 13, fontWeight: 700,
                      fontFamily: 'inherit', cursor: 'pointer',
                      background: sel ? '#7C61D4' : '#f4f1fb',
                      color: sel ? '#fff' : '#2d2540',
                      border: `2px solid ${sel ? '#7C61D4' : '#e7e1f4'}`,
                    }}>
                    {t.name}
                  </button>
                );
              })}
            </div>
            <p style={{ fontSize: 12, fontWeight: 700, color: '#7C61D4' }}>{(trn.semis || []).length} / 4 seleccionados</p>
          </div>

          <div className={styles.card}>
            <h2 className={styles.cardTitle}>🌟 Premios individuales reales</h2>
            <TText label="Bota de Oro" value={trn.goldenBoot || ''} onChange={v => setT('goldenBoot', v)} placeholder="Nombre del jugador" />
            <TText label="Guante de Oro" value={trn.goldenGlove || ''} onChange={v => setT('goldenGlove', v)} placeholder="Nombre del portero" />
            <TText label="MVP del torneo" value={trn.mvp || ''} onChange={v => setT('mvp', v)} placeholder="Nombre del jugador" />
          </div>

          <button className={styles.btn} onClick={saveAll}>Guardar torneo</button>
        </>
      )}

      {/* ── Ajustes de puntuación y bloqueo ── */}
      {section === 'config' && (
        <div className={styles.card}>
          <h2 className={styles.cardTitle}>Puntuación grupos</h2>
          <div className={styles.row2}>
            {[
              ['sign',      'Signo 1X2'],
              ['exact',     'Marcador exacto'],
              ['diff',      'Diferencia goles'],
              ['total',     'Total goles'],
              ['bothScore', 'Ambos marcan'],
              ['clasif1',   '1º de grupo'],
              ['clasif2',   '2º de grupo'],
            ].map(([k, label]) => (
              <div key={k} className={styles.field}>
                <label>{label}</label>
                <input type="number" value={points[k] ?? ''} onChange={e => setPoints(p => ({ ...p, [k]: +e.target.value }))} />
              </div>
            ))}
          </div>
          <h2 className={styles.cardTitle} style={{ marginTop: 12 }}>Puntuación torneo</h2>
          <div className={styles.row2}>
            {[
              ['champion',   'Campeón'],
              ['runnerUp',   'Subcampeón'],
              ['semi',       'Semifinalista'],
              ['goldenBoot', 'Bota de Oro'],
              ['goldenGlove','Guante de Oro'],
              ['mvp',        'MVP'],
              ['revelation', 'Revelación'],
            ].map(([k, label]) => (
              <div key={k} className={styles.field}>
                <label>{label}</label>
                <input type="number" value={points[k] ?? ''} onChange={e => setPoints(p => ({ ...p, [k]: +e.target.value }))} />
              </div>
            ))}
          </div>
          <label className={styles.checkRow}>
            <input type="checkbox" checked={locked} onChange={e => setLocked(e.target.checked)} />
            Cerrar TODAS las predicciones
          </label>
          <button className={styles.btn} onClick={saveAll}>Guardar ajustes</button>
        </div>
      )}

      <div style={{ height: 40 }} />
    </div>
  );
}

function TSelect({ label, value, onChange }) {
  return (
    <div className={styles.field}>
      <label>{label}</label>
      <select value={value} onChange={e => onChange(e.target.value)} className={styles.tSelect}>
        <option value="">— Sin resultado aún —</option>
        {ALL_TEAMS.map(t => <option key={t.name} value={t.name}>{t.name}</option>)}
      </select>
    </div>
  );
}

function TText({ label, value, onChange, placeholder }) {
  return (
    <div className={styles.field}>
      <label>{label}</label>
      <input type="text" value={value} placeholder={placeholder} onChange={e => onChange(e.target.value)}
        className={styles.tInput} />
    </div>
  );
}
