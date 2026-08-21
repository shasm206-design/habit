'use client';

import { useState, useEffect } from 'react';

interface Habit {
  id: string;
  title: string;
  targetCount: number;
  completedCount: number;
  unit: string;
  days: string[];
}

export default function HomePage() {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [title, setTitle] = useState('');
  const [targetCount, setTargetCount] = useState<number>(10);
  const [unit, setUnit] = useState('صفحة');
  const [selectedDays, setSelectedDays] = useState<string[]>(['كل الأيام']);

  const allDays = ['السبت', 'الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة'];

  // إضافة عادة جديدة
  const handleAddHabit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const newHabit: Habit = {
      id: Date.now().toString(),
      title,
      targetCount: Number(targetCount) || 1, // تحويل صريح لرقم
      completedCount: 0,
      unit,
      days: selectedDays,
    };

    setHabits((prev) => [...prev, newHabit]);
    setTitle('');
    setTargetCount(10);
  };

  // زيادة العداد دون توقف عند 1
  const handleIncrement = (id: string) => {
    setHabits((prev) =>
      prev.map((habit) => {
        if (habit.id === id) {
          const nextCount = Number(habit.completedCount) + 1;
          return {
            ...habit,
            completedCount: nextCount <= habit.targetCount ? nextCount : habit.targetCount,
          };
        }
        return habit;
      })
    );
  };

  // تعيين عدد يدوي للعادة (مثلاً إدخال 20 صفحة مباشرة)
  const handleSetCount = (id: string, value: number) => {
    const numValue = Number(value) || 0;
    setHabits((prev) =>
      prev.map((habit) =>
        habit.id === id ? { ...habit, completedCount: Math.min(numValue, habit.targetCount) } : habit
      )
    );
  };

  const toggleDay = (day: string) => {
    setSelectedDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-8 dir-rtl">
      <h1 className="text-3xl font-bold text-center text-gray-800 dark:text-white">متابع العادات اليومية</h1>

      {/* نموذج إضافة عادة جديدة */}
      <form onSubmit={handleAddHabit} className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-md space-y-4">
        <h2 className="text-xl font-semibold text-gray-700 dark:text-gray-200">إضافة عادة جديدة</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <input
            type="text"
            placeholder="اسم العادة (مثلاً: قراءة القرآن)"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="p-3 border rounded-xl dark:bg-gray-700 dark:text-white"
            required
          />
          <input
            type="number"
            placeholder="الهدف المطلوب (مثلاً: 20)"
            value={targetCount}
            onChange={(e) => setTargetCount(Number(e.target.value))}
            className="p-3 border rounded-xl dark:bg-gray-700 dark:text-white"
            min="1"
            required
          />
          <input
            type="text"
            placeholder="الوحدة (صفحة، دقيقة...)"
            value={unit}
            onChange={(e) => setUnit(e.target.value)}
            className="p-3 border rounded-xl dark:bg-gray-700 dark:text-white"
            required
          />
        </div>

        {/* تحديد الأيام */}
        <div>
          <label className="block text-sm font-medium mb-2 text-gray-600 dark:text-gray-300">حدد أيام العادة:</label>
          <div className="flex flex-wrap gap-2">
            {allDays.map((day) => (
              <button
                type="button"
                key={day}
                onClick={() => toggleDay(day)}
                className={`px-3 py-1.5 text-sm rounded-lg border transition ${
                  selectedDays.includes(day)
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                }`}
              >
                {day}
              </button>
            ))}
          </div>
        </div>

        <button
          type="submit"
          className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition"
        >
          إضافة العادة
        </button>
      </form>

      {/* قائمة العادات */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-gray-700 dark:text-gray-200">عادات اليوم:</h2>
        {habits.length === 0 ? (
          <p className="text-gray-500 text-center py-4">لا توجد عادات مضافة بعد.</p>
        ) : (
          habits.map((habit) => {
            const percentage = Math.round((habit.completedCount / habit.targetCount) * 100);
            return (
              <div
                key={habit.id}
                className="bg-white dark:bg-gray-800 p-5 rounded-2xl shadow border border-gray-100 dark:border-gray-700 flex flex-col md:flex-row items-center justify-between gap-4"
              >
                <div>
                  <h3 className="text-lg font-bold text-gray-800 dark:text-white">{habit.title}</h3>
                  <p className="text-sm text-gray-500">
                    الأيام المحددة: {habit.days.join('، ') || 'كل الأيام'}
                  </p>
                  <p className="text-sm font-semibold text-blue-600 mt-1">
                    الإنجاز: {habit.completedCount} / {habit.targetCount} {habit.unit} ({percentage}%)
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    value={habit.completedCount}
                    onChange={(e) => handleSetCount(habit.id, Number(e.target.value))}
                    className="w-20 p-2 border rounded-lg text-center dark:bg-gray-700 dark:text-white"
                    min="0"
                    max={habit.targetCount}
                  />
                  <button
                    onClick={() => handleIncrement(habit.id)}
                    className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg transition"
                  >
                    +1 {habit.unit}
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}