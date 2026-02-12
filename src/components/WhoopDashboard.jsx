import React, { useState, useEffect } from 'react';
import { Heart, Activity, Moon, Zap, Wind, TrendingUp, TrendingDown, Minus, Loader2, Brain, AlertCircle, Link2 } from 'lucide-react';

function msToHours(ms) {
  if (!ms) return '--';
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  return `${h}h ${m}m`;
}

function getTrend(values) {
  if (!values || values.length < 2) return 'stabil';
  const recent = values.slice(0, 3).filter(v => v != null);
  const older = values.slice(3, 7).filter(v => v != null);
  if (recent.length === 0 || older.length === 0) return 'stabil';
  const avgRecent = recent.reduce((a, b) => a + b, 0) / recent.length;
  const avgOlder = older.reduce((a, b) => a + b, 0) / older.length;
  const diff = ((avgRecent - avgOlder) / avgOlder) * 100;
  if (diff > 5) return 'steigend';
  if (diff < -5) return 'fallend';
  return 'stabil';
}

const TrendIcon = ({ trend }) => {
  if (trend === 'steigend') return <TrendingUp className="w-4 h-4 text-green-500" />;
  if (trend === 'fallend') return <TrendingDown className="w-4 h-4 text-red-500" />;
  return <Minus className="w-4 h-4 text-slate-400" />;
};

const RecoveryColor = ({ score }) => {
  if (!score) return 'text-slate-400';
  if (score >= 67) return 'text-green-600';
  if (score >= 34) return 'text-amber-600';
  return 'text-red-600';
};

const WhoopDashboard = ({ user }) => {
  const [connected, setConnected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [data, setData] = useState(null);
  const [coachResult, setCoachResult] = useState(null);
  const [coachLoading, setCoachLoading] = useState(false);
  const [error, setError] = useState(null);

  // Whoop-Status prüfen und Daten laden
  useEffect(() => {
    // Whoop-Callback-Params prüfen
    const params = new URLSearchParams(window.location.search);
    if (params.get('whoop_connected') === 'true') {
      window.history.replaceState({}, '', window.location.pathname);
    }
    if (params.get('whoop_error')) {
      setError('Whoop-Verbindung fehlgeschlagen: ' + params.get('whoop_error'));
      window.history.replaceState({}, '', window.location.pathname);
    }

    syncWhoopData();
  }, [user?.id]);

  const syncWhoopData = async () => {
    if (!user?.id) return;
    setSyncing(true);
    setError(null);

    try {
      const response = await fetch('/.netlify/functions/whoop-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ athlete_id: user.id }),
      });

      const result = await response.json();

      if (result.connected === false) {
        setConnected(false);
      } else if (result.connected === true) {
        setConnected(true);
        setData(result);
      } else if (result.error) {
        setError(result.error);
        setConnected(false);
      }
    } catch (err) {
      console.error('Whoop sync error:', err);
      setError(err.message);
      setConnected(false);
    } finally {
      setLoading(false);
      setSyncing(false);
    }
  };

  const connectWhoop = async () => {
    try {
      const response = await fetch('/.netlify/functions/whoop-auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ athlete_id: user.id }),
      });

      const { authUrl, error: authError } = await response.json();
      if (authError) {
        setError(authError);
        return;
      }
      window.location.href = authUrl;
    } catch (err) {
      setError('Verbindung fehlgeschlagen: ' + err.message);
    }
  };

  const runCoachAnalysis = async () => {
    if (!data) return;
    setCoachLoading(true);

    try {
      const response = await fetch('/.netlify/functions/whoop-coach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recoveries: data.recoveries || [],
          sleeps: data.sleeps || [],
          cycles: data.cycles || [],
        }),
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Coach-Analyse fehlgeschlagen');
      setCoachResult(result);
    } catch (err) {
      console.error('Whoop coach error:', err);
      setError(err.message);
    } finally {
      setCoachLoading(false);
    }
  };

  // Loading
  if (loading) {
    return (
      <div className="glass rounded-3xl p-6 shadow-xl">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center">
            <Heart className="w-5 h-5 text-white" />
          </div>
          <h3 className="text-xl font-bold text-slate-800">Whoop</h3>
        </div>
        <div className="text-center py-12">
          <Loader2 className="w-10 h-10 text-emerald-500 animate-spin mx-auto mb-3" />
          <p className="text-slate-400 text-sm">Whoop-Status wird geprüft...</p>
        </div>
      </div>
    );
  }

  // Nicht verbunden
  if (connected === false) {
    return (
      <div className="glass rounded-3xl p-6 shadow-xl">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center">
            <Heart className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-slate-800">Whoop</h3>
            <p className="text-xs text-slate-400">Recovery, HRV, Schlaf & Strain</p>
          </div>
        </div>
        <div className="text-center py-8">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-emerald-100 to-teal-100 mx-auto mb-4 flex items-center justify-center">
            <Link2 className="w-10 h-10 text-emerald-500" />
          </div>
          <p className="text-slate-600 font-medium mb-2">Whoop verbinden</p>
          <p className="text-slate-400 text-sm mb-6 max-w-md mx-auto">
            Verbinde deinen Whoop-Account, um Recovery, HRV, Schlaf und Strain zu tracken und KI-gestützte Trainingsempfehlungen zu erhalten.
          </p>
          <button
            onClick={connectWhoop}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-semibold transition-all shadow-lg hover:shadow-xl flex items-center gap-2 mx-auto"
          >
            <Link2 className="w-5 h-5" />
            Mit Whoop verbinden
          </button>
        </div>
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-3 mt-4 text-sm text-red-700 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {error}
          </div>
        )}
      </div>
    );
  }

  // Daten vorhanden
  const today = data?.recoveries?.[0];
  const yesterday = data?.recoveries?.[1];
  const todaySleep = data?.sleeps?.[0];
  const yesterdaySleep = data?.sleeps?.[1];
  const todayCycle = data?.cycles?.[0];
  const yesterdayCycle = data?.cycles?.[1];

  const hrvValues = (data?.recoveries || []).map(r => r.hrv).filter(v => v != null);
  const recoveryValues = (data?.recoveries || []).map(r => r.recoveryScore).filter(v => v != null);
  const hrvTrend = getTrend(hrvValues);
  const recoveryTrend = getTrend(recoveryValues);

  const recoveryColor = (score) => {
    if (!score && score !== 0) return 'text-slate-400';
    if (score >= 67) return 'text-green-600';
    if (score >= 34) return 'text-amber-600';
    return 'text-red-600';
  };

  const recoveryBg = (score) => {
    if (!score && score !== 0) return 'from-slate-50 to-slate-100 border-slate-200';
    if (score >= 67) return 'from-green-50 to-emerald-50 border-green-200';
    if (score >= 34) return 'from-amber-50 to-yellow-50 border-amber-200';
    return 'from-red-50 to-rose-50 border-red-200';
  };

  const statusColors = {
    green: { bg: 'bg-green-50', border: 'border-green-300', text: 'text-green-700', dot: 'bg-green-500' },
    yellow: { bg: 'bg-amber-50', border: 'border-amber-300', text: 'text-amber-700', dot: 'bg-amber-500' },
    red: { bg: 'bg-red-50', border: 'border-red-300', text: 'text-red-700', dot: 'bg-red-500' },
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="glass rounded-3xl p-6 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center">
              <Heart className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-800">Whoop</h3>
              <p className="text-xs text-slate-400">Recovery, HRV, Schlaf & Strain</p>
            </div>
          </div>
          <button
            onClick={syncWhoopData}
            disabled={syncing}
            className="px-3 py-2 rounded-xl bg-emerald-100 hover:bg-emerald-200 text-emerald-700 text-sm font-medium transition-colors disabled:opacity-50"
          >
            {syncing ? 'Syncing...' : 'Sync'}
          </button>
        </div>

        {/* Recovery Highlight */}
        {today && (
          <div className={`bg-gradient-to-br ${recoveryBg(today.recoveryScore)} border rounded-2xl p-6 mb-4`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1">Recovery Heute</p>
                <p className={`text-5xl font-bold mono ${recoveryColor(today.recoveryScore)}`}>
                  {today.recoveryScore != null ? `${Math.round(today.recoveryScore)}%` : '--'}
                </p>
                {yesterday?.recoveryScore != null && (
                  <p className="text-sm text-slate-500 mt-1">
                    Gestern: {Math.round(yesterday.recoveryScore)}%
                    <TrendIcon trend={recoveryTrend} />
                  </p>
                )}
              </div>
              <Heart className="w-16 h-16 text-emerald-200 opacity-50" />
            </div>
          </div>
        )}

        {/* Daten-Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {/* HRV */}
          <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
            <div className="flex items-center gap-1.5 mb-1">
              <Activity className="w-3.5 h-3.5 text-blue-500" />
              <p className="text-blue-600 text-xs font-semibold uppercase">HRV</p>
              <TrendIcon trend={hrvTrend} />
            </div>
            <p className="text-2xl font-bold text-blue-900 mono">
              {today?.hrv ? `${Math.round(today.hrv)}` : '--'}
              <span className="text-sm font-normal text-blue-500 ml-1">ms</span>
            </p>
            {yesterday?.hrv != null && (
              <p className="text-xs text-blue-400 mt-0.5">Gestern: {Math.round(yesterday.hrv)} ms</p>
            )}
          </div>

          {/* Ruhepuls */}
          <div className="bg-red-50 rounded-xl p-4 border border-red-100">
            <div className="flex items-center gap-1.5 mb-1">
              <Heart className="w-3.5 h-3.5 text-red-500" />
              <p className="text-red-600 text-xs font-semibold uppercase">Ruhepuls</p>
            </div>
            <p className="text-2xl font-bold text-red-900 mono">
              {today?.restingHr || '--'}
              <span className="text-sm font-normal text-red-500 ml-1">bpm</span>
            </p>
            {yesterday?.restingHr != null && (
              <p className="text-xs text-red-400 mt-0.5">Gestern: {yesterday.restingHr} bpm</p>
            )}
          </div>

          {/* Schlaf */}
          <div className="bg-indigo-50 rounded-xl p-4 border border-indigo-100">
            <div className="flex items-center gap-1.5 mb-1">
              <Moon className="w-3.5 h-3.5 text-indigo-500" />
              <p className="text-indigo-600 text-xs font-semibold uppercase">Schlaf</p>
            </div>
            <p className="text-2xl font-bold text-indigo-900 mono">
              {msToHours(todaySleep?.totalSleepMs)}
            </p>
            {yesterdaySleep?.totalSleepMs != null && (
              <p className="text-xs text-indigo-400 mt-0.5">Gestern: {msToHours(yesterdaySleep.totalSleepMs)}</p>
            )}
          </div>

          {/* Strain */}
          <div className="bg-orange-50 rounded-xl p-4 border border-orange-100">
            <div className="flex items-center gap-1.5 mb-1">
              <Zap className="w-3.5 h-3.5 text-orange-500" />
              <p className="text-orange-600 text-xs font-semibold uppercase">Strain</p>
            </div>
            <p className="text-2xl font-bold text-orange-900 mono">
              {todayCycle?.strain != null ? todayCycle.strain.toFixed(1) : '--'}
              <span className="text-sm font-normal text-orange-500 ml-1">/21</span>
            </p>
            {yesterdayCycle?.strain != null && (
              <p className="text-xs text-orange-400 mt-0.5">Gestern: {yesterdayCycle.strain.toFixed(1)}</p>
            )}
          </div>

          {/* Atemfrequenz */}
          <div className="bg-teal-50 rounded-xl p-4 border border-teal-100">
            <div className="flex items-center gap-1.5 mb-1">
              <Wind className="w-3.5 h-3.5 text-teal-500" />
              <p className="text-teal-600 text-xs font-semibold uppercase">Atemfrequenz</p>
            </div>
            <p className="text-2xl font-bold text-teal-900 mono">
              {today?.respiratoryRate ? today.respiratoryRate.toFixed(1) : '--'}
              <span className="text-sm font-normal text-teal-500 ml-1">rpm</span>
            </p>
            {yesterday?.respiratoryRate != null && (
              <p className="text-xs text-teal-400 mt-0.5">Gestern: {yesterday.respiratoryRate.toFixed(1)} rpm</p>
            )}
          </div>

          {/* Schlaf-Score */}
          <div className="bg-purple-50 rounded-xl p-4 border border-purple-100">
            <div className="flex items-center gap-1.5 mb-1">
              <Moon className="w-3.5 h-3.5 text-purple-500" />
              <p className="text-purple-600 text-xs font-semibold uppercase">Schlaf-Score</p>
            </div>
            <p className="text-2xl font-bold text-purple-900 mono">
              {todaySleep?.sleepScore != null ? `${Math.round(todaySleep.sleepScore)}%` : '--'}
            </p>
            {yesterdaySleep?.sleepScore != null && (
              <p className="text-xs text-purple-400 mt-0.5">Gestern: {Math.round(yesterdaySleep.sleepScore)}%</p>
            )}
          </div>
        </div>
      </div>

      {/* KI-Trainingsempfehlung */}
      {!coachResult && !coachLoading && (
        <div className="glass rounded-3xl p-6 shadow-xl text-center">
          <button
            onClick={runCoachAnalysis}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-semibold transition-all shadow-lg hover:shadow-xl flex items-center gap-2 mx-auto"
          >
            <Brain className="w-5 h-5" />
            KI-Trainingsempfehlung generieren
          </button>
        </div>
      )}

      {coachLoading && (
        <div className="glass rounded-3xl p-6 shadow-xl text-center py-12">
          <Loader2 className="w-10 h-10 text-emerald-500 animate-spin mx-auto mb-3" />
          <p className="text-slate-600 font-medium">Analysiere Whoop-Daten...</p>
        </div>
      )}

      {coachResult && (
        <div className="glass rounded-3xl p-6 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center">
                <Brain className="w-5 h-5 text-white" />
              </div>
              <h4 className="text-lg font-bold text-slate-800">Trainingsempfehlung</h4>
            </div>
            <button
              onClick={runCoachAnalysis}
              className="px-3 py-2 rounded-xl bg-emerald-100 hover:bg-emerald-200 text-emerald-700 text-sm font-medium transition-colors"
            >
              Neu analysieren
            </button>
          </div>

          {/* Status */}
          {coachResult.overallStatus && (
            <div className={`${statusColors[coachResult.overallStatus]?.bg || 'bg-slate-50'} ${statusColors[coachResult.overallStatus]?.border || 'border-slate-200'} border rounded-xl p-4 mb-4 flex items-center gap-3`}>
              <div className={`w-3 h-3 rounded-full ${statusColors[coachResult.overallStatus]?.dot || 'bg-slate-400'}`} />
              <p className={`font-medium text-sm ${statusColors[coachResult.overallStatus]?.text || 'text-slate-600'}`}>
                {coachResult.statusText}
              </p>
            </div>
          )}

          {/* Empfehlungen */}
          {coachResult.recommendations && (
            <div className="space-y-3">
              {coachResult.recommendations.map((rec, i) => {
                const iconMap = {
                  rest: '😴',
                  moderate: '🚶',
                  intense: '🔥',
                  sleep: '🌙',
                };
                return (
                  <div key={i} className="bg-white/70 rounded-xl p-4 border border-slate-100">
                    <div className="flex items-start gap-3">
                      <span className="text-xl">{iconMap[rec.icon] || '💡'}</span>
                      <div>
                        <h5 className="font-bold text-sm text-slate-800 mb-0.5">{rec.title}</h5>
                        <p className="text-sm text-slate-600">{rec.advice}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Trends */}
          {coachResult.trends && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-4">
              {Object.entries(coachResult.trends).map(([key, value]) => {
                const labels = { hrv: 'HRV', recovery: 'Recovery', sleep: 'Schlaf', strain: 'Strain' };
                return (
                  <div key={key} className="bg-slate-50 rounded-lg p-2 text-center border border-slate-100">
                    <p className="text-xs text-slate-500 font-medium">{labels[key] || key}</p>
                    <p className="text-sm font-bold text-slate-700">{value}</p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}
    </div>
  );
};

export default WhoopDashboard;
