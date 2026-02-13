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

    // Whoop-Zusammenfassung – detailliert für KI-Ernährungs- und Regenerationsempfehlungen
    const summarizeWhoop = (wd) => {
      if (!wd || !wd.recoveries || wd.recoveries.length === 0) return null;
      const recoveries = wd.recoveries.filter(r => r.recoveryScore != null);
      const latest = recoveries[0];
      const avgRecovery = recoveries.reduce((sum, r) => sum + r.recoveryScore, 0) / recoveries.length;

      // Niedrige Recovery-Tage zählen (unter 34% = rot bei Whoop)
      const lowRecoveryCount = recoveries.filter(r => r.recoveryScore < 34).length;
      const medRecoveryCount = recoveries.filter(r => r.recoveryScore >= 34 && r.recoveryScore < 67).length;
      const highRecoveryCount = recoveries.filter(r => r.recoveryScore >= 67).length;

      // HRV-Trend
      const hrvValues = recoveries.map(r => r.hrv).filter(v => v != null);
      let hrvTrend = 'stabil';
      if (hrvValues.length >= 4) {
        const recent = hrvValues.slice(0, 3).reduce((a, b) => a + b, 0) / 3;
        const older = hrvValues.slice(3, 7);
        if (older.length > 0) {
          const olderAvg = older.reduce((a, b) => a + b, 0) / older.length;
          if (recent > olderAvg * 1.05) hrvTrend = 'steigend';
          else if (recent < olderAvg * 0.95) hrvTrend = 'fallend';
        }
      }

      // Strain-Daten
      const cycles = wd.cycles || [];
      const strainValues = cycles.map(c => c.strain).filter(v => v != null);
      const avgStrain = strainValues.length > 0
        ? strainValues.reduce((a, b) => a + b, 0) / strainValues.length
        : null;
      const highStrainDays = strainValues.filter(s => s >= 14).length;

      // Schlaf
      const sleeps = wd.sleeps || [];
      const sleepScores = sleeps.map(s => s.sleepScore).filter(v => v != null);
      const avgSleepScore = sleepScores.length > 0
        ? Math.round(sleepScores.reduce((a, b) => a + b, 0) / sleepScores.length)
        : null;
      const sleepDurations = sleeps.map(s => s.totalSleepMs).filter(v => v != null);
      const avgSleepHours = sleepDurations.length > 0
        ? Math.round(sleepDurations.reduce((a, b) => a + b, 0) / sleepDurations.length / 3600000 * 10) / 10
        : null;

      let summary = `Recovery heute: ${latest.recoveryScore || '?'}%, Ø7d: ${Math.round(avgRecovery)}%`;
      summary += ` (${highRecoveryCount}x grün, ${medRecoveryCount}x gelb, ${lowRecoveryCount}x rot in 7d)`;
      if (latest.hrv) summary += `\nHRV heute: ${Math.round(latest.hrv)}ms, Trend: ${hrvTrend}`;
      if (latest.restingHr) summary += `, Ruhepuls: ${Math.round(latest.restingHr)}bpm`;
      if (avgStrain != null) summary += `\nØ Strain: ${avgStrain.toFixed(1)}/21, ${highStrainDays} harte Tage (Strain ≥14) in 7d`;
      if (avgSleepScore != null) summary += `\nSchlaf: Ø Score ${avgSleepScore}%, Ø Dauer ${avgSleepHours}h`;
      if (sleeps[0]?.respiratoryRate) summary += `, Atemfrequenz: ${sleeps[0].respiratoryRate.toFixed(1)} rpm`;

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
7. WHOOP-BASIERTE EMPFEHLUNGEN (wenn Whoop-Daten vorhanden):
   - Bei NIEDRIGER RECOVERY (<34% oder rote Tage): Empfehle regenerationsfördernde Ernährung (mehr Kohlenhydrate, entzündungshemmende Lebensmittel wie Beeren, Kurkuma, Omega-3, Tart Cherry Juice). Empfehle Magnesium, Zink, Ashwagandha oder L-Theanin bei chronisch schlechter Recovery.
   - Bei SCHLECHTEM SCHLAF (<70% Schlaf-Score oder <7h): Empfehle schlaffördernde Ernährung (kein Koffein nach 14 Uhr, Magnesium abends, Tryptophan-reiche Lebensmittel). Empfehle Magnesium-Glycinat, Melatonin-Mikrodosierung.
   - Bei VIELEN HARTEN EINHEITEN (Strain ≥14 an mehreren Tagen): Empfehle erhöhte Kohlenhydratzufuhr (8-10g/kg für intensive Phasen), zusätzliches Protein innerhalb 30min nach Training, Glutamin, BCAA, Kreatin für Muskelregeneration.
   - Bei FALLENDEM HRV-TREND: Warnung vor Übertraining, empfehle Deload-Phase, adaptogene Supplements (Rhodiola, Ashwagandha).
   - Bei STEIGENDEM HRV-TREND + hoher Recovery: Bestätige guten Zustand, empfehle leistungssteigernde Ernährung (Beta-Alanin, Rote-Bete-Saft vor Einheiten, Koffein-Timing).
   Integriere diese Empfehlungen in nutritionAdvice und supplementAdvice – nicht als separate Kategorie.

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
