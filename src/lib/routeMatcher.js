/**
 * Route Matcher – Findet wiederkehrende Trainingsrouten
 * Gruppiert Aktivitäten nach: gleicher Typ, ähnlicher Start-GPS, ähnliche Distanz
 */

/**
 * Haversine-Distanz in Metern zwischen zwei GPS-Koordinaten.
 */
function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371000; // Erdradius in Metern
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Extrahiert Start-Koordinaten aus einer Aktivität.
 * Unterstützt sowohl Array [lat, lng] als auch JSON-Object.
 */
function getStartCoords(activity) {
  const latlng = activity.start_latlng;
  if (!latlng) return null;

  if (Array.isArray(latlng) && latlng.length === 2) {
    return { lat: latlng[0], lng: latlng[1] };
  }

  // Supabase könnte es als JSON-String speichern
  if (typeof latlng === 'string') {
    try {
      const parsed = JSON.parse(latlng);
      if (Array.isArray(parsed) && parsed.length === 2) {
        return { lat: parsed[0], lng: parsed[1] };
      }
    } catch (e) {
      return null;
    }
  }

  return null;
}

/**
 * Findet die Top-N wiederkehrenden Routen für einen bestimmten Aktivitätstyp.
 *
 * Matching-Kriterien:
 * - Gleicher Typ (Run/Ride)
 * - Start-GPS ≤ 200m Abstand
 * - Distanz ±10%
 * - Mindestens 2 Aktivitäten pro Route
 *
 * @param {Array} activities - Alle Aktivitäten
 * @param {Array} types - Aktivitätstypen z.B. ['Run', 'TrailRun']
 * @param {number} topN - Anzahl der Top-Routen
 * @returns {Array} Top-Routen mit Aktivitäten, Bestzeit, letzte Zeit
 */
export function findTopRoutes(activities, types, topN = 3) {
  // Nur Aktivitäten mit GPS und Polyline filtern
  const validActivities = activities.filter(a =>
    types.includes(a.type) &&
    a.distance > 500 &&
    a.moving_time > 120 &&
    getStartCoords(a) !== null &&
    a.summary_polyline
  );

  if (validActivities.length === 0) return [];

  // Gruppierung: Jede Aktivität wird mit allen vorherigen verglichen
  const routes = [];

  for (const activity of validActivities) {
    const coords = getStartCoords(activity);
    if (!coords) continue;

    let matched = false;

    for (const route of routes) {
      const refCoords = getStartCoords(route.activities[0]);
      if (!refCoords) continue;

      const dist = haversineDistance(coords.lat, coords.lng, refCoords.lat, refCoords.lng);
      const refDist = route.activities[0].distance;
      const distDiff = Math.abs(activity.distance - refDist) / refDist;

      // Match: Start ≤200m, Distanz ±10%
      if (dist <= 200 && distDiff <= 0.10) {
        route.activities.push(activity);
        matched = true;
        break;
      }
    }

    if (!matched) {
      routes.push({ activities: [activity] });
    }
  }

  // Nur Routen mit mindestens 2 Aktivitäten
  const multiRoutes = routes.filter(r => r.activities.length >= 2);

  // Sortierung: Absteigend nach Häufigkeit
  multiRoutes.sort((a, b) => b.activities.length - a.activities.length);

  // Top-N mit Details anreichern
  return multiRoutes.slice(0, topN).map(route => {
    // Aktivitäten nach Datum sortieren (neueste zuerst)
    const sorted = [...route.activities].sort(
      (a, b) => new Date(b.start_date) - new Date(a.start_date)
    );

    // Bestzeit (kürzeste moving_time)
    const bestActivity = [...route.activities].sort((a, b) => a.moving_time - b.moving_time)[0];
    const latestActivity = sorted[0];

    // Häufigster Name
    const nameCounts = {};
    route.activities.forEach(a => {
      const name = a.name || 'Unbenannt';
      nameCounts[name] = (nameCounts[name] || 0) + 1;
    });
    const routeName = Object.entries(nameCounts)
      .sort((a, b) => b[1] - a[1])[0][0];

    // Durchschnittsdistanz
    const avgDistance = route.activities.reduce((sum, a) => sum + a.distance, 0) / route.activities.length;

    return {
      name: routeName,
      count: route.activities.length,
      distance: avgDistance,
      type: route.activities[0].type,
      bestTime: bestActivity.moving_time,
      bestDate: bestActivity.start_date,
      lastTime: latestActivity.moving_time,
      lastDate: latestActivity.start_date,
      timeDiff: latestActivity.moving_time - bestActivity.moving_time,
      polyline: latestActivity.summary_polyline,
      bestPolyline: bestActivity.summary_polyline,
      activities: sorted,
    };
  });
}

/**
 * Formatiert Sekunden in mm:ss oder hh:mm:ss
 */
export function formatTime(seconds) {
  if (!seconds) return '--:--';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.round(seconds % 60);

  if (h > 0) {
    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }
  return `${m}:${String(s).padStart(2, '0')}`;
}

/**
 * Formatiert Meter in km mit einer Dezimalstelle
 */
export function formatDistance(meters) {
  if (!meters) return '0 km';
  return `${(meters / 1000).toFixed(1)} km`;
}
