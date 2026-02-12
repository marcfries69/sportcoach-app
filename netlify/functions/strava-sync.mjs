// Strava Sync – Aktivitäten von Strava API laden & in Supabase speichern
import { createClient } from '@supabase/supabase-js';
import { refreshStravaToken } from './strava-refresh.mjs';

function getEnv(key) {
  return (typeof Netlify !== 'undefined' ? Netlify.env.get(key) : null) || process.env[key];
}

function getSupabase() {
  const url = getEnv('VITE_SUPABASE_URL');
  const serviceKey = getEnv('SUPABASE_SERVICE_KEY');
  return createClient(url, serviceKey);
}

export default async (req, context) => {
  // CORS Headers
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405, headers,
    });
  }

  try {
    const { athlete_id } = await req.json();

    if (!athlete_id) {
      return new Response(JSON.stringify({ error: 'athlete_id required' }), {
        status: 400, headers,
      });
    }

    // 1. Gültigen Access Token holen (refresht automatisch wenn nötig)
    const { access_token } = await refreshStravaToken(athlete_id);

    // 2. Letzte Aktivitäten von Strava API laden (5 Tage)
    const after = Math.floor(Date.now() / 1000) - (5 * 24 * 60 * 60); // letzte 5 Tage
    const stravaResponse = await fetch(
      `https://www.strava.com/api/v3/athlete/activities?per_page=30&after=${after}`,
      {
        headers: { Authorization: `Bearer ${access_token}` },
      }
    );

    if (!stravaResponse.ok) {
      const errText = await stravaResponse.text();
      console.error('Strava API error:', errText);
      return new Response(JSON.stringify({ error: 'Strava API Fehler', details: errText }), {
        status: 502, headers,
      });
    }

    const activities = await stravaResponse.json();

    // 3. Detail-Daten pro Aktivität laden (für Kalorien etc.)
    const detailedActivities = await Promise.all(
      activities.map(async (act) => {
        try {
          const detailRes = await fetch(
            `https://www.strava.com/api/v3/activities/${act.id}`,
            { headers: { Authorization: `Bearer ${access_token}` } }
          );
          if (detailRes.ok) {
            const detail = await detailRes.json();
            return { ...act, calories: detail.calories || 0 };
          }
        } catch (e) {
          console.error(`Detail fetch failed for ${act.id}:`, e);
        }
        return act;
      })
    );

    // 4. Aktivitäten in Supabase speichern (upsert)
    const supabase = getSupabase();

    const rows = detailedActivities.map(act => ({
      strava_id: String(act.id),
      user_id: String(athlete_id),
      name: act.name,
      type: act.type,
      sport_type: act.sport_type || act.type,
      distance: act.distance || 0,
      moving_time: act.moving_time || 0,
      elapsed_time: act.elapsed_time || 0,
      total_elevation_gain: act.total_elevation_gain || 0,
      start_date: act.start_date,
      start_date_local: act.start_date_local,
      average_speed: act.average_speed || 0,
      max_speed: act.max_speed || 0,
      average_heartrate: act.average_heartrate || null,
      max_heartrate: act.max_heartrate || null,
      calories: act.calories || null,
      suffer_score: act.suffer_score || null,
      updated_at: new Date().toISOString(),
    }));

    if (rows.length > 0) {
      const { error: upsertError } = await supabase
        .from('strava_activities')
        .upsert(rows, { onConflict: 'strava_id' });

      if (upsertError) {
        console.error('Supabase upsert error:', upsertError);
        return new Response(JSON.stringify({ error: 'DB Fehler', details: upsertError.message }), {
          status: 500, headers,
        });
      }
    }

    // 5. Aktivitäten der letzten 5 Tage aus Supabase zurückgeben
    const fiveDaysAgo = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString();
    const { data: savedActivities, error: fetchError } = await supabase
      .from('strava_activities')
      .select('*')
      .eq('user_id', String(athlete_id))
      .gte('start_date', fiveDaysAgo)
      .order('start_date', { ascending: false });

    if (fetchError) {
      console.error('Fetch error:', fetchError);
      return new Response(JSON.stringify({ error: 'DB Fetch Fehler' }), {
        status: 500, headers,
      });
    }

    return new Response(JSON.stringify({
      success: true,
      count: savedActivities.length,
      activities: savedActivities,
    }), { status: 200, headers });

  } catch (err) {
    console.error('strava-sync error:', err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers,
    });
  }
};
