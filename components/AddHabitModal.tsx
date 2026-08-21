"use client";

import { useState } from "react";
import { addHabit } from "@/lib/firestore";
import { HabitType } from "@/lib/types";

const PRESET_COLORS = [
  "#34C759", "#0A84FF", "#FF9F0A", "#FF375F",
  "#BF5AF2", "#64D2FF", "#FFD60A", "#30D158",
];

const TYPE_LABELS: Record<HabitType, string> = {
  simple: "Simple Checkbox",
  textRepetition: "Repetitions",
  timer: "Focus Timer",
  counter: "Counter",
};

const TYPE_ICONS: Record<HabitType, string> = {
  simple: "✅",
  textRepetition: "📖",
  timer: "⏱️",
  counter: "🔢",
};

export default function AddHabitModal({ onClose }: { onClose: () => void }) {
  const [name, setName] = useState("");
  const [type, setType] = useState<HabitType>("simple");
  const [target, setTarget] = useState(1);
  const [unit, setUnit] = useState("");
  const [color, setColor] = useState(PRESET_COLORS[0]);
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!name.trim() || saving) return;
    setSaving(true);
    await addHabit({
      name: name.trim(),
      type,
      targetValue: type === "simple" ? 1 : Math.max(1, target),
      unit,
      colorHex: color,
      icon: TYPE_ICONS[type],
    });
    setSaving(false);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 p-4">
      <div className="w-full sm:max-w-md bg-neutral-900 rounded-2xl p-5 space-y-4 border border-white/10">
        <h2 className="text-lg font-semibold">New Habit</h2>

        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Habit name"
          className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 outline-none"
        />

        <div className="grid grid-cols-2 gap-2">
          {(Object.keys(TYPE_LABELS) as HabitType[]).map((t) => (
            <button
              key={t}
              onClick={() => setType(t)}
              className={`rounded-lg px-3 py-2 text-sm border text-left ${
                type === t ? "border-white bg-white/10" : "border-white/10"
              }`}
            >
              {TYPE_ICONS[t]} {TYPE_LABELS[t]}
            </button>
          ))}
        </div>

        {type !== "simple" && (
          <div className="flex items-center gap-3">
            <label className="text-sm text-white/60 shrink-0">Target</label>
            <input
              type="number"
              min={1}
              value={target}
              onChange={(e) => setTarget(Number(e.target.value) || 1)}
              className="w-20 rounded-lg bg-white/5 border border-white/10 px-3 py-2"
            />
            {type === "counter" && (
              <input
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                placeholder="unit (pages, glasses)"
                className="flex-1 rounded-lg bg-white/5 border border-white/10 px-3 py-2"
              />
            )}
          </div>
        )}

        <div className="flex gap-2 flex-wrap">
          {PRESET_COLORS.map((c) => (
            <button
              key={c}
              onClick={() => setColor(c)}
              className="w-8 h-8 rounded-full border-2"
              style={{ backgroundColor: c, borderColor: color === c ? "#fff" : "transparent" }}
              aria-label={`color ${c}`}
            />
          ))}
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-white/70">
            Cancel
          </button>
          <button
            onClick={save}
            disabled={!name.trim() || saving}
            className="px-4 py-2 rounded-lg bg-white text-black font-medium disabled:opacity-40"
          >
            Add
          </button>
        </div>
      </div>
    </div>
  );
}
