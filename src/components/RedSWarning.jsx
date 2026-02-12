import React from 'react';
import { AlertTriangle, ShieldAlert } from 'lucide-react';

const RedSWarning = ({ totals, bodyData, todayActivityKcal }) => {
  // Keine Daten vorhanden - nichts anzeigen
  if (!bodyData || !bodyData.dailyBase || !totals) return null;

  const dailyBase = bodyData.dailyBase;
  const totalBurn = dailyBase + (todayActivityKcal || 0);
  const balance = (totals.kcal || 0) - totalBurn;

  // RED-S Indikationen prüfen
  const warnings = [];

  // 1. Starkes Kaloriendefizit (> 500 kcal unter Gesamtverbrauch)
  if (balance < -500 && totals.kcal > 0) {
    warnings.push({
      title: 'Hohes Energiedefizit',
      text: `Deine Kalorienzufuhr liegt ${Math.abs(Math.round(balance))} kcal unter deinem Gesamtverbrauch. Ein Defizit über 500 kcal kann langfristig zu Leistungseinbußen und gesundheitlichen Problemen führen.`,
    });
  }

  // 2. Kalorienzufuhr deutlich unter Grundumsatz
  if (totals.kcal > 0 && totals.kcal < bodyData.bmr * 0.75) {
    warnings.push({
      title: 'Zufuhr unter Grundumsatz',
      text: `Deine Kalorienzufuhr (${Math.round(totals.kcal)} kcal) liegt deutlich unter deinem Grundumsatz (${bodyData.bmr} kcal). Dein Körper braucht mindestens den Grundumsatz, um lebenswichtige Funktionen aufrechtzuerhalten.`,
    });
  }

  // 3. Hohes Training bei sehr niedriger Zufuhr
  if (todayActivityKcal > 300 && totals.kcal > 0 && totals.kcal < dailyBase * 0.6) {
    warnings.push({
      title: 'Hohe Belastung bei niedriger Zufuhr',
      text: `Du hast heute ${Math.round(todayActivityKcal)} kcal durch Training verbraucht, aber nur ${Math.round(totals.kcal)} kcal zugeführt. Diese Kombination kann zu Übertraining und Verletzungen führen.`,
    });
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
        Diese Warnung basiert auf den heutigen Daten. Konsultiere einen Arzt bei anhaltenden Symptomen.
      </p>
    </div>
  );
};

export default RedSWarning;
