import React from 'react';
import { Zap, Utensils, Flame, TrendingDown, TrendingUp, Minus, Calculator } from 'lucide-react';

const EnergyBalance = ({ bodyData, todayMealKcal, todayActivityKcal, fiveDayMealKcal, fiveDayActivityKcal, onOpenCalculator }) => {
  // Wenn kein Grundumsatz berechnet wurde
  if (!bodyData || !bodyData.dailyBase) {
    return (
      <div className="glass rounded-3xl p-6 mb-6 shadow-xl">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center">
            <Zap className="w-5 h-5 text-white" />
          </div>
          <h3 className="text-xl font-bold text-slate-800">Energiebilanz</h3>
        </div>
        <div className="text-center py-6">
          <p className="text-slate-500 mb-3">Berechne zuerst deinen Grundumsatz, um die Energiebilanz zu sehen.</p>
          <button
            onClick={onOpenCalculator}
            className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white font-medium transition-all shadow-md"
          >
            <Calculator className="w-4 h-4" />
            Kalorienziel berechnen
          </button>
        </div>
      </div>
    );
  }

  const dailyBase = bodyData.dailyBase;

  // === TAGESBILANZ ===
  const todayTotalBurn = dailyBase + todayActivityKcal;
  const todayBalance = todayMealKcal - todayTotalBurn;
  const todayIsDeficit = todayBalance < 0;
  const todayIsSurplus = todayBalance > 0;

  // === 5-TAGE-BILANZ ===
  const fiveDayTotalBurn = (dailyBase * 5) + fiveDayActivityKcal;
  const fiveDayBalance = fiveDayMealKcal - fiveDayTotalBurn;
  const fiveDayIsDeficit = fiveDayBalance < 0;

  // Bilanz-Farbe und Icon
  function getBalanceStyle(balance) {
    if (balance < -200) return { color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200', label: 'Defizit', icon: TrendingDown };
    if (balance > 200) return { color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200', label: 'Überschuss', icon: TrendingUp };
    return { color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-200', label: 'Ausgeglichen', icon: Minus };
  }

  const todayStyle = getBalanceStyle(todayBalance);
  const fiveDayStyle = getBalanceStyle(fiveDayBalance);
  const TodayIcon = todayStyle.icon;
  const FiveDayIcon = fiveDayStyle.icon;

  // Fortschrittsbalken-Berechnung (Gegessen vs. Verbraucht)
  const todayPercent = todayTotalBurn > 0 ? Math.min((todayMealKcal / todayTotalBurn) * 100, 150) : 0;

  return (
    <div className="glass rounded-3xl p-6 mb-6 shadow-xl">
      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center">
          <Zap className="w-5 h-5 text-white" />
        </div>
        <div>
          <h3 className="text-xl font-bold text-slate-800">Energiebilanz</h3>
          <p className="text-xs text-slate-400">Grundumsatz + Alltag: {dailyBase} kcal/Tag</p>
        </div>
      </div>

      {/* === TAGESBILANZ === */}
      <div className="mb-5">
        <h4 className="text-sm font-semibold text-slate-600 uppercase tracking-wide mb-3">Heute</h4>

        {/* Balken: Gegessen vs. Verbraucht */}
        <div className="mb-4">
          <div className="flex justify-between text-xs text-slate-500 mb-1">
            <span>Gegessen: {Math.round(todayMealKcal)} kcal</span>
            <span>Verbraucht: {Math.round(todayTotalBurn)} kcal</span>
          </div>
          <div className="h-4 bg-slate-200 rounded-full overflow-hidden relative">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                todayPercent > 105 ? 'bg-gradient-to-r from-red-400 to-red-500' :
                todayPercent > 90 ? 'bg-gradient-to-r from-green-400 to-emerald-500' :
                'bg-gradient-to-r from-blue-400 to-blue-500'
              }`}
              style={{ width: `${Math.min(todayPercent, 100)}%` }}
            />
            {/* Markierung bei 100% */}
            <div className="absolute right-0 top-0 h-full w-0.5 bg-slate-400" />
          </div>
        </div>

        {/* Aufschlüsselung */}
        <div className="grid grid-cols-3 gap-3 mb-3">
          <div className="bg-emerald-50 rounded-xl p-3 border border-emerald-100">
            <div className="flex items-center gap-1.5 mb-1">
              <Utensils className="w-3.5 h-3.5 text-emerald-500" />
              <p className="text-emerald-600 text-xs font-semibold">Gegessen</p>
            </div>
            <p className="text-lg font-bold text-emerald-900 mono">{Math.round(todayMealKcal)}</p>
          </div>
          <div className="bg-orange-50 rounded-xl p-3 border border-orange-100">
            <div className="flex items-center gap-1.5 mb-1">
              <Flame className="w-3.5 h-3.5 text-orange-500" />
              <p className="text-orange-600 text-xs font-semibold">Grundumsatz</p>
            </div>
            <p className="text-lg font-bold text-orange-900 mono">{dailyBase}</p>
          </div>
          <div className="bg-rose-50 rounded-xl p-3 border border-rose-100">
            <div className="flex items-center gap-1.5 mb-1">
              <Zap className="w-3.5 h-3.5 text-rose-500" />
              <p className="text-rose-600 text-xs font-semibold">Sport</p>
            </div>
            <p className="text-lg font-bold text-rose-900 mono">{Math.round(todayActivityKcal)}</p>
          </div>
        </div>

        {/* Bilanz-Ergebnis */}
        <div className={`${todayStyle.bg} ${todayStyle.border} border rounded-xl p-4 flex items-center justify-between`}>
          <div className="flex items-center gap-2">
            <TodayIcon className={`w-5 h-5 ${todayStyle.color}`} />
            <span className={`font-semibold ${todayStyle.color}`}>{todayStyle.label}</span>
          </div>
          <span className={`text-2xl font-bold mono ${todayStyle.color}`}>
            {todayBalance > 0 ? '+' : ''}{Math.round(todayBalance)} kcal
          </span>
        </div>
      </div>

      {/* === 5-TAGE-BILANZ === */}
      <div>
        <h4 className="text-sm font-semibold text-slate-600 uppercase tracking-wide mb-3">Letzte 5 Tage</h4>

        <div className="grid grid-cols-3 gap-3 mb-3">
          <div className="bg-emerald-50 rounded-xl p-3 border border-emerald-100">
            <p className="text-emerald-600 text-xs font-semibold mb-1">Gegessen</p>
            <p className="text-lg font-bold text-emerald-900 mono">{Math.round(fiveDayMealKcal)}</p>
          </div>
          <div className="bg-orange-50 rounded-xl p-3 border border-orange-100">
            <p className="text-orange-600 text-xs font-semibold mb-1">Grundumsatz (5d)</p>
            <p className="text-lg font-bold text-orange-900 mono">{dailyBase * 5}</p>
          </div>
          <div className="bg-rose-50 rounded-xl p-3 border border-rose-100">
            <p className="text-rose-600 text-xs font-semibold mb-1">Sport (5d)</p>
            <p className="text-lg font-bold text-rose-900 mono">{Math.round(fiveDayActivityKcal)}</p>
          </div>
        </div>

        {/* 5-Tage Bilanz-Ergebnis */}
        <div className={`${fiveDayStyle.bg} ${fiveDayStyle.border} border rounded-xl p-4 flex items-center justify-between`}>
          <div className="flex items-center gap-2">
            <FiveDayIcon className={`w-5 h-5 ${fiveDayStyle.color}`} />
            <span className={`font-semibold ${fiveDayStyle.color}`}>{fiveDayStyle.label} (5 Tage)</span>
          </div>
          <span className={`text-2xl font-bold mono ${fiveDayStyle.color}`}>
            {fiveDayBalance > 0 ? '+' : ''}{Math.round(fiveDayBalance)} kcal
          </span>
        </div>
      </div>
    </div>
  );
};

export default EnergyBalance;
