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
  targetCount: number;
  unit: string;
  color: string;
}

export interface DayProgress {
  [habitId: string]: number;
}

const COLOR_OPTIONS = ['#7f2a2d', '#1e40af', '#065f46', '#9a3412', '#4c1d95'];

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
  const [targetCount, setTargetCount] = useState<number>(10);
  const [unit, setUnit] = useState('صفحة');
  const [selectedColor, setSelectedColor] = useState(COLOR_OPTIONS[0]);

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

  const handleSaveHabit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    let updatedHabits: Habit[];
    if (editingHabit) {
      updatedHabits = habits.map((h) =>
        h.id === editingHabit.id ? { ...h, title, targetCount: Number(targetCount), unit, color: selectedColor } : h
      );
    } else {
      const newHabit: Habit = {
        id: Date.now().toString(),
        title,
        targetCount: Number(targetCount) || 1,
        unit,
        color: selectedColor,
      };
      updatedHabits = [...habits, newHabit];
    }

    saveData(updatedHabits, dailyData);
    setTitle('');
    setEditingHabit(null);
    setIsAddModalOpen(false);
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

  const deleteHabit = (id: string) => {
    const updatedHabits = habits.filter((h) => h.id !== id);
    saveData(updatedHabits, dailyData);
  };

  const totalPercentage =
    habits.length === 0
      ? 0
      : Math.round(
          (habits.reduce((acc, h) => acc + getHabitCount(h.id) / h.targetCount, 0) / habits.length) * 100
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
    <div className="max-w-4xl mx-auto min-h-screen bg-[#1c232b] text-white p-4 md:p-8 font-sans pb-24 dir-rtl text-right" dir="rtl">
      
      {/* الترويسة الرئيسية */}
      <div className="flex justify-between items-center mb-6 pt-2">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-blue-600 flex items-center justify-center font-bold text-xl shadow-lg border border-white/20">
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

      {/* شريط الإنجاز والكأس المخصص */}
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
          className="bg-black/20 text-black font-bold p-2 rounded-xl border border-black/10 outline-none text-xs"
        />
      </div>

      {/* شريط أدوات العادات وزر التعديل */}
      <div className="flex justify-between items-center mb-4 px-2">
        <h2 className="text-2xl font-bold">عاداتي</h2>
        <button
          onClick={() => setIsEditMode(!isEditMode)}
          className={`text-xs px-3 py-1.5 rounded-xl font-bold transition ${
            isEditMode ? 'bg-green-600 text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
          }`}
        >
          {isEditMode ? 'تم الحفظ ✔️' : 'تعديل ✏️'}
        </button>
      </div>

      {/* قائمة بطاقات العادات المتكيفة مع PC والجوال */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {habits.length === 0 ? (
          <div className="col-span-full text-center py-12 text-gray-500 text-sm bg-[#232d38] rounded-3xl border border-dashed border-gray-700">
            لا توجد عادات حالية. اضغط زر الإضافة لتأسيس قائمة مهامك!
          </div>
        ) : (
          habits.map((habit, index) => {
            const count = getHabitCount(habit.id);
            const pct = Math.round((count / habit.targetCount) * 100);
            return (
              <div
                key={habit.id}
                style={{ backgroundColor: habit.color || '#7f2a2d' }}
                className="p-4 rounded-3xl flex justify-between items-center shadow-lg border border-white/10 transition hover:brightness-105"
              >
                <div
                  onClick={() => !isEditMode && setActiveHabitCounter(habit)}
                  className="flex items-center gap-3 cursor-pointer flex-1"
                >
                  <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center text-xs font-bold">
                    🔖
                  </div>
                  <div>
                    <span className="font-bold text-base block">{habit.title}</span>
                    <span className="text-xs opacity-80">{count} / {habit.targetCount} {habit.unit}</span>
                  </div>
                </div>

                {isEditMode ? (
                  <div className="flex items-center gap-1.5 bg-black/40 p-1.5 rounded-2xl">
                    <button onClick={() => moveHabit(index, 'up')} className="px-2 py-1 bg-gray-700 rounded-lg text-xs">▲</button>
                    <button onClick={() => moveHabit(index, 'down')} className="px-2 py-1 bg-gray-700 rounded-lg text-xs">▼</button>
                    <button
                      onClick={() => {
                        setEditingHabit(habit);
                        setTitle(habit.title);
                        setTargetCount(habit.targetCount);
                        setUnit(habit.unit);
                        setSelectedColor(habit.color);
                        setIsAddModalOpen(true);
                      }}
                      className="px-2 py-1 bg-blue-600 rounded-lg text-xs"
                    >
                      ✏️
                    </button>
                    <button onClick={() => deleteHabit(habit.id)} className="px-2 py-1 bg-red-600 rounded-lg text-xs">🗑️</button>
                  </div>
                ) : (
                  <span className="font-extrabold text-lg tracking-wider mr-2">{pct}%</span>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* زر إضافة عادة مائل في الأسفل */}
      <button
        onClick={() => {
          setEditingHabit(null);
          setTitle('');
          setIsAddModalOpen(true);
        }}
        className="fixed bottom-10 right-8 w-14 h-14 bg-[#3a4856] hover:bg-[#4a5a6c] text-white rounded-2xl shadow-2xl text-3xl font-bold flex items-center justify-center border border-white/20 transition active:scale-95 z-40"
      >
        +
      </button>

      {/* نافذة العداد التفاعلي */}
      {activeHabitCounter && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex flex-col justify-between p-6 z-50 text-center">
          <div className="flex justify-between items-center max-w-md mx-auto w-full">
            <span className="text-gray-400 text-sm">متبقي: {activeHabitCounter.targetCount - getHabitCount(activeHabitCounter.id)}</span>
            <button onClick={() => setActiveHabitCounter(null)} className="text-gray-300 font-bold text-2xl">✕</button>
          </div>

          <div className="my-auto space-y-8">
            <div className="bg-[#2a3440] p-6 rounded-3xl max-w-xs mx-auto shadow-2xl border border-gray-700">
              <h3 className="text-2xl font-bold">{activeHabitCounter.title}</h3>
              <p className="text-xs text-gray-400 mt-2">
                إنجاز يوم {selectedDate}: {getHabitCount(activeHabitCounter.id)} من {activeHabitCounter.targetCount} {activeHabitCounter.unit}
              </p>
            </div>

            <button
              onClick={() => updateHabitCount(activeHabitCounter.id, getHabitCount(activeHabitCounter.id) + 1)}
              className="w-48 h-48 rounded-full bg-[#2bbdbd] text-white text-6xl font-extrabold mx-auto flex items-center justify-center shadow-2xl border-4 border-white/20 active:scale-95 transition-transform"
            >
              {getHabitCount(activeHabitCounter.id)}
            </button>
          </div>
        </div>
      )}

      {/* نافذة إضافة أو تعديل عادة */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <div className="bg-[#222a33] border border-gray-700 rounded-3xl p-6 w-full max-w-md space-y-5 text-white shadow-2xl">
            <div className="flex justify-between items-center border-b border-gray-700 pb-3">
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
                  className="w-full bg-[#171d24] border border-gray-700 p-3 rounded-xl outline-none text-white text-sm"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-400 block mb-1">الهدف</label>
                  <input
                    type="number"
                    value={targetCount}
                    onChange={(e) => setTargetCount(Number(e.target.value))}
                    className="w-full bg-[#171d24] border border-gray-700 p-3 rounded-xl outline-none text-white text-sm"
                    min="1"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-400 block mb-1">الوحدة</label>
                  <input
                    type="text"
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    className="w-full bg-[#171d24] border border-gray-700 p-3 rounded-xl outline-none text-white text-sm"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="text-xs text-gray-400 block mb-2">اختر لون الشريط</label>
                <div className="flex gap-3 justify-center">
                  {COLOR_OPTIONS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setSelectedColor(color)}
                      style={{ backgroundColor: color }}
                      className={`w-10 h-10 rounded-2xl border-2 transition ${
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

      {/* نافذة تسجيل الدخول */}
      {isAuthModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[#222a33] border border-gray-700 rounded-3xl p-6 w-full max-w-md space-y-5 text-white shadow-2xl">
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
                className="w-full bg-[#171d24] border border-gray-700 p-3 rounded-xl outline-none text-white text-sm"
                required
              />
              <input
                type="password"
                placeholder="كلمة المرور"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-[#171d24] border border-gray-700 p-3 rounded-xl outline-none text-white text-sm"
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