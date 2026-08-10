import React from "react";
import { useCurrentFrame, interpolate } from "remotion";

// Darkened edge vignette for film look — subtle breathing pulse
export const Vignette: React.FC = () => {
  const frame = useCurrentFrame();
  const breathe = Math.sin(frame * 0.015) * 0.03;
  const centerFade = 50 + breathe * 15;
  const midFade = 80 + breathe * 5;
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        pointerEvents: "none",
        zIndex: 60,
        background: `radial-gradient(ellipse at center, transparent ${centerFade}%, rgba(0,0,0,${0.25 - breathe * 0.1}) ${midFade}%, rgba(0,0,0,0.5) 100%)`,
      }}
    />
  );
};

// Subtle animated scanline overlay
export const Scanlines: React.FC<{ opacity?: number }> = ({ opacity = 0.03 }) => {
  const frame = useCurrentFrame();
  const offset = (frame * 0.5) % 4;

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        pointerEvents: "none",
        zIndex: 55,
        opacity,
        backgroundImage: `repeating-linear-gradient(
          0deg,
          transparent,
          transparent 2px,
          rgba(255,255,255,0.08) 2px,
          rgba(255,255,255,0.08) 4px
        )`,
        backgroundPosition: `0 ${offset}px`,
      }}
    />
  );
};

// Film grain noise using pseudo-random dots
export const FilmGrain: React.FC<{ opacity?: number }> = ({ opacity = 0.04 }) => {
  const frame = useCurrentFrame();

  // Shift the grain pattern every frame for realistic noise
  const seed = frame * 127;
  const bgX = (seed % 200) - 100;
  const bgY = ((seed * 3) % 200) - 100;

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        pointerEvents: "none",
        zIndex: 56,
        opacity,
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='1'/%3E%3C/svg%3E")`,
        backgroundPosition: `${bgX}px ${bgY}px`,
        mixBlendMode: "overlay",
      }}
    />
  );
};

// Slow-drifting aurora / nebula color blobs — adds depth and movement
export const AuroraGlow: React.FC<{
  colors?: string[];
  speed?: number;
  opacity?: number;
}> = ({
  colors = ["rgba(96,165,250,0.08)", "rgba(52,211,153,0.06)", "rgba(167,139,250,0.07)"],
  speed = 0.008,
  opacity = 1,
}) => {
  const frame = useCurrentFrame();

  const blobs = colors.map((color, i) => {
    const angle = frame * speed * (i % 2 === 0 ? 1 : -1) + (i * Math.PI * 2) / colors.length;
    const x = 50 + Math.cos(angle) * 25;
    const y = 50 + Math.sin(angle * 0.7 + i) * 20;
    const scale = 1 + Math.sin(frame * speed * 1.5 + i * 2) * 0.3;

    return { x, y, color, scale };
  });

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        pointerEvents: "none",
        overflow: "hidden",
        opacity,
      }}
    >
      {blobs.map((blob, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            left: `${blob.x}%`,
            top: `${blob.y}%`,
            width: 600,
            height: 600,
            borderRadius: "50%",
            background: `radial-gradient(circle, ${blob.color}, transparent 70%)`,
            transform: `translate(-50%, -50%) scale(${blob.scale})`,
            filter: "blur(40px)",
          }}
        />
      ))}
    </div>
  );
};

// Cinematic lens flare — bright anamorphic streak + halo
export const LensFlare: React.FC<{
  x?: string;
  y?: string;
  color?: string;
  enterDelay?: number;
  duration?: number;
}> = ({ x = "50%", y = "50%", color = "#60a5fa", enterDelay = 0, duration = 50 }) => {
  const frame = useCurrentFrame();
  const f = frame - enterDelay;
  if (f < 0 || f > duration) return null;

  const progress = f / duration;
  const intensity = interpolate(progress, [0, 0.15, 0.4, 1], [0, 1, 0.4, 0]);

  // Main halo
  const haloSize = 100 + progress * 200;
  // Anamorphic streak (horizontal line)
  const streakWidth = interpolate(progress, [0, 0.2, 1], [0, 800, 400]);
  // Secondary ghost hexagons
  const ghosts = [
    { offset: 80, size: 20, opacity: 0.3 },
    { offset: 160, size: 35, opacity: 0.2 },
    { offset: -120, size: 15, opacity: 0.25 },
  ];

  return (
    <div style={{ position: "absolute", left: x, top: y, transform: "translate(-50%, -50%)", pointerEvents: "none", zIndex: 8 }}>
      {/* Main halo */}
      <div
        style={{
          position: "absolute",
          width: haloSize,
          height: haloSize,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${color}44, ${color}11, transparent 70%)`,
          transform: "translate(-50%, -50%)",
          opacity: intensity * 0.6,
        }}
      />
      {/* Anamorphic horizontal streak */}
      <div
        style={{
          position: "absolute",
          width: streakWidth,
          height: 3,
          background: `linear-gradient(90deg, transparent, ${color}88, white, ${color}88, transparent)`,
          transform: "translate(-50%, -50%)",
          opacity: intensity * 0.7,
          filter: "blur(1px)",
        }}
      />
      {/* Vertical micro-streak */}
      <div
        style={{
          position: "absolute",
          width: 2,
          height: streakWidth * 0.3,
          background: `linear-gradient(180deg, transparent, ${color}44, transparent)`,
          transform: "translate(-50%, -50%)",
          opacity: intensity * 0.3,
        }}
      />
      {/* Ghost hexagons */}
      {ghosts.map((ghost, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            left: ghost.offset * (1 - progress * 0.3),
            width: ghost.size,
            height: ghost.size,
            borderRadius: "50%",
            border: `1px solid ${color}`,
            transform: "translate(-50%, -50%)",
            opacity: intensity * ghost.opacity,
          }}
        />
      ))}
      {/* Central bright core */}
      <div
        style={{
          position: "absolute",
          width: 8,
          height: 8,
          borderRadius: "50%",
          background: "white",
          transform: "translate(-50%, -50%)",
          opacity: intensity,
          boxShadow: `0 0 20px white, 0 0 40px ${color}`,
        }}
      />
    </div>
  );
};

// DNA / double-helix decorative element — rotating dots in sine wave pairs
export const DNAHelix: React.FC<{
  color1?: string;
  color2?: string;
  width?: number;
  height?: number;
  dotCount?: number;
  speed?: number;
  opacity?: number;
  enterDelay?: number;
}> = ({
  color1 = "#60a5fa",
  color2 = "#34d399",
  width = 400,
  height = 200,
  dotCount = 20,
  speed = 0.06,
  opacity: maxOpacity = 0.3,
  enterDelay = 0,
}) => {
  const frame = useCurrentFrame();
  const f = frame - enterDelay;
  if (f < 0) return null;

  const fadeIn = interpolate(f, [0, 20], [0, maxOpacity], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const dots = Array.from({ length: dotCount }, (_, i) => {
    const t = (i / dotCount) * Math.PI * 2;
    const phase = f * speed;
    const x = (i / dotCount) * width;

    // Strand 1
    const y1 = Math.sin(t + phase) * (height / 2);
    const z1 = Math.cos(t + phase);
    // Strand 2 (opposite phase)
    const y2 = Math.sin(t + phase + Math.PI) * (height / 2);
    const z2 = Math.cos(t + phase + Math.PI);

    return { x, y1, y2, z1, z2 };
  });

  return (
    <div style={{ position: "relative", width, height, opacity: fadeIn }}>
      {/* Pulsing endpoint nodes — left and right */}
      {[{ x: 0, c: color1 }, { x: width - 4, c: color2 }].map((ep, ei) => {
        const pulse = Math.sin(f * 0.15 + ei * Math.PI) * 0.3 + 0.7;
        return (
          <div
            key={`ep-${ei}`}
            style={{
              position: "absolute",
              left: ep.x - 4,
              top: height / 2 - 4,
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: ep.c,
              opacity: pulse,
              boxShadow: `0 0 ${8 + pulse * 6}px ${ep.c}, 0 0 ${16 + pulse * 10}px ${ep.c}44`,
              zIndex: 2,
            }}
          />
        );
      })}
      {dots.map((d, i) => (
        <React.Fragment key={i}>
          {/* Connector line between strands */}
          {i % 3 === 0 && (
            <div
              style={{
                position: "absolute",
                left: d.x,
                top: height / 2 + Math.min(d.y1, d.y2),
                width: 1,
                height: Math.abs(d.y1 - d.y2),
                background: `linear-gradient(180deg, ${color1}44, ${color2}44)`,
              }}
            />
          )}
          {/* Strand 1 dot */}
          <div
            style={{
              position: "absolute",
              left: d.x - 2,
              top: height / 2 + d.y1 - 2,
              width: 4 + d.z1,
              height: 4 + d.z1,
              borderRadius: "50%",
              background: color1,
              opacity: 0.5 + d.z1 * 0.3,
              boxShadow: d.z1 > 0.3 ? `0 0 4px ${color1}88` : "none",
            }}
          />
          {/* Strand 2 dot */}
          <div
            style={{
              position: "absolute",
              left: d.x - 2,
              top: height / 2 + d.y2 - 2,
              width: 4 + d.z2,
              height: 4 + d.z2,
              borderRadius: "50%",
              background: color2,
              opacity: 0.5 + d.z2 * 0.3,
              boxShadow: d.z2 > 0.3 ? `0 0 4px ${color2}88` : "none",
            }}
          />
        </React.Fragment>
      ))}
    </div>
  );
};

// Letterbox bars for ultra-cinematic feel
export const Letterbox: React.FC<{ height?: number }> = ({ height = 50 }) => {
  const frame = useCurrentFrame();

  // Slide in during first few frames
  const progress = interpolate(frame, [0, 30], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const barHeight = height * progress;

  return (
    <>
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: barHeight,
          background: "#000000",
          zIndex: 70,
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          height: barHeight,
          background: "#000000",
          zIndex: 70,
        }}
      />
    </>
  );
};
