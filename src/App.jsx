import React, { useState, useEffect } from 'react';
import Login from './components/Login';
import Dashboard from './components/Dashboard';

const STORAGE_KEY = 'sportcoach_user';

const App = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Beim Start: URL-Params prüfen (Strava Callback) + localStorage (bestehende Session)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const athleteId = params.get('athlete_id');
    const athleteName = params.get('athlete_name');
    const athleteAvatar = params.get('athlete_avatar');
    const authError = params.get('auth_error');

    // Auth-Fehler von Strava
    if (authError) {
      console.error('Strava Auth Fehler:', authError);
      window.history.replaceState({}, '', window.location.pathname);
      setLoading(false);
      return;
    }

    // Strava Callback – User speichern
    if (athleteId) {
      const stravaUser = {
        id: athleteId,
        name: athleteName || 'Strava Athlete',
        avatar: athleteAvatar || null,
        isStrava: true,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(stravaUser));
      setUser(stravaUser);
      window.history.replaceState({}, '', window.location.pathname);
      setLoading(false);
      return;
    }

    // Bestehende Session aus localStorage laden
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setUser(parsed);
      } catch (e) {
        localStorage.removeItem(STORAGE_KEY);
      }
    }

    setLoading(false);
  }, []);

  const handleDevLogin = () => {
    const devUser = {
      id: 'dev-user',
      name: 'Dev Sportler',
      avatar: null,
      isStrava: false,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(devUser));
    setUser(devUser);
  };

  const handleLogout = () => {
    localStorage.removeItem(STORAGE_KEY);
    setUser(null);
  };

  // Loading-State verhindert kurzes Aufblitzen des Login-Screens
  if (loading) {
    return null;
  }

  if (!user) {
    return <Login onDevLogin={handleDevLogin} />;
  }

  return <Dashboard user={user} onLogout={handleLogout} />;
};

export default App;
