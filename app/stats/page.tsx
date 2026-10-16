'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../../lib/firebase';
import { Habit } from '../../components/HabitCard';

export interface DayProgress {
  [habitId: string]: number;
}

const MONTH_NAMES = [
  'يناير (1)', 'فبراير (2)', 'مارس (3)', 'أبريل (4)', 
  'مايو (5)', 'يونيو (6)', 'يوليو (7)', 'أغسطس (8)', 
  'سبتمبر (9)', 'أكتوبر (10)', 'نوفمبر (11)', 'ديسمبر (12)'
];

const WEEK_DAYS = ['السبت', 'الأحد', 'الافتنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة'];

export default function StatsPage() {
  const [user, setUser] = useState<User | null>(null);
  const [habits, setHabits] = useState<Habit[]>([]);
  const [dailyData, setDailyData] = useState<{ [date: string]: DayProgress }>({});
  
  const [viewType, setViewType] = useState<'day' | 'week' | 'month' | 'year'>('month');
  const [selectedMonthIndex, setSelectedMonthIndex] = useState<number>(new Date().getMonth());
  const [isPeakModalOpen, setIsPeakModalOpen] = useState(false);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        const userDocRef = doc(db, 'users', currentUser.uid);
        const unsubscribeSnapshot = onSnapshot(userDocRef, (docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data();
            if (data.habits) setHabits(data.habits);
            if (data.dailyData) setDailyData(data.dailyData);
          }
        });
        return () => unsubscribeSnapshot();
      } else {
        const savedHabits = localStorage.getItem('habit_tracker_habits');
        if (savedHabits) setHabits(JSON.parse(savedHabits));
        const savedDaily = localStorage.getItem('habit_tracker_daily');
        if (savedDaily) setDailyData(JSON.parse(savedDaily));
      }
    });

    return () => unsubscribeAuth();
  }, []);

  const getDaysInMonth = (year: number, monthIndex: number) => {
    return new Date(year, monthIndex + 1, 0).getDate();
  };

  const getHabitMonthlyCommitment = (habit: Habit) => {
    const year = new Date().getFullYear();
    const totalDaysInMonth = getDaysInMonth(year, selectedMonthIndex);
    
    let achievedDays = 0;
    let habitScheduledDays = 0;

    for (let day = 1; day <= totalDaysInMonth; day++) {
      const dateStr = `${year}-${String(selectedMonthIndex + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const dayOfWeek = new Date(year, selectedMonthIndex, day).getDay();

      const isScheduled = !habit.repeatDays || habit.repeatDays.includes(dayOfWeek);

      if (isScheduled) {
        habitScheduledDays++;
        const cnt = dailyData[dateStr]?.[habit.id] || 0;
        if (habit.category === 'سيئة') {
          if (cnt === 0) achievedDays++;
        } else {
          const minThresh = habit.minMinutes || habit.targetCount || 1;
          if (cnt >= minThresh) achievedDays++;
        }
      }
    }

    const pct = habitScheduledDays > 0 ? Math.round((achievedDays / habitScheduledDays) * 100) : 0;
    return { achievedDays, totalDays: habitScheduledDays, pct };
  };

  return (
    <div className="max-w-4xl mx-auto min-h-screen bg-[#0d131d] text-white p-4 md:p-8 font-sans pb-28 dir-rtl text-right select-none" dir="rtl">
      
      <div className="flex justify-between items-center mb-6 pt-2">
        <div>
          <h1 className="text-xl md:text-2xl font-extrabold bg-gradient-to-r from-white via-gray-200 to-gray-400 bg-clip-text text-transparent">
            الإحصائيات والتحليل 📊
          </h1>
          <p className="text-xs text-gray-400 font-medium">تتبع تطورك ونسبة التزامك بالأرقام والدقة</p>
        </div>

        <button
          onClick={() => setIsPeakModalOpen(true)}
          className="text-xs bg-gradient-to-r from-amber-500 to-yellow-500 text-black font-extrabold px-3.5 py-2 rounded-xl shadow-lg transition"
        >
          🏅 أكثر الأيام التزاماً
        </button>
      </div>

      {/* كارت سجل الأرقام القياسية */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className="bg-[#161e2c] border border-gray-800 p-4 rounded-3xl text-center space-y-1">
          <span className="text-2xl">🔥</span>
          <span className="text-xs font-bold text-gray-400 block">السلسلة الحالية</span>
          <span className="text-xl font-black text-amber-400">12 يوماً</span>
        </div>
        <div className="bg-[#161e2c] border border-gray-800 p-4 rounded-3xl text-center space-y-1">
          <span className="text-2xl">🏆</span>
          <span className="text-xs font-bold text-gray-400 block">أعلى سلسلة تاريخية</span>
          <span className="text-xl font-black text-emerald-400">35 يوماً</span>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-1.5 bg-[#161e2c] p-1.5 rounded-2xl border border-gray-800 text-center text-xs font-bold mb-6">
        <button onClick={() => setViewType('day')} className={`py-2.5 rounded-xl ${viewType === 'day' ? 'bg-blue-600 text-white' : 'text-gray-400'}`}>اليوم 📆</button>
        <button onClick={() => setViewType('week')} className={`py-2.5 rounded-xl ${viewType === 'week' ? 'bg-blue-600 text-white' : 'text-gray-400'}`}>الأسبوع 📅</button>
        <button onClick={() => setViewType('month')} className={`py-2.5 rounded-xl ${viewType === 'month' ? 'bg-blue-600 text-white' : 'text-gray-400'}`}>الشهر 📈</button>
        <button onClick={() => setViewType('year')} className={`py-2.5 rounded-xl ${viewType === 'year' ? 'bg-blue-600 text-white' : 'text-gray-400'}`}>السنة الكاملة 🗓️</button>
      </div>

      {viewType === 'month' && (
        <div className="bg-[#161e2c] border border-gray-800 p-3 rounded-2xl mb-6 flex justify-between items-center text-xs font-bold">
          <span className="text-gray-400">اختر الشهر المالي/التقويمي:</span>
          <select
            value={selectedMonthIndex}
            onChange={(e) => setSelectedMonthIndex(Number(e.target.value))}
            className="bg-[#0d131d] border border-gray-700 text-white p-2 rounded-xl outline-none text-xs font-bold cursor-pointer"
          >
            {MONTH_NAMES.map((name, idx) => (
              <option key={idx} value={idx}>{name}</option>
            ))}
          </select>
        </div>
      )}

      {/* تفاصيل التزام العادات */}
      <div className="space-y-4">
        <h2 className="text-lg font-extrabold text-gray-200">
          معدل التزام العادات ({viewType === 'year' ? 'السنة الكاملة' : 'الشهر الكامل'})
        </h2>

        {habits.map((habit) => {
          const { achievedDays, totalDays, pct } = getHabitMonthlyCommitment(habit);

          return (
            <div key={habit.id} className="bg-[#161e2c] border border-gray-800 p-4.5 rounded-3xl space-y-2 shadow-md">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm">{habit.title}</span>
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20">
                    التزام {achievedDays} من {totalDays} أيام
                  </span>
                </div>
                <span className="text-sm font-black text-emerald-400">%{pct}</span>
              </div>
              <div className="w-full bg-gray-800 h-2.5 rounded-full overflow-hidden">
                <div 
                  style={{ width: `${pct}%`, backgroundColor: habit.color || '#3b82f6' }} 
                  className="h-full rounded-full transition-all duration-500"
                />
              </div>
            </div>
          );
        })}
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-[#131a26]/90 backdrop-blur-lg border-t border-gray-800 py-3 px-6 flex justify-around items-center z-50 text-xs font-bold">
        <Link href="/" className="text-gray-400 hover:text-white transition">✅ العادات</Link>
        <Link href="/goals" className="text-gray-400 hover:text-white transition">🏆 الأهداف الذكية</Link>
        <Link href="/stats" className="text-blue-400">📊 الإحصائيات</Link>
      </div>

    </div>
  );
}