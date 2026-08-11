import { useCurrentFrame } from "remotion";

interface HexGridProps {
  color?: string;
  opacity?: number;
  pulseSpeed?: number;
}

const seededRandom = (seed: number) => {
  const x = Math.sin(seed * 9301 + 49297) * 49297;
  return x - Math.floor(x);
};

export const HexGrid: React.FC<HexGridProps> = ({
  color = "#60a5fa",
  opacity = 0.06,
  pulseSpeed = 0.05,
}) => {
  const frame = useCurrentFrame();

  const hexSize = 60;
  const cols = Math.ceil(1920 / (hexSize * 1.75)) + 1;
  const rows = Math.ceil(1080 / (hexSize * 1.5)) + 1;

  // Only render a subset for performance
  const hexes: { cx: number; cy: number; seed: number }[] = [];
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const offset = row % 2 === 0 ? 0 : hexSize * 0.87;
      const cx = col * hexSize * 1.74 + offset;
      const cy = row * hexSize * 1.5;
      hexes.push({ cx, cy, seed: row * cols + col });
    }
  }

  // Hex path for a flat-top hexagon
  const hexPath = (size: number) => {
    const pts = [];
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI / 3) * i - Math.PI / 6;
      pts.push(`${Math.cos(angle) * size},${Math.sin(angle) * size}`);
    }
    return `M${pts.join("L")}Z`;
  };

  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none" }}>
      <svg width="1920" height="1080" viewBox="0 0 1920 1080" style={{ position: "absolute" }}>
        {hexes.map((hex, i) => {
          const pulse = Math.sin(frame * pulseSpeed + seededRandom(hex.seed) * Math.PI * 2) * 0.5 + 0.5;
          const isHighlighted = seededRandom(hex.seed * 7) > 0.85;

          // Scan-wave — a bright band that sweeps diagonally across the grid
          const scanPos = ((frame * 3) % 2400) - 200;
          const hexDiag = hex.cx * 0.6 + hex.cy * 0.4;
          const scanDist = Math.abs(hexDiag - scanPos);
          const scanBoost = scanDist < 120 ? (1 - scanDist / 120) * 2.5 : 0;

          const hexOpacity = isHighlighted
            ? opacity * (0.5 + pulse * 1.5 + scanBoost)
            : opacity * (0.3 + pulse * 0.4 + scanBoost * 0.5);

          return (
            <g key={i} transform={`translate(${hex.cx},${hex.cy})`}>
              <path
                d={hexPath(hexSize * 0.48)}
                fill="none"
                stroke={color}
                strokeWidth={isHighlighted ? 1.5 : 0.5}
                opacity={hexOpacity}
              />
              {isHighlighted && (
                <path
                  d={hexPath(hexSize * 0.48)}
                  fill={color}
                  opacity={hexOpacity * 0.3}
                />
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
};
