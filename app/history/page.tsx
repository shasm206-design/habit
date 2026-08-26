'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, setDoc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../../lib/firebase';
import { Habit } from '../../components/HabitCard';

export interface DayProgress {
  [habitId: string]: number;
}

export interface TaskItem {
  id: string;
  title: string;
  completed: boolean;
}

const DAYS_NAME = ['أحد', 'إثنين', 'ثلاثاء', 'أربعاء', 'خميس', 'جمعة', 'سبت'];

export default function HistoryPage() {
  const [user, setUser] = useState<User | null>(null);
  const [habits, setHabits] = useState<Habit[]>([]);
  const [dailyData, setDailyData] = useState<{ [date: string]: DayProgress }>({});
  const [notes, setNotes] = useState<{ [date: string]: string }>({});
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [datesList, setDatesList] = useState<string[]>([]);
  const [dayNoteInput, setDayNoteInput] = useState<string>('');

  const getLocalDateString = (d = new Date()) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  useEffect(() => {
    const todayStr = getLocalDateString();
    setSelectedDate(todayStr);

    // توليد شريط الأيام (14 يوم سابقة مع اليوم والحديثة)
    const list: string[] = [];
    for (let i = -7; i <= 7; i++) {
      const d = new Date();
      d.setDate(d.getDate() + i);
      list.push(getLocalDateString(d));
    }
    setDatesList(list);

    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        const userDocRef = doc(db, 'users', currentUser.uid);
        const unsubscribeSnapshot = onSnapshot(userDocRef, (docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data();
            if (data.habits) setHabits(data.habits);
            if (data.dailyData) setDailyData(data.dailyData);
            if (data.notes) setNotes(data.notes);
          }
        });
        return () => unsubscribeSnapshot();
      } else {
        const savedHabits = localStorage.getItem('habit_tracker_habits');
        if (savedHabits) setHabits(JSON.parse(savedHabits));
        const savedDaily = localStorage.getItem('habit_tracker_daily');
        if (savedDaily) setDailyData(JSON.parse(savedDaily));
        const savedNotes = localStorage.getItem('habit_tracker_notes');
        if (savedNotes) setNotes(JSON.parse(savedNotes));
      }
    });

    return () => unsubscribeAuth();
  }, []);

  // تحديث نص الملاحظة عند تغيير اليوم المختار
  useEffect(() => {
    setDayNoteInput(notes[selectedDate] || '');
  }, [selectedDate, notes]);

  const saveNotesData = async (updatedNotes: { [date: string]: string }) => {
    setNotes(updatedNotes);
    if (user) {
      try {
        const userDocRef = doc(db, 'users', user.uid);
        await setDoc(userDocRef, { notes: updatedNotes }, { merge: true });
      } catch (err) {
        console.error('خطأ في حفظ الملاحظات:', err);
      }
    } else {
      localStorage.setItem('habit_tracker_notes', JSON.stringify(updatedNotes));
    }
  };

  const saveHabitsAndDaily = async (updatedDaily: { [date: string]: DayProgress }) => {
    setDailyData(updatedDaily);
    if (user) {
      try {
        const userDocRef = doc(db, 'users', user.uid);
        await setDoc(userDocRef, { dailyData: updatedDaily }, { merge: true });
      } catch (err) {
        console.error('خطأ في الحفظ:', err);
      }
    } else {
      localStorage.setItem('habit_tracker_daily', JSON.stringify(updatedDaily));
    }
  };

  const handleNoteChange = (text: string) => {
    setDayNoteInput(text);
    const updatedNotes = { ...notes, [selectedDate]: text };
    saveNotesData(updatedNotes);
  };

  const currentDayProgress = dailyData[selectedDate] || {};

  const getHabitCount = (habitId: string) => currentDayProgress[habitId] || 0;

  const updateHabitCount = (habitId: string, delta: number) => {
    const habit = habits.find((h) => h.id === habitId);
    if (!habit) return;
    const current = getHabitCount(habitId);
    const validCount = Math.max(0, current + delta);
    const updatedDay = { ...currentDayProgress, [habitId]: validCount };
    const updatedDaily = { ...dailyData, [selectedDate]: updatedDay };
    saveHabitsAndDaily(updatedDaily);
  };

  const getDayOfWeekIndex = (dateStr: string) => {
    if (!dateStr) return 0;
    return new Date(dateStr).getDay();
  };

  const calculateDayPercentage = (dateStr: string) => {
    const dayOfWeek = getDayOfWeekIndex(dateStr);
    const dayHabits = habits.filter((h) => !h.repeatDays || h.repeatDays.includes(dayOfWeek));
    if (dayHabits.length === 0) return 0;

    let totalScore = 0;
    dayHabits.forEach((h) => {
      const cnt = dailyData[dateStr]?.[h.id] || 0;
      if (h.category === 'سيئة') {
        totalScore += cnt === 0 ? 1 : 0;
      } else {
        totalScore += Math.min(1, cnt / (h.targetCount || 1));
      }
    });

    return Math.round((totalScore / dayHabits.length) * 100);
  };

  const visibleHabits = habits.filter((h) => 
    !h.repeatDays || h.repeatDays.includes(getDayOfWeekIndex(selectedDate))
  );

  return (
    <div className="max-w-4xl mx-auto min-h-screen bg-[#0d131d] text-white p-4 md:p-8 font-sans pb-28 dir-rtl text-right select-none" dir="rtl">
      
      {/* 1. الترويسة العليا */}
      <div className="flex justify-between items-center mb-6 pt-2">
        <div>
          <h1 className="text-xl md:text-2xl font-extrabold bg-gradient-to-r from-white via-gray-200 to-gray-400 bg-clip-text text-transparent">
            سجل الإنجازات والأرشيف 📑
          </h1>
          <p className="text-xs text-gray-400 font-medium">تصفح واستدرك إنجازاتك اليومية والملاحظات الشاطبة</p>
        </div>

        <div className="flex gap-2">
          <button 
            onClick={() => setSelectedDate(getLocalDateString())}
            className="text-xs bg-blue-600 hover:bg-blue-500 text-white font-bold px-3.5 py-2 rounded-xl shadow-lg transition"
          >
            اليوم
          </button>
        </div>
      </div>

      {/* 2. شريط الأيام الأفقي */}
      <div className="overflow-x-auto no-scrollbar mb-6 pb-2">
        <div className="flex gap-2 min-w-max">
          {datesList.map((dateStr) => {
            const d = new Date(dateStr);
            const dayName = DAYS_NAME[d.getDay()];
            const dayNum = d.getDate();
            const pct = calculateDayPercentage(dateStr);
            const isSelected = selectedDate === dateStr;

            return (
              <button
                key={dateStr}
                onClick={() => setSelectedDate(dateStr)}
                className={`flex flex-col items-center justify-between p-3 rounded-2xl min-w-[70px] border transition ${
                  isSelected 
                    ? 'bg-blue-600 border-blue-400 text-white shadow-lg shadow-blue-600/30 scale-105' 
                    : 'bg-[#161e2c] border-gray-800 text-gray-400 hover:text-white'
                }`}
              >
                <span className="text-[11px] font-bold">{dayName}</span>
                <span className="text-lg font-black my-0.5">{dayNum}</span>
                <span className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded-md ${
                  isSelected ? 'bg-black/20 text-white' : 'bg-gray-800 text-gray-300'
                }`}>
                  %{pct}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* تنبيه الاستدراك والتعديل المباشر */}
      <div className="p-3 bg-blue-500/10 border border-blue-500/30 text-blue-300 rounded-2xl text-xs font-bold text-center mb-6">
        💡 يمكنك التعديل والاستدراك على إنجازات ({selectedDate}) وتحديثها مباشرهً.
      </div>

      {/* 3. الإضافة الجديدة: قسم ملاحظات اليوم (تحت شريط الأيام وفوق العادات) 📝 */}
      <div className="bg-[#161e2c] border border-gray-700/80 rounded-3xl p-4.5 mb-6 space-y-2 shadow-xl">
        <div className="flex items-center gap-2 text-sm font-bold text-blue-400">
          <span>📝</span>
          <span>ملاحظات اليوم ({selectedDate}):</span>
        </div>
        <textarea
          value={dayNoteInput}
          onChange={(e) => handleNoteChange(e.target.value)}
          placeholder="اكتب أي ملاحظة، تدوينة، أو تذكير خاص بهذا اليوم..."
          rows={3}
          className="w-full bg-[#0d131d] border border-gray-800 rounded-2xl p-3 text-xs text-white placeholder-gray-500 outline-none focus:border-blue-500/60 resize-none transition"
        />
      </div>

      {/* 4. قائمة العادات اليومية */}
      <div className="space-y-4">
        <h2 className="text-lg font-extrabold text-gray-200">
          العادات اليومية ({selectedDate})
        </h2>

        {visibleHabits.length === 0 ? (
          <div className="text-center py-12 text-gray-500 text-sm bg-[#131a26] rounded-3xl border border-dashed border-gray-800">
            لا توجد عادات مسجلة لهذا اليوم.
          </div>
        ) : (
          visibleHabits.map((habit) => {
            const count = getHabitCount(habit.id);
            const isCompleted = count >= (habit.targetCount || 1);
            const pct = Math.min(100, Math.round((count / (habit.targetCount || 1)) * 100));

            return (
              <div
                key={habit.id}
                className={`p-4 rounded-3xl border transition flex items-center justify-between ${
                  isCompleted
                    ? 'bg-emerald-600/10 border-emerald-500/40 text-emerald-100'
                    : 'bg-[#161e2c] border-gray-800 text-white'
                }`}
              >
                {/* الأزرار اليدوية للتعديل المباشر */}
                <div className="flex items-center gap-2 bg-[#0d131d] p-1 rounded-2xl border border-gray-800">
                  <button
                    onClick={() => updateHabitCount(habit.id, 1)}
                    className="w-8 h-8 rounded-xl bg-gray-800 hover:bg-gray-700 text-white font-black text-sm active:scale-90 transition flex items-center justify-center"
                  >
                    +
                  </button>
                  <span className="font-extrabold text-xs px-2 text-blue-400">{count}</span>
                  <button
                    onClick={() => updateHabitCount(habit.id, -1)}
                    className="w-8 h-8 rounded-xl bg-gray-800 hover:bg-gray-700 text-white font-black text-sm active:scale-90 transition flex items-center justify-center"
                  >
                    -
                  </button>
                </div>

                {/* عنوان العادة والمستهدف */}
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <h3 className="font-bold text-sm">{habit.title}</h3>
                    <p className="text-[11px] text-gray-400 font-medium mt-0.5">
                      {count} من {habit.targetCount} {habit.unit}
                    </p>
                  </div>
                  <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-bold text-xs ${
                    isCompleted ? 'bg-emerald-500 text-black shadow-lg shadow-emerald-500/20' : 'bg-gray-800 text-blue-400'
                  }`}>
                    %{pct}
                  </div>
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
        <Link href="/history" className="flex flex-col items-center gap-1 text-blue-400 font-bold">
          <span className="text-xl">📅</span>
          <span className="text-[10px]">السجل</span>
        </Link>
        <Link href="/stats" className="flex flex-col items-center gap-1 text-gray-400 hover:text-white transition">
          <span className="text-xl">📊</span>
          <span className="text-[10px] font-bold">الإحصائيات</span>
        </Link>
      </div>

    </div>
  );
}