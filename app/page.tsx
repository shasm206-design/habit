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
}

export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [habits, setHabits] = useState<Habit[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [title, setTitle] = useState('');
  const [targetCount, setTargetCount] = useState<number>(10);
  const [unit, setUnit] = useState('صفحة');

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
        console.error('خطأ في حفظ البيانات سحابياً:', error);
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

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error: any) {
      alert(`خطأ أثناء تسجيل الخروج: ${error.message}`);
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
    };

    const updated = [...habits, newHabit];
    saveHabitsData(updated);
    setTitle('');
    setIsModalOpen(false);
  };

  const updateProgress = (id: string, value: number) => {
    const updated = habits.map((h) =>
      h.id === id ? { ...h, completedCount: Math.max(0, Math.min(value, h.targetCount)) } : h
    );
    saveHabitsData(updated);
  };

  const deleteHabit = (id: string) => {
    const updated = habits.filter((h) => h.id !== id);
    saveHabitsData(updated);
  };

  const totalPercentage =
    habits.length === 0
      ? 0
      : Math.round(
          (habits.reduce((acc, h) => acc + h.completedCount / h.targetCount, 0) / habits.length) * 100
        );

  return (
    <div className="max-w-3xl mx-auto p-4 md:p-6 space-y-6 dir-rtl text-right min-h-screen pb-24 text-white bg-[#0d1117]" dir="rtl">
      
      {/* شريط الحساب والمزامنة */}
      <div className="flex justify-between items-center bg-[#161b22] p-4 rounded-2xl border border-gray-800 shadow-lg">
        <div>
          <h2 className="text-xs text-gray-400">حساب المزامنة</h2>
          {loading ? (
            <p className="font-bold text-sm text-gray-400">جاري التحقق...</p>
          ) : user ? (
            <p className="font-bold text-sm text-green-400">{user.email}</p>
          ) : (
            <p className="font-bold text-sm text-red-400">غير مسجّل (حفظ محلي)</p>
          )}
        </div>

        {user ? (
          <button
            onClick={handleLogout}
            className="text-xs bg-red-500/20 text-red-400 px-3 py-2 rounded-xl border border-red-500/30 font-bold hover:bg-red-500/30 transition"
          >
            خروج
          </button>
        ) : (
          <button
            onClick={() => setIsAuthModalOpen(true)}
            className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-xl font-bold text-xs transition shadow"
          >
            تسجيل الدخول 🔐
          </button>
        )}
      </div>

      {/* نسبة الإنجاز اليومية */}
      <div className="bg-[#161b22] p-6 rounded-2xl border border-gray-800 shadow-xl space-y-3">
        <div className="flex justify-between items-center">
          <span className="font-bold text-lg">نسبة إنجاز اليوم الكلية</span>
          <span className="text-3xl font-extrabold text-blue-400">{totalPercentage}%</span>
        </div>
        <div className="w-full bg-gray-800 h-4 rounded-full overflow-hidden">
          <div
            className="bg-gradient-to-r from-blue-500 to-emerald-400 h-full transition-all duration-500"
            style={{ width: `${totalPercentage}%` }}
          />
        </div>
      </div>

      {/* قائمة العادات */}
      <div className="space-y-4">
        <h3 className="text-xl font-bold">عاداتك اليومية</h3>
        {habits.length === 0 ? (
          <div className="text-center py-12 bg-[#161b22]/50 rounded-2xl border border-dashed border-gray-800 text-gray-400">
            لا توجد عادات مضافة. اضغط على زر (+) لإضافة مهمة!
          </div>
        ) : (
          habits.map((habit) => {
            const pct = Math.round((habit.completedCount / habit.targetCount) * 100);
            return (
              <div
                key={habit.id}
                className="bg-[#161b22] p-5 rounded-2xl border border-gray-800 flex justify-between items-center gap-4 shadow-lg"
              >
                <div>
                  <h4 className="font-bold text-lg">{habit.title}</h4>
                  <p className="text-xs text-gray-400 mt-1">
                    الإنجاز: {habit.completedCount} / {habit.targetCount} {habit.unit} ({pct}%)
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={habit.completedCount}
                    onChange={(e) => updateProgress(habit.id, Number(e.target.value))}
                    className="w-16 bg-gray-800 border border-gray-700 p-2 text-center rounded-xl outline-none text-white"
                  />
                  <button
                    onClick={() => updateProgress(habit.id, habit.completedCount + 1)}
                    className="bg-blue-600 hover:bg-blue-500 px-3 py-2 rounded-xl text-sm font-bold"
                  >
                    +1
                  </button>
                  <button
                    onClick={() => deleteHabit(habit.id)}
                    className="text-red-400 hover:text-red-300 p-2 text-sm"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* زر إضافة عادة */}
      <button
        onClick={() => setIsModalOpen(true)}
        className="fixed bottom-6 left-6 w-14 h-14 bg-blue-600 hover:bg-blue-500 text-white rounded-full shadow-2xl text-3xl font-bold flex items-center justify-center transition-transform hover:scale-110 active:scale-95"
      >
        +
      </button>

      {/* نافذة تسجيل الدخول الشاملة */}
      {isAuthModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[#161b22] border border-gray-800 rounded-3xl p-6 w-full max-w-md space-y-5 text-white shadow-2xl">
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-bold">{isSignUp ? 'إنشاء حساب جديد' : 'تسجيل الدخول'}</h3>
              <button onClick={() => setIsAuthModalOpen(false)} className="text-gray-400 font-bold">✕</button>
            </div>

            {/* زر الدخول باستخدام Google */}
            <button
              type="button"
              onClick={handleGoogleAuth}
              className="w-full py-3 bg-white text-black font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-gray-200 transition"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
              </svg>
              الدخول باستخدام Google
            </button>

            <div className="flex items-center gap-2 my-2 text-gray-500 text-xs">
              <div className="h-px bg-gray-800 flex-1"></div>
              <span>أو بالبريد الإلكتروني</span>
              <div className="h-px bg-gray-800 flex-1"></div>
            </div>

            {/* نموذج البريد الإلكتروني وكلمة المرور */}
            <form onSubmit={handleEmailAuth} className="space-y-4">
              <div>
                <label className="text-sm text-gray-300 block mb-1">البريد الإلكتروني</label>
                <input
                  type="email"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 p-3 rounded-xl outline-none text-white"
                  required
                />
              </div>

              <div>
                <label className="text-sm text-gray-300 block mb-1">كلمة المرور</label>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 p-3 rounded-xl outline-none text-white"
                  required
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition"
              >
                {isSignUp ? 'إنشاء الحساب' : 'دخول'}
              </button>
            </form>

            <div className="text-center text-xs text-gray-400">
              {isSignUp ? 'لديك حساب بالفعل؟ ' : 'ليس لديك حساب؟ '}
              <button
                type="button"
                onClick={() => setIsSignUp(!isSignUp)}
                className="text-blue-400 underline font-bold"
              >
                {isSignUp ? 'تسجيل الدخول' : 'إنشاء حساب جديد'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* نافذة إضافة عادة */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[#161b22] border border-gray-800 rounded-3xl p-6 w-full max-w-md space-y-5 text-white shadow-2xl">
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-bold">إضافة عادة جديدة</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 font-bold">✕</button>
            </div>

            <form onSubmit={handleAddHabit} className="space-y-4">
              <div>
                <label className="text-sm text-gray-300 block mb-1">اسم المهمة</label>
                <input
                  type="text"
                  placeholder="مثلاً: قراءة كتاب"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 p-3 rounded-xl outline-none text-white"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm text-gray-300 block mb-1">الهدف</label>
                  <input
                    type="number"
                    value={targetCount}
                    onChange={(e) => setTargetCount(Number(e.target.value))}
                    className="w-full bg-gray-800 border border-gray-700 p-3 rounded-xl outline-none text-white"
                    min="1"
                    required
                  />
                </div>
                <div>
                  <label className="text-sm text-gray-300 block mb-1">الوحدة</label>
                  <input
                    type="text"
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    className="w-full bg-gray-800 border border-gray-700 p-3 rounded-xl outline-none text-white"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition"
              >
                إضافة فورية
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}