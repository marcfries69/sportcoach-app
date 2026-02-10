import React, { useState, useRef, useEffect } from 'react';
import { Plus, Trash2, ChevronDown } from 'lucide-react';

const MealList = ({ meals, onDeleteMeal }) => {
  const [expandedMealId, setExpandedMealId] = useState(null);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [meals]);

  return (
    <div className="glass rounded-3xl p-6 mb-6 shadow-xl min-h-[300px] max-h-[500px] overflow-y-auto">
      <h3 className="text-xl font-bold text-slate-800 mb-4">Mahlzeiten</h3>
      {meals.length === 0 ? (
        <div className="text-center py-12">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-orange-100 to-rose-100 mx-auto mb-4 flex items-center justify-center">
            <Plus className="w-10 h-10 text-orange-600" />
          </div>
          <p className="text-slate-500">Noch keine Mahlzeiten erfasst</p>
          <p className="text-slate-400 text-sm mt-1">Gib unten ein Lebensmittel ein, um zu starten</p>
        </div>
      ) : (
        <div className="space-y-3">
          {meals.map((meal, index) => {
            const isExpanded = expandedMealId === meal.id;
            return (
              <div key={meal.id} className="meal-card bg-white rounded-xl shadow-sm hover:shadow-md transition-all border border-slate-100" style={{ animationDelay: `${index * 0.05}s` }}>
                <div className="p-4 cursor-pointer" onClick={() => setExpandedMealId(isExpanded ? null : meal.id)}>
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-semibold mono text-slate-500">{meal.time}</span>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 font-medium">
                          #{meals.length - index}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold text-slate-800 text-lg">{meal.name}</h4>
                        <ChevronDown className={`w-5 h-5 text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                      </div>
                    </div>
                    <button onClick={(e) => { e.stopPropagation(); onDeleteMeal(meal.id); }} className="p-2 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-600 transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <span className="px-3 py-1 rounded-full bg-gradient-to-r from-orange-500 to-rose-500 text-white text-sm font-semibold mono">{Math.round(meal.kcal)} kcal</span>
                    {meal.healthScore && (
                      <span className={`px-3 py-1 rounded-full text-white text-sm font-bold flex items-center gap-1 ${
                        meal.healthScore <= 2 ? 'bg-gradient-to-r from-green-500 to-emerald-500' :
                        meal.healthScore <= 4 ? 'bg-gradient-to-r from-yellow-500 to-amber-500' :
                        'bg-gradient-to-r from-red-500 to-rose-500'
                      }`}>
                        <span className="text-xs">&#10084;</span>
                        {meal.healthScore}/6
                      </span>
                    )}
                    <span className="px-3 py-1 rounded-full bg-blue-100 text-blue-700 text-xs font-medium mono">P: {Math.round(meal.protein)}g</span>
                    <span className="px-3 py-1 rounded-full bg-amber-100 text-amber-700 text-xs font-medium mono">K: {Math.round(meal.carbs)}g</span>
                    <span className="px-3 py-1 rounded-full bg-purple-100 text-purple-700 text-xs font-medium mono">F: {Math.round(meal.fat)}g</span>
                    <span className="px-3 py-1 rounded-full bg-green-100 text-green-700 text-xs font-medium mono">Bal: {Math.round(meal.fiber)}g</span>
                  </div>
                </div>
                {isExpanded && (
                  <div className="border-t border-slate-100 p-4 pt-3 bg-slate-50">
                    {meal.healthExplanation && (
                      <div className={`rounded-xl p-4 mb-4 ${
                        meal.healthScore <= 2 ? 'bg-green-50 border border-green-200' :
                        meal.healthScore <= 4 ? 'bg-yellow-50 border border-yellow-200' :
                        'bg-red-50 border border-red-200'
                      }`}>
                        <div className="flex items-start gap-3">
                          <div className={`w-12 h-12 rounded-full flex items-center justify-center text-2xl font-bold text-white flex-shrink-0 ${
                            meal.healthScore <= 2 ? 'bg-gradient-to-br from-green-500 to-emerald-500' :
                            meal.healthScore <= 4 ? 'bg-gradient-to-br from-yellow-500 to-amber-500' :
                            'bg-gradient-to-br from-red-500 to-rose-500'
                          }`}>
                            {meal.healthScore}
                          </div>
                          <div className="flex-1">
                            <h6 className={`font-bold text-sm mb-1 ${
                              meal.healthScore <= 2 ? 'text-green-800' :
                              meal.healthScore <= 4 ? 'text-yellow-800' :
                              'text-red-800'
                            }`}>
                              Gesundheits-Bewertung: {
                                meal.healthScore === 1 ? 'Sehr gesund' :
                                meal.healthScore === 2 ? 'Gesund' :
                                meal.healthScore === 3 ? 'Okay' :
                                meal.healthScore === 4 ? 'Weniger gesund' :
                                meal.healthScore === 5 ? 'Ungesund' :
                                'Sehr ungesund'
                              }
                            </h6>
                            <p className={`text-sm ${
                              meal.healthScore <= 2 ? 'text-green-700' :
                              meal.healthScore <= 4 ? 'text-yellow-700' :
                              'text-red-700'
                            }`}>
                              {meal.healthExplanation}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                    {meal.components && meal.components.length > 0 && (
                      <>
                        <h5 className="text-sm font-semibold text-slate-600 mb-3 uppercase tracking-wide">Einzelbestandteile</h5>
                        <div className="space-y-2">
                          {meal.components.map((component, compIndex) => (
                            <div key={compIndex} className="bg-white rounded-lg p-3 border border-slate-200">
                              <div className="flex items-start justify-between mb-2">
                                <div>
                                  <p className="font-medium text-slate-800">{component.name}</p>
                                  <p className="text-xs text-slate-500 mt-0.5">{component.amount}</p>
                                </div>
                                <span className="px-2 py-1 rounded-md bg-orange-100 text-orange-700 text-xs font-semibold mono">{Math.round(component.kcal)} kcal</span>
                              </div>
                              <div className="flex flex-wrap gap-1.5">
                                <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-600 text-xs mono">P: {Math.round(component.protein)}g</span>
                                <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-600 text-xs mono">K: {Math.round(component.carbs)}g</span>
                                <span className="px-2 py-0.5 rounded-md bg-purple-50 text-purple-600 text-xs mono">F: {Math.round(component.fat)}g</span>
                                <span className="px-2 py-0.5 rounded-md bg-green-50 text-green-600 text-xs mono">Bal: {Math.round(component.fiber)}g</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>
      )}
    </div>
  );
};

export default MealList;
