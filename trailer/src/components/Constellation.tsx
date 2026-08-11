import { useCurrentFrame, interpolate } from "remotion";

interface ConstellationProps {
  nodeCount?: number;
  color?: string;
  connectionDistance?: number;
}

const seededRandom = (seed: number) => {
  const x = Math.sin(seed * 9301 + 49297) * 49297;
  return x - Math.floor(x);
};

export const Constellation: React.FC<ConstellationProps> = ({
  nodeCount = 25,
  color = "#60a5fa",
  connectionDistance = 200,
}) => {
  const frame = useCurrentFrame();

  const nodes = Array.from({ length: nodeCount }, (_, i) => {
    const baseX = seededRandom(i * 7 + 1) * 1920;
    const baseY = seededRandom(i * 7 + 2) * 1080;
    const speedX = (seededRandom(i * 7 + 3) - 0.5) * 0.4;
    const speedY = (seededRandom(i * 7 + 4) - 0.5) * 0.4;
    const size = 2 + seededRandom(i * 7 + 5) * 3;

    const x = (baseX + frame * speedX) % 1920;
    const y = (baseY + frame * speedY) % 1080;

    return { x: x < 0 ? x + 1920 : x, y: y < 0 ? y + 1080 : y, size };
  });

  // Calculate connections
  const connections: { x1: number; y1: number; x2: number; y2: number; opacity: number }[] = [];
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const dx = nodes[i].x - nodes[j].x;
      const dy = nodes[i].y - nodes[j].y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < connectionDistance) {
        connections.push({
          x1: nodes[i].x,
          y1: nodes[i].y,
          x2: nodes[j].x,
          y2: nodes[j].y,
          opacity: (1 - dist / connectionDistance) * 0.3,
        });
      }
    }
  }

  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none" }}>
      <svg width="1920" height="1080" viewBox="0 0 1920 1080" style={{ position: "absolute", inset: 0 }}>
        {connections.map((conn, i) => (
          <line
            key={`c${i}`}
            x1={conn.x1}
            y1={conn.y1}
            x2={conn.x2}
            y2={conn.y2}
            stroke={color}
            strokeWidth="1"
            opacity={conn.opacity}
          />
        ))}
        {/* Traveling data pulses along connections */}
        {connections.slice(0, 8).map((conn, i) => {
          const period = 90 + i * 15;
          const pulseT = ((frame + i * 20) % period) / period;
          const px = conn.x1 + (conn.x2 - conn.x1) * pulseT;
          const py = conn.y1 + (conn.y2 - conn.y1) * pulseT;
          const pulseOp = interpolate(pulseT, [0, 0.1, 0.5, 0.9, 1], [0, 0.6, 0.4, 0.6, 0]) * conn.opacity * 2;
          return (
            <circle
              key={`pulse${i}`}
              cx={px}
              cy={py}
              r={2.5}
              fill={color}
              opacity={Math.min(pulseOp, 0.7)}
            />
          );
        })}
        {nodes.map((node, i) => {
          // Random highlight ping — every ~120 frames, 3 nodes light up briefly
          const pingCycle = (frame + i * 37) % 120;
          const isPinging = pingCycle < 15 && i % 5 === Math.floor(frame / 120) % 5;
          const pingOp = isPinging ? interpolate(pingCycle, [0, 5, 15], [0, 0.8, 0]) : 0;
          return (
            <g key={`n${i}`}>
              {isPinging && (
                <circle
                  cx={node.x}
                  cy={node.y}
                  r={node.size + 6 + pingCycle * 0.5}
                  fill="none"
                  stroke={color}
                  strokeWidth="1"
                  opacity={pingOp * 0.4}
                />
              )}
              <circle
                cx={node.x}
                cy={node.y}
                r={isPinging ? node.size + 1 : node.size}
                fill={color}
                opacity={(0.5 + Math.sin(frame * 0.08 + i) * 0.3) + pingOp * 0.4}
              />
            </g>
          );
        })}
      </svg>
    </div>
  );
};
