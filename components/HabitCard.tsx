"use client";

import { useState } from "react";
import { Habit, HabitLog } from "@/lib/types";
import ProgressRing from "./ProgressRing";
import FocusTimer from "./FocusTimer";
import { setLogValue, toggleSimpleLog } from "@/lib/firestore";

interface Props {
  habit: Habit;
  log: HabitLog | undefined;
  dateStr: string;
}

export default function HabitCard({ habit, log, dateStr }: Props) {
  const value = log?.value ?? 0;
  const ratio = habit.targetValue > 0 ? value / habit.targetValue : 0;
  const isOver = value > habit.targetValue;
  const color = habit.colorHex;
  const [busy, setBusy] = useState(false);

  async function adjust(delta: number) {
    if (busy) return;
    setBusy(true);
    const newValue = Math.max(0, value + delta);
    await setLogValue(habit.id, dateStr, newValue, newValue >= habit.targetValue);
    setBusy(false);
  }

  async function toggle() {
    if (busy) return;
    setBusy(true);
    await toggleSimpleLog(habit.id, dateStr, !(log?.isCompleted), habit.targetValue);
    setBusy(false);
  }

  const subtitle = (() => {
    const percent = Math.round(ratio * 100);
    const unit = habit.unit ? ` ${habit.unit}` : "";
    switch (habit.type) {
      case "simple":
        return log?.isCompleted ? "Completed" : "Not done yet";
      case "timer":
        return `${Math.round(value)} / ${habit.targetValue} min · ${percent}%`;
      case "textRepetition": {
        const base = `${Math.round(value)} / ${habit.targetValue} reps · ${percent}%`;
        return isOver ? `${base}  (+${Math.round(value - habit.targetValue)})` : base;
      }
      case "counter": {
        const base = `${Math.round(value)} / ${habit.targetValue}${unit} · ${percent}%`;
        return isOver ? `${base}  (+${Math.round(value - habit.targetValue)})` : base;
      }
    }
  })();

  return (
    <div className="flex items-center gap-3 rounded-2xl bg-white/5 backdrop-blur p-3 border border-white/10">
      <ProgressRing progress={ratio} color={color} />

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-lg leading-none">{habit.icon}</span>
          <p className="font-semibold truncate">{habit.name}</p>
        </div>
        <p
          className="text-sm truncate"
          style={{ color: isOver ? color : "rgba(255,255,255,0.6)" }}
        >
          {subtitle}
        </p>
      </div>

      {habit.type === "simple" && (
        <button
          onClick={toggle}
          className="text-2xl shrink-0 leading-none"
          style={{ color: log?.isCompleted ? color : "rgba(255,255,255,0.3)" }}
          aria-label="toggle completion"
        >
          {log?.isCompleted ? "✓" : "○"}
        </button>
      )}

      {(habit.type === "counter" || habit.type === "textRepetition") && (
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => adjust(-1)}
            disabled={value <= 0}
            className="w-9 h-9 rounded-full bg-white/10 disabled:opacity-30"
          >
            −
          </button>
          <button
            onClick={() => adjust(1)}
            className="w-9 h-9 rounded-full font-medium"
            style={{ backgroundColor: `${color}33`, color }}
          >
            +
          </button>
        </div>
      )}

      {habit.type === "timer" && <FocusTimer habit={habit} log={log} dateStr={dateStr} />}
    </div>
  );
}
