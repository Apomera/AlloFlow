import { useCurrentFrame, useVideoConfig, interpolate, spring } from "remotion";

interface AlloBotProps {
  size?: number;
  enterDelay?: number;
  style?: React.CSSProperties;
}

export const AlloBot: React.FC<AlloBotProps> = ({ size = 200, enterDelay = 0, style }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const f = frame - enterDelay;

  // Entrance animation
  const enterScale = f < 0 ? 0 : spring({ frame: f, fps, config: { damping: 10, stiffness: 100, mass: 0.8 } });
  const enterOpacity = interpolate(f, [0, 10], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // Floating hover
  const hoverY = f > 0 ? Math.sin((f / fps) * 2 * Math.PI * 0.5) * 6 : 0;

  // Eye blink — blink every ~2.5 seconds for 3 frames
  const blinkCycle = f % 75;
  const eyeScaleY = blinkCycle >= 70 && blinkCycle <= 73 ? 0.1 : 1;

  // Subtle eye tracking — eyes occasionally glance left/right
  const eyeOffsetX = Math.sin(f * 0.025) * 1.2 + Math.sin(f * 0.07) * 0.4;

  // Flame flicker
  const flameScale = 1 + Math.sin(f * 1.5) * 0.08;
  const flameOpacity = 0.85 + Math.sin(f * 2) * 0.15;

  // Antenna signal wave (loops every 60 frames)
  const waveCycle = f % 60;
  const wave1R = interpolate(waveCycle, [0, 60], [5, 25]);
  const wave1Opacity = interpolate(waveCycle, [0, 60], [1, 0]);
  const wave2Cycle = (f + 30) % 60;
  const wave2R = interpolate(wave2Cycle, [0, 60], [5, 25]);
  const wave2Opacity = interpolate(wave2Cycle, [0, 60], [1, 0]);

  // Glow pulse
  const glowRadius = 42 + Math.sin((f / fps) * Math.PI * 0.67) * 4;
  const glowOpacity = 0.15 + Math.sin((f / fps) * Math.PI * 0.67) * 0.1;

  // Antenna tip ping
  const pingCycle = f % 45;
  const pingScale = interpolate(pingCycle, [0, 45], [1, 2.5]);
  const pingOpacity = interpolate(pingCycle, [0, 45], [0.8, 0]);

  // Hand float
  const leftHandY = Math.sin((f / fps) * Math.PI * 0.67) * 3;
  const rightHandY = Math.sin((f / fps) * Math.PI * 0.57 + 1) * 3;

  return (
    <div
      style={{
        width: size,
        height: size,
        transform: `scale(${enterScale}) translateY(${hoverY}px)`,
        opacity: enterOpacity,
        ...style,
      }}
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <radialGradient id="bodyGrad" cx="35%" cy="35%" r="65%" fx="30%" fy="30%">
            <stop offset="0%" stopColor="#8b5cf6" />
            <stop offset="100%" stopColor="#5b21b6" />
          </radialGradient>
          <radialGradient id="rimLight" cx="70%" cy="70%" r="70%">
            <stop offset="82%" stopColor="#ffffff" stopOpacity="0" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0.4" />
          </radialGradient>
          <linearGradient id="visorRef" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Floor shadow — soft oval beneath bot */}
        <ellipse
          cx="50"
          cy="96"
          rx={22 - Math.sin(f * 0.1) * 1.5}
          ry="2.5"
          fill="rgba(0,0,0,0.35)"
          opacity={0.6 - Math.sin(f * 0.1) * 0.1}
        />

        {/* Aura Glow */}
        <circle cx="50" cy="50" r={glowRadius} fill="#7c3aed" fillOpacity={glowOpacity} />

        {/* Breathing ring with rotating dashes */}
        <circle
          cx="50"
          cy="55"
          r={38 + Math.sin(f * 0.05) * 2}
          fill="none"
          stroke="#818CF8"
          strokeWidth="0.5"
          opacity={0.15 + Math.sin(f * 0.06) * 0.08}
          strokeDasharray="4,8"
          strokeDashoffset={-f * 0.3}
        />

        {/* Jetpack Base */}
        <rect x="25" y="42" width="50" height="8" rx="2" fill="#475569" />
        <circle cx="50" cy="46" r="6" fill="#06B6D4" stroke="#475569" strokeWidth="2" />
        <circle cx="50" cy="46" r="3" fill="#67E8F9" opacity={0.6 + Math.sin(f * 0.15) * 0.4} />

        {/* Jetpack Left */}
        <path d="M10 36 A10 6 0 0 1 30 36 V 68 L 27 76 H 13 L 10 68 Z" fill="#64748b" stroke="#475569" strokeWidth="2" />
        <path d="M10 46 H30 M10 60 H30" stroke="#475569" strokeWidth="1" fill="none" opacity="0.6" />

        {/* Jetpack Right */}
        <path d="M70 36 A10 6 0 0 1 90 36 V 68 L 87 76 H 73 L 70 68 Z" fill="#64748b" stroke="#475569" strokeWidth="2" />
        <path d="M70 46 H90 M70 60 H90" stroke="#475569" strokeWidth="1" fill="none" opacity="0.6" />

        {/* Flames */}
        <g transform={`scale(1, ${flameScale})`} style={{ transformOrigin: "50% 78px" }} opacity={flameOpacity}>
          <path d="M14 78 Q20 100 26 78 Z" fill="#F59E0B" />
          <path d="M17 78 Q20 90 23 78 Z" fill="#FEF3C7" />
          <path d="M74 78 Q80 100 86 78 Z" fill="#F59E0B" />
          <path d="M77 78 Q80 90 83 78 Z" fill="#FEF3C7" />
        </g>

        {/* Smoke wisps rising from flames */}
        {f > 0 && [
          { baseX: 20 },
          { baseX: 80 },
        ].map((jet, ji) =>
          [0, 1, 2, 3].map((si) => {
            const smokePeriod = 30 + si * 7;
            const smokeF = (f + si * 8 + ji * 5) % smokePeriod;
            const sy = 95 + smokeF * 1.8;
            const sx = jet.baseX + Math.sin(f * 0.15 + si * 2 + ji * 3) * (2 + smokeF * 0.15);
            const sOp = interpolate(smokeF, [0, 4, 20, smokePeriod], [0, 0.25, 0.1, 0]);
            const sR = 1.5 + smokeF * 0.15;
            return (
              <circle
                key={`smoke-${ji}-${si}`}
                cx={sx}
                cy={sy}
                r={sR}
                fill="#94a3b8"
                opacity={sOp * flameOpacity * 0.6}
              />
            );
          }),
        )}

        {/* Jetpack ember particles */}
        {f > 0 && [
          { baseX: 20, baseY: 92 },
          { baseX: 80, baseY: 92 },
        ].map((jet, ji) =>
          [0, 1, 2].map((ei) => {
            const period = 18 + ei * 5;
            const emberF = (f + ei * 6 + ji * 9) % period;
            const ey = jet.baseY + emberF * 0.8;
            const ex = jet.baseX + Math.sin(f * 0.3 + ei * 2 + ji * 4) * 3;
            const eOp = interpolate(emberF, [0, 3, period], [0, 0.8, 0]);
            return (
              <circle
                key={`ember-${ji}-${ei}`}
                cx={ex}
                cy={ey}
                r={1.2 - emberF * 0.04}
                fill={ei === 0 ? "#FEF3C7" : "#F59E0B"}
                opacity={eOp * flameOpacity}
              />
            );
          }),
        )}

        {/* Antenna with subtle wobble */}
        <path
          d={`M50 15 Q${50 + Math.sin(f * 0.05) * 0.7} 10 ${50 + Math.sin(f * 0.05) * 1.5} 5`}
          stroke="#818CF8"
          strokeWidth="4"
          strokeLinecap="round"
          fill="none"
        />

        {/* Antenna signal waves — track antenna tip */}
        <circle cx={50 + Math.sin(f * 0.05) * 1.5} cy="5" r={wave1R} stroke="#818CF8" strokeWidth={interpolate(wave1Opacity, [0, 1], [0, 2])} fill="none" opacity={wave1Opacity} />
        <circle cx={50 + Math.sin(f * 0.05) * 1.5} cy="5" r={wave2R} stroke="#818CF8" strokeWidth={interpolate(wave2Opacity, [0, 1], [0, 2])} fill="none" opacity={wave2Opacity} />

        {/* Antenna tip + ping — also wobbles */}
        <circle cx={50 + Math.sin(f * 0.05) * 1.5} cy="5" r={5 * pingScale} fill="#FACC15" opacity={pingOpacity} />
        <circle cx={50 + Math.sin(f * 0.05) * 1.5} cy="5" r="5" fill="#FACC15" />

        {/* Body — subtle in-place breath, tied to the breathing ring's rhythm */}
        <circle cx="50" cy="55" r={35 + Math.sin(f * 0.05) * 0.5} fill="url(#bodyGrad)" />
        <circle cx="50" cy="55" r={35 + Math.sin(f * 0.05) * 0.5} fill="url(#rimLight)" />

        {/* Visor */}
        <rect x="20" y="30" width="60" height="36" rx="14" fill="#0F172A" />
        <path d="M 23 38 Q 22 32 36 32 L 68 32 Q 74 32 76 36" fill="none" stroke="url(#visorRef)" strokeWidth="3" strokeLinecap="round" opacity={0.7 + Math.sin(f * 0.05) * 0.2} />
        <rect x="20" y="30" width="60" height="36" rx="14" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="2" />

        {/* Hands with subtle scale breath */}
        <circle cx="10" cy={65 + leftHandY} r={6.5 + Math.sin(f * 0.07) * 0.3} fill="#7c3aed" stroke="#5b21b6" strokeWidth="1.5" />
        <circle cx="90" cy={65 + rightHandY} r={6.5 + Math.sin(f * 0.07 + Math.PI) * 0.3} fill="#7c3aed" stroke="#5b21b6" strokeWidth="1.5" />

        {/* Eyes — with subtle horizontal tracking */}
        <g transform={`translate(${eyeOffsetX},0) scale(1, ${eyeScaleY})`} style={{ transformOrigin: "50px 48px" }}>
          <ellipse cx="38" cy="48" rx="4.5" ry="6" fill="#10B981" />
          <ellipse cx="40" cy="46" rx="2.5" ry="2.5" fill="#ffffff" opacity={0.7 + Math.sin(f * 0.09) * 0.2} />
          <ellipse cx="62" cy="48" rx="4.5" ry="6" fill="#10B981" />
          <ellipse cx="64" cy="46" rx="2.5" ry="2.5" fill="#ffffff" opacity={0.7 + Math.sin(f * 0.09 + Math.PI / 3) * 0.2} />
          {/* Occasional eye glint sweep — every ~135 frames */}
          {f % 135 < 12 && (
            <>
              <rect
                x={35 + (f % 135) * 0.6}
                y="43"
                width="1.5"
                height="10"
                fill="#ffffff"
                opacity={interpolate(f % 135, [0, 3, 9, 12], [0, 0.9, 0.9, 0])}
                transform={`rotate(-20 ${35 + (f % 135) * 0.6} 48)`}
              />
              <rect
                x={59 + (f % 135) * 0.6}
                y="43"
                width="1.5"
                height="10"
                fill="#ffffff"
                opacity={interpolate(f % 135, [0, 3, 9, 12], [0, 0.9, 0.9, 0])}
                transform={`rotate(-20 ${59 + (f % 135) * 0.6} 48)`}
              />
            </>
          )}
        </g>

        {/* Mouth — subtle smile variation that gently breathes */}
        <path
          d={`M 42 58 Q 50 ${62 + Math.sin(f * 0.04) * 0.8} 58 58`}
          stroke="#34D399"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />

        {/* Periodic 'thinking' indicator — three dots that fade in cascade every ~180 frames */}
        {f > 0 && (() => {
          const thinkCycle = f % 180;
          if (thinkCycle > 40) return null;
          return (
            <g transform="translate(70, 20)">
              {[0, 1, 2].map((di) => {
                const dotOp = interpolate(thinkCycle, [di * 6, di * 6 + 4, 30, 40], [0, 1, 0.6, 0], {
                  extrapolateLeft: "clamp",
                  extrapolateRight: "clamp",
                });
                return (
                  <circle
                    key={di}
                    cx={di * 5}
                    cy={0}
                    r={1.5}
                    fill="#FACC15"
                    opacity={dotOp}
                  />
                );
              })}
            </g>
          );
        })()}
      </svg>
    </div>
  );
};
