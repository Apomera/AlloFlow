import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig } from "remotion";
import { StarField } from "../components/StarField";
import { AlloBot } from "../components/AlloBot";
import { Constellation } from "../components/Constellation";
import { HexGrid } from "../components/HexGrid";
import { SceneTransition } from "../components/SceneTransition";
import { WaveformVisualizer } from "../components/WaveformVisualizer";
import { PixelCelebration, PixelFireworks, PixelConfetti, ScanlineOverlay } from "../components/PixelCharacters";
import { AuroraGlow, LensFlare } from "../components/CinematicOverlays";

const seededRandom = (seed: number) => {
  const x = Math.sin(seed * 9301 + 49297) * 49297;
  return x - Math.floor(x);
};

// Animated QR-code-style grid that builds in behind the GitHub link
const QRGrid: React.FC<{ size?: number; cellSize?: number; color?: string }> = ({
  size = 9,
  cellSize = 8,
  color = "#60a5fa",
}) => {
  const frame = useCurrentFrame();
  const totalCells = size * size;
  const gap = 3;

  const gridWidth = size * cellSize + (size - 1) * gap;
  const gridHeight = gridWidth;
  const scanY = ((frame * 1.2) % (gridHeight + 10)) - 5;

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(${size}, ${cellSize}px)`,
        gap,
        position: "relative",
      }}
    >
      {/* Scan line sweeping across QR grid */}
      <div
        style={{
          position: "absolute",
          left: -2,
          right: -2,
          top: scanY,
          height: 2,
          background: `linear-gradient(90deg, transparent, ${color}66, ${color}, ${color}66, transparent)`,
          opacity: 0.4,
          pointerEvents: "none",
          zIndex: 1,
          borderRadius: 1,
        }}
      />
      {Array.from({ length: totalCells }, (_, i) => {
        const row = Math.floor(i / size);
        const col = i % size;
        // QR corner squares
        const isCorner =
          (row < 3 && col < 3) ||
          (row < 3 && col >= size - 3) ||
          (row >= size - 3 && col < 3);
        const filled = isCorner || seededRandom(i * 7 + 3) > 0.55;

        const cellDelay = (row + col) * 2 + 60;
        const cellOpacity = interpolate(frame, [cellDelay, cellDelay + 8], [0, filled ? 0.7 : 0.1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });

        // Non-corner filled cells subtly twinkle
        const twinkle = !isCorner && filled
          ? 0.85 + Math.sin(frame * 0.08 + i * 0.7) * 0.15
          : 1;
        return (
          <div
            key={i}
            style={{
              width: cellSize,
              height: cellSize,
              borderRadius: 2,
              background: filled ? color : `${color}22`,
              opacity: cellOpacity * twinkle,
            }}
          />
        );
      })}
    </div>
  );
};

const Badge: React.FC<{ label: string; delay: number; color: string }> = ({ label, delay, color }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const scale = spring({ frame: frame - delay, fps, config: { damping: 14, stiffness: 90 } });
  const opacity = interpolate(frame, [delay, delay + 14], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Reactive glow pulse that triggers on badge entry then fades to a slow pulse
  const entryGlow = interpolate(frame, [delay, delay + 6, delay + 25], [0, 0.5, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const ambientGlow = frame > delay + 25 ? Math.sin((frame - delay) * 0.08) * 0.12 + 0.12 : 0;
  const glowIntensity = entryGlow + ambientGlow;

  return (
    <div
      style={{
        padding: "8px 20px",
        borderRadius: 24,
        background: `${color}15`,
        border: `1px solid ${color}44`,
        fontSize: 16,
        fontFamily: "system-ui, sans-serif",
        fontWeight: 500,
        color,
        opacity,
        transform: `scale(${scale})`,
        whiteSpace: "nowrap",
        boxShadow: glowIntensity > 0 ? `0 0 ${12 + glowIntensity * 20}px ${color}${Math.round(glowIntensity * 80).toString(16).padStart(2, "0")}, inset 0 0 8px ${color}11` : undefined,
        textShadow: glowIntensity > 0 ? `0 0 ${4 + glowIntensity * 4}px ${color}66` : undefined,
        position: "relative",
      }}
    >
      {label}
    </div>
  );
};

export const CallToAction: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Main text
  const mainScale = spring({ frame: frame - 10, fps, config: { damping: 12, stiffness: 100 } });
  const mainOpacity = interpolate(frame, [10, 30], [0, 1], { extrapolateRight: "clamp" });

  // "Free forever"
  const freeOpacity = interpolate(frame, [40, 60], [0, 1], { extrapolateRight: "clamp" });
  const freeY = spring({ frame: frame - 40, fps, config: { damping: 18, stiffness: 80 } });

  // GitHub
  const ghOpacity = interpolate(frame, [70, 90], [0, 1], { extrapolateRight: "clamp" });
  const ghScale = spring({ frame: frame - 70, fps, config: { damping: 14, stiffness: 90 } });

  // Tagline
  const tagOpacity = interpolate(frame, [200, 220], [0, 1], { extrapolateRight: "clamp" });

  // Particles
  const particles = Array.from({ length: 20 }, (_, i) => {
    const angle = (i / 20) * Math.PI * 2;
    const radius = interpolate(frame, [5, 100], [0, 320 + (i % 5) * 25], { extrapolateRight: "clamp" });
    const particleOpacity = interpolate(frame, [5, 25, 250, 285], [0, 0.5, 0.5, 0], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    });
    const colors = ["#60a5fa", "#34d399", "#a78bfa", "#fbbf24", "#f472b6"];
    return { angle, radius, opacity: particleOpacity, size: 3 + (i % 4) * 2, color: colors[i % 5] };
  });

  // Rotating rings
  const ring1Rot = interpolate(frame, [0, 300], [0, 180]);
  const ring2Rot = interpolate(frame, [0, 300], [0, -120]);
  const ringOpacity = interpolate(frame, [20, 50, 250, 285], [0, 0.12, 0.12, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Final crescendo screen-shake
  const shakeActive = frame >= 260 && frame <= 272;
  const shakeDecay = shakeActive ? interpolate(frame, [260, 272], [1, 0], { extrapolateRight: "clamp" }) : 0;
  const shakeX = shakeActive ? Math.sin(frame * 13) * 3 * shakeDecay : 0;
  const shakeY = shakeActive ? Math.cos(frame * 11) * 2 * shakeDecay : 0;

  // Final white flash
  const finalFlash = interpolate(frame, [258, 262, 275], [0, 0.08, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <SceneTransition durationInFrames={300} fadeIn={10} fadeOut={20}>
      <AbsoluteFill
        style={{
          background: `linear-gradient(${135 + Math.sin(frame * 0.013) * 8}deg, #0f172a 0%, #0c2341 50%, #0f172a 100%)`,
          justifyContent: "center",
          alignItems: "center",
          transform: `translate(${shakeX}px, ${shakeY}px)`,
        }}
      >
        {/* Gold confetti rain in final 50 frames — celebration finale with paper-flutter */}
        {frame > 245 && Array.from({ length: 25 }, (_, ci) => {
          const seed = ci * 31 + 7;
          const startX = ((Math.sin(seed) * 49297) % 1800 + 1800) % 1800 + 60;
          const speed = 1.5 + (ci % 4) * 0.5;
          const cf = frame - 245 - ci * 1.5;
          if (cf < 0) return null;
          const y = -50 + cf * speed * 8;
          if (y > 1100) return null;
          const xDrift = Math.sin(cf * 0.08 + ci) * 30;
          const colors = ["#fbbf24", "#f472b6", "#a78bfa", "#60a5fa", "#34d399"];
          const isSquare = ci % 3 === 0;
          // Paper flutter: scaleX oscillates between 1 and -1ish, simulating the piece flipping edge-on
          const flutterPhase = cf * 0.18 + ci * 0.7;
          const flutterScaleX = Math.cos(flutterPhase);
          // When paper rotates edge-on (flutterScaleX near 0), it dims briefly
          const edgeDim = 0.55 + Math.abs(flutterScaleX) * 0.4;
          // Per-piece base opacity — bigger pieces feel slightly heavier/brighter
          const baseOp = 0.6 + (ci % 3) * 0.13;
          return (
            <div
              key={`gold-confetti-${ci}`}
              style={{
                position: "absolute",
                left: startX + xDrift,
                top: y,
                width: 8 + (ci % 3) * 3,
                height: 8 + (ci % 3) * 3,
                borderRadius: isSquare ? "1px" : "50%",
                background: colors[ci % 5],
                opacity: baseOp * edgeDim,
                transform: `rotate(${cf * 6 + ci * 30}deg) scaleX(${flutterScaleX})`,
                boxShadow: `0 0 ${3 + Math.abs(flutterScaleX) * 3}px ${colors[ci % 5]}88`,
                pointerEvents: "none",
                zIndex: 3,
              }}
            />
          );
        })}

        {/* Final flash */}
        <AbsoluteFill style={{ background: "#a78bfa", opacity: finalFlash, pointerEvents: "none", zIndex: 10 }} />

        {/* Origin credit — BUILT IN PORTLAND, ME */}
        <div
          style={{
            position: "absolute",
            top: 50,
            right: 100,
            display: "flex",
            alignItems: "center",
            gap: 6,
            fontSize: 10,
            fontFamily: "monospace",
            color: "#475569",
            letterSpacing: "0.2em",
            opacity: interpolate(frame, [245, 270], [0, 0.5], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            }),
            zIndex: 4,
          }}
        >
          <span style={{
            fontSize: 10,
            display: "inline-block",
            transform: `translateY(${Math.sin(frame * 0.08) * 1.5}px)`,
          }}>📍</span>
          BUILT IN PORTLAND, ME
        </div>

        {/* Creator signature — bottom-right corner */}
        <div
          style={{
            position: "absolute",
            bottom: 50,
            right: 80,
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-end",
            gap: 2,
            opacity: interpolate(frame, [250, 275], [0, 0.55], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            }),
            zIndex: 4,
          }}
        >
          <span style={{
            fontSize: 14,
            fontFamily: "Georgia, serif",
            fontStyle: "italic",
            color: "#94a3b8",
            fontWeight: 400,
            textShadow: `0 0 ${5 + Math.sin(frame * 0.04) * 3}px rgba(96,165,250,0.2)`,
          }}>
            Aaron Pomeranz, PsyD
          </span>
          <span style={{
            fontSize: 9,
            fontFamily: "monospace",
            color: "#475569",
            letterSpacing: "0.25em",
            fontWeight: 600,
            opacity: 0.85 + Math.sin(frame * 0.05) * 0.15,
          }}>
            CREATOR · SCHOOL PSYCHOLOGIST
          </span>
        </div>

        {/* Produced by credit */}
        <div
          style={{
            position: "absolute",
            bottom: 68,
            left: "50%",
            transform: "translateX(-50%)",
            fontSize: 9,
            fontFamily: "monospace",
            color: "#475569",
            letterSpacing: "0.3em",
            fontWeight: 500,
            opacity: interpolate(frame, [255, 280], [0, 0.5], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            }),
            zIndex: 5,
          }}
        >
          <span style={{
            display: "inline-block",
            opacity: 0.85 + Math.sin(frame * 0.05) * 0.15,
          }}>
            PRODUCED BY A. POMERANZ · PORTLAND, ME · 2026
          </span>
        </div>

        {/* Tech credit — very subtle */}
        <div
          style={{
            position: "absolute",
            bottom: 10,
            right: 80,
            fontSize: 8,
            fontFamily: "monospace",
            color: "#334155",
            letterSpacing: "0.15em",
            opacity: interpolate(frame, [270, 290], [0, 0.4], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            }),
            zIndex: 5,
          }}
        >
          RENDERED WITH REMOTION
        </div>

        {/* Thank you for watching — final grace note */}
        <div
          style={{
            position: "absolute",
            bottom: 28,
            left: "50%",
            transform: "translateX(-50%)",
            fontSize: 11,
            fontFamily: "system-ui, sans-serif",
            fontWeight: 300,
            color: "#64748b",
            letterSpacing: "0.25em",
            opacity: interpolate(frame, [260, 280, 295], [0, 0.5, 0.3], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            }),
            zIndex: 5,
            textTransform: "uppercase",
            textShadow: `0 0 ${6 + Math.sin(frame * 0.06) * 3}px rgba(167,139,250,0.2)`,
          }}
        >
          thank you for watching
        </div>

        {/* Soft outro glow — ambient scene lighten at very end */}
        <AbsoluteFill
          style={{
            background: "radial-gradient(ellipse at center, rgba(96,165,250,0.15), rgba(52,211,153,0.08) 50%, transparent 80%)",
            opacity: interpolate(frame, [265, 290, 300], [0, 0.6, 0.3], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            }),
            pointerEvents: "none",
            zIndex: 8,
          }}
        />
        <AuroraGlow
          colors={["rgba(96,165,250,0.06)", "rgba(167,139,250,0.07)", "rgba(52,211,153,0.05)"]}
          speed={0.012}
        />

        <HexGrid color="#a78bfa" opacity={0.025} pulseSpeed={0.04} />

        {/* Drifting audience emojis — subtle, ambient */}
        {["👨‍🏫", "👩‍🏫", "👨‍👩‍👧", "🧑‍🎓", "👨‍⚕️", "👩‍💻", "🎓", "📚", "💡", "🏠"].map((emoji, ei) => {
          const seed = ei * 23 + 7;
          const baseX = ((Math.sin(seed) * 49297) % 1800 + 1800) % 1800 + 60;
          const speed = 0.15 + (ei % 3) * 0.08;
          const yBase = 1080 - ((frame * speed + ei * 140) % 1300);
          const xDrift = Math.sin(frame * 0.01 + ei * 1.5) * 20;
          const emojiOp = interpolate(yBase, [50, 250, 850, 1050], [0, 0.18, 0.12, 0], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          });
          return (
            <div
              key={`aud-${ei}`}
              style={{
                position: "absolute",
                left: baseX + xDrift,
                top: yBase,
                fontSize: 24 + (ei % 3) * 4,
                opacity: emojiOp,
                pointerEvents: "none",
                filter: "blur(0.3px)",
              }}
            >
              {emoji}
            </div>
          );
        })}
        <Constellation nodeCount={22} color="#a78bfa33" connectionDistance={170} />
        <StarField count={120} speed={0.8} color="#ffffff" />
        <WaveformVisualizer barCount={64} color="#a78bfa" height={35} position="bottom" opacity={0.06} />

        {/* Pixel fireworks celebration */}
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            zIndex: 3,
          }}
        >
          <PixelFireworks enterDelay={140} maxOpacity={0.6} />
        </div>

        {/* Confetti burst when badges appear */}
        <div
          style={{
            position: "absolute",
            top: "45%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            zIndex: 2,
          }}
        >
          <PixelConfetti enterDelay={85} count={40} spread={400} maxOpacity={0.5} />
        </div>

        <ScanlineOverlay opacity={0.02} lineGap={4} />

        {/* 16-bit celebrating students + teacher */}
        <div
          style={{
            position: "absolute",
            bottom: 55,
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 1,
          }}
        >
          <PixelCelebration pixelSize={5} enterDelay={120} maxOpacity={0.5} />
        </div>

        {/* Rotating rings */}
        <div
          style={{
            position: "absolute",
            width: 550,
            height: 550,
            borderRadius: "50%",
            border: "1px dashed rgba(96,165,250,0.2)",
            transform: `rotate(${ring1Rot}deg)`,
            opacity: ringOpacity,
          }}
        />
        <div
          style={{
            position: "absolute",
            width: 420,
            height: 420,
            borderRadius: "50%",
            border: "1px dashed rgba(52,211,153,0.15)",
            transform: `rotate(${ring2Rot}deg)`,
            opacity: ringOpacity,
          }}
        />

        {/* Final crescendo pulse rings — dramatic build in last 80 frames */}
        {[0, 12, 24, 36, 48].map((delay, i) => {
          const crescendoF = frame - (220 + delay);
          if (crescendoF < 0) return null;
          const cScale = interpolate(crescendoF, [0, 60], [0.3, 4 + i * 0.5], {
            extrapolateRight: "clamp",
          });
          const cOp = interpolate(crescendoF, [0, 8, 50, 60], [0, 0.2, 0.08, 0], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          });
          const colors = ["#60a5fa", "#34d399", "#a78bfa", "#fbbf24", "#f472b6"];
          return (
            <div
              key={`crescendo-${i}`}
              style={{
                position: "absolute",
                width: 120,
                height: 120,
                borderRadius: "50%",
                border: `1.5px solid ${colors[i]}`,
                transform: `scale(${cScale})`,
                opacity: cOp,
                pointerEvents: "none",
              }}
            />
          );
        })}

        {/* Particles */}
        {particles.map((p, i) => (
          <div
            key={i}
            style={{
              position: "absolute",
              width: p.size,
              height: p.size,
              borderRadius: "50%",
              background: p.color,
              opacity: p.opacity,
              left: `calc(50% + ${Math.cos(p.angle) * p.radius}px)`,
              top: `calc(50% + ${Math.sin(p.angle) * p.radius}px)`,
              boxShadow: `0 0 ${p.size * 3}px ${p.color}55`,
            }}
          />
        ))}

        {/* Chapter marker — top-left above EARLY ACCESS */}
        <div
          style={{
            position: "absolute",
            top: 55,
            left: 100,
            display: "flex",
            alignItems: "baseline",
            gap: 8,
            opacity: interpolate(frame, [30, 55], [0, 0.45], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
            zIndex: 5,
          }}
        >
          <span style={{ fontSize: 20, fontFamily: "Georgia, serif", fontStyle: "italic", fontWeight: 400, color: "#a78bfa", letterSpacing: "0.1em", display: "inline-block", transform: `scale(${interpolate(frame, [30, 52], [0.6, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })})` }}>IX.</span>
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <span style={{ fontSize: 9, fontFamily: "monospace", color: "#64748b", letterSpacing: "0.3em", fontWeight: 700 }}>JOIN US</span>
            <span style={{ fontSize: 7, fontFamily: "monospace", color: "#475569", letterSpacing: "0.2em", fontWeight: 500 }}>09 / 09 · 10.0s</span>
          </div>
        </div>

        {/* EARLY ACCESS badge — top-left, rotated for flair */}
        <div
          style={{
            position: "absolute",
            top: 90,
            left: 75,
            transform: `rotate(-5deg) scale(${interpolate(frame, [50, 70], [0.85, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })})`,
            opacity: interpolate(frame, [50, 75, 270, 290], [0, 0.65, 0.65, 0], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            }),
            padding: "5px 12px",
            borderRadius: 4,
            background: "linear-gradient(135deg, #fbbf24, #f472b6)",
            color: "#0f172a",
            fontSize: 10,
            fontFamily: "monospace",
            fontWeight: 800,
            letterSpacing: "0.2em",
            boxShadow: "0 3px 10px rgba(251,191,36,0.3), 0 0 14px rgba(244,114,182,0.2)",
            zIndex: 6,
          }}
        >
          <span style={{ display: "inline-block", transform: `rotate(${Math.sin(frame * 0.08) * 15}deg)` }}>✦</span> EARLY ACCESS <span style={{ display: "inline-block", transform: `rotate(${Math.sin(frame * 0.08 + Math.PI) * 15}deg)` }}>✦</span>
        </div>

        {/* Final AlloFlow brand lock-up — fades in at very end */}
        <div
          style={{
            position: "absolute",
            top: 40,
            right: 60,
            display: "flex",
            alignItems: "center",
            gap: 6,
            opacity: interpolate(frame, [270, 285], [0, 0.55], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            }),
            zIndex: 5,
          }}
        >
          <div style={{ width: 20, height: 20 }}>
            <AlloBot size={20} />
          </div>
          <span
            style={{
              fontSize: 13,
              fontFamily: "system-ui, sans-serif",
              fontWeight: 700,
              letterSpacing: "0.02em",
            }}
          >
            <span style={{
              color: "#60a5fa",
              textShadow: `0 0 ${3 + Math.sin(frame * 0.05) * 2}px rgba(96,165,250,0.4)`,
            }}>Allo</span>
            <span style={{
              color: "#34d399",
              textShadow: `0 0 ${3 + Math.sin(frame * 0.05 + Math.PI) * 2}px rgba(52,211,153,0.4)`,
            }}>Flow</span>
          </span>
          <span style={{
            fontSize: 9,
            fontFamily: "monospace",
            color: "#475569",
            marginLeft: 4,
            opacity: 0.8 + Math.sin(frame * 0.07) * 0.2,
          }}>v1.0</span>
        </div>

        {/* AlloBot with heartbeat pulse ring */}
        <div
          style={{
            position: "absolute",
            top: 80,
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 2,
          }}
        >
          <AlloBot size={150} enterDelay={5} />

          {/* 👍 Thumbs-up moment before the goodbye wave */}
          {frame >= 195 && frame < 240 && (
            <div
              style={{
                position: "absolute",
                top: 30,
                right: -40,
                fontSize: 48,
                opacity: interpolate(frame, [195, 210, 230, 240], [0, 1, 1, 0], {
                  extrapolateLeft: "clamp",
                  extrapolateRight: "clamp",
                }),
                transform: `scale(${interpolate(frame, [195, 205, 210], [0.3, 1.4, 1], {
                  extrapolateLeft: "clamp",
                  extrapolateRight: "clamp",
                })}) translateY(${Math.sin((frame - 195) * 0.3) * 3}px)`,
                pointerEvents: "none",
                zIndex: 4,
                filter: "drop-shadow(0 0 12px rgba(52,211,153,0.5))",
              }}
            >
              👍
            </div>
          )}

          {/* Wave-goodbye gesture appearing near AlloBot at the end (with motion trail) */}
          {frame >= 240 && (
            <>
              {/* Trail ghost — faint shadow waving 4 frames behind */}
              <div
                style={{
                  position: "absolute",
                  top: 30,
                  right: -40,
                  fontSize: 48,
                  opacity: interpolate(frame, [240, 255, 290, 300], [0, 0.25, 0.25, 0], {
                    extrapolateLeft: "clamp",
                    extrapolateRight: "clamp",
                  }),
                  transform: `rotate(${Math.sin((frame - 244) * 0.4) * 25}deg) scale(${interpolate(frame, [240, 250], [0.5, 1], {
                    extrapolateLeft: "clamp",
                    extrapolateRight: "clamp",
                  })})`,
                  transformOrigin: "bottom center",
                  pointerEvents: "none",
                  zIndex: 3,
                  filter: "blur(2px)",
                }}
              >
                👋
              </div>
              <div
                style={{
                  position: "absolute",
                  top: 30,
                  right: -40,
                  fontSize: 48,
                  opacity: interpolate(frame, [240, 255, 290, 300], [0, 1, 1, 0], {
                    extrapolateLeft: "clamp",
                    extrapolateRight: "clamp",
                  }),
                  transform: `rotate(${Math.sin((frame - 240) * 0.4) * 25}deg) scale(${interpolate(frame, [240, 250], [0.5, 1], {
                    extrapolateLeft: "clamp",
                    extrapolateRight: "clamp",
                  })})`,
                  transformOrigin: "bottom center",
                  pointerEvents: "none",
                  zIndex: 4,
                  filter: "drop-shadow(0 0 12px rgba(251,191,36,0.4))",
                }}
              >
                👋
              </div>
            </>
          )}
          {/* Heartbeat pulse rings radiating from AlloBot */}
          {[0, 25, 50].map((delay, ri) => {
            const hbF = (frame - 15 - delay) % 90;
            if (hbF < 0) return null;
            const hbScale = interpolate(hbF, [0, 60], [0.5, 2.5], { extrapolateRight: "clamp" });
            const hbOp = interpolate(hbF, [0, 10, 50, 60], [0, 0.15, 0.03, 0], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            });
            return (
              <div
                key={`hb-${ri}`}
                style={{
                  position: "absolute",
                  left: "50%",
                  top: "50%",
                  transform: `translate(-50%, -50%) scale(${hbScale})`,
                  width: 80,
                  height: 80,
                  borderRadius: "50%",
                  border: `1px solid ${ri === 0 ? "#8b5cf6" : "#60a5fa"}`,
                  opacity: hbOp,
                  pointerEvents: "none",
                }}
              />
            );
          })}
        </div>

        {/* Lens flare on main text reveal */}
        <LensFlare x="50%" y="46%" color="#a78bfa" enterDelay={10} duration={45} />

        <div style={{ textAlign: "center", zIndex: 1, marginTop: 60, position: "relative" }}>
          {/* Radiant glow behind main text */}
          <div
            style={{
              position: "absolute",
              top: -40,
              left: "50%",
              transform: "translateX(-50%)",
              width: 600,
              height: 250,
              borderRadius: "50%",
              background: "radial-gradient(ellipse, rgba(96,165,250,0.12), rgba(167,139,250,0.06) 50%, transparent 75%)",
              opacity: mainOpacity * (0.6 + Math.sin(frame * 0.05) * 0.15),
              filter: "blur(30px)",
              pointerEvents: "none",
            }}
          />
          {/* Open Source — letter-drop entrance */}
          <div
            style={{
              fontSize: 78,
              fontWeight: 800,
              fontFamily: "system-ui, sans-serif",
              color: "#ffffff",
              letterSpacing: "-0.01em",
              transform: `scale(${mainScale})`,
              position: "relative",
              display: "inline-block",
            }}
          >
            {"Open Source.".split("").map((ch, ci) => {
              const chDelay = 10 + ci * 1.5;
              const chDrop = spring({ frame: frame - chDelay, fps, config: { damping: 14, stiffness: 140 } });
              const chOp = interpolate(frame, [chDelay, chDelay + 8], [0, 1], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
              });
              return (
                <span
                  key={ci}
                  style={{
                    display: "inline-block",
                    opacity: chOp,
                    transform: `translateY(${(1 - chDrop) * -40}px)`,
                  }}
                >
                  {ch === " " ? "\u00A0" : ch}
                </span>
              );
            })}
            {/* Subtle animated underline beneath Open Source */}
            <div
              style={{
                position: "absolute",
                bottom: -4,
                left: "50%",
                transform: "translateX(-50%)",
                width: interpolate(frame, [40, 70], [0, 320], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
                height: 2,
                background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.6), transparent)",
                borderRadius: 1,
                opacity: 0.5 + Math.sin(frame * 0.06) * 0.2,
              }}
            />
          </div>

          {/* Free Forever with animated gradient */}
          <div
            style={{
              display: "inline-block",
              fontSize: 78,
              fontWeight: 800,
              fontFamily: "system-ui, sans-serif",
              backgroundImage: `linear-gradient(${135 + Math.sin(frame * 0.015) * 20}deg, #60a5fa, #34d399, #a78bfa, #60a5fa)`,
              backgroundSize: "200% 200%",
              backgroundPosition: `${(frame * 0.8) % 200}% 50%`,
              backgroundClip: "text",
              WebkitBackgroundClip: "text",
              color: "transparent",
              WebkitTextFillColor: "transparent",
              opacity: freeOpacity,
              transform: `translateY(${(1 - freeY) * 20}px)`,
              letterSpacing: "-0.01em",
              position: "relative",
            }}
          >
            No Subscription.
          </div>
          {/* Subtle ambient glow halo behind Free Forever */}
          <div
            style={{
              position: "absolute",
              top: 70,
              left: "50%",
              transform: "translateX(-50%)",
              width: 500,
              height: 90,
              borderRadius: "50%",
              background: "radial-gradient(ellipse, rgba(96,165,250,0.12), rgba(52,211,153,0.06) 50%, transparent 75%)",
              opacity: freeOpacity * (0.6 + Math.sin(frame * 0.05) * 0.2),
              filter: "blur(20px)",
              pointerEvents: "none",
              zIndex: -1,
            }}
          />

          {/* Badges row */}
          <div
            style={{
              display: "flex",
              gap: 12,
              justifyContent: "center",
              marginTop: 30,
              flexWrap: "wrap",
            }}
          >
            {/* Badge wording tracks the README's careful claims. "FERPA-Aligned"
                (not "Compatible") because compliance depends on the deployment a
                district chooses; "Local-First Desktop" replaces "Firebase Hosted",
                which was wrong — Firebase backs live sessions, it is not the host. */}
            <Badge label="AGPL v3" delay={85} color="#a78bfa" />
            <Badge label="FERPA-Aligned" delay={92} color="#4ade80" />
            <Badge label="Gemini Canvas" delay={99} color="#38bdf8" />
            <Badge label="Local-First Desktop" delay={106} color="#fbbf24" />
            <Badge label="63 Languages" delay={113} color="#60a5fa" />
            <Badge label="Chromebook Ready" delay={120} color="#f472b6" />
          </div>

          {/* "READY?" prompt just before GitHub link */}
          <div
            style={{
              marginTop: 24,
              fontSize: 12,
              fontFamily: "monospace",
              color: "#94a3b8",
              letterSpacing: "0.3em",
              opacity: interpolate(frame, [60, 80, 170, 190], [0, 0.6, 0.6, 0], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
              }),
              fontWeight: 700,
            }}
          >
            <span style={{
              color: "#34d399",
              display: "inline-block",
              transform: `translateX(${Math.sin(frame * 0.1) * 2}px)`,
            }}>▸</span>{" "}<span style={{
              display: "inline-block",
              textShadow: `0 0 ${4 + Math.sin(frame * 0.07) * 3}px rgba(148,163,184,${0.4 + Math.sin(frame * 0.07) * 0.2})`,
              opacity: 0.85 + Math.sin(frame * 0.07) * 0.15,
            }}>START HERE</span>{" "}<span style={{
              color: "#60a5fa",
              display: "inline-block",
              transform: `translateY(${Math.sin(frame * 0.12) * 2}px)`,
            }}>▾</span>
          </div>

          {/* GitHub link with QR grids */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 20,
              marginTop: 30,
              opacity: ghOpacity,
              transform: `scale(${0.9 + ghScale * 0.1})`,
            }}
          >
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
              <QRGrid size={7} cellSize={6} color="#60a5fa" />
              <span style={{ fontSize: 8, fontFamily: "monospace", color: "#60a5fa", letterSpacing: "0.2em", opacity: 0.55 }}>
                SCAN
              </span>
            </div>
            <div
              style={{
                fontSize: 28,
                fontFamily: "monospace",
                fontWeight: 400,
                color: "#94a3b8",
                padding: "14px 36px",
                borderRadius: 14,
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.12)",
                boxShadow: `0 4px 24px rgba(0,0,0,0.2), 0 0 ${8 + Math.sin(frame * 0.08) * 6}px rgba(96,165,250,${0.08 + Math.sin(frame * 0.08) * 0.06})`,
                position: "relative",
                overflow: "hidden",
              }}
            >
              {/* Send viewers to the launch page, not the source tree. A teacher who
                  watches this wants to try AlloFlow; the repo is the wrong landing. */}
              <span style={{ color: "#64748b" }}>▸</span> apomera.github.io/AlloFlow
              <span style={{
                opacity: frame % 24 < 14 ? 0.5 : 0,
                marginLeft: 4,
                color: "#60a5fa",
              }}>▌</span>
              {/* Shimmer sweep across link */}
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  background: `linear-gradient(105deg, transparent ${interpolate(frame, [80, 130, 200, 250], [-30, 130, -30, 130], { extrapolateRight: "clamp" }) - 15}%, rgba(255,255,255,0.08) ${interpolate(frame, [80, 130, 200, 250], [-30, 130, -30, 130], { extrapolateRight: "clamp" })}%, transparent ${interpolate(frame, [80, 130, 200, 250], [-30, 130, -30, 130], { extrapolateRight: "clamp" }) + 15}%)`,
                  pointerEvents: "none",
                }}
              />
            </div>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
              <QRGrid size={7} cellSize={6} color="#34d399" />
              <span style={{ fontSize: 8, fontFamily: "monospace", color: "#34d399", letterSpacing: "0.2em", opacity: 0.55 }}>
                STAR
              </span>
            </div>
          </div>

          {/* GitHub stars indicator — a playful "be the first" callout */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              justifyContent: "center",
              marginTop: 16,
              opacity: interpolate(frame, [150, 170], [0, 0.45], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
              }),
              fontSize: 12,
              fontFamily: "monospace",
              color: "#94a3b8",
              letterSpacing: "0.08em",
            }}
          >
            <span style={{
              color: "#fbbf24",
              fontSize: 14,
              display: "inline-block",
              transform: `scale(${1 + Math.sin(frame * 0.1) * 0.15}) rotate(${Math.sin(frame * 0.07) * 10}deg)`,
            }}>★</span>
            <span>be among the first to star this repo</span>
            <span style={{
              color: "#fbbf24",
              fontSize: 14,
              display: "inline-block",
              transform: `scale(${1 + Math.sin(frame * 0.1 + Math.PI) * 0.15}) rotate(${Math.sin(frame * 0.07 + Math.PI) * 10}deg)`,
            }}>★</span>
          </div>

          {/* Stakeholder reveal celebration burst — when chips appear */}
          {frame >= 200 && frame < 240 && Array.from({ length: 14 }, (_, ci) => {
            const burstF = frame - 200 - (ci % 5) * 3;
            if (burstF < 0 || burstF > 35) return null;
            const angle = (ci / 14) * Math.PI * 2 + Math.PI / 2;
            const r = interpolate(burstF, [0, 30], [50, 280], { extrapolateRight: "clamp" });
            const op = interpolate(burstF, [0, 5, 30, 35], [0, 0.9, 0.4, 0], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            });
            const emojis = ["🎉", "✨", "💜", "🎊", "⭐"];
            return (
              <div
                key={`stakeholder-celebration-${ci}`}
                style={{
                  position: "absolute",
                  left: `calc(50% + ${Math.cos(angle) * r}px)`,
                  top: `calc(75% + ${Math.sin(angle) * r * 0.4}px)`,
                  fontSize: 18 + (ci % 3) * 4,
                  opacity: op,
                  transform: `scale(${interpolate(burstF, [0, 8, 14], [0, 1.3, 1], {
                    extrapolateLeft: "clamp",
                    extrapolateRight: "clamp",
                  })}) rotate(${burstF * 4 + ci * 25}deg)`,
                  pointerEvents: "none",
                  zIndex: 4,
                }}
              >
                {emojis[ci % 5]}
              </div>
            );
          })}

          {/* Stakeholder roles */}
          <div
            style={{
              display: "flex",
              gap: 10,
              justifyContent: "center",
              marginTop: 24,
              flexWrap: "wrap",
              opacity: tagOpacity,
            }}
          >
            {[
              { label: "Teachers", icon: "🍎" },
              { label: "Parents", icon: "🏠" },
              { label: "Clinicians", icon: "📋" },
              { label: "Students", icon: "🎓" },
              { label: "Homeschoolers", icon: "🌱" },
            ].map((role, ri) => (
              <div
                key={ri}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  fontSize: 16,
                  fontFamily: "system-ui, sans-serif",
                  fontWeight: 400,
                  color: "#94a3b8",
                  padding: "5px 14px",
                  borderRadius: 20,
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  opacity: interpolate(frame, [200 + ri * 5, 215 + ri * 5], [0, 1], {
                    extrapolateLeft: "clamp",
                    extrapolateRight: "clamp",
                  }),
                  transform: `translateY(${interpolate(frame, [200 + ri * 5, 215 + ri * 5], [10, 0], {
                    extrapolateLeft: "clamp",
                    extrapolateRight: "clamp",
                  })}px)`,
                  // Synchronized finale glow — all chips pulse together at frame 250
                  boxShadow: frame >= 245 && frame < 275
                    ? `0 0 ${interpolate(frame, [245, 255, 275], [0, 16, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })}px rgba(96,165,250,0.5)`
                    : undefined,
                }}
              >
                <span style={{
                  fontSize: 14,
                  display: "inline-block",
                  transform: `scale(${1 + Math.sin(frame * 0.07 + ri * 1.2) * 0.08})`,
                }}>{role.icon}</span>
                <span style={{
                  textShadow: `0 0 ${4 + Math.sin(frame * 0.06 + ri * 0.8) * 2}px rgba(96,165,250,0.15)`,
                }}>{role.label}</span>
              </div>
            ))}
          </div>
          {/* Bottom tagline */}
          <div
            style={{
              fontSize: 20,
              fontFamily: "system-ui, sans-serif",
              fontWeight: 300,
              color: "#64748b",
              opacity: interpolate(frame, [235, 255], [0, 1], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
              }),
              marginTop: 14,
              textShadow: `0 0 ${8 + Math.sin(frame * 0.05) * 4}px rgba(167,139,250,0.15)`,
            }}
          >
            Built by people who understand.
          </div>

          {/* Powered By tech stack strip */}
          <div
            style={{
              display: "flex",
              gap: 20,
              justifyContent: "center",
              marginTop: 24,
              opacity: interpolate(frame, [220, 245], [0, 0.5], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
              }),
            }}
          >
            {[
              { label: "React", icon: "⚛️", glow: "#60a5fa" },
              { label: "Gemini AI", icon: "✦", glow: "#34d399" },
              { label: "Gemini Canvas", icon: "🎨", glow: "#a78bfa" },
              { label: "Firebase", icon: "🔥", glow: "#fbbf24" },
              { label: "Docker", icon: "🐳", glow: "#06b6d4" },
            ].map((tech, i) => {
              const iconPulse = Math.sin(frame * 0.08 + i * 1.2) * 0.3 + 0.5;
              return (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    fontSize: 14,
                    fontFamily: "system-ui, sans-serif",
                    color: "#475569",
                    position: "relative",
                  }}
                >
                  <span style={{
                    fontSize: 16,
                    display: "inline-block",
                    transform: `translateY(${Math.sin(frame * 0.07 + i * 1.5) * 1.5}px)`,
                    filter: `drop-shadow(0 0 ${4 + iconPulse * 4}px ${tech.glow}${Math.round(iconPulse * 80).toString(16).padStart(2, "0")})`,
                  }}>{tech.icon}</span>
                  <span style={{
                    opacity: 0.85 + Math.sin(frame * 0.07 + i * 1.5) * 0.15,
                  }}>{tech.label}</span>
                </div>
              );
            })}
          </div>
        </div>
      </AbsoluteFill>
    </SceneTransition>
  );
};
