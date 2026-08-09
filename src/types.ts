export type Sex = 'male' | 'female'
export type Goal = 'lose' | 'gain' | 'maintain'
export type ActivityLevel =
  | 'sedentary'
  | 'light'
  | 'moderate'
  | 'active'
  | 'very_active'
export type DietStyle = 'balanced' | 'high_protein' | 'vegetarian'
export type Equipment = 'gym' | 'home' | 'both'

export interface UserProfile {
  name: string
  age: number
  sex: Sex
  heightCm: number
  weightKg: number
  goalWeightKg: number
  goal: Goal
  activity: ActivityLevel
  dietStyle: DietStyle
  equipment: Equipment
  daysPerWeek: number
}

export interface MacroTargets {
  calories: number
  protein: number
  carbs: number
  fat: number
  bmr: number
  tdee: number
  weeklyChangeKg: number
  weeksToGoal: number | null
}

export interface Meal {
  id: string
  name: string
  nameUrdu?: string
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack'
  calories: number
  protein: number
  carbs: number
  fat: number
  tags: DietStyle[]
  description: string
  ingredients: string[]
}

export interface DayPlan {
  day: string
  meals: Meal[]
  totals: { calories: number; protein: number; carbs: number; fat: number }
}

export interface Exercise {
  id: string
  name: string
  muscle: string
  equipment: Equipment[]
  sets: string
  reps: string
  rest: string
  tip: string
  /** Looping form demo GIF URL */
  demoGif: string
}

export interface WorkoutDay {
  day: string
  focus: string
  durationMin: number
  exercises: Exercise[]
}
