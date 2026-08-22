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
  completedCount: number;
  unit: string;
  color: string;
}

const COLOR_OPTIONS = [
  '#7f2a2d', // أحمر ماروني
  '#1e40af', // أزرق داكن
  '#065f46', // أخضر زمردي
  '#9a3412', // أورانج غامق
  '#4c1d95', // بنفسجي
];

export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [habits, setHabits] = useState<Habit[]>([]);
  
  // Modals
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
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
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);

      if (currentUser) {
        const userDocRef = doc(db, 'users', currentUser.uid);
        const unsubscribeSnapshot = onSnapshot(userDocRef, (docSnap) => {
          if (docSnap.exists() && docSnap.data().habits) {
            setHabits(docSnap.data().habits);
          }
        });
        return () => unsubscribeSnapshot();
      } else {
        const savedHabits = localStorage.getItem('habit_tracker_data');
        if (savedHabits) setHabits(JSON.parse(savedHabits));
      }
    });

    return () => unsubscribeAuth();
  }, []);

  const saveHabitsData = async (updatedHabits: Habit[]) => {
    setHabits(updatedHabits);
    if (user) {
      try {
        const userDocRef = doc(db, 'users', user.uid);
        await setDoc(userDocRef, { habits: updatedHabits, email: user.email }, { merge: true });
      } catch (error) {
        console.error('خطأ في حفظ البيانات:', error);
      }
    } else {
      localStorage.setItem('habit_tracker_data', JSON.stringify(updatedHabits));
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (isSignUp) {
        await createUserWithEmailAndPassword(auth, email, password);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
      setEmail('');
      setPassword('');
      setIsAuthModalOpen(false);
    } catch (error: any) {
      alert(`خطأ: ${error.message}`);
    }
  };

  const handleGoogleAuth = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
      setIsAuthModalOpen(false);
    } catch (error: any) {
      alert(`خطأ في دخول Google: ${error.message}`);
    }
  };

  const handleAddHabit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const newHabit: Habit = {
      id: Date.now().toString(),
      title,
      targetCount: Number(targetCount) || 1,
      completedCount: 0,
      unit,
      color: selectedColor,
    };

    const updated = [...habits, newHabit];
    saveHabitsData(updated);
    setTitle('');
    setIsAddModalOpen(false);
  };

  const updateProgress = (id: string, newCount: number) => {
    const updated = habits.map((h) => {
      if (h.id === id) {
        const validCount = Math.max(0, Math.min(newCount, h.targetCount));
        const updatedHabit = { ...h, completedCount: validCount };
        if (activeHabitCounter?.id === id) setActiveHabitCounter(updatedHabit);
        return updatedHabit;
      }
      return h;
    });
    saveHabitsData(updated);
  };

  const deleteHabit = (id: string) => {
    const updated = habits.filter((h) => h.id !== id);
    saveHabitsData(updated);
    setActiveHabitCounter(null);
  };

  const totalPercentage =
    habits.length === 0
      ? 0
      : Math.round(
          (habits.reduce((acc, h) => acc + h.completedCount / h.targetCount, 0) / habits.length) * 100
        );

  return (
    <div className="max-w-md mx-auto min-h-screen bg-[#1c232b] text-white p-4 font-sans pb-24 dir-rtl text-right" dir="rtl">
      
      {/* الترويسة الرئيسية */}
      <div className="flex justify-between items-center mb-6 pt-2">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-blue-500 flex items-center justify-center font-bold text-xl shadow-lg border-2 border-white/20">
            👤
          </div>
          <div>
            <h1 className="text-xl font-extrabold tracking-wide">مرحباً، {user?.email ? user.email.split('@')[0] : 'هاشم'}</h1>
            <p className="text-xs text-gray-400">ركز على أهدافك اليومية</p>
          </div>
        </div>

        {user ? (
          <button onClick={() => signOut(auth)} className="text-xs bg-red-500/20 text-red-400 px-3 py-1.5 rounded-lg font-bold border border-red-500/30">
            خروج
          </button>
        ) : (
          <button onClick={() => setIsAuthModalOpen(true)} className="text-xs bg-blue-600 hover:bg-blue-500 px-3 py-1.5 rounded-lg font-bold shadow">
            تسجيل الدخول 🔐
          </button>
        )}
      </div>

      {/* شريط تقدم اليوم الذهبي */}
      <div className="bg-gradient-to-r from-[#b38600] to-[#d99b00] text-black p-3.5 rounded-full flex justify-between items-center px-6 shadow-xl mb-8">
        <span className="text-xl">🏆</span>
        <span className="font-extrabold text-lg">تقدم اليوم: {totalPercentage}%</span>
      </div>

      {/* شريط عنوان عادتي */}
      <div className="flex justify-between items-center mb-4 px-2">
        <h2 className="text-2xl font-bold">عاداتي</h2>
        <span className="text-xs text-gray-400">تعديل ✏️</span>
      </div>

      {/* قائمة بطاقات العادات الاحترافية */}
      <div className="space-y-3.5">
        {habits.length === 0 ? (
          <div className="text-center py-12 text-gray-500 text-sm bg-[#232d38] rounded-3xl border border-dashed border-gray-700">
            لا توجد عادات حالية. اضغط زر الإضافة بالأسفل لتجربة العرض الجديد!
          </div>
        ) : (
          habits.map((habit) => {
            const pct = Math.round((habit.completedCount / habit.targetCount) * 100);
            return (
              <div
                key={habit.id}
                onClick={() => setActiveHabitCounter(habit)}
                style={{ backgroundColor: habit.color || '#7f2a2d' }}
                className="p-4 rounded-3xl flex justify-between items-center cursor-pointer shadow-lg hover:brightness-110 transition border border-white/10"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-xs">
                    🔖
                  </div>
                  <span className="font-bold text-base">{habit.title}</span>
                </div>
                <span className="font-extrabold text-base tracking-wider">{pct}%</span>
              </div>
            );
          })
        )}
      </div>

      {/* زر إضافة عادة كبير عائم */}
      <button
        onClick={() => setIsAddModalOpen(true)}
        className="fixed bottom-20 right-6 w-14 h-14 bg-[#3a4856] hover:bg-[#4a5a6c] text-white rounded-2xl shadow-2xl text-3xl font-bold flex items-center justify-center border border-white/20 transition active:scale-95"
      >
        +
      </button>

      {/* نافذة العداد التفاعلية العريضة عند الضغط على عادة */}
      {activeHabitCounter && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex flex-col justify-between p-6 z-50 text-center animate-fadeIn">
          <div className="flex justify-between items-center">
            <button onClick={() => deleteHabit(activeHabitCounter.id)} className="text-red-400 font-bold text-sm">حذف</button>
            <span className="text-gray-400 text-sm">متبقي: {activeHabitCounter.targetCount - activeHabitCounter.completedCount}</span>
            <button onClick={() => setActiveHabitCounter(null)} className="text-gray-300 font-bold text-xl">✕</button>
          </div>

          <div className="my-auto space-y-8">
            <div className="bg-[#2a3440] p-8 rounded-3xl max-w-xs mx-auto shadow-2xl border border-gray-700">
              <h3 className="text-2xl font-bold">{activeHabitCounter.title}</h3>
              <p className="text-xs text-gray-400 mt-2">
                الإنجاز الحالي: {activeHabitCounter.completedCount} من {activeHabitCounter.targetCount} {activeHabitCounter.unit}
              </p>
            </div>

            {/* زر الزيادة الدائري الضخم */}
            <button
              onClick={() => updateProgress(activeHabitCounter.id, activeHabitCounter.completedCount + 1)}
              className="w-48 h-48 rounded-full bg-[#2bbdbd] text-white text-6xl font-extrabold mx-auto flex items-center justify-center shadow-2xl border-4 border-white/20 active:scale-95 transition-transform"
            >
              {activeHabitCounter.completedCount}
            </button>
          </div>
        </div>
      )}

      {/* نافذة إضافة عادة مخصصة بالألوان والخيارات */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <div className="bg-[#222a33] border border-gray-700 rounded-3xl p-6 w-full max-w-md space-y-5 text-white shadow-2xl">
            <div className="flex justify-between items-center border-b border-gray-700 pb-3">
              <button onClick={() => setIsAddModalOpen(false)} className="text-gray-400 text-sm">إلغاء</button>
              <h3 className="text-lg font-bold">إضافة عادة جديدة</h3>
              <button onClick={handleAddHabit} className="text-blue-400 font-bold text-sm">حفظ</button>
            </div>

            <div className="space-y-4">
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

              {/* اختيار لون العادة */}
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
            </div>
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
              onClick={handleGoogleAuth}
              className="w-full py-3 bg-white text-black font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-gray-200 transition"
            >
              الدخول باستخدام Google
            </button>

            <form onSubmit={handleEmailAuth} className="space-y-4">
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