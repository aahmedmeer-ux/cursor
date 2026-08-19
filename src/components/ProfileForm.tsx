import { useState, type FormEvent } from 'react'
import type {
  ActivityLevel,
  DietStyle,
  Equipment,
  Sex,
  UserProfile,
} from '../types'
import { inferGoal } from '../lib/calculations'

interface Props {
  initial?: Partial<UserProfile>
  onSubmit: (profile: UserProfile) => void
}

const defaultProfile: UserProfile = {
  name: '',
  age: 25,
  sex: 'male',
  heightCm: 170,
  weightKg: 75,
  goalWeightKg: 70,
  goal: 'lose',
  activity: 'moderate',
  dietStyle: 'balanced',
  equipment: 'both',
  daysPerWeek: 4,
}

export function ProfileForm({ initial, onSubmit }: Props) {
  const [form, setForm] = useState<UserProfile>({ ...defaultProfile, ...initial })
  const [error, setError] = useState('')

  function update<K extends keyof UserProfile>(key: K, value: UserProfile[K]) {
    setForm((prev) => {
      const next = { ...prev, [key]: value }
      if (key === 'weightKg' || key === 'goalWeightKg') {
        next.goal = inferGoal(
          key === 'weightKg' ? (value as number) : next.weightKg,
          key === 'goalWeightKg' ? (value as number) : next.goalWeightKg,
        )
      }
      return next
    })
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) {
      setError('Add your name so we can personalize the plan.')
      return
    }
    if (form.heightCm < 120 || form.heightCm > 230) {
      setError('Height should be between 120 and 230 cm.')
      return
    }
    if (form.weightKg < 35 || form.weightKg > 250) {
      setError('Please enter a realistic current weight.')
      return
    }
    if (form.goalWeightKg < 35 || form.goalWeightKg > 250) {
      setError('Please enter a realistic goal weight.')
      return
    }
    if (form.age < 14 || form.age > 80) {
      setError('Age should be between 14 and 80.')
      return
    }
    setError('')
    onSubmit({ ...form, name: form.name.trim() })
  }

  return (
    <form className="form-panel" onSubmit={handleSubmit}>
      <div className="form-grid">
        <div className="field full">
          <label htmlFor="name">Your name</label>
          <input
            id="name"
            value={form.name}
            onChange={(e) => update('name', e.target.value)}
            placeholder="e.g. Ahmed"
            autoComplete="name"
          />
        </div>

        <div className="field">
          <label htmlFor="age">Age</label>
          <input
            id="age"
            type="number"
            min={14}
            max={80}
            value={form.age}
            onChange={(e) => update('age', Number(e.target.value))}
          />
        </div>

        <div className="field">
          <label>Sex</label>
          <div className="choice-row">
            {(['male', 'female'] as Sex[]).map((s) => (
              <button
                key={s}
                type="button"
                className={`choice ${form.sex === s ? 'active' : ''}`}
                onClick={() => update('sex', s)}
              >
                {s === 'male' ? 'Male' : 'Female'}
              </button>
            ))}
          </div>
        </div>

        <div className="field">
          <label htmlFor="height">Height (cm)</label>
          <input
            id="height"
            type="number"
            min={120}
            max={230}
            value={form.heightCm}
            onChange={(e) => update('heightCm', Number(e.target.value))}
          />
        </div>

        <div className="field">
          <label htmlFor="weight">Current weight (kg)</label>
          <input
            id="weight"
            type="number"
            min={35}
            max={250}
            step={0.1}
            value={form.weightKg}
            onChange={(e) => update('weightKg', Number(e.target.value))}
          />
        </div>

        <div className="field">
          <label htmlFor="goalWeight">Goal weight (kg)</label>
          <input
            id="goalWeight"
            type="number"
            min={35}
            max={250}
            step={0.1}
            value={form.goalWeightKg}
            onChange={(e) => update('goalWeightKg', Number(e.target.value))}
          />
        </div>

        <div className="field">
          <label htmlFor="activity">Activity level</label>
          <select
            id="activity"
            value={form.activity}
            onChange={(e) => update('activity', e.target.value as ActivityLevel)}
          >
            <option value="sedentary">Sedentary (desk job)</option>
            <option value="light">Light (1–2 walks/week)</option>
            <option value="moderate">Moderate (3–4 workouts/week)</option>
            <option value="active">Active (5–6 workouts/week)</option>
            <option value="very_active">Very active (athlete / physical job)</option>
          </select>
        </div>

        <div className="field">
          <label htmlFor="days">Training days / week</label>
          <input
            id="days"
            type="number"
            min={3}
            max={6}
            value={form.daysPerWeek}
            onChange={(e) => update('daysPerWeek', Number(e.target.value))}
          />
        </div>

        <div className="field full">
          <label>Pakistani diet style</label>
          <div className="choice-row">
            {(
              [
                ['balanced', 'Balanced desi'],
                ['high_protein', 'High protein'],
                ['vegetarian', 'Vegetarian'],
              ] as [DietStyle, string][]
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                className={`choice ${form.dietStyle === id ? 'active' : ''}`}
                onClick={() => update('dietStyle', id)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="field full">
          <label>Equipment</label>
          <div className="choice-row">
            {(
              [
                ['gym', 'Gym'],
                ['home', 'Home / bodyweight'],
                ['both', 'Gym + home'],
              ] as [Equipment, string][]
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                className={`choice ${form.equipment === id ? 'active' : ''}`}
                onClick={() => update('equipment', id)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <p className="form-hint">
        Goal auto-set to{' '}
        <strong>
          {form.goal === 'lose'
            ? 'fat loss'
            : form.goal === 'gain'
              ? 'muscle gain'
              : 'maintain'}
        </strong>{' '}
        from your weight targets. Meals use everyday Pakistani foods (halal).
      </p>

      {error ? <p className="form-error">{error}</p> : null}

      <button type="submit" className="btn btn-primary btn-block">
        Build my Quwwat plan
      </button>
    </form>
  )
}
