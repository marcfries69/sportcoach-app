// Platzhalter - Strava OAuth Start (kommt in Schritt 3)
export default async (req, context) => {
  return new Response(
    JSON.stringify({ message: 'Strava Auth - kommt in Schritt 3' }),
    { status: 501, headers: { 'Content-Type': 'application/json' } }
  );
};
