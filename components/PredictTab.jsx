'use client';
import { useState, useCallback } from 'react';
import {
  DndContext, closestCenter, PointerSensor, TouchSensor,
  useSensor, useSensors, DragOverlay,
} from '@dnd-kit/core';
import {
  SortableContext, verticalListSortingStrategy,
  useSortable, arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { MATCHES, GROUPS, flagUrl } from '@/lib/data';
import { fmtDate, isMatchLocked, matchPoints, defaultPicks } from '@/lib/scoring';
import TeamFlag from './TeamFlag';
import styles from './Tabs.module.css';
import dnd from './DndGroup.module.css';

export default function PredictTab({ me, config, onSave }) {
  const [phase, setPhase] = useState('scores');
  const [scores, setScores] = useState({ ...me.scores });
  const [groupPicks, setGroupPicks] = useState({ ...me.groupPicks });
  const [dirty, setDirty] = useState(false);

  const handleScore = (id, side, val) => {
    setScores(prev => ({ ...prev, [id]: { ...(prev[id] || { h: '', a: '' }), [side]: val } }));
    setDirty(true);
  };

  const reorderGroup = useCallback((group, oldIndex, newIndex) => {
    setGroupPicks(prev => {
      const arr = prev[group] ? [...prev[group]] : defaultPicks(group);
      return { ...prev, [group]: arrayMove(arr, oldIndex, newIndex) };
    });
    setDirty(true);
  }, []);

  const save = async () => {
    await onSave({ scores, groupPicks });
    setDirty(false);
  };

  return (
    <div className={styles.tabWrap}>
      <div className={styles.seg}>
        <button className={phase === 'scores' ? styles.segActive : ''} onClick={() => setPhase('scores')}>
          Resultados
        </button>
        <button className={phase === 'groups' ? styles.segActive : ''} onClick={() => setPhase('groups')}>
          Clasificación grupos
        </button>
      </div>

      {phase === 'scores' && (
        <>
          {[1, 2, 3].map(md => (
            <div key={md}>
              <div className={styles.mdTitle}>Jornada {md}</div>
              {MATCHES.filter(m => m.md === md).map(m => {
                const pred = scores[m.id] || { h: '', a: '' };
                const res = config.results[m.id];
                const locked = isMatchLocked(m, config.locked);
                const pts = res ? matchPoints(pred, res, m.mult, config.points) : null;
                return (
                  <div key={m.id}>
                    <div className={`${styles.match} ${locked ? styles.locked : ''}`}>
                      <div className={styles.team}>
                        <TeamFlag name={m.t1} size={20} />
                        <span className={styles.teamName}>{m.t1}</span>
                      </div>
                      <div className={styles.scoreIn}>
                        <input type="number" min="0" max="20" inputMode="numeric"
                          value={pred.h} disabled={locked}
                          onChange={e => handleScore(m.id, 'h', e.target.value)} />
                        <span className={styles.vs}>-</span>
                        <input type="number" min="0" max="20" inputMode="numeric"
                          value={pred.a} disabled={locked}
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

      {phase === 'groups' && (
        <div>
          <p className={styles.hint}>
            Arrastra para ordenar cada grupo del 1.º al 4.º · +{config.points.clasif} pt por posición exacta
          </p>
          {GROUPS.map(g => {
            const picks = groupPicks[g] || defaultPicks(g);
            return (
              <SortableGroup
                key={g}
                group={g}
                picks={picks}
                onReorder={reorderGroup}
              />
            );
          })}
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

// ---- Sortable group ----
function SortableGroup({ group, picks, onReorder }) {
  const [activeId, setActiveId] = useState(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor,   { activationConstraint: { delay: 150, tolerance: 5 } }),
  );

  const handleDragEnd = ({ active, over }) => {
    setActiveId(null);
    if (!over || active.id === over.id) return;
    const oldIndex = picks.indexOf(active.id);
    const newIndex = picks.indexOf(over.id);
    onReorder(group, oldIndex, newIndex);
  };

  const activeName = activeId;

  return (
    <div className={styles.card}>
      <h2 className={styles.cardTitle}>Grupo {group}</h2>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={({ active }) => setActiveId(active.id)}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={picks} strategy={verticalListSortingStrategy}>
          {picks.map((name, i) => (
            <SortableTeamRow key={name} id={name} pos={i + 1} name={name} />
          ))}
        </SortableContext>
        <DragOverlay>
          {activeName && (
            <div className={`${dnd.row} ${dnd.dragging}`}>
              <span className={dnd.pos}>{picks.indexOf(activeName) + 1}º</span>
              <TeamFlag name={activeName} size={22} />
              <span className={dnd.name}>{activeName}</span>
              <span className={dnd.handle}>⠿</span>
            </div>
          )}
        </DragOverlay>
      </DndContext>
    </div>
  );
}

function SortableTeamRow({ id, pos, name }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.35 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className={dnd.row}>
      <span className={dnd.pos}>{pos}º</span>
      <TeamFlag name={name} size={22} />
      <span className={dnd.name}>{name}</span>
      <span className={dnd.handle} {...attributes} {...listeners} title="Arrastra para reordenar">⠿</span>
    </div>
  );
}
