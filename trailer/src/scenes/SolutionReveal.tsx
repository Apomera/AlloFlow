import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig } from "remotion";
import { StarField } from "../components/StarField";
import { AlloBot } from "../components/AlloBot";
import { Constellation } from "../components/Constellation";
import { HexGrid } from "../components/HexGrid";
import { FakeAppWindow } from "../components/FakeAppWindow";
import { EnergyOrb } from "../components/EnergyOrb";
import { SceneTransition } from "../components/SceneTransition";
import { PixelCelebration, PixelAlloBot } from "../components/PixelCharacters";
import { LensFlare, DNAHelix } from "../components/CinematicOverlays";

const LogoLetter: React.FC<{
  char: string;
  index: number;
  color: string;
  totalDelay: number;
}> = ({ char, index, color, totalDelay }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const delay = totalDelay + index * 4;
  const drop = spring({ frame: frame - delay, fps, config: { damping: 10, stiffness: 120, mass: 0.6 } });
  // Subtle landing wobble — small bob after letter settles (frames delay+10 to delay+30)
  const landWobble = frame > delay + 10
    ? Math.sin((frame - delay - 10) * 0.4) * Math.max(0, interpolate(frame, [delay + 10, delay + 30], [3, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }))
    : 0;
  const y = (1 - drop) * -60 + landWobble;
  const opacity = interpolate(frame, [delay, delay + 8], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const rotation = interpolate(drop, [0, 1], [15, 0]);

  // Individual letter glow on arrival
  const glowPhase = Math.max(0, frame - delay - 10);
  const glowPulse = Math.sin(glowPhase * 0.1) * 0.3 + 0.3;

  // Landing sparkle burst when letter settles
  const landF = frame - delay - 8;
  const landSparkles = Array.from({ length: 5 }, (_, si) => {
    if (landF < 0 || landF > 20) return null;
    const angle = (si / 5) * Math.PI * 2 + index * 0.4;
    const r = interpolate(landF, [0, 18], [0, 35 + (si % 3) * 10], { extrapolateRight: "clamp" });
    const sOp = interpolate(landF, [0, 3, 18], [0, 0.8, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
    return { x: Math.cos(angle) * r, y: Math.sin(angle) * r * 0.5, op: sOp };
  });

  return (
    <span
      style={{
        display: "inline-block",
        color,
        opacity,
        transform: `translateY(${y}px) rotate(${rotation}deg)`,
        textShadow: `0 0 ${20 + glowPulse * 30}px ${color}88, 0 0 ${40 + glowPulse * 40}px ${color}44`,
        position: "relative",
      }}
    >
      {char}
      {landSparkles.map((sp, si) =>
        sp ? (
          <span
            key={si}
            style={{
              position: "absolute",
              left: `calc(50% + ${sp.x}px)`,
              top: `calc(50% + ${sp.y}px)`,
              width: 3,
              height: 3,
              borderRadius: "50%",
              background: color,
              opacity: sp.op,
              boxShadow: `0 0 6px ${color}`,
              pointerEvents: "none",
            }}
          />
        ) : null,
      )}
    </span>
  );
};

export const SolutionReveal: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Tagline
  const taglineOpacity = interpolate(frame, [75, 95], [0, 1], { extrapolateRight: "clamp" });
  const taglineY = spring({ frame: frame - 75, fps, config: { damping: 20, stiffness: 80 } });

  // Subtitle
  const subtitleOpacity = interpolate(frame, [105, 125], [0, 1], { extrapolateRight: "clamp" });

  // Ring expansions — staggered
  const rings = [
    { delay: 20, color: "rgba(96,165,250,0.5)", maxScale: 4.5 },
    { delay: 28, color: "rgba(52,211,153,0.4)", maxScale: 4 },
    { delay: 36, color: "rgba(139,92,246,0.3)", maxScale: 3.5 },
    { delay: 44, color: "rgba(251,191,36,0.2)", maxScale: 3 },
  ];

  // AlloBot flies in
  const botX = interpolate(frame, [50, 90], [350, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const botOpacity = interpolate(frame, [50, 70], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // Background energy pulse
  const energyPulse = interpolate(frame, [18, 22], [0, 0.12], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const energyFade = interpolate(frame, [22, 40], [0.12, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const bgFlash = frame < 22 ? energyPulse : energyFade;

  // Logo starburst — tiny particles that radiate when letters finish landing (~frame 47)
  const logoLandFrame = 47;
  const starburstF = frame - logoLandFrame;
  const starburstParticles = Array.from({ length: 20 }, (_, i) => {
    if (starburstF < 0 || starburstF > 40) return null;
    const angle = (i / 20) * Math.PI * 2 + (i % 3) * 0.4;
    const r = interpolate(starburstF, [0, 35], [0, 100 + (i % 5) * 25], { extrapolateRight: "clamp" });
    const op = interpolate(starburstF, [0, 4, 35], [0, 0.8, 0], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    });
    const colors = ["#60a5fa", "#34d399", "#a78bfa", "#fbbf24", "#f472b6"];
    return {
      x: Math.cos(angle) * r,
      y: Math.sin(angle) * r * 0.4,
      op,
      size: 2 + (i % 3) * 2,
      color: colors[i % 5],
    };
  });

  // Orbiting particles — gentle sparkle ring around logo after reveal
  const orbitParticles = Array.from({ length: 6 }, (_, i) => {
    const orbitAngle = (frame * 0.015) + (i / 6) * Math.PI * 2;
    const orbitR = 200 + Math.sin(frame * 0.03 + i * 2) * 20;
    const orbitOp = interpolate(frame, [55, 80], [0, 0.4], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    });
    const twinkle = Math.sin(frame * 0.12 + i * 3) * 0.3 + 0.7;
    const colors = ["#60a5fa", "#34d399", "#a78bfa"];
    return {
      x: Math.cos(orbitAngle) * orbitR,
      y: Math.sin(orbitAngle) * orbitR * 0.35,
      op: orbitOp * twinkle,
      size: 3 + (i % 2) * 2,
      color: colors[i % 3],
    };
  });

  // Holographic data streams — vertical lines with binary/hex that radiate outward
  const dataStreams = Array.from({ length: 16 }, (_, i) => {
    const angle = (i / 16) * Math.PI * 2;
    const streamDelay = 40 + i * 3;
    const progress = interpolate(frame, [streamDelay, streamDelay + 80], [0, 1], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    });
    const r = progress * (200 + (i % 4) * 60);
    const streamOpacity = interpolate(progress, [0, 0.1, 0.5, 1], [0, 0.3, 0.15, 0]);
    const colors = ["#60a5fa", "#34d399", "#a78bfa", "#818cf8"];
    return {
      x: Math.cos(angle) * r,
      y: Math.sin(angle) * r,
      opacity: streamOpacity,
      color: colors[i % 4],
      length: 30 + (i % 3) * 15,
      rotation: (angle * 180) / Math.PI + 90,
    };
  });

  return (
    <SceneTransition durationInFrames={240} fadeIn={8} fadeOut={12}>
      <AbsoluteFill
        style={{
          background: `linear-gradient(${135 + Math.sin(frame * 0.012) * 7}deg, #0f172a 0%, #0c2341 50%, #0f172a 100%)`,
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <HexGrid color="#818cf8" opacity={0.03} pulseSpeed={0.05} />

        {/* Chapter marker — top-left */}
        <div
          style={{
            position: "absolute",
            top: 55,
            left: 100,
            display: "flex",
            alignItems: "baseline",
            gap: 8,
            opacity: interpolate(frame, [20, 50], [0, 0.45], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
            zIndex: 4,
          }}
        >
          <span style={{ fontSize: 20, fontFamily: "Georgia, serif", fontStyle: "italic", fontWeight: 400, color: "#818cf8", letterSpacing: "0.1em", display: "inline-block", transform: `scale(${interpolate(frame, [20, 47], [0.6, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })})` }}>IV.</span>
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <span style={{ fontSize: 9, fontFamily: "monospace", color: "#64748b", letterSpacing: "0.3em", fontWeight: 700 }}>THE SOLUTION</span>
            <span style={{ fontSize: 7, fontFamily: "monospace", color: "#475569", letterSpacing: "0.2em", fontWeight: 500 }}>04 / 09 · 8.0s</span>
          </div>
        </div>

        {/* POWERED ON status flash — bottom center after reveal */}
        {frame > 130 && frame < 215 && (
          <div
            style={{
              position: "absolute",
              bottom: 28,
              left: "50%",
              transform: "translateX(-50%)",
              fontSize: 11,
              fontFamily: "monospace",
              color: "#34d399",
              letterSpacing: "0.4em",
              fontWeight: 700,
              opacity: interpolate(frame, [130, 145, 200, 215], [0, 0.5, 0.5, 0], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
              }),
              padding: "4px 14px",
              borderRadius: 3,
              border: "1px solid rgba(52,211,153,0.3)",
              background: "rgba(52,211,153,0.05)",
              zIndex: 4,
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <span style={{
              width: 6,
              height: 6,
              borderRadius: "50%",
              background: "#34d399",
              opacity: 0.5 + Math.sin(frame * 0.2) * 0.45,
              boxShadow: `0 0 ${3 + Math.sin(frame * 0.2) * 2}px #34d399`,
            }} />
            POWERED ON
          </div>
        )}

        {/* SYSTEM READY flash at peak */}
        {frame >= 45 && frame <= 70 && (
          <div
            style={{
              position: "absolute",
              left: "50%",
              top: "15%",
              transform: "translateX(-50%)",
              fontSize: 11,
              fontFamily: "monospace",
              color: "#34d399",
              letterSpacing: "0.4em",
              fontWeight: 700,
              opacity: interpolate(frame, [45, 50, 62, 70], [0, 0.8, 0.6, 0], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
              }),
              zIndex: 5,
              display: "flex",
              alignItems: "center",
              gap: 8,
              textShadow: "0 0 8px rgba(52,211,153,0.4)",
            }}
          >
            <span style={{
              fontSize: 10,
              display: "inline-block",
              transform: `rotate(${Math.sin(frame * 0.15) * 20}deg)`,
            }}>◆</span>
            SYSTEM READY
            <span style={{
              fontSize: 10,
              display: "inline-block",
              transform: `rotate(${Math.sin(frame * 0.15 + Math.PI) * 20}deg)`,
            }}>◆</span>
          </div>
        )}

        {/* Metadata coordinate readouts — corner decorations */}
        {[
          { pos: { top: 70, left: 60 }, label: `SYS_BOOT / ${String(Math.min(100, Math.floor(frame / 2))).padStart(3, "0")}%` },
          { pos: { top: 70, right: 60 }, label: `NODE_ID / alloflow.v1` },
          { pos: { bottom: 70, left: 60 }, label: `LAT 43.6591°N  LON 70.2568°W` },
          { pos: { bottom: 70, right: 60 }, label: `REL: ${String(frame).padStart(4, "0")} / 0240` },
        ].map((meta, mi) => (
          <div
            key={`meta-${mi}`}
            style={{
              position: "absolute",
              ...meta.pos,
              fontSize: 10,
              fontFamily: "monospace",
              color: "#60a5fa",
              letterSpacing: "0.1em",
              opacity: interpolate(frame, [45, 70, 210, 230], [0, 0.35, 0.35, 0], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
              }),
              zIndex: 3,
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <span style={{
              width: 4,
              height: 4,
              borderRadius: "50%",
              background: "#60a5fa",
              opacity: 0.4 + Math.sin(frame * 0.2 + mi) * 0.5,
              boxShadow: `0 0 ${3 + Math.sin(frame * 0.2 + mi) * 2}px #60a5fa`,
            }} />
            {meta.label}
          </div>
        ))}
        <Constellation nodeCount={20} color="#818cf844" connectionDistance={160} />
        <StarField count={100} speed={0.5} color="#818cf8" />

        {/* Energy orbs */}
        <EnergyOrb x="20%" y="25%" size={220} color="#60a5fa" secondaryColor="#34d399" enterDelay={30} />
        <EnergyOrb x="82%" y="75%" size={180} color="#a78bfa" secondaryColor="#60a5fa" enterDelay={50} />

        {/* Energy flash */}
        <AbsoluteFill style={{ background: "#60a5fa", opacity: bgFlash }} />

        {/* Red remnants from Problem scene — dissolving into blue */}
        {Array.from({ length: 6 }, (_, i) => {
          const redOp = interpolate(frame, [0, 3, 28], [0, 0.2, 0], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          });
          const drift = frame * 0.5;
          const positions = [
            { x: 200, y: 250 }, { x: 1600, y: 350 }, { x: 900, y: 150 },
            { x: 400, y: 700 }, { x: 1400, y: 600 }, { x: 750, y: 850 },
          ];
          return (
            <div
              key={`red-remnant-${i}`}
              style={{
                position: "absolute",
                left: positions[i].x,
                top: positions[i].y - drift,
                width: 100 + i * 15,
                height: 100 + i * 15,
                borderRadius: "50%",
                background: `radial-gradient(circle, rgba(248,113,113,${redOp * (1 - i * 0.12)}) 0%, transparent 70%)`,
                pointerEvents: "none",
              }}
            />
          );
        })}

        {/* Expanding rings */}
        {rings.map((ring, i) => {
          const scale = interpolate(frame, [ring.delay, ring.delay + 80], [0, ring.maxScale], { extrapolateRight: "clamp" });
          const opacity = interpolate(frame, [ring.delay, ring.delay + 30, ring.delay + 80], [0.5, 0.2, 0], { extrapolateRight: "clamp" });
          return (
            <div
              key={i}
              style={{
                position: "absolute",
                width: 160,
                height: 160,
                borderRadius: "50%",
                border: `2px solid ${ring.color}`,
                transform: `scale(${scale})`,
                opacity,
              }}
            />
          );
        })}

        {/* God rays — light beams radiating from logo center */}
        {Array.from({ length: 12 }, (_, ri) => {
          const rayStart = 50 + ri * 2;
          const rayF = frame - rayStart;
          if (rayF < 0) return null;
          const angle = (ri / 12) * 360 + frame * 0.15;
          const rayOp = interpolate(rayF, [0, 15, 80, 110], [0, 0.08, 0.05, 0], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          });
          return (
            <div
              key={`ray-${ri}`}
              style={{
                position: "absolute",
                left: "50%",
                top: "42%",
                width: 4,
                height: 1200,
                background: `linear-gradient(180deg, transparent, ${ri % 2 === 0 ? "#60a5fa" : "#34d399"}, transparent)`,
                transform: `translate(-50%, -50%) rotate(${angle}deg)`,
                opacity: rayOp,
                filter: "blur(8px)",
                pointerEvents: "none",
              }}
            />
          );
        })}

        {/* Holographic data streams radiating from center */}
        {dataStreams.map((ds, i) => (
          <div
            key={`ds-${i}`}
            style={{
              position: "absolute",
              left: `calc(50% + ${ds.x}px)`,
              top: `calc(50% + ${ds.y}px)`,
              width: 2,
              height: ds.length,
              background: `linear-gradient(180deg, ${ds.color}, transparent)`,
              opacity: ds.opacity,
              transform: `rotate(${ds.rotation}deg)`,
              borderRadius: 1,
              boxShadow: `0 0 6px ${ds.color}44`,
            }}
          />
        ))}

        {/* Lens flare on logo reveal */}
        <LensFlare x="50%" y="42%" color="#60a5fa" enterDelay={18} duration={60} />

        {/* DNA helix decoration — left side */}
        <div style={{ position: "absolute", left: 40, top: "50%", transform: "translateY(-50%) rotate(90deg)", zIndex: 0 }}>
          <DNAHelix color1="#60a5fa" color2="#34d399" width={300} height={80} dotCount={16} speed={0.05} opacity={0.2} enterDelay={50} />
        </div>
        {/* DNA helix — right side */}
        <div style={{ position: "absolute", right: 40, top: "50%", transform: "translateY(-50%) rotate(90deg)", zIndex: 0 }}>
          <DNAHelix color1="#a78bfa" color2="#60a5fa" width={300} height={80} dotCount={16} speed={0.05} opacity={0.2} enterDelay={60} />
        </div>

        {/* Orbiting tool emoji icons — spreading outward as reveal unfolds */}
        {["🔬", "💬", "📝", "🐉", "🔊", "🧠"].map((icon, oi) => {
          const orbitDelay = 80 + oi * 4;
          const orbitF = frame - orbitDelay;
          if (orbitF < 0) return null;
          const baseAngle = (oi / 6) * Math.PI * 2;
          const rotation = orbitF * 0.01;
          const angle = baseAngle + rotation;
          const r = interpolate(orbitF, [0, 40], [80, 340], {
            extrapolateRight: "clamp",
          });
          const iconOp = interpolate(orbitF, [0, 15, 130, 160], [0, 0.55, 0.35, 0], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          });
          return (
            <div
              key={`orbit-icon-${oi}`}
              style={{
                position: "absolute",
                left: `calc(50% + ${Math.cos(angle) * r}px)`,
                top: `calc(42% + ${Math.sin(angle) * r * 0.4}px)`,
                transform: "translate(-50%, -50%)",
                fontSize: 22,
                opacity: iconOp,
                filter: `drop-shadow(0 0 6px rgba(96,165,250,0.4))`,
                pointerEvents: "none",
                zIndex: 2,
              }}
            >
              {icon}
            </div>
          );
        })}

        {/* Center glow */}
        <div
          style={{
            position: "absolute",
            width: 500,
            height: 500,
            borderRadius: "50%",
            background: `radial-gradient(circle, rgba(96,165,250,0.12) 0%, rgba(139,92,246,0.06) 40%, transparent 70%)`,
            transform: `scale(${interpolate(frame, [15, 80], [0.5, 1.5], { extrapolateRight: "clamp" })})`,
          }}
        />

        {/* AI voice waveform bars — small audio visualizer hint */}
        {frame > 85 && (
          <div
            style={{
              position: "absolute",
              top: "calc(42% + 120px)",
              left: "50%",
              transform: "translateX(-50%)",
              display: "flex",
              alignItems: "center",
              gap: 2,
              opacity: interpolate(frame, [85, 105, 200, 220], [0, 0.3, 0.3, 0], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
              }),
              zIndex: 2,
            }}
          >
            {Array.from({ length: 25 }, (_, wi) => {
              const h = Math.abs(Math.sin((frame * 0.2 + wi * 0.6) * 1) * 0.5
                + Math.sin((frame * 0.15 + wi * 0.3) * 1) * 0.3) * 16 + 2;
              // Loud bars (taller) glow brighter — maps height 2–18 → opacity 0.45–1.0
              const barOp = 0.45 + ((h - 2) / 16) * 0.55;
              const color = wi < 12 ? "#60a5fa" : "#34d399";
              return (
                <div
                  key={wi}
                  style={{
                    width: 2,
                    height: h,
                    background: color,
                    borderRadius: 1,
                    opacity: barOp,
                    boxShadow: h > 12 ? `0 0 ${(h - 12) * 0.6}px ${color}aa` : undefined,
                  }}
                />
              );
            })}
          </div>
        )}

        {/* Orbital arc notches around the center */}
        <svg
          width="700"
          height="700"
          viewBox="0 0 700 700"
          style={{
            position: "absolute",
            left: "50%",
            top: "42%",
            transform: `translate(-50%, -50%) rotate(${frame * 0.25}deg)`,
            opacity: interpolate(frame, [65, 90, 200, 230], [0, 0.25, 0.25, 0], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            }),
            pointerEvents: "none",
          }}
        >
          {Array.from({ length: 16 }, (_, ni) => {
            const a = (ni / 16) * Math.PI * 2;
            const isMajor = ni % 4 === 0;
            const len = isMajor ? 14 : 7;
            const x1 = 350 + Math.cos(a) * 320;
            const y1 = 350 + Math.sin(a) * 320;
            const x2 = 350 + Math.cos(a) * (320 + len);
            const y2 = 350 + Math.sin(a) * (320 + len);
            return (
              <line
                key={ni}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke="#60a5fa"
                strokeWidth={isMajor ? 1.5 : 0.8}
                opacity={isMajor ? 0.8 : 0.5}
              />
            );
          })}
        </svg>

        {/* Fake app window — bottom right */}
        <div
          style={{
            position: "absolute",
            right: 60,
            bottom: 80,
            opacity: interpolate(frame, [90, 115], [0, 0.7], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
            transform: `translateY(${interpolate(frame, [90, 115], [30, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })}px)`,
            zIndex: 1,
          }}
        >
          <FakeAppWindow enterDelay={90} />
        </div>

        {/* Data stream particles from AlloBot to FakeAppWindow */}
        {frame > 100 && frame < 220 && Array.from({ length: 5 }, (_, pi) => {
          const period = 40 + pi * 8;
          const t = ((frame - 100 + pi * 12) % period) / period;
          const startX = 170;
          const startY = 380;
          const endX = 1340;
          const endY = 680;
          const cx = startX + (endX - startX) * t;
          const cy = startY + (endY - startY) * t + Math.sin(t * Math.PI * 3) * 40;
          const pOp = Math.sin(t * Math.PI) * 0.5;
          const colors = ["#60a5fa", "#34d399", "#a78bfa"];
          return (
            <div
              key={`data-stream-${pi}`}
              style={{
                position: "absolute",
                left: cx,
                top: cy,
                width: 4,
                height: 4,
                borderRadius: "50%",
                background: colors[pi % 3],
                opacity: pOp,
                boxShadow: `0 0 8px ${colors[pi % 3]}66`,
                pointerEvents: "none",
                zIndex: 3,
              }}
            />
          );
        })}

        {/* AlloBot */}
        <div
          style={{
            position: "absolute",
            left: 80,
            top: "38%",
            transform: `translateY(-50%) translateX(${-botX}px)`,
            opacity: botOpacity,
            zIndex: 2,
          }}
        >
          <AlloBot size={170} />
        </div>

        {/* Celebrating pixel students at bottom */}
        <div
          style={{
            position: "absolute",
            bottom: 50,
            left: "50%",
            transform: "translateX(-50%)",
            display: "flex",
            alignItems: "flex-end",
            gap: 24,
            zIndex: 2,
          }}
        >
          <PixelCelebration pixelSize={4} enterDelay={80} maxOpacity={0.45} />
          <PixelAlloBot pixelSize={5} enterDelay={90} />
        </div>

        {/* Celebration emoji burst when logo lands */}
        {frame >= 50 && frame < 95 && [
          { emoji: "🎉", x: -260, y: -40, delay: 0 },
          { emoji: "✨", x: 250, y: -30, delay: 3 },
          { emoji: "🚀", x: -220, y: 80, delay: 6 },
          { emoji: "⭐", x: 240, y: 90, delay: 9 },
          { emoji: "💫", x: -160, y: -90, delay: 12 },
          { emoji: "🌟", x: 180, y: -100, delay: 15 },
        ].map((em, ei) => {
          const burstF = frame - 50 - em.delay;
          if (burstF < 0) return null;
          const op = interpolate(burstF, [0, 6, 35, 45], [0, 1, 0.8, 0], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          });
          const scale = interpolate(burstF, [0, 8, 12], [0, 1.4, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          });
          const driftY = burstF * 0.6;
          return (
            <div
              key={`celebrate-${ei}`}
              style={{
                position: "absolute",
                left: `calc(50% + ${em.x}px)`,
                top: `calc(42% + ${em.y - driftY}px)`,
                fontSize: 36,
                opacity: op,
                transform: `scale(${scale}) rotate(${burstF * 2}deg)`,
                pointerEvents: "none",
                zIndex: 4,
                filter: "drop-shadow(0 0 8px rgba(255,255,255,0.4))",
              }}
            >
              {em.emoji}
            </div>
          );
        })}

        {/* Logo starburst particles */}
        {starburstParticles.map((sp, i) =>
          sp ? (
            <div
              key={`sburst-${i}`}
              style={{
                position: "absolute",
                left: `calc(50% + ${sp.x}px)`,
                top: `calc(42% + ${sp.y}px)`,
                width: sp.size,
                height: sp.size,
                borderRadius: i % 4 === 0 ? "1px" : "50%",
                background: sp.color,
                opacity: sp.op,
                boxShadow: `0 0 ${sp.size * 3}px ${sp.color}55`,
                transform: i % 4 === 0 ? `rotate(${frame * 5 + i * 30}deg)` : undefined,
                pointerEvents: "none",
                zIndex: 4,
              }}
            />
          ) : null,
        )}

        {/* Orbiting sparkle ring */}
        {orbitParticles.map((op, i) => (
          <div
            key={`orbit-${i}`}
            style={{
              position: "absolute",
              left: `calc(50% + ${op.x}px)`,
              top: `calc(42% + ${op.y}px)`,
              width: op.size,
              height: op.size,
              borderRadius: "50%",
              background: op.color,
              opacity: op.op,
              boxShadow: `0 0 ${op.size * 4}px ${op.color}44`,
              pointerEvents: "none",
              zIndex: 4,
            }}
          />
        ))}

        <div style={{ textAlign: "center", zIndex: 3 }}>
          {/* Greeting text above logo — "INTRODUCING" */}
          <div
            style={{
              fontSize: 16,
              fontFamily: "monospace",
              fontWeight: 600,
              color: "#60a5fa",
              letterSpacing: "0.4em",
              opacity: interpolate(frame, [8, 20, 95, 115], [0, 0.7, 0.7, 0], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
              }),
              marginBottom: 16,
              textShadow: "0 0 8px rgba(96,165,250,0.4)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 14,
            }}
          >
            <span style={{ width: interpolate(frame, [8, 28], [0, 24], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }), height: 1, background: "#60a5fa88", boxShadow: `0 0 ${4 + Math.sin(frame * 0.12) * 2}px rgba(96,165,250,0.4)` }} />
            INTRODUCING
            <span style={{ width: interpolate(frame, [8, 28], [0, 24], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }), height: 1, background: "#60a5fa88", boxShadow: `0 0 ${4 + Math.sin(frame * 0.12 + Math.PI) * 2}px rgba(96,165,250,0.4)` }} />
          </div>

          {/* Letter-by-letter AlloFlow with shimmer */}
          <div
            style={{
              fontSize: 120,
              fontWeight: 800,
              fontFamily: "system-ui, sans-serif",
              letterSpacing: "-0.02em",
              position: "relative",
            }}
          >
            {"Allo".split("").map((char, i) => (
              <LogoLetter key={i} char={char} index={i} color="#60a5fa" totalDelay={15} />
            ))}
            {"Flow".split("").map((char, i) => (
              <LogoLetter key={i + 4} char={char} index={i + 4} color="#34d399" totalDelay={15} />
            ))}
            {/* Shimmer sweep across logo — two passes */}
            <div
              style={{
                position: "absolute",
                inset: 0,
                overflow: "hidden",
                pointerEvents: "none",
              }}
            >
              <div
                style={{
                  position: "absolute",
                  top: 0,
                  left: `${interpolate(frame, [60, 120], [-20, 120], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })}%`,
                  width: "15%",
                  height: "100%",
                  background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.12), transparent)",
                  transform: "skewX(-15deg)",
                }}
              />
              {/* Second shimmer — subtler, later */}
              <div
                style={{
                  position: "absolute",
                  top: 0,
                  left: `${interpolate(frame, [150, 210], [-20, 120], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })}%`,
                  width: "12%",
                  height: "100%",
                  background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.06), transparent)",
                  transform: "skewX(-15deg)",
                }}
              />
            </div>
          </div>

          {/* Version badge + holographic tech readout */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 16,
              opacity: taglineOpacity,
              marginBottom: 8,
            }}
          >
            <div
              style={{
                padding: "5px 18px",
                borderRadius: 20,
                background: "rgba(96,165,250,0.15)",
                border: "1px solid rgba(96,165,250,0.3)",
                fontSize: 16,
                fontFamily: "monospace",
                color: "#60a5fa",
                boxShadow: `0 0 ${4 + Math.sin(frame * 0.07) * 3}px rgba(96,165,250,0.3)`,
              }}
            >
              v1.0
            </div>
            {/* Holographic readout chips */}
            {[
              { label: "AGPL-3.0", color: "#a78bfa" },
              { label: "REACT 18", color: "#60a5fa" },
              { label: "GEMINI AI", color: "#34d399" },
            ].map((chip, ci) => {
              const chipOp = interpolate(frame, [80 + ci * 8, 95 + ci * 8], [0, 0.6], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
              });
              return (
                <div
                  key={ci}
                  style={{
                    fontSize: 10,
                    fontFamily: "monospace",
                    color: chip.color,
                    padding: "3px 10px",
                    borderRadius: 4,
                    border: `1px solid ${chip.color}33`,
                    background: `${chip.color}08`,
                    opacity: chipOp,
                    letterSpacing: "0.05em",
                  }}
                >
                  {chip.label}
                  {/* Blinking data cursor */}
                  <span style={{ opacity: frame % 20 < 12 ? 0.6 : 0, marginLeft: 3, color: chip.color }}>▌</span>
                </div>
              );
            })}
          </div>

          {/* Tagline */}
          <div
            style={{
              fontSize: 34,
              fontFamily: "system-ui, sans-serif",
              fontWeight: 400,
              color: "#e2e8f0",
              opacity: taglineOpacity,
              transform: `translateY(${(1 - taglineY) * 20}px)`,
              textShadow: `0 0 ${12 + Math.sin(frame * 0.04) * 5}px rgba(96,165,250,0.2)`,
              marginTop: 12,
              letterSpacing: "0.05em",
              position: "relative",
              display: "inline-block",
              padding: "0 24px",
            }}
          >
            {/* Corner tick marks framing the tagline — phase-offset breathing pulse */}
            {[
              { top: -4, left: -4, borderTop: "1px solid #60a5fa66", borderLeft: "1px solid #60a5fa66", phase: 0, dx: -1, dy: -1 },
              { top: -4, right: -4, borderTop: "1px solid #34d39966", borderRight: "1px solid #34d39966", phase: Math.PI / 2, dx: 1, dy: -1 },
              { bottom: -4, left: -4, borderBottom: "1px solid #34d39966", borderLeft: "1px solid #34d39966", phase: 3 * Math.PI / 2, dx: -1, dy: 1 },
              { bottom: -4, right: -4, borderBottom: "1px solid #60a5fa66", borderRight: "1px solid #60a5fa66", phase: Math.PI, dx: 1, dy: 1 },
            ].map((pos, ti) => {
              const { phase, dx, dy, ...positionStyle } = pos;
              const breathing = frame > 125;
              const drift = breathing ? Math.sin(frame * 0.05 + phase) * 0.8 : 0;
              return (
                <span
                  key={`tag-tick-${ti}`}
                  style={{
                    position: "absolute",
                    width: 10,
                    height: 10,
                    ...positionStyle,
                    opacity: interpolate(frame, [100, 125], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })
                      * (breathing ? 0.85 + Math.sin(frame * 0.05 + phase) * 0.15 : 1),
                    transform: `translate(${drift * dx}px, ${drift * dy}px)`,
                  }}
                />
              );
            })}
            <span style={{ position: "relative", display: "inline-block" }}>
              AI-Powered Differentiation Engine
              {/* EST. 2026 — bottom-right corner of tagline */}
              <span
                style={{
                  position: "absolute",
                  bottom: -2,
                  right: -88,
                  fontSize: 10,
                  fontFamily: "monospace",
                  color: "#60a5fa",
                  letterSpacing: "0.25em",
                  opacity: interpolate(frame, [110, 130], [0, 0.5], {
                    extrapolateLeft: "clamp",
                    extrapolateRight: "clamp",
                  }) * (0.85 + Math.sin(frame * 0.06) * 0.15),
                  fontWeight: 600,
                  textShadow: `0 0 ${4 + Math.sin(frame * 0.06) * 2}px rgba(96,165,250,0.4)`,
                }}
              >
                EST. 2026
              </span>
            </span>
            {/* Tagline underline accent — gentle breath after it lands at frame 115 */}
            <div
              style={{
                width: interpolate(frame, [80, 115], [0, 350], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
                height: 2,
                background: `linear-gradient(${90 + (frame > 115 ? Math.sin(frame * 0.04) * 6 : 0)}deg, transparent, #60a5fa66, #34d39966, transparent)`,
                margin: "10px auto 0",
                borderRadius: 1,
                opacity: frame > 115 ? 0.85 + Math.sin(frame * 0.05) * 0.15 : 1,
                boxShadow: frame > 115 ? `0 0 ${4 + Math.sin(frame * 0.05) * 2}px rgba(96,165,250,0.3)` : undefined,
                transform: frame > 115 ? `scaleX(${1 + Math.sin(frame * 0.05) * 0.025})` : undefined,
              }}
            />
          </div>

          {/* Subtitle */}
          <div
            style={{
              fontSize: 22,
              fontFamily: "system-ui, sans-serif",
              fontWeight: 300,
              color: "#94a3b8",
              opacity: subtitleOpacity * (0.9 + Math.sin(frame * 0.05) * 0.1),
              marginTop: 12,
            }}
          >
            Privacy-first. Open source. For everyone who teaches.
          </div>
        </div>
      </AbsoluteFill>
    </SceneTransition>
  );
};
