import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Map, Loader2, Trophy, Clock, TrendingUp, TrendingDown, Minus, ChevronDown, ChevronUp, Play, X, RefreshCw } from 'lucide-react';
import { loadActivitiesForRange } from '../lib/activities';
import { findTopRoutes, formatTime, formatDistance } from '../lib/routeMatcher';
import { decodePolyline } from '../lib/polyline';

const TrainingRoutes = ({ user }) => {
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState(0);
  const [runRoutes, setRunRoutes] = useState([]);
  const [rideRoutes, setRideRoutes] = useState([]);
  const [error, setError] = useState(null);
  const [flyoverRoute, setFlyoverRoute] = useState(null);
  const [hasPolylines, setHasPolylines] = useState(true);

  const loadRoutes = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // Erst aus DB laden (db_only Mode)
      const { data: activities } = await loadActivitiesForRange(user.id, 365);

      if (!activities || activities.length === 0) {
        setRunRoutes([]);
        setRideRoutes([]);
        setLoading(false);
        return;
      }

      // Prüfen ob Polyline-Daten vorhanden sind
      const withPolyline = activities.filter(a => a.summary_polyline);

      if (withPolyline.length < 2) {
        setHasPolylines(false);
        setRunRoutes([]);
        setRideRoutes([]);
        setLoading(false);
        return;
      }

      setHasPolylines(true);

      // Routen finden
      const runs = findTopRoutes(activities, ['Run', 'TrailRun', 'VirtualRun'], 3);
      const rides = findTopRoutes(activities, ['Ride', 'VirtualRide', 'GravelRide', 'MountainBikeRide'], 3);

      setRunRoutes(runs);
      setRideRoutes(rides);
    } catch (err) {
      console.error('Route loading error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [user.id]);

  // Full Sync: 12 Monate von Strava laden
  const triggerFullSync = async () => {
    setSyncing(true);
    setSyncProgress(10);
    setError(null);

    try {
      setSyncProgress(30);
      const response = await fetch('/.netlify/functions/strava-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ athlete_id: user.id, mode: 'full' }),
      });

      setSyncProgress(70);

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Sync fehlgeschlagen');
      }

      setSyncProgress(90);

      // Nach Sync Routen neu laden
      await loadRoutes();
      setSyncProgress(100);
    } catch (err) {
      console.error('Full sync error:', err);
      setError(err.message);
    } finally {
      setSyncing(false);
      setSyncProgress(0);
    }
  };

  useEffect(() => {
    loadRoutes();
  }, [loadRoutes]);

  // Loading
  if (loading) {
    return (
      <div className="glass rounded-3xl p-6 shadow-xl">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center">
            <Map className="w-5 h-5 text-white" />
          </div>
          <h3 className="text-xl font-bold text-slate-800">Trainingsstrecken</h3>
        </div>
        <div className="text-center py-12">
          <Loader2 className="w-10 h-10 text-emerald-500 animate-spin mx-auto mb-3" />
          <p className="text-slate-600 font-medium">Routen werden analysiert...</p>
        </div>
      </div>
    );
  }

  // Syncing Progress
  if (syncing) {
    return (
      <div className="glass rounded-3xl p-6 shadow-xl">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center">
            <Map className="w-5 h-5 text-white" />
          </div>
          <h3 className="text-xl font-bold text-slate-800">Trainingsstrecken</h3>
        </div>
        <div className="text-center py-12">
          <Loader2 className="w-10 h-10 text-emerald-500 animate-spin mx-auto mb-3" />
          <p className="text-slate-600 font-medium mb-3">12-Monats-Sync läuft...</p>
          <div className="max-w-xs mx-auto">
            <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-emerald-400 to-cyan-400 rounded-full transition-all duration-500"
                style={{ width: `${syncProgress}%` }}
              />
            </div>
            <p className="text-xs text-slate-400 mt-2">{syncProgress}% — Strava-Daten werden geladen</p>
          </div>
        </div>
      </div>
    );
  }

  // Keine Polyline-Daten → Full Sync anbieten
  if (!hasPolylines) {
    return (
      <div className="glass rounded-3xl p-6 shadow-xl">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center">
            <Map className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-slate-800">Trainingsstrecken</h3>
            <p className="text-xs text-slate-400">Top-Routen, Bestzeiten & Flyover</p>
          </div>
        </div>
        <div className="text-center py-8">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-emerald-100 to-cyan-100 mx-auto mb-4 flex items-center justify-center">
            <Map className="w-10 h-10 text-emerald-500" />
          </div>
          <p className="text-slate-600 font-medium mb-2">Routendaten fehlen</p>
          <p className="text-slate-400 text-sm mb-6 max-w-md mx-auto">
            Um deine Top-Strecken zu analysieren, müssen 12 Monate Strava-Daten geladen werden. Das dauert ca. 30 Sekunden.
          </p>
          <button
            onClick={triggerFullSync}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 text-white font-semibold transition-all shadow-lg hover:shadow-xl flex items-center gap-2 mx-auto"
          >
            <RefreshCw className="w-5 h-5" />
            12 Monate laden
          </button>
        </div>
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-3 mt-4 text-sm text-red-700">
            {error}
          </div>
        )}
      </div>
    );
  }

  // Keine Routen gefunden
  if (runRoutes.length === 0 && rideRoutes.length === 0) {
    return (
      <div className="glass rounded-3xl p-6 shadow-xl">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center">
              <Map className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-800">Trainingsstrecken</h3>
              <p className="text-xs text-slate-400">Keine wiederkehrenden Routen gefunden</p>
            </div>
          </div>
          <button
            onClick={triggerFullSync}
            className="px-3 py-2 rounded-xl bg-emerald-100 hover:bg-emerald-200 text-emerald-700 text-sm font-medium transition-colors flex items-center gap-1"
          >
            <RefreshCw className="w-4 h-4" />
            Neu laden
          </button>
        </div>
        <p className="text-slate-500 text-sm text-center py-4">
          Es wurden keine Strecken gefunden, die du mindestens 2x gelaufen oder gefahren bist. Trainiere weiter auf deinen Lieblingsstrecken!
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="glass rounded-3xl p-6 shadow-xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center">
              <Map className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-800">Trainingsstrecken</h3>
              <p className="text-xs text-slate-400">Top-Routen der letzten 12 Monate</p>
            </div>
          </div>
          <button
            onClick={triggerFullSync}
            className="px-3 py-2 rounded-xl bg-emerald-100 hover:bg-emerald-200 text-emerald-700 text-sm font-medium transition-colors flex items-center gap-1"
          >
            <RefreshCw className="w-4 h-4" />
            Aktualisieren
          </button>
        </div>
      </div>

      {/* Lauf-Routen */}
      {runRoutes.length > 0 && (
        <div className="glass rounded-3xl p-6 shadow-xl">
          <h4 className="text-sm font-semibold text-slate-600 uppercase tracking-wide flex items-center gap-2 mb-4">
            <span>🏃</span> Top Lauf-Strecken
          </h4>
          <div className="space-y-4">
            {runRoutes.map((route, i) => (
              <RouteCard key={`run-${i}`} route={route} index={i} isRide={false} onFlyover={setFlyoverRoute} />
            ))}
          </div>
        </div>
      )}

      {/* Rad-Routen */}
      {rideRoutes.length > 0 && (
        <div className="glass rounded-3xl p-6 shadow-xl">
          <h4 className="text-sm font-semibold text-slate-600 uppercase tracking-wide flex items-center gap-2 mb-4">
            <span>🚴</span> Top Rad-Strecken
          </h4>
          <div className="space-y-4">
            {rideRoutes.map((route, i) => (
              <RouteCard key={`ride-${i}`} route={route} index={i} isRide={true} onFlyover={setFlyoverRoute} />
            ))}
          </div>
        </div>
      )}

      {/* Flyover Modal */}
      {flyoverRoute && (
        <FlyoverModal route={flyoverRoute} onClose={() => setFlyoverRoute(null)} />
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700">
          {error}
        </div>
      )}
    </div>
  );
};

// === Route Card ===
const RouteCard = ({ route, index, isRide, onFlyover }) => {
  const [expanded, setExpanded] = useState(false);
  const mapRef = useRef(null);
  const mapInstance = useRef(null);

  // Mini-Map rendern
  useEffect(() => {
    if (!mapRef.current || !route.polyline || !window.L) return;
    if (mapInstance.current) {
      mapInstance.current.remove();
      mapInstance.current = null;
    }

    const points = decodePolyline(route.polyline);
    if (points.length === 0) return;

    const map = window.L.map(mapRef.current, {
      zoomControl: false,
      attributionControl: false,
      dragging: false,
      scrollWheelZoom: false,
      doubleClickZoom: false,
      touchZoom: false,
    });

    window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 18,
    }).addTo(map);

    const polyline = window.L.polyline(points, {
      color: '#10b981',
      weight: 3,
      opacity: 0.8,
    }).addTo(map);

    map.fitBounds(polyline.getBounds(), { padding: [10, 10] });
    mapInstance.current = map;

    // Fix für Leaflet Container-Size
    setTimeout(() => map.invalidateSize(), 100);

    return () => {
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
      }
    };
  }, [route.polyline]);

  const timeDiffSecs = route.timeDiff;
  const isFaster = timeDiffSecs < 0;
  const isSlower = timeDiffSecs > 10;
  const isSame = !isFaster && !isSlower;

  const medals = ['🥇', '🥈', '🥉'];

  return (
    <div className="bg-white/60 rounded-2xl border border-slate-100 overflow-hidden">
      {/* Main Row */}
      <div className="p-4">
        <div className="flex gap-4">
          {/* Mini Map */}
          <div
            ref={mapRef}
            className="w-28 h-28 rounded-xl bg-slate-100 flex-shrink-0 overflow-hidden"
            style={{ minHeight: '112px' }}
          />

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-lg">{medals[index] || '🏅'}</span>
              <h5 className="font-bold text-slate-800 text-sm truncate">{route.name}</h5>
            </div>
            <div className="flex items-center gap-3 text-xs text-slate-500 mb-2">
              <span>{formatDistance(route.distance)}</span>
              <span>•</span>
              <span>{route.count}x {isRide ? 'gefahren' : 'gelaufen'}</span>
            </div>

            {/* Bestzeit vs Letzte Zeit */}
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-emerald-50 rounded-lg p-2 border border-emerald-100">
                <div className="flex items-center gap-1 mb-0.5">
                  <Trophy className="w-3 h-3 text-emerald-600" />
                  <span className="text-emerald-600 text-[10px] font-semibold uppercase">Bestzeit</span>
                </div>
                <p className="text-sm font-bold text-emerald-900 mono">{formatTime(route.bestTime)}</p>
              </div>
              <div className={`rounded-lg p-2 border ${
                isFaster ? 'bg-green-50 border-green-100' :
                isSlower ? 'bg-red-50 border-red-100' :
                'bg-slate-50 border-slate-100'
              }`}>
                <div className="flex items-center gap-1 mb-0.5">
                  <Clock className="w-3 h-3 text-slate-500" />
                  <span className="text-slate-500 text-[10px] font-semibold uppercase">Letzte</span>
                  {isFaster && <TrendingUp className="w-3 h-3 text-green-500" />}
                  {isSlower && <TrendingDown className="w-3 h-3 text-red-500" />}
                  {isSame && <Minus className="w-3 h-3 text-slate-400" />}
                </div>
                <p className="text-sm font-bold text-slate-900 mono">
                  {formatTime(route.lastTime)}
                  {timeDiffSecs !== 0 && (
                    <span className={`text-[10px] ml-1 ${isFaster ? 'text-green-600' : 'text-red-600'}`}>
                      {isFaster ? '' : '+'}{formatTime(Math.abs(timeDiffSecs))}
                    </span>
                  )}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 mt-3">
          <button
            onClick={() => onFlyover(route)}
            className="flex-1 px-3 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 text-white text-xs font-semibold transition-all flex items-center justify-center gap-1.5"
          >
            <Play className="w-3.5 h-3.5" />
            Flyover
          </button>
          <button
            onClick={() => setExpanded(!expanded)}
            className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-medium transition-colors flex items-center gap-1"
          >
            {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            {route.activities.length} Einträge
          </button>
        </div>
      </div>

      {/* Expanded: Alle Aktivitäten */}
      {expanded && (
        <div className="border-t border-slate-100 bg-slate-50/50 p-4 max-h-60 overflow-y-auto">
          <div className="space-y-2">
            {route.activities.map((act, i) => {
              const isBest = act.moving_time === route.bestTime;
              return (
                <div key={i} className={`flex items-center justify-between py-2 px-3 rounded-lg text-xs ${isBest ? 'bg-emerald-50 border border-emerald-100' : 'bg-white border border-slate-100'}`}>
                  <div className="flex items-center gap-2">
                    {isBest && <Trophy className="w-3 h-3 text-emerald-600" />}
                    <span className="text-slate-700 font-medium">
                      {new Date(act.start_date).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: '2-digit' })}
                    </span>
                    <span className="text-slate-400">{act.name}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-slate-500">{formatDistance(act.distance)}</span>
                    <span className={`font-bold mono ${isBest ? 'text-emerald-700' : 'text-slate-800'}`}>
                      {formatTime(act.moving_time)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

// === Flyover Modal ===
const FlyoverModal = ({ route, onClose }) => {
  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const markerRef = useRef(null);
  const animationRef = useRef(null);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!mapRef.current || !route.polyline || !window.L) return;

    const points = decodePolyline(route.polyline);
    if (points.length < 2) return;

    // Map erstellen
    const map = window.L.map(mapRef.current, {
      zoomControl: false,
      attributionControl: false,
    });

    window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 18,
    }).addTo(map);

    // Polyline zeichnen
    const polyline = window.L.polyline(points, {
      color: '#10b981',
      weight: 4,
      opacity: 0.6,
    }).addTo(map);

    // Trail-Highlight (animierte Linie)
    const trail = window.L.polyline([], {
      color: '#059669',
      weight: 5,
      opacity: 1,
    }).addTo(map);

    map.fitBounds(polyline.getBounds(), { padding: [40, 40] });

    // Marker erstellen
    const marker = window.L.circleMarker(points[0], {
      radius: 8,
      color: '#059669',
      fillColor: '#10b981',
      fillOpacity: 1,
      weight: 3,
    }).addTo(map);

    mapInstance.current = map;
    markerRef.current = marker;

    // Fix Size
    setTimeout(() => map.invalidateSize(), 100);

    // Flyover Animation (~10 Sekunden)
    const duration = 10000;
    const startTime = performance.now();
    const trailPoints = [];

    const animate = (now) => {
      const elapsed = now - startTime;
      const p = Math.min(elapsed / duration, 1);
      setProgress(p * 100);

      const idx = Math.floor(p * (points.length - 1));
      const point = points[Math.min(idx, points.length - 1)];

      marker.setLatLng(point);

      // Trail aufbauen
      trailPoints.push(point);
      trail.setLatLngs(trailPoints);

      // Kamera folgt
      map.panTo(point, { animate: false });

      if (p < 1) {
        animationRef.current = requestAnimationFrame(animate);
      }
    };

    // Animation starten nach kurzem Delay
    setTimeout(() => {
      // Auf Startpunkt zoomen
      map.setView(points[0], 15, { animate: true });
      setTimeout(() => {
        animationRef.current = requestAnimationFrame(animate);
      }, 500);
    }, 300);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
      }
    };
  }, [route.polyline]);

  return (
    <div className="fixed inset-0 bg-black" style={{ zIndex: 9999 }}>
      {/* Map Container – nimmt den ganzen Hintergrund ein */}
      <div ref={mapRef} className="absolute inset-0" />

      {/* Close Button – separat, höchster z-index, immer klickbar */}
      <button
        onClick={onClose}
        style={{ zIndex: 10001, position: 'fixed', top: 16, right: 16 }}
        className="w-12 h-12 rounded-full bg-black/70 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/90 transition-colors shadow-2xl border border-white/20"
      >
        <X className="w-6 h-6" />
      </button>

      {/* Route Info – unter dem Close-Button */}
      <div style={{ zIndex: 10000, position: 'fixed', top: 16, left: 16, right: 80 }} className="pointer-events-none">
        <div className="bg-black/70 backdrop-blur-sm rounded-xl px-4 py-2 inline-block pointer-events-auto">
          <p className="text-white font-bold text-sm">{route.name}</p>
          <p className="text-white/60 text-xs">{formatDistance(route.distance)} • Bestzeit: {formatTime(route.bestTime)}</p>
        </div>
      </div>

      {/* Progress Bar */}
      <div style={{ zIndex: 10000, position: 'fixed', bottom: 0, left: 0, right: 0 }} className="h-1.5 bg-black/30">
        <div
          className="h-full bg-gradient-to-r from-emerald-400 to-cyan-400 transition-all"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
};

export default TrainingRoutes;
