import { useCurrentFrame, interpolate } from "remotion";

export const Watermark: React.FC = () => {
  const frame = useCurrentFrame();

  // Fade in after the BotIntro scene
  const opacity = interpolate(frame, [120, 150], [0, 0.5], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Subtle pulse
  const pulse = Math.sin(frame * 0.03) * 0.05 + 1;

  // Ambient breathing glow behind logo
  const glowBreath = Math.sin(frame * 0.04) * 0.15 + 0.25;

  return (
    <div
      style={{
        position: "absolute",
        top: 32,
        left: 40,
        zIndex: 50,
        opacity,
        transform: `scale(${pulse})`,
        display: "flex",
        alignItems: "center",
        gap: 10,
      }}
    >
      {/* Ambient glow */}
      <div
        style={{
          position: "absolute",
          left: 14,
          top: 14,
          width: 40,
          height: 40,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(139,92,246,0.3), transparent 70%)",
          opacity: glowBreath * opacity,
          filter: "blur(8px)",
          pointerEvents: "none",
        }}
      />
      {/* Mini AlloBot icon — subtle scale breath */}
      <svg width="28" height="28" viewBox="0 0 100 100" fill="none" style={{ transform: `scale(${1 + Math.sin(frame * 0.05) * 0.03})` }}>
        <circle cx="50" cy="55" r="35" fill="#8b5cf6" />
        <rect x="20" y="30" width="60" height="36" rx="14" fill="#0F172A" />
        <ellipse cx="38" cy="48" rx="4.5" ry="6" fill="#10B981" />
        <ellipse cx="62" cy="48" rx="4.5" ry="6" fill="#10B981" />
        <path d="M 42 58 Q 50 62 58 58" stroke="#34D399" strokeWidth="2" strokeLinecap="round" fill="none" />
        <path d="M50 15V5" stroke="#818CF8" strokeWidth="4" strokeLinecap="round" />
        <circle cx="50" cy="5" r="5" fill="#FACC15" />
      </svg>
      <span
        style={{
          fontSize: 20,
          fontFamily: "system-ui, sans-serif",
          fontWeight: 600,
          letterSpacing: "-0.01em",
        }}
      >
        <span style={{
          color: "#60a5fa",
          textShadow: `0 0 ${4 + Math.sin(frame * 0.04) * 2}px rgba(96,165,250,0.3)`,
        }}>Allo</span>
        <span style={{
          color: "#34d399",
          textShadow: `0 0 ${4 + Math.sin(frame * 0.04 + Math.PI) * 2}px rgba(52,211,153,0.3)`,
        }}>Flow</span>
      </span>
      <span
        style={{
          fontSize: 9,
          fontFamily: "monospace",
          color: "#475569",
          letterSpacing: "0.1em",
          fontWeight: 600,
          marginLeft: 2,
          padding: "2px 5px",
          borderRadius: 3,
          border: "1px solid rgba(100,116,139,0.2)",
          display: "flex",
          alignItems: "center",
          gap: 3,
        }}
      >
        <span style={{
          width: 3,
          height: 3,
          borderRadius: "50%",
          background: "#34d399",
          opacity: 0.4 + Math.sin(frame * 0.18) * 0.5,
          boxShadow: `0 0 ${2 + Math.sin(frame * 0.18) * 2}px #34d399`,
        }} />
        v1.0
      </span>

      {/* Trailing micro-particles behind watermark — subtle motion trail */}
      {[0, 1, 2].map((i) => {
        const particleOp = (Math.sin(frame * 0.05 + i * 1.5) * 0.3 + 0.4) * opacity;
        return (
          <div
            key={`wm-trail-${i}`}
            style={{
              position: "absolute",
              left: 28 + i * 4,
              top: 14 + Math.sin(frame * 0.06 + i) * 2,
              width: 2,
              height: 2,
              borderRadius: "50%",
              background: "#60a5fa",
              opacity: particleOp,
              boxShadow: "0 0 3px #60a5fa66",
              pointerEvents: "none",
            }}
          />
        );
      })}

      {/* Ambient sparkles */}
      {[0, 1, 2, 3].map((i) => {
        const angle = (frame * 0.02 + (i * Math.PI) / 2) % (Math.PI * 2);
        const r = 38 + Math.sin(frame * 0.04 + i * 3) * 8;
        const sparkleOp = Math.sin(frame * 0.08 + i * 1.5) * 0.3 + 0.3;
        const colors = ["#60a5fa", "#34d399", "#a78bfa", "#fbbf24"];
        return (
          <div
            key={`wm-sparkle-${i}`}
            style={{
              position: "absolute",
              left: 14 + Math.cos(angle) * r,
              top: 14 + Math.sin(angle) * r,
              width: 2,
              height: 2,
              borderRadius: "50%",
              background: colors[i],
              opacity: sparkleOp * opacity,
              boxShadow: `0 0 4px ${colors[i]}66`,
              pointerEvents: "none",
            }}
          />
        );
      })}
    </div>
  );
};
