'use client';

import React from 'react';

export interface Habit {
  id: string;
  title: string;
  type: 'عداد' | 'مؤقت' | 'مهمة';
  targetCount: number;
  minMinutes?: number;
  maxMinutes?: number;
  unit: string;
  color: string;
  repeatDays?: number[];
  category?: 'إيجابية' | 'سيئة';
  preferredMode?: 'timer' | 'counter';
  streakCount?: number;
}

interface HabitCardProps {
  habit: Habit;
  count: number;
  isEditMode: boolean;
  streakStatus?: { type: string; count: number };
  lang?: 'ar' | 'en';
  onCounterClick: () => void;
  onQuickToggle: (e: React.MouseEvent) => void;
  onEdit: () => void;
  onDelete: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
}

export default function HabitCard({
  habit,
  count,
  isEditMode,
  streakStatus,
  lang = 'ar',
  onCounterClick,
  onQuickToggle,
  onEdit,
  onDelete,
  onMoveUp,
  onMoveDown,
}: HabitCardProps) {
  const isBad = habit.category === 'سيئة';
  const minVal = habit.minMinutes || habit.targetCount || 1;
  const maxVal = habit.maxMinutes || habit.targetCount || minVal;
  const isCompleted = isBad ? count === 0 : count >= minVal;

  let cardPct = 0;
  if (isBad) {
    cardPct = count === 0 ? 100 : 0;
  } else {
    cardPct = Math.min(100, Math.round((count / minVal) * 100));
  }

  return (
    <div 
      className="bg-[#161e2c] border border-gray-800 hover:border-gray-700 rounded-2xl p-4 flex flex-col gap-3 transition shadow-md relative overflow-hidden"
      style={{ borderRight: lang === 'ar' ? `5px solid ${habit.color || '#3b82f6'}` : undefined, borderLeft: lang === 'en' ? `5px solid ${habit.color || '#3b82f6'}` : undefined }}
    >
      <div className="flex justify-between items-start">
        <div className="space-y-1 flex-1 cursor-pointer" onClick={onCounterClick}>
          <div className="flex items-center gap-2">
            <span className="font-bold text-base text-white">{habit.title}</span>
            {isBad && (
              <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-md font-bold">
                {lang === 'ar' ? 'ترك 🛡️' : 'Quit 🛡️'}
              </span>
            )}
          </div>

          <div className="text-xs text-gray-400 font-medium flex items-center gap-2">
            {habit.minMinutes && habit.maxMinutes ? (
              <span className="text-blue-400 font-mono font-bold">
                {lang === 'ar' ? `الأدنى: ${habit.minMinutes} | الأقصى: ${habit.maxMinutes} ${habit.unit}` : `Min: ${habit.minMinutes} | Max: ${habit.maxMinutes} ${habit.unit}`}
              </span>
            ) : (
              <span>
                {lang === 'ar' ? 'الإنجاز:' : 'Progress:'} <strong className="text-white">{count}</strong> / {habit.targetCount} {habit.unit}
              </span>
            )}
          </div>
        </div>

        {isEditMode ? (
          <div className="flex items-center gap-2">
            <div className="flex flex-col gap-1">
              {onMoveUp && (
                <button onClick={onMoveUp} className="bg-gray-800 hover:bg-gray-700 text-xs px-2 py-1 rounded">▲</button>
              )}
              {onMoveDown && (
                <button onClick={onMoveDown} className="bg-gray-800 hover:bg-gray-700 text-xs px-2 py-1 rounded">▼</button>
              )}
            </div>
            <button onClick={onEdit} className="p-2 bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 rounded-xl text-xs font-bold">✏️</button>
            <button onClick={onDelete} className="p-2 bg-red-600/20 text-red-400 hover:bg-red-600/30 rounded-xl text-xs font-bold">🗑️</button>
          </div>
        ) : (
          <button
            onClick={onQuickToggle}
            className={`w-10 h-10 rounded-xl font-bold flex items-center justify-center transition ${
              isCompleted 
                ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30' 
                : 'bg-[#0d131d] border border-gray-700 text-gray-400 hover:border-gray-500'
            }`}
          >
            {isCompleted ? '✓' : '+'}
          </button>
        )}
      </div>

      <div className="space-y-1.5 pt-1 border-t border-gray-800/60">
        <div className="flex justify-between items-center text-[11px] font-bold">
          <span className="text-amber-400 flex items-center gap-1">
            🔥 {streakStatus?.count || habit.streakCount || 0} {lang === 'ar' ? 'يوم متتالي' : 'Days Streak'}
          </span>
          <span className="text-blue-400">{cardPct}%</span>
        </div>
        <div className="w-full bg-gray-800 h-2 rounded-full overflow-hidden">
          <div 
            style={{ width: `${cardPct}%`, backgroundColor: habit.color || '#3b82f6' }}
            className="h-full rounded-full transition-all duration-500"
          />
        </div>
      </div>
    </div>
  );
}