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
  
  const [viewType, setViewType] = useState<'day' | 'week' | 'month'>('week');
  const [selectedMonthIndex, setSelectedMonthIndex] = useState<number>(new Date().getMonth());
  const [selectedWeekOffset, setSelectedWeekOffset] = useState<number>(0);
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

  const getLocalDateString = (d = new Date()) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // حاسبة الأسبوع الحالي أو المختار بناءً على الأوفسيت
  const getWeekDateRange = (offset = 0) => {
    const now = new Date();
    const currentDayOfWeek = now.getDay(); 
    const distanceToSaturday = (currentDayOfWeek + 1) % 7;
    
    const saturday = new Date(now);
    saturday.setDate(now.getDate() - distanceToSaturday + (offset * 7));

    const weekDates: string[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(saturday);
      d.setDate(saturday.getDate() + i);
      weekDates.push(getLocalDateString(d));
    }
    return weekDates;
  };

  const currentWeekDates = getWeekDateRange(selectedWeekOffset);

  // حساب نسبة اليوم الواحدة
  const getSingleDayPercentage = (dateStr: string) => {
    if (habits.length === 0) return 0;
    let score = 0;
    habits.forEach((h) => {
      const cnt = dailyData[dateStr]?.[h.id] || 0;
      if (h.category === 'سيئة') {
        score += cnt === 0 ? 1 : 0;
      } else {
        score += Math.min(1, cnt / (h.targetCount || 1));
      }
    });
    return Math.round((score / habits.length) * 100);
  };

  // الإحصائيات الأسبوعية
  const calculateWeekStats = () => {
    let sumPct = 0;
    currentWeekDates.forEach((d) => {
      sumPct += getSingleDayPercentage(d);
    });
    return Math.round(sumPct / 7);
  };

  // الإحصائيات الشهرية
  const calculateMonthStats = () => {
    const year = new Date().getFullYear();
    const dates = Object.keys(dailyData).filter((d) => {
      const [y, m] = d.split('-');
      return parseInt(y, 10) === year && parseInt(m, 10) === selectedMonthIndex + 1;
    });

    if (dates.length === 0) return 0;
    let sumPct = 0;
    dates.forEach((d) => {
      sumPct += getSingleDayPercentage(d);
    });
    return Math.round(sumPct / dates.length);
  };

  // حساب الالتزام وأيام الإنجاز لكل عادة
  const getHabitCommitment = (habit: Habit, scope: 'week' | 'month') => {
    let targetDates: string[] = [];
    
    if (scope === 'week') {
      targetDates = currentWeekDates;
    } else {
      const year = new Date().getFullYear();
      targetDates = Object.keys(dailyData).filter((d) => {
        const [y, m] = d.split('-');
        return parseInt(y, 10) === year && parseInt(m, 10) === selectedMonthIndex + 1;
      });
      if (targetDates.length === 0) {
        const today = new Date();
        const daysInMonth = new Date(year, selectedMonthIndex + 1, 0).getDate();
        for (let i = 1; i <= daysInMonth; i++) {
          targetDates.push(`${year}-${String(selectedMonthIndex + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`);
        }
      }
    }

    let achievedDays = 0;
    targetDates.forEach((d) => {
      const cnt = dailyData[d]?.[habit.id] || 0;
      if (habit.category === 'سيئة') {
        if (cnt === 0) achievedDays++;
      } else {
        if (cnt >= (habit.targetCount || 1)) achievedDays++;
      }
    });

    const totalDays = targetDates.length;
    const pct = totalDays > 0 ? Math.round((achievedDays / totalDays) * 100) : 0;

    return { achievedDays, totalDays, pct };
  };

  // إيجاد أكثر الأيام التزاماً
  const getPeakDaysAnalysis = () => {
    const dayTotals: { [dayIndex: number]: { sumPct: number; count: number } } = {
      0: { sumPct: 0, count: 0 },
      1: { sumPct: 0, count: 0 },
      2: { sumPct: 0, count: 0 },
      3: { sumPct: 0, count: 0 },
      4: { sumPct: 0, count: 0 },
      5: { sumPct: 0, count: 0 },
      6: { sumPct: 0, count: 0 },
    };

    Object.keys(dailyData).forEach((dateStr) => {
      const d = new Date(dateStr);
      const dayIdx = d.getDay();
      const pct = getSingleDayPercentage(dateStr);
      dayTotals[dayIdx].sumPct += pct;
      dayTotals[dayIdx].count += 1;
    });

    const results = WEEK_DAYS.map((name, idx) => {
      // تعديل فهرس الأسبوع باللغة العربية (السبت = 6)
      const standardDayIdx = (idx + 6) % 7; 
      const item = dayTotals[standardDayIdx];
      const avg = item.count > 0 ? Math.round(item.sumPct / item.count) : 0;
      return { dayName: name, avgPct: avg };
    });

    results.sort((a, b) => b.avgPct - a.avgPct);
    return results;
  };

  const peakAnalysis = getPeakDaysAnalysis();

  return (
    <div className="max-w-4xl mx-auto min-h-screen bg-[#0d131d] text-white p-4 md:p-8 font-sans pb-28 dir-rtl text-right select-none" dir="rtl">
      
      {/* 1. الترويسة */}
      <div className="flex justify-between items-center mb-6 pt-2">
        <div>
          <h1 className="text-xl md:text-2xl font-extrabold bg-gradient-to-r from-white via-gray-200 to-gray-400 bg-clip-text text-transparent">
            الإحصائيات والتحليل 📊
          </h1>
          <p className="text-xs text-gray-400 font-medium">تتبع تطورك ونسبة التزامك بالأرقام والنسب المئوية</p>
        </div>

        <button
          onClick={() => setIsPeakModalOpen(true)}
          className="text-xs bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-black font-extrabold px-3.5 py-2 rounded-xl shadow-lg shadow-yellow-500/20 transition flex items-center gap-1"
        >
          <span>🏅 أكثر الأيام التزاماً</span>
        </button>
      </div>

      {/* 2. شريط التبديل للعرض */}
      <div className="grid grid-cols-3 gap-2 bg-[#161e2c] p-1.5 rounded-2xl border border-gray-800 text-center text-xs font-bold mb-6">
        <button
          onClick={() => setViewType('day')}
          className={`py-2.5 rounded-xl transition ${
            viewType === 'day' ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-400 hover:text-white'
          }`}
        >
          اليوم 📆
        </button>
        <button
          onClick={() => setViewType('week')}
          className={`py-2.5 rounded-xl transition ${
            viewType === 'week' ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-400 hover:text-white'
          }`}
        >
          الأسبوع (سبت - جمعة) 📅
        </button>
        <button
          onClick={() => setViewType('month')}
          className={`py-2.5 rounded-xl transition ${
            viewType === 'month' ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-400 hover:text-white'
          }`}
        >
          الشهر التقويمي 📈
        </button>
      </div>

      {/* محدد الأسبوع المضاف حديثاً */}
      {viewType === 'week' && (
        <div className="bg-[#161e2c] border border-gray-800 p-3 rounded-2xl mb-6 flex justify-between items-center text-xs font-bold">
          <span className="text-gray-400">اختر الأسبوع:</span>
          <div className="flex gap-2">
            <button
              onClick={() => setSelectedWeekOffset((prev) => prev - 1)}
              className="bg-gray-800 hover:bg-gray-700 text-white px-3 py-1.5 rounded-xl transition"
            >
              ← الأسبوع السابق
            </button>
            <button
              onClick={() => setSelectedWeekOffset(0)}
              className="bg-blue-600 text-white px-3 py-1.5 rounded-xl transition"
            >
              الأسبوع الحالي
            </button>
            <button
              onClick={() => setSelectedWeekOffset((prev) => prev + 1)}
              className="bg-gray-800 hover:bg-gray-700 text-white px-3 py-1.5 rounded-xl transition"
            >
              الأسبوع التالي →
            </button>
          </div>
        </div>
      )}

      {/* محدد الشهر */}
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

      {/* 3. كارت النسبة الإجمالية المئوية */}
      <div className="bg-[#161e2c] border border-gray-800 p-6 rounded-3xl text-center shadow-xl space-y-3 mb-6 relative overflow-hidden">
        <span className="text-xs text-blue-400 font-bold block">
          {viewType === 'day' ? 'متوسط إنجاز اليوم الحالي' : viewType === 'week' ? `متوسط إنجاز الأسبوع (${currentWeekDates[0]} إلى ${currentWeekDates[6]})` : `متوسط إنجاز شهر ${MONTH_NAMES[selectedMonthIndex]}`}
        </span>
        <div className="text-5xl font-black text-white">
          %{viewType === 'day' ? getSingleDayPercentage(getLocalDateString()) : viewType === 'week' ? calculateWeekStats() : calculateMonthStats()}
        </div>
        <div className="w-24 h-24 mx-auto rounded-full border-4 border-blue-500/40 flex items-center justify-center bg-blue-600/10 text-xl font-bold text-blue-300">
          %{viewType === 'day' ? getSingleDayPercentage(getLocalDateString()) : viewType === 'week' ? calculateWeekStats() : calculateMonthStats()}
        </div>
      </div>

      {/* 4. الرسم البياني للأسبوع */}
      {viewType === 'week' && (
        <div className="bg-[#161e2c] border border-gray-800 p-5 rounded-3xl mb-8 space-y-4">
          <h2 className="text-sm font-bold text-gray-300">تفاصيل الأسبوع:</h2>
          <div className="grid grid-cols-7 gap-2 items-end h-32 pt-4">
            {currentWeekDates.map((d, idx) => {
              const pct = getSingleDayPercentage(d);
              return (
                <div key={d} className="flex flex-col items-center gap-1 h-full justify-end">
                  <span className="text-[10px] font-bold text-blue-400">%{pct}</span>
                  <div className="w-full bg-gray-800 rounded-t-xl h-full flex items-end overflow-hidden p-0.5">
                    <div 
                      style={{ height: `${Math.max(5, pct)}%` }} 
                      className="w-full bg-gradient-to-t from-blue-600 to-indigo-500 rounded-t-lg transition-all duration-500"
                    />
                  </div>
                  <span className="text-[10px] text-gray-400 font-bold mt-1">{WEEK_DAYS[idx]}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 5. تفاصيل الالتزام لكل عادة بالأيام والنسب المئوية */}
      <div className="space-y-4">
        <h2 className="text-lg font-extrabold text-gray-200">
          معدل التزام العادات ({viewType === 'week' ? 'أسبوعياً' : 'شهرياً'})
        </h2>

        {habits.length === 0 ? (
          <div className="text-center py-12 text-gray-500 text-sm bg-[#131a26] rounded-3xl border border-dashed border-gray-800">
            لا توجد عادات مسجلة للتحليل.
          </div>
        ) : (
          habits.map((habit) => {
            const scope = viewType === 'month' ? 'month' : 'week';
            const { achievedDays, totalDays, pct } = getHabitCommitment(habit, scope);

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
          })
        )}
      </div>

      {/* النافذة المنبثقة لأكثر الأيام التزاماً 🏅 */}
      {isPeakModalOpen && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <div className="bg-[#18202e] border border-gray-700/80 rounded-3xl p-6 w-full max-w-sm space-y-5 text-white shadow-2xl relative text-center">
            <button 
              onClick={() => setIsPeakModalOpen(false)} 
              className="absolute top-4 left-4 text-gray-400 hover:text-white text-lg font-bold"
            >
              ✕
            </button>

            <div className="text-4xl my-2">🏅</div>
            <h3 className="text-xl font-black">أكثر الأيام التزاماً بأداء العادات</h3>
            <p className="text-xs text-gray-400">تحليل المعتاد اليومي بناءً على سجلك التراكمي</p>

            <div className="space-y-2.5 text-right pt-2">
              {peakAnalysis.map((item, idx) => (
                <div 
                  key={item.dayName} 
                  className={`p-3 rounded-2xl border flex justify-between items-center ${
                    idx === 0 
                      ? 'bg-amber-500/20 border-amber-500/50 text-amber-200 font-extrabold' 
                      : 'bg-[#0d131d] border-gray-800 text-gray-300 text-xs'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span>{idx === 0 ? '👑 الأفضل:' : `#${idx + 1}`}</span>
                    <span>{item.dayName}</span>
                  </div>
                  <span className="font-bold text-blue-400">%{item.avgPct} معدل التزام</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

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