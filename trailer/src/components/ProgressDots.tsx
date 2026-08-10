import { useCurrentFrame, interpolate } from "remotion";

const sceneTimings = [
  { start: 0, end: 150, label: "Intro" },
  { start: 150, end: 360, label: "Hook" },
  { start: 360, end: 660, label: "Problem" },
  { start: 660, end: 900, label: "Solution" },
  { start: 900, end: 1825, label: "Features" },
  { start: 1825, end: 2080, label: "Quote" },
  { start: 2080, end: 2630, label: "Numbers" },
  { start: 2630, end: 2930, label: "CTA" },
];

export const ProgressDots: React.FC = () => {
  const frame = useCurrentFrame();

  // Only show after BotIntro
  const opacity = interpolate(frame, [130, 155], [0, 0.7], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Fade out at end
  const fadeOut = interpolate(frame, [2880, 2930], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const currentScene = sceneTimings.findIndex(
    (s) => frame >= s.start && frame < s.end,
  );

  const currentSceneLabel = currentScene >= 0 ? sceneTimings[currentScene].label : "";

  return (
    <>
      {/* Current scene name label above dots */}
      <div
        style={{
          position: "absolute",
          bottom: 48,
          left: "50%",
          transform: "translateX(-50%)",
          fontSize: 9,
          fontFamily: "monospace",
          color: "#60a5fa",
          letterSpacing: "0.3em",
          fontWeight: 700,
          opacity: opacity * fadeOut * (0.45 + Math.sin(frame * 0.05) * 0.15),
          zIndex: 50,
          textTransform: "uppercase",
          textShadow: `0 0 ${4 + Math.sin(frame * 0.05) * 2}px rgba(96,165,250,0.3)`,
        }}
      >
        {currentSceneLabel}
      </div>
    <div
      style={{
        position: "absolute",
        bottom: 30,
        left: "50%",
        transform: "translateX(-50%)",
        display: "flex",
        gap: 0,
        zIndex: 50,
        opacity: opacity * fadeOut,
        alignItems: "center",
      }}
    >
      {sceneTimings.map((scene, i) => {
        const isActive = i === currentScene;
        const isPast = i < currentScene;

        const sceneProgress =
          isActive
            ? interpolate(frame, [scene.start, scene.end], [0, 1], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
              })
            : isPast
              ? 1
              : 0;

        return (
          <div key={i} style={{ position: "relative", display: "flex", alignItems: "center" }}>
            <div
              style={{
                width: isActive ? 28 : 7,
                height: 7,
                borderRadius: 4,
                background: "rgba(255,255,255,0.1)",
                overflow: "hidden",
                transform: isActive ? `scaleY(${1 + Math.sin(frame * 0.12) * 0.15})` : undefined,
              }}
            >
              <div
                style={{
                  width: `${sceneProgress * 100}%`,
                  height: "100%",
                  borderRadius: 4,
                  background: isActive
                    ? "linear-gradient(90deg, #60a5fa, #34d399)"
                    : isPast
                      ? "rgba(255,255,255,0.4)"
                      : "transparent",
                  boxShadow: isActive ? "0 0 8px rgba(96,165,250,0.5)" : undefined,
                }}
              />
            </div>
            {/* Connecting line between dots */}
            {i < sceneTimings.length - 1 && (
              <div
                style={{
                  width: 8,
                  height: 1,
                  background: isPast
                    ? `rgba(255,255,255,${0.18 + Math.sin(frame * 0.05 + i * 0.7) * 0.06})`
                    : isActive
                      ? `linear-gradient(90deg, rgba(96,165,250,${0.3 + Math.sin(frame * 0.15) * 0.15}), rgba(52,211,153,0.1))`
                      : "rgba(255,255,255,0.05)",
                  flexShrink: 0,
                }}
              />
            )}
          </div>
        );
      })}
    </div>
    </>
  );
};
