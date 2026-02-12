import React from 'react';
import { AlertTriangle, ShieldAlert } from 'lucide-react';

const RedSWarning = ({ totals, bodyData, todayActivityKcal, fiveDayMealKcal, fiveDayBurn }) => {
  // Keine Daten vorhanden - nichts anzeigen
  if (!bodyData || !bodyData.dailyBase || !totals) return null;

  // Nur ab 17:00 Uhr anzeigen - vorher ist der Tag noch nicht weit genug
  const currentHour = new Date().getHours();
  if (currentHour < 17) return null;

  const dailyBase = bodyData.dailyBase;
  const totalBurn = dailyBase + (todayActivityKcal || 0);
  const todayIntake = totals.kcal || 0;

  // Mindestens etwas gegessen haben (sonst hat User einfach noch nichts eingetragen)
  if (todayIntake === 0) return null;

  // RED-S Indikationen prüfen
  const warnings = [];

  // 1. Einzeltag: Kalorienintake >10% zu gering gegenüber Gesamtverbrauch
  const todayDeficitPercent = totalBurn > 0 ? ((totalBurn - todayIntake) / totalBurn) * 100 : 0;
  if (todayDeficitPercent > 10) {
    warnings.push({
      title: 'Energiedefizit heute',
      text: `Deine Kalorienzufuhr (${Math.round(todayIntake)} kcal) liegt ${Math.round(todayDeficitPercent)}% unter deinem Gesamtverbrauch (${Math.round(totalBurn)} kcal). Ein Defizit über 10% kann langfristig zu Leistungseinbußen führen.`,
    });
  }

  // 2. 5-Tage-Durchschnitt: Kalorienintake >10% zu gering
  if (fiveDayMealKcal != null && fiveDayBurn != null && fiveDayBurn > 0 && fiveDayMealKcal > 0) {
    const fiveDayDeficitPercent = ((fiveDayBurn - fiveDayMealKcal) / fiveDayBurn) * 100;
    if (fiveDayDeficitPercent > 10) {
      warnings.push({
        title: 'Anhaltendes Energiedefizit (5 Tage)',
        text: `Dein durchschnittlicher Kalorienintake der letzten 5 Tage liegt ${Math.round(fiveDayDeficitPercent)}% unter deinem Verbrauch. Anhaltendes Defizit erhöht das Risiko für Übertraining, Verletzungen und hormonelle Störungen.`,
      });
    }
  }

  // Keine Warnungen - nicht anzeigen
  if (warnings.length === 0) return null;

  return (
    <div className="bg-gradient-to-br from-red-50 to-rose-50 border-2 border-red-300 rounded-3xl p-6 mb-6 shadow-xl">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-500 to-rose-600 flex items-center justify-center">
          <ShieldAlert className="w-5 h-5 text-white" />
        </div>
        <div>
          <h3 className="text-xl font-bold text-red-800">RED-S Warnung</h3>
          <p className="text-xs text-red-500">Relative Energy Deficiency in Sport</p>
        </div>
      </div>

      <div className="space-y-3">
        {warnings.map((w, i) => (
          <div key={i} className="bg-white/70 rounded-xl p-4 border border-red-200">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="font-bold text-sm text-red-800 mb-1">{w.title}</h4>
                <p className="text-sm text-red-700">{w.text}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <p className="text-xs text-red-400 mt-4 text-center">
        Diese Warnung erscheint ab 17 Uhr bei einem Energiedefizit über 10%. Konsultiere einen Arzt bei anhaltenden Symptomen.
      </p>
    </div>
  );
};

export default RedSWarning;
