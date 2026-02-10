import React from 'react';
import { MessageCircle } from 'lucide-react';

const NutritionCoach = () => {
  return (
    <div className="glass rounded-3xl p-6 mb-6 shadow-xl opacity-60">
      <div className="flex items-center gap-3 mb-4">
        <MessageCircle className="w-6 h-6 text-indigo-500" />
        <h3 className="text-xl font-bold text-slate-800">KI-Coach</h3>
        <span className="text-xs px-2 py-1 rounded-full bg-indigo-100 text-indigo-700 font-medium">Kommt in Schritt 6</span>
      </div>
      <div className="text-center py-8">
        <p className="text-slate-400">Dein persönlicher Ernährungs- & Trainingsberater</p>
        <p className="text-slate-400 text-sm mt-1">Basierend auf deinen Daten</p>
      </div>
    </div>
  );
};

export default NutritionCoach;
