import { useCurrentFrame, interpolate } from "remotion";

interface SpeedLinesProps {
  count?: number;
  color?: string;
  direction?: "left" | "right";
  active?: boolean;
}

const seededRandom = (seed: number) => {
  const x = Math.sin(seed * 9301 + 49297) * 49297;
  return x - Math.floor(x);
};

export const SpeedLines: React.FC<SpeedLinesProps> = ({
  count = 20,
  color = "#ffffff",
  direction = "left",
  active = true,
}) => {
  const frame = useCurrentFrame();

  if (!active) return null;

  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none" }}>
      {Array.from({ length: count }, (_, i) => {
        const y = seededRandom(i * 11) * 100;
        const width = 80 + seededRandom(i * 13) * 200;
        const speed = 15 + seededRandom(i * 17) * 25;
        const thickness = 1 + seededRandom(i * 19) * 2;
        const delay = seededRandom(i * 23) * 30;

        const x = direction === "left"
          ? ((frame + delay) * speed) % (1920 + width) - width
          : 1920 - ((frame + delay) * speed) % (1920 + width);

        const lineOpacity = interpolate(
          Math.abs(x - 960),
          [0, 600, 960],
          [0.6, 0.3, 0],
          { extrapolateRight: "clamp" },
        );

        const headX = direction === "left" ? x + width : x;

        return (
          <div key={i}>
            <div
              style={{
                position: "absolute",
                left: x,
                top: `${y}%`,
                width,
                height: thickness,
                borderRadius: thickness,
                background: `linear-gradient(${direction === "left" ? 90 : 270}deg, transparent, ${color}88, ${color}, ${color}88, transparent)`,
                opacity: lineOpacity,
              }}
            />
            {/* Bright head particle */}
            <div
              style={{
                position: "absolute",
                left: headX - 2,
                top: `${y}%`,
                width: 4,
                height: 4,
                borderRadius: "50%",
                background: "white",
                opacity: lineOpacity * 0.9,
                boxShadow: `0 0 6px ${color}, 0 0 2px white`,
                transform: "translateY(-1px)",
              }}
            />
          </div>
        );
      })}
    </div>
  );
};
