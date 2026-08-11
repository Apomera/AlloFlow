import { useCurrentFrame, interpolate } from "remotion";

interface EnergyOrbProps {
  x?: string;
  y?: string;
  size?: number;
  color?: string;
  secondaryColor?: string;
  enterDelay?: number;
}

export const EnergyOrb: React.FC<EnergyOrbProps> = ({
  x = "50%",
  y = "50%",
  size = 300,
  color = "#60a5fa",
  secondaryColor = "#8b5cf6",
  enterDelay = 0,
}) => {
  const frame = useCurrentFrame();
  const f = frame - enterDelay;
  if (f < 0) return null;

  const enterScale = interpolate(f, [0, 30], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Breathing pulse
  const breathe = Math.sin(f * 0.06) * 0.12 + 1;
  const breathe2 = Math.sin(f * 0.04 + 1) * 0.08 + 1;

  // Rotation
  const rotation = f * 0.3;

  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        transform: `translate(-50%, -50%) scale(${enterScale})`,
        pointerEvents: "none",
      }}
    >
      {/* Outer glow */}
      <div
        style={{
          width: size * 1.8 * breathe,
          height: size * 1.8 * breathe,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${color}12 0%, ${secondaryColor}06 40%, transparent 70%)`,
          position: "absolute",
          left: "50%",
          top: "50%",
          transform: "translate(-50%, -50%)",
        }}
      />

      {/* Rotating ring 1 */}
      <div
        style={{
          width: size * breathe,
          height: size * breathe,
          borderRadius: "50%",
          border: `1px solid ${color}33`,
          position: "absolute",
          left: "50%",
          top: "50%",
          transform: `translate(-50%, -50%) rotate(${rotation}deg)`,
        }}
      >
        {/* Orbiting dot */}
        <div
          style={{
            position: "absolute",
            width: 6,
            height: 6,
            borderRadius: "50%",
            background: color,
            top: -3,
            left: "50%",
            transform: "translateX(-50%)",
            boxShadow: `0 0 10px ${color}`,
          }}
        />
      </div>

      {/* Rotating ring 2 (counter) */}
      <div
        style={{
          width: size * 0.7 * breathe2,
          height: size * 0.7 * breathe2,
          borderRadius: "50%",
          border: `1px solid ${secondaryColor}22`,
          position: "absolute",
          left: "50%",
          top: "50%",
          transform: `translate(-50%, -50%) rotate(${-rotation * 1.3}deg)`,
        }}
      >
        <div
          style={{
            position: "absolute",
            width: 4,
            height: 4,
            borderRadius: "50%",
            background: secondaryColor,
            top: -2,
            left: "50%",
            transform: "translateX(-50%)",
            boxShadow: `0 0 8px ${secondaryColor}`,
          }}
        />
      </div>

      {/* Core glow */}
      <div
        style={{
          width: size * 0.3 * breathe,
          height: size * 0.3 * breathe,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${color}44 0%, ${color}11 60%, transparent 100%)`,
          position: "absolute",
          left: "50%",
          top: "50%",
          transform: "translate(-50%, -50%)",
          boxShadow: `0 0 ${30 * breathe}px ${color}22`,
        }}
      />

      {/* Electric arcs between rings */}
      {Array.from({ length: 3 }, (_, ai) => {
        const arcAngle = f * 0.08 + (ai / 3) * Math.PI * 2;
        const innerR = size * 0.35 * breathe2;
        const outerR = size * 0.5 * breathe;
        const x1 = Math.cos(arcAngle) * innerR;
        const y1 = Math.sin(arcAngle) * innerR;
        const x2 = Math.cos(arcAngle + 0.3) * outerR;
        const y2 = Math.sin(arcAngle + 0.3) * outerR;
        // Smooth flicker — sine wave that occasionally peaks instead of hard on/off
        const arcFlicker = Math.max(0, Math.pow(Math.max(0, Math.sin(f * 0.5 + ai * 4)), 3) * 0.3);
        return (
          <svg
            key={`arc-${ai}`}
            width={size * 2}
            height={size * 2}
            viewBox={`${-size} ${-size} ${size * 2} ${size * 2}`}
            style={{
              position: "absolute",
              left: "50%",
              top: "50%",
              transform: "translate(-50%, -50%)",
              pointerEvents: "none",
            }}
          >
            <line
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke={ai % 2 === 0 ? color : secondaryColor}
              strokeWidth="1"
              opacity={arcFlicker}
              strokeLinecap="round"
            />
          </svg>
        );
      })}

      {/* Particle corona — tiny dots swirling around the core */}
      {Array.from({ length: 5 }, (_, i) => {
        const coronaAngle = f * 0.04 * (i % 2 === 0 ? 1 : -1) + (i / 5) * Math.PI * 2;
        const coronaR = size * 0.18 + Math.sin(f * 0.06 + i * 2) * size * 0.04;
        const cx = Math.cos(coronaAngle) * coronaR;
        const cy = Math.sin(coronaAngle) * coronaR;
        const cOp = 0.3 + Math.sin(f * 0.1 + i * 1.5) * 0.2;
        return (
          <div
            key={`corona-${i}`}
            style={{
              position: "absolute",
              left: "50%",
              top: "50%",
              width: 3,
              height: 3,
              borderRadius: "50%",
              background: i % 2 === 0 ? color : secondaryColor,
              opacity: cOp,
              transform: `translate(calc(-50% + ${cx}px), calc(-50% + ${cy}px))`,
              boxShadow: `0 0 6px ${i % 2 === 0 ? color : secondaryColor}55`,
            }}
          />
        );
      })}
    </div>
  );
};
