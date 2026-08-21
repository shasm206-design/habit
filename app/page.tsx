'use client';

import { useState, useEffect } from 'react';
import { initializeApp, getApps } from 'firebase/app';
import { getAuth, signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, setDoc, onSnapshot } from 'firebase/firestore';

// إعدادات Firebase الخاصة بمشروعك
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const auth = getAuth(app);
const db = getFirestore(app);
const googleProvider = new GoogleAuthProvider();

export interface Habit {
  id: string;
  title: string;
  type: 'counter' | 'timer' | 'boolean';
  targetCount: number;
  completedCount: number;
  unit: string;
}

export default function HomePage() {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [user, setUser] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // نموذج إضافة عادة
  const [title, setTitle] = useState('');
  const [targetCount, setTargetCount] = useState<number>(10);
  const [unit, setUnit] = useState('صفحة');

  // 1. الاستماع لحالة تسجيل الدخول وجلب البيانات السحابية الحقيقية
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);

      if (currentUser) {
        // عند وجود مستخدم: المزامنة مباشرة مع Firestore باستخدام إيميل المستخدم
        const userDocRef = doc(db, 'users', currentUser.uid);
        const unsubscribeSnapshot = onSnapshot(userDocRef, (docSnap) => {
          if (docSnap.exists() && docSnap.data().habits) {
            setHabits(docSnap.data().habits);
          }
        });
        return () => unsubscribeSnapshot();
      } else {
        // في حال عدم تسجيل الدخول: الاعتماد على الذاكرة المحلية
        const savedHabits = localStorage.getItem('habit_tracker_data');
        if (savedHabits) setHabits(JSON.parse(savedHabits));
      }
    });

    return () => unsubscribeAuth();
  }, []);

  // 2. حفظ العادات سحابياً عند أي تعديل إذا كان المستخدم مسجلاً
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

  const handleGoogleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error('خطأ في تسجيل الدخول:', error);
    }
  };

  const handleLogout = () => {
    signOut(auth);
  };

  const handleAddHabit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const newHabit: Habit = {
      id: Date.now().toString(),
      title,
      type: 'counter',
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

  const totalPercentage =
    habits.length === 0
      ? 0
      : Math.round(
          (habits.reduce((acc, h) => acc + h.completedCount / h.targetCount, 0) / habits.length) * 100
        );

  return (
    <div className="max-w-3xl mx-auto p-4 md:p-6 space-y-6 dir-rtl text-right min-h-screen pb-24 text-white">
      {/* شريط المزامنة أعلى الصفحة */}
      <div className="flex justify-between items-center bg-gray-800 p-4 rounded-2xl border border-gray-700 shadow-lg">
        <div>
          <h2 className="text-xs text-gray-400">حساب المزامنة</h2>
          <p className="font-bold text-sm text-blue-400">
            {user ? user.email : 'غير مسجّل'}
          </p>
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
            onClick={handleGoogleLogin}
            className="flex items-center gap-2 bg-white text-gray-800 px-4 py-2 rounded-xl font-bold text-xs hover:bg-gray-100 transition shadow"
          >
            <span>تسجيل الدخول للمزامنة 🔐</span>
          </button>
        )}
      </div>

      {/* شريط نسبة الإنجاز الكلية */}
      <div className="bg-gray-800 p-6 rounded-2xl border border-gray-700 shadow-xl space-y-3">
        <div className="flex justify-between items-center">
          <span className="font-bold text-lg">نسبة إنجاز اليوم الكلية</span>
          <span className="text-3xl font-extrabold text-blue-400">{totalPercentage}%</span>
        </div>
        <div className="w-full bg-gray-700 h-4 rounded-full overflow-hidden">
          <div
            className="bg-gradient-to-r from-blue-500 to-green-400 h-full transition-all duration-500"
            style={{ width: `${totalPercentage}%` }}
          />
        </div>
      </div>

      {/* قائمة العادات */}
      <div className="space-y-4">
        <h3 className="text-xl font-bold">عاداتك اليومية</h3>
        {habits.length === 0 ? (
          <div className="text-center py-12 bg-gray-800/50 rounded-2xl border border-dashed border-gray-700 text-gray-400">
            لا توجد عادات مضافة. اضغط على زر (+) لإضافة مهمة!
          </div>
        ) : (
          habits.map((habit) => {
            const pct = Math.round((habit.completedCount / habit.targetCount) * 100);
            return (
              <div
                key={habit.id}
                className="bg-gray-800 p-5 rounded-2xl border border-gray-700 flex justify-between items-center gap-4 shadow-lg"
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
                    className="w-16 bg-gray-700 border border-gray-600 p-2 text-center rounded-xl outline-none"
                  />
                  <button
                    onClick={() => updateProgress(habit.id, habit.completedCount + 1)}
                    className="bg-blue-600 hover:bg-blue-500 px-3 py-2 rounded-xl text-sm font-bold"
                  >
                    +1
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* زر إضافة عادت جديدة */}
      <button
        onClick={() => setIsModalOpen(true)}
        className="fixed bottom-6 left-6 w-14 h-14 bg-blue-600 hover:bg-blue-500 text-white rounded-full shadow-2xl text-3xl font-bold flex items-center justify-center transition-transform hover:scale-110 active:scale-95"
      >
        +
      </button>

      {/* نافذة إضافة عادة */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-gray-800 border border-gray-700 rounded-3xl p-6 w-full max-w-md space-y-5 text-white shadow-2xl">
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-bold">إضافة عادة جديدة</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 font-bold">✕</button>
            </div>

            <form onSubmit={handleAddHabit} className="space-y-4">
              <div>
                <label className="text-sm text-gray-300 block mb-1">اسم المهمة</label>
                <input
                  type="text"
                  placeholder="مثلاً: قراءة القرآن"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-gray-700 border border-gray-600 p-3 rounded-xl outline-none"
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
                    className="w-full bg-gray-700 border border-gray-600 p-3 rounded-xl outline-none"
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
                    className="w-full bg-gray-700 border border-gray-600 p-3 rounded-xl outline-none"
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