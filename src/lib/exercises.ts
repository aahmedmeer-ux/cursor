import type { Equipment, Exercise, Goal, WorkoutDay } from '../types'

const EXERCISES: Exercise[] = [
  // Compound / gym
  {
    id: 'squat',
    name: 'Barbell Back Squat',
    muscle: 'Legs / Glutes',
    equipment: ['gym'],
    sets: '4',
    reps: '6–10',
    rest: '2–3 min',
    tip: 'Brace your core; depth to parallel. Progressive overload weekly.',
    demoGif: 'https://cdn.jsdelivr.net/gh/JahelCuadrado/ExerciseGymGifsDB@v1.1.0/glutes/barbell-full-squat.gif',
  },
  {
    id: 'deadlift',
    name: 'Romanian Deadlift',
    muscle: 'Hamstrings / Back',
    equipment: ['gym'],
    sets: '3',
    reps: '8–12',
    rest: '2 min',
    tip: 'Soft knees, hinge at hips, feel stretch in hamstrings.',
    demoGif: 'https://cdn.jsdelivr.net/gh/JahelCuadrado/ExerciseGymGifsDB@v1.1.0/glutes/barbell-romanian-deadlift.gif',
  },
  {
    id: 'bench',
    name: 'Barbell Bench Press',
    muscle: 'Chest / Triceps',
    equipment: ['gym'],
    sets: '4',
    reps: '6–10',
    rest: '2–3 min',
    tip: 'Retract shoulder blades; controlled eccentric.',
    demoGif: 'https://cdn.jsdelivr.net/gh/JahelCuadrado/ExerciseGymGifsDB@v1.1.0/pectorals/barbell-bench-press.gif',
  },
  {
    id: 'row',
    name: 'Bent-Over Row',
    muscle: 'Back',
    equipment: ['gym', 'home'],
    sets: '3',
    reps: '8–12',
    rest: '90 sec',
    tip: 'Pull elbows to hips; don’t shrug.',
    demoGif: 'https://cdn.jsdelivr.net/gh/JahelCuadrado/ExerciseGymGifsDB@v1.1.0/upper-back/barbell-bent-over-row.gif',
  },
  {
    id: 'ohp',
    name: 'Overhead Press',
    muscle: 'Shoulders',
    equipment: ['gym'],
    sets: '3',
    reps: '6–10',
    rest: '2 min',
    tip: 'Glutes tight; press in a straight line.',
    demoGif: 'https://cdn.jsdelivr.net/gh/JahelCuadrado/ExerciseGymGifsDB@v1.1.0/delts/barbell-standing-wide-military-press.gif',
  },
  {
    id: 'lat-pulldown',
    name: 'Lat Pulldown / Pull-ups',
    muscle: 'Lats',
    equipment: ['gym'],
    sets: '3',
    reps: '8–12',
    rest: '90 sec',
    tip: 'Full stretch at top; pull to upper chest.',
    demoGif: 'https://cdn.jsdelivr.net/gh/JahelCuadrado/ExerciseGymGifsDB@v1.1.0/lats/cable-lat-pulldown-full-range-of-motion.gif',
  },
  {
    id: 'leg-press',
    name: 'Leg Press',
    muscle: 'Quads',
    equipment: ['gym'],
    sets: '3',
    reps: '10–15',
    rest: '90 sec',
    tip: 'Don’t lock knees hard; full controlled range.',
    demoGif: 'https://cdn.jsdelivr.net/gh/JahelCuadrado/ExerciseGymGifsDB@v1.1.0/glutes/sled-45-leg-press.gif',
  },
  {
    id: 'db-lunges',
    name: 'Walking Lunges',
    muscle: 'Legs',
    equipment: ['gym', 'home'],
    sets: '3',
    reps: '10/leg',
    rest: '90 sec',
    tip: 'Upright torso; knee tracks over toes.',
    demoGif: 'https://cdn.jsdelivr.net/gh/JahelCuadrado/ExerciseGymGifsDB@v1.1.0/glutes/dumbbell-lunge.gif',
  },
  {
    id: 'db-press',
    name: 'Dumbbell Chest Press',
    muscle: 'Chest',
    equipment: ['gym', 'home'],
    sets: '3',
    reps: '8–12',
    rest: '90 sec',
    tip: 'Slight arch; dumbbells meet above chest.',
    demoGif: 'https://cdn.jsdelivr.net/gh/JahelCuadrado/ExerciseGymGifsDB@v1.1.0/pectorals/dumbbell-bench-press.gif',
  },
  {
    id: 'face-pull',
    name: 'Face Pulls',
    muscle: 'Rear Delts',
    equipment: ['gym'],
    sets: '3',
    reps: '12–15',
    rest: '60 sec',
    tip: 'Pull to face, externally rotate at end.',
    demoGif: 'https://cdn.jsdelivr.net/gh/JahelCuadrado/ExerciseGymGifsDB@v1.1.0/delts/cable-standing-rear-delt-row-with-rope.gif',
  },
  {
    id: 'plank',
    name: 'Plank',
    muscle: 'Core',
    equipment: ['gym', 'home'],
    sets: '3',
    reps: '30–60 sec',
    rest: '45 sec',
    tip: 'Ribs down, glutes on — don’t sag.',
    demoGif: 'https://cdn.jsdelivr.net/gh/JahelCuadrado/ExerciseGymGifsDB@v1.1.0/abs/weighted-front-plank.gif',
  },
  {
    id: 'farmer',
    name: 'Farmer Carries',
    muscle: 'Grip / Core',
    equipment: ['gym', 'home'],
    sets: '3',
    reps: '30–40 m',
    rest: '60 sec',
    tip: 'Walk tall with heavy dumbbells or water jugs.',
    demoGif: 'https://cdn.jsdelivr.net/gh/JahelCuadrado/ExerciseGymGifsDB@v1.1.0/quads/farmers-walk.gif',
  },

  // Home / bodyweight
  {
    id: 'pushup',
    name: 'Push-ups',
    muscle: 'Chest / Triceps',
    equipment: ['home', 'gym'],
    sets: '3',
    reps: '8–20',
    rest: '60 sec',
    tip: 'Elevate hands if needed; full chest-to-floor when strong.',
    demoGif: 'https://cdn.jsdelivr.net/gh/JahelCuadrado/ExerciseGymGifsDB@v1.1.0/pectorals/push-up.gif',
  },
  {
    id: 'squat-bw',
    name: 'Bodyweight Squats',
    muscle: 'Legs',
    equipment: ['home'],
    sets: '4',
    reps: '15–25',
    rest: '60 sec',
    tip: 'Sit back; add backpack weight as you progress.',
    demoGif: 'https://cdn.jsdelivr.net/gh/JahelCuadrado/ExerciseGymGifsDB@v1.1.0/quads/squat-to-overhead-reach.gif',
  },
  {
    id: 'hip-thrust',
    name: 'Glute Bridge / Hip Thrust',
    muscle: 'Glutes',
    equipment: ['home', 'gym'],
    sets: '3',
    reps: '12–20',
    rest: '60 sec',
    tip: 'Pause and squeeze at the top.',
    demoGif: 'https://cdn.jsdelivr.net/gh/JahelCuadrado/ExerciseGymGifsDB@v1.1.0/glutes/barbell-glute-bridge.gif',
  },
  {
    id: 'inverted-row',
    name: 'Table / Inverted Rows',
    muscle: 'Back',
    equipment: ['home'],
    sets: '3',
    reps: '8–15',
    rest: '60 sec',
    tip: 'Use a sturdy table edge or towel rows on a door.',
    demoGif: 'https://cdn.jsdelivr.net/gh/JahelCuadrado/ExerciseGymGifsDB@v1.1.0/upper-back/inverted-row.gif',
  },
  {
    id: 'pike-push',
    name: 'Pike Push-ups',
    muscle: 'Shoulders',
    equipment: ['home'],
    sets: '3',
    reps: '6–12',
    rest: '75 sec',
    tip: 'Hips high; lower head toward floor.',
    demoGif: 'https://cdn.jsdelivr.net/gh/JahelCuadrado/ExerciseGymGifsDB@v1.1.0/pectorals/exercise-ball-pike-push-up.gif',
  },
  {
    id: 'burpee',
    name: 'Burpees',
    muscle: 'Full Body / Cardio',
    equipment: ['home', 'gym'],
    sets: '3',
    reps: '8–15',
    rest: '60 sec',
    tip: 'Great for fat loss finishers — keep form clean.',
    demoGif: 'https://cdn.jsdelivr.net/gh/JahelCuadrado/ExerciseGymGifsDB@v1.1.0/cardio/burpee.gif',
  },
  {
    id: 'mountain',
    name: 'Mountain Climbers',
    muscle: 'Core / Cardio',
    equipment: ['home', 'gym'],
    sets: '3',
    reps: '30–45 sec',
    rest: '45 sec',
    tip: 'Quick feet, stable shoulders.',
    demoGif: 'https://cdn.jsdelivr.net/gh/JahelCuadrado/ExerciseGymGifsDB@v1.1.0/cardio/mountain-climber.gif',
  },
  {
    id: 'jump-rope',
    name: 'Jump Rope / Shadow Skip',
    muscle: 'Cardio',
    equipment: ['home', 'gym'],
    sets: '4',
    reps: '60–90 sec',
    rest: '45 sec',
    tip: 'Easy on joints; build to continuous rounds.',
    demoGif: 'https://cdn.jsdelivr.net/gh/JahelCuadrado/ExerciseGymGifsDB@v1.1.0/cardio/jump-rope.gif',
  },
  {
    id: 'walk',
    name: 'Brisk Walk (Shaam Walk)',
    muscle: 'Cardio / Recovery',
    equipment: ['home', 'gym'],
    sets: '1',
    reps: '25–40 min',
    rest: '—',
    tip: 'After dinner walk is a Pakistani classic — excellent for fat loss.',
    demoGif: 'https://cdn.jsdelivr.net/gh/JahelCuadrado/ExerciseGymGifsDB@v1.1.0/cardio/walking-on-incline-treadmill.gif',
  },
  {
    id: 'curl',
    name: 'Dumbbell Curls',
    muscle: 'Biceps',
    equipment: ['gym', 'home'],
    sets: '3',
    reps: '10–15',
    rest: '60 sec',
    tip: 'No swinging; control the negative.',
    demoGif: 'https://cdn.jsdelivr.net/gh/JahelCuadrado/ExerciseGymGifsDB@v1.1.0/biceps/dumbbell-biceps-curl.gif',
  },
  {
    id: 'triceps',
    name: 'Triceps Extensions',
    muscle: 'Triceps',
    equipment: ['gym', 'home'],
    sets: '3',
    reps: '10–15',
    rest: '60 sec',
    tip: 'Elbows stay pinned; full stretch.',
    demoGif: 'https://cdn.jsdelivr.net/gh/JahelCuadrado/ExerciseGymGifsDB@v1.1.0/triceps/dumbbell-standing-triceps-extension.gif',
  },
  {
    id: 'calf',
    name: 'Calf Raises',
    muscle: 'Calves',
    equipment: ['gym', 'home'],
    sets: '3',
    reps: '12–20',
    rest: '45 sec',
    tip: 'Pause at the top; use a step for stretch.',
    demoGif: 'https://cdn.jsdelivr.net/gh/JahelCuadrado/ExerciseGymGifsDB@v1.1.0/calves/bodyweight-standing-calf-raise.gif',
  },
]

function fitsEquipment(ex: Exercise, eq: Equipment): boolean {
  if (eq === 'both') return true
  return ex.equipment.includes(eq) || ex.equipment.includes('both' as Equipment)
}

function pick(ids: string[], eq: Equipment): Exercise[] {
  return ids
    .map((id) => EXERCISES.find((e) => e.id === id))
    .filter((e): e is Exercise => !!e && fitsEquipment(e, eq))
}

export function buildWorkoutPlan(
  goal: Goal,
  equipment: Equipment,
  daysPerWeek: number,
): WorkoutDay[] {
  const days = Math.min(6, Math.max(3, daysPerWeek))

  if (goal === 'lose') {
    return buildFatLoss(equipment, days)
  }
  if (goal === 'gain') {
    return buildMuscle(equipment, days)
  }
  return buildMaintain(equipment, days)
}

function buildFatLoss(eq: Equipment, days: number): WorkoutDay[] {
  const templates: WorkoutDay[] = [
    {
      day: 'Day 1 — Full Body Strength',
      focus: 'Build muscle while in a deficit',
      durationMin: 45,
      exercises: pick(
        eq === 'home'
          ? ['squat-bw', 'pushup', 'inverted-row', 'hip-thrust', 'plank', 'burpee']
          : ['squat', 'bench', 'row', 'db-lunges', 'plank', 'burpee'],
        eq,
      ),
    },
    {
      day: 'Day 2 — Conditioning + Walk',
      focus: 'Burn calories, stay consistent',
      durationMin: 40,
      exercises: pick(
        ['jump-rope', 'mountain', 'pushup', 'squat-bw', 'walk'],
        eq,
      ),
    },
    {
      day: 'Day 3 — Upper Push / Pull',
      focus: 'Upper body tone',
      durationMin: 45,
      exercises: pick(
        eq === 'home'
          ? ['pushup', 'inverted-row', 'pike-push', 'curl', 'triceps', 'plank']
          : ['bench', 'lat-pulldown', 'ohp', 'row', 'face-pull', 'triceps'],
        eq,
      ),
    },
    {
      day: 'Day 4 — Legs + Core',
      focus: 'Lower body + metabolism',
      durationMin: 40,
      exercises: pick(
        eq === 'home'
          ? ['squat-bw', 'db-lunges', 'hip-thrust', 'calf', 'mountain', 'plank']
          : ['squat', 'deadlift', 'leg-press', 'calf', 'plank', 'farmer'],
        eq,
      ),
    },
    {
      day: 'Day 5 — HIIT Finisher',
      focus: 'Short, hard intervals',
      durationMin: 35,
      exercises: pick(
        ['burpee', 'jump-rope', 'mountain', 'squat-bw', 'pushup', 'walk'],
        eq,
      ),
    },
    {
      day: 'Day 6 — Active Recovery',
      focus: 'Shaam walk + mobility',
      durationMin: 35,
      exercises: pick(['walk', 'hip-thrust', 'plank'], eq),
    },
  ]

  return templates.slice(0, days)
}

function buildMuscle(eq: Equipment, days: number): WorkoutDay[] {
  const templates: WorkoutDay[] = [
    {
      day: 'Day 1 — Push (Chest / Shoulders / Triceps)',
      focus: 'Progressive overload',
      durationMin: 55,
      exercises: pick(
        eq === 'home'
          ? ['pushup', 'pike-push', 'db-press', 'triceps', 'plank']
          : ['bench', 'ohp', 'db-press', 'triceps', 'face-pull'],
        eq,
      ),
    },
    {
      day: 'Day 2 — Pull (Back / Biceps)',
      focus: 'Width and thickness',
      durationMin: 55,
      exercises: pick(
        eq === 'home'
          ? ['inverted-row', 'row', 'curl', 'farmer', 'plank']
          : ['deadlift', 'lat-pulldown', 'row', 'face-pull', 'curl'],
        eq,
      ),
    },
    {
      day: 'Day 3 — Legs',
      focus: 'Quads, glutes, hamstrings',
      durationMin: 55,
      exercises: pick(
        eq === 'home'
          ? ['squat-bw', 'db-lunges', 'hip-thrust', 'calf', 'plank']
          : ['squat', 'deadlift', 'leg-press', 'db-lunges', 'calf'],
        eq,
      ),
    },
    {
      day: 'Day 4 — Upper Hypertrophy',
      focus: 'Volume for growth',
      durationMin: 50,
      exercises: pick(
        eq === 'home'
          ? ['pushup', 'inverted-row', 'pike-push', 'curl', 'triceps']
          : ['bench', 'row', 'ohp', 'lat-pulldown', 'curl', 'triceps'],
        eq,
      ),
    },
    {
      day: 'Day 5 — Full Body Strength',
      focus: 'Compounds + carries',
      durationMin: 50,
      exercises: pick(
        eq === 'home'
          ? ['squat-bw', 'pushup', 'row', 'hip-thrust', 'farmer']
          : ['squat', 'bench', 'row', 'farmer', 'plank'],
        eq,
      ),
    },
    {
      day: 'Day 6 — Arms + Walk',
      focus: 'Extra volume + recovery',
      durationMin: 40,
      exercises: pick(['curl', 'triceps', 'face-pull', 'walk', 'plank'], eq),
    },
  ]
  return templates.slice(0, days)
}

function buildMaintain(eq: Equipment, days: number): WorkoutDay[] {
  const templates: WorkoutDay[] = [
    {
      day: 'Day 1 — Full Body A',
      focus: 'Strength maintenance',
      durationMin: 45,
      exercises: pick(
        eq === 'home'
          ? ['squat-bw', 'pushup', 'inverted-row', 'hip-thrust', 'plank']
          : ['squat', 'bench', 'row', 'plank', 'farmer'],
        eq,
      ),
    },
    {
      day: 'Day 2 — Conditioning',
      focus: 'Heart health',
      durationMin: 35,
      exercises: pick(['jump-rope', 'mountain', 'walk', 'plank'], eq),
    },
    {
      day: 'Day 3 — Full Body B',
      focus: 'Balance push/pull/legs',
      durationMin: 45,
      exercises: pick(
        eq === 'home'
          ? ['db-lunges', 'pike-push', 'row', 'curl', 'calf']
          : ['deadlift', 'ohp', 'lat-pulldown', 'db-lunges', 'calf'],
        eq,
      ),
    },
    {
      day: 'Day 4 — Upper Focus',
      focus: 'Keep upper body sharp',
      durationMin: 40,
      exercises: pick(
        eq === 'home'
          ? ['pushup', 'inverted-row', 'triceps', 'curl', 'plank']
          : ['bench', 'row', 'face-pull', 'triceps', 'curl'],
        eq,
      ),
    },
    {
      day: 'Day 5 — Legs + Walk',
      focus: 'Lower body + evening walk',
      durationMin: 40,
      exercises: pick(
        eq === 'home'
          ? ['squat-bw', 'hip-thrust', 'calf', 'walk']
          : ['squat', 'leg-press', 'calf', 'walk'],
        eq,
      ),
    },
  ]
  return templates.slice(0, days)
}

export const TRAINING_TIPS: Record<Goal, string[]> = {
  lose: [
    'Stay in your calorie deficit most days — Pakistani wedding food is fine occasionally, plan around it.',
    'Prioritize protein at every meal (anda, chicken, daal, dahi).',
    'Walk 8–10k steps; a post-dinner walk helps digestion and fat loss.',
    'Sleep 7+ hours — recovery matters as much as training.',
  ],
  gain: [
    'Hit your calorie surplus with extra roti, rice, doodh, and nuts — not only junk.',
    'Add weight or reps every week on main lifts (progressive overload).',
    'Eat a protein-rich meal within 1–2 hours after training.',
    'Rest days are growth days — don’t skip sleep.',
  ],
  maintain: [
    'Keep training 3–5 days and eat near maintenance calories.',
    'Reassess weight every 2 weeks and nudge calories ±200 if needed.',
    'Mix strength with walking for long-term health.',
    'Stay consistent through Ramadan by adjusting meal timing, not abandoning the plan.',
  ],
}
