import { createClient } from '@supabase/supabase-js';

function getEnv(name) {
  return typeof Netlify !== 'undefined' ? Netlify.env.get(name) : process.env[name];
}

function getSupabase() {
  const supabaseUrl = getEnv('VITE_SUPABASE_URL') || getEnv('SUPABASE_URL');
  const supabaseKey = getEnv('SUPABASE_SERVICE_KEY') || getEnv('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !supabaseKey) return null;
  return createClient(supabaseUrl, supabaseKey);
}

async function getWhoopToken(athleteId) {
  const supabase = getSupabase();
  if (!supabase) return null;

  const { data, error: lookupError } = await supabase
    .from('user_profiles')
    .select('whoop_access_token, whoop_refresh_token, whoop_token_expires')
    .eq('id', String(athleteId))
    .single();

  if (lookupError) {
    console.error('Whoop token lookup error:', lookupError);
    return null;
  }

  if (!data || !data.whoop_access_token) {
    console.log('No Whoop token found for athlete:', athleteId);
    return null;
  }

  // Token abgelaufen? Refresh
  if (data.whoop_token_expires && new Date(data.whoop_token_expires) < new Date()) {
    console.log('Token expired, refreshing...');
    const clientId = getEnv('WHOOP_CLIENT_ID');
    const clientSecret = getEnv('WHOOP_CLIENT_SECRET');

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
        .eq('id', String(athleteId));

      console.log('Token refreshed successfully');
      return newTokens.access_token;
    }

    console.error('Token refresh failed:', refreshResponse.status);
    return null;
  }

  return data.whoop_access_token;
}

// Whoop API v2 - die funktionierende Version
async function whoopGet(token, path) {
  const res = await fetch(`https://api.prod.whoop.com/developer/v2/${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(`Whoop API v2 error ${res.status}: ${errText.substring(0, 200)}`);
  }
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

    // Zeitraum: letzte 7 Tage - korrektes Format wie in trainer-analytics
    const today = new Date();
    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const endStr = today.toISOString().split('T')[0];
    const startStr = sevenDaysAgo.toISOString().split('T')[0];
    const startDate = `${startStr}T00:00:00.000Z`;
    const endDate = `${endStr}T23:59:59.999Z`;

    console.log('Fetching Whoop data from', startDate, 'to', endDate);

    // Daten parallel laden über v2 API mit limit=20
    const [recoveryData, sleepData, cycleData] = await Promise.all([
      whoopGet(token, `recovery?start=${startDate}&end=${endDate}&limit=20`).catch(e => {
        console.error('Recovery fetch error:', e.message);
        return { records: [] };
      }),
      whoopGet(token, `activity/sleep?start=${startDate}&end=${endDate}&limit=20`).catch(e => {
        console.error('Sleep fetch error:', e.message);
        return { records: [] };
      }),
      whoopGet(token, `cycle?start=${startDate}&end=${endDate}&limit=20`).catch(e => {
        console.error('Cycle fetch error:', e.message);
        return { records: [] };
      }),
    ]);

    console.log('Recovery records:', recoveryData.records?.length || 0);
    console.log('Sleep records:', sleepData.records?.length || 0);
    console.log('Cycle records:', cycleData.records?.length || 0);

    // Recovery aufbereiten - gleiche Felder wie trainer-analytics
    const recoveries = (recoveryData.records || []).map(r => ({
      date: r.created_at,
      recoveryScore: r.score?.recovery_score,
      hrv: r.score?.hrv_rmssd_milli,
      restingHr: r.score?.resting_heart_rate,
      spo2: r.score?.spo2_percentage,
      skinTemp: r.score?.skin_temp_celsius,
    })).sort((a, b) => new Date(b.date) - new Date(a.date));

    // Sleep aufbereiten - respiratory_rate kommt aus Sleep-Score
    const sleeps = (sleepData.records || []).map(s => ({
      date: s.created_at,
      totalSleepMs: s.score?.stage_summary?.total_in_bed_time_milli,
      remMs: s.score?.stage_summary?.total_rem_sleep_time_milli,
      deepMs: s.score?.stage_summary?.total_slow_wave_sleep_time_milli,
      lightMs: s.score?.stage_summary?.total_light_sleep_time_milli,
      sleepScore: s.score?.sleep_performance_percentage,
      respiratoryRate: s.score?.respiratory_rate,
    })).sort((a, b) => new Date(b.date) - new Date(a.date));

    // Cycles/Strain aufbereiten
    const cycles = (cycleData.records || []).map(c => ({
      date: c.created_at,
      strain: c.score?.strain,
      kilojoule: c.score?.kilojoule,
      avgHr: c.score?.average_heart_rate,
      maxHr: c.score?.max_heart_rate,
    })).sort((a, b) => new Date(b.date) - new Date(a.date));

    // Debug: erste gemappte Records loggen
    if (recoveries[0]) console.log('Recovery[0]:', JSON.stringify(recoveries[0]));
    if (sleeps[0]) console.log('Sleep[0]:', JSON.stringify(sleeps[0]));
    if (cycles[0]) console.log('Cycle[0]:', JSON.stringify(cycles[0]));

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
    console.error('Whoop sync error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
