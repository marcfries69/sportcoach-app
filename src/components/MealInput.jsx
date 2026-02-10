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
      const newMeal = {
        id: Date.now(),
        time: new Date().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }),
        ...nutrition
      };
      onMealAdded(newMeal);
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
    <div className="glass rounded-3xl p-4 shadow-xl">
      <div className="flex gap-3">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="z.B. 2 Äpfel, 100g Haferflocken mit Milch, Chicken Burger..."
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
        KI-gestützte Analyse mit Google Gemini
      </p>
    </div>
  );
};

export default MealInput;
