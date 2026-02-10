import React from 'react';
import { AlertTriangle } from 'lucide-react';

const RedSWarning = () => {
  return (
    <div className="glass rounded-3xl p-6 mb-6 shadow-xl opacity-60">
      <div className="flex items-center gap-3 mb-4">
        <AlertTriangle className="w-6 h-6 text-red-500" />
        <h3 className="text-xl font-bold text-slate-800">RED-S Warnung</h3>
        <span className="text-xs px-2 py-1 rounded-full bg-red-100 text-red-700 font-medium">Kommt in Schritt 7</span>
      </div>
      <div className="text-center py-8">
        <p className="text-slate-400">Relative Energy Deficiency in Sport</p>
        <p className="text-slate-400 text-sm mt-1">Automatische Erkennung von Energiedefiziten</p>
      </div>
    </div>
  );
};

export default RedSWarning;
