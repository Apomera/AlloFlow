import { useCurrentFrame, interpolate } from "remotion";

interface FloatingTagsProps {
  tags: string[];
  color?: string;
  startFrame?: number;
}

const seededRandom = (seed: number) => {
  const x = Math.sin(seed * 9301 + 49297) * 49297;
  return x - Math.floor(x);
};

export const FloatingTags: React.FC<FloatingTagsProps> = ({
  tags,
  color = "#60a5fa",
  startFrame = 0,
}) => {
  const frame = useCurrentFrame();
  const f = frame - startFrame;

  if (f < 0) return null;

  // Pre-compute tag positions for connection lines
  const tagPositions = tags.map((_, i) => {
    const delay = i * 8;
    const baseX = seededRandom(i * 13 + 1) * 1600 + 160;
    const baseY = seededRandom(i * 13 + 2) * 800 + 140;
    const driftX = Math.sin((f + i * 20) * 0.015) * 30;
    const driftY = Math.cos((f + i * 15) * 0.012) * 20;
    const tagOpacity = interpolate(f, [delay, delay + 15, delay + 100, delay + 120], [0, 0.12, 0.12, 0], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    });
    return { x: baseX + driftX, y: baseY + driftY, opacity: tagOpacity };
  });

  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none" }}>
      {/* Connecting threads between nearby tags */}
      <svg width="1920" height="1080" style={{ position: "absolute", inset: 0 }}>
        {tagPositions.map((a, i) =>
          tagPositions.slice(i + 1).map((b, j) => {
            const dx = a.x - b.x;
            const dy = a.y - b.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist > 350 || a.opacity <= 0 || b.opacity <= 0) return null;
            const lineOp = (1 - dist / 350) * Math.min(a.opacity, b.opacity) * 3;
            // Traveling pulse dot along connection
            const pulseT = ((f * 0.02 + i * 0.3 + j * 0.5) % 1);
            const px = a.x + (b.x - a.x) * pulseT;
            const py = a.y + (b.y - a.y) * pulseT;
            const pulseOp = Math.sin(pulseT * Math.PI) * lineOp * 3;
            return (
              <g key={`conn-${i}-${j}`}>
                <line
                  x1={a.x}
                  y1={a.y}
                  x2={b.x}
                  y2={b.y}
                  stroke={color}
                  strokeWidth="0.5"
                  opacity={lineOp}
                />
                {pulseOp > 0.02 && (
                  <circle cx={px} cy={py} r={2} fill={color} opacity={Math.min(pulseOp, 0.5)} />
                )}
              </g>
            );
          }),
        )}
      </svg>
      {tags.map((tag, i) => {
        const delay = i * 8;
        const baseX = seededRandom(i * 13 + 1) * 1600 + 160;
        const baseY = seededRandom(i * 13 + 2) * 800 + 140;
        const driftX = Math.sin((f + i * 20) * 0.015) * 30;
        const driftY = Math.cos((f + i * 15) * 0.012) * 20;

        const opacity = interpolate(f, [delay, delay + 15, delay + 100, delay + 120], [0, 0.12, 0.12, 0], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });

        if (opacity <= 0) return null;

        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: baseX + driftX,
              top: baseY + driftY,
              fontSize: 16 + seededRandom(i * 3) * 8,
              fontFamily: "system-ui, sans-serif",
              fontWeight: 500,
              color,
              opacity,
              padding: "4px 12px",
              borderRadius: 8,
              border: `1px solid ${color}22`,
              background: `${color}08`,
              whiteSpace: "nowrap",
            }}
          >
            {tag}
          </div>
        );
      })}
    </div>
  );
};
