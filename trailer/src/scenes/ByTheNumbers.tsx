import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig, Sequence } from "remotion";
import { HexGrid } from "../components/HexGrid";
import { CodeRain } from "../components/CodeRain";
import { GlitchText } from "../components/GlitchText";
import { WaveformVisualizer } from "../components/WaveformVisualizer";
import {
  PixelLabScene,
  DragonBattleScene,
  PixelSoundScene,
  PixelShieldScene,
  PixelHeartScene,
  PixelMathScene,
  ScanlineOverlay,
} from "../components/PixelCharacters";
import { DNAHelix } from "../components/CinematicOverlays";

interface StatProps {
  number: string;
  label: string;
  color: string;
  pixelAccent?: React.ReactNode;
  emoji?: string;
}

const AnimatedStat: React.FC<StatProps> = ({ number, label, color, pixelAccent, emoji }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const scale = spring({ frame: frame - 5, fps, config: { damping: 8, stiffness: 120, mass: 0.7 } });
  const opacity = interpolate(frame, [0, 10], [0, 1], { extrapolateRight: "clamp" });
  const exitOpacity = interpolate(frame, [72, 86], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Count-up for numeric values
  const isNumeric = /^\d+/.test(number);
  const numericPart = parseInt(number) || 0;
  const suffix = number.replace(/^\d+/, "");
  const countProgress = interpolate(frame, [5, 30], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const displayNumber = isNumeric ? `${Math.round(numericPart * countProgress)}${suffix}` : number;

  // Glow pulse
  const glow = Math.sin(frame * 0.15) * 0.3 + 0.5;

  // Slam shake — quick horizontal jitter when number lands
  const slamPhase = interpolate(frame, [5, 12], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const shakeX = slamPhase < 1 ? Math.sin(frame * 4) * (1 - slamPhase) * 4 : 0;

  // Completion pop — subtle scale bounce when count-up finishes (~frame 30)
  const completionPop = interpolate(frame, [28, 32, 38], [1, 1.08, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Impact flash behind the number
  const impactFlash = interpolate(frame, [4, 8, 18], [0, 0.15, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Expanding pulse rings — 2 staggered rings on stat entry
  const pulseRings = [0, 8].map((delay) => {
    const ringF = frame - 5 - delay;
    const ringScale = interpolate(ringF, [0, 40], [0.2, 3], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    });
    const ringOp = interpolate(ringF, [0, 6, 40], [0, 0.25, 0], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    });
    return { scale: ringScale, opacity: ringOp };
  });

  return (
    <AbsoluteFill
      style={{
        justifyContent: "center",
        alignItems: "center",
        opacity: opacity * exitOpacity,
      }}
    >
      {/* Impact flash */}
      <div
        style={{
          position: "absolute",
          width: 500,
          height: 500,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${color}44, transparent 60%)`,
          opacity: impactFlash,
        }}
      />

      {/* Expanding pulse rings */}
      {pulseRings.map((ring, ri) => (
        <div
          key={`pulse-ring-${ri}`}
          style={{
            position: "absolute",
            width: 120,
            height: 120,
            borderRadius: "50%",
            border: `2px solid ${color}`,
            transform: `scale(${ring.scale})`,
            opacity: ring.opacity,
            pointerEvents: "none",
          }}
        />
      ))}

      {/* Scanning laser beam */}
      <div
        style={{
          position: "absolute",
          width: "100%",
          height: 2,
          background: `linear-gradient(90deg, transparent 10%, ${color}44 30%, ${color} 50%, ${color}44 70%, transparent 90%)`,
          top: `${interpolate(frame, [3, 50], [20, 80], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })}%`,
          opacity: interpolate(frame, [3, 8, 45, 55], [0, 0.4, 0.2, 0], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          }),
          boxShadow: `0 0 12px ${color}44, 0 0 30px ${color}22`,
          pointerEvents: "none",
        }}
      />

      {/* Rotating data ring */}
      <svg
        width="300"
        height="300"
        viewBox="0 0 300 300"
        style={{
          position: "absolute",
          opacity: interpolate(frame, [5, 20], [0, 0.15], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          }),
          transform: `rotate(${frame * 0.8}deg)`,
          pointerEvents: "none",
        }}
      >
        {Array.from({ length: 24 }, (_, di) => {
          const a = (di / 24) * Math.PI * 2;
          const r = 130;
          return (
            <circle
              key={di}
              cx={150 + Math.cos(a) * r}
              cy={150 + Math.sin(a) * r}
              r={di % 3 === 0 ? 3 : 1.5}
              fill={color}
              opacity={0.5 + Math.sin(frame * 0.1 + di) * 0.3}
            />
          );
        })}
      </svg>

      <div style={{ textAlign: "center", transform: `scale(${scale * completionPop}) translateX(${shakeX}px)`, position: "relative" }}>
        {/* Corner bracket framing — breathing pulse with phase-offset per corner */}
        {[
          { top: -20, left: -40, borderTop: `2px solid ${color}55`, borderLeft: `2px solid ${color}55`, phase: 0, dx: -1, dy: -1 },
          { top: -20, right: -40, borderTop: `2px solid ${color}55`, borderRight: `2px solid ${color}55`, phase: Math.PI / 2, dx: 1, dy: -1 },
          { bottom: 30, left: -40, borderBottom: `2px solid ${color}55`, borderLeft: `2px solid ${color}55`, phase: Math.PI, dx: -1, dy: 1 },
          { bottom: 30, right: -40, borderBottom: `2px solid ${color}55`, borderRight: `2px solid ${color}55`, phase: 3 * Math.PI / 2, dx: 1, dy: 1 },
        ].map((pos, bi) => {
          const { phase, dx, dy, ...positionStyle } = pos;
          const breathing = frame > 20;
          const drift = breathing ? Math.sin(frame * 0.05 + phase) * 1.2 : 0;
          return (
            <div
              key={`bracket-${bi}`}
              style={{
                position: "absolute",
                width: 18,
                height: 18,
                ...positionStyle,
                opacity: interpolate(frame, [8, 20], [0, 0.6], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })
                  * (breathing ? 0.85 + Math.sin(frame * 0.05 + phase) * 0.15 : 1),
                transform: `translate(${drift * dx}px, ${drift * dy}px)`,
              }}
            />
          );
        })}
        {/* Horizontal sweep lines extending from number */}
        <div
          style={{
            position: "absolute",
            left: "50%",
            top: "50%",
            transform: `translate(calc(-50% - 350px), -50%)`,
            width: interpolate(frame, [12, 35], [0, 250], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
            height: 1,
            background: `linear-gradient(270deg, ${color}, transparent)`,
            opacity: 0.4,
            pointerEvents: "none",
          }}
        />
        <div
          style={{
            position: "absolute",
            left: "50%",
            top: "50%",
            transform: `translate(calc(-50% + 350px), -50%)`,
            width: interpolate(frame, [12, 35], [0, 250], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
            height: 1,
            background: `linear-gradient(90deg, ${color}, transparent)`,
            opacity: 0.4,
            pointerEvents: "none",
          }}
        />

        {/* Topic emoji popping above the number */}
        {emoji && (
          <div
            style={{
              position: "absolute",
              top: -90,
              left: "50%",
              transform: `translateX(-50%) scale(${interpolate(frame, [4, 12, 18], [0, 1.4, 1], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
              }) * interpolate(frame, [28, 32, 38], [1, 1.12, 1], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
              })}) translateY(${Math.sin(frame * 0.12) * 4}px)`,
              fontSize: 60,
              opacity: interpolate(frame, [4, 14, 60, 72], [0, 1, 0.8, 0], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
              }),
              filter: `drop-shadow(0 0 14px ${color}88)`,
              pointerEvents: "none",
              zIndex: 4,
            }}
          >
            {emoji}
          </div>
        )}

        {/* Number landing flash */}
        <div
          style={{
            position: "absolute",
            left: "50%",
            top: "50%",
            transform: "translate(-50%, -50%)",
            width: 300,
            height: 200,
            borderRadius: "50%",
            background: `radial-gradient(circle, ${color}33, transparent 60%)`,
            opacity: interpolate(frame, [28, 32, 40], [0, 0.3, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
            pointerEvents: "none",
          }}
        />
        <div
          style={{
            fontSize: 160,
            fontWeight: 900,
            fontFamily: "system-ui, sans-serif",
            color,
            letterSpacing: "-0.03em",
            lineHeight: 1,
            textShadow: `0 0 ${60 * glow}px ${color}88, 0 0 ${120 * glow}px ${color}44`,
          }}
        >
          {displayNumber}
        </div>
        <div
          style={{
            fontSize: 36,
            fontWeight: 400,
            fontFamily: "system-ui, sans-serif",
            color: "#94a3b8",
            marginTop: 12,
            letterSpacing: "0.05em",
            position: "relative",
            display: "inline-flex",
            alignItems: "center",
            gap: 14,
          }}
        >
          {/* Left accent dot */}
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: color,
              opacity: interpolate(frame, [12, 25], [0, 0.7], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
              boxShadow: `0 0 8px ${color}88`,
            }}
          />
          {label}
        </div>

        {/* Accent line under label — with breathing intensity after fill */}
        <div
          style={{
            width: interpolate(frame, [10, 35], [0, 200], { extrapolateRight: "clamp" }),
            height: 3,
            background: `linear-gradient(90deg, transparent, ${color}, transparent)`,
            margin: "16px auto 0",
            borderRadius: 2,
            opacity: frame > 35 ? 0.85 + Math.sin(frame * 0.05) * 0.15 : 1,
            boxShadow: frame > 35 ? `0 0 ${4 + Math.sin(frame * 0.05) * 2}px ${color}66` : undefined,
          }}
        />
      </div>

      {/* VERIFIED stamp — appears post-count */}
      <div
        style={{
          position: "absolute",
          top: 80,
          right: 100,
          display: "flex",
          alignItems: "center",
          gap: 5,
          padding: "3px 10px",
          borderRadius: 4,
          border: `1.5px solid ${color}66`,
          fontSize: 10,
          fontFamily: "monospace",
          color: color,
          letterSpacing: "0.3em",
          fontWeight: 700,
          opacity: interpolate(frame, [32, 45], [0, 0.7], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          }),
          transform: `scale(${interpolate(frame, [32, 42], [0.7, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          })}) rotate(-3deg)`,
          zIndex: 4,
        }}
      >
        ✓ VERIFIED
      </div>

      {/* Pixel vignette — bottom left */}
      {pixelAccent && (
        <div style={{ position: "absolute", bottom: 40, left: 60 }}>
          {pixelAccent}
        </div>
      )}
    </AbsoluteFill>
  );
};

// Every figure below is verifiable from the AlloFlow repo, not estimated:
//   STEM / SEL      dev-tools/check_tool_registry.cjs --verbose (138 StemLab, 70 SelHub)
//   Games           distinct *Game components in games_module.js (Bingo counted once;
//                   StudentBingoGame is the student-side view of the same game)
//   Literacy        ALL_ACTIVITIES in word_sounds_module.js
//   Languages       lang/*.js pack count
//   Deployment      Gemini Canvas, AlloFlow Desktop, Docker School Box (README)
// Re-run those checks before changing a number here. The previous values
// (80+ / 10 / 13 / 100% browser-based / 40+ / 29) were stale and undersold the
// product, and "100% Browser-Based — No Install" contradicted the local-first
// Desktop path that the README calls the everyday route.
const stats: (StatProps & { emoji: string })[] = [
  { number: "138", label: "STEM Lab Tools", color: "#60a5fa", emoji: "🔬", pixelAccent: <PixelLabScene pixelSize={4} enterDelay={8} /> },
  { number: "19", label: "Interactive Games", color: "#fb7185", emoji: "🎮", pixelAccent: <DragonBattleScene pixelSize={4} enterDelay={8} /> },
  { number: "17", label: "Literacy Activities", color: "#fb923c", emoji: "🔊", pixelAccent: <PixelSoundScene pixelSize={4} enterDelay={8} /> },
  { number: "3", label: "Ways to Deploy", color: "#38bdf8", emoji: "💻", pixelAccent: <PixelShieldScene pixelSize={4} enterDelay={8} /> },
  { number: "63", label: "Languages Supported", color: "#4ade80", emoji: "🌍", pixelAccent: <PixelMathScene pixelSize={4} enterDelay={8} /> },
  { number: "70", label: "SEL Tools", color: "#a3e635", emoji: "❤️", pixelAccent: <PixelHeartScene pixelSize={4} enterDelay={8} /> },
];

const FRAMES_PER_STAT = 80;

export const ByTheNumbers: React.FC = () => {
  const frame = useCurrentFrame();

  const headerOpacity = interpolate(frame, [0, 15], [0, 1], { extrapolateRight: "clamp" });
  const headerFade = interpolate(frame, [42, 58], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ background: `linear-gradient(${135 + Math.sin(frame * 0.011) * 7}deg, #0f172a 0%, #0a1628 50%, #0f172a 100%)` }}>
      <CodeRain color="#60a5fa" opacity={0.05} columns={25} />

      {/* Floating background digits — atmospheric data particles */}
      {Array.from({ length: 14 }, (_, di) => {
        const seed = di * 43 + 19;
        const px = ((Math.sin(seed) * 49297) % 1800 + 1800) % 1800 + 60;
        const speed = 0.18 + (di % 4) * 0.08;
        const yBase = 1080 - ((frame * speed + di * 130) % 1300);
        const xDrift = Math.sin(frame * 0.012 + di * 2.5) * 18;
        const digits = ["55", "10", "8", "40", "100", "0", "1", "5", "15", "%", "+", "∞", "✦", "◆"];
        const dOp = interpolate(yBase, [50, 200, 850, 1050], [0, 0.06, 0.04, 0], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });
        return (
          <div
            key={`bg-digit-${di}`}
            style={{
              position: "absolute",
              left: px + xDrift,
              top: yBase,
              fontSize: 14 + (di % 3) * 6,
              fontFamily: "monospace",
              fontWeight: 700,
              color: "#60a5fa",
              opacity: dOp,
              pointerEvents: "none",
            }}
          >
            {digits[di % digits.length]}
          </div>
        );
      })}

      {/* Left-side vertical measurement ticks */}
      <div
        style={{
          position: "absolute",
          left: 48,
          top: 120,
          bottom: 120,
          width: 2,
          opacity: interpolate(frame, [15, 40, 520, 540], [0, 0.3, 0.3, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
          pointerEvents: "none",
          zIndex: 2,
        }}
      >
        {Array.from({ length: 10 }, (_, ti) => (
          <div
            key={`vtick-${ti}`}
            style={{
              position: "absolute",
              left: 0,
              top: `${ti * 11.11}%`,
              width: ti % 2 === 0 ? 14 : 7,
              height: 1,
              background: "#60a5fa",
              opacity: (ti % 2 === 0 ? 0.6 : 0.3) * (0.7 + Math.sin(frame * 0.05 + ti * 0.6) * 0.3),
            }}
          />
        ))}
      </div>

      {/* Right-side vertical measurement ticks */}
      <div
        style={{
          position: "absolute",
          right: 48,
          top: 120,
          bottom: 120,
          width: 2,
          opacity: interpolate(frame, [15, 40, 520, 540], [0, 0.3, 0.3, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
          pointerEvents: "none",
          zIndex: 2,
        }}
      >
        {Array.from({ length: 10 }, (_, ti) => (
          <div
            key={`vtick-r-${ti}`}
            style={{
              position: "absolute",
              right: 0,
              top: `${ti * 11.11}%`,
              width: ti % 2 === 0 ? 14 : 7,
              height: 1,
              background: "#60a5fa",
              opacity: (ti % 2 === 0 ? 0.6 : 0.3) * (0.7 + Math.sin(frame * 0.05 + ti * 0.6) * 0.3),
            }}
          />
        ))}
      </div>
      <HexGrid color="#60a5fa" opacity={0.04} pulseSpeed={0.08} />
      <WaveformVisualizer barCount={80} color="#60a5fa" height={50} position="bottom" opacity={0.1} />

      {/* Opening header */}
      <Sequence from={0} durationInFrames={65}>
        <AbsoluteFill
          style={{
            justifyContent: "center",
            alignItems: "center",
            opacity: headerOpacity * headerFade,
          }}
        >
          <GlitchText
            text="BY THE NUMBERS"
            startFrame={5}
            duration={18}
            fontSize={32}
            color="#60a5fa"
            style={{ letterSpacing: "0.2em" }}
          />
          {/* Decorative horizontal rules flanking the header */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 20,
              marginTop: 16,
              opacity: interpolate(frame, [20, 35], [0, 0.4], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
            }}
          >
            <div style={{ width: interpolate(frame, [20, 40], [0, 120], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }), height: 1, background: "linear-gradient(90deg, transparent, #60a5fa)", borderRadius: 1 }} />
            <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#60a5fa", boxShadow: "0 0 8px #60a5fa66" }} />
            <div style={{ width: interpolate(frame, [20, 40], [0, 120], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }), height: 1, background: "linear-gradient(270deg, transparent, #60a5fa)", borderRadius: 1 }} />
          </div>
        </AbsoluteFill>
      </Sequence>

      {/* Horizontal scan line that sweeps during active stats */}
      {frame > 55 && frame < 530 && (
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: `${((frame * 1.5) % 120) - 10}%`,
            height: 1,
            background: "linear-gradient(90deg, transparent 5%, rgba(96,165,250,0.08) 30%, rgba(96,165,250,0.15) 50%, rgba(96,165,250,0.08) 70%, transparent 95%)",
            pointerEvents: "none",
            zIndex: 2,
          }}
        />
      )}

      {/* 👏 Applause emoji bursts between stat transitions */}
      {stats.map((_, i) => {
        if (i === 0) return null;
        const transFrame = 55 + i * FRAMES_PER_STAT;
        const tf = frame - transFrame;
        if (tf < 0 || tf > 25) return null;
        const op = interpolate(tf, [0, 6, 22, 25], [0, 1, 0.5, 0], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });
        const scale = interpolate(tf, [0, 8, 14], [0, 1.4, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });
        return (
          <div
            key={`applause-${i}`}
            style={{
              position: "absolute",
              top: "82%",
              left: "50%",
              transform: `translate(-50%, -50%) scale(${scale})`,
              fontSize: 36,
              opacity: op * 0.85,
              pointerEvents: "none",
              zIndex: 4,
              filter: "drop-shadow(0 0 8px rgba(251,191,36,0.5))",
            }}
          >
            👏
          </div>
        );
      })}
      {stats.map((stat, i) => {
        if (i === 0) return null;
        const transFrame = 55 + i * FRAMES_PER_STAT;
        const tf = frame - transFrame;
        if (tf < -5 || tf > 25) return null;
        return Array.from({ length: 6 }, (_, pi) => {
          const pDelay = pi * 2;
          const pf = tf - pDelay;
          if (pf < 0 || pf > 18) return null;
          const px = interpolate(pf, [0, 18], [-400, 400], { extrapolateRight: "clamp" });
          const pOp = interpolate(pf, [0, 3, 12, 18], [0, 0.6, 0.4, 0], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          });
          const py = Math.sin(pf * 0.5 + pi) * 30;
          return (
            <div
              key={`trans-p-${i}-${pi}`}
              style={{
                position: "absolute",
                left: `calc(50% + ${px}px)`,
                top: `calc(50% + ${py}px)`,
                width: 4,
                height: 4,
                borderRadius: "50%",
                background: stat.color,
                opacity: pOp,
                boxShadow: `0 0 8px ${stat.color}66`,
                pointerEvents: "none",
                zIndex: 3,
              }}
            />
          );
        });
      })}

      {/* Rapid-fire stats */}
      {stats.map((stat, i) => (
        <Sequence key={i} from={55 + i * FRAMES_PER_STAT} durationInFrames={FRAMES_PER_STAT + 10}>
          <AnimatedStat {...stat} />
        </Sequence>
      ))}

      {/* DNA helix decoration — bottom */}
      <div style={{ position: "absolute", bottom: 60, left: "50%", transform: "translateX(-50%)", zIndex: 0 }}>
        <DNAHelix color1="#60a5fa" color2="#34d399" width={500} height={60} dotCount={24} speed={0.07} opacity={0.15} enterDelay={10} />
      </div>

      {/* Chapter marker — top left above LIVE badge */}
      <div
        style={{
          position: "absolute",
          top: 70,
          left: 80,
          display: "flex",
          alignItems: "baseline",
          gap: 8,
          opacity: interpolate(frame, [40, 65, 510, 535], [0, 0.45, 0.45, 0], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          }),
          zIndex: 4,
        }}
      >
        <span style={{ fontSize: 20, fontFamily: "Georgia, serif", fontStyle: "italic", fontWeight: 400, color: "#60a5fa", letterSpacing: "0.1em", display: "inline-block", transform: `scale(${interpolate(frame, [40, 62], [0.6, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })})` }}>VIII.</span>
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <span style={{ fontSize: 9, fontFamily: "monospace", color: "#64748b", letterSpacing: "0.3em", fontWeight: 700 }}>BY THE NUMBERS</span>
          <span style={{ fontSize: 7, fontFamily: "monospace", color: "#475569", letterSpacing: "0.2em", fontWeight: 500 }}>08 / 09 · 18.3s</span>
        </div>
      </div>

      {/* LIVE STREAM broadcast badge — top left */}
      <div
        style={{
          position: "absolute",
          top: 32,
          left: 80,
          display: "flex",
          alignItems: "center",
          gap: 7,
          padding: "4px 10px",
          borderRadius: 4,
          background: "rgba(248,113,113,0.12)",
          border: "1px solid rgba(248,113,113,0.35)",
          fontSize: 10,
          fontFamily: "monospace",
          color: "#f87171",
          letterSpacing: "0.15em",
          fontWeight: 700,
          opacity: interpolate(frame, [25, 45, 520, 540], [0, 0.7, 0.7, 0], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          }),
          zIndex: 5,
          overflow: "hidden",
        }}
      >
        <span
          style={{
            width: 6,
            height: 6,
            borderRadius: "50%",
            background: "#f87171",
            opacity: 0.4 + Math.sin(frame * 0.28) * 0.5,
            boxShadow: `0 0 ${4 + Math.sin(frame * 0.28) * 3}px #f87171`,
          }}
        />
        LIVE DATA
        {/* Shimmer sweep on LIVE badge */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: `${((frame * 2) % 200) - 50}%`,
            width: "30%",
            height: "100%",
            background: "linear-gradient(90deg, transparent, rgba(248,113,113,0.2), transparent)",
            pointerEvents: "none",
          }}
        />
      </div>

      {/* Stat progress dots with connecting line */}
      <div
        style={{
          position: "absolute",
          top: 32,
          right: 50,
          display: "flex",
          gap: 8,
          alignItems: "center",
          zIndex: 5,
          opacity: interpolate(frame, [60, 75, 530, 550], [0, 0.6, 0.6, 0], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          }),
          padding: "4px 10px",
          borderRadius: 16,
          background: "rgba(255,255,255,0.03)",
          border: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        {stats.map((stat, si) => {
          const statStart = 55 + si * FRAMES_PER_STAT;
          const isActive = frame >= statStart && frame < statStart + FRAMES_PER_STAT;
          const isPast = frame >= statStart + FRAMES_PER_STAT;
          return (
            <div
              key={si}
              style={{
                width: isActive ? 20 : 6,
                height: 6,
                borderRadius: 3,
                background: isActive
                  ? `linear-gradient(90deg, ${stat.color}, ${stat.color}aa)`
                  : isPast
                    ? "rgba(255,255,255,0.35)"
                    : "rgba(255,255,255,0.12)",
                boxShadow: isActive ? `0 0 8px ${stat.color}66` : undefined,
              }}
            />
          );
        })}
      </div>

      {/* Stat counter readout — bottom left */}
      {frame > 55 && frame < 535 && (() => {
        const statIdx = Math.min(5, Math.floor((frame - 55) / FRAMES_PER_STAT));
        const currentStat = stats[statIdx];
        return (
          <div
            style={{
              position: "absolute",
              bottom: 68,
              left: 72,
              display: "flex",
              alignItems: "center",
              gap: 10,
              fontSize: 11,
              fontFamily: "monospace",
              color: currentStat.color,
              letterSpacing: "0.12em",
              zIndex: 3,
              opacity: interpolate(frame, [60, 75, 520, 535], [0, 0.55, 0.55, 0], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
              }),
            }}
          >
            <span style={{
              width: 6,
              height: 6,
              borderRadius: "50%",
              background: currentStat.color,
              boxShadow: `0 0 6px ${currentStat.color}`,
              opacity: 0.5 + Math.sin(frame * 0.2) * 0.3,
            }} />
            STAT {String(statIdx + 1).padStart(2, "0")} / {String(stats.length).padStart(2, "0")}
          </div>
        );
      })()}

      {/* READOUT COMPLETE flash — center message */}
      {frame > 530 && frame < 550 && (
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            fontSize: 14,
            fontFamily: "monospace",
            color: "#34d399",
            letterSpacing: "0.4em",
            fontWeight: 700,
            opacity: interpolate(frame, [530, 535, 545, 550], [0, 1, 0.8, 0], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            }),
            textShadow: "0 0 10px rgba(52,211,153,0.6)",
            zIndex: 5,
            padding: "6px 16px",
            border: "1px solid rgba(52,211,153,0.5)",
            borderRadius: 4,
            background: "rgba(15,23,42,0.7)",
          }}
        >
          READOUT COMPLETE ✓
        </div>
      )}

      {/* Completion celebration burst — after last stat */}
      {frame > 530 && frame < 550 && Array.from({ length: 16 }, (_, pi) => {
        const angle = (pi / 16) * Math.PI * 2;
        const burstF = frame - 530;
        const r = interpolate(burstF, [0, 20], [0, 200 + (pi % 4) * 30], { extrapolateRight: "clamp" });
        const bOp = interpolate(burstF, [0, 5, 20], [0, 0.7, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
        const colors = ["#60a5fa", "#34d399", "#a78bfa", "#fbbf24", "#38bdf8", "#a3e635"];
        return (
          <div
            key={`completion-${pi}`}
            style={{
              position: "absolute",
              left: `calc(50% + ${Math.cos(angle) * r}px)`,
              top: `calc(50% + ${Math.sin(angle) * r * 0.6}px)`,
              width: 4,
              height: 4,
              borderRadius: pi % 3 === 0 ? "1px" : "50%",
              background: colors[pi % 6],
              opacity: bOp,
              boxShadow: `0 0 6px ${colors[pi % 6]}88`,
              transform: pi % 3 === 0 ? `rotate(${burstF * 8 + pi * 30}deg)` : undefined,
              pointerEvents: "none",
              zIndex: 4,
            }}
          />
        );
      })}

      {/* Scene progress bar — bottom */}
      <div
        style={{
          position: "absolute",
          bottom: 48,
          left: 80,
          right: 80,
          height: 2,
          background: "rgba(255,255,255,0.05)",
          borderRadius: 1,
          opacity: interpolate(frame, [55, 75, 520, 545], [0, 0.4, 0.4, 0], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          }),
          zIndex: 3,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            bottom: 0,
            width: `${Math.min(100, Math.max(0, ((frame - 55) / 480) * 100))}%`,
            background: "linear-gradient(90deg, #60a5fa, #34d399, #a78bfa)",
            borderRadius: 1,
            boxShadow: "0 0 8px rgba(96,165,250,0.4)",
          }}
        />
        {/* Leading edge dot */}
        {frame > 55 && frame < 540 && (
          <div
            style={{
              position: "absolute",
              left: `${Math.min(100, ((frame - 55) / 480) * 100)}%`,
              top: "50%",
              transform: "translate(-50%, -50%)",
              width: 6,
              height: 6,
              borderRadius: "50%",
              background: "#ffffff",
              boxShadow: "0 0 6px #60a5fa",
            }}
          />
        )}
      </div>

      <ScanlineOverlay opacity={0.03} lineGap={3} />
    </AbsoluteFill>
  );
};
