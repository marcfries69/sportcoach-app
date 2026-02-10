import React from 'react';
import { Zap } from 'lucide-react';

const EnergyBalance = () => {
  return (
    <div className="glass rounded-3xl p-6 mb-6 shadow-xl opacity-60">
      <div className="flex items-center gap-3 mb-4">
        <Zap className="w-6 h-6 text-amber-500" />
        <h3 className="text-xl font-bold text-slate-800">Energiebilanz</h3>
        <span className="text-xs px-2 py-1 rounded-full bg-amber-100 text-amber-700 font-medium">Kommt in Schritt 5</span>
      </div>
      <div className="text-center py-8">
        <p className="text-slate-400">Kalorien rein vs. Kalorien verbrannt</p>
        <p className="text-slate-400 text-sm mt-1">Wird mit Strava-Integration verfügbar</p>
      </div>
    </div>
  );
};

export default EnergyBalance;
