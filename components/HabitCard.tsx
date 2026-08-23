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
}

interface HabitCardProps {
  habit: Habit;
  count: number;
  isEditMode: boolean;
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
  onCounterClick,
  onQuickToggle,
  onEdit,
  onDelete,
  onMoveUp,
  onMoveDown,
}: HabitCardProps) {
  const isCompleted = count >= habit.targetCount && habit.targetCount > 0;
  const isOverAchieved = count > habit.targetCount && habit.targetCount > 0;
  const pct = Math.round((count / habit.targetCount) * 100);

  const getHabitIcon = (type: 'عداد' | 'مؤقت' | 'مهمة') => {
    if (type === 'مؤقت') return '⏱️';
    if (type === 'عداد') return '📊';
    return '🔖';
  };

  return (
    <div
      className={`p-4 rounded-3xl flex justify-between items-center shadow-lg transition duration-200 border select-none ${
        isOverAchieved
          ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white border-teal-300/60 shadow-teal-900/40'
          : isCompleted
          ? 'bg-emerald-600 text-white border-emerald-400/50 shadow-emerald-900/30'
          : 'bg-[#161e2c] border-gray-700/60 hover:border-gray-600'
      } ${isEditMode ? 'border-blue-400' : ''}`}
    >
      <div
        onClick={() => !isEditMode && onCounterClick()}
        className="flex items-center gap-3.5 cursor-pointer flex-1"
      >
        <div
          style={{
            backgroundColor: isCompleted ? '#ffffff33' : `${habit.color || '#3b82f6'}25`,
            borderColor: isCompleted ? '#ffffff66' : `${habit.color || '#3b82f6'}60`,
            color: isCompleted ? '#ffffff' : habit.color || '#3b82f6',
          }}
          className="w-11 h-11 rounded-2xl flex items-center justify-center font-black text-lg border shadow-sm transition"
        >
          {isOverAchieved ? '⭐' : isCompleted ? '✓' : getHabitIcon(habit.type)}
        </div>

        <div className="text-right">
          <span className="font-bold text-base block tracking-tight">{habit.title}</span>
          <span className={`text-xs ${isCompleted ? 'text-emerald-100 font-medium' : 'text-gray-400'}`}>
            {count} / {habit.targetCount} {habit.unit}
          </span>
        </div>
      </div>

      {isEditMode ? (
        <div className="flex items-center gap-1.5 bg-black/40 p-1.5 rounded-2xl">
          {/* أزرار الأسهم المباشرة والمضمونة للجوال */}
          {onMoveUp && (
            <button
              onClick={onMoveUp}
              type="button"
              className="w-8 h-8 bg-gray-700 hover:bg-gray-600 active:bg-blue-600 rounded-lg text-xs font-black flex items-center justify-center text-white transition"
            >
              ▲
            </button>
          )}
          {onMoveDown && (
            <button
              onClick={onMoveDown}
              type="button"
              className="w-8 h-8 bg-gray-700 hover:bg-gray-600 active:bg-blue-600 rounded-lg text-xs font-black flex items-center justify-center text-white transition"
            >
              ▼
            </button>
          )}

          <button
            onClick={onEdit}
            type="button"
            className="px-2.5 py-1.5 bg-blue-600 hover:bg-blue-500 rounded-lg text-xs font-bold text-white transition"
          >
            تعديل
          </button>
          <button
            onClick={onDelete}
            type="button"
            className="px-2 py-1.5 bg-red-600 hover:bg-red-500 rounded-lg text-xs text-white transition"
          >
            🗑️
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-3">
          {!isCompleted && (
            <span
              style={{ color: habit.color || '#3b82f6' }}
              className="font-black text-base tracking-wider"
            >
              %{pct}
            </span>
          )}

          <button
            type="button"
            onClick={onQuickToggle}
            className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition active:scale-90 border ${
              isCompleted
                ? 'bg-white/20 text-white border-white/40 shadow-inner'
                : 'bg-[#0d131d] border-gray-600 text-gray-400 hover:border-white'
            }`}
          >
            ✓
          </button>
        </div>
      )}
    </div>
  );
}