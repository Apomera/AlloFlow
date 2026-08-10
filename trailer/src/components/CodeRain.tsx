import { useCurrentFrame } from "remotion";

interface CodeRainProps {
  color?: string;
  opacity?: number;
  columns?: number;
}

const seededRandom = (seed: number) => {
  const x = Math.sin(seed * 9301 + 49297) * 49297;
  return x - Math.floor(x);
};

const chars = "αβγδεζηθλμπσφψΩ∑∏∫∂∇≈≠≤≥∞◊⟨⟩{}[]01";

export const CodeRain: React.FC<CodeRainProps> = ({
  color = "#60a5fa",
  opacity = 0.06,
  columns = 30,
}) => {
  const frame = useCurrentFrame();

  const cols = Array.from({ length: columns }, (_, i) => {
    const x = (i / columns) * 100;
    const speed = 0.8 + seededRandom(i * 13) * 1.5;
    const charCount = 8 + Math.floor(seededRandom(i * 17) * 12);
    const startOffset = seededRandom(i * 23) * 400;
    const colOpacity = 0.3 + seededRandom(i * 31) * 0.7;

    const characters = Array.from({ length: charCount }, (_, j) => {
      const yBase = ((frame * speed + startOffset + j * 22) % 1200) - 100;
      const charIndex = Math.floor(seededRandom(i * 100 + j * 7 + Math.floor(frame * 0.1)) * chars.length);
      const charOpacity = j === 0 ? 1 : interpolateSimple(j, 0, charCount, 0.8, 0.1);

      return { y: yBase, char: chars[charIndex], opacity: charOpacity };
    });

    return { x, characters, colOpacity };
  });

  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none", opacity }}>
      {cols.map((col, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            left: `${col.x}%`,
            top: 0,
            opacity: col.colOpacity,
          }}
        >
          {col.characters.map((ch, j) => (
            <div
              key={j}
              style={{
                position: "absolute",
                top: ch.y,
                fontSize: 14,
                fontFamily: "monospace",
                color: j === 0 ? "#ffffff" : color,
                opacity: ch.opacity,
                textShadow: j === 0
                  ? `0 0 8px ${color}, 0 0 16px ${color}88`
                  : j === 1
                    ? `0 0 4px ${color}66`
                    : undefined,
              }}
            >
              {ch.char}
              {/* Lead character halo */}
              {j === 0 && (
                <div
                  style={{
                    position: "absolute",
                    left: "50%",
                    top: "50%",
                    width: 12,
                    height: 12,
                    borderRadius: "50%",
                    background: `radial-gradient(circle, ${color}33, transparent)`,
                    transform: "translate(-50%, -50%)",
                    pointerEvents: "none",
                  }}
                />
              )}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
};

function interpolateSimple(value: number, inMin: number, inMax: number, outMin: number, outMax: number) {
  return outMin + ((value - inMin) / (inMax - inMin)) * (outMax - outMin);
}
