import { useCurrentFrame, interpolate, spring, useVideoConfig } from "remotion";

interface OrbitRingProps {
  icons: string[];
  radius?: number;
  speed?: number;
  enterDelay?: number;
  color?: string;
}

export const OrbitRing: React.FC<OrbitRingProps> = ({
  icons,
  radius = 180,
  speed = 0.8,
  enterDelay = 0,
  color = "#60a5fa",
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const f = frame - enterDelay;

  const enterScale = f < 0
    ? 0
    : spring({ frame: f, fps, config: { damping: 14, stiffness: 60 } });

  const ringOpacity = interpolate(f, [0, 20], [0, 0.8], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const rotation = f > 0 ? f * speed : 0;

  return (
    <div
      style={{
        position: "absolute",
        width: radius * 2,
        height: radius * 2,
        opacity: ringOpacity,
        transform: `scale(${enterScale})`,
      }}
    >
      {/* Ring track */}
      <svg
        width={radius * 2}
        height={radius * 2}
        viewBox={`0 0 ${radius * 2} ${radius * 2}`}
        style={{ position: "absolute" }}
      >
        <circle
          cx={radius}
          cy={radius}
          r={radius - 2}
          fill="none"
          stroke={`${color}22`}
          strokeWidth="1"
          strokeDasharray="6,6"
          strokeDashoffset={-frame * 0.5}
        />
      </svg>

      {/* Afterglow trails — faint copies trailing behind each icon */}
      {icons.map((_, i) => {
        const trailAngle = ((i / icons.length) * 360 + rotation - 8) * (Math.PI / 180);
        const tx = radius + Math.cos(trailAngle) * (radius - 2);
        const ty = radius + Math.sin(trailAngle) * (radius - 2);
        return (
          <div
            key={`trail-${i}`}
            style={{
              position: "absolute",
              left: tx,
              top: ty,
              width: 12,
              height: 12,
              borderRadius: "50%",
              background: color,
              opacity: 0.15,
              transform: "translate(-50%, -50%)",
              filter: "blur(4px)",
            }}
          />
        );
      })}

      {/* Fast-traveling energy pulse with trail */}
      {(() => {
        const pulseAngle = (rotation * 2.5) * (Math.PI / 180);
        const dots = [
          { offset: 0, size: 7, opacity: 0.9 },
          { offset: -0.12, size: 5, opacity: 0.5 },
          { offset: -0.24, size: 3, opacity: 0.25 },
        ];
        return dots.map((d, di) => {
          const a = pulseAngle + d.offset;
          const px = radius + Math.cos(a) * (radius - 2);
          const py = radius + Math.sin(a) * (radius - 2);
          return (
            <div
              key={`pulse-${di}`}
              style={{
                position: "absolute",
                left: px - d.size / 2,
                top: py - d.size / 2,
                width: d.size,
                height: d.size,
                borderRadius: "50%",
                background: color,
                opacity: d.opacity * ringOpacity,
                boxShadow: `0 0 ${d.size * 2}px ${color}66`,
                pointerEvents: "none",
              }}
            />
          );
        });
      })()}

      {/* Orbiting icons */}
      {icons.map((icon, i) => {
        const angle = ((i / icons.length) * 360 + rotation) * (Math.PI / 180);
        const x = radius + Math.cos(angle) * (radius - 2);
        const y = radius + Math.sin(angle) * (radius - 2);

        // Scale based on y position (pseudo-3D depth)
        const depthScale = 0.6 + (Math.sin(angle) + 1) * 0.2;
        const depthOpacity = 0.4 + (Math.sin(angle) + 1) * 0.3;
        // Subtle per-icon scale variation for organic feel
        const iconBreath = 1 + Math.sin(frame * 0.06 + i * 1.4) * 0.05;

        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: x,
              top: y,
              transform: `translate(-50%, -50%) scale(${depthScale * iconBreath})`,
              fontSize: 24,
              opacity: depthOpacity,
              filter: depthScale < 0.75 ? "blur(1px)" : undefined,
              zIndex: Math.round(depthScale * 10),
            }}
          >
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 10,
                background: `${color}15`,
                border: `1px solid ${color}33`,
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                fontSize: 20,
                boxShadow: `0 0 8px ${color}22`,
              }}
            >
              {icon}
            </div>
          </div>
        );
      })}
    </div>
  );
};
