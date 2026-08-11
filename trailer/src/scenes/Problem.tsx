import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig } from "remotion";
import { StarField } from "../components/StarField";
import { HexGrid } from "../components/HexGrid";
import { SceneTransition } from "../components/SceneTransition";
import { PixelCharacter } from "../components/PixelCharacters";

interface AnimatedCounterProps {
  target: string;
  startFrame: number;
  duration?: number;
}

const AnimatedCounter: React.FC<AnimatedCounterProps> = ({ target, startFrame, duration = 30 }) => {
  const frame = useCurrentFrame();

  // For numeric values, count up. For text like "1 in 5", just fade in.
  const isNumeric = /^\d+%?$/.test(target);
  const linearProgress = interpolate(frame, [startFrame, startFrame + duration], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  // Cubic ease-out: counter starts fast, slows as it approaches target — final digits land deliberately
  const eased = 1 - Math.pow(1 - linearProgress, 3);

  if (isNumeric) {
    const numericPart = parseInt(target);
    const suffix = target.includes("%") ? "%" : "";
    const current = Math.round(numericPart * eased);
    return <>{current}{suffix}</>;
  }

  return <>{target}</>;
};

const stats = [
  { value: "83%", label: "of teachers say they lack tools\nfor effective differentiation", delay: 30, barColor: "#f87171", tag: "GAP", year: "2024", severity: 3, errCode: "ERR_TOOLS_GAP" },
  { value: "1 in 5", label: "students receive special\neducation services", delay: 110, barColor: "#fbbf24", tag: "SCALE", year: "NCES", severity: 2, errCode: "ERR_UNDERSERVED" },
  { value: "0", label: "affordable AI tools designed\nfor IEP teams — until now", delay: 195, barColor: "#34d399", tag: "SHIFT", year: "TODAY", severity: 1, errCode: "RES_ALLOFLOW_v1" },
];

export const Problem: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const headerOpacity = interpolate(frame, [5, 25], [0, 1], { extrapolateRight: "clamp" });
  const headerScale = spring({ frame: frame - 5, fps, config: { damping: 15, stiffness: 100 } });

  // Divider lines between stats
  const dividerOpacity = interpolate(frame, [50, 80], [0, 0.15], { extrapolateRight: "clamp" });

  // Breaking-glass shards for the "0" stat — glass shatters outward
  const zeroDelay = 195;
  const shardF = frame - zeroDelay;
  const glassShards = Array.from({ length: 20 }, (_, i) => {
    if (shardF < 0 || shardF > 50) return null;
    const angle = (i / 20) * Math.PI * 2 + (i % 3) * 0.3;
    const speed = 2 + (i % 5) * 1.2;
    const r = shardF * speed;
    const rotation = shardF * (4 + i * 2);
    const shardOp = interpolate(shardF, [0, 3, 40, 50], [0, 0.6, 0.15, 0], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    });
    const w = 4 + (i % 4) * 3;
    const h = 6 + (i % 3) * 4;
    return { x: Math.cos(angle) * r, y: Math.sin(angle) * r, op: shardOp, w, h, rotation };
  });
  // Screen flash on zero impact
  const zeroFlash = interpolate(frame, [zeroDelay, zeroDelay + 3, zeroDelay + 12], [0, 0.12, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <SceneTransition durationInFrames={300} fadeIn={12} fadeOut={12}>
      <AbsoluteFill
        style={{
          background: `linear-gradient(${180 + Math.sin(frame * 0.012) * 8}deg, #0f172a 0%, #1a1a2e 100%)`,
          justifyContent: "center",
          alignItems: "center",
          padding: 80,
          // Screen-shake on zero stat impact
          transform: frame >= zeroDelay && frame <= zeroDelay + 12
            ? `translate(${Math.sin(frame * 11) * 4 * interpolate(frame, [zeroDelay, zeroDelay + 12], [1, 0], { extrapolateRight: "clamp" })}px, ${Math.cos(frame * 13) * 3 * interpolate(frame, [zeroDelay, zeroDelay + 12], [1, 0], { extrapolateRight: "clamp" })}px)`
            : undefined,
        }}
      >
        <HexGrid color="#f87171" opacity={0.02} pulseSpeed={0.04} />

        {/* Chapter marker — top-left */}
        <div
          style={{
            position: "absolute",
            top: 55,
            left: 100,
            display: "flex",
            alignItems: "baseline",
            gap: 8,
            opacity: interpolate(frame, [25, 50], [0, 0.45], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
            zIndex: 4,
          }}
        >
          <span style={{ fontSize: 20, fontFamily: "Georgia, serif", fontStyle: "italic", fontWeight: 400, color: "#f87171", letterSpacing: "0.1em", display: "inline-block", transform: `scale(${interpolate(frame, [25, 47], [0.6, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })})` }}>III.</span>
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <span style={{ fontSize: 9, fontFamily: "monospace", color: "#64748b", letterSpacing: "0.3em", fontWeight: 700 }}>THE CONFLICT</span>
            <span style={{ fontSize: 7, fontFamily: "monospace", color: "#475569", letterSpacing: "0.2em", fontWeight: 500 }}>03 / 09 · 10.0s</span>
          </div>
        </div>
        <StarField count={40} speed={0.1} color="#f8717133" />

        {/* Red warning glow */}
        <div
          style={{
            position: "absolute",
            width: 900,
            height: 900,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(248,113,113,0.07) 0%, transparent 55%)",
            top: "50%",
            left: "50%",
            transform: `translate(-50%, -50%) scale(${interpolate(frame, [0, 260], [0.8, 1.4], { extrapolateRight: "clamp" })})`,
          }}
        />

        {/* Pulsing warning rings — heartbeat rhythm */}
        {[0, 40, 80, 120, 160].map((delay, i) => {
          const ringF = frame - delay;
          const ringScale = interpolate(ringF, [0, 60], [0.2, 3.5], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          });
          const ringOp = interpolate(ringF, [0, 10, 60], [0, 0.2, 0], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          });
          return (
            <div
              key={i}
              style={{
                position: "absolute",
                width: 200,
                height: 200,
                borderRadius: "50%",
                border: "1.5px solid rgba(248,113,113,0.4)",
                top: "50%",
                left: "50%",
                transform: `translate(-50%, -50%) scale(${ringScale})`,
                opacity: ringOp,
              }}
            />
          );
        })}

        {/* Fracture / crack lines radiating from center — building tension */}
        {[
          { x1: "50%", y1: "50%", angle: -30, length: 400, delay: 20 },
          { x1: "50%", y1: "50%", angle: 145, length: 350, delay: 35 },
          { x1: "50%", y1: "50%", angle: -70, length: 300, delay: 55 },
          { x1: "50%", y1: "50%", angle: 110, length: 380, delay: 75 },
          { x1: "50%", y1: "50%", angle: 20, length: 280, delay: 100 },
          { x1: "50%", y1: "50%", angle: -120, length: 320, delay: 125 },
        ].map((crack, i) => {
          const crackLen = interpolate(frame, [crack.delay, crack.delay + 25], [0, crack.length], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          });
          const crackOpacity = interpolate(frame, [crack.delay, crack.delay + 8, crack.delay + 80], [0, 0.12, 0.04], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          });
          return (
            <div
              key={`crack-${i}`}
              style={{
                position: "absolute",
                left: crack.x1,
                top: crack.y1,
                width: crackLen,
                height: 1,
                background: `linear-gradient(90deg, rgba(248,113,113,${crackOpacity}), transparent)`,
                transform: `rotate(${crack.angle}deg)`,
                transformOrigin: "0 50%",
              }}
            />
          );
        })}

        {/* Zero-impact flash */}
        <AbsoluteFill style={{ background: "#34d399", opacity: zeroFlash, pointerEvents: "none" }} />

        {/* Anticipation red pulse — brief red tint just before zero stat */}
        <AbsoluteFill
          style={{
            background: "radial-gradient(ellipse at center, rgba(248,113,113,0.12) 0%, transparent 60%)",
            opacity: interpolate(frame, [zeroDelay - 12, zeroDelay - 4, zeroDelay], [0, 1, 0], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            }),
            pointerEvents: "none",
          }}
        />

        {/* Breaking-glass shards from "0" stat */}
        {glassShards.map((shard, i) =>
          shard ? (
            <div
              key={`shard-${i}`}
              style={{
                position: "absolute",
                left: `calc(75% + ${shard.x}px)`,
                top: `calc(50% + ${shard.y}px)`,
                width: shard.w,
                height: shard.h,
                background: `linear-gradient(135deg, rgba(52,211,153,0.6), rgba(255,255,255,0.3))`,
                opacity: shard.op,
                transform: `rotate(${shard.rotation}deg)`,
                borderRadius: 1,
                boxShadow: "0 0 4px rgba(52,211,153,0.3)",
                pointerEvents: "none",
              }}
            />
          ) : null,
        )}

        {/* EKG grid backdrop — faint medical monitor grid */}
        <div
          style={{
            position: "absolute",
            bottom: 160,
            left: 0,
            right: 0,
            height: 80,
            backgroundImage: "repeating-linear-gradient(90deg, transparent 0px, transparent 19px, rgba(248,113,113,0.04) 19px, rgba(248,113,113,0.04) 20px), repeating-linear-gradient(0deg, transparent 0px, transparent 19px, rgba(248,113,113,0.04) 19px, rgba(248,113,113,0.04) 20px)",
            opacity: interpolate(frame, [20, 45], [0, 0.5], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
            pointerEvents: "none",
          }}
        />

        {/* Heartbeat EKG line — flatlines when "0" stat appears */}
        <svg
          width="1920"
          height="60"
          viewBox="0 0 1920 60"
          style={{
            position: "absolute",
            bottom: 170,
            left: 0,
            opacity: interpolate(frame, [20, 40, zeroDelay + 40, zeroDelay + 80], [0, 0.2, 0.2, 0.06], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            }),
            pointerEvents: "none",
          }}
        >
          {(() => {
            // Before "0" stat: beating heartbeat waveform
            // After "0" stat: flatline
            const isFlatline = frame >= zeroDelay + 15;
            const beatOffset = (frame * 3) % 200;
            const points: string[] = [];

            for (let x = 0; x < 1920; x += 3) {
              let y = 30;
              if (isFlatline) {
                // Flatline with slight noise
                y = 30 + Math.sin(x * 0.01) * 0.5;
              } else {
                // Repeating heartbeat pattern
                const phase = ((x + beatOffset) % 200) / 200;
                if (phase > 0.35 && phase < 0.4) y = 30 - 18;
                else if (phase > 0.4 && phase < 0.42) y = 30 + 22;
                else if (phase > 0.42 && phase < 0.47) y = 30 - 10;
                else if (phase > 0.47 && phase < 0.5) y = 30 + 5;
                else y = 30 + Math.sin(x * 0.02 + frame * 0.05) * 1;
              }
              points.push(`${x},${y}`);
            }
            return (
              <polyline
                points={points.join(" ")}
                fill="none"
                stroke={isFlatline ? "#f8717144" : "#f87171"}
                strokeWidth={isFlatline ? 1 : 1.5}
                strokeLinejoin="round"
              />
            );
          })()}
        </svg>

        {/* Drifting ember particles — tension-building atmospheric */}
        {Array.from({ length: 18 }, (_, i) => {
          const seed = i * 47 + 13;
          const sx = ((Math.sin(seed) * 49297) % 1800 + 1800) % 1800 + 60;
          const speed = 0.4 + (i % 5) * 0.12;
          const yBase = 1080 - ((frame * speed + i * 100) % 1200);
          const xDrift = Math.sin(frame * 0.018 + i * 1.8) * 20;
          const emberOp = interpolate(yBase, [50, 200, 800, 1000], [0, 0.35, 0.25, 0], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          });
          const flicker = Math.sin(frame * 0.2 + i * 3.7) * 0.3 + 0.7;
          const size = 2 + (i % 3) * 1.5;
          return (
            <div
              key={`ember-${i}`}
              style={{
                position: "absolute",
                left: sx + xDrift,
                top: yBase,
                width: size,
                height: size,
                borderRadius: "50%",
                background: i % 3 === 0 ? "#fbbf24" : "#f87171",
                opacity: emberOp * flicker * interpolate(frame, [15, 40], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
                boxShadow: `0 0 ${size * 4}px ${i % 3 === 0 ? "#fbbf2466" : "#f8717166"}`,
                pointerEvents: "none",
              }}
            />
          );
        })}

        {/* Red-tinted scan interference flicker */}
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: `${((frame * 2.5) % 130) - 10}%`,
            height: 1,
            background: "linear-gradient(90deg, transparent 5%, rgba(248,113,113,0.06) 30%, rgba(248,113,113,0.12) 50%, rgba(248,113,113,0.06) 70%, transparent 95%)",
            pointerEvents: "none",
            zIndex: 2,
          }}
        />
        {/* Secondary scan offset */}
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: `${((frame * 1.8 + 60) % 130) - 10}%`,
            height: 1,
            background: "linear-gradient(90deg, transparent 10%, rgba(251,191,36,0.04) 40%, rgba(251,191,36,0.08) 50%, rgba(251,191,36,0.04) 60%, transparent 90%)",
            pointerEvents: "none",
            zIndex: 2,
          }}
        />

        {/* Data sources citation — subtle credit at bottom left */}
        <div
          style={{
            position: "absolute",
            bottom: 28,
            left: 80,
            fontSize: 9,
            fontFamily: "monospace",
            color: "#475569",
            letterSpacing: "0.1em",
            opacity: interpolate(frame, [130, 160, 270, 290], [0, 0.4, 0.4, 0], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            }),
            zIndex: 3,
          }}
        >
          SOURCES: EdWeek 2024 · NCES · IDEA Part B
        </div>

        {/* 🌟 Big hope star — above the 0 stat (clear of number/label) */}
        {frame > zeroDelay + 30 && frame < zeroDelay + 90 && (
          <div
            style={{
              position: "absolute",
              top: "22%",
              left: "75%",
              transform: `translate(-50%, -50%) scale(${interpolate(frame, [zeroDelay + 30, zeroDelay + 42, zeroDelay + 50], [0, 1.4, 1], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
              })}) rotate(${Math.sin((frame - zeroDelay - 30) * 0.1) * 15}deg)`,
              fontSize: 56,
              opacity: interpolate(frame, [zeroDelay + 30, zeroDelay + 45, zeroDelay + 80, zeroDelay + 90], [0, 1, 0.7, 0], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
              }),
              filter: "drop-shadow(0 0 20px rgba(52,211,153,0.7))",
              pointerEvents: "none",
              zIndex: 5,
            }}
          >
            🌟
          </div>
        )}

        {/* Continuation hint — appears after zero checkmark */}
        {frame > zeroDelay + 60 && frame < 290 && (
          <div
            style={{
              position: "absolute",
              bottom: 100,
              left: "50%",
              transform: `translateX(-50%) translateY(${Math.sin(frame * 0.15) * 3}px)`,
              display: "flex",
              alignItems: "center",
              gap: 8,
              fontSize: 12,
              fontFamily: "monospace",
              color: "#34d399",
              letterSpacing: "0.25em",
              fontWeight: 700,
              opacity: interpolate(frame, [zeroDelay + 60, zeroDelay + 80, 285, 295], [0, 0.65, 0.65, 0], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
              }),
              textShadow: "0 0 8px rgba(52,211,153,0.4)",
              zIndex: 4,
            }}
          >
            SOLUTION INCOMING
            <span style={{
              fontSize: 14,
              display: "inline-block",
              transform: `translateY(${Math.sin(frame * 0.2) * 2}px)`,
            }}>▾</span>
          </div>
        )}

        {/* Dramatic vignette — darkens edges for focus */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.4) 100%)",
            pointerEvents: "none",
          }}
        />

        {/* Header */}
        <div
          style={{
            fontSize: 28,
            fontFamily: "system-ui, sans-serif",
            fontWeight: 600,
            color: "#f87171",
            opacity: headerOpacity,
            transform: `scale(${0.8 + headerScale * 0.2})`,
            letterSpacing: "0.15em",
            textTransform: "uppercase",
            marginBottom: 70,
            textShadow: "0 0 30px rgba(248,113,113,0.3)",
            zIndex: 1,
            position: "relative",
            display: "flex",
            alignItems: "center",
            gap: 14,
          }}
        >
          {/* Pulsing warning triangle */}
          <span
            style={{
              fontSize: 24,
              opacity: 0.7 + Math.sin(frame * 0.15) * 0.25,
              filter: `drop-shadow(0 0 ${5 + Math.sin(frame * 0.15) * 3}px rgba(248,113,113,${0.4 + Math.sin(frame * 0.15) * 0.2}))`,
              transform: `scale(${1 + Math.sin(frame * 0.15) * 0.05})`,
              display: "inline-block",
            }}
          >
            ⚠
          </span>
          The Problem
          {/* Underline that extends after header appears */}
          <div
            style={{
              position: "absolute",
              bottom: -8,
              left: "50%",
              transform: "translateX(-50%)",
              width: interpolate(frame, [18, 45], [0, 180], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
              height: 1,
              background: "linear-gradient(90deg, transparent, #f8717166, transparent)",
              borderRadius: 1,
              opacity: frame > 45 ? 0.85 + Math.sin(frame * 0.06) * 0.15 : 1,
              boxShadow: frame > 45 ? `0 0 ${3 + Math.sin(frame * 0.06) * 2}px rgba(248,113,113,0.4)` : undefined,
            }}
          />
        </div>

        {/* Confused thought bubbles above students during stats */}
        {frame > 80 && frame < 195 && [
          { x: 80, content: "?" },
          { x: 200, content: "?" },
          { x: 1660, content: "?" },
        ].map((tb, ti) => {
          const cycle = (frame + ti * 25) % 60;
          const tbOp = interpolate(cycle, [0, 10, 50, 60], [0, 0.7, 0.3, 0]);
          return (
            <div
              key={`thought-${ti}`}
              style={{
                position: "absolute",
                bottom: 195,
                left: tb.x,
                fontSize: 18,
                color: "#f87171",
                fontWeight: 700,
                fontFamily: "Georgia, serif",
                opacity: tbOp * 0.7,
                textShadow: "0 0 6px rgba(248,113,113,0.4)",
                zIndex: 3,
              }}
            >
              {tb.content}
            </div>
          );
        })}

        {/* Hopeful checkmark above students when 0 stat hits */}
        {frame > zeroDelay + 25 && frame < 290 && [
          { x: 80 },
          { x: 200 },
          { x: 1660 },
        ].map((cm, ci) => {
          const cmF = frame - zeroDelay - 25 - ci * 4;
          if (cmF < 0) return null;
          return (
            <div
              key={`hopeful-${ci}`}
              style={{
                position: "absolute",
                bottom: 195,
                left: cm.x,
                fontSize: 20,
                color: "#34d399",
                fontWeight: 800,
                opacity: interpolate(cmF, [0, 8, 70, 80], [0, 1, 0.7, 0], {
                  extrapolateLeft: "clamp",
                  extrapolateRight: "clamp",
                }),
                transform: `scale(${interpolate(cmF, [0, 10, 14], [0, 1.4, 1], {
                  extrapolateLeft: "clamp",
                  extrapolateRight: "clamp",
                })})`,
                textShadow: "0 0 12px rgba(52,211,153,0.7)",
                zIndex: 3,
              }}
            >
              ✓
            </div>
          );
        })}

        {/* Pixel students — the learners affected */}
        <div style={{ position: "absolute", bottom: 60, left: 80, display: "flex", gap: 18, zIndex: 1 }}>
          <PixelCharacter type="studentBoy" pixelSize={4} enterDelay={50} phaseOffset={0} bobAmount={1} />
          <PixelCharacter type="studentGirl" pixelSize={4} enterDelay={60} phaseOffset={25} bobAmount={1} />
          <PixelCharacter type="wheelchair" pixelSize={4} enterDelay={70} phaseOffset={50} bobAmount={1} />
        </div>
        <div style={{ position: "absolute", bottom: 60, right: 80, display: "flex", gap: 18, zIndex: 1 }}>
          <PixelCharacter type="studentBoy" pixelSize={4} enterDelay={80} paletteKey="boyGreen" phaseOffset={35} bobAmount={1} />
          <PixelCharacter type="studentGirl" pixelSize={4} enterDelay={90} paletteKey="girlPurple" phaseOffset={60} bobAmount={1} />
        </div>

        <div style={{ display: "flex", gap: 30, alignItems: "flex-start", zIndex: 1 }}>
          {stats.map((stat, i) => {
            const progress = spring({
              frame: frame - stat.delay,
              fps,
              config: { damping: 18, stiffness: 80 },
            });
            const opacity = interpolate(frame, [stat.delay, stat.delay + 20], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            });
            const counterDone = interpolate(frame, [stat.delay, stat.delay + 30], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            });

            // Circular progress ring for percentage
            const isPercent = stat.value.includes("%");
            const percent = isPercent ? parseInt(stat.value) : 0;
            const circumference = 2 * Math.PI * 50;
            const strokeDash = circumference * (1 - (percent / 100) * counterDone);

            return (
              <div key={i} style={{ display: "flex", alignItems: "flex-start", flex: 1 }}>
                <div
                  style={{
                    textAlign: "center",
                    opacity,
                    transform: `translateY(${(1 - progress) * 40}px)`,
                    flex: 1,
                  }}
                >
                  {/* Category tag */}
                  <div
                    style={{
                      fontSize: 10,
                      fontFamily: "monospace",
                      color: stat.barColor,
                      letterSpacing: "0.3em",
                      opacity: interpolate(frame, [stat.delay + 5, stat.delay + 20], [0, 0.7], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
                      marginBottom: 10,
                      fontWeight: 700,
                    }}
                  >
                    ▸ {stat.tag}
                  </div>
                  {/* Error code flash */}
                  <div
                    style={{
                      fontSize: 8,
                      fontFamily: "monospace",
                      color: `${stat.barColor}88`,
                      letterSpacing: "0.2em",
                      opacity: interpolate(frame, [stat.delay + 35, stat.delay + 50], [0, 0.55], {
                        extrapolateLeft: "clamp",
                        extrapolateRight: "clamp",
                      }) * (0.85 + Math.sin(frame * 0.07 + i * 0.6) * 0.15),
                      marginBottom: 6,
                      fontWeight: 500,
                    }}
                  >
                    {stat.errCode}
                  </div>
                  {/* Circular progress for percentage stat */}
                  {isPercent && (
                    <div style={{ position: "relative", width: 120, height: 120, margin: "0 auto 16px" }}>
                      <svg width="120" height="120" viewBox="0 0 120 120" style={{ transform: "rotate(-90deg)" }}>
                        <circle cx="60" cy="60" r="50" stroke="rgba(255,255,255,0.06)" strokeWidth="6" fill="none" />
                        <circle
                          cx="60"
                          cy="60"
                          r="50"
                          stroke={stat.barColor}
                          strokeWidth="6"
                          fill="none"
                          strokeDasharray={circumference}
                          strokeDashoffset={strokeDash}
                          strokeLinecap="round"
                          style={{ filter: `drop-shadow(0 0 6px ${stat.barColor}88)` }}
                        />
                        {/* Glowing endpoint dot */}
                        {counterDone > 0.05 && (() => {
                          const endAngle = ((percent / 100) * counterDone) * Math.PI * 2;
                          const dotX = 60 + Math.cos(endAngle - Math.PI / 2) * 50;
                          const dotY = 60 + Math.sin(endAngle - Math.PI / 2) * 50;
                          return (
                            <circle
                              cx={dotX}
                              cy={dotY}
                              r={4}
                              fill={stat.barColor}
                              opacity={0.9}
                              style={{ filter: `drop-shadow(0 0 4px ${stat.barColor})` }}
                            />
                          );
                        })()}
                      </svg>
                      <div
                        style={{
                          position: "absolute",
                          inset: 0,
                          display: "flex",
                          justifyContent: "center",
                          alignItems: "center",
                          fontSize: 36,
                          fontWeight: 800,
                          fontFamily: "system-ui, sans-serif",
                          color: "#fbbf24",
                        }}
                      >
                        <AnimatedCounter target={stat.value} startFrame={stat.delay} />
                      </div>
                    </div>
                  )}

                  {/* Non-percent values */}
                  {!isPercent && (
                    <>
                      <div
                        style={{
                          width: 10,
                          height: 10,
                          borderRadius: "50%",
                          background: stat.barColor,
                          margin: "0 auto 20px",
                          opacity: counterDone,
                          boxShadow: `0 0 14px ${stat.barColor}88`,
                        }}
                      />
                      <div
                        style={{
                          fontSize: 76,
                          fontWeight: 800,
                          fontFamily: "system-ui, sans-serif",
                          color: "#fbbf24",
                          marginBottom: 16,
                          textShadow: counterDone >= 1
                            ? `0 0 ${40 + Math.sin((frame - stat.delay) * 0.05 + i) * 14}px rgba(251,191,36,${0.25 + Math.sin((frame - stat.delay) * 0.05 + i) * 0.12})`
                            : "0 0 40px rgba(251,191,36,0.25)",
                          transform: counterDone >= 1
                            ? `scale(${1 + Math.sin((frame - stat.delay) * 0.05 + i) * 0.012})`
                            : undefined,
                        }}
                      >
                        <AnimatedCounter target={stat.value} startFrame={stat.delay} />
                      </div>
                    </>
                  )}

                  <div
                    style={{
                      fontSize: 21,
                      fontFamily: "system-ui, sans-serif",
                      fontWeight: 400,
                      color: "#cbd5e1",
                      lineHeight: 1.55,
                      whiteSpace: "pre-line",
                    }}
                  >
                    {/* Highlight "until now" in green on the zero stat */}
                    {stat.value === "0" && stat.label.includes("until now") ? (
                      <>
                        {stat.label.replace(" — until now", "")}
                        <span
                          style={{
                            color: interpolate(frame, [stat.delay + 15, stat.delay + 22, stat.delay + 50], [0, 1, 1], {
                              extrapolateLeft: "clamp",
                              extrapolateRight: "clamp",
                            }) > 0.5 ? "#34d399" : "#cbd5e1",
                            fontWeight: 700,
                            textShadow: frame >= stat.delay + 15 && frame < stat.delay + 35
                              ? "0 0 12px rgba(52,211,153,0.5)"
                              : undefined,
                          }}
                        >
                          {" — until now"}
                        </span>
                        {/* Checkmark pop after green flash */}
                        <span
                          style={{
                            display: "inline-block",
                            marginLeft: 8,
                            color: "#34d399",
                            fontSize: 24,
                            opacity: interpolate(frame, [stat.delay + 30, stat.delay + 40], [0, 1], {
                              extrapolateLeft: "clamp",
                              extrapolateRight: "clamp",
                            }),
                            transform: `scale(${interpolate(frame, [stat.delay + 30, stat.delay + 40, stat.delay + 50], [0, 1.3, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })})`,
                            textShadow: "0 0 10px rgba(52,211,153,0.6)",
                          }}
                        >
                          ✓
                        </span>
                      </>
                    ) : stat.label}
                  </div>

                  {/* Bottom accent bar */}
                  <div
                    style={{
                      width: interpolate(counterDone, [0, 1], [0, 90]),
                      height: 2,
                      background: `linear-gradient(90deg, transparent, ${stat.barColor}, transparent)`,
                      margin: "20px auto 0",
                      borderRadius: 1,
                    }}
                  />

                  {/* Severity meter — 5 bars showing intensity */}
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "center",
                      gap: 3,
                      marginTop: 8,
                      opacity: interpolate(frame, [stat.delay + 22, stat.delay + 38], [0, 0.7], {
                        extrapolateLeft: "clamp",
                        extrapolateRight: "clamp",
                      }),
                    }}
                  >
                    {Array.from({ length: 3 }, (_, bi) => {
                      const isLit = bi < stat.severity;
                      const litPulse = isLit ? 0.85 + Math.sin(frame * 0.1 + bi * 0.8 + i * 0.5) * 0.15 : 1;
                      return (
                        <div
                          key={bi}
                          style={{
                            width: 18,
                            height: 3,
                            borderRadius: 1,
                            background: isLit ? stat.barColor : `${stat.barColor}22`,
                            boxShadow: isLit ? `0 0 4px ${stat.barColor}66` : undefined,
                            opacity: litPulse,
                          }}
                        />
                      );
                    })}
                  </div>

                  {/* Year/source label */}
                  <div
                    style={{
                      fontSize: 9,
                      fontFamily: "monospace",
                      color: stat.barColor,
                      letterSpacing: "0.25em",
                      marginTop: 12,
                      opacity: interpolate(frame, [stat.delay + 25, stat.delay + 45], [0, 0.5], {
                        extrapolateLeft: "clamp",
                        extrapolateRight: "clamp",
                      }) * (0.85 + Math.sin(frame * 0.06 + i * 0.5) * 0.15),
                      fontWeight: 600,
                      textShadow: `0 0 ${3 + Math.sin(frame * 0.06 + i * 0.5) * 2}px ${stat.barColor}44`,
                    }}
                  >
                    {stat.year}
                  </div>
                </div>

                {/* Vertical divider with flowing energy dot */}
                {i < stats.length - 1 && (
                  <div
                    style={{
                      width: 1,
                      height: 200,
                      background: "linear-gradient(180deg, transparent, rgba(255,255,255,0.12), transparent)",
                      opacity: dividerOpacity * (0.85 + Math.sin(frame * 0.05 + i * 0.5) * 0.15),
                      position: "relative",
                      marginTop: 20,
                    }}
                  >
                    {/* Flowing energy dot along divider */}
                    {dividerOpacity > 0.05 && (() => {
                      const dotY = ((frame * 1.5 + i * 60) % 200);
                      const dotOp = interpolate(dotY, [0, 20, 180, 200], [0, 0.6, 0.6, 0]);
                      return (
                        <div
                          style={{
                            position: "absolute",
                            left: -2,
                            top: dotY,
                            width: 5,
                            height: 5,
                            borderRadius: "50%",
                            background: stats[i + 1]?.barColor || "#fbbf24",
                            opacity: dotOp * dividerOpacity,
                            boxShadow: `0 0 6px ${stats[i + 1]?.barColor || "#fbbf24"}66`,
                          }}
                        />
                      );
                    })()}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </AbsoluteFill>
    </SceneTransition>
  );
};
