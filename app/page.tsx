'use client';

import { useState, useEffect } from 'react';

export interface Habit {
  id: string;
  title: string;
  type: 'counter' | 'timer' | 'boolean';
  targetCount: number;
  completedCount: number;
  unit: string;
  selectedDays: string[];
  isTimerRunning?: boolean;
}

export default function HomePage() {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [userName, setUserName] = useState('');

  // نموذج إضافة عادة
  const [title, setTitle] = useState('');
  const [type, setType] = useState<'counter' | 'timer' | 'boolean'>('counter');
  const [targetCount, setTargetCount] = useState<number>(10);
  const [unit, setUnit] = useState('صفحة');
  const [selectedDays, setSelectedDays] = useState<string[]>(['كل الأيام']);

  const allDays = ['السبت', 'الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة'];

  // تحميل البيانات المحفوظة عند فتح التطبيق
  useEffect(() => {
    const savedHabits = localStorage.getItem('habit_tracker_data');
    const savedUser = localStorage.getItem('habit_tracker_user');
    if (savedHabits) setHabits(JSON.parse(savedHabits));
    if (savedUser) setUserName(savedUser);
  }, []);

  // حفظ البيانات تلقائياً عند أي تغيير
  useEffect(() => {
    localStorage.setItem('habit_tracker_data', JSON.stringify(habits));
  }, [habits]);

  const handleSaveUser = (name: string) => {
    setUserName(name);
    localStorage.setItem('habit_tracker_user', name);
  };

  // إضافة عادة جديدة
  const handleAddHabit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const newHabit: Habit = {
      id: Date.now().toString(),
      title,
      type,
      targetCount: type === 'boolean' ? 1 : Number(targetCount) || 1,
      completedCount: 0,
      unit: type === 'boolean' ? 'مرة' : type === 'timer' ? 'دقيقة' : unit,
      selectedDays,
    };

    setHabits((prev) => [...prev, newHabit]);
    setTitle('');
    setIsModalOpen(false);
  };

  // التحكم بالترتيب
  const moveHabit = (index: number, direction: 'up' | 'down') => {
    const newHabits = [...habits];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= habits.length) return;
    const temp = newHabits[index];
    newHabits[index] = newHabits[targetIndex];
    newHabits[targetIndex] = temp;
    setHabits(newHabits);
  };

  // تحديث التقدم
  const updateProgress = (id: string, value: number) => {
    setHabits((prev) =>
      prev.map((h) => (h.id === id ? { ...h, completedCount: Math.max(0, Math.min(value, h.targetCount)) } : h))
    );
  };

  // حساب النسبة المئوية الإجمالية لليوم
  const totalPercentage =
    habits.length === 0
      ? 0
      : Math.round(
          (habits.reduce((acc, h) => acc + h.completedCount / h.targetCount, 0) / habits.length) * 100
        );

  return (
    <div className="max-w-3xl mx-auto p-4 md:p-6 space-y-6 dir-rtl text-right min-h-screen pb-24">
      {/* شريط أعلى الصفحة لاسم المستخدم وتسجيل الدخول */}
      <div className="flex justify-between items-center bg-gray-800 p-4 rounded-2xl border border-gray-700 text-white">
        <div>
          <h2 className="text-sm text-gray-400">مرحباً بك 👋</h2>
          <input
            type="text"
            placeholder="ادخل اسمك / حسك..."
            value={userName}
            onChange={(e) => handleSaveUser(e.target.value)}
            className="bg-transparent font-bold text-lg outline-none border-b border-gray-600 focus:border-blue-500"
          />
        </div>
        <span className="text-xs bg-green-500/20 text-green-400 px-3 py-1 rounded-full border border-green-500/30">
          تم تفعيل الحفظ الذاتي 💾
        </span>
      </div>

      {/* شريط النسبة المئوية الإجمالية في الأعلى */}
      <div className="bg-gray-800 p-6 rounded-2xl border border-gray-700 text-white shadow-xl space-y-3">
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

      {/* قائمة العادات والمهام */}
      <div className="space-y-4">
        <h3 className="text-xl font-bold text-white">عاداتك اليومية</h3>
        {habits.length === 0 ? (
          <div className="text-center py-12 bg-gray-800/50 rounded-2xl border border-dashed border-gray-700 text-gray-400">
            لا توجد عادات مضافة بعد. اضغط على زر (+) في الأسفل لإضافة أول عادة!
          </div>
        ) : (
          habits.map((habit, index) => {
            const pct = Math.round((habit.completedCount / habit.targetCount) * 100);
            return (
              <div
                key={habit.id}
                className="bg-gray-800 p-5 rounded-2xl border border-gray-700 text-white flex flex-col sm:flex-row justify-between items-center gap-4 shadow-lg"
              >
                {/* التفاصيل والترتيب */}
                <div className="flex items-center gap-3 w-full sm:w-auto">
                  <div className="flex flex-col gap-1 text-gray-500">
                    <button onClick={() => moveHabit(index, 'up')} className="hover:text-white">▲</button>
                    <button onClick={() => moveHabit(index, 'down')} className="hover:text-white">▼</button>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-lg">{habit.title}</h4>
                      <span className="text-xs bg-gray-700 px-2 py-0.5 rounded text-gray-300">
                        {habit.type === 'counter' ? 'عداد' : habit.type === 'timer' ? 'مؤقت' : 'عادة عادية'}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 mt-1">
                      الهدف: {habit.completedCount} / {habit.targetCount} {habit.unit} ({pct}%)
                    </p>
                  </div>
                </div>

                {/* أدوات التحكم لكل نوع مهمة */}
                <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                  {habit.type === 'boolean' && (
                    <button
                      onClick={() => updateProgress(habit.id, habit.completedCount === 1 ? 0 : 1)}
                      className={`px-4 py-2 rounded-xl font-bold text-sm transition ${
                        habit.completedCount === 1
                          ? 'bg-green-500 text-white'
                          : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                      }`}
                    >
                      {habit.completedCount === 1 ? '✓ تم الإنجاز' : 'تحديد كمكتمل'}
                    </button>
                  )}

                  {habit.type === 'counter' && (
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
                  )}

                  {habit.type === 'timer' && (
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        value={habit.completedCount}
                        onChange={(e) => updateProgress(habit.id, Number(e.target.value))}
                        className="w-16 bg-gray-700 border border-gray-600 p-2 text-center rounded-xl outline-none"
                      />
                      <span className="text-sm text-gray-400">دقيقة</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* زر الـ الزائد العائم (+) في الأسفل */}
      <button
        onClick={() => setIsModalOpen(true)}
        className="fixed bottom-6 left-6 w-14 h-14 bg-blue-600 hover:bg-blue-500 text-white rounded-full shadow-2xl text-3xl font-bold flex items-center justify-center transition-transform hover:scale-110 active:scale-95"
      >
        +
      </button>

      {/* الشاشة المنبثقة لإضافة عادة جديدة */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-gray-800 border border-gray-700 rounded-3xl p-6 w-full max-w-md space-y-5 text-white shadow-2xl">
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-bold">إضافة عادة / مهمة جديدة</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 text-xl font-bold">✕</button>
            </div>

            <form onSubmit={handleAddHabit} className="space-y-4">
              <div>
                <label className="text-sm text-gray-300 block mb-1">اسم المهمة</label>
                <input
                  type="text"
                  placeholder="مثلاً: قراءة القرآن، تمارين..."
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-gray-700 border border-gray-600 p-3 rounded-xl outline-none focus:border-blue-500"
                  required
                />
              </div>

              <div>
                <label className="text-sm text-gray-300 block mb-1">نوع المهمة</label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value as any)}
                  className="w-full bg-gray-700 border border-gray-600 p-3 rounded-xl outline-none focus:border-blue-500"
                >
                  <option value="counter">عداد (صفحات، أرقام...)</option>
                  <option value="timer">مؤقت (دقائق، ساعات...)</option>
                  <option value="boolean">عادة عادية (صح / خطأ)</option>
                </select>
              </div>

              {type !== 'boolean' && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm text-gray-300 block mb-1">الهدف المطلوب</label>
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
              )}

              <button
                type="submit"
                className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition mt-4"
              >
                إضافة العادة فوراً
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}