'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';

export default function HistoryPage() {
  const [lang, setLang] = useState<'ar' | 'en'>('ar');
  const [selectedDate, setSelectedDate] = useState<string>('2026-10-16');

  useEffect(() => {
    const savedLang = localStorage.getItem('habit_tracker_lang');
    if (savedLang === 'en' || savedLang === 'ar') setLang(savedLang as 'ar' | 'en');
  }, []);

  return (
    <div className={`max-w-4xl mx-auto min-h-screen bg-[#0d131d] text-white p-4 md:p-8 font-sans pb-28 select-none ${lang === 'ar' ? 'dir-rtl text-right' : 'dir-ltr text-left'}`} dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      
      <div className="mb-6 pt-2">
        <h1 className="text-2xl font-extrabold bg-gradient-to-r from-white via-gray-200 to-gray-400 bg-clip-text text-transparent">
          {lang === 'ar' ? 'سجل الإنجازات والأرشيف 📅' : 'History & Archive 📅'}
        </h1>
        <p className="text-xs text-gray-400 mt-1 font-medium">
          {lang === 'ar' ? 'تصفح واستدرك إنجازاتك اليومية والملاحظات السابقة' : 'Browse and review your daily achievements'}
        </p>
      </div>

      <div className="bg-[#161e2c] border border-gray-800 p-4.5 rounded-3xl space-y-4 mb-6 shadow-xl">
        <div className="flex justify-between items-center">
          <span className="text-xs font-bold text-gray-400">{lang === 'ar' ? 'اختيار اليوم:' : 'Select Day:'}</span>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="bg-[#0d131d] text-blue-400 font-extrabold p-2 rounded-xl border border-gray-700 outline-none text-xs cursor-pointer"
          />
        </div>

        <div className="bg-[#0d131d] border border-gray-800 p-4 rounded-2xl text-center space-y-2">
          <span className="text-xs font-bold text-emerald-400 block">
            {lang === 'ar' ? `يُسمح بالاستدراك والتعديل المباشر على يوم (${selectedDate})` : `Direct edit allowed for (${selectedDate})`}
          </span>
        </div>
      </div>

      <div className="bg-[#161e2c] border border-gray-800 p-6 rounded-3xl text-center space-y-2 shadow-xl">
        <span className="text-4xl block">📜</span>
        <h3 className="text-lg font-bold">{lang === 'ar' ? 'سجل العادات والمهام' : 'Habits & Tasks Log'}</h3>
        <p className="text-xs text-gray-400">
          {lang === 'ar' ? 'جميع تفاصيل إنجازاتك محفوظة بأمان وسلسة في العرض.' : 'All your achievement details are safely stored.'}
        </p>
      </div>

      {/* شريط التنقل السفلي الثابت والأزرار الأربعة كاملة */}
      <div className="fixed bottom-0 left-0 right-0 bg-[#131a26]/90 backdrop-blur-lg border-t border-gray-800 py-3 px-6 flex justify-around items-center z-50 text-xs font-bold">
        <Link href="/" className="text-gray-400 hover:text-white transition">{lang === 'ar' ? '✅ العادات' : '✅ Habits'}</Link>
        <Link href="/history" className="text-blue-400">{lang === 'ar' ? '📅 السجل' : '📅 History'}</Link>
        <Link href="/goals" className="text-gray-400 hover:text-white transition">{lang === 'ar' ? '🏆 الأهداف الذكية' : '🏆 SMART Goals'}</Link>
        <Link href="/stats" className="text-gray-400 hover:text-white transition">{lang === 'ar' ? '📊 الإحصائيات' : '📊 Statistics'}</Link>
      </div>

    </div>
  );
}