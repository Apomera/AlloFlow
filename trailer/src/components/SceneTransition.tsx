import { AbsoluteFill, useCurrentFrame, interpolate } from "remotion";

interface SceneTransitionProps {
  durationInFrames: number;
  children: React.ReactNode;
  fadeIn?: number;
  fadeOut?: number;
}

export const SceneTransition: React.FC<SceneTransitionProps> = ({
  durationInFrames,
  children,
  fadeIn = 12,
  fadeOut = 12,
}) => {
  const frame = useCurrentFrame();

  const enterOpacity = interpolate(frame, [0, fadeIn], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const exitOpacity = interpolate(
    frame,
    [durationInFrames - fadeOut, durationInFrames],
    [1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  // Subtle cinematic scale — push-in on entry, push-out on exit
  const enterScale = interpolate(frame, [0, fadeIn], [1.015, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const exitScale = interpolate(
    frame,
    [durationInFrames - fadeOut, durationInFrames],
    [1, 0.99],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  return (
    <AbsoluteFill
      style={{
        opacity: enterOpacity * exitOpacity,
        transform: `scale(${enterScale * exitScale})`,
      }}
    >
      {children}
    </AbsoluteFill>
  );
};
