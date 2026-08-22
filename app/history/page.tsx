'use client';

import React, { useState, useEffect } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { auth, db } from '../../lib/firebase';

export interface Habit {
  id: string;
  title: string;
  targetCount: number;
  completedCount: number;
  unit: string;
}

export default function HistoryPage() {
  const [user, setUser] = useState<User | null>(null);
  const [habits, setHabits] = useState<Habit[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [note, setNote] = useState<string>('');
  const [notesByDate, setNotesByDate] = useState<{ [key: string]: string }>({});

  // توليد أيام الشهر الحالي للتقويم
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
            if (data.dailyNotes) setNotesByDate(data.dailyNotes);
          }
        });
        return () => unsubSnapshot();
      } else {
        const savedHabits = localStorage.getItem('habit_tracker_data');
        if (savedHabits) setHabits(JSON.parse(savedHabits));
        
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

  const totalPercentage =
    habits.length === 0
      ? 0
      : Math.round(
          (habits.reduce((acc, h) => acc + h.completedCount / h.targetCount, 0) / habits.length) * 100
        );

  return (
    <div className="max-w-3xl mx-auto p-4 md:p-6 space-y-6 dir-rtl text-right min-h-screen pb-24 text-white bg-[#0d1117]" dir="rtl">
      
      {/* شريط التقويم والأيام الأفقية */}
      <div className="bg-[#161b22] p-4 rounded-2xl border border-gray-800 shadow-lg space-y-3">
        <h3 className="text-sm font-bold text-gray-400">تقويم الشهر الحالي</h3>
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-gray-700">
          {daysArray.map((dateStr) => {
            const dayNum = dateStr.split('-')[2];
            const isSelected = dateStr === selectedDate;
            return (
              <button
                key={dateStr}
                onClick={() => setSelectedDate(dateStr)}
                className={`min-w-[42px] h-12 rounded-xl flex items-center justify-center font-bold text-sm transition-all ${
                  isSelected
                    ? 'bg-blue-600 text-white shadow-lg scale-105 border border-blue-400'
                    : 'bg-gray-800/80 text-gray-300 hover:bg-gray-700'
                }`}
              >
                {dayNum}
              </button>
            );
          })}
        </div>
      </div>

      {/* تفاصيل اليوم المحدد */}
      <div className="bg-[#161b22] p-6 rounded-2xl border border-gray-800 shadow-xl space-y-5">
        <div className="border-b border-gray-800 pb-3">
          <h2 className="text-xl font-bold text-blue-400">تفاصيل يوم: {selectedDate}</h2>
          <p className="text-xs text-gray-400 mt-1">ملخص الإنجازات والمهام المكتملة</p>
        </div>

        {/* نسبة إنجاز اليوم */}
        <div className="flex justify-between items-center bg-gray-800/40 p-4 rounded-xl border border-gray-800">
          <span className="font-bold text-sm">إنجاز اليوم:</span>
          <span className="text-2xl font-extrabold text-emerald-400">{totalPercentage}%</span>
        </div>

        {/* حقل ملاحظات اليوم */}
        <div className="space-y-2">
          <label className="text-sm font-bold text-gray-300 flex items-center gap-1">
            📝 ملاحظات هذا اليوم:
          </label>
          <textarea
            value={note}
            onChange={(e) => handleNoteChange(e.target.value)}
            placeholder="أضف ملاحظاتك أو انطباعك عن إنجاز اليوم هنا..."
            rows={3}
            className="w-full bg-gray-900/80 border border-gray-700 p-3 rounded-xl outline-none text-white text-sm focus:border-blue-500 transition resize-none"
          />
        </div>

        {/* قائمة المهام العادية لليوم */}
        <div className="space-y-3 pt-2">
          <h4 className="font-bold text-sm text-gray-300">المهام المسجلة لليوم:</h4>
          {habits.length === 0 ? (
            <p className="text-gray-500 text-xs">لا توجد عادات حقيقية مضافة حتى الآن في الرئيسية.</p>
          ) : (
            habits.map((habit) => {
              const pct = Math.round((habit.completedCount / habit.targetCount) * 100);
              return (
                <div key={habit.id} className="bg-gray-900/60 p-3.5 rounded-xl border border-gray-800 flex justify-between items-center text-sm">
                  <span className="font-medium">{habit.title}</span>
                  <span className="text-xs text-gray-400">
                    {habit.completedCount} / {habit.targetCount} {habit.unit} ({pct}%)
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