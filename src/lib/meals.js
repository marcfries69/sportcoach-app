import { supabase } from './supabase';

/**
 * Heutiges Datum im Format YYYY-MM-DD (lokale Zeitzone).
 */
function getTodayDate() {
  const now = new Date();
  return now.getFullYear() + '-' +
    String(now.getMonth() + 1).padStart(2, '0') + '-' +
    String(now.getDate()).padStart(2, '0');
}

/**
 * Lädt alle Mahlzeiten eines Users für ein bestimmtes Datum.
 */
export async function loadMeals(userId, date = getTodayDate()) {
  if (!supabase) {
    return { data: [], error: null };
  }

  const { data, error } = await supabase
    .from('meals')
    .select('*')
    .eq('user_id', userId)
    .eq('meal_date', date)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('loadMeals error:', error);
    return { data: null, error: error.message };
  }

  // DB snake_case → Frontend camelCase
  const meals = data.map(row => ({
    id: row.id,
    time: row.time,
    name: row.name,
    kcal: row.kcal,
    protein: row.protein,
    carbs: row.carbs,
    fat: row.fat,
    fiber: row.fiber,
    healthScore: row.health_score,
    healthExplanation: row.health_explanation,
    components: row.components || [],
  }));

  return { data: meals, error: null };
}

/**
 * Speichert eine neue Mahlzeit in Supabase.
 */
export async function saveMeal(userId, meal) {
  if (!supabase) {
    return { error: null };
  }

  const { error } = await supabase
    .from('meals')
    .insert({
      id: meal.id,
      user_id: userId,
      meal_date: getTodayDate(),
      time: meal.time,
      name: meal.name,
      kcal: meal.kcal,
      protein: meal.protein,
      carbs: meal.carbs,
      fat: meal.fat,
      fiber: meal.fiber,
      health_score: meal.healthScore || null,
      health_explanation: meal.healthExplanation || null,
      components: meal.components || [],
    });

  if (error) {
    console.error('saveMeal error:', error);
  }

  return { error: error?.message || null };
}

/**
 * Löscht eine Mahlzeit anhand der ID.
 */
export async function deleteMeal(userId, mealId) {
  if (!supabase) {
    return { error: null };
  }

  const { error } = await supabase
    .from('meals')
    .delete()
    .eq('id', mealId)
    .eq('user_id', userId);

  if (error) {
    console.error('deleteMeal error:', error);
  }

  return { error: error?.message || null };
}

/**
 * Löscht alle Mahlzeiten eines Users für ein Datum ("Neuer Tag").
 */
export async function deleteAllMealsForDate(userId, date = getTodayDate()) {
  if (!supabase) {
    return { error: null };
  }

  const { error } = await supabase
    .from('meals')
    .delete()
    .eq('user_id', userId)
    .eq('meal_date', date);

  if (error) {
    console.error('deleteAllMealsForDate error:', error);
  }

  return { error: error?.message || null };
}
