'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';

export interface SmartGoal {
  id: string;
  title: string;
  period: 'day' | 'week' | 'month';
  completed: boolean;
  specific?: string;
  measurable?: string;
  achievable?: string;
  relevant?: string;
  timeBound?: string;
}

export default function SmartGoalsPage() {
  const [goals, setGoals] = useState<SmartGoal[]>([]);
  const [activeTab, setActiveTab] = useState<'day' | 'week' | 'month'>('day');
  
  const [title, setTitle] = useState('');
  const [specific, setSpecific] = useState('');
  const [measurable, setMeasurable] = useState('');
  const [achievable, setAchievable] = useState('');
  const [relevant, setRelevant] = useState('');
  const [timeBound, setTimeBound] = useState('');
  const [showSmartFields, setShowSmartFields] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('habit_tracker_smart_goals');
    if (saved) setGoals(JSON.parse(saved));
  }, []);

  const saveGoals = (updated: SmartGoal[]) => {
    setGoals(updated);
    localStorage.setItem('habit_tracker_smart_goals', JSON.stringify(updated));
  };

  const handleAddGoal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const newGoal: SmartGoal = {
      id: Date.now().toString(),
      title,
      period: activeTab,
      completed: false,
      specific,
      measurable,
      achievable,
      relevant,
      timeBound
    };

    saveGoals([...goals, newGoal]);
    setTitle('');
    setSpecific('');
    setMeasurable('');
    setAchievable('');
    setRelevant('');
    setTimeBound('');
    setShowSmartFields(false);
  };

  const filteredGoals = goals.filter((g) => g.period === activeTab);

  return (
    <div className="max-w-4xl mx-auto min-h-screen bg-[#0d131d] text-white p-4 md:p-8 font-sans pb-28 dir-rtl text-right select-none" dir="rtl">
      
      <div className="mb-6 pt-2">
        <h1 className="text-2xl font-extrabold bg-gradient-to-r from-white via-gray-200 to-gray-400 bg-clip-text text-transparent">
          الأهداف الذكية (S.M.A.R.T) 🏆
        </h1>
        <p className="text-xs text-gray-400 mt-1 font-medium">خطط لأهدافك بأسلوب علمي لتحقيق أقصى إنجاز</p>
      </div>

      <div className="grid grid-cols-3 gap-2 bg-[#161e2c] p-1.5 rounded-2xl border border-gray-800 text-center text-xs font-bold mb-6">
        <button onClick={() => setActiveTab('day')} className={`py-2.5 rounded-xl transition ${activeTab === 'day' ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}>أهداف اليوم ☀️</button>
        <button onClick={() => setActiveTab('week')} className={`py-2.5 rounded-xl transition ${activeTab === 'week' ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}>أهداف الأسبوع 📅</button>
        <button onClick={() => setActiveTab('month')} className={`py-2.5 rounded-xl transition ${activeTab === 'month' ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}>أهداف الشهر 🗓️</button>
      </div>

      <form onSubmit={handleAddGoal} className="bg-[#161e2c] border border-gray-800 p-4.5 rounded-3xl space-y-3 mb-6 shadow-xl">
        <input
          type="text"
          placeholder="عنوان الهدف..."
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full bg-[#0d131d] border border-gray-700 p-3 rounded-2xl text-sm font-bold outline-none text-white focus:border-blue-500"
          required
        />

        <button
          type="button"
          onClick={() => setShowSmartFields(!showSmartFields)}
          className="text-xs text-blue-400 font-bold block transition hover:underline"
        >
          {showSmartFields ? '▲ إخفاء معايير SMART' : '▼ إضافة خانات SMART الخمس (اختياري)'}
        </button>

        {showSmartFields && (
          <div className="space-y-2 pt-2 border-t border-gray-800 text-xs">
            <input type="text" placeholder="1. محدد (Specific): ماذا تريد أن تنجز بالضبط؟" value={specific} onChange={(e) => setSpecific(e.target.value)} className="w-full bg-[#0d131d] border border-gray-800 p-2.5 rounded-xl text-white outline-none" />
            <input type="text" placeholder="2. قابل للقياس (Measurable): كيف تقيس الإنجاز؟" value={measurable} onChange={(e) => setMeasurable(e.target.value)} className="w-full bg-[#0d131d] border border-gray-800 p-2.5 rounded-xl text-white outline-none" />
            <input type="text" placeholder="3. قابل للتحقيق (Achievable): هل الهدف واقعي؟" value={achievable} onChange={(e) => setAchievable(e.target.value)} className="w-full bg-[#0d131d] border border-gray-800 p-2.5 rounded-xl text-white outline-none" />
            <input type="text" placeholder="4. مرتبط بالمرحلة (Relevant): لماذا هو مهم الآن؟" value={relevant} onChange={(e) => setRelevant(e.target.value)} className="w-full bg-[#0d131d] border border-gray-800 p-2.5 rounded-xl text-white outline-none" />
            <input type="text" placeholder="5. محدد بزمن (Time-bound): ما الوقت أو الموعد النهائي؟" value={timeBound} onChange={(e) => setTimeBound(e.target.value)} className="w-full bg-[#0d131d] border border-gray-800 p-2.5 rounded-xl text-white outline-none" />
          </div>
        )}

        <button type="submit" className="w-full bg-blue-600 hover:bg-blue-500 text-white p-3 rounded-2xl text-xs font-bold transition shadow-lg">
          إضافة الهدف
        </button>
      </form>

      <div className="space-y-3">
        {filteredGoals.length === 0 ? (
          <div className="text-center py-12 text-gray-500 text-xs bg-[#131a26] rounded-3xl border border-dashed border-gray-800">
            لا توجد أهداف مسجلة لهذه الفترة حتى الآن.
          </div>
        ) : (
          filteredGoals.map((goal) => (
            <div key={goal.id} className="bg-[#161e2c] border border-gray-800 p-4 rounded-2xl space-y-2.5 shadow-md">
              <div className="flex justify-between items-center font-bold text-sm">
                <span className={goal.completed ? 'line-through text-gray-500' : 'text-white'}>{goal.title}</span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => saveGoals(goals.map(g => g.id === goal.id ? { ...g, completed: !g.completed } : g))}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${goal.completed ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/30' : 'bg-gray-800 text-gray-300'}`}
                  >
                    {goal.completed ? 'تم ✔️' : 'تحقيق'}
                  </button>
                  <button onClick={() => saveGoals(goals.filter(g => g.id !== goal.id))} className="text-red-400 p-1">🗑️</button>
                </div>
              </div>

              {(goal.specific || goal.measurable || goal.timeBound) && (
                <div className="text-[11px] text-gray-400 space-y-1 bg-[#0d131d] p-3 rounded-xl border border-gray-800/80">
                  {goal.specific && <div>🎯 <b>محدد:</b> {goal.specific}</div>}
                  {goal.measurable && <div>📊 <b>القياس:</b> {goal.measurable}</div>}
                  {goal.timeBound && <div>⏱️ <b>الوقت:</b> {goal.timeBound}</div>}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-[#131a26]/90 backdrop-blur-lg border-t border-gray-800 py-3 px-6 flex justify-around items-center z-50 text-xs font-bold">
        <Link href="/" className="text-gray-400 hover:text-white transition">✅ العادات</Link>
        <Link href="/goals" className="text-blue-400">🏆 الأهداف الذكية</Link>
        <Link href="/stats" className="text-gray-400 hover:text-white transition">📊 الإحصائيات</Link>
      </div>

    </div>
  );
}