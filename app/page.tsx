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
  { id: 0, label: 'أحد' },
  { id: 1, label: 'إثنين' },
  { id: 2, label: 'ثلاثاء' },
  { id: 3, label: 'أربعاء' },
  { id: 4, label: 'خميس' },
  { id: 5, label: 'جمعة' },
  { id: 6, label: 'سبت' },
];

export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [habits, setHabits] = useState<Habit[]>([]);
  const [dailyData, setDailyData] = useState<{ [date: string]: DayProgress }>({});
  const [tasks, setTasks] = useState<{ [date: string]: TaskItem[] }>({});
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [activeMainTab, setActiveMainTab] = useState<'habits' | 'todo'>('habits');
  const [isEditMode, setIsEditMode] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  // Modals & Timers
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingHabit, setEditingHabit] = useState<Habit | null>(null);
  const [activeHabitCounter, setActiveHabitCounter] = useState<Habit | null>(null);

  // Timer States
  const [timerMode, setTimerMode] = useState<'timer' | 'counter'>('counter');
  const [timerSecondsLeft, setTimerSecondsLeft] = useState<number>(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [isTimerFinished, setIsTimerFinished] = useState(false);
  const [isOvertime, setIsOvertime] = useState(false);

  // Form State
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');
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
            if (data.tasks) {
              const processedTasks = handleCarryOverTasks(data.tasks, todayStr);
              setTasks(processedTasks);
            }
          }
        });
        return () => unsubscribeSnapshot();
      } else {
        const savedHabits = localStorage.getItem('habit_tracker_habits');
        if (savedHabits) setHabits(JSON.parse(savedHabits));
        const savedDaily = localStorage.getItem('habit_tracker_daily');
        if (savedDaily) setDailyData(JSON.parse(savedDaily));
        const savedTasks = localStorage.getItem('habit_tracker_tasks');
        if (savedTasks) {
          const parsed = JSON.parse(savedTasks);
          const processed = handleCarryOverTasks(parsed, todayStr);
          setTasks(processed);
        }
      }
    });

    return () => unsubscribeAuth();
  }, []);

  // إدارة المؤقت الذكي الحقيقي الحافظ للحالة والإيقاف المؤقت
  useEffect(() => {
    if (!activeHabitCounter || activeHabitCounter.type !== 'مؤقت') return;

    const habitId = activeHabitCounter.id;
    const storedEndTime = localStorage.getItem(`timer_end_${habitId}`);
    const storedPausedLeft = localStorage.getItem(`timer_paused_${habitId}`);

    if (storedEndTime) {
      const endTime = parseInt(storedEndTime, 10);
      const now = Date.now();
      const remaining = Math.max(0, Math.floor((endTime - now) / 1000));
      setTimerSecondsLeft(remaining);
      setIsTimerRunning(remaining > 0);
      setIsTimerFinished(remaining === 0);
    } else if (storedPausedLeft) {
      setTimerSecondsLeft(parseInt(storedPausedLeft, 10));
      setIsTimerRunning(false);
      setIsTimerFinished(false);
    } else {
      const currentDoneMinutes = getHabitCount(habitId);
      const remainingMinutes = Math.max(0, activeHabitCounter.targetCount - currentDoneMinutes);
      setTimerSecondsLeft(remainingMinutes * 60);
      setIsTimerRunning(false);
      setIsTimerFinished(false);
      setIsOvertime(false);
    }
  }, [activeHabitCounter]);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isTimerRunning && activeHabitCounter && activeHabitCounter.type === 'مؤقت') {
      timer = setInterval(() => {
        if (isOvertime) {
          setTimerSecondsLeft((prev) => {
            const next = prev + 1;
            if (next % 60 === 0) {
              const currentMins = getHabitCount(activeHabitCounter.id);
              updateHabitCount(activeHabitCounter.id, currentMins + 1);
            }
            return next;
          });
        } else {
          const storedEndTime = localStorage.getItem(`timer_end_${activeHabitCounter.id}`);
          if (storedEndTime) {
            const remaining = Math.max(0, Math.floor((parseInt(storedEndTime, 10) - Date.now()) / 1000));
            setTimerSecondsLeft(remaining);

            if (remaining <= 0) {
              setIsTimerRunning(false);
              setIsTimerFinished(true);
              localStorage.removeItem(`timer_end_${activeHabitCounter.id}`);
              localStorage.removeItem(`timer_paused_${activeHabitCounter.id}`);
              updateHabitCount(activeHabitCounter.id, activeHabitCounter.targetCount);
            }
          }
        }
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [isTimerRunning, isOvertime, activeHabitCounter]);

  const startTimer = () => {
    if (!activeHabitCounter) return;
    const duration = timerSecondsLeft > 0 ? timerSecondsLeft : activeHabitCounter.targetCount * 60;
    const endTime = Date.now() + duration * 1000;
    localStorage.setItem(`timer_end_${activeHabitCounter.id}`, endTime.toString());
    localStorage.removeItem(`timer_paused_${activeHabitCounter.id}`);
    setIsTimerRunning(true);
    setIsTimerFinished(false);
  };

  const startOvertime = () => {
    setIsOvertime(true);
    setTimerSecondsLeft(0);
    setIsTimerRunning(true);
    setIsTimerFinished(false);
  };

  const pauseTimer = () => {
    if (!activeHabitCounter) return;
    localStorage.setItem(`timer_paused_${activeHabitCounter.id}`, timerSecondsLeft.toString());
    localStorage.removeItem(`timer_end_${activeHabitCounter.id}`);
    setIsTimerRunning(false);
  };

  const resetTimer = () => {
    if (!activeHabitCounter) return;
    localStorage.removeItem(`timer_end_${activeHabitCounter.id}`);
    localStorage.removeItem(`timer_paused_${activeHabitCounter.id}`);
    setIsTimerRunning(false);
    setIsTimerFinished(false);
    setIsOvertime(false);
    const currentDone = getHabitCount(activeHabitCounter.id);
    const remaining = Math.max(0, activeHabitCounter.targetCount - currentDone);
    setTimerSecondsLeft(remaining * 60);
  };

  const handleCarryOverTasks = (allTasks: { [date: string]: TaskItem[] }, todayStr: string) => {
    const updated = { ...allTasks };
    const dates = Object.keys(updated).sort();
    let carriedOver: TaskItem[] = [];

    dates.forEach((dateKey) => {
      if (dateKey < todayStr) {
        const uncompleted = updated[dateKey].filter((t) => !t.completed);
        if (uncompleted.length > 0) {
          carriedOver = [...carriedOver, ...uncompleted];
          updated[dateKey] = updated[dateKey].filter((t) => t.completed);
        }
      }
    });

    if (carriedOver.length > 0) {
      const todayList = updated[todayStr] || [];
      const existingIds = new Set(todayList.map((t) => t.id));
      const filteredCarried = carriedOver.filter((t) => !existingIds.has(t.id));
      updated[todayStr] = [...todayList, ...filteredCarried];
    }

    return updated;
  };

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

  const moveHabit = (index: number, direction: 'up' | 'down') => {
    const newHabits = [...habits];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newHabits.length) return;
    const temp = newHabits[index];
    newHabits[index] = newHabits[targetIndex];
    newHabits[targetIndex] = temp;
    saveData(newHabits, dailyData);
  };

  const handleDragStart = (index: number) => {
    if (!isEditMode) return;
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;
    const updatedHabits = [...habits];
    const draggedItem = updatedHabits[draggedIndex];
    updatedHabits.splice(draggedIndex, 1);
    updatedHabits.splice(index, 0, draggedItem);
    setDraggedIndex(index);
    saveData(updatedHabits, dailyData);
  };

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    try {
      if (isSignUp) {
        await createUserWithEmailAndPassword(auth, email, password);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
      setIsAuthModalOpen(false);
      setEmail('');
      setPassword('');
    } catch (err: any) {
      setAuthError(err.message || 'حدث خطأ في تسجيل الدخول');
    }
  };

  const handleGoogleAuth = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
      setIsAuthModalOpen(false);
    } catch (err: any) {
      setAuthError(err.message || 'حدث خطأ في تسجيل الدخول عبر Google');
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
    if (habit.category === 'سيئة') {
      const current = getHabitCount(habit.id);
      updateHabitCount(habit.id, current > 0 ? 0 : 1);
    } else {
      const currentCount = getHabitCount(habit.id);
      const isCompleted = currentCount >= habit.targetCount;
      updateHabitCount(habit.id, isCompleted ? 0 : habit.targetCount);
    }
  };

  const toggleDaySelection = (dayId: number) => {
    if (selectedDays.includes(dayId)) {
      if (selectedDays.length === 1) return;
      setSelectedDays(selectedDays.filter((d) => d !== dayId));
    } else {
      setSelectedDays([...selectedDays, dayId]);
    }
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
        category: habitCategory,
        preferredMode: 'counter'
      };
      updatedHabits = [...habits, newHabit];
    }

    saveData(updatedHabits, dailyData);
    setTitle('');
    setEditingHabit(null);
    setIsAddModalOpen(false);
  };

  const openCounterModal = (habit: Habit) => {
    setActiveHabitCounter(habit);
    setTimerMode(habit.preferredMode || 'counter');
  };

  const togglePreferredMode = (newMode: 'timer' | 'counter') => {
    if (!activeHabitCounter) return;
    setTimerMode(newMode);
    setIsTimerRunning(false);
    const updatedHabits = habits.map((h) =>
      h.id === activeHabitCounter.id ? { ...h, preferredMode: newMode } : h
    );
    saveData(updatedHabits, dailyData);
  };

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

  // دالة حساب الستريك الشاملة لحساب يوم الحماية لجميع العادات وتوحيد الستريك بـ 2 يوم
  const getHabitStreakStatus = (habit: Habit) => {
    let streakCount = 0;
    let currentType: 'gold' | 'bronze' | 'warrior' | 'none' = 'none';

    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;

    const countToday = dailyData[todayStr]?.[habit.id] || 0;
    const countYesterday = dailyData[yesterdayStr]?.[habit.id] || 0;

    const pctToday = countToday / (habit.targetCount || 1);
    const pctYesterday = countYesterday / (habit.targetCount || 1);

    // التراجع 365 يوماً للخلف مع التغاضي عن يوم واحد حماية لأي إنجاز أمس
    for (let i = 0; i < 365; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const cnt = dailyData[dateStr]?.[habit.id] || 0;
      const pct = cnt / (habit.targetCount || 1);

      if (pct >= 1) {
        streakCount++;
      } else if (i === 1 && pct < 1) {
        // تخطي يوم أمس دائماً ليُحسب كـ يوم حماية يربط ما قبله
        continue;
      } else if (i > 0) {
        break;
      }
    }

    if (habit.category === 'سيئة') {
      if (countToday === 0) {
        currentType = 'gold';
      } else {
        currentType = 'warrior';
      }
    } else {
      if (pctToday >= 1) {
        currentType = 'gold';
      } else {
        if (pctYesterday < 1 && dailyData[yesterdayStr] !== undefined) {
          currentType = 'warrior';
        } else {
          currentType = 'bronze';
        }
      }
    }

    return { type: currentType, count: streakCount };
  };

  const calculateTotalDayPercentage = () => {
    const habitsCount = visibleHabits.length;
    const tasksCount = currentDayTasks.length;
    const totalItems = habitsCount + tasksCount;

    if (totalItems === 0) return 0;

    let habitsCompletedScore = 0;
    visibleHabits.forEach((h) => {
      const cnt = getHabitCount(h.id);
      if (h.category === 'سيئة') {
        habitsCompletedScore += cnt === 0 ? 1 : 0;
      } else {
        habitsCompletedScore += Math.min(1, cnt / (h.targetCount || 1));
      }
    });

    const tasksCompletedScore = currentDayTasks.filter((t) => t.completed).length;

    return Math.round(((habitsCompletedScore + tasksCompletedScore) / totalItems) * 100);
  };

  const totalPercentage = calculateTotalDayPercentage();

  const getTrophyStatus = (pct: number) => {
    if (pct >= 95) {
      return { 
        trophy: '👑', 
        label: 'يا استثنائي', 
        desc: 'أداء مبهر يفوق التوقعات!',
        bgGradient: 'from-amber-400 via-yellow-500 to-amber-600',
        textColor: 'text-black'
      };
    }
    if (pct >= 80) {
      return { 
        trophy: '🥇', 
        label: 'ممتاز', 
        desc: 'إنجاز رفيع ومستوى متقدم جداً',
        bgGradient: 'from-yellow-500 to-amber-500',
        textColor: 'text-black'
      };
    }
    if (pct >= 60) {
      return { 
        trophy: '🥈', 
        label: 'جيد', 
        desc: 'استمرار رائع وتقدم ملحوظ',
        bgGradient: 'from-slate-300 via-gray-400 to-slate-500',
        textColor: 'text-black'
      };
    }
    if (pct >= 40) {
      return { 
        trophy: '🥉', 
        label: 'مقبول', 
        desc: 'بداية خطوة متينة، واصل!',
        bgGradient: 'from-amber-700 via-amber-800 to-amber-900',
        textColor: 'text-white'
      };
    }
    return { 
      trophy: '❌', 
      label: 'متواضع', 
      desc: 'حفّز نفسك للبدء بالعادة الأولى اليوم',
      bgGradient: 'from-slate-800 to-slate-900',
      textColor: 'text-gray-300'
    };
  };

  const status = getTrophyStatus(totalPercentage);

  const formatTimerString = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  return (
    <div className="max-w-4xl mx-auto min-h-screen bg-[#0d131d] text-white p-4 md:p-8 font-sans pb-28 dir-rtl text-right select-none" dir="rtl">
      
      {/* 1. الترويسة الرئيسية */}
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

      {/* 2. شريط النسبة المئوية للتقييم والكأس */}
      <div className={`bg-gradient-to-r ${status.bgGradient} ${status.textColor} p-4.5 rounded-3xl flex justify-between items-center px-6 shadow-xl mb-6 border border-white/20 transition-all duration-300`}>
        <div className="flex items-center gap-3.5">
          <span className="text-3xl filter drop-shadow">{status.trophy}</span>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-black text-lg tracking-wide block">تقدم اليوم: {totalPercentage}%</span>
              <span className="text-xs font-black px-2 py-0.5 rounded-lg bg-black/20 backdrop-blur-sm">
                التقييم: {status.label}
              </span>
            </div>
            <span className="text-xs font-medium opacity-90 block mt-0.5">{status.desc}</span>
          </div>
        </div>
        <input 
          type="date" 
          value={selectedDate} 
          onChange={(e) => setSelectedDate(e.target.value)}
          className="bg-black/20 text-current font-extrabold p-2 rounded-xl border border-black/10 outline-none text-xs cursor-pointer shadow-inner"
        />
      </div>

      {/* 3. تبويب العادات والمهام */}
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
                const streakInfo = getHabitStreakStatus(habit);

                return (
                  <div 
                    key={habit.id} 
                    draggable={isEditMode}
                    onDragStart={() => handleDragStart(index)}
                    onDragOver={(e) => handleDragOver(e, index)}
                  >
                    <HabitCard
                      habit={habit}
                      count={count}
                      isEditMode={isEditMode}
                      streakStatus={streakInfo}
                      onCounterClick={() => {
                        if (habit.category === 'سيئة') {
                          updateHabitCount(habit.id, count > 0 ? 0 : 1);
                        } else if (habit.type === 'مهمة' || habit.targetCount === 1) {
                          updateHabitCount(habit.id, count >= 1 ? 0 : 1);
                        } else {
                          openCounterModal(habit);
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
                      onMoveUp={index > 0 ? () => moveHabit(index, 'up') : undefined}
                      onMoveDown={index < visibleHabits.length - 1 ? () => moveHabit(index, 'down') : undefined}
                    />
                  </div>
                );
              })
            )}
          </div>
        </>
      ) : (
        /* قسم قائمة المهام */
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

      {/* نافذة تسجيل الدخول (Auth Modal) */}
      {isAuthModalOpen && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <div className="bg-[#18202e] border border-gray-700/80 rounded-3xl p-6 w-full max-w-sm space-y-4 text-white shadow-2xl relative">
            <button onClick={() => setIsAuthModalOpen(false)} className="absolute top-4 left-4 text-gray-400 text-lg font-bold">✕</button>
            <h3 className="text-xl font-extrabold text-center">{isSignUp ? 'إنشاء حساب جديد' : 'تسجيل الدخول'}</h3>
            
            {authError && <div className="p-2.5 bg-red-500/20 border border-red-500/40 text-red-300 text-xs rounded-xl text-center font-bold">{authError}</div>}

            <form onSubmit={handleAuthSubmit} className="space-y-3">
              <div>
                <label className="text-xs text-gray-400 block mb-1">البريد الإلكتروني</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-[#0d131d] border border-gray-700 p-3 rounded-xl outline-none text-sm text-white focus:border-blue-500"
                  required
                />
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-1">كلمة المرور</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-[#0d131d] border border-gray-700 p-3 rounded-xl outline-none text-sm text-white focus:border-blue-500"
                  required
                />
              </div>

              <button type="submit" className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 font-bold text-sm rounded-xl shadow-lg active:scale-95 transition">
                {isSignUp ? 'إنشاء الحساب' : 'الدخول'}
              </button>
            </form>

            <div className="relative my-3 text-center">
              <span className="bg-[#18202e] px-2 text-xs text-gray-500 relative z-10">أو</span>
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-800"></div></div>
            </div>

            <button onClick={handleGoogleAuth} className="w-full py-2.5 bg-white text-gray-900 font-bold text-xs rounded-xl flex items-center justify-center gap-2 shadow-md active:scale-95 transition">
              <span>الدخول عبر Google</span>
            </button>

            <button onClick={() => setIsSignUp(!isSignUp)} className="w-full text-center text-xs text-blue-400 mt-2 block font-medium">
              {isSignUp ? 'لديك حساب بالفعل؟ سجل دخولك' : 'ليس لديك حساب؟ أنشئ حساباً جديداً'}
            </button>
          </div>
        </div>
      )}

      {/* نافذة العداد والتركيز التفاعلي */}
      {activeHabitCounter && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <div className="bg-[#121824] border border-gray-800 rounded-3xl p-6 w-full max-w-sm space-y-6 text-white text-center shadow-2xl relative">
            <button
              onClick={() => {
                setActiveHabitCounter(null);
                setIsTimerRunning(false);
              }}
              className="absolute top-4 left-4 text-gray-400 hover:text-white text-lg font-bold"
            >
              ✕
            </button>

            {/* بطاقة العادة */}
            <div className="bg-[#1c2536] p-4 rounded-2xl border border-gray-700/60 space-y-1 mt-4">
              <h3 className="text-2xl font-black">{activeHabitCounter.title}</h3>
              <p className="text-xs text-gray-400 font-bold">
                إنجاز يوم {selectedDate}: <span className="text-blue-400">{getHabitCount(activeHabitCounter.id)}</span> من {activeHabitCounter.targetCount} {activeHabitCounter.unit}
              </p>
            </div>

            {/* مفتاح التبديل للمؤقت التنازلي والعداد */}
            {activeHabitCounter.type === 'مؤقت' && (
              <div className="flex justify-between items-center bg-[#0a0f18] p-2.5 rounded-2xl border border-gray-800">
                <span className="text-xs font-bold text-gray-300">
                  {timerMode === 'timer' ? '⏱️ مؤقت تنازلي حي (خلفية)' : '📊 عداد يدوي'}
                </span>
                <button
                  onClick={() => togglePreferredMode(timerMode === 'timer' ? 'counter' : 'timer')}
                  className={`w-12 h-6 rounded-full p-1 transition-colors duration-300 flex items-center ${
                    timerMode === 'timer' ? 'bg-blue-600 justify-end' : 'bg-gray-700 justify-start'
                  }`}
                >
                  <div className="w-4 h-4 rounded-full bg-white shadow-md transform transition-transform" />
                </button>
              </div>
            )}

            {/* تصميم العداد الدائري الأزرق */}
            {(activeHabitCounter.type !== 'مؤقت' || timerMode === 'counter') ? (
              <div className="py-2">
                <div className="flex justify-center items-center gap-5 my-4">
                  
                  {/* زر الزيادة (+) الأخضر */}
                  <button
                    onClick={() => {
                      const current = getHabitCount(activeHabitCounter.id);
                      updateHabitCount(activeHabitCounter.id, current + 1);
                    }}
                    className="w-16 h-16 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white font-black text-3xl shadow-lg shadow-emerald-900/40 active:scale-90 transition flex items-center justify-center border border-emerald-400/40"
                  >
                    +
                  </button>

                  {/* الزر الدائري الكبير بالمنتصف */}
                  <button
                    onClick={() => {
                      const current = getHabitCount(activeHabitCounter.id);
                      updateHabitCount(activeHabitCounter.id, current + 1);
                    }}
                    className="w-36 h-36 rounded-full bg-gradient-to-b from-blue-500 to-blue-600 border-4 border-blue-400/50 flex flex-col items-center justify-center shadow-2xl shadow-blue-500/40 active:scale-95 transition-transform"
                  >
                    <span className="text-5xl font-black text-white drop-shadow-md">
                      {getHabitCount(activeHabitCounter.id)}
                    </span>
                  </button>

                  {/* زر التنقيص (-) الأحمر */}
                  <button
                    onClick={() => {
                      const current = getHabitCount(activeHabitCounter.id);
                      updateHabitCount(activeHabitCounter.id, Math.max(0, current - 1));
                    }}
                    className="w-16 h-16 rounded-full bg-red-700 hover:bg-red-600 text-white font-black text-3xl shadow-lg shadow-red-950/40 active:scale-90 transition flex items-center justify-center border border-red-500/40"
                  >
                    -
                  </button>

                </div>

                <button
                  onClick={() => {
                    updateHabitCount(activeHabitCounter.id, activeHabitCounter.targetCount);
                    setActiveHabitCounter(null);
                  }}
                  className="w-full py-3.5 bg-emerald-500 hover:bg-emerald-400 rounded-2xl font-extrabold text-sm text-black shadow-lg shadow-emerald-500/20 active:scale-95 transition mt-4"
                >
                  تسجيل إكمال الهدف بالكامل ✔️
                </button>
              </div>
            ) : (
              /* واجهة المؤقت التنازلي التفاعلي الممتد */
              <div className="space-y-5 py-2">
                <div className="w-36 h-36 rounded-full border-4 border-blue-500/40 mx-auto flex flex-col items-center justify-center bg-blue-600/10 shadow-inner relative">
                  <span className="text-3xl font-black font-mono tracking-wider text-blue-400">
                    {formatTimerString(timerSecondsLeft)}
                  </span>
                  <span className="text-[10px] text-gray-400 mt-1 font-bold">
                    {isOvertime ? 'وقت إضافي ⏱️' : `المستهدف: ${activeHabitCounter.targetCount} دقيقة`}
                  </span>
                </div>

                {isTimerFinished ? (
                  <div className="space-y-2">
                    <div className="p-2.5 bg-emerald-500/20 text-emerald-300 rounded-xl text-xs font-bold border border-emerald-500/30">
                      🎉 مكتمل! يمكنك زيادة الوقت إضافياً.
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={startOvertime}
                        className="flex-1 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-2xl text-xs shadow-lg active:scale-95 transition"
                      >
                        أكمل الوقت ➕
                      </button>
                      <button
                        onClick={() => setActiveHabitCounter(null)}
                        className="flex-1 py-3 bg-gray-800 text-gray-300 font-bold rounded-2xl text-xs border border-gray-700 active:scale-95 transition"
                      >
                        إكتفاء 🏁
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex gap-2 justify-center">
                    {!isTimerRunning ? (
                      <button
                        onClick={startTimer}
                        className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm rounded-2xl shadow-lg active:scale-95 transition"
                      >
                        ▶️ بدء المؤقت
                      </button>
                    ) : (
                      <button
                        onClick={pauseTimer}
                        className="flex-1 py-3 bg-amber-600 hover:bg-amber-500 text-white font-bold text-sm rounded-2xl shadow-lg active:scale-95 transition"
                      >
                        ⏸️ إيقاف مؤقت
                      </button>
                    )}
                    <button
                      onClick={resetTimer}
                      className="px-4 py-3 bg-gray-800 text-gray-300 hover:text-white rounded-2xl font-bold text-xs border border-gray-700 active:scale-95 transition"
                    >
                      ↺ إعادة
                    </button>
                  </div>
                )}
              </div>
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

              <div>
                <label className="text-xs text-gray-400 block mb-2">تحديد أيام الظهور والتكرار</label>
                <div className="flex justify-between gap-1 bg-[#0d131d] p-2 rounded-2xl border border-gray-700">
                  {DAYS_LOOKUP.map((day) => {
                    const isSelected = selectedDays.includes(day.id);
                    return (
                      <button
                        key={day.id}
                        type="button"
                        onClick={() => toggleDaySelection(day.id)}
                        className={`flex-1 py-2 rounded-xl text-xs font-bold transition ${
                          isSelected
                            ? 'bg-blue-600 text-white shadow-md'
                            : 'bg-gray-800 text-gray-500 hover:text-gray-300'
                        }`}
                      >
                        {day.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {(habitType === 'عداد' || habitType === 'مؤقت') && habitCategory !== 'سيئة' && (
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