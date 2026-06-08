'use client';
import { useState, useCallback } from 'react';
import { MATCHES, GROUPS, TEAMS } from '@/lib/data';
import { fmtDate, isMatchLocked, matchPoints, defaultPicks, standings, autoGroupPicks } from '@/lib/scoring';
import TeamFlag from './TeamFlag';
import styles from './Tabs.module.css';
import pred from './PredictTab.module.css';

const ALL_TEAMS = [...TEAMS].sort((a, b) => a.name.localeCompare(b.name, 'es'));
const SEMIS_COUNT = 4;

export default function PredictTab({ me, config, onSave }) {
  const [phase, setPhase] = useState('scores');
  const [scores, setScores]           = useState({ ...me.scores });
  const [tournament, setTournament]   = useState({ semis: [], ...(me.tournament || {}) });
  const [dirty, setDirty] = useState(false);

  const handleScore = (id, side, val) => {
    setScores(prev => ({ ...prev, [id]: { ...(prev[id] || { h: '', a: '' }), [side]: val } }));
    setDirty(true);
  };

  const setT = (key, val) => {
    setTournament(prev => ({ ...prev, [key]: val }));
    setDirty(true);
  };

  const toggleSemi = (team) => {
    setTournament(prev => {
      const semis = prev.semis || [];
      if (semis.includes(team)) return { ...prev, semis: semis.filter(s => s !== team) };
      if (semis.length >= SEMIS_COUNT) return prev; // max 4
      return { ...prev, semis: [...semis, team] };
    });
    setDirty(true);
  };

  const save = async () => {
    // Calcular groupPicks automáticamente desde las predicciones
    const groupPicks = {};
    GROUPS.forEach(g => {
      const table = standings(g, scores);
      groupPicks[g] = table.map(t => t.name);
    });
    await onSave({ scores, groupPicks, tournament });
    setDirty(false);
  };

  return (
    <div className={styles.tabWrap}>
      <div className={styles.seg}>
        <button className={phase === 'scores'    ? styles.segActive : ''} onClick={() => setPhase('scores')}>⚽ Resultados</button>
        <button className={phase === 'groups'    ? styles.segActive : ''} onClick={() => setPhase('groups')}>📊 Grupos</button>
        <button className={phase === 'torneo'    ? styles.segActive : ''} onClick={() => setPhase('torneo')}>🌍 Torneo</button>
      </div>

      {/* ── Resultados ── */}
      {phase === 'scores' && (
        <>
          {[1, 2, 3].map(md => (
            <div key={md}>
              <div className={styles.mdTitle}>Jornada {md}</div>
              {MATCHES.filter(m => m.md === md).map(m => {
                const p   = scores[m.id] || { h: '', a: '' };
                const res = config.results[m.id];
                const locked = isMatchLocked(m, config.locked);
                const pts = res ? matchPoints(p, res, m.mult, config.points) : null;
                return (
                  <div key={m.id}>
                    <div className={`${styles.match} ${locked ? styles.locked : ''}`}>
                      <div className={styles.team}>
                        <TeamFlag name={m.t1} size={20} />
                        <span className={styles.teamName}>{m.t1}</span>
                      </div>
                      <div className={styles.scoreIn}>
                        <input type="number" min="0" max="20" inputMode="numeric"
                          value={p.h} disabled={locked}
                          onChange={e => handleScore(m.id, 'h', e.target.value)} />
                        <span className={styles.vs}>-</span>
                        <input type="number" min="0" max="20" inputMode="numeric"
                          value={p.a} disabled={locked}
                          onChange={e => handleScore(m.id, 'a', e.target.value)} />
                      </div>
                      <div className={`${styles.team} ${styles.away}`}>
                        <span className={styles.teamName}>{m.t2}</span>
                        <TeamFlag name={m.t2} size={20} />
                      </div>
                    </div>
                    <div className={styles.meta}>
                      {fmtDate(m.date)}
                      {m.mult > 1 && <span className={styles.badgeMult}>×{m.mult}</span>}
                      {locked && <span className={styles.badgeLock}>cerrado</span>}
                      {res && (
                        <>
                          <span className={styles.resPill}>{res.h}-{res.a}</span>
                          {pts != null && <span className={styles.badgePts}>+{pts}</span>}
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </>
      )}

      {/* ── Clasificación de grupos (auto) ── */}
      {phase === 'groups' && (
        <div>
          <p className={styles.hint}>
            Clasificación automática según tus predicciones · 1º={config.points.clasif1 ?? 4}pt · 2º={config.points.clasif2 ?? 3}pt
          </p>
          {GROUPS.map(g => {
            const table = standings(g, scores);
            const hasAny = MATCHES.filter(m => m.group === g).some(m => {
              const s = scores[m.id];
              return s && s.h !== '' && s.a !== '';
            });
            return (
              <div key={g} className={styles.card}>
                <h2 className={styles.cardTitle}>Grupo {g}</h2>
                {!hasAny && <p className={styles.hint}>Rellena resultados para ver la clasificación</p>}
                {table.map((t, i) => (
                  <div key={t.name} className={pred.groupRow}>
                    <span className={`${pred.groupPos} ${i === 0 ? pred.first : i === 1 ? pred.second : ''}`}>{i + 1}º</span>
                    <TeamFlag name={t.name} size={22} />
                    <span className={pred.groupName}>{t.name}</span>
                    {hasAny && (
                      <span className={pred.groupStats}>{t.pts}pt · {t.gf}-{t.gc}</span>
                    )}
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      )}

      {/* ── Torneo ── */}
      {phase === 'torneo' && (
        <div>
          <p className={styles.hint}>Predicciones de la fase final del torneo.</p>

          <div className={styles.card}>
            <h2 className={styles.cardTitle}>🏆 Ganadores</h2>
            <TSelect label={`Campeón del Mundial (+${config.points.champion ?? 10}pt)`}
              value={tournament.champion || ''} onChange={v => setT('champion', v)} />
            <TSelect label={`Subcampeón (+${config.points.runnerUp ?? 6}pt)`}
              value={tournament.runnerUp || ''} onChange={v => setT('runnerUp', v)} />
            <TSelect label={`Equipo revelación (+${config.points.revelation ?? 3}pt)`}
              value={tournament.revelation || ''} onChange={v => setT('revelation', v)} />
          </div>

          <div className={styles.card}>
            <h2 className={styles.cardTitle}>🥈 Semifinalistas (+{config.points.semi ?? 3}pt c/u)</h2>
            <p className={styles.hint}>Selecciona los 4 equipos que llegarán a semis.</p>
            <div className={pred.semiGrid}>
              {ALL_TEAMS.map(t => {
                const selected = (tournament.semis || []).includes(t.name);
                const full = (tournament.semis || []).length >= SEMIS_COUNT;
                return (
                  <button key={t.name}
                    className={`${pred.semiBtn} ${selected ? pred.semiSelected : ''} ${!selected && full ? pred.semiDisabled : ''}`}
                    onClick={() => toggleSemi(t.name)}
                    disabled={!selected && full}>
                    <TeamFlag name={t.name} size={16} />
                    <span>{t.name}</span>
                  </button>
                );
              })}
            </div>
            <p className={pred.semiCount}>{(tournament.semis || []).length} / {SEMIS_COUNT} seleccionados</p>
          </div>

          <div className={styles.card}>
            <h2 className={styles.cardTitle}>🌟 Premios individuales</h2>
            <TText label={`Bota de Oro (+${config.points.goldenBoot ?? 5}pt)`}
              value={tournament.goldenBoot || ''} onChange={v => setT('goldenBoot', v)}
              placeholder="Nombre del jugador" />
            <TText label={`Guante de Oro (+${config.points.goldenGlove ?? 5}pt)`}
              value={tournament.goldenGlove || ''} onChange={v => setT('goldenGlove', v)}
              placeholder="Nombre del portero" />
            <TText label={`MVP del torneo (+${config.points.mvp ?? 5}pt)`}
              value={tournament.mvp || ''} onChange={v => setT('mvp', v)}
              placeholder="Nombre del jugador" />
          </div>
        </div>
      )}

      <div style={{ height: 72 }} />
      {dirty && (
        <div className={styles.stickyBar}>
          <button className={styles.btn} onClick={save}>💾 Guardar mi porrita</button>
        </div>
      )}
    </div>
  );
}

function TSelect({ label, value, onChange }) {
  return (
    <div className={styles.field}>
      <label>{label}</label>
      <select value={value} onChange={e => onChange(e.target.value)} className={styles.tSelect}>
        <option value="">— Sin seleccionar —</option>
        {ALL_TEAMS.map(t => <option key={t.name} value={t.name}>{t.name}</option>)}
      </select>
    </div>
  );
}

function TText({ label, value, onChange, placeholder }) {
  return (
    <div className={styles.field}>
      <label>{label}</label>
      <input type="text" value={value} placeholder={placeholder}
        onChange={e => onChange(e.target.value)}
        className={styles.tInput} />
    </div>
  );
}
