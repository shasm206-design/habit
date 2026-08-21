"use client";

import { useEffect, useMemo, useState } from "react";
import { Habit, HabitLog } from "@/lib/types";
import { subscribeHabits, subscribeLogsForDate } from "@/lib/firestore";
import { dateKey } from "@/lib/date";
import HabitCard from "@/components/HabitCard";
import ProgressRing from "@/components/ProgressRing";
import AddHabitModal from "@/components/AddHabitModal";

export default function DashboardPage() {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [logs, setLogs] = useState<HabitLog[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const today = useMemo(() => new Date(), []);
  const todayStr = dateKey(today);

  useEffect(() => subscribeHabits(setHabits), []);
  useEffect(() => subscribeLogsForDate(todayStr, setLogs), [todayStr]);

  const activeHabits = habits.filter((h) => !h.isArchived);
  const logByHabit = new Map(logs.map((l) => [l.habitId, l]));

  const overallRatio = activeHabits.length
    ? activeHabits.reduce((sum, h) => {
        const log = logByHabit.get(h.id);
        const ratio = h.targetValue > 0 ? (log?.value ?? 0) / h.targetValue : 0;
        return sum + Math.min(ratio, 1);
      }, 0) / activeHabits.length
    : 0;

  return (
    <main className="max-w-lg mx-auto px-4 pt-6 pb-4 space-y-5">
      <header className="flex flex-col items-center gap-2 text-center">
        <p className="text-white/50 text-sm">
          {today.toLocaleDateString(undefined, {
            weekday: "long",
            month: "long",
            day: "numeric",
          })}
        </p>
        <ProgressRing progress={overallRatio} color="#0A84FF" size={88} strokeWidth={8} />
        <p className="text-white/50 text-sm">
          {Math.round(overallRatio * 100)}% of today&apos;s habits
        </p>
      </header>

      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Today</h1>
        <button
          onClick={() => setShowAdd(true)}
          className="w-9 h-9 rounded-full bg-white/10 text-lg"
          aria-label="add habit"
        >
          +
        </button>
      </div>

      {activeHabits.length === 0 ? (
        <p className="text-white/40 text-center pt-10">No habits yet. Tap + to add one.</p>
      ) : (
        <div className="space-y-3">
          {activeHabits.map((habit) => (
            <HabitCard
              key={habit.id}
              habit={habit}
              log={logByHabit.get(habit.id)}
              dateStr={todayStr}
            />
          ))}
        </div>
      )}

      {showAdd && <AddHabitModal onClose={() => setShowAdd(false)} />}
    </main>
  );
}
