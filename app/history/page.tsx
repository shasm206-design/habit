'use client';

import { useState, useEffect, useRef } from 'react';

interface Habit {
  id: string;
  title: string;
  type: 'counter' | 'timer' | 'boolean';
  targetCount: number;
  completedCount: number;
  unit: string;
}

export default function HistoryPage() {
  const [selectedDate, setSelectedDate] = useState<string>('2026-08-21');
  const [habits, setHabits] = useState<Habit[]>([]);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [currentNote, setCurrentNote] = useState('');
  const detailSectionRef = useRef<HTMLDivElement>(null);

  // قراءة العادات الحقيقية والملاحظات المحفوظة
  useEffect(() => {
    const savedHabits = localStorage.getItem('habit_tracker_data');
    const savedNotes = localStorage.getItem('habit_tracker_notes');
    if (savedHabits) setHabits(JSON.parse(savedHabits));
    if (savedNotes) {
      const parsedNotes = JSON.parse(savedNotes);
      setNotes(parsedNotes);
      setCurrentNote(parsedNotes['2026-08-21'] || '');
    }
  }, []);

  // التمرير السلس وتحديث الملاحظة عند تغيير اليوم
  const handleDateClick = (dateStr: string) => {
    setSelectedDate(dateStr);
    setCurrentNote(notes[dateStr] || '');
    setTimeout(() => {
      detailSectionRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  // حفظ الملاحظة الخاصة باليوم
  const handleSaveNote = (text: string) => {
    setCurrentNote(text);
    const updatedNotes = { ...notes, [selectedDate]: text };
    setNotes(updatedNotes);
    localStorage.setItem('habit_tracker_notes', JSON.stringify(updatedNotes));
  };

  // حساب النسبة الكلية لليوم بناءً على عاداتك الحقيقية
  const totalPercentage =
    habits.length === 0
      ? 0
      : Math.round(
          (habits.reduce((acc, h) => acc + h.completedCount / h.targetCount, 0) / habits.length) * 100
        );

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-6 space-y-8 dir-rtl text-right text-white min-h-screen">
      <h1 className="text-3xl font-bold text-center">سجل الإنجازات والتفاصيل</h1>

      {/* قسم التقويم */}
      <div className="bg-gray-800 p-6 rounded-2xl border border-gray-700 shadow-xl">
        <h2 className="text-xl font-semibold mb-4 text-gray-200">اختر اليوم من التقويم</h2>
        <div className="grid grid-cols-7 gap-2 text-center">
          {['السبت', 'الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة'].map((day) => (
            <div key={day} className="font-bold text-sm text-gray-400 py-2">{day}</div>
          ))}
          {Array.from({ length: 31 }, (_, i) => {
            const dayNum = i + 1;
            const dateStr = `2026-08-${dayNum < 10 ? '0' + dayNum : dayNum}`;
            const isSelected = dateStr === selectedDate;

            return (
              <button
                key={dateStr}
                onClick={() => handleDateClick(dateStr)}
                className={`p-3 rounded-xl font-medium transition-all ${
                  isSelected
                    ? 'bg-blue-600 text-white shadow-lg scale-105 font-bold'
                    : 'bg-gray-700/60 hover:bg-gray-700 text-gray-200'
                }`}
              >
                {dayNum}
              </button>
            );
          })}
        </div>
      </div>

      {/* قسم تفاصيل اليوم والمهام الحقيقية */}
      <div ref={detailSectionRef} className="pt-2">
        <div className="bg-gray-800 p-6 rounded-2xl border border-gray-700 space-y-6 shadow-xl">
          
          {/* الهيدر والنسبة المئوية لليوم */}
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 border-b border-gray-700 pb-4">
            <div>
              <h3 className="text-2xl font-bold">تفاصيل يوم: {selectedDate}</h3>
              <p className="text-sm text-gray-400">ملخص الإنجازات والمهام المكتملة</p>
            </div>
            <div className="bg-blue-950/60 border border-blue-500/30 px-5 py-2.5 rounded-2xl flex items-center gap-3">
              <span className="text-sm text-blue-400 font-medium">إنجاز اليوم:</span>
              <span className="text-3xl font-extrabold text-blue-400">{totalPercentage}%</span>
            </div>
          </div>

          {/* قسم الملاحظات تحت النسبة المئوية مباشرة */}
          <div className="bg-gray-900/60 p-4 rounded-xl border border-gray-700/80 space-y-2">
            <label className="text-sm font-bold text-gray-300 block">📝 ملاحظات هذا اليوم:</label>
            <textarea
              rows={2}
              placeholder="أضف ملاحظاتك أو انطباعك عن إنجاز اليوم هنا..."
              value={currentNote}
              onChange={(e) => handleSaveNote(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 p-3 rounded-xl outline-none focus:border-blue-500 text-sm text-white resize-none"
            />
          </div>

          {/* قائمة المهام العادات الحقيقية المضافة من الصفحة الرئيسية */}
          <div className="space-y-4">
            <h4 className="text-lg font-semibold text-gray-300">المهام المسجلة لليوم:</h4>
            {habits.length > 0 ? (
              <div className="space-y-3">
                {habits.map((habit) => {
                  const pct = Math.min(100, Math.round((habit.completedCount / habit.targetCount) * 100));

                  return (
                    <div
                      key={habit.id}
                      className="flex justify-between items-center p-4 bg-gray-900/80 rounded-xl border border-gray-700/60"
                    >
                      <div className="space-y-1">
                        <p className="font-bold text-lg text-white">{habit.title}</p>
                        <p className="text-sm text-gray-400">
                          العدد المنجز: <span className="font-bold text-gray-200">{habit.completedCount} / {habit.targetCount} {habit.unit}</span>
                        </p>
                      </div>

                      <div className="bg-green-500/20 border border-green-500/30 text-green-400 font-bold px-4 py-1.5 rounded-xl text-sm">
                        {pct}%
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-center text-gray-400 py-6">لا توجد عادات حقيقية مضافة حتى الآن في الرئيسية.</p>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}