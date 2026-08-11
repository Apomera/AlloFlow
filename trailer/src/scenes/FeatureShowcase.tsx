import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig, Sequence } from "remotion";
import { StarField } from "../components/StarField";
import { AlloBot } from "../components/AlloBot";
import { FloatingTags } from "../components/FloatingTags";
import { TickerStrip } from "../components/TickerStrip";
import { SceneTransition } from "../components/SceneTransition";
import { HexGrid } from "../components/HexGrid";
import { WaveformVisualizer } from "../components/WaveformVisualizer";
import { AuroraGlow } from "../components/CinematicOverlays";
import {
  SwordRaiseScene,
  DragonBattleScene,
  PixelLabScene,
  PixelSoundScene,
  PixelSymbolScene,
  PixelChartScene,
  PixelScrollScene,
  PixelMathScene,
  PixelHeartScene,
  PixelShieldScene,
  PixelXPScene,
  PixelDashboardScene,
  PixelEscapeScene,
  PixelLessonScene,
  ScanlineOverlay,
} from "../components/PixelCharacters";

interface FeatureCardProps {
  icon: string;
  title: string;
  description: string;
  color: string;
  accentColor: string;
  index: number;
  tags: string[];
  miniUi: React.ReactNode;
  pixelAccent?: React.ReactNode;
}

// Mini UI mockup components
const MiniGrid: React.FC<{ color: string; cols: number; rows: number }> = ({ color, cols, rows }) => {
  const frame = useCurrentFrame();
  return (
    <div style={{ display: "grid", gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 4, padding: 8 }}>
      {Array.from({ length: cols * rows }, (_, i) => {
        // Cells "light up" sequentially like a simulation running
        const cellDelay = 20 + i * 3;
        const cellLit = frame >= cellDelay;
        const litPulse = cellLit ? 0.5 + Math.sin((frame - cellDelay) * 0.15 + i) * 0.3 : 0;
        return (
          <div
            key={i}
            style={{
              width: "100%",
              aspectRatio: "1",
              borderRadius: 4,
              background: cellLit
                ? `${color}${Math.round((0x40 + litPulse * 0x40)).toString(16).padStart(2, "0")}`
                : `${color}${20 + (i % 3) * 15}`,
              border: `1px solid ${color}${cellLit ? "66" : "33"}`,
              boxShadow: cellLit ? `0 0 ${4 * litPulse}px ${color}66` : undefined,
            }}
          />
        );
      })}
    </div>
  );
};

const MiniChart: React.FC<{ color: string; bars: number[] }> = ({ color, bars }) => (
  <div style={{ display: "flex", alignItems: "flex-end", gap: 4, padding: 8, height: 80 }}>
    {bars.map((h, i) => (
      <div
        key={i}
        style={{
          flex: 1,
          height: `${h}%`,
          borderRadius: 3,
          background: `linear-gradient(180deg, ${color}, ${color}44)`,
        }}
      />
    ))}
  </div>
);

const MiniLines: React.FC<{ color: string; count: number }> = ({ color, count }) => {
  const frame = useCurrentFrame();
  return (
    <div style={{ padding: 10, display: "flex", flexDirection: "column", gap: 6 }}>
      {Array.from({ length: count }, (_, i) => {
        // Each line "writes in" sequentially
        const lineDelay = 25 + i * 6;
        const lineWidth = interpolate(frame, [lineDelay, lineDelay + 18], [0, 60 + (i * 17) % 40], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });
        return (
          <div
            key={i}
            style={{
              height: 6,
              borderRadius: 3,
              background: `${color}${18 + (i % 2) * 12}`,
              width: `${lineWidth}%`,
            }}
          />
        );
      })}
    </div>
  );
};

const MiniSymbols: React.FC<{ color: string }> = ({ color }) => {
  const frame = useCurrentFrame();
  // Cycle through which symbol is "selected" — every 18 frames pick next
  const selectedIdx = Math.floor((frame - 20) / 18) % 6;
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6, padding: 8 }}>
      {["🏠", "🍎", "😊", "🚗", "📚", "🎵"].map((emoji, i) => {
        const isSelected = i === selectedIdx && frame > 20;
        return (
          <div
            key={i}
            style={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              fontSize: 18,
              padding: 4,
              borderRadius: 6,
              background: isSelected ? `${color}40` : `${color}15`,
              border: `1px solid ${color}${isSelected ? "88" : "22"}`,
              transform: isSelected ? "scale(1.1)" : "scale(1)",
              boxShadow: isSelected ? `0 0 8px ${color}66` : undefined,
            }}
          >
            {emoji}
          </div>
        );
      })}
    </div>
  );
};

const MiniElkonin: React.FC<{ color: string }> = ({ color }) => (
  <div style={{ padding: 10 }}>
    {/* Word label */}
    <div style={{ fontSize: 14, fontFamily: "system-ui", color, textAlign: "center", marginBottom: 8, fontWeight: 600 }}>
      c · a · t
    </div>
    {/* Elkonin boxes */}
    <div style={{ display: "flex", gap: 4, justifyContent: "center" }}>
      {["c", "a", "t"].map((letter, i) => (
        <div
          key={i}
          style={{
            width: 36,
            height: 36,
            borderRadius: 6,
            border: `2px solid ${color}66`,
            background: `${color}15`,
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            fontSize: 18,
            fontFamily: "system-ui",
            fontWeight: 700,
            color,
          }}
        >
          {letter}
        </div>
      ))}
    </div>
    {/* Sound wave bars */}
    <div style={{ display: "flex", gap: 2, justifyContent: "center", marginTop: 8 }}>
      {[30, 60, 90, 60, 80, 40, 70, 50, 90, 30].map((h, i) => (
        <div
          key={i}
          style={{ width: 3, height: h * 0.3, borderRadius: 2, background: `${color}55` }}
        />
      ))}
    </div>
  </div>
);

const MiniAdventure: React.FC<{ color: string }> = ({ color }) => {
  const frame = useCurrentFrame();
  // First choice highlights as if hovered around frame 30-50
  const hoverHighlight = interpolate(frame, [30, 38, 50, 58], [0, 1, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  // XP fills from 50→65% as adventure progresses
  const xpFill = interpolate(frame, [25, 70], [50, 65], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return (
    <div style={{ padding: 8 }}>
      {/* Mini scene image placeholder */}
      <div
        style={{
          width: "100%",
          height: 50,
          borderRadius: 6,
          background: `linear-gradient(135deg, ${color}22, ${color}0a)`,
          border: `1px solid ${color}22`,
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          fontSize: 22,
          marginBottom: 6,
        }}
      >
        🏰
      </div>
      {/* Choice buttons */}
      {["Go left → Forest", "Go right → Cave"].map((choice, i) => (
        <div
          key={i}
          style={{
            fontSize: 9,
            color,
            padding: "4px 8px",
            borderRadius: 4,
            background: `${color}${i === 0 ? Math.round((0x18 / 255) * (1 + hoverHighlight * 1.5) * 255).toString(16).padStart(2, "0").slice(0, 2) : "0a"}`,
            border: `1px solid ${color}${i === 0 && hoverHighlight > 0 ? "55" : "22"}`,
            marginBottom: 3,
            fontFamily: "system-ui",
          }}
        >
          {choice}
        </div>
      ))}
      {/* XP bar — fills as adventure unfolds */}
      <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 4 }}>
        <span style={{ fontSize: 8, color: `${color}88`, fontFamily: "system-ui" }}>XP</span>
        <div style={{ flex: 1, height: 4, borderRadius: 2, background: `${color}15` }}>
          <div style={{ width: `${xpFill}%`, height: "100%", borderRadius: 2, background: color }} />
        </div>
      </div>
    </div>
  );
};

const MiniBossBattle: React.FC<{ color: string }> = ({ color }) => (
  <div style={{ padding: 8, textAlign: "center" }}>
    {/* Boss */}
    <div style={{ fontSize: 28, marginBottom: 4 }}>🐉</div>
    {/* HP bar */}
    <div style={{ height: 6, borderRadius: 3, background: `${color}15`, marginBottom: 6 }}>
      <div style={{ width: "40%", height: "100%", borderRadius: 3, background: "#f87171" }} />
    </div>
    {/* Team damage icons */}
    <div style={{ display: "flex", gap: 3, justifyContent: "center" }}>
      {["⚔️", "🛡️", "✨", "⚔️"].map((e, i) => (
        <div
          key={i}
          style={{
            width: 24,
            height: 24,
            borderRadius: 4,
            background: `${color}15`,
            border: `1px solid ${color}22`,
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            fontSize: 12,
          }}
        >
          {e}
        </div>
      ))}
    </div>
    <div style={{ fontSize: 8, color: `${color}88`, marginTop: 4, fontFamily: "system-ui" }}>
      Class HP: 850 / 1000
    </div>
  </div>
);

const MiniSEL: React.FC<{ color: string }> = ({ color }) => (
  <div style={{ padding: 8 }}>
    {/* Emotion faces */}
    <div style={{ display: "flex", gap: 4, justifyContent: "center", marginBottom: 6 }}>
      {["😊", "😟", "😤", "😌"].map((e, i) => (
        <div
          key={i}
          style={{
            width: 28,
            height: 28,
            borderRadius: "50%",
            background: i === 0 ? `${color}25` : `${color}0a`,
            border: i === 0 ? `2px solid ${color}` : `1px solid ${color}22`,
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            fontSize: 14,
          }}
        >
          {e}
        </div>
      ))}
    </div>
    {/* Zone label */}
    <div
      style={{
        fontSize: 9,
        color,
        textAlign: "center",
        padding: "3px 8px",
        borderRadius: 4,
        background: `${color}12`,
        fontFamily: "system-ui",
        fontWeight: 600,
      }}
    >
      Green Zone ✓
    </div>
    {/* Skills */}
    {["Deep Breathing", "Mindfulness"].map((s, i) => (
      <div
        key={i}
        style={{
          fontSize: 9,
          color: `${color}aa`,
          marginTop: 4,
          fontFamily: "system-ui",
          display: "flex",
          alignItems: "center",
          gap: 4,
        }}
      >
        <span style={{ fontSize: 6 }}>●</span> {s}
      </div>
    ))}
  </div>
);

const MiniMathFluency: React.FC<{ color: string }> = ({ color }) => (
  <div style={{ padding: 8 }}>
    {/* Problem display */}
    <div
      style={{
        textAlign: "center",
        fontSize: 20,
        fontWeight: 700,
        color,
        fontFamily: "system-ui",
        marginBottom: 6,
      }}
    >
      7 × 8 = ?
    </div>
    {/* Timer bar */}
    <div style={{ height: 4, borderRadius: 2, background: `${color}15`, marginBottom: 6 }}>
      <div style={{ width: "72%", height: "100%", borderRadius: 2, background: color }} />
    </div>
    {/* Stats */}
    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 8, color: `${color}88`, fontFamily: "system-ui" }}>
      <span>DCPM: 42</span>
      <span>Tier 1 ✓</span>
    </div>
    {/* Mini trend */}
    <div style={{ display: "flex", alignItems: "flex-end", gap: 2, marginTop: 6, justifyContent: "center" }}>
      {[25, 30, 35, 32, 38, 42].map((v, i) => (
        <div key={i} style={{ width: 8, height: v * 0.8, borderRadius: 2, background: `${color}${40 + i * 10}` }} />
      ))}
    </div>
  </div>
);

const MiniGamification: React.FC<{ color: string }> = ({ color }) => {
  const frame = useCurrentFrame();
  // XP bar fills from current to 72% as user "earns" XP (frame 25-65)
  const xpFill = interpolate(frame, [25, 65], [55, 72], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return (
    <div style={{ padding: 8, textAlign: "center" }}>
      {/* Level */}
      <div style={{ fontSize: 20, marginBottom: 4 }}>🏆</div>
      <div style={{ fontSize: 10, color, fontFamily: "system-ui", fontWeight: 700, marginBottom: 4 }}>Level 12</div>
      {/* XP bar — fills as if earning XP in real-time */}
      <div style={{ height: 6, borderRadius: 3, background: `${color}15`, marginBottom: 6, overflow: "hidden" }}>
        <div style={{ width: `${xpFill}%`, height: "100%", borderRadius: 3, background: `linear-gradient(90deg, ${color}, ${color}aa)` }} />
      </div>
      {/* Badges */}
      <div style={{ display: "flex", gap: 3, justifyContent: "center" }}>
        {["⭐", "🔥", "💎", "🎯"].map((b, i) => (
          <div key={i} style={{ width: 22, height: 22, borderRadius: "50%", background: `${color}${i < 3 ? "18" : "08"}`, border: `1px solid ${color}${i < 3 ? "33" : "15"}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10 }}>{b}</div>
        ))}
      </div>
      <div style={{ fontSize: 8, color: `${color}66`, fontFamily: "system-ui", marginTop: 4 }}>🔥 5-day streak</div>
    </div>
  );
};

const MiniTeacherDash: React.FC<{ color: string }> = ({ color }) => (
  <div style={{ padding: 8 }}>
    {/* Summary row */}
    <div style={{ display: "flex", gap: 4, marginBottom: 6 }}>
      {[{ label: "28", sub: "Students" }, { label: "4", sub: "Groups" }, { label: "92%", sub: "On Track" }].map((s, i) => (
        <div key={i} style={{ flex: 1, textAlign: "center", padding: 3, borderRadius: 4, background: `${color}08` }}>
          <div style={{ fontSize: 12, fontWeight: 700, color, fontFamily: "system-ui" }}>{s.label}</div>
          <div style={{ fontSize: 7, color: `${color}66`, fontFamily: "system-ui" }}>{s.sub}</div>
        </div>
      ))}
    </div>
    {/* Mini chart */}
    <div style={{ display: "flex", alignItems: "flex-end", gap: 2, height: 30 }}>
      {[40, 55, 70, 65, 80, 75, 90, 85].map((h, i) => (
        <div key={i} style={{ flex: 1, height: `${h}%`, borderRadius: 2, background: `${color}${30 + i * 8}` }} />
      ))}
    </div>
    <div style={{ fontSize: 7, color: `${color}55`, fontFamily: "system-ui", marginTop: 3, textAlign: "center" }}>Weekly Progress</div>
  </div>
);

const MiniEscapeRoom: React.FC<{ color: string }> = ({ color }) => (
  <div style={{ padding: 8, textAlign: "center" }}>
    <div style={{ fontSize: 24, marginBottom: 4 }}>🔐</div>
    {/* Puzzle progress */}
    <div style={{ display: "flex", gap: 3, justifyContent: "center", marginBottom: 6 }}>
      {["✓", "✓", "?", "🔒"].map((p, i) => (
        <div key={i} style={{ width: 24, height: 24, borderRadius: 4, background: i < 2 ? `${color}20` : `${color}08`, border: `1px solid ${color}${i < 2 ? "44" : "22"}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, color: i < 2 ? "#4ade80" : `${color}88` }}>{p}</div>
      ))}
    </div>
    {/* Timer */}
    <div style={{ fontSize: 14, fontFamily: "monospace", color, fontWeight: 700 }}>04:32</div>
    <div style={{ fontSize: 8, color: `${color}55`, fontFamily: "system-ui", marginTop: 2 }}>Team Alpha · 2/4 solved</div>
  </div>
);

const MiniLessonPlan: React.FC<{ color: string }> = ({ color }) => (
  <div style={{ padding: 8 }}>
    <div style={{ fontSize: 9, color, fontFamily: "system-ui", fontWeight: 600, marginBottom: 4 }}>📋 Lesson Plan</div>
    {[
      { label: "Standard: CCSS.ELA.RL.3.1", done: true },
      { label: "Warm-up: KWL Chart", done: true },
      { label: "Activity: Leveled Reader", done: false },
      { label: "Assessment: Quiz", done: false },
    ].map((item, i) => (
      <div key={i} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 9, color: item.done ? `${color}88` : `${color}cc`, fontFamily: "system-ui", marginBottom: 3 }}>
        <span style={{ color: item.done ? "#4ade80" : `${color}33`, fontSize: 8 }}>{item.done ? "✓" : "○"}</span>
        <span style={{ textDecoration: item.done ? "line-through" : "none", opacity: item.done ? 0.6 : 1 }}>{item.label}</span>
      </div>
    ))}
    <div style={{ height: 4, borderRadius: 2, background: `${color}15`, marginTop: 4 }}>
      <div style={{ width: "50%", height: "100%", borderRadius: 2, background: color }} />
    </div>
  </div>
);

const FeatureCard: React.FC<FeatureCardProps> = ({ icon, title, description, color, accentColor, index, tags, miniUi, pixelAccent }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Alternate direction based on index
  const fromRight = index % 2 === 0;
  const slideIn = spring({ frame, fps, config: { damping: 16, stiffness: 80 } });
  const translateX = interpolate(slideIn, [0, 1], [fromRight ? 150 : -150, 0]);
  const opacity = interpolate(frame, [0, 15], [0, 1], { extrapolateRight: "clamp" });

  const iconScale = spring({ frame: frame - 8, fps, config: { damping: 8, stiffness: 120 } });
  // Gentle breathing wobble while visible
  const iconBreath = frame > 25 ? 1 + Math.sin(frame * 0.06) * 0.025 : 1;

  const miniSlide = spring({ frame: frame - 15, fps, config: { damping: 14, stiffness: 90 } });
  const miniX = interpolate(miniSlide, [0, 1], [fromRight ? 80 : -80, 0]);
  const miniOpacity = interpolate(frame, [15, 28], [0, 1], { extrapolateRight: "clamp" });

  const barWidth = interpolate(frame, [10, 80], [0, 100], { extrapolateRight: "clamp" });

  const exitOpacity = interpolate(frame, [110, 122], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const exitScale = interpolate(frame, [110, 122], [1, 0.96], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const numOpacity = interpolate(frame, [5, 18], [0, 0.05], { extrapolateRight: "clamp" });

  // Entry glow flash — bright burst of accent color that fades quickly
  const entryFlash = interpolate(frame, [0, 4, 18], [0, 0.12, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Radial glow that pulses behind the icon
  const iconGlow = interpolate(frame, [8, 25], [0, 0.15], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const iconGlowPulse = frame > 25 ? Math.sin(frame * 0.05) * 0.04 + iconGlow : iconGlow;

  return (
    <AbsoluteFill
      style={{
        background: `linear-gradient(135deg, #0f172a 0%, ${color} 100%)`,
        justifyContent: "center",
        alignItems: "center",
        opacity: opacity * exitOpacity,
        transform: `scale(${exitScale})`,
      }}
    >
      {/* Entry flash overlay */}
      <AbsoluteFill style={{ background: accentColor, opacity: entryFlash }} />

      {/* Chapter marker — only on the first card, top-left */}
      {index === 0 && (
        <div
          style={{
            position: "absolute",
            top: 55,
            right: 80,
            display: "flex",
            alignItems: "baseline",
            gap: 8,
            opacity: interpolate(frame, [20, 40, 100, 120], [0, 0.5, 0.5, 0], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            }),
            zIndex: 6,
          }}
        >
          <span style={{ fontSize: 20, fontFamily: "Georgia, serif", fontStyle: "italic", fontWeight: 400, color: accentColor, letterSpacing: "0.1em", display: "inline-block", transform: `scale(${interpolate(frame, [20, 38], [0.6, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })})` }}>V.</span>
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <span style={{ fontSize: 9, fontFamily: "monospace", color: "#64748b", letterSpacing: "0.3em", fontWeight: 700 }}>THE TOOLKIT</span>
            <span style={{ fontSize: 7, fontFamily: "monospace", color: "#475569", letterSpacing: "0.2em", fontWeight: 500 }}>05 / 09 · 30.8s</span>
          </div>
        </div>
      )}

      {/* Ambient floating particles */}
      {Array.from({ length: 10 }, (_, pi) => {
        const seed = pi * 31 + index * 17;
        const px = ((Math.sin(seed) * 49297) % 1800 + 1800) % 1800 + 60;
        const speed = 0.25 + (pi % 4) * 0.1;
        const yBase = 1080 - ((frame * speed + pi * 110) % 1200);
        const xDrift = Math.sin(frame * 0.015 + pi * 2.2) * 25;
        const pOp = interpolate(yBase, [50, 200, 850, 1050], [0, 0.2, 0.15, 0], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });
        return (
          <div
            key={`card-mote-${pi}`}
            style={{
              position: "absolute",
              left: px + xDrift,
              top: yBase,
              width: 2 + (pi % 3),
              height: 2 + (pi % 3),
              borderRadius: "50%",
              background: accentColor,
              opacity: pOp * interpolate(frame, [5, 20], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
              boxShadow: `0 0 6px ${accentColor}44`,
              pointerEvents: "none",
            }}
          />
        );
      })}

      {/* Hero card progress dots (1/5 through 5/5) */}
      <div
        style={{
          position: "absolute",
          top: 32,
          right: 50,
          display: "flex",
          gap: 8,
          alignItems: "center",
          zIndex: 5,
          opacity: interpolate(frame, [8, 20], [0, 0.7], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
        }}
      >
        {/* Position counter */}
        <span
          style={{
            fontSize: 11,
            fontFamily: "monospace",
            color: accentColor,
            letterSpacing: "0.15em",
            fontWeight: 700,
            marginRight: 8,
            textShadow: `0 0 ${5 + Math.sin(frame * 0.07) * 3}px ${accentColor}88`,
          }}
        >
          0{index + 1} / 05
        </span>
        {Array.from({ length: 5 }, (_, di) => (
          <div
            key={di}
            style={{
              width: di === index ? 20 : 6,
              height: 6,
              borderRadius: 3,
              background: di === index
                ? `linear-gradient(90deg, ${accentColor}, ${accentColor}aa)`
                : di < index
                  ? "rgba(255,255,255,0.35)"
                  : "rgba(255,255,255,0.12)",
              boxShadow: di === index ? `0 0 8px ${accentColor}66` : undefined,
              transition: "width 0.3s",
            }}
          />
        ))}
      </div>

      {/* Radial glow behind content area */}
      <div
        style={{
          position: "absolute",
          width: 700,
          height: 700,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${accentColor}22, transparent 60%)`,
          opacity: iconGlowPulse,
          left: "30%",
          top: "50%",
          transform: "translate(-50%, -50%)",
        }}
      />

      <StarField count={20} speed={0.15} color={`${accentColor}33`} />
      <FloatingTags tags={tags} color={accentColor} startFrame={5} />

      <div
        style={{
          position: "absolute",
          right: 50 + Math.sin(frame * 0.01) * 8,
          top: 10 + Math.cos(frame * 0.008) * 5,
          fontSize: 300,
          fontWeight: 900,
          fontFamily: "system-ui, sans-serif",
          color: "#ffffff",
          opacity: numOpacity,
          lineHeight: 1,
        }}
      >
        {index + 1}
      </div>

      {/* Demo-user reaction emoji — top-left, clear of progress dots & chapter marker */}
      <div
        style={{
          position: "absolute",
          top: 140,
          left: 50,
          fontSize: 36,
          opacity: interpolate(frame, [40, 55, 100, 115], [0, 0.85, 0.85, 0], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          }),
          transform: `scale(${interpolate(frame, [40, 50, 56], [0.3, 1.3, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          })}) translateY(${Math.sin(frame * 0.1) * 4}px)`,
          filter: `drop-shadow(0 0 10px ${accentColor}88)`,
          pointerEvents: "none",
          zIndex: 4,
        }}
      >
        {["🔭", "⚔️", "💬", "📝", "🏆"][index] || "✨"}
      </div>

      {/* Pixel art scene or mini AlloBot */}
      {pixelAccent ? (
        <div style={{ position: "absolute", bottom: 25, left: 50, zIndex: 1 }}>
          {pixelAccent}
        </div>
      ) : null}
      <div style={{
        position: "absolute",
        bottom: 30,
        right: 40,
        opacity: 0.4 + Math.sin(frame * 0.05) * 0.1,
      }}>
        <AlloBot size={65} />
        {/* Glow ring around mini AlloBot — slow rotation + dashed for orbital feel */}
        <div
          style={{
            position: "absolute",
            inset: -8,
            borderRadius: "50%",
            border: `1px dashed ${accentColor}33`,
            opacity: 0.3 + Math.sin(frame * 0.08) * 0.15,
            boxShadow: `0 0 12px ${accentColor}11`,
            transform: `rotate(${frame * 0.5}deg)`,
          }}
        />
      </div>

      {/* Status badge — top-left corner, with category type */}
      <div
        style={{
          position: "absolute",
          top: 70,
          left: 50,
          display: "flex",
          gap: 8,
          alignItems: "center",
          opacity: interpolate(frame, [15, 30], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
          zIndex: 3,
        }}
      >
        {/* Category type label */}
        <div
          style={{
            padding: "4px 10px",
            borderRadius: 4,
            background: `rgba(255,255,255,0.05)`,
            border: `1px solid rgba(255,255,255,0.1)`,
            fontSize: 10,
            fontFamily: "monospace",
            fontWeight: 700,
            color: "#94a3b8",
            letterSpacing: "0.2em",
            opacity: 0.9 + Math.sin(frame * 0.06) * 0.1,
          }}
        >
          {["STEM", "NARRATIVE", "AAC", "ASSESS", "ENGAGE"][index] || "CORE"}
        </div>
        <div
          style={{
            padding: "4px 10px",
            borderRadius: 4,
            background: `${accentColor}18`,
            border: `1px solid ${accentColor}44`,
            fontSize: 10,
            fontFamily: "monospace",
            fontWeight: 700,
            color: accentColor,
            letterSpacing: "0.1em",
            display: "flex",
            alignItems: "center",
            gap: 5,
            boxShadow: `0 0 ${4 + Math.sin(frame * 0.12) * 3}px ${accentColor}33`,
          }}
        >
          <span
            style={{
              width: 5,
              height: 5,
              borderRadius: "50%",
              background: accentColor,
              opacity: 0.5 + Math.sin(frame * 0.2) * 0.4,
              boxShadow: `0 0 4px ${accentColor}`,
            }}
          />
          AI
        </div>
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 40,
          transform: `translateX(${translateX}px)`,
          maxWidth: 1050,
          zIndex: 1,
        }}
      >
        <div
          style={{
            width: 130,
            height: 130,
            borderRadius: "50%",
            background: `linear-gradient(135deg, ${accentColor}20, ${accentColor}08)`,
            border: `2px solid ${accentColor}44`,
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            fontSize: 60,
            transform: `scale(${iconScale * iconBreath})`,
            flexShrink: 0,
            boxShadow: `0 0 50px ${accentColor}18, inset 0 0 30px ${accentColor}0a, 0 10px 40px rgba(0,0,0,0.3)`,
            position: "relative",
          }}
        >
          {icon}
          {/* Rotating inner dashed ring */}
          <svg
            width="150"
            height="150"
            viewBox="0 0 150 150"
            style={{
              position: "absolute",
              left: -10,
              top: -10,
              transform: `rotate(${frame * 0.8}deg)`,
              pointerEvents: "none",
            }}
          >
            <circle
              cx="75"
              cy="75"
              r="72"
              fill="none"
              stroke={accentColor}
              strokeWidth="1"
              strokeDasharray="3,6"
              opacity="0.35"
            />
          </svg>
          {/* Counter-rotating outer dots */}
          <svg
            width="170"
            height="170"
            viewBox="0 0 170 170"
            style={{
              position: "absolute",
              left: -20,
              top: -20,
              transform: `rotate(${-frame * 0.5}deg)`,
              pointerEvents: "none",
            }}
          >
            {[0, 90, 180, 270].map((a, i) => (
              <circle
                key={i}
                cx={85 + Math.cos((a * Math.PI) / 180) * 82}
                cy={85 + Math.sin((a * Math.PI) / 180) * 82}
                r="2"
                fill={accentColor}
                opacity="0.5"
              />
            ))}
          </svg>
        </div>

        <div style={{ flex: 1 }}>
          <div
            style={{
              fontSize: 46,
              fontWeight: 700,
              fontFamily: "system-ui, sans-serif",
              color: "#ffffff",
              marginBottom: 10,
              textShadow: `0 0 ${30 + Math.sin(frame * 0.04 + index * 0.7) * 10}px ${accentColor}${Math.round(0x28 + Math.sin(frame * 0.04 + index * 0.7) * 0x10).toString(16).padStart(2, "0")}`,
              letterSpacing: "-0.01em",
              display: "flex",
              alignItems: "center",
              gap: 16,
            }}
          >
            {/* Decorative chevron — gentle "pointing" nudge after it slides in */}
            <span
              style={{
                color: accentColor,
                fontSize: 28,
                opacity: interpolate(frame, [10, 25], [0, 0.7], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })
                  * (frame > 25 ? 0.85 + Math.sin(frame * 0.08) * 0.15 : 1),
                transform: `translateX(${interpolate(frame, [10, 25], [-8, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) + (frame > 25 ? Math.sin(frame * 0.08) * 1.5 : 0)}px)`,
                display: "inline-block",
                fontWeight: 400,
                textShadow: frame > 25 ? `0 0 ${4 + Math.sin(frame * 0.08) * 3}px ${accentColor}aa` : undefined,
              }}
            >
              ▸
            </span>
            {title}
          </div>
          <div
            style={{
              fontSize: 24,
              fontWeight: 400,
              fontFamily: "system-ui, sans-serif",
              color: "#cbd5e1",
              lineHeight: 1.55,
              whiteSpace: "pre-line",
              textShadow: `0 0 ${10 + Math.sin(frame * 0.04) * 4}px ${accentColor}${Math.round(0x10 + Math.sin(frame * 0.04) * 0x08).toString(16).padStart(2, "0")}`,
            }}
          >
            {description}
          </div>
          <div
            style={{
              width: 240,
              height: 3,
              background: "rgba(255,255,255,0.06)",
              borderRadius: 2,
              marginTop: 16,
              overflow: "visible",
              position: "relative",
            }}
          >
            <div
              style={{
                width: `${barWidth}%`,
                height: "100%",
                background: `linear-gradient(90deg, ${accentColor}, ${accentColor}77)`,
                borderRadius: 2,
                boxShadow: `0 0 8px ${accentColor}55`,
              }}
            />
            {/* Bright leading edge glow on the progress bar — fast shimmer adds energy */}
            {barWidth > 0 && barWidth < 100 && (
              <div
                style={{
                  position: "absolute",
                  left: `${barWidth}%`,
                  top: "50%",
                  transform: `translate(-50%, -50%) scale(${1 + Math.sin(frame * 0.35) * 0.18})`,
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  background: "#ffffff",
                  boxShadow: `0 0 ${8 + Math.sin(frame * 0.35) * 4}px ${accentColor}, 0 0 ${16 + Math.sin(frame * 0.35) * 6}px ${accentColor}88`,
                  opacity: 0.75 + Math.sin(frame * 0.35) * 0.2,
                }}
              />
            )}
            {/* ✓ Checkmark appears at end when bar reaches 100% */}
            {barWidth >= 100 && (
              <div
                style={{
                  position: "absolute",
                  right: -22,
                  top: "50%",
                  transform: `translateY(-50%) scale(${interpolate(frame, [80, 88, 92], [0, 1.4, 1], {
                    extrapolateLeft: "clamp",
                    extrapolateRight: "clamp",
                  })})`,
                  fontSize: 14,
                  color: accentColor,
                  fontWeight: 800,
                  textShadow: `0 0 6px ${accentColor}`,
                }}
              >
                ✓
              </div>
            )}
          </div>
        </div>

        {/* Data flow particles from icon to mini UI — shows connection */}
        {Array.from({ length: 4 }, (_, pi) => {
          const period = 35 + pi * 8;
          const t = ((frame + pi * 12) % period) / period;
          if (frame < 30) return null;
          // Icon is at the left in the flex (~130px wide), mini UI is at the right (~165px wide)
          // Gap is 40px between them. Total horizontal travel ~700px from icon center to UI center
          const startX = 0;
          const endX = 600;
          const x = startX + t * (endX - startX);
          const arc = Math.sin(t * Math.PI) * 25;
          const op = Math.sin(t * Math.PI) * 0.5;
          return (
            <div
              key={`fc-flow-${pi}`}
              style={{
                position: "absolute",
                left: `calc(50% - 200px + ${x}px)`,
                top: `calc(50% - ${arc}px)`,
                width: 3,
                height: 3,
                borderRadius: "50%",
                background: accentColor,
                opacity: op,
                boxShadow: `0 0 6px ${accentColor}88`,
                pointerEvents: "none",
                zIndex: 0,
              }}
            />
          );
        })}

        {/* Glassmorphism mini UI */}
        <div
          style={{
            width: 165,
            minHeight: 140,
            borderRadius: 14,
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.1)",
            overflow: "hidden",
            flexShrink: 0,
            opacity: miniOpacity,
            transform: `translateX(${miniX}px)`,
            boxShadow: `0 8px 32px rgba(0,0,0,0.3), inset 0 0 0 1px rgba(255,255,255,0.05), 0 0 ${10 + Math.sin(frame * 0.07) * 5}px ${accentColor}${Math.round(0x10 + Math.sin(frame * 0.07) * 0x06).toString(16).padStart(2, "0")}`,
          }}
        >
          <div
            style={{
              padding: "7px 10px",
              display: "flex",
              gap: 4,
              borderBottom: "1px solid rgba(255,255,255,0.06)",
            }}
          >
            <div style={{
              width: 6,
              height: 6,
              borderRadius: "50%",
              background: "#f87171",
              opacity: 0.85 + Math.sin(frame * 0.08) * 0.15,
            }} />
            <div style={{
              width: 6,
              height: 6,
              borderRadius: "50%",
              background: "#fbbf24",
              opacity: 0.85 + Math.sin(frame * 0.09 + 1) * 0.15,
            }} />
            <div style={{
              width: 6,
              height: 6,
              borderRadius: "50%",
              background: "#4ade80",
              boxShadow: `0 0 ${3 + Math.sin(frame * 0.18) * 2}px rgba(74,222,128,0.6)`,
            }} />
            <div style={{ flex: 1 }} />
            {/* Live indicator */}
            <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
              <div style={{
                width: 4,
                height: 4,
                borderRadius: "50%",
                background: accentColor,
                opacity: 0.5 + Math.sin(frame * 0.15) * 0.3,
                boxShadow: `0 0 4px ${accentColor}66`,
              }} />
              <span style={{
                fontSize: 7,
                fontFamily: "monospace",
                color: accentColor,
                opacity: 0.4 + Math.sin(frame * 0.18) * 0.2,
                textShadow: `0 0 ${2 + Math.sin(frame * 0.18) * 1}px ${accentColor}88`,
              }}>LIVE</span>
            </div>
          </div>
          {miniUi}
          {/* Shimmer sweep across mini UI */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              overflow: "hidden",
              borderRadius: 14,
              pointerEvents: "none",
            }}
          >
            <div
              style={{
                position: "absolute",
                top: 0,
                left: `${interpolate(frame, [20, 70], [-40, 140], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })}%`,
                width: "25%",
                height: "100%",
                background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.06), transparent)",
                transform: "skewX(-15deg)",
              }}
            />
          </div>
        </div>
      </div>

      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          height: 3,
          background: `linear-gradient(90deg, transparent, ${accentColor}, transparent)`,
          width: `${interpolate(frame, [5, 60], [0, 100], { extrapolateRight: "clamp" })}%`,
        }}
      />
      <div
        style={{
          position: "absolute",
          top: 0,
          right: 0,
          height: 2,
          background: `linear-gradient(270deg, transparent, ${accentColor}55, transparent)`,
          width: `${interpolate(frame, [10, 70], [0, 60], { extrapolateRight: "clamp" })}%`,
        }}
      />
      {/* Edge-tracing glow — vertical left */}
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          width: 2,
          background: `linear-gradient(180deg, ${accentColor}88, transparent)`,
          height: `${interpolate(frame, [12, 55], [0, 100], { extrapolateRight: "clamp" })}%`,
          boxShadow: `0 0 8px ${accentColor}44`,
        }}
      />
      {/* Edge-tracing glow — vertical right */}
      <div
        style={{
          position: "absolute",
          right: 0,
          bottom: 0,
          width: 2,
          background: `linear-gradient(0deg, ${accentColor}88, transparent)`,
          height: `${interpolate(frame, [20, 65], [0, 100], { extrapolateRight: "clamp" })}%`,
          boxShadow: `0 0 8px ${accentColor}44`,
        }}
      />
      {/* Corner accent dots */}
      {[
        { left: 0, top: 0 },
        { right: 0, top: 0 },
        { left: 0, bottom: 0 },
        { right: 0, bottom: 0 },
      ].map((pos, ci) => (
        <div
          key={`corner-${ci}`}
          style={{
            position: "absolute",
            ...pos,
            width: 4,
            height: 4,
            background: accentColor,
            borderRadius: "50%",
            opacity: interpolate(frame, [15 + ci * 5, 25 + ci * 5], [0, 0.6], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            }),
            boxShadow: `0 0 6px ${accentColor}`,
          }}
        />
      ))}
    </AbsoluteFill>
  );
};

const features: Omit<FeatureCardProps, "index">[] = [
  {
    icon: "🔬",
    title: "80+ STEM Lab Tools",
    description: "Physics, chemistry, biology, math & CS simulations\nthat adapt to every learner's level.",
    color: "#0c2341",
    accentColor: "#60a5fa",
    tags: ["Physics", "Chemistry", "Biology", "Math", "Engineering", "Coding", "Circuit Builder"],
    miniUi: <MiniGrid color="#60a5fa" cols={4} rows={3} />,
    pixelAccent: <PixelLabScene pixelSize={4} enterDelay={10} />,
  },
  {
    icon: "🔊",
    title: "Word Sounds Studio",
    description: "10 phonemic awareness activities with Elkonin boxes,\nspeech recognition & adaptive difficulty.",
    color: "#2e1a1a",
    accentColor: "#fb923c",
    tags: ["Phonemes", "Blending", "Segmenting", "Rhyming", "Elkonin", "Speech", "Decoding"],
    miniUi: <MiniElkonin color="#fb923c" />,
    pixelAccent: <PixelSoundScene pixelSize={4} enterDelay={10} />,
  },
  {
    icon: "⚔️",
    title: "Adventure Mode",
    description: "Choose-your-own-adventure RPG with AI-generated\nscenes, XP leveling & storybook export.",
    color: "#1a0c2e",
    accentColor: "#c084fc",
    tags: ["RPG", "Narrative", "XP", "Inventory", "Boss", "Storybook", "AI Scenes", "Quests"],
    miniUi: <MiniAdventure color="#c084fc" />,
    pixelAccent: <SwordRaiseScene pixelSize={5} enterDelay={10} />,
  },
  {
    icon: "🐉",
    title: "Boss Encounter & 19 Games",
    description: "Whole-class boss fights, escape rooms, bingo,\ncrosswords, memory & more — all AI-generated.",
    color: "#2e0c1a",
    accentColor: "#fb7185",
    // "Jeopardy" was not a real game — no such component exists in games_module.js.
    // Replaced with Matching, which does. The app calls it "Boss Encounter".
    tags: ["Boss Encounter", "Escape Room", "Bingo", "Crossword", "Memory", "Matching", "Scramble"],
    miniUi: <MiniBossBattle color="#fb7185" />,
    pixelAccent: <DragonBattleScene pixelSize={4} enterDelay={8} />,
  },
  {
    icon: "💬",
    title: "Symbol Studio",
    description: "AI-powered AAC and visual communication boards.\nA free, open alternative to Boardmaker.",
    color: "#0c2e2e",
    accentColor: "#34d399",
    tags: ["AAC", "PCS", "Visual Supports", "Communication", "Social Stories", "Schedules"],
    miniUi: <MiniSymbols color="#34d399" />,
    pixelAccent: <PixelSymbolScene pixelSize={4} enterDelay={10} />,
  },
  {
    icon: "📊",
    title: "Behavior Lens",
    description: "Clinical FBA/BIP tools — ABC data, interval recording,\nscatterplots & preference assessments.",
    color: "#2e1a0c",
    accentColor: "#fbbf24",
    tags: ["FBA", "BIP", "BCBA", "ABC Data", "IOA", "MSWO", "Scatterplot"],
    miniUi: <MiniChart color="#fbbf24" bars={[40, 70, 55, 85, 45, 90, 60]} />,
    pixelAccent: <PixelChartScene pixelSize={4} enterDelay={10} />,
  },
  {
    icon: "📝",
    title: "Report Writer",
    description: "Psychoeducational reports with 15+ assessment presets.\nWISC-V, WIAT-4, BASC-3, Vineland & more.",
    color: "#1a0c2e",
    accentColor: "#a78bfa",
    tags: ["WISC-V", "WIAT-4", "BASC-3", "IEP", "Evaluation", "Norms", "Bilingual"],
    miniUi: <MiniLines color="#a78bfa" count={6} />,
    pixelAccent: <PixelScrollScene pixelSize={4} enterDelay={10} />,
  },
  {
    icon: "📈",
    title: "Math Fluency & Analytics",
    description: "K-8 CBM probes with DCPM scoring, RTI tier\nclassification & progress monitoring dashboards.",
    color: "#0c2e22",
    accentColor: "#2dd4bf",
    tags: ["CBM", "DCPM", "RTI", "Tier 1", "Tier 2", "Tier 3", "ORF", "Progress Monitoring"],
    miniUi: <MiniMathFluency color="#2dd4bf" />,
    pixelAccent: <PixelMathScene pixelSize={4} enterDelay={10} />,
  },
  {
    icon: "🧠",
    title: "SEL Hub",
    description: "8 social-emotional tools — Zones of Regulation,\ncoping skills, mindfulness & emotion recognition.",
    color: "#1a2e0c",
    accentColor: "#a3e635",
    tags: ["CASEL", "Zones", "Coping", "Mindfulness", "Emotions", "Social Skills", "Self-Regulation"],
    miniUi: <MiniSEL color="#a3e635" />,
    pixelAccent: <PixelHeartScene pixelSize={4} enterDelay={10} />,
  },
  {
    icon: "🔒",
    title: "Privacy-First & Accessible",
    description: "FERPA-compatible, privacy-first design. Dyslexia fonts,\nimmersive reader, 40+ languages & runs on Chromebooks.",
    color: "#0c1a2e",
    accentColor: "#38bdf8",
    tags: ["FERPA", "COPPA", "Chromebook", "Dyslexia", "TTS", "Bionic Reading", "Offline"],
    miniUi: (
      <div style={{ padding: 8, display: "flex", flexDirection: "column", gap: 5, alignItems: "center" }}>
        <svg width="32" height="32" viewBox="0 0 40 40" fill="none">
          <rect x="8" y="18" width="24" height="18" rx="3" fill="#38bdf822" stroke="#38bdf8" strokeWidth="1.5" />
          <path d="M14 18V12a6 6 0 0 1 12 0v6" stroke="#38bdf8" strokeWidth="1.5" strokeLinecap="round" fill="none" />
          <circle cx="20" cy="27" r="3" fill="#38bdf8" />
        </svg>
        {["FERPA-Aligned", "Privacy-First", "Immersive Reader", "63 Languages"].map((t, i) => (
          <div
            key={i}
            style={{
              fontSize: 9,
              color: "#38bdf8",
              display: "flex",
              alignItems: "center",
              gap: 4,
              fontFamily: "system-ui",
            }}
          >
            <span style={{ color: "#4ade80" }}>✓</span> {t}
          </div>
        ))}
      </div>
    ),
    pixelAccent: <PixelShieldScene pixelSize={4} enterDelay={10} />,
  },
  {
    icon: "🏆",
    title: "Gamification Engine",
    description: "XP, levels, streaks, badges & leaderboards across every\ntool — turns any activity into a quest.",
    color: "#2e1a0c",
    accentColor: "#fbbf24",
    tags: ["XP", "Levels", "Badges", "Streaks", "Leaderboard", "Rewards", "Quests"],
    miniUi: <MiniGamification color="#fbbf24" />,
    pixelAccent: <PixelXPScene pixelSize={4} enterDelay={10} />,
  },
  {
    icon: "📊",
    title: "Teacher Dashboard",
    description: "Live class analytics — IEP goal tracking, tier monitoring,\nresponse heatmaps & exportable reports.",
    color: "#1a0c2e",
    accentColor: "#8b5cf6",
    tags: ["Analytics", "IEP Goals", "RTI Tiers", "Heatmaps", "Reports", "Progress", "Data"],
    miniUi: <MiniTeacherDash color="#8b5cf6" />,
    pixelAccent: <PixelDashboardScene pixelSize={4} enterDelay={10} />,
  },
  {
    icon: "🔐",
    title: "Escape Room Builder",
    description: "AI-generated puzzle rooms with locks, clues & timers.\nFully customizable by subject and grade level.",
    color: "#1a0c2e",
    accentColor: "#a78bfa",
    tags: ["Puzzles", "Locks", "Clues", "Timer", "AI Generated", "Collaborative", "Custom"],
    miniUi: <MiniEscapeRoom color="#a78bfa" />,
    pixelAccent: <PixelEscapeScene pixelSize={4} enterDelay={10} />,
  },
  {
    icon: "📋",
    title: "Lesson Plan Builder",
    description: "AI-assisted lesson planning aligned to Common Core,\nNGSS & state standards with differentiation built in.",
    color: "#0c2e1a",
    accentColor: "#4ade80",
    tags: ["CCSS", "NGSS", "Standards", "Differentiation", "UDL", "Scaffolds", "Pacing"],
    miniUi: <MiniLessonPlan color="#4ade80" />,
    pixelAccent: <PixelLessonScene pixelSize={4} enterDelay={10} />,
  },
  {
    icon: "📖",
    title: "Story Forge",
    description: "AI-powered creative writing studio with Flesch-Kincaid analysis,\nscaffolds & vocabulary tools.",
    color: "#1a0c2e",
    accentColor: "#fb7185",
    tags: ["Writing", "Flesch-Kincaid", "Vocabulary", "Scaffolds", "AI Stories"],
    miniUi: <MiniLines color="#fb7185" count={5} />,
  },
  {
    icon: "✍️",
    title: "WriteCraft",
    description: "Writing scaffolds, dictation, and editing tools that adapt\nto each student's needs.",
    color: "#0c1a2e",
    accentColor: "#06b6d4",
    tags: ["Dictation", "Scaffolds", "Editing", "Speech-to-Text", "Drafts"],
    miniUi: <MiniLines color="#06b6d4" count={4} />,
  },
  {
    icon: "⌨️",
    title: "Typing Practice",
    description: "Disability-first typing training with IEP workflow integration\nand progress tracking.",
    color: "#0c2e1a",
    accentColor: "#10b981",
    tags: ["Accessibility", "IEP", "Motor Skills", "Adaptive", "Progress"],
    miniUi: <MiniGrid color="#10b981" cols={4} rows={2} />,
  },
  {
    icon: "🚗",
    title: "RoadReady",
    description: "Driver's Ed simulator with permit test, parking practice\n& fuel efficiency physics.",
    color: "#2e1a0c",
    accentColor: "#f59e0b",
    tags: ["Maine DMV", "Permit Test", "Parking", "Hypermiling", "Life Skills"],
    miniUi: <MiniChart color="#f59e0b" bars={[40, 60, 50, 80, 70, 90]} />,
  },
  {
    icon: "📄",
    title: "Document Builder",
    description: "AI-assisted IEP documents, evaluations, and reports with\nbuilt-in templates and pipelines.",
    color: "#1a2e0c",
    accentColor: "#84cc16",
    tags: ["IEP Docs", "Templates", "Evaluations", "PDF Export", "AI Drafts"],
    miniUi: <MiniLines color="#84cc16" count={6} />,
  },
];

const FRAMES_PER_CARD = 125;

// Split features into hero (full cards) and montage (rapid grid)
const HERO_INDICES = [0, 2, 4, 6, 10]; // STEM Lab, Adventure, Symbol Studio, Report Writer, Gamification
const heroFeatures = HERO_INDICES.map((i) => features[i]);
const montageFeatures = features.filter((_, i) => !HERO_INDICES.includes(i));

const TICKER_ITEMS = [
  "STEM Lab", "Word Sounds", "Adventure Mode", "Boss Encounter", "Symbol Studio",
  "Behavior Lens", "Report Writer", "Math Fluency", "SEL Hub", "Story Forge",
  "WriteCraft", "Typing Practice", "RoadReady", "Document Builder", "AlloBot",
  // "Phoneme App" and "Expert Workbench" were not names the app uses. Replaced
  // with the real ones: Live Sessions, and the doc pipeline's Workbench.
  "Live Sessions", "Gamification", "Teacher Dashboard", "Escape Room",
  "Lesson Plans", "Space Explorer", "Cyber Defense", "Workbench", "App Lab",
  "FERPA-Aligned", "63 Languages", "AI Powered", "Open Source", "Chromebook Ready",
  "Gemini Canvas", "Local-First Desktop",
];

export const FeatureShowcase: React.FC = () => {
  return (
    <AbsoluteFill>
      {heroFeatures.map((feature, i) => (
        <Sequence key={i} from={i * FRAMES_PER_CARD} durationInFrames={FRAMES_PER_CARD}>
          <FeatureCard {...feature} index={i} />
        </Sequence>
      ))}
      <TickerStrip items={TICKER_ITEMS} speed={1.5} color="#60a5fa" y={1010} enterDelay={30} />
      <ScanlineOverlay opacity={0.025} lineGap={4} />
    </AbsoluteFill>
  );
};

// --- Feature Montage: rapid grid of remaining 10 features ---

const MONTAGE_COL_DELAYS = [80, 55, 30, 55, 80]; // center-out reveal

const MontageTile: React.FC<{
  icon: string;
  title: string;
  accentColor: string;
  tags: string[];
  delay: number;
  index: number;
}> = ({ icon, title, accentColor, tags, delay, index }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const scale = spring({ frame: frame - delay, fps, config: { damping: 14, stiffness: 90 } });
  const opacity = interpolate(frame, [delay, delay + 12], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const row = Math.floor(index / 5);
  // Row 0 slides down from top, row 1 stays centered, row 2 slides up from bottom
  const rowDir = row === 0 ? -1 : row === 2 ? 1 : 0;
  const slideY = rowDir * (1 - scale) * 25;

  const glowPhase = frame - delay - 25;
  const glow = glowPhase > 0 ? Math.sin(glowPhase * 0.07 + index * 0.8) * 0.12 + 0.15 : 0;

  const shimmerPos = interpolate(frame, [delay + 12, delay + 38], [-20, 140], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const entryFlash = interpolate(frame, [delay, delay + 3, delay + 12], [0, 0.07, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <div
      style={{
        width: 290,
        height: 110,
        borderRadius: 14,
        background: `linear-gradient(135deg, ${accentColor}10, ${accentColor}06)`,
        border: `1px solid ${accentColor}33`,
        padding: "12px 16px",
        opacity,
        transform: `scale(${scale}) translateY(${slideY}px)`,
        boxShadow:
          glow > 0
            ? `0 0 ${16 * glow}px ${accentColor}${Math.round(glow * 50).toString(16).padStart(2, "0")}, inset 0 0 16px ${accentColor}06`
            : undefined,
        display: "flex",
        flexDirection: "column",
        gap: 6,
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Entry shimmer */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `linear-gradient(105deg, transparent ${shimmerPos}%, ${accentColor}08 ${shimmerPos + 10}%, transparent ${shimmerPos + 20}%)`,
          pointerEvents: "none",
        }}
      />
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{
          fontSize: 22,
          display: "inline-block",
          transform: `scale(${interpolate(frame, [delay, delay + 6, delay + 14], [0.3, 1.3, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })})`,
        }}>{icon}</span>
        <span
          style={{
            fontSize: 15,
            fontWeight: 700,
            fontFamily: "system-ui, sans-serif",
            color: "#e2e8f0",
          }}
        >
          {title}
        </span>
      </div>

      {/* Tile number indicator */}
      <span
        style={{
          position: "absolute",
          top: 8,
          right: 12,
          fontSize: 8,
          fontFamily: "monospace",
          color: accentColor,
          letterSpacing: "0.1em",
          fontWeight: 700,
          opacity: interpolate(frame, [delay + 14, delay + 24], [0, 0.55], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          }) * (0.85 + Math.sin(frame * 0.06 + index * 0.4) * 0.15),
        }}
      >
        {String(index + 1).padStart(2, "0")}
      </span>
      <div
        style={{
          width: 35,
          height: 2,
          background: `linear-gradient(90deg, ${accentColor}, transparent)`,
          borderRadius: 1,
          opacity: 0.85 + Math.sin(frame * 0.07 + index * 0.5) * 0.15,
        }}
      />
      <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
        {tags.slice(0, 3).map((tag, ti) => {
          const tagDelay = delay + 15 + ti * 4;
          const tagOp = interpolate(frame, [tagDelay, tagDelay + 8], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          });
          const tagY = interpolate(frame, [tagDelay, tagDelay + 8], [4, 0], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          });
          return (
            <span
              key={ti}
              style={{
                fontSize: 9,
                fontFamily: "system-ui, sans-serif",
                fontWeight: 500,
                color: accentColor,
                padding: "2px 7px",
                borderRadius: 7,
                background: `${accentColor}12`,
                border: `1px solid ${accentColor}1a`,
                opacity: tagOp,
                transform: `translateY(${tagY}px)`,
              }}
            >
              {tag}
            </span>
          );
        })}
      </div>
      {/* Bottom accent bar — fills then breathes */}
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          height: 2,
          background: `linear-gradient(90deg, transparent, ${accentColor}, transparent)`,
          width: `${interpolate(frame, [delay, delay + 25], [0, 100], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })}%`,
          borderRadius: 1,
          opacity: frame > delay + 25 ? 0.7 + Math.sin((frame - delay) * 0.06) * 0.3 : 1,
        }}
      />
      {/* Corner ticks */}
      {[
        { top: 4, left: 4, borderTop: `1px solid ${accentColor}66`, borderLeft: `1px solid ${accentColor}66` },
        { top: 4, right: 4, borderTop: `1px solid ${accentColor}66`, borderRight: `1px solid ${accentColor}66` },
        { bottom: 4, left: 4, borderBottom: `1px solid ${accentColor}66`, borderLeft: `1px solid ${accentColor}66` },
        { bottom: 4, right: 4, borderBottom: `1px solid ${accentColor}66`, borderRight: `1px solid ${accentColor}66` },
      ].map((pos, ti) => (
        <div
          key={`tile-tick-${ti}`}
          style={{
            position: "absolute",
            width: 6,
            height: 6,
            ...pos,
            opacity: interpolate(frame, [delay + 8, delay + 20], [0, 0.8], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })
              * (0.85 + Math.sin(frame * 0.06 + ti * Math.PI / 2 + index * 0.3) * 0.15),
            pointerEvents: "none",
          }}
        />
      ))}

      {/* Click-ripple effect when tile appears */}
      {[0, 8].map((rd, ri) => {
        const rippleF = frame - delay - rd;
        if (rippleF < 0 || rippleF > 30) return null;
        const rScale = interpolate(rippleF, [0, 30], [0.3, 2], { extrapolateRight: "clamp" });
        const rOp = interpolate(rippleF, [0, 5, 30], [0, 0.4, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
        return (
          <div
            key={`ripple-${ri}`}
            style={{
              position: "absolute",
              left: "50%",
              top: "50%",
              transform: `translate(-50%, -50%) scale(${rScale})`,
              width: 80,
              height: 80,
              borderRadius: "50%",
              border: `1px solid ${accentColor}`,
              opacity: rOp,
              pointerEvents: "none",
            }}
          />
        );
      })}

      {/* Entry flash */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: accentColor,
          opacity: entryFlash,
          borderRadius: 14,
          pointerEvents: "none",
        }}
      />
    </div>
  );
};

export const FeatureMontage: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const headerScale = spring({ frame: frame - 8, fps, config: { damping: 14, stiffness: 100 } });
  const headerOpacity = interpolate(frame, [8, 25], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const counterOpacity = interpolate(frame, [160, 185], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const counterScale = spring({ frame: frame - 160, fps, config: { damping: 12, stiffness: 80 } });
  // Completion pop when counter reaches 100 (~frame 210)
  const counterCompletePop = interpolate(frame, [208, 214, 224], [1, 1.15, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const toolCount = Math.round(
    interpolate(frame, [160, 210], [0, 100], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    }),
  );

  // Radial pulse when grid fully loads (~frame 105)
  const pulseFrame = frame - 105;

  // Floating light motes
  const motes = Array.from({ length: 15 }, (_, i) => {
    const seed = i * 37 + 7;
    const x = ((Math.sin(seed) * 49297) % 1800 + 1800) % 1800 + 60;
    const speed = 0.2 + (i % 4) * 0.1;
    const yBase = 1080 - ((frame * speed + i * 120) % 1200);
    const xDrift = Math.sin(frame * 0.015 + i * 1.5) * 25;
    const moteOpacity = interpolate(yBase, [50, 200, 900, 1080], [0, 0.12, 0.1, 0], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    });
    // Subtle twinkle pulse — each mote breathes independently
    const twinkle = 0.7 + Math.sin(frame * 0.08 + i * 1.7) * 0.3;
    const colors = ["#a78bfa", "#60a5fa", "#34d399", "#fbbf24", "#f472b6"];
    return { x: x + xDrift, y: yBase, opacity: moteOpacity * twinkle, size: 2 + (i % 3) * 1.5, color: colors[i % 5] };
  });

  return (
    <SceneTransition durationInFrames={300} fadeIn={8} fadeOut={15}>
      <AbsoluteFill
        style={{
          background: `linear-gradient(${135 + Math.sin(frame * 0.011) * 6}deg, #0f172a 0%, #1a0c2e 50%, #0f172a 100%)`,
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <AuroraGlow
          colors={["rgba(167,139,250,0.06)", "rgba(96,165,250,0.05)", "rgba(52,211,153,0.04)"]}
          speed={0.015}
        />
        <HexGrid color="#a78bfa" opacity={0.02} pulseSpeed={0.05} />
        <StarField count={60} speed={0.5} color="#ffffff" />

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
              pointerEvents: "none",
            }}
          />
        ))}

        {/* Radial pulse rings when grid completes */}
        {[0, 15].map((d, i) => {
          const pf = pulseFrame - d;
          if (pf < 0 || pf > 80) return null;
          const pScale = interpolate(pf, [0, 80], [0.2, 5], { extrapolateRight: "clamp" });
          const pOp = interpolate(pf, [0, 8, 60, 80], [0, 0.15, 0.04, 0], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          });
          return (
            <div
              key={`pulse-${i}`}
              style={{
                position: "absolute",
                width: 100,
                height: 100,
                borderRadius: "50%",
                border: `1.5px solid ${i === 0 ? "#a78bfa" : "#60a5fa"}`,
                transform: `scale(${pScale})`,
                opacity: pOp,
                pointerEvents: "none",
              }}
            />
          );
        })}

        {/* View mode indicator — top right */}
        <div
          style={{
            position: "absolute",
            top: 48,
            right: 60,
            display: "flex",
            alignItems: "center",
            gap: 6,
            fontSize: 11,
            fontFamily: "monospace",
            color: "#34d399",
            letterSpacing: "0.2em",
            fontWeight: 700,
            opacity: interpolate(frame, [20, 40, 260, 290], [0, 0.6, 0.6, 0], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            }),
            zIndex: 3,
          }}
        >
          <span style={{ fontSize: 13, transform: `scale(${1 + Math.sin(frame * 0.1) * 0.08})`, display: "inline-block" }}>⊞</span>
          VIEW: GRID
        </div>

        {/* Features unlocked counter — appears in top-left */}
        {(() => {
          // Calculate how many tiles have appeared based on delays
          const visibleCount = montageFeatures.reduce((count, _, i) => {
            const col = i % 5;
            const row = Math.floor(i / 5);
            const delay = MONTAGE_COL_DELAYS[col] + row * 10;
            return count + (frame >= delay + 12 ? 1 : 0);
          }, 0);
          return (
            <div
              style={{
                position: "absolute",
                top: 48,
                left: 60,
                display: "flex",
                alignItems: "center",
                gap: 10,
                fontSize: 12,
                fontFamily: "monospace",
                color: "#a78bfa",
                letterSpacing: "0.15em",
                fontWeight: 700,
                opacity: interpolate(frame, [20, 40, 260, 290], [0, 0.6, 0.6, 0], {
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
                  background: "#a78bfa",
                  opacity: 0.5 + Math.sin(frame * 0.2) * 0.4,
                  boxShadow: `0 0 ${3 + Math.sin(frame * 0.2) * 2}px #a78bfa`,
                }}
              />
              FEATURES UNLOCKED: {String(visibleCount).padStart(2, "0")} / {String(montageFeatures.length).padStart(2, "0")}
            </div>
          );
        })()}

        {/* Header */}
        <div
          style={{
            position: "absolute",
            top: 80,
            left: "50%",
            transform: `translateX(-50%) scale(${0.85 + headerScale * 0.15})`,
            opacity: headerOpacity,
            zIndex: 2,
          }}
        >
          {/* Rotating halo behind header */}
          <div
            style={{
              position: "absolute",
              left: "50%",
              top: "50%",
              transform: `translate(-50%, -50%) rotate(${frame * 0.3}deg)`,
              width: 500,
              height: 80,
              borderRadius: "50%",
              background: "radial-gradient(ellipse, rgba(167,139,250,0.12), rgba(96,165,250,0.06) 50%, transparent 70%)",
              filter: "blur(15px)",
              pointerEvents: "none",
            }}
          />
          <span
            style={{
              fontSize: 44,
              fontWeight: 700,
              fontFamily: "system-ui, sans-serif",
              position: "relative",
              display: "inline-flex",
              alignItems: "center",
              gap: 18,
            }}
          >
            {/* Left decorative bracket */}
            <span
              style={{
                fontSize: 28,
                color: "#a78bfa",
                opacity: interpolate(frame, [14, 30], [0, 0.5], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
                transform: `translateX(${interpolate(frame, [14, 30], [8, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })}px)`,
                fontWeight: 300,
              }}
            >
              ❲
            </span>
            <span
              style={{
                display: "inline-block",
                backgroundImage: `linear-gradient(${135 + Math.sin(frame * 0.02) * 15}deg, #a78bfa, #60a5fa, #34d399, #a78bfa)`,
                backgroundSize: "200% 200%",
                backgroundPosition: `${(frame * 0.6) % 200}% 50%`,
                backgroundClip: "text",
                WebkitBackgroundClip: "text",
                color: "transparent",
                WebkitTextFillColor: "transparent",
              }}
            >
              And so much more...
            </span>
            {/* Right decorative bracket */}
            <span
              style={{
                fontSize: 28,
                color: "#34d399",
                opacity: interpolate(frame, [14, 30], [0, 0.5], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
                transform: `translateX(${interpolate(frame, [14, 30], [-8, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })}px)`,
                fontWeight: 300,
              }}
            >
              ❳
            </span>
          </span>
          {/* Underline accent */}
          <div
            style={{
              width: interpolate(frame, [20, 50], [0, 300], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
              height: 2,
              background: "linear-gradient(90deg, transparent, #a78bfa66, #34d39966, transparent)",
              margin: "8px auto 0",
              borderRadius: 1,
            }}
          />
        </div>

        {/* Scattered sparkle accents — subtle glints across scene */}
        {Array.from({ length: 16 }, (_, si) => {
          const seed = si * 37 + 11;
          const sx = ((Math.sin(seed) * 49297) % 1800 + 1800) % 1800 + 60;
          const sy = ((Math.cos(seed * 1.3) * 49297) % 1000 + 1000) % 1000 + 40;
          const sparkleCycle = (frame + si * 17) % 80;
          const isVisible = sparkleCycle < 20;
          const sOp = isVisible
            ? interpolate(sparkleCycle, [0, 4, 16, 20], [0, 0.7, 0.3, 0])
            : 0;
          const colors = ["#a78bfa", "#60a5fa", "#34d399", "#fbbf24", "#f472b6"];
          return (
            <div
              key={`montage-spark-${si}`}
              style={{
                position: "absolute",
                left: sx,
                top: sy,
                width: 2,
                height: 2,
                borderRadius: "50%",
                background: colors[si % 5],
                opacity: sOp,
                boxShadow: `0 0 4px ${colors[si % 5]}`,
                pointerEvents: "none",
              }}
            />
          );
        })}

        {/* Dataflow particles traveling between grid rows — now 3 rows so 2 streams */}
        {[0, 1].map((rowGap) => {
          const baseY = rowGap === 0 ? 480 : 600;
          return Array.from({ length: 6 }, (_, pi) => {
            const period = 60 + pi * 12;
            const t = ((frame + pi * 18 + rowGap * 30) % period) / period;
            const x = 300 + t * 1320;
            const pOp = Math.sin(t * Math.PI) * 0.35;
            const colors = ["#a78bfa", "#60a5fa", "#34d399", "#fbbf24"];
            return (
              <div
                key={`dataflow-${rowGap}-${pi}`}
                style={{
                  position: "absolute",
                  left: x,
                  top: baseY + Math.sin(t * Math.PI * 2 + pi) * 14,
                  width: 3,
                  height: 3,
                  borderRadius: "50%",
                  background: colors[pi % 4],
                  opacity: pOp,
                  boxShadow: `0 0 6px ${colors[pi % 4]}66`,
                  pointerEvents: "none",
                  zIndex: 0,
                }}
              />
            );
          });
        })}

        {/* 5x3 Feature Grid (15 tiles) */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(5, 290px)",
            gridTemplateRows: "repeat(3, 110px)",
            gap: 14,
            zIndex: 1,
            marginTop: 0,
          }}
        >
          {montageFeatures.map((f, i) => {
            const col = i % 5;
            const row = Math.floor(i / 5);
            const delay = MONTAGE_COL_DELAYS[col] + row * 10;
            return (
              <MontageTile
                key={i}
                icon={f.icon}
                title={f.title}
                accentColor={f.accentColor}
                tags={f.tags}
                delay={delay}
                index={i}
              />
            );
          })}
        </div>

        {/* Expanding ring burst when counter hits 100 */}
        {[0, 10, 20].map((d, ri) => {
          const rf = frame - 210 - d;
          if (rf < 0 || rf > 50) return null;
          const rScale = interpolate(rf, [0, 50], [0.5, 4], { extrapolateRight: "clamp" });
          const rOp = interpolate(rf, [0, 6, 40, 50], [0, 0.25, 0.05, 0], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          });
          return (
            <div
              key={`counter-ring-${ri}`}
              style={{
                position: "absolute",
                bottom: 130,
                left: "50%",
                transform: `translateX(-50%) scale(${rScale})`,
                width: 150,
                height: 150,
                borderRadius: "50%",
                border: `1.5px solid ${ri === 0 ? "#fbbf24" : "#f472b6"}`,
                opacity: rOp,
                pointerEvents: "none",
                zIndex: 1,
              }}
            />
          );
        })}

        {/* Grid completion sparkle burst — when all 15 tiles loaded */}
        {frame > 130 && frame < 165 && Array.from({ length: 12 }, (_, ci) => {
          const burstF = frame - 130 - (ci % 4) * 2;
          if (burstF < 0 || burstF > 30) return null;
          const angle = (ci / 12) * Math.PI * 2;
          const r = interpolate(burstF, [0, 28], [60, 250], { extrapolateRight: "clamp" });
          const cOp = interpolate(burstF, [0, 5, 28], [0, 0.7, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
          const colors = ["#a78bfa", "#60a5fa", "#34d399", "#fbbf24"];
          return (
            <div
              key={`grid-complete-${ci}`}
              style={{
                position: "absolute",
                left: `calc(50% + ${Math.cos(angle) * r}px)`,
                top: `calc(50% + ${Math.sin(angle) * r * 0.5}px)`,
                width: 3,
                height: 3,
                borderRadius: "50%",
                background: colors[ci % 4],
                opacity: cOp,
                boxShadow: `0 0 6px ${colors[ci % 4]}88`,
                pointerEvents: "none",
                zIndex: 1,
              }}
            />
          );
        })}

        {/* Floor separator below grid — subtle horizontal accent */}
        <div
          style={{
            position: "absolute",
            bottom: 200,
            left: "50%",
            transform: "translateX(-50%)",
            width: interpolate(frame, [180, 220], [0, 600], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
            height: 1,
            background: "linear-gradient(90deg, transparent, rgba(167,139,250,0.3), rgba(96,165,250,0.3), rgba(52,211,153,0.3), transparent)",
            opacity: interpolate(frame, [180, 200, 270, 290], [0, 0.6, 0.4, 0], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            }),
            zIndex: 1,
          }}
        />

        {/* Footer summary — x of 100+ */}
        <div
          style={{
            position: "absolute",
            bottom: 48,
            left: "50%",
            transform: "translateX(-50%)",
            fontSize: 10,
            fontFamily: "monospace",
            color: "#64748b",
            letterSpacing: "0.2em",
            fontWeight: 600,
            opacity: interpolate(frame, [120, 145, 260, 290], [0, 0.5, 0.5, 0], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            }) * (0.85 + Math.sin(frame * 0.05) * 0.15),
            zIndex: 1,
          }}
        >
          15 HIGHLIGHTED · 100+ AVAILABLE
        </div>

        {/* "100+ tools" counter ambient halo */}
        <div
          style={{
            position: "absolute",
            bottom: 110,
            left: "50%",
            transform: "translateX(-50%)",
            width: 380,
            height: 100,
            borderRadius: "50%",
            background: "radial-gradient(ellipse, rgba(251,191,36,0.18), rgba(244,114,182,0.08) 50%, transparent 75%)",
            opacity: counterOpacity * (0.7 + Math.sin(frame * 0.08) * 0.2),
            filter: "blur(20px)",
            pointerEvents: "none",
            zIndex: 1,
          }}
        />

        {/* "100+ tools" counter */}
        <div
          style={{
            position: "absolute",
            bottom: 110,
            left: "50%",
            transform: `translateX(-50%) scale(${counterScale * counterCompletePop})`,
            opacity: counterOpacity,
            display: "flex",
            alignItems: "baseline",
            gap: 12,
            zIndex: 2,
          }}
        >
          <span
            style={{
              display: "inline-block",
              fontSize: 52,
              fontWeight: 800,
              fontFamily: "system-ui, sans-serif",
              backgroundImage: `linear-gradient(${135 + Math.sin(frame * 0.02) * 15}deg, #fbbf24, #f472b6, #fbbf24)`,
              backgroundSize: "200% 200%",
              backgroundPosition: `${(frame * 0.6) % 200}% 50%`,
              backgroundClip: "text",
              WebkitBackgroundClip: "text",
              color: "transparent",
              WebkitTextFillColor: "transparent",
            }}
          >
            {toolCount}+
          </span>
          <span
            style={{
              fontSize: 26,
              fontWeight: 400,
              fontFamily: "system-ui, sans-serif",
              color: "#94a3b8",
              opacity: 0.85 + Math.sin(frame * 0.04) * 0.15,
            }}
          >
            tools in one platform
          </span>
        </div>

        {/* Counter sparkle burst */}
        {Array.from({ length: 8 }, (_, i) => {
          const sf = frame - 170 - i * 3;
          if (sf < 0 || sf > 40) return null;
          const angle = (i / 8) * Math.PI * 2;
          const r = interpolate(sf, [0, 35], [0, 60 + (i % 3) * 15], { extrapolateRight: "clamp" });
          const sOp = interpolate(sf, [0, 5, 30, 40], [0, 0.6, 0.15, 0], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          });
          const colors = ["#fbbf24", "#f472b6", "#a78bfa", "#60a5fa"];
          return (
            <div
              key={`sparkle-${i}`}
              style={{
                position: "absolute",
                bottom: 130 - Math.sin(angle) * r,
                left: `calc(50% + ${Math.cos(angle) * r}px)`,
                width: 3,
                height: 3,
                borderRadius: "50%",
                background: colors[i % 4],
                opacity: sOp,
                boxShadow: `0 0 6px ${colors[i % 4]}`,
                pointerEvents: "none",
              }}
            />
          );
        })}

        <WaveformVisualizer barCount={48} color="#a78bfa" height={25} position="bottom" opacity={0.05} />
        <ScanlineOverlay opacity={0.02} lineGap={4} />
      </AbsoluteFill>
    </SceneTransition>
  );
};
