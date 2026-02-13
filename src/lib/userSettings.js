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

/**
 * Lädt die BMR/Profildaten eines Users (für Energiebilanz).
 */
export async function loadBodyData(userId) {
  if (!supabase) {
    return { data: null, error: null };
  }

  const { data, error } = await supabase
    .from('user_profiles')
    .select('bmr, daily_base, activity_level, gender, age, weight, height, fitness_goal')
    .eq('id', userId)
    .single();

  if (error) {
    console.error('loadBodyData error:', error);
    return { data: null, error: error.message };
  }

  return {
    data: data.bmr ? {
      bmr: data.bmr,
      dailyBase: data.daily_base,
      activityLevel: data.activity_level,
      gender: data.gender,
      age: data.age,
      weight: data.weight,
      height: data.height,
      goal: data.fitness_goal,
    } : null,
    error: null,
  };
}

/**
 * Speichert die BMR/Profildaten eines Users.
 */
export async function saveBodyData(userId, bodyData) {
  if (!supabase) {
    return { error: null };
  }

  const { error } = await supabase
    .from('user_profiles')
    .update({
      bmr: bodyData.bmr,
      daily_base: bodyData.dailyBase,
      activity_level: bodyData.activityLevel,
      gender: bodyData.gender,
      age: bodyData.age,
      weight: bodyData.weight,
      height: bodyData.height,
      fitness_goal: bodyData.goal,
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId);

  if (error) {
    console.error('saveBodyData error:', error);
  }

  return { error: error?.message || null };
}

/**
 * Lädt die Makro-Ziele eines Users (vom KI-Coach akzeptiert).
 */
export async function loadMacroTargets(userId) {
  if (!supabase) {
    return { data: null, error: null };
  }

  const { data, error } = await supabase
    .from('user_profiles')
    .select('macro_target_protein, macro_target_carbs, macro_target_fat, macro_target_fiber')
    .eq('id', userId)
    .single();

  if (error) {
    console.error('loadMacroTargets error:', error);
    return { data: null, error: error.message };
  }

  if (!data.macro_target_protein && !data.macro_target_carbs) {
    return { data: null, error: null };
  }

  return {
    data: {
      protein: data.macro_target_protein,
      carbs: data.macro_target_carbs,
      fat: data.macro_target_fat,
      fiber: data.macro_target_fiber,
    },
    error: null,
  };
}

/**
 * Speichert vom KI-Coach empfohlene Makro-Ziele.
 */
export async function saveMacroTargets(userId, targets) {
  if (!supabase) {
    return { error: null };
  }

  const { error } = await supabase
    .from('user_profiles')
    .update({
      macro_target_protein: targets.protein,
      macro_target_carbs: targets.carbs,
      macro_target_fat: targets.fat,
      macro_target_fiber: targets.fiber,
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId);

  if (error) {
    console.error('saveMacroTargets error:', error);
  }

  return { error: error?.message || null };
}
