export default async (req, context) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
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
              text: `Analysiere diese Lebensmittelangabe und gib PRÄZISE Nährwerte zurück.

WICHTIG - TRENN-LOGIK:
1. MEHRERE LEBENSMITTEL (kein NEM dabei) = EINE Mahlzeit mit allen Zutaten als components.
   Beispiel: "Hähnchen, Reis und Brokkoli" → 1 Item mit 3 components, isSupplement: false
2. LEBENSMITTEL + NEM gemischt = Lebensmittel als EINE Mahlzeit + jedes NEM als SEPARATES Item.
   Beispiel: "Proteinshake mit Kreatin" → 2 Items: Proteinshake (false) + Kreatin (true)
   Beispiel: "Haferflocken mit Omega-3 und Vitamin D" → 3 Items: Haferflocken (false, 1 Mahlzeit) + Omega-3 (true) + Vitamin D (true)
3. NUR NEMs = Jedes NEM als SEPARATES Item.
   Beispiel: "Kreatin, Vitamin D, Omega-3" → 3 Items: je ein NEM
   Beispiel: "Magnesium und Zink" → 2 Items: je ein NEM

REGEL: Lebensmittel werden zu EINER Mahlzeit zusammengefasst. NEMs werden IMMER einzeln aufgelistet.

WICHTIG - Beachte diese typischen Nährwertprofile:
- Nüsse: WENIG Kohlenhydrate (5-15g/100g), VIEL Fett (45-70g/100g), moderate Protein (15-25g/100g)
- Fleisch/Fisch: KEINE Kohlenhydrate, viel Protein
- Gemüse: Wenig Kalorien, hauptsächlich Kohlenhydrate
- Milchprodukte: Ausgewogen mit Laktose (Kohlenhydrate)

Lebensmittel: ${foodText}

GESUNDHEITS-BEWERTUNG (healthScore):
Bewerte die Mahlzeit von 1-6 basierend auf:
- Nährstoffdichte, Verarbeitungsgrad, Zucker/Salz, Fettqualität
Skala: 1=Sehr gesund, 2=Gesund, 3=Okay, 4=Weniger gesund, 5=Ungesund, 6=Sehr ungesund

GESUNDHEITS-ERKLÄRUNG (healthExplanation):
Erkläre in 2-3 Sätzen WARUM die Mahlzeit so bewertet wurde.

NEM-ERKENNUNG (isSupplement):
NEM sind: Kreatin, Omega-3, Vitamin D, Magnesium, Zink, Eisen, BCAA, EAA, Kollagen, Ashwagandha, Kurkuma-Kapseln, Elektrolyte, Multivitamin, Fischöl, Probiotika, L-Glutamin, Beta-Alanin, Koffein-Tabletten, etc.
Protein-Shakes/Whey mit mehr als 50 kcal sind KEIN NEM (isSupplement: false) – sie zählen als Mahlzeit.
Reine NEM mit unter 50 kcal (z.B. 5g Kreatin = ~0 kcal): isSupplement: true.

Antworte NUR mit JSON (kein Markdown!).

WENN mindestens ein NEM enthalten ist ODER nur NEMs:
{
  "isMulti": true,
  "items": [
    {
      "name": "Zusammengefasster Name der Mahlzeit (z.B. Hähnchen mit Reis)",
      "isSupplement": false,
      "healthScore": 2,
      "healthExplanation": "Erklärung",
      "components": [
        { "name": "Hähnchenbrust", "amount": "200g", "kcal": 330, "protein": 62, "carbs": 0, "fat": 7, "fiber": 0 },
        { "name": "Reis", "amount": "150g", "kcal": 195, "protein": 4, "carbs": 43, "fat": 0.5, "fiber": 1 }
      ]
    },
    {
      "name": "Kreatin",
      "isSupplement": true,
      "healthScore": 1,
      "healthExplanation": "Supplement",
      "components": [{ "name": "Kreatin Monohydrat", "amount": "5g", "kcal": 0, "protein": 0, "carbs": 0, "fat": 0, "fiber": 0 }]
    }
  ]
}
Hinweis: Wenn NUR NEMs eingegeben werden (kein Essen), enthält items nur NEM-Objekte, kein Mahlzeit-Objekt.

WENN NUR Lebensmittel (KEIN NEM):
{
  "isMulti": false,
  "name": "Zusammengefasster Mahlzeitname",
  "isSupplement": false,
  "healthScore": 2,
  "healthExplanation": "Erklärung",
  "components": [
    { "name": "Zutat 1", "amount": "200g", "kcal": 120, "protein": 25, "carbs": 3, "fat": 1, "fiber": 0 },
    { "name": "Zutat 2", "amount": "100g", "kcal": 80, "protein": 2, "carbs": 15, "fat": 1, "fiber": 3 }
  ]
}

WENN NUR EIN einzelnes Produkt (z.B. "500g Hähnchen" oder "Kreatin"):
{
  "isMulti": false,
  "name": "Name",
  "isSupplement": true/false,
  "healthScore": 2,
  "healthExplanation": "Erklärung",
  "components": [{ "name": "...", "amount": "...", "kcal": 120, "protein": 25, "carbs": 3, "fat": 1, "fiber": 0 }]
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

    // --- Multi-Item (Kombi-Eingabe): Mehrere separate Einträge ---
    if (parsed.isMulti && parsed.items && parsed.items.length > 1) {
      const results = parsed.items.map(item => {
        const totals = (item.components || []).reduce((acc, comp) => ({
          kcal: acc.kcal + (comp.kcal || 0),
          protein: acc.protein + (comp.protein || 0),
          carbs: acc.carbs + (comp.carbs || 0),
          fat: acc.fat + (comp.fat || 0),
          fiber: acc.fiber + (comp.fiber || 0)
        }), { kcal: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 });

        // Menge aus components extrahieren (z.B. "5g", "1000 IU")
        const amount = (item.components || []).map(c => c.amount).filter(Boolean).join(', ') || null;

        return {
          name: item.name,
          amount,
          ...totals,
          components: item.components,
          healthScore: item.healthScore || 3,
          healthExplanation: item.healthExplanation || '',
          isSupplement: item.isSupplement || false,
        };
      });

      return new Response(
        JSON.stringify({ isMulti: true, items: results }),
        { status: 200, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
      );
    }

    // --- Einzelnes Item (wie bisher) ---
    const source = parsed.isMulti && parsed.items ? parsed.items[0] : parsed;

    const totals = (source.components || []).reduce((acc, comp) => ({
      kcal: acc.kcal + (comp.kcal || 0),
      protein: acc.protein + (comp.protein || 0),
      carbs: acc.carbs + (comp.carbs || 0),
      fat: acc.fat + (comp.fat || 0),
      fiber: acc.fiber + (comp.fiber || 0)
    }), { kcal: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 });

    // Menge aus components extrahieren
    const amount = (source.components || []).map(c => c.amount).filter(Boolean).join(', ') || null;

    const result = {
      name: source.name,
      amount,
      ...totals,
      components: source.components,
      healthScore: source.healthScore || 3,
      healthExplanation: source.healthExplanation || 'Keine Bewertung verfügbar',
      isSupplement: source.isSupplement || false
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
