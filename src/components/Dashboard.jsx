import React, { useState, useEffect } from 'react';
import { Activity, TrendingUp, Calculator, LogOut } from 'lucide-react';
import MealInput from './MealInput';
import MealList from './MealList';
import CalorieCalculator from './CalorieCalculator';
import EnergyBalance from './EnergyBalance';
import ActivityList from './ActivityList';
import NutritionCoach from './NutritionCoach';
import RedSWarning from './RedSWarning';
import { loadMeals, saveMeal, deleteMeal, deleteAllMealsForDate } from '../lib/meals';
import { loadCalorieGoal, saveCalorieGoal, loadBodyData, saveBodyData } from '../lib/userSettings';

const Dashboard = ({ user, onLogout }) => {
  const [meals, setMeals] = useState([]);
  const [calorieGoal, setCalorieGoal] = useState(2000);
  const [bodyData, setBodyData] = useState(null);
  const [showCalculator, setShowCalculator] = useState(false);
  const [loading, setLoading] = useState(true);

  // Aktivitäten-Kalorien (von ActivityList gemeldet)
  const [todayActivityKcal, setTodayActivityKcal] = useState(0);
  const [fiveDayActivityKcal, setFiveDayActivityKcal] = useState(0);

  // Daten aus Supabase laden beim Start
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const [mealsResult, goalResult, bodyResult] = await Promise.all([
          loadMeals(user.id),
          loadCalorieGoal(user.id),
          loadBodyData(user.id),
        ]);

        if (mealsResult.data) {
          setMeals(mealsResult.data);
        }
        setCalorieGoal(goalResult.calorieGoal);
        if (bodyResult.data) {
          setBodyData(bodyResult.data);
        }
      } catch (err) {
        console.error('Daten laden fehlgeschlagen:', err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [user.id]);

  const handleMealAdded = async (newMeal) => {
    setMeals(prev => [...prev, newMeal]);

    const { error } = await saveMeal(user.id, newMeal);
    if (error) {
      console.error('Mahlzeit speichern fehlgeschlagen:', error);
    }
  };

  const handleDeleteMeal = async (id) => {
    setMeals(prev => prev.filter(m => m.id !== id));

    const { error } = await deleteMeal(user.id, id);
    if (error) {
      console.error('Mahlzeit löschen fehlgeschlagen:', error);
    }
  };

  const handleNewDay = async () => {
    if (meals.length > 0 && !window.confirm('Möchtest du wirklich alle Mahlzeiten löschen und einen neuen Tag beginnen?')) {
      return;
    }
    setMeals([]);

    const { error } = await deleteAllMealsForDate(user.id);
    if (error) {
      console.error('Tag zurücksetzen fehlgeschlagen:', error);
    }
  };

  const handleAcceptGoal = async (goal, newBodyData) => {
    setCalorieGoal(goal);
    setShowCalculator(false);

    // Kalorienziel speichern
    const { error } = await saveCalorieGoal(user.id, goal);
    if (error) {
      console.error('Kalorienziel speichern fehlgeschlagen:', error);
    }

    // BMR/Body-Daten speichern (wenn vorhanden)
    if (newBodyData) {
      setBodyData(newBodyData);
      const { error: bodyError } = await saveBodyData(user.id, newBodyData);
      if (bodyError) {
        console.error('Body-Daten speichern fehlgeschlagen:', bodyError);
      }
    }
  };

  // Callback von ActivityList: Aktivitäten-Kalorien melden
  const handleActivityCalories = (todayKcal, totalKcal) => {
    setTodayActivityKcal(todayKcal);
    setFiveDayActivityKcal(totalKcal);
  };

  const totals = meals.reduce((acc, meal) => ({
    kcal: acc.kcal + (meal.kcal || 0),
    protein: acc.protein + (meal.protein || 0),
    carbs: acc.carbs + (meal.carbs || 0),
    fat: acc.fat + (meal.fat || 0),
    fiber: acc.fiber + (meal.fiber || 0)
  }), { kcal: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 });

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-orange-50 to-rose-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 rounded-full border-4 border-orange-500 border-t-transparent animate-spin mx-auto mb-4" />
          <p className="text-slate-600 font-medium">Daten werden geladen...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-orange-50 to-rose-50 p-4 md:p-8 font-sans">
      <style>{`
        * { font-family: 'Outfit', sans-serif; }
        .mono { font-family: 'Space Mono', monospace; }
        .glass {
          background: rgba(255, 255, 255, 0.7);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.5);
        }
        .stat-card { transition: all 0.3s ease; }
        .stat-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 16px rgba(0, 0, 0, 0.1);
        }
        .meal-card {
          animation: slideIn 0.4s ease-out forwards;
          opacity: 0;
        }
        @keyframes slideIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .input-glow:focus { box-shadow: 0 0 0 3px rgba(249, 115, 22, 0.1); }
      `}</style>

      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2 text-sm text-slate-500">
              {user.avatar && (
                <img src={user.avatar} alt="" className="w-8 h-8 rounded-full object-cover" />
              )}
              <span>Hallo, {user.name}</span>
            </div>
            <button
              onClick={onLogout}
              className="flex items-center gap-1 text-sm text-slate-400 hover:text-slate-600 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Abmelden
            </button>
          </div>
          <div className="inline-flex items-center gap-3 mb-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-orange-500 to-rose-500 flex items-center justify-center shadow-lg">
              <Activity className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-orange-600 to-rose-600 bg-clip-text text-transparent">
              SportCoach V1
            </h1>
          </div>
          <p className="text-slate-600">KI-gestützter Ernährungs- & Trainingscoach</p>
          <div className="flex gap-3 justify-center mt-4">
            <button
              onClick={handleNewDay}
              className="px-4 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 text-sm font-medium transition-colors"
            >
              Neuer Tag
            </button>
            <button
              onClick={() => setShowCalculator(true)}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white text-sm font-medium transition-all shadow-md flex items-center gap-2"
            >
              <Calculator className="w-4 h-4" />
              Kalorienziel berechnen
            </button>
          </div>
        </div>

        {/* Tages-Übersicht */}
        <div className="glass rounded-3xl p-6 mb-6 shadow-xl">
          <div className="flex items-center justify-between mb-6">
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-slate-800 mb-1">Heute</h2>
              <p className="text-slate-500 text-sm">{new Date().toLocaleDateString('de-DE', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
            </div>
            <div className="text-right">
              <p className="text-5xl font-bold mono bg-gradient-to-r from-orange-500 to-rose-500 bg-clip-text text-transparent">
                {Math.round(totals.kcal)}
              </p>
              <p className="text-slate-500 text-sm font-semibold uppercase tracking-wide">Kalorien</p>
            </div>
          </div>

          {/* Fortschrittsbalken */}
          <div className="mb-6">
            <div className="h-3 bg-slate-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-orange-500 to-rose-500 transition-all duration-500 ease-out rounded-full"
                style={{ width: `${Math.min((totals.kcal / calorieGoal) * 100, 100)}%` }}
              ></div>
            </div>
            <div className="flex justify-between mt-2">
              <span className="text-xs text-slate-500 font-medium">0 kcal</span>
              <span className="text-xs text-slate-500 font-medium">{calorieGoal} kcal Ziel</span>
            </div>
          </div>

          {/* Gesamtkalorien-Card */}
          <div className="bg-gradient-to-br from-orange-50 to-rose-50 rounded-2xl p-6 mb-4 border border-orange-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-orange-600 text-xs font-semibold uppercase tracking-wide mb-1">Gesamtkalorien</p>
                <p className="text-4xl font-bold text-orange-900 mono">{Math.round(totals.kcal)}</p>
                <p className="text-sm text-orange-700 mt-1">
                  {Math.round((totals.kcal / calorieGoal) * 100)}% des Tagesziels ({calorieGoal} kcal)
                </p>
              </div>
              <TrendingUp className="w-16 h-16 text-orange-200 opacity-50" />
            </div>
          </div>

          {/* Makro-Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="stat-card bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4 border border-blue-200">
              <p className="text-blue-600 text-xs font-semibold uppercase tracking-wide mb-1">Protein</p>
              <p className="text-2xl font-bold text-blue-900 mono">{Math.round(totals.protein)}g</p>
            </div>
            <div className="stat-card bg-gradient-to-br from-amber-50 to-amber-100 rounded-xl p-4 border border-amber-200">
              <p className="text-amber-600 text-xs font-semibold uppercase tracking-wide mb-1">Kohlenhydrate</p>
              <p className="text-2xl font-bold text-amber-900 mono">{Math.round(totals.carbs)}g</p>
            </div>
            <div className="stat-card bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-4 border border-purple-200">
              <p className="text-purple-600 text-xs font-semibold uppercase tracking-wide mb-1">Fett</p>
              <p className="text-2xl font-bold text-purple-900 mono">{Math.round(totals.fat)}g</p>
            </div>
            <div className="stat-card bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-4 border border-green-200">
              <p className="text-green-600 text-xs font-semibold uppercase tracking-wide mb-1">Ballaststoffe</p>
              <p className="text-2xl font-bold text-green-900 mono">{Math.round(totals.fiber)}g</p>
            </div>
          </div>
        </div>

        {/* Mahlzeiten-Liste */}
        <MealList meals={meals} onDeleteMeal={handleDeleteMeal} />

        {/* Mahlzeiten-Eingabe (direkt unter der Liste) */}
        <MealInput onMealAdded={handleMealAdded} />

        {/* Energiebilanz */}
        <EnergyBalance
          bodyData={bodyData}
          todayMealKcal={totals.kcal}
          todayActivityKcal={todayActivityKcal}
          fiveDayMealKcal={totals.kcal}
          fiveDayActivityKcal={fiveDayActivityKcal}
          onOpenCalculator={() => setShowCalculator(true)}
        />

        {/* Aktivitäten */}
        <ActivityList user={user} onActivityCalories={handleActivityCalories} />

        {/* KI-Coach (Platzhalter) */}
        <NutritionCoach />

        {/* RED-S Warnung (Platzhalter) */}
        <RedSWarning />
      </div>

      {/* Kalorienziel-Rechner Modal */}
      {showCalculator && (
        <CalorieCalculator
          onClose={() => setShowCalculator(false)}
          onAccept={handleAcceptGoal}
        />
      )}
    </div>
  );
};

export default Dashboard;
