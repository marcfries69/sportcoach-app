// Strava Token Refresh – Erneuert abgelaufene Access Tokens
import { createClient } from '@supabase/supabase-js';

function getEnv(key) {
  return (typeof Netlify !== 'undefined' ? Netlify.env.get(key) : null) || process.env[key];
}

function getSupabase() {
  const url = getEnv('VITE_SUPABASE_URL');
  const serviceKey = getEnv('SUPABASE_SERVICE_KEY');
  return createClient(url, serviceKey);
}

/**
 * Refresht den Strava Access Token für einen Athleten.
 * Gibt den gültigen Access Token zurück.
 */
export async function refreshStravaToken(athleteId) {
  const supabase = getSupabase();

  // 1. Aktuellen Refresh Token aus DB laden
  const { data: profile, error: fetchError } = await supabase
    .from('user_profiles')
    .select('strava_access_token, strava_refresh_token, strava_token_expires_at')
    .eq('id', String(athleteId))
    .single();

  if (fetchError || !profile?.strava_refresh_token) {
    throw new Error(`Kein Refresh Token fuer Athlete ${athleteId}`);
  }

  // 2. Prüfen ob Token noch gültig (5 Min Buffer)
  const expiresAt = new Date(profile.strava_token_expires_at);
  const now = new Date();
  const bufferMs = 5 * 60 * 1000;

  if (expiresAt.getTime() - now.getTime() > bufferMs) {
    return { access_token: profile.strava_access_token, refreshed: false };
  }

  // 3. Neuen Token von Strava holen
  const clientId = getEnv('STRAVA_CLIENT_ID');
  const clientSecret = getEnv('STRAVA_CLIENT_SECRET');

  const tokenResponse = await fetch('https://www.strava.com/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'refresh_token',
      refresh_token: profile.strava_refresh_token,
    }),
  });

  if (!tokenResponse.ok) {
    const errText = await tokenResponse.text();
    throw new Error(`Strava Refresh fehlgeschlagen: ${errText}`);
  }

  const newTokens = await tokenResponse.json();

  // 4. Neue Tokens in DB speichern
  const { error: updateError } = await supabase
    .from('user_profiles')
    .update({
      strava_access_token: newTokens.access_token,
      strava_refresh_token: newTokens.refresh_token,
      strava_token_expires_at: new Date(newTokens.expires_at * 1000).toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', String(athleteId));

  if (updateError) {
    throw new Error(`Token-Update fehlgeschlagen: ${updateError.message}`);
  }

  return { access_token: newTokens.access_token, refreshed: true };
}

// HTTP Endpoint (POST mit { athlete_id })
export default async (req, context) => {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const { athlete_id } = await req.json();

    if (!athlete_id) {
      return new Response(JSON.stringify({ error: 'athlete_id required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const result = await refreshStravaToken(athlete_id);

    return new Response(JSON.stringify({
      success: true,
      refreshed: result.refreshed,
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('strava-refresh error:', err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
