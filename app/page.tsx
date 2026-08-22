'use client';

import React, { useState, useEffect } from 'react';
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

export interface Habit {
  id: string;
  title: string;
  type: 'عداد' | 'مؤقت' | 'مهمة';
  targetCount: number;
  unit: string;
  color: string;
  repeatDays: number[];
}

export interface DayProgress {
  [habitId: string]: number;
}

const COLOR_OPTIONS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];
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
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

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

  useEffect(() => {
    const todayStr = new Date().toISOString().split('T')[0];
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

    return () => unsubscribeAuth();
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
    const validCount = Math.max(0, Math.min(newCount, habit.targetCount));
    const updatedDay = { ...currentDayProgress, [habitId]: validCount };
    const updatedDaily = { ...dailyData, [selectedDate]: updatedDay };
    saveData(habits, updatedDaily);
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

    let updatedHabits: Habit[];
    if (editingHabit) {
      updatedHabits = habits.map((h) =>
        h.id === editingHabit.id
          ? { 
              ...h, 
              title, 
              type: habitType,
              targetCount: Number(targetCount), 
              unit: habitType === 'مؤقت' ? 'دقيقة' : habitType === 'مهمة' ? 'مرة' : unit, 
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
        targetCount: Number(targetCount) || 1,
        unit: habitType === 'مؤقت' ? 'دقيقة' : habitType === 'مهمة' ? 'مرة' : unit,
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
    if (pct >= 95) return { trophy: '👑', label: 'يا استثنائي' };
    if (pct >= 80) return { trophy: '🥇', label: 'ممتاز' };
    if (pct >= 60) return { trophy: '🥈', label: 'جيد' };
    if (pct >= 40) return { trophy: '🥉', label: 'مقبول' };
    return { trophy: '❌', label: 'متواضع' };
  };

  const status = getTrophyStatus(totalPercentage);

  return (
    <div className="max-w-4xl mx-auto min-h-screen bg-[#141921] text-white p-4 md:p-8 font-sans pb-24 dir-rtl text-right" dir="rtl">
      
      {/* الترويسة الرئيسية */}
      <div className="flex justify-between items-center mb-6 pt-2">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-blue-600/30 border border-blue-500/40 flex items-center justify-center font-bold text-xl shadow-lg">
            👤
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-extrabold">مرحباً، {user?.email ? user.email.split('@')[0] : 'هاشم'}</h1>
            <p className="text-xs text-gray-400">تاريخ اليوم: {selectedDate}</p>
          </div>
        </div>

        {user ? (
          <button onClick={() => signOut(auth)} className="text-xs bg-red-500/20 text-red-400 px-4 py-2 rounded-xl font-bold border border-red-500/30 hover:bg-red-500/30 transition">
            تسجيل الخروج
          </button>
        ) : (
          <button onClick={() => setIsAuthModalOpen(true)} className="text-xs bg-blue-600 hover:bg-blue-500 px-4 py-2 rounded-xl font-bold shadow transition">
            تسجيل الدخول 🔐
          </button>
        )}
      </div>

      {/* شريط الإنجاز والكأس */}
      <div className="bg-gradient-to-r from-[#b38600] to-[#d99b00] text-black p-4 rounded-3xl flex justify-between items-center px-6 shadow-2xl mb-8">
        <div className="flex items-center gap-3">
          <span className="text-3xl">{status.trophy}</span>
          <div>
            <span className="font-extrabold text-lg block">تقدم اليوم: {totalPercentage}%</span>
            <span className="text-xs font-bold opacity-80">التقييم: {status.label}</span>
          </div>
        </div>
        <input 
          type="date" 
          value={selectedDate} 
          onChange={(e) => setSelectedDate(e.target.value)}
          className="bg-black/20 text-black font-bold p-2 rounded-xl border border-black/10 outline-none text-xs cursor-pointer"
        />
      </div>

      {/* شريط التحكم والتعديل */}
      <div className="flex justify-between items-center mb-4 px-2">
        <h2 className="text-2xl font-bold">عاداتي {isEditMode && <span className="text-xs text-blue-400 font-normal">(اسحب العادة لترتيبها)</span>}</h2>
        <button
          onClick={() => setIsEditMode(!isEditMode)}
          className={`text-xs px-3.5 py-1.5 rounded-xl font-bold transition ${
            isEditMode ? 'bg-emerald-600 text-white' : 'bg-[#1f2733] text-gray-300 hover:bg-gray-700 border border-gray-700'
          }`}
        >
          {isEditMode ? 'تم الحفظ ✔️' : 'تعديل ✏️'}
        </button>
      </div>

      {/* قائمة بطاقات العادات المصممة باحترافية */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {visibleHabits.length === 0 ? (
          <div className="col-span-full text-center py-12 text-gray-500 text-sm bg-[#1a222d] rounded-3xl border border-dashed border-gray-800">
            لا توجد عادات مسجلة لهذا اليوم المختار.
          </div>
        ) : (
          visibleHabits.map((habit, index) => {
            const count = getHabitCount(habit.id);
            const isCompleted = count >= habit.targetCount && habit.targetCount > 0;
            const pct = Math.round((count / habit.targetCount) * 100);

            return (
              <div
                key={habit.id}
                draggable={isEditMode}
                onDragStart={() => handleDragStart(index)}
                onDragOver={(e) => handleDragOver(e, index)}
                className={`p-4 rounded-3xl flex justify-between items-center shadow-md transition border ${
                  isCompleted 
                    ? 'bg-emerald-600/90 border-emerald-400/50 text-white shadow-emerald-900/30' 
                    : 'bg-[#1e2633] border-gray-700/60 hover:border-gray-600'
                } ${isEditMode ? 'cursor-grab active:cursor-grabbing border-blue-400' : ''}`}
              >
                <div
                  onClick={() => !isEditMode && setActiveHabitCounter(habit)}
                  className="flex items-center gap-3 cursor-pointer flex-1"
                >
                  {/* الأيقونة الملونة المقتصرة على شكل النمط المحدد */}
                  <div 
                    style={{ backgroundColor: isCompleted ? '#ffffff33' : `${habit.color || '#3b82f6'}25`, color: isCompleted ? '#ffffff' : habit.color || '#3b82f6' }}
                    className="w-10 h-10 rounded-2xl flex items-center justify-center font-bold text-sm border border-white/10"
                  >
                    {isCompleted ? '✓' : isEditMode ? '☰' : '📊'}
                  </div>
                  <div>
                    <span className="font-bold text-base block">{habit.title}</span>
                    <span className={`text-xs ${isCompleted ? 'text-emerald-100' : 'text-gray-400'}`}>
                      {count} / {habit.targetCount} {habit.unit}
                    </span>
                  </div>
                </div>

                {isEditMode ? (
                  <div className="flex items-center gap-1.5 bg-black/40 p-1.5 rounded-2xl">
                    <button
                      onClick={() => {
                        setEditingHabit(habit);
                        setTitle(habit.title);
                        setHabitType(habit.type || 'عداد');
                        setTargetCount(habit.targetCount);
                        setUnit(habit.unit);
                        setSelectedColor(habit.color);
                        setSelectedDays(habit.repeatDays || [0, 1, 2, 3, 4, 5, 6]);
                        setIsAddModalOpen(true);
                      }}
                      className="px-2.5 py-1 bg-blue-600 rounded-lg text-xs font-bold"
                    >
                      تعديل
                    </button>
                    <button onClick={() => deleteHabit(habit.id)} className="px-2 py-1 bg-red-600 rounded-lg text-xs">🗑️</button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    {isCompleted && <span className="text-sm">🔥 1</span>}
                    <span 
                      style={{ color: isCompleted ? '#ffffff' : habit.color || '#3b82f6' }}
                      className="font-black text-lg tracking-wider"
                    >
                      %{pct}
                    </span>
                  </div>
                )}
              </div>
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
        className="fixed bottom-10 right-8 w-14 h-14 bg-[#2b3648] hover:bg-[#38465c] text-white rounded-2xl shadow-2xl text-3xl font-bold flex items-center justify-center border border-white/10 transition active:scale-95 z-40"
      >
        +
      </button>

      {/* نافذة العداد */}
      {activeHabitCounter && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex flex-col justify-between p-6 z-50 text-center">
          <div className="flex justify-between items-center max-w-md mx-auto w-full">
            <span className="text-gray-400 text-sm">متبقي: {activeHabitCounter.targetCount - getHabitCount(activeHabitCounter.id)}</span>
            <button onClick={() => setActiveHabitCounter(null)} className="text-gray-300 font-bold text-2xl">✕</button>
          </div>

          <div className="my-auto space-y-8">
            <div className="bg-[#1e2633] p-6 rounded-3xl max-w-xs mx-auto shadow-2xl border border-gray-700">
              <h3 className="text-2xl font-bold">{activeHabitCounter.title}</h3>
              <p className="text-xs text-gray-400 mt-2">
                إنجاز يوم {selectedDate}: {getHabitCount(activeHabitCounter.id)} من {activeHabitCounter.targetCount} {activeHabitCounter.unit}
              </p>
            </div>

            <button
              onClick={() => updateHabitCount(activeHabitCounter.id, getHabitCount(activeHabitCounter.id) + 1)}
              style={{ backgroundColor: activeHabitCounter.color || '#2bbdbd' }}
              className="w-48 h-48 rounded-full text-white text-6xl font-extrabold mx-auto flex items-center justify-center shadow-2xl border-4 border-white/20 active:scale-95 transition-transform"
            >
              {getHabitCount(activeHabitCounter.id)}
            </button>
          </div>
        </div>
      )}

      {/* نافذة إضافة أو تعديل عادة */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-[#1e2633] border border-gray-700/80 rounded-3xl p-6 w-full max-w-md space-y-5 text-white shadow-2xl my-8">
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
                  className="w-full bg-[#141921] border border-gray-700 p-3 rounded-xl outline-none text-white text-sm focus:border-blue-500"
                  required
                />
              </div>

              <div>
                <label className="text-xs text-gray-400 block mb-2">نوع العادة</label>
                <div className="grid grid-cols-3 gap-2 bg-[#141921] p-1.5 rounded-2xl border border-gray-700 text-center text-xs font-bold">
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
                <div className="space-y-2 bg-[#141921] p-4 rounded-2xl border border-gray-700">
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
                <label className="text-xs text-gray-400 block mb-2">لون الأيقونة والتفاصيل</label>
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
                          isSelected ? 'bg-blue-600 text-white shadow-lg' : 'bg-[#141921] text-gray-400 border border-gray-700'
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
          <div className="bg-[#1e2633] border border-gray-700 rounded-3xl p-6 w-full max-w-md space-y-5 text-white shadow-2xl">
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
                className="w-full bg-[#141921] border border-gray-700 p-3 rounded-xl outline-none text-white text-sm"
                required
              />
              <input
                type="password"
                placeholder="كلمة المرور"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-[#141921] border border-gray-700 p-3 rounded-xl outline-none text-white text-sm"
                required
              />
              <button type="submit" className="w-full py-3 bg-blue-600 font-bold rounded-xl">
                {isSignUp ? 'إنشاء الحساب' : 'دخول'}
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}