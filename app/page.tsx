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
  { id: 0, labelAr: 'أحد', labelEn: 'Sun' },
  { id: 1, labelAr: 'إثنين', labelEn: 'Mon' },
  { id: 2, labelAr: 'ثلاثاء', labelEn: 'Tue' },
  { id: 3, labelAr: 'أربعاء', labelEn: 'Wed' },
  { id: 4, labelAr: 'خميس', labelEn: 'Thu' },
  { id: 5, labelAr: 'جمعة', labelEn: 'Fri' },
  { id: 6, labelAr: 'سبت', labelEn: 'Sat' },
];

const TRANSLATIONS = {
  ar: {
    welcome: 'مرحباً،',
    todayDate: 'تاريخ اليوم:',
    signOut: 'تسجيل الخروج',
    signIn: 'تسجيل الدخول 🔐',
    habitsTab: '🎯 عاداتي اليومية',
    todoTab: '📝 المهام (To-Do)',
    myHabits: 'عاداتي',
    editOrder: 'تعديل والترتيب ✏️',
    doneSave: 'تم الحفظ ✔️',
    noHabits: 'لا توجد عادات مسجلة لهذا اليوم المختار.',
    add: 'إضافة ➕',
    addHabit: 'إضافة عادة جديدة',
    editHabit: 'تعديل العادة',
    habitTitle: 'اسم العادة',
    category: 'تصنيف العادة',
    positive: '🎯 عادة إيجابية (بناء)',
    negative: '🛡️ عادة سيئة (ترك)',
    type: 'نوع العادة',
    task: 'مهمة',
    timer: 'مؤقت',
    counter: 'عداد',
    useRange: '⚙️ تفعيل نطاق مرن (حد أدنى وأقصى)',
    minGoal: 'الحد الأدنى (%100 إنجاز)',
    maxGoal: 'الحد الأقصى (بونص 👑)',
    targetCount: 'تحديد العدد المستهدف',
    color: 'لون أشكال العادة',
    save: 'حفظ',
    cancel: 'إلغاء',
    startTimer: '▶️ بدء المؤقت',
    pauseTimer: '⏸️ إيقاف مؤقت',
    resetTimer: '↺ إعادة',
    repeatDays: 'تحديد أيام الظهور والتكرار',
    accountProfile: 'حساب المستخدم والبريد الإلكتروني',
    userEmail: 'البريد الإلكتروني الحساب:',
    notLoggedIn: 'غير مسجل الدخول (حفظ محلي)',
    interfaceLang: 'لغة الواجهة / Interface Language',
    habitsNav: '✅ العادات',
    historyNav: '📅 السجل',
    goalsNav: '🏆 الأهداف الذكية',
    statsNav: '📊 الإحصائيات',
    placeholderHabitName: 'مثلاً: قراءة قرآن أو ترك السهر',
    addTaskPlaceholder: 'إضافة مهمة جديدة اليوم...',
    taskCompleted: 'مكتملة ✔️',
    taskIncomplete: 'إنجاز',
    targetLabel: 'المستهدف:',
    minLabel: 'الأدنى:',
    currentProgressLabel: 'الإنجاز الحالي',
    overtimeActive: '⚡ الوقت الإضافي شغال',
  },
  en: {
    welcome: 'Welcome,',
    todayDate: 'Today:',
    signOut: 'Sign Out',
    signIn: 'Sign In 🔐',
    habitsTab: '🎯 Daily Habits',
    todoTab: '📝 To-Do List',
    myHabits: 'My Habits',
    editOrder: 'Edit & Reorder ✏️',
    doneSave: 'Saved ✔️',
    noHabits: 'No habits recorded for this selected day.',
    add: 'Add ➕',
    addHabit: 'Add New Habit',
    editHabit: 'Edit Habit',
    habitTitle: 'Habit Title',
    category: 'Habit Category',
    positive: '🎯 Positive Habit',
    negative: '🛡️ Bad Habit (Quit)',
    type: 'Habit Type',
    task: 'Task',
    timer: 'Timer',
    counter: 'Counter',
    useRange: '⚙️ Enable Flexible Range (Min & Max)',
    minGoal: 'Min Goal (100% Complete)',
    maxGoal: 'Max Goal (Bonus 👑)',
    targetCount: 'Set Target Count',
    color: 'Habit Color',
    save: 'Save',
    cancel: 'Cancel',
    startTimer: '▶️ Start Timer',
    pauseTimer: '⏸️ Pause Timer',
    resetTimer: '↺ Reset',
    repeatDays: 'Select Days and Frequency',
    accountProfile: 'User Account & Email Profile',
    userEmail: 'Account Email:',
    notLoggedIn: 'Not Logged In (Local Storage)',
    interfaceLang: 'Interface Language',
    habitsNav: '✅ Habits',
    historyNav: '📅 History',
    goalsNav: '🏆 SMART Goals',
    statsNav: '📊 Statistics',
    placeholderHabitName: 'e.g., Quran Reading or Quit Late Nights',
    addTaskPlaceholder: 'Add a new task today...',
    taskCompleted: 'Done ✔️',
    taskIncomplete: 'Complete',
    targetLabel: 'Target:',
    minLabel: 'Min:',
    currentProgressLabel: 'Current Progress',
    overtimeActive: '⚡ Overtime Active',
  }
};

export default function Home() {
  const [lang, setLang] = useState<'ar' | 'en'>('ar');
  const t = TRANSLATIONS[lang];

  const [user, setUser] = useState<User | null>(null);
  const [displayName, setDisplayName] = useState<string>('هاشم');

  const [habits, setHabits] = useState<Habit[]>([]);
  const [dailyData, setDailyData] = useState<{ [date: string]: DayProgress }>({});
  const [tasks, setTasks] = useState<{ [date: string]: TaskItem[] }>({});
  
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [activeMainTab, setActiveMainTab] = useState<'habits' | 'todo'>('habits');
  
  const [isEditMode, setIsEditMode] = useState(false);

  // Modals & Timers
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingHabit, setEditingHabit] = useState<Habit | null>(null);
  const [activeHabitCounter, setActiveHabitCounter] = useState<Habit | null>(null);

  // Timer States
  const [timerMode, setTimerMode] = useState<'timer' | 'counter'>('counter');
  const [timerSecondsLeft, setTimerSecondsLeft] = useState<number>(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [isOvertime, setIsOvertime] = useState(false);

  // Habit Form State
  const [title, setTitle] = useState('');
  const [habitType, setHabitType] = useState<'عداد' | 'مؤقت' | 'مهمة'>('عداد');
  const [habitCategory, setHabitCategory] = useState<'إيجابية' | 'سيئة'>('إيجابية');
  const [useRange, setUseRange] = useState<boolean>(false);
  const [minValInput, setMinValInput] = useState<number>(10);
  const [maxValInput, setMaxValInput] = useState<number>(30);
  const [targetCount, setTargetCount] = useState<number>(10);
  const [unit, setUnit] = useState('صفحة');
  const [selectedColor, setSelectedColor] = useState(COLOR_OPTIONS[0]);
  const [selectedDays, setSelectedDays] = useState<number[]>([0, 1, 2, 3, 4, 5, 6]);

  const [newTaskInput, setNewTaskInput] = useState('');

  const getLocalDateString = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  useEffect(() => {
    const todayStr = getLocalDateString();
    setSelectedDate(todayStr);

    const savedLang = localStorage.getItem('habit_tracker_lang');
    if (savedLang === 'en' || savedLang === 'ar') setLang(savedLang);

    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        const userDocRef = doc(db, 'users', currentUser.uid);
        const unsubscribeSnapshot = onSnapshot(userDocRef, (docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data();
            if (data.habits) setHabits(data.habits);
            if (data.dailyData) setDailyData(data.dailyData);
            if (data.displayName) setDisplayName(data.displayName);
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

  // إدارة المؤقت والتوقيت الإضافي
  useEffect(() => {
    if (!activeHabitCounter || activeHabitCounter.type !== 'مؤقت') return;

    const habitId = activeHabitCounter.id;
    const storedEndTime = localStorage.getItem(`timer_end_${habitId}`);
    const storedPausedLeft = localStorage.getItem(`timer_paused_${habitId}`);
    const maxVal = activeHabitCounter.maxMinutes || activeHabitCounter.targetCount || 30;

    if (storedEndTime) {
      const endTime = parseInt(storedEndTime, 10);
      const remaining = Math.max(0, Math.floor((endTime - Date.now()) / 1000));
      setTimerSecondsLeft(remaining);
      setIsTimerRunning(remaining > 0);
    } else if (storedPausedLeft) {
      setTimerSecondsLeft(parseInt(storedPausedLeft, 10));
      setIsTimerRunning(false);
    } else {
      const currentDoneMinutes = getHabitCount(habitId);
      const remainingMinutes = Math.max(0, maxVal - currentDoneMinutes);
      setTimerSecondsLeft(remainingMinutes * 60);
      setIsTimerRunning(false);
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
              localStorage.removeItem(`timer_end_${activeHabitCounter.id}`);
              localStorage.removeItem(`timer_paused_${activeHabitCounter.id}`);
              const maxVal = activeHabitCounter.maxMinutes || activeHabitCounter.targetCount || 30;
              updateHabitCount(activeHabitCounter.id, maxVal);
            }
          }
        }
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [isTimerRunning, isOvertime, activeHabitCounter]);

  const startTimer = () => {
    if (!activeHabitCounter) return;
    const maxVal = activeHabitCounter.maxMinutes || activeHabitCounter.targetCount || 30;
    const duration = timerSecondsLeft > 0 ? timerSecondsLeft : maxVal * 60;
    const endTime = Date.now() + duration * 1000;
    localStorage.setItem(`timer_end_${activeHabitCounter.id}`, endTime.toString());
    localStorage.removeItem(`timer_paused_${activeHabitCounter.id}`);
    setIsTimerRunning(true);
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
    setIsOvertime(false);
    const maxVal = activeHabitCounter.maxMinutes || activeHabitCounter.targetCount || 30;
    const currentDone = getHabitCount(activeHabitCounter.id);
    const remaining = Math.max(0, maxVal - currentDone);
    setTimerSecondsLeft(remaining * 60);
  };

  const toggleLanguage = (newLang: 'ar' | 'en') => {
    setLang(newLang);
    localStorage.setItem('habit_tracker_lang', newLang);
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
    updatedTasks = tasks,
    nameToSave = displayName
  ) => {
    setHabits(updatedHabits);
    setDailyData(updatedDaily);
    setTasks(updatedTasks);

    if (user) {
      try {
        await setDoc(doc(db, 'users', user.uid), { 
          habits: updatedHabits, 
          dailyData: updatedDaily, 
          tasks: updatedTasks,
          displayName: nameToSave
        }, { merge: true });
      } catch (err) {
        console.error('Error saving data:', err);
      }
    } else {
      localStorage.setItem('habit_tracker_habits', JSON.stringify(updatedHabits));
      localStorage.setItem('habit_tracker_daily', JSON.stringify(updatedDaily));
      localStorage.setItem('habit_tracker_tasks', JSON.stringify(updatedTasks));
      localStorage.setItem('habit_tracker_user_name', nameToSave);
    }
  };

  const moveHabit = (index: number, direction: 'up' | 'down') => {
    const currentVisible = visibleHabits;
    const targetVisibleIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetVisibleIndex < 0 || targetVisibleIndex >= currentVisible.length) return;

    const itemToMove = currentVisible[index];
    const itemToSwap = currentVisible[targetVisibleIndex];

    const fullIndex1 = habits.findIndex((h) => h.id === itemToMove.id);
    const fullIndex2 = habits.findIndex((h) => h.id === itemToSwap.id);

    if (fullIndex1 !== -1 && fullIndex2 !== -1) {
      const newHabits = [...habits];
      const temp = newHabits[fullIndex1];
      newHabits[fullIndex1] = newHabits[fullIndex2];
      newHabits[fullIndex2] = temp;
      saveData(newHabits, dailyData);
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
      const minThresh = habit.minMinutes || habit.targetCount;
      const isCompleted = currentCount >= minThresh;
      updateHabitCount(habit.id, isCompleted ? 0 : minThresh);
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

    const finalTarget = habitType === 'مهمة' ? 1 : useRange ? maxValInput : Number(targetCount) || 1;
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
              minMinutes: useRange ? minValInput : undefined,
              maxMinutes: useRange ? maxValInput : undefined,
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
        minMinutes: useRange ? minValInput : undefined,
        maxMinutes: useRange ? maxValInput : undefined,
        unit: finalUnit,
        color: selectedColor,
        repeatDays: selectedDays,
        category: habitCategory,
        preferredMode: 'counter',
        streakCount: 0
      };
      updatedHabits = [...habits, newHabit];
    }

    saveData(updatedHabits, dailyData);
    setTitle('');
    setEditingHabit(null);
    setIsAddModalOpen(false);
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
        const minThresh = h.minMinutes || h.targetCount || 1;
        habitsCompletedScore += Math.min(1, cnt / minThresh);
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
        label: lang === 'ar' ? 'يا استثنائي' : 'Exceptional', 
        desc: lang === 'ar' ? 'أداء مبهر يفوق التوقعات!' : 'Outstanding performance!',
        bgGradient: 'from-amber-400 via-yellow-500 to-amber-600',
        textColor: 'text-black'
      };
    }
    if (pct >= 80) {
      return { 
        trophy: '🥇', 
        label: lang === 'ar' ? 'ممتاز' : 'Excellent', 
        desc: lang === 'ar' ? 'إنجاز رفيع ومستوى متقدم' : 'Great progress and level',
        bgGradient: 'from-yellow-500 to-amber-500',
        textColor: 'text-black'
      };
    }
    return { 
      trophy: '🥈', 
      label: lang === 'ar' ? 'جيد' : 'Good', 
      desc: lang === 'ar' ? 'استمرار رائع وتقدم ملحوظ' : 'Consistent effort',
      bgGradient: 'from-slate-300 via-gray-400 to-slate-500',
      textColor: 'text-black'
    };
  };

  const status = getTrophyStatus(totalPercentage);

  const formatTimerString = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  return (
    <div className={`max-w-4xl mx-auto min-h-screen bg-[#0d131d] text-white p-4 md:p-8 font-sans pb-28 select-none ${lang === 'ar' ? 'dir-rtl text-right' : 'dir-ltr text-left'}`} dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      
      {/* 1. الترويسة الشاملة والبروفايل */}
      <div className="flex justify-between items-center mb-6 pt-2">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setIsProfileModalOpen(true)}
            className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-500 border border-blue-400/40 flex items-center justify-center font-bold text-xl shadow-lg shadow-blue-500/20 hover:scale-105 active:scale-95 transition cursor-pointer"
          >
            👤
          </button>
          <div>
            <h1 className="text-xl md:text-2xl font-extrabold text-white">{t.welcome} {displayName}</h1>
            <p className="text-xs text-blue-400/80 font-medium">{t.todayDate} {selectedDate}</p>
          </div>
        </div>

        <div>
          {user ? (
            <button onClick={() => signOut(auth)} className="text-xs bg-red-500/20 text-red-400 px-3.5 py-2 rounded-xl font-bold border border-red-500/30 hover:bg-red-500/30 transition">
              {t.signOut}
            </button>
          ) : (
            <button onClick={() => setIsAuthModalOpen(true)} className="text-xs bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 px-3.5 py-2 rounded-xl font-bold shadow-lg shadow-blue-600/30 transition">
              {t.signIn}
            </button>
          )}
        </div>
      </div>

      {/* نافذة البروفايل 👤 */}
      {isProfileModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-[#18202e] border border-gray-700/80 rounded-3xl p-6 w-full max-w-md space-y-5 text-white shadow-2xl relative my-8">
            <button 
              onClick={() => setIsProfileModalOpen(false)} 
              className="absolute top-4 left-4 text-gray-400 hover:text-white text-lg font-bold"
            >
              ✕
            </button>

            <div className="w-20 h-20 mx-auto rounded-3xl bg-gradient-to-tr from-blue-600 to-indigo-500 border-2 border-blue-400/50 flex items-center justify-center text-4xl shadow-xl shadow-blue-500/30 mt-2">
              👤
            </div>

            <h3 className="text-2xl font-black text-center">{displayName}</h3>

            <div className="bg-[#0d131d] border border-gray-800 rounded-2xl p-4 space-y-2">
              <label className="text-xs font-bold text-gray-400 block">{t.accountProfile}</label>
              <div className="text-sm font-bold text-blue-400 bg-[#161e2c] p-3 rounded-xl border border-gray-800">
                {user ? user.email : t.notLoggedIn}
              </div>
            </div>

            <div className="bg-[#0d131d] border border-gray-800 p-3 rounded-2xl flex justify-between items-center text-xs font-bold">
              <span className="text-gray-300">{t.interfaceLang}</span>
              <div className="flex gap-1">
                <button onClick={() => toggleLanguage('ar')} className={`px-3 py-1.5 rounded-xl ${lang === 'ar' ? 'bg-blue-600 text-white' : 'text-gray-400'}`}>العربية</button>
                <button onClick={() => toggleLanguage('en')} className={`px-3 py-1.5 rounded-xl ${lang === 'en' ? 'bg-blue-600 text-white' : 'text-gray-400'}`}>English</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. شريط النسبة المئوية للتقييم والكأس */}
      <div className={`bg-gradient-to-r ${status.bgGradient} ${status.textColor} p-4.5 rounded-3xl flex justify-between items-center px-6 shadow-xl mb-6 border border-white/20 transition-all duration-300`}>
        <div className="flex items-center gap-3.5">
          <span className="text-3xl filter drop-shadow">{status.trophy}</span>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-black text-lg tracking-wide block">{totalPercentage}%</span>
              <span className="text-xs font-black px-2 py-0.5 rounded-lg bg-black/20 backdrop-blur-sm">
                {status.label}
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

      {/* 3. تبويبات الصفحة الرئيسية */}
      <div className="grid grid-cols-2 gap-1.5 bg-[#161e2c] p-1.5 rounded-2xl border border-gray-700/80 mb-6 text-center text-xs md:text-sm font-bold">
        <button
          onClick={() => setActiveMainTab('habits')}
          className={`py-3 rounded-xl transition ${
            activeMainTab === 'habits' ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg' : 'text-gray-400 hover:text-white'
          }`}
        >
          {t.habitsTab}
        </button>
        <button
          onClick={() => setActiveMainTab('todo')}
          className={`py-3 rounded-xl transition ${
            activeMainTab === 'todo' ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg' : 'text-gray-400 hover:text-white'
          }`}
        >
          {t.todoTab}
        </button>
      </div>

      {/* قسم العادات اليومية */}
      {activeMainTab === 'habits' && (
        <>
          <div className="flex justify-between items-center mb-4 px-2">
            <h2 className="text-2xl font-bold">{t.myHabits}</h2>
            <button
              onClick={() => setIsEditMode(!isEditMode)}
              className={`text-xs px-4 py-2 rounded-xl font-bold transition shadow-md ${
                isEditMode ? 'bg-emerald-500 text-white shadow-emerald-500/20' : 'bg-[#18202e] text-gray-300 hover:bg-gray-700 border border-gray-700/80'
              }`}
            >
              {isEditMode ? t.doneSave : t.editOrder}
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {visibleHabits.length === 0 ? (
              <div className="col-span-full text-center py-12 text-gray-500 text-sm bg-[#131a26] rounded-3xl border border-dashed border-gray-800">
                {t.noHabits}
              </div>
            ) : (
              visibleHabits.map((habit, index) => (
                <HabitCard
                  key={habit.id}
                  habit={habit}
                  count={getHabitCount(habit.id)}
                  isEditMode={isEditMode}
                  lang={lang}
                  onCounterClick={() => {
                    setActiveHabitCounter(habit);
                    setTimerMode(habit.preferredMode || 'counter');
                  }}
                  onQuickToggle={(e) => toggleQuickComplete(e, habit)}
                  onEdit={() => {
                    setEditingHabit(habit);
                    setTitle(habit.title);
                    setHabitType(habit.type || 'عداد');
                    setHabitCategory(habit.category || 'إيجابية');
                    setUseRange(!!(habit.minMinutes && habit.maxMinutes));
                    setMinValInput(habit.minMinutes || 10);
                    setMaxValInput(habit.maxMinutes || 30);
                    setTargetCount(habit.targetCount || 10);
                    setUnit(habit.unit);
                    setSelectedColor(habit.color);
                    setSelectedDays(habit.repeatDays || [0, 1, 2, 3, 4, 5, 6]);
                    setIsAddModalOpen(true);
                  }}
                  onDelete={() => saveData(habits.filter((h) => h.id !== habit.id), dailyData)}
                  onMoveUp={index > 0 ? () => moveHabit(index, 'up') : undefined}
                  onMoveDown={index < visibleHabits.length - 1 ? () => moveHabit(index, 'down') : undefined}
                />
              ))
            )}
          </div>
        </>
      )}

      {/* قسم المهام (To-Do) */}
      {activeMainTab === 'todo' && (
        <div className="space-y-4">
          <form onSubmit={addTask} className="flex gap-2">
            <input
              type="text"
              placeholder={t.addTaskPlaceholder}
              value={newTaskInput}
              onChange={(e) => setNewTaskInput(e.target.value)}
              className="flex-1 bg-[#161e2c] border border-gray-700/80 p-3 rounded-2xl outline-none text-white text-sm focus:border-blue-500"
            />
            <button type="submit" className="bg-blue-600 hover:bg-blue-500 text-white px-5 py-3 rounded-2xl text-sm font-bold shadow-lg transition">
              {t.add}
            </button>
          </form>

          <div className="space-y-2">
            {currentDayTasks.map((task) => (
              <div key={task.id} className="bg-[#161e2c] border border-gray-800 p-3.5 rounded-2xl flex justify-between items-center text-sm font-bold">
                <span className={task.completed ? 'line-through text-gray-500' : 'text-white'}>{task.title}</span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => toggleTask(task.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${task.completed ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/30' : 'bg-gray-800 text-gray-300'}`}
                  >
                    {task.completed ? t.taskCompleted : t.taskIncomplete}
                  </button>
                  <button onClick={() => deleteTask(task.id)} className="text-red-400 p-1">🗑️</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* نافذة العداد والمؤقت التفاعلي المطابقة للصور المرفقة ⏱️ */}
      {activeHabitCounter && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <div className="bg-[#121824] border border-gray-800 rounded-3xl p-6 w-full max-w-sm space-y-5 text-white text-center shadow-2xl relative">
            <button
              onClick={() => {
                setActiveHabitCounter(null);
                setIsTimerRunning(false);
              }}
              className="absolute top-4 left-4 text-gray-400 hover:text-white text-lg font-bold"
            >
              ✕
            </button>

            <div className="bg-[#1c2536] p-4 rounded-2xl border border-gray-700/60 space-y-1 mt-4">
              <h3 className="text-2xl font-black">{activeHabitCounter.title}</h3>
              <p className="text-xs text-gray-400 font-bold">
                {t.targetLabel} {activeHabitCounter.targetCount} {activeHabitCounter.unit}
              </p>
            </div>

            {activeHabitCounter.type === 'مؤقت' && (
              <div className="flex justify-between items-center bg-[#0a0f18] p-2.5 rounded-2xl border border-gray-800">
                <span className="text-xs font-bold text-gray-300">
                  {timerMode === 'timer' ? '⏱️ مؤقت تفاعلي' : '📊 عداد يدوي'}
                </span>
                <button
                  onClick={() => {
                    const nextMode = timerMode === 'timer' ? 'counter' : 'timer';
                    setTimerMode(nextMode);
                    setIsTimerRunning(false);
                  }}
                  className={`w-12 h-6 rounded-full p-1 transition flex items-center ${
                    timerMode === 'timer' ? 'bg-blue-600 justify-end' : 'bg-gray-700 justify-start'
                  }`}
                >
                  <div className="w-4 h-4 rounded-full bg-white shadow-md" />
                </button>
              </div>
            )}

            {(activeHabitCounter.type !== 'مؤقت' || timerMode === 'counter') ? (
              <div className="py-2 space-y-4">
                <div className="flex justify-center items-center gap-5 my-2">
                  <button
                    onClick={() => updateHabitCount(activeHabitCounter.id, Math.max(0, getHabitCount(activeHabitCounter.id) - 1))}
                    className="w-16 h-16 rounded-full bg-red-600 hover:bg-red-500 text-white font-black text-3xl shadow-lg active:scale-90 transition flex items-center justify-center border border-red-400/40"
                  >
                    -
                  </button>

                  <div className="w-32 h-32 rounded-full border-4 border-blue-500 bg-blue-600/20 text-blue-400 flex flex-col items-center justify-center shadow-xl">
                    <span className="text-4xl font-black">{getHabitCount(activeHabitCounter.id)}</span>
                    <span className="text-[10px] text-gray-300 font-bold mt-1">
                      {activeHabitCounter.minMinutes ? `${t.minLabel} ${activeHabitCounter.minMinutes}` : t.currentProgressLabel}
                    </span>
                  </div>

                  <button
                    onClick={() => updateHabitCount(activeHabitCounter.id, getHabitCount(activeHabitCounter.id) + 1)}
                    className="w-16 h-16 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white font-black text-3xl shadow-lg active:scale-90 transition flex items-center justify-center border border-emerald-400/40"
                  >
                    +
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4 py-2">
                <div className="w-36 h-36 rounded-full border-4 border-blue-500/40 mx-auto flex flex-col items-center justify-center bg-blue-600/10 shadow-inner">
                  <span className="text-3xl font-black font-mono tracking-wider text-blue-400">
                    {formatTimerString(timerSecondsLeft)}
                  </span>
                  {isOvertime && <span className="text-[10px] text-amber-400 font-bold">{t.overtimeActive}</span>}
                </div>

                <div className="flex gap-2 justify-center">
                  {!isTimerRunning ? (
                    <button onClick={startTimer} className="flex-1 py-3 bg-emerald-600 text-white font-bold text-sm rounded-2xl">
                      {t.startTimer}
                    </button>
                  ) : (
                    <button onClick={pauseTimer} className="flex-1 py-3 bg-amber-600 text-white font-bold text-sm rounded-2xl">
                      {t.pauseTimer}
                    </button>
                  )}
                  <button onClick={resetTimer} className="px-4 py-3 bg-gray-800 text-gray-300 rounded-2xl text-xs font-bold">
                    {t.resetTimer}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* شاشة إضافة أو تعديل عادة المطابقة للتصميم الأصلي */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-[#18202e] border border-gray-700/80 rounded-3xl p-6 w-full max-w-md space-y-4 text-white shadow-2xl my-8">
            <div className="flex justify-between items-center border-b border-gray-700/80 pb-3">
              <button onClick={() => setIsAddModalOpen(false)} className="text-gray-400 text-sm">{t.cancel}</button>
              <h3 className="text-lg font-bold">{editingHabit ? t.editHabit : t.addHabit}</h3>
              <button onClick={handleSaveHabit} className="text-blue-400 font-bold text-sm">{t.save}</button>
            </div>

            <form onSubmit={handleSaveHabit} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-gray-400 block mb-1">{t.habitTitle}</label>
                <input
                  type="text"
                  placeholder={t.placeholderHabitName}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-[#0d131d] border border-gray-700 p-3 rounded-xl outline-none text-white text-sm"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-bold text-gray-400 block mb-1">{t.category}</label>
                <div className="grid grid-cols-2 gap-2 bg-[#0d131d] p-1.5 rounded-2xl border border-gray-700 text-center text-xs font-bold">
                  <button type="button" onClick={() => setHabitCategory('إيجابية')} className={`py-2 rounded-xl ${habitCategory === 'إيجابية' ? 'bg-emerald-600 text-white' : 'text-gray-400'}`}>{t.positive}</button>
                  <button type="button" onClick={() => setHabitCategory('سيئة')} className={`py-2 rounded-xl ${habitCategory === 'سيئة' ? 'bg-amber-600 text-white' : 'text-gray-400'}`}>{t.negative}</button>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-400 block mb-1">{t.type}</label>
                <div className="grid grid-cols-3 gap-1 bg-[#0d131d] p-1.5 rounded-2xl border border-gray-700 text-center text-xs font-bold">
                  <button type="button" onClick={() => setHabitType('عداد')} className={`py-2 rounded-xl ${habitType === 'عداد' ? 'bg-blue-600 text-white' : 'text-gray-400'}`}>{t.counter}</button>
                  <button type="button" onClick={() => setHabitType('مؤقت')} className={`py-2 rounded-xl ${habitType === 'مؤقت' ? 'bg-blue-600 text-white' : 'text-gray-400'}`}>{t.timer}</button>
                  <button type="button" onClick={() => setHabitType('مهمة')} className={`py-2 rounded-xl ${habitType === 'مهمة' ? 'bg-blue-600 text-white' : 'text-gray-400'}`}>{t.task}</button>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-400 block mb-1">{t.repeatDays}</label>
                <div className="flex gap-1 justify-between bg-[#0d131d] p-2 rounded-2xl border border-gray-700">
                  {DAYS_LOOKUP.map((day) => (
                    <button
                      key={day.id}
                      type="button"
                      onClick={() => toggleDaySelection(day.id)}
                      className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition ${
                        selectedDays.includes(day.id) ? 'bg-blue-600 text-white' : 'bg-transparent text-gray-500'
                      }`}
                    >
                      {lang === 'ar' ? day.labelAr : day.labelEn}
                    </button>
                  ))}
                </div>
              </div>

              <div className="bg-[#0d131d] p-3 rounded-2xl border border-gray-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-blue-400">{t.useRange}</span>
                  <button
                    type="button"
                    onClick={() => setUseRange(!useRange)}
                    className={`w-12 h-6 rounded-full p-1 transition flex items-center ${useRange ? 'bg-blue-600 justify-end' : 'bg-gray-700 justify-start'}`}
                  >
                    <div className="w-4 h-4 rounded-full bg-white shadow-md" />
                  </button>
                </div>

                {useRange ? (
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <div>
                      <label className="text-[11px] text-gray-400 block mb-1">{t.minGoal}</label>
                      <input
                        type="number"
                        value={minValInput}
                        onChange={(e) => setMinValInput(Number(e.target.value))}
                        className="w-full bg-[#161e2c] border border-gray-700 p-2 rounded-xl text-center text-sm font-bold"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-gray-400 block mb-1">{t.maxGoal}</label>
                      <input
                        type="number"
                        value={maxValInput}
                        onChange={(e) => setMaxValInput(Number(e.target.value))}
                        className="w-full bg-[#161e2c] border border-gray-700 p-2 rounded-xl text-center text-sm font-bold"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex justify-between items-center text-xs font-bold">
                      <span className="text-gray-400">{t.targetCount}</span>
                      <span className="text-blue-400 font-bold">{targetCount}</span>
                    </div>
                    <input
                      type="range"
                      min="1"
                      max="100"
                      value={targetCount}
                      onChange={(e) => setTargetCount(Number(e.target.value))}
                      className="w-full accent-blue-500 cursor-pointer"
                    />
                  </div>
                )}
              </div>

              <div>
                <label className="text-xs font-bold text-gray-400 block mb-2">{t.color}</label>
                <div className="flex gap-3 justify-center">
                  {COLOR_OPTIONS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setSelectedColor(color)}
                      style={{ backgroundColor: color }}
                      className={`w-8 h-8 rounded-2xl border-2 ${selectedColor === color ? 'border-white scale-110' : 'border-transparent'}`}
                    />
                  ))}
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* زر العادة العائم (+) */}
      {activeMainTab === 'habits' && (
        <button
          onClick={() => {
            setEditingHabit(null);
            setTitle('');
            setIsAddModalOpen(true);
          }}
          className="fixed bottom-16 right-8 w-14 h-14 bg-blue-600 text-white rounded-2xl shadow-2xl text-3xl font-bold flex items-center justify-center z-40"
        >
          +
        </button>
      )}

      {/* شريط التنقل السفلي الثابت وبداخله الخيارات الأربعة كاملة */}
      <div className="fixed bottom-0 left-0 right-0 bg-[#131a26]/90 backdrop-blur-lg border-t border-gray-800 py-3 px-6 flex justify-around items-center z-50 text-xs font-bold">
        <Link href="/" className="text-blue-400">{t.habitsNav}</Link>
        <Link href="/history" className="text-gray-400 hover:text-white transition">{t.historyNav}</Link>
        <Link href="/goals" className="text-gray-400 hover:text-white transition">{t.goalsNav}</Link>
        <Link href="/stats" className="text-gray-400 hover:text-white transition">{t.statsNav}</Link>
      </div>

    </div>
  );
}