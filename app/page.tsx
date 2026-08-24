'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged, 
  User 
} from 'firebase/auth';
import { doc, setDoc, onSnapshot } from 'firebase/firestore';
import { auth, db, googleProvider } from '../lib/firebase';
import HabitCard, { Habit } from '../components/HabitCard';

export interface DayProgress {
  [habitId: string]: number;
}

export interface TaskItem {
  id: string;
  title: string;
  completed: boolean;
}

const COLOR_OPTIONS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];
const DAYS_LOOKUP = [
  { id: 0, label: 'S' },
  { id: 1, label: 'M' },
  { id: 2, label: 'T' },
  { id: 3, label: 'W' },
  { id: 4, label: 'T' },
  { id: 5, label: 'F' },
  { id: 6, label: 'S' },
];

export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [habits, setHabits] = useState<Habit[]>([]);
  const [dailyData, setDailyData] = useState<{ [date: string]: DayProgress }>({});
  const [tasks, setTasks] = useState<{ [date: string]: TaskItem[] }>({});
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [activeMainTab, setActiveMainTab] = useState<'habits' | 'todo'>('habits');
  const [isEditMode, setIsEditMode] = useState(false);

  // Modals & Timers
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingHabit, setEditingHabit] = useState<Habit | null>(null);
  const [activeHabitCounter, setActiveHabitCounter] = useState<Habit | null>(null);

  // Form State
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [title, setTitle] = useState('');
  const [habitType, setHabitType] = useState<'عداد' | 'مؤقت' | 'مهمة'>('عداد');
  const [habitCategory, setHabitCategory] = useState<'إيجابية' | 'سيئة'>('إيجابية');
  const [targetCount, setTargetCount] = useState<number>(10);
  const [unit, setUnit] = useState('صفحة');
  const [selectedColor, setSelectedColor] = useState(COLOR_OPTIONS[0]);
  const [selectedDays, setSelectedDays] = useState<number[]>([0, 1, 2, 3, 4, 5, 6]);

  // To-Do Input State
  const [newTaskInput, setNewTaskInput] = useState('');

  const getLocalDateString = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  useEffect(() => {
    const todayStr = getLocalDateString();
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

  const saveData = async (
    updatedHabits: Habit[], 
    updatedDaily: { [date: string]: DayProgress },
    updatedTasks = tasks
  ) => {
    setHabits(updatedHabits);
    setDailyData(updatedDaily);
    setTasks(updatedTasks);

    if (user) {
      try {
        const userDocRef = doc(db, 'users', user.uid);
        await setDoc(userDocRef, { habits: updatedHabits, dailyData: updatedDaily, tasks: updatedTasks }, { merge: true });
      } catch (err) {
        console.error('خطأ في حفظ البيانات:', err);
      }
    } else {
      localStorage.setItem('habit_tracker_habits', JSON.stringify(updatedHabits));
      localStorage.setItem('habit_tracker_daily', JSON.stringify(updatedDaily));
      localStorage.setItem('habit_tracker_tasks', JSON.stringify(updatedTasks));
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

  const updateHabitCount = (habitId: string, newCount: number) => {
    const habit = habits.find((h) => h.id === habitId);
    if (!habit) return;
    const validCount = Math.max(0, newCount);
    const updatedDay = { ...currentDayProgress, [habitId]: validCount };
    const updatedDaily = { ...dailyData, [selectedDate]: updatedDay };
    saveData(habits, updatedDaily);
  };

  const toggleQuickComplete = (e: React.MouseEvent, habit: Habit) => {
    e.stopPropagation();
    const currentCount = getHabitCount(habit.id);
    const isCompleted = currentCount >= habit.targetCount;
    updateHabitCount(habit.id, isCompleted ? 0 : habit.targetCount);
  };

  const handleSaveHabit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const finalTarget = habitType === 'مهمة' ? 1 : Number(targetCount) || 1;
    const finalUnit = habitType === 'مؤقت' ? 'دقيقة' : habitType === 'مهمة' ? 'مرة' : unit;

    let updatedHabits: Habit[];
    if (editingHabit) {
      updatedHabits = habits.map((h) =>
        h.id === editingHabit.id
          ? { 
              ...h, 
              title, 
              type: habitType,
              targetCount: finalTarget, 
              unit: finalUnit, 
              color: selectedColor,
              repeatDays: selectedDays,
              category: habitCategory
            }
          : h
      );
    } else {
      const newHabit: Habit = {
        id: Date.now().toString(),
        title,
        type: habitType,
        targetCount: finalTarget,
        unit: finalUnit,
        color: selectedColor,
        repeatDays: selectedDays,
        category: habitCategory
      };
      updatedHabits = [...habits, newHabit];
    }

    saveData(updatedHabits, dailyData);
    setTitle('');
    setEditingHabit(null);
    setIsAddModalOpen(false);
  };

  // إدارة مهام To-Do
  const currentDayTasks = tasks[selectedDate] || [];

  const addTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskInput.trim()) return;
    const newTask: TaskItem = {
      id: Date.now().toString(),
      title: newTaskInput,
      completed: false,
    };
    const updatedTasks = { ...tasks, [selectedDate]: [...currentDayTasks, newTask] };
    saveData(habits, dailyData, updatedTasks);
    setNewTaskInput('');
  };

  const toggleTask = (taskId: string) => {
    const updatedList = currentDayTasks.map((t) =>
      t.id === taskId ? { ...t, completed: !t.completed } : t
    );
    const updatedTasks = { ...tasks, [selectedDate]: updatedList };
    saveData(habits, dailyData, updatedTasks);
  };

  const deleteTask = (taskId: string) => {
    const updatedList = currentDayTasks.filter((t) => t.id !== taskId);
    const updatedTasks = { ...tasks, [selectedDate]: updatedList };
    saveData(habits, dailyData, updatedTasks);
  };

  // حساب الـ Streak الأيام المستمرة للعادة
  const getHabitStreak = (habit: Habit) => {
    let streak = 0;
    const today = new Date();
    for (let i = 0; i < 365; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${day}`;

      const count = dailyData[dateStr]?.[habit.id] || 0;
      if (count >= habit.targetCount) {
        streak++;
      } else if (i > 0) {
        break;
      }
    }
    return streak;
  };

  const totalPercentage =
    visibleHabits.length === 0
      ? 0
      : Math.round(
          (visibleHabits.reduce((acc, h) => acc + getHabitCount(h.id) / h.targetCount, 0) / visibleHabits.length) * 100
        );

  return (
    <div className="max-w-4xl mx-auto min-h-screen bg-[#0d131d] text-white p-4 md:p-8 font-sans pb-28 dir-rtl text-right select-none" dir="rtl">
      
      {/* الترويسة الرئيسية */}
      <div className="flex justify-between items-center mb-6 pt-2">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-500 border border-blue-400/40 flex items-center justify-center font-bold text-xl shadow-lg shadow-blue-500/20">
            👤
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-extrabold bg-gradient-to-r from-white via-gray-200 to-gray-400 bg-clip-text text-transparent">
              مرحباً، {user?.email ? user.email.split('@')[0] : 'هاشم'}
            </h1>
            <p className="text-xs text-blue-400/80 font-medium">تاريخ اليوم: {selectedDate}</p>
          </div>
        </div>

        {user ? (
          <button onClick={() => signOut(auth)} className="text-xs bg-red-500/20 text-red-400 px-4 py-2 rounded-xl font-bold border border-red-500/30 hover:bg-red-500/30 transition">
            تسجيل الخروج
          </button>
        ) : (
          <button onClick={() => setIsAuthModalOpen(true)} className="text-xs bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 px-4 py-2 rounded-xl font-bold shadow-lg shadow-blue-600/30 transition">
            تسجيل الدخول 🔐
          </button>
        )}
      </div>

      {/* تبويب العادات والقوائم الإشعارات العلوية */}
      <div className="grid grid-cols-2 gap-2 bg-[#161e2c] p-1.5 rounded-2xl border border-gray-700/80 mb-6 text-center text-sm font-bold">
        <button
          onClick={() => setActiveMainTab('habits')}
          className={`py-3 rounded-xl transition ${
            activeMainTab === 'habits' ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg' : 'text-gray-400 hover:text-white'
          }`}
        >
          🎯 عاداتي اليومية
        </button>
        <button
          onClick={() => setActiveMainTab('todo')}
          className={`py-3 rounded-xl transition ${
            activeMainTab === 'todo' ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg' : 'text-gray-400 hover:text-white'
          }`}
        >
          📝 قائمة المهام (To-Do)
        </button>
      </div>

      {/* قسم العادات اليومية */}
      {activeMainTab === 'habits' ? (
        <>
          <div className="flex justify-between items-center mb-4 px-2">
            <h2 className="text-2xl font-bold">عاداتي</h2>
            <button
              onClick={() => setIsEditMode(!isEditMode)}
              className={`text-xs px-4 py-2 rounded-xl font-bold transition shadow-md ${
                isEditMode ? 'bg-emerald-500 text-white shadow-emerald-500/20' : 'bg-[#18202e] text-gray-300 hover:bg-gray-700 border border-gray-700/80'
              }`}
            >
              {isEditMode ? 'تم الحفظ ✔️' : 'تعديل ✏️'}
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {visibleHabits.length === 0 ? (
              <div className="col-span-full text-center py-12 text-gray-500 text-sm bg-[#131a26] rounded-3xl border border-dashed border-gray-800">
                لا توجد عادات مسجلة لهذا اليوم المختار.
              </div>
            ) : (
              visibleHabits.map((habit, index) => {
                const count = getHabitCount(habit.id);
                const streak = getHabitStreak(habit);

                return (
                  <div key={habit.id} className="relative">
                    {/* شارة العداد المستمر Streak */}
                    {streak > 0 && (
                      <span className="absolute -top-2 left-4 z-10 text-[10px] bg-gradient-to-r from-amber-500 to-red-500 text-white px-2.5 py-0.5 rounded-full font-black shadow-md border border-amber-300/40 flex items-center gap-1">
                        🔥 مستمر: {streak} يوم
                      </span>
                    )}
                    <HabitCard
                      habit={habit}
                      count={count}
                      isEditMode={isEditMode}
                      onCounterClick={() => {
                        if (habit.type === 'مهمة') {
                          const current = getHabitCount(habit.id);
                          updateHabitCount(habit.id, current >= 1 ? 0 : 1);
                        } else {
                          setActiveHabitCounter(habit);
                        }
                      }}
                      onQuickToggle={(e) => toggleQuickComplete(e, habit)}
                      onEdit={() => {
                        setEditingHabit(habit);
                        setTitle(habit.title);
                        setHabitType(habit.type || 'عداد');
                        setHabitCategory(habit.category || 'إيجابية');
                        setTargetCount(habit.targetCount || 1);
                        setUnit(habit.unit);
                        setSelectedColor(habit.color);
                        setSelectedDays(habit.repeatDays || [0, 1, 2, 3, 4, 5, 6]);
                        setIsAddModalOpen(true);
                      }}
                      onDelete={() => {
                        const updatedHabits = habits.filter((h) => h.id !== habit.id);
                        saveData(updatedHabits, dailyData);
                      }}
                    />
                  </div>
                );
              })
            )}
          </div>
        </>
      ) : (
        /* قسم قائمة المهام (To-Do List) */
        <div className="space-y-6">
          <form onSubmit={addTask} className="flex gap-2">
            <input
              type="text"
              placeholder="إضافة مهمة جديدة اليوم..."
              value={newTaskInput}
              onChange={(e) => setNewTaskInput(e.target.value)}
              className="flex-1 bg-[#161e2c] border border-gray-700/80 p-3.5 rounded-2xl outline-none text-white text-sm focus:border-blue-500"
            />
            <button
              type="submit"
              className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-3.5 rounded-2xl font-bold text-sm shadow-lg active:scale-95 transition"
            >
              إضافة ➕
            </button>
          </form>

          <div className="space-y-3">
            {currentDayTasks.length === 0 ? (
              <div className="text-center py-12 text-gray-500 text-sm bg-[#131a26] rounded-3xl border border-dashed border-gray-800">
                لا توجد مهام إضافية لليوم.
              </div>
            ) : (
              currentDayTasks.map((task) => (
                <div
                  key={task.id}
                  className={`p-4 rounded-2xl flex justify-between items-center border transition ${
                    task.completed
                      ? 'bg-emerald-600/20 border-emerald-500/40 text-emerald-200 line-through'
                      : 'bg-[#161e2c] border-gray-700/80 text-white'
                  }`}
                >
                  <div
                    onClick={() => toggleTask(task.id)}
                    className="flex items-center gap-3 cursor-pointer flex-1"
                  >
                    <div className={`w-6 h-6 rounded-lg border flex items-center justify-center font-bold text-xs ${
                      task.completed ? 'bg-emerald-500 border-emerald-400 text-white' : 'border-gray-600'
                    }`}>
                      {task.completed && '✓'}
                    </div>
                    <span className="text-sm font-bold">{task.title}</span>
                  </div>
                  <button
                    onClick={() => deleteTask(task.id)}
                    className="text-gray-500 hover:text-red-400 p-1 text-sm font-bold transition"
                  >
                    🗑️
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* زر إضافة عادة */}
      {activeMainTab === 'habits' && (
        <button
          onClick={() => {
            setEditingHabit(null);
            setTitle('');
            setHabitType('عداد');
            setHabitCategory('إيجابية');
            setTargetCount(10);
            setUnit('صفحة');
            setSelectedDays([0, 1, 2, 3, 4, 5, 6]);
            setIsAddModalOpen(true);
          }}
          className="fixed bottom-16 right-8 w-14 h-14 bg-gradient-to-tr from-blue-600 to-indigo-500 text-white rounded-2xl shadow-2xl shadow-blue-500/40 text-3xl font-bold flex items-center justify-center border border-white/20 transition active:scale-95 z-40"
        >
          +
        </button>
      )}

      {/* نافذة إضافة أو تعديل عادة */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-[#18202e] border border-gray-700/80 rounded-3xl p-6 w-full max-w-md space-y-5 text-white shadow-2xl my-8">
            <div className="flex justify-between items-center border-b border-gray-700/80 pb-3">
              <button onClick={() => setIsAddModalOpen(false)} className="text-gray-400 text-sm">إلغاء</button>
              <h3 className="text-lg font-bold">{editingHabit ? 'تعديل العادة' : 'إضافة عادة جديدة'}</h3>
              <button onClick={handleSaveHabit} className="text-blue-400 font-bold text-sm">حفظ</button>
            </div>

            <form onSubmit={handleSaveHabit} className="space-y-4">
              <div>
                <label className="text-xs text-gray-400 block mb-1">اسم العادة</label>
                <input
                  type="text"
                  placeholder="مثلاً: قراءة قرآن أو ترك السهر"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-[#0d131d] border border-gray-700 p-3 rounded-xl outline-none text-white text-sm focus:border-blue-500"
                  required
                />
              </div>

              <div>
                <label className="text-xs text-gray-400 block mb-2">تصنيف العادة</label>
                <div className="grid grid-cols-2 gap-2 bg-[#0d131d] p-1.5 rounded-2xl border border-gray-700 text-center text-xs font-bold">
                  <button
                    type="button"
                    onClick={() => setHabitCategory('إيجابية')}
                    className={`py-2 rounded-xl transition ${
                      habitCategory === 'إيجابية' ? 'bg-emerald-600 text-white shadow-lg' : 'text-gray-400'
                    }`}
                  >
                    🎯 عادة إيجابية (بناء)
                  </button>
                  <button
                    type="button"
                    onClick={() => setHabitCategory('سيئة')}
                    className={`py-2 rounded-xl transition ${
                      habitCategory === 'سيئة' ? 'bg-amber-600 text-white shadow-lg' : 'text-gray-400'
                    }`}
                  >
                    🛡️ عادة سيئة (ترك)
                  </button>
                </div>
              </div>

              <div>
                <label className="text-xs text-gray-400 block mb-2">نوع العادة</label>
                <div className="grid grid-cols-3 gap-2 bg-[#0d131d] p-1.5 rounded-2xl border border-gray-700 text-center text-xs font-bold">
                  {(['مهمة', 'مؤقت', 'عداد'] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setHabitType(t)}
                      className={`py-2 rounded-xl transition ${
                        habitType === t ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-400 hover:text-white'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              {(habitType === 'عداد' || habitType === 'مؤقت') && (
                <div className="space-y-2 bg-[#0d131d] p-4 rounded-2xl border border-gray-700">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-gray-400">
                      {habitType === 'مؤقت' ? 'أدخل الدقائق' : 'تحديد العدد المستهدف'}
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setTargetCount(Math.max(1, targetCount - 1))}
                        className="w-7 h-7 bg-gray-800 rounded-lg font-bold"
                      >
                        -
                      </button>
                      <span className="font-bold text-blue-400 text-sm">{targetCount}</span>
                      <button
                        type="button"
                        onClick={() => setTargetCount(targetCount + 1)}
                        className="w-7 h-7 bg-gray-800 rounded-lg font-bold"
                      >
                        +
                      </button>
                    </div>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="120"
                    value={targetCount}
                    onChange={(e) => setTargetCount(Number(e.target.value))}
                    className="w-full accent-blue-500 cursor-pointer"
                  />
                </div>
              )}

              <div>
                <label className="text-xs text-gray-400 block mb-2">لون أشكال العادة</label>
                <div className="flex gap-3 justify-center">
                  {COLOR_OPTIONS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setSelectedColor(color)}
                      style={{ backgroundColor: color }}
                      className={`w-9 h-9 rounded-2xl border-2 transition ${
                        selectedColor === color ? 'border-white scale-110 shadow-lg' : 'border-transparent opacity-80'
                      }`}
                    />
                  ))}
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* شريط التنقل السفلي الثابت */}
      <div className="fixed bottom-0 left-0 right-0 bg-[#131a26]/90 backdrop-blur-lg border-t border-gray-800 py-3 px-6 flex justify-around items-center z-50">
        <Link href="/" className="flex flex-col items-center gap-1 text-blue-400 font-bold">
          <span className="text-xl">✅</span>
          <span className="text-[10px]">العادات</span>
        </Link>
        <Link href="/history" className="flex flex-col items-center gap-1 text-gray-400 hover:text-white transition">
          <span className="text-xl">📅</span>
          <span className="text-[10px] font-bold">السجل</span>
        </Link>
        <Link href="/stats" className="flex flex-col items-center gap-1 text-gray-400 hover:text-white transition">
          <span className="text-xl">📊</span>
          <span className="text-[10px] font-bold">الإحصائيات</span>
        </Link>
      </div>

    </div>
  );
}