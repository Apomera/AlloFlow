import { useCurrentFrame, interpolate } from "remotion";

interface TickerStripProps {
  items: string[];
  speed?: number;
  color?: string;
  y?: number;
  enterDelay?: number;
}

export const TickerStrip: React.FC<TickerStripProps> = ({
  items,
  speed = 2,
  color = "#60a5fa",
  y = 920,
  enterDelay = 0,
}) => {
  const frame = useCurrentFrame();
  const f = frame - enterDelay;

  const opacity = interpolate(f, [0, 15], [0, 0.35], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  if (f < 0) return null;

  // Repeat the items enough to fill the screen width
  const repeated = [...items, ...items, ...items, ...items];
  const offset = -(f * speed) % (items.length * 200);

  return (
    <div
      style={{
        position: "absolute",
        top: y,
        left: 0,
        right: 0,
        height: 32,
        overflow: "hidden",
        opacity,
        pointerEvents: "none",
      }}
    >
      {/* Subtle background strip with traveling shimmer */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `linear-gradient(90deg, transparent, ${color}08, ${color}08, transparent)`,
        }}
      />
      {/* Subtle traveling highlight sweep across the strip */}
      <div
        style={{
          position: "absolute",
          top: 0,
          bottom: 0,
          left: `${((f * 0.5) % 200) - 50}%`,
          width: "30%",
          background: `linear-gradient(90deg, transparent, ${color}10, transparent)`,
          pointerEvents: "none",
        }}
      />
      {/* Top and bottom border lines */}
      <div style={{ position: "absolute", top: 0, left: 60, right: 60, height: 1, background: `linear-gradient(90deg, transparent, ${color}22, transparent)` }} />
      <div style={{ position: "absolute", bottom: 0, left: 60, right: 60, height: 1, background: `linear-gradient(90deg, transparent, ${color}15, transparent)` }} />
      {/* Edge fade masks */}
      <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 80, background: "linear-gradient(90deg, #0f172a, transparent)", zIndex: 1 }} />
      <div style={{ position: "absolute", right: 0, top: 0, bottom: 0, width: 80, background: "linear-gradient(270deg, #0f172a, transparent)", zIndex: 1 }} />

      {/* Directional indicator — pulsing arrow on left edge */}
      <div
        style={{
          position: "absolute",
          left: 18,
          top: "50%",
          transform: "translateY(-50%)",
          fontSize: 12,
          color,
          fontFamily: "monospace",
          fontWeight: 700,
          opacity: 0.4 + Math.sin(f * 0.12) * 0.25,
          zIndex: 2,
          textShadow: `0 0 4px ${color}66`,
        }}
      >
        ◂◂
      </div>

      {/* Live dot pulse on right edge */}
      <div
        style={{
          position: "absolute",
          right: 24,
          top: "50%",
          transform: "translateY(-50%)",
          display: "flex",
          alignItems: "center",
          gap: 5,
          zIndex: 2,
        }}
      >
        <div
          style={{
            width: 5,
            height: 5,
            borderRadius: "50%",
            background: color,
            opacity: 0.5 + Math.sin(f * 0.2) * 0.3,
            boxShadow: `0 0 4px ${color}`,
          }}
        />
        <span style={{ fontSize: 9, color, fontFamily: "monospace", opacity: 0.5 }}>●</span>
      </div>

      <div
        style={{
          display: "flex",
          gap: 30,
          alignItems: "center",
          height: "100%",
          transform: `translateX(${offset}px)`,
          whiteSpace: "nowrap",
        }}
      >
        {repeated.map((item, i) => {
          const diamondPulse = Math.sin(f * 0.1 + i * 0.8) * 0.3 + 0.7;
          return (
            <div
              key={i}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                fontSize: 13,
                fontFamily: "system-ui, sans-serif",
                fontWeight: 500,
                color,
                flexShrink: 0,
              }}
            >
              <span
                style={{
                  fontSize: 6,
                  opacity: diamondPulse,
                  textShadow: `0 0 4px ${color}`,
                  display: "inline-block",
                  transform: `rotate(${f * 0.5 + i * 10}deg)`,
                }}
              >
                ◆
              </span>
              {item}
            </div>
          );
        })}
      </div>
    </div>
  );
};
