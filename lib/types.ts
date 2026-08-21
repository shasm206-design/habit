export type HabitType = "simple" | "textRepetition" | "timer" | "counter";

export interface Habit {
  id: string;
  name: string;
  icon: string;
  colorHex: string;
  type: HabitType;
  targetValue: number;
  unit: string;
  sortOrder: number;
  isArchived: boolean;
  createdAt: number; // epoch ms
}

export interface HabitLog {
  id: string; // `${habitId}_${dateStr}`
  habitId: string;
  date: string; // "YYYY-MM-DD"
  value: number;
  isCompleted: boolean;
  updatedAt: number;
}

export interface DayNote {
  date: string; // "YYYY-MM-DD", also the Firestore doc id
  text: string;
  updatedAt: number;
}
