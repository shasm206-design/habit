"use client";

import { useEffect, useRef, useState } from "react";
import { Habit, HabitLog } from "@/lib/types";
import { setLogValue } from "@/lib/firestore";

interface Props {
  habit: Habit;
  log: HabitLog | undefined;
  dateStr: string;
}

/** Runs a local second-by-second stopwatch; only writes to Firestore once,
 * on stop, adding the elapsed minutes onto the day's existing value. */
export default function FocusTimer({ habit, log, dateStr }: Props) {
  const [running, setRunning] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  function start() {
    if (running) return;
    setRunning(true);
    intervalRef.current = setInterval(() => setSeconds((s) => s + 1), 1000);
  }

  async function stopAndSave() {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setRunning(false);
    if (seconds === 0) return;
    const minutesToAdd = seconds / 60;
    const newValue = (log?.value ?? 0) + minutesToAdd;
    await setLogValue(habit.id, dateStr, newValue, newValue >= habit.targetValue);
    setSeconds(0);
  }

  const mm = String(Math.floor(seconds / 60)).padStart(2, "0");
  const ss = String(seconds % 60).padStart(2, "0");

  return (
    <div className="flex items-center gap-2 shrink-0">
      <span className="font-mono text-sm w-12 text-center tabular-nums">
        {mm}:{ss}
      </span>
      <button
        onClick={running ? stopAndSave : start}
        className="w-9 h-9 rounded-full flex items-center justify-center"
        style={{ backgroundColor: `${habit.colorHex}33`, color: habit.colorHex }}
        aria-label={running ? "stop timer" : "start timer"}
      >
        {running ? "■" : "▶"}
      </button>
    </div>
  );
}
