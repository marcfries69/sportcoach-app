import React, { useState } from 'react';
import { Calculator, X, Check } from 'lucide-react';

const ACTIVITY_LEVELS = {
  low: { label: 'Wenig', description: 'Überwiegend sitzend, Bürojob', factor: 1.2, emoji: '🪑' },
  moderate: { label: 'Mäßig', description: 'Normaler Alltag, etwas Gehen', factor: 1.4, emoji: '🚶' },
  high: { label: 'Viel', description: 'Aktiver Alltag, viel auf den Beinen', factor: 1.6, emoji: '🏃' },
};

const CalorieCalculator = ({ onClose, onAccept }) => {
  const [calculatorData, setCalculatorData] = useState({
    gender: 'male',
    age: '',
    weight: '',
    height: '',
    activityLevel: 'moderate',
    goal: 'maintain'
  });
  const [result, setResult] = useState(null);

  const calculateCalorieGoal = () => {
    const { gender, age, weight, height, activityLevel, goal } = calculatorData;

    if (!age || !weight || !height) {
      alert('Bitte fülle alle Felder aus!');
      return;
    }

    // Mifflin-St Jeor Formel für Grundumsatz (BMR)
    let bmr;
    if (gender === 'male') {
      bmr = (10 * parseFloat(weight)) + (6.25 * parseFloat(height)) - (5 * parseInt(age)) + 5;
    } else {
      bmr = (10 * parseFloat(weight)) + (6.25 * parseFloat(height)) - (5 * parseInt(age)) - 161;
    }

    // Grundumsatz + Alltagsbewegung (OHNE Sport)
    const activityFactor = ACTIVITY_LEVELS[activityLevel].factor;
    const dailyBase = Math.round(bmr * activityFactor);

    // Kalorienziel je nach Ziel
    let calorieGoal = dailyBase;
    if (goal === 'lose') {
      calorieGoal -= 500;
    } else if (goal === 'gain') {
      calorieGoal += 500;
    }

    setResult({
      bmr: Math.round(bmr),
      dailyBase,
      calorieGoal: Math.round(calorieGoal),
      activityLevel,
    });
  };

  const acceptCalculatedGoal = () => {
    if (result) {
      // Übergebe Kalorienziel UND die BMR-Daten für die Energiebilanz
      onAccept(result.calorieGoal, {
        bmr: result.bmr,
        dailyBase: result.dailyBase,
        activityLevel: result.activityLevel,
        gender: calculatorData.gender,
        age: parseInt(calculatorData.age),
        weight: parseFloat(calculatorData.weight),
        height: parseFloat(calculatorData.height),
        goal: calculatorData.goal,
      });
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-gradient-to-r from-blue-500 to-indigo-500 text-white p-6 rounded-t-3xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Calculator className="w-8 h-8" />
            <h2 className="text-2xl font-bold">Kalorienziel berechnen</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/20 rounded-lg transition"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6">
          {!result ? (
            <div className="space-y-6">
              <p className="text-slate-600">
                Beantworte die folgenden Fragen, um deinen Grundumsatz und dein Kalorienziel zu berechnen.
                Sport-Kalorien werden automatisch aus Strava hinzugerechnet.
              </p>

              {/* Geschlecht */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Geschlecht</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setCalculatorData({...calculatorData, gender: 'male'})}
                    className={`p-4 rounded-xl border-2 font-medium transition ${
                      calculatorData.gender === 'male'
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    Männlich
                  </button>
                  <button
                    onClick={() => setCalculatorData({...calculatorData, gender: 'female'})}
                    className={`p-4 rounded-xl border-2 font-medium transition ${
                      calculatorData.gender === 'female'
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    Weiblich
                  </button>
                </div>
              </div>

              {/* Alter */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Alter (Jahre)</label>
                <input
                  type="number"
                  value={calculatorData.age}
                  onChange={(e) => setCalculatorData({...calculatorData, age: e.target.value})}
                  placeholder="z.B. 30"
                  className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-blue-500 focus:outline-none"
                />
              </div>

              {/* Gewicht */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Gewicht (kg)</label>
                <input
                  type="number"
                  value={calculatorData.weight}
                  onChange={(e) => setCalculatorData({...calculatorData, weight: e.target.value})}
                  placeholder="z.B. 75"
                  className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-blue-500 focus:outline-none"
                />
              </div>

              {/* Größe */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Größe (cm)</label>
                <input
                  type="number"
                  value={calculatorData.height}
                  onChange={(e) => setCalculatorData({...calculatorData, height: e.target.value})}
                  placeholder="z.B. 175"
                  className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-blue-500 focus:outline-none"
                />
              </div>

              {/* Tägliche Bewegung (ohne Sport) */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Tägliche Bewegung (ohne Sport)</label>
                <div className="grid grid-cols-3 gap-3">
                  {Object.entries(ACTIVITY_LEVELS).map(([key, level]) => (
                    <button
                      key={key}
                      onClick={() => setCalculatorData({...calculatorData, activityLevel: key})}
                      className={`p-4 rounded-xl border-2 font-medium transition text-center ${
                        calculatorData.activityLevel === key
                          ? 'border-blue-500 bg-blue-50 text-blue-700'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <span className="text-2xl block mb-1">{level.emoji}</span>
                      <span className="block font-bold">{level.label}</span>
                      <span className="block text-xs text-slate-500 mt-1">{level.description}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Ziel */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Dein Ziel</label>
                <div className="grid grid-cols-3 gap-3">
                  <button
                    onClick={() => setCalculatorData({...calculatorData, goal: 'lose'})}
                    className={`p-4 rounded-xl border-2 font-medium transition ${
                      calculatorData.goal === 'lose'
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    Abnehmen
                  </button>
                  <button
                    onClick={() => setCalculatorData({...calculatorData, goal: 'maintain'})}
                    className={`p-4 rounded-xl border-2 font-medium transition ${
                      calculatorData.goal === 'maintain'
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    Halten
                  </button>
                  <button
                    onClick={() => setCalculatorData({...calculatorData, goal: 'gain'})}
                    className={`p-4 rounded-xl border-2 font-medium transition ${
                      calculatorData.goal === 'gain'
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    Zunehmen
                  </button>
                </div>
              </div>

              <button
                onClick={calculateCalorieGoal}
                className="w-full py-4 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white font-bold text-lg shadow-lg transition"
              >
                Berechnen
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="text-center py-6">
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-green-100 to-emerald-100 mx-auto mb-4 flex items-center justify-center">
                  <Check className="w-12 h-12 text-green-600" />
                </div>
                <p className="text-slate-600 mb-2">Dein empfohlenes Kalorienziel:</p>
                <p className="text-6xl font-bold text-emerald-600 mono mb-2">{result.calorieGoal}</p>
                <p className="text-2xl text-slate-700 font-semibold">Kalorien pro Tag</p>
              </div>

              {/* Aufschlüsselung */}
              <div className="bg-slate-50 rounded-2xl p-5 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-slate-600">Grundumsatz (BMR)</span>
                  <span className="font-bold text-slate-800 mono">{result.bmr} kcal</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-600">+ Alltagsbewegung ({ACTIVITY_LEVELS[result.activityLevel].label})</span>
                  <span className="font-bold text-slate-800 mono">{result.dailyBase - result.bmr} kcal</span>
                </div>
                <div className="border-t border-slate-200 pt-3 flex justify-between items-center">
                  <span className="text-slate-700 font-semibold">Tagesumsatz (ohne Sport)</span>
                  <span className="font-bold text-slate-800 mono">{result.dailyBase} kcal</span>
                </div>
                {calculatorData.goal !== 'maintain' && (
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-500">
                      {calculatorData.goal === 'lose' ? '- Defizit zum Abnehmen' : '+ Überschuss zum Zunehmen'}
                    </span>
                    <span className="font-bold text-slate-600 mono">
                      {calculatorData.goal === 'lose' ? '-500' : '+500'} kcal
                    </span>
                  </div>
                )}
              </div>

              <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
                <p className="text-sm text-blue-800">
                  <strong>Hinweis:</strong> Sport-Kalorien aus deinen Strava-Aktivitäten werden automatisch in der Energiebilanz berücksichtigt und erhöhen deinen Tagesverbrauch.
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setResult(null)}
                  className="flex-1 py-3 rounded-xl border-2 border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold transition"
                >
                  Neu berechnen
                </button>
                <button
                  onClick={acceptCalculatedGoal}
                  className="flex-1 py-3 rounded-xl bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-bold shadow-lg transition"
                >
                  Übernehmen
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CalorieCalculator;
