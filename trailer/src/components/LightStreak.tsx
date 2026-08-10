import { useCurrentFrame, interpolate } from "remotion";

interface LightStreakProps {
  color?: string;
  startFrame?: number;
  angle?: number;
  speed?: number;
  width?: number;
}

export const LightStreak: React.FC<LightStreakProps> = ({
  color = "#60a5fa",
  startFrame = 0,
  angle = -30,
  speed = 8,
  width = 120,
}) => {
  const frame = useCurrentFrame();
  const f = frame - startFrame;

  if (f < 0) return null;

  const x = f * speed - 400;
  const opacity = interpolate(f, [0, 8, 25, 40], [0, 0.25, 0.15, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  if (opacity <= 0) return null;

  // Trailing sparkle particles left behind the streak
  const sparkleCount = 6;
  const sparkles = Array.from({ length: sparkleCount }, (_, si) => {
    const sparkleX = x - 30 - si * 45;
    const sparkleAge = f - si * 2;
    if (sparkleAge < 4) return null;
    const sparkleOp = interpolate(sparkleAge, [4, 8, 30, 40], [0, 0.6, 0.15, 0], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    });
    const twinkle = Math.sin(sparkleAge * 0.4 + si * 3) * 0.3 + 0.7;
    return { x: sparkleX, op: sparkleOp * twinkle, y: 540 + (si % 3 - 1) * 120 };
  });

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        overflow: "hidden",
        pointerEvents: "none",
        zIndex: 30,
      }}
    >
      {/* Trailing sparkles */}
      {sparkles.map((sp, si) =>
        sp ? (
          <div
            key={`streak-sparkle-${si}`}
            style={{
              position: "absolute",
              left: sp.x,
              top: sp.y,
              width: 3,
              height: 3,
              borderRadius: "50%",
              background: "white",
              opacity: sp.op,
              boxShadow: `0 0 6px ${color}, 0 0 12px ${color}66`,
              transform: `rotate(${angle}deg)`,
            }}
          />
        ) : null,
      )}
      {/* Prismatic fringe — offset color-split edges */}
      <div
        style={{
          position: "absolute",
          left: x - 6,
          top: -200,
          width: width * 0.4,
          height: 2000,
          background: `linear-gradient(90deg, transparent, rgba(167,139,250,0.3), transparent)`,
          transform: `rotate(${angle}deg)`,
          opacity: opacity * 0.5,
          filter: "blur(3px)",
        }}
      />
      <div
        style={{
          position: "absolute",
          left: x,
          top: -200,
          width,
          height: 2000,
          background: `linear-gradient(90deg, transparent, ${color}44, ${color}, ${color}44, transparent)`,
          transform: `rotate(${angle}deg)`,
          opacity,
          filter: `blur(${width > 80 ? 2 : 1}px)`,
        }}
      />
      <div
        style={{
          position: "absolute",
          left: x + width * 0.7,
          top: -200,
          width: width * 0.35,
          height: 2000,
          background: `linear-gradient(90deg, transparent, rgba(52,211,153,0.25), transparent)`,
          transform: `rotate(${angle}deg)`,
          opacity: opacity * 0.4,
          filter: "blur(3px)",
        }}
      />
    </div>
  );
};
