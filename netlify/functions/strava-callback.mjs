// Strava OAuth Callback – Token-Austausch + User in Supabase speichern
import { createClient } from '@supabase/supabase-js';

export default async (req, context) => {
  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const error = url.searchParams.get('error');

  const appUrl = Netlify.env.get('APP_URL') || process.env.APP_URL || 'https://sportcoach-app.netlify.app';

  // User hat abgelehnt oder Fehler
  if (error || !code) {
    return new Response(null, {
      status: 302,
      headers: { Location: `${appUrl}?auth_error=denied` },
    });
  }

  try {
    // 1. Code gegen Tokens tauschen
    const clientId = Netlify.env.get('STRAVA_CLIENT_ID') || process.env.STRAVA_CLIENT_ID;
    const clientSecret = Netlify.env.get('STRAVA_CLIENT_SECRET') || process.env.STRAVA_CLIENT_SECRET;

    const tokenResponse = await fetch('https://www.strava.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code: code,
        grant_type: 'authorization_code',
      }),
    });

    if (!tokenResponse.ok) {
      const errBody = await tokenResponse.text();
      console.error('Strava token exchange failed:', errBody);
      return new Response(null, {
        status: 302,
        headers: { Location: `${appUrl}?auth_error=token_exchange` },
      });
    }

    const tokenData = await tokenResponse.json();
    const athlete = tokenData.athlete;
    const athleteId = String(athlete.id);

    // 2. User in Supabase speichern (mit Service Key – bypassed RLS)
    const supabaseUrl = Netlify.env.get('VITE_SUPABASE_URL') || process.env.VITE_SUPABASE_URL;
    const supabaseServiceKey = Netlify.env.get('SUPABASE_SERVICE_KEY') || process.env.SUPABASE_SERVICE_KEY;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { error: upsertError } = await supabase
      .from('user_profiles')
      .upsert({
        id: athleteId,
        display_name: `${athlete.firstname} ${athlete.lastname}`.trim(),
        avatar_url: athlete.profile || null,
        strava_athlete_id: athlete.id,
        strava_access_token: tokenData.access_token,
        strava_refresh_token: tokenData.refresh_token,
        strava_token_expires_at: new Date(tokenData.expires_at * 1000).toISOString(),
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'id',
      });

    if (upsertError) {
      console.error('Supabase upsert error:', upsertError);
      return new Response(null, {
        status: 302,
        headers: { Location: `${appUrl}?auth_error=db_error` },
      });
    }

    // 3. Redirect zurück zur App (ohne Tokens – nur öffentliche Infos)
    const redirectParams = new URLSearchParams({
      athlete_id: athleteId,
      athlete_name: `${athlete.firstname} ${athlete.lastname}`.trim(),
      athlete_avatar: athlete.profile || '',
    });

    return new Response(null, {
      status: 302,
      headers: { Location: `${appUrl}?${redirectParams.toString()}` },
    });

  } catch (err) {
    console.error('strava-callback error:', err);
    return new Response(null, {
      status: 302,
      headers: { Location: `${appUrl}?auth_error=server_error` },
    });
  }
};
