export default async (req, context) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    // V2 Netlify Functions: Netlify.env.get()
    // Fallback auf process.env falls Netlify global nicht existiert
    const apiKey = typeof Netlify !== 'undefined'
      ? Netlify.env.get('GOOGLE_API_KEY')
      : process.env.GOOGLE_API_KEY;

    if (!apiKey) {
      return new Response(
        JSON.stringify({
          error: 'API Key nicht konfiguriert',
          debug: typeof Netlify !== 'undefined' ? 'Netlify global exists' : 'Netlify global missing'
        }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const { foodText } = await req.json();

    if (!foodText) {
      return new Response(
        JSON.stringify({ error: 'Keine Lebensmittel-Eingabe' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `Analysiere diese Lebensmittelangabe und gib PRÄZISE Nährwerte UND einen Gesundheits-Score zurück.

WICHTIG - Beachte diese typischen Nährwertprofile:
- Nüsse: WENIG Kohlenhydrate (5-15g/100g), VIEL Fett (45-70g/100g), moderate Protein (15-25g/100g)
- Fleisch/Fisch: KEINE Kohlenhydrate, viel Protein
- Gemüse: Wenig Kalorien, hauptsächlich Kohlenhydrate
- Milchprodukte: Ausgewogen mit Laktose (Kohlenhydrate)

Lebensmittel: ${foodText}

GESUNDHEITS-BEWERTUNG (healthScore):
Bewerte die Mahlzeit von 1-6 basierend auf:
- Nährstoffdichte (Vitamine, Mineralien, Ballaststoffe)
- Verarbeitungsgrad (unverarbeitet = besser)
- Zucker- und Salzgehalt
- Gesunde vs. ungesunde Fette
- Gesamtqualität der Zutaten

Skala:
1 = Sehr gesund (z.B. Gemüse, Vollkorn, unverarbeitete Lebensmittel)
2 = Gesund (z.B. mageres Fleisch, Nüsse, Obst)
3 = Okay (z.B. Vollkornprodukte mit etwas Zucker)
4 = Weniger gesund (z.B. Weißmehlprodukte, moderate Verarbeitung)
5 = Ungesund (z.B. Fast Food, frittiert, viel Zucker/Salz)
6 = Sehr ungesund (z.B. Süßigkeiten, stark verarbeitet, Transfette)

GESUNDHEITS-ERKLÄRUNG (healthExplanation):
Erkläre in 2-3 Sätzen WARUM die Mahlzeit so bewertet wurde. Sei spezifisch und erwähne positive/negative Aspekte.

NEM-ERKENNUNG (isSupplement):
Prüfe ob es sich um ein Nahrungsergänzungsmittel (NEM/Supplement) handelt.
NEM sind z.B.: Kreatin, Omega-3, Vitamin D, Magnesium, Zink, Eisen, Protein-Pulver/Whey, BCAA, EAA, Kollagen, Ashwagandha, Kurkuma-Kapseln, Elektrolyte, Multivitamin, Fischöl, Probiotika, L-Glutamin, Beta-Alanin, Koffein-Tabletten, etc.
KEIN NEM: Normale Lebensmittel wie Obst, Gemüse, Fleisch, Milchprodukte, Brot, etc.
Setze "isSupplement" auf true wenn es ein NEM ist, sonst false.

Antworte NUR mit einem JSON-Objekt in diesem exakten Format, ohne weitere Erklärungen oder Markdown:
{
  "name": "Beschreibender Name der Mahlzeit",
  "isSupplement": false,
  "healthScore": 1-6,
  "healthExplanation": "Erklärung warum so bewertet",
  "components": [
    {
      "name": "Einzelbestandteil 1",
      "amount": "Mengenangabe mit Einheit",
      "kcal": Kalorien,
      "protein": Protein in g,
      "carbs": Kohlenhydrate in g,
      "fat": Fett in g,
      "fiber": Ballaststoffe in g
    }
  ]
}`
            }]
          }]
        })
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      return new Response(
        JSON.stringify({ error: errorData.error?.message || 'API-Fehler' }),
        { status: response.status, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    const text = data.candidates[0].content.parts[0].text.trim();
    const jsonText = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const parsed = JSON.parse(jsonText);

    const totals = parsed.components.reduce((acc, comp) => ({
      kcal: acc.kcal + (comp.kcal || 0),
      protein: acc.protein + (comp.protein || 0),
      carbs: acc.carbs + (comp.carbs || 0),
      fat: acc.fat + (comp.fat || 0),
      fiber: acc.fiber + (comp.fiber || 0)
    }), { kcal: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 });

    const result = {
      name: parsed.name,
      ...totals,
      components: parsed.components,
      healthScore: parsed.healthScore || 3,
      healthExplanation: parsed.healthExplanation || 'Keine Bewertung verfügbar',
      isSupplement: parsed.isSupplement || false
    };

    return new Response(
      JSON.stringify(result),
      { status: 200, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
    );

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message || 'Unbekannter Fehler' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
