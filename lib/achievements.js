export const ACHIEVEMENTS = [
  {
    id:    'primer_exacto',
    label: 'Primer Exacto',
    icon:  '🎯',
    desc:  'Tu primer marcador exacto',
    check: s => s.exactCount >= 1,
  },
  {
    id:    'ojo_halcon',
    label: 'Ojo de Halcón',
    icon:  '🦅',
    desc:  '5 marcadores exactos en total',
    check: s => s.exactCount >= 5,
  },
  {
    id:    'adivino',
    label: 'Adivino',
    icon:  '🔮',
    desc:  '3 exactos consecutivos',
    check: s => s.maxExactStreak >= 3,
  },
  {
    id:    'buen_ojo',
    label: 'Buen Ojo',
    icon:  '👁️',
    desc:  '+70% de 1X2 correctos (mín. 10 partidos)',
    check: s => s.totalWithResult >= 10 && s.signRate >= 0.7,
  },
  {
    id:    'racha_fuego',
    label: 'Racha de Fuego',
    icon:  '🔥',
    desc:  '5 resultados 1X2 correctos seguidos',
    check: s => s.maxSignStreak >= 5,
  },
  {
    id:    'campeon_sombra',
    label: 'Campeón en Sombra',
    icon:  '👑',
    desc:  'Predijiste el Campeón del Mundial',
    check: s => s.predictedChampion,
  },
  {
    id:    'flipado_total',
    label: 'Flipado Total',
    icon:  '💀',
    desc:  '5 fallos de 1X2 consecutivos',
    check: s => s.maxMissStreak >= 5,
  },
  {
    id:    'centurion',
    label: 'Centurión',
    icon:  '⚡',
    desc:  'Alcanzar 100 puntos totales',
    check: s => s.total >= 100,
  },
];

export function getEarnedAchievements(stats) {
  return ACHIEVEMENTS.filter(a => a.check(stats));
}
