import { useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { MacroTargets, UserProfile } from '../types'
import { bmi } from '../lib/calculations'
import { buildWeeklyMealPlan, GROCERY_STAPLES } from '../lib/meals'
import { buildWorkoutPlan, TRAINING_TIPS } from '../lib/exercises'

interface Props {
  profile: UserProfile
  macros: MacroTargets
  onEdit: () => void
}

type Tab = 'diet' | 'training' | 'grocery'

export function Results({ profile, macros, onEdit }: Props) {
  const [tab, setTab] = useState<Tab>('diet')

  const mealPlan = useMemo(
    () => buildWeeklyMealPlan(macros, profile.dietStyle, profile.weightKg),
    [macros, profile.dietStyle, profile.weightKg],
  )

  const workouts = useMemo(
    () =>
      buildWorkoutPlan(profile.goal, profile.equipment, profile.daysPerWeek),
    [profile.goal, profile.equipment, profile.daysPerWeek],
  )

  const currentBmi = bmi(profile.weightKg, profile.heightCm)
  const goalLabel =
    profile.goal === 'lose'
      ? 'lose fat'
      : profile.goal === 'gain'
        ? 'build muscle'
        : 'maintain'

  const timeline =
    macros.weeksToGoal != null
      ? `About ${macros.weeksToGoal} weeks at a steady pace (~${Math.abs(macros.weeklyChangeKg)} kg/week).`
      : 'Hold your weight while getting stronger and eating well.'

  return (
    <div>
      <div className="section-head">
        <h2>
          {profile.name}, here’s your plan to {goalLabel}
        </h2>
        <p>
          Height {profile.heightCm} cm · Now {profile.weightKg} kg → goal{' '}
          {profile.goalWeightKg} kg · BMI {currentBmi}
        </p>
      </div>

      <div className="results-top">
        <div className="macro-strip">
          <div className="macro">
            <strong>{macros.calories}</strong>
            <span>Calories / day</span>
          </div>
          <div className="macro">
            <strong>{macros.protein}g</strong>
            <span>Protein</span>
          </div>
          <div className="macro">
            <strong>{macros.carbs}g</strong>
            <span>Carbs</span>
          </div>
          <div className="macro">
            <strong>{macros.fat}g</strong>
            <span>Fat</span>
          </div>
        </div>

        <motion.div
          className="insight"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
        >
          <h3>Pakistan-ready nutrition + training</h3>
          <p>
            Daily target ~{macros.calories} kcal (TDEE {macros.tdee}). {timeline}{' '}
            Meals are built from desi staples — daal, tikka, roti, dahi, chana —
            so you can cook at home or order smarter.
          </p>
        </motion.div>
      </div>

      <div className="tabs" role="tablist">
        {(
          [
            ['diet', 'Diet plan'],
            ['training', 'Exercises'],
            ['grocery', 'Grocery list'],
          ] as [Tab, string][]
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            className={`tab ${tab === id ? 'active' : ''}`}
            onClick={() => setTab(id)}
          >
            {label}
          </button>
        ))}
        <button type="button" className="tab" onClick={onEdit}>
          Edit stats
        </button>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={tab}
          className="panel"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.28 }}
        >
          {tab === 'diet' && (
            <div>
              {mealPlan.map((day) => (
                <div className="day-block" key={day.day}>
                  <div className="day-title">
                    <h3>{day.day}</h3>
                    <span>
                      {day.totals.calories} kcal · {day.totals.protein}g protein
                    </span>
                  </div>
                  <div className="meal-list">
                    {day.meals.map((meal) => (
                      <div className="meal-row" key={`${day.day}-${meal.id}`}>
                        <div>
                          <span className="meal-type">{meal.mealType}</span>
                          <h4>
                            {meal.name}
                            {meal.nameUrdu ? ` · ${meal.nameUrdu}` : ''}
                          </h4>
                          <p>{meal.description}</p>
                        </div>
                        <div className="meal-macros">
                          {meal.calories} kcal
                          <br />
                          P {meal.protein} · C {meal.carbs} · F {meal.fat}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {tab === 'training' && (
            <div>
              {workouts.map((day) => (
                <div className="day-block" key={day.day}>
                  <div className="day-title">
                    <h3>{day.day}</h3>
                    <span>
                      {day.focus} · ~{day.durationMin} min
                    </span>
                  </div>
                  <div className="exercise-list">
                    {day.exercises.map((ex) => (
                      <div className="exercise-row" key={`${day.day}-${ex.id}`}>
                        <div>
                          <span className="meal-type">{ex.muscle}</span>
                          <h4>{ex.name}</h4>
                          <p>{ex.tip}</p>
                        </div>
                        <div className="exercise-meta">
                          {ex.sets} × {ex.reps}
                          <small>Rest {ex.rest}</small>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              <ul className="tips">
                {TRAINING_TIPS[profile.goal].map((tip) => (
                  <li key={tip}>{tip}</li>
                ))}
              </ul>
            </div>
          )}

          {tab === 'grocery' && (
            <div>
              <div className="section-head" style={{ marginBottom: '1rem' }}>
                <h2 style={{ fontSize: '1.35rem' }}>Weekly staples (PK bazaar)</h2>
                <p>
                  Shop once at your local sabzi mandi / Imtiaz / Metro. Measure oil —
                  that’s where most desi calories hide.
                </p>
              </div>
              <ul className="grocery">
                {GROCERY_STAPLES.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
