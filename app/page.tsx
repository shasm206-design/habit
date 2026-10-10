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

export interface ExtendedGoal {
  id: string;
  title: string;
  period: 'week' | 'month' | 'year';
  completed: boolean;
}

const COLOR_OPTIONS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

const TRANSLATIONS = {
  ar: {
    welcome: 'مرحباً،',
    todayDate: 'تاريخ اليوم:',
    signOut: 'تسجيل الخروج',
    signIn: 'تسجيل الدخول 🔐',
    habitsTab: '🎯 عاداتي اليومية',
    todoTab: '📝 المهام (To-Do)',
    goalsTab: '🏆 أهدافي الممتدة',
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
    weekGoals: '📅 أهداف الأسبوع',
    monthGoals: '🗓️ أهداف الشهر',
    yearGoals: '🚀 أهداف السنة',
    goalsRatio: 'نسبة إنجاز أهداف',
    goalsCompleted: 'أهداف مكتملة',
    accountDetails: 'تفاصيل الحساب الشخصي 👤',
    loggedInSync: 'حساب مسجل ومُتزامن سحابياً ✅',
    guestAccount: 'حساب زائر محلي (غير مسجل) 📱',
    email: 'البريد الإلكتروني:',
    sessionDate: 'تاريخ الجلسة:',
    minReached: '🎉 رائع! حققت الحد الأدنى (%100 إنجاز). يمكنك الاكتفاء أو المواصلة للبونص 👑',
    startTimer: '▶️ بدء المؤقت',
    pauseTimer: '⏸️ إيقاف مؤقت',
    resetTimer: '↺ إعادة',
    overtime: 'وقت إضافي ⏱️',
    langLabel: 'لغة الواجهة / Language:'
  },
  en: {
    welcome: 'Welcome,',
    todayDate: 'Today:',
    signOut: 'Sign Out',
    signIn: 'Sign In 🔐',
    habitsTab: '🎯 Daily Habits',
    todoTab: '📝 To-Do List',
    goalsTab: '🏆 Extended Goals',
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
    color: 'Habit Shapes Color',
    save: 'Save',
    cancel: 'Cancel',
    weekGoals: '📅 Weekly Goals',
    monthGoals: '🗓️ Monthly Goals',
    yearGoals: '🚀 Yearly Goals',
    goalsRatio: 'Goal Progress for',
    goalsCompleted: 'goals completed',
    accountDetails: 'Account Details 👤',
    loggedInSync: 'Logged in & Cloud Synced ✅',
    guestAccount: 'Local Guest Account 📱',
    email: 'Email:',
    sessionDate: 'Session Date:',
    minReached: '🎉 Awesome! Min goal reached (100%). Stop here or keep going for bonus 👑',
    startTimer: '▶️ Start Timer',
    pauseTimer: '⏸️ Pause Timer',
    resetTimer: '↺ Reset',
    overtime: 'Overtime ⏱️',
    langLabel: 'Interface Language:'
  }
};

export default function Home() {
  const [lang, setLang] = useState<'ar' | 'en'>('ar');
  const t = TRANSLATIONS[lang];

  const [user, setUser] = useState<User | null>(null);
  const [displayName, setDisplayName] = useState<string>('هاشم');
  const [isEditingName, setIsEditingName] = useState(false);
  const [tempNameInput, setTempNameInput] = useState('');

  const [habits, setHabits] = useState<Habit[]>([]);
  const [dailyData, setDailyData] = useState<{ [date: string]: DayProgress }>({});
  const [tasks, setTasks] = useState<{ [date: string]: TaskItem[] }>({});
  const [extendedGoals, setExtendedGoals] = useState<ExtendedGoal[]>([]);
  
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [activeMainTab, setActiveMainTab] = useState<'habits' | 'todo' | 'goals'>('habits');
  const [goalSubPeriod, setGoalSubPeriod] = useState<'week' | 'month' | 'year'>('week');
  
  const [isEditMode, setIsEditMode] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

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
  const [isTimerFinished, setIsTimerFinished] = useState(false);
  const [isOvertime, setIsOvertime] = useState(false);

  // Auth State
  const [authTab, setAuthTab] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberEmail, setRememberEmail] = useState(true);
  const [authError, setAuthError] = useState('');

  // Form State
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
  const [newGoalInput, setNewGoalInput] = useState('');

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

    const savedLang = localStorage.getItem('habit_tracker_lang');
    if (savedLang === 'en' || savedLang === 'ar') setLang(savedLang);

    const savedEmail = localStorage.getItem('habit_tracker_saved_email');
    if (savedEmail) setEmail(savedEmail);

    const savedName = localStorage.getItem('habit_tracker_user_name');
    if (savedName) setDisplayName(savedName);

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
            if (data.extendedGoals) setExtendedGoals(data.extendedGoals);
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
        const savedGoals = localStorage.getItem('habit_tracker_goals');
        if (savedGoals) setExtendedGoals(JSON.parse(savedGoals));
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

  const toggleLanguage = (newLang: 'ar' | 'en') => {
    setLang(newLang);
    localStorage.setItem('habit_tracker_lang', newLang);
  };

  // إدارة المؤقت التفاعلي
  useEffect(() => {
    if (!activeHabitCounter || activeHabitCounter.type !== 'مؤقت') return;

    const habitId = activeHabitCounter.id;
    const storedEndTime = localStorage.getItem(`timer_end_${habitId}`);
    const storedPausedLeft = localStorage.getItem(`timer_paused_${habitId}`);

    const maxGoal = activeHabitCounter.maxMinutes || activeHabitCounter.targetCount || 30;

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
      const remainingMinutes = Math.max(0, maxGoal - currentDoneMinutes);
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
    const maxVal = activeHabitCounter.maxMinutes || activeHabitCounter.targetCount || 30;
    const currentDone = getHabitCount(activeHabitCounter.id);
    const remaining = Math.max(0, maxVal - currentDone);
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
    updatedTasks = tasks,
    nameToSave = displayName,
    updatedGoals = extendedGoals
  ) => {
    setHabits(updatedHabits);
    setDailyData(updatedDaily);
    setTasks(updatedTasks);
    setExtendedGoals(updatedGoals);

    if (user) {
      try {
        const userDocRef = doc(db, 'users', user.uid);
        await setDoc(userDocRef, { 
          habits: updatedHabits, 
          dailyData: updatedDaily, 
          tasks: updatedTasks,
          displayName: nameToSave,
          extendedGoals: updatedGoals
        }, { merge: true });
      } catch (err) {
        console.error('خطأ في حفظ البيانات:', err);
      }
    } else {
      localStorage.setItem('habit_tracker_habits', JSON.stringify(updatedHabits));
      localStorage.setItem('habit_tracker_daily', JSON.stringify(updatedDaily));
      localStorage.setItem('habit_tracker_tasks', JSON.stringify(updatedTasks));
      localStorage.setItem('habit_tracker_goals', JSON.stringify(updatedGoals));
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

  const handleDragStart = (index: number) => {
    if (!isEditMode) return;
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent) => {
    if (!isEditMode) return;
    e.preventDefault();
  };

  const handleDrop = (targetIndex: number) => {
    if (!isEditMode || draggedIndex === null || draggedIndex === targetIndex) return;

    const currentVisible = visibleHabits;
    const itemToMove = currentVisible[draggedIndex];
    const itemToSwap = currentVisible[targetIndex];

    const fullIndex1 = habits.findIndex((h) => h.id === itemToMove.id);
    const fullIndex2 = habits.findIndex((h) => h.id === itemToSwap.id);

    if (fullIndex1 !== -1 && fullIndex2 !== -1) {
      const newHabits = [...habits];
      const temp = newHabits[fullIndex1];
      newHabits[fullIndex1] = newHabits[fullIndex2];
      newHabits[fullIndex2] = temp;
      saveData(newHabits, dailyData);
    }
    setDraggedIndex(null);
  };

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    try {
      if (rememberEmail) {
        localStorage.setItem('habit_tracker_saved_email', email);
      } else {
        localStorage.removeItem('habit_tracker_saved_email');
      }

      if (authTab === 'signup') {
        await createUserWithEmailAndPassword(auth, email, password);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
      setIsAuthModalOpen(false);
      setPassword('');
    } catch (err: any) {
      setAuthError(err.message || 'حدث خطأ أثناء إجراء الدخول');
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

  const handleSaveName = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tempNameInput.trim()) return;
    setDisplayName(tempNameInput);
    saveData(habits, dailyData, tasks, tempNameInput);
    setIsEditingName(false);
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

  const addExtendedGoal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGoalInput.trim()) return;
    const newGoal: ExtendedGoal = {
      id: Date.now().toString(),
      title: newGoalInput,
      period: goalSubPeriod,
      completed: false
    };
    const updated = [...extendedGoals, newGoal];
    saveData(habits, dailyData, tasks, displayName, updated);
    setNewGoalInput('');
  };

  const toggleExtendedGoal = (goalId: string) => {
    const updated = extendedGoals.map((g) => g.id === goalId ? { ...g, completed: !g.completed } : g);
    saveData(habits, dailyData, tasks, displayName, updated);
  };

  const deleteExtendedGoal = (goalId: string) => {
    const updated = extendedGoals.filter((g) => g.id !== goalId);
    saveData(habits, dailyData, tasks, displayName, updated);
  };

  const calculateHabitScore = (habit: Habit, count: number) => {
    if (habit.category === 'سيئة') return count === 0 ? 1 : 0;
    
    const minThresh = habit.minMinutes || habit.targetCount || 1;
    const maxThresh = habit.maxMinutes || habit.targetCount || minThresh;

    if (count < minThresh) {
      return count / minThresh;
    } else {
      const bonusPct = maxThresh > minThresh ? ((count - minThresh) / (maxThresh - minThresh)) * 0.2 : 0;
      return 1.0 + bonusPct;
    }
  };

  const calculateTotalDayPercentage = () => {
    const habitsCount = visibleHabits.length;
    const tasksCount = currentDayTasks.length;
    const totalItems = habitsCount + tasksCount;

    if (totalItems === 0) return 0;

    let habitsCompletedScore = 0;
    visibleHabits.forEach((h) => {
      const cnt = getHabitCount(h.id);
      habitsCompletedScore += calculateHabitScore(h, cnt);
    });

    const tasksCompletedScore = currentDayTasks.filter((t) => t.completed).length;

    return Math.round(((habitsCompletedScore + tasksCompletedScore) / totalItems) * 100);
  };

  const totalPercentage = calculateTotalDayPercentage();

  const getTrophyStatus = (pct: number) => {
    if (pct >= 100) {
      return { 
        trophy: '👑', 
        label: lang === 'ar' ? 'يا استثنائي (بونص)' : 'Exceptional (Bonus)', 
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

  const filteredGoals = extendedGoals.filter((g) => g.period === goalSubPeriod);
  const completedGoalsCount = filteredGoals.filter((g) => g.completed).length;
  const goalsPct = filteredGoals.length > 0 ? Math.round((completedGoalsCount / filteredGoals.length) * 100) : 0;

  const currentTimerDone = activeHabitCounter ? getHabitCount(activeHabitCounter.id) : 0;
  const minValThresh = activeHabitCounter?.minMinutes || activeHabitCounter?.targetCount || 1;
  const maxValThresh = activeHabitCounter?.maxMinutes || activeHabitCounter?.targetCount || minValThresh;
  const isMinReached = currentTimerDone >= minValThresh;

  return (
    <div className={`max-w-4xl mx-auto min-h-screen bg-[#0d131d] text-white p-4 md:p-8 font-sans pb-28 select-none ${lang === 'ar' ? 'dir-rtl text-right' : 'dir-ltr text-left'}`} dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      
      {/* 1. الترويسة الرئيسية + تفاصيل الحساب */}
      <div className="flex justify-between items-center mb-6 pt-2">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setIsProfileModalOpen(true)}
            className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-500 border border-blue-400/40 flex items-center justify-center font-bold text-xl shadow-lg shadow-blue-500/20 hover:scale-105 active:scale-95 transition cursor-pointer"
          >
            👤
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl md:text-2xl font-extrabold bg-gradient-to-r from-white via-gray-200 to-gray-400 bg-clip-text text-transparent">
                {t.welcome} {displayName}
              </h1>
              <button 
                onClick={() => {
                  setTempNameInput(displayName);
                  setIsEditingName(true);
                }} 
                className="text-xs text-blue-400 hover:text-blue-300 font-bold p-1 bg-blue-500/10 rounded-lg border border-blue-500/20"
              >
                ✏️
              </button>
            </div>
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

      {/* نافذة تفاصيل الحساب مع زر تبديل اللغة المخصص بداخلها 👤 */}
      {isProfileModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <div className="bg-[#18202e] border border-gray-700/80 rounded-3xl p-6 w-full max-w-sm space-y-5 text-white shadow-2xl relative text-center">
            <button 
              onClick={() => setIsProfileModalOpen(false)} 
              className="absolute top-4 left-4 text-gray-400 hover:text-white text-lg font-bold"
            >
              ✕
            </button>

            <div className="w-20 h-20 mx-auto rounded-3xl bg-gradient-to-tr from-blue-600 to-indigo-500 border-2 border-blue-400/50 flex items-center justify-center text-4xl shadow-xl shadow-blue-500/30 mt-2">
              👤
            </div>

            <div className="space-y-1">
              <h3 className="text-2xl font-black">{displayName}</h3>
              <p className="text-xs text-blue-400 font-bold">
                {user ? t.loggedInSync : t.guestAccount}
              </p>
            </div>

            <div className="bg-[#0d131d] border border-gray-800 rounded-2xl p-4 text-start space-y-3 text-xs">
              <div>
                <span className="text-gray-400 block mb-0.5">{t.email}</span>
                <span className="font-bold text-white text-sm dir-ltr block">
                  {user?.email || (email ? email : 'N/A')}
                </span>
              </div>
              <div className="border-t border-gray-800 pt-2">
                <span className="text-gray-400 block mb-0.5">{t.sessionDate}</span>
                <span className="font-bold text-gray-300">{selectedDate}</span>
              </div>
            </div>

            {/* خيار اختيار اللغة بداخل النافذة */}
            <div className="bg-[#0d131d] border border-gray-800 p-3 rounded-2xl flex justify-between items-center text-xs font-bold">
              <span className="text-gray-300">{t.langLabel}</span>
              <div className="flex gap-1">
                <button
                  onClick={() => toggleLanguage('ar')}
                  className={`px-3 py-1.5 rounded-xl transition ${
                    lang === 'ar' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-400 hover:text-white'
                  }`}
                >
                  العربية
                </button>
                <button
                  onClick={() => toggleLanguage('en')}
                  className={`px-3 py-1.5 rounded-xl transition ${
                    lang === 'en' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-400 hover:text-white'
                  }`}
                >
                  English
                </button>
              </div>
            </div>

            {user ? (
              <button
                onClick={() => {
                  signOut(auth);
                  setIsProfileModalOpen(false);
                }}
                className="w-full py-3 bg-red-600/20 hover:bg-red-600/30 text-red-400 font-bold text-xs rounded-xl border border-red-500/40 transition"
              >
                {t.signOut} 🚪
              </button>
            ) : (
              <button
                onClick={() => {
                  setIsProfileModalOpen(false);
                  setIsAuthModalOpen(true);
                }}
                className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 font-bold text-xs rounded-xl shadow-lg shadow-blue-600/30 transition"
              >
                {t.signIn}
              </button>
            )}
          </div>
        </div>
      )}

      {/* 2. شريط النسبة المئوية */}
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

      {/* 3. التبويبات الرئيسية */}
      <div className="grid grid-cols-3 gap-1.5 bg-[#161e2c] p-1.5 rounded-2xl border border-gray-700/80 mb-6 text-center text-xs md:text-sm font-bold">
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
        <button
          onClick={() => setActiveMainTab('goals')}
          className={`py-3 rounded-xl transition ${
            activeMainTab === 'goals' ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg' : 'text-gray-400 hover:text-white'
          }`}
        >
          {t.goalsTab}
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
              visibleHabits.map((habit, index) => {
                const count = getHabitCount(habit.id);

                return (
                  <div 
                    key={habit.id}
                    draggable={isEditMode}
                    onDragStart={() => handleDragStart(index)}
                    onDragOver={handleDragOver}
                    onDrop={() => handleDrop(index)}
                    className={isEditMode ? 'cursor-grab active:cursor-grabbing' : ''}
                  >
                    <HabitCard
                      habit={habit}
                      count={count}
                      isEditMode={isEditMode}
                      streakStatus={{ type: 'gold', count: 1 }}
                      onCounterClick={() => openCounterModal(habit)}
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
      )}

      {/* نافذة العداد والمؤقت مع العرض المبتكر للحد الأدنى والأقصى */}
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
              {activeHabitCounter.minMinutes && activeHabitCounter.maxMinutes ? (
                <div className="flex justify-center gap-2 text-xs font-bold mt-1">
                  <span className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 px-2 py-0.5 rounded-lg">
                    الأدنى: {activeHabitCounter.minMinutes}
                  </span>
                  <span className="bg-amber-500/10 border border-amber-500/30 text-amber-300 px-2 py-0.5 rounded-lg">
                    الأقصى: {activeHabitCounter.maxMinutes}
                  </span>
                </div>
              ) : (
                <p className="text-xs text-gray-400 font-bold">
                  المستهدف: {activeHabitCounter.targetCount} {activeHabitCounter.unit}
                </p>
              )}
            </div>

            {/* مفتاح التبديل للمؤقت التنازلي والعداد اليدوي */}
            {activeHabitCounter.type === 'مؤقت' && (
              <div className="flex justify-between items-center bg-[#0a0f18] p-2.5 rounded-2xl border border-gray-800">
                <span className="text-xs font-bold text-gray-300">
                  {timerMode === 'timer' ? '⏱️ مؤقت النطاق الحي' : '📊 عداد يدوي'}
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

            {/* تصميم العداد والدائرة التفاعلية المبتكرة */}
            {(activeHabitCounter.type !== 'مؤقت' || timerMode === 'counter') ? (
              <div className="py-2 space-y-4">
                <div className="flex justify-center items-center gap-5 my-2">
                  <button
                    onClick={() => {
                      const current = getHabitCount(activeHabitCounter.id);
                      updateHabitCount(activeHabitCounter.id, current + 1);
                    }}
                    className="w-16 h-16 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white font-black text-3xl shadow-lg active:scale-90 transition flex items-center justify-center border border-emerald-400/40"
                  >
                    +
                  </button>

                  {/* الدائرة التفاعلية المضيئة عند الوصول للحد الأدنى */}
                  <div className={`w-36 h-36 rounded-full border-4 flex flex-col items-center justify-center shadow-2xl transition-all duration-500 ${
                    isMinReached 
                      ? 'bg-emerald-600/20 border-emerald-400 text-emerald-300 shadow-emerald-500/20 scale-105' 
                      : 'bg-blue-600/20 border-blue-500 text-blue-400'
                  }`}>
                    <span className="text-5xl font-black">
                      {currentTimerDone}
                    </span>
                    <span className="text-[10px] font-bold mt-1 text-gray-300">
                      {isMinReached ? 'مكتمل %100 ✔️' : `الأدنى: ${minValThresh}`}
                    </span>
                  </div>

                  <button
                    onClick={() => {
                      const current = getHabitCount(activeHabitCounter.id);
                      updateHabitCount(activeHabitCounter.id, Math.max(0, current - 1));
                    }}
                    className="w-16 h-16 rounded-full bg-red-700 hover:bg-red-600 text-white font-black text-3xl shadow-lg active:scale-90 transition flex items-center justify-center border border-red-500/40"
                  >
                    -
                  </button>
                </div>

                {isMinReached && (
                  <div className="p-3 bg-emerald-500/20 text-emerald-300 rounded-2xl text-xs font-bold border border-emerald-500/40">
                    {t.minReached}
                  </div>
                )}
              </div>
            ) : (
              /* واجهة المؤقت التنازلي التفاعلي المبتكر */
              <div className="space-y-4 py-2">
                <div className={`w-40 h-40 rounded-full border-4 mx-auto flex flex-col items-center justify-center shadow-inner relative transition-all duration-500 ${
                  isMinReached 
                    ? 'border-emerald-400 bg-emerald-600/20 text-emerald-300 shadow-emerald-500/30 scale-105' 
                    : 'border-blue-500/40 bg-blue-600/10 text-blue-400'
                }`}>
                  <span className="text-3xl font-black font-mono tracking-wider">
                    {formatTimerString(timerSecondsLeft)}
                  </span>
                  <span className="text-[10px] text-gray-300 mt-1 font-bold">
                    {isOvertime ? t.overtime : `الأقصى: ${maxValThresh} دقيقة`}
                  </span>
                </div>

                {isMinReached && (
                  <div className="p-3 bg-emerald-500/20 text-emerald-300 rounded-2xl text-xs font-bold border border-emerald-500/40">
                    {t.minReached}
                  </div>
                )}

                <div className="flex gap-2 justify-center">
                  {!isTimerRunning ? (
                    <button
                      onClick={startTimer}
                      className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm rounded-2xl shadow-lg active:scale-95 transition"
                    >
                      {t.startTimer}
                    </button>
                  ) : (
                    <button
                      onClick={pauseTimer}
                      className="flex-1 py-3 bg-amber-600 hover:bg-amber-500 text-white font-bold text-sm rounded-2xl shadow-lg active:scale-95 transition"
                    >
                      {t.pauseTimer}
                    </button>
                  )}
                  <button
                    onClick={resetTimer}
                    className="px-4 py-3 bg-gray-800 text-gray-300 hover:text-white rounded-2xl font-bold text-xs border border-gray-700 active:scale-95 transition"
                  >
                    {t.resetTimer}
                  </button>
                </div>
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
            setUseRange(false);
            setMinValInput(10);
            setMaxValInput(30);
            setTargetCount(10);
            setUnit('صفحة');
            setSelectedDays([0, 1, 2, 3, 4, 5, 6]);
            setIsAddModalOpen(true);
          }}
          className={`fixed bottom-16 w-14 h-14 bg-gradient-to-tr from-blue-600 to-indigo-500 text-white rounded-2xl shadow-2xl shadow-blue-500/40 text-3xl font-bold flex items-center justify-center border border-white/20 transition active:scale-95 z-40 ${lang === 'ar' ? 'right-8' : 'left-8'}`}
        >
          +
        </button>
      )}

      {/* نافذة إضافة أو تعديل عادة بنفس الهيكل السابق مع مفتاح خيار النطاق المرن */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-[#18202e] border border-gray-700/80 rounded-3xl p-6 w-full max-w-md space-y-5 text-white shadow-2xl my-8">
            <div className="flex justify-between items-center border-b border-gray-700/80 pb-3">
              <button onClick={() => setIsAddModalOpen(false)} className="text-gray-400 text-sm">{t.cancel}</button>
              <h3 className="text-lg font-bold">{editingHabit ? t.editHabit : t.addHabit}</h3>
              <button onClick={handleSaveHabit} className="text-blue-400 font-bold text-sm">{t.save}</button>
            </div>

            <form onSubmit={handleSaveHabit} className="space-y-4">
              <div>
                <label className="text-xs text-gray-400 block mb-1">{t.habitTitle}</label>
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
                <label className="text-xs text-gray-400 block mb-2">{t.category}</label>
                <div className="grid grid-cols-2 gap-2 bg-[#0d131d] p-1.5 rounded-2xl border border-gray-700 text-center text-xs font-bold">
                  <button
                    type="button"
                    onClick={() => setHabitCategory('إيجابية')}
                    className={`py-2 rounded-xl transition ${
                      habitCategory === 'إيجابية' ? 'bg-emerald-600 text-white shadow-lg' : 'text-gray-400'
                    }`}
                  >
                    {t.positive}
                  </button>
                  <button
                    type="button"
                    onClick={() => setHabitCategory('سيئة')}
                    className={`py-2 rounded-xl transition ${
                      habitCategory === 'سيئة' ? 'bg-amber-600 text-white shadow-lg' : 'text-gray-400'
                    }`}
                  >
                    {t.negative}
                  </button>
                </div>
              </div>

              <div>
                <label className="text-xs text-gray-400 block mb-2">{t.type}</label>
                <div className="grid grid-cols-3 gap-2 bg-[#0d131d] p-1.5 rounded-2xl border border-gray-700 text-center text-xs font-bold">
                  {(['مهمة', 'مؤقت', 'عداد'] as const).map((typeItem) => (
                    <button
                      key={typeItem}
                      type="button"
                      onClick={() => setHabitType(typeItem)}
                      className={`py-2 rounded-xl transition ${
                        habitType === typeItem ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-400'
                      }`}
                    >
                      {typeItem === 'مهمة' ? t.task : typeItem === 'مؤقت' ? t.timer : t.counter}
                    </button>
                  ))}
                </div>
              </div>

              {/* خيار مفتاح تفعيل النطاق المرن تحت نوع العادة */}
              {habitType !== 'مهمة' && (
                <div className="space-y-3 bg-[#0d131d] p-4 rounded-2xl border border-gray-700">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="useRangeCheck"
                      checked={useRange}
                      onChange={(e) => setUseRange(e.target.checked)}
                      className="w-4 h-4 accent-blue-600 rounded cursor-pointer"
                    />
                    <label htmlFor="useRangeCheck" className="text-xs font-bold text-blue-400 cursor-pointer">
                      {t.useRange}
                    </label>
                  </div>

                  {useRange ? (
                    <div className="grid grid-cols-2 gap-3 pt-2">
                      <div>
                        <label className="text-[11px] text-gray-400 block mb-1">{t.minGoal}</label>
                        <input
                          type="number"
                          min="1"
                          max="100"
                          value={minValInput}
                          onChange={(e) => setMinValInput(Number(e.target.value))}
                          className="w-full bg-[#161e2c] border border-gray-700 p-2.5 rounded-xl text-center text-white font-bold text-sm outline-none focus:border-blue-500"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] text-gray-400 block mb-1">{t.maxGoal}</label>
                        <input
                          type="number"
                          min="1"
                          max="200"
                          value={maxValInput}
                          onChange={(e) => setMaxValInput(Number(e.target.value))}
                          className="w-full bg-[#161e2c] border border-gray-700 p-2.5 rounded-xl text-center text-white font-bold text-sm outline-none focus:border-blue-500"
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2 pt-1">
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-gray-400">{t.targetCount}</span>
                        <span className="font-bold text-blue-400 text-sm">{targetCount}</span>
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
                </div>
              )}

              <div>
                <label className="text-xs text-gray-400 block mb-2">{t.color}</label>
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
          <span className="text-[10px]">{lang === 'ar' ? 'العادات' : 'Habits'}</span>
        </Link>
        <Link href="/history" className="flex flex-col items-center gap-1 text-gray-400 hover:text-white transition">
          <span className="text-xl">📅</span>
          <span className="text-[10px] font-bold">{lang === 'ar' ? 'السجل' : 'History'}</span>
        </Link>
        <Link href="/stats" className="flex flex-col items-center gap-1 text-gray-400 hover:text-white transition">
          <span className="text-xl">📊</span>
          <span className="text-[10px] font-bold">{lang === 'ar' ? 'الإحصائيات' : 'Stats'}</span>
        </Link>
      </div>

    </div>
  );
}