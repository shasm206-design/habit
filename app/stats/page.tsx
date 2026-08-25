'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../../lib/firebase';

export interface Habit {
  id: string;
  title: string;
  type: 'عداد' | 'مؤقت' | 'مهمة';
  targetCount: number;
  unit: string;
  color: string;
  repeatDays: number[];
  category?: 'إيجابية' | 'سيئة';
}

export interface DayProgress {
  [habitId: string]: number;
}

const MONTH_NAMES = [
  'يناير (1)', 'فبراير (2)', 'مارس (3)', 'أبريل (4)',
  'مايو (5)', 'يونيو (6)', 'يوليو (7)', 'أغسطس (8)',
  'سبتمبر (9)', 'أكتوبر (10)', 'نوفمبر (11)', 'ديسمبر (12)'
];

export default function StatsPage() {
  const [user, setUser] = useState<User | null>(null);
  const [habits, setHabits] = useState<Habit[]>([]);
  const [dailyData, setDailyData] = useState<{ [date: string]: DayProgress }>({});
  const [activeTab, setActiveTab] = useState<'day' | 'week' | 'month'>('week');
  
  // حالة اختيار الشهر والسنة
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());

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

  const getDayPercentage = (dateStr: string) => {
    if (habits.length === 0) return 0;
    const dayData = dailyData[dateStr] || {};
    const totalAcc = habits.reduce((acc, h) => {
      const count = dayData[h.id] || 0;
      return acc + Math.min(1, count / (h.targetCount || 1));
    }, 0);
    return Math.round((totalAcc / habits.length) * 100);
  };

  // جلب أيام الأسبوع الحالي بالتحديد من السبت إلى الجمعة
  const getCurrentWeekSaturdayToFriday = () => {
    const now = new Date();
    const currentDayOfWeek = now.getDay();
    const distanceToSaturday = (currentDayOfWeek + 1) % 7;
    const saturday = new Date(now);
    saturday.setDate(now.getDate() - distanceToSaturday);

    const weekDates: { dateStr: string; dayName: string }[] = [];
    const dayNames = ['السبت', 'الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة'];

    for (let i = 0; i < 7; i++) {
      const d = new Date(saturday);
      d.setDate(saturday.getDate() + i);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      weekDates.push({
        dateStr: `${year}-${month}-${day}`,
        dayName: dayNames[i],
      });
    }

    return weekDates;
  };

  // جلب جميع تواريخ الشهر التقويمي المختار
  const getDatesOfSelectedMonth = () => {
    const numDays = new Date(selectedYear, selectedMonth + 1, 0).getDate();
    const dates: string[] = [];
    const monthStr = String(selectedMonth + 1).padStart(2, '0');

    for (let i = 1; i <= numDays; i++) {
      const dayStr = String(i).padStart(2, '0');
      dates.push(`${selectedYear}-${monthStr}-${dayStr}`);
    }
    return dates;
  };

  const currentWeekDays = getCurrentWeekSaturdayToFriday();
  const todayStr = new Date().toISOString().split('T')[0];
  const todayPct = getDayPercentage(todayStr);

  const weekPct = Math.round(
    currentWeekDays.reduce((acc, d) => acc + getDayPercentage(d.dateStr), 0) / 7
  );

  const monthDates = getDatesOfSelectedMonth();
  const monthPct = Math.round(
    monthDates.reduce((acc, d) => acc + getDayPercentage(d), 0) / monthDates.length
  );

  const getHabitSelectedMonthStats = (habit: Habit) => {
    if (monthDates.length === 0) return 0;
    const totalCompletions = monthDates.reduce((acc, dateStr) => {
      const count = dailyData[dateStr]?.[habit.id] || 0;
      return acc + (count >= habit.targetCount ? 1 : count / habit.targetCount);
    }, 0);
    return Math.min(100, Math.round((totalCompletions / monthDates.length) * 100));
  };

  return (
    <div className="max-w-4xl mx-auto min-h-screen bg-[#0d131d] text-white p-4 md:p-8 font-sans pb-28 dir-rtl text-right select-none" dir="rtl">
      
      {/* الترويسة العليا */}
      <div className="flex justify-between items-center mb-6 pt-2 border-b border-gray-800 pb-4">
        <div>
          <h1 className="text-2xl font-black bg-gradient-to-r from-blue-400 via-indigo-300 to-white bg-clip-text text-transparent">
            📊 لوحة الإحصائيات الشاملة
          </h1>
          <p className="text-xs text-gray-400 mt-1">تتبع تطورك ونسبة التزامك بالأرقام والنسب المئوية</p>
        </div>
      </div>

      {/* شريط تبويب النطاق الزمني */}
      <div className="grid grid-cols-3 gap-2 bg-[#161e2c] p-1.5 rounded-2xl border border-gray-700/80 mb-6 text-center text-xs font-bold">
        <button
          onClick={() => setActiveTab('day')}
          className={`py-2.5 rounded-xl transition ${
            activeTab === 'day' ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg' : 'text-gray-400 hover:text-white'
          }`}
        >
          اليوم 📅
        </button>
        <button
          onClick={() => setActiveTab('week')}
          className={`py-2.5 rounded-xl transition ${
            activeTab === 'week' ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg' : 'text-gray-400 hover:text-white'
          }`}
        >
          الأسبوع (سبت - جمعة) 🗓️
        </button>
        <button
          onClick={() => setActiveTab('month')}
          className={`py-2.5 rounded-xl transition ${
            activeTab === 'month' ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg' : 'text-gray-400 hover:text-white'
          }`}
        >
          الشهر التقويمي 📈
        </button>
      </div>

      {/* اختيار الشهر التقويمي (يظهر فقط عند اختيار تبويب الشهر) */}
      {activeTab === 'month' && (
        <div className="bg-[#161e2c] p-4 rounded-2xl border border-gray-700/80 mb-6 flex justify-between items-center">
          <label className="text-xs font-bold text-gray-300">اختر الشهر المالي/التقويمي:</label>
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(Number(e.target.value))}
            className="bg-[#0d131d] text-blue-400 font-bold p-2 rounded-xl border border-gray-700 outline-none text-xs cursor-pointer"
          >
            {MONTH_NAMES.map((name, index) => (
              <option key={index} value={index}>
                {name}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* ملخص الإنجاز الرئيسي */}
      <div className="bg-gradient-to-r from-[#18202e] to-[#131a26] p-6 rounded-3xl border border-gray-700/70 shadow-2xl mb-8 flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="space-y-2 text-center md:text-right">
          <span className="text-xs font-bold text-blue-400 uppercase tracking-widest block">
            {activeTab === 'day' 
              ? 'نسبة إنجاز اليوم' 
              : activeTab === 'week' 
              ? 'متوسط إنجاز الأسبوع الحالي' 
              : `متوسط إنجاز شهر ${MONTH_NAMES[selectedMonth]}`}
          </span>
          <h2 className="text-4xl font-black">
            {activeTab === 'day' ? `%${todayPct}` : activeTab === 'week' ? `%${weekPct}` : `%${monthPct}`}
          </h2>
          <p className="text-xs text-gray-400">
            {activeTab === 'day'
              ? 'مبني على جميع العادات المستهدفة لهذا اليوم'
              : activeTab === 'week'
              ? 'مستوى أدائك من السبت وحتى الجمعة'
              : `إجمالي الالتزام لجميع أيام شهر ${MONTH_NAMES[selectedMonth]}`}
          </p>
        </div>

        <div className="w-28 h-28 rounded-full border-4 border-blue-500/30 flex items-center justify-center bg-blue-600/10 shadow-inner relative">
          <span className="text-2xl font-black text-blue-400">
            {activeTab === 'day' ? `%${todayPct}` : activeTab === 'week' ? `%${weekPct}` : `%${monthPct}`}
          </span>
        </div>
      </div>

      {/* الرسم البياني الأسبوعي (من السبت إلى الجمعة) */}
      {activeTab === 'week' && (
        <div className="bg-[#161e2c] p-6 rounded-3xl border border-gray-700/60 shadow-lg mb-8">
          <h3 className="text-sm font-bold text-gray-300 mb-4">تفاصيل الأسبوع الحالي (السبت - الجمعة):</h3>
          <div className="flex justify-between items-end gap-2 h-36 pt-4">
            {currentWeekDays.map((item) => {
              const pct = getDayPercentage(item.dateStr);
              return (
                <div key={item.dateStr} className="flex-1 flex flex-col items-center gap-2 h-full justify-end">
                  <span className="text-[10px] font-bold text-blue-400">%{pct}</span>
                  <div className="w-full bg-gray-800 rounded-t-xl overflow-hidden h-24 flex items-end">
                    <div
                      style={{ height: `${pct}%` }}
                      className="w-full bg-gradient-to-t from-blue-600 to-indigo-400 rounded-t-xl transition-all duration-500"
                    />
                  </div>
                  <span className="text-[10px] text-gray-400 font-bold">{item.dayName}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* قائمة العادات */}
      <div className="space-y-4">
        <h3 className="text-lg font-bold">
          معدل التزام العادات ({activeTab === 'month' ? `شهر ${MONTH_NAMES[selectedMonth]}` : activeTab === 'week' ? 'أسبوعياً' : 'اليوم'})
        </h3>
        {habits.length === 0 ? (
          <div className="text-center py-8 text-gray-500 text-sm bg-[#131a26] rounded-3xl border border-dashed border-gray-800">
            لا توجد عادات مضافة لحساب الإحصائيات.
          </div>
        ) : (
          habits.map((habit) => {
            const hPct = activeTab === 'day' 
              ? Math.min(100, Math.round(((dailyData[todayStr]?.[habit.id] || 0) / habit.targetCount) * 100))
              : activeTab === 'week'
              ? Math.min(100, Math.round((currentWeekDays.reduce((acc, d) => acc + (dailyData[d.dateStr]?.[habit.id] || 0) / habit.targetCount, 0) / 7) * 100))
              : getHabitSelectedMonthStats(habit);

            return (
              <div key={habit.id} className="bg-[#161e2c] p-4 rounded-3xl border border-gray-700/60 shadow-md space-y-2">
                <div className="flex justify-between items-center text-sm font-bold">
                  <div className="flex items-center gap-2">
                    <span 
                      style={{ backgroundColor: `${habit.color || '#3b82f6'}25`, color: habit.color || '#3b82f6' }}
                      className="w-7 h-7 rounded-xl flex items-center justify-center text-xs"
                    >
                      ●
                    </span>
                    <span>{habit.title}</span>
                  </div>
                  <span style={{ color: habit.color || '#3b82f6' }} className="font-black">%{hPct}</span>
                </div>

                <div className="w-full bg-gray-800 h-2.5 rounded-full overflow-hidden">
                  <div
                    style={{ width: `${hPct}%`, backgroundColor: habit.color || '#3b82f6' }}
                    className="h-full rounded-full transition-all duration-500"
                  />
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* شريط التنقل السفلي الثابت */}
      <div className="fixed bottom-0 left-0 right-0 bg-[#131a26]/90 backdrop-blur-lg border-t border-gray-800 py-3 px-6 flex justify-around items-center z-50">
        <Link href="/" className="flex flex-col items-center gap-1 text-gray-400 hover:text-white transition">
          <span className="text-xl">✅</span>
          <span className="text-[10px] font-bold">العادات</span>
        </Link>
        <Link href="/history" className="flex flex-col items-center gap-1 text-gray-400 hover:text-white transition">
          <span className="text-xl">📅</span>
          <span className="text-[10px] font-bold">السجل</span>
        </Link>
        <Link href="/stats" className="flex flex-col items-center gap-1 text-blue-400 font-bold">
          <span className="text-xl">📊</span>
          <span className="text-[10px]">الإحصائيات</span>
        </Link>
      </div>

    </div>
  );
}