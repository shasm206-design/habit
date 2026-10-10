'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  signOut, 
  onAuthStateChanged, 
  User 
} from 'firebase/auth';
import { doc, setDoc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import HabitCard, { Habit } from '../components/HabitCard';

export interface DayProgress {
  [habitId: string]: {
    count: number;
    skipped?: boolean;
    skipReason?: string;
    editedLater?: boolean;
  } | number;
}

export interface TaskItem {
  id: string;
  title: string;
  completed: boolean;
  dueDate?: string;
}

export interface ExtendedGoal {
  id: string;
  title: string;
  targetValue: number;
  currentValue: number;
  unit: string;
  deadline: string;
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
    myHabits: 'عاداتي اليومية',
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
    useRange: '⚙️ تفعيل المستويات الثلاثة المرنة',
    minGoal: 'الحد الأدنى (خطوة التعثر 🛡️)',
    targetGoal: 'الهدف المعتاد (100% إنجاز)',
    stretchGoal: 'المستوى الممتد (بونص 👑)',
    targetCount: 'تحديد العدد المستهدف',
    color: 'لون أشكال العادة',
    save: 'حفظ',
    cancel: 'إلغاء',
    wheelTitle: '🎡 عجلة المكافآت المستحقة',
    spinWheel: 'تدوير العجلة 🎉',
    restDay: '🛡️ يوم استراحة ومكافأة (الستريك محمّي)'
  },
  en: {
    welcome: 'Welcome,',
    todayDate: 'Today:',
    signOut: 'Sign Out',
    signIn: 'Sign In 🔐',
    habitsTab: '🎯 Daily Habits',
    todoTab: '📝 To-Do List',
    goalsTab: '🏆 Extended Goals',
    myHabits: 'My Daily Habits',
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
    useRange: '⚙️ Enable Flexible 3-Tier Goals',
    minGoal: 'Min Goal (Safety Net 🛡️)',
    targetGoal: 'Target Goal (100% Complete)',
    stretchGoal: 'Stretch Goal (Bonus 👑)',
    targetCount: 'Set Target Count',
    color: 'Habit Color',
    save: 'Save',
    cancel: 'Cancel',
    wheelTitle: '🎡 Reward Fortune Wheel',
    spinWheel: 'Spin the Wheel 🎉',
    restDay: '🛡️ Rest & Reward Day (Streak Protected)'
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
  const [autoCarryOverTasks, setAutoCarryOverTasks] = useState<boolean>(true);
  const [extendedGoals, setExtendedGoals] = useState<ExtendedGoal[]>([]);
  
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [activeMainTab, setActiveMainTab] = useState<'habits' | 'todo' | 'goals'>('habits');
  
  const [isEditMode, setIsEditMode] = useState(false);

  // إعدادات المكافآت والعجلة
  const [restDayOfWeek, setRestDayOfWeek] = useState<number>(5); // الجمعة
  const [wheelTriggerMode, setWheelTriggerMode] = useState<'pct80' | 'restDay' | 'both' | 'disabled'>('both');
  const [userRewards, setUserRewards] = useState<string[]>([
    'طلب وجبة مفضلة 🍕',
    'مشاهدة فيلم أو مسلسل 🎬',
    'ساعة لعب إضافية 🎮',
    'جولة بالسيارة مع القهوة ☕',
    'شراء شيء بسيط لنفسك 🎁'
  ]);
  const [newRewardInput, setNewRewardInput] = useState('');
  const [isWheelModalOpen, setIsWheelModalOpen] = useState(false);
  const [isSpinning, setIsSpinning] = useState(false);
  const [wheelRotation, setWheelRotation] = useState(0);
  const [wonReward, setWonReward] = useState<string | null>(null);

  // Modals & Timers
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingHabit, setEditingHabit] = useState<Habit | null>(null);
  const [activeHabitCounter, setActiveHabitCounter] = useState<Habit | null>(null);

  // Form State
  const [title, setTitle] = useState('');
  const [habitType, setHabitType] = useState<'عداد' | 'مؤقت' | 'مهمة'>('عداد');
  const [habitCategory, setHabitCategory] = useState<'إيجابية' | 'سيئة'>('إيجابية');
  const [useRange, setUseRange] = useState<boolean>(true);
  const [minValInput, setMinValInput] = useState<number>(5);
  const [targetCount, setTargetCount] = useState<number>(10);
  const [stretchCount, setStretchCount] = useState<number>(20);
  const [unit, setUnit] = useState('صفحة');
  const [selectedColor, setSelectedColor] = useState(COLOR_OPTIONS[0]);
  const [selectedDays, setSelectedDays] = useState<number[]>([0, 1, 2, 3, 4, 5, 6]);

  const [newTaskInput, setNewTaskInput] = useState('');
  
  // Goal Form
  const [goalTitle, setGoalTitle] = useState('');
  const [goalTarget, setGoalTarget] = useState(12);
  const [goalUnit, setGoalUnit] = useState('كتاب');
  const [goalDeadline, setGoalDeadline] = useState('2026-12-31');

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

    const savedName = localStorage.getItem('habit_tracker_user_name');
    if (savedName) setDisplayName(savedName);

    const savedRewards = localStorage.getItem('habit_tracker_rewards');
    if (savedRewards) setUserRewards(JSON.parse(savedRewards));

    const savedTrigger = localStorage.getItem('habit_tracker_wheel_trigger');
    if (savedTrigger) setWheelTriggerMode(savedTrigger as any);

    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        const userDocRef = doc(db, 'users', currentUser.uid);
        onSnapshot(userDocRef, (docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data();
            if (data.habits) setHabits(data.habits);
            if (data.dailyData) setDailyData(data.dailyData);
            if (data.displayName) setDisplayName(data.displayName);
            if (data.extendedGoals) setExtendedGoals(data.extendedGoals);
            if (data.userRewards) setUserRewards(data.userRewards);
            if (data.wheelTriggerMode) setWheelTriggerMode(data.wheelTriggerMode);
            if (data.tasks) {
              const processedTasks = autoCarryOverTasks ? handleCarryOverTasks(data.tasks, todayStr) : data.tasks;
              setTasks(processedTasks);
            }
          }
        });
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
          const processed = autoCarryOverTasks ? handleCarryOverTasks(parsed, todayStr) : parsed;
          setTasks(processed);
        }
      }
    });

    return () => unsubscribeAuth();
  }, [autoCarryOverTasks]);

  const toggleLanguage = (newLang: 'ar' | 'en') => {
    setLang(newLang);
    localStorage.setItem('habit_tracker_lang', newLang);
  };

  const saveData = async (
    updatedHabits = habits, 
    updatedDaily = dailyData,
    updatedTasks = tasks,
    nameToSave = displayName,
    updatedGoals = extendedGoals,
    rewardsToSave = userRewards,
    triggerModeToSave = wheelTriggerMode
  ) => {
    setHabits(updatedHabits);
    setDailyData(updatedDaily);
    setTasks(updatedTasks);
    setExtendedGoals(updatedGoals);
    setUserRewards(rewardsToSave);
    setWheelTriggerMode(triggerModeToSave);

    if (user) {
      try {
        const userDocRef = doc(db, 'users', user.uid);
        await setDoc(userDocRef, { 
          habits: updatedHabits, 
          dailyData: updatedDaily, 
          tasks: updatedTasks,
          displayName: nameToSave,
          extendedGoals: updatedGoals,
          userRewards: rewardsToSave,
          wheelTriggerMode: triggerModeToSave
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
      localStorage.setItem('habit_tracker_rewards', JSON.stringify(rewardsToSave));
      localStorage.setItem('habit_tracker_wheel_trigger', triggerModeToSave);
    }
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

  const exportBackupJSON = () => {
    const backupData = { habits, dailyData, tasks, extendedGoals, displayName };
    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `HabitTracker_Backup_${getLocalDateString()}.json`;
    a.click();
  };

  const getSelectedDayOfWeek = () => {
    if (!selectedDate) return 0;
    return new Date(selectedDate).getDay();
  };

  const isCurrentDateRestDay = getSelectedDayOfWeek() === restDayOfWeek;

  const visibleHabits = habits.filter((h) => 
    !h.paused && (!h.repeatDays || h.repeatDays.includes(getSelectedDayOfWeek()))
  );

  const currentDayProgress = dailyData[selectedDate] || {};

  const getHabitData = (habitId: string) => {
    const raw = currentDayProgress[habitId];
    if (typeof raw === 'number') return { count: raw, skipped: false };
    return raw || { count: 0, skipped: false };
  };

  const updateHabitCount = (habitId: string, newCount: number, isSkipped = false) => {
    const validCount = Math.max(0, newCount);
    const updatedEntry = {
      count: validCount,
      skipped: isSkipped,
      editedLater: selectedDate !== getLocalDateString()
    };
    const updatedDay = { ...currentDayProgress, [habitId]: updatedEntry };
    const updatedDaily = { ...dailyData, [selectedDate]: updatedDay };
    saveData(habits, updatedDaily);
  };

  const toggleSkipHabit = (habitId: string) => {
    const current = getHabitData(habitId);
    updateHabitCount(habitId, current.count, !current.skipped);
  };

  const toggleQuickComplete = (e: React.MouseEvent, habit: Habit) => {
    e.stopPropagation();
    const currentData = getHabitData(habit.id);
    if (habit.category === 'سيئة') {
      updateHabitCount(habit.id, currentData.count > 0 ? 0 : 1);
    } else {
      const target = habit.targetCount || 1;
      const isDone = currentData.count >= target;
      updateHabitCount(habit.id, isDone ? 0 : target);
    }
  };

  const currentDayTasks = tasks[selectedDate] || [];

  const calculateTotalDayPercentage = () => {
    const activeHabits = visibleHabits.filter((h) => !getHabitData(h.id).skipped);
    if (activeHabits.length === 0) return 0;

    let totalScore = 0;
    activeHabits.forEach((h) => {
      const data = getHabitData(h.id);
      const target = h.targetCount || 1;
      if (data.count >= target) totalScore += 1;
      else if (h.minMinutes && data.count >= h.minMinutes) totalScore += 0.5;
    });

    return Math.round((totalScore / activeHabits.length) * 100);
  };

  const totalPercentage = calculateTotalDayPercentage();

  const isWheelUnlocked = () => {
    if (wheelTriggerMode === 'disabled') return false;
    const is80 = totalPercentage >= 80;
    const isRest = isCurrentDateRestDay;

    if (wheelTriggerMode === 'pct80') return is80;
    if (wheelTriggerMode === 'restDay') return isRest;
    return is80 || isRest;
  };

  const canSpinWheel = isWheelUnlocked();

  const handleSpinWheel = () => {
    if (isSpinning || userRewards.length === 0) return;
    setIsSpinning(true);
    setWonReward(null);

    const extraDegrees = Math.floor(Math.random() * 360) + 1440;
    const newDegree = wheelRotation + extraDegrees;
    setWheelRotation(newDegree);

    setTimeout(() => {
      setIsSpinning(false);
      const actualDegree = newDegree % 360;
      const segmentAngle = 360 / userRewards.length;
      const wonIndex = Math.floor((360 - (actualDegree % 360)) / segmentAngle) % userRewards.length;
      setWonReward(userRewards[wonIndex]);
    }, 4000);
  };

  const handleAddReward = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRewardInput.trim()) return;
    const updated = [...userRewards, newRewardInput.trim()];
    saveData(habits, dailyData, tasks, displayName, extendedGoals, updated);
    setNewRewardInput('');
  };

  const handleDeleteReward = (index: number) => {
    const updated = userRewards.filter((_, i) => i !== index);
    saveData(habits, dailyData, tasks, displayName, extendedGoals, updated);
  };

  const handleSaveHabit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    let updatedHabits: Habit[];
    if (editingHabit) {
      updatedHabits = habits.map((h) =>
        h.id === editingHabit.id
          ? { 
              ...h, 
              title, 
              type: habitType,
              targetCount: Number(targetCount) || 1, 
              minMinutes: useRange ? Number(minValInput) : undefined,
              maxMinutes: useRange ? Number(stretchCount) : undefined,
              unit, 
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
        targetCount: Number(targetCount) || 1,
        minMinutes: useRange ? Number(minValInput) : undefined,
        maxMinutes: useRange ? Number(stretchCount) : undefined,
        unit,
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

  const handleAddGoal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!goalTitle.trim()) return;
    const newGoal: ExtendedGoal = {
      id: Date.now().toString(),
      title: goalTitle,
      targetValue: goalTarget,
      currentValue: 0,
      unit: goalUnit,
      deadline: goalDeadline,
      completed: false
    };
    saveData(habits, dailyData, tasks, displayName, [...extendedGoals, newGoal]);
    setGoalTitle('');
  };

  const getTrophyStatus = (pct: number) => {
    if (pct >= 100) {
      return { 
        trophy: '👑 🎉', 
        label: lang === 'ar' ? 'يا استثنائي (بونص)' : 'Exceptional (Bonus)', 
        desc: lang === 'ar' ? 'أداء مبهر يفوق التوقعات!' : 'Outstanding performance!',
        bgGradient: 'from-amber-400 via-yellow-500 to-amber-600',
        textColor: 'text-black'
      };
    }
    if (pct >= 80) {
      return { 
        trophy: '🥇 🥳', 
        label: lang === 'ar' ? 'ممتاز (العجلة مفتوحة)' : 'Excellent (Wheel Unlocked)', 
        desc: lang === 'ar' ? 'إنجاز رفيع ومستوى متقدم' : 'Great progress',
        bgGradient: 'from-yellow-500 to-amber-500',
        textColor: 'text-black'
      };
    }
    return { 
      trophy: '🥈', 
      label: lang === 'ar' ? 'جيد' : 'Good', 
      desc: lang === 'ar' ? 'استمرار رائع وتقدم ملحوظ' : 'Consistent effort',
      bgGradient: 'from-blue-600 to-indigo-600',
      textColor: 'text-white'
    };
  };

  const status = getTrophyStatus(totalPercentage);

  return (
    <div className={`max-w-4xl mx-auto min-h-screen bg-[#0d131d] text-white p-4 md:p-8 font-sans pb-28 select-none ${lang === 'ar' ? 'dir-rtl text-right' : 'dir-ltr text-left'}`} dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      
      {/* 1. الترويسة الرئيسية + تفاصيل الحساب */}
      <div className="flex justify-between items-center mb-6 pt-2">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setIsProfileModalOpen(true)}
            className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-500 border border-blue-400/40 flex items-center justify-center font-bold text-xl shadow-lg hover:scale-105 active:scale-95 transition cursor-pointer"
          >
            👤
          </button>
          <div>
            <h1 className="text-xl md:text-2xl font-extrabold bg-gradient-to-r from-white via-gray-200 to-gray-400 bg-clip-text text-transparent">
              {t.welcome} {displayName}
            </h1>
            <p className="text-xs text-blue-400/80 font-medium">{t.todayDate} {selectedDate}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {canSpinWheel && (
            <button
              onClick={() => setIsWheelModalOpen(true)}
              className="text-xs bg-gradient-to-r from-amber-500 to-yellow-500 text-black px-3.5 py-2 rounded-xl font-black shadow-lg animate-bounce transition"
            >
              🎡 العجلة 🥳
            </button>
          )}

          {user ? (
            <button onClick={() => signOut(auth)} className="text-xs bg-red-500/20 text-red-400 px-3.5 py-2 rounded-xl font-bold border border-red-500/30">
              {t.signOut}
            </button>
          ) : (
            <button onClick={() => setIsProfileModalOpen(true)} className="text-xs bg-gradient-to-r from-blue-600 to-indigo-600 px-3.5 py-2 rounded-xl font-bold shadow-lg">
              {t.signIn}
            </button>
          )}
        </div>
      </div>

      {/* شارة يوم الإجازة المجدول */}
      {isCurrentDateRestDay && (
        <div className="mb-4 p-3 bg-indigo-600/20 border border-indigo-500/40 rounded-2xl text-center text-xs font-bold text-indigo-300 shadow-md">
          {t.restDay} ☕
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
          className={`py-3 rounded-xl transition ${activeMainTab === 'habits' ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-400'}`}
        >
          {t.habitsTab}
        </button>
        <button
          onClick={() => setActiveMainTab('todo')}
          className={`py-3 rounded-xl transition ${activeMainTab === 'todo' ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-400'}`}
        >
          {t.todoTab}
        </button>
        <button
          onClick={() => setActiveMainTab('goals')}
          className={`py-3 rounded-xl transition ${activeMainTab === 'goals' ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-400'}`}
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
              className="text-xs px-4 py-2 rounded-xl font-bold bg-[#18202e] text-gray-300 border border-gray-700"
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
              visibleHabits.map((habit) => {
                const habitData = getHabitData(habit.id);

                return (
                  <div key={habit.id} className="relative group space-y-1">
                    <HabitCard
                      habit={habit}
                      count={habitData.count}
                      isEditMode={isEditMode}
                      onCounterClick={() => updateHabitCount(habit.id, habitData.count + 1)}
                      onQuickToggle={(e) => toggleQuickComplete(e, habit)}
                      onEdit={() => {
                        setEditingHabit(habit);
                        setTitle(habit.title);
                        setHabitType(habit.type || 'عداد');
                        setHabitCategory(habit.category || 'إيجابية');
                        setUseRange(!!(habit.minMinutes && habit.maxMinutes));
                        setMinValInput(habit.minMinutes || 5);
                        setTargetCount(habit.targetCount || 10);
                        setStretchCount(habit.maxMinutes || 20);
                        setUnit(habit.unit);
                        setSelectedColor(habit.color);
                        setSelectedDays(habit.repeatDays || [0, 1, 2, 3, 4, 5, 6]);
                        setIsAddModalOpen(true);
                      }}
                      onDelete={() => {
                        const updated = habits.filter((h) => h.id !== habit.id);
                        saveData(updated, dailyData);
                      }}
                    />

                    {/* أزرار التحكم بالعد والتخطي المرن */}
                    <div className="flex justify-between items-center px-3 pt-1 text-[11px] font-bold">
                      <button
                        onClick={() => toggleSkipHabit(habit.id)}
                        className={`px-2.5 py-1 rounded-lg border transition ${
                          habitData.skipped ? 'bg-amber-500/20 border-amber-500 text-amber-300' : 'bg-[#161e2c] border-gray-800 text-gray-400'
                        }`}
                      >
                        {habitData.skipped ? '🛡️ مستثناة (تخطي محمي)' : 'تخطي اليوم 🛡️'}
                      </button>
                      
                      <div className="flex items-center gap-1.5 bg-[#161e2c] border border-gray-800 px-2 py-0.5 rounded-lg">
                        <button onClick={() => updateHabitCount(habit.id, Math.max(0, habitData.count - 1))} className="text-gray-300 font-bold px-1 hover:text-white">-</button>
                        <span className="text-blue-400 font-extrabold px-1">{habitData.count}</span>
                        <button onClick={() => updateHabitCount(habit.id, habitData.count + 1)} className="text-gray-300 font-bold px-1 hover:text-white">+</button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </>
      )}

      {/* قسم المهام (To-Do) */}
      {activeMainTab === 'todo' && (
        <div className="space-y-4">
          <div className="bg-[#161e2c] border border-gray-800 p-4 rounded-2xl flex justify-between items-center text-xs font-bold">
            <span>الترحيل التلقائي للمهام غير المكتملة لليوم التالي:</span>
            <button
              onClick={() => setAutoCarryOverTasks(!autoCarryOverTasks)}
              className={`px-3 py-1.5 rounded-xl transition ${autoCarryOverTasks ? 'bg-emerald-600 text-white' : 'bg-gray-700 text-gray-300'}`}
            >
              {autoCarryOverTasks ? 'مميّز ومفعّل ✅' : 'إيقاف 🛑'}
            </button>
          </div>

          <form onSubmit={(e) => {
            e.preventDefault();
            if (!newTaskInput.trim()) return;
            const newTask: TaskItem = { id: Date.now().toString(), title: newTaskInput.trim(), completed: false };
            const updated = { ...tasks, [selectedDate]: [...currentDayTasks, newTask] };
            saveData(habits, dailyData, updated);
            setNewTaskInput('');
          }} className="flex gap-2">
            <input
              type="text"
              placeholder="إضافة مهمة جديدة..."
              value={newTaskInput}
              onChange={(e) => setNewTaskInput(e.target.value)}
              className="flex-1 bg-[#161e2c] border border-gray-700 p-3 rounded-xl text-sm outline-none text-white"
            />
            <button type="submit" className="bg-blue-600 text-white px-5 py-3 rounded-xl text-sm font-bold">إضافة ➕</button>
          </form>

          <div className="space-y-2">
            {currentDayTasks.map((task) => (
              <div key={task.id} className="bg-[#161e2c] border border-gray-800 p-3.5 rounded-2xl flex justify-between items-center text-sm font-bold">
                <span className={task.completed ? 'line-through text-gray-500' : 'text-white'}>{task.title}</span>
                <button
                  onClick={() => {
                    const updatedList = currentDayTasks.map((t) => t.id === task.id ? { ...t, completed: !t.completed } : t);
                    saveData(habits, dailyData, { ...tasks, [selectedDate]: updatedList });
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs ${task.completed ? 'bg-emerald-600/20 text-emerald-400' : 'bg-gray-800 text-gray-300'}`}
                >
                  {task.completed ? 'مكتملة ✔️' : 'إنجاز'}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* قسم الأهداف الممتدة */}
      {activeMainTab === 'goals' && (
        <div className="space-y-4">
          <form onSubmit={handleAddGoal} className="bg-[#161e2c] border border-gray-800 p-4 rounded-2xl space-y-3">
            <h4 className="text-xs font-bold text-gray-300">إضافة هدف جديد ممتد بمعدل مستهدف:</h4>
            <input
              type="text"
              placeholder="عنوان الهدف (مثال: قراءة 12 كتاباً)"
              value={goalTitle}
              onChange={(e) => setGoalTitle(e.target.value)}
              className="w-full bg-[#0d131d] border border-gray-700 p-2.5 rounded-xl text-xs outline-none text-white"
            />
            <div className="grid grid-cols-3 gap-2 text-xs">
              <input
                type="number"
                placeholder="الهدف الرقمي"
                value={goalTarget}
                onChange={(e) => setGoalTarget(Number(e.target.value))}
                className="bg-[#0d131d] border border-gray-700 p-2 rounded-xl text-center outline-none text-white"
              />
              <input
                type="text"
                placeholder="الوحدة (كتاب/ساعة)"
                value={goalUnit}
                onChange={(e) => setGoalUnit(e.target.value)}
                className="bg-[#0d131d] border border-gray-700 p-2 rounded-xl text-center outline-none text-white"
              />
              <input
                type="date"
                value={goalDeadline}
                onChange={(e) => setGoalDeadline(e.target.value)}
                className="bg-[#0d131d] border border-gray-700 p-2 rounded-xl text-center outline-none text-white"
              />
            </div>
            <button type="submit" className="w-full bg-blue-600 text-white p-2.5 rounded-xl text-xs font-bold">إضافة الهدف 🚀</button>
          </form>

          <div className="space-y-3">
            {extendedGoals.map((goal) => (
              <div key={goal.id} className="bg-[#161e2c] border border-gray-800 p-4 rounded-2xl space-y-2">
                <div className="flex justify-between items-center font-bold text-sm">
                  <span>{goal.title}</span>
                  <span className="text-xs text-blue-400">{goal.currentValue} من {goal.targetValue} {goal.unit}</span>
                </div>
                <div className="w-full bg-[#0d131d] h-2.5 rounded-full overflow-hidden">
                  <div className="bg-blue-600 h-full" style={{ width: `${Math.min(100, (goal.currentValue / goal.targetValue) * 100)}%` }} />
                </div>
                <div className="flex justify-between items-center text-[10px] text-gray-400 pt-1">
                  <span>تاريخ الاستحقاق: {goal.deadline}</span>
                  <button
                    onClick={() => {
                      const updated = extendedGoals.map((g) => g.id === goal.id ? { ...g, currentValue: g.currentValue + 1 } : g);
                      saveData(habits, dailyData, tasks, displayName, updated);
                    }}
                    className="px-2.5 py-1 bg-blue-600/20 text-blue-400 rounded-lg font-bold"
                  >
                    + زيادة تقدم
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* زر إضافة عادة Floating Button */}
      {activeMainTab === 'habits' && (
        <button
          onClick={() => {
            setEditingHabit(null);
            setTitle('');
            setHabitType('عداد');
            setHabitCategory('إيجابية');
            setUseRange(true);
            setMinValInput(5);
            setTargetCount(10);
            setStretchCount(20);
            setUnit('صفحة');
            setSelectedDays([0, 1, 2, 3, 4, 5, 6]);
            setIsAddModalOpen(true);
          }}
          className={`fixed bottom-16 w-14 h-14 bg-gradient-to-tr from-blue-600 to-indigo-500 text-white rounded-2xl shadow-2xl text-3xl font-bold flex items-center justify-center border border-white/20 active:scale-95 z-40 ${lang === 'ar' ? 'right-8' : 'left-8'}`}
        >
          +
        </button>
      )}

      {/* نافذة عجلة المكافآت التفاعلية 🎡 */}
      {isWheelModalOpen && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <div className="bg-[#18202e] border border-gray-700/80 rounded-3xl p-6 w-full max-w-sm space-y-5 text-white shadow-2xl relative text-center">
            <button onClick={() => setIsWheelModalOpen(false)} className="absolute top-4 left-4 text-gray-400 font-bold">✕</button>
            <h3 className="text-xl font-black text-amber-400">{t.wheelTitle}</h3>

            <div className="relative w-64 h-64 mx-auto my-4 flex items-center justify-center">
              <div className="absolute -top-3 z-20 text-3xl">🔻</div>
              <div 
                className="w-full h-full rounded-full border-4 border-amber-400 shadow-2xl overflow-hidden relative transition-all duration-[4000ms] ease-out"
                style={{ transform: `rotate(${wheelRotation}deg)` }}
              >
                {userRewards.map((reward, i) => {
                  const angle = 360 / userRewards.length;
                  return (
                    <div
                      key={i}
                      className="absolute w-full h-full text-center flex justify-center pt-2 font-bold text-[10px]"
                      style={{
                        transform: `rotate(${i * angle}deg)`,
                        transformOrigin: '50% 50%',
                        color: i % 2 === 0 ? '#f59e0b' : '#3b82f6'
                      }}
                    >
                      <span className="bg-black/40 px-2 py-0.5 rounded-md border border-white/10">{reward}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {wonReward && (
              <div className="p-3 bg-amber-500/20 border border-amber-500/50 rounded-2xl text-amber-300 font-extrabold text-sm animate-bounce">
                🎉 الفائز: {wonReward}! استمتع بمكافأتك 🎁
              </div>
            )}

            <button
              onClick={handleSpinWheel}
              disabled={isSpinning || userRewards.length === 0}
              className="w-full py-3 bg-gradient-to-r from-amber-500 to-yellow-500 text-black font-black text-sm rounded-xl shadow-lg active:scale-95 disabled:opacity-50"
            >
              {isSpinning ? 'جاري التدوير... 🌀' : t.spinWheel}
            </button>
          </div>
        </div>
      )}

      {/* نافذة تفاصيل البروفايل وتصدير البيانات 👤 */}
      {isProfileModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-[#18202e] border border-gray-700/80 rounded-3xl p-6 w-full max-w-md space-y-4 text-white relative my-8">
            <button onClick={() => setIsProfileModalOpen(false)} className="absolute top-4 left-4 text-gray-400 font-bold">✕</button>
            <h3 className="text-xl font-black text-center">{displayName}</h3>
            
            <div className="bg-[#0d131d] border border-gray-800 p-3 rounded-2xl flex justify-between items-center text-xs font-bold">
              <span className="text-gray-300">اللغة / Language:</span>
              <div className="flex gap-1">
                <button onClick={() => toggleLanguage('ar')} className={`px-3 py-1 rounded-xl ${lang === 'ar' ? 'bg-blue-600' : 'text-gray-400'}`}>العربية</button>
                <button onClick={() => toggleLanguage('en')} className={`px-3 py-1 rounded-xl ${lang === 'en' ? 'bg-blue-600' : 'text-gray-400'}`}>English</button>
              </div>
            </div>

            <button
              onClick={exportBackupJSON}
              className="w-full py-3 bg-indigo-600/30 border border-indigo-500/40 text-indigo-300 rounded-xl text-xs font-bold"
            >
              📥 تصدير النسخة الاحتياطية (JSON)
            </button>
          </div>
        </div>
      )}

      {/* شريط التنقل السفلي */}
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