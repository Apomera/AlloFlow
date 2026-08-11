import { AbsoluteFill, Series, Sequence } from "remotion";
import { BotIntro } from "./scenes/BotIntro";
import { Hook } from "./scenes/Hook";
import { Problem } from "./scenes/Problem";
import { Testimonial } from "./scenes/Testimonial";
import { SolutionReveal } from "./scenes/SolutionReveal";
import { FeatureShowcase, FeatureMontage } from "./scenes/FeatureShowcase";
import { LiveSessions } from "./scenes/LiveSessions";
import { ByTheNumbers } from "./scenes/ByTheNumbers";
import { CallToAction } from "./scenes/CallToAction";
import { GeometricWipe } from "./components/GeometricWipe";
import { Watermark } from "./components/Watermark";
import { ProgressDots } from "./components/ProgressDots";
import { LightStreak } from "./components/LightStreak";
import { AnimatedBorder } from "./components/AnimatedBorder";
import { Vignette, Scanlines, FilmGrain, Letterbox } from "./components/CinematicOverlays";
import { useCurrentFrame, interpolate } from "remotion";

// ~112.7 seconds at 30fps = 3380 frames
// Scene breakdown (paced for comfortable reading):
//   Bot Intro:          5s   (150 frames)
//   Hook:               7s   (210 frames)
//   Problem:           10s   (300 frames)
//   Solution Reveal:    8s   (240 frames)
//   Hero Features:   20.8s   (625 frames) — 5 hero cards × 125 frames
//   Feature Montage:   10s   (300 frames) — features in rapid grid
//   Live Sessions:     15s   (450 frames) — teacher↔class diagram
//   Testimonial:      8.5s   (255 frames)
//   By the Numbers:  18.3s   (550 frames) — 6 stats × 80 frames + header
//   Call to Action:    10s   (300 frames)

const transitions = [
  { frame: 145, color: "#8b5cf6" },    // BotIntro -> Hook
  { frame: 355, color: "#f87171" },    // Hook -> Problem
  { frame: 655, color: "#34d399" },    // Problem -> Solution
  { frame: 895, color: "#60a5fa" },    // Solution -> Hero Features
  { frame: 1520, color: "#a78bfa" },   // Hero Features -> Montage
  { frame: 1820, color: "#06b6d4" },   // Montage -> Live Sessions (cyan)
  { frame: 2270, color: "#60a5fa" },   // Live Sessions -> Testimonial
  { frame: 2525, color: "#60a5fa" },   // Testimonial -> By the Numbers
  { frame: 3075, color: "#a78bfa" },   // By the Numbers -> CTA
];

// Light streaks at dramatic moments
const lightStreaks = [
  { frame: 48, color: "#8b5cf6", angle: -25 },
  { frame: 155, color: "#60a5fa", angle: -35 },
  { frame: 365, color: "#f87171", angle: -20 },
  { frame: 665, color: "#34d399", angle: -30 },
  // Hero feature card entrances (5 cards, every 125 frames from 910)
  { frame: 910, color: "#60a5fa", angle: -40 },
  { frame: 1035, color: "#c084fc", angle: -25 },
  { frame: 1160, color: "#34d399", angle: -35 },
  { frame: 1285, color: "#a78bfa", angle: -20 },
  { frame: 1410, color: "#fbbf24", angle: -30 },
  // Montage + Live Sessions + Testimonial + Numbers + CTA
  { frame: 1530, color: "#a78bfa", angle: -35, width: 140 },
  { frame: 1830, color: "#06b6d4", angle: -30, width: 150 },   // Live Sessions entry
  { frame: 2280, color: "#60a5fa", angle: -25 },                // Testimonial entry
  { frame: 2535, color: "#60a5fa", angle: -30, width: 150 },    // ByTheNumbers entry
  { frame: 3085, color: "#a78bfa", angle: -25, width: 160 },    // CTA entry
];

// Editing-suite chrome: the master scrubber and the broadcast timecode
// ("TC 00:01:23:14"). Off for the public cut — to us they read as craft, but to
// a superintendent watching a product video they read as an unfinished export.
// Flip to true for an internal review copy where frame references are useful.
const SHOW_EDITOR_CHROME = false;

// Format frame count as broadcast timecode HH:MM:SS:FF
const formatTimecode = (frame: number, fps: number = 30): string => {
  const totalSeconds = Math.floor(frame / fps);
  const hh = String(Math.floor(totalSeconds / 3600)).padStart(2, "0");
  const mm = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, "0");
  const ss = String(totalSeconds % 60).padStart(2, "0");
  const ff = String(frame % fps).padStart(2, "0");
  return `${hh}:${mm}:${ss}:${ff}`;
};

// Master timeline bar at the top — shows overall progress through the trailer
const MasterTimeline: React.FC = () => {
  const frame = useCurrentFrame();
  const totalFrames = 3380;
  const progress = Math.min(1, frame / totalFrames);
  const opacity = interpolate(frame, [120, 150, 3330, 3380], [0, 0.3, 0.3, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Scene boundary markers at cumulative positions
  const sceneBoundaries = [150, 360, 660, 900, 1525, 1825, 2275, 2530, 3080]; // scene ends

  return (
    <div
      style={{
        position: "absolute",
        top: 48,
        left: 80,
        right: 80,
        height: 2,
        background: "rgba(255,255,255,0.04)",
        borderRadius: 1,
        opacity,
        zIndex: 55,
        overflow: "visible",
      }}
    >
      {/* Filled portion */}
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          bottom: 0,
          width: `${progress * 100}%`,
          background: "linear-gradient(90deg, #8b5cf6, #60a5fa, #34d399, #a78bfa)",
          borderRadius: 1,
          boxShadow: "0 0 6px rgba(96,165,250,0.4)",
        }}
      />
      {/* Scene boundary ticks */}
      {sceneBoundaries.map((b, i) => (
        <div
          key={`boundary-${i}`}
          style={{
            position: "absolute",
            left: `${(b / totalFrames) * 100}%`,
            top: -3,
            bottom: -3,
            width: 1,
            background: "rgba(255,255,255,0.18)",
          }}
        />
      ))}
      {/* Leading edge marker with breathing pulse */}
      <div
        style={{
          position: "absolute",
          left: `${progress * 100}%`,
          top: "50%",
          transform: `translate(-50%, -50%) scale(${1 + Math.sin(frame * 0.15) * 0.2})`,
          width: 6,
          height: 6,
          borderRadius: "50%",
          background: "#ffffff",
          boxShadow: `0 0 ${6 + Math.sin(frame * 0.15) * 4}px #60a5fa`,
        }}
      />
    </div>
  );
};

const TimecodeOverlay: React.FC = () => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [120, 150, 3330, 3380], [0, 0.35, 0.35, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return (
    <div
      style={{
        position: "absolute",
        bottom: 28,
        right: 48,
        fontSize: 10,
        fontFamily: "monospace",
        color: "#60a5fa",
        letterSpacing: "0.15em",
        opacity,
        zIndex: 55,
        display: "flex",
        alignItems: "center",
        gap: 6,
      }}
    >
      <span style={{
        width: 5,
        height: 5,
        borderRadius: "50%",
        background: "#60a5fa",
        opacity: 0.5 + Math.sin(frame * 0.25) * 0.45,
        boxShadow: `0 0 ${3 + Math.sin(frame * 0.25) * 2}px #60a5fa`,
      }} />
      TC {formatTimecode(frame)}
    </div>
  );
};

export const AlloFlowTrailer: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: "#0f172a" }}>
      {/* Main scene sequence */}
      <Series>
        <Series.Sequence durationInFrames={150}>
          <BotIntro />
        </Series.Sequence>
        <Series.Sequence durationInFrames={210}>
          <Hook />
        </Series.Sequence>
        <Series.Sequence durationInFrames={300}>
          <Problem />
        </Series.Sequence>
        <Series.Sequence durationInFrames={240}>
          <SolutionReveal />
        </Series.Sequence>
        <Series.Sequence durationInFrames={625}>
          <FeatureShowcase />
        </Series.Sequence>
        <Series.Sequence durationInFrames={300}>
          <FeatureMontage />
        </Series.Sequence>
        <Series.Sequence durationInFrames={450}>
          <LiveSessions />
        </Series.Sequence>
        <Series.Sequence durationInFrames={255}>
          <Testimonial />
        </Series.Sequence>
        <Series.Sequence durationInFrames={550}>
          <ByTheNumbers />
        </Series.Sequence>
        <Series.Sequence durationInFrames={300}>
          <CallToAction />
        </Series.Sequence>
      </Series>

      {/* Geometric wipe transitions */}
      {transitions.map((t, i) => (
        <Sequence key={`wipe-${i}`} from={t.frame} durationInFrames={22}>
          <GeometricWipe color={t.color} durationInFrames={22} direction="center" />
        </Sequence>
      ))}

      {/* Light streaks */}
      {lightStreaks.map((ls, i) => (
        <Sequence key={`streak-${i}`} from={ls.frame} durationInFrames={45}>
          <LightStreak
            color={ls.color}
            angle={ls.angle}
            width={ls.width ?? 120}
          />
        </Sequence>
      ))}

      {/* Persistent overlays */}
      <Watermark />
      <ProgressDots />
      <AnimatedBorder />
      {SHOW_EDITOR_CHROME && <MasterTimeline />}
      {SHOW_EDITOR_CHROME && <TimecodeOverlay />}

      {/* Cinematic overlays */}
      <Vignette />
      <Scanlines opacity={0.025} />
      <FilmGrain opacity={0.035} />
      <Letterbox height={40} />
    </AbsoluteFill>
  );
};
