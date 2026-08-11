import { useCurrentFrame } from "remotion";

interface WaveformVisualizerProps {
  barCount?: number;
  color?: string;
  height?: number;
  position?: "bottom" | "center";
  opacity?: number;
}

const seededRandom = (seed: number) => {
  const x = Math.sin(seed * 9301 + 49297) * 49297;
  return x - Math.floor(x);
};

export const WaveformVisualizer: React.FC<WaveformVisualizerProps> = ({
  barCount = 64,
  color = "#60a5fa",
  height = 60,
  position = "bottom",
  opacity = 0.15,
}) => {
  const frame = useCurrentFrame();

  const bars = Array.from({ length: barCount }, (_, i) => {
    // Multiple sine waves at different frequencies for organic waveform
    const freq1 = Math.sin((frame * 0.08 + i * 0.3) * 1.0) * 0.4;
    const freq2 = Math.sin((frame * 0.12 + i * 0.15) * 1.5) * 0.3;
    const freq3 = Math.sin((frame * 0.05 + i * 0.5) * 0.7) * 0.2;
    const noise = seededRandom(i * 7 + Math.floor(frame * 0.3)) * 0.1;

    const barHeight = Math.abs(freq1 + freq2 + freq3 + noise);
    return Math.max(0.05, Math.min(1, barHeight));
  });

  const barWidth = 1920 / barCount;

  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        bottom: position === "bottom" ? 50 : undefined,
        top: position === "center" ? "50%" : undefined,
        transform: position === "center" ? "translateY(-50%)" : undefined,
        height,
        display: "flex",
        alignItems: position === "center" ? "center" : "flex-end",
        gap: 1,
        opacity,
        pointerEvents: "none",
      }}
    >
      {bars.map((h, i) => {
        const barH = h * height;
        const isPeak = h > 0.7;
        return (
          <div
            key={i}
            style={{
              width: barWidth - 1,
              flexShrink: 0,
              position: "relative",
            }}
          >
            {/* Main bar with frequency-reactive hue shift */}
            <div
              style={{
                width: "100%",
                height: barH,
                background: isPeak
                  ? `linear-gradient(180deg, #fbbf24, ${color}, ${color}44)`
                  : `linear-gradient(180deg, ${color}, ${color}44)`,
                borderRadius: 1,
                boxShadow: isPeak ? `0 0 6px ${color}66, 0 -2px 4px #fbbf2444` : undefined,
                position: "absolute",
                bottom: 0,
              }}
            />
            {/* Peak glow dot */}
            {isPeak && (
              <div
                style={{
                  position: "absolute",
                  bottom: barH - 1,
                  left: "50%",
                  width: 3,
                  height: 3,
                  borderRadius: "50%",
                  background: "white",
                  transform: "translateX(-50%)",
                  boxShadow: `0 0 4px ${color}`,
                  opacity: 0.8,
                }}
              />
            )}
            {/* Reflection (faint mirror below) */}
            <div
              style={{
                width: "100%",
                height: barH * 0.25,
                background: `linear-gradient(0deg, transparent, ${color}15)`,
                borderRadius: 1,
                position: "absolute",
                bottom: -barH * 0.25 - 2,
                opacity: 0.4,
              }}
            />
          </div>
        );
      })}
    </div>
  );
};
