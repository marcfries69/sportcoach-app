import React, { useState } from 'react';
import { Loader2, Send } from 'lucide-react';

const MealInput = ({ onMealAdded }) => {
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const analyzeFoodWithGemini = async (foodText) => {
    const response = await fetch("/.netlify/functions/analyze-food", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ foodText })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'API-Fehler');
    }

    return await response.json();
  };

  const handleSubmit = async () => {
    if (!input.trim() || loading) return;

    setLoading(true);
    const userInput = input;
    setInput('');

    try {
      const nutrition = await analyzeFoodWithGemini(userInput);
      const now = new Date().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });

      if (nutrition.isMulti && nutrition.items && nutrition.items.length > 0) {
        // Multi-Item: Essen zu einer Mahlzeit zusammenfassen, NEMs einzeln
        const foodItems = nutrition.items.filter(i => !i.isSupplement);
        const supItems = nutrition.items.filter(i => i.isSupplement);

        // Essen-Items zu EINER Mahlzeit zusammenfassen
        if (foodItems.length > 0) {
          // Mehrere Essen-Items: Nährwerte summieren, components zusammenführen
          const mergedMeal = {
            id: Date.now() + Math.random(),
            time: now,
            name: foodItems.length === 1
              ? foodItems[0].name
              : foodItems.map(f => f.name).join(', '),
            kcal: foodItems.reduce((s, f) => s + (f.kcal || 0), 0),
            protein: foodItems.reduce((s, f) => s + (f.protein || 0), 0),
            carbs: foodItems.reduce((s, f) => s + (f.carbs || 0), 0),
            fat: foodItems.reduce((s, f) => s + (f.fat || 0), 0),
            fiber: foodItems.reduce((s, f) => s + (f.fiber || 0), 0),
            components: foodItems.flatMap(f => f.components || []),
            healthScore: foodItems[0].healthScore || 3,
            healthExplanation: foodItems[0].healthExplanation || '',
            isSupplement: false,
          };
          onMealAdded(mergedMeal);
        }

        // Jedes NEM als separaten Eintrag anlegen
        for (const sup of supItems) {
          const newSup = {
            id: Date.now() + Math.random(),
            time: now,
            ...sup,
          };
          // NEM mit >50 kcal zählt als Mahlzeit
          if (sup.kcal > 50) {
            newSup.isSupplement = false;
          }
          onMealAdded(newSup);
        }
      } else {
        // Einzelnes Item (kein Multi)
        const newMeal = {
          id: Date.now(),
          time: now,
          ...nutrition,
        };

        // Supplements mit >50 kcal werden als Mahlzeit gezählt
        if (nutrition.isSupplement && nutrition.kcal > 50) {
          newMeal.isSupplement = false;
        }

        onMealAdded(newMeal);
      }
    } catch (error) {
      alert('Fehler: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="glass rounded-3xl p-4 mb-6 shadow-xl">
      <div className="flex gap-3">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="z.B. Proteinshake mit Kreatin, 2 Äpfel, Omega-3..."
          disabled={loading}
          className="flex-1 px-6 py-4 rounded-2xl border-2 border-slate-200 focus:border-orange-500 focus:outline-none input-glow disabled:opacity-50 disabled:cursor-not-allowed text-slate-700 placeholder-slate-400"
        />
        <button
          onClick={handleSubmit}
          disabled={loading || !input.trim()}
          className="px-8 py-4 rounded-2xl bg-gradient-to-r from-orange-500 to-rose-500 hover:from-orange-600 hover:to-rose-600 text-white font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl flex items-center gap-2"
        >
          {loading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Analysiere...
            </>
          ) : (
            <>
              <Send className="w-5 h-5" />
              Hinzufügen
            </>
          )}
        </button>
      </div>
      <p className="text-xs text-slate-500 mt-3 text-center">
        KI-gestützte Analyse – Kombi-Eingaben wie "Proteinshake mit Kreatin" werden automatisch getrennt
      </p>
    </div>
  );
};

export default MealInput;
