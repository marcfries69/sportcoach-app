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
        JSON.stringify({ error: 'API Key nicht konfiguriert' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const { activities5d, activities30d, meals5d, meals30d, supplements5d, supplements30d, bodyData } = await req.json();

    // Trainings-Zusammenfassung erstellen
    const summarizeActivities = (acts) => {
      if (!acts || acts.length === 0) return 'Keine Aktivitäten';
      const byType = {};
      acts.forEach(a => {
        const type = a.type || 'Sonstige';
        if (!byType[type]) byType[type] = { count: 0, duration: 0, calories: 0 };
        byType[type].count++;
        byType[type].duration += (a.moving_time || 0) / 60;
        byType[type].calories += (a.calories || 0);
      });
      return Object.entries(byType)
        .map(([type, d]) => `${type}: ${d.count}x, ${Math.round(d.duration)}min, ${Math.round(d.calories)}kcal`)
        .join('; ');
    };

    // Ernährungs-Zusammenfassung
    const summarizeMeals = (mealList) => {
      if (!mealList || mealList.length === 0) return 'Keine Mahlzeiten erfasst';
      const totals = mealList.reduce((acc, m) => ({
        kcal: acc.kcal + (m.kcal || 0),
        protein: acc.protein + (m.protein || 0),
        carbs: acc.carbs + (m.carbs || 0),
        fat: acc.fat + (m.fat || 0),
        fiber: acc.fiber + (m.fiber || 0),
        count: acc.count + 1
      }), { kcal: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, count: 0 });
      return `${totals.count} Mahlzeiten, ${Math.round(totals.kcal)}kcal, P:${Math.round(totals.protein)}g, K:${Math.round(totals.carbs)}g, F:${Math.round(totals.fat)}g, Bal:${Math.round(totals.fiber)}g`;
    };

    // Supplement-Zusammenfassung
    const summarizeSupplements = (sups) => {
      if (!sups || sups.length === 0) return 'Keine Supplements eingenommen';
      return sups.map(s => s.name).join(', ');
    };

    const prompt = `Du bist ein erfahrener Sport-Ernährungsberater. Analysiere die folgenden Trainings- und Ernährungsdaten und erstelle kompakte, actionable Empfehlungen.

KÖRPERDATEN:
${bodyData ? `Gewicht: ${bodyData.weight}kg, Größe: ${bodyData.height}cm, Alter: ${bodyData.age}, Geschlecht: ${bodyData.gender}, Grundumsatz: ${bodyData.bmr}kcal, Tagesbedarf: ${bodyData.dailyBase}kcal, Ziel: ${bodyData.goal || 'nicht angegeben'}` : 'Keine Körperdaten vorhanden'}

LETZTE 5 TAGE:
Training: ${summarizeActivities(activities5d)}
Ernährung: ${summarizeMeals(meals5d)}
Supplements: ${summarizeSupplements(supplements5d)}

LETZTE 30 TAGE:
Training: ${summarizeActivities(activities30d)}
Ernährung: ${summarizeMeals(meals30d)}
Supplements: ${summarizeSupplements(supplements30d)}

AUFGABE:
1. Analysiere das Verhältnis von Kraft- zu Ausdauertraining (kurzfristig 5d + mittelfristig 30d)
2. Vergleiche die aktuelle Makronährstoff-Aufnahme mit dem Aktivitätsprofil
3. Gib konkrete Ernährungsempfehlungen (z.B. Protein erhöhen bei vielen Krafteinheiten, Carbs bei Ausdauer)
4. Empfehle sinnvolle Nahrungsergänzungsmittel basierend auf dem Aktivitätsprofil - berücksichtige bereits eingenommene Supplements (keine Doppelempfehlung!)
5. Erkenne kurz- und mittelfristige Trends

Antworte NUR mit einem JSON-Objekt, ohne Markdown oder Erklärungen:
{
  "trainingSummary": {
    "short": "Kurze Zusammenfassung der letzten 5 Tage (1-2 Sätze)",
    "long": "Zusammenfassung der letzten 30 Tage (1-2 Sätze)",
    "trend": "Trend-Beschreibung (steigend/fallend/stabil, 1 Satz)"
  },
  "nutritionAdvice": [
    {
      "title": "Kurzer Titel",
      "advice": "Konkrete Empfehlung (1-2 Sätze)",
      "priority": "high|medium|low"
    }
  ],
  "macroRecommendations": {
    "protein": { "current": "aktueller Durchschnitt/Tag in g", "recommended": "empfohlener Wert in g", "advice": "kurze Begründung" },
    "carbs": { "current": "aktueller Durchschnitt/Tag in g", "recommended": "empfohlener Wert in g", "advice": "kurze Begründung" },
    "fat": { "current": "aktueller Durchschnitt/Tag in g", "recommended": "empfohlener Wert in g", "advice": "kurze Begründung" }
  },
  "supplementAdvice": [
    {
      "name": "Name des Supplements",
      "reason": "Warum empfohlen (1 Satz)",
      "alreadyTaking": false
    }
  ]
}`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }]
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

    return new Response(
      JSON.stringify(parsed),
      { status: 200, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
    );

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message || 'Unbekannter Fehler' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
