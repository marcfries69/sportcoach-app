// Platzhalter - KI-Ernährungscoach (kommt in Schritt 6)
export default async (req, context) => {
  return new Response(
    JSON.stringify({ message: 'Nutrition Coach - kommt in Schritt 6' }),
    { status: 501, headers: { 'Content-Type': 'application/json' } }
  );
};
