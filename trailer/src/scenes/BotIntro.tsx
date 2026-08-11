import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig } from "remotion";
import { AlloBot } from "../components/AlloBot";
import { Constellation } from "../components/Constellation";
import { HexGrid } from "../components/HexGrid";
import { OrbitRing } from "../components/OrbitRing";
import { SpeedLines } from "../components/SpeedLines";
import { PixelCharacter, PixelAlloBot, ScanlineOverlay } from "../components/PixelCharacters";

export const BotIntro: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // AlloBot flies in from far right with arc trajectory
  const flyProgress = interpolate(frame, [0, 50], [0, 1], { extrapolateRight: "clamp" });
  const botX = interpolate(flyProgress, [0, 0.3, 0.7, 1], [1200, 400, -50, 0]);
  const botY = interpolate(flyProgress, [0, 0.3, 0.5, 0.7, 1], [200, -40, -80, -40, 0]);
  const botRotation = interpolate(flyProgress, [0, 0.3, 0.7, 1], [-15, -5, 3, 0]);
  const botScale = interpolate(flyProgress, [0, 0.5, 1], [0.4, 0.8, 1], { extrapolateRight: "clamp" });

  // Landing bounce
  const landBounce = frame > 50
    ? spring({ frame: frame - 50, fps, config: { damping: 6, stiffness: 150 } })
    : 0;
  const bounceY = (1 - landBounce) * -30;

  // Sparkle burst on landing
  const sparkles = Array.from({ length: 14 }, (_, i) => {
    const angle = (i / 14) * Math.PI * 2;
    const sparkleProgress = interpolate(frame, [48, 78], [0, 1], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    });
    const r = sparkleProgress * (70 + (i % 4) * 20);
    const opacity = interpolate(sparkleProgress, [0, 0.25, 1], [0, 1, 0]);
    const colors = ["#60a5fa", "#34d399", "#a78bfa", "#fbbf24", "#f472b6", "#06b6d4", "#8b5cf6"];
    return {
      x: Math.cos(angle) * r,
      y: Math.sin(angle) * r,
      opacity,
      color: colors[i % 7],
      size: 3 + (i % 4) * 3,
    };
  });

  // Trail particles behind AlloBot during flight
  const trails = Array.from({ length: 8 }, (_, i) => {
    const trailFrame = frame - i * 3;
    const trailFly = interpolate(trailFrame, [0, 50], [0, 1], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    });
    const tx = interpolate(trailFly, [0, 0.3, 0.7, 1], [1200, 400, -50, 0]);
    const ty = interpolate(trailFly, [0, 0.3, 0.5, 0.7, 1], [200, -40, -80, -40, 0]);
    const opacity = frame < 50 ? interpolate(i, [0, 7], [0.7, 0.05]) : 0;
    const colors = ["#8b5cf6", "#06b6d4"];
    return { x: tx, y: ty, opacity, size: 10 - i, color: colors[i % 2] };
  });

  // Sparkle trail — twinkling stars left along flight path
  const sparkleTrail = Array.from({ length: 12 }, (_, i) => {
    const spawnFrame = 5 + i * 3.5;
    const spawnFly = interpolate(spawnFrame, [0, 50], [0, 1], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    });
    const sx = interpolate(spawnFly, [0, 0.3, 0.7, 1], [1200, 400, -50, 0]);
    const sy = interpolate(spawnFly, [0, 0.3, 0.5, 0.7, 1], [200, -40, -80, -40, 0]);
    const age = frame - spawnFrame;
    const sparkleOpacity = age > 0 ? interpolate(age, [0, 8, 50, 80], [0, 0.8, 0.3, 0]) : 0;
    const twinkle = age > 0 ? Math.sin(age * 0.3 + i * 2) * 0.3 + 0.7 : 0;
    const colors = ["#FACC15", "#60a5fa", "#34d399", "#f472b6", "#a78bfa", "#06b6d4"];
    return {
      x: sx + (i % 3 - 1) * 8,
      y: sy + (i % 2 === 0 ? -5 : 5),
      opacity: sparkleOpacity * twinkle,
      size: 3 + (i % 3) * 2,
      color: colors[i % 6],
      isSquare: i % 4 === 0,
    };
  });

  // Background flash on arrival
  const flashOpacity = interpolate(frame, [48, 52, 60], [0, 0.18, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Shockwave ring on landing
  const shockScale = interpolate(frame, [49, 70], [0, 5], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const shockOpacity = interpolate(frame, [49, 55, 70], [0.4, 0.2, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // Text appears after landing
  const meetOpacity = interpolate(frame, [62, 75], [0, 1], { extrapolateRight: "clamp" });
  const meetY = frame > 62
    ? spring({ frame: frame - 62, fps, config: { damping: 18, stiffness: 80 } })
    : 0;

  const nameOpacity = interpolate(frame, [72, 85], [0, 1], { extrapolateRight: "clamp" });
  const nameScale = spring({ frame: frame - 72, fps, config: { damping: 10, stiffness: 100 } });

  // Subtitle
  const subOpacity = interpolate(frame, [88, 102], [0, 1], { extrapolateRight: "clamp" });

  // Screen-shake on landing — micro-jitter that decays quickly
  const shakeActive = frame >= 48 && frame <= 58;
  const shakeDecay = shakeActive ? interpolate(frame, [48, 58], [1, 0], { extrapolateRight: "clamp" }) : 0;
  const shakeX = shakeActive ? Math.sin(frame * 11) * 3 * shakeDecay : 0;
  const shakeY = shakeActive ? Math.cos(frame * 13) * 2 * shakeDecay : 0;

  // Fade out everything at end
  const exitOpacity = interpolate(frame, [135, 150], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        background: `linear-gradient(${135 + Math.sin(frame * 0.013) * 6}deg, #0f172a 0%, #0c1929 50%, #0f172a 100%)`,
        justifyContent: "center",
        alignItems: "center",
        opacity: exitOpacity,
        transform: `translate(${shakeX}px, ${shakeY}px)`,
      }}
    >
      <HexGrid color="#8b5cf6" opacity={0.03} pulseSpeed={0.04} />

      {/* Chapter marker — top-left corner */}
      <div
        style={{
          position: "absolute",
          top: 55,
          left: 100,
          display: "flex",
          alignItems: "baseline",
          gap: 8,
          opacity: interpolate(frame, [75, 95], [0, 0.45], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
          zIndex: 4,
        }}
      >
        <span style={{
          fontSize: 20,
          fontFamily: "Georgia, serif",
          fontStyle: "italic",
          fontWeight: 400,
          color: "#8b5cf6",
          letterSpacing: "0.1em",
          display: "inline-block",
          transform: `scale(${interpolate(frame, [75, 92], [0.6, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })})`,
        }}>
          I.
        </span>
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <span style={{
            fontSize: 9,
            fontFamily: "monospace",
            color: "#64748b",
            letterSpacing: "0.3em",
            fontWeight: 700,
          }}>
            INTRODUCTION
          </span>
          <span style={{
            fontSize: 7,
            fontFamily: "monospace",
            color: "#475569",
            letterSpacing: "0.2em",
            fontWeight: 500,
          }}>
            01 / 09 · 5.0s
          </span>
        </div>
      </div>

      {/* Cinema-scope ratio indicator — bottom-left */}
      <div
        style={{
          position: "absolute",
          bottom: 60,
          left: 80,
          fontSize: 9,
          fontFamily: "monospace",
          color: "#64748b",
          letterSpacing: "0.2em",
          opacity: interpolate(frame, [85, 115, 140, 150], [0, 0.4, 0.4, 0], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          }),
          display: "flex",
          alignItems: "center",
          gap: 8,
          zIndex: 4,
        }}
      >
        <span style={{ fontSize: 11, color: "#8b5cf6" }}>◷</span>
        16:9 · 30fps · 1080p HD
      </div>

      {/* Boot sequence progress indicator — right side */}
      <div
        style={{
          position: "absolute",
          top: 90,
          right: 100,
          display: "flex",
          flexDirection: "column",
          gap: 5,
          alignItems: "flex-end",
          fontSize: 9,
          fontFamily: "monospace",
          color: "#64748b",
          letterSpacing: "0.15em",
          opacity: interpolate(frame, [50, 80, 130, 150], [0, 0.5, 0.5, 0], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          }),
          zIndex: 4,
        }}
      >
        {[
          { label: "SYSTEMS", step: 52, color: "#8b5cf6" },
          { label: "SENSORS", step: 62, color: "#60a5fa" },
          { label: "VOICE AI", step: 72, color: "#34d399" },
          { label: "READY", step: 82, color: "#fbbf24" },
        ].map((item, si) => {
          const active = frame >= item.step;
          // Pop scale on activation (5 frames after step), then settle
          const popScale = active
            ? interpolate(frame, [item.step, item.step + 5, item.step + 10], [1, 1.4, 1], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
              })
            : 1;
          return (
            <div key={si} style={{ display: "flex", alignItems: "center", gap: 6, opacity: active ? 1 : 0.3 }}>
              <span style={{
                color: active ? item.color : "#64748b",
                display: "inline-block",
                transform: `scale(${popScale})`,
                textShadow: active ? `0 0 ${4 + Math.sin(frame * 0.1 + si) * 2}px ${item.color}66` : undefined,
              }}>{active ? "✓" : "○"}</span>
              <span>{item.label}</span>
            </div>
          );
        })}
      </div>

      {/* Corner decorative frame lines */}
      {[
        { top: 80, left: 80, w: 40, h: 40, borderTop: "1px solid rgba(139,92,246,0.3)", borderLeft: "1px solid rgba(139,92,246,0.3)" },
        { top: 80, right: 80, w: 40, h: 40, borderTop: "1px solid rgba(6,182,212,0.3)", borderRight: "1px solid rgba(6,182,212,0.3)" },
        { bottom: 80, left: 80, w: 40, h: 40, borderBottom: "1px solid rgba(6,182,212,0.3)", borderLeft: "1px solid rgba(6,182,212,0.3)" },
        { bottom: 80, right: 80, w: 40, h: 40, borderBottom: "1px solid rgba(139,92,246,0.3)", borderRight: "1px solid rgba(139,92,246,0.3)" },
      ].map((pos, fi) => (
        <div
          key={`scene-frame-${fi}`}
          style={{
            position: "absolute",
            ...pos,
            width: pos.w,
            height: pos.h,
            opacity: interpolate(frame, [55, 85], [0, 0.7], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })
              * (0.85 + Math.sin(frame * 0.05 + fi * Math.PI / 2) * 0.15),
            pointerEvents: "none",
            zIndex: 3,
          }}
        />
      ))}
      <Constellation nodeCount={30} color="#60a5fa" connectionDistance={180} />

      {/* Speed lines during flight */}
      <SpeedLines count={25} color="#8b5cf6" direction="left" active={frame < 52} />

      {/* Flash overlay */}
      <AbsoluteFill style={{ background: "#8b5cf6", opacity: flashOpacity }} />

      {/* Shockwave ring */}
      <div
        style={{
          position: "absolute",
          width: 100,
          height: 100,
          borderRadius: "50%",
          border: "3px solid #8b5cf6",
          transform: `scale(${shockScale})`,
          opacity: shockOpacity,
        }}
      />

      {/* Radial speed-burst lines on landing impact */}
      {frame >= 48 && frame < 65 && Array.from({ length: 12 }, (_, i) => {
        const angle = (i / 12) * Math.PI * 2;
        const burstF = frame - 48;
        const innerR = interpolate(burstF, [0, 12], [20, 100], { extrapolateRight: "clamp" });
        const outerR = interpolate(burstF, [0, 15], [40, 200], { extrapolateRight: "clamp" });
        const bOp = interpolate(burstF, [0, 3, 17], [0, 0.7, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
        const x1 = Math.cos(angle) * innerR;
        const y1 = Math.sin(angle) * innerR;
        const x2 = Math.cos(angle) * outerR;
        const y2 = Math.sin(angle) * outerR;
        return (
          <svg
            key={`burst-${i}`}
            width="500"
            height="500"
            style={{
              position: "absolute",
              left: "calc(50% - 250px)",
              top: "calc(42% - 250px)",
              pointerEvents: "none",
            }}
          >
            <line
              x1={250 + x1}
              y1={250 + y1}
              x2={250 + x2}
              y2={250 + y2}
              stroke="#8b5cf6"
              strokeWidth="1.5"
              opacity={bOp}
              strokeLinecap="round"
            />
          </svg>
        );
      })}

      {/* Landing dust puff — poofs at AlloBot's feet on impact */}
      {frame >= 48 && frame < 80 && Array.from({ length: 10 }, (_, di) => {
        const dustF = frame - 48 - di * 1.5;
        if (dustF < 0 || dustF > 32) return null;
        const angle = (di / 10) * Math.PI + (di % 2 === 0 ? 0.1 : -0.1);
        const r = interpolate(dustF, [0, 28], [10, 90 + (di % 3) * 15], { extrapolateRight: "clamp" });
        const dOp = interpolate(dustF, [0, 4, 25, 32], [0, 0.35, 0.15, 0], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });
        const dSize = 8 + dustF * 0.3;
        return (
          <div
            key={`dust-${di}`}
            style={{
              position: "absolute",
              left: `calc(50% + ${Math.cos(angle) * r}px)`,
              top: `calc(42% + ${Math.abs(Math.sin(angle)) * 80 + dustF * 0.3}px)`,
              width: dSize,
              height: dSize,
              borderRadius: "50%",
              background: "radial-gradient(circle, rgba(167,139,250,0.3), transparent 70%)",
              opacity: dOp,
              filter: "blur(3px)",
              pointerEvents: "none",
            }}
          />
        );
      })}

      {/* Sparkle trail — twinkling stars along flight arc */}
      {sparkleTrail.map((sp, i) => (
        <div
          key={`sparkle-trail-${i}`}
          style={{
            position: "absolute",
            left: `calc(50% + ${sp.x}px)`,
            top: `calc(42% + ${sp.y}px - 50px)`,
            width: sp.size,
            height: sp.size,
            borderRadius: sp.isSquare ? "1px" : "50%",
            background: sp.color,
            opacity: sp.opacity,
            transform: sp.isSquare ? `rotate(${frame * 4 + i * 30}deg)` : undefined,
            boxShadow: `0 0 ${sp.size * 3}px ${sp.color}88`,
          }}
        />
      ))}

      {/* Flight trails */}
      {trails.map((trail, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            left: `calc(50% + ${trail.x}px)`,
            top: `calc(50% + ${trail.y}px - 50px)`,
            width: trail.size,
            height: trail.size,
            borderRadius: "50%",
            background: trail.color,
            opacity: trail.opacity,
            filter: `blur(${Math.max(0, i - 1)}px)`,
            boxShadow: `0 0 ${trail.size * 2}px ${trail.color}66`,
          }}
        />
      ))}

      {/* Orbit ring of tool icons (appears after landing) */}
      <div
        style={{
          position: "absolute",
          left: "calc(50% - 180px)",
          top: "calc(42% - 180px)",
          opacity: interpolate(frame, [58, 80], [0, 0.7], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
          zIndex: 1,
          filter: `hue-rotate(${Math.sin(frame * 0.02) * 25}deg)`,
        }}
      >
        <OrbitRing
          icons={["🔬", "💬", "📊", "⚔️", "🔊", "📝", "🧠", "🎮", "📈", "🌍"]}
          radius={180}
          speed={0.6}
          enterDelay={55}
          color="#8b5cf6"
        />
      </div>

      {/* Ambient glow behind AlloBot after landing */}
      {frame > 50 && (
        <div
          style={{
            position: "absolute",
            left: "50%",
            top: "42%",
            transform: "translate(-50%, -50%)",
            width: 320,
            height: 320,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(139,92,246,0.18), rgba(96,165,250,0.08) 50%, transparent 70%)",
            opacity: interpolate(frame, [50, 75], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })
              * (0.7 + Math.sin(frame * 0.06) * 0.15),
            filter: "blur(15px)",
            pointerEvents: "none",
            zIndex: 1,
          }}
        />
      )}

      {/* Speech bubble near AlloBot */}
      {frame > 95 && frame < 135 && (
        <div
          style={{
            position: "absolute",
            left: "calc(50% + 150px)",
            top: "calc(42% - 80px)",
            padding: "8px 16px",
            borderRadius: 18,
            background: "rgba(139,92,246,0.2)",
            border: "1px solid rgba(139,92,246,0.5)",
            fontSize: 18,
            fontFamily: "system-ui, sans-serif",
            fontWeight: 600,
            color: "#ffffff",
            opacity: interpolate(frame, [95, 105, 128, 135], [0, 1, 1, 0], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            }),
            transform: `translateY(${interpolate(frame, [95, 110], [10, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) + (frame > 110 ? Math.sin((frame - 110) * 0.18) * 2 : 0)}px)`,
            boxShadow: "0 4px 20px rgba(139,92,246,0.3)",
            zIndex: 4,
          }}
        >
          👋 Hi there!
          {/* Bubble tail */}
          <div
            style={{
              position: "absolute",
              left: -8,
              bottom: 10,
              width: 0,
              height: 0,
              borderTop: "8px solid transparent",
              borderBottom: "8px solid transparent",
              borderRight: "8px solid rgba(139,92,246,0.5)",
            }}
          />
        </div>
      )}

      {/* AlloBot */}
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: "42%",
          transform: `translate(calc(-50% + ${botX}px), calc(-50% + ${botY + bounceY}px)) rotate(${botRotation}deg) scale(${botScale})`,
          zIndex: 2,
        }}
      >
        <AlloBot size={240} />
      </div>

      {/* Scanning beam — AlloBot analyzing after landing */}
      {frame > 60 && frame < 100 && (
        <>
          <div
            style={{
              position: "absolute",
              left: "50%",
              top: "42%",
              transform: "translate(-50%, -50%)",
              width: interpolate(frame, [60, 72, 95, 100], [0, 350, 350, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
              height: 2,
              background: "linear-gradient(90deg, transparent, #8b5cf644, #8b5cf6, #8b5cf644, transparent)",
              opacity: interpolate(frame, [60, 65, 90, 100], [0, 0.5, 0.3, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
              boxShadow: "0 0 15px #8b5cf644, 0 0 30px #8b5cf622",
              pointerEvents: "none",
              zIndex: 3,
            }}
          />
          {/* ONLINE status indicator */}
          <div
            style={{
              position: "absolute",
              left: "50%",
              top: "calc(42% + 140px)",
              transform: "translateX(-50%)",
              display: "flex",
              alignItems: "center",
              gap: 6,
              fontSize: 10,
              fontFamily: "monospace",
              color: "#34d399",
              letterSpacing: "0.2em",
              fontWeight: 700,
              opacity: interpolate(frame, [75, 88, 95, 100], [0, 0.7, 0.7, 0], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
              }),
              zIndex: 3,
            }}
          >
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: "#34d399",
                opacity: 0.5 + Math.sin(frame * 0.28) * 0.45,
                boxShadow: `0 0 ${4 + Math.sin(frame * 0.28) * 3}px #34d399`,
              }}
            />
            ONLINE
          </div>
        </>
      )}

      {/* Landing sparkles */}
      {sparkles.map((s, i) => (
        <div
          key={`sparkle-${i}`}
          style={{
            position: "absolute",
            left: `calc(50% + ${s.x}px)`,
            top: `calc(42% + ${s.y}px)`,
            width: s.size,
            height: s.size,
            borderRadius: s.size > 7 ? "2px" : "50%",
            background: s.color,
            opacity: s.opacity,
            transform: s.size > 7 ? `rotate(${frame * 6}deg)` : undefined,
            boxShadow: `0 0 ${s.size * 2}px ${s.color}`,
          }}
        />
      ))}

      {/* Excited reaction emojis above pixel students */}
      {frame > 70 && [
        { x: -180, emoji: "✨", delay: 70 },
        { x: -100, emoji: "🤩", delay: 78 },
        { x: -30, emoji: "❤️", delay: 86 },
        { x: 50, emoji: "👀", delay: 80 },
        { x: 130, emoji: "🌟", delay: 90 },
      ].map((re, ri) => {
        const reF = frame - re.delay;
        if (reF < 0) return null;
        const op = interpolate(reF, [0, 8, 50, 65], [0, 1, 0.8, 0], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });
        const scale = interpolate(reF, [0, 8, 14], [0, 1.3, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });
        const driftY = Math.sin(reF * 0.1 + ri) * 3;
        return (
          <div
            key={`reaction-${ri}`}
            style={{
              position: "absolute",
              bottom: 165,
              left: `calc(50% + ${re.x}px)`,
              fontSize: 22,
              opacity: op * 0.9,
              transform: `scale(${scale}) translateY(${driftY}px)`,
              pointerEvents: "none",
              zIndex: 5,
              filter: "drop-shadow(0 0 6px rgba(255,255,255,0.3))",
            }}
          >
            {re.emoji}
          </div>
        );
      })}

      {/* Pixel students watching in awe — appear after AlloBot lands */}
      <div
        style={{
          position: "absolute",
          bottom: 55,
          left: "50%",
          transform: "translateX(-50%)",
          display: "flex",
          alignItems: "flex-end",
          gap: 20,
          zIndex: 1,
          opacity: interpolate(frame, [58, 78], [0, 0.55], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          }),
        }}
      >
        <PixelCharacter type="studentGirl" pixelSize={4} enterDelay={60} bobAmount={1.5} phaseOffset={0} />
        <PixelCharacter type="studentBoy" pixelSize={4} enterDelay={65} bobAmount={1.5} phaseOffset={20} />
        <PixelAlloBot pixelSize={4} enterDelay={72} />
        <PixelCharacter type="wheelchair" pixelSize={4} enterDelay={70} bobAmount={1.5} phaseOffset={40} />
        <PixelCharacter type="studentBoy" pixelSize={4} enterDelay={75} paletteKey="boyGreen" bobAmount={1.5} phaseOffset={60} />
        <PixelCharacter type="studentGirl" pixelSize={4} enterDelay={80} paletteKey="girlPurple" bobAmount={1.5} phaseOffset={80} />
      </div>

      {/* Text */}
      <div
        style={{
          position: "absolute",
          bottom: 150,
          textAlign: "center",
          zIndex: 1,
          padding: "0 80px",
        }}
      >
        {/* Framing corner brackets around text block */}
        {[
          { top: -8, left: -8, borderTop: "1.5px solid rgba(139,92,246,0.4)", borderLeft: "1.5px solid rgba(139,92,246,0.4)" },
          { top: -8, right: -8, borderTop: "1.5px solid rgba(6,182,212,0.4)", borderRight: "1.5px solid rgba(6,182,212,0.4)" },
          { bottom: -8, left: -8, borderBottom: "1.5px solid rgba(6,182,212,0.4)", borderLeft: "1.5px solid rgba(6,182,212,0.4)" },
          { bottom: -8, right: -8, borderBottom: "1.5px solid rgba(139,92,246,0.4)", borderRight: "1.5px solid rgba(139,92,246,0.4)" },
        ].map((pos, bi) => (
          <div
            key={`intro-bracket-${bi}`}
            style={{
              position: "absolute",
              width: 16,
              height: 16,
              ...pos,
              opacity: interpolate(frame, [80, 100], [0, 0.6], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
            }}
          />
        ))}
        <div
          style={{
            fontSize: 38,
            fontFamily: "system-ui, sans-serif",
            fontWeight: 300,
            color: "#94a3b8",
            opacity: meetOpacity,
            transform: `translateY(${(1 - meetY) * 15}px)`,
            letterSpacing: "0.15em",
          }}
        >
          {"meet".split("").map((ch, ci) => {
            const chDelay = 62 + ci * 3;
            const chOp = interpolate(frame, [chDelay, chDelay + 8], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            });
            // Settled letter wobble
            const settledY = frame > chDelay + 10 ? Math.sin(frame * 0.06 + ci * 0.5) * 0.8 : 0;
            return (
              <span key={ci} style={{
                display: "inline-block",
                opacity: chOp,
                transform: `translateY(${settledY}px)`,
              }}>
                {ch}
              </span>
            );
          })}
        </div>
        <div
          style={{
            fontSize: 70,
            fontFamily: "system-ui, sans-serif",
            fontWeight: 700,
            opacity: nameOpacity,
            transform: `scale(${nameScale})`,
            position: "relative",
            display: "inline-block",
          }}
        >
          <span
            style={{
              display: "inline-block",
              backgroundImage: `linear-gradient(${135 + Math.sin(frame * 0.02) * 12}deg, #8b5cf6, #06b6d4, #8b5cf6)`,
              backgroundSize: "200% 200%",
              backgroundPosition: `${(frame * 0.5) % 200}% 50%`,
              backgroundClip: "text",
              WebkitBackgroundClip: "text",
              color: "transparent",
              WebkitTextFillColor: "transparent",
              textShadow: "none",
            }}
          >
            AlloBot
          </span>
          {/* Name reveal underline sweep — gentle breath after it lands */}
          <div
            style={{
              position: "absolute",
              bottom: -4,
              left: "50%",
              transform: `translateX(-50%) scaleX(${frame > 100 ? 1 + Math.sin(frame * 0.05) * 0.04 : 1})`,
              width: interpolate(frame, [78, 100], [0, 220], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
              height: 3,
              background: `linear-gradient(${90 + Math.sin(frame * 0.03) * 6}deg, transparent, #8b5cf6, #06b6d4, transparent)`,
              borderRadius: 2,
              opacity: frame > 100 ? 0.85 + Math.sin(frame * 0.05) * 0.15 : 1,
              boxShadow: `0 0 ${8 + (frame > 100 ? Math.sin(frame * 0.05) * 3 : 0)}px rgba(139,92,246,0.3)`,
            }}
          />
        </div>
        <div
          style={{
            fontSize: 20,
            fontFamily: "system-ui, sans-serif",
            fontWeight: 400,
            color: "#64748b",
            marginTop: 6,
          }}
        >
          {["Your", "AI", "learning", "companion"].map((word, wi) => {
            const wDelay = 88 + wi * 4;
            const wOp = interpolate(frame, [wDelay, wDelay + 12], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            });
            const wY = interpolate(frame, [wDelay, wDelay + 12], [6, 0], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            });
            // Once landed, gentle continuous Y-bob
            const settledBob = frame > wDelay + 14 ? Math.sin(frame * 0.05 + wi * 0.7) * 1 : 0;
            return (
              <span
                key={wi}
                style={{
                  display: "inline-block",
                  opacity: wOp * subOpacity,
                  transform: `translateY(${wY + settledBob}px)`,
                  marginRight: 8,
                }}
              >
                {word}
              </span>
            );
          })}
        </div>
        {/* Quick stat ticker chips */}
        <div
          style={{
            display: "flex",
            gap: 10,
            marginTop: 14,
            justifyContent: "center",
            opacity: interpolate(frame, [100, 115], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            }),
          }}
        >
          {[
            { label: "100+ Tools", color: "#60a5fa" },
            { label: "AI-Powered", color: "#a78bfa" },
            { label: "Free & Open", color: "#34d399" },
          ].map((chip, ci) => {
            const chipPulse = Math.sin(frame * 0.08 + ci * 1.3) * 0.3 + 0.5;
            return (
              <div
                key={ci}
                style={{
                  padding: "4px 12px",
                  borderRadius: 12,
                  background: `${chip.color}12`,
                  border: `1px solid ${chip.color}33`,
                  fontSize: 12,
                  fontFamily: "system-ui, sans-serif",
                  fontWeight: 500,
                  color: chip.color,
                  opacity: interpolate(frame, [102 + ci * 5, 112 + ci * 5], [0, 1], {
                    extrapolateLeft: "clamp",
                    extrapolateRight: "clamp",
                  }),
                  transform: `translateY(${interpolate(frame, [102 + ci * 5, 112 + ci * 5], [8, 0], {
                    extrapolateLeft: "clamp",
                    extrapolateRight: "clamp",
                  }) + (frame > 115 ? Math.sin((frame + ci * 20) * 0.06) * 1.5 : 0)}px)`,
                  boxShadow: `inset 0 0 8px ${chip.color}${Math.round(chipPulse * 30).toString(16).padStart(2, "0")}, 0 0 6px ${chip.color}${Math.round(chipPulse * 20).toString(16).padStart(2, "0")}`,
                }}
              >
                {chip.label}
              </div>
            );
          })}
        </div>
      </div>

      <ScanlineOverlay opacity={0.02} lineGap={4} />
    </AbsoluteFill>
  );
};
