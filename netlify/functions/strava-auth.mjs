// Strava OAuth Start – Redirect zu Strava Authorization Page
export default async (req, context) => {
  const clientId = Netlify.env.get('STRAVA_CLIENT_ID') || process.env.STRAVA_CLIENT_ID;
  const redirectUri = Netlify.env.get('STRAVA_REDIRECT_URI') || process.env.STRAVA_REDIRECT_URI;

  if (!clientId || !redirectUri) {
    return new Response('Strava nicht konfiguriert', { status: 500 });
  }

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    approval_prompt: 'auto',
    scope: 'read,activity:read_all',
  });

  const stravaAuthUrl = `https://www.strava.com/oauth/authorize?${params.toString()}`;

  return new Response(null, {
    status: 302,
    headers: { Location: stravaAuthUrl },
  });
};
