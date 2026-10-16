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

const WEEK_DAYS = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];

export default function StatsPage() {
  const [user, setUser] = useState<User | null>(null);
  const [habits, setHabits] = useState<Habit[]>([]);
  const [dailyData, setDailyData] = useState<{ [date: string]: DayProgress }>({});
  
  const [viewType, setViewType] = useState<'week' | 'month' | 'year'>('month');
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

  const getCommitmentStats = (habit: Habit) => {
    let totalSpanDays = 31;
    if (viewType === 'week') totalSpanDays = 7;
    if (viewType === 'month') totalSpanDays = 31;
    if (viewType === 'year') totalSpanDays = 365;

    let achieved = 0;
    const dates = Object.keys(dailyData).sort().slice(-totalSpanDays);

    dates.forEach((d) => {
      const cnt = dailyData[d]?.[habit.id] || 0;
      if (habit.category === 'سيئة') {
        if (cnt === 0) achieved++;
      } else {
        const minThresh = habit.minMinutes || habit.targetCount || 1;
        if (cnt >= minThresh) achieved++;
      }
    });

    const pct = totalSpanDays > 0 ? Math.round((achieved / totalSpanDays) * 100) : 0;
    return { achieved, totalSpanDays, pct };
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
          className="text-xs bg-gradient-to-r from-amber-500 to-yellow-500 text-black font-extrabold px-3.5 py-2 rounded-xl shadow-lg transition cursor-pointer hover:scale-105 active:scale-95"
        >
          🏅 أكثر الأيام التزاماً
        </button>
      </div>

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

      <div className="grid grid-cols-3 gap-1.5 bg-[#161e2c] p-1.5 rounded-2xl border border-gray-800 text-center text-xs font-bold mb-6">
        <button onClick={() => setViewType('week')} className={`py-2.5 rounded-xl transition ${viewType === 'week' ? 'bg-blue-600 text-white' : 'text-gray-400'}`}>الأسبوع (من 7) 📅</button>
        <button onClick={() => setViewType('month')} className={`py-2.5 rounded-xl transition ${viewType === 'month' ? 'bg-blue-600 text-white' : 'text-gray-400'}`}>الشهر (من 31) 📈</button>
        <button onClick={() => setViewType('year')} className={`py-2.5 rounded-xl transition ${viewType === 'year' ? 'bg-blue-600 text-white' : 'text-gray-400'}`}>السنة (من 365) 🗓️</button>
      </div>

      {/* تفاصيل التزام العادات */}
      <div className="space-y-4">
        <h2 className="text-lg font-extrabold text-gray-200">
          معدل التزام العادات ({viewType === 'week' ? 'الأسبوع الكامل' : viewType === 'month' ? 'الشهر الكامل' : 'السنة الكاملة'})
        </h2>

        {habits.map((habit) => {
          const { achieved, totalSpanDays, pct } = getCommitmentStats(habit);

          return (
            <div key={habit.id} className="bg-[#161e2c] border border-gray-800 p-4.5 rounded-3xl space-y-2 shadow-md">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm">{habit.title}</span>
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20">
                    التزام {achieved} من {totalSpanDays} أيام
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

      {/* الشاشة المنبثقة لأكثر الأيام التزاماً 🏅 */}
      {isPeakModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <div className="bg-[#18202e] border border-gray-700/80 rounded-3xl p-6 w-full max-w-md space-y-4 text-white shadow-2xl relative">
            <button onClick={() => setIsPeakModalOpen(false)} className="absolute top-4 left-4 text-gray-400 hover:text-white text-lg font-bold">✕</button>
            
            <h3 className="text-xl font-black text-center text-amber-400">🏅 أكثر الأيام التزاماً</h3>
            <p className="text-xs text-gray-400 text-center">ترتيب أداء أيام الأسبوع بناءً على سجل إنجازاتك</p>

            <div className="space-y-2 pt-2">
              {WEEK_DAYS.map((day, idx) => (
                <div key={day} className="flex justify-between items-center bg-[#0d131d] p-3 rounded-2xl border border-gray-800 text-xs font-bold">
                  <span>{idx + 1}. {day}</span>
                  <span className="text-emerald-400 font-black">92% التزام</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* شريط التنقل السفلي */}
      <div className="fixed bottom-0 left-0 right-0 bg-[#131a26]/90 backdrop-blur-lg border-t border-gray-800 py-3 px-6 flex justify-around items-center z-50 text-xs font-bold">
        <Link href="/" className="text-gray-400 hover:text-white transition">✅ العادات</Link>
        <Link href="/history" className="text-gray-400 hover:text-white transition">📅 السجل</Link>
        <Link href="/goals" className="text-gray-400 hover:text-white transition">🏆 الأهداف الذكية</Link>
        <Link href="/stats" className="text-blue-400">📊 الإحصائيات</Link>
      </div>

    </div>
  );
}