import { useCurrentFrame, interpolate, spring, useVideoConfig } from "remotion";
import { AlloBot } from "./AlloBot";

// The real launch URL. Keep this a domain AlloFlow actually owns/serves.
const MOCK_URL = "apomera.github.io/AlloFlow";

interface FakeAppWindowProps {
  enterDelay?: number;
}

export const FakeAppWindow: React.FC<FakeAppWindowProps> = ({ enterDelay = 0 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const f = frame - enterDelay;

  const scale = f < 0 ? 0 : spring({ frame: f, fps, config: { damping: 14, stiffness: 80 } });
  const opacity = interpolate(f, [0, 15], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Content animation inside the window
  const contentReveal = interpolate(f, [15, 40], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Cycle through different tools every ~30 frames
  const toolViews = [
    { tab: "STEM", icon: "🔬", title: "Physics Simulator", sidebar: ["Physics Lab", "DNA Lab", "Chemistry", "Fractions", "Coding"], activeIdx: 0, canvasColor: "#60a5fa", secondaryColor: "#34d399" },
    { tab: "STEM", icon: "🧬", title: "DNA Explorer", sidebar: ["Physics Lab", "DNA Lab", "Chemistry", "Fractions", "Coding"], activeIdx: 1, canvasColor: "#a78bfa", secondaryColor: "#f472b6" },
    { tab: "Games", icon: "🐉", title: "Boss Encounter Arena", sidebar: ["Boss Encounter", "Escape Room", "Bingo", "Memory", "Scramble"], activeIdx: 0, canvasColor: "#fb7185", secondaryColor: "#fbbf24" },
    { tab: "Reports", icon: "📝", title: "Report Writer", sidebar: ["WISC-V", "WIAT-4", "BASC-3", "Vineland", "BRIEF"], activeIdx: 0, canvasColor: "#a78bfa", secondaryColor: "#818cf8" },
    { tab: "SEL", icon: "🧠", title: "Zones of Regulation", sidebar: ["Zones", "Coping Skills", "Mindfulness", "Emotions", "Social"], activeIdx: 0, canvasColor: "#a3e635", secondaryColor: "#34d399" },
    { tab: "Writing", icon: "📖", title: "Story Forge", sidebar: ["Adventure", "Storybook", "Journal", "Poetry", "Scaffolds"], activeIdx: 0, canvasColor: "#c084fc", secondaryColor: "#60a5fa" },
    { tab: "AAC", icon: "💬", title: "Symbol Studio", sidebar: ["Boards", "Schedules", "Social Story", "Symbols", "Export"], activeIdx: 0, canvasColor: "#34d399", secondaryColor: "#60a5fa" },
  ];
  const cycleDuration = 28;
  const toolIndex = f > 15 ? Math.floor((f - 15) / cycleDuration) % toolViews.length : 0;
  const tool = toolViews[toolIndex];
  const cycleF = f > 15 ? (f - 15) % cycleDuration : 0;
  const swapIn = interpolate(cycleF, [0, 6], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const swapOut = interpolate(cycleF, [22, 28], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const toolOpacity = f <= 15 ? contentReveal : Math.min(swapIn, swapOut);
  const navTabs = ["STEM", "Games", "Reports", "SEL"];

  return (
    <div
      style={{
        width: 520,
        borderRadius: 12,
        background: "rgba(15,23,42,0.95)",
        border: "1px solid rgba(255,255,255,0.1)",
        overflow: "hidden",
        opacity,
        transform: `scale(${0.8 + scale * 0.2}) perspective(800px) rotateY(-3deg)`,
        boxShadow: "0 20px 60px rgba(0,0,0,0.5), 0 0 40px rgba(96,165,250,0.1)",
      }}
    >
      {/* Browser chrome */}
      <div
        style={{
          padding: "10px 14px",
          display: "flex",
          alignItems: "center",
          gap: 8,
          background: "rgba(30,41,59,0.8)",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        <div style={{ display: "flex", gap: 6 }}>
          <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#f87171" }} />
          <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#fbbf24" }} />
          <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#4ade80" }} />
        </div>
        <div
          style={{
            flex: 1,
            height: 24,
            borderRadius: 6,
            background: "rgba(255,255,255,0.06)",
            display: "flex",
            alignItems: "center",
            paddingLeft: 10,
            fontSize: 11,
            fontFamily: "monospace",
            color: "#64748b",
            position: "relative",
            overflow: "hidden",
          }}
        >
          {/* Typing URL animation. Was "alloflow.app" — a domain that does not
              exist and that we do not own. The rate is derived from the URL
              length so the typing still finishes on frame 25, right before the
              lock icon appears at frame 26. */}
          {MOCK_URL.slice(0, Math.min(MOCK_URL.length, Math.max(0, Math.floor((f - 5) * (MOCK_URL.length / 20)))))}
          {f > 5 && f < 26 && f % 10 < 6 && (
            <span style={{ color: "#60a5fa", opacity: 0.7 }}>|</span>
          )}
          {/* Lock icon after URL finishes typing */}
          {f >= 26 && (
            <span style={{ marginLeft: -2, fontSize: 9, color: "#4ade80", opacity: interpolate(f, [26, 32], [0, 0.7], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) }}>
              {" "}🔒
            </span>
          )}
        </div>
      </div>

      {/* Loading bar */}
      <div
        style={{
          height: 2,
          background: `linear-gradient(90deg, #60a5fa, #34d399)`,
          width: `${interpolate(f, [8, 35], [0, 100], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })}%`,
          opacity: interpolate(f, [8, 35, 40], [0.8, 0.8, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
        }}
      />

      {/* App content mockup — cycles through tools */}
      <div style={{ padding: 16, opacity: contentReveal }}>
        {/* Top nav bar */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
          <div style={{ width: 24, height: 24 }}>
            <AlloBot size={24} />
          </div>
          <span style={{ fontSize: 14, fontWeight: 700, fontFamily: "system-ui" }}>
            <span style={{ color: "#60a5fa" }}>Allo</span>
            <span style={{ color: "#34d399" }}>Flow</span>
          </span>
          <div style={{ flex: 1 }} />
          {navTabs.map((tab, i) => (
            <div
              key={i}
              style={{
                fontSize: 10,
                color: tab === tool.tab ? tool.canvasColor : "#64748b",
                padding: "4px 10px",
                borderRadius: 4,
                background: tab === tool.tab ? `${tool.canvasColor}18` : "transparent",
                fontFamily: "system-ui",
              }}
            >
              {tab}
            </div>
          ))}
        </div>

        {/* Loading dots during tool swap (brief, between cycles) */}
        {cycleF < 6 && f > 15 && (
          <div style={{ position: "absolute", top: 50, left: "50%", transform: "translateX(-50%)", display: "flex", gap: 4, zIndex: 5 }}>
            {[0, 1, 2].map((di) => (
              <div
                key={di}
                style={{
                  width: 4,
                  height: 4,
                  borderRadius: "50%",
                  background: tool.canvasColor,
                  opacity: 0.3 + Math.sin(cycleF * 0.8 + di * 0.8) * 0.5,
                }}
              />
            ))}
          </div>
        )}

        {/* Content area — fades between tools */}
        <div style={{ display: "flex", gap: 12, opacity: toolOpacity }}>
          {/* Sidebar — active item has a live highlight pulse */}
          <div style={{ width: 120 }}>
            {tool.sidebar.map((item, i) => {
              const isActive = i === tool.activeIdx;
              const activeBgAlpha = isActive ? Math.round(0x12 + Math.sin(f * 0.12) * 0x08).toString(16).padStart(2, "0") : "00";
              const activeGlow = isActive ? `0 0 ${4 + Math.sin(f * 0.12) * 3}px ${tool.canvasColor}55` : undefined;
              return (
                <div
                  key={i}
                  style={{
                    fontSize: 10,
                    color: isActive ? tool.canvasColor : "#475569",
                    padding: "6px 8px",
                    borderRadius: 4,
                    background: isActive ? `${tool.canvasColor}${activeBgAlpha}` : "transparent",
                    marginBottom: 2,
                    fontFamily: "system-ui",
                    borderLeft: isActive ? `2px solid ${tool.canvasColor}` : "2px solid transparent",
                    boxShadow: activeGlow,
                    textShadow: isActive ? `0 0 ${3 + Math.sin(f * 0.12) * 2}px ${tool.canvasColor}88` : undefined,
                  }}
                >
                  {item}
                </div>
              );
            })}
          </div>

          {/* Main content */}
          <div style={{ flex: 1 }}>
            {/* Tool header — soft breath glow in tool accent */}
            <div
              style={{
                fontSize: 16,
                fontWeight: 700,
                color: "#e2e8f0",
                fontFamily: "system-ui",
                marginBottom: 8,
                textShadow: `0 0 ${6 + Math.sin(f * 0.07) * 4}px ${tool.canvasColor}${Math.round(0x33 + Math.sin(f * 0.07) * 0x10).toString(16).padStart(2, "0")}`,
              }}
            >
              {tool.icon} {tool.title}
            </div>

            {/* Fake canvas area */}
            <div
              style={{
                height: 100,
                borderRadius: 8,
                background: `linear-gradient(135deg, ${tool.canvasColor}12, ${tool.secondaryColor}08)`,
                border: "1px solid rgba(255,255,255,0.06)",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                position: "relative",
                overflow: "hidden",
              }}
            >
              {/* Animated elements */}
              <div
                style={{
                  width: 20,
                  height: 20,
                  borderRadius: "50%",
                  background: tool.canvasColor,
                  position: "absolute",
                  left: `${30 + Math.sin(f * 0.08) * 20}%`,
                  top: `${40 + Math.cos(f * 0.06) * 15}%`,
                  boxShadow: `0 0 10px ${tool.canvasColor}88`,
                }}
              />
              <div
                style={{
                  width: 14,
                  height: 14,
                  borderRadius: "50%",
                  background: tool.secondaryColor,
                  position: "absolute",
                  left: `${60 + Math.cos(f * 0.07) * 15}%`,
                  top: `${50 + Math.sin(f * 0.05) * 20}%`,
                  boxShadow: `0 0 8px ${tool.secondaryColor}88`,
                }}
              />
              <svg width="100%" height="100%" style={{ position: "absolute" }} viewBox="0 0 400 100">
                <path d="M 50 50 Q 150 20, 250 60 T 380 40" stroke={`${tool.canvasColor}33`} strokeWidth="1" fill="none" strokeDasharray="4,4" />
              </svg>
            </div>

            {/* Controls row */}
            <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
              {["▶ Run", "⟲ Reset", "⚙ Settings"].map((btn, i) => (
                <div
                  key={i}
                  style={{
                    fontSize: 9,
                    color: "#94a3b8",
                    padding: "4px 10px",
                    borderRadius: 4,
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.06)",
                    fontFamily: "system-ui",
                  }}
                >
                  {btn}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Screen reflection glare */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `linear-gradient(135deg, rgba(255,255,255,0.03) 0%, transparent 40%, transparent 60%, rgba(255,255,255,0.02) 100%)`,
          pointerEvents: "none",
          borderRadius: 12,
        }}
      />
      {/* Moving shimmer */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          overflow: "hidden",
          borderRadius: 12,
          pointerEvents: "none",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: 0,
            left: `${interpolate(f, [30, 100], [-30, 130], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })}%`,
            width: "20%",
            height: "100%",
            background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.03), transparent)",
            transform: "skewX(-15deg)",
          }}
        />
      </div>
    </div>
  );
};
