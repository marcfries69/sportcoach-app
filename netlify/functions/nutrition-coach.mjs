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

    const {
      activities5d, activities30d, activities90d,
      meals5d, meals30d,
      supplements5d, supplements30d,
      bodyData, whoopData
    } = await req.json();

    // Trainings-Zusammenfassung
    const summarizeActivities = (acts) => {
      if (!acts || acts.length === 0) return 'Keine Aktivitäten';
      const byType = {};
      acts.forEach(a => {
        const type = a.type || 'Sonstige';
        if (!byType[type]) byType[type] = { count: 0, duration: 0, calories: 0, avgHr: [], watts: [] };
        byType[type].count++;
        byType[type].duration += (a.moving_time || 0) / 60;
        byType[type].calories += (a.calories || 0);
        if (a.average_heartrate) byType[type].avgHr.push(a.average_heartrate);
        if (a.average_watts) byType[type].watts.push(a.average_watts);
      });
      return Object.entries(byType)
        .map(([type, d]) => {
          let str = `${type}: ${d.count}x, ${Math.round(d.duration)}min, ${Math.round(d.calories)}kcal`;
          if (d.avgHr.length > 0) str += `, ØHF ${Math.round(d.avgHr.reduce((a,b)=>a+b,0)/d.avgHr.length)}bpm`;
          if (d.watts.length > 0) str += `, ØWatt ${Math.round(d.watts.reduce((a,b)=>a+b,0)/d.watts.length)}W`;
          return str;
        })
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
      const days = new Set(mealList.map(m => m.date)).size || 1;
      return `${totals.count} Mahlzeiten in ${days} Tagen, Ø/Tag: ${Math.round(totals.kcal/days)}kcal, P:${Math.round(totals.protein/days)}g, K:${Math.round(totals.carbs/days)}g, F:${Math.round(totals.fat/days)}g, Bal:${Math.round(totals.fiber/days)}g`;
    };

    // Supplement-Zusammenfassung mit Häufigkeit
    const summarizeSupplements = (sups) => {
      if (!sups || sups.length === 0) return 'Keine Supplements eingenommen';
      const grouped = {};
      sups.forEach(s => {
        const key = s.name.toLowerCase().trim();
        if (!grouped[key]) grouped[key] = { name: s.name, count: 0, dates: new Set() };
        grouped[key].count++;
        if (s.date) grouped[key].dates.add(s.date);
      });
      return Object.values(grouped)
        .map(g => `${g.name} (${g.count}x in ${g.dates.size || '?'} Tagen)`)
        .join(', ');
    };

    // Whoop-Zusammenfassung
    const summarizeWhoop = (wd) => {
      if (!wd || !wd.recoveries || wd.recoveries.length === 0) return null;
      const latest = wd.recoveries[0];
      const avgRecovery = wd.recoveries
        .filter(r => r.recoveryScore != null)
        .reduce((sum, r, _, arr) => sum + r.recoveryScore / arr.length, 0);
      let summary = `Recovery heute: ${latest.recoveryScore || '?'}%, Ø7d: ${Math.round(avgRecovery)}%`;
      if (latest.hrv) summary += `, HRV: ${Math.round(latest.hrv)}ms`;
      if (latest.restingHr) summary += `, Ruhepuls: ${Math.round(latest.restingHr)}bpm`;
      if (wd.sleeps?.[0]?.sleepScore) summary += `, Schlaf-Score: ${wd.sleeps[0].sleepScore}%`;
      return summary;
    };

    const whoopSummary = summarizeWhoop(whoopData);

    const prompt = `Du bist ein erfahrener Sport-Ernährungs- und Trainingsberater. Analysiere die folgenden Daten und erstelle kompakte, actionable Empfehlungen.

KÖRPERDATEN:
${bodyData ? `Gewicht: ${bodyData.weight}kg, Größe: ${bodyData.height}cm, Alter: ${bodyData.age}, Geschlecht: ${bodyData.gender}, Grundumsatz: ${bodyData.bmr}kcal, Tagesbedarf: ${bodyData.dailyBase}kcal, Ziel: ${bodyData.goal || 'nicht angegeben'}` : 'Keine Körperdaten vorhanden'}

${whoopSummary ? `WHOOP-DATEN:\n${whoopSummary}` : ''}

LETZTE 5 TAGE:
Training: ${summarizeActivities(activities5d)}
Ernährung: ${summarizeMeals(meals5d)}
Supplements: ${summarizeSupplements(supplements5d)}

LETZTE 30 TAGE:
Training: ${summarizeActivities(activities30d)}
Ernährung: ${summarizeMeals(meals30d)}
Supplements: ${summarizeSupplements(supplements30d)}

LETZTE 90 TAGE (Training):
${summarizeActivities(activities90d)}

AUFGABE:
1. Analysiere das Verhältnis von Kraft- zu Ausdauertraining (5d/30d/90d)
2. Vergleiche die aktuelle Makronährstoff-Aufnahme mit dem Aktivitätsprofil
3. Gib konkrete Ernährungsempfehlungen (Protein, Carbs je nach Training)
4. SUPPLEMENTS: Bewerte die bereits eingenommenen Supplements (Dosierung ausreichend? Sinnvoll?). Empfehle zusätzliche nur wenn nötig. Gib für JEDES Supplement eine Dosierungsempfehlung als Bandbreite an (z.B. "3-5g/Tag").
5. TRAINING: Empfehle Trainingsfokus basierend auf dem 90-Tage-Profil (z.B. mehr Zone 2, VO2max-Intervalle, Kraft). Berücksichtige Whoop-Recovery wenn verfügbar.
6. MAKROS: Empfehle tägliche Makroziele auf Basis der letzten 3 Monate Training inkl. Ballaststoffe.

Antworte NUR mit einem JSON-Objekt, ohne Markdown oder Erklärungen:
{
  "trainingSummary": {
    "short": "Zusammenfassung der letzten 5 Tage (1-2 Sätze)",
    "long": "Zusammenfassung der letzten 30 Tage (1-2 Sätze)",
    "trend": "Trend-Beschreibung (1 Satz)"
  },
  "nutritionAdvice": [
    { "title": "Kurzer Titel", "advice": "Konkrete Empfehlung (1-2 Sätze)", "priority": "high|medium|low" }
  ],
  "macroRecommendations": {
    "protein": { "current": Zahl, "recommended": Zahl, "advice": "kurze Begründung" },
    "carbs": { "current": Zahl, "recommended": Zahl, "advice": "kurze Begründung" },
    "fat": { "current": Zahl, "recommended": Zahl, "advice": "kurze Begründung" },
    "fiber": { "current": Zahl, "recommended": Zahl, "advice": "kurze Begründung" }
  },
  "supplementAdvice": [
    {
      "name": "Name",
      "dosage": "Dosierungsbereich z.B. 3-5g/Tag",
      "reason": "Warum empfohlen/bewertet (1 Satz)",
      "alreadyTaking": true/false,
      "currentDosageOk": true/false,
      "adjustmentNeeded": "nur wenn Anpassung nötig, sonst null"
    }
  ],
  "trainingFocus": [
    {
      "type": "z.B. Zone 2 Ausdauer, VO2max Intervalle, Kraft",
      "priority": "high|medium|low",
      "reason": "Warum dieser Fokus (1 Satz)",
      "frequency": "z.B. 2-3x/Woche"
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
