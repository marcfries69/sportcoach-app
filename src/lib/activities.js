import { supabase } from './supabase';

/**
 * Lädt Aktivitäten eines Users für einen Zeitraum aus Supabase.
 */
export async function loadActivitiesForRange(userId, days = 30) {
  if (!supabase) {
    return { data: [], error: null };
  }

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const { data, error } = await supabase
    .from('strava_activities')
    .select('*')
    .eq('user_id', String(userId))
    .gte('start_date', startDate.toISOString())
    .order('start_date', { ascending: false });

  if (error) {
    console.error('loadActivitiesForRange error:', error);
    return { data: [], error: error.message };
  }

  return { data: data || [], error: null };
}
