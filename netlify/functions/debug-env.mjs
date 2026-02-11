export default async (req, context) => {
  const netlifyExists = typeof Netlify !== 'undefined';
  let googleKey = null;

  if (netlifyExists) {
    googleKey = Netlify.env.get('GOOGLE_API_KEY');
  }

  return new Response(
    JSON.stringify({
      netlify_global_exists: netlifyExists,
      google_key_exists: !!googleKey,
      google_key_length: googleKey ? googleKey.length : 0,
      process_env_exists: !!process.env.GOOGLE_API_KEY,
      process_env_length: process.env.GOOGLE_API_KEY ? process.env.GOOGLE_API_KEY.length : 0
    }),
    { status: 200, headers: { 'Content-Type': 'application/json' } }
  );
};
