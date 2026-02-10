import React from 'react';
import { Activity } from 'lucide-react';

const ActivityList = () => {
  return (
    <div className="glass rounded-3xl p-6 mb-6 shadow-xl opacity-60">
      <div className="flex items-center gap-3 mb-4">
        <Activity className="w-6 h-6 text-orange-500" />
        <h3 className="text-xl font-bold text-slate-800">Aktivitäten</h3>
        <span className="text-xs px-2 py-1 rounded-full bg-orange-100 text-orange-700 font-medium">Kommt in Schritt 4</span>
      </div>
      <div className="text-center py-8">
        <p className="text-slate-400">Deine Strava-Aktivitäten erscheinen hier</p>
        <p className="text-slate-400 text-sm mt-1">Verbinde Strava, um Trainings zu tracken</p>
      </div>
    </div>
  );
};

export default ActivityList;
