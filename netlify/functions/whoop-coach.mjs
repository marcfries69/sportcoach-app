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

    const { recoveries, sleeps, cycles } = await req.json();

    const formatRecoveries = (recs) => {
      if (!recs || recs.length === 0) return 'Keine Recovery-Daten';
      return recs.slice(0, 7).map((r, i) => {
        const day = i === 0 ? 'Heute' : i === 1 ? 'Gestern' : `Vor ${i} Tagen`;
        return `${day}: Recovery ${r.recoveryScore || '?'}%, HRV ${r.hrv ? Math.round(r.hrv) : '?'}ms, Ruhepuls ${r.restingHr || '?'}bpm, Atemfrequenz ${r.respiratoryRate ? r.respiratoryRate.toFixed(1) : '?'}rpm`;
      }).join('\n');
    };

    const formatSleeps = (slps) => {
      if (!slps || slps.length === 0) return 'Keine Schlaf-Daten';
      return slps.slice(0, 7).map((s, i) => {
        const day = i === 0 ? 'Heute' : i === 1 ? 'Gestern' : `Vor ${i} Tagen`;
        const totalH = s.totalSleepMs ? (s.totalSleepMs / 3600000).toFixed(1) : '?';
        return `${day}: ${totalH}h Schlaf, Score ${s.sleepScore || '?'}%`;
      }).join('\n');
    };

    const formatCycles = (cycs) => {
      if (!cycs || cycs.length === 0) return 'Keine Strain-Daten';
      return cycs.slice(0, 7).map((c, i) => {
        const day = i === 0 ? 'Heute' : i === 1 ? 'Gestern' : `Vor ${i} Tagen`;
        return `${day}: Strain ${c.strain ? c.strain.toFixed(1) : '?'}/21, ${c.kilojoule ? Math.round(c.kilojoule / 4.184) : '?'}kcal`;
      }).join('\n');
    };

    const prompt = `Du bist ein erfahrener Trainingscoach mit Zugang zu Whoop-Daten. Analysiere die folgenden Gesundheits- und Leistungsdaten und erstelle kompakte Trainingsempfehlungen.

RECOVERY (letzte 7 Tage):
${formatRecoveries(recoveries)}

SCHLAF (letzte 7 Tage):
${formatSleeps(sleeps)}

STRAIN/BELASTUNG (letzte 7 Tage):
${formatCycles(cycles)}

AUFGABE:
1. Bewerte den aktuellen Erholungszustand basierend auf Recovery, HRV und Schlaftrends
2. Erkenne Trends (z.B. fallende HRV = Übertraining-Risiko, steigende Recovery = gute Anpassung)
3. Leite daraus 2-3 kompakte Handlungsempfehlungen für die nächsten Trainingstage ab
4. Berücksichtige die Strain der letzten Tage im Verhältnis zur Recovery

Antworte NUR mit einem JSON-Objekt, ohne Markdown:
{
  "overallStatus": "green|yellow|red",
  "statusText": "Kurze Bewertung des Gesamtzustands (1 Satz)",
  "recommendations": [
    {
      "title": "Kurzer Titel",
      "advice": "Konkrete Empfehlung (1-2 Sätze)",
      "icon": "rest|moderate|intense|sleep"
    }
  ],
  "trends": {
    "hrv": "steigend|stabil|fallend",
    "recovery": "steigend|stabil|fallend",
    "sleep": "gut|okay|schlecht",
    "strain": "hoch|moderat|niedrig"
  }
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
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
