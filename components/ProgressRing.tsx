"use client";

interface ProgressRingProps {
  progress: number; // may exceed 1 — over-achievement
  color: string; // hex
  size?: number;
  strokeWidth?: number;
  showLabel?: boolean;
}

export default function ProgressRing({
  progress,
  color,
  size = 44,
  strokeWidth = 5,
  showLabel = true,
}: ProgressRingProps) {
  const clamped = Math.min(Math.max(progress, 0), 1);
  const isOver = progress > 1;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - clamped);
  const percent = Math.round(progress * 100);

  return (
    <div style={{ width: size, height: size }} className="relative shrink-0">
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeOpacity={0.15}
          strokeWidth={strokeWidth}
          fill="none"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 0.3s ease" }}
        />
        {isOver && (
          <circle
            cx={size / 2}
            cy={size / 2}
            r={Math.max(radius - strokeWidth * 0.9, 2)}
            stroke={color}
            strokeWidth={strokeWidth / 2.5}
            fill="none"
            strokeDasharray="2 3"
            strokeLinecap="round"
          />
        )}
      </svg>
      {showLabel && (
        <div className="absolute inset-0 flex items-center justify-center">
          <span
            className="font-bold"
            style={{ fontSize: size * 0.24, color: isOver ? color : undefined }}
          >
            {percent}%
          </span>
        </div>
      )}
    </div>
  );
}
