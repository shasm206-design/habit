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
  const [lang, setLang] = useState<'ar' | 'en'>('ar');
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
    const savedLang = localStorage.getItem('habit_tracker_lang');
    if (savedLang === 'en' || savedLang === 'ar') setLang(savedLang as 'ar' | 'en');

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
    <div className={`max-w-4xl mx-auto min-h-screen bg-[#0d131d] text-white p-4 md:p-8 font-sans pb-28 select-none ${lang === 'ar' ? 'dir-rtl text-right' : 'dir-ltr text-left'}`} dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      
      <div className="mb-6 pt-2">
        <h1 className="text-2xl font-extrabold bg-gradient-to-r from-white via-gray-200 to-gray-400 bg-clip-text text-transparent">
          {lang === 'ar' ? 'الأهداف الذكية (S.M.A.R.T) 🏆' : 'SMART Goals 🏆'}
        </h1>
        <p className="text-xs text-gray-400 mt-1 font-medium">
          {lang === 'ar' ? 'خطط لأهدافك بأسلوب علمي لتحقيق أقصى إنجاز' : 'Plan your goals scientifically for max achievement'}
        </p>
      </div>

      <div className="grid grid-cols-3 gap-2 bg-[#161e2c] p-1.5 rounded-2xl border border-gray-800 text-center text-xs font-bold mb-6">
        <button onClick={() => setActiveTab('day')} className={`py-2.5 rounded-xl transition ${activeTab === 'day' ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}>
          {lang === 'ar' ? 'أهداف اليوم ☀️' : 'Daily Goals ☀️'}
        </button>
        <button onClick={() => setActiveTab('week')} className={`py-2.5 rounded-xl transition ${activeTab === 'week' ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}>
          {lang === 'ar' ? 'أهداف الأسبوع 📅' : 'Weekly Goals 📅'}
        </button>
        <button onClick={() => setActiveTab('month')} className={`py-2.5 rounded-xl transition ${activeTab === 'month' ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}>
          {lang === 'ar' ? 'أهداف الشهر 🗓️' : 'Monthly Goals 🗓️'}
        </button>
      </div>

      <form onSubmit={handleAddGoal} className="bg-[#161e2c] border border-gray-800 p-4.5 rounded-3xl space-y-3 mb-6 shadow-xl">
        <input
          type="text"
          placeholder={lang === 'ar' ? 'عنوان الهدف...' : 'Goal title...'}
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
          {showSmartFields ? (lang === 'ar' ? '▲ إخفاء معايير SMART' : '▲ Hide SMART Criteria') : (lang === 'ar' ? '▼ إضافة خانات SMART الخمس (اختياري)' : '▼ Add SMART Criteria (Optional)')}
        </button>

        {showSmartFields && (
          <div className="space-y-2 pt-2 border-t border-gray-800 text-xs">
            <input type="text" placeholder={lang === 'ar' ? '1. محدد (Specific)' : '1. Specific'} value={specific} onChange={(e) => setSpecific(e.target.value)} className="w-full bg-[#0d131d] border border-gray-800 p-2.5 rounded-xl text-white outline-none" />
            <input type="text" placeholder={lang === 'ar' ? '2. قابل للقياس (Measurable)' : '2. Measurable'} value={measurable} onChange={(e) => setMeasurable(e.target.value)} className="w-full bg-[#0d131d] border border-gray-800 p-2.5 rounded-xl text-white outline-none" />
            <input type="text" placeholder={lang === 'ar' ? '3. قابل للتحقيق (Achievable)' : '3. Achievable'} value={achievable} onChange={(e) => setAchievable(e.target.value)} className="w-full bg-[#0d131d] border border-gray-800 p-2.5 rounded-xl text-white outline-none" />
            <input type="text" placeholder={lang === 'ar' ? '4. مرتبط بالمرحلة (Relevant)' : '4. Relevant'} value={relevant} onChange={(e) => setRelevant(e.target.value)} className="w-full bg-[#0d131d] border border-gray-800 p-2.5 rounded-xl text-white outline-none" />
            <input type="text" placeholder={lang === 'ar' ? '5. محدد بزمن (Time-bound)' : '5. Time-bound'} value={timeBound} onChange={(e) => setTimeBound(e.target.value)} className="w-full bg-[#0d131d] border border-gray-800 p-2.5 rounded-xl text-white outline-none" />
          </div>
        )}

        <button type="submit" className="w-full bg-blue-600 hover:bg-blue-500 text-white p-3 rounded-2xl text-xs font-bold transition shadow-lg">
          {lang === 'ar' ? 'إضافة الهدف' : 'Add Goal'}
        </button>
      </form>

      <div className="space-y-3">
        {filteredGoals.length === 0 ? (
          <div className="text-center py-12 text-gray-500 text-xs bg-[#131a26] rounded-3xl border border-dashed border-gray-800">
            {lang === 'ar' ? 'لا توجد أهداف مسجلة لهذه الفترة حتى الآن.' : 'No goals recorded for this period yet.'}
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
                    {goal.completed ? (lang === 'ar' ? 'تم ✔️' : 'Done ✔️') : (lang === 'ar' ? 'تحقيق' : 'Achieve')}
                  </button>
                  <button onClick={() => saveGoals(goals.filter(g => g.id !== goal.id))} className="text-red-400 p-1">🗑️</button>
                </div>
              </div>

              {(goal.specific || goal.measurable || goal.timeBound) && (
                <div className="text-[11px] text-gray-400 space-y-1 bg-[#0d131d] p-3 rounded-xl border border-gray-800/80">
                  {goal.specific && <div>🎯 <b>{lang === 'ar' ? 'محدد:' : 'Specific:'}</b> {goal.specific}</div>}
                  {goal.measurable && <div>📊 <b>{lang === 'ar' ? 'القياس:' : 'Measurable:'}</b> {goal.measurable}</div>}
                  {goal.timeBound && <div>⏱️ <b>{lang === 'ar' ? 'الوقت:' : 'Time-bound:'}</b> {goal.timeBound}</div>}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* شريط التنقل السفلي الثابت والأزرار الأربعة كاملة */}
      <div className="fixed bottom-0 left-0 right-0 bg-[#131a26]/90 backdrop-blur-lg border-t border-gray-800 py-3 px-6 flex justify-around items-center z-50 text-xs font-bold">
        <Link href="/" className="text-gray-400 hover:text-white transition">{lang === 'ar' ? '✅ العادات' : '✅ Habits'}</Link>
        <Link href="/history" className="text-gray-400 hover:text-white transition">{lang === 'ar' ? '📅 السجل' : '📅 History'}</Link>
        <Link href="/goals" className="text-blue-400">{lang === 'ar' ? '🏆 الأهداف الذكية' : '🏆 SMART Goals'}</Link>
        <Link href="/stats" className="text-gray-400 hover:text-white transition">{lang === 'ar' ? '📊 الإحصائيات' : '📊 Statistics'}</Link>
      </div>

    </div>
  );
}