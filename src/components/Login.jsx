import React from 'react';
import { Activity, Zap } from 'lucide-react';

const Login = ({ onDevLogin }) => {
  const handleStravaLogin = () => {
    // Wird in Schritt 3 mit echtem OAuth verbunden
    window.location.href = '/.netlify/functions/strava-auth';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700&family=Space+Mono:wght@400;700&display=swap');
        * { font-family: 'Outfit', sans-serif; }
      `}</style>

      <div className="max-w-md w-full">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-orange-500 to-rose-500 shadow-2xl mb-6">
            <Activity className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-5xl font-bold text-white mb-3">SportCoach</h1>
          <p className="text-slate-400 text-lg">Dein KI-Ernährungs- & Trainingscoach</p>
        </div>

        <div className="bg-white/5 backdrop-blur-xl rounded-3xl p-8 border border-white/10 shadow-2xl">
          <div className="space-y-4">
            <button
              onClick={handleStravaLogin}
              className="w-full py-4 px-6 rounded-2xl bg-[#FC4C02] hover:bg-[#e04400] text-white font-bold text-lg transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-3"
            >
              <Zap className="w-6 h-6" />
              Mit Strava verbinden
            </button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-white/10"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-transparent text-slate-500">Entwicklung</span>
              </div>
            </div>

            <button
              onClick={onDevLogin}
              className="w-full py-3 px-6 rounded-2xl border-2 border-dashed border-slate-600 hover:border-slate-400 text-slate-400 hover:text-slate-300 font-medium transition-all flex items-center justify-center gap-2"
            >
              Dev-Login (ohne Strava)
            </button>
          </div>

          <p className="text-slate-500 text-xs text-center mt-6">
            Verbinde dein Strava-Konto, um Trainings automatisch zu tracken und deine Energiebilanz zu optimieren.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
