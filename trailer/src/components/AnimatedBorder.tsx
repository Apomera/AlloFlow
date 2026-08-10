import { useCurrentFrame, interpolate } from "remotion";

export const AnimatedBorder: React.FC = () => {
  const frame = useCurrentFrame();

  // Fade in after intro
  const opacity = interpolate(frame, [120, 160], [0, 0.4], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Fade out at end
  const fadeOut = interpolate(frame, [2880, 2930], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Animated gradient position
  const gradientPos = (frame * 2) % 400;

  // Corner accent size
  const cornerSize = 30;

  return (
    <div
      style={{
        position: "absolute",
        inset: 48, // Inside letterbox
        pointerEvents: "none",
        zIndex: 65,
        opacity: opacity * fadeOut,
        filter: `hue-rotate(${Math.sin(frame * 0.004) * 12}deg)`,
      }}
    >
      {/* Top line */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: cornerSize,
          right: cornerSize,
          height: 1,
          background: `linear-gradient(90deg, transparent, rgba(96,165,250,0.3) ${gradientPos}px, rgba(52,211,153,0.3) ${gradientPos + 100}px, transparent)`,
        }}
      />
      {/* Bottom line */}
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: cornerSize,
          right: cornerSize,
          height: 1,
          background: `linear-gradient(270deg, transparent, rgba(96,165,250,0.3) ${gradientPos}px, rgba(52,211,153,0.3) ${gradientPos + 100}px, transparent)`,
        }}
      />
      {/* Left line */}
      <div
        style={{
          position: "absolute",
          left: 0,
          top: cornerSize,
          bottom: cornerSize,
          width: 1,
          background: "linear-gradient(180deg, transparent, rgba(96,165,250,0.2), transparent)",
        }}
      />
      {/* Right line */}
      <div
        style={{
          position: "absolute",
          right: 0,
          top: cornerSize,
          bottom: cornerSize,
          width: 1,
          background: "linear-gradient(180deg, transparent, rgba(52,211,153,0.2), transparent)",
        }}
      />

      {/* Corner accents with pulse */}
      {[
        { top: 0, left: 0, borderTop: "2px solid rgba(96,165,250,0.5)", borderLeft: "2px solid rgba(96,165,250,0.5)" },
        { top: 0, right: 0, borderTop: "2px solid rgba(52,211,153,0.5)", borderRight: "2px solid rgba(52,211,153,0.5)" },
        { bottom: 0, left: 0, borderBottom: "2px solid rgba(52,211,153,0.5)", borderLeft: "2px solid rgba(52,211,153,0.5)" },
        { bottom: 0, right: 0, borderBottom: "2px solid rgba(96,165,250,0.5)", borderRight: "2px solid rgba(96,165,250,0.5)" },
      ].map((style, i) => {
        const cornerPulse = Math.sin(frame * 0.06 + i * 1.5) * 0.3 + 0.7;
        const cornerColor = i % 2 === 0 ? "rgba(96,165,250," : "rgba(52,211,153,";
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              width: cornerSize,
              height: cornerSize,
              ...style,
            }}
          >
            {/* Corner glow dot */}
            <div
              style={{
                position: "absolute",
                width: 4,
                height: 4,
                borderRadius: "50%",
                background: cornerColor + "0.8)",
                boxShadow: `0 0 8px ${cornerColor}0.6)`,
                opacity: cornerPulse,
                ...(i === 0 ? { top: -2, left: -2 } : i === 1 ? { top: -2, right: -2 } : i === 2 ? { bottom: -2, left: -2 } : { bottom: -2, right: -2 }),
              }}
            />
          </div>
        );
      })}

      {/* Traveling energy dots — clockwise (blue) + counter-clockwise (green) with trails */}
      {[
        { speed: 3, color: "rgba(96,165,250,0.8)", shadow: "0 0 12px rgba(96,165,250,0.5), 0 0 4px rgba(52,211,153,0.4)", size: 6, dir: 1, trailColor: "rgba(96,165,250,0.3)" },
        { speed: 2, color: "rgba(52,211,153,0.7)", shadow: "0 0 10px rgba(52,211,153,0.5), 0 0 4px rgba(96,165,250,0.3)", size: 5, dir: -1, trailColor: "rgba(52,211,153,0.3)" },
      ].flatMap((dot, di) => {
        const perimeter = 2 * (1920 - 96 - cornerSize * 2) + 2 * (1080 - 96 - cornerSize * 2);
        const topLen = 1920 - 96 - cornerSize * 2;
        const rightLen = 1080 - 96 - cornerSize * 2;
        const bottomLen = topLen;

        const computePos = (offset: number) => {
          const rawPos = (frame * dot.speed * dot.dir - offset * dot.dir) % perimeter;
          const dotPos = rawPos < 0 ? rawPos + perimeter : rawPos;
          let dx = 0, dy = 0;
          if (dotPos < topLen) {
            dx = cornerSize + dotPos; dy = 0;
          } else if (dotPos < topLen + rightLen) {
            dx = topLen + cornerSize; dy = cornerSize + (dotPos - topLen);
          } else if (dotPos < topLen + rightLen + bottomLen) {
            dx = topLen + cornerSize - (dotPos - topLen - rightLen); dy = rightLen + cornerSize;
          } else {
            dx = 0; dy = rightLen + cornerSize - (dotPos - topLen - rightLen - bottomLen);
          }
          return { dx, dy };
        };

        return [
          // Trail dot (faint, behind)
          (() => {
            const { dx, dy } = computePos(8);
            const tSize = dot.size * 0.7;
            return (
              <div
                key={`energy-trail-${di}`}
                style={{
                  position: "absolute",
                  left: dx - tSize / 2,
                  top: dy - tSize / 2,
                  width: tSize,
                  height: tSize,
                  borderRadius: "50%",
                  background: dot.trailColor,
                  pointerEvents: "none",
                  filter: "blur(1px)",
                }}
              />
            );
          })(),
          // Main dot
          (() => {
            const { dx, dy } = computePos(0);
            return (
              <div
                key={`energy-dot-${di}`}
                style={{
                  position: "absolute",
                  left: dx - dot.size / 2,
                  top: dy - dot.size / 2,
                  width: dot.size,
                  height: dot.size,
                  borderRadius: "50%",
                  background: dot.color,
                  boxShadow: dot.shadow,
                  pointerEvents: "none",
                }}
              />
            );
          })(),
        ];
      })}
    </div>
  );
};
