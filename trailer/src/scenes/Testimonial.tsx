import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig } from "remotion";
import { StarField } from "../components/StarField";
import { EnergyOrb } from "../components/EnergyOrb";
import { SceneTransition } from "../components/SceneTransition";
import { PixelCharacter } from "../components/PixelCharacters";

const TypewriterText: React.FC<{
  text: string;
  startFrame: number;
  charsPerFrame?: number;
  style?: React.CSSProperties;
}> = ({ text, startFrame, charsPerFrame = 0.8, style }) => {
  const frame = useCurrentFrame();
  const f = frame - startFrame;
  if (f < 0) return null;

  const visibleChars = Math.min(Math.floor(f * charsPerFrame), text.length);
  const visibleText = text.slice(0, visibleChars);
  const cursorVisible = visibleChars < text.length;
  // Smooth sine-wave blink — fades in/out organically rather than hard on/off
  const cursorOpacity = cursorVisible ? Math.max(0.15, Math.sin(f * 0.4) * 0.5 + 0.5) : 0;

  // Shimmer sweep — a bright highlight band that follows the typing cursor
  const shimmerX = interpolate(visibleChars, [0, text.length], [0, 100], {
    extrapolateRight: "clamp",
  });

  return (
    <span style={{ ...style, position: "relative", display: "inline" }}>
      {visibleText}
      {cursorVisible && (
        <span style={{ opacity: cursorOpacity, color: "#60a5fa" }}>|</span>
      )}
      {/* Shimmer highlight that travels with cursor */}
      {visibleChars > 0 && visibleChars < text.length && (
        <span
          style={{
            position: "absolute",
            inset: 0,
            pointerEvents: "none",
            background: `linear-gradient(90deg, transparent ${shimmerX - 8}%, rgba(96,165,250,0.12) ${shimmerX - 3}%, rgba(255,255,255,0.08) ${shimmerX}%, rgba(96,165,250,0.12) ${shimmerX + 3}%, transparent ${shimmerX + 8}%)`,
            borderRadius: 4,
          }}
        />
      )}
    </span>
  );
};

export const Testimonial: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Quote marks
  const quoteScale = spring({ frame: frame - 8, fps, config: { damping: 12, stiffness: 80 } });
  const quoteOpacity = interpolate(frame, [8, 25], [0, 0.15], { extrapolateRight: "clamp" });

  // Floating light motes — gentle particles that drift slowly
  const motes = Array.from({ length: 12 }, (_, i) => {
    const seed = i * 37 + 11;
    const sx = ((Math.sin(seed) * 49297) % 1800 + 1800) % 1800 + 60;
    const speed = 0.3 + (i % 4) * 0.15;
    const yBase = 1080 - ((frame * speed + i * 90) % 1200);
    const xDrift = Math.sin(frame * 0.02 + i * 2) * 30;
    const moteOpacity = interpolate(yBase, [50, 200, 900, 1080], [0, 0.12, 0.15, 0], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    });
    const colors = ["#60a5fa", "#34d399", "#a78bfa"];
    return { x: sx + xDrift, y: yBase, opacity: moteOpacity, size: 3 + (i % 3) * 2, color: colors[i % 3] };
  });

  // Attribution — appears after quote finishes typing
  const attrOpacity = interpolate(frame, [175, 195], [0, 1], { extrapolateRight: "clamp" });
  const attrY = spring({ frame: frame - 175, fps, config: { damping: 18, stiffness: 80 } });

  // Divider
  const dividerWidth = interpolate(frame, [165, 195], [0, 120], { extrapolateRight: "clamp" });

  // Typing pulse — soft glow that pulses in rhythm with the typewriter
  const quoteText = "What if every student had access to the same caliber of tools — regardless of their school's budget?";
  const charsVisible = Math.min(Math.floor((frame - 15) * 0.65), quoteText.length);
  const isTyping = frame >= 15 && charsVisible < quoteText.length;
  const typingPulse = isTyping ? Math.sin(frame * 0.5) * 0.15 + 0.2 : 0;
  const typingDone = charsVisible >= quoteText.length;
  const completionFrame = Math.ceil(15 + quoteText.length / 0.65);
  const completionGlow = typingDone
    ? interpolate(frame, [completionFrame, completionFrame + 20], [0, 0.12], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      })
    : 0;

  // Completion sparkle burst — particles fly outward when quote finishes
  const completionSparkles = Array.from({ length: 16 }, (_, i) => {
    const angle = (i / 16) * Math.PI * 2;
    const sparkleF = frame - completionFrame;
    if (sparkleF < 0) return null;
    const radius = interpolate(sparkleF, [0, 35], [0, 120 + (i % 4) * 30], {
      extrapolateRight: "clamp",
    });
    const sparkleOp = interpolate(sparkleF, [0, 5, 35], [0, 0.8, 0], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    });
    const colors = ["#60a5fa", "#34d399", "#a78bfa", "#fbbf24"];
    return {
      x: Math.cos(angle) * radius,
      y: Math.sin(angle) * radius * 0.5,
      opacity: sparkleOp,
      size: 3 + (i % 3) * 2,
      color: colors[i % 4],
    };
  });

  return (
    <SceneTransition durationInFrames={255} fadeIn={12} fadeOut={15}>
      <AbsoluteFill
        style={{
          background: `linear-gradient(${135 + Math.sin(frame * 0.01) * 6}deg, #0f172a 0%, #162033 50%, #0f172a 100%)`,
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        {/* Subtle paper grain texture — warm amber tint */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage: "repeating-linear-gradient(175deg, transparent 0px, transparent 3px, rgba(251,191,36,0.012) 3px, rgba(251,191,36,0.012) 4px)",
            pointerEvents: "none",
            zIndex: 1,
            mixBlendMode: "screen",
          }}
        />

        {/* Slow parallax drift on background */}
        <div
          style={{
            position: "absolute",
            inset: -40,
            transform: `translate(${Math.sin(frame * 0.008) * 15}px, ${Math.cos(frame * 0.006) * 10}px)`,
            pointerEvents: "none",
          }}
        >
          <StarField count={50} speed={0.15} color="#60a5fa44" />
        </div>

        {/* Floating light motes */}
        {motes.map((m, i) => (
          <div
            key={`mote-${i}`}
            style={{
              position: "absolute",
              left: m.x,
              top: m.y,
              width: m.size,
              height: m.size,
              borderRadius: "50%",
              background: m.color,
              opacity: m.opacity,
              boxShadow: `0 0 ${m.size * 3}px ${m.color}44`,
              filter: "blur(0.5px)",
            }}
          />
        ))}

        {/* Heart particles — subtle drifting hearts reinforcing equity theme */}
        {Array.from({ length: 8 }, (_, hi) => {
          const seed = hi * 41 + 13;
          const sx = ((Math.sin(seed) * 49297) % 1800 + 1800) % 1800 + 60;
          const speed = 0.25 + (hi % 3) * 0.12;
          const yBase = 1080 - ((frame * speed + hi * 160) % 1400);
          const xDrift = Math.sin(frame * 0.018 + hi * 2) * 25;
          const hOp = interpolate(yBase, [50, 200, 850, 1050], [0, 0.09, 0.07, 0], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          });
          return (
            <div
              key={`heart-${hi}`}
              style={{
                position: "absolute",
                left: sx + xDrift,
                top: yBase,
                fontSize: 14 + (hi % 3) * 4,
                opacity: hOp,
                pointerEvents: "none",
                color: "#f472b6",
                filter: "blur(0.3px)",
              }}
            >
              ♡
            </div>
          );
        })}

        {/* Ambient energy orb */}
        <EnergyOrb
          x="80%"
          y="30%"
          size={200}
          color="#60a5fa"
          secondaryColor="#34d399"
          enterDelay={5}
        />
        <EnergyOrb
          x="15%"
          y="70%"
          size={150}
          color="#a78bfa"
          secondaryColor="#60a5fa"
          enterDelay={15}
        />

        {/* Pixel teacher — the educator asking the question */}
        <div style={{ position: "absolute", bottom: 60, left: 100, zIndex: 1 }}>
          <PixelCharacter type="teacher" pixelSize={5} enterDelay={10} bobAmount={1} phaseOffset={0} />
          {/* Pondering 🤔 above teacher during quote, ✨ when complete */}
          <div
            style={{
              position: "absolute",
              top: -40,
              left: 50,
              fontSize: 32,
              opacity: typingDone
                ? 0
                : interpolate(frame, [25, 40, 165, 175], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
              transform: `translateY(${Math.sin(frame * 0.1) * 4}px)`,
              filter: "drop-shadow(0 0 6px rgba(96,165,250,0.4))",
              pointerEvents: "none",
              zIndex: 4,
            }}
          >
            🤔
          </div>
          <div
            style={{
              position: "absolute",
              top: -40,
              left: 50,
              fontSize: 32,
              opacity: typingDone
                ? interpolate(frame, [completionFrame, completionFrame + 12, completionFrame + 50, completionFrame + 65], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })
                : 0,
              transform: `scale(${typingDone
                ? interpolate(frame, [completionFrame, completionFrame + 10, completionFrame + 14], [0, 1.4, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })
                : 0
              })`,
              filter: "drop-shadow(0 0 10px rgba(251,191,36,0.6))",
              pointerEvents: "none",
              zIndex: 4,
            }}
          >
            ✨
          </div>

          {/* Speech dot trail rising toward the quote */}
          {frame > 20 && [0, 1, 2].map((di) => {
            const trailF = (frame + di * 18) % 54;
            const tOp = interpolate(trailF, [0, 8, 40, 54], [0, 0.5, 0.2, 0], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            });
            const ty = 30 - trailF * 1.5;
            const tx = 80 + di * 6 + Math.sin(trailF * 0.15) * 4;
            return (
              <div
                key={`speech-${di}`}
                style={{
                  position: "absolute",
                  left: tx,
                  top: ty,
                  width: 5 - di,
                  height: 5 - di,
                  borderRadius: "50%",
                  background: "#60a5fa",
                  opacity: tOp,
                  boxShadow: "0 0 4px #60a5fa66",
                  pointerEvents: "none",
                }}
              />
            );
          })}
        </div>
        {/* Hearts above students after quote completes */}
        {typingDone && [
          { x: 1500, delay: 0 },
          { x: 1610, delay: 4 },
          { x: 1720, delay: 8 },
        ].map((h, hi) => {
          const hf = frame - completionFrame - h.delay;
          if (hf < 0) return null;
          const y = 200 - hf * 0.8;
          const op = interpolate(hf, [0, 8, 60, 80], [0, 0.85, 0.5, 0], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          });
          return (
            <div
              key={`student-heart-${hi}`}
              style={{
                position: "absolute",
                bottom: y,
                left: h.x,
                fontSize: 22 - hi * 2,
                opacity: op,
                pointerEvents: "none",
                zIndex: 4,
                filter: "drop-shadow(0 0 6px rgba(244,114,182,0.5))",
              }}
            >
              💗
            </div>
          );
        })}

        <div style={{ position: "absolute", bottom: 60, right: 100, display: "flex", gap: 14, zIndex: 1 }}>
          <PixelCharacter type="studentBoy" pixelSize={4} enterDelay={60} bobAmount={1} phaseOffset={20} />
          <PixelCharacter type="studentGirl" pixelSize={4} enterDelay={70} paletteKey="girlPurple" bobAmount={1} phaseOffset={40} />
          <PixelCharacter type="wheelchair" pixelSize={4} enterDelay={80} bobAmount={1} phaseOffset={60} />
        </div>

        {/* Pulsing glow behind quote mark */}
        <div
          style={{
            position: "absolute",
            top: 160,
            left: 110,
            width: 200,
            height: 200,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(96,165,250,0.25), transparent 65%)",
            opacity: quoteOpacity * (0.6 + typingPulse),
            filter: "blur(25px)",
            pointerEvents: "none",
          }}
        />

        {/* Chapter marker — top-left below bookmark */}
        <div
          style={{
            position: "absolute",
            top: 70,
            left: 135,
            display: "flex",
            alignItems: "baseline",
            gap: 8,
            opacity: interpolate(frame, [30, 60], [0, 0.45], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
            zIndex: 4,
          }}
        >
          <span style={{ fontSize: 20, fontFamily: "Georgia, serif", fontStyle: "italic", fontWeight: 400, color: "#60a5fa", letterSpacing: "0.1em", display: "inline-block", transform: `scale(${interpolate(frame, [30, 57], [0.6, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })})` }}>VII.</span>
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <span style={{ fontSize: 9, fontFamily: "monospace", color: "#64748b", letterSpacing: "0.3em", fontWeight: 700 }}>THE BELIEF</span>
            <span style={{ fontSize: 7, fontFamily: "monospace", color: "#475569", letterSpacing: "0.2em", fontWeight: 500 }}>07 / 09 · 8.5s</span>
          </div>
        </div>

        {/* Decorative bookmark ribbon — top-left, with gentle sway */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 90,
            width: 28,
            height: 70,
            background: "linear-gradient(180deg, #60a5fa, #34d399)",
            opacity: interpolate(frame, [25, 50, 200, 225], [0, 0.5, 0.5, 0], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            }),
            clipPath: "polygon(0% 0%, 100% 0%, 100% 100%, 50% 80%, 0% 100%)",
            boxShadow: "0 4px 12px rgba(96,165,250,0.3)",
            transform: `rotate(${Math.sin(frame * 0.025) * 2}deg)`,
            transformOrigin: "top center",
            zIndex: 3,
          }}
        />

        {/* "REC" indicator — top right, showing quote is being captured */}
        <div
          style={{
            position: "absolute",
            top: 70,
            right: 80,
            display: "flex",
            alignItems: "center",
            gap: 8,
            opacity: interpolate(frame, [20, 35, 200, 220], [0, 0.55, 0.55, 0], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            }),
            zIndex: 3,
          }}
        >
          <div
            style={{
              width: 9,
              height: 9,
              borderRadius: "50%",
              background: "#f87171",
              opacity: 0.4 + Math.sin(frame * 0.22) * 0.5,
              boxShadow: `0 0 ${6 + Math.sin(frame * 0.22) * 4}px #f87171`,
            }}
          />
          <span
            style={{
              fontSize: 11,
              fontFamily: "monospace",
              color: "#f87171",
              letterSpacing: "0.2em",
              fontWeight: 700,
              textShadow: `0 0 ${4 + Math.sin(frame * 0.22) * 2}px rgba(248,113,113,0.5)`,
            }}
          >
            REC
          </span>
        </div>

        {/* Large decorative opening quote mark — gentle breath + subtle drift after landing */}
        <div
          style={{
            position: "absolute",
            top: 180,
            left: 140,
            fontSize: 250,
            fontFamily: "Georgia, serif",
            color: "#60a5fa",
            opacity: quoteOpacity * (frame > 25 ? 0.92 + Math.sin(frame * 0.04) * 0.08 : 1),
            transform: `scale(${quoteScale * (frame > 25 ? 1 + Math.sin(frame * 0.045) * 0.015 : 1)}) translateY(${frame > 25 ? Math.sin(frame * 0.035) * 2 : 0}px) rotate(${frame > 25 ? Math.sin(frame * 0.025) * 0.8 : 0}deg)`,
            lineHeight: 1,
            filter: frame > 25 ? `drop-shadow(0 0 ${6 + Math.sin(frame * 0.05) * 3}px rgba(96,165,250,0.25))` : undefined,
          }}
        >
          "
        </div>

        {/* Closing quote mark — appears after typing completes, then breathes counter-phased to opener */}
        <div
          style={{
            position: "absolute",
            bottom: 250,
            right: 140,
            fontSize: 250,
            fontFamily: "Georgia, serif",
            color: "#34d399",
            opacity: typingDone
              ? interpolate(frame, [completionFrame, completionFrame + 15], [0, 0.15], {
                  extrapolateLeft: "clamp",
                  extrapolateRight: "clamp",
                }) * (frame > completionFrame + 15 ? 0.92 + Math.sin(frame * 0.04 + Math.PI) * 0.08 : 1)
              : 0,
            transform: `scale(${(typingDone
              ? interpolate(frame, [completionFrame, completionFrame + 15], [0.5, 1], {
                  extrapolateLeft: "clamp",
                  extrapolateRight: "clamp",
                })
              : 0.5) * (frame > completionFrame + 15 ? 1 + Math.sin(frame * 0.045 + Math.PI) * 0.015 : 1)}) translateY(${frame > completionFrame + 15 ? Math.sin(frame * 0.035 + Math.PI) * 2 : 0}px) rotate(${180 + (frame > completionFrame + 15 ? Math.sin(frame * 0.025 + Math.PI) * 0.8 : 0)}deg)`,
            lineHeight: 1,
            filter: frame > completionFrame + 15 ? `drop-shadow(0 0 ${6 + Math.sin(frame * 0.05 + Math.PI) * 3}px rgba(52,211,153,0.25))` : undefined,
          }}
        >
          "
        </div>

        <div
          style={{
            maxWidth: 900,
            textAlign: "center",
            zIndex: 1,
            padding: "0 60px",
          }}
        >
          {/* Quote text — typewriter effect with ambient pulse */}
          <div
            style={{
              fontSize: 36,
              fontFamily: "Georgia, serif",
              fontWeight: 400,
              color: "#e2e8f0",
              lineHeight: 1.7,
              fontStyle: "italic",
              minHeight: 130,
              position: "relative",
            }}
          >
            {/* Typing pulse glow behind text */}
            <div
              style={{
                position: "absolute",
                inset: -30,
                borderRadius: 20,
                background: "radial-gradient(ellipse, rgba(96,165,250,0.15), transparent 70%)",
                opacity: typingPulse + completionGlow,
                filter: "blur(20px)",
                pointerEvents: "none",
              }}
            />
            {/* Completion sparkle burst */}
            {completionSparkles.map((sp, i) =>
              sp ? (
                <div
                  key={`c-sparkle-${i}`}
                  style={{
                    position: "absolute",
                    left: `calc(50% + ${sp.x}px)`,
                    top: `calc(50% + ${sp.y}px)`,
                    width: sp.size,
                    height: sp.size,
                    borderRadius: i % 3 === 0 ? "1px" : "50%",
                    background: sp.color,
                    opacity: sp.opacity,
                    boxShadow: `0 0 ${sp.size * 3}px ${sp.color}66`,
                    transform: i % 3 === 0 ? `rotate(${frame * 5 + i * 30}deg)` : undefined,
                    pointerEvents: "none",
                  }}
                />
              ) : null,
            )}
            <TypewriterText
              text="What if every student had access to the same caliber of tools — regardless of their school's budget?"
              startFrame={15}
              charsPerFrame={0.65}
            />
          </div>

          {/* Ripple rings on quote completion */}
          {typingDone && [0, 12, 24].map((d, ri) => {
            const rippleF = frame - completionFrame - d;
            if (rippleF < 0 || rippleF > 60) return null;
            const rippleScale = interpolate(rippleF, [0, 60], [0.3, 3], { extrapolateRight: "clamp" });
            const rippleOp = interpolate(rippleF, [0, 8, 45, 60], [0, 0.15, 0.04, 0], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            });
            return (
              <div
                key={`ripple-${ri}`}
                style={{
                  position: "absolute",
                  left: "50%",
                  top: "50%",
                  transform: `translate(-50%, -50%) scale(${rippleScale})`,
                  width: 80,
                  height: 80,
                  borderRadius: "50%",
                  border: `1px solid ${ri === 0 ? "#60a5fa" : "#34d399"}`,
                  opacity: rippleOp,
                  pointerEvents: "none",
                }}
              />
            );
          })}

          {/* Divider */}
          <div
            style={{
              width: dividerWidth,
              height: 2,
              background: "linear-gradient(90deg, transparent, #60a5fa, #34d399, transparent)",
              margin: "30px auto",
              borderRadius: 1,
            }}
          />

          {/* Attribution */}
          <div
            style={{
              opacity: attrOpacity,
              transform: `translateY(${(1 - attrY) * 15}px)`,
            }}
          >
            {/* Speaker role tag */}
            <div
              style={{
                fontSize: 9,
                fontFamily: "monospace",
                color: "#60a5fa",
                letterSpacing: "0.3em",
                fontWeight: 700,
                marginBottom: 8,
                opacity: interpolate(frame, [195, 215], [0, 0.6], {
                  extrapolateLeft: "clamp",
                  extrapolateRight: "clamp",
                }),
              }}
            >
              {/* Named as the creator, not an anonymous practitioner. The scene is
                  framed as "THE BELIEF" rather than a quote, but an unattributed
                  "a school psychologist in Maine" plus the REC indicator read as
                  third-party field feedback. This is the author's own conviction. */}
              — ALLOFLOW&apos;S CREATOR, SCHOOL PSYCHOLOGIST
            </div>
            <div
              style={{
                fontSize: 22,
                fontFamily: "system-ui, sans-serif",
                fontWeight: 600,
                color: "#94a3b8",
                position: "relative",
                display: "inline-block",
                padding: "0 20px",
                textShadow: `0 0 ${10 + Math.sin(frame * 0.04) * 4}px rgba(96,165,250,0.15)`,
              }}
            >
              {/* Flanking tick marks that slide in */}
              <span
                style={{
                  position: "absolute",
                  left: 0,
                  top: "50%",
                  transform: `translateY(-50%) translateX(${interpolate(frame, [190, 210], [-10, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })}px)`,
                  width: 12,
                  height: 1,
                  background: "#60a5fa",
                  opacity: interpolate(frame, [190, 210], [0, 0.6], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
                }}
              />
              <span
                style={{
                  position: "absolute",
                  right: 0,
                  top: "50%",
                  transform: `translateY(-50%) translateX(${interpolate(frame, [190, 210], [10, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })}px)`,
                  width: 12,
                  height: 1,
                  background: "#34d399",
                  opacity: interpolate(frame, [190, 210], [0, 0.6], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
                }}
              />
              The question that started it all.
            </div>
            <div
              style={{
                fontSize: 16,
                fontFamily: "system-ui, sans-serif",
                fontWeight: 400,
                color: "#64748b",
                marginTop: 8,
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              For teachers, parents, clinicians — equity in education isn't optional.
              {/* Verified check */}
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 14,
                  height: 14,
                  borderRadius: "50%",
                  background: "#34d39933",
                  border: "1px solid #34d39966",
                  fontSize: 9,
                  color: "#34d399",
                  fontWeight: 700,
                  opacity: interpolate(frame, [215, 235], [0, 1], {
                    extrapolateLeft: "clamp",
                    extrapolateRight: "clamp",
                  }),
                  boxShadow: "0 0 4px rgba(52,211,153,0.4)",
                }}
              >
                ✓
              </span>
            </div>
          </div>
        </div>
      </AbsoluteFill>
    </SceneTransition>
  );
};
