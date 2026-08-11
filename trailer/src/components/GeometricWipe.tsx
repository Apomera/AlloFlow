import { AbsoluteFill, useCurrentFrame, interpolate } from "remotion";

interface GeometricWipeProps {
  direction?: "left" | "right" | "center";
  color?: string;
  durationInFrames?: number;
}

export const GeometricWipe: React.FC<GeometricWipeProps> = ({
  direction = "center",
  color = "#60a5fa",
  durationInFrames = 20,
}) => {
  const frame = useCurrentFrame();

  const progress = interpolate(frame, [0, durationInFrames / 2, durationInFrames], [0, 1, 0], {
    extrapolateRight: "clamp",
  });

  if (progress <= 0) return null;

  const barCount = 8;
  const half = durationInFrames / 2;
  const bars = Array.from({ length: barCount }, (_, i) => {
    const delay = i * 1.2;
    // Each bar fades in, then fades out, staggered by delay
    const fadeIn = interpolate(frame, [delay, delay + half * 0.6], [0, 1], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    });
    const fadeOut = interpolate(frame, [half + delay * 0.5, durationInFrames], [1, 0], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    });
    return Math.min(fadeIn, fadeOut);
  });

  // Central flash at peak
  const flashOp = interpolate(frame, [half - 2, half, half + 4], [0, 0.2, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ pointerEvents: "none", zIndex: 100 }}>
      {/* Central flash at wipe peak */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `radial-gradient(ellipse at center, ${color}44, transparent 60%)`,
          opacity: flashOp,
        }}
      />
      {bars.map((barProgress, i) => {
        const barHeight = 1080 / barCount;
        const isEven = i % 2 === 0;
        const xOffset = direction === "center"
          ? 0
          : direction === "left"
            ? -1920 * (1 - barProgress)
            : 1920 * (1 - barProgress);

        // Spark particles at leading edge
        const sparkCount = 3;
        const barWidthPx = direction === "center" ? barProgress * 1920 : 1920;
        const edgeRight = direction === "center" ? barWidthPx / 2 + 960 * (1 - barProgress) : barWidthPx + xOffset;

        return (
          <div key={i}>
            <div
              style={{
                position: "absolute",
                top: i * barHeight,
                left: direction === "center" ? `${(1 - barProgress) * 50}%` : xOffset,
                width: direction === "center" ? `${barProgress * 100}%` : "100%",
                height: barHeight + 1,
                background: `linear-gradient(${isEven ? 90 : 270}deg, ${color}cc, ${color}44)`,
                opacity: barProgress * 0.8,
              }}
            />
            {/* Edge sparks */}
            {barProgress > 0.05 && barProgress < 0.9 && Array.from({ length: sparkCount }, (_, si) => {
              const sparkY = i * barHeight + (si / sparkCount) * barHeight;
              const sparkOp = barProgress * 0.6 * (0.5 + Math.sin(frame * 3 + si * 4 + i * 2) * 0.5);
              return (
                <div
                  key={`spark-${i}-${si}`}
                  style={{
                    position: "absolute",
                    left: edgeRight - 2,
                    top: sparkY,
                    width: 3,
                    height: 3,
                    borderRadius: "50%",
                    background: "white",
                    opacity: sparkOp,
                    boxShadow: `0 0 6px ${color}`,
                    zIndex: 101,
                  }}
                />
              );
            })}
          </div>
        );
      })}
    </AbsoluteFill>
  );
};
