import { useCurrentFrame, interpolate } from "remotion";

interface StarFieldProps {
  count?: number;
  speed?: number;
  color?: string;
}

// Deterministic pseudo-random from seed
const seededRandom = (seed: number) => {
  const x = Math.sin(seed * 9301 + 49297) * 49297;
  return x - Math.floor(x);
};

export const StarField: React.FC<StarFieldProps> = ({ count = 60, speed = 0.3, color = "#ffffff" }) => {
  const frame = useCurrentFrame();

  const stars = Array.from({ length: count }, (_, i) => {
    const x = seededRandom(i * 3 + 1) * 100;
    const baseY = seededRandom(i * 3 + 2) * 100;
    const size = 1 + seededRandom(i * 3 + 3) * 2.5;
    const twinkleSpeed = 0.5 + seededRandom(i * 7) * 2;
    const twinkleOffset = seededRandom(i * 11) * Math.PI * 2;
    const drift = seededRandom(i * 5) * speed;

    const y = (baseY + frame * drift * 0.1) % 100;
    const opacity = 0.2 + Math.sin(frame * twinkleSpeed * 0.1 + twinkleOffset) * 0.3 + 0.3;

    return { x, y, size, opacity };
  });

  // Shooting stars — 3 that appear at staggered intervals
  const shootingStars = Array.from({ length: 3 }, (_, i) => {
    const period = 180 + i * 70;
    const cycleFrame = (frame + i * 60) % period;
    const active = cycleFrame < 20;
    if (!active) return null;
    const startX = seededRandom(i * 31 + 7) * 60 + 20;
    const startY = seededRandom(i * 31 + 9) * 40 + 5;
    const progress = cycleFrame / 20;
    const trailX = startX + progress * 25;
    const trailY = startY + progress * 15;
    const shootOpacity = interpolate(progress, [0, 0.15, 0.5, 1], [0, 0.8, 0.4, 0]);
    return { x: trailX, y: trailY, opacity: shootOpacity, length: 40 + i * 10 };
  });

  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none" }}>
      {stars.map((star, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            left: `${star.x}%`,
            top: `${star.y}%`,
            width: star.size,
            height: star.size,
            borderRadius: "50%",
            backgroundColor: color,
            opacity: star.opacity,
            boxShadow: star.size > 2.5 ? `0 0 ${star.size * 2}px ${color}44` : undefined,
          }}
        />
      ))}
      {/* Shooting stars with endpoint sparkle */}
      {shootingStars.map((ss, i) =>
        ss ? (
          <div key={`shoot-${i}`}>
            <div
              style={{
                position: "absolute",
                left: `${ss.x}%`,
                top: `${ss.y}%`,
                width: ss.length,
                height: 1.5,
                background: `linear-gradient(90deg, transparent, ${color}88, ${color})`,
                opacity: ss.opacity,
                transform: "rotate(35deg)",
                borderRadius: 1,
                boxShadow: `0 0 6px ${color}44`,
              }}
            />
            {/* Sparkle burst at head of shooting star */}
            <div
              style={{
                position: "absolute",
                left: `${ss.x + 1.2}%`,
                top: `${ss.y + 0.7}%`,
                width: 4,
                height: 4,
                borderRadius: "50%",
                background: color,
                opacity: ss.opacity * 1.2,
                boxShadow: `0 0 8px ${color}, 0 0 16px ${color}66`,
              }}
            />
          </div>
        ) : null,
      )}
    </div>
  );
};
