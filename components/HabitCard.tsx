'use client';

import { Habit } from '../lib/types';

interface HabitCardProps {
  habit: Habit;
  onUpdateProgress?: (id: string, count: number) => void;
  onDelete?: (id: string) => void;
}

export default function HabitCard({ habit, onUpdateProgress }: HabitCardProps) {
  const percentage = Math.min(100, Math.round((habit.completedCount / habit.targetCount) * 100));

  return (
    <div className="p-4 bg-white dark:bg-gray-800 rounded-xl shadow border border-gray-100 dark:border-gray-700 space-y-2">
      <div className="flex justify-between items-center">
        <h3 className="font-bold text-gray-800 dark:text-white">{habit.title}</h3>
        <span className="text-sm font-semibold text-blue-600">{percentage}%</span>
      </div>
      <p className="text-sm text-gray-500">
        {habit.completedCount} / {habit.targetCount} {habit.unit}
      </p>
    </div>
  );
}