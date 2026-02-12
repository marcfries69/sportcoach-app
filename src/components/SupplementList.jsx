import React from 'react';
import { Pill, Trash2 } from 'lucide-react';

const SupplementList = ({ supplements, onDeleteSupplement }) => {
  if (supplements.length === 0) return null;

  return (
    <div className="glass rounded-3xl p-6 mb-6 shadow-xl">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500 to-emerald-500 flex items-center justify-center">
          <Pill className="w-5 h-5 text-white" />
        </div>
        <div>
          <h3 className="text-xl font-bold text-slate-800">Supplements</h3>
          <p className="text-xs text-slate-400">{supplements.length} NEM heute eingenommen</p>
        </div>
      </div>

      <div className="space-y-2">
        {supplements.map((sup) => (
          <div
            key={sup.id}
            className="bg-gradient-to-r from-teal-50 to-emerald-50 border border-teal-200 rounded-xl p-3 flex items-center justify-between meal-card"
            style={{ animationDelay: '0s' }}
          >
            <div className="flex items-center gap-3">
              <span className="text-lg">💊</span>
              <div>
                <p className="font-semibold text-slate-800 text-sm">{sup.name}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs text-slate-500 mono">{sup.time}</span>
                  {sup.kcal > 0 && (
                    <span className="px-2 py-0.5 rounded-full bg-teal-100 text-teal-700 text-xs font-medium mono">
                      {Math.round(sup.kcal)} kcal
                    </span>
                  )}
                  {sup.protein > 0 && (
                    <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-xs font-medium mono">
                      P: {Math.round(sup.protein)}g
                    </span>
                  )}
                </div>
              </div>
            </div>
            <button
              onClick={() => onDeleteSupplement(sup.id)}
              className="p-2 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-600 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SupplementList;
