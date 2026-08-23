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
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [isEditMode, setIsEditMode] = useState(false);

  // Modals
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
  const [targetCount, setTargetCount] = useState<number>(10);
  const [unit, setUnit] = useState('صفحة');
  const [selectedColor, setSelectedColor] = useState(COLOR_OPTIONS[0]);
  const [selectedDays, setSelectedDays] = useState<number[]>([0, 1, 2, 3, 4, 5, 6]);

  // دالة جلب تاريخ اليوم بالتوقيت المحلي الدقيق (YYYY-MM-DD)
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

    // فحص وتحديث اليوم تلقائياً كل دقيقة (عند تخطي منتصف الليل)
    const interval = setInterval(() => {
      const currentToday = getLocalDateString();
      setSelectedDate((prevDate) => {
        if (!prevDate || prevDate < currentToday) {
          return currentToday;
        }
        return prevDate;
      });
    }, 60000);

    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        const userDocRef = doc(db, 'users', currentUser.uid);
        const unsubscribeSnapshot = onSnapshot(userDocRef, (docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data();
            if (data.habits) setHabits(data.habits);
            if (data.dailyData) setDailyData(data.dailyData);
          }
        });
        return () => unsubscribeSnapshot();
      } else {
        const savedHabits = localStorage.getItem('habit_tracker_habits');
        if (savedHabits) setHabits(JSON.parse(savedHabits));
        const savedDaily = localStorage.getItem('habit_tracker_daily');
        if (savedDaily) setDailyData(JSON.parse(savedDaily));
      }
    });

    return () => {
      clearInterval(interval);
      unsubscribeAuth();
    };
  }, []);

  const saveData = async (updatedHabits: Habit[], updatedDaily: { [date: string]: DayProgress }) => {
    setHabits(updatedHabits);
    setDailyData(updatedDaily);
    if (user) {
      try {
        const userDocRef = doc(db, 'users', user.uid);
        await setDoc(userDocRef, { habits: updatedHabits, dailyData: updatedDaily }, { merge: true });
      } catch (err) {
        console.error('خطأ في حفظ البيانات:', err);
      }
    } else {
      localStorage.setItem('habit_tracker_habits', JSON.stringify(updatedHabits));
      localStorage.setItem('habit_tracker_daily', JSON.stringify(updatedDaily));
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

  const moveHabit = (index: number, direction: 'up' | 'down') => {
    const newHabits = [...habits];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newHabits.length) return;
    const temp = newHabits[index];
    newHabits[index] = newHabits[targetIndex];
    newHabits[targetIndex] = temp;
    saveData(newHabits, dailyData);
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
              repeatDays: selectedDays
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
      };
      updatedHabits = [...habits, newHabit];
    }

    saveData(updatedHabits, dailyData);
    setTitle('');
    setEditingHabit(null);
    setIsAddModalOpen(false);
  };

  const deleteHabit = (id: string) => {
    const updatedHabits = habits.filter((h) => h.id !== id);
    saveData(updatedHabits, dailyData);
  };

  const totalPercentage =
    visibleHabits.length === 0
      ? 0
      : Math.round(
          (visibleHabits.reduce((acc, h) => acc + getHabitCount(h.id) / h.targetCount, 0) / visibleHabits.length) * 100
        );

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

      {/* شريط الإنجاز المتكيف */}
      <div className={`bg-gradient-to-r ${status.bgGradient} ${status.textColor} p-4.5 rounded-3xl flex justify-between items-center px-6 shadow-xl mb-8 border border-white/20 transition-all duration-300`}>
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

      {/* شريط التحكم والتعديل */}
      <div className="flex justify-between items-center mb-4 px-2">
        <h2 className="text-2xl font-bold">عاداتي {isEditMode && <span className="text-xs text-blue-400 font-normal">(استخدم الأسهم للترتيب)</span>}</h2>
        <button
          onClick={() => setIsEditMode(!isEditMode)}
          className={`text-xs px-4 py-2 rounded-xl font-bold transition shadow-md ${
            isEditMode ? 'bg-emerald-500 text-white shadow-emerald-500/20' : 'bg-[#18202e] text-gray-300 hover:bg-gray-700 border border-gray-700/80'
          }`}
        >
          {isEditMode ? 'تم الحفظ ✔️' : 'تعديل ✏️'}
        </button>
      </div>

      {/* قائمة العادات */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {visibleHabits.length === 0 ? (
          <div className="col-span-full text-center py-12 text-gray-500 text-sm bg-[#131a26] rounded-3xl border border-dashed border-gray-800">
            لا توجد عادات مسجلة لهذا اليوم المختار.
          </div>
        ) : (
          visibleHabits.map((habit, index) => {
            const count = getHabitCount(habit.id);

            return (
              <HabitCard
                key={habit.id}
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
                  setTargetCount(habit.targetCount || 1);
                  setUnit(habit.unit);
                  setSelectedColor(habit.color);
                  setSelectedDays(habit.repeatDays || [0, 1, 2, 3, 4, 5, 6]);
                  setIsAddModalOpen(true);
                }}
                onDelete={() => deleteHabit(habit.id)}
                onMoveUp={index > 0 ? () => moveHabit(index, 'up') : undefined}
                onMoveDown={index < visibleHabits.length - 1 ? () => moveHabit(index, 'down') : undefined}
              />
            );
          })
        )}
      </div>

      {/* زر إضافة عادة */}
      <button
        onClick={() => {
          setEditingHabit(null);
          setTitle('');
          setHabitType('عداد');
          setTargetCount(10);
          setUnit('صفحة');
          setSelectedDays([0, 1, 2, 3, 4, 5, 6]);
          setIsAddModalOpen(true);
        }}
        className="fixed bottom-16 right-8 w-14 h-14 bg-gradient-to-tr from-blue-600 to-indigo-500 text-white rounded-2xl shadow-2xl shadow-blue-500/40 text-3xl font-bold flex items-center justify-center border border-white/20 transition active:scale-95 z-40"
      >
        +
      </button>

      {/* نافذة العداد */}
      {activeHabitCounter && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md flex flex-col justify-between p-6 z-50 text-center select-none">
          <div className="flex justify-between items-center max-w-md mx-auto w-full">
            <span className="text-gray-400 text-sm font-bold">
              {getHabitCount(activeHabitCounter.id) > activeHabitCounter.targetCount 
                ? 'إنجاز إضافي فائق! ⭐' 
                : `متبقي: ${Math.max(0, activeHabitCounter.targetCount - getHabitCount(activeHabitCounter.id))}`}
            </span>
            <button onClick={() => setActiveHabitCounter(null)} className="text-gray-300 font-bold text-2xl">✕</button>
          </div>

          <div className="my-auto space-y-8">
            <div className="bg-[#18202e] p-6 rounded-3xl max-w-xs mx-auto shadow-2xl border border-gray-700/80">
              <h3 className="text-2xl font-bold">{activeHabitCounter.title}</h3>
              <p className="text-xs text-gray-400 mt-2">
                إنجاز يوم {selectedDate}: {getHabitCount(activeHabitCounter.id)} من {activeHabitCounter.targetCount} {activeHabitCounter.unit}
              </p>
            </div>

            <div className="flex items-center justify-center gap-6">
              <button
                type="button"
                onClick={() => updateHabitCount(activeHabitCounter.id, getHabitCount(activeHabitCounter.id) - 1)}
                className="w-16 h-16 rounded-full bg-red-600/30 text-red-400 text-3xl font-extrabold flex items-center justify-center border border-red-500/40 active:scale-90 transition"
              >
                -
              </button>

              <button
                type="button"
                onClick={() => updateHabitCount(activeHabitCounter.id, getHabitCount(activeHabitCounter.id) + 1)}
                style={{ backgroundColor: activeHabitCounter.color || '#3b82f6' }}
                className="w-40 h-40 rounded-full text-white text-5xl font-extrabold flex items-center justify-center shadow-2xl border-4 border-white/20 active:scale-95 transition-transform"
              >
                {getHabitCount(activeHabitCounter.id)}
              </button>

              <button
                type="button"
                onClick={() => updateHabitCount(activeHabitCounter.id, getHabitCount(activeHabitCounter.id) + 1)}
                className="w-16 h-16 rounded-full bg-emerald-600/30 text-emerald-400 text-3xl font-extrabold flex items-center justify-center border border-emerald-500/40 active:scale-90 transition"
              >
                +
              </button>
            </div>
          </div>
        </div>
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
                  placeholder="مثلاً: قراءة قرآن"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-[#0d131d] border border-gray-700 p-3 rounded-xl outline-none text-white text-sm focus:border-blue-500"
                  required
                />
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

              <div>
                <label className="text-xs text-gray-400 block mb-1">أيام الظهور</label>
                <div className="flex justify-between gap-1 pt-1">
                  {DAYS_LOOKUP.map((day) => {
                    const isSelected = selectedDays.includes(day.id);
                    return (
                      <button
                        key={day.id}
                        type="button"
                        onClick={() => toggleDaySelection(day.id)}
                        className={`w-9 h-9 rounded-full font-bold text-xs transition ${
                          isSelected ? 'bg-blue-600 text-white shadow-lg' : 'bg-[#0d131d] text-gray-400 border border-gray-700'
                        }`}
                      >
                        {day.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* نافذة تسجيل الدخول */}
      {isAuthModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[#18202e] border border-gray-700 rounded-3xl p-6 w-full max-w-md space-y-5 text-white shadow-2xl">
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-bold">{isSignUp ? 'إنشاء حساب جديد' : 'تسجيل الدخول'}</h3>
              <button onClick={() => setIsAuthModalOpen(false)} className="text-gray-400 font-bold">✕</button>
            </div>

            <button
              type="button"
              onClick={async () => {
                try {
                  await signInWithPopup(auth, googleProvider);
                  setIsAuthModalOpen(false);
                } catch (err: any) {
                  alert(err.message);
                }
              }}
              className="w-full py-3 bg-white text-black font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-gray-200 transition"
            >
              الدخول باستخدام Google
            </button>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                try {
                  if (isSignUp) {
                    await createUserWithEmailAndPassword(auth, email, password);
                  } else {
                    await signInWithEmailAndPassword(auth, email, password);
                  }
                  setIsAuthModalOpen(false);
                } catch (err: any) {
                  alert(err.message);
                }
              }}
              className="space-y-4"
            >
              <input
                type="email"
                placeholder="البريد الإلكتروني"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-[#0d131d] border border-gray-700 p-3 rounded-xl outline-none text-white text-sm"
                required
              />
              <input
                type="password"
                placeholder="كلمة المرور"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-[#0d131d] border border-gray-700 p-3 rounded-xl outline-none text-white text-sm"
                required
              />
              <button type="submit" className="w-full py-3 bg-blue-600 font-bold rounded-xl">
                {isSignUp ? 'إنشاء الحساب' : 'دخول'}
              </button>
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