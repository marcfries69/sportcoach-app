// Platzhalter - Strava Aktivitäten-Sync (kommt in Schritt 4)
export default async (req, context) => {
  return new Response(
    JSON.stringify({ message: 'Strava Sync - kommt in Schritt 4' }),
    { status: 501, headers: { 'Content-Type': 'application/json' } }
  );
};
