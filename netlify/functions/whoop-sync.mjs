import { createClient } from '@supabase/supabase-js';

async function getWhoopToken(athleteId) {
  const supabaseUrl = typeof Netlify !== 'undefined'
    ? Netlify.env.get('SUPABASE_URL')
    : process.env.SUPABASE_URL;
  const supabaseKey = typeof Netlify !== 'undefined'
    ? Netlify.env.get('SUPABASE_SERVICE_ROLE_KEY')
    : process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) return null;

  const supabase = createClient(supabaseUrl, supabaseKey);
  const { data } = await supabase
    .from('user_profiles')
    .select('whoop_access_token, whoop_refresh_token, whoop_token_expires')
    .eq('id', athleteId)
    .single();

  if (!data || !data.whoop_access_token) return null;

  // Token abgelaufen? Refresh
  if (data.whoop_token_expires && new Date(data.whoop_token_expires) < new Date()) {
    const clientId = typeof Netlify !== 'undefined'
      ? Netlify.env.get('WHOOP_CLIENT_ID')
      : process.env.WHOOP_CLIENT_ID;
    const clientSecret = typeof Netlify !== 'undefined'
      ? Netlify.env.get('WHOOP_CLIENT_SECRET')
      : process.env.WHOOP_CLIENT_SECRET;

    const refreshResponse = await fetch('https://api.prod.whoop.com/oauth/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: data.whoop_refresh_token,
        client_id: clientId,
        client_secret: clientSecret,
      }),
    });

    if (refreshResponse.ok) {
      const newTokens = await refreshResponse.json();
      const expiresAt = new Date(Date.now() + newTokens.expires_in * 1000).toISOString();

      await supabase
        .from('user_profiles')
        .update({
          whoop_access_token: newTokens.access_token,
          whoop_refresh_token: newTokens.refresh_token || data.whoop_refresh_token,
          whoop_token_expires: expiresAt,
        })
        .eq('id', athleteId);

      return newTokens.access_token;
    }

    return null;
  }

  return data.whoop_access_token;
}

async function whoopGet(token, path) {
  const res = await fetch(`https://api.prod.whoop.com/developer/v1/${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Whoop API error: ${res.status}`);
  return res.json();
}

export default async (req, context) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    const { athlete_id } = await req.json();
    if (!athlete_id) {
      return new Response(
        JSON.stringify({ error: 'athlete_id fehlt' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const token = await getWhoopToken(athlete_id);
    if (!token) {
      return new Response(
        JSON.stringify({ connected: false, error: 'Nicht mit Whoop verbunden' }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Zeitraum: letzte 7 Tage
    const endDate = new Date().toISOString();
    const startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    // Daten parallel laden
    const [recoveryData, sleepData, cycleData] = await Promise.all([
      whoopGet(token, `recovery?start=${startDate}&end=${endDate}`).catch(() => ({ records: [] })),
      whoopGet(token, `activity/sleep?start=${startDate}&end=${endDate}`).catch(() => ({ records: [] })),
      whoopGet(token, `cycle?start=${startDate}&end=${endDate}`).catch(() => ({ records: [] })),
    ]);

    // Daten aufbereiten
    const recoveries = (recoveryData.records || []).map(r => ({
      date: r.created_at,
      recoveryScore: r.score?.recovery_score,
      hrv: r.score?.hrv_rmssd_milli,
      restingHr: r.score?.resting_heart_rate,
      spo2: r.score?.spo2_percentage,
      skinTemp: r.score?.skin_temp_celsius,
      respiratoryRate: r.score?.respiratory_rate,
    })).sort((a, b) => new Date(b.date) - new Date(a.date));

    const sleeps = (sleepData.records || []).map(s => ({
      date: s.created_at,
      totalSleepMs: s.score?.stage_summary?.total_in_bed_time_milli,
      remMs: s.score?.stage_summary?.total_rem_sleep_time_milli,
      deepMs: s.score?.stage_summary?.total_slow_wave_sleep_time_milli,
      lightMs: s.score?.stage_summary?.total_light_sleep_time_milli,
      sleepScore: s.score?.sleep_performance_percentage,
      respiratoryRate: s.score?.respiratory_rate,
    })).sort((a, b) => new Date(b.date) - new Date(a.date));

    const cycles = (cycleData.records || []).map(c => ({
      date: c.created_at,
      strain: c.score?.strain,
      kilojoule: c.score?.kilojoule,
      avgHr: c.score?.average_heart_rate,
      maxHr: c.score?.max_heart_rate,
    })).sort((a, b) => new Date(b.date) - new Date(a.date));

    return new Response(
      JSON.stringify({
        connected: true,
        recoveries,
        sleeps,
        cycles,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
