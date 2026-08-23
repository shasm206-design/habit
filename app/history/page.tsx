'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { auth, db } from '../../lib/firebase';

export interface Habit {
  id: string;
  title: string;
  type: 'عداد' | 'مؤقت' | 'مهمة';
  targetCount: number;
  unit: string;
  color: string;
  repeatDays: number[];
}

export interface DayProgress {
  [habitId: string]: number;
}

export default function HistoryPage() {
  const [user, setUser] = useState<User | null>(null);
  const [habits, setHabits] = useState<Habit[]>([]);
  const [dailyData, setDailyData] = useState<{ [date: string]: DayProgress }>({});
  const [dailyNotes, setDailyNotes] = useState<{ [date: string]: string }>({});
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [noteInput, setNoteInput] = useState<string>('');

  useEffect(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    setSelectedDate(todayStr);

    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        const userDocRef = doc(db, 'users', currentUser.uid);
        const unsubscribeSnapshot = onSnapshot(userDocRef, (docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data();
            if (data.habits) setHabits(data.habits);
            if (data.dailyData) setDailyData(data.dailyData);
            if (data.dailyNotes) setDailyNotes(data.dailyNotes);
          }
        });
        return () => unsubscribeSnapshot();
      } else {
        const savedHabits = localStorage.getItem('habit_tracker_habits');
        if (savedHabits) setHabits(JSON.parse(savedHabits));
        const savedDaily = localStorage.getItem('habit_tracker_daily');
        if (savedDaily) setDailyData(JSON.parse(savedDaily));
        const savedNotes = localStorage.getItem('habit_tracker_notes');
        if (savedNotes) setDailyNotes(JSON.parse(savedNotes));
      }
    });

    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    if (selectedDate && dailyNotes) {
      setNoteInput(dailyNotes[selectedDate] || '');
    }
  }, [selectedDate, dailyNotes]);

  const saveNote = async (newNote: string) => {
    const updatedNotes = { ...dailyNotes, [selectedDate]: newNote };
    setDailyNotes(updatedNotes);

    if (user) {
      try {
        const userDocRef = doc(db, 'users', user.uid);
        await setDoc(userDocRef, { dailyNotes: updatedNotes }, { merge: true });
      } catch (err) {
        console.error('خطأ في حفظ الملاحظة:', err);
      }
    } else {
      localStorage.setItem('habit_tracker_notes', JSON.stringify(updatedNotes));
    }
  };

  const getDaysInCurrentMonth = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const numDays = new Date(year, month + 1, 0).getDate();
    
    const daysArr: string[] = [];
    for (let i = 1; i <= numDays; i++) {
      const dayStr = i < 10 ? `0${i}` : `${i}`;
      const monthStr = month + 1 < 10 ? `0${month + 1}` : `${month + 1}`;
      daysArr.push(`${year}-${monthStr}-${dayStr}`);
    }
    return daysArr;
  };

  const monthDays = getDaysInCurrentMonth();
  const currentDayData = dailyData[selectedDate] || {};

  const getDayPercentage = (dateStr: string) => {
    if (habits.length === 0) return 0;
    const dayData = dailyData[dateStr] || {};
    const totalAcc = habits.reduce((acc, h) => {
      const count = dayData[h.id] || 0;
      return acc + Math.min(1, count / (h.targetCount || 1));
    }, 0);
    return Math.round((totalAcc / habits.length) * 100);
  };

  const selectedPct = getDayPercentage(selectedDate);

  return (
    <div className="max-w-4xl mx-auto min-h-screen bg-[#0d131d] text-white p-4 md:p-8 font-sans pb-28 dir-rtl text-right select-none" dir="rtl">
      
      {/* الترويسة */}
      <div className="flex justify-between items-center mb-6 pt-2 border-b border-gray-800 pb-4">
        <div>
          <h1 className="text-2xl font-black bg-gradient-to-r from-blue-400 via-indigo-300 to-white bg-clip-text text-transparent">
            📅 سجل الأيام والملاحظات
          </h1>
          <p className="text-xs text-gray-400 mt-1">استعرض إنجازاتك وملاحظاتك لأي يوم من أيام الشهر</p>
        </div>
      </div>

      {/* تقويم أيام الشهر الحالي */}
      <div className="bg-[#161e2c] p-4 rounded-3xl border border-gray-700/60 shadow-lg mb-6">
        <h3 className="text-xs font-bold text-gray-400 mb-3 px-1">تقويم الشهر الحالي:</h3>
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
          {monthDays.map((dateStr) => {
            const isSelected = selectedDate === dateStr;
            const dayNum = dateStr.split('-')[2];
            const pct = getDayPercentage(dateStr);

            return (
              <button
                key={dateStr}
                onClick={() => setSelectedDate(dateStr)}
                className={`min-w-[55px] p-3 rounded-2xl flex flex-col items-center gap-1 border transition ${
                  isSelected
                    ? 'bg-gradient-to-tr from-blue-600 to-indigo-600 border-blue-400 text-white shadow-lg shadow-blue-500/30 scale-105'
                    : 'bg-[#0d131d] border-gray-700/80 text-gray-300 hover:border-gray-500'
                }`}
              >
                <span className="text-sm font-black">{dayNum}</span>
                <span className={`text-[10px] font-bold ${pct >= 100 ? 'text-emerald-400' : 'text-blue-400'}`}>
                  %{pct}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* تفاصيل اليوم المختار */}
      <div className="bg-[#161e2c] p-6 rounded-3xl border border-gray-700/60 shadow-xl space-y-6 mb-8">
        <div className="flex justify-between items-center border-b border-gray-700/60 pb-4">
          <div>
            <h2 className="text-xl font-bold text-blue-400">تفاصيل يوم: {selectedDate}</h2>
            <p className="text-xs text-gray-400 mt-0.5">عرض المهام المنجزة والملاحظات في هذا اليوم</p>
          </div>
          <div className="bg-[#0d131d] px-4 py-2 rounded-2xl border border-gray-700 text-center">
            <span className="text-[10px] text-gray-400 block font-bold">إنجاز اليوم</span>
            <span className="text-lg font-black text-emerald-400">%{selectedPct}</span>
          </div>
        </div>

        {/* حقل ملاحظات اليوم */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-gray-300 block">📝 ملاحظات هذا اليوم:</label>
          <textarea
            rows={3}
            placeholder="أضف ملاحظاتك أو انطباعك عن إنجاز اليوم هنا..."
            value={noteInput}
            onChange={(e) => {
              setNoteInput(e.target.value);
              saveNote(e.target.value);
            }}
            className="w-full bg-[#0d131d] border border-gray-700 p-3.5 rounded-2xl outline-none text-white text-sm focus:border-blue-500 transition resize-none"
          />
        </div>

        {/* قائمة عادات اليوم المنجزة */}
        <div className="space-y-3">
          <h3 className="text-sm font-bold text-gray-300">الإنجازات المكتملة لليوم:</h3>
          {habits.length === 0 ? (
            <div className="text-center py-6 text-gray-500 text-xs bg-[#0d131d] rounded-2xl border border-dashed border-gray-800">
              لا توجد عادات مضافة.
            </div>
          ) : (
            <div className="space-y-2">
              {habits.map((habit) => {
                const count = currentDayData[habit.id] || 0;
                const isDone = count >= habit.targetCount && habit.targetCount > 0;

                return (
                  <div
                    key={habit.id}
                    className={`p-3.5 rounded-2xl flex justify-between items-center border text-xs font-bold ${
                      isDone
                        ? 'bg-emerald-600/20 border-emerald-500/40 text-emerald-200'
                        : 'bg-[#0d131d] border-gray-800 text-gray-400'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="text-base">{isDone ? '✅' : '⏳'}</span>
                      <span>{habit.title}</span>
                    </div>
                    <span>
                      {count} / {habit.targetCount} {habit.unit}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* شريط التنقل السفلي الموحد */}
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