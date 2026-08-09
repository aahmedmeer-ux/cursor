import type { ActivityLevel, MacroTargets, UserProfile } from '../types'

const ACTIVITY_MULTIPLIERS: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
}

/** Mifflin-St Jeor BMR */
export function calcBmr(profile: UserProfile): number {
  const { weightKg, heightCm, age, sex } = profile
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age
  return sex === 'male' ? base + 5 : base - 161
}

export function calcTdee(profile: UserProfile): number {
  return calcBmr(profile) * ACTIVITY_MULTIPLIERS[profile.activity]
}

export function calcMacros(profile: UserProfile): MacroTargets {
  const bmr = Math.round(calcBmr(profile))
  const tdee = Math.round(calcTdee(profile))

  let calorieAdjustment = 0
  let weeklyChangeKg = 0

  if (profile.goal === 'lose') {
    calorieAdjustment = -500
    weeklyChangeKg = -0.45
  } else if (profile.goal === 'gain') {
    calorieAdjustment = 300
    weeklyChangeKg = 0.25
  }

  let calories = Math.round(tdee + calorieAdjustment)
  // Floor for safety
  const minCalories = profile.sex === 'male' ? 1500 : 1200
  calories = Math.max(calories, minCalories)

  // Protein: higher for fat loss / muscle gain
  const proteinPerKg =
    profile.goal === 'lose' ? 2.0 : profile.goal === 'gain' ? 1.8 : 1.6
  let protein = Math.round(profile.weightKg * proteinPerKg)

  if (profile.dietStyle === 'high_protein') {
    protein = Math.round(profile.weightKg * 2.2)
  } else if (profile.dietStyle === 'vegetarian') {
    protein = Math.round(profile.weightKg * 1.6)
  }

  const fat = Math.round((calories * 0.28) / 9)
  const carbs = Math.max(
    0,
    Math.round((calories - protein * 4 - fat * 9) / 4),
  )

  const weightDiff = profile.goalWeightKg - profile.weightKg
  let weeksToGoal: number | null = null
  if (profile.goal !== 'maintain' && Math.abs(weeklyChangeKg) > 0) {
    const needed = Math.abs(weightDiff)
    if (
      (profile.goal === 'lose' && weightDiff < 0) ||
      (profile.goal === 'gain' && weightDiff > 0)
    ) {
      weeksToGoal = Math.ceil(needed / Math.abs(weeklyChangeKg))
    }
  }

  return {
    calories,
    protein,
    carbs,
    fat,
    bmr,
    tdee,
    weeklyChangeKg,
    weeksToGoal,
  }
}

export function bmi(weightKg: number, heightCm: number): number {
  const m = heightCm / 100
  return Math.round((weightKg / (m * m)) * 10) / 10
}

export function inferGoal(current: number, target: number): UserProfile['goal'] {
  const diff = target - current
  if (diff < -1) return 'lose'
  if (diff > 1) return 'gain'
  return 'maintain'
}
