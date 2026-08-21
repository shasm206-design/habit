"use client";

import { useEffect, useRef, useState } from "react";
import { Habit, HabitLog, DayNote } from "@/lib/types";
import { dateKey } from "@/lib/date";
import { subscribeLogsForDate, subscribeDayNote, saveDayNote } from "@/lib/firestore";
import ProgressRing from "./ProgressRing";

/** Exact logged values + % for a day, plus an autosaving daily note.
 * Both the logs and the note are scoped to this one day only. */
export default function DayDetail({ date, habits }: { date: Date; habits: Habit[] }) {
  const dateStr = dateKey(date);
  const [logs, setLogs] = useState<HabitLog[]>([]);
  const [note, setNote] = useState<DayNote | null>(null);
  const [noteText, setNoteText] = useState("");
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const loadedForDate = useRef<string | null>(null);

  useEffect(() => subscribeLogsForDate(dateStr, setLogs), [dateStr]);
  useEffect(() => subscribeDayNote(dateStr, setNote), [dateStr]);

  useEffect(() => {
    if (loadedForDate.current !== dateStr) {
      setNoteText(note?.text ?? "");
      loadedForDate.current = dateStr;
    }
  }, [note, dateStr]);

  function onNoteChange(text: string) {
    setNoteText(text);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => saveDayNote(dateStr, text), 600);
  }

  const logByHabit = new Map(logs.map((l) => [l.habitId, l]));

  return (
    <div className="space-y-4">
      <p className="font-semibold">
        {date.toLocaleDateString(undefined, {
          weekday: "long",
          month: "long",
          day: "numeric",
          year: "numeric",
        })}
      </p>

      {habits.length === 0 ? (
        <p className="text-white/40 text-sm">No habits logged.</p>
      ) : (
        <div className="space-y-2">
          {habits.map((habit) => {
            const log = logByHabit.get(habit.id);
            const ratio = log && habit.targetValue > 0 ? log.value / habit.targetValue : 0;
            const isOver = !!log && log.value > habit.targetValue;
            const percent = Math.round(ratio * 100);
            const unit = habit.unit ? ` ${habit.unit}` : "";

            let status = "Not logged";
            if (log) {
              if (habit.type === "simple") {
                status = log.isCompleted ? "Completed" : "Skipped";
              } else {
                const suffix =
                  habit.type === "counter" ? unit : habit.type === "textRepetition" ? " reps" : " min";
                const base = `${Math.round(log.value)} / ${habit.targetValue}${suffix} · ${percent}%`;
                status = isOver ? `${base}  (+${Math.round(log.value - habit.targetValue)})` : base;
              }
            }

            return (
              <div
                key={habit.id}
                className="flex items-center gap-3 rounded-xl bg-white/5 border border-white/10 p-2.5"
              >
                <span className="text-lg w-6 text-center leading-none">{habit.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{habit.name}</p>
                  <p
                    className="text-xs"
                    style={{ color: isOver ? habit.colorHex : "rgba(255,255,255,0.5)" }}
                  >
                    {status}
                  </p>
                </div>
                <ProgressRing
                  progress={ratio}
                  color={habit.colorHex}
                  size={32}
                  strokeWidth={3}
                  showLabel={false}
                />
              </div>
            );
          })}
        </div>
      )}

      <div className="space-y-1.5">
        <p className="text-sm font-semibold text-white/60">📝 Daily note</p>
        <textarea
          value={noteText}
          onChange={(e) => onNoteChange(e.target.value)}
          placeholder="Write a note for this day…"
          rows={4}
          className="w-full rounded-xl bg-white/5 border border-white/10 p-3 text-sm outline-none resize-none"
        />
      </div>
    </div>
  );
}
