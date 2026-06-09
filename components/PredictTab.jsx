'use client';
import { useState, useCallback, useEffect } from 'react';
import { MATCHES, GROUPS, TEAMS } from '@/lib/data';
import {
  fmtDate, isMatchLocked, matchPoints, standings,
  knockoutMatchPoints, isKnockoutLocked, getKnockoutCountdown,
} from '@/lib/scoring';
import { playerStats } from '@/lib/stats';
import { getEarnedAchievements } from '@/lib/achievements';
import TeamFlag from './TeamFlag';
import Countdown from './Countdown';
import styles from './Tabs.module.css';
import pred from './PredictTab.module.css';

const ALL_TEAMS   = [...TEAMS].sort((a, b) => a.name.localeCompare(b.name, 'es'));
const SEMIS_COUNT = 4;

const STAGE_LABELS = {
  LAST_16:        'Dieciseisavos de Final',
  QUARTER_FINALS: 'Cuartos de Final',
  SEMI_FINALS:    'Semifinales',
  FINAL:          'Final',
};

const STAGE_ORDER = ['LAST_16', 'QUARTER_FINALS', 'SEMI_FINALS', 'FINAL'];

export default function PredictTab({ me, config, onSave }) {
  const hasKnockout = (config.knockoutMatches || []).length > 0;

  const [phase, setPhase]         = useState('scores');
  const [scores, setScores]       = useState({ ...me.scores });
  const [knockoutScores, setKnockoutScores] = useState({ ...(me.knockoutScores || {}) });
  const [tournament, setTournament] = useState({ semis: [], ...(me.tournament || {}) });
  const [dirty, setDirty]         = useState(false);

  const handleScore = (id, side, val) => {
    setScores(prev => ({ ...prev, [id]: { ...(prev[id] || { h: '', a: '' }), [side]: val } }));
    setDirty(true);
  };

  const handleKnockoutScore = (id, side, val) => {
    setKnockoutScores(prev => ({ ...prev, [id]: { ...(prev[id] || { h: '', a: '' }), [side]: val } }));
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
      if (semis.length >= SEMIS_COUNT) return prev;
      return { ...prev, semis: [...semis, team] };
    });
    setDirty(true);
  };

  const save = async () => {
    const groupPicks = {};
    GROUPS.forEach(g => {
      groupPicks[g] = standings(g, scores).map(t => t.name);
    });
    await onSave({ scores, groupPicks, tournament, knockoutScores });
    setDirty(false);
  };

  // Agrupar knockout matches por stage en orden
  const knockoutByStage = STAGE_ORDER
    .map(stage => ({
      stage,
      label: STAGE_LABELS[stage],
      matches: (config.knockoutMatches || []).filter(m => m.stage === stage),
    }))
    .filter(s => s.matches.length > 0);

  // Logros — solo se calculan si hay partidos con resultado
  const stats        = playerStats(me, config);
  const earned       = getEarnedAchievements(stats);

  return (
    <div className={styles.tabWrap}>
      {/* ── Logros — visible solo cuando tienes al menos 1 ── */}
      {earned.length > 0 && (
        <div className={pred.achievementsWrap}>
          <div className={pred.achievementsTitle}>Tus logros</div>
          <div className={pred.achievementsGrid}>
            {earned.map(a => (
              <div key={a.id} className={pred.achievementChip} title={a.desc}>
                <span className={pred.achievementIcon}>{a.icon}</span>
                <span className={pred.achievementLabel}>{a.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className={styles.seg}>
        <button className={phase === 'scores'  ? styles.segActive : ''} onClick={() => setPhase('scores')}>Grupos</button>
        {hasKnockout && (
          <button className={phase === 'knockout' ? styles.segActive : ''} onClick={() => setPhase('knockout')}>Eliminatorias</button>
        )}
        <button className={phase === 'groups'  ? styles.segActive : ''} onClick={() => setPhase('groups')}>Tabla</button>
        <button className={phase === 'torneo'  ? styles.segActive : ''} onClick={() => setPhase('torneo')}>Torneo</button>
      </div>

      {/* ── Resultados grupos ── */}
      {phase === 'scores' && (
        <>
          {[1, 2, 3].map(md => (
            <div key={md}>
              <div className={styles.mdTitle}>Jornada {md}</div>
              {MATCHES.filter(m => m.md === md).map(m => {
                const p      = scores[m.id] || { h: '', a: '' };
                const res    = config.results[m.id];
                const locked = isMatchLocked(m, config.locked);
                const pts    = res ? matchPoints(p, res, m.mult, config.points) : null;
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
                      <Countdown match={m} />
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

      {/* ── Eliminatorias ── */}
      {phase === 'knockout' && hasKnockout && (
        <>
          <p className={styles.hint}>
            Apuesta los marcadores de eliminatorias. Las apuestas cierran <strong>24h antes</strong> del partido.
            Puntos: 1X2 correcto = ×{config.points.knockoutSign ?? 3} · Exacto +{config.points.knockoutExact ?? 5} extra
          </p>
          {knockoutByStage.map(({ stage, label, matches }) => (
            <div key={stage}>
              <div className={styles.mdTitle}>{label}</div>
              {matches.map(m => {
                const p      = knockoutScores[m.id] || { h: '', a: '' };
                const res    = (config.knockoutResults || {})[m.id];
                const locked = isKnockoutLocked(m) || config.locked;
                const pts    = res ? knockoutMatchPoints(p, res, m.mult, config.points) : null;
                const cd     = getKnockoutCountdown(m);
                const mult   = m.mult;
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
                          onChange={e => handleKnockoutScore(m.id, 'h', e.target.value)} />
                        <span className={styles.vs}>-</span>
                        <input type="number" min="0" max="20" inputMode="numeric"
                          value={p.a} disabled={locked}
                          onChange={e => handleKnockoutScore(m.id, 'a', e.target.value)} />
                      </div>
                      <div className={`${styles.team} ${styles.away}`}>
                        <span className={styles.teamName}>{m.t2}</span>
                        <TeamFlag name={m.t2} size={20} />
                      </div>
                    </div>
                    <div className={styles.meta}>
                      {fmtDate(m.date)}
                      {mult > 1 && <span className={styles.badgeMult}>×{mult}</span>}
                      {!locked && !cd.expired && (
                        <span className={cd.veryUrgent ? styles.urgentRed : cd.urgent ? styles.urgentOrange : styles.countdownNorm}>
                          Cierra en {cd.text}
                        </span>
                      )}
                      {locked && !res && <span className={styles.countdownNorm}>Cerrado</span>}
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

      {/* ── Clasificación de grupos ── */}
      {phase === 'groups' && (
        <div>
          <p className={styles.hint}>
            Clasificación automática según tus predicciones · 1º={config.points.clasif1 ?? 4}pt · 2º={config.points.clasif2 ?? 3}pt
          </p>
          {GROUPS.map(g => {
            const table  = standings(g, scores);
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
                    {hasAny && <span className={pred.groupStats}>{t.pts}pt · {t.gf}-{t.gc}</span>}
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
          <TournamentDeadlineBanner config={config} />
          <p className={styles.hint}>Predicciones de la fase final del torneo.</p>

          <div className={styles.card}>
            <h2 className={styles.cardTitle}>Ganadores</h2>
            <TSelect label={`Campeón del Mundial (+${config.points.champion ?? 10}pt)`}
              value={tournament.champion || ''} onChange={v => setT('champion', v)}
              disabled={config.tournamentLocked} />
            <TSelect label={`Subcampeón (+${config.points.runnerUp ?? 6}pt)`}
              value={tournament.runnerUp || ''} onChange={v => setT('runnerUp', v)}
              disabled={config.tournamentLocked} />
            <TSelect label={`Equipo revelación (+${config.points.revelation ?? 3}pt)`}
              value={tournament.revelation || ''} onChange={v => setT('revelation', v)}
              disabled={config.tournamentLocked} />
          </div>

          <div className={styles.card}>
            <h2 className={styles.cardTitle}>Semifinalistas (+{config.points.semi ?? 3}pt c/u)</h2>
            <p className={styles.hint}>Selecciona los 4 equipos que llegarán a semis.</p>
            <div className={pred.semiGrid}>
              {ALL_TEAMS.map(t => {
                const selected = (tournament.semis || []).includes(t.name);
                const full     = (tournament.semis || []).length >= SEMIS_COUNT;
                const disabled = config.tournamentLocked || (!selected && full);
                return (
                  <button key={t.name}
                    className={`${pred.semiBtn} ${selected ? pred.semiSelected : ''} ${disabled && !selected ? pred.semiDisabled : ''}`}
                    onClick={() => !config.tournamentLocked && toggleSemi(t.name)}
                    disabled={disabled}>
                    <TeamFlag name={t.name} size={16} />
                    <span>{t.name}</span>
                  </button>
                );
              })}
            </div>
            <p className={pred.semiCount}>{(tournament.semis || []).length} / {SEMIS_COUNT} seleccionados</p>
          </div>

          <div className={styles.card}>
            <h2 className={styles.cardTitle}>Premios individuales</h2>
            <TText label={`Bota de Oro (+${config.points.goldenBoot ?? 5}pt)`}
              value={tournament.goldenBoot || ''} onChange={v => setT('goldenBoot', v)}
              placeholder="Nombre del jugador" disabled={config.tournamentLocked} />
            <TText label={`Guante de Oro (+${config.points.goldenGlove ?? 5}pt)`}
              value={tournament.goldenGlove || ''} onChange={v => setT('goldenGlove', v)}
              placeholder="Nombre del portero" disabled={config.tournamentLocked} />
            <TText label={`MVP del torneo (+${config.points.mvp ?? 5}pt)`}
              value={tournament.mvp || ''} onChange={v => setT('mvp', v)}
              placeholder="Nombre del jugador" disabled={config.tournamentLocked} />
          </div>
        </div>
      )}

      <div style={{ height: 72 }} />
      {dirty && !config.tournamentLocked && (
        <div className={styles.stickyBar}>
          <button className={styles.btn} onClick={save}>Guardar mi porrita</button>
        </div>
      )}
      {dirty && config.tournamentLocked && phase !== 'torneo' && (
        <div className={styles.stickyBar}>
          <button className={styles.btn} onClick={save}>Guardar mi porrita</button>
        </div>
      )}
    </div>
  );
}

/* ── Banner de deadline del Torneo ── */
function TournamentDeadlineBanner({ config }) {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30_000); // refresca cada 30s
    return () => clearInterval(t);
  }, []);

  if (config.tournamentLocked) {
    return (
      <div className={styles.lockedBanner}>
        Apuestas cerradas — los Dieciseisavos han terminado
      </div>
    );
  }

  // Buscar el último partido de dieciseisavos para calcular el cierre
  const r16 = (config.knockoutMatches || []).filter(m => m.stage === 'LAST_16');

  if (r16.length === 0) {
    // Los 1/8 aún no están definidos
    return (
      <div className={styles.tournamentOpenBanner}>
        <span className={styles.tournamentOpenDot} />
        Abierto hasta que terminen los Dieciseisavos de Final
      </div>
    );
  }

  // Deadline = último partido de 1/8 (asumimos que cuando acaba, se cierra)
  const lastR16 = r16
    .filter(m => m.datetime)
    .sort((a, b) => new Date(b.datetime) - new Date(a.datetime))[0];

  if (!lastR16) {
    return (
      <div className={styles.tournamentOpenBanner}>
        <span className={styles.tournamentOpenDot} />
        Abierto hasta el final de los Dieciseisavos
      </div>
    );
  }

  const deadline = new Date(lastR16.datetime);
  const diff     = deadline - now;

  if (diff <= 0) {
    // Todavía no bloqueado por Firestore pero el último 1/8 ya empezó
    return (
      <div className={styles.lockedBanner}>
        Apuestas cerradas — pendiente de confirmación de resultados
      </div>
    );
  }

  const days  = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  const mins  = Math.floor((diff % 3600000) / 60000);
  const urgent = diff < 86400000 * 2; // < 2 días

  let timeStr;
  if (days > 0)       timeStr = `${days}d ${hours}h`;
  else if (hours > 0) timeStr = `${hours}h ${mins}m`;
  else                timeStr = `${mins}m`;

  return (
    <div className={`${styles.tournamentCountdownBanner} ${urgent ? styles.tournamentUrgent : ''}`}>
      <div className={styles.tournamentCountdownLabel}>Las apuestas de Torneo cierran en</div>
      <div className={styles.tournamentCountdownTime}>{timeStr}</div>
      <div className={styles.tournamentCountdownSub}>
        Cierra cuando terminen los Dieciseisavos
      </div>
    </div>
  );
}

function TSelect({ label, value, onChange, disabled }) {
  return (
    <div className={styles.field}>
      <label>{label}</label>
      <select value={value} onChange={e => onChange(e.target.value)}
        className={styles.tSelect} disabled={disabled}>
        <option value="">— Sin seleccionar —</option>
        {ALL_TEAMS.map(t => <option key={t.name} value={t.name}>{t.name}</option>)}
      </select>
    </div>
  );
}

function TText({ label, value, onChange, placeholder, disabled }) {
  return (
    <div className={styles.field}>
      <label>{label}</label>
      <input type="text" value={value} placeholder={placeholder}
        onChange={e => onChange(e.target.value)}
        className={styles.tInput} disabled={disabled} />
    </div>
  );
}
