export interface Habit {
  id: string;
  title: string;
  targetCount: number;
  completedCount: number;
  unit: string;
  category?: string;
  frequency?: string;
  days?: string[];
  selectedDays?: string[];
  completed?: boolean;
  createdAt?: string;
  streak?: number;
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