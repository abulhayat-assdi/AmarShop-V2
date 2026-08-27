// Plain inline SVG, no charting library — seven data points on one axis
// doesn't need a dependency, matching this project's preference for
// tested/simple over an added moving part for something this small.
export function WeeklySalesChart({ days }: { days: { label: string; total: number }[] }) {
  const max = Math.max(1, ...days.map((day) => day.total));
  const width = 280;
  const height = 100;
  const barWidth = width / days.length - 8;

  return (
    <svg viewBox={`0 0 ${width} ${height + 20}`} className="w-full" role="img" aria-label="Sales for the last 7 days">
      {days.map((day, i) => {
        const barHeight = (day.total / max) * height;
        const x = i * (width / days.length) + 4;
        const y = height - barHeight;
        return (
          <g key={day.label}>
            <rect x={x} y={y} width={barWidth} height={barHeight} className="fill-black" rx={2} />
            <text
              x={x + barWidth / 2}
              y={height + 14}
              textAnchor="middle"
              className="fill-gray-500 text-[8px]"
            >
              {day.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
