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

export interface TaskItem {
  id: string;
  title: string;
  completed: boolean;
}

export default function HistoryPage() {
  const [user, setUser] = useState<User | null>(null);
  const [habits, setHabits] = useState<Habit[]>([]);
  const [dailyData, setDailyData] = useState<{ [date: string]: DayProgress }>({});
  const [tasks, setTasks] = useState<{ [date: string]: TaskItem[] }>({});
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);

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
            if (data.tasks) setTasks(data.tasks);
          }
        });
        return () => unsubscribeSnapshot();
      } else {
        const savedHabits = localStorage.getItem('habit_tracker_habits');
        if (savedHabits) setHabits(JSON.parse(savedHabits));
        const savedDaily = localStorage.getItem('habit_tracker_daily');
        if (savedDaily) setDailyData(JSON.parse(savedDaily));
        const savedTasks = localStorage.getItem('habit_tracker_tasks');
        if (savedTasks) setTasks(JSON.parse(savedTasks));
      }
    });

    return () => unsubscribeAuth();
  }, []);

  const currentDayProgress = dailyData[selectedDate] || {};
  const currentDayTasks = (tasks[selectedDate] || []).filter((t) => t.completed);

  return (
    <div className="max-w-4xl mx-auto min-h-screen bg-[#0d131d] text-white p-4 md:p-8 font-sans pb-28 dir-rtl text-right select-none" dir="rtl">
      
      {/* الترويسة العليا */}
      <div className="flex justify-between items-center mb-6 pt-2 border-b border-gray-800 pb-4">
        <div>
          <h1 className="text-2xl font-black bg-gradient-to-r from-blue-400 via-indigo-300 to-white bg-clip-text text-transparent">
            📅 سجل الإنجازات والأرشيف
          </h1>
          <p className="text-xs text-gray-400 mt-1">تصفح إنجازاتك اليومية السابقة والمهام الشاطبة</p>
        </div>

        <input
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          className="bg-[#161e2c] text-blue-400 font-extrabold p-2.5 rounded-xl border border-gray-700 outline-none text-xs cursor-pointer shadow-md"
        />
      </div>

      {/* قائمة عادات اليوم المحدد */}
      <div className="space-y-4 mb-8">
        <h3 className="text-lg font-bold text-gray-200">العادات اليومية ({selectedDate})</h3>
        {habits.length === 0 ? (
          <div className="text-center py-8 text-gray-500 text-sm bg-[#131a26] rounded-3xl border border-dashed border-gray-800">
            لا توجد عادات مسجلة لهذا اليوم.
          </div>
        ) : (
          habits.map((habit) => {
            const count = currentDayProgress[habit.id] || 0;
            const isBad = habit.category === 'سيئة';
            const isRelapsed = isBad && count > 0;
            const isCompleted = isBad ? !isRelapsed : count >= habit.targetCount;

            return (
              <div
                key={habit.id}
                className={`p-4 rounded-3xl flex justify-between items-center border transition ${
                  isRelapsed
                    ? 'bg-red-950/30 border-red-800/60 text-red-300'
                    : isCompleted
                    ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-200'
                    : 'bg-[#161e2c] border-gray-800 text-gray-400'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    style={{ backgroundColor: `${habit.color || '#3b82f6'}25`, color: habit.color || '#3b82f6' }}
                    className="w-10 h-10 rounded-2xl flex items-center justify-center font-bold text-sm border border-white/10"
                  >
                    {isBad ? (isRelapsed ? '⚠️' : '🛡️') : isCompleted ? '✓' : '📊'}
                  </div>
                  <div>
                    <span className="font-bold text-sm block">{habit.title}</span>
                    <span className="text-xs opacity-75">
                      {isBad 
                        ? (isRelapsed ? 'تم الانتكاس' : 'امتناع ناجح 🛡️') 
                        : `${count} من ${habit.targetCount} ${habit.unit}`}
                    </span>
                  </div>
                </div>

                <span className={`text-xs font-black px-3 py-1 rounded-xl ${
                  isRelapsed 
                    ? 'bg-red-500/20 text-red-400' 
                    : isCompleted 
                    ? 'bg-emerald-500/20 text-emerald-300' 
                    : 'bg-gray-800 text-gray-500'
                }`}>
                  {isRelapsed ? 'غير منجز ⚠️' : isCompleted ? 'مكتمل ✔️' : 'غير مكتمل'}
                </span>
              </div>
            );
          })
        )}
      </div>

      {/* أرشيف المهام المنجزة لهذا اليوم (أسفل العادات) */}
      <div className="space-y-3 pt-4 border-t border-gray-800">
        <h3 className="text-sm font-bold text-gray-400">المهام المنجزة بأسفل اليوم (To-Do Archive)</h3>
        {currentDayTasks.length === 0 ? (
          <div className="text-center py-6 text-gray-500 text-xs bg-[#131a26] rounded-2xl border border-dashed border-gray-800">
            لا توجد مهام منجزة ومرحلة لأرشيف هذا اليوم.
          </div>
        ) : (
          currentDayTasks.map((task) => (
            <div
              key={task.id}
              className="p-3.5 bg-[#121924] border border-emerald-500/30 text-emerald-300 rounded-2xl flex items-center gap-3 text-xs font-bold"
            >
              <div className="w-5 h-5 rounded-lg bg-emerald-500 text-black flex items-center justify-center font-black text-[10px]">
                ✓
              </div>
              <span className="line-through">{task.title}</span>
            </div>
          ))
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