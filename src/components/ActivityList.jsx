import React, { useState, useEffect } from 'react';
import { Activity, RefreshCw, Clock, Flame, Mountain, Heart, TrendingUp, Zap, Plus, Minus } from 'lucide-react';

// Sport-Typ Icons & Farben
const SPORT_CONFIG = {
  Run: { emoji: '🏃', bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-700', label: 'Laufen' },
  Ride: { emoji: '🚴', bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700', label: 'Radfahren' },
  Swim: { emoji: '🏊', bg: 'bg-cyan-50', border: 'border-cyan-200', text: 'text-cyan-700', label: 'Schwimmen' },
  Walk: { emoji: '🚶', bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700', label: 'Gehen' },
  Hike: { emoji: '🥾', bg: 'bg-lime-50', border: 'border-lime-200', text: 'text-lime-700', label: 'Wandern' },
  WeightTraining: { emoji: '🏋️', bg: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-700', label: 'Krafttraining' },
  Yoga: { emoji: '🧘', bg: 'bg-pink-50', border: 'border-pink-200', text: 'text-pink-700', label: 'Yoga' },
  Soccer: { emoji: '⚽', bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-700', label: 'Fußball' },
  Tennis: { emoji: '🎾', bg: 'bg-yellow-50', border: 'border-yellow-200', text: 'text-yellow-700', label: 'Tennis' },
  Crossfit: { emoji: '💪', bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700', label: 'CrossFit' },
  default: { emoji: '🏅', bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-700', label: 'Training' },
};

function getSportConfig(type) {
  return SPORT_CONFIG[type] || SPORT_CONFIG.default;
}

// Hilfsfunktionen
function formatDuration(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}min`;
  return `${m}min`;
}

function formatDistance(meters) {
  if (meters >= 1000) return `${(meters / 1000).toFixed(1)} km`;
  return `${Math.round(meters)} m`;
}

function formatPace(avgSpeedMs, type) {
  if (!avgSpeedMs || avgSpeedMs === 0) return null;
  if (type === 'Run' || type === 'Walk' || type === 'Hike') {
    const paceMinPerKm = 1000 / avgSpeedMs / 60;
    const min = Math.floor(paceMinPerKm);
    const sec = Math.round((paceMinPerKm - min) * 60);
    return `${min}:${String(sec).padStart(2, '0')} /km`;
  }
  return `${(avgSpeedMs * 3.6).toFixed(1)} km/h`;
}

function formatDate(dateStr) {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now - date;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Heute';
  if (diffDays === 1) return 'Gestern';
  if (diffDays < 7) return `vor ${diffDays} Tagen`;

  return date.toLocaleDateString('de-DE', { day: 'numeric', month: 'short' });
}

function formatTime(dateStr) {
  return new Date(dateStr).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
}

const ActivityList = ({ user, onActivityCalories }) => {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState(null);
  const [expanded, setExpanded] = useState(false);

  // Aktivitäten beim Laden der Komponente synchen (nur für Strava-User)
  useEffect(() => {
    if (user?.isStrava && user?.id) {
      setLoading(true);
      syncActivities();
    }
  }, [user?.id]);

  // Kalorien an Dashboard melden wenn sich Aktivitäten ändern
  useEffect(() => {
    if (onActivityCalories && activities.length > 0) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const todayKcal = activities
        .filter(a => new Date(a.start_date_local) >= today)
        .reduce((sum, a) => sum + (a.calories || 0), 0);

      const totalKcal = activities
        .reduce((sum, a) => sum + (a.calories || 0), 0);

      onActivityCalories(todayKcal, totalKcal, activities);
    }
  }, [activities]);

  const syncActivities = async () => {
    if (!user?.isStrava || !user?.id) return;

    setSyncing(true);
    setError(null);

    try {
      const response = await fetch('/.netlify/functions/strava-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ athlete_id: user.id }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Sync fehlgeschlagen');
      }

      setActivities(data.activities || []);
      setLastSync(new Date());
    } catch (err) {
      console.error('Sync error:', err);
      setError(err.message);
    } finally {
      setSyncing(false);
      setLoading(false);
    }
  };

  // Nicht-Strava User: Platzhalter anzeigen
  if (!user?.isStrava) {
    return (
      <div className="glass rounded-3xl p-6 mb-6 shadow-xl opacity-60">
        <div className="flex items-center gap-3 mb-4">
          <Activity className="w-6 h-6 text-orange-500" />
          <h3 className="text-xl font-bold text-slate-800">Aktivitäten</h3>
        </div>
        <div className="text-center py-8">
          <p className="text-slate-400">Verbinde Strava, um deine Trainings zu sehen</p>
          <p className="text-slate-400 text-sm mt-1">Melde dich mit Strava an, um Aktivitäten zu tracken</p>
        </div>
      </div>
    );
  }

  // Zusammenfassung der letzten 5 Tage (alle geladenen Aktivitäten)
  const stats = {
    count: activities.length,
    duration: activities.reduce((sum, a) => sum + (a.moving_time || 0), 0),
    distance: activities.reduce((sum, a) => sum + (a.distance || 0), 0),
    calories: activities.reduce((sum, a) => sum + (a.calories || 0), 0),
  };

  return (
    <div className="glass rounded-3xl p-6 mb-6 shadow-xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-rose-500 flex items-center justify-center">
            <Activity className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-slate-800">Aktivitäten</h3>
            {lastSync && (
              <p className="text-xs text-slate-400">
                Sync: {lastSync.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}
              </p>
            )}
          </div>
        </div>
        <button
          onClick={syncActivities}
          disabled={syncing}
          className="flex items-center gap-2 px-3 py-2 rounded-xl bg-orange-100 hover:bg-orange-200 text-orange-700 text-sm font-medium transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
          {syncing ? 'Syncing...' : 'Sync'}
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-3 mb-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Loading */}
      {loading && activities.length === 0 && (
        <div className="text-center py-8">
          <div className="w-10 h-10 rounded-full border-4 border-orange-500 border-t-transparent animate-spin mx-auto mb-3" />
          <p className="text-slate-400 text-sm">Aktivitäten werden geladen...</p>
        </div>
      )}

      {/* Wochen-Zusammenfassung */}
      {activities.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
          <div className="bg-gradient-to-br from-orange-50 to-rose-50 rounded-xl p-3 border border-orange-100">
            <div className="flex items-center gap-1.5 mb-1">
              <Zap className="w-3.5 h-3.5 text-orange-500" />
              <p className="text-orange-600 text-xs font-semibold uppercase tracking-wide">Trainings</p>
            </div>
            <p className="text-xl font-bold text-orange-900 mono">{stats.count}</p>
            <p className="text-xs text-orange-500">letzte 5 Tage</p>
          </div>
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-3 border border-blue-100">
            <div className="flex items-center gap-1.5 mb-1">
              <Clock className="w-3.5 h-3.5 text-blue-500" />
              <p className="text-blue-600 text-xs font-semibold uppercase tracking-wide">Zeit</p>
            </div>
            <p className="text-xl font-bold text-blue-900 mono">{formatDuration(stats.duration)}</p>
            <p className="text-xs text-blue-500">letzte 5 Tage</p>
          </div>
          <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-3 border border-green-100">
            <div className="flex items-center gap-1.5 mb-1">
              <TrendingUp className="w-3.5 h-3.5 text-green-500" />
              <p className="text-green-600 text-xs font-semibold uppercase tracking-wide">Distanz</p>
            </div>
            <p className="text-xl font-bold text-green-900 mono">{formatDistance(stats.distance)}</p>
            <p className="text-xs text-green-500">letzte 5 Tage</p>
          </div>
          <div className="bg-gradient-to-br from-red-50 to-rose-50 rounded-xl p-3 border border-red-100">
            <div className="flex items-center gap-1.5 mb-1">
              <Flame className="w-3.5 h-3.5 text-red-500" />
              <p className="text-red-600 text-xs font-semibold uppercase tracking-wide">Kalorien</p>
            </div>
            <p className="text-xl font-bold text-red-900 mono">{Math.round(stats.calories)}</p>
            <p className="text-xs text-red-500">letzte 5 Tage</p>
          </div>
        </div>
      )}

      {/* Keine Aktivitäten */}
      {activities.length === 0 && !loading && !syncing && (
        <div className="text-center py-8">
          <p className="text-slate-400">Keine Aktivitäten in den letzten 5 Tagen</p>
          <p className="text-slate-400 text-sm mt-1">Zeichne ein Training in Strava auf!</p>
        </div>
      )}

      {/* Aktivitäten-Liste */}
      <div className="space-y-3">
        {(expanded ? activities.slice(0, 10) : activities.slice(0, 3)).map((activity) => {
          const config = getSportConfig(activity.type);
          const pace = formatPace(activity.average_speed, activity.type);

          return (
            <div
              key={activity.strava_id}
              className={`${config.bg} ${config.border} border rounded-2xl p-4 transition-all hover:shadow-md meal-card`}
              style={{ animationDelay: '0s' }}
            >
              {/* Obere Zeile: Typ + Name + Datum */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{config.emoji}</span>
                  <div>
                    <h4 className="font-bold text-slate-800 text-sm">{activity.name}</h4>
                    <p className={`text-xs ${config.text} font-medium`}>
                      {config.label} · {formatDate(activity.start_date_local)} · {formatTime(activity.start_date_local)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {/* Distanz */}
                {activity.distance > 0 && (
                  <div className="bg-white/60 rounded-lg px-3 py-2">
                    <p className="text-xs text-slate-500 font-medium">Distanz</p>
                    <p className="text-sm font-bold text-slate-800 mono">{formatDistance(activity.distance)}</p>
                  </div>
                )}

                {/* Dauer */}
                <div className="bg-white/60 rounded-lg px-3 py-2">
                  <p className="text-xs text-slate-500 font-medium flex items-center gap-1">
                    <Clock className="w-3 h-3" /> Dauer
                  </p>
                  <p className="text-sm font-bold text-slate-800 mono">{formatDuration(activity.moving_time)}</p>
                </div>

                {/* Pace/Speed */}
                {pace && (
                  <div className="bg-white/60 rounded-lg px-3 py-2">
                    <p className="text-xs text-slate-500 font-medium flex items-center gap-1">
                      <TrendingUp className="w-3 h-3" /> Tempo
                    </p>
                    <p className="text-sm font-bold text-slate-800 mono">{pace}</p>
                  </div>
                )}

                {/* Höhenmeter */}
                {activity.total_elevation_gain > 0 && (
                  <div className="bg-white/60 rounded-lg px-3 py-2">
                    <p className="text-xs text-slate-500 font-medium flex items-center gap-1">
                      <Mountain className="w-3 h-3" /> Höhenmeter
                    </p>
                    <p className="text-sm font-bold text-slate-800 mono">{Math.round(activity.total_elevation_gain)} m</p>
                  </div>
                )}

                {/* Herzfrequenz */}
                {activity.average_heartrate && (
                  <div className="bg-white/60 rounded-lg px-3 py-2">
                    <p className="text-xs text-slate-500 font-medium flex items-center gap-1">
                      <Heart className="w-3 h-3" /> Puls
                    </p>
                    <p className="text-sm font-bold text-slate-800 mono">{Math.round(activity.average_heartrate)} bpm</p>
                  </div>
                )}

                {/* Kalorien */}
                {activity.calories && (
                  <div className="bg-white/60 rounded-lg px-3 py-2">
                    <p className="text-xs text-slate-500 font-medium flex items-center gap-1">
                      <Flame className="w-3 h-3" /> Kalorien
                    </p>
                    <p className="text-sm font-bold text-slate-800 mono">{Math.round(activity.calories)} kcal</p>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Expand/Collapse Button */}
      {activities.length > 3 && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full mt-4 py-3 rounded-2xl border-2 border-dashed border-slate-200 hover:border-orange-300 hover:bg-orange-50 text-slate-500 hover:text-orange-600 text-sm font-medium transition-all flex items-center justify-center gap-2"
        >
          {expanded ? (
            <>
              <Minus className="w-4 h-4" />
              Weniger anzeigen
            </>
          ) : (
            <>
              <Plus className="w-4 h-4" />
              {Math.min(activities.length - 3, 7)} weitere Aktivitäten anzeigen
            </>
          )}
        </button>
      )}
    </div>
  );
};

export default ActivityList;
