export default function RingProgress({
  value,
  viewBoxSize,
  displaySize,
  radius,
  strokeWidth,
  transitionMs,
  transitionEasing = 'ease',
  children,
}) {
  const circumference = 2 * Math.PI * radius
  const offset = circumference * (1 - value)
  const center = viewBoxSize / 2

  return (
    <div className="ring" style={{ width: displaySize, height: displaySize }}>
      <svg viewBox={`0 0 ${viewBoxSize} ${viewBoxSize}`} width={displaySize} height={displaySize} className="ring-svg">
        <circle cx={center} cy={center} r={radius} fill="none" stroke="var(--color-divider)" strokeWidth={strokeWidth} />
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="var(--color-accent)"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="ring-fill"
          style={{ transitionDuration: `${transitionMs}ms`, transitionTimingFunction: transitionEasing }}
        />
      </svg>
      {children && <div className="ring-content">{children}</div>}
    </div>
  )
}
