import React, { useState } from 'react';
import { Brain, Loader2, TrendingUp, TrendingDown, Minus, Pill, Utensils, Activity, AlertCircle, ChevronRight, Dumbbell, CheckCircle, ArrowRight, Leaf } from 'lucide-react';
import { loadMealsForRange } from '../lib/meals';
import { loadActivitiesForRange } from '../lib/activities';
import { saveMacroTargets } from '../lib/userSettings';
import FitnessScoreCard from './FitnessScoreCard';

const PRIORITY_STYLES = {
  high: { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700', badge: 'bg-red-100 text-red-700' },
  medium: { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700', badge: 'bg-amber-100 text-amber-700' },
  low: { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-700', badge: 'bg-green-100 text-green-700' },
};

const NutritionCoach = ({ user, activities, supplements, bodyData, whoopData, onMacroTargetsAccepted }) => {
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [macroSaved, setMacroSaved] = useState(false);
  const [macroSaving, setMacroSaving] = useState(false);
  // Aktivitäten für FitnessScoreCard (alle 90d)
  const [allActivities, setAllActivities] = useState(null);

  const runAnalysis = async () => {
    setLoading(true);
    setError(null);
    setMacroSaved(false);

    try {
      // Parallel: Meals (5d/30d), Activities (30d/90d)
      const [meals5dResult, meals30dResult, activities30dResult, activities90dResult] = await Promise.all([
        loadMealsForRange(user.id, 5),
        loadMealsForRange(user.id, 30),
        loadActivitiesForRange(user.id, 30),
        loadActivitiesForRange(user.id, 90),
      ]);

      const allMeals5d = meals5dResult.data || [];
      const allMeals30d = meals30dResult.data || [];
      const acts30d = activities30dResult.data || [];
      const acts90d = activities90dResult.data || [];

      // FitnessScoreCard mit 90d Aktivitäten füttern
      setAllActivities(acts90d);

      const meals5d = allMeals5d.filter(m => !m.isSupplement && !m.is_supplement);
      const meals30d = allMeals30d.filter(m => !m.isSupplement && !m.is_supplement);
      const sups5d = allMeals5d.filter(m => m.isSupplement || m.is_supplement);
      const sups30d = allMeals30d.filter(m => m.isSupplement || m.is_supplement);

      // 5-Tage Aktivitäten aus dem Dashboard (prop) oder frisch geladene
      const acts5d = activities || [];

      const response = await fetch('/.netlify/functions/nutrition-coach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          activities5d: acts5d,
          activities30d: acts30d,
          activities90d: acts90d,
          meals5d,
          meals30d,
          supplements5d: sups5d,
          supplements30d: sups30d,
          bodyData: bodyData || null,
          whoopData: whoopData || null,
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Analyse fehlgeschlagen');
      setResult(data);
    } catch (err) {
      console.error('Coach error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptMacros = async () => {
    if (!result?.macroRecommendations) return;
    setMacroSaving(true);

    try {
      const targets = {
        protein: parseFloat(result.macroRecommendations.protein?.recommended) || 0,
        carbs: parseFloat(result.macroRecommendations.carbs?.recommended) || 0,
        fat: parseFloat(result.macroRecommendations.fat?.recommended) || 0,
        fiber: parseFloat(result.macroRecommendations.fiber?.recommended) || 0,
      };

      const { error: saveErr } = await saveMacroTargets(user.id, targets);
      if (saveErr) throw new Error(saveErr);

      setMacroSaved(true);
      if (onMacroTargetsAccepted) {
        onMacroTargetsAccepted(targets);
      }
    } catch (err) {
      console.error('Macro save error:', err);
      setError('Makro-Ziele konnten nicht gespeichert werden');
    } finally {
      setMacroSaving(false);
    }
  };

  // Anfangszustand: Analyse starten
  if (!result && !loading) {
    return (
      <div className="space-y-6">
        {/* FitnessScoreCard (wenn Aktivitäten verfügbar) */}
        <FitnessScoreCard activities={allActivities || activities} whoopData={whoopData} />

        <div className="glass rounded-3xl p-6 shadow-xl">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center">
              <Brain className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-800">KI Sport-Coach</h3>
              <p className="text-xs text-slate-400">Ernährung, Supplements, Training & Fitness</p>
            </div>
          </div>
          <div className="text-center py-8">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-indigo-100 to-purple-100 mx-auto mb-4 flex items-center justify-center">
              <Brain className="w-10 h-10 text-indigo-500" />
            </div>
            <p className="text-slate-600 font-medium mb-2">Bereit für die Analyse</p>
            <p className="text-slate-400 text-sm mb-6 max-w-md mx-auto">
              Der Coach analysiert deine Trainings (5/30/90 Tage), Ernährung, Supplements und Vitaldaten und erstellt personalisierte Empfehlungen.
            </p>
            <button
              onClick={runAnalysis}
              className="px-6 py-3 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white font-semibold transition-all shadow-lg hover:shadow-xl flex items-center gap-2 mx-auto"
            >
              <Brain className="w-5 h-5" />
              Analyse starten
            </button>
          </div>
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3 mt-4 text-sm text-red-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Ladescreen
  if (loading) {
    return (
      <div className="glass rounded-3xl p-6 shadow-xl">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center">
            <Brain className="w-5 h-5 text-white" />
          </div>
          <h3 className="text-xl font-bold text-slate-800">KI Sport-Coach</h3>
        </div>
        <div className="text-center py-12">
          <Loader2 className="w-12 h-12 text-indigo-500 animate-spin mx-auto mb-4" />
          <p className="text-slate-600 font-medium">Analysiere deine Daten...</p>
          <p className="text-slate-400 text-sm mt-1">Trainings, Ernährung, Supplements & Vitaldaten werden ausgewertet</p>
        </div>
      </div>
    );
  }

  // Ergebnis anzeigen
  return (
    <div className="space-y-6">
      {/* FitnessScoreCard */}
      <FitnessScoreCard activities={allActivities || activities} whoopData={whoopData} />

      {/* Header + Trainings-Summary */}
      <div className="glass rounded-3xl p-6 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center">
              <Brain className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-800">KI Sport-Coach</h3>
              <p className="text-xs text-slate-400">Analyse basierend auf 5/30/90-Tage-Daten</p>
            </div>
          </div>
          <button
            onClick={runAnalysis}
            className="px-4 py-2 rounded-xl bg-indigo-100 hover:bg-indigo-200 text-indigo-700 text-sm font-medium transition-colors"
          >
            Neu analysieren
          </button>
        </div>

        {result.trainingSummary && (
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-slate-600 uppercase tracking-wide flex items-center gap-2">
              <Activity className="w-4 h-4" /> Trainings-Überblick
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
                <p className="text-blue-600 text-xs font-semibold uppercase mb-1">Letzte 5 Tage</p>
                <p className="text-sm text-blue-900">{result.trainingSummary.short}</p>
              </div>
              <div className="bg-purple-50 rounded-xl p-4 border border-purple-100">
                <p className="text-purple-600 text-xs font-semibold uppercase mb-1">Letzte 30 Tage</p>
                <p className="text-sm text-purple-900">{result.trainingSummary.long}</p>
              </div>
            </div>
            {result.trainingSummary.trend && (
              <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-slate-500" />
                <p className="text-sm text-slate-700">{result.trainingSummary.trend}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Trainingsempfehlungen */}
      {result.trainingFocus && result.trainingFocus.length > 0 && (
        <div className="glass rounded-3xl p-6 shadow-xl">
          <h4 className="text-sm font-semibold text-slate-600 uppercase tracking-wide flex items-center gap-2 mb-4">
            <Dumbbell className="w-4 h-4" /> Trainingsempfehlungen
          </h4>
          <div className="space-y-3">
            {result.trainingFocus.map((focus, i) => {
              const style = PRIORITY_STYLES[focus.priority] || PRIORITY_STYLES.medium;
              const iconMap = {
                high: '🔥',
                medium: '💪',
                low: '🏃',
              };
              return (
                <div key={i} className={`${style.bg} ${style.border} border rounded-xl p-4`}>
                  <div className="flex items-start gap-3">
                    <span className="text-xl mt-0.5">{iconMap[focus.priority] || '💪'}</span>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <h5 className={`font-bold text-sm ${style.text}`}>{focus.type}</h5>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${style.badge}`}>
                          {focus.priority === 'high' ? 'Wichtig' : focus.priority === 'medium' ? 'Empfohlen' : 'Optional'}
                        </span>
                        {focus.frequency && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-white/80 text-slate-600 font-medium border border-slate-200">
                            {focus.frequency}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-slate-700">{focus.reason}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Ernährungs-Empfehlungen */}
      {result.nutritionAdvice && result.nutritionAdvice.length > 0 && (
        <div className="glass rounded-3xl p-6 shadow-xl">
          <h4 className="text-sm font-semibold text-slate-600 uppercase tracking-wide flex items-center gap-2 mb-4">
            <Utensils className="w-4 h-4" /> Ernährungs-Empfehlungen
          </h4>
          <div className="space-y-3">
            {result.nutritionAdvice.map((advice, i) => {
              const style = PRIORITY_STYLES[advice.priority] || PRIORITY_STYLES.medium;
              return (
                <div key={i} className={`${style.bg} ${style.border} border rounded-xl p-4`}>
                  <div className="flex items-start gap-3">
                    <ChevronRight className={`w-5 h-5 ${style.text} mt-0.5 flex-shrink-0`} />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h5 className={`font-bold text-sm ${style.text}`}>{advice.title}</h5>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${style.badge}`}>
                          {advice.priority === 'high' ? 'Wichtig' : advice.priority === 'medium' ? 'Empfohlen' : 'Optional'}
                        </span>
                      </div>
                      <p className="text-sm text-slate-700">{advice.advice}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Makro-Empfehlungen */}
      {result.macroRecommendations && (
        <div className="glass rounded-3xl p-6 shadow-xl">
          <h4 className="text-sm font-semibold text-slate-600 uppercase tracking-wide mb-4">Makronährstoff-Empfehlungen</h4>
          <div className="space-y-4">
            {[
              { key: 'protein', label: 'Protein', colorBg: 'bg-blue-50', colorBorder: 'border-blue-100', colorText: 'text-blue-700', colorSub: 'text-blue-500', colorBold: 'text-blue-900', barColor: 'bg-blue-400' },
              { key: 'carbs', label: 'Kohlenhydrate', colorBg: 'bg-amber-50', colorBorder: 'border-amber-100', colorText: 'text-amber-700', colorSub: 'text-amber-500', colorBold: 'text-amber-900', barColor: 'bg-amber-400' },
              { key: 'fat', label: 'Fett', colorBg: 'bg-purple-50', colorBorder: 'border-purple-100', colorText: 'text-purple-700', colorSub: 'text-purple-500', colorBold: 'text-purple-900', barColor: 'bg-purple-400' },
              { key: 'fiber', label: 'Ballaststoffe', colorBg: 'bg-green-50', colorBorder: 'border-green-100', colorText: 'text-green-700', colorSub: 'text-green-500', colorBold: 'text-green-900', barColor: 'bg-green-400' },
            ].map(({ key, label, colorBg, colorBorder, colorText, colorSub, colorBold, barColor }) => {
              const rec = result.macroRecommendations[key];
              if (!rec) return null;
              const current = parseFloat(rec.current) || 0;
              const recommended = parseFloat(rec.recommended) || 0;
              const diff = recommended - current;

              return (
                <div key={key} className={`${colorBg} rounded-xl p-4 border ${colorBorder}`}>
                  <div className="flex items-center justify-between mb-2">
                    <p className={`${colorText} font-bold text-sm`}>{label}</p>
                    <div className="flex items-center gap-2">
                      <span className={`${colorSub} text-xs font-medium`}>Aktuell: {Math.round(current)}g</span>
                      {diff > 5 && <TrendingUp className="w-4 h-4 text-green-500" />}
                      {diff < -5 && <TrendingDown className="w-4 h-4 text-red-500" />}
                      {Math.abs(diff) <= 5 && <Minus className="w-4 h-4 text-green-500" />}
                      <span className={`${colorBold} text-xs font-bold`}>Empfohlen: {Math.round(recommended)}g</span>
                    </div>
                  </div>
                  <div className="h-3 bg-white rounded-full overflow-hidden mb-2">
                    <div
                      className={`h-full ${barColor} rounded-full transition-all`}
                      style={{ width: `${recommended > 0 ? Math.min((current / recommended) * 100, 100) : 0}%` }}
                    />
                  </div>
                  <p className="text-xs text-slate-600">{rec.advice}</p>
                </div>
              );
            })}
          </div>

          {/* Makro-Ziele übernehmen Button */}
          <div className="mt-4 pt-4 border-t border-slate-200">
            {macroSaved ? (
              <div className="flex items-center gap-2 text-green-600 bg-green-50 rounded-xl p-3">
                <CheckCircle className="w-5 h-5" />
                <span className="text-sm font-medium">Makro-Ziele übernommen! Fortschritt ist im Dashboard sichtbar.</span>
              </div>
            ) : (
              <button
                onClick={handleAcceptMacros}
                disabled={macroSaving}
                className="w-full px-4 py-3 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white font-semibold transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {macroSaving ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <ArrowRight className="w-5 h-5" />
                    Empfehlungen als Tagesziele übernehmen
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Supplement-Empfehlungen mit Dosierung */}
      {result.supplementAdvice && result.supplementAdvice.length > 0 && (
        <div className="glass rounded-3xl p-6 shadow-xl">
          <h4 className="text-sm font-semibold text-slate-600 uppercase tracking-wide flex items-center gap-2 mb-4">
            <Pill className="w-4 h-4" /> Supplement-Bewertung & Empfehlungen
          </h4>
          <div className="space-y-3">
            {result.supplementAdvice.map((sup, i) => {
              // Status bestimmen
              let statusIcon, statusBg, statusBorder, statusLabel;
              if (sup.alreadyTaking && sup.currentDosageOk) {
                statusIcon = '✅';
                statusBg = 'bg-green-50';
                statusBorder = 'border-green-200';
                statusLabel = 'Passt';
              } else if (sup.alreadyTaking && !sup.currentDosageOk) {
                statusIcon = '⚠️';
                statusBg = 'bg-amber-50';
                statusBorder = 'border-amber-200';
                statusLabel = 'Anpassen';
              } else {
                statusIcon = '➕';
                statusBg = 'bg-teal-50';
                statusBorder = 'border-teal-200';
                statusLabel = 'Empfohlen';
              }

              return (
                <div key={i} className={`rounded-xl p-4 border ${statusBg} ${statusBorder}`}>
                  <div className="flex items-start gap-3">
                    <span className="text-lg mt-0.5">{statusIcon}</span>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <p className="font-bold text-sm text-slate-800">{sup.name}</p>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          sup.alreadyTaking && sup.currentDosageOk
                            ? 'bg-green-100 text-green-700'
                            : sup.alreadyTaking
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-teal-100 text-teal-700'
                        }`}>
                          {statusLabel}
                        </span>
                        {sup.dosage && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-white/80 text-slate-700 font-medium border border-slate-200">
                            {sup.dosage}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-slate-600">{sup.reason}</p>
                      {sup.adjustmentNeeded && (
                        <p className="text-xs text-amber-700 mt-1 font-medium flex items-center gap-1">
                          <ArrowRight className="w-3 h-3" />
                          {sup.adjustmentNeeded}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}
    </div>
  );
};

export default NutritionCoach;
