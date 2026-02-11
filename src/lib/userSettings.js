import { supabase } from './supabase';

/**
 * Lädt das Kalorienziel eines Users.
 */
export async function loadCalorieGoal(userId) {
  if (!supabase) {
    return { calorieGoal: 2000, error: null };
  }

  const { data, error } = await supabase
    .from('user_profiles')
    .select('calorie_goal')
    .eq('id', userId)
    .single();

  if (error) {
    console.error('loadCalorieGoal error:', error);
    return { calorieGoal: 2000, error: error.message };
  }

  return { calorieGoal: data.calorie_goal, error: null };
}

/**
 * Speichert/aktualisiert das Kalorienziel eines Users.
 */
export async function saveCalorieGoal(userId, goal) {
  if (!supabase) {
    return { error: null };
  }

  const { error } = await supabase
    .from('user_profiles')
    .update({ calorie_goal: goal, updated_at: new Date().toISOString() })
    .eq('id', userId);

  if (error) {
    console.error('saveCalorieGoal error:', error);
  }

  return { error: error?.message || null };
}
