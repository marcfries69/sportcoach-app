import React, { useMemo } from 'react';
import { Activity, Heart, Zap, Clock, TrendingUp } from 'lucide-react';

/**
 * VO2max-Schätzung aus Laufdaten (Cooper-Formel + HR-Reserve-Korrektur).
 * Logik übernommen aus trainer-analytics/src/App.jsx.
 *
 * 1. Filtert Läufe mit HR der letzten 90 Tage, min 3km, min 10min
 * 2. Cooper: predicted 12min distance → VO2max
 * 3. HR-Reserve Korrektur: extrapoliert auf Maximalleistung
 * 4. Top-3, Durchschnitt, Cap bei 65, Min bei 30
 */
function estimateVO2max(activities, whoopData) {
  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

  const validRuns = (activities || []).filter(a =>
    (a.type === 'Run' || a.type === 'VirtualRun' || a.type === 'TrailRun') &&
    a.average_heartrate &&
    a.distance >= 3000 &&     // Min 3km (trainer-analytics)
    a.moving_time >= 600 &&   // Min 10min (trainer-analytics)
    new Date(a.start_date) >= ninetyDaysAgo
  );

  if (validRuns.length === 0) return null;

  // Ruhepuls aus Whoop wenn verfügbar, sonst Schätzung
  const restingHR = whoopData?.recoveries?.[0]?.restingHr
    ? Math.round(whoopData.recoveries[0].restingHr)
    : 52;
  const maxHR = 172;
  const hrReserve = maxHR - restingHR;

  const estimates = validRuns.map(run => {
    // Pace in min/km
    const paceMinPerKm = (run.moving_time / 60) / (run.distance / 1000);

    // Riegel: Predicted 12-min distance mit 0.92 Ermüdungsfaktor
    const predicted12MinDistance = (12 / paceMinPerKm) * 1000 * 0.92;

    // Cooper: VO2max = (12-min distance - 504.9) / 44.73
    let vo2max = (predicted12MinDistance - 504.9) / 44.73;

    // HR-Reserve-Korrektur: Wenn HR < 95% der Reserve, hochrechnen
    const workingHR = run.average_heartrate - restingHR;
    const hrPercentage = workingHR / hrReserve;
    if (hrPercentage > 0 && hrPercentage < 0.95) {
      vo2max = vo2max / hrPercentage;
    }

    // Cap bei 65
    return Math.min(65, vo2max);
  }).filter(v => v > 30 && v <= 65);

  if (estimates.length === 0) return null;

  // Top-3 und Durchschnitt
  estimates.sort((a, b) => b - a);
  const top3 = estimates.slice(0, 3);
  const avg = top3.reduce((a, b) => a + b, 0) / top3.length;
  return Math.round(avg);
}

function getVO2maxLevel(vo2max) {
  if (vo2max >= 55) return { label: 'Exzellent', color: 'text-green-600', bg: 'bg-green-50' };
  if (vo2max >= 48) return { label: 'Sehr gut', color: 'text-emerald-600', bg: 'bg-emerald-50' };
  if (vo2max >= 42) return { label: 'Gut', color: 'text-blue-600', bg: 'bg-blue-50' };
  if (vo2max >= 36) return { label: 'Durchschnitt', color: 'text-amber-600', bg: 'bg-amber-50' };
  return { label: 'Ausbaufähig', color: 'text-orange-600', bg: 'bg-orange-50' };
}

const FitnessScoreCard = ({ activities, whoopData }) => {
  const stats = useMemo(() => {
    const allActs = activities || [];
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
    const recent90d = allActs.filter(a => new Date(a.start_date) >= ninetyDaysAgo);

    // VO2max mit HR-Reserve-Korrektur + Whoop-Ruhepuls
    const vo2max = estimateVO2max(allActs, whoopData);

    // Ruhepuls aus Whoop
    const restingHr = whoopData?.recoveries?.[0]?.restingHr
      ? Math.round(whoopData.recoveries[0].restingHr)
      : null;

    // Trainingsstunden/Woche (90d Durchschnitt = ~13 Wochen)
    const totalMovingTime = recent90d.reduce((sum, a) => sum + (a.moving_time || 0), 0);
    const weeks = 90 / 7; // ~12.86 Wochen
    const hoursPerWeek = Math.round((totalMovingTime / 3600 / weeks) * 10) / 10;

    // Durchschnittliche Watt (Rad) - auch 90d
    const rideActivities = recent90d.filter(a =>
      (a.type === 'Ride' || a.type === 'VirtualRide') && a.average_watts
    );
    const avgWatts = rideActivities.length > 0
      ? Math.round(rideActivities.reduce((sum, a) => sum + a.average_watts, 0) / rideActivities.length)
      : null;

    return { vo2max, restingHr, hoursPerWeek, avgWatts };
  }, [activities, whoopData]);

  if (!stats.vo2max && !stats.restingHr && stats.hoursPerWeek === 0) {
    return null;
  }

  const vo2Level = stats.vo2max ? getVO2maxLevel(stats.vo2max) : null;

  return (
    <div className="glass rounded-3xl p-6 shadow-xl mb-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
          <Activity className="w-5 h-5 text-white" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-slate-800">Fitness-Assessment</h3>
          <p className="text-xs text-slate-400">Basierend auf deinen Trainings- und Vitaldaten (90 Tage)</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {/* VO2max */}
        {stats.vo2max && (
          <div className={`${vo2Level.bg} rounded-xl p-4 border border-slate-100`}>
            <div className="flex items-center gap-1.5 mb-1">
              <TrendingUp className="w-3.5 h-3.5 text-violet-500" />
              <p className="text-violet-600 text-xs font-semibold uppercase">VO2max</p>
            </div>
            <p className="text-2xl font-bold text-slate-900 mono">{stats.vo2max}</p>
            <p className={`text-xs font-medium mt-0.5 ${vo2Level.color}`}>{vo2Level.label}</p>
          </div>
        )}

        {/* Ruhepuls */}
        {stats.restingHr && (
          <div className="bg-rose-50 rounded-xl p-4 border border-rose-100">
            <div className="flex items-center gap-1.5 mb-1">
              <Heart className="w-3.5 h-3.5 text-rose-500" />
              <p className="text-rose-600 text-xs font-semibold uppercase">Ruhepuls</p>
            </div>
            <p className="text-2xl font-bold text-slate-900 mono">{stats.restingHr}</p>
            <p className="text-xs text-rose-400 mt-0.5">bpm (Whoop)</p>
          </div>
        )}

        {/* Trainingsvolumen */}
        <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
          <div className="flex items-center gap-1.5 mb-1">
            <Clock className="w-3.5 h-3.5 text-blue-500" />
            <p className="text-blue-600 text-xs font-semibold uppercase">Training/Woche</p>
          </div>
          <p className="text-2xl font-bold text-slate-900 mono">{stats.hoursPerWeek}h</p>
          <p className="text-xs text-blue-400 mt-0.5">Ø letzte 3 Monate</p>
        </div>

        {/* Durchschnittliche Watt */}
        {stats.avgWatts && (
          <div className="bg-amber-50 rounded-xl p-4 border border-amber-100">
            <div className="flex items-center gap-1.5 mb-1">
              <Zap className="w-3.5 h-3.5 text-amber-500" />
              <p className="text-amber-600 text-xs font-semibold uppercase">Ø Watt (Rad)</p>
            </div>
            <p className="text-2xl font-bold text-slate-900 mono">{stats.avgWatts}W</p>
            <p className="text-xs text-amber-400 mt-0.5">Ø letzte 3 Monate</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default FitnessScoreCard;
