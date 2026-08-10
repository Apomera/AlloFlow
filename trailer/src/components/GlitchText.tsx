import { useCurrentFrame, interpolate } from "remotion";

interface GlitchTextProps {
  text: string;
  startFrame?: number;
  duration?: number;
  fontSize?: number;
  color?: string;
  style?: React.CSSProperties;
}

const seededRandom = (seed: number) => {
  const x = Math.sin(seed * 9301 + 49297) * 49297;
  return x - Math.floor(x);
};

export const GlitchText: React.FC<GlitchTextProps> = ({
  text,
  startFrame = 0,
  duration = 15,
  fontSize = 48,
  color = "#ffffff",
  style,
}) => {
  const frame = useCurrentFrame();
  const f = frame - startFrame;

  // Only glitch during the duration window
  const isGlitching = f >= 0 && f < duration;
  const glitchIntensity = isGlitching
    ? interpolate(f, [0, duration * 0.3, duration * 0.7, duration], [0, 1, 1, 0], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      })
    : 0;

  // Stable after glitch
  const stableOpacity = f >= duration
    ? interpolate(f, [duration, duration + 5], [0.8, 1], { extrapolateRight: "clamp" })
    : 0;

  if (f < 0) return null;

  const seed = Math.floor(f * 3);
  const offsetX1 = isGlitching ? (seededRandom(seed) - 0.5) * 8 * glitchIntensity : 0;
  const offsetX2 = isGlitching ? (seededRandom(seed + 1) - 0.5) * 8 * glitchIntensity : 0;
  const skew = isGlitching ? (seededRandom(seed + 2) - 0.5) * 3 * glitchIntensity : 0;

  // Random clip for scan-line slice effect
  const clipTop = isGlitching ? seededRandom(seed + 3) * 60 : 0;
  const clipHeight = isGlitching ? 10 + seededRandom(seed + 4) * 30 : 100;

  return (
    <div style={{ position: "relative", display: "inline-block", ...style }}>
      {/* Cyan offset layer */}
      {isGlitching && glitchIntensity > 0.2 && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            fontSize,
            fontWeight: 800,
            fontFamily: "system-ui, sans-serif",
            color: "#06b6d4",
            transform: `translateX(${offsetX1}px) skewX(${skew}deg)`,
            opacity: glitchIntensity * 0.6,
            mixBlendMode: "screen",
            clipPath: `inset(${clipTop}% 0 ${100 - clipTop - clipHeight}% 0)`,
          }}
        >
          {text}
        </div>
      )}

      {/* Red offset layer */}
      {isGlitching && glitchIntensity > 0.2 && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            fontSize,
            fontWeight: 800,
            fontFamily: "system-ui, sans-serif",
            color: "#f87171",
            transform: `translateX(${offsetX2}px) skewX(${-skew}deg)`,
            opacity: glitchIntensity * 0.5,
            mixBlendMode: "screen",
            clipPath: `inset(${100 - clipTop - clipHeight}% 0 ${clipTop}% 0)`,
          }}
        >
          {text}
        </div>
      )}

      {/* Horizontal static noise band during glitch */}
      {isGlitching && glitchIntensity > 0.3 && (
        <div
          style={{
            position: "absolute",
            left: -10,
            right: -10,
            top: `${clipTop + seededRandom(seed + 8) * 20}%`,
            height: 2 + seededRandom(seed + 9) * 4,
            background: `linear-gradient(90deg, transparent 5%, ${color}44 ${seededRandom(seed + 10) * 30 + 10}%, ${color}88 ${seededRandom(seed + 11) * 20 + 40}%, ${color}44 ${seededRandom(seed + 12) * 30 + 60}%, transparent 95%)`,
            opacity: glitchIntensity * 0.7,
            mixBlendMode: "screen",
          }}
        />
      )}

      {/* Scan-line flash */}
      {isGlitching && glitchIntensity > 0.5 && (
        <div
          style={{
            position: "absolute",
            left: -10,
            right: -10,
            top: `${(f * 12) % 120 - 10}%`,
            height: 1,
            background: `rgba(255,255,255,${glitchIntensity * 0.3})`,
          }}
        />
      )}

      {/* Main text */}
      <div
        style={{
          fontSize,
          fontWeight: 800,
          fontFamily: "system-ui, sans-serif",
          color,
          opacity: isGlitching ? 0.3 + glitchIntensity * 0.7 : stableOpacity,
          transform: isGlitching ? `skewX(${skew * 0.3}deg)` : undefined,
        }}
      >
        {text}
      </div>
    </div>
  );
};
