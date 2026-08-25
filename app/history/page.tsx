'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, setDoc, onSnapshot } from 'firebase/firestore';
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
  
  const getLocalDateString = (dateObj = new Date()) => {
    const year = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const day = String(dateObj.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const todayStr = getLocalDateString();
  const yesterdayObj = new Date();
  yesterdayObj.setDate(yesterdayObj.getDate() - 1);
  const yesterdayStr = getLocalDateString(yesterdayObj);

  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const selectedDayRef = useRef<HTMLButtonElement | null>(null);

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

  // التمرير التلقائي نحو المربع المحدد في الشريط الأفقي
  useEffect(() => {
    if (selectedDayRef.current) {
      selectedDayRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'center',
      });
    }
  }, [selectedDate]);

  const saveData = async (
    updatedDaily: { [date: string]: DayProgress },
    updatedTasks = tasks
  ) => {
    setDailyData(updatedDaily);
    setTasks(updatedTasks);

    if (user) {
      try {
        const userDocRef = doc(db, 'users', user.uid);
        await setDoc(userDocRef, { dailyData: updatedDaily, tasks: updatedTasks }, { merge: true });
      } catch (err) {
        console.error('خطأ في حفظ البيانات:', err);
      }
    } else {
      localStorage.setItem('habit_tracker_daily', JSON.stringify(updatedDaily));
      localStorage.setItem('habit_tracker_tasks', JSON.stringify(updatedTasks));
    }
  };

  const isEditableDate = selectedDate === todayStr || selectedDate === yesterdayStr;

  const calculateDayPercentage = (dateStr: string) => {
    const dayData = dailyData[dateStr] || {};
    const dayTasksList = tasks[dateStr] || [];
    const totalItems = habits.length + dayTasksList.length;

    if (totalItems === 0) return 0;

    let habitsScore = 0;
    habits.forEach((h) => {
      const cnt = dayData[h.id] || 0;
      if (h.category === 'سيئة') {
        habitsScore += cnt === 0 ? 1 : 0;
      } else {
        habitsScore += Math.min(1, cnt / (h.targetCount || 1));
      }
    });

    const tasksScore = dayTasksList.filter((t) => t.completed).length;

    return Math.round(((habitsScore + tasksScore) / totalItems) * 100);
  };

  const handleUpdateHabitCount = (habitId: string, delta: number) => {
    if (!isEditableDate) return;
    const habit = habits.find((h) => h.id === habitId);
    if (!habit) return;

    const currentCount = dailyData[selectedDate]?.[habitId] || 0;
    let newCount = currentCount + delta;
    if (newCount < 0) newCount = 0;

    const updatedDay = { ...(dailyData[selectedDate] || {}), [habitId]: newCount };
    const updatedDaily = { ...dailyData, [selectedDate]: updatedDay };
    saveData(updatedDaily);
  };

  const handleToggleBadHabit = (habitId: string) => {
    if (!isEditableDate) return;
    const currentCount = dailyData[selectedDate]?.[habitId] || 0;
    const newCount = currentCount > 0 ? 0 : 1;
    const updatedDay = { ...(dailyData[selectedDate] || {}), [habitId]: newCount };
    const updatedDaily = { ...dailyData, [selectedDate]: updatedDay };
    saveData(updatedDaily);
  };

  const handleToggleTaskInHistory = (taskId: string) => {
    if (!isEditableDate) return;
    const dayTaskList = tasks[selectedDate] || [];
    const updatedList = dayTaskList.map((t) =>
      t.id === taskId ? { ...t, completed: !t.completed } : t
    );
    const updatedTasks = { ...tasks, [selectedDate]: updatedList };
    saveData(dailyData, updatedTasks);
  };

  const getDaysInCurrentMonth = () => {
    const currentSelected = new Date(selectedDate || todayStr);
    const year = currentSelected.getFullYear();
    const month = currentSelected.getMonth();
    const daysCount = new Date(year, month + 1, 0).getDate();
    const dayNames = ['أحد', 'إثنين', 'ثلاثاء', 'أربعاء', 'خميس', 'جمعة', 'سبت'];

    const daysList = [];
    for (let i = 1; i <= daysCount; i++) {
      const d = new Date(year, month, i);
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
      daysList.push({
        dayNum: i,
        dayName: dayNames[d.getDay()],
        dateStr: dateStr,
        pct: calculateDayPercentage(dateStr)
      });
    }
    return daysList;
  };

  const monthDays = getDaysInCurrentMonth();
  const currentDayProgress = dailyData[selectedDate] || {};
  const currentDayTasks = (tasks[selectedDate] || []).filter((t) => t.completed);

  return (
    <div className="max-w-4xl mx-auto min-h-screen bg-[#0d131d] text-white p-4 md:p-8 font-sans pb-28 dir-rtl text-right select-none" dir="rtl">
      
      {/* الترويسة العليا */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4 pt-2 border-b border-gray-800 pb-4">
        <div>
          <h1 className="text-2xl font-black bg-gradient-to-r from-blue-400 via-indigo-300 to-white bg-clip-text text-transparent">
            📅 سجل الإنجازات والأرشيف
          </h1>
          <p className="text-xs text-gray-400 mt-1">تصفح واستدرك إنجازاتك اليومية والمهام الشاطبة</p>
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto justify-between md:justify-end">
          <div className="flex gap-1.5 bg-[#161e2c] p-1 rounded-xl border border-gray-700">
            <button
              onClick={() => setSelectedDate(todayStr)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                selectedDate === todayStr ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'
              }`}
            >
              اليوم
            </button>
            <button
              onClick={() => setSelectedDate(yesterdayStr)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                selectedDate === yesterdayStr ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-white'
              }`}
            >
              أمس
            </button>
          </div>

          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="bg-[#161e2c] text-blue-400 font-extrabold p-2 rounded-xl border border-gray-700 outline-none text-xs cursor-pointer shadow-md"
          />
        </div>
      </div>

      {/* شريط الأيام الأفقي القابل للتمرير التلقائي */}
      <div className="mb-6 overflow-x-auto no-scrollbar py-2 scroll-smooth">
        <div className="flex gap-2 min-w-max px-2">
          {monthDays.map((item) => {
            const isSelected = item.dateStr === selectedDate;
            const isToday = item.dateStr === todayStr;

            return (
              <button
                key={item.dateStr}
                ref={isSelected ? selectedDayRef : null}
                onClick={() => setSelectedDate(item.dateStr)}
                className={`flex flex-col items-center justify-between w-16 h-20 p-2 rounded-2xl border transition duration-200 active:scale-95 ${
                  isSelected
                    ? 'bg-gradient-to-b from-blue-600 to-indigo-600 border-blue-400 text-white shadow-lg shadow-blue-500/30 scale-105'
                    : isToday
                    ? 'bg-[#182335] border-blue-500/50 text-white'
                    : 'bg-[#161e2c] border-gray-800 text-gray-400 hover:border-gray-700'
                }`}
              >
                <span className="text-[10px] font-bold opacity-80">{item.dayName}</span>
                <span className="text-base font-black">{item.dayNum}</span>
                <span className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded-md ${
                  isSelected 
                    ? 'bg-black/20 text-white' 
                    : item.pct >= 80 
                    ? 'bg-emerald-500/20 text-emerald-400' 
                    : item.pct >= 50 
                    ? 'bg-amber-500/20 text-amber-400' 
                    : 'bg-gray-800 text-gray-500'
                }`}>
                  %{item.pct}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* تنبيه الاستدراك */}
      {isEditableDate ? (
        <div className="mb-4 p-3 bg-blue-950/40 border border-blue-800/60 rounded-2xl text-xs text-blue-300 flex items-center gap-2">
          <span>💡</span>
          <span>يمكنك التعديل والاستدراك على إنجازات <strong>({selectedDate === todayStr ? 'اليوم' : 'أمس'})</strong> وتحديثها مباشرة.</span>
        </div>
      ) : (
        <div className="mb-4 p-3 bg-gray-900/50 border border-gray-800 rounded-2xl text-xs text-gray-400 flex items-center gap-2">
          <span>🔒</span>
          <span>تاريخ <strong>({selectedDate})</strong> معروض كـ "أرشيف قراءة فقط".</span>
        </div>
      )}

      {/* قائمة عادات اليوم المحدد */}
      <div className="space-y-4 mb-8">
        <h3 className="text-lg font-bold text-gray-200">
          العادات اليومية (<span className="text-blue-400">{selectedDate}</span>)
        </h3>
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

                {isEditableDate ? (
                  <div className="flex items-center gap-2">
                    {isBad ? (
                      <button
                        onClick={() => handleToggleBadHabit(habit.id)}
                        className={`px-3 py-1.5 rounded-xl font-bold text-xs border ${
                          isRelapsed 
                            ? 'bg-red-600 text-white border-red-500' 
                            : 'bg-emerald-950/60 border-emerald-500 text-emerald-400'
                        }`}
                      >
                        {isRelapsed ? 'انتكاسة ⚠️' : 'تسجيل انتكاسة'}
                      </button>
                    ) : (
                      <div className="flex items-center gap-1.5 bg-[#0d131d] p-1 rounded-xl border border-gray-700">
                        <button
                          onClick={() => handleUpdateHabitCount(habit.id, -1)}
                          className="w-7 h-7 bg-gray-800 rounded-lg font-bold text-xs hover:bg-gray-700"
                        >
                          -
                        </button>
                        <span className="w-8 text-center text-xs font-bold text-blue-400">{count}</span>
                        <button
                          onClick={() => handleUpdateHabitCount(habit.id, 1)}
                          className="w-7 h-7 bg-gray-800 rounded-lg font-bold text-xs hover:bg-gray-700"
                        >
                          +
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <span className={`text-xs font-black px-3 py-1 rounded-xl ${
                    isRelapsed 
                      ? 'bg-red-500/20 text-red-400' 
                      : isCompleted 
                      ? 'bg-emerald-500/20 text-emerald-300' 
                      : 'bg-gray-800 text-gray-500'
                  }`}>
                    {isRelapsed ? 'غير منجز ⚠️' : isCompleted ? 'مكتمل ✔️' : 'غير مكتمل'}
                  </span>
                )}
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
              onClick={() => handleToggleTaskInHistory(task.id)}
              className={`p-3.5 bg-[#121924] border border-emerald-500/30 text-emerald-300 rounded-2xl flex items-center justify-between text-xs font-bold ${
                isEditableDate ? 'cursor-pointer hover:border-emerald-500' : ''
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="w-5 h-5 rounded-lg bg-emerald-500 text-black flex items-center justify-center font-black text-[10px]">
                  ✓
                </div>
                <span className="line-through">{task.title}</span>
              </div>
              {isEditableDate && <span className="text-[10px] text-gray-500">(انقر للتعديل)</span>}
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