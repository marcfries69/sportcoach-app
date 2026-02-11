const handler = async (event) => {
  const envKeys = Object.keys(process.env).filter(k =>
    k.includes('GOOGLE') || k.includes('SUPABASE') || k.includes('API')
  );

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      found_keys: envKeys,
      google_key_exists: !!process.env.GOOGLE_API_KEY,
      google_key_length: process.env.GOOGLE_API_KEY ? process.env.GOOGLE_API_KEY.length : 0
    })
  };
};

module.exports = { handler };
