'use client';

import React, { useState, useEffect } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
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

  useEffect(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    setSelectedDate(todayStr);

    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        const userDocRef = doc(db, 'users', currentUser.uid);
        const unsubSnapshot = onSnapshot(userDocRef, (docSnap) => {
          if (docSnap.exists() && docSnap.data().habits) {
            setHabits(docSnap.data().habits);
          }
        });
        return () => unsubSnapshot();
      } else {
        const saved = localStorage.getItem('habit_tracker_data');
        if (saved) setHabits(JSON.parse(saved));
      }
    });

    return () => unsubscribe();
  }, []);

  const totalPercentage =
    habits.length === 0
      ? 0
      : Math.round(
          (habits.reduce((acc, h) => acc + h.completedCount / h.targetCount, 0) / habits.length) * 100
        );

  return (
    <div className="max-w-3xl mx-auto p-4 md:p-6 space-y-6 dir-rtl text-right min-h-screen pb-24 text-white bg-[#0d1117]" dir="rtl">
      <h2 className="text-2xl font-bold border-b border-gray-800 pb-3">سجل الإنجازات اليومية</h2>

      {/* تفاصيل اليوم المحدد */}
      <div className="bg-[#161b22] p-6 rounded-2xl border border-gray-800 shadow-xl space-y-4">
        <h3 className="text-xl font-bold text-blue-400">تفاصيل اليوم الحالي</h3>
        <div className="flex justify-between items-center bg-gray-800/50 p-4 rounded-xl">
          <span>إنجاز اليوم المباشر:</span>
          <span className="text-2xl font-extrabold text-emerald-400">{totalPercentage}%</span>
        </div>

        <div className="space-y-3 pt-2">
          <h4 className="font-bold text-gray-300">المهام المسجلة لليوم:</h4>
          {habits.length === 0 ? (
            <p className="text-gray-500 text-sm">لا توجد عادات مضافة حتى الآن في الرئيسية.</p>
          ) : (
            habits.map((habit) => {
              const pct = Math.round((habit.completedCount / habit.targetCount) * 100);
              return (
                <div key={habit.id} className="bg-gray-900/60 p-3 rounded-xl border border-gray-800 flex justify-between items-center text-sm">
                  <span>{habit.title}</span>
                  <span className="text-gray-400">
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