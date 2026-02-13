// Strava Sync – Aktivitäten von Strava API laden & in Supabase speichern
// Modi: "recent" (7d, Standard), "full" (12mo, paginiert), "db_only" (nur aus DB)
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
    const { athlete_id, mode = 'recent' } = await req.json();

    if (!athlete_id) {
      return new Response(JSON.stringify({ error: 'athlete_id required' }), {
        status: 400, headers,
      });
    }

    const supabase = getSupabase();

    // --- DB-ONLY Modus: Nur aus Supabase lesen ---
    if (mode === 'db_only') {
      const daysBack = 365;
      const startDate = new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000).toISOString();
      const { data, error } = await supabase
        .from('strava_activities')
        .select('*')
        .eq('user_id', String(athlete_id))
        .gte('start_date', startDate)
        .order('start_date', { ascending: false });

      if (error) {
        return new Response(JSON.stringify({ error: 'DB Fetch Fehler' }), { status: 500, headers });
      }

      return new Response(JSON.stringify({
        success: true,
        count: (data || []).length,
        activities: data || [],
      }), { status: 200, headers });
    }

    // --- RECENT oder FULL: Strava API aufrufen ---
    const { access_token } = await refreshStravaToken(athlete_id);

    let allActivities = [];

    if (mode === 'full') {
      // 12 Monate, paginiert (per_page=200)
      const after = Math.floor(Date.now() / 1000) - (365 * 24 * 60 * 60);
      let page = 1;

      while (true) {
        const res = await fetch(
          `https://www.strava.com/api/v3/athlete/activities?per_page=200&page=${page}&after=${after}`,
          { headers: { Authorization: `Bearer ${access_token}` } }
        );

        if (!res.ok) {
          console.error('Strava API error page', page, ':', res.status);
          break;
        }

        const batch = await res.json();
        if (!batch || batch.length === 0) break;

        allActivities.push(...batch);
        console.log(`Full sync page ${page}: ${batch.length} activities`);

        if (batch.length < 200) break;
        page++;
      }
    } else {
      // Recent: letzte 7 Tage
      const after = Math.floor(Date.now() / 1000) - (7 * 24 * 60 * 60);
      const res = await fetch(
        `https://www.strava.com/api/v3/athlete/activities?per_page=30&after=${after}`,
        { headers: { Authorization: `Bearer ${access_token}` } }
      );

      if (!res.ok) {
        const errText = await res.text();
        console.error('Strava API error:', errText);
        return new Response(JSON.stringify({ error: 'Strava API Fehler', details: errText }), {
          status: 502, headers,
        });
      }

      allActivities = await res.json();
    }

    // Bei Recent: Detail-Call für Kalorien (nur für wenige Aktivitäten)
    // Bei Full: Kein Detail-Call (zu viele), summary_polyline kommt aus List-Endpoint
    if (mode === 'recent') {
      const detailedActivities = await Promise.all(
        allActivities.map(async (act) => {
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
      allActivities = detailedActivities;
    }

    // Aktivitäten in Supabase speichern (upsert)
    const rows = allActivities.map(act => ({
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
      // Neue Felder für Routen-Analyse
      average_watts: act.average_watts || null,
      start_latlng: act.start_latlng || null,
      end_latlng: act.end_latlng || null,
      summary_polyline: act.map?.summary_polyline || null,
      updated_at: new Date().toISOString(),
    }));

    if (rows.length > 0) {
      // In Batches von 200 upserten (Supabase Limit)
      for (let i = 0; i < rows.length; i += 200) {
        const batch = rows.slice(i, i + 200);
        const { error: upsertError } = await supabase
          .from('strava_activities')
          .upsert(batch, { onConflict: 'strava_id' });

        if (upsertError) {
          console.error('Supabase upsert error:', upsertError);
          return new Response(JSON.stringify({ error: 'DB Fehler', details: upsertError.message }), {
            status: 500, headers,
          });
        }
      }
    }

    // Aktivitäten zurückgeben
    const daysBack = mode === 'full' ? 365 : 7;
    const startDate = new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000).toISOString();
    const { data: savedActivities, error: fetchError } = await supabase
      .from('strava_activities')
      .select('*')
      .eq('user_id', String(athlete_id))
      .gte('start_date', startDate)
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
