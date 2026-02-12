import { createClient } from '@supabase/supabase-js';

export default async (req, context) => {
  try {
    const url = new URL(req.url);
    const code = url.searchParams.get('code');
    const rawState = url.searchParams.get('state'); // format: athleteId_randomPad
    const state = rawState ? rawState.split('_')[0] : null; // extract athlete_id
    const error = url.searchParams.get('error');

    if (error) {
      const siteUrl = typeof Netlify !== 'undefined'
        ? Netlify.env.get('URL') || Netlify.env.get('DEPLOY_URL')
        : process.env.URL || process.env.DEPLOY_URL || 'http://localhost:8888';
      return Response.redirect(`${siteUrl}?whoop_error=${error}`, 302);
    }

    if (!code || !state) {
      return new Response('Missing code or state', { status: 400 });
    }

    const clientId = typeof Netlify !== 'undefined'
      ? Netlify.env.get('WHOOP_CLIENT_ID')
      : process.env.WHOOP_CLIENT_ID;
    const clientSecret = typeof Netlify !== 'undefined'
      ? Netlify.env.get('WHOOP_CLIENT_SECRET')
      : process.env.WHOOP_CLIENT_SECRET;
    const siteUrl = typeof Netlify !== 'undefined'
      ? Netlify.env.get('URL') || Netlify.env.get('DEPLOY_URL')
      : process.env.URL || process.env.DEPLOY_URL || 'http://localhost:8888';
    const supabaseUrl = typeof Netlify !== 'undefined'
      ? Netlify.env.get('SUPABASE_URL')
      : process.env.SUPABASE_URL;
    const supabaseKey = typeof Netlify !== 'undefined'
      ? Netlify.env.get('SUPABASE_SERVICE_ROLE_KEY')
      : process.env.SUPABASE_SERVICE_ROLE_KEY;

    const redirectUri = `${siteUrl}/.netlify/functions/whoop-callback`;

    // Token tauschen
    const tokenResponse = await fetch('https://api.prod.whoop.com/oauth/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
      }),
    });

    if (!tokenResponse.ok) {
      const errData = await tokenResponse.text();
      console.error('Whoop token error:', errData);
      return Response.redirect(`${siteUrl}?whoop_error=token_exchange_failed`, 302);
    }

    const tokenData = await tokenResponse.json();
    console.log('Whoop token received, saving for athlete:', state);

    // Token in Supabase speichern
    if (supabaseUrl && supabaseKey) {
      const supabase = createClient(supabaseUrl, supabaseKey);
      const expiresAt = new Date(Date.now() + tokenData.expires_in * 1000).toISOString();

      // user_profiles.id kann text oder bigint sein - versuche beide Wege
      const { error: updateError, count } = await supabase
        .from('user_profiles')
        .update({
          whoop_access_token: tokenData.access_token,
          whoop_refresh_token: tokenData.refresh_token,
          whoop_token_expires: expiresAt,
          updated_at: new Date().toISOString(),
        })
        .eq('id', state);

      if (updateError) {
        console.error('Whoop token save error:', updateError);
        return Response.redirect(`${siteUrl}?whoop_error=token_save_failed`, 302);
      }
      console.log('Whoop token saved successfully for athlete:', state);
    }

    return Response.redirect(`${siteUrl}?whoop_connected=true`, 302);

  } catch (error) {
    console.error('Whoop callback error:', error);
    const siteUrl = typeof Netlify !== 'undefined'
      ? Netlify.env.get('URL') || Netlify.env.get('DEPLOY_URL')
      : process.env.URL || process.env.DEPLOY_URL || 'http://localhost:8888';
    return Response.redirect(`${siteUrl}?whoop_error=callback_failed`, 302);
  }
};
