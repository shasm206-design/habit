"use client";

import { useEffect, useState } from "react";
import { HabitLog, Habit } from "@/lib/types";
import { addMonths, daysInMonthGrid, dateKey } from "@/lib/date";
import { subscribeLogsForRange } from "@/lib/firestore";

interface Props {
  activeHabits: Habit[];
  selectedDate: Date;
  onSelect: (d: Date) => void;
}

type Level = "none" | "partial" | "full" | "over";

const DOT_COLOR: Record<Level, string> = {
  none: "transparent",
  partial: "#FF9F0A",
  full: "#30D158",
  over: "#BF5AF2",
};

/** Interactive month calendar. Fetches only the current month's logs
 * (subscribeLogsForRange), re-subscribing when the month changes — keeps
 * the query light regardless of how much history has accumulated. */
export default function Calendar({ activeHabits, selectedDate, onSelect }: Props) {
  const [month, setMonth] = useState(
    () => new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1)
  );
  const [monthLogs, setMonthLogs] = useState<HabitLog[]>([]);

  useEffect(() => {
    const start = dateKey(month);
    const end = dateKey(addMonths(month, 1));
    return subscribeLogsForRange(start, end, setMonthLogs);
  }, [month]);

  const cells = daysInMonthGrid(month);
  const weekdayLabels = ["S", "M", "T", "W", "T", "F", "S"];

  function completionFor(day: Date): Level {
    if (!activeHabits.length) return "none";
    const key = dateKey(day);
    const dayLogs = monthLogs.filter((l) => l.date === key);
    if (!dayLogs.length) return "none";

    let anyOver = false;
    let total = 0;
    for (const habit of activeHabits) {
      const log = dayLogs.find((l) => l.habitId === habit.id);
      if (!log) continue;
      const ratio = habit.targetValue > 0 ? log.value / habit.targetValue : 0;
      if (ratio > 1) anyOver = true;
      total += Math.min(ratio, 1);
    }
    const avg = total / activeHabits.length;
    if (anyOver) return "over";
    if (avg >= 1) return "full";
    if (avg > 0) return "partial";
    return "none";
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <button onClick={() => setMonth((m) => addMonths(m, -1))} className="px-3 py-1 text-lg">
          ‹
        </button>
        <p className="font-semibold">
          {month.toLocaleDateString(undefined, { month: "long", year: "numeric" })}
        </p>
        <button onClick={() => setMonth((m) => addMonths(m, 1))} className="px-3 py-1 text-lg">
          ›
        </button>
      </div>

      <div className="grid grid-cols-7 text-center text-xs text-white/40">
        {weekdayLabels.map((w, i) => (
          <span key={i}>{w}</span>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {cells.map((day, i) => {
          if (!day) return <div key={i} />;
          const isSelected = dateKey(day) === dateKey(selectedDate);
          const isToday = dateKey(day) === dateKey(new Date());
          const level = completionFor(day);
          return (
            <button
              key={i}
              onClick={() => onSelect(day)}
              className="flex flex-col items-center gap-1 py-1"
            >
              <span
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm ${
                  isSelected ? "bg-blue-500 text-white" : isToday ? "border border-blue-500" : ""
                }`}
              >
                {day.getDate()}
              </span>
              <span
                className="w-1.5 h-1.5 rounded-full"
                style={{ backgroundColor: DOT_COLOR[level] }}
              />
            </button>
          );
        })}
      </div>
    </div>
  );
}
