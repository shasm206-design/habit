export interface Habit {
  id: string;
  title: string;
  targetCount: number;
  completedCount: number;
  unit: string;
  selectedDays?: string[];
  createdAt: string;
}

export interface DayLog {
  date: string;
  totalPercentage: number;
  completedHabits: {
    habitId: string;
    title: string;
    completedCount: number;
    targetCount: number;
    unit: string;
    percentage: number;
  }[];
}