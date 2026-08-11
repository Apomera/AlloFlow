import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig } from "remotion";
import { StarField } from "../components/StarField";
import { Constellation } from "../components/Constellation";
import { HexGrid } from "../components/HexGrid";
import { WaveformVisualizer } from "../components/WaveformVisualizer";
import { SceneTransition } from "../components/SceneTransition";
import { PixelClassroom } from "../components/PixelCharacters";
import { AuroraGlow } from "../components/CinematicOverlays";

const seededRandom = (seed: number) => {
  const x = Math.sin(seed * 9301 + 49297) * 49297;
  return x - Math.floor(x);
};

// Floating education keywords that drift upward
const FLOAT_KEYWORDS = [
  "IEP", "UDL", "RTI", "504", "MTSS", "FBA", "BIP", "AAC",
  "SEL", "STEM", "CBM", "FERPA", "IDEA", "FAPE", "LRE",
];

const FloatingKeyword: React.FC<{ word: string; index: number; total: number }> = ({
  word,
  index,
}) => {
  const frame = useCurrentFrame();

  const x = seededRandom(index * 7 + 3) * 1800 + 60;
  const speed = 0.15 + seededRandom(index * 13) * 0.12;
  const startDelay = seededRandom(index * 19) * 120;
  const f = frame - startDelay;

  if (f < 0) return null;

  const y = 1080 - (f * speed * 4) % 1200;
  const opacity = interpolate(y, [50, 200, 900, 1080], [0, 0.08, 0.08, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        fontSize: 13,
        fontFamily: "monospace",
        fontWeight: 600,
        color: "#60a5fa",
        opacity,
        letterSpacing: "0.1em",
        whiteSpace: "nowrap",
        pointerEvents: "none",
      }}
    >
      <span style={{
        color: "#60a5fa88",
        marginRight: 2,
        display: "inline-block",
        transform: `translateX(${Math.sin(f * 0.1 + index) * 0.6}px)`,
      }}>[</span>{word}<span style={{
        color: "#60a5fa88",
        marginLeft: 2,
        display: "inline-block",
        transform: `translateX(${Math.sin(f * 0.1 + index + Math.PI) * 0.6}px)`,
      }}>]</span>
      {/* Random highlight flash on select keywords */}
      {(index === 0 || index === 3 || index === 8 || index === 11) && (
        <div
          style={{
            position: "absolute",
            inset: -3,
            borderRadius: 4,
            background: `linear-gradient(90deg, transparent, #60a5fa15, transparent)`,
            opacity: Math.sin(f * 0.08 + index * 2) > 0.7 ? 0.6 : 0,
            pointerEvents: "none",
          }}
        />
      )}
    </div>
  );
};

// Word-by-word reveal for the second line — with landing sparkles
const AnimatedWord: React.FC<{ word: string; delay: number }> = ({ word, delay }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const progress = spring({ frame: frame - delay, fps, config: { damping: 14, stiffness: 100 } });
  const opacity = interpolate(frame, [delay, delay + 10], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const y = (1 - progress) * 25;
  const scale = 0.9 + progress * 0.1;

  // Sparkle burst when word "lands" (spring reaches ~0.9)
  const landFrame = delay + 8;
  const sparkleF = frame - landFrame;
  const sparkles = Array.from({ length: 8 }, (_, i) => {
    if (sparkleF < 0 || sparkleF > 30) return null;
    const angle = (i / 8) * Math.PI * 2;
    const r = interpolate(sparkleF, [0, 25], [0, 50 + (i % 3) * 15], { extrapolateRight: "clamp" });
    const op = interpolate(sparkleF, [0, 4, 25], [0, 0.7, 0], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    });
    const colors = ["#60a5fa", "#34d399", "#a78bfa", "#fbbf24"];
    return { x: Math.cos(angle) * r, y: Math.sin(angle) * r * 0.6, op, color: colors[i % 4], size: 2 + (i % 3) };
  });

  return (
    <span
      style={{
        display: "inline-block",
        opacity,
        transform: `translateY(${y}px) scale(${scale})`,
        marginRight: 16,
        position: "relative",
        backgroundImage: `linear-gradient(${135 + Math.sin(frame * 0.03) * 10}deg, #60a5fa, #34d399, #60a5fa)`,
        backgroundSize: "200% 200%",
        backgroundPosition: `${(frame * 0.4) % 200}% 50%`,
        backgroundClip: "text",
        WebkitBackgroundClip: "text",
        color: "transparent",
        WebkitTextFillColor: "transparent",
      }}
    >
      {word}
      {sparkles.map((sp, i) =>
        sp ? (
          <span
            key={i}
            style={{
              position: "absolute",
              left: `calc(50% + ${sp.x}px)`,
              top: `calc(50% + ${sp.y}px)`,
              width: sp.size,
              height: sp.size,
              borderRadius: "50%",
              background: sp.color,
              opacity: sp.op,
              boxShadow: `0 0 ${sp.size * 3}px ${sp.color}55`,
              pointerEvents: "none",
            }}
          />
        ) : null,
      )}
    </span>
  );
};

export const Hook: React.FC = () => {
  const frame = useCurrentFrame();

  // Subtle gradient rotation
  const gradientShift = interpolate(frame, [0, 150], [0, 20], { extrapolateRight: "clamp" })
    + Math.sin(frame * 0.015) * 5;

  // Accent underline
  const lineWidth = interpolate(frame, [90, 130], [0, 500], { extrapolateRight: "clamp" });

  // Breathing glow
  const breathe = Math.sin(frame * 0.04) * 0.3 + 0.7;

  return (
    <SceneTransition durationInFrames={210} fadeIn={15} fadeOut={12}>
      <AbsoluteFill
        style={{
          background: `linear-gradient(${135 + gradientShift}deg, #0f172a 0%, #1e3a5f 40%, #1e293b 100%)`,
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        {/* Chapter marker — top-left */}
        <div
          style={{
            position: "absolute",
            top: 55,
            left: 100,
            display: "flex",
            alignItems: "baseline",
            gap: 8,
            opacity: interpolate(frame, [25, 45], [0, 0.45], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
            zIndex: 4,
          }}
        >
          <span style={{ fontSize: 20, fontFamily: "Georgia, serif", fontStyle: "italic", fontWeight: 400, color: "#60a5fa", letterSpacing: "0.1em", display: "inline-block", transform: `scale(${interpolate(frame, [25, 42], [0.6, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })})` }}>II.</span>
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <span style={{ fontSize: 9, fontFamily: "monospace", color: "#64748b", letterSpacing: "0.3em", fontWeight: 700 }}>THE THESIS</span>
            <span style={{ fontSize: 7, fontFamily: "monospace", color: "#475569", letterSpacing: "0.2em", fontWeight: 500 }}>02 / 09 · 7.0s</span>
          </div>
        </div>

        {/* Background data-viz silhouettes — faint chart outlines */}
        {[
          { x: "10%", y: "25%", w: 140, h: 70 },
          { x: "82%", y: "70%", w: 120, h: 60 },
        ].map((chart, ci) => (
          <svg
            key={`chart-${ci}`}
            width={chart.w}
            height={chart.h}
            viewBox={`0 0 ${chart.w} ${chart.h}`}
            style={{
              position: "absolute",
              left: chart.x,
              top: chart.y,
              opacity: interpolate(frame, [20 + ci * 10, 45 + ci * 10], [0, 0.08], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
              }) * (0.7 + Math.sin(frame * 0.04 + ci * 1.5) * 0.3),
              pointerEvents: "none",
            }}
          >
            {/* Grid */}
            {[0.25, 0.5, 0.75].map((r, gi) => (
              <line
                key={gi}
                x1="0"
                y1={chart.h * r}
                x2={chart.w}
                y2={chart.h * r}
                stroke="#60a5fa"
                strokeWidth="0.5"
                opacity="0.5"
              />
            ))}
            {/* Line chart */}
            <polyline
              points={Array.from({ length: 8 }, (_, pi) => {
                const px = (pi / 7) * chart.w;
                const py = chart.h - (Math.sin(pi * 0.7 + ci * 2) * 0.3 + 0.5) * chart.h;
                return `${px},${py}`;
              }).join(" ")}
              fill="none"
              stroke="#60a5fa"
              strokeWidth="1.5"
            />
          </svg>
        ))}

        {/* Floating education keywords drifting upward */}
        {FLOAT_KEYWORDS.map((kw, i) => (
          <FloatingKeyword key={i} word={kw} index={i} total={FLOAT_KEYWORDS.length} />
        ))}

        <AuroraGlow
          colors={["rgba(96,165,250,0.06)", "rgba(14,165,133,0.05)", "rgba(139,92,246,0.04)"]}
          speed={0.01}
        />

        <HexGrid color="#60a5fa" opacity={0.025} pulseSpeed={0.03} />
        <WaveformVisualizer barCount={96} color="#60a5fa" height={40} position="bottom" opacity={0.08} />
        <Constellation nodeCount={18} color="#60a5fa33" connectionDistance={200} />
        <StarField count={80} speed={0.2} color="#60a5fa" />

        {/* Parallax floating geometric shapes — depth layers */}
        {[
          { x: "15%", y: "20%", size: 60, rot: 0.5, drift: 0.02, color: "#60a5fa15", shape: "diamond" },
          { x: "85%", y: "70%", size: 45, rot: -0.3, drift: 0.015, color: "#34d39912", shape: "circle" },
          { x: "70%", y: "15%", size: 35, rot: 0.8, drift: 0.025, color: "#a78bfa10", shape: "diamond" },
          { x: "25%", y: "80%", size: 50, rot: -0.6, drift: 0.018, color: "#60a5fa0d", shape: "circle" },
          { x: "55%", y: "25%", size: 25, rot: 1.2, drift: 0.03, color: "#34d39910", shape: "diamond" },
        ].map((shape, i) => (
          <div
            key={`parallax-${i}`}
            style={{
              position: "absolute",
              left: shape.x,
              top: shape.y,
              width: shape.size,
              height: shape.size,
              border: `1px solid ${shape.color}`,
              borderRadius: shape.shape === "circle" ? "50%" : 0,
              transform: `
                translate(-50%, -50%)
                rotate(${frame * shape.rot + i * 45}deg)
                translateY(${Math.sin(frame * shape.drift + i) * 15}px)
              `,
              opacity: interpolate(frame, [10 + i * 8, 30 + i * 8], [0, 1], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
              }),
            }}
          />
        ))}

        {/* Decorative gradient orbs */}
        <div
          style={{
            position: "absolute",
            width: 700,
            height: 700,
            borderRadius: "50%",
            background: `radial-gradient(circle, rgba(59,130,246,${0.08 * breathe}) 0%, transparent 55%)`,
            top: -180,
            right: -180,
            transform: `scale(${interpolate(frame, [0, 100], [0.8, 1.4], { extrapolateRight: "clamp" })})`,
          }}
        />
        <div
          style={{
            position: "absolute",
            width: 600,
            height: 600,
            borderRadius: "50%",
            background: `radial-gradient(circle, rgba(14,165,133,${0.06 * breathe}) 0%, transparent 55%)`,
            bottom: -150,
            left: -150,
            transform: `scale(${interpolate(frame, [0, 100], [0.9, 1.5], { extrapolateRight: "clamp" })})`,
          }}
        />

        {/* Diverse learner emojis — 'every learner' visualization */}
        {[
          { emoji: "👧🏽", x: 250, delay: 80 },
          { emoji: "👦🏿", x: 480, delay: 95 },
          { emoji: "🧒🏻", x: 700, delay: 110 },
          { emoji: "👩🏾‍🦱", x: 1240, delay: 100 },
          { emoji: "👨🏼‍🦯", x: 1450, delay: 90 },
          { emoji: "👧🏼", x: 1660, delay: 105 },
        ].map((sp, si) => {
          const spF = frame - sp.delay;
          if (spF < 0) return null;
          const op = interpolate(spF, [0, 12, 100, 120], [0, 0.55, 0.5, 0], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          });
          const driftY = Math.sin(spF * 0.05 + si) * 5;
          const swayX = Math.cos(spF * 0.04 + si * 1.3) * 6;
          return (
            <div
              key={`learner-${si}`}
              style={{
                position: "absolute",
                bottom: 200 + driftY,
                left: sp.x + swayX,
                fontSize: 32,
                opacity: op,
                pointerEvents: "none",
                zIndex: 1,
                filter: "drop-shadow(0 0 6px rgba(96,165,250,0.3))",
              }}
            >
              {sp.emoji}
            </div>
          );
        })}

        {/* 16-bit pixel classroom scene */}
        <div
          style={{
            position: "absolute",
            bottom: 85,
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 1,
          }}
        >
          <PixelClassroom pixelSize={5} enterDelay={70} maxOpacity={0.4} />
        </div>

        <div style={{ textAlign: "center", zIndex: 1, position: "relative" }}>
          {/* Ambient glow behind text block */}
          <div
            style={{
              position: "absolute",
              left: "50%",
              top: "50%",
              transform: "translate(-50%, -50%)",
              width: 700,
              height: 200,
              borderRadius: "50%",
              background: "radial-gradient(ellipse, rgba(96,165,250,0.08), rgba(52,211,153,0.04) 50%, transparent 75%)",
              opacity: interpolate(frame, [45, 65], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })
                * (0.6 + breathe * 0.2),
              filter: "blur(25px)",
              pointerEvents: "none",
            }}
          />
          <div
            style={{
              fontSize: 52,
              fontFamily: "system-ui, -apple-system, sans-serif",
              fontWeight: 300,
              color: "#94a3b8",
              letterSpacing: "0.02em",
              textShadow: `0 2px 20px rgba(15,23,42,0.8), 0 0 ${40 + Math.sin(frame * 0.04) * 12}px rgba(96,165,250,${0.08 + Math.sin(frame * 0.04) * 0.04})`,
            }}
          >
            {["Every", "learner", "is", "different."].map((word, wi) => {
              const wordDelay = 15 + wi * 7;
              const wordOp = interpolate(frame, [wordDelay, wordDelay + 12], [0, 1], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
              });
              const wordY = interpolate(frame, [wordDelay, wordDelay + 12], [12, 0], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
              });
              const isEmphasis = word === "different.";
              return (
                <span
                  key={wi}
                  style={{
                    display: "inline-block",
                    opacity: wordOp,
                    transform: `translateY(${wordY + (frame > wordDelay + 14 ? Math.sin(frame * 0.04 + wi * 0.6) * 0.8 : 0)}px)`,
                    marginRight: 14,
                    position: "relative",
                    color: isEmphasis ? "#e2e8f0" : "#94a3b8",
                    fontStyle: isEmphasis ? "italic" : "normal",
                    textShadow: isEmphasis
                      ? `0 0 ${10 + Math.sin(frame * 0.05) * 4}px rgba(96,165,250,0.3)`
                      : undefined,
                  }}
                >
                  {word}
                  {isEmphasis && (() => {
                    const grewIn = frame > wordDelay + 22;
                    return (
                      <div
                        style={{
                          position: "absolute",
                          bottom: -6,
                          left: 0,
                          width: interpolate(frame, [wordDelay + 10, wordDelay + 22], [0, 100], {
                            extrapolateLeft: "clamp",
                            extrapolateRight: "clamp",
                          }) + "%",
                          height: 2,
                          background: `linear-gradient(${90 + (grewIn ? Math.sin(frame * 0.04) * 8 : 0)}deg, #60a5fa, #34d399)`,
                          borderRadius: 1,
                          opacity: grewIn ? 0.85 + Math.sin(frame * 0.05) * 0.15 : 1,
                          boxShadow: `0 0 ${6 + (grewIn ? Math.sin(frame * 0.05) * 3 : 0)}px rgba(96,165,250,${0.4 + (grewIn ? Math.sin(frame * 0.05) * 0.15 : 0)})`,
                        }}
                      />
                    );
                  })()}
                </span>
              );
            })}
          </div>

          {/* Lightbulb 'aha' moment — pops in when 'different.' lands */}
          <div
            style={{
              position: "absolute",
              top: -110,
              left: "calc(50% + 220px)",
              fontSize: 44,
              opacity: interpolate(frame, [38, 46, 96, 110], [0, 1, 1, 0], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
              }),
              transform: `scale(${interpolate(frame, [38, 46, 50], [0.3, 1.4, 1], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
              }) * (frame > 50 ? 1 + Math.sin(frame * 0.1) * 0.04 : 1)}) rotate(${interpolate(frame, [38, 46], [-25, 0], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
              })}deg)`,
              filter: "drop-shadow(0 0 20px rgba(251,191,36,0.8))",
              zIndex: 5,
            }}
          >
            💡
          </div>
          {/* Lightbulb glow burst rays — staggered cascade */}
          {frame >= 38 && frame < 78 && Array.from({ length: 8 }, (_, ri) => {
            const burstF = frame - 38 - ri * 1.2;
            if (burstF < 0) return null;
            const angle = (ri / 8) * Math.PI * 2;
            const r = interpolate(burstF, [0, 22], [10, 60], { extrapolateRight: "clamp" });
            const rOp = interpolate(burstF, [0, 4, 22], [0, 0.6, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
            return (
              <div
                key={`bulb-ray-${ri}`}
                style={{
                  position: "absolute",
                  top: `calc(-110px + ${Math.sin(angle) * r}px)`,
                  left: `calc(50% + 220px + ${Math.cos(angle) * r}px)`,
                  width: 4,
                  height: 10,
                  background: "linear-gradient(180deg, #fbbf24, transparent)",
                  opacity: rOp,
                  transform: `rotate(${(angle * 180) / Math.PI + 90}deg)`,
                  pointerEvents: "none",
                  zIndex: 4,
                }}
              />
            );
          })}

          {/* Pause beat — flowing dots connecting the two lines */}
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              gap: 6,
              margin: "14px auto 0",
              height: 10,
              opacity: interpolate(frame, [43, 50, 58], [0, 0.8, 0.5], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
            }}
          >
            {[0, 1, 2].map((di) => {
              const dotDelay = 43 + di * 3;
              const dotOp = interpolate(frame, [dotDelay, dotDelay + 8], [0, 1], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
              });
              const dotColors = ["#60a5fa", "#60a5fa", "#34d399"];
              return (
                <div
                  key={di}
                  style={{
                    width: 4,
                    height: 4,
                    borderRadius: "50%",
                    background: dotColors[di],
                    opacity: dotOp,
                    boxShadow: `0 0 4px ${dotColors[di]}66`,
                  }}
                />
              );
            })}
          </div>

          {/* Word-by-word second line with glow */}
          <div
            style={{
              fontSize: 72,
              fontFamily: "system-ui, -apple-system, sans-serif",
              fontWeight: 700,
              letterSpacing: "-0.01em",
              marginTop: 12,
              filter: `drop-shadow(0 0 ${12 + breathe * 8}px rgba(96,165,250,${0.15 + breathe * 0.15}))`,
              position: "relative",
            }}
          >
            {["Their", "tools", "should", "be", "too."].map((word, i) => (
              <AnimatedWord key={i} word={word} delay={52 + i * 9} />
            ))}
          </div>

          {/* Accent underline with traveling shimmer highlight */}
          <div
            style={{
              width: lineWidth,
              height: 3,
              background: "linear-gradient(90deg, transparent, #60a5fa88, #34d39988, transparent)",
              margin: "24px auto 0",
              borderRadius: 2,
              boxShadow: `0 0 ${10 + Math.sin(frame * 0.05) * 4}px rgba(96,165,250,${0.15 + Math.sin(frame * 0.05) * 0.1})`,
              position: "relative",
              overflow: "hidden",
            }}
          >
            {lineWidth > 100 && (
              <div
                style={{
                  position: "absolute",
                  top: 0,
                  bottom: 0,
                  left: `${((frame - 130) * 1.5) % 200 - 50}%`,
                  width: "20%",
                  background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.5), transparent)",
                  pointerEvents: "none",
                }}
              />
            )}
          </div>
        </div>

        {/* Audio-wave ripple at bottom — gentle ambient pulse */}
        <svg
          width="1920"
          height="50"
          viewBox="0 0 1920 50"
          style={{
            position: "absolute",
            bottom: 60,
            left: 0,
            opacity: interpolate(frame, [80, 110, 200, 210], [0, 0.18, 0.18, 0], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            }),
            pointerEvents: "none",
            zIndex: 1,
          }}
        >
          <polyline
            points={Array.from({ length: 100 }, (_, wi) => {
              const wx = (wi / 99) * 1920;
              const wy = 25 + Math.sin(wi * 0.3 + frame * 0.1) * 6 + Math.sin(wi * 0.7 + frame * 0.05) * 4;
              return `${wx},${wy}`;
            }).join(" ")}
            fill="none"
            stroke="#60a5fa"
            strokeWidth="1"
            strokeLinejoin="round"
          />
        </svg>

        {/* Data-readout bottom status bar */}
        <div
          style={{
            position: "absolute",
            bottom: 28,
            left: "50%",
            transform: "translateX(-50%)",
            display: "flex",
            gap: 24,
            fontSize: 10,
            fontFamily: "monospace",
            color: "#60a5fa",
            opacity: interpolate(frame, [110, 140], [0, 0.35], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
            letterSpacing: "0.1em",
            zIndex: 2,
          }}
        >
          <span>[ {Math.floor(frame * 0.5) % 999}.PSY ]</span>
          <span style={{ opacity: 0.4 + Math.sin(frame * 0.25) * 0.5 }}>●</span>
          <span>SYS: AlloFlow v1.0</span>
          <span style={{ opacity: 0.4 + Math.sin(frame * 0.25 + Math.PI) * 0.5 }}>●</span>
          <span>STATUS: {frame % 40 < 13 ? "▮▯▯" : frame % 40 < 26 ? "▮▮▯" : "▮▮▮"} READY</span>
        </div>
      </AbsoluteFill>
    </SceneTransition>
  );
};

