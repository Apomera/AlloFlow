import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig } from "remotion";
import { StarField } from "../components/StarField";
import { Constellation } from "../components/Constellation";
import { HexGrid } from "../components/HexGrid";
import { SceneTransition } from "../components/SceneTransition";
import { PixelCharacter } from "../components/PixelCharacters";

const CYAN = "#06b6d4";
const GREEN = "#34d399";
const PURPLE = "#a78bfa";

// Session code that "scrambles" then locks in around frame 80
const SessionCode: React.FC = () => {
  const frame = useCurrentFrame();
  const finalCode = "ALLO-7Q3X";
  const scrambleEnd = 80;
  const lockInF = frame - scrambleEnd;

  // Before frame 80: scramble random chars one position at a time
  // After frame 80: lock in the real code
  const visibleChars = Math.min(finalCode.length, Math.max(0, Math.floor((frame - 25) / 4)));
  const display = finalCode.split("").map((c, i) => {
    if (frame < 25) return " ";
    if (i < visibleChars) return c;
    if (frame < scrambleEnd) {
      // Scramble unrendered slots
      const charset = "ABCDEFGHJKLMNPQRSTVWXYZ0123456789";
      return charset[(frame * 7 + i * 11) % charset.length];
    }
    return c;
  }).join("");

  const codeOpacity = interpolate(frame, [20, 40], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const lockGlow = lockInF > 0 ? Math.min(1, lockInF / 8) : 0;

  return (
    <div
      style={{
        position: "absolute",
        left: "50%",
        top: 360,
        transform: "translateX(-50%)",
        textAlign: "center",
        opacity: codeOpacity,
        zIndex: 6,
      }}
    >
      <div
        style={{
          fontSize: 11,
          fontFamily: "monospace",
          color: CYAN,
          letterSpacing: "0.4em",
          fontWeight: 700,
          marginBottom: 10,
          textShadow: `0 0 ${4 + Math.sin(frame * 0.1) * 2}px ${CYAN}99`,
        }}
      >
        ▸ JOIN SESSION
      </div>
      <div
        style={{
          display: "inline-block",
          padding: "16px 36px",
          borderRadius: 12,
          background: `rgba(6,182,212,${0.08 + lockGlow * 0.06})`,
          border: `2px solid rgba(6,182,212,${0.4 + lockGlow * 0.4 + Math.sin(frame * 0.1) * 0.1})`,
          boxShadow: `0 0 ${20 + lockGlow * 30 + Math.sin(frame * 0.08) * 8}px rgba(6,182,212,${0.25 + lockGlow * 0.25})`,
          fontSize: 56,
          fontFamily: "monospace",
          fontWeight: 800,
          color: lockGlow > 0.3 ? CYAN : "#94a3b8",
          letterSpacing: "0.15em",
          textShadow: lockGlow > 0.3 ? `0 0 ${12 + Math.sin(frame * 0.08) * 6}px ${CYAN}88` : undefined,
          minWidth: 380,
          position: "relative",
        }}
      >
        {display}
        {/* Locked indicator */}
        {lockGlow > 0.5 && (
          <span
            style={{
              position: "absolute",
              top: 12,
              right: 12,
              fontSize: 14,
              color: GREEN,
              opacity: 0.6 + Math.sin(frame * 0.18) * 0.4,
            }}
          >
            🔒
          </span>
        )}
      </div>
      {/* "Session Active" pill that appears once code locks */}
      {lockInF > 8 && (
        <div
          style={{
            marginTop: 14,
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "5px 14px",
            borderRadius: 20,
            background: `rgba(52,211,153,${0.12 + Math.sin(frame * 0.08) * 0.04})`,
            border: `1px solid rgba(52,211,153,0.5)`,
            fontSize: 12,
            fontFamily: "monospace",
            color: GREEN,
            fontWeight: 700,
            letterSpacing: "0.2em",
            opacity: interpolate(lockInF, [8, 20], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
            boxShadow: `0 0 8px rgba(52,211,153,0.3)`,
          }}
        >
          <span
            style={{
              width: 7,
              height: 7,
              borderRadius: "50%",
              background: GREEN,
              opacity: 0.5 + Math.sin(frame * 0.25) * 0.45,
              boxShadow: `0 0 ${4 + Math.sin(frame * 0.25) * 3}px ${GREEN}`,
            }}
          />
          SESSION ACTIVE
        </div>
      )}
      {/* Lock-in burst — radial spark when the code first locks */}
      {lockInF >= 0 && lockInF < 40 && Array.from({ length: 14 }, (_, bi) => {
        const angle = (bi / 14) * Math.PI * 2;
        const r = interpolate(lockInF, [0, 35], [10, 90 + (bi % 4) * 25], { extrapolateRight: "clamp" });
        const op = interpolate(lockInF, [0, 4, 35], [0, 0.9, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
        const isSquare = bi % 3 === 0;
        return (
          <div
            key={`lock-burst-${bi}`}
            style={{
              position: "absolute",
              left: `calc(50% + ${Math.cos(angle) * r}px)`,
              top: `calc(50% + ${Math.sin(angle) * r * 0.5}px)`,
              width: 4 + (bi % 2) * 2,
              height: 4 + (bi % 2) * 2,
              borderRadius: isSquare ? "1px" : "50%",
              background: bi % 2 === 0 ? CYAN : GREEN,
              opacity: op,
              boxShadow: `0 0 6px ${bi % 2 === 0 ? CYAN : GREEN}`,
              transform: isSquare ? `rotate(${lockInF * 6 + bi * 25}deg)` : undefined,
              pointerEvents: "none",
              zIndex: 7,
            }}
          />
        );
      })}
      {/* Lock-in flash ring — single expanding circle on lock */}
      {lockInF >= 0 && lockInF < 25 && (
        <div
          style={{
            position: "absolute",
            left: "50%",
            top: 70,
            transform: `translate(-50%, -50%) scale(${interpolate(lockInF, [0, 25], [0.5, 3.2], { extrapolateRight: "clamp" })})`,
            width: 200,
            height: 60,
            borderRadius: 16,
            border: `2px solid ${CYAN}`,
            opacity: interpolate(lockInF, [0, 4, 25], [0, 0.6, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
            pointerEvents: "none",
            zIndex: 7,
          }}
        />
      )}
    </div>
  );
};

// One animated activity chip flying from teacher to a student
const ActivityChip: React.FC<{
  label: string;
  emoji: string;
  startFrame: number;
  studentX: number;
  studentY: number;
}> = ({ label, emoji, startFrame, studentX, studentY }) => {
  const frame = useCurrentFrame();
  const f = frame - startFrame;
  if (f < 0 || f > 70) return null;

  // Teacher position is fixed (~320, 540 in scene coords)
  const startX = 320;
  const startY = 540;
  const t = f / 70;
  const cx = startX + (studentX - startX) * t;
  // Arc up and over
  const cy = startY + (studentY - startY) * t - Math.sin(t * Math.PI) * 60;
  const op = Math.sin(t * Math.PI) * 0.95;
  const scale = 0.7 + Math.sin(t * Math.PI) * 0.4;

  return (
    <div
      style={{
        position: "absolute",
        left: cx,
        top: cy,
        transform: `translate(-50%, -50%) scale(${scale})`,
        display: "flex",
        alignItems: "center",
        gap: 6,
        padding: "5px 12px",
        borderRadius: 14,
        background: "rgba(15,23,42,0.92)",
        border: `1px solid ${CYAN}88`,
        fontSize: 12,
        fontFamily: "system-ui",
        fontWeight: 600,
        color: "#e2e8f0",
        opacity: op,
        boxShadow: `0 0 12px rgba(6,182,212,0.4)`,
        pointerEvents: "none",
        zIndex: 5,
        whiteSpace: "nowrap",
      }}
    >
      <span style={{ fontSize: 14 }}>{emoji}</span>
      {label}
    </div>
  );
};

// Pixel student "device" — small pixel screen with synced indicator
const StudentDevice: React.FC<{
  x: number;
  y: number;
  enterDelay: number;
  studentType: "studentBoy" | "studentGirl" | "wheelchair";
  paletteKey?: string;
  syncedAt: number;
}> = ({ x, y, enterDelay, studentType, paletteKey, syncedAt }) => {
  const frame = useCurrentFrame();
  const f = frame - enterDelay;
  const synced = frame >= syncedAt;
  const syncedF = frame - syncedAt;

  if (f < 0) return null;

  const opacity = interpolate(f, [0, 18], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        transform: "translate(-50%, -50%)",
        opacity,
        zIndex: 3,
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
        {/* Tiny "device screen" above the student */}
        <div
          style={{
            width: 48,
            height: 32,
            borderRadius: 4,
            background: synced
              ? `linear-gradient(135deg, rgba(6,182,212,${0.25 + Math.sin(frame * 0.1 + x * 0.01) * 0.1}), rgba(52,211,153,0.15))`
              : "rgba(255,255,255,0.04)",
            border: `1px solid ${synced ? `rgba(6,182,212,${0.6 + Math.sin(frame * 0.12 + x * 0.01) * 0.2})` : "rgba(255,255,255,0.08)"}`,
            position: "relative",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            fontSize: 14,
            boxShadow: synced ? `0 0 ${8 + Math.sin(frame * 0.1 + x * 0.01) * 4}px rgba(6,182,212,0.4)` : undefined,
          }}
        >
          {synced ? "📡" : "·"}
          {/* Stand */}
          <div style={{ position: "absolute", bottom: -6, left: "50%", transform: "translateX(-50%)", width: 14, height: 4, background: "#475569", borderRadius: 2 }} />
        </div>
        <div style={{ height: 6 }} />
        {/* Pixel student character */}
        <PixelCharacter
          type={studentType}
          pixelSize={3}
          enterDelay={enterDelay}
          phaseOffset={x * 0.3}
          bobAmount={1}
          paletteKey={paletteKey}
        />
        {/* "Synced" label that appears when this device is online */}
        {synced && syncedF > 0 && (
          <div
            style={{
              fontSize: 7,
              fontFamily: "monospace",
              color: GREEN,
              letterSpacing: "0.18em",
              fontWeight: 700,
              opacity: interpolate(syncedF, [0, 12], [0, 0.85], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) * (0.85 + Math.sin(frame * 0.12 + x * 0.005) * 0.15),
              textShadow: `0 0 4px rgba(52,211,153,0.5)`,
              marginTop: 2,
            }}
          >
            SYNCED
          </div>
        )}
      </div>
    </div>
  );
};

export const LiveSessions: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Header / chapter marker
  const headerOp = interpolate(frame, [25, 50], [0, 0.45], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // Title
  const titleOp = interpolate(frame, [30, 55], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const titleScale = spring({ frame: frame - 30, fps, config: { damping: 14, stiffness: 90 } });

  // Teacher tablet enters frame ~30
  const teacherEnter = interpolate(frame, [30, 60], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // Students sync in waves: each student's "synced" frame
  const students = [
    { x: 1380, y: 540, type: "studentGirl" as const, paletteKey: "girlPurple", enterDelay: 100, syncedAt: 130 },
    { x: 1500, y: 460, type: "studentBoy" as const, paletteKey: undefined, enterDelay: 110, syncedAt: 145 },
    { x: 1620, y: 540, type: "wheelchair" as const, paletteKey: undefined, enterDelay: 120, syncedAt: 160 },
    { x: 1500, y: 620, type: "studentBoy" as const, paletteKey: "boyGreen", enterDelay: 130, syncedAt: 175 },
    { x: 1380, y: 660, type: "studentGirl" as const, paletteKey: undefined, enterDelay: 140, syncedAt: 190 },
  ];

  // Activity chips fly in waves once all students are synced (~frame 200)
  const activityChips = [
    { label: "Adventure Scene", emoji: "🐉", startFrame: 210 },
    { label: "Quiz Question", emoji: "❓", startFrame: 240 },
    { label: "Boss Encounter", emoji: "⚔️", startFrame: 270 },
    { label: "Symbol Board", emoji: "💬", startFrame: 300 },
    { label: "Phoneme Game", emoji: "🔊", startFrame: 330 },
    { label: "Live Poll", emoji: "📊", startFrame: 360 },
  ];

  // Cloud / hub at center
  const cloudOp = interpolate(frame, [80, 110], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // Bottom strip — capabilities row
  const bottomStripOp = interpolate(frame, [180, 220, 410, 440], [0, 0.7, 0.7, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <SceneTransition durationInFrames={450} fadeIn={12} fadeOut={18}>
      <AbsoluteFill
        style={{
          background: `linear-gradient(${135 + Math.sin(frame * 0.011) * 7}deg, #0f172a 0%, #0c2e2e 50%, #0f172a 100%)`,
        }}
      >
        {/* Backdrop layers */}
        <HexGrid color={CYAN} opacity={0.025} pulseSpeed={0.04} />
        <Constellation nodeCount={18} color={`${CYAN}33`} connectionDistance={200} />
        <StarField count={70} speed={0.18} color={`${CYAN}44`} />

        {/* Chapter marker — top-left */}
        <div
          style={{
            position: "absolute",
            top: 55,
            left: 100,
            display: "flex",
            alignItems: "baseline",
            gap: 8,
            opacity: headerOp,
            zIndex: 4,
          }}
        >
          <span style={{ fontSize: 20, fontFamily: "Georgia, serif", fontStyle: "italic", fontWeight: 400, color: CYAN, letterSpacing: "0.1em", display: "inline-block", transform: `scale(${interpolate(frame, [25, 47], [0.6, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })})` }}>VI.</span>
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <span style={{ fontSize: 9, fontFamily: "monospace", color: "#64748b", letterSpacing: "0.3em", fontWeight: 700 }}>THE CLASSROOM</span>
            <span style={{ fontSize: 7, fontFamily: "monospace", color: "#475569", letterSpacing: "0.2em", fontWeight: 500 }}>06 / 09 · 15.0s</span>
          </div>
        </div>

        {/* LIVE indicator — top right */}
        <div
          style={{
            position: "absolute",
            top: 70,
            right: 100,
            display: "flex",
            alignItems: "center",
            gap: 8,
            opacity: interpolate(frame, [40, 60], [0, 0.7], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
            zIndex: 4,
          }}
        >
          <div
            style={{
              width: 10,
              height: 10,
              borderRadius: "50%",
              background: "#ef4444",
              opacity: 0.5 + Math.sin(frame * 0.22) * 0.5,
              boxShadow: `0 0 ${6 + Math.sin(frame * 0.22) * 4}px #ef4444`,
            }}
          />
          <span
            style={{
              fontSize: 12,
              fontFamily: "monospace",
              color: "#ef4444",
              letterSpacing: "0.3em",
              fontWeight: 700,
              textShadow: `0 0 4px rgba(239,68,68,0.5)`,
            }}
          >
            LIVE
          </span>
        </div>

        {/* Title */}
        <div
          style={{
            position: "absolute",
            top: 130,
            left: "50%",
            transform: `translateX(-50%) scale(${0.92 + titleScale * 0.08})`,
            textAlign: "center",
            opacity: titleOp,
            zIndex: 4,
          }}
        >
          <div
            style={{
              fontSize: 56,
              fontWeight: 800,
              fontFamily: "system-ui, sans-serif",
              color: "#f1f5f9",
              letterSpacing: "-0.01em",
              textShadow: `0 0 ${20 + Math.sin(frame * 0.04) * 8}px rgba(6,182,212,${0.25 + Math.sin(frame * 0.04) * 0.1})`,
            }}
          >
            One teacher.{" "}
            <span
              style={{
                display: "inline-block",
                backgroundImage: `linear-gradient(${135 + Math.sin(frame * 0.02) * 12}deg, ${CYAN}, ${GREEN}, ${CYAN})`,
                backgroundSize: "200% 200%",
                backgroundPosition: `${(frame * 0.5) % 200}% 50%`,
                backgroundClip: "text",
                WebkitBackgroundClip: "text",
                color: "transparent",
                WebkitTextFillColor: "transparent",
              }}
            >
              every device.
            </span>
          </div>
          <div
            style={{
              fontSize: 18,
              fontFamily: "system-ui, sans-serif",
              fontWeight: 400,
              color: "#94a3b8",
              marginTop: 8,
              letterSpacing: "0.08em",
              opacity: interpolate(frame, [55, 80], [0, 0.85], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
            }}
          >
            Real-time classroom broadcasting · No installs · Browser-based
          </div>
        </div>

        {/* Teacher (left side) */}
        <div
          style={{
            position: "absolute",
            left: 320,
            top: 540,
            transform: `translate(-50%, -50%) scale(${0.8 + teacherEnter * 0.2})`,
            opacity: teacherEnter,
            zIndex: 3,
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
            {/* Teacher tablet (broadcast device) */}
            <div
              style={{
                width: 90,
                height: 60,
                borderRadius: 6,
                background: `linear-gradient(135deg, ${CYAN}33, ${PURPLE}22)`,
                border: `2px solid ${CYAN}88`,
                position: "relative",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                fontSize: 24,
                boxShadow: `0 0 ${14 + Math.sin(frame * 0.08) * 6}px rgba(6,182,212,${0.4 + Math.sin(frame * 0.08) * 0.15})`,
              }}
            >
              📡
              {/* Stand */}
              <div style={{ position: "absolute", bottom: -8, left: "50%", transform: "translateX(-50%)", width: 22, height: 5, background: "#475569", borderRadius: 2 }} />
            </div>
            <div style={{ height: 8 }} />
            <PixelCharacter type="teacher" pixelSize={5} enterDelay={30} bobAmount={1} phaseOffset={0} />
            <div
              style={{
                fontSize: 9,
                fontFamily: "monospace",
                color: CYAN,
                letterSpacing: "0.25em",
                fontWeight: 700,
                marginTop: 4,
                textShadow: `0 0 4px rgba(6,182,212,0.5)`,
                opacity: 0.85 + Math.sin(frame * 0.06) * 0.15,
              }}
            >
              ▸ TEACHER
            </div>
          </div>
          {/* Broadcast rings around teacher */}
          {[0, 25, 50].map((delay, i) => {
            const ringF = (frame + delay) % 75;
            const ringScale = interpolate(ringF, [0, 75], [0.4, 2.4]);
            const ringOp = interpolate(ringF, [0, 12, 75], [0, 0.4, 0]);
            return (
              <div
                key={`ring-${i}`}
                style={{
                  position: "absolute",
                  left: "50%",
                  top: 30,
                  width: 100,
                  height: 100,
                  borderRadius: "50%",
                  border: `1.5px solid ${CYAN}`,
                  transform: `translate(-50%, -50%) scale(${ringScale})`,
                  opacity: ringOp * teacherEnter,
                  pointerEvents: "none",
                }}
              />
            );
          })}
        </div>

        {/* Cloud / hub at center */}
        <div
          style={{
            position: "absolute",
            left: "50%",
            top: 540,
            transform: `translate(-50%, -50%) scale(${0.8 + cloudOp * 0.2})`,
            opacity: cloudOp,
            zIndex: 4,
          }}
        >
          <div
            style={{
              width: 110,
              height: 110,
              borderRadius: "50%",
              background: `radial-gradient(circle, rgba(6,182,212,${0.3 + Math.sin(frame * 0.06) * 0.08}), rgba(167,139,250,0.12) 60%, transparent 100%)`,
              border: `2px solid rgba(6,182,212,${0.6 + Math.sin(frame * 0.06) * 0.2})`,
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              fontSize: 44,
              boxShadow: `0 0 ${24 + Math.sin(frame * 0.06) * 12}px rgba(6,182,212,0.4), inset 0 0 20px rgba(167,139,250,0.15)`,
              position: "relative",
            }}
          >
            <span style={{
              display: "inline-block",
              transform: `scale(${1 + Math.sin(frame * 0.07) * 0.06}) translateY(${Math.sin(frame * 0.05) * 2}px)`,
              filter: `drop-shadow(0 0 ${6 + Math.sin(frame * 0.07) * 3}px rgba(6,182,212,0.5))`,
            }}>☁️</span>
            {/* Orbiting tiny dots */}
            {[0, 1, 2, 3].map((di) => {
              const a = frame * 0.04 + (di / 4) * Math.PI * 2;
              return (
                <div
                  key={`orbit-${di}`}
                  style={{
                    position: "absolute",
                    left: `calc(50% + ${Math.cos(a) * 70}px)`,
                    top: `calc(50% + ${Math.sin(a) * 70}px)`,
                    transform: "translate(-50%, -50%)",
                    width: 4,
                    height: 4,
                    borderRadius: "50%",
                    background: di % 2 === 0 ? CYAN : GREEN,
                    boxShadow: `0 0 6px ${di % 2 === 0 ? CYAN : GREEN}`,
                    opacity: 0.7 + Math.sin(frame * 0.12 + di) * 0.3,
                  }}
                />
              );
            })}
          </div>
          <div
            style={{
              fontSize: 9,
              fontFamily: "monospace",
              color: CYAN,
              letterSpacing: "0.25em",
              fontWeight: 700,
              marginTop: 8,
              textAlign: "center",
              opacity: 0.6 + Math.sin(frame * 0.06) * 0.15,
              textShadow: `0 0 ${3 + Math.sin(frame * 0.06) * 2}px rgba(6,182,212,0.5)`,
            }}
          >
            FIRESTORE SYNC
          </div>
        </div>

        {/* Animated dashed connection lines: teacher → cloud → each student */}
        <svg
          width="1920"
          height="1080"
          viewBox="0 0 1920 1080"
          style={{
            position: "absolute",
            inset: 0,
            opacity: cloudOp,
            pointerEvents: "none",
            zIndex: 1,
          }}
        >
          {/* Teacher → Cloud */}
          <line
            x1="320"
            y1="540"
            x2="960"
            y2="540"
            stroke={CYAN}
            strokeWidth="1.5"
            strokeDasharray="6 6"
            strokeDashoffset={-frame * 1.5}
            opacity="0.6"
          />
          {/* Cloud → each student */}
          {students.map((s, i) => {
            const lineOp = frame >= s.syncedAt ? 0.5 : 0.18;
            return (
              <line
                key={`line-${i}`}
                x1="960"
                y1="540"
                x2={s.x}
                y2={s.y}
                stroke={frame >= s.syncedAt ? GREEN : CYAN}
                strokeWidth="1.2"
                strokeDasharray="5 5"
                strokeDashoffset={-frame * 1.2}
                opacity={lineOp}
              />
            );
          })}
        </svg>

        {/* Data packets traveling along teacher → cloud line */}
        {frame > 110 && Array.from({ length: 4 }, (_, pi) => {
          const period = 35 + pi * 6;
          const t = ((frame + pi * 9) % period) / period;
          const cx = 320 + (960 - 320) * t;
          const op = Math.sin(t * Math.PI) * 0.85;
          return (
            <div
              key={`tc-packet-${pi}`}
              style={{
                position: "absolute",
                left: cx,
                top: 540,
                transform: "translate(-50%, -50%)",
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: CYAN,
                boxShadow: `0 0 8px ${CYAN}`,
                opacity: op,
                pointerEvents: "none",
                zIndex: 2,
              }}
            />
          );
        })}

        {/* Data packets cloud → each synced student */}
        {students.map((s, si) =>
          frame >= s.syncedAt + 5 ? Array.from({ length: 3 }, (_, pi) => {
            const period = 32 + pi * 7;
            const offset = si * 7 + pi * 11;
            const t = ((frame + offset) % period) / period;
            const cx = 960 + (s.x - 960) * t;
            const cy = 540 + (s.y - 540) * t;
            const op = Math.sin(t * Math.PI) * 0.75;
            return (
              <div
                key={`cs-packet-${si}-${pi}`}
                style={{
                  position: "absolute",
                  left: cx,
                  top: cy,
                  transform: "translate(-50%, -50%)",
                  width: 5,
                  height: 5,
                  borderRadius: "50%",
                  background: GREEN,
                  boxShadow: `0 0 6px ${GREEN}`,
                  opacity: op,
                  pointerEvents: "none",
                  zIndex: 2,
                }}
              />
            );
          }) : null,
        )}

        {/* Students with devices */}
        {students.map((s, i) => (
          <StudentDevice
            key={`student-${i}`}
            x={s.x}
            y={s.y}
            enterDelay={s.enterDelay}
            studentType={s.type}
            paletteKey={s.paletteKey}
            syncedAt={s.syncedAt}
          />
        ))}

        {/* Activity chips flying from teacher to a random student each */}
        {activityChips.map((chip, ci) => {
          const target = students[ci % students.length];
          return (
            <ActivityChip
              key={`chip-${ci}`}
              label={chip.label}
              emoji={chip.emoji}
              startFrame={chip.startFrame}
              studentX={target.x}
              studentY={target.y}
            />
          );
        })}

        {/* Session join code in upper-center area */}
        <SessionCode />

        {/* Bottom capabilities strip */}
        <div
          style={{
            position: "absolute",
            bottom: 80,
            left: "50%",
            transform: "translateX(-50%)",
            display: "flex",
            alignItems: "center",
            gap: 28,
            opacity: bottomStripOp,
            zIndex: 4,
          }}
        >
          {[
            { icon: "📡", label: "Push activities" },
            { icon: "👀", label: "Monitor screens" },
            { icon: "📥", label: "Collect responses" },
            { icon: "⚡", label: "No installs" },
          ].map((cap, ci) => {
            const capDelay = 200 + ci * 12;
            const capF = frame - capDelay;
            return (
              <div
                key={`cap-${ci}`}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "8px 16px",
                  borderRadius: 8,
                  background: "rgba(15,23,42,0.5)",
                  border: `1px solid ${CYAN}33`,
                  fontSize: 14,
                  fontFamily: "system-ui, sans-serif",
                  fontWeight: 500,
                  color: "#cbd5e1",
                  opacity: capF >= 0 ? interpolate(capF, [0, 15], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) * (0.85 + Math.sin(frame * 0.06 + ci * 0.5) * 0.15) : 0,
                  transform: `translateY(${capF >= 0 ? interpolate(capF, [0, 15], [10, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) : 10}px)`,
                  boxShadow: `0 0 ${4 + Math.sin(frame * 0.07 + ci) * 2}px rgba(6,182,212,0.2)`,
                }}
              >
                <span style={{
                  fontSize: 18,
                  display: "inline-block",
                  transform: `scale(${1 + Math.sin(frame * 0.09 + ci * 1.3) * 0.08}) rotate(${Math.sin(frame * 0.06 + ci * 0.7) * 4}deg)`,
                  filter: `drop-shadow(0 0 ${3 + Math.sin(frame * 0.09 + ci * 1.3) * 2}px rgba(6,182,212,0.4))`,
                }}>{cap.icon}</span>
                <span style={{
                  textShadow: `0 0 ${3 + Math.sin(frame * 0.07 + ci) * 2}px rgba(6,182,212,0.3)`,
                }}>{cap.label}</span>
              </div>
            );
          })}
        </div>

        {/* Sources / metadata footer */}
        <div
          style={{
            position: "absolute",
            bottom: 32,
            left: 80,
            fontSize: 10,
            fontFamily: "monospace",
            color: "#475569",
            letterSpacing: "0.1em",
            opacity: interpolate(frame, [200, 240, 410, 440], [0, 0.4, 0.4, 0], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            }),
            zIndex: 3,
          }}
        >
          REAL-TIME · FIRESTORE · BROADCAST_MODE
        </div>
        <div
          style={{
            position: "absolute",
            bottom: 32,
            right: 80,
            fontSize: 10,
            fontFamily: "monospace",
            color: CYAN,
            letterSpacing: "0.15em",
            opacity: interpolate(frame, [200, 240, 410, 440], [0, 0.4, 0.4, 0], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            }),
            zIndex: 3,
          }}
        >
          {students.filter((s) => frame >= s.syncedAt).length} / {students.length} SYNCED
        </div>
      </AbsoluteFill>
    </SceneTransition>
  );
};
