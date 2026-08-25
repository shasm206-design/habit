'use client';

import React from 'react';

export interface Habit {
  id: string;
  title: string;
  type: 'عداد' | 'مؤقت' | 'مهمة';
  targetCount: number;
  unit: string;
  color: string;
  repeatDays: number[];
  category?: 'إيجابية' | 'سيئة';
  preferredMode?: 'timer' | 'counter';
}

interface HabitCardProps {
  habit: Habit;
  count: number;
  isEditMode: boolean;
  streakStatus?: {
    type: 'gold' | 'bronze' | 'warrior' | 'none';
    count: number;
  };
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
  onCounterClick,
  onQuickToggle,
  onEdit,
  onDelete,
  onMoveUp,
  onMoveDown,
}: HabitCardProps) {
  const isBadHabit = habit.category === 'سيئة';
  const isRelapsed = isBadHabit && count > 0;
  
  const isCompleted = isBadHabit 
    ? !isRelapsed 
    : count >= habit.targetCount && habit.targetCount > 0;
  
  const isOverAchieved = !isBadHabit && count > habit.targetCount && habit.targetCount > 0;
  const pct = isBadHabit 
    ? (isRelapsed ? 0 : 100) 
    : Math.min(100, Math.round((count / (habit.targetCount || 1)) * 100));

  const getHabitIcon = () => {
    if (isBadHabit) return isRelapsed ? '⚠️' : '🛡️';
    if (habit.type === 'مؤقت') return '⏱️';
    if (habit.type === 'عداد') return '📊';
    return '🔖';
  };

  const getStreakBadge = () => {
    if (!streakStatus || streakStatus.type === 'none') return null;

    if (streakStatus.type === 'gold' && streakStatus.count > 0) {
      return (
        <span className="absolute -top-2 left-4 z-10 text-[10px] bg-gradient-to-r from-amber-500 to-red-500 text-white px-2.5 py-0.5 rounded-full font-black shadow-md border border-amber-300/40 flex items-center gap-1">
          🔥 ستريك مكتمل: {streakStatus.count} يوم
        </span>
      );
    }
    if (streakStatus.type === 'bronze') {
      return (
        <span className="absolute -top-2 left-4 z-10 text-[10px] bg-gradient-to-r from-amber-700 to-amber-900 text-amber-200 px-2.5 py-0.5 rounded-full font-black shadow-md border border-amber-500/40 flex items-center gap-1">
          🥉 حماية الستريك: 1 يوم
        </span>
      );
    }
    if (streakStatus.type === 'warrior') {
      return (
        <span className="absolute -top-2 left-4 z-10 text-[10px] bg-red-950 text-red-200 px-2.5 py-0.5 rounded-full font-black border border-red-700 shadow-lg flex items-center gap-1">
          ⚔️ أين المحارب؟
        </span>
      );
    }
    return null;
  };

  return (
    <div className="relative">
      {getStreakBadge()}
      <div
        className={`p-4 rounded-3xl flex justify-between items-center shadow-lg transition duration-200 border select-none ${
          isRelapsed
            ? 'bg-red-950/40 border-red-800/80 text-red-200'
            : isBadHabit
            ? 'bg-[#121c27] border-emerald-500/30 text-white'
            : isOverAchieved
            ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white border-teal-300/60 shadow-teal-900/40'
            : isCompleted
            ? 'bg-emerald-600 text-white border-emerald-400/50 shadow-emerald-900/30'
            : 'bg-[#161e2c] border-gray-700/60 hover:border-gray-600'
        } ${isEditMode ? 'border-blue-400' : ''}`}
      >
        <div onClick={() => !isEditMode && onCounterClick()} className="flex items-center gap-3.5 cursor-pointer flex-1">
          <div
            style={{
              backgroundColor: isBadHabit 
                ? (isRelapsed ? '#ef444433' : '#10b98125') 
                : isCompleted ? '#ffffff33' : `${habit.color || '#3b82f6'}25`,
              borderColor: isBadHabit 
                ? (isRelapsed ? '#ef4444' : '#10b98160') 
                : isCompleted ? '#ffffff66' : `${habit.color || '#3b82f6'}60`,
              color: isBadHabit 
                ? (isRelapsed ? '#ef4444' : '#10b981') 
                : isCompleted ? '#ffffff' : habit.color || '#3b82f6',
            }}
            className="w-11 h-11 rounded-2xl flex items-center justify-center font-black text-lg border shadow-sm transition"
          >
            {isBadHabit ? (isRelapsed ? '⚠️' : '🛡️') : isOverAchieved ? '⭐' : isCompleted ? '✓' : getHabitIcon()}
          </div>

          <div className="text-right">
            <span className="font-bold text-base block tracking-tight">{habit.title}</span>
            <span className={`text-xs ${isCompleted ? 'text-emerald-100 font-medium' : 'text-gray-400'}`}>
              {isBadHabit 
                ? (isRelapsed ? 'تم تسجيل انتكاسة' : 'امتناع ناجح 🛡️') 
                : `${count} / ${habit.targetCount} ${habit.unit}`}
            </span>
          </div>
        </div>

        {isEditMode ? (
          <div className="flex items-center gap-1.5 bg-black/40 p-1.5 rounded-2xl">
            {onMoveUp && (
              <button onClick={onMoveUp} className="w-8 h-8 bg-gray-700 hover:bg-gray-600 rounded-lg text-xs font-black flex items-center justify-center text-white">
                ▲
              </button>
            )}
            {onMoveDown && (
              <button onClick={onMoveDown} className="w-8 h-8 bg-gray-700 hover:bg-gray-600 rounded-lg text-xs font-black flex items-center justify-center text-white">
                ▼
              </button>
            )}
            <button onClick={onEdit} className="px-2.5 py-1.5 bg-blue-600 hover:bg-blue-500 rounded-lg text-xs font-bold text-white">
              تعديل
            </button>
            <button onClick={onDelete} className="px-2 py-1.5 bg-red-600 hover:bg-red-500 rounded-lg text-xs text-white">
              🗑️
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            {!isCompleted && !isBadHabit && (
              <span style={{ color: habit.color || '#3b82f6' }} className="font-black text-base tracking-wider">
                %{pct}
              </span>
            )}

            <button
              type="button"
              onClick={onQuickToggle}
              className={`px-3 py-1.5 rounded-full flex items-center justify-center font-bold text-xs transition active:scale-90 border ${
                isBadHabit
                  ? isRelapsed
                    ? 'bg-red-600 text-white border-red-500'
                    : 'bg-emerald-950/60 border-emerald-500 text-emerald-400 hover:bg-red-900/50 hover:text-red-300'
                  : isCompleted
                  ? 'bg-white/20 text-white border-white/40 shadow-inner'
                  : 'bg-[#0d131d] border-gray-600 text-gray-400 hover:border-white'
              }`}
            >
              {isBadHabit ? (isRelapsed ? 'انتكاسة ⚠️' : 'تسجيل انتكاسة') : '✓'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}