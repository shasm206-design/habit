"use client";

import {
  collection,
  doc,
  onSnapshot,
  query,
  where,
  orderBy,
  setDoc,
  addDoc,
  updateDoc,
  Unsubscribe,
} from "firebase/firestore";
import { db } from "./firebase";
import { Habit, HabitLog, DayNote, HabitType } from "./types";

const habitsCol = collection(db, "habits");
const logsCol = collection(db, "logs");

// ---------------- Habits ----------------

export function subscribeHabits(cb: (habits: Habit[]) => void): Unsubscribe {
  const q = query(habitsCol, orderBy("sortOrder", "asc"));
  return onSnapshot(q, (snap) => {
    cb(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Habit)));
  });
}

export async function addHabit(data: {
  name: string;
  type: HabitType;
  targetValue: number;
  unit: string;
  colorHex: string;
  icon: string;
}) {
  await addDoc(habitsCol, {
    ...data,
    sortOrder: Date.now(),
    isArchived: false,
    createdAt: Date.now(),
  });
}

export async function archiveHabit(habitId: string) {
  await updateDoc(doc(db, "habits", habitId), { isArchived: true });
}

// ---------------- Logs ----------------
// Doc id `${habitId}_${dateStr}` gives O(1) upserts and lets a single
// `where("date", "==", ...)` (or range) query fetch every habit's log for
// a day/month — no per-habit reads, no composite index needed since the
// range and equality queries below only ever filter on one field ("date").

function logDocId(habitId: string, dateStr: string) {
  return `${habitId}_${dateStr}`;
}

export function subscribeLogsForDate(
  dateStr: string,
  cb: (logs: HabitLog[]) => void
): Unsubscribe {
  const q = query(logsCol, where("date", "==", dateStr));
  return onSnapshot(q, (snap) => {
    cb(snap.docs.map((d) => ({ id: d.id, ...d.data() } as HabitLog)));
  });
}

/** [startStr, endStr) — end is exclusive, e.g. first-of-next-month. */
export function subscribeLogsForRange(
  startStr: string,
  endStr: string,
  cb: (logs: HabitLog[]) => void
): Unsubscribe {
  const q = query(logsCol, where("date", ">=", startStr), where("date", "<", endStr));
  return onSnapshot(q, (snap) => {
    cb(snap.docs.map((d) => ({ id: d.id, ...d.data() } as HabitLog)));
  });
}

/** Sets a log's value directly. Never clamps to targetValue, so logging
 * 21 against a target of 20 (over-achievement) just works. */
export async function setLogValue(
  habitId: string,
  dateStr: string,
  value: number,
  isCompleted: boolean
) {
  const ref = doc(db, "logs", logDocId(habitId, dateStr));
  await setDoc(
    ref,
    { habitId, date: dateStr, value: Math.max(0, value), isCompleted, updatedAt: Date.now() },
    { merge: true }
  );
}

export async function toggleSimpleLog(
  habitId: string,
  dateStr: string,
  isCompleted: boolean,
  targetValue: number
) {
  const ref = doc(db, "logs", logDocId(habitId, dateStr));
  await setDoc(
    ref,
    {
      habitId,
      date: dateStr,
      value: isCompleted ? targetValue : 0,
      isCompleted,
      updatedAt: Date.now(),
    },
    { merge: true }
  );
}

// ---------------- Day notes ----------------
// Doc id = the date string itself, one note per day.

export function subscribeDayNote(
  dateStr: string,
  cb: (note: DayNote | null) => void
): Unsubscribe {
  const ref = doc(db, "dayNotes", dateStr);
  return onSnapshot(ref, (snap) => {
    cb(snap.exists() ? ({ date: dateStr, ...snap.data() } as DayNote) : null);
  });
}

export async function saveDayNote(dateStr: string, text: string) {
  await setDoc(doc(db, "dayNotes", dateStr), { text, updatedAt: Date.now() }, { merge: true });
}
