export default async (req, context) => {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    const clientId = typeof Netlify !== 'undefined'
      ? Netlify.env.get('WHOOP_CLIENT_ID')
      : process.env.WHOOP_CLIENT_ID;

    const siteUrl = typeof Netlify !== 'undefined'
      ? Netlify.env.get('URL') || Netlify.env.get('DEPLOY_URL')
      : process.env.URL || process.env.DEPLOY_URL || 'http://localhost:8888';

    if (!clientId) {
      return new Response(
        JSON.stringify({ error: 'WHOOP_CLIENT_ID nicht konfiguriert' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // State-Parameter aus Body (athlete_id des Strava-Users)
    let athleteId = '';
    if (req.method === 'POST') {
      const body = await req.json();
      athleteId = body.athlete_id || '';
    }

    const redirectUri = `${siteUrl}/.netlify/functions/whoop-callback`;
    const scope = 'read:recovery read:sleep read:workout read:cycles read:profile offline';

    // State muss mind. 8 Zeichen haben (Whoop-Anforderung) - athleteId + Random Padding
    const randomPad = Math.random().toString(36).substring(2, 10);
    const state = `${athleteId}_${randomPad}`;

    const authUrl = `https://api.prod.whoop.com/oauth/oauth2/auth?` +
      `client_id=${clientId}` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&response_type=code` +
      `&scope=${encodeURIComponent(scope)}` +
      `&state=${encodeURIComponent(state)}`;

    return new Response(
      JSON.stringify({ authUrl }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
