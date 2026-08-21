"use client";

import { useEffect, useState } from "react";
import { Habit } from "@/lib/types";
import { subscribeHabits } from "@/lib/firestore";
import Calendar from "@/components/Calendar";
import DayDetail from "@/components/DayDetail";

export default function HistoryPage() {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [selectedDate, setSelectedDate] = useState(new Date());

  useEffect(() => subscribeHabits(setHabits), []);
  const activeHabits = habits.filter((h) => !h.isArchived);

  return (
    <main className="max-w-lg mx-auto px-4 pt-6 pb-4 space-y-5">
      <h1 className="text-xl font-bold">History</h1>
      <Calendar activeHabits={activeHabits} selectedDate={selectedDate} onSelect={setSelectedDate} />
      <div className="border-t border-white/10 pt-4">
        <DayDetail date={selectedDate} habits={activeHabits} />
      </div>
    </main>
  );
}
