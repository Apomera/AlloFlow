import React from "react";
import { useCurrentFrame, interpolate } from "remotion";

// ─── SVG Pixel Sprite Renderer ──────────────────────────────────

const PixelSprite: React.FC<{
  rows: string[];
  palette: Record<string, string>;
  pixelSize: number;
}> = ({ rows, palette, pixelSize }) => {
  const width = Math.max(...rows.map((r) => r.length));
  const height = rows.length;

  const rects: React.ReactElement[] = [];
  for (let y = 0; y < rows.length; y++) {
    for (let x = 0; x < rows[y].length; x++) {
      const ch = rows[y][x];
      if (ch !== "." && palette[ch]) {
        rects.push(
          <rect
            key={`${y}-${x}`}
            x={x * pixelSize}
            y={y * pixelSize}
            width={pixelSize}
            height={pixelSize}
            fill={palette[ch]}
          />,
        );
      }
    }
  }

  return (
    <svg
      width={width * pixelSize}
      height={height * pixelSize}
      viewBox={`0 0 ${width * pixelSize} ${height * pixelSize}`}
      style={{ imageRendering: "pixelated" }}
    >
      {rects}
    </svg>
  );
};

// ─── Sprite Data (all 12 chars wide) ────────────────────────────

const STUDENT_BOY = [
  "....hhhh....",
  "...hhhhhh...",
  "...ssssss...",
  "...sesses...",
  "...ssmmss...",
  "....ssss....",
  "...cccccc...",
  "..cccccccc..",
  "..scc..ccs..",
  "....pppp....",
  "...pp..pp...",
  "...pp..pp...",
  "...kk..kk...",
];

const STUDENT_GIRL = [
  "....hhhh....",
  "...hhhhhh...",
  "..hhhhhhhh..",
  "..hsesseshh.",
  "...ssmmss...",
  "....ssss....",
  "...cccccc...",
  "..cccccccc..",
  "..scc..ccs..",
  "...cccccc...",
  "...cc..cc...",
  "...ss..ss...",
  "...ss..ss...",
  "...kk..kk...",
];

const TEACHER = [
  "....hhhh....",
  "...hhhhhh...",
  "...ssssss...",
  "...sesses...",
  "...ssmmss...",
  "....ssss....",
  "....tttt....",
  "...cccccc...",
  "..cccccccc..",
  "..scc..ccs..",
  "....pppp....",
  "...pp..pp...",
  "...pp..pp...",
  "...pp..pp...",
  "...kk..kk...",
];

const WHEELCHAIR = [
  "....hhhh....",
  "...hhhhhh...",
  "...ssssss...",
  "...sesses...",
  "...ssmmss...",
  "....ssss....",
  "...cccccc...",
  "..ccccccww..",
  "..scc.ccww..",
  "...ppppww...",
  "..ppppwwww..",
  "..wwwwwwww..",
  "..ww....ww..",
];

const CELEBRATING = [
  ".ss......ss.",
  "..ss....ss..",
  "...shhhhs...",
  "...hhhhhh...",
  "...ssssss...",
  "...sesses...",
  "...smmmms...",
  "....ssss....",
  "....cccc....",
  "...cccccc...",
  "....c..c....",
  "....pppp....",
  "...pp..pp...",
  "...pp..pp...",
  "...kk..kk...",
];

// ─── Pixel AlloBot — 16-bit version of the mascot ───────────────

const PIXEL_ALLOBOT = [
  "......aa......",
  ".....aYYa.....",
  ".....aaaa.....",
  "....aaaaaa....",
  "...pppppppp...",
  "..pppppppppp..",
  ".ppNNppppNNpp.",
  ".ppNGppppNGpp.",
  ".pppppppppppp.",
  "..ppppmmpppp..",
  "..pppppppppp..",
  "...pppppppp...",
  "....JJJJJJ....",
  "....JffJffJ...",
  "....JJJJJJ....",
];

// ─── Special Sprites ────────────────────────────────────────────

// Zelda-style hero holding sword above head — "Item Get!" pose
const HERO_SWORD_RAISE = [
  ".....bb.....",
  ".....bb.....",
  ".....bb.....",
  ".....bb.....",
  "...gbbbbg...",
  ".ss..bb..ss.",
  "..ss....ss..",
  "...shhhhs...",
  "...hhhhhh...",
  "...ssssss...",
  "...sesses...",
  "...ssmmss...",
  "....ssss....",
  "...cccccc...",
  "..cccccccc..",
  "...pp..pp...",
  "...kk..kk...",
];

// Pixel dragon — boss creature
const PIXEL_DRAGON = [
  "dd........dd",
  ".ddd....ddd.",
  "..dddddddd..",
  "..ddRddRdd..",
  "..dddddddd..",
  "...ddFFdd...",
  "....dddd....",
  ".....dd.....",
  "....d..d....",
  "...dd..dd...",
];

// Pixel shield (standalone prop)
const PIXEL_SHIELD = [
  ".bbbbbb.",
  "bBBBBBBb",
  "bBBggBBb",
  "bBgBBgBb",
  "bBBggBBb",
  "bBBBBBBb",
  ".bBBBBb.",
  "..bBBb..",
  "...bb...",
];

// Pixel beaker / flask
const PIXEL_BEAKER = [
  ".bbbb.",
  ".b..b.",
  ".b..b.",
  ".b..b.",
  "bbbbbb",
  "bllllb",
  "bllllb",
  "bllllb",
  "bllllb",
  ".bbbb.",
];

// Pixel heart
const PIXEL_HEART = [
  ".rr.rr.",
  "rrrrrrr",
  "rrrrrrr",
  ".rrrrr.",
  "..rrr..",
  "...r...",
];

// Pixel music note
const PIXEL_NOTE = [
  "....nn",
  "....nn",
  "...nnn",
  "...n..",
  "...n..",
  "..nn..",
  ".nnn..",
  ".nn...",
];

// Pixel star
const PIXEL_STAR = [
  "...s...",
  "...s...",
  ".sssss.",
  "..sss..",
  ".ss.ss.",
  "s.....s",
];

// Pixel book
const PIXEL_BOOK = [
  "bbbbbbbb",
  "bwwwwwwb",
  "bwllllwb",
  "bwwwwwwb",
  "bwlllwwb",
  "bwwwwwwb",
  "bwllllwb",
  "bbbbbbbb",
];

// Pixel lock
const PIXEL_LOCK = [
  "..pppp..",
  ".p....p.",
  ".p....p.",
  "pppppppp",
  "pLLLLLLp",
  "pLLLLLLp",
  "pLLkkLLp",
  "pLLkkLLp",
  "pLLLLLLp",
  "pppppppp",
];

// Pixel scroll / document
const PIXEL_SCROLL = [
  "dddddddd",
  "dwwwwwwd",
  "dwllllwd",
  "dwwwwwwd",
  "dwlllwwd",
  "dwwwwwwd",
  "dwllllwd",
  "dwwwwwwd",
  "dwlllwwd",
  "dddddddd",
];

// ─── Color Palettes ─────────────────────────────────────────────

const PALETTES: Record<string, Record<string, string>> = {
  boyBlue: {
    h: "#5C3A1E", s: "#FFD5A3", e: "#1A1A2E", m: "#E88B7A",
    c: "#4A90E2", p: "#3B4060", k: "#2D2D3D",
  },
  girlPink: {
    h: "#E8C547", s: "#FFD5A3", e: "#1A1A2E", m: "#E88B7A",
    c: "#E74A8F", p: "#E74A8F", k: "#2D2D3D",
  },
  teacherGreen: {
    h: "#5C3A1E", s: "#D4A574", e: "#1A1A2E", m: "#C97A6A",
    c: "#4AC78F", p: "#3B5F4A", k: "#2D2D3D", t: "#C94420",
  },
  wheelchairPurple: {
    h: "#2D1B0E", s: "#8B6347", e: "#1A1A2E", m: "#C97A6A",
    c: "#8B5CF6", p: "#3B4060", k: "#2D2D3D", w: "#808090",
  },
  celebrateOrange: {
    h: "#B83A20", s: "#FFD5A3", e: "#1A1A2E", m: "#E88B7A",
    c: "#FB923C", p: "#3B4060", k: "#2D2D3D",
  },
  celebrateCyan: {
    h: "#2D1B0E", s: "#D4A574", e: "#1A1A2E", m: "#C97A6A",
    c: "#06B6D4", p: "#3B4060", k: "#2D2D3D",
  },
  boyGreen: {
    h: "#D4A017", s: "#FFD5A3", e: "#1A1A2E", m: "#E88B7A",
    c: "#22C55E", p: "#3B4060", k: "#2D2D3D",
  },
  girlPurple: {
    h: "#2D1B0E", s: "#8B6347", e: "#1A1A2E", m: "#C97A6A",
    c: "#A78BFA", p: "#A78BFA", k: "#2D2D3D",
  },
  // Zelda-style hero (Link-inspired)
  heroGreen: {
    h: "#D4A017", s: "#FFD5A3", e: "#1A1A2E", m: "#E88B7A",
    c: "#22C55E", p: "#6B5B3A", k: "#5C3A1E",
    b: "#B8C4D0", g: "#FFD700",
  },
  // Dragon
  dragonPurple: {
    d: "#7C3AED", R: "#EF4444", F: "#FB923C",
  },
  dragonRed: {
    d: "#DC2626", R: "#FBBF24", F: "#FB923C",
  },
  // Item props
  swordSilver: {
    b: "#B8C4D0", g: "#FFD700", B: "#8B97A5",
  },
  shieldBlue: {
    b: "#4A90E2", B: "#2563EB", g: "#FFD700",
  },
  // Pixel AlloBot
  alloBot: {
    p: "#7C3AED", a: "#818CF8", N: "#0F172A", G: "#10B981",
    m: "#34D399", Y: "#FACC15", J: "#64748B", f: "#F59E0B",
  },
  // Prop palettes
  beakerGreen: { b: "#94A3B8", l: "#22C55E" },
  beakerOrange: { b: "#94A3B8", l: "#FB923C" },
  heartRed: { r: "#EF4444" },
  heartPink: { r: "#F472B6" },
  lockBlue: { p: "#94A3B8", L: "#4A90E2", k: "#1A1A2E" },
  scrollTan: { d: "#8B7355", w: "#F5E6D0", l: "#A0906A" },
  noteOrange: { n: "#FB923C" },
  notePurple: { n: "#A78BFA" },
  starGold: { s: "#FBBF24" },
  starCyan: { s: "#06B6D4" },
  bookBlue: { b: "#4A90E2", w: "#F5E6D0", l: "#A0906A" },
};

type CharacterType = "studentBoy" | "studentGirl" | "teacher" | "wheelchair" | "celebrating";

const SPRITES: Record<CharacterType, string[]> = {
  studentBoy: STUDENT_BOY,
  studentGirl: STUDENT_GIRL,
  teacher: TEACHER,
  wheelchair: WHEELCHAIR,
  celebrating: CELEBRATING,
};

const DEFAULT_PALETTES: Record<CharacterType, string> = {
  studentBoy: "boyBlue",
  studentGirl: "girlPink",
  teacher: "teacherGreen",
  wheelchair: "wheelchairPurple",
  celebrating: "celebrateOrange",
};

// ─── Animated Character ─────────────────────────────────────────

interface PixelCharacterProps {
  type: CharacterType;
  pixelSize?: number;
  enterDelay?: number;
  paletteKey?: string;
  style?: React.CSSProperties;
  bobSpeed?: number;
  bobAmount?: number;
  phaseOffset?: number;
}

export const PixelCharacter: React.FC<PixelCharacterProps> = ({
  type,
  pixelSize = 6,
  enterDelay = 0,
  paletteKey,
  style,
  bobSpeed = 0.06,
  bobAmount = 2,
  phaseOffset = 0,
}) => {
  const frame = useCurrentFrame();
  const f = frame - enterDelay;

  const opacity = interpolate(f, [0, 15], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  if (f < -5) return null;

  const sprite = SPRITES[type];
  const key = paletteKey || DEFAULT_PALETTES[type];
  const basePalette = PALETTES[key] || PALETTES[DEFAULT_PALETTES[type]];

  // Blink: every ~90 frames, close eyes for 3 frames
  let palette: Record<string, string> = basePalette;
  if (f > 0 && f % 90 < 3) {
    palette = { ...basePalette, e: basePalette.s };
  }

  const bobY = Math.sin((f + phaseOffset) * bobSpeed) * bobAmount;
  // Shadow tracks character height: when char rises (bobY negative), shadow
  // moves further down, blurs more, and fades — real ground-shadow physics.
  // heightFactor: 0 at lowest point, 1 at highest.
  const heightFactor = bobAmount > 0 ? (-bobY + bobAmount) / (2 * bobAmount) : 0;
  const shadowOffsetY = 2 + heightFactor * 4;
  const shadowBlur = 4 + heightFactor * 4;
  const shadowAlpha = 0.4 - heightFactor * 0.15;

  return (
    <div
      style={{
        opacity: Math.max(0, opacity),
        transform: `translateY(${bobY}px)`,
        filter: `drop-shadow(0 ${shadowOffsetY}px ${shadowBlur}px rgba(0,0,0,${shadowAlpha}))`,
        ...style,
      }}
    >
      <PixelSprite rows={sprite} palette={palette} pixelSize={pixelSize} />
    </div>
  );
};

// ─── Composed: Pixel Classroom ──────────────────────────────────

export const PixelClassroom: React.FC<{
  pixelSize?: number;
  enterDelay?: number;
  maxOpacity?: number;
  style?: React.CSSProperties;
}> = ({ pixelSize = 4, enterDelay = 0, maxOpacity = 0.55, style }) => {
  const frame = useCurrentFrame();
  const f = frame - enterDelay;
  const groupOpacity = interpolate(f, [0, 25], [0, maxOpacity], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  if (f < 0) return null;

  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-end",
        gap: pixelSize * 6,
        opacity: groupOpacity,
        ...style,
      }}
    >
      <PixelCharacter type="teacher" pixelSize={pixelSize} enterDelay={enterDelay + 5} phaseOffset={0} />
      <PixelCharacter type="studentBoy" pixelSize={pixelSize} enterDelay={enterDelay + 12} phaseOffset={20} />
      <PixelCharacter type="studentGirl" pixelSize={pixelSize} enterDelay={enterDelay + 18} phaseOffset={40} />
      <PixelCharacter type="wheelchair" pixelSize={pixelSize} enterDelay={enterDelay + 24} phaseOffset={60} />
      <PixelCharacter
        type="studentBoy"
        pixelSize={pixelSize}
        enterDelay={enterDelay + 30}
        paletteKey="boyGreen"
        phaseOffset={80}
      />
    </div>
  );
};

// ─── Composed: Pixel Celebration Line ───────────────────────────

export const PixelCelebration: React.FC<{
  pixelSize?: number;
  enterDelay?: number;
  maxOpacity?: number;
  style?: React.CSSProperties;
}> = ({ pixelSize = 4, enterDelay = 0, maxOpacity = 0.6, style }) => {
  const frame = useCurrentFrame();
  const f = frame - enterDelay;
  const groupOpacity = interpolate(f, [0, 25], [0, maxOpacity], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  if (f < 0) return null;

  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-end",
        gap: pixelSize * 5,
        opacity: groupOpacity,
        ...style,
      }}
    >
      <PixelCharacter
        type="celebrating"
        pixelSize={pixelSize}
        enterDelay={enterDelay + 3}
        paletteKey="celebrateOrange"
        phaseOffset={0}
        bobAmount={4}
        bobSpeed={0.12}
      />
      <PixelCharacter type="studentBoy" pixelSize={pixelSize} enterDelay={enterDelay + 7} phaseOffset={15} />
      <PixelCharacter
        type="celebrating"
        pixelSize={pixelSize}
        enterDelay={enterDelay + 11}
        paletteKey="celebrateCyan"
        phaseOffset={30}
        bobAmount={4}
        bobSpeed={0.12}
      />
      <PixelCharacter type="studentGirl" pixelSize={pixelSize} enterDelay={enterDelay + 15} paletteKey="girlPurple" phaseOffset={45} />
      <PixelCharacter
        type="celebrating"
        pixelSize={pixelSize}
        enterDelay={enterDelay + 19}
        paletteKey="celebrateOrange"
        phaseOffset={60}
        bobAmount={4}
        bobSpeed={0.12}
      />
      <PixelCharacter type="wheelchair" pixelSize={pixelSize} enterDelay={enterDelay + 23} phaseOffset={75} />
    </div>
  );
};

// ─── Animated Pixel AlloBot ──────────────────────────────────────

export const PixelAlloBot: React.FC<{
  pixelSize?: number;
  enterDelay?: number;
  style?: React.CSSProperties;
}> = ({ pixelSize = 5, enterDelay = 0, style }) => {
  const frame = useCurrentFrame();
  const f = frame - enterDelay;
  if (f < -5) return null;

  const opacity = interpolate(f, [0, 15], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Hover bob
  const bobY = Math.sin(f * 0.07) * 3;

  // Eye blink
  let palette: Record<string, string> = PALETTES.alloBot;
  if (f > 0 && f % 75 < 3) {
    palette = { ...PALETTES.alloBot, G: PALETTES.alloBot.N };
  }

  // Antenna glow pulse
  const glowPulse = f > 0 ? Math.sin(f * 0.12) * 0.4 + 0.6 : 0;

  const spriteW = 14 * pixelSize;

  return (
    <div
      style={{
        position: "relative",
        display: "inline-block",
        opacity: Math.max(0, opacity),
        transform: `translateY(${bobY}px)`,
        filter: "drop-shadow(0 3px 6px rgba(124,58,237,0.4))",
        ...style,
      }}
    >
      {/* Antenna glow */}
      <div
        style={{
          position: "absolute",
          left: spriteW / 2 - 6,
          top: -2,
          width: 12,
          height: 12,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(250,204,21,0.6), transparent 70%)",
          opacity: glowPulse,
          filter: "blur(2px)",
        }}
      />
      {/* Signal wave */}
      {[0, 20].map((offset, i) => {
        const wCycle = (f + offset) % 45;
        const wR = interpolate(wCycle, [0, 45], [3, 18]);
        const wOp = interpolate(wCycle, [0, 45], [0.6, 0]);
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: spriteW / 2 - wR,
              top: -wR,
              width: wR * 2,
              height: wR * 2,
              borderRadius: "50%",
              border: `1px solid rgba(250,204,21,${wOp * 0.5})`,
              opacity: f > 5 ? wOp : 0,
            }}
          />
        );
      })}
      <PixelSprite rows={PIXEL_ALLOBOT} palette={palette} pixelSize={pixelSize} />
    </div>
  );
};

// ─── Zelda-Style Sword Raise Scene ──────────────────────────────

export const SwordRaiseScene: React.FC<{
  pixelSize?: number;
  enterDelay?: number;
  style?: React.CSSProperties;
}> = ({ pixelSize = 5, enterDelay = 0, style }) => {
  const frame = useCurrentFrame();
  const f = frame - enterDelay;

  if (f < 0) return null;

  const heroOpacity = interpolate(f, [0, 10], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Light beam shoots up from sword
  const beamWidth = interpolate(f, [12, 35], [0, 80], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const beamHeight = interpolate(f, [12, 30], [0, 160], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const beamOpacity = interpolate(f, [12, 22, 70, 90], [0, 0.5, 0.3, 0.15], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Golden glow pulse around sword
  const glowPulse = f > 18 ? Math.sin((f - 18) * 0.12) * 0.3 + 0.4 : 0;

  // Sparkle burst from sword tip
  const sparkles = Array.from({ length: 12 }, (_, i) => {
    const angle = (i / 12) * Math.PI * 2;
    const delay = 18 + i * 2;
    const progress = interpolate(f, [delay, delay + 30], [0, 1], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    });
    const r = progress * (12 + (i % 4) * 10);
    const sparkleOpacity = interpolate(progress, [0, 0.2, 1], [0, 1, 0]);
    const colors = ["#FFD700", "#FFFFFF", "#FFA500", "#FFD700"];
    return {
      x: Math.cos(angle) * r,
      y: Math.sin(angle) * r * 0.6 - 25,
      opacity: sparkleOpacity,
      size: 2 + (i % 3),
      color: colors[i % 4],
    };
  });

  // Triangular light cone (classic Zelda triangle above item)
  const triOpacity = interpolate(f, [25, 40, 70, 90], [0, 0.25, 0.15, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const spriteW = 12 * pixelSize;

  return (
    <div style={{ position: "relative", display: "inline-block", ...style }}>
      {/* Triangular light cone */}
      <div
        style={{
          position: "absolute",
          left: spriteW / 2 - 40,
          top: -60,
          width: 0,
          height: 0,
          borderLeft: "40px solid transparent",
          borderRight: "40px solid transparent",
          borderBottom: `80px solid rgba(255,215,0,${triOpacity * 0.4})`,
          filter: "blur(6px)",
          opacity: triOpacity,
        }}
      />

      {/* Light beam */}
      <div
        style={{
          position: "absolute",
          left: spriteW / 2 - beamWidth / 2,
          top: -beamHeight + 20,
          width: beamWidth,
          height: beamHeight,
          background:
            "linear-gradient(180deg, rgba(255,215,0,0) 0%, rgba(255,215,0,0.4) 40%, rgba(255,255,255,0.3) 100%)",
          opacity: beamOpacity,
          borderRadius: "50% 50% 0 0",
        }}
      />

      {/* Radial glow behind sword area */}
      <div
        style={{
          position: "absolute",
          left: spriteW / 2 - 25,
          top: -15,
          width: 50,
          height: 50,
          background: "radial-gradient(circle, rgba(255,215,0,0.6), transparent 70%)",
          opacity: glowPulse,
          filter: "blur(4px)",
        }}
      />

      {/* Hero sprite */}
      <div style={{ opacity: heroOpacity, position: "relative", zIndex: 1 }}>
        <PixelSprite rows={HERO_SWORD_RAISE} palette={PALETTES.heroGreen} pixelSize={pixelSize} />
      </div>

      {/* Sparkles */}
      {sparkles.map((s, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            left: spriteW / 2 + s.x,
            top: s.y + 20,
            width: s.size * pixelSize * 0.4,
            height: s.size * pixelSize * 0.4,
            background: s.color,
            borderRadius: i % 3 === 0 ? "1px" : "50%",
            opacity: s.opacity,
            boxShadow: `0 0 ${s.size * 3}px ${s.color}88`,
            transform: i % 3 === 0 ? `rotate(${f * 5 + i * 30}deg)` : undefined,
            zIndex: 2,
          }}
        />
      ))}
    </div>
  );
};

// ─── Dragon Battle Scene ────────────────────────────────────────

export const DragonBattleScene: React.FC<{
  pixelSize?: number;
  enterDelay?: number;
  style?: React.CSSProperties;
}> = ({ pixelSize = 4, enterDelay = 0, style }) => {
  const frame = useCurrentFrame();
  const f = frame - enterDelay;

  if (f < 0) return null;

  const opacity = interpolate(f, [0, 15], [0, 0.7], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Dragon hover
  const dragonY = Math.sin(f * 0.08) * 4;

  // Fire breath flicker
  const firePulse = f > 15 ? Math.sin(f * 0.2) * 0.4 + 0.5 : 0;

  // Slash effects when warriors attack
  const slashOpacity = f > 25 ? Math.max(0, Math.sin(f * 0.3) * 0.6) : 0;

  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-end",
        gap: pixelSize * 3,
        opacity,
        ...style,
      }}
    >
      {/* Left warrior */}
      <div style={{ position: "relative" }}>
        <PixelCharacter
          type="celebrating"
          pixelSize={pixelSize}
          enterDelay={enterDelay + 5}
          paletteKey="heroGreen"
          bobAmount={3}
          bobSpeed={0.15}
          phaseOffset={0}
        />
        {/* Slash mark */}
        <div
          style={{
            position: "absolute",
            right: -8,
            top: "30%",
            width: 12,
            height: 2,
            background: "#FFD700",
            opacity: slashOpacity,
            transform: "rotate(-30deg)",
            boxShadow: "0 0 6px #FFD700",
          }}
        />
      </div>

      {/* Dragon */}
      <div style={{ position: "relative", transform: `translateY(${dragonY}px)` }}>
        <PixelSprite rows={PIXEL_DRAGON} palette={PALETTES.dragonPurple} pixelSize={pixelSize} />
        {/* Fire breath glow */}
        <div
          style={{
            position: "absolute",
            bottom: pixelSize * 3,
            left: "50%",
            width: 20,
            height: 12,
            background: "radial-gradient(ellipse, rgba(251,146,60,0.6), rgba(239,68,68,0.3), transparent 70%)",
            opacity: firePulse,
            transform: "translateX(-50%)",
            filter: "blur(2px)",
          }}
        />
        {/* HP bar above dragon */}
        <div
          style={{
            position: "absolute",
            top: -8,
            left: "50%",
            transform: "translateX(-50%)",
            width: pixelSize * 10,
            height: 3,
            background: "rgba(0,0,0,0.4)",
            borderRadius: 2,
          }}
        >
          <div
            style={{
              width: "40%",
              height: "100%",
              background: "linear-gradient(90deg, #EF4444, #F87171)",
              borderRadius: 2,
            }}
          />
        </div>
      </div>

      {/* Right warrior */}
      <div style={{ position: "relative" }}>
        <PixelCharacter
          type="studentBoy"
          pixelSize={pixelSize}
          enterDelay={enterDelay + 8}
          bobAmount={3}
          bobSpeed={0.15}
          phaseOffset={40}
        />
        {/* Shield */}
        <div style={{ position: "absolute", left: -6, top: "40%" }}>
          <PixelSprite rows={PIXEL_SHIELD} palette={PALETTES.shieldBlue} pixelSize={Math.max(1, pixelSize - 2)} />
        </div>
      </div>
    </div>
  );
};

// ─── STEM Lab Scene — Bubbling Beaker ───────────────────────────

export const PixelLabScene: React.FC<{
  pixelSize?: number;
  enterDelay?: number;
  style?: React.CSSProperties;
}> = ({ pixelSize = 4, enterDelay = 0, style }) => {
  const frame = useCurrentFrame();
  const f = frame - enterDelay;
  if (f < 0) return null;

  const opacity = interpolate(f, [0, 15], [0, 0.7], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Animated bubbles rising from beaker
  const bubbles = Array.from({ length: 8 }, (_, i) => {
    const speed = 0.04 + (i % 3) * 0.01;
    const cycle = (f + i * 12) * speed;
    const phase = cycle - Math.floor(cycle);
    return {
      x: pixelSize * 2.5 + Math.sin(phase * Math.PI * 2 + i) * 4,
      y: -phase * 35,
      opacity: f > 8 ? interpolate(phase, [0, 0.15, 0.7, 1], [0, 0.8, 0.5, 0]) : 0,
      size: 2 + (i % 3),
    };
  });

  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: pixelSize * 2, opacity, ...style }}>
      <PixelCharacter type="studentGirl" pixelSize={pixelSize} enterDelay={enterDelay + 5} bobAmount={1} phaseOffset={0} />
      <div style={{ position: "relative" }}>
        <PixelSprite rows={PIXEL_BEAKER} palette={PALETTES.beakerGreen} pixelSize={pixelSize} />
        {bubbles.map((b, i) => (
          <div
            key={i}
            style={{
              position: "absolute",
              left: b.x,
              bottom: pixelSize * 5 - b.y,
              width: b.size,
              height: b.size,
              borderRadius: "50%",
              background: "#22C55E",
              opacity: b.opacity,
              boxShadow: "0 0 4px #22C55E88",
            }}
          />
        ))}
      </div>
    </div>
  );
};

// ─── Word Sounds Scene — Floating Letter Blocks ─────────────────

export const PixelSoundScene: React.FC<{
  pixelSize?: number;
  enterDelay?: number;
  style?: React.CSSProperties;
}> = ({ pixelSize = 4, enterDelay = 0, style }) => {
  const frame = useCurrentFrame();
  const f = frame - enterDelay;
  if (f < 0) return null;

  const opacity = interpolate(f, [0, 15], [0, 0.7], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const letters = ["c", "a", "t"];

  // Floating music notes
  const notes = Array.from({ length: 4 }, (_, i) => {
    const noteDelay = 25 + i * 14;
    const noteF = f - noteDelay;
    const progress = interpolate(noteF, [0, 40], [0, 1], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    });
    return {
      x: (i - 1.5) * 14 + Math.sin(noteF * 0.12 + i) * 5,
      y: -progress * 35 - 5,
      opacity: interpolate(progress, [0, 0.15, 0.6, 1], [0, 0.8, 0.5, 0]),
      palette: i % 2 === 0 ? "noteOrange" : "notePurple",
      scale: 0.6 + (1 - Math.abs(progress - 0.4)) * 0.4,
    };
  });

  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: pixelSize * 2, opacity, position: "relative", ...style }}>
      {/* Floating pixel music notes */}
      {notes.map((n, i) => (
        n.opacity > 0 ? (
          <div
            key={`note-${i}`}
            style={{
              position: "absolute",
              left: pixelSize * 8 + n.x,
              top: n.y,
              transform: `scale(${n.scale})`,
              opacity: n.opacity,
              filter: "drop-shadow(0 0 3px rgba(251,146,60,0.4))",
            }}
          >
            <PixelSprite rows={PIXEL_NOTE} palette={PALETTES[n.palette]} pixelSize={Math.max(1, pixelSize - 2)} />
          </div>
        ) : null
      ))}
      <PixelCharacter type="studentBoy" pixelSize={pixelSize} enterDelay={enterDelay + 3} paletteKey="boyBlue" bobAmount={1} phaseOffset={0} />
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
        {/* Floating letter blocks */}
        <div style={{ display: "flex", gap: 3 }}>
          {letters.map((letter, i) => {
            const delay = 12 + i * 10;
            const pop = interpolate(f, [delay, delay + 8], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            });
            const bob = Math.sin((f - delay) * 0.1 + i) * 2;
            return (
              <div
                key={i}
                style={{
                  width: pixelSize * 4,
                  height: pixelSize * 4,
                  borderRadius: 2,
                  background: `rgba(251,146,60,${0.15 + pop * 0.2})`,
                  border: `1px solid rgba(251,146,60,${0.3 * pop})`,
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  fontSize: pixelSize * 2.5,
                  fontWeight: 800,
                  fontFamily: "monospace",
                  color: "#FB923C",
                  opacity: pop,
                  transform: `scale(${0.5 + pop * 0.5}) translateY(${bob}px)`,
                }}
              >
                {letter}
              </div>
            );
          })}
        </div>
        {/* Sound wave bars */}
        <div style={{ display: "flex", gap: 1, alignItems: "flex-end" }}>
          {[4, 7, 10, 7, 9, 5, 8, 6].map((h, i) => (
            <div
              key={i}
              style={{
                width: 2,
                height: f > 20 ? h * Math.abs(Math.sin(f * 0.15 + i * 0.8)) : 0,
                borderRadius: 1,
                background: "#FB923C66",
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

// ─── Symbol Studio Scene — Speech Bubble ────────────────────────

export const PixelSymbolScene: React.FC<{
  pixelSize?: number;
  enterDelay?: number;
  style?: React.CSSProperties;
}> = ({ pixelSize = 4, enterDelay = 0, style }) => {
  const frame = useCurrentFrame();
  const f = frame - enterDelay;
  if (f < 0) return null;

  const opacity = interpolate(f, [0, 15], [0, 0.7], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const bubbleScale = interpolate(f, [15, 28], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const symbols = ["🏠", "😊", "🍎"];
  const activeSymbol = Math.floor(((f - 25) * 0.03) % symbols.length);

  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: pixelSize * 2, opacity, ...style }}>
      <div style={{ position: "relative" }}>
        <PixelCharacter type="wheelchair" pixelSize={pixelSize} enterDelay={enterDelay + 3} bobAmount={1} phaseOffset={0} />
        {/* Speech bubble */}
        <div
          style={{
            position: "absolute",
            top: -pixelSize * 4,
            right: -pixelSize * 6,
            padding: "3px 5px",
            borderRadius: 6,
            background: "rgba(52,211,153,0.15)",
            border: "1px solid rgba(52,211,153,0.3)",
            transform: `scale(${bubbleScale})`,
            transformOrigin: "bottom left",
            fontSize: pixelSize * 3,
            lineHeight: 1,
          }}
        >
          {f > 25 ? symbols[Math.max(0, activeSymbol)] : "💬"}
        </div>
      </div>
    </div>
  );
};

// ─── Behavior Lens Scene — Animated Bar Chart ───────────────────

export const PixelChartScene: React.FC<{
  pixelSize?: number;
  enterDelay?: number;
  color?: string;
  style?: React.CSSProperties;
}> = ({ pixelSize = 4, enterDelay = 0, color = "#FBBF24", style }) => {
  const frame = useCurrentFrame();
  const f = frame - enterDelay;
  if (f < 0) return null;

  const opacity = interpolate(f, [0, 15], [0, 0.7], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const bars = [35, 55, 40, 70, 50, 85, 60];

  return (
    <div style={{ opacity, ...style }}>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 2, height: 50 }}>
        {bars.map((target, i) => {
          const barDelay = 8 + i * 4;
          const barHeight = interpolate(f, [barDelay, barDelay + 15], [0, target], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          });
          return (
            <div
              key={i}
              style={{
                width: pixelSize * 1.5,
                height: `${barHeight}%`,
                borderRadius: 1,
                background: `linear-gradient(180deg, ${color}, ${color}44)`,
                boxShadow: `0 0 4px ${color}33`,
              }}
            />
          );
        })}
      </div>
      {/* Axis line */}
      <div style={{ width: "100%", height: 1, background: `${color}33`, marginTop: 2 }} />
    </div>
  );
};

// ─── Report Writer Scene — Animated Scroll ──────────────────────

export const PixelScrollScene: React.FC<{
  pixelSize?: number;
  enterDelay?: number;
  style?: React.CSSProperties;
}> = ({ pixelSize = 3, enterDelay = 0, style }) => {
  const frame = useCurrentFrame();
  const f = frame - enterDelay;
  if (f < 0) return null;

  const opacity = interpolate(f, [0, 15], [0, 0.7], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Quill/pen writing animation — cursor position
  const writeProgress = interpolate(f, [10, 60], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Checkmark appears when writing completes
  const checkOpacity = interpolate(f, [62, 70], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const checkScale = interpolate(f, [62, 72], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: pixelSize * 2, opacity, ...style }}>
      <PixelCharacter type="teacher" pixelSize={pixelSize} enterDelay={enterDelay + 3} bobAmount={1} phaseOffset={0} />
      <div style={{ position: "relative" }}>
        <PixelSprite rows={PIXEL_SCROLL} palette={PALETTES.scrollTan} pixelSize={pixelSize} />
        {/* Writing cursor */}
        <div
          style={{
            position: "absolute",
            left: pixelSize + writeProgress * pixelSize * 5,
            top: pixelSize * 2 + Math.floor(writeProgress * 4) * pixelSize * 2,
            width: 2,
            height: pixelSize * 1.5,
            background: "#A78BFA",
            opacity: f % 20 < 14 ? 0.8 : 0,
          }}
        />
        {/* Completion checkmark */}
        <div
          style={{
            position: "absolute",
            right: -pixelSize * 2,
            top: -pixelSize,
            fontSize: pixelSize * 3,
            color: "#4ADE80",
            opacity: checkOpacity,
            transform: `scale(${checkScale})`,
            filter: "drop-shadow(0 0 4px rgba(74,222,128,0.4))",
          }}
        >
          ✓
        </div>
      </div>
      {/* Pixel book reference */}
      <div style={{ opacity: interpolate(f, [15, 28], [0, 0.6], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) }}>
        <PixelSprite rows={PIXEL_BOOK} palette={PALETTES.bookBlue} pixelSize={Math.max(1, pixelSize - 1)} />
      </div>
    </div>
  );
};

// ─── Math Fluency Scene — Floating Equation ─────────────────────

export const PixelMathScene: React.FC<{
  pixelSize?: number;
  enterDelay?: number;
  style?: React.CSSProperties;
}> = ({ pixelSize = 4, enterDelay = 0, style }) => {
  const frame = useCurrentFrame();
  const f = frame - enterDelay;
  if (f < 0) return null;

  const opacity = interpolate(f, [0, 15], [0, 0.7], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const questionOpacity = interpolate(f, [10, 18], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const answerOpacity = interpolate(f, [35, 45], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const checkScale = interpolate(f, [45, 55], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: pixelSize * 2, opacity, ...style }}>
      <PixelCharacter type="studentGirl" pixelSize={pixelSize} enterDelay={enterDelay + 3} paletteKey="girlPurple" bobAmount={1} phaseOffset={0} />
      <div style={{ display: "flex", flexDirection: "column", gap: 4, alignItems: "center" }}>
        {/* Equation */}
        <div
          style={{
            fontSize: pixelSize * 3,
            fontWeight: 800,
            fontFamily: "monospace",
            color: "#2DD4BF",
            opacity: questionOpacity,
            textShadow: "0 0 8px rgba(45,212,191,0.3)",
          }}
        >
          7×8
        </div>
        {/* Answer */}
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <div
            style={{
              fontSize: pixelSize * 4,
              fontWeight: 900,
              fontFamily: "monospace",
              color: "#2DD4BF",
              opacity: answerOpacity,
              textShadow: "0 0 12px rgba(45,212,191,0.4)",
            }}
          >
            56
          </div>
          {/* Checkmark */}
          <div
            style={{
              fontSize: pixelSize * 2.5,
              color: "#4ADE80",
              opacity: answerOpacity,
              transform: `scale(${checkScale})`,
            }}
          >
            ✓
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── SEL Hub Scene — Students + Hearts ──────────────────────────

export const PixelHeartScene: React.FC<{
  pixelSize?: number;
  enterDelay?: number;
  style?: React.CSSProperties;
}> = ({ pixelSize = 4, enterDelay = 0, style }) => {
  const frame = useCurrentFrame();
  const f = frame - enterDelay;
  if (f < 0) return null;

  const opacity = interpolate(f, [0, 15], [0, 0.7], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Floating hearts
  const hearts = Array.from({ length: 3 }, (_, i) => {
    const delay = 20 + i * 12;
    const progress = interpolate(f, [delay, delay + 40], [0, 1], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    });
    return {
      y: -progress * 30,
      opacity: interpolate(progress, [0, 0.2, 0.7, 1], [0, 1, 0.8, 0]),
      scale: 0.5 + (1 - Math.abs(progress - 0.5) * 2) * 0.5,
      x: (i - 1) * 12,
    };
  });

  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: pixelSize * 3, opacity, position: "relative", ...style }}>
      <PixelCharacter type="studentBoy" pixelSize={pixelSize} enterDelay={enterDelay + 3} bobAmount={1} phaseOffset={0} />
      {/* Hearts floating between students */}
      <div style={{ position: "relative", width: 20, height: 40 }}>
        {hearts.map((h, i) => (
          <div
            key={i}
            style={{
              position: "absolute",
              left: 10 + h.x,
              bottom: 10 - h.y,
              transform: `scale(${h.scale})`,
              opacity: h.opacity,
            }}
          >
            <PixelSprite rows={PIXEL_HEART} palette={PALETTES.heartPink} pixelSize={Math.max(1, pixelSize - 2)} />
          </div>
        ))}
      </div>
      <PixelCharacter type="studentGirl" pixelSize={pixelSize} enterDelay={enterDelay + 6} bobAmount={1} phaseOffset={30} />
      {/* Twinkling pixel star */}
      <div
        style={{
          opacity: interpolate(f, [30, 42], [0, 0.6], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })
            * (f > 42 ? Math.sin(f * 0.15) * 0.3 + 0.7 : 1),
          marginLeft: -4,
          transform: `rotate(${f * 2}deg)`,
          filter: "drop-shadow(0 0 3px rgba(251,191,36,0.5))",
        }}
      >
        <PixelSprite rows={PIXEL_STAR} palette={PALETTES.starGold} pixelSize={Math.max(1, pixelSize - 2)} />
      </div>
    </div>
  );
};

// ─── Privacy Scene — Shield + Lock ──────────────────────────────

// ─── Pixel Fireworks (CTA finale) ────────────────────────────

export const PixelFireworks: React.FC<{
  enterDelay?: number;
  maxOpacity?: number;
  style?: React.CSSProperties;
}> = ({ enterDelay = 0, maxOpacity = 0.7, style }) => {
  const frame = useCurrentFrame();
  const f = frame - enterDelay;
  if (f < 0) return null;

  const groupOpacity = interpolate(f, [0, 20], [0, maxOpacity], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // 5 firework bursts at staggered times
  const bursts = [
    { x: -280, y: -120, delay: 0, color: "#60a5fa", color2: "#93c5fd" },
    { x: 200, y: -160, delay: 18, color: "#34d399", color2: "#6ee7b7" },
    { x: -80, y: -200, delay: 35, color: "#a78bfa", color2: "#c4b5fd" },
    { x: 320, y: -100, delay: 52, color: "#fbbf24", color2: "#fde68a" },
    { x: -350, y: -180, delay: 68, color: "#f472b6", color2: "#f9a8d4" },
  ];

  return (
    <div style={{ position: "relative", opacity: groupOpacity, ...style }}>
      {bursts.map((burst, bi) => {
        const bf = f - burst.delay;
        if (bf < 0) return null;

        // Rising trail
        const riseProgress = interpolate(bf, [0, 15], [0, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });
        const trailOpacity = interpolate(bf, [0, 12, 18], [0, 0.8, 0], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });
        const trailY = interpolate(riseProgress, [0, 1], [60, 0]);

        // Explosion particles (16 per burst)
        const particles = Array.from({ length: 16 }, (_, i) => {
          const angle = (i / 16) * Math.PI * 2;
          const particleDelay = 14;
          const progress = interpolate(bf, [particleDelay, particleDelay + 30], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          });
          const r = progress * (25 + (i % 4) * 12);
          const pOpacity = interpolate(progress, [0, 0.15, 0.6, 1], [0, 1, 0.6, 0]);
          return {
            x: Math.cos(angle) * r,
            y: Math.sin(angle) * r - 8,
            opacity: pOpacity,
            size: 2 + (i % 3),
            isSquare: i % 4 === 0,
            color: i % 2 === 0 ? burst.color : burst.color2,
          };
        });

        return (
          <div key={bi} style={{ position: "absolute", left: burst.x, top: burst.y }}>
            {/* Rising trail */}
            <div
              style={{
                position: "absolute",
                left: 0,
                top: trailY,
                width: 3,
                height: 12,
                background: burst.color,
                opacity: trailOpacity,
                borderRadius: 1,
                boxShadow: `0 0 6px ${burst.color}`,
              }}
            />
            {/* Explosion particles */}
            {particles.map((p, pi) => (
              <div
                key={pi}
                style={{
                  position: "absolute",
                  left: p.x,
                  top: p.y,
                  width: p.size,
                  height: p.size,
                  background: p.color,
                  borderRadius: p.isSquare ? 1 : "50%",
                  opacity: p.opacity,
                  boxShadow: `0 0 ${p.size * 2}px ${p.color}88`,
                }}
              />
            ))}
          </div>
        );
      })}
    </div>
  );
};

// ─── Scanline Overlay (retro CRT feel) ──────────────────────

export const ScanlineOverlay: React.FC<{
  opacity?: number;
  lineGap?: number;
}> = ({ opacity = 0.03, lineGap = 4 }) => {
  const frame = useCurrentFrame();
  // Subtle CRT-flicker breath on opacity (\u00b115% of base)
  const breathOpacity = opacity * (0.85 + Math.sin(frame * 0.04) * 0.15);
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        background: `repeating-linear-gradient(
          0deg,
          transparent,
          transparent ${lineGap - 1}px,
          rgba(0,0,0,${breathOpacity}) ${lineGap - 1}px,
          rgba(0,0,0,${breathOpacity}) ${lineGap}px
        )`,
        pointerEvents: "none",
        zIndex: 10,
      }}
    />
  );
};

// ─── Pixel Confetti Burst ────────────────────────────────────

export const PixelConfetti: React.FC<{
  enterDelay?: number;
  count?: number;
  spread?: number;
  maxOpacity?: number;
  style?: React.CSSProperties;
}> = ({ enterDelay = 0, count = 30, spread = 350, maxOpacity = 0.7, style }) => {
  const frame = useCurrentFrame();
  const f = frame - enterDelay;
  if (f < 0) return null;

  const colors = ["#60a5fa", "#34d399", "#a78bfa", "#fbbf24", "#f472b6", "#fb923c", "#38bdf8"];

  const pieces = Array.from({ length: count }, (_, i) => {
    const seed = i * 31 + 7;
    const angle = ((Math.sin(seed * 9301 + 49297) * 49297) % 1) * Math.PI * 2;
    const velocity = 0.5 + ((Math.sin(seed * 7919 + 104729) * 104729) % 1) * 0.5;
    const r = f * velocity * 3;
    const x = Math.cos(angle) * r * (spread / 350);
    const y = Math.sin(angle) * r * 0.6 - f * 0.3 + f * f * 0.02;
    const pieceOpacity = interpolate(f, [0, 5, 40, 70], [0, maxOpacity, maxOpacity * 0.5, 0], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    });
    const size = 3 + (i % 4) * 2;
    const rotation = f * (2 + (i % 5)) + i * 45;
    const isSquare = i % 3 !== 0;

    return { x, y, opacity: pieceOpacity, size, rotation, isSquare, color: colors[i % colors.length] };
  });

  return (
    <div style={{ position: "relative", ...style }}>
      {pieces.map((p, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            left: p.x,
            top: p.y,
            width: p.size,
            height: p.isSquare ? p.size : p.size * 0.5,
            background: p.color,
            borderRadius: p.isSquare ? 1 : "50%",
            opacity: p.opacity,
            transform: `rotate(${p.rotation}deg)`,
            boxShadow: `0 0 ${p.size}px ${p.color}44`,
          }}
        />
      ))}
    </div>
  );
};

// ─── Privacy Scene — Shield + Lock ──────────────────────────

// ─── New sprites for additional feature cards ───────────────────────

// Monitor/screen sprite (8×7) — for Live Session
const PIXEL_MONITOR = [
  "..MMMM..",
  ".MSSSSM.",
  ".MSBBSM.",
  ".MSBSSM.",
  ".MSSSSM.",
  "..MMMM..",
  "...CC...",
  "..CCCC..",
];

// Trophy sprite (8×9) — for Gamification
const PIXEL_TROPHY = [
  "..XGGX..",
  ".XGGGGX.",
  ".XGGGGX.",
  "..XGGX..",
  "...GG...",
  "...GG...",
  "..XGGX..",
  ".XXXXXM.",
  ".XXXXXM.",
];

// Key sprite (10×5) — for Escape Room
const PIXEL_KEY = [
  "..GG......",
  ".GYYG.....",
  ".GYYGGGGG.",
  ".GYYG.G.G.",
  "..GG......",
];

// Clipboard/checklist sprite (7×9) — for Lesson Plan
const PIXEL_CLIPBOARD = [
  "..CCC..",
  ".CWWWC.",
  ".CWGWC.",
  ".CW.WC.",
  ".CWGWC.",
  ".CW.WC.",
  ".CWGWC.",
  ".CWWWC.",
  ".CCCCC.",
];

// Bar chart sprite (8×8) — for Teacher Dashboard
const PIXEL_BARCHART = [
  "........",
  ".....BB.",
  "...B.BB.",
  "...B.BB.",
  ".B.B.BB.",
  ".B.B.BB.",
  ".B.B.BB.",
  "GGGGGGGG",
];

// Additional palettes for new sprites
const monitorPalette: Record<string, string> = { M: "#475569", S: "#1e293b", B: "#60a5fa", C: "#64748b" };
const trophyPalette: Record<string, string> = { G: "#fbbf24", X: "#f59e0b", M: "#92400e" };
const keyPalette: Record<string, string> = { G: "#64748b", Y: "#fbbf24" };
const clipboardPalette: Record<string, string> = { C: "#64748b", W: "#f8fafc", G: "#4ade80" };
const barchartPalette: Record<string, string> = { B: "#60a5fa", G: "#475569" };

// ─── Live Session Scene — Monitor + signal waves ──────────────────
export const PixelSessionScene: React.FC<{
  pixelSize?: number;
  enterDelay?: number;
}> = ({ pixelSize = 4, enterDelay = 0 }) => {
  const frame = useCurrentFrame();
  const f = frame - enterDelay;
  if (f < 0) return null;

  const opacity = interpolate(f, [0, 15], [0, 0.7], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Signal wave arcs between monitors
  const wavePhase = f * 0.15;
  const wave1Op = Math.sin(wavePhase) * 0.4 + 0.4;
  const wave2Op = Math.sin(wavePhase + 1.5) * 0.4 + 0.4;

  return (
    <div style={{ display: "flex", alignItems: "center", gap: pixelSize * 6, opacity }}>
      <div style={{ filter: `drop-shadow(0 0 4px rgba(96,165,250,0.4))` }}>
        <PixelSprite rows={PIXEL_MONITOR} palette={monitorPalette} pixelSize={pixelSize} />
      </div>
      {/* Signal arcs */}
      <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
        {[wave1Op, wave2Op].map((op, i) => (
          <div key={i} style={{ width: 12, height: 2, borderRadius: 1, background: "#60a5fa", opacity: op }} />
        ))}
      </div>
      <div style={{ filter: `drop-shadow(0 0 4px rgba(52,211,153,0.4))`, transform: "scaleX(-1)" }}>
        <PixelSprite rows={PIXEL_MONITOR} palette={{ ...monitorPalette, B: "#34d399" }} pixelSize={pixelSize} />
      </div>
    </div>
  );
};

// ─── Gamification Scene — Trophy + XP bar + star ──────────────────
export const PixelXPScene: React.FC<{
  pixelSize?: number;
  enterDelay?: number;
}> = ({ pixelSize = 4, enterDelay = 0 }) => {
  const frame = useCurrentFrame();
  const f = frame - enterDelay;
  if (f < 0) return null;

  const opacity = interpolate(f, [0, 15], [0, 0.7], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const xpWidth = interpolate(f, [10, 50], [0, 40], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const starGlow = f > 20 ? Math.sin(f * 0.12) * 0.3 + 0.5 : 0;

  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: pixelSize * 3, opacity }}>
      <div style={{ filter: `drop-shadow(0 0 ${3 + starGlow * 4}px rgba(251,191,36,0.5))` }}>
        <PixelSprite rows={PIXEL_TROPHY} palette={trophyPalette} pixelSize={pixelSize} />
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        {/* XP bar */}
        <div style={{ width: 50, height: 6, borderRadius: 3, background: "rgba(251,191,36,0.15)", overflow: "hidden" }}>
          <div style={{ width: xpWidth, height: "100%", borderRadius: 3, background: "linear-gradient(90deg, #fbbf24, #f59e0b)" }} />
        </div>
        {/* Twinkling star */}
        <div style={{ filter: `drop-shadow(0 0 ${2 + starGlow * 3}px rgba(251,191,36,0.4))` }}>
          <PixelSprite rows={PIXEL_STAR} palette={PALETTES.starGold} pixelSize={Math.max(2, pixelSize - 1)} />
        </div>
      </div>
    </div>
  );
};

// ─── Teacher Dashboard Scene — Bar chart + student dot ────────────
export const PixelDashboardScene: React.FC<{
  pixelSize?: number;
  enterDelay?: number;
}> = ({ pixelSize = 4, enterDelay = 0 }) => {
  const frame = useCurrentFrame();
  const f = frame - enterDelay;
  if (f < 0) return null;

  const opacity = interpolate(f, [0, 15], [0, 0.7], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const chartScale = interpolate(f, [5, 20], [0.5, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const dotPulse = f > 15 ? Math.sin(f * 0.1) * 0.2 + 0.6 : 0;

  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: pixelSize * 3, opacity }}>
      <div style={{ transform: `scale(${chartScale})`, filter: "drop-shadow(0 0 3px rgba(96,165,250,0.3))" }}>
        <PixelSprite rows={PIXEL_BARCHART} palette={barchartPalette} pixelSize={pixelSize} />
      </div>
      {/* Student indicator dot */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
        <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#4ade80", opacity: dotPulse, boxShadow: "0 0 4px rgba(74,222,128,0.5)" }} />
        <PixelCharacter type="studentBoy" pixelSize={Math.max(2, pixelSize - 1)} enterDelay={enterDelay + 15} bobAmount={1} phaseOffset={0} />
      </div>
    </div>
  );
};

// ─── Escape Room Scene — Key + lock ───────────────────────────────
export const PixelEscapeScene: React.FC<{
  pixelSize?: number;
  enterDelay?: number;
}> = ({ pixelSize = 4, enterDelay = 0 }) => {
  const frame = useCurrentFrame();
  const f = frame - enterDelay;
  if (f < 0) return null;

  const opacity = interpolate(f, [0, 15], [0, 0.7], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Key rotates slightly toward lock
  const keyRotate = interpolate(f, [10, 30], [15, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const lockGlow = f > 25 ? Math.sin(f * 0.12) * 0.3 + 0.4 : 0;

  return (
    <div style={{ display: "flex", alignItems: "center", gap: pixelSize * 4, opacity }}>
      <div style={{ transform: `rotate(${keyRotate}deg)`, filter: "drop-shadow(0 0 3px rgba(251,191,36,0.4))" }}>
        <PixelSprite rows={PIXEL_KEY} palette={keyPalette} pixelSize={pixelSize} />
      </div>
      <div style={{ filter: `drop-shadow(0 0 ${3 + lockGlow * 4}px rgba(167,139,250,0.4))` }}>
        <PixelSprite rows={PIXEL_LOCK} palette={{ ...PALETTES.lockBlue, L: "#a78bfa", K: "#7c3aed", H: "#c4b5fd" }} pixelSize={pixelSize} />
      </div>
    </div>
  );
};

// ─── Lesson Plan Scene — Clipboard + book ─────────────────────────
export const PixelLessonScene: React.FC<{
  pixelSize?: number;
  enterDelay?: number;
}> = ({ pixelSize = 4, enterDelay = 0 }) => {
  const frame = useCurrentFrame();
  const f = frame - enterDelay;
  if (f < 0) return null;

  const opacity = interpolate(f, [0, 15], [0, 0.7], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const checkScale = interpolate(f, [5, 20], [0.5, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const bookGlow = f > 15 ? Math.sin(f * 0.1) * 0.2 + 0.4 : 0;

  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: pixelSize * 3, opacity }}>
      <div style={{ transform: `scale(${checkScale})`, filter: "drop-shadow(0 0 3px rgba(74,222,128,0.4))" }}>
        <PixelSprite rows={PIXEL_CLIPBOARD} palette={clipboardPalette} pixelSize={pixelSize} />
      </div>
      <div style={{ filter: `drop-shadow(0 0 ${2 + bookGlow * 3}px rgba(96,165,250,0.3))` }}>
        <PixelSprite rows={PIXEL_BOOK} palette={PALETTES.bookBlue} pixelSize={pixelSize} />
      </div>
    </div>
  );
};

export const PixelShieldScene: React.FC<{
  pixelSize?: number;
  enterDelay?: number;
  style?: React.CSSProperties;
}> = ({ pixelSize = 4, enterDelay = 0, style }) => {
  const frame = useCurrentFrame();
  const f = frame - enterDelay;
  if (f < 0) return null;

  const opacity = interpolate(f, [0, 15], [0, 0.7], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const shieldScale = interpolate(f, [5, 20], [0.5, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const glowPulse = f > 15 ? Math.sin(f * 0.1) * 0.3 + 0.5 : 0;

  return (
    <div style={{ display: "flex", alignItems: "center", gap: pixelSize * 3, opacity, ...style }}>
      {/* Shield with glow */}
      <div style={{ position: "relative", transform: `scale(${shieldScale})` }}>
        <div
          style={{
            position: "absolute",
            inset: -8,
            background: "radial-gradient(circle, rgba(56,189,248,0.3), transparent 70%)",
            opacity: glowPulse,
            filter: "blur(4px)",
          }}
        />
        <PixelSprite rows={PIXEL_SHIELD} palette={PALETTES.shieldBlue} pixelSize={pixelSize} />
      </div>
      {/* Lock */}
      <div
        style={{
          transform: `scale(${shieldScale})`,
          filter: `drop-shadow(0 0 ${4 + glowPulse * 4}px rgba(56,189,248,0.3))`,
        }}
      >
        <PixelSprite rows={PIXEL_LOCK} palette={PALETTES.lockBlue} pixelSize={pixelSize} />
      </div>
    </div>
  );
};
