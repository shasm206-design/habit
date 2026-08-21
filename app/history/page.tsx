'use client';

import { useState, useRef } from 'react';

interface CompletedTask {
  id: string;
  title: string;
  completedCount: number;
  targetCount: number;
  unit: string;
}

interface DayData {
  date: string;
  totalPercentage: number;
  tasks: CompletedTask[];
}

export default function HistoryPage() {
  const [selectedDate, setSelectedDate] = useState<string>('2026-08-21');
  const detailSectionRef = useRef<HTMLDivElement>(null);

  // نموذج بيانات السجل
  const historyData: Record<string, DayData> = {
    '2026-08-21': {
      date: '2026-08-21',
      totalPercentage: 85,
      tasks: [
        { id: '1', title: 'قراءة القرآن', completedCount: 20, targetCount: 20, unit: 'صفحة' },
        { id: '2', title: 'تمارين الكاليستثنيكس', completedCount: 45, targetCount: 60, unit: 'دقيقة' },
        { id: '3', title: 'تعلم الإنجليزية', completedCount: 30, targetCount: 30, unit: 'دقيقة' },
      ],
    },
  };

  const currentDayData = historyData[selectedDate] || {
    date: selectedDate,
    totalPercentage: 0,
    tasks: [],
  };

  const handleDateClick = (dateStr: string) => {
    setSelectedDate(dateStr);
    // التمرير التلقائي إلى الأسفل تحت التقويم عند اختيار اليوم
    setTimeout(() => {
      detailSectionRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8 dir-rtl">
      <h1 className="text-3xl font-bold text-center text-gray-800 dark:text-white">سجل الإنجازات</h1>

      {/* قسم التقويم */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-md border border-gray-100 dark:border-gray-700">
        <h2 className="text-xl font-semibold mb-4 text-gray-700 dark:text-gray-200">اختر اليوم من التقويم</h2>
        <div className="grid grid-cols-7 gap-2 text-center">
          {['السبت', 'الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة'].map((day) => (
            <div key={day} className="font-bold text-sm text-gray-500 py-2">{day}</div>
          ))}
          {/* أيام تجريبية في التقويم */}
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
                    ? 'bg-blue-600 text-white shadow-lg scale-105'
                    : 'bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200'
                }`}
              >
                {dayNum}
              </button>
            );
          })}
        </div>
      </div>

      {/* قسم تفاصيل اليوم (تحت التقويم) */}
      <div ref={detailSectionRef} className="pt-4">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 space-y-6">
          
          {/* 1. نسبة اليوم المئوية */}
          <div className="flex items-center justify-between border-b pb-4 border-gray-200 dark:border-gray-700">
            <div>
              <h3 className="text-2xl font-bold text-gray-800 dark:text-white">تفاصيل يوم: {selectedDate}</h3>
              <p className="text-sm text-gray-500">ملخص الإنجاز والمهام المكتملة</p>
            </div>
            <div className="flex items-center space-x-2 space-x-reverse bg-blue-50 dark:bg-blue-950/40 px-4 py-2 rounded-xl">
              <span className="text-sm text-blue-600 dark:text-blue-400 font-medium">إنجاز اليوم:</span>
              <span className="text-2xl font-extrabold text-blue-600 dark:text-blue-400">
                {currentDayData.totalPercentage}%
              </span>
            </div>
          </div>

          {/* 2. قائمة المهام المنجزة والنسب والعدادات */}
          <div>
            <h4 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-4">المهام المنجزة:</h4>
            {currentDayData.tasks.length > 0 ? (
              <div className="space-y-3">
                {currentDayData.tasks.map((task) => {
                  const taskPercentage = Math.min(100, Math.round((task.completedCount / task.targetCount) * 100));

                  return (
                    <div
                      key={task.id}
                      className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-750 rounded-xl border border-gray-200/60 dark:border-gray-700"
                    >
                      <div className="space-y-1">
                        <p className="font-semibold text-gray-800 dark:text-white">{task.title}</p>
                        <p className="text-sm text-gray-500">
                          العدد المنجز: <span className="font-bold text-gray-700 dark:text-gray-300">{task.completedCount} / {task.targetCount} {task.unit}</span>
                        </p>
                      </div>

                      {/* نسبة المهمة الفردية */}
                      <div className="text-left">
                        <span className="inline-block bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 text-sm font-bold px-3 py-1 rounded-lg">
                          {taskPercentage}%
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-center text-gray-500 py-6">لا توجد مهام مسجلة لهذا اليوم.</p>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}