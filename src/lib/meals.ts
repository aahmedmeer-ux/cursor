import type { DayPlan, DietStyle, MacroTargets, Meal } from '../types'

export const PAKISTANI_MEALS: Meal[] = [
  // Breakfast
  {
    id: 'bf-anda-roti',
    name: 'Anda & Roti',
    nameUrdu: 'انڈہ روٹی',
    mealType: 'breakfast',
    calories: 380,
    protein: 22,
    carbs: 32,
    fat: 18,
    tags: ['balanced', 'high_protein'],
    description: '2 boiled/scrambled eggs with 1 whole-wheat roti and green chutney.',
    ingredients: ['2 eggs', '1 whole-wheat roti', 'mint chutney', 'tomato'],
  },
  {
    id: 'bf-dahi-oats',
    name: 'Dahi Oats Bowl',
    nameUrdu: 'دہی اوٹس',
    mealType: 'breakfast',
    calories: 340,
    protein: 18,
    carbs: 48,
    fat: 8,
    tags: ['balanced', 'vegetarian', 'high_protein'],
    description: 'Rolled oats cooked in milk, topped with thick dahi, banana, and almonds.',
    ingredients: ['50g oats', '200ml low-fat milk', '100g dahi', '1 banana', '8 almonds'],
  },
  {
    id: 'bf-chana-chaat',
    name: 'Chana Chaat',
    nameUrdu: 'چنا چاٹ',
    mealType: 'breakfast',
    calories: 320,
    protein: 16,
    carbs: 45,
    fat: 8,
    tags: ['balanced', 'vegetarian', 'high_protein'],
    description: 'Boiled chickpeas with onion, tomato, cucumber, lemon, chaat masala.',
    ingredients: ['1 cup boiled chana', 'onion', 'tomato', 'cucumber', 'lemon', 'chaat masala'],
  },
  {
    id: 'bf-omelette-paratha-light',
    name: 'Egg White Omelette + Paratha',
    mealType: 'breakfast',
    calories: 410,
    protein: 28,
    carbs: 36,
    fat: 16,
    tags: ['high_protein', 'balanced'],
    description: 'Egg-white omelette with vegetables and a thin whole-wheat paratha cooked with minimal oil.',
    ingredients: ['4 egg whites + 1 yolk', 'onion', 'capsicum', '1 thin atta paratha'],
  },
  {
    id: 'bf-halwa-light',
    name: 'Suji Bowl + Eggs',
    mealType: 'breakfast',
    calories: 390,
    protein: 20,
    carbs: 42,
    fat: 15,
    tags: ['balanced'],
    description: 'Small portion roasted suji with milk, plus 2 boiled eggs.',
    ingredients: ['40g suji', '150ml milk', '2 eggs', 'cardamom'],
  },

  // Lunch
  {
    id: 'ln-chicken-tikka',
    name: 'Chicken Tikka Plate',
    nameUrdu: 'چکن تکہ',
    mealType: 'lunch',
    calories: 520,
    protein: 48,
    carbs: 40,
    fat: 16,
    tags: ['balanced', 'high_protein'],
    description: 'Grilled chicken tikka with salad and 1 chapati or ¾ cup rice.',
    ingredients: ['180g chicken breast', 'yogurt marinade', 'salad', '1 chapati'],
  },
  {
    id: 'ln-daal-chawal',
    name: 'Daal Chawal',
    nameUrdu: 'دال چاول',
    mealType: 'lunch',
    calories: 480,
    protein: 22,
    carbs: 72,
    fat: 10,
    tags: ['balanced', 'vegetarian'],
    description: 'Masoor or moong daal with brown/white rice and kachumber salad.',
    ingredients: ['1 cup cooked daal', '1 cup rice', 'onion-tomato salad', 'lemon'],
  },
  {
    id: 'ln-beef-keema',
    name: 'Lean Keema + Roti',
    nameUrdu: 'قیمہ',
    mealType: 'lunch',
    calories: 540,
    protein: 42,
    carbs: 38,
    fat: 22,
    tags: ['balanced', 'high_protein'],
    description: 'Lean beef or chicken keema with peas, served with 1–2 rotis and raita.',
    ingredients: ['150g lean keema', 'peas', '2 rotis', 'dahi raita'],
  },
  {
    id: 'ln-fish-curry',
    name: 'Rohu / Fish Curry Light',
    mealType: 'lunch',
    calories: 490,
    protein: 40,
    carbs: 35,
    fat: 18,
    tags: ['balanced', 'high_protein'],
    description: 'Light tomato-based fish curry with 1 roti and steamed vegetables.',
    ingredients: ['180g fish', 'tomato gravy', '1 roti', 'bhindi or cabbage'],
  },
  {
    id: 'ln-chole-salad',
    name: 'Chole Bowl',
    mealType: 'lunch',
    calories: 460,
    protein: 20,
    carbs: 62,
    fat: 12,
    tags: ['vegetarian', 'balanced'],
    description: 'Homestyle chole with cucumber-tomato salad and a small portion of rice or roti.',
    ingredients: ['1.5 cups chole', 'salad', '½ cup rice or 1 roti'],
  },
  {
    id: 'ln-chicken-karahi-light',
    name: 'Chicken Karahi (Light)',
    nameUrdu: 'چکن کڑاہی',
    mealType: 'lunch',
    calories: 510,
    protein: 45,
    carbs: 28,
    fat: 24,
    tags: ['balanced', 'high_protein'],
    description: 'Skinless chicken karahi cooked with less oil, tomatoes, and green chillies. Side salad.',
    ingredients: ['180g skinless chicken', 'tomatoes', 'ginger', 'green chilli', 'salad'],
  },

  // Dinner
  {
    id: 'dn-grilled-seekh',
    name: 'Grilled Seekh + Salad',
    nameUrdu: 'سیخ کباب',
    mealType: 'dinner',
    calories: 430,
    protein: 38,
    carbs: 18,
    fat: 22,
    tags: ['high_protein', 'balanced'],
    description: '2–3 grilled chicken seekh kebabs with lots of salad and mint raita.',
    ingredients: ['3 chicken seekh', 'mixed salad', 'mint raita'],
  },
  {
    id: 'dn-daal-mash',
    name: 'Daal Mash + Sabzi',
    mealType: 'dinner',
    calories: 400,
    protein: 22,
    carbs: 48,
    fat: 12,
    tags: ['vegetarian', 'balanced'],
    description: 'Daal mash with mixed vegetable sabzi and 1 roti.',
    ingredients: ['1 cup daal mash', 'mixed sabzi', '1 roti'],
  },
  {
    id: 'dn-tandoori-chicken',
    name: 'Tandoori Chicken + Veggies',
    mealType: 'dinner',
    calories: 420,
    protein: 46,
    carbs: 12,
    fat: 18,
    tags: ['high_protein', 'balanced'],
    description: 'Oven or pan tandoori chicken leg/breast with roasted vegetables.',
    ingredients: ['200g chicken', 'tandoori spices', 'yogurt', 'capsicum', 'onion'],
  },
  {
    id: 'dn-palak-paneer-light',
    name: 'Palak Paneer (Light)',
    mealType: 'dinner',
    calories: 450,
    protein: 24,
    carbs: 28,
    fat: 26,
    tags: ['vegetarian'],
    description: 'Palak with moderate paneer, less cream/oil, plus 1 roti.',
    ingredients: ['spinach', '80g paneer', '1 roti', 'garlic'],
  },
  {
    id: 'dn-egg-curry',
    name: 'Anda Curry + Roti',
    nameUrdu: 'انڈہ کری',
    mealType: 'dinner',
    calories: 440,
    protein: 26,
    carbs: 36,
    fat: 20,
    tags: ['balanced', 'high_protein', 'vegetarian'],
    description: '2-egg tomato curry with 1–2 rotis and salad.',
    ingredients: ['2 eggs', 'tomato gravy', '1–2 rotis', 'salad'],
  },
  {
    id: 'dn-grilled-fish',
    name: 'Masala Grilled Fish',
    mealType: 'dinner',
    calories: 390,
    protein: 42,
    carbs: 10,
    fat: 18,
    tags: ['high_protein', 'balanced'],
    description: 'Spice-rubbed grilled fish with lemon and a large salad.',
    ingredients: ['200g fish', 'garam masala', 'lemon', 'cucumber salad'],
  },

  // Snacks
  {
    id: 'sn-roasted-chana',
    name: 'Roasted Chana + Chai',
    mealType: 'snack',
    calories: 180,
    protein: 9,
    carbs: 24,
    fat: 5,
    tags: ['balanced', 'vegetarian', 'high_protein'],
    description: 'A handful of roasted chana with unsweetened doodh patti or green tea.',
    ingredients: ['40g roasted chana', 'tea (minimal sugar)'],
  },
  {
    id: 'sn-dahi',
    name: 'Thick Dahi + Honey',
    mealType: 'snack',
    calories: 160,
    protein: 12,
    carbs: 18,
    fat: 4,
    tags: ['balanced', 'vegetarian', 'high_protein'],
    description: '200g low-fat yogurt with a drizzle of honey.',
    ingredients: ['200g dahi', '1 tsp honey'],
  },
  {
    id: 'sn-fruit-nuts',
    name: 'Apple + Almonds',
    mealType: 'snack',
    calories: 200,
    protein: 5,
    carbs: 24,
    fat: 10,
    tags: ['balanced', 'vegetarian', 'high_protein'],
    description: '1 apple with 10 almonds — easy between namaz or work.',
    ingredients: ['1 apple', '10 almonds'],
  },
  {
    id: 'sn-protein-lassi',
    name: 'Protein Lassi',
    nameUrdu: 'لسی',
    mealType: 'snack',
    calories: 220,
    protein: 24,
    carbs: 18,
    fat: 4,
    tags: ['high_protein', 'balanced', 'vegetarian'],
    description: 'Blended dahi with whey or milk powder, ice, and a pinch of salt or cardamom.',
    ingredients: ['200g dahi', '1 scoop whey or 2 tbsp milk powder', 'cardamom'],
  },
  {
    id: 'sn-boiled-eggs',
    name: 'Boiled Eggs',
    mealType: 'snack',
    calories: 140,
    protein: 12,
    carbs: 1,
    fat: 10,
    tags: ['high_protein', 'balanced'],
    description: '2 boiled eggs with black pepper and chaat masala.',
    ingredients: ['2 eggs', 'chaat masala'],
  },
]

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

/** Extra sides to close the gap toward the daily calorie target */
const BOOSTERS: Meal[] = [
  {
    id: 'boost-roti',
    name: 'Extra Roti',
    mealType: 'snack',
    calories: 120,
    protein: 4,
    carbs: 24,
    fat: 1,
    tags: ['balanced', 'vegetarian', 'high_protein'],
    description: 'Add 1 more whole-wheat roti with your lunch or dinner.',
    ingredients: ['1 atta roti'],
  },
  {
    id: 'boost-rice',
    name: 'Extra Rice (½ cup)',
    mealType: 'snack',
    calories: 110,
    protein: 2,
    carbs: 24,
    fat: 0,
    tags: ['balanced', 'vegetarian', 'high_protein'],
    description: '½ cup cooked basmati with your main meal.',
    ingredients: ['½ cup cooked rice'],
  },
  {
    id: 'boost-doodh',
    name: 'Glass of Doodh',
    mealType: 'snack',
    calories: 150,
    protein: 8,
    carbs: 12,
    fat: 8,
    tags: ['balanced', 'vegetarian', 'high_protein'],
    description: '250ml low-fat milk — evening or with breakfast.',
    ingredients: ['250ml low-fat milk'],
  },
  {
    id: 'boost-peanut',
    name: 'Moongphali (handful)',
    mealType: 'snack',
    calories: 170,
    protein: 7,
    carbs: 5,
    fat: 14,
    tags: ['balanced', 'vegetarian', 'high_protein'],
    description: 'Small handful of roasted peanuts for easy calories.',
    ingredients: ['25g roasted peanuts'],
  },
  {
    id: 'boost-banana-toast',
    name: 'Banana + Toast',
    mealType: 'snack',
    calories: 220,
    protein: 5,
    carbs: 42,
    fat: 4,
    tags: ['balanced', 'vegetarian', 'high_protein'],
    description: '1 banana with 1 slice whole-wheat toast — useful on training days.',
    ingredients: ['1 banana', '1 slice whole-wheat bread'],
  },
]

function mealFits(meal: Meal, style: DietStyle): boolean {
  return meal.tags.includes(style)
}

function pickMeal(
  type: Meal['mealType'],
  style: DietStyle,
  usedIds: Set<string>,
  preferHigherProtein: boolean,
  dayIndex: number,
  slot: number,
): Meal {
  const pool = PAKISTANI_MEALS.filter(
    (m) => m.mealType === type && mealFits(m, style),
  )
  const sorted = [...pool].sort((a, b) => {
    if (preferHigherProtein) return b.protein - a.protein
    return a.calories - b.calories
  })
  const fresh = sorted.filter((m) => !usedIds.has(m.id))
  const options = fresh.length ? fresh : sorted
  const choice = options[(dayIndex * 3 + slot) % options.length]
  return choice
}

function sumMeals(meals: Meal[]) {
  return meals.reduce(
    (acc, m) => ({
      calories: acc.calories + m.calories,
      protein: acc.protein + m.protein,
      carbs: acc.carbs + m.carbs,
      fat: acc.fat + m.fat,
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 },
  )
}

/** Deterministic-ish weekly plan near calorie target */
export function buildWeeklyMealPlan(
  targets: MacroTargets,
  style: DietStyle,
  seed = 1,
): DayPlan[] {
  // Simple seeded shuffle influence
  const preferProtein = style === 'high_protein' || targets.protein >= 140
  const used = new Set<string>()

  return DAYS.map((day, i) => {
    const di = seed + i
    const breakfast = pickMeal('breakfast', style, used, preferProtein, di, 0)
    used.add(breakfast.id)
    const lunch = pickMeal('lunch', style, used, preferProtein, di, 1)
    used.add(lunch.id)
    const dinner = pickMeal('dinner', style, used, preferProtein, di, 2)
    used.add(dinner.id)

    const snacks: Meal[] = [pickMeal('snack', style, used, preferProtein, di, 3)]
    used.add(snacks[0].id)

    let meals = [breakfast, lunch, dinner, ...snacks]
    let totals = sumMeals(meals)

    // Keep adding snacks / boosters until within ~150 kcal of target
    let guard = 0
    while (totals.calories < targets.calories - 150 && guard < 6) {
      if (guard === 0) {
        const snack = pickMeal('snack', style, used, preferProtein, di, 4)
        used.add(snack.id)
        meals = [...meals, snack]
      } else {
        const booster = BOOSTERS[(di + guard) % BOOSTERS.length]
        meals = [
          ...meals,
          { ...booster, id: `${booster.id}-${day}-${guard}` },
        ]
      }
      totals = sumMeals(meals)
      guard += 1
    }

    // Clear used every 2 days so variety returns
    if (i % 2 === 1) used.clear()

    return { day, meals, totals }
  })
}

export const GROCERY_STAPLES = [
  'Atta / whole-wheat flour',
  'Eggs',
  'Chicken breast / thigh (skinless)',
  'Lean keema (beef or chicken)',
  'Fish (rohu / tilapia)',
  'Daal (moong, masoor, mash)',
  'Chana (dried or canned)',
  'Dahi (low-fat yogurt)',
  'Tomatoes, onions, green chillies',
  'Cucumber, lettuce, cabbage',
  'Bananas, apples, seasonal fruit',
  'Almonds / roasted chana',
  'Olive oil or canola (measure spoons)',
  'Ginger, garlic, chaat masala, garam masala',
  'Brown or basmati rice',
  'Oats / suji',
  'Paneer (if vegetarian)',
  'Whey protein (optional)',
]
