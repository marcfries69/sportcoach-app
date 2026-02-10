import React from 'react';
import { Settings } from 'lucide-react';

const ProfileSettings = () => {
  return (
    <div className="glass rounded-3xl p-6 mb-6 shadow-xl opacity-60">
      <div className="flex items-center gap-3 mb-4">
        <Settings className="w-6 h-6 text-slate-500" />
        <h3 className="text-xl font-bold text-slate-800">Profil & Einstellungen</h3>
        <span className="text-xs px-2 py-1 rounded-full bg-slate-100 text-slate-700 font-medium">Kommt später</span>
      </div>
      <div className="text-center py-8">
        <p className="text-slate-400">Persönliche Einstellungen und Profildaten</p>
      </div>
    </div>
  );
};

export default ProfileSettings;
