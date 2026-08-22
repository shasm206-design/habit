'use client';

import React, { useState, useEffect } from 'react';
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
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [note, setNote] = useState<string>('');
  const [notesByDate, setNotesByDate] = useState<{ [key: string]: string }>({});

  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  
  const daysArray = Array.from({ length: daysInMonth }, (_, i) => {
    const dayNum = i + 1;
    const formattedDay = dayNum < 10 ? `0${dayNum}` : `${dayNum}`;
    const formattedMonth = month + 1 < 10 ? `0${month + 1}` : `${month + 1}`;
    return `${year}-${formattedMonth}-${formattedDay}`;
  });

  useEffect(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    setSelectedDate(todayStr);

    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        const userDocRef = doc(db, 'users', currentUser.uid);
        const unsubSnapshot = onSnapshot(userDocRef, (docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data();
            if (data.habits) setHabits(data.habits);
            if (data.dailyData) setDailyData(data.dailyData);
            if (data.dailyNotes) setNotesByDate(data.dailyNotes);
          }
        });
        return () => unsubSnapshot();
      } else {
        const savedHabits = localStorage.getItem('habit_tracker_habits');
        if (savedHabits) setHabits(JSON.parse(savedHabits));
        const savedDaily = localStorage.getItem('habit_tracker_daily');
        if (savedDaily) setDailyData(JSON.parse(savedDaily));
        const savedNotes = localStorage.getItem('habit_tracker_notes');
        if (savedNotes) setNotesByDate(JSON.parse(savedNotes));
      }
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (selectedDate && notesByDate[selectedDate]) {
      setNote(notesByDate[selectedDate]);
    } else {
      setNote('');
    }
  }, [selectedDate, notesByDate]);

  const handleNoteChange = async (newNote: string) => {
    setNote(newNote);
    const updatedNotes = { ...notesByDate, [selectedDate]: newNote };
    setNotesByDate(updatedNotes);

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

  const getSelectedDayOfWeek = () => {
    if (!selectedDate) return 0;
    return new Date(selectedDate).getDay();
  };

  const visibleHabits = habits.filter((h) =>
    !h.repeatDays || h.repeatDays.includes(getSelectedDayOfWeek())
  );

  const currentDayProgress = dailyData[selectedDate] || {};

  const getHabitCount = (habitId: string) => currentDayProgress[habitId] || 0;

  const totalPercentage =
    visibleHabits.length === 0
      ? 0
      : Math.round(
          (visibleHabits.reduce((acc, h) => acc + getHabitCount(h.id) / h.targetCount, 0) / visibleHabits.length) * 100
        );

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-8 space-y-6 dir-rtl text-right min-h-screen pb-24 text-white bg-[#1c232b]" dir="rtl">
      
      {/* تقويم الشهر */}
      <div className="bg-[#222a33] p-4 rounded-3xl border border-gray-700 shadow-lg space-y-3">
        <h3 className="text-xs font-bold text-gray-400">تقويم الشهر الحالي</h3>
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-gray-700">
          {daysArray.map((dateStr) => {
            const dayNum = dateStr.split('-')[2];
            const isSelected = dateStr === selectedDate;
            return (
              <button
                key={dateStr}
                onClick={() => setSelectedDate(dateStr)}
                className={`min-w-[44px] h-12 rounded-2xl flex items-center justify-center font-bold text-sm transition-all ${
                  isSelected
                    ? 'bg-[#2bbdbd] text-white shadow-lg scale-105 border border-white/20'
                    : 'bg-[#171d24] text-gray-300 hover:bg-gray-700 border border-gray-700'
                }`}
              >
                {dayNum}
              </button>
            );
          })}
        </div>
      </div>

      {/* تفاصيل اليوم المختار */}
      <div className="bg-[#222a33] p-6 rounded-3xl border border-gray-700 shadow-xl space-y-5">
        <div className="border-b border-gray-700 pb-3 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold text-[#2bbdbd]">تفاصيل يوم: {selectedDate}</h2>
            <p className="text-xs text-gray-400 mt-1">ملخص الإنجازات والمهام المكتملة بناءً على هذا اليوم</p>
          </div>
          <div className="bg-[#171d24] px-4 py-2 rounded-2xl border border-gray-700 text-center">
            <span className="text-xs text-gray-400 block">إنجاز اليوم</span>
            <span className="text-xl font-extrabold text-emerald-400">{totalPercentage}%</span>
          </div>
        </div>

        {/* حقل ملاحظات اليوم */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-gray-300 flex items-center gap-1">
            📝 ملاحظات هذا اليوم:
          </label>
          <textarea
            value={note}
            onChange={(e) => handleNoteChange(e.target.value)}
            placeholder="أضف ملاحظاتك أو انطباعك عن إنجاز اليوم هنا..."
            rows={3}
            className="w-full bg-[#171d24] border border-gray-700 p-3 rounded-2xl outline-none text-white text-sm focus:border-[#2bbdbd] transition resize-none"
          />
        </div>

        {/* قائمة المهام المخصصة لليوم */}
        <div className="space-y-3 pt-2">
          <h4 className="font-bold text-sm text-gray-300">المهام المسجلة لليوم:</h4>
          {visibleHabits.length === 0 ? (
            <p className="text-gray-500 text-xs py-4 text-center bg-[#171d24] rounded-2xl border border-dashed border-gray-700">
              لا توجد مهام حقيقية مسجلة لهذا اليوم المختار.
            </p>
          ) : (
            visibleHabits.map((habit) => {
              const count = getHabitCount(habit.id);
              const pct = Math.round((count / habit.targetCount) * 100);
              return (
                <div 
                  key={habit.id} 
                  style={{ backgroundColor: habit.color || '#7f2a2d' }}
                  className="p-3.5 rounded-2xl flex justify-between items-center text-sm shadow-md border border-white/10"
                >
                  <span className="font-bold">{habit.title}</span>
                  <span className="text-xs bg-black/30 px-3 py-1 rounded-xl font-medium">
                    {count} / {habit.targetCount} {habit.unit} ({pct}%)
                  </span>
                </div>
              );
            })
          )}
        </div>
      </div>

    </div>
  );
}