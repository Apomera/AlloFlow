// @section SPEECH_BUBBLE — Allobot speech bubble component
// This component is exported independently of AlloBot, so its essential visual
// treatment cannot depend on a host Tailwind build being present.
const ALLOBOT_BUBBLE_CSS = `
  .allobot-speech-bubble {
      --allobot-bubble-bg: #FFFFFF;
      --allobot-bubble-text: #312E81;
      --allobot-bubble-border: #E0E7FF;
      --allobot-bubble-accent: #4338CA;
      --allobot-bubble-shadow: 0 12px 28px rgba(15, 23, 42, 0.18);
      position: absolute;
      box-sizing: border-box;
      z-index: 50;
      width: max-content;
      max-width: min(200px, calc(100vw - 24px));
      padding: 12px 16px;
      border: 1px solid var(--allobot-bubble-border);
      border-radius: 16px;
      background: var(--allobot-bubble-bg);
      color: var(--allobot-bubble-text);
      box-shadow: var(--allobot-bubble-shadow);
      font-size: 12px;
      font-weight: 700;
      line-height: 1.45;
      overflow-wrap: anywhere;
      pointer-events: none;
      opacity: 0;
      transform: translateY(8px) scale(0.95);
      transition: opacity 300ms ease-out, transform 300ms ease-out;
  }
  .allobot-speech-bubble[data-allobot-bubble-theme="dark"] {
      --allobot-bubble-bg: #0F172A;
      --allobot-bubble-text: #F8FAFC;
      --allobot-bubble-border: #64748B;
      --allobot-bubble-accent: #C7D2FE;
      --allobot-bubble-shadow: 0 14px 32px rgba(0, 0, 0, 0.48), 0 0 0 1px rgba(255, 255, 255, 0.08);
  }
  .allobot-speech-bubble[data-allobot-bubble-theme="contrast"] {
      --allobot-bubble-bg: #FFFFFF;
      --allobot-bubble-text: #000000;
      --allobot-bubble-border: #000000;
      --allobot-bubble-accent: #000000;
      --allobot-bubble-shadow: 4px 4px 0 #000000;
      border-width: 2px;
  }
  .allobot-speech-bubble[data-allobot-bubble="thought"] { border-radius: 32px; }
  .allobot-speech-bubble[data-allobot-bubble-state="visible"] {
      opacity: 1;
      transform: translateY(0) scale(1);
  }
  .allobot-speech-bubble[data-allobot-bubble-motion="static"] { transition: none; }
  .allobot-speech-bubble[data-allobot-bubble-placement="top-right"] {
      inset: auto 0 100% auto;
      margin: 0 0 16px;
      transform-origin: bottom right;
  }
  .allobot-speech-bubble[data-allobot-bubble-placement="top-left"] {
      inset: auto auto 100% 0;
      margin: 0 0 16px;
      transform-origin: bottom left;
  }
  .allobot-speech-bubble[data-allobot-bubble-placement="bottom-right"] {
      inset: 100% 0 auto auto;
      margin: 16px 0 0;
      transform-origin: top right;
  }
  .allobot-speech-bubble[data-allobot-bubble-placement="bottom-left"] {
      inset: 100% auto auto 0;
      margin: 16px 0 0;
      transform-origin: top left;
  }
  .allobot-speech-bubble[data-allobot-bubble="thought"][data-allobot-bubble-placement="top-right"] {
      right: 48px;
      margin-bottom: 4px;
  }
  .allobot-speech-bubble[data-allobot-bubble="thought"][data-allobot-bubble-placement="top-left"] {
      left: 48px;
      margin-bottom: 4px;
  }
  .allobot-bubble-live {
      position: absolute !important;
      width: 1px !important;
      height: 1px !important;
      padding: 0 !important;
      margin: -1px !important;
      overflow: hidden !important;
      clip: rect(0, 0, 0, 0) !important;
      white-space: nowrap !important;
      border: 0 !important;
  }
  .allobot-bubble-text { display: block; }
  .allobot-bubble-read-more {
      display: inline-flex;
      min-height: 24px;
      align-items: center;
      margin-top: 4px;
      padding: 0 4px;
      border: 0;
      border-radius: 4px;
      background: transparent;
      color: var(--allobot-bubble-accent);
      font-size: 11px;
      font-weight: 900;
      text-decoration: underline;
      cursor: pointer;
      pointer-events: auto;
  }
  .allobot-bubble-read-more:focus-visible {
      outline: 2px solid var(--allobot-bubble-accent);
      outline-offset: 2px;
  }
  .allobot-speech-arrow {
      position: absolute;
      width: 0;
      height: 0;
      border-left: 6px solid transparent;
      border-right: 6px solid transparent;
  }
  .allobot-speech-arrow[data-allobot-speech-arrow="top-right"],
  .allobot-speech-arrow[data-allobot-speech-arrow="top-left"] {
      top: 100%;
      border-top: 8px solid var(--allobot-bubble-bg);
      border-bottom: 0;
      filter: drop-shadow(0 1px 0 var(--allobot-bubble-border));
  }
  .allobot-speech-arrow[data-allobot-speech-arrow="bottom-right"],
  .allobot-speech-arrow[data-allobot-speech-arrow="bottom-left"] {
      bottom: 100%;
      border-top: 0;
      border-bottom: 8px solid var(--allobot-bubble-bg);
      filter: drop-shadow(0 -1px 0 var(--allobot-bubble-border));
  }
  .allobot-speech-arrow[data-allobot-speech-arrow$="right"] { right: 24px; }
  .allobot-speech-arrow[data-allobot-speech-arrow$="left"] { left: 24px; }
  .allobot-thought-dot {
      position: absolute;
      box-sizing: border-box;
      border: 1px solid var(--allobot-bubble-border);
      border-radius: 9999px;
      background: var(--allobot-bubble-bg);
  }
  .allobot-thought-dot[data-allobot-thought-dot="large"] { width: 12px; height: 12px; }
  .allobot-thought-dot[data-allobot-thought-dot="small"] { width: 6px; height: 6px; }
  .allobot-speech-bubble[data-allobot-bubble-placement^="top"] .allobot-thought-dot[data-allobot-thought-dot="large"] { bottom: -16px; }
  .allobot-speech-bubble[data-allobot-bubble-placement^="top"] .allobot-thought-dot[data-allobot-thought-dot="small"] { bottom: -28px; }
  .allobot-speech-bubble[data-allobot-bubble-placement^="bottom"] .allobot-thought-dot[data-allobot-thought-dot="large"] { top: -16px; }
  .allobot-speech-bubble[data-allobot-bubble-placement^="bottom"] .allobot-thought-dot[data-allobot-thought-dot="small"] { top: -28px; }
  .allobot-speech-bubble[data-allobot-bubble-placement$="right"] .allobot-thought-dot[data-allobot-thought-dot="large"] { right: 32px; }
  .allobot-speech-bubble[data-allobot-bubble-placement$="right"] .allobot-thought-dot[data-allobot-thought-dot="small"] { right: 20px; }
  .allobot-speech-bubble[data-allobot-bubble-placement$="left"] .allobot-thought-dot[data-allobot-thought-dot="large"] { left: 32px; }
  .allobot-speech-bubble[data-allobot-bubble-placement$="left"] .allobot-thought-dot[data-allobot-thought-dot="small"] { left: 20px; }
`;
const SpeechBubble = React.memo(({ text, isVisible, isTruncated, onReadMore, onTyping, soundEnabled, variant = 'speech', disableAnimations = false, theme = 'light' }) => {
  const { t } = useContext(LanguageContext);
  const bubbleRef = useRef(null);
  const [placement, setPlacement] = useState('top-right');
  const [displayedText, setDisplayedText] = useState('');
  useEffect(() => {
      if (!isVisible || !text) {
          setDisplayedText('');
          if (onTyping) onTyping(false);
          return;
      }
      setDisplayedText('');
      if (onTyping) onTyping(true);
      const chars = Array.from(text);
      if (disableAnimations) {
          setDisplayedText(text);
          if (onTyping) onTyping(false);
          return;
      }
      let i = 0;
      const speed = 30;
      const timer = setInterval(() => {
          if (i < chars.length) {
              const char = chars[i];
              setDisplayedText((prev) => prev + char);
              if (soundEnabled && i % 3 === 0 && !isGlobalMuted()) {
                  try {
                      const ctx = getGlobalAudioContext();
                      if (ctx) {
                          if (ctx.state === 'suspended') {
                              ctx.resume();
                          }
                          const osc = ctx.createOscillator();
                          const gain = ctx.createGain();
                          osc.connect(gain);
                          gain.connect(ctx.destination);
                          osc.type = 'triangle';
                          osc.frequency.value = 400 + (Math.random() * 150);
                          gain.gain.setValueAtTime(0.02, ctx.currentTime);
                          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);
                          osc.start();
                          osc.stop(ctx.currentTime + 0.05);
                      }
                  } catch(e) { warnLog('Caught error:', e?.message || e); }
              }
              i++;
          } else {
              clearInterval(timer);
              if (onTyping) onTyping(false);
          }
      }, speed);
      return () => {
          clearInterval(timer);
      };
  }, [text, isVisible, onTyping, soundEnabled, disableAnimations]);
  React.useLayoutEffect(() => {
    if (!isVisible || !bubbleRef.current) return;
    const rect = bubbleRef.current.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    let newVert = 'top';
    let newHoriz = variant === 'thought' ? 'left' : 'right';
    if (rect.top < 10) {
        newVert = 'bottom';
    }
    if (newHoriz === 'right') {
        if (rect.left < 10) newHoriz = 'left';
    } else {
        if (rect.right > viewportWidth - 10) newHoriz = 'right';
    }
    setPlacement(`${newVert}-${newHoriz}`);
  }, [isVisible, text, variant]);
  const posClasses = {
      'top-right': `bottom-full right-0 ${variant === 'thought' ? 'mb-1 me-12' : 'mb-4'} origin-bottom-right`,
      'top-left': `bottom-full left-0 ${variant === 'thought' ? 'mb-1 ms-12' : 'mb-4'} origin-bottom-left`,
      'bottom-right': 'top-full right-0 mt-4 origin-top-right',
      'bottom-left': 'top-full left-0 mt-4 origin-top-left',
  };
  const arrowClasses = {
      'top-right': 'top-full right-6 border-t-[8px] border-x-[6px] border-b-0 border-t-white border-x-transparent',
      'top-left': 'top-full left-6 border-t-[8px] border-x-[6px] border-b-0 border-t-white border-x-transparent',
      'bottom-right': 'bottom-full right-6 border-b-[8px] border-x-[6px] border-t-0 border-b-white border-x-transparent',
      'bottom-left': 'bottom-full left-6 border-b-[8px] border-x-[6px] border-t-0 border-b-white border-x-transparent',
  };
  const renderThoughtTrail = () => {
      return (
          <>
            <div data-allobot-thought-dot="large" className="allobot-thought-dot"></div>
            <div data-allobot-thought-dot="small" className="allobot-thought-dot"></div>
          </>
      );
  };
  return (
    <>
    <style>{ALLOBOT_BUBBLE_CSS}</style>
    <div
        ref={bubbleRef}
        data-allobot-bubble={variant}
        data-allobot-bubble-theme={theme}
        data-allobot-bubble-placement={placement}
        data-allobot-bubble-state={isVisible ? 'visible' : 'hidden'}
        data-allobot-bubble-motion={disableAnimations ? 'static' : 'animated'}
        className={`
            allobot-speech-bubble absolute ${posClasses[placement]}
            bg-white text-indigo-900 text-xs font-bold px-4 py-3
            shadow-xl border border-indigo-100
            transition-all motion-reduce:transition-none duration-300 ease-out
            w-max max-w-[200px] z-50 pointer-events-none
            ${variant === 'thought' ? 'rounded-[2rem]' : 'rounded-2xl'}
            ${isVisible ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 translate-y-2'}
        `}
    >
        <span role="status" aria-live="polite" aria-atomic="true" className="sr-only allobot-bubble-live">{isVisible ? text : ''}</span>
        <span aria-hidden="true" className="allobot-bubble-text">{displayedText}</span>
        {isVisible && isTruncated && displayedText.length === text?.length && (
            <button
                type="button"
                onClick={(e) => {
                    e.stopPropagation();
                    if (onReadMore) onReadMore();
                }}
                className="allobot-bubble-read-more mt-1 inline-flex min-h-6 items-center px-1 text-[11px] font-black text-indigo-700 hover:text-indigo-900 underline cursor-pointer pointer-events-auto focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-700"
            >
                {t('common.read_more')}
            </button>
        )}
        {variant === 'speech' ? (
             <div data-allobot-speech-arrow={placement} className={`allobot-speech-arrow absolute w-0 h-0 ${arrowClasses[placement]}`}></div>
        ) : (
             renderThoughtTrail()
        )}
    </div>
    </>
  );
});

// Exported motion effects must remain visually complete when they are rendered
// outside AlloBot's large internal style block (for example in previews).
const ALLOBOT_EFFECTS_CSS = `
  .allobot-effect-layer {
      pointer-events: none;
      user-select: none;
  }
  .allobot-landing-dust {
      position: absolute;
      left: 50%;
      bottom: -8px;
      z-index: -1;
      width: 96px;
      height: 48px;
      overflow: visible;
      transform: translateX(-50%);
  }
  .allobot-dust-cloud {
      position: absolute;
      left: 50%;
      border-radius: 9999px;
      will-change: transform, opacity;
  }
  .allobot-dust-cloud[data-allobot-dust-cloud="left"],
  .allobot-dust-cloud[data-allobot-dust-cloud="right"] {
      bottom: 8px;
      width: 32px;
      height: 32px;
      margin-left: -16px;
      background: radial-gradient(circle, rgba(203, 213, 225, 0.72) 0%, rgba(226, 232, 240, 0.42) 48%, rgba(248, 250, 252, 0) 74%);
      filter: blur(5px);
  }
  .allobot-dust-cloud[data-allobot-dust-cloud="left"] {
      animation: allobot-effect-dust-left 0.6s ease-out forwards;
  }
  .allobot-dust-cloud[data-allobot-dust-cloud="right"] {
      animation: allobot-effect-dust-right 0.6s ease-out forwards;
  }
  .allobot-dust-cloud[data-allobot-dust-cloud="puff"] {
      bottom: 4px;
      width: 24px;
      height: 24px;
      margin-left: -12px;
      background: radial-gradient(circle, rgba(255, 255, 255, 0.92) 0%, rgba(226, 232, 240, 0.52) 55%, rgba(255, 255, 255, 0) 76%);
      filter: blur(3px);
      animation: allobot-effect-dust-puff 0.8s ease-out forwards;
  }
  @keyframes allobot-effect-dust-left {
      0% { transform: translateX(0) scale(0.5); opacity: 0.68; }
      100% { transform: translateX(-32px) translateY(-6px) scale(1.55); opacity: 0; }
  }
  @keyframes allobot-effect-dust-right {
      0% { transform: translateX(0) scale(0.5); opacity: 0.68; }
      100% { transform: translateX(32px) translateY(-6px) scale(1.55); opacity: 0; }
  }
  @keyframes allobot-effect-dust-puff {
      0% { transform: translateY(0) scale(0.45); opacity: 0.9; }
      100% { transform: translateY(-16px) scale(2.1); opacity: 0; }
  }
  .allobot-jetpack-particles {
      position: absolute;
      inset: 0;
      z-index: 0;
      overflow: visible;
  }
  .allobot-jetpack-particle {
      position: absolute;
      width: 12px;
      height: 12px;
      border-radius: 9999px;
      background: #F59E0B;
      box-shadow: 0 0 7px rgba(251, 191, 36, 0.75);
      filter: blur(2px);
      animation-name: allobot-effect-jetpack-smoke;
      animation-timing-function: ease-out;
      animation-fill-mode: forwards;
      will-change: transform, opacity, filter;
  }
  @keyframes allobot-effect-jetpack-smoke {
      0% {
          transform: translate(0, 0) scale(0.45);
          background: #F59E0B;
          box-shadow: 0 0 8px rgba(251, 191, 36, 0.82);
          filter: blur(1px);
          opacity: 0.95;
      }
      38% {
          background: #FBBF24;
          box-shadow: 0 0 4px rgba(251, 191, 36, 0.42);
          opacity: 0.72;
      }
      100% {
          transform: translate(var(--drift), 100px) scale(2.5);
          background: #E2E8F0;
          box-shadow: none;
          filter: blur(5px);
          opacity: 0;
      }
  }
  .allobot-reaction-bubble {
      position: absolute;
      top: -4px;
      right: 50%;
      z-index: 50;
      display: grid;
      place-items: center;
      width: 48px;
      height: 48px;
      border: 2px solid rgba(129, 140, 248, 0.68);
      border-radius: 9999px;
      background: radial-gradient(circle at 34% 24%, rgba(255, 255, 255, 0.99), rgba(238, 242, 255, 0.95) 62%, rgba(199, 210, 254, 0.92));
      box-shadow: 0 8px 18px rgba(49, 46, 129, 0.24), inset 0 1px 0 rgba(255, 255, 255, 0.95);
      font-size: 34px;
      line-height: 1;
      isolation: isolate;
      filter: saturate(1.08);
      animation: allobot-effect-float-reaction 1.5s ease-out forwards;
      will-change: transform, opacity;
  }
  .allobot-reaction-bubble::before {
      content: '';
      position: absolute;
      inset: -7px;
      z-index: -1;
      border-radius: inherit;
      background: radial-gradient(circle, rgba(165, 180, 252, 0.38), rgba(165, 180, 252, 0));
  }
  .allobot-reaction-bubble::after {
      content: '';
      position: absolute;
      top: 6px;
      right: 8px;
      width: 7px;
      height: 7px;
      border-radius: 9999px;
      background: rgba(255, 255, 255, 0.94);
      box-shadow: 0 0 5px rgba(255, 255, 255, 0.8);
  }
  @keyframes allobot-effect-float-reaction {
      0% { transform: translate(50%, 0) scale(0.5) rotate(-5deg); opacity: 0; }
      18% { transform: translate(50%, -30px) scale(1.14) rotate(4deg); opacity: 1; }
      38% { transform: translate(50%, -42px) scale(1) rotate(-2deg); opacity: 1; }
      100% { transform: translate(50%, -104px) scale(0.92) rotate(3deg); opacity: 0; }
  }
  .allobot-confetti-burst {
      position: absolute;
      top: 50%;
      left: 50%;
      z-index: -1;
      width: 0;
      height: 0;
      overflow: visible;
  }
  .allobot-confetti-burst::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      width: 16px;
      height: 16px;
      border: 3px solid rgba(129, 140, 248, 0.72);
      border-radius: 9999px;
      animation: allobot-effect-confetti-ring 0.55s ease-out forwards;
  }
  .allobot-confetti-particle {
      position: absolute;
      top: 0;
      left: 0;
      animation: allobot-effect-confetti 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards;
      will-change: transform, opacity;
  }
  .allobot-confetti-particle[data-allobot-confetti-shape="round"] { border-radius: 9999px; }
  .allobot-confetti-particle[data-allobot-confetti-shape="square"] { border-radius: 2px; }
  .allobot-confetti-particle[data-allobot-confetti-shape="dash"] { border-radius: 9999px; }
  @keyframes allobot-effect-confetti-ring {
      0% { transform: translate(-50%, -50%) scale(0.2); opacity: 0.9; }
      100% { transform: translate(-50%, -50%) scale(4.5); opacity: 0; }
  }
  @keyframes allobot-effect-confetti {
      0% { transform: translate(-50%, -50%) scale(0.55) rotate(0deg); opacity: 1; }
      100% { transform: translate(calc(-50% + var(--tx)), calc(-50% + var(--ty))) scale(0.18) rotate(var(--spin)); opacity: 0; }
  }
  @media (prefers-reduced-motion: reduce) {
      .allobot-dust-cloud,
      .allobot-jetpack-particle,
      .allobot-reaction-bubble,
      .allobot-confetti-burst::before,
      .allobot-confetti-particle {
          animation-duration: 1ms !important;
          animation-delay: 0ms !important;
      }
  }
`;
const AlloEffectStyles = () => <style data-allobot-effect-styles="true">{ALLOBOT_EFFECTS_CSS}</style>;

const LandingDust = ({ active }) => {
  if (!active) return null;
  return (
      <>
      <AlloEffectStyles />
      <div aria-hidden="true" data-allobot-effect="landing-dust" className="allobot-effect-layer allobot-landing-dust">
           <div data-allobot-dust-cloud="left" className="allobot-dust-cloud" />
           <div data-allobot-dust-cloud="right" className="allobot-dust-cloud" />
           <div data-allobot-dust-cloud="puff" className="allobot-dust-cloud" />
      </div>
      </>
  );
};
const JetpackParticles = ({ active }) => {
  const [particles, setParticles] = useState([]);
  useEffect(() => {
    if (!active) return;
    const interval = setInterval(() => {
      const timestamp = Date.now();
      const speedL = 0.6 + Math.random() * 0.4;
      const speedR = 0.6 + Math.random() * 0.4;
      const driftL = (Math.random() - 0.5) * 30;
      const driftR = (Math.random() - 0.5) * 30;
      const newPair = [
          { id: `${timestamp}-L`, side: 'left', offset: Math.random() * 8 - 4, speed: speedL, drift: driftL },
          { id: `${timestamp}-R`, side: 'right', offset: Math.random() * 8 - 4, speed: speedR, drift: driftR }
      ];
      setParticles(prev => [...prev, ...newPair]);
    }, 25);
    return () => clearInterval(interval);
  }, [active]);
  useEffect(() => {
      if (particles.length > 80) {
          setParticles(prev => prev.slice(-50));
      }
      if (!active && particles.length > 0) {
          const timer = setTimeout(() => setParticles([]), 1500);
          return () => clearTimeout(timer);
      }
  }, [particles, active]);
  return (
    <>
    <AlloEffectStyles />
    <div
      aria-hidden="true"
      data-allobot-effect="jetpack-particles"
      data-allobot-effect-state={active ? 'active' : 'idle'}
      className="allobot-effect-layer allobot-jetpack-particles"
    >
        {particles.map(p => (
            <div
                key={p.id}
                data-allobot-jetpack-side={p.side}
                className="allobot-jetpack-particle"
                style={{
                    left: p.side === 'left' ? `calc(20% + ${p.offset}px)` : `calc(80% + ${p.offset}px)`,
                    top: '82%',
                    '--drift': `${p.drift}px`,
                    animationDuration: `${p.speed}s`
                }}
                onAnimationEnd={() => setParticles(prev => prev.filter(item => item.id !== p.id))}
            />
        ))}
    </div>
    </>
  );
};
const ReactionBubble = ({ emoji, onComplete }) => (
  <>
  <AlloEffectStyles />
  <div
    aria-hidden="true"
    data-allobot-effect="reaction-bubble"
    className="allobot-effect-layer allobot-reaction-bubble"
    onAnimationEnd={onComplete}
  >
    {emoji}
  </div>
  </>
);
const BotConfettiBurst = ({ onComplete }) => {
  const calledRef = useRef(false);
  const handleEnd = () => {
    if (!calledRef.current) {
      calledRef.current = true;
      if (onComplete) onComplete();
    }
  };
  const particles = React.useMemo(() => Array.from({ length: 24 }).map((_, i) => ({
      id: i,
      angle: (i * 15) + (Math.random() * 15),
      dist: 80 + Math.random() * 50,
      color: ['#FCD34D', '#F87171', '#60A5FA', '#34D399', '#A78BFA', '#F472B6'][Math.floor(Math.random() * 6)],
      size: 4 + Math.random() * 4,
      delay: Math.random() * 0.1,
      shape: ['round', 'square', 'dash'][i % 3],
      spin: (i % 2 === 0 ? 1 : -1) * (360 + Math.random() * 360)
  })), []);
  return (
      <>
      <AlloEffectStyles />
      <div aria-hidden="true" data-allobot-effect="confetti-burst" className="allobot-effect-layer allobot-confetti-burst">
          {particles.map((p, i) => (
             <div
                key={p.id}
                data-allobot-confetti-shape={p.shape}
                className="allobot-confetti-particle"
                style={{
                    backgroundColor: p.color,
                    width: p.shape === 'dash' ? p.size * 1.8 : p.size,
                    height: p.shape === 'dash' ? p.size * 0.58 : p.size,
                    '--tx': `${Math.cos(p.angle * Math.PI / 180) * p.dist}px`,
                    '--ty': `${Math.sin(p.angle * Math.PI / 180) * p.dist}px`,
                    '--spin': `${p.spin}deg`,
                    animationDelay: `${p.delay}s`
                }}
                onAnimationEnd={i === 0 ? handleEnd : undefined}
             />
          ))}
      </div>
      </>
  );
};
// ── A4: microphone input meter ──────────────────────────────────────────────
// Aaron: "There is no indication that the microphone is picking the user up."
// Five bars driven by the shared analyser in AlloCommands.micLevelMonitor. It
// subscribes rather than opening its own capture, so there is still exactly one
// microphone stream and one browser recording indicator.
//
// aria-hidden by design: a bar chart of instantaneous loudness is noise to a
// screen reader. The equivalent information for assistive tech is the labelled
// mic control and its live state announcement (A5), not this.
const MIC_METER_BARS = 5;
const AlloMicMeter = React.memo(({ active, motionDisabled, placement = 'below' }) => {
  const [level, setLevel] = useState(0);
  useEffect(() => {
      if (!active) { setLevel(0); return undefined; }
      const monitor = (window.AlloModules && window.AlloModules.AlloCommands && window.AlloModules.AlloCommands.micLevelMonitor) || window.__alloMicLevelMonitor || null;
      if (monitor && typeof monitor.subscribe === 'function') {
          return monitor.subscribe((detail) => setLevel(detail && typeof detail.value === 'number' ? detail.value : 0));
      }
      // Older host without the shared monitor: the window event is the fallback
      // contract, so a future publisher (dictation) needs no change here.
      const onLevel = (event) => {
          const value = event && event.detail && typeof event.detail.value === 'number' ? event.detail.value : 0;
          setLevel(value);
      };
      try { window.addEventListener('alloflow:mic-level', onLevel); } catch (_) { return undefined; }
      return () => { try { window.removeEventListener('alloflow:mic-level', onLevel); } catch (_) {} };
  }, [active]);
  if (!active) return null;
  // Reduced motion still gets a meter, just a stepped one: the point is
  // reassurance that the mic is live, and that survives losing the easing.
  const lit = Math.round(Math.max(0, Math.min(1, level)) * MIC_METER_BARS);
  return (
      <div
        aria-hidden="true"
        data-allo-mic-meter="true"
        data-allo-mic-level={lit}
        className={placement === 'inline'
            ? 'pointer-events-none inline-flex items-end gap-[2px] align-middle'
            : 'pointer-events-none absolute -bottom-5 left-1/2 flex -translate-x-1/2 items-end gap-[2px] rounded-full bg-slate-900/70 px-1.5 py-1 shadow-sm'}
      >
        {Array.from({ length: MIC_METER_BARS }).map((_, index) => {
            const on = index < lit;
            return (
              <span
                key={index}
                className={`w-[3px] rounded-full ${on ? 'bg-emerald-300' : 'bg-white/25'}`}
                style={{
                    height: `${4 + index * 2}px`,
                    transition: motionDisabled ? 'none' : 'background-color 90ms linear',
                }}
              />
            );
        })}
      </div>
  );
});
const spokenEventIds = new Set();
const lastGlobalSpeech = { text: '', time: 0 };
let introFiredGlobal = false;
const useAlloMotionDisabled = (disableAnimations) => {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(() => {
      try { return !!(typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches); }
      catch (_) { return false; }
  });
  useEffect(() => {
      let mq = null;
      try { mq = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)'); } catch (_) { mq = null; }
      if (!mq) return;
      const apply = () => setPrefersReducedMotion(!!mq.matches);
      apply();
      if (mq.addEventListener) {
          mq.addEventListener('change', apply);
          return () => mq.removeEventListener('change', apply);
      }
      if (mq.addListener) {
          mq.addListener(apply);
          return () => mq.removeListener(apply);
      }
  }, []);
  return !!disableAnimations || !!prefersReducedMotion;
};
// The four controls ringing the bot are revealed by :hover, which a touch screen
// does not have — so on a phone they were unreachable, while sticky tap-hover
// still left them painted on top of the avatar. Resolving the pointer type in JS
// rather than in CSS keeps the answer in one place: the same flag decides
// visibility, hit-target size and how far out each control is pushed, none of
// which can be expressed as a lone Tailwind hover variant.
const useAlloCoarsePointer = () => {
  const QUERY = '(hover: none), (pointer: coarse)';
  const [coarse, setCoarse] = useState(() => {
      try { return !!(typeof window !== 'undefined' && window.matchMedia && window.matchMedia(QUERY).matches); }
      catch (_) { return false; }
  });
  useEffect(() => {
      let mq = null;
      try { mq = typeof window !== 'undefined' && window.matchMedia && window.matchMedia(QUERY); } catch (_) { mq = null; }
      if (!mq) return;
      const apply = () => setCoarse(!!mq.matches);
      apply();
      if (mq.addEventListener) {
          mq.addEventListener('change', apply);
          return () => mq.removeEventListener('change', apply);
      }
      if (mq.addListener) {
          mq.addListener(apply);
          return () => mq.removeListener(apply);
      }
  }, []);
  return coarse;
};
// @section ALLOBOT — Embodied pedagogical tour agent
// STEAM Lab: map the active tool -> its discipline -> a themed accessory.
// Discipline is read from the tool's registered category (window.STEM_TOOL_REGISTRY,
// populated by registerTool at load), so new tools auto-inherit the right accessory;
// a few known edge cases are pinned in the override table.
const STEM_DISCIPLINE_ACCESSORY = { math: 'math-tools', engineering: 'gear', creative: 'artist', strategy: 'game-pad', applied: 'hard-hat', science: 'microscope' };
const STEM_DISCIPLINE_OVERRIDE = { cellularLab: 'science', geoSandbox: 'science', lumen: 'science', dataPlot: 'math', dataStudio: 'math', alloBotSage: 'engineering', worldBuilder: 'creative', echoTrainer: 'science' };
function alloStemDiscipline(toolId) {
    if (!toolId) return null;
    if (STEM_DISCIPLINE_OVERRIDE[toolId]) return STEM_DISCIPLINE_OVERRIDE[toolId];
    let cat = '';
    try {
        const reg = (typeof window !== 'undefined') && window.STEM_TOOL_REGISTRY;
        if (reg) { for (let i = 0; i < reg.length; i++) { if (reg[i] && reg[i].id === toolId) { cat = (reg[i].tags && reg[i].tags[0]) || ''; break; } } }
    } catch (e) {}
    const s = (String(cat) + ' ' + String(toolId)).toLowerCase();
    if (/\bmath\b|algebra|calc|geometr|fraction|number|arithmet|\bdata\b|statist|probab|graph|\blogic|coordinate|areamodel|base10|multtable|unitconv|volume|inequal|moneymath|protractor/.test(s)) return 'math';
    if (/coding|\bcs\b|technology|\btech\b|comput|applab|cyber|semiconductor|llm|algorithm|robot|history-engineering|circuit|bridge|archstudio|a11y|assessmentlit/.test(s)) return 'engineering';
    if (/creativ|\bart\b|music|paint|draw|design|story|film|photo|animat|poet|singing|oratory/.test(s)) return 'creative';
    if (/strateg|\bgames?\b|puzzle|arccity|gamestudio|arcade/.test(s)) return 'strategy';
    if (/applied|life-?skill|\bgeo\b|econom|finance|career|nutri|baking|cooking|garden|aquacultur|farm|roadready|driver|behavior|literacy|firstaid|firstrespon|pets|skate|swim|typing|recreation|autorepair|bikelab/.test(s)) return 'applied';
    return 'science';
}
function alloStemAccessory(toolId) {
    const d = alloStemDiscipline(toolId);
    return d ? (STEM_DISCIPLINE_ACCESSORY[d] || 'microscope') : null;
}
const releaseAlloBotAudioUrl = (url) => {
  if (!url || !String(url).startsWith('blob:')) return;
  try {
    if (typeof window.__alloTtsCacheOwnsUrl === 'function' && window.__alloTtsCacheOwnsUrl(url)) return;
    URL.revokeObjectURL(url);
  } catch (_) {}
};

const isAlloBotTtsOff = () => {
  try {
    return JSON.parse(safeGetItem('alloflow_ai_config') || '{}').ttsProvider === 'off';
  } catch (_) { return false; }
};

// ── A3: AlloBot must never silence someone else's speech ────────────────────
// window.speechSynthesis.cancel() is GLOBAL. AlloBot called it on unmount and
// on every silence path, so dismissing the bot with its X (or the header
// toggle, or the 3-minute idle sleep) killed whatever else was speaking:
// Read This Page mid-narration, a voice-loop reply, a read-aloud a student had
// just started. That is what made "hide the bot" read as "turn off TTS".
// Fix: track whether the CURRENT browser utterance is ours, and only cancel
// then. The Web Speech API has no per-utterance stop, so the flag is the only
// way to scope it.
let _alloBotOwnsBrowserSpeech = false;
const alloBotClaimBrowserSpeech = () => { _alloBotOwnsBrowserSpeech = true; };
const alloBotReleaseBrowserSpeech = () => { _alloBotOwnsBrowserSpeech = false; };
const cancelAlloBotBrowserSpeech = () => {
  if (!_alloBotOwnsBrowserSpeech) return false;
  _alloBotOwnsBrowserSpeech = false;
  try { if (window.speechSynthesis) window.speechSynthesis.cancel(); } catch (_) {}
  return true;
};

const alloBotTipText = (value, maxLength = 90) => String(value || '')
  .replace(/[\u0000-\u001f\u007f]/g, ' ')
  .replace(/\s+/g, ' ')
  .trim()
  .slice(0, maxLength);

const alloBotTipList = (value) => Array.isArray(value) ? value : [];

const alloBotWordCount = (value) => typeof value === 'string'
  ? value.trim().split(/\s+/).filter(Boolean).length
  : 0;

const alloBotAacChoiceCount = (data) => {
  const direct = alloBotTipList(data?.buttons || data?.cells || data?.items).length;
  if (direct) return direct;
  return alloBotTipList(data?.pages).reduce((total, page) => (
    total + alloBotTipList(page?.buttons || page?.cells || page?.items).length
  ), 0);
};

const alloBotLinguaLanguage = (data) => alloBotTipText(
  data?.targetLanguage || data?.language?.target || data?.profile?.target
    || (typeof data?.language === 'string' ? data.language : '')
    || data?.practiceSet?.language,
  60
);

const latestAlloBotResource = (history, types) => {
  const accepted = new Set(Array.isArray(types) ? types : [types]);
  const items = Array.isArray(history) ? history : [];
  for (let index = items.length - 1; index >= 0; index -= 1) {
    const item = items[index];
    if (item && accepted.has(item.type)) return item;
  }
  return null;
};

const STUDENT_TIP_VIEW_ALIASES = Object.freeze({
  'sentence-frames': ['sentence-frames', 'scaffolds'],
  scaffolds: ['sentence-frames', 'scaffolds'],
  'alignment-report': ['alignment-report', 'alignment'],
  alignment: ['alignment-report', 'alignment'],
  'word-sounds-generator': ['word-sounds', 'glossary'],
  output: ['word-sounds'],
});

// Explicit learner-copy coverage for every student-reachable resource family.
// Contextual branches below can be richer, but a view in this table never falls
// through to a teacher suggestion or an unrelated generic creation prompt.
const STUDENT_IDLE_TIP_KEYS = Object.freeze({
  input: 'tips.student_input_choose', simplified: 'tips.student_simplified_summary', glossary: 'tips.student_glossary_practice',
  quiz: 'tips.student_quiz_reasoning', adventure: 'tips.student_adventure_evidence', timeline: 'tips.student_timeline_sequence',
  math: 'tips.student_math_steps', faq: 'tips.student_faq_predict', outline: 'tips.student_outline_checkpoint',
  'concept-sort': 'tips.student_concept_sort_reason', 'sentence-frames': 'tips.student_scaffolds_own_idea', scaffolds: 'tips.student_scaffolds_own_idea',
  analysis: 'tips.student_analysis_question', image: 'tips.student_image_notice', brainstorm: 'tips.student_brainstorm_choose',
  persona: 'tips.student_persona_question', dbq: 'tips.student_dbq_evidence', 'note-taking': 'tips.student_notes_recall',
  'anchor-chart': 'tips.student_anchor_chart_recall', 'lesson-plan': 'tips.student_study_guide_plan',
  'alignment-report': 'tips.student_alignment_next_step', alignment: 'tips.student_alignment_next_step',
  'gemini-bridge': 'tips.student_simulation_predict', 'word-sounds': 'tips.student_word_sounds_practice',
  'word-sounds-generator': 'tips.student_word_sounds_practice', output: 'tips.student_word_sounds_practice', directions: 'tips.student_directions_check',
  'video-transcript': 'tips.student_video_transcript', 'video-ref': 'tips.student_video_notice', readingBook: 'tips.student_reading_book',
  readingSet: 'tips.student_reading_set', 'aac-board': 'tips.student_aac_board', 'math-fluency-maze': 'tips.student_fluency_strategy',
  'math-fluency-probe': 'tips.student_fluency_probe_reflect', 'fluency-record': 'tips.student_fluency_record_reflect',
  'manipulative-resource': 'tips.student_manipulative_explain', 'stem-assessment': 'tips.student_assessment_evidence',
  'explore-challenge': 'tips.student_explore_reflect', 'storyforge-config': 'tips.student_creative_assignment_plan',
  'storyforge-submission': 'tips.student_creative_submission_review', 'poettree-config': 'tips.student_creative_assignment_plan',
  'poettree-submission': 'tips.student_creative_submission_review', 'litlab-config': 'tips.student_creative_assignment_plan',
  'litlab-submission': 'tips.student_creative_submission_review', 'lingua-config': 'tips.student_lingua_practice',
  'lingua-submission': 'tips.student_lingua_reflect', 'udl-advice': 'tips.student_guide_choice',
});

const STUDENT_EVENT_TIP_KEYS = Object.freeze({
  quiz: 'bot_events.student_quiz_ready', glossary: 'bot_events.student_glossary_ready', simplified: 'bot_events.student_simplified_ready',
  adventure: 'bot_events.student_adventure_ready', analysis: 'bot_events.student_analysis_ready', scaffolds: 'bot_events.student_scaffolds_ready',
  'sentence-frames': 'bot_events.student_scaffolds_ready', faq: 'bot_events.student_faq_ready', outline: 'bot_events.student_outline_ready',
  brainstorm: 'bot_events.student_brainstorm_ready', 'concept-sort': 'bot_events.student_concept_sort_ready', math: 'bot_events.student_math_ready',
  persona: 'bot_events.student_persona_ready', alignment: 'bot_events.student_alignment_ready', 'alignment-report': 'bot_events.student_alignment_ready',
  'gemini-bridge': 'bot_events.student_simulation_ready',
  timeline: 'bot_events.student_timeline_ready', 'lesson-plan': 'bot_events.student_study_guide_ready', image: 'bot_events.student_image_ready',
  dbq: 'bot_events.student_dbq_ready', 'note-taking': 'bot_events.student_notes_ready', 'anchor-chart': 'bot_events.student_anchor_chart_ready',
  'word-sounds': 'bot_events.student_word_sounds_ready', directions: 'bot_events.student_directions_ready',
  'video-transcript': 'bot_events.student_video_ready', 'video-ref': 'bot_events.student_video_ready', readingBook: 'bot_events.student_reading_ready',
  readingSet: 'bot_events.student_reading_set_ready', 'aac-board': 'bot_events.student_aac_ready',
  'math-fluency-probe': 'bot_events.student_fluency_probe_ready', 'fluency-record': 'bot_events.student_fluency_record_ready',
  'math-fluency-maze': 'bot_events.student_fluency_ready', 'manipulative-resource': 'bot_events.student_manipulative_ready',
  'stem-assessment': 'bot_events.student_assessment_ready', 'explore-challenge': 'bot_events.student_explore_ready',
  'storyforge-config': 'bot_events.student_creative_assignment_ready', 'storyforge-submission': 'bot_events.student_creative_submission_ready',
  'poettree-config': 'bot_events.student_creative_assignment_ready', 'poettree-submission': 'bot_events.student_creative_submission_ready',
  'litlab-config': 'bot_events.student_creative_assignment_ready', 'litlab-submission': 'bot_events.student_creative_submission_ready',
  'lingua-config': 'bot_events.student_lingua_ready', 'lingua-submission': 'bot_events.student_lingua_record_ready',
  'udl-advice': 'bot_events.student_guide_ready',
});

// A second layer of varied coaching prevents contextual tips from becoming a
// single repeated script. Keys are intentionally reusable across tools: the
// current resource supplies the context, while these prompts vary the learning
// move (retrieve, compare, predict, explain, revise, or reflect).
const STUDENT_DIVERSE_TIP_KEYS = Object.freeze({
  input: ['tips.student_extra_goal', 'tips.student_extra_reflect'],
  simplified: ['tips.student_extra_retrieve', 'tips.student_extra_question'],
  glossary: ['tips.student_extra_retrieve', 'tips.student_extra_connect'],
  quiz: ['tips.student_extra_evidence', 'tips.student_extra_check'],
  adventure: ['tips.student_extra_transfer', 'tips.student_extra_reflect'],
  timeline: ['tips.student_extra_compare', 'tips.student_extra_cause'],
  math: ['tips.student_extra_explain', 'tips.student_extra_check'],
  faq: ['tips.student_extra_retrieve', 'tips.student_extra_question'],
  outline: ['tips.student_extra_retrieve', 'tips.student_extra_sequence'],
  'concept-sort': ['tips.student_extra_compare', 'tips.student_extra_explain'],
  'sentence-frames': ['tips.student_extra_create', 'tips.student_extra_evidence'],
  scaffolds: ['tips.student_extra_create', 'tips.student_extra_evidence'],
  analysis: ['tips.student_extra_question', 'tips.student_extra_connect'],
  image: ['tips.student_extra_observe', 'tips.student_extra_question'],
  brainstorm: ['tips.student_extra_choice', 'tips.student_extra_create'],
  persona: ['tips.student_extra_question', 'tips.student_extra_evidence'],
  dbq: ['tips.student_extra_evidence', 'tips.student_extra_compare'],
  'note-taking': ['tips.student_extra_retrieve', 'tips.student_extra_organize'],
  'anchor-chart': ['tips.student_extra_retrieve', 'tips.student_extra_connect'],
  'lesson-plan': ['tips.student_extra_goal', 'tips.student_extra_retrieve'],
  'alignment-report': ['tips.student_extra_feedback', 'tips.student_extra_goal'],
  alignment: ['tips.student_extra_feedback', 'tips.student_extra_goal'],
  'gemini-bridge': ['tips.student_extra_predict', 'tips.student_extra_explain'],
  'word-sounds': ['tips.student_extra_pattern', 'tips.student_extra_check'],
  'word-sounds-generator': ['tips.student_extra_pattern', 'tips.student_extra_check'],
  output: ['tips.student_extra_pattern', 'tips.student_extra_check'],
  directions: ['tips.student_extra_plan', 'tips.student_extra_check'],
  'video-transcript': ['tips.student_extra_summarize', 'tips.student_extra_question'],
  'video-ref': ['tips.student_extra_predict', 'tips.student_extra_summarize'],
  readingBook: ['tips.student_extra_predict', 'tips.student_extra_summarize'],
  readingSet: ['tips.student_extra_compare', 'tips.student_extra_evidence'],
  'aac-board': ['tips.student_extra_choice', 'tips.student_extra_rehearse'],
  'math-fluency-maze': ['tips.student_extra_strategy', 'tips.student_extra_reflect'],
  'math-fluency-probe': ['tips.student_extra_strategy', 'tips.student_extra_feedback'],
  'fluency-record': ['tips.student_extra_feedback', 'tips.student_extra_reflect'],
  'manipulative-resource': ['tips.student_extra_explain', 'tips.student_extra_check'],
  'stem-assessment': ['tips.student_extra_evidence', 'tips.student_extra_check'],
  'explore-challenge': ['tips.student_extra_predict', 'tips.student_extra_reflect'],
  'storyforge-config': ['tips.student_extra_goal', 'tips.student_extra_create'],
  'storyforge-submission': ['tips.student_extra_revise', 'tips.student_extra_reflect'],
  'poettree-config': ['tips.student_extra_goal', 'tips.student_extra_create'],
  'poettree-submission': ['tips.student_extra_revise', 'tips.student_extra_reflect'],
  'litlab-config': ['tips.student_extra_goal', 'tips.student_extra_rehearse'],
  'litlab-submission': ['tips.student_extra_revise', 'tips.student_extra_reflect'],
  'lingua-config': ['tips.student_extra_rehearse', 'tips.student_extra_pattern'],
  'lingua-submission': ['tips.student_extra_feedback', 'tips.student_extra_reflect'],
  'udl-advice': ['tips.student_extra_choice', 'tips.student_extra_reflect'],
});

const EDUCATOR_IDLE_TIP_KEYS = Object.freeze({
  input: ['tips.educator_sequence_resources', 'tips.educator_check_prior_knowledge'],
  simplified: ['tips.educator_monitor_access', 'tips.educator_plan_retrieval'],
  glossary: ['tips.educator_monitor_access', 'tips.educator_plan_retrieval'],
  quiz: ['tips.educator_surface_misconceptions', 'tips.educator_require_evidence'],
  adventure: ['tips.educator_plan_transfer', 'tips.educator_student_voice'],
  timeline: ['tips.educator_model_thinking', 'tips.educator_plan_discussion'],
  math: ['tips.educator_model_thinking', 'tips.educator_surface_misconceptions'],
  faq: ['tips.educator_check_prior_knowledge', 'tips.educator_plan_discussion'],
  outline: ['tips.educator_sequence_resources', 'tips.educator_plan_retrieval'],
  'concept-sort': ['tips.educator_surface_misconceptions', 'tips.educator_plan_discussion'],
  'sentence-frames': ['tips.educator_fade_scaffold', 'tips.educator_student_voice'],
  scaffolds: ['tips.educator_fade_scaffold', 'tips.educator_student_voice'],
  analysis: ['tips.educator_check_prior_knowledge', 'tips.educator_monitor_access'],
  image: ['tips.educator_plan_discussion', 'tips.educator_accessibility_check'],
  brainstorm: ['tips.educator_offer_choice', 'tips.educator_plan_transfer'],
  persona: ['tips.educator_compare_perspectives', 'tips.educator_require_evidence'],
  dbq: ['tips.educator_compare_perspectives', 'tips.educator_require_evidence'],
  'note-taking': ['tips.educator_fade_scaffold', 'tips.educator_plan_retrieval'],
  'anchor-chart': ['tips.educator_model_thinking', 'tips.educator_plan_retrieval'],
  'lesson-plan': ['tips.educator_sequence_resources', 'tips.educator_feedback_loop'],
  'alignment-report': ['tips.educator_feedback_loop', 'tips.educator_plan_transfer'],
  alignment: ['tips.educator_feedback_loop', 'tips.educator_plan_transfer'],
  'gemini-bridge': ['tips.educator_model_thinking', 'tips.educator_surface_misconceptions'],
  'word-sounds': ['tips.educator_monitor_access', 'tips.educator_feedback_loop'],
  'word-sounds-generator': ['tips.educator_monitor_access', 'tips.educator_feedback_loop'],
  output: ['tips.educator_monitor_access', 'tips.educator_feedback_loop'],
  directions: ['tips.educator_accessibility_check', 'tips.educator_offer_choice'],
  'video-transcript': ['tips.educator_accessibility_check', 'tips.educator_plan_discussion'],
  'video-ref': ['tips.educator_accessibility_check', 'tips.educator_check_prior_knowledge'],
  readingBook: ['tips.educator_plan_discussion', 'tips.educator_plan_retrieval'],
  readingSet: ['tips.educator_compare_perspectives', 'tips.educator_require_evidence'],
  'aac-board': ['tips.educator_offer_choice', 'tips.educator_monitor_access'],
  'math-fluency-maze': ['tips.educator_feedback_loop', 'tips.educator_surface_misconceptions'],
  'math-fluency-probe': ['tips.educator_feedback_loop', 'tips.educator_surface_misconceptions'],
  'fluency-record': ['tips.educator_feedback_loop', 'tips.educator_monitor_access'],
  'manipulative-resource': ['tips.educator_model_thinking', 'tips.educator_offer_choice'],
  'stem-assessment': ['tips.educator_require_evidence', 'tips.educator_feedback_loop'],
  'explore-challenge': ['tips.educator_plan_transfer', 'tips.educator_student_voice'],
  'storyforge-config': ['tips.educator_offer_choice', 'tips.educator_student_voice'],
  'storyforge-submission': ['tips.educator_feedback_loop', 'tips.educator_student_voice'],
  'poettree-config': ['tips.educator_offer_choice', 'tips.educator_student_voice'],
  'poettree-submission': ['tips.educator_feedback_loop', 'tips.educator_student_voice'],
  'litlab-config': ['tips.educator_offer_choice', 'tips.educator_student_voice'],
  'litlab-submission': ['tips.educator_feedback_loop', 'tips.educator_student_voice'],
  'lingua-config': ['tips.educator_monitor_access', 'tips.educator_plan_transfer'],
  'lingua-submission': ['tips.educator_feedback_loop', 'tips.educator_student_voice'],
  'udl-advice': ['tips.educator_offer_choice', 'tips.educator_monitor_access'],
});

const EDUCATOR_EVENT_TIP_KEYS = Object.freeze({
  quiz: 'bot_events.educator_assessment_ready', glossary: 'bot_events.educator_vocabulary_ready', simplified: 'bot_events.educator_text_ready',
  adventure: 'bot_events.educator_transfer_ready', analysis: 'bot_events.educator_analysis_ready', scaffolds: 'bot_events.educator_scaffold_ready',
  'sentence-frames': 'bot_events.educator_scaffold_ready', faq: 'bot_events.educator_questions_ready', outline: 'bot_events.educator_organizer_ready',
  brainstorm: 'bot_events.educator_choice_ready', 'concept-sort': 'bot_events.educator_sort_ready', math: 'bot_events.educator_math_ready',
  persona: 'bot_events.educator_perspective_ready', alignment: 'bot_events.educator_alignment_ready', 'alignment-report': 'bot_events.educator_alignment_ready',
  timeline: 'bot_events.educator_sequence_ready', 'lesson-plan': 'bot_events.educator_plan_ready', image: 'bot_events.educator_media_ready',
  dbq: 'bot_events.educator_inquiry_ready', 'note-taking': 'bot_events.educator_notes_ready', 'anchor-chart': 'bot_events.educator_anchor_ready',
  'gemini-bridge': 'bot_events.educator_simulation_ready', 'word-sounds': 'bot_events.educator_language_ready',
  directions: 'bot_events.educator_directions_ready', 'video-transcript': 'bot_events.educator_media_ready', 'video-ref': 'bot_events.educator_media_ready',
  readingBook: 'bot_events.educator_reading_ready', readingSet: 'bot_events.educator_reading_set_ready', 'aac-board': 'bot_events.educator_aac_ready',
  'math-fluency-maze': 'bot_events.educator_fluency_ready', 'math-fluency-probe': 'bot_events.educator_fluency_ready',
  'fluency-record': 'bot_events.educator_fluency_record_ready', 'manipulative-resource': 'bot_events.educator_model_ready',
  'stem-assessment': 'bot_events.educator_assessment_ready', 'explore-challenge': 'bot_events.educator_transfer_ready',
  'storyforge-config': 'bot_events.educator_creative_ready', 'storyforge-submission': 'bot_events.educator_submission_ready',
  'poettree-config': 'bot_events.educator_creative_ready', 'poettree-submission': 'bot_events.educator_submission_ready',
  'litlab-config': 'bot_events.educator_creative_ready', 'litlab-submission': 'bot_events.educator_submission_ready',
  'lingua-config': 'bot_events.educator_language_ready', 'lingua-submission': 'bot_events.educator_submission_ready',
  'udl-advice': 'bot_events.educator_support_ready',
});

const buildStudentEventTip = (latest, topic, t) => {
  const type = latest?.type || '';
  const data = latest?.data;
  const topicName = alloBotTipText(topic || latest?.topic || data?.topic || latest?.title);
  const questions = alloBotTipList(data?.questions || (Array.isArray(data) && type === 'faq' ? data : []));
  const glossaryTerms = alloBotTipList(Array.isArray(data) ? data : data?.terms);
  const firstTerm = alloBotTipText(glossaryTerms[0]?.term || glossaryTerms[0]?.word || glossaryTerms[0]);
  const level = alloBotTipText(data?.gradeLevel || data?.level, 50);
  const concepts = alloBotTipList(data?.keyConcepts || data?.concepts);
  const frames = alloBotTipList(data?.frames || (Array.isArray(data) ? data : []));
  const sections = alloBotTipList(data?.sections || data?.outline);
  const activities = alloBotTipList(data?.activities || (Array.isArray(data) ? data : []));
  const categories = alloBotTipList(data?.categories);
  const items = alloBotTipList(data?.items);
  const problems = alloBotTipList(data?.problems || data?.equations || (Array.isArray(data) ? data : []));
  const events = alloBotTipList(data?.events || (Array.isArray(data) ? data : []));
  const personaName = alloBotTipText(data?.name || data?.character?.name, 60);
  const documents = alloBotTipList(data?.documents || data?.sources);
  const noteSections = alloBotTipList(data?.sections || data?.notes || data?.templates);
  const words = alloBotTipList(data?.words || data?.terms || (Array.isArray(data) && type === 'word-sounds' ? data : []));
  const steps = alloBotTipList(data?.steps || data?.directions || data?.instructions);
  const readingItems = alloBotTipList(data?.books || data?.items || data?.pages || data?.chapters);
  const fluencyAccuracy = Number(data?.metrics?.accuracy ?? data?.accuracy);
  const aacChoiceCount = alloBotAacChoiceCount(data);
  const creativeVocabularyCount = alloBotTipList(data?.vocabTerms || data?.practiceSet?.lesson?.vocabulary).length;
  const creativeWordCount = Number(data?.analytics?.totalWords) || alloBotWordCount(data?.text || data?.story || data?.sourceText);
  const creativeLineCount = Number(data?.lineCount) || alloBotTipList(data?.lines).length;
  const linguaLanguage = alloBotLinguaLanguage(data);
  const linguaActivityCount = Array.isArray(data?.activity)
    ? data.activity.reduce((total, event) => total + Math.max(0, Number(event?.count || 0)), 0)
    : alloBotTipList(data?.events || data?.activityLog).length;
  const localized = (key, params, fallbackKey) => t(key, params) || (fallbackKey ? t(fallbackKey) : undefined);

  if (type === 'quiz' && questions.length) return localized('bot_events.student_quiz_ready_count', { count: questions.length }, 'bot_events.student_quiz_ready');
  if (type === 'glossary' && firstTerm) return localized('bot_events.student_glossary_ready_term', { count: glossaryTerms.length, term: firstTerm }, 'bot_events.student_glossary_ready');
  if (type === 'simplified' && level) return localized('bot_events.student_simplified_ready_level', { level }, 'bot_events.student_simplified_ready');
  if (type === 'adventure' && topicName) return localized('bot_events.student_adventure_ready_topic', { topic: topicName }, 'bot_events.student_adventure_ready');
  if (type === 'analysis' && concepts.length) return localized('bot_events.student_analysis_ready_count', { count: concepts.length }, 'bot_events.student_analysis_ready');
  if ((type === 'scaffolds' || type === 'sentence-frames') && frames.length) return localized('bot_events.student_scaffolds_ready_count', { count: frames.length }, 'bot_events.student_scaffolds_ready');
  if (type === 'faq' && questions.length) return localized('bot_events.student_faq_ready_count', { count: questions.length }, 'bot_events.student_faq_ready');
  if (type === 'outline' && sections.length) return localized('bot_events.student_outline_ready_count', { count: sections.length }, 'bot_events.student_outline_ready');
  if (type === 'brainstorm' && activities.length) return localized('bot_events.student_brainstorm_ready_count', { count: activities.length }, 'bot_events.student_brainstorm_ready');
  if (type === 'concept-sort' && (categories.length || items.length)) return localized('bot_events.student_concept_sort_ready_counts', { itemCount: items.length, categoryCount: categories.length }, 'bot_events.student_concept_sort_ready');
  if (type === 'math' && problems.length) return localized('bot_events.student_math_ready_count', { count: problems.length }, 'bot_events.student_math_ready');
  if (type === 'persona' && personaName) return localized('bot_events.student_persona_ready_name', { name: personaName }, 'bot_events.student_persona_ready');
  if (type === 'timeline' && events.length) return localized('bot_events.student_timeline_ready_count', { count: events.length }, 'bot_events.student_timeline_ready');
  if (type === 'image' && topicName) return localized('bot_events.student_image_ready_topic', { topic: topicName }, 'bot_events.student_image_ready');
  if (type === 'dbq' && documents.length) return localized('bot_events.student_dbq_ready_count', { count: documents.length }, 'bot_events.student_dbq_ready');
  if ((type === 'note-taking' || type === 'anchor-chart') && noteSections.length) {
    const key = type === 'note-taking' ? 'bot_events.student_notes_ready_count' : 'bot_events.student_anchor_chart_ready_count';
    return localized(key, { count: noteSections.length }, STUDENT_EVENT_TIP_KEYS[type]);
  }
  if (type === 'word-sounds' && words.length) return localized('bot_events.student_word_sounds_ready_count', { count: words.length }, 'bot_events.student_word_sounds_ready');
  if (type === 'directions' && steps.length) return localized('bot_events.student_directions_ready_count', { count: steps.length }, 'bot_events.student_directions_ready');
  if ((type === 'readingBook' || type === 'readingSet') && readingItems.length) {
    const key = type === 'readingBook' ? 'bot_events.student_reading_ready_count' : 'bot_events.student_reading_set_ready_count';
    return localized(key, { count: readingItems.length }, STUDENT_EVENT_TIP_KEYS[type]);
  }
  if (type === 'aac-board' && aacChoiceCount) return localized('bot_events.student_aac_ready_count', { count: aacChoiceCount }, 'bot_events.student_aac_ready');
  if (type === 'fluency-record' && Number.isFinite(fluencyAccuracy)) {
    return localized('bot_events.student_fluency_record_ready_accuracy', { accuracy: Math.round(fluencyAccuracy) }, 'bot_events.student_fluency_record_ready');
  }
  if (type === 'lingua-config' && linguaLanguage) {
    const key = creativeVocabularyCount ? 'bot_events.student_lingua_ready_context' : 'bot_events.student_lingua_ready_language';
    return localized(key, { language: linguaLanguage, count: creativeVocabularyCount }, STUDENT_EVENT_TIP_KEYS[type]);
  }
  if (type.endsWith('-config') && creativeVocabularyCount) {
    return localized('bot_events.student_creative_assignment_ready_vocab', { count: creativeVocabularyCount }, STUDENT_EVENT_TIP_KEYS[type]);
  }
  if (type === 'storyforge-submission' && creativeWordCount) {
    return localized('bot_events.student_story_ready_words', { count: creativeWordCount }, STUDENT_EVENT_TIP_KEYS[type]);
  }
  if ((type === 'poettree-submission' || type === 'litlab-submission') && creativeLineCount) {
    return localized('bot_events.student_creative_submission_ready_lines', { count: creativeLineCount }, STUDENT_EVENT_TIP_KEYS[type]);
  }
  if (type === 'lingua-submission' && (linguaLanguage || linguaActivityCount)) {
    const key = linguaActivityCount ? 'bot_events.student_lingua_record_ready_context' : 'bot_events.student_lingua_record_ready_language';
    return localized(key, { language: linguaLanguage || 'the target language', count: linguaActivityCount }, STUDENT_EVENT_TIP_KEYS[type]);
  }
  return t(STUDENT_EVENT_TIP_KEYS[type] || 'bot_events.student_resource_ready');
};

const buildEducatorEventTip = (latest, topic, t) => {
  const type = latest?.type || '';
  const data = latest?.data;
  const questions = alloBotTipList(data?.questions || (Array.isArray(data) && type === 'quiz' ? data : []));
  const terms = alloBotTipList(Array.isArray(data) && type === 'glossary' ? data : data?.terms);
  const higherOrderQuestionCount = questions.filter((question) => {
    const prompt = alloBotTipText(question?.question || question?.text || question, 300).toLowerCase();
    return ['analyze', 'evaluate', 'compare', 'contrast', 'justify', 'predict', 'infer', 'synthesize'].some(word => prompt.includes(word));
  }).length;
  const complexTermCount = terms.filter((term) => {
    const label = alloBotTipText(term?.term || term?.word || term, 100);
    return label.length > 8 || label.includes(' ');
  }).length;
  const concepts = alloBotTipList(data?.keyConcepts || data?.concepts);
  const vocabulary = alloBotTipList(data?.vocabulary || data?.tier2Words);
  const documents = alloBotTipList(data?.documents || data?.sources);
  const sections = alloBotTipList(data?.sections || data?.outline || data?.notes || data?.templates);
  const categories = alloBotTipList(data?.categories);
  const items = alloBotTipList(data?.items);
  const steps = alloBotTipList(data?.steps || data?.directions || data?.instructions);
  const readings = alloBotTipList(data?.books || data?.items || data?.pages || data?.chapters);
  const accuracy = Number(data?.metrics?.accuracy ?? data?.accuracy);
  const aacChoiceCount = alloBotAacChoiceCount(data);
  const frames = alloBotTipList(data?.frames || (Array.isArray(data) && (type === 'scaffolds' || type === 'sentence-frames') ? data : []));
  const activities = alloBotTipList(data?.activities || (Array.isArray(data) && type === 'brainstorm' ? data : []));
  const problems = alloBotTipList(data?.problems || data?.equations || (Array.isArray(data) && type === 'math' ? data : []));
  const events = alloBotTipList(data?.events || (Array.isArray(data) && type === 'timeline' ? data : []));
  const creativeVocabularyCount = alloBotTipList(data?.vocabTerms || data?.practiceSet?.lesson?.vocabulary).length;
  const submissionWordCount = Number(data?.analytics?.totalWords) || alloBotWordCount(data?.text || data?.story || data?.sourceText);
  const submissionLineCount = Number(data?.lineCount) || alloBotTipList(data?.lines).length;
  const linguaLanguage = alloBotLinguaLanguage(data);
  const resourceName = alloBotTipText(latest?.title || type.replace(/-/g, ' '), 70);
  const topicName = alloBotTipText(topic || latest?.topic || data?.topic, 90);
  const localized = (key, params, fallbackKey) => t(key, params) || (fallbackKey ? t(fallbackKey) : undefined);

  if (type === 'quiz' && questions.length) {
    return localized('bot_events.educator_quiz_ready_context', { count: questions.length, higherOrderCount: higherOrderQuestionCount }, EDUCATOR_EVENT_TIP_KEYS[type]);
  }
  if (type === 'glossary' && terms.length) {
    return localized('bot_events.educator_glossary_ready_context', { count: terms.length, complexCount: complexTermCount }, EDUCATOR_EVENT_TIP_KEYS[type]);
  }
  if (type === 'analysis' && (concepts.length || vocabulary.length)) {
    return localized('bot_events.educator_analysis_ready_counts', { conceptCount: concepts.length, vocabularyCount: vocabulary.length }, EDUCATOR_EVENT_TIP_KEYS[type]);
  }
  if (type === 'dbq' && documents.length) return localized('bot_events.educator_dbq_ready_count', { count: documents.length }, EDUCATOR_EVENT_TIP_KEYS[type]);
  if ((type === 'outline' || type === 'note-taking' || type === 'anchor-chart' || type === 'lesson-plan') && sections.length) {
    return localized('bot_events.educator_sections_ready_count', { count: sections.length, resource: resourceName }, EDUCATOR_EVENT_TIP_KEYS[type]);
  }
  if (type === 'concept-sort' && (categories.length || items.length)) {
    return localized('bot_events.educator_sort_ready_counts', { itemCount: items.length, categoryCount: categories.length }, EDUCATOR_EVENT_TIP_KEYS[type]);
  }
  if ((type === 'scaffolds' || type === 'sentence-frames') && frames.length) {
    return localized('bot_events.educator_scaffold_ready_count', { count: frames.length }, EDUCATOR_EVENT_TIP_KEYS[type]);
  }
  if (type === 'brainstorm' && activities.length) return localized('bot_events.educator_brainstorm_ready_count', { count: activities.length }, EDUCATOR_EVENT_TIP_KEYS[type]);
  if (type === 'math' && problems.length) return localized('bot_events.educator_math_ready_count', { count: problems.length }, EDUCATOR_EVENT_TIP_KEYS[type]);
  if (type === 'timeline' && events.length) return localized('bot_events.educator_timeline_ready_count', { count: events.length }, EDUCATOR_EVENT_TIP_KEYS[type]);
  if (type === 'directions' && steps.length) return localized('bot_events.educator_directions_ready_count', { count: steps.length }, EDUCATOR_EVENT_TIP_KEYS[type]);
  if ((type === 'readingBook' || type === 'readingSet') && readings.length) {
    return localized('bot_events.educator_reading_ready_count', { count: readings.length }, EDUCATOR_EVENT_TIP_KEYS[type]);
  }
  if ((type === 'fluency-record' || type === 'math-fluency-probe') && Number.isFinite(accuracy)) {
    return localized('bot_events.educator_fluency_ready_accuracy', { accuracy: Math.round(accuracy) }, EDUCATOR_EVENT_TIP_KEYS[type]);
  }
  if (type === 'aac-board' && aacChoiceCount) return localized('bot_events.educator_aac_ready_count', { count: aacChoiceCount }, EDUCATOR_EVENT_TIP_KEYS[type]);
  if (type === 'lingua-config' && linguaLanguage) {
    const key = creativeVocabularyCount ? 'bot_events.educator_lingua_ready_context' : 'bot_events.educator_lingua_ready_language';
    return localized(key, { language: linguaLanguage, count: creativeVocabularyCount }, EDUCATOR_EVENT_TIP_KEYS[type]);
  }
  if (type.endsWith('-config') && creativeVocabularyCount) {
    return localized('bot_events.educator_creative_ready_vocab', { count: creativeVocabularyCount }, EDUCATOR_EVENT_TIP_KEYS[type]);
  }
  if (type === 'storyforge-submission' && submissionWordCount) {
    return localized('bot_events.educator_story_submission_ready_words', { count: submissionWordCount }, EDUCATOR_EVENT_TIP_KEYS[type]);
  }
  if ((type === 'poettree-submission' || type === 'litlab-submission') && submissionLineCount) {
    return localized('bot_events.educator_submission_ready_lines', { count: submissionLineCount }, EDUCATOR_EVENT_TIP_KEYS[type]);
  }
  if (type === 'lingua-submission' && linguaLanguage) {
    return localized('bot_events.educator_lingua_ready_language', { language: linguaLanguage }, EDUCATOR_EVENT_TIP_KEYS[type]);
  }
  if (!EDUCATOR_EVENT_TIP_KEYS[type] && topicName) {
    return localized('bot_events.educator_resource_ready_topic', { resource: resourceName, topic: topicName }, 'bot_events.educator_resource_ready');
  }
  return t(EDUCATOR_EVENT_TIP_KEYS[type] || 'bot_events.educator_resource_ready');
};

const buildStudentIdleTips = ({ activeView, history, topic, t }) => {
  const tips = [];
  const add = (key, params) => {
    const message = t(key, params);
    if (typeof message === 'string' && message.trim()) tips.push(message);
  };
  const historyItems = (Array.isArray(history) ? history : []).filter(item => item && item.type);
  const resources = historyItems.filter(item => item.type !== 'directions');
  const current = latestAlloBotResource(historyItems, STUDENT_TIP_VIEW_ALIASES[activeView] || activeView);
  const data = current?.data;
  const topicName = alloBotTipText(topic || current?.topic || data?.topic || current?.title);

  if (activeView === 'simplified') {
    const glossary = latestAlloBotResource(resources, 'glossary');
    const terms = alloBotTipList(Array.isArray(glossary?.data) ? glossary.data : glossary?.data?.terms);
    const word = alloBotTipText(terms[0]?.term || terms[0]?.word || terms[0]);
    if (word) add('tips.student_simplified_word', { word });
    if (topicName) add('tips.student_simplified_topic', { topic: topicName });
    if (!tips.length) add('tips.student_simplified_definition');
    add('tips.student_simplified_summary');
  } else if (activeView === 'glossary') {
    const terms = alloBotTipList(Array.isArray(data) ? data : data?.terms);
    const term1 = alloBotTipText(terms[0]?.term || terms[0]?.word || terms[0]);
    const term2 = alloBotTipText(terms[1]?.term || terms[1]?.word || terms[1]);
    if (term1) add('tips.student_glossary_term', { term: term1 });
    if (term1 && term2) add('tips.student_glossary_pair', { term1, term2 });
    if (!tips.length) add('tips.student_glossary_practice');
    add('tips.student_glossary_connection');
  } else if (activeView === 'quiz') {
    const count = alloBotTipList(data?.questions).length;
    if (count) add('tips.student_quiz_count', { count });
    add('tips.student_quiz_reasoning');
    add('tips.student_quiz_review');
  } else if (activeView === 'adventure') {
    if (topicName) add('tips.student_adventure_topic', { topic: topicName });
    add('tips.student_adventure_evidence');
    add('tips.student_adventure_inventory');
  } else if (activeView === 'timeline') {
    const count = alloBotTipList(data?.events || (Array.isArray(data) ? data : [])).length;
    if (count) add('tips.student_timeline_count', { count });
    add('tips.student_timeline_sequence');
  } else if (activeView === 'math') {
    const count = alloBotTipList(data?.problems || data?.equations || (Array.isArray(data) ? data : [])).length;
    if (count) add('tips.student_math_count', { count });
    else add('tips.student_math_steps');
  } else if (activeView === 'faq') {
    const count = alloBotTipList(data?.questions || (Array.isArray(data) ? data : [])).length;
    if (count) add('tips.student_faq_count', { count });
    else add('tips.student_faq_predict');
  } else if (activeView === 'outline') {
    const count = alloBotTipList(data?.sections || data?.outline).length;
    if (count) add('tips.student_outline_count', { count });
    else add('tips.student_outline_checkpoint');
  } else if (activeView === 'concept-sort') {
    const categoryCount = alloBotTipList(data?.categories).length;
    const itemCount = alloBotTipList(data?.items).length;
    if (categoryCount || itemCount) add('tips.student_concept_sort_counts', { itemCount, categoryCount });
    else add('tips.student_concept_sort_reason');
  } else if (activeView === 'sentence-frames' || activeView === 'scaffolds') {
    const count = alloBotTipList(data?.frames || (Array.isArray(data) ? data : [])).length;
    if (count) add('tips.student_scaffolds_count', { count });
    else add('tips.student_scaffolds_own_idea');
  } else if (activeView === 'analysis') {
    const count = alloBotTipList(data?.keyConcepts || data?.concepts).length;
    if (count) add('tips.student_analysis_count', { count });
    else add('tips.student_analysis_question');
  } else if (activeView === 'image') {
    if (topicName) add('tips.student_image_topic', { topic: topicName });
    else add('tips.student_image_notice');
  } else if (activeView === 'brainstorm') {
    const count = alloBotTipList(data?.activities || (Array.isArray(data) ? data : [])).length;
    if (count) add('tips.student_brainstorm_count', { count });
  } else if (activeView === 'persona') {
    const name = alloBotTipText(data?.name || data?.character?.name, 60);
    if (name) add('tips.student_persona_name', { name });
  } else if (activeView === 'dbq') {
    const count = alloBotTipList(data?.documents || data?.sources).length;
    if (count) add('tips.student_dbq_count', { count });
  } else if (activeView === 'note-taking' || activeView === 'anchor-chart') {
    const count = alloBotTipList(data?.sections || data?.notes || data?.templates).length;
    if (count) add(activeView === 'note-taking' ? 'tips.student_notes_count' : 'tips.student_anchor_chart_count', { count });
  } else if (activeView === 'lesson-plan') {
    if (topicName) add('tips.student_study_guide_topic', { topic: topicName });
  } else if (activeView === 'alignment-report' || activeView === 'alignment') {
    if (topicName) add('tips.student_alignment_topic', { topic: topicName });
  } else if (activeView === 'gemini-bridge') {
    if (topicName) add('tips.student_simulation_topic', { topic: topicName });
  } else if (activeView === 'word-sounds' || activeView === 'word-sounds-generator' || activeView === 'output') {
    const count = alloBotTipList(data?.words || data?.terms || (Array.isArray(data) ? data : [])).length;
    if (count) add('tips.student_word_sounds_count', { count });
  } else if (activeView === 'directions') {
    const count = alloBotTipList(data?.steps || data?.directions || data?.instructions).length;
    if (count) add('tips.student_directions_count', { count });
  } else if (activeView === 'readingBook' || activeView === 'readingSet') {
    const count = alloBotTipList(data?.books || data?.items || data?.pages || data?.chapters).length;
    if (count) add(activeView === 'readingBook' ? 'tips.student_reading_book_count' : 'tips.student_reading_set_count', { count });
  } else if (activeView === 'aac-board') {
    const count = alloBotAacChoiceCount(data);
    if (count) add('tips.student_aac_count', { count });
  } else if (activeView === 'fluency-record' || activeView === 'math-fluency-probe') {
    const accuracy = Number(data?.metrics?.accuracy ?? data?.accuracy);
    if (Number.isFinite(accuracy)) add('tips.student_fluency_accuracy', { accuracy: Math.round(accuracy) });
  } else if (String(activeView || '').endsWith('-config')) {
    const count = alloBotTipList(data?.vocabTerms || data?.practiceSet?.lesson?.vocabulary).length;
    const language = alloBotLinguaLanguage(data);
    if (count) add('tips.student_creative_vocab_count', { count });
    if (activeView === 'lingua-config' && language) add('tips.student_lingua_language', { language });
  } else if (String(activeView || '').endsWith('-submission')) {
    const wordCount = Number(data?.analytics?.totalWords) || alloBotWordCount(data?.text || data?.story || data?.sourceText);
    const lineCount = Number(data?.lineCount) || alloBotTipList(data?.lines).length;
    const language = alloBotLinguaLanguage(data);
    const activityCount = Array.isArray(data?.activity)
      ? data.activity.reduce((total, event) => total + Math.max(0, Number(event?.count || 0)), 0)
      : alloBotTipList(data?.events || data?.activityLog).length;
    if (wordCount) add('tips.student_story_word_count', { count: wordCount });
    else if (lineCount) add('tips.student_submission_line_count', { count: lineCount });
    if (activeView === 'lingua-submission' && language) {
      add(activityCount ? 'tips.student_lingua_record_context' : 'tips.student_lingua_record_language', { language, count: activityCount });
    }
  } else if (activeView === 'input' && resources.length) {
    const latestTitle = alloBotTipText(resources[resources.length - 1]?.title, 70);
    if (latestTitle) add('tips.student_recent_resource', { count: resources.length, title: latestTitle });
    else add('tips.student_input_choose');
  }

  if (!tips.length) {
    const coveredKey = STUDENT_IDLE_TIP_KEYS[activeView];
    if (coveredKey) add(coveredKey);
    if (!tips.length) {
      add('tips.student_fallback_explain');
      add('tips.student_fallback_progress');
    }
  }
  (STUDENT_DIVERSE_TIP_KEYS[activeView] || []).forEach(key => add(key));
  return [...new Set(tips)];
};

const buildEducatorIdleTips = ({ activeView, history, topic, t }) => {
  const tips = [];
  const add = (key, params) => {
    const message = t(key, params);
    if (typeof message === 'string' && message.trim()) tips.push(message);
  };
  const resources = (Array.isArray(history) ? history : []).filter(item => item && item.type);
  const current = latestAlloBotResource(resources, STUDENT_TIP_VIEW_ALIASES[activeView] || activeView);
  const data = current?.data;
  const topicName = alloBotTipText(topic || current?.topic || data?.topic || current?.title, 90);
  const resourceName = alloBotTipText(current?.title || activeView?.replace(/-/g, ' '), 70);

  if (activeView === 'quiz') {
    const count = alloBotTipList(data?.questions || (Array.isArray(data) ? data : [])).length;
    if (count) add('tips.educator_quiz_count', { count });
  } else if (activeView === 'glossary') {
    const count = alloBotTipList(Array.isArray(data) ? data : data?.terms).length;
    if (count) add('tips.educator_glossary_count', { count });
  } else if (activeView === 'dbq') {
    const count = alloBotTipList(data?.documents || data?.sources).length;
    if (count) add('tips.educator_document_count', { count });
  } else if (['outline', 'note-taking', 'anchor-chart', 'lesson-plan'].includes(activeView)) {
    const count = alloBotTipList(data?.sections || data?.outline || data?.notes || data?.templates).length;
    if (count) add('tips.educator_section_count', { count, resource: resourceName });
  } else if (activeView === 'concept-sort') {
    const categoryCount = alloBotTipList(data?.categories).length;
    const itemCount = alloBotTipList(data?.items).length;
    if (categoryCount || itemCount) add('tips.educator_sort_counts', { itemCount, categoryCount });
  } else if (activeView === 'readingSet') {
    const count = alloBotTipList(data?.books || data?.items).length;
    if (count) add('tips.educator_reading_set_count', { count });
  } else if (activeView === 'directions') {
    const count = alloBotTipList(data?.steps || data?.directions || data?.instructions).length;
    if (count) add('tips.educator_directions_count', { count });
  } else if (activeView === 'fluency-record' || activeView === 'math-fluency-probe') {
    const accuracy = Number(data?.metrics?.accuracy ?? data?.accuracy);
    if (Number.isFinite(accuracy)) add('tips.educator_fluency_accuracy', { accuracy: Math.round(accuracy) });
  } else if (activeView === 'aac-board') {
    const count = alloBotAacChoiceCount(data);
    if (count) add('tips.educator_aac_count', { count });
  } else if (String(activeView || '').endsWith('-config')) {
    const vocabularyCount = alloBotTipList(data?.vocabTerms || data?.practiceSet?.lesson?.vocabulary).length;
    const language = alloBotLinguaLanguage(data);
    if (vocabularyCount) add('tips.educator_creative_vocab_count', { count: vocabularyCount });
    if (activeView === 'lingua-config' && language) add('tips.educator_lingua_language', { language });
  } else if (String(activeView || '').endsWith('-submission')) {
    const wordCount = Number(data?.analytics?.totalWords) || alloBotWordCount(data?.text || data?.story || data?.sourceText);
    const lineCount = Number(data?.lineCount) || alloBotTipList(data?.lines).length;
    const language = alloBotLinguaLanguage(data);
    if (wordCount) add('tips.educator_story_word_count', { count: wordCount });
    else if (lineCount) add('tips.educator_submission_line_count', { count: lineCount });
    if (activeView === 'lingua-submission' && language) add('tips.educator_lingua_record_context', { language });
  } else if (activeView === 'input' && resources.length) {
    const latestTitle = alloBotTipText(resources[resources.length - 1]?.title, 70);
    if (latestTitle) add('tips.educator_recent_resource', { count: resources.length, title: latestTitle });
  }

  if (topicName && activeView !== 'input') add('tips.educator_topic_lens', { topic: topicName });
  (EDUCATOR_IDLE_TIP_KEYS[activeView] || []).forEach(key => add(key));
  if (!tips.length) {
    add('tips.educator_fallback_review');
    add('tips.educator_fallback_sequence');
  }
  return [...new Set(tips)];
};

const ALLOBOT_GENERATION_FAMILY_BY_TYPE = Object.freeze({
  analysis: 'analyze', 'alignment-report': 'analyze', dbq: 'analyze',
  outline: 'organize', 'lesson-plan': 'organize', 'note-taking': 'organize',
  'anchor-chart': 'organize', 'concept-sort': 'organize',
  simplified: 'clarify', glossary: 'clarify', 'sentence-frames': 'clarify',
  'word-sounds': 'clarify', 'word-sounds-generator': 'clarify', translation: 'clarify',
  quiz: 'assess', faq: 'assess',
  image: 'create', brainstorm: 'create', 'gemini-bridge': 'create',
  timeline: 'explore', adventure: 'explore', persona: 'interview',
  math: 'solve',
  chat: 'generic', source: 'generic', 'full-pack': 'generic', input: 'generic',
});

const alloBotGenerationFamily = (generationType, activeView) => {
  const explicit = String(generationType || '').trim().toLowerCase();
  const view = String(activeView || '').trim().toLowerCase();
  return ALLOBOT_GENERATION_FAMILY_BY_TYPE[explicit]
    || ALLOBOT_GENERATION_FAMILY_BY_TYPE[view]
    || 'generic';
};

// Pure side props can move to the opposite side when the bot is parked too
// close to a viewport edge. Headwear and mixed head/side outfits are excluded:
// translating those would detach the wearable portion from Allobot. Keeping the
// preferred side explicit also lets the face and nearest hand acknowledge the
// prop without guessing from SVG geometry.
const ALLOBOT_SIDE_ACCESSORY_SIDE = Object.freeze({
  microscope: 'left',
  historian: 'left',
  'teacher-stack': 'left',
  'persona-masks': 'left',
  'sentence-frames': 'right',
  'outline-doc': 'left',
  'sticky-notes': 'left',
  'anchor-easel': 'left',
  'behavior-watch': 'left',
  'choice-fan': 'left',
  'alignment-target': 'left',
  'wayfinder-sign': 'left',
  'question-cards': 'left',
  'test-prep-kit': 'left',
  'source-inbox': 'left',
  'progress-orbit': 'left',
  'maze-scroll': 'left',
  'resource-folder': 'left',
  'math-tools': 'left',
  gear: 'left',
  'game-pad': 'left',
});
const ALLOBOT_SIDE_ACCESSORY_ACCENT = Object.freeze({
  microscope: '#22D3EE',
  historian: '#F59E0B',
  'teacher-stack': '#EF4444',
  'persona-masks': '#A78BFA',
  'sentence-frames': '#EC4899',
  'outline-doc': '#6366F1',
  'sticky-notes': '#FACC15',
  'anchor-easel': '#22C55E',
  'behavior-watch': '#06B6D4',
  'choice-fan': '#8B5CF6',
  'alignment-target': '#F43F5E',
  'wayfinder-sign': '#F59E0B',
  'question-cards': '#A855F7',
  'test-prep-kit': '#F59E0B',
  'source-inbox': '#3B82F6',
  'progress-orbit': '#10B981',
  'maze-scroll': '#F97316',
  'resource-folder': '#EAB308',
  'math-tools': '#3B82F6',
  gear: '#94A3B8',
  'game-pad': '#EC4899',
});
// Keep the side-prop family equally readable at Allobot's usual 64px size.
// Wide/tall teaching aids retain their current footprint; compact controls get
// a small lift. The prop-facing transform origin preserves the handoff point
// beside the shell, so scaling grows away from Allobot rather than into it.
const ALLOBOT_SIDE_ACCESSORY_SCALE = Object.freeze({
  microscope: 1,
  historian: 1.06,
  'teacher-stack': 1.05,
  'persona-masks': 1.02,
  'sentence-frames': 1,
  'outline-doc': 1.04,
  'sticky-notes': 1.05,
  'anchor-easel': 1,
  'behavior-watch': 1.1,
  'choice-fan': 1.04,
  'alignment-target': 1.05,
  'wayfinder-sign': 1,
  'question-cards': 1.03,
  'test-prep-kit': 1.05,
  'source-inbox': 1.06,
  'progress-orbit': 1.05,
  'maze-scroll': 1.04,
  'resource-folder': 1.06,
  'math-tools': 1.03,
  gear: 1.1,
  'game-pad': 1.1,
});
// A small optical gap for silhouettes whose artwork naturally reaches the
// visor boundary. The sign is resolved from the rendered side, so edge-driven
// mirroring keeps the same separation on either side of Allobot.
const ALLOBOT_SIDE_ACCESSORY_GAP_NUDGE = Object.freeze({
  'persona-masks': 6,
  'sentence-frames': 10,
  'choice-fan': 2,
});
const ALLOBOT_AVATAR_WIDTH = 64;
const ALLOBOT_PROP_SAFE_GUTTER = 46;

const AlloBot = React.memo(React.forwardRef(({ mood = 'idle', accessory = null, holdingPointer = false, onReadMore, onClick, onVoiceSettingsClick, onMicClick, onToggleMute, onHide, isListening, isIdleDisabled = false, disableAnimations = false, stemLabTool = null, showStemLab = false, soundEnabled = false, selectedVoice, voiceSpeed = 1, voiceVolume = 1, onGenerateAudio, theme = 'light', colorOverlay = 'none', onSpeechEnd, onSpeechStart, activeView, generationType = null, generationProgress = null, generationError = null, generationStep = '', generationStage: generationStageSignal = null, generationBatchType = null, isFlying = false, isSystemAudioActive = false, history = [], isParentMode = false, isStudentMode = false, isEducatorMode = false, hasSeenBotIntro = true, onBotIntroSeen, topic, canPlayIntro = true, aimAt = null, idleSleepMs = 180000 }, ref) => {
  const motionDisabled = useAlloMotionDisabled(disableAnimations);
  const coarsePointer = useAlloCoarsePointer();
  // Touch build: always shown (there is no hover to reveal them with), pushed
  // further out so four 36px targets ring a 64px avatar without overlapping
  // each other, and never scaled down — scale-75 would drag a 36px target back
  // under the 24px WCAG 2.2 minimum.
  const satelliteBase = coarsePointer
      ? 'inline-flex min-h-9 min-w-9 items-center justify-center rounded-full shadow-md z-50 border-2 duration-200 focus:outline-none allobot-satellite-control'
      : 'inline-flex min-h-8 min-w-8 items-center justify-center rounded-full p-1.5 shadow-md opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity z-50 scale-75 hover:scale-100 duration-200 border-2 focus:opacity-100 focus:outline-none allobot-satellite-control';
  const satellitePos = {
      tl: coarsePointer ? 'absolute -top-2.5 -left-2.5 allobot-satellite--tl' : 'absolute -top-2 -left-2 allobot-satellite--tl',
      tr: coarsePointer ? 'absolute -top-2.5 -right-2.5 allobot-satellite--tr' : 'absolute -top-2 -right-2 allobot-satellite--tr',
      bl: coarsePointer ? 'absolute -bottom-2.5 -left-2.5 allobot-satellite--bl' : 'absolute -bottom-1 -left-2 allobot-satellite--bl',
      br: coarsePointer ? 'absolute -bottom-2.5 -right-2.5 allobot-satellite--br' : 'absolute -bottom-1 -right-2 allobot-satellite--br',
  };
  // A tap on one of these must not also start a drag. The container's
  // onTouchStart calls preventDefault() to own the gesture, and preventDefault
  // on touchstart cancels the browser's synthesised click outright — so every
  // tap on a satellite was swallowed before onClick could ever run. The
  // existing pointerdown/mousedown guards did not help: stopping propagation of
  // one event type says nothing about a different one. Stop touchstart here and
  // the container never sees it, so the tap resolves into a normal click.
  const stopTouch = (e) => e.stopPropagation();
  const satelliteIconSize = coarsePointer ? 16 : 12;
  const { t } = useContext(LanguageContext);
  const [position, setPosition] = useState(() => {
      try {
          const saved = safeGetItem('allo_bot_pos_v2');
          return saved ? JSON.parse(saved) : { x: 24, y: 20 };
      } catch(e) {
          return { x: 24, y: 20 };
      }
  });
  const [viewportWidth, setViewportWidth] = useState(() => {
      try { return typeof window !== 'undefined' ? window.innerWidth : 1024; } catch (e) { return 1024; }
  });
  useEffect(() => {
      if (typeof window === 'undefined') return undefined;
      const syncViewportWidth = () => setViewportWidth(window.innerWidth || 1024);
      syncViewportWidth();
      window.addEventListener('resize', syncViewportWidth);
      return () => window.removeEventListener('resize', syncViewportWidth);
  }, []);
  const [keyboardMoveStatus, setKeyboardMoveStatus] = useState('');
  const [isHovered, setIsHovered] = useState(false);
  const [pulseScale, setPulseScale] = useState(1);
  useEffect(() => {
      if (motionDisabled) {
          setPulseScale(1);
          return;
      }
      const pulseInterval = setInterval(() => {
          setPulseScale(prev => prev === 1 ? 1.02 : 1);
      }, 2000);
      return () => clearInterval(pulseInterval);
  }, [motionDisabled]);
  const [eyePosition, setEyePosition] = useState({ x: 0, y: 0 });
  const [visorPosition, setVisorPosition] = useState({ x: 0, y: 0 });
  const containerRef = useRef(null);
  const [isDocumentHidden, setIsDocumentHidden] = useState(() => {
      try { return typeof document !== 'undefined' && document.visibilityState === 'hidden'; } catch (e) { return false; }
  });
  const [isGenerationOffscreen, setIsGenerationOffscreen] = useState(false);
  const generationMotionPaused = isDocumentHidden || isGenerationOffscreen;
  useEffect(() => { try { var _bot = containerRef.current; var _svg = _bot && _bot.querySelector("svg"); if (!_svg || typeof _svg.pauseAnimations !== "function") return; try { if (motionDisabled) { _svg.pauseAnimations(); _svg.setCurrentTime(0); } else if (generationMotionPaused) { _svg.pauseAnimations(); } else { _svg.unpauseAnimations(); } } catch (e) {} } catch (e) {} }, [motionDisabled, generationMotionPaused]);
  useEffect(() => {
      if (typeof document === 'undefined') return undefined;
      const handleVisibilityChange = () => setIsDocumentHidden(document.visibilityState === 'hidden');
      document.addEventListener('visibilitychange', handleVisibilityChange);
      handleVisibilityChange();
      return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);
  useEffect(() => {
      const element = containerRef.current;
      if (!element || typeof IntersectionObserver === 'undefined') return undefined;
      const observer = new IntersectionObserver((entries) => {
          const entry = entries && entries[0];
          setIsGenerationOffscreen(!entry || !entry.isIntersecting || entry.intersectionRatio < 0.05);
      }, { threshold: [0, 0.05] });
      observer.observe(element);
      return () => observer.disconnect();
  }, []);
  // ── Flashlight aiming + muzzle reporting (2026-07-29) ──
  // The flashlight was drawn at a fixed rotate(45) no matter where the light was
  // supposed to be pointing, and nothing outside this component could find out
  // where the bot actually WAS — so the tour overlay had to guess the beam's
  // origin from the TARGET's rect instead of from the bot.
  //
  // The marker is placed at the flashlight's PIVOT, deliberately not inside the
  // rotated group: measuring the rotated lens would make the muzzle position a
  // function of the angle, and the angle a function of the muzzle position — a
  // feedback loop that wobbles. The pivot is ~7px behind the lens, which is
  // immaterial for a beam that travels hundreds of px.
  const flashPivotRef = useRef(null);
  const [aimAngle, setAimAngle] = useState(45);
  const _aimX = aimAt ? aimAt.x : null;
  const _aimY = aimAt ? aimAt.y : null;
  useEffect(() => {
      if (_aimX === null || _aimY === null) {
          setAimAngle(45);
          try { if (typeof window !== 'undefined') window.__alloBotMuzzle = null; } catch (e) {}
          return;
      }
      let timer = null;
      let stopped = false;
      const sample = () => {
          if (stopped) return;
          try {
              const el = flashPivotRef.current || containerRef.current;
              if (el && typeof el.getBoundingClientRect === 'function') {
                  const r = el.getBoundingClientRect();
                  const mx = r.left + r.width / 2;
                  const my = r.top + r.height / 2;
                  // The flashlight art points +y (straight down) unrotated, so
                  // rotate(theta) aims it along screen angle theta + 90.
                  const deg = (Math.atan2(_aimY - my, _aimX - mx) * 180 / Math.PI) - 90;
                  // Only re-render on a change worth seeing: the CSS position
                  // transition would otherwise setState every tick of the flight.
                  setAimAngle((prev) => (Math.abs(prev - deg) > 0.75 ? deg : prev));
                  if (typeof window !== 'undefined') window.__alloBotMuzzle = { x: mx, y: my, angle: deg };
              }
          } catch (e) {}
          // Re-sampled rather than computed once: the bot FLIES to its target
          // under a CSS transition, and the teacher can drag it mid-spotlight.
          timer = setTimeout(sample, 120);
      };
      sample();
      return () => { stopped = true; if (timer) clearTimeout(timer); };
  }, [_aimX, _aimY]);
  useEffect(() => {
      if (motionDisabled) {
          setEyePosition({ x: 0, y: 0 });
          setVisorPosition({ x: 0, y: 0 });
          return;
      }
      const handleMouseMove = (e) => {
          if (!containerRef.current) return;
          const rect = containerRef.current.getBoundingClientRect();
          const centerX = rect.left + rect.width / 2;
          const centerY = rect.top + rect.height / 2;
          const dx = e.clientX - centerX;
          const dy = e.clientY - centerY;
          const angle = Math.atan2(dy, dx);
          const distance = Math.hypot(dx, dy);
          const sensitivity = 100;
          const intensity = Math.min(1, distance / sensitivity);
          const maxVisorRadius = 1.5;
          const visorOffset = intensity * maxVisorRadius;
          setVisorPosition({
              x: Math.cos(angle) * visorOffset,
              y: Math.sin(angle) * visorOffset
          });
          const maxFeatureRadius = 3.5;
          const featureOffset = intensity * maxFeatureRadius;
          setEyePosition({
              x: Math.cos(angle) * featureOffset,
              y: Math.sin(angle) * featureOffset
          });
      };
      window.addEventListener('mousemove', handleMouseMove);
      return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [motionDisabled]);
  const [customMessage, setCustomMessage] = useState(null);
  const [isTruncated, setIsTruncated] = useState(false);
  const [isTalking, setIsTalking] = useState(false);
  const isTalkingRef = useRef(false);
  useEffect(() => { isTalkingRef.current = isTalking; }, [isTalking]);
  const [idleAnimation, setIdleAnimation] = useState(null);
  const [internalMood, setInternalMood] = useState(null);
  const effectiveMood = internalMood || mood;
  // SVG fragment identifiers resolve against the entire document, not just the
  // nearest <svg>. Scope every paint server and internal group to this React
  // instance so comparison previews (or any host rendering two AlloBots) cannot
  // borrow the first bot's mood/theme gradients.
  const svgPaintPrefix = `allobot-${React.useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
  const svgPaintIds = {
      body: `${svgPaintPrefix}-body-${effectiveMood}`,
      rim: `${svgPaintPrefix}-rim`,
      hologram: `${svgPaintPrefix}-hologram`,
      beam: `${svgPaintPrefix}-beam`,
      visor: `${svgPaintPrefix}-visor`,
      groundShadow: `${svgPaintPrefix}-ground-shadow`,
      heldItem: `${svgPaintPrefix}-held-item`,
      accessories: `${svgPaintPrefix}-accessories`,
  };
  const generationProgressCurrent = Number(generationProgress?.current);
  const generationProgressTotal = Number(generationProgress?.total);
  const generationProgressFraction = Number.isFinite(generationProgressCurrent)
      && Number.isFinite(generationProgressTotal)
      && generationProgressTotal > 0
      ? Math.min(1, Math.max(0, generationProgressCurrent / generationProgressTotal))
      : null;
  const generationProgressRingClass = generationProgressFraction === null
      ? 'animate-allobot-generation-progress'
      : 'allobot-generation-progress';
  const generationOutcome = generationError
      ? (/(?:cancel|abort)/i.test(String(generationError?.message || generationError)) ? 'cancelled' : 'error')
      : 'success';
  const isFullPackGeneration = String(generationBatchType || '').trim().toLowerCase() === 'full-pack';
  const generationHistorySignature = Array.isArray(history)
      ? history.slice(-32).map(item => `${item?.id || ''}:${item?.type || ''}:${item?.data == null ? 'empty' : 'ready'}`).join('|')
      : '';
  const generationStepText = String(generationStep || '').trim().toLowerCase();
  const normalizedGenerationStageSignal = ['analyze', 'build', 'finalize'].includes(String(generationStageSignal || '').trim().toLowerCase())
      ? String(generationStageSignal).trim().toLowerCase()
      : null;
  const generationStageFromStep = /finaliz|validat|finish|complete|ready|saving|publish|assembling|formatting/.test(generationStepText)
      ? 'finalize'
      : /generat|draft|adapt|translat|construct|design|brainstorm|create|build|render|compose|refin|write|visual/.test(generationStepText)
          ? 'build'
          : /analy|search|extract|inspect|plan|review|audit|verif|identif|categor|prepar|synthes|structure|solv/.test(generationStepText)
              ? 'analyze'
              : null;
  const generationStage = normalizedGenerationStageSignal || generationStageFromStep;
  const [generationPhase, setGenerationPhase] = useState(0);
  useEffect(() => {
      if (effectiveMood !== 'thinking' || motionDisabled) {
          setGenerationPhase(0);
          return undefined;
      }
      const phaseTimer = setInterval(() => {
          setGenerationPhase(previous => (previous + 1) % 3);
      }, 3200);
      return () => clearInterval(phaseTimer);
  }, [effectiveMood, motionDisabled]);
  const generationAnimationPhase = generationStage === 'analyze'
      ? 0
      : generationStage === 'build'
          ? 1
          : generationStage === 'finalize'
              ? 2
              : generationPhase;
  const generationProgressDasharray = generationProgressFraction === null
      ? ['18 82', '26 74', '12 88'][generationAnimationPhase]
      : '100 0';
  const [viseme, setViseme] = useState('neutral');
  const [blinkScale, setBlinkScale] = useState(1);
  const [accPop, setAccPop] = useState(false);
  const [completedGenerationFamily, setCompletedGenerationFamily] = useState(null);
  const [completedGenerationOutcome, setCompletedGenerationOutcome] = useState(null);
  const lastGenerationFamilyRef = useRef('generic');
  const generationHistoryBaselineRef = useRef('');
  const generationSessionActiveRef = useRef(false);
  const generationMilestoneActiveRef = useRef(false);
  const generationMilestoneSignatureRef = useRef('');
  const generationMilestoneTimerRef = useRef(null);
  const [displayedAccessory, setDisplayedAccessory] = useState(null);
  const [accExiting, setAccExiting] = useState(false);
  const prevMoodRef = useRef('idle');
  const [isSquashed, setIsSquashed] = useState(false);
  const [isSleeping, setIsSleeping] = useState(false);
  // speak() is a useCallback that must not be rebuilt every time the bot dozes
  // off — rebuilding it re-runs the ambient-tip effect that depends on it. A ref
  // lets the (stable) speak read the LIVE sleep state instead of a frozen one.
  const isSleepingRef = useRef(false);
  useEffect(() => { isSleepingRef.current = isSleeping; }, [isSleeping]);
  const [isPoofing, setIsPoofing] = useState(false);
  const [reactions, setReactions] = useState([]);
  const [bursts, setBursts] = useState([]);
  const [localIsFlying, setLocalIsFlying] = useState(false);
  const [isLanding, setIsLanding] = useState(false);
  const [moveDuration, setMoveDuration] = useState(700);
  const [isCelebrating, setIsCelebrating] = useState(false);
  const speechGenerationRef = useRef(0);
   const speechRequestAbortRef = useRef(null);
  const prevDragPos = useRef({ x: 0, y: 0 });
  const [dragRotation, setDragRotation] = useState(0);
  const [velocity, setVelocity] = useState({ dx: 0, dy: 0 });
  const lastPosRef = useRef({ x: position.x, y: position.y, time: Date.now() });
  const velocityTimerRef = useRef(null);
  useEffect(() => {
      if (motionDisabled) {
          setVelocity({ dx: 0, dy: 0 });
          lastPosRef.current = { x: position.x, y: position.y, time: Date.now() };
          return;
      }
      const now = Date.now();
      const dt = Math.max(1, now - lastPosRef.current.time);
      const dx = ((position.x - lastPosRef.current.x) / dt) * 10;
      const dy = ((position.y - lastPosRef.current.y) / dt) * 10;
      setVelocity({ dx, dy });
      lastPosRef.current = { x: position.x, y: position.y, time: now };
      if (velocityTimerRef.current) clearTimeout(velocityTimerRef.current);
      velocityTimerRef.current = setTimeout(() => {
          setVelocity({ dx: 0, dy: 0 });
      }, 100);
      return () => clearTimeout(velocityTimerRef.current);
  }, [position, motionDisabled]);
  const [antennaAction, setAntennaAction] = useState(null);
  const [wobbleState, setWobbleState] = useState({ active: false, deg: 0 });
  const lastRotationRef = useRef(0);
  const isFlightActive = !motionDisabled && (isFlying || localIsFlying);
  useEffect(() => {
    if (isFlying && motionDisabled) {
      setLocalIsFlying(false);
      setIsLanding(false);
      setMoveDuration(0);
      return;
    }
    if (isFlying && !isSleeping) {
      // Fly from bottom-left to resting position over 2s
      const startX = 5;
      const startY = 90;
      const endX = position.x || 24;
      const endY = position.y || 20;
      setPosition({ x: startX, y: startY });
      setLocalIsFlying(true);
      setMoveDuration(2000);
      const flyTimer = setTimeout(() => {
        setPosition({ x: endX, y: endY });
        setTimeout(() => {
          setLocalIsFlying(false);
          setIsLanding(true);
          setTimeout(() => setIsLanding(false), 600);
        }, 2000);
      }, 100);
      return () => clearTimeout(flyTimer);
    }
  }, [isFlying, motionDisabled]);
  const getHeldItem = () => {
      if (holdingPointer) return 'flashlight';
      if (isFlightActive || isSleeping) return null;
      switch (activeView) {
          case 'math': return 'calculator';
          case 'math-fluency-maze': return 'calculator';
          case 'adventure': return 'map';
          case 'quiz': return 'pencil';
          case 'sentence-frames': return 'pencil';
          case 'analysis': return 'magnifying-glass';
          case 'lesson-plan': return 'clipboard';
          case 'timeline': return 'hourglass';
          case 'glossary': return 'globe';
          case 'brainstorm': return 'wand';
          case 'gemini-bridge': return 'wand';
          case 'image': return 'paintbrush';
          case 'simplified': return 'book';
          case 'concept-sort': return 'pointer';
          case 'behavior-lens': return 'clipboard';
          case 'dbq': return 'pencil';
          case 'storyforge-config': return 'book';
          case 'storyforge-submission': return 'book';
          default: return null;
      }
  };
  const heldItem = getHeldItem();
  const antennaRotation = Math.max(-20, Math.min(20, velocity.dx * 2.5));
  const propRotation = Math.max(-15, Math.min(15, velocity.dx * 1.5));
  const isMoving = Math.abs(velocity.dx) > 0.5;
  if (Math.abs(antennaRotation) > 1) {
      lastRotationRef.current = antennaRotation;
  }
  useEffect(() => {
      if (motionDisabled) {
          setWobbleState({ active: false, deg: 0 });
          lastRotationRef.current = 0;
          return;
      }
      if (!isMoving && Math.abs(lastRotationRef.current) > 2 && !wobbleState.active) {
           setWobbleState({ active: true, deg: lastRotationRef.current });
           const timer = setTimeout(() => {
               setWobbleState({ active: false, deg: 0 });
               lastRotationRef.current = 0;
           }, 500);
           return () => clearTimeout(timer);
      }
  }, [isMoving, motionDisabled]);
  const speechTimeoutRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const startPosRef = useRef({ x: 0, y: 0 });
  const currentAudioRef = useRef(null);
  const audioPlaybackStartedRef = useRef(false);
  const lastAudioUrlRef = useRef(null);
  const authFailedRef = useRef(false);
  const soundEnabledRef = useRef(soundEnabled);
  useEffect(() => {
      soundEnabledRef.current = soundEnabled;
      if (!soundEnabled) {
          const wasPlaying = audioPlaybackStartedRef.current;
          audioPlaybackStartedRef.current = false;
          try { speechRequestAbortRef.current?.abort(); } catch (_) {}
          if (currentAudioRef.current) {
              try { currentAudioRef.current.pause(); } catch (_) {}
              currentAudioRef.current = null;
          }
          if (lastAudioUrlRef.current) {
              releaseAlloBotAudioUrl(lastAudioUrlRef.current);
              lastAudioUrlRef.current = null;
          }
          cancelAlloBotBrowserSpeech();
          setIsTalking(false);
          if (wasPlaying && onSpeechEnd) onSpeechEnd();
      }
  }, [soundEnabled, onSpeechEnd]);
  // Hiding the bot unmounts it outright — from the header toggle, from the "X",
  // or from a view swap. An <audio> element that is merely dropped keeps playing
  // to the end, so a bot dismissed mid-sentence would go on narrating with
  // nothing on screen to stop it. Runs on unmount only.
  useEffect(() => () => {
      const wasPlaying = audioPlaybackStartedRef.current;
      audioPlaybackStartedRef.current = false;
      try { speechRequestAbortRef.current?.abort(); } catch (_) {}
      if (currentAudioRef.current) {
          try { currentAudioRef.current.pause(); } catch (_) {}
          currentAudioRef.current = null;
      }
      if (lastAudioUrlRef.current) {
          releaseAlloBotAudioUrl(lastAudioUrlRef.current);
          lastAudioUrlRef.current = null;
      }
      if (speechTimeoutRef.current) clearTimeout(speechTimeoutRef.current);
      cancelAlloBotBrowserSpeech();
      if (wasPlaying && onSpeechEnd) onSpeechEnd();
  }, [onSpeechEnd]);
  useEffect(() => {
      try { safeSetItem('allo_bot_pos_v2', JSON.stringify(position)); } catch(e) { warnLog('localStorage write failed', e); }
  }, [position]);
  useEffect(() => {
      let timer, innerTimer;
      const scheduleBlink = () => {
          const delay = 3000 + Math.random() * 3000;
          timer = setTimeout(() => {
              setBlinkScale(0.1);
              innerTimer = setTimeout(() => {
                  setBlinkScale(1);
                  scheduleBlink();
              }, 150);
          }, delay);
      };
      if (isSleeping || motionDisabled) {
          setBlinkScale(1);
          return () => {
              clearTimeout(timer);
              clearTimeout(innerTimer);
          };
      }
      scheduleBlink();
      return () => {
          clearTimeout(timer);
          clearTimeout(innerTimer);
      };
  }, [isSleeping, motionDisabled]);
  useEffect(() => {
      if (effectiveMood === 'thinking') {
          if (!generationSessionActiveRef.current) {
              generationSessionActiveRef.current = true;
              generationHistoryBaselineRef.current = generationHistorySignature;
          }
          return;
      }
      generationSessionActiveRef.current = false;
  }, [effectiveMood, generationHistorySignature]);
  useEffect(() => {
      // Full Pack keeps AlloBot in the thinking state across several resources.
      // Show a short family-specific handoff each time a ready resource lands,
      // while leaving single-resource generations to their normal final cue.
      if (effectiveMood !== 'thinking') {
          generationMilestoneActiveRef.current = false;
          generationMilestoneSignatureRef.current = '';
          if (generationMilestoneTimerRef.current) {
              clearTimeout(generationMilestoneTimerRef.current);
              generationMilestoneTimerRef.current = null;
          }
          return;
      }
      if (!isFullPackGeneration) {
          generationMilestoneActiveRef.current = false;
          generationMilestoneSignatureRef.current = generationHistorySignature;
          if (generationMilestoneTimerRef.current) {
              clearTimeout(generationMilestoneTimerRef.current);
              generationMilestoneTimerRef.current = null;
          }
          return;
      }
      if (!generationMilestoneActiveRef.current) {
          generationMilestoneActiveRef.current = true;
          generationMilestoneSignatureRef.current = generationHistorySignature;
          return;
      }
      if (generationMilestoneSignatureRef.current === generationHistorySignature) return;
      generationMilestoneSignatureRef.current = generationHistorySignature;
      const latestResource = Array.isArray(history) ? history[history.length - 1] : null;
      if (!latestResource || !latestResource.id || latestResource.data == null) return;
      setCompletedGenerationFamily(alloBotGenerationFamily(latestResource.type, activeView));
      setCompletedGenerationOutcome('success');
      setAccPop(true);
      if (generationMilestoneTimerRef.current) clearTimeout(generationMilestoneTimerRef.current);
      generationMilestoneTimerRef.current = setTimeout(() => {
          setAccPop(false);
          setCompletedGenerationFamily(null);
          setCompletedGenerationOutcome(null);
          generationMilestoneTimerRef.current = null;
      }, 650);
  }, [effectiveMood, isFullPackGeneration, generationHistorySignature, history, activeView]);
  useEffect(() => {
      if (effectiveMood !== 'thinking') return;
      lastGenerationFamilyRef.current = alloBotGenerationFamily(generationType, activeView);
      setAccPop(false);
      setCompletedGenerationFamily(null);
      setCompletedGenerationOutcome(null);
  }, [effectiveMood, generationType, activeView]);
  useEffect(() => {
      // One-shot accessory "pop" when generation finishes (thinking -> not thinking).
      const prev = prevMoodRef.current;
      prevMoodRef.current = effectiveMood;
      const hasVisibleResource = generationHistoryBaselineRef.current !== generationHistorySignature;
      if (prev === 'thinking' && effectiveMood !== 'thinking' && !isSleeping
          && (generationOutcome !== 'success' || hasVisibleResource)) {
          setCompletedGenerationFamily(lastGenerationFamilyRef.current || 'generic');
          setCompletedGenerationOutcome(generationOutcome);
          setAccPop(true);
          const t = setTimeout(() => {
              setAccPop(false);
              setCompletedGenerationFamily(null);
              setCompletedGenerationOutcome(null);
          }, 650);
          return () => clearTimeout(t);
      }
  }, [effectiveMood, isSleeping, generationHistorySignature, generationOutcome]);
  useEffect(() => {
      if (!isTalking || motionDisabled) {
          setViseme('neutral');
          return;
      }
      const mouthShapes = ['o', 'd', 'dash', 'd', 'o'];
      let index = 0;
      const interval = setInterval(() => {
          setViseme(mouthShapes[index]);
          index = (index + 1) % mouthShapes.length;
          if (Math.random() > 0.8) index = (index + 1) % mouthShapes.length;
      }, 120);
      return () => clearInterval(interval);
  }, [isTalking, motionDisabled]);
  useEffect(() => {
      if (isSleeping || motionDisabled || isFlightActive || effectiveMood === 'thinking') {
          setAntennaAction(null);
          return;
      }
      const timer = setInterval(() => {
          if (Math.random() > 0.3) return;
          const actionRoll = Math.random();
          if (actionRoll < 0.5) {
              setAntennaAction('bounce');
              setTimeout(() => setAntennaAction(null), 1900);
          } else {
              setAntennaAction('signal');
              setTimeout(() => setAntennaAction(null), 4000);
          }
      }, 5000);
      return () => clearInterval(timer);
  }, [isSleeping, motionDisabled, isFlightActive, effectiveMood]);
  useEffect(() => {
      if (isFlightActive && soundEnabled && !isGlobalMuted()) {
          try {
              const ctx = getGlobalAudioContext();
              if (!ctx) return;
              if (ctx.state === 'suspended') {
                  ctx.resume();
              }
              const now = ctx.currentTime;
              const bufferSize = ctx.sampleRate * 2.0;
              const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
              const data = buffer.getChannelData(0);
              for (let i = 0; i < bufferSize; i++) {
                  data[i] = Math.random() * 2 - 1;
              }
              const noise = ctx.createBufferSource();
              noise.buffer = buffer;
              const noiseFilter = ctx.createBiquadFilter();
              noiseFilter.type = 'lowpass';
              noiseFilter.frequency.setValueAtTime(2000, now);
              noiseFilter.frequency.exponentialRampToValueAtTime(100, now + 1.2);
              const noiseGain = ctx.createGain();
              noiseGain.gain.setValueAtTime(0.01, now);
              noiseGain.gain.linearRampToValueAtTime(0.1, now + 0.1);
              noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 1.2);
              noise.connect(noiseFilter);
              noiseFilter.connect(noiseGain);
              noiseGain.connect(ctx.destination);
              noise.start(now);
              noise.stop(now + 1.3);
              const osc = ctx.createOscillator();
              osc.type = 'triangle';
              osc.frequency.setValueAtTime(200, now);
              osc.frequency.linearRampToValueAtTime(60, now + 1.2);
              const oscGain = ctx.createGain();
              oscGain.gain.setValueAtTime(0.01, now);
              oscGain.gain.linearRampToValueAtTime(0.05, now + 0.1);
              oscGain.gain.exponentialRampToValueAtTime(0.001, now + 1.0);
              osc.connect(oscGain);
              oscGain.connect(ctx.destination);
              osc.start(now);
              osc.stop(now + 1.3);
          } catch (e) {
              warnLog("Flight sound error", e);
          }
      }
  }, [isFlightActive, soundEnabled]);
  useEffect(() => {
      return () => {
           try { speechRequestAbortRef.current?.abort(); } catch (_) {}
          if (currentAudioRef.current) {
              currentAudioRef.current.pause();
          }
          if (lastAudioUrlRef.current) {
              releaseAlloBotAudioUrl(lastAudioUrlRef.current);
          }
      };
  }, []);
  const moveTo = useCallback((targetX, targetY, duration = 1000) => {
      if (isSleeping) return;
      const newRight = window.innerWidth - targetX - 32;
      const newTop = Math.max(10, targetY);
      if (motionDisabled) {
          setMoveDuration(0);
          setLocalIsFlying(false);
          setIsLanding(false);
          setPosition({
              x: Math.max(10, newRight),
              y: newTop
          });
          return;
      }
      setMoveDuration(duration);
      setLocalIsFlying(true);
      setIsLanding(false);
      setPosition({
          x: Math.max(10, newRight),
          y: newTop
      });
      setTimeout(() => {
          setLocalIsFlying(false);
          setIsLanding(true);
          setTimeout(() => setIsLanding(false), 1000);
      }, duration);
  }, [isSleeping, motionDisabled]);
  const triggerReaction = useCallback((emoji) => {
      if (motionDisabled) return;
      const id = Date.now() + Math.random();
      setReactions(prev => [...prev, { id, emoji }]);
      if (emoji === '🎉') {
          const burstId = Date.now() + Math.random();
          setBursts(prev => [...prev, { id: burstId }]);
      }
  }, [motionDisabled]);
  const speak = useCallback(async (text, isSilent = false) => {
      const safeText = (text || "").toString();
      // ── Asleep means SILENT ──────────────────────────────────────────────
      // Leaving the app open used to let the bot talk to an empty room: the
      // inactivity fallback below speaks a tip aloud after 5 minutes of no
      // input, and any late-arriving host callback would fire whenever it
      // resolved. Once the bot has dozed off, nothing gets a voice — and this
      // deliberately does NOT wake it, unlike the code further down that used
      // to clear isSleeping on every utterance. Real user activity wakes the
      // bot (see the idle watcher), so anything still calling speak() while
      // it sleeps is by definition unattended background chatter.
      if (isSleepingRef.current) {
          debugLog("AlloBot: asleep — suppressing speech:", safeText.slice(0, 60));
          return;
      }
      const now = Date.now();
      if (!isSilent && safeText === lastGlobalSpeech.text && (now - lastGlobalSpeech.time) < 2000) {
          warnLog("AlloBot: Suppressing duplicate speech:", safeText);
          return;
      }
      if (!isSilent) {
          lastGlobalSpeech.text = safeText;
          lastGlobalSpeech.time = now;
      }
      // Superseding audible speech is a real end transition. Notify the host
      // before preparing the replacement, then make every late callback from
      // the old generation harmless below.
      if (audioPlaybackStartedRef.current) {
          audioPlaybackStartedRef.current = false;
          setIsTalking(false);
          if (onSpeechEnd) onSpeechEnd();
      }
      speechGenerationRef.current += 1;
       try { speechRequestAbortRef.current?.abort(); } catch (_) {}
       const speechRequestController = typeof AbortController !== 'undefined' ? new AbortController() : null;
       speechRequestAbortRef.current = speechRequestController;
      const myGenId = speechGenerationRef.current;
      audioPlaybackStartedRef.current = false;
      if (currentAudioRef.current) {
          currentAudioRef.current.pause();
          currentAudioRef.current = null;
      }
      if (lastAudioUrlRef.current) {
          releaseAlloBotAudioUrl(lastAudioUrlRef.current);
          lastAudioUrlRef.current = null;
      }
      if (speechTimeoutRef.current) clearTimeout(speechTimeoutRef.current);
      // Only our own previous line, not whatever else the app is narrating.
      cancelAlloBotBrowserSpeech();
      if (!motionDisabled) {
          setWobbleState({ active: true, deg: 3 });
          setTimeout(() => setWobbleState({ active: false, deg: 0 }), 200);
      }
      let cleanText = safeText
          .replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1')
          .replace(/\[?⁽[⁰¹²³⁴⁵⁶⁷⁸⁹]+⁾\]?/g, '')   // superscript citations ⁽³⁾
          .replace(/\[Source\s+\d+\]/gi, '')            // [Source N] markers
          .replace(/\[\d+\]/g, '')                      // [1] numeric refs
          .replace(/\*\*/g, '')
          .replace(/\*/g, '')
          .replace(/__|\_/g, '')
          .replace(/^#+\s/gm, '')
          .replace(/`/g, '')
          .replace(/\s+/g, ' ')
          .trim();
      const ttsText = cleanText;
      const lower = cleanText.toLowerCase();
      let detectedMood = null;
      if (/\b(great|success|correct|awesome|good job|yay|perfect|excellent|congrats)\b/.test(lower)) {
          detectedMood = 'happy';
      } else if (/\b(error|sorry|failed|wrong|incorrect|oops|unable|sad|apologize)\b/.test(lower)) {
          detectedMood = 'sad';
      }
      if (detectedMood) setInternalMood(detectedMood);
      const limit = 150;
      let truncated = false;
      if (cleanText.length > limit) {
          cleanText = cleanText.substring(0, limit).trim() + "...";
          truncated = true;
      }
      setCustomMessage(cleanText);
      setIsTruncated(truncated);
      let speechStarted = false;
      let stateReset = false;
      const markSpeechStarted = () => {
          if (stateReset || speechStarted || myGenId !== speechGenerationRef.current) return false;
          speechStarted = true;
          audioPlaybackStartedRef.current = true;
          setIsTalking(true);
          if (onSpeechStart) onSpeechStart();
          return true;
      };
      const resetState = () => {
          if (stateReset) return;
          stateReset = true;
          if (myGenId !== speechGenerationRef.current) return;
          setCustomMessage(null);
          setIsTruncated(false);
          setInternalMood(null);
          setIsTalking(false);
          audioPlaybackStartedRef.current = false;
          currentAudioRef.current = null;
          if (speechRequestAbortRef.current === speechRequestController) speechRequestAbortRef.current = null;
          if (speechStarted && onSpeechEnd) onSpeechEnd();
      };
      let audioStarted = false;
      const configuredVolume = Math.max(0, Math.min(1, Number.isFinite(Number(voiceVolume)) ? Number(voiceVolume) : 1));
      const reportPlaybackFailure = (message) => {
          warnLog(message);
          try {
              const toast = window.__alloAddToast || (window.AlloFlowUX && window.AlloFlowUX.toast);
              if (typeof toast === 'function') toast(message, 'warning');
          } catch (_) {}
      };
      if (!isSilent && soundEnabledRef.current && !authFailedRef.current && configuredVolume > 0) {
          let cloudSuccess = false;
          let browserQueued = false;
          const playBrowserFallback = () => {
              if (browserQueued || stateReset || myGenId !== speechGenerationRef.current || isGlobalMuted() || isAlloBotTtsOff()) return false;
              try {
                  if (!window.speechSynthesis || typeof SpeechSynthesisUtterance !== 'function' || !ttsText) return false;
                  cancelAlloBotBrowserSpeech();
                  const utter = new SpeechSynthesisUtterance(ttsText);
                  let browserStarted = false;
                  browserQueued = true;
                  utter.rate = Math.max(0.1, Math.min(10, Number(voiceSpeed) || 1));
                  utter.volume = configuredVolume;
                  const browserLanguage = document?.documentElement?.lang || navigator?.language || '';
                  if (browserLanguage) utter.lang = browserLanguage;
                  try {
                      const baseLanguage = String(browserLanguage).toLowerCase().split('-')[0];
                      const voices = window.speechSynthesis.getVoices?.() || [];
                      const matchingVoice = voices.find(v => String(v.lang || '').toLowerCase().split('-')[0] === baseLanguage);
                      if (matchingVoice) utter.voice = matchingVoice;
                  } catch (_) {}
                  utter.onstart = () => {
                      browserStarted = true;
                      markSpeechStarted();
                  };
                  utter.onend = () => { alloBotReleaseBrowserSpeech(); resetState(); };
                  utter.onerror = () => {
                      alloBotReleaseBrowserSpeech();
                      reportPlaybackFailure("AlloBot couldn't play the spoken response. Check Voice volume and your device audio output.");
                      resetState();
                  };
                  alloBotClaimBrowserSpeech();
                  window.speechSynthesis.speak(utter);
                  audioStarted = true;
                  cloudSuccess = true;
                  setTimeout(() => {
                      if (stateReset || browserStarted || myGenId !== speechGenerationRef.current) return;
                      cancelAlloBotBrowserSpeech();
                      reportPlaybackFailure("AlloBot's device voice did not start. Check Voice volume and your device audio output.");
                      resetState();
                  }, 8000);
                  debugLog("AlloBot: Using browser TTS fallback");
                  return true;
              } catch (fallbackErr) {
                  warnLog("AlloBot: Browser TTS fallback failed:", fallbackErr);
                  return false;
              }
          };
          debugLog("AlloBot Speak Debug:", {
              hasOnGenerate: !!onGenerateAudio,
              voice: selectedVoice,
              textLen: ttsText.length
          });
          if (onGenerateAudio) {
              const _hasKokoro = !!window._kokoroTTS;
              const attemptTTS = async () => {
                  const timeoutMs = _hasKokoro ? 90000 : 20000;
                  debugLog(`🎤 AlloBot TTS request (${timeoutMs}ms timeout, kokoro=${_hasKokoro})...`);
                  let timeoutId = null;
                  let timedOut = false;
                  const timeoutPromise = new Promise((resolve) => {
                      timeoutId = setTimeout(() => {
                          timedOut = true;
                          try { speechRequestController?.abort(); } catch (_) {}
                          resolve(null);
                      }, timeoutMs);
                  });
                  const language = document?.documentElement?.lang || navigator?.language || 'English';
                  const audioPromise = Promise.resolve(onGenerateAudio(ttsText, selectedVoice, voiceSpeed, {
                      maxRetries: 0,
                      signal: speechRequestController?.signal || null,
                      language,
                      priority: 'interactive',
                      reason: 'allobot-speech',
                  }));
                  audioPromise.then((lateUrl) => {
                      if (timedOut) releaseAlloBotAudioUrl(lateUrl);
                  }, () => {});
                  try { return await Promise.race([audioPromise, timeoutPromise]); }
                  finally { if (timeoutId) clearTimeout(timeoutId); }
              };
              try {
                  let audioUrl = await attemptTTS();
                  if (speechRequestAbortRef.current === speechRequestController) speechRequestAbortRef.current = null;
                  if (!audioUrl) {
                      console.warn("[TTS] Generated AlloBot audio unavailable — using the active fallback policy.");
                  } else {
                      debugLog("onGenerateAudio returned: URL Present");
                  }
                  if (myGenId !== speechGenerationRef.current) {
                      releaseAlloBotAudioUrl(audioUrl);
                      return;
                  }
                  if (!soundEnabledRef.current) {
                      releaseAlloBotAudioUrl(audioUrl);
                      setIsTalking(false);
                      resetState();
                      return;
                  }
                  if (audioUrl) {
                      lastAudioUrlRef.current = audioUrl;
                      const audio = new Audio(audioUrl);
                      audio.playbackRate = voiceSpeed;
                      audio.volume = configuredVolume;
                      currentAudioRef.current = audio;
                      let generatedStarted = false;
                      if (window._kokoroTTS && window._kokoroTTS.chainPlay) {
                          window._kokoroTTS.chainPlay(audio, voiceSpeed, voiceVolume, resetState);
                      } else {
                          audio.onended = resetState;
                      }
                      const handleAudioError = (e) => {
                           if (stateReset || myGenId !== speechGenerationRef.current) return;
                           warnLog("Bot audio error/interrupted", e);
                            const shouldInvalidate = !e || (e.name !== 'NotAllowedError' && e.name !== 'AbortError');
                            if (shouldInvalidate) {
                                try { window.__alloInvalidateTtsUrl?.(audioUrl); } catch (_) {}
                                if (lastAudioUrlRef.current === audioUrl) lastAudioUrlRef.current = null;
                            }
                           if (currentAudioRef.current === audio) currentAudioRef.current = null;
                           try { audio.pause(); } catch (_) {}
                           if (!playBrowserFallback()) {
                               reportPlaybackFailure("AlloBot couldn't play the generated voice. Check Voice volume and your device audio output.");
                               resetState();
                           }
                      };
                      audio.onerror = handleAudioError;
                      audio.onplaying = () => {
                          generatedStarted = true;
                          markSpeechStarted();
                      };
                      await audio.play().then(() => {
                          cloudSuccess = true;
                          audioStarted = true;
                          setTimeout(() => {
                              if (stateReset || generatedStarted || myGenId !== speechGenerationRef.current || currentAudioRef.current !== audio) return;
                              handleAudioError(new Error('Generated AlloBot audio accepted play() but never started'));
                          }, 8000);
                      }).catch(handleAudioError);
                  }
              } catch (e) {
                  warnLog("⚠️ Generated AlloBot audio failed; device voice may be used:", e?.message);
              }
          }
          if (!cloudSuccess && myGenId === speechGenerationRef.current && !isGlobalMuted() && !isAlloBotTtsOff()) {
              if (!playBrowserFallback()) {
              // Browser TTS fallback — a completed/failed local request is no
              // longer "on the way", so merely having a loader must not suppress it.
              try {
                  if (window.speechSynthesis && ttsText && ttsText.length > 0) {
                      cancelAlloBotBrowserSpeech();
                      const utter = new SpeechSynthesisUtterance(ttsText);
                      utter.rate = Math.max(0.1, Math.min(10, Number(voiceSpeed) || 1));
                      utter.volume = Math.max(0, Math.min(1, Number.isFinite(Number(voiceVolume)) ? Number(voiceVolume) : 1));
                      const browserLanguage = document?.documentElement?.lang || navigator?.language || '';
                      if (browserLanguage) utter.lang = browserLanguage;
                      try {
                          const baseLanguage = String(browserLanguage).toLowerCase().split('-')[0];
                          const voices = window.speechSynthesis.getVoices?.() || [];
                          const matchingVoice = voices.find(v => String(v.lang || '').toLowerCase().split('-')[0] === baseLanguage);
                          if (matchingVoice) utter.voice = matchingVoice;
                      } catch (_) {}
                      utter.onend = () => { alloBotReleaseBrowserSpeech(); resetState(); };
                      utter.onerror = () => { alloBotReleaseBrowserSpeech(); resetState(); };
                      alloBotClaimBrowserSpeech();
                      window.speechSynthesis.speak(utter);
                      audioStarted = true;
                      cloudSuccess = true;
                      debugLog("AlloBot: Using browser TTS fallback");
                  } else {
                      warnLog("AlloBot: No browser TTS available — text bubble only");
                      setIsTalking(false);
                  }
              } catch (fallbackErr) {
                  warnLog("AlloBot: Browser TTS fallback failed:", fallbackErr);
                  setIsTalking(false);
              }
              }
          }
      } else if (!isSilent && soundEnabledRef.current && configuredVolume <= 0) {
          reportPlaybackFailure("AlloBot voice volume is set to zero. Raise Voice volume in Settings to hear responses.");
      }
      if (!audioStarted) {
          const duration = Math.min(90000, 4000 + (cleanText.length * 80));
          speechTimeoutRef.current = setTimeout(resetState, duration);
      }
  }, [selectedVoice, voiceSpeed, voiceVolume, onGenerateAudio, motionDisabled, onSpeechStart, onSpeechEnd]);
  const handleTypingState = useCallback((isTyping) => {
    if (isTyping) { setIsTalking(true); }
    else if (!audioPlaybackStartedRef.current) { setIsTalking(false); }
  }, []);
  // Wake writes the ref BEFORE the state. speak() reads isSleepingRef, and the
  // effect that syncs the ref does not run until after this render commits — so
  // a caller that wakes and immediately speaks (summon does exactly that) would
  // otherwise be silenced by its own stale "still asleep" reading.
  const wake = useCallback(() => {
      isSleepingRef.current = false;
      setIsSleeping(false);
  }, []);
  const summon = useCallback(() => {
      const now = Date.now();
      if (now - lastSummonTimeRef.current < 2000) return;
      lastSummonTimeRef.current = now;
      // Deliberately does NOT snap back to the default corner any more. Sleep
      // used to be something you asked for, so springing the bot back to its
      // home spot on wake was harmless; now that it dozes off on its own every
      // few idle minutes, that snap would keep stealing the position a teacher
      // dragged it to. Position is clamped on drag, so it is always reachable.
      wake();
      if (!motionDisabled) { setIdleAnimation('wave-hello'); setTimeout(() => setIdleAnimation(null), 1500); }
      speak(t('bot.summon_msg'));
  }, [speak, t, motionDisabled, wake]);
  // Refusing the NEXT request is not enough on its own: a 90s Kokoro clip that
  // started before the idle timer fired keeps narrating to an empty room, and a
  // bot dismissed mid-sentence keeps talking after it is gone. Both paths cut
  // the audio that is already in the air.
  const silenceSpeech = useCallback(() => {
      setCustomMessage(null);
      setIsTruncated(false);
      const wasPlaying = audioPlaybackStartedRef.current;
      setIsTalking(false);
      audioPlaybackStartedRef.current = false;
      try { speechRequestAbortRef.current?.abort(); } catch (_) {}
      speechRequestAbortRef.current = null;
      if (currentAudioRef.current) {
          try { currentAudioRef.current.pause(); } catch (_) {}
          currentAudioRef.current = null;
      }
      if (lastAudioUrlRef.current) {
          releaseAlloBotAudioUrl(lastAudioUrlRef.current);
          lastAudioUrlRef.current = null;
      }
      if (speechTimeoutRef.current) { clearTimeout(speechTimeoutRef.current); speechTimeoutRef.current = null; }
      cancelAlloBotBrowserSpeech();
      if (wasPlaying && onSpeechEnd) onSpeechEnd();
  }, [onSpeechEnd]);
  const fallAsleep = useCallback(() => {
      if (isSleepingRef.current) return;
      isSleepingRef.current = true;
      setIsSleeping(true);
      silenceSpeech();
  }, [silenceSpeech]);
  // The corner "X" now retires the bot outright rather than parking a greyed-out
  // sleeping copy on screen: "close" that leaves the thing visible reads as a
  // broken close. Sleep is reached by going idle, not by asking for it. Without
  // an onHide handler (older host, or a harness rendering AlloBot standalone)
  // the button keeps its previous minimise behaviour.
  const handleSleep = (e) => {
      e.stopPropagation();
      setCustomMessage(null);
      if (onHide) {
          // Silence only — deliberately NOT fallAsleep(). Flipping isSleeping
          // here would swap in the sleep cap and the greyed-out styling for the
          // 400ms of the puff, so a bot being dismissed would visibly doze off
          // first. It is leaving, not napping.
          silenceSpeech();
          if (motionDisabled) { onHide(); return; }
          setIsPoofing(true);
          setTimeout(() => { setIsPoofing(false); onHide(); }, 400);
          return;
      }
      if (motionDisabled) {
          setIsPoofing(false);
          fallAsleep();
          return;
      }
      setIsPoofing(true);
      setTimeout(() => {
          fallAsleep();
          setIsPoofing(false);
      }, 400);
  };
  // ── Idle auto-sleep ────────────────────────────────────────────────────────
  // Applies to every role — a student who wanders off and a teacher who leaves
  // a projected board open are the same case. Once asleep the bot is silent
  // (see the guard at the top of speak), so an unattended tab stops narrating
  // to the room. Any real input wakes it again, quietly: waking is not an event
  // worth announcing, and the greeting summon() plays is reserved for someone
  // who deliberately tapped a sleeping bot.
  //
  // The "busy" flags live in a ref so the watcher can be installed once instead
  // of being torn down and rebuilt on every mood/talking flip — a re-created
  // interval would reset its own countdown and the bot would never reach the
  // threshold on a chatty screen.
  // ── A5: announce the recording state, do not just colour it ────────────────
  // Red-for-live with no announcement is a WCAG failure twice over: colour as
  // the sole channel, and a live state change no assistive tech is told about.
  // This routes through window.alloAnnounce, the app's REAL announcer (it owns
  // the #allo-live-polite region). A component-local announcer would write to
  // state nothing reads and every announcement would be silently dropped.
  const micStateAnnouncedRef = useRef(null);
  useEffect(() => {
      const next = !!isListening;
      // Skip the first pass: describing the resting state on mount is chatter.
      if (micStateAnnouncedRef.current === null) { micStateAnnouncedRef.current = next; return; }
      if (micStateAnnouncedRef.current === next) return;
      micStateAnnouncedRef.current = next;
      const message = next
          ? (t('bot.mic_live_announce') || 'Microphone on. AlloBot is listening.')
          : (t('bot.mic_off_announce') || 'Microphone off. AlloBot has stopped listening.');
      try { if (typeof window !== 'undefined' && window.alloAnnounce) window.alloAnnounce(message, 'polite'); } catch (_) {}
  }, [isListening, t]);
  const idleBusyRef = useRef(false);
  idleBusyRef.current = !!(isTalking || isDragging || isListening || isSystemAudioActive || effectiveMood === 'thinking' || isPoofing);
  useEffect(() => {
      if (!idleSleepMs || idleSleepMs <= 0) return;
      let lastInput = Date.now();
      const onInput = () => {
          lastInput = Date.now();
          // Read through the ref: this listener is registered once, so a state
          // copy captured here would be frozen at "awake" forever.
          if (isSleepingRef.current) wake();
      };
      const events = ['pointerdown', 'pointermove', 'keydown', 'wheel', 'touchstart', 'scroll'];
      events.forEach(evt => window.addEventListener(evt, onInput, { passive: true }));
      const timer = setInterval(() => {
          if (isSleepingRef.current) return;
          // Talking, thinking or piping system audio all count as "in use" even
          // with no input — a long generation must not put the bot under mid-
          // sentence and then swallow the answer it was about to read out.
          if (idleBusyRef.current) { lastInput = Date.now(); return; }
          if (Date.now() - lastInput >= idleSleepMs) fallAsleep();
      }, 15000);
      return () => {
          clearInterval(timer);
          events.forEach(evt => window.removeEventListener(evt, onInput));
      };
  }, [idleSleepMs, wake, fallAsleep]);
  React.useImperativeHandle(ref, () => ({
      moveTo,
      speak,
      summon,
      triggerReaction,
      // Where the bot actually IS, in screen coords. Measured from the DOM rather
      // than derived from `position` — that state holds a RIGHT offset and a top
      // offset, so reconstructing screen x needs viewport width and the bot's own
      // width, and it lags the CSS flight transition. A rect is exact and live.
      getPosition: () => {
          try {
              const r = containerRef.current && containerRef.current.getBoundingClientRect();
              return r ? { x: r.left + r.width / 2, y: r.top + r.height / 2, rect: r } : null;
          } catch (e) { return null; }
      },
      // The flashlight's emitter, when one is held. Falls back to the bot's centre
      // so a caller never has to special-case "not currently holding a light".
      getMuzzle: () => {
          try {
              const el = flashPivotRef.current || containerRef.current;
              const r = el && el.getBoundingClientRect();
              return r ? { x: r.left + r.width / 2, y: r.top + r.height / 2 } : null;
          } catch (e) { return null; }
      },
      dismissMessage: () => {
          setCustomMessage(null);
          setIsTruncated(false);
          setIsTalking(false);
      },
      playAnimation: (animName, durationMs = 1200) => {
          if (motionDisabled) return;
          setIdleAnimation(animName);
          setTimeout(() => setIdleAnimation(null), durationMs);
      },
      flyTo: (targetX, targetY, duration = 2000) => {
          if (motionDisabled) {
              setMoveDuration(0);
              setLocalIsFlying(false);
              setIsLanding(false);
              setPosition({ x: targetX, y: targetY });
              return;
          }
          setLocalIsFlying(true);
          setMoveDuration(duration);
          setTimeout(() => {
              setPosition({ x: targetX, y: targetY });
              setTimeout(() => {
                  setLocalIsFlying(false);
                  setIsLanding(true);
                  setTimeout(() => setIsLanding(false), 600);
              }, duration);
          }, 50);
      },
  }));
  const lastSummonTimeRef = useRef(0);
  useEffect(() => {
    if (canPlayIntro && !isTalking && !customMessage && !introFiredGlobal && t('bot_events.intro_greeting') !== 'bot_events.intro_greeting') {
      if (!introFiredGlobal) {
        introFiredGlobal = true; window.__introFiredAt = Date.now();
        setTimeout(() => {
            const welcomeMsg = t('sidebar.ai_guide_welcome');
            if (welcomeMsg && welcomeMsg !== 'sidebar.ai_guide_welcome') {
                speak(welcomeMsg);
            }
            if (!motionDisabled) { setIdleAnimation('wave-hello'); setTimeout(() => setIdleAnimation(null), 2500); }
            if (onBotIntroSeen) onBotIntroSeen();
        }, 2500);
      }
    }
  }, [canPlayIntro, onBotIntroSeen, speak, isTalking, customMessage, t, motionDisabled]);
  useEffect(() => {
    const onCelebrate = (e) => {
      if (motionDisabled) return;
      const detail = (e && e.detail) || {};
      const kind = detail.kind || 'backflip';
      const wantConfetti = detail.confetti !== false;
      if (wantConfetti) {
        const burstId = Date.now() + Math.random();
        setBursts(prev => [...prev, { id: burstId }]);
      }
      if (kind === 'backflip') {
        setIsCelebrating(true);
        setTimeout(() => setIsCelebrating(false), 1300);
      }
    };
    window.addEventListener('alloflow:bot-celebrate', onCelebrate);
    return () => window.removeEventListener('alloflow:bot-celebrate', onCelebrate);
  }, [motionDisabled]);
  const handleKeyDown = (e) => {
    if (e.target !== e.currentTarget) return;
    if (e.key === 'Enter' || e.key === ' ') {
       if (isSleeping) {
           e.preventDefault();
           summon();
       }
       return;
    }
    const movement = {
      ArrowLeft: { x: 1, y: 0, label: 'left' },
      ArrowRight: { x: -1, y: 0, label: 'right' },
      ArrowUp: { x: 0, y: -1, label: 'up' },
      ArrowDown: { x: 0, y: 1, label: 'down' }
    }[e.key];
    if (!movement || isSleeping) return;
    e.preventDefault();
    const step = e.shiftKey ? 40 : 10;
    setPosition((current) => {
      const maxRight = Math.max(10, window.innerWidth - 74);
      const maxTop = Math.max(10, window.innerHeight - 74);
      return {
        x: Math.min(maxRight, Math.max(10, current.x + movement.x * step)),
        y: Math.min(maxTop, Math.max(10, current.y + movement.y * step))
      };
    });
    setKeyboardMoveStatus(`AlloBot moved ${movement.label}${e.shiftKey ? ' by a larger step' : ''}.`);
  };
  const pendingSpeechTimerRef = useRef(null);
  // Persist a short memory across effect restarts so switching tools or adding a
  // resource does not immediately repeat the same otherwise-valid coaching tip.
  const recentTipHistoryRef = useRef([]);
  useEffect(() => {
      if (!history || history.length === 0) return;
      const latest = history[history.length - 1];
      if (latest.id && !spokenEventIds.has(latest.id)) {
          spokenEventIds.add(latest.id);
          if (pendingSpeechTimerRef.current) {
              clearTimeout(pendingSpeechTimerRef.current);
              pendingSpeechTimerRef.current = null;
          }
          pendingSpeechTimerRef.current = setTimeout(() => {
              if (isTalkingRef.current || isSystemAudioActive || (introFiredGlobal && Date.now() - (window.__introFiredAt || 0) < 8000)) {
                  debugLog("AlloBot: Skipping event tip, intro cooldown or already talking.");
                  return;
              }
              const tips = [];
              const type = latest.type;
              let message = "";
              const topicStr = topic ? ` about ${topic}` : "";
              if (isStudentMode) {
                  message = buildStudentEventTip(latest, topic, t);
              } else if (isEducatorMode) {
                  message = buildEducatorEventTip(latest, topic, t);
              } else if (type === 'quiz') {
                  const questions = latest.data?.questions || [];
                  const qCount = questions.length;
                  const questionTexts = questions.map(q => q.question || q.text || '').filter(Boolean);
                  const hotWords = ['analyze', 'evaluate', 'compare', 'contrast', 'explain why', 'justify', 'predict', 'infer', 'synthesize'];
                  const hotQuestions = questions.filter(q => {
                    const qText = (q.question || q.text || '').toLowerCase();
                    return hotWords.some(w => qText.includes(w));
                  });
                  const difficulties = [...new Set(questions.map(q => q.difficulty).filter(Boolean))];
                  let msg = `I've generated ${qCount} questions${topicStr}.`;
                  if (hotQuestions.length > 0) {
                    msg += ` ${hotQuestions.length} of them test higher-order thinking skills like analysis and evaluation.`;
                  }
                  if (difficulties.length > 1) {
                    msg += ` The difficulty ranges from ${difficulties[0]} to ${difficulties[difficulties.length - 1]}.`;
                  } else if (qCount > 3) {
                    const avgLen = questionTexts.reduce((sum, q) => sum + q.length, 0) / Math.max(questionTexts.length, 1);
                    if (avgLen > 80) msg += ` These are detailed, application-level questions.`;
                    else msg += ` Quick recall questions to check understanding.`;
                  }
                  message = msg;
              } else if (type === 'glossary') {
                  const terms = Array.isArray(latest.data) ? latest.data : [];
                  const termCount = terms.length;
                  const termNames = terms.map(t => t.term || t.word || '').filter(Boolean);
                  const complexTerms = termNames.filter(t => t.length > 8 || t.includes(' '));
                  let msg = `I found ${termCount} key terms${topicStr}.`;
                  if (complexTerms.length > 0 && complexTerms.length <= 3) {
                    msg += ` Watch for complex vocabulary like ${complexTerms.slice(0, 2).map(t => `"${t}"`).join(' and ')}.`;
                  } else if (complexTerms.length > 3) {
                    msg += ` ${complexTerms.length} of these are advanced vocabulary words worth extra attention.`;
                  }
                  if (termCount >= 5) msg += ` Try the Bingo game or Memory Match to practice!`;
                  msg += ` Running a quick quality check on your glossary...`;
                  message = msg;
              } else if (type === 'simplified') {
                  const level = latest.data?.gradeLevel;
                  const text = typeof latest.data === 'string' ? latest.data : latest.data?.text || '';
                  const sentenceCount = (text.match(/[.!?]+/g) || []).length;
                  const wordCount = text.split(/\s+/).filter(Boolean).length;
                  let msg = level
                    ? `This text has been adapted to a ${level} level.`
                    : `This text has been adapted for easier reading.`;
                  if (sentenceCount > 0 && wordCount > 0) {
                    const avgWordsPerSentence = Math.round(wordCount / sentenceCount);
                    msg += ` It has ${sentenceCount} sentences averaging ${avgWordsPerSentence} words each.`;
                  }
                  msg += ` Try the Cloze tool or click any word for its definition!`;
                  message = msg;
              } else if (type === 'adventure') {
                  const scene = latest.data?.scene || latest.data;
                  const optionCount = scene?.options?.length || 0;
                  if (optionCount > 0) {
                    message = `Adventure awaits${topicStr}! You have ${optionCount} choices to begin. Every decision shapes your story, so choose wisely!`;
                  } else {
                    message = `Adventure awaits! I've set up a simulation${topicStr}. Watch your health and inventory!`;
                  }
              } else if (type === 'analysis') {
                  const rawLevel = latest.data?.readingLevel?.range;
                  const conceptCount = latest.data?.keyConcepts?.length || latest.data?.concepts?.length || 0;
                  const vocabCount = latest.data?.vocabulary?.length || latest.data?.tier2Words?.length || 0;
                  const level = rawLevel ? rawLevel.replace(/[-–—]/g, ' to ').replace(/\s*,\s*/g, ' to ') : rawLevel;
                  let msg = level
                    ? t('bot_events.feedback_analysis_result', { level }) || `I've analyzed the text. It reads at a ${level} level.`
                    : `I've analyzed the text${topicStr}.`;
                  if (conceptCount > 0) msg += ` I identified ${conceptCount} key concepts.`;
                  if (vocabCount > 0) msg += ` There are ${vocabCount} vocabulary terms worth teaching.`;
                  if (!conceptCount && !vocabCount) msg += ` Check the Key Concepts section before moving on.`;
                  message = msg;
              } else if (type === 'scaffolds') {
                  const frames = latest.data?.frames || latest.data || [];
                  const frameCount = Array.isArray(frames) ? frames.length : 0;
                  message = frameCount > 0
                    ? `I've prepared ${frameCount} writing supports${topicStr}. These sentence frames and paragraph starters will help structure student writing!`
                    : `I've prepared some writing supports${topicStr}. Use these frames to help structure your writing!`;
              } else if (type === 'faq') {
                  const questions = latest.data?.questions || latest.data || [];
                  const faqCount = Array.isArray(questions) ? questions.length : 0;
                  message = faqCount > 0
                    ? `I generated ${faqCount} frequently asked questions${topicStr}. These cover the most common points students wonder about. Reveal the answers to study!`
                    : `I generated some common questions${topicStr}. Revealing the answers is a great way to study.`;
              } else if (type === 'outline') {
                  const sections = latest.data?.sections || latest.data?.outline || [];
                  const sectionCount = Array.isArray(sections) ? sections.length : 0;
                  message = sectionCount > 0
                    ? `Here's a ${sectionCount}-section outline${topicStr}. It works as a roadmap for your lesson planning!`
                    : `Here is a structured outline${topicStr}. It works as a great roadmap for your lesson.`;
              } else if (type === 'brainstorm') {
                  const activities = latest.data?.activities || latest.data || [];
                  const actCount = Array.isArray(activities) ? activities.length : 0;
                  message = actCount > 0
                    ? `Brainstorming complete! I found ${actCount} creative activities${topicStr} that connect learning to real-world applications!`
                    : `Brainstorming complete! I've found some creative activities to connect${topicStr} to the real world.`;
              } else if (type === 'concept-sort') {
                  const categories = latest.data?.categories || [];
                  const itemCount = latest.data?.items?.length || 0;
                  message = categories.length > 0
                    ? `Time to categorize! Sort ${itemCount > 0 ? itemCount + ' items' : 'the items'} into ${categories.length} groups${topicStr}. Drag and drop to test your understanding!`
                    : `Time to categorize! Drag and drop the items to sort${topicStr} correctly.`;
              } else if (type === 'math') {
                  const problems = latest.data?.problems || latest.data?.equations || [];
                  const probCount = Array.isArray(problems) ? problems.length : 0;
                  message = probCount > 0
                    ? `I've generated ${probCount} practice problems. Let's crunch some numbers and build those math skills!`
                    : `I've solved the problem and generated some practice equations. Let's crunch some numbers!`;
              } else if (type === 'persona') {
                  const name = latest.data?.name || latest.data?.character?.name;
                  message = name
                    ? `${name} is ready for your interview! Ask them anything about the topic and they'll respond in character.`
                    : `Your interview partner is ready. You can ask them anything about the topic!`;
              } else if (type === 'alignment') {
                  message = `I've audited the content against your standards. Check the Rigor Report to see how well it aligns.`;
              } else {
                  if (type === 'timeline') tips.push(t('tips.timeline_drag'));
                  else if (type === 'lesson-plan') tips.push(t('tips.fallback_guide'));
                  else if (type === 'image') tips.push("I've created a visual support for the topic! You can save it or use it as a discussion starter in class.");
                  if (tips.length > 0) message = tips[Math.floor(Math.random() * tips.length)];
              }
              if (message) {
                   speak(message, false);
              }
          }, 5000);
          return () => {
              if (pendingSpeechTimerRef.current) {
                  clearTimeout(pendingSpeechTimerRef.current);
                  pendingSpeechTimerRef.current = null;
              }
          };
      }
  }, [history, speak, t, isTalking, isStudentMode, isEducatorMode, isSystemAudioActive, topic]);
  useEffect(() => {
    let ambientTimer;
    let fallbackTimer;
    let lastActivityTime = Date.now();
    let hasSpokenFallback = false;
    const spokenTips = new Set();
    const getRandomTip = () => {
        const has = (type) => history && Array.isArray(history) && history.some(h => h && h.type === type);
        const tips = [];
        const latestText = history && Array.isArray(history) && history.find(h => h && h.type === 'simplified');
        const tipTopic = alloBotTipText(topic || (latestText && latestText.topic) || (typeof generatedContent !== 'undefined' && generatedContent && generatedContent.topic) || '');
        const glossaryEntry = history && Array.isArray(history) && history.find(h => h && h.type === 'glossary');
        const glossaryTerms = (glossaryEntry && glossaryEntry.data && glossaryEntry.data.terms) || [];
        const resourceCount = (history && Array.isArray(history)) ? history.length : 0;
        const allTypes = ['quiz', 'glossary', 'adventure', 'lesson-plan', 'image', 'timeline', 'brainstorm'];
        const missingTypes = allTypes.filter(tp => !has(tp));
        const suggestion = missingTypes.length > 0 ? missingTypes[Math.floor(Math.random() * missingTypes.length)].replace('-', ' ') : 'review game';
        const randomWord = glossaryTerms.length > 0
            ? (glossaryTerms[Math.floor(Math.random() * glossaryTerms.length)].term || glossaryTerms[Math.floor(Math.random() * glossaryTerms.length)])
            : '';
        const term1 = glossaryTerms.length > 0 ? (glossaryTerms[0].term || glossaryTerms[0]) : '';
        const term2 = glossaryTerms.length > 1 ? (glossaryTerms[1].term || glossaryTerms[1]) : '';
        if (isStudentMode) {
            tips.push(...buildStudentIdleTips({ activeView, history, topic: tipTopic, t }));
        } else if (isEducatorMode) {
            tips.push(...buildEducatorIdleTips({ activeView, history, topic: tipTopic, t }));
        } else if (activeView === 'simplified') {
            if (randomWord) {
                tips.push(t('tips.simplified_def', { word: randomWord }));
            } else {
                tips.push(t('tips.simplified_def_fallback') || t('tips.simplified_def'));
            }
            if (!has('quiz')) tips.push(t('tips.simplified_quiz'));
            if (!has('glossary')) {
                if (term1 && term2) {
                    tips.push(t('tips.simplified_glossary', { term1, term2 }));
                } else {
                    tips.push(t('tips.simplified_glossary_fallback') || t('tips.simplified_glossary'));
                }
            }
        } else if (activeView === 'glossary') {
            tips.push(t('tips.glossary_bingo'));
            if (!has('image')) tips.push(t('tips.glossary_visuals'));
        } else if (activeView === 'quiz') {
            tips.push(t('tips.quiz_autograder'));
        } else if (activeView === 'adventure') {
            if (tipTopic) {
                tips.push(t('tips.adventure_context', { topic: tipTopic, suggestion }));
            } else {
                tips.push(t('tips.adventure_context_fallback') || t('tips.adventure_context'));
            }
        } else if (activeView === 'input') {
            if (history.length === 0) {
                // input_ready tip removed (inaccurate + repeats excessively)
            } else {
                if (tipTopic) {
                    tips.push(t('tips.input_next', { count: resourceCount, topic: tipTopic, suggestion }));
                } else {
                    tips.push(t('tips.input_next_fallback') || t('tips.input_next'));
                }
            }
        }
        if (!isStudentMode && isParentMode) {
            tips.push(t('tips.parent_bedtime'));
            tips.push(t('tips.parent_adventure'));
            tips.push(t('tips.parent_read_along'));
        }
        if (!isStudentMode && resourceCount >= 3 && !has('lesson-plan')) {
            tips.push(t('tips.fallback_lesson_plan'));
        }
        if (tips.length === 0) {
            tips.push(t('tips.fallback_brainstorm'));
            if (tipTopic && resourceCount > 0) {
                tips.push(t('tips.fallback_export', { count: resourceCount, topic: tipTopic }));
            } else {
                tips.push(t('tips.fallback_export_fallback') || t('tips.fallback_export'));
            }
        }
        const recentTips = new Set(recentTipHistoryRef.current);
        const unspoken = tips.filter(tip => !spokenTips.has(tip));
        const freshUnspoken = unspoken.filter(tip => !recentTips.has(tip));
        const fresh = tips.filter(tip => !recentTips.has(tip));
        const pool = freshUnspoken.length > 0 ? freshUnspoken : (unspoken.length > 0 ? unspoken : (fresh.length > 0 ? fresh : tips));
        const chosen = pool[Math.floor(Math.random() * pool.length)];
        spokenTips.add(chosen);
        recentTipHistoryRef.current = [chosen, ...recentTipHistoryRef.current.filter(tip => tip !== chosen)].slice(0, 10);
        return chosen;
    };
    const scheduleAmbientAction = () => {
        const delay = 60000 + Math.random() * 60000;
        ambientTimer = setTimeout(() => {
            if (isDragging || isTalkingRef.current || customMessage || isIdleDisabled || isSleeping) {
                scheduleAmbientAction();
                return;
            }
            if (!motionDisabled) {
                const anims = ['wave', 'backflip', 'shrug', 'look-around'];
                const action = anims[Math.floor(Math.random() * anims.length)];
                setIdleAnimation(action);
                setTimeout(() => setIdleAnimation(null), 2000);
            }
            if (Math.random() < 0.3) {
                 const tip = getRandomTip();
                 speak(tip, true);
            }
            scheduleAmbientAction();
        }, delay);
    };
    const checkFallbackInactivity = () => {
        const now = Date.now();
        if (now - lastActivityTime > 300000 && !hasSpokenFallback) {
             if (!isDragging && !isTalkingRef.current && !isSystemAudioActive && !customMessage && !isIdleDisabled && !isSleeping) {
                 const tip = getRandomTip();
                 speak(tip, false);
                 hasSpokenFallback = true;
             }
             lastActivityTime = Date.now();
        }
    };
    fallbackTimer = setInterval(checkFallbackInactivity, 10000);
    const resetInactivity = () => {
        lastActivityTime = Date.now();
        hasSpokenFallback = false;
    };
    window.addEventListener('mousemove', resetInactivity);
    window.addEventListener('keydown', resetInactivity);
    window.addEventListener('click', resetInactivity);
    window.addEventListener('scroll', resetInactivity);
    scheduleAmbientAction();
    return () => {
        clearTimeout(ambientTimer);
        clearInterval(fallbackTimer);
        window.removeEventListener('mousemove', resetInactivity);
        window.removeEventListener('keydown', resetInactivity);
        window.removeEventListener('click', resetInactivity);
        window.removeEventListener('scroll', resetInactivity);
    };
  }, [speak, isDragging, isTalking, customMessage, isIdleDisabled, isSleeping, activeView, history, isParentMode, isStudentMode, isEducatorMode, topic, t, motionDisabled]);
  const handleMouseDown = (e) => {
    e.preventDefault();
    setIsDragging(true);
    setIsSquashed(true);
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    dragStartRef.current = { x: clientX, y: clientY };
    startPosRef.current = { ...position };
    prevDragPos.current = { x: clientX, y: clientY };
  };
  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isDragging) return;
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      const deltaX = dragStartRef.current.x - clientX;
      const deltaY = clientY - dragStartRef.current.y;
      const velocityX = clientX - prevDragPos.current.x;
      const rotation = Math.max(-20, Math.min(20, velocityX * -0.5));
      setDragRotation(rotation);
      prevDragPos.current = { x: clientX, y: clientY };
      setPosition({
        x: Math.max(10, startPosRef.current.x + deltaX),
        y: Math.max(10, startPosRef.current.y + deltaY)
      });
    };
    const handleMouseUp = (e) => {
      setIsDragging(false);
      setIsSquashed(false);
      setDragRotation(0);
      const clientX = e.changedTouches ? e.changedTouches[0].clientX : e.clientX;
      const clientY = e.changedTouches ? e.changedTouches[0].clientY : e.clientY;
      const dist = Math.hypot(clientX - dragStartRef.current.x, clientY - dragStartRef.current.y);
      if (dist < 5 && onClick) onClick();
    };
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      window.addEventListener('touchmove', handleMouseMove, { passive: false });
      window.addEventListener('touchend', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchmove', handleMouseMove);
      window.removeEventListener('touchend', handleMouseUp);
    };
  }, [isDragging, onClick]);
  const moodConfig = {
      idle: { gradFrom: '#818CF8', gradTo: '#4338CA', eye: '#22D3EE', mouth: '#22D3EE', glow: '#6366F1', msg: t('bot.mood_idle') },
      happy: { gradFrom: '#34D399', gradTo: '#059669', eye: '#FFFFFF', mouth: '#FFFFFF', glow: '#10B981', msg: t('bot.mood_happy') },
      thinking: { gradFrom: '#FBBF24', gradTo: '#B45309', eye: '#FEF3C7', mouth: '#FEF3C7', glow: '#F59E0B', msg: t('bot.mood_thinking') },
      sad: { gradFrom: '#64748B', gradTo: '#334155', eye: '#E2E8F0', mouth: '#E2E8F0', glow: '#94A3B8', msg: t('bot.mood_sad') }
  };
  const getColors = () => {
      const effectiveAccessory = isSleeping ? 'sleep-cap' : accessory;
      const base = moodConfig[effectiveMood] || moodConfig.idle;
      if (theme === 'contrast') {
          return {
             ...base,
             gradFrom: '#FACC15',
             gradTo: '#CA8A04',
             eye: '#FFFFFF',
             mouth: '#FACC15',
             glow: '#FFFFFF',
             screenBg: '#000000',
             antenna: '#FACC15',
             jetpackFill: '#000000',
             jetpackStroke: '#FACC15',
             accPaper: '#000000',
             accInk: '#FACC15',
          };
      }
      let c = { ...base, screenBg: '#1E1B4B', antenna: base.gradTo, jetpackFill: '#94A3B8', jetpackStroke: '#475569', accPaper: '#FFFFFF', accInk: '#475569' };
      if (colorOverlay === 'blue') {
          c = { ...c, gradFrom: '#60A5FA', gradTo: '#2563EB', glow: '#93C5FD', screenBg: '#172554', antenna: '#2563EB', jetpackFill: '#60A5FA' };
      } else if (colorOverlay === 'peach') {
          c = { ...c, gradFrom: '#FB923C', gradTo: '#EA580C', glow: '#FDBA74', screenBg: '#431407', antenna: '#EA580C', jetpackFill: '#FB923C' };
      } else if (colorOverlay === 'yellow') {
          c = { ...c, gradFrom: '#FACC15', gradTo: '#CA8A04', glow: '#FEF08A', screenBg: '#422006', antenna: '#CA8A04', jetpackFill: '#FACC15' };
      }
      if (theme === 'dark' && colorOverlay === 'none') {
          c.screenBg = '#020617';
          c.jetpackFill = '#334155';
          c.jetpackStroke = '#64748B';
          c.glow = '#A5B4FC';
          c.accPaper = '#1E293B';
          c.accInk = '#94A3B8';
          if (effectiveMood === 'idle') {
              c.gradFrom = '#6366F1';
              c.gradTo = '#312E81';
              c.antenna = '#818CF8';
              c.eye = '#67E8F9';
              c.mouth = '#67E8F9';
          }
      }
      return c;
  };
  const colors = getColors();
  // When a STEM tool is open, the bot dresses for that tool's discipline.
  const stemAccessory = (showStemLab && stemLabTool) ? alloStemAccessory(stemLabTool) : null;
  const targetAccessory = isSleeping ? 'sleep-cap' : (stemAccessory || accessory);
  // Exit transition: render the *displayed* (delayed) accessory so a view switch
  // briefly keeps the old one mounted to animate it out before the new enters.
  const effectiveAccessory = displayedAccessory;
  useEffect(() => {
      if (targetAccessory === displayedAccessory) return;
      const instant = !displayedAccessory || motionDisabled || isSleeping;
      if (instant) { setDisplayedAccessory(targetAccessory); setAccExiting(false); return; }
      setAccExiting(true);
      const t = setTimeout(() => { setDisplayedAccessory(targetAccessory); setAccExiting(false); }, 200);
      return () => clearTimeout(t);
  }, [targetAccessory, displayedAccessory, motionDisabled, isSleeping]);
  const accessoryPreferredSide = ALLOBOT_SIDE_ACCESSORY_SIDE[effectiveAccessory] || null;
  const botLeftRoom = Math.max(0, viewportWidth - position.x - ALLOBOT_AVATAR_WIDTH);
  const botRightRoom = Math.max(0, position.x);
  let accessoryRenderSide = accessoryPreferredSide;
  if (accessoryPreferredSide === 'left' && botLeftRoom < ALLOBOT_PROP_SAFE_GUTTER && botRightRoom > botLeftRoom) {
      accessoryRenderSide = 'right';
  } else if (accessoryPreferredSide === 'right' && botRightRoom < ALLOBOT_PROP_SAFE_GUTTER && botLeftRoom > botRightRoom) {
      accessoryRenderSide = 'left';
  }
  const accessoryShiftX = !accessoryPreferredSide || accessoryRenderSide === accessoryPreferredSide
      ? 0
      // Left-authored props have asymmetric bounds; 124 places their nearest
      // edge just beyond the right hand instead of inside the visor. The one
      // native-right prop has a tighter authored anchor and mirrors cleanly at
      // the original 100-unit distance.
      : (accessoryPreferredSide === 'left' ? 124 : -100);
  const accessoryGapNudge = ALLOBOT_SIDE_ACCESSORY_GAP_NUDGE[effectiveAccessory] || 0;
  const accessoryTranslateX = accessoryShiftX + (accessoryRenderSide === 'left'
      ? -accessoryGapNudge
      : (accessoryRenderSide === 'right' ? accessoryGapNudge : 0));
  const accessoryAccent = ALLOBOT_SIDE_ACCESSORY_ACCENT[effectiveAccessory] || colors.glow;
  const accessoryScale = ALLOBOT_SIDE_ACCESSORY_SCALE[effectiveAccessory] || 1;
  const accessoryDepthFilter = !accessoryRenderSide
      ? undefined
      : theme === 'contrast'
          ? 'drop-shadow(0 1px 0 #000) drop-shadow(0 -1px 0 #FFF)'
          : theme === 'dark'
              ? 'drop-shadow(0 1.4px 1.4px rgba(0,0,0,0.72)) drop-shadow(0 0 0.8px rgba(255,255,255,0.22))'
              : 'drop-shadow(0 1.3px 1.2px rgba(15,23,42,0.28))';
  const propGazeX = accessoryRenderSide === 'left' ? -1.6 : (accessoryRenderSide === 'right' ? 1.6 : 0);
  const propGazeY = accessoryRenderSide ? 0.55 : 0;
  const resolvedGazeX = Math.max(-3.2, Math.min(3.2, eyePosition.x + propGazeX));
  const resolvedGazeY = Math.max(-2.2, Math.min(2.2, eyePosition.y + propGazeY));
  const leftHandX = accessoryRenderSide === 'left' ? 6.5 : 10;
  const leftHandY = accessoryRenderSide === 'left' ? 63.5 : 65;
  const rightHandX = accessoryRenderSide === 'right' ? 93.5 : 90;
  const rightHandY = accessoryRenderSide === 'right' ? 63.5 : 65;
  // Keep held tools opposite a side prop so the silhouettes do not merge when
  // a left-preferring accessory has to move right on a narrow viewport.
  const heldItemRenderSide = heldItem && accessoryRenderSide === 'right' ? 'left' : 'right';
  const getEyeDimensions = () => {
    switch (effectiveMood) {
      case 'happy':
        return { rx: 8.5, ry: 4 };
      case 'sad':
        return { rx: 6, ry: 7.5 };
      case 'thinking':
        return { rx: 7, ry: 7 };
      case 'idle':
      default:
        return { rx: 6.5, ry: 6.5 };
    }
  };
  const { rx: eyeRx, ry: eyeRy } = getEyeDimensions();
  const getMouthPath = () => {
    if (isTalking) {
      switch (viseme) {
        case 'o':
           return "M 47 57 Q 50 53 53 57 Q 50 61 47 57";
        case 'd':
           return "M 44 58 Q 50 58 56 58 Q 50 65 44 58";
        case 'dash':
           return "M 46 59 Q 50 59 54 59 Q 50 59 46 59";
        default:
           return "M 46 59 Q 50 59 54 59 Q 50 59 46 59";
      }
    }
    switch (effectiveMood) {
      case 'happy':
        return "M 43 57 Q 50 59 57 57 Q 50 65 43 57";
      case 'sad':
        return "M 45 62 Q 50 56 55 62 Q 50 56 45 62";
      case 'thinking':
        return "M 47 59 Q 50 57 53 59 Q 50 61 47 59";
      case 'idle':
      default:
        return "M 45 59 Q 50 61 55 59 Q 50 61 45 59";
    }
  };
  // The inline flight filter used to resolve to `none` while parked, which
  // overrode the wrapper's Tailwind drop-shadow class and flattened Allobot's
  // silhouette. Own a restrained depth treatment here, then compose the flight
  // echoes onto it so both states retain clear separation from the workspace.
  const avatarDepthFilter = theme === 'contrast'
      ? 'drop-shadow(0 2px 0 #000000)'
      : theme === 'dark'
          ? 'drop-shadow(0 2px 3px rgba(0,0,0,0.70)) drop-shadow(0 0 1px rgba(255,255,255,0.16))'
          : 'drop-shadow(0 2px 3px rgba(15,23,42,0.28))';
  const trailFilter = isFlightActive
      ? `${avatarDepthFilter} drop-shadow(-6px 4px 0px ${colors.gradFrom}40) drop-shadow(-12px 8px 0px ${colors.gradFrom}20)`
      : avatarDepthFilter;
  const renderHologramContent = () => {
      const generationFamily = alloBotGenerationFamily(generationType, activeView);
      switch (generationFamily) {
          case 'solve':
              return (
                  <g>
                    <animateTransform attributeName="transform" type="rotate" from="0 0 0" to="360 0 0" dur={motionDisabled ? 'indefinite' : '12s'} repeatCount="indefinite" />
                    <text x="0" y="4" fontSize="16" fill="#E0F2FE" textAnchor="middle" fontWeight="bold" style={{ fontFamily: 'serif' }}>π</text>
                    <g>
                        <animateTransform attributeName="transform" type="rotate" from="360 0 0" to="0 0 0" dur={motionDisabled ? 'indefinite' : '6s'} repeatCount="indefinite" />
                        <text x="0" y="-12" fontSize="6" fill="#67E8F9" textAnchor="middle">1</text>
                        <text x="10" y="6" fontSize="6" fill="#67E8F9" textAnchor="middle">2</text>
                        <text x="-10" y="6" fontSize="6" fill="#67E8F9" textAnchor="middle">3</text>
                    </g>
                    <circle r="14" stroke="#22D3EE" strokeWidth="0.5" strokeDasharray="2 1" fill="none" opacity="0.5" />
                  </g>
              );
          case 'explore':
              return (
                  <g>
                     <animateTransform attributeName="transform" type="rotate" from="0 0 0" to="360 0 0" dur={motionDisabled ? 'indefinite' : '8s'} repeatCount="indefinite" />
                     <circle r="10" stroke="#67E8F9" strokeWidth="0.8" fill="rgba(34, 211, 238, 0.1)" />
                     <ellipse rx="10" ry="4" stroke="#67E8F9" strokeWidth="0.5" fill="none" />
                     <ellipse rx="4" ry="10" stroke="#67E8F9" strokeWidth="0.5" fill="none" />
                     <line x1="-10" y1="0" x2="10" y2="0" stroke="#67E8F9" strokeWidth="0.5" />
                     <line x1="0" y1="-10" x2="0" y2="10" stroke="#67E8F9" strokeWidth="0.5" />
                  </g>
              );
          case 'organize':
              return (
                  <g>
                      <animateTransform attributeName="transform" type="translate" values="0,0; 0,-3; 0,0" dur={motionDisabled ? 'indefinite' : '3s'} repeatCount="indefinite" />
                      <rect x="-7" y="-9" width="14" height="18" rx="1" stroke="#E0F2FE" strokeWidth="1" fill="rgba(255, 255, 255, 0.1)" />
                      <line x1="-4" y1="-5" x2="4" y2="-5" stroke="#67E8F9" strokeWidth="1" />
                      <line x1="-4" y1="-2" x2="4" y2="-2" stroke="#67E8F9" strokeWidth="1" />
                      <line x1="-4" y1="1" x2="4" y2="1" stroke="#67E8F9" strokeWidth="1" />
                      <line x1="-4" y1="4" x2="2" y2="4" stroke="#67E8F9" strokeWidth="1" />
                      <path d="M 4 4 L 10 10" stroke="#FDBA74" strokeWidth="1.5" strokeLinecap="round" />
                      <path d="M 10 10 L 12 8 L 14 10 L 12 12 Z" fill="#FDBA74" />
                  </g>
              );
          case 'interview':
              return (
                  <g transform="scale(0.8)">
                      <g className="animate-allobot-generation-clock">
                          <circle cx="0" cy="0" r="14" stroke="#67E8F9" strokeWidth="1.5" fill="none" />
                          <path d="M 0 -8 V 0 L 6 4" stroke="#67E8F9" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                          <path d="M -10 -12 L -6 -8 M 6 -12 L 10 -8" stroke="#67E8F9" strokeWidth="1.5" strokeLinecap="round" opacity="0.6" />
                      </g>
                  </g>
              );
          case 'analyze':
              return (
                  <g>
                      <g className="animate-allobot-generation-card">
                          <rect x="-14" y="-10" width="28" height="20" rx="2" stroke="#67E8F9" strokeWidth="0.8" fill="rgba(34, 211, 238, 0.08)" />
                          <line x1="-10" y1="-5" x2="7" y2="-5" stroke="#E0F2FE" strokeWidth="1" opacity="0.7" />
                          <line x1="-10" y1="0" x2="10" y2="0" stroke="#E0F2FE" strokeWidth="1" opacity="0.5" />
                          <line x1="-10" y1="5" x2="4" y2="5" stroke="#E0F2FE" strokeWidth="1" opacity="0.7" />
                      </g>
                      <g className="animate-allobot-generation-scan">
                          <line x1="-12" y1="-12" x2="-12" y2="12" stroke="#FDBA74" strokeWidth="1.5" />
                          <circle cx="-12" cy="0" r="3" stroke="#FDBA74" strokeWidth="0.8" fill="none" />
                      </g>
                  </g>
              );
          case 'clarify':
              return (
                  <g>
                      <path d="M -14 -9 H 14 V 9 H -14 Z" stroke="#67E8F9" strokeWidth="0.8" fill="rgba(34, 211, 238, 0.08)" />
                      <g className="animate-allobot-generation-resolve">
                          <line x1="-10" y1="-4" x2="10" y2="-4" stroke="#E0F2FE" strokeWidth="1.2" className="animate-allobot-generation-line" />
                          <line x1="-10" y1="0" x2="6" y2="0" stroke="#67E8F9" strokeWidth="1.2" className="animate-allobot-generation-line" style={{ animationDelay: '0.18s' }} />
                          <line x1="-10" y1="4" x2="9" y2="4" stroke="#E0F2FE" strokeWidth="1.2" className="animate-allobot-generation-line" style={{ animationDelay: '0.36s' }} />
                      </g>
                      <circle cx="10" cy="-7" r="2" fill="#FDBA74" className="animate-allobot-generation-dot" />
                  </g>
              );
          case 'assess':
              return (
                  <g>
                      <g className="animate-allobot-generation-question">
                          <circle cx="-6" cy="-3" r="8" stroke="#67E8F9" strokeWidth="0.9" fill="rgba(34, 211, 238, 0.08)" />
                          <text x="-6" y="1" fontSize="10" fill="#E0F2FE" textAnchor="middle" fontWeight="bold">?</text>
                      </g>
                      <path d="M 2 5 L 6 9 L 14 -1" stroke="#FDBA74" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none" strokeDasharray="20" className="animate-allobot-generation-check" />
                  </g>
              );
          case 'create':
              return (
                  <g>
                      <g className="animate-allobot-generation-card">
                          <rect x="-13" y="-9" width="26" height="18" rx="2" stroke="#67E8F9" strokeWidth="0.8" fill="rgba(34, 211, 238, 0.08)" />
                          <path d="M -9 5 L -2 -2 L 2 2 L 7 -4 L 11 5 Z" stroke="#E0F2FE" strokeWidth="1" fill="none" strokeLinejoin="round" />
                      </g>
                      <g className="animate-allobot-generation-spark">
                          <path d="M 0 -15 L 1.5 -10 L 6 -9 L 1.5 -7.5 L 0 -2 L -1.5 -7.5 L -6 -9 L -1.5 -10 Z" fill="#FDBA74" />
                      </g>
                      <g transform="translate(10, 5) scale(0.45)">
                          <g className="animate-allobot-generation-spark" style={{ animationDelay: '0.35s' }}>
                              <path d="M 0 -15 L 1.5 -10 L 6 -9 L 1.5 -7.5 L 0 -2 L -1.5 -7.5 L -6 -9 L -1.5 -10 Z" fill="#FDBA74" />
                          </g>
                      </g>
                  </g>
              );
          case 'generic':
          default:
              return (
                 <g>
                    <animateTransform
                        attributeName="transform"
                        attributeType="XML"
                        type="rotate"
                        from="0 0 0"
                        to="360 0 0"
                        dur={motionDisabled ? 'indefinite' : '8s'}
                        repeatCount="indefinite"
                    />
                    <circle r="2.5" fill="#E0F2FE" className="animate-pulse motion-reduce:animate-none" />
                    <ellipse rx="12" ry="4" stroke="#67E8F9" strokeWidth="0.8" fill="none" />
                    <ellipse rx="12" ry="4" stroke="#67E8F9" strokeWidth="0.8" fill="none" transform="rotate(60)" />
                    <ellipse rx="12" ry="4" stroke="#67E8F9" strokeWidth="0.8" fill="none" transform="rotate(120)" />
                 </g>
              );
      }
  };
  const renderGenerationCompletion = (generationFamily, outcome = 'success') => {
      const completionCheck = (
          <path
              d="M -8 0 L -2 6 L 9 -7"
              stroke="#86EFAC"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
              strokeDasharray="24"
              className="animate-allobot-generation-completion-check"
          />
      );
      if (outcome === 'error') {
          return (
              <g>
                  <circle r="12" stroke="#FDA4AF" strokeWidth="1" fill="rgba(244, 63, 94, 0.08)" />
                  <path d="M 0 -7 V 2" stroke="#FDA4AF" strokeWidth="2" strokeLinecap="round" />
                  <circle cx="0" cy="6" r="1.2" fill="#FDA4AF" />
              </g>
          );
      }
      if (outcome === 'cancelled') {
          return (
              <g>
                  <circle r="12" stroke="#CBD5E1" strokeWidth="1" fill="rgba(148, 163, 184, 0.08)" />
                  <path d="M -6 0 H 6" stroke="#CBD5E1" strokeWidth="2" strokeLinecap="round" />
              </g>
          );
      }
      switch (generationFamily) {
          case 'create':
              return (
                  <g>
                      <circle r="12" stroke="#67E8F9" strokeWidth="0.9" fill="rgba(34, 211, 238, 0.08)" />
                      <path d="M -8 4 L -2 -2 L 2 1 L 8 -5" stroke="#E0F2FE" strokeWidth="1" fill="none" strokeLinejoin="round" />
                      <path d="M 0 -14 L 1.5 -10 L 5 -9 L 1.5 -7.5 L 0 -3 L -1.5 -7.5 L -5 -9 L -1.5 -10 Z" fill="#FDBA74" />
                  </g>
              );
          case 'explore':
              return (
                  <g>
                      <circle r="12" stroke="#67E8F9" strokeWidth="0.9" fill="none" />
                      <path d="M 0 -9 L 2 0 L 9 3 L 2 4 L 0 10 L -2 4 L -9 3 L -2 0 Z" fill="#FDBA74" opacity="0.9" />
                  </g>
              );
          case 'solve':
              return (
                  <g>
                      <circle r="12" stroke="#67E8F9" strokeWidth="0.9" fill="rgba(34, 211, 238, 0.08)" />
                      <text x="0" y="4" fontSize="12" fill="#E0F2FE" textAnchor="middle" fontWeight="bold" style={{ fontFamily: 'serif' }}>=</text>
                      {completionCheck}
                  </g>
              );
          case 'interview':
              return (
                  <g>
                      <circle r="12" stroke="#67E8F9" strokeWidth="0.9" fill="none" />
                      <path d="M 0 -7 V 0 L 5 3" stroke="#FDBA74" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                      {completionCheck}
                  </g>
              );
          case 'analyze':
              return (
                  <g>
                      <rect x="-14" y="-10" width="28" height="20" rx="2" stroke="#67E8F9" strokeWidth="0.9" fill="rgba(34, 211, 238, 0.08)" />
                      <line x1="-10" y1="-5" x2="7" y2="-5" stroke="#E0F2FE" strokeWidth="1" opacity="0.7" />
                      <line x1="-10" y1="0" x2="-1" y2="0" stroke="#E0F2FE" strokeWidth="1" opacity="0.5" />
                      {completionCheck}
                  </g>
              );
          case 'clarify':
              return (
                  <g>
                      <path d="M -14 -9 H 14 V 9 H -14 Z" stroke="#67E8F9" strokeWidth="0.9" fill="rgba(34, 211, 238, 0.08)" />
                      <line x1="-10" y1="-4" x2="10" y2="-4" stroke="#E0F2FE" strokeWidth="1.1" />
                      <line x1="-10" y1="1" x2="4" y2="1" stroke="#67E8F9" strokeWidth="1.1" />
                      {completionCheck}
                  </g>
              );
          case 'organize':
              return (
                  <g>
                      <rect x="-13" y="-9" width="26" height="18" rx="2" stroke="#67E8F9" strokeWidth="0.9" fill="rgba(34, 211, 238, 0.08)" />
                      <line x1="-9" y1="-4" x2="8" y2="-4" stroke="#E0F2FE" strokeWidth="1.1" />
                      <line x1="-9" y1="0" x2="5" y2="0" stroke="#E0F2FE" strokeWidth="1.1" />
                      <line x1="-9" y1="4" x2="2" y2="4" stroke="#E0F2FE" strokeWidth="1.1" />
                      {completionCheck}
                  </g>
              );
          case 'assess':
              return (
                  <g>
                      <circle r="12" stroke="#FDBA74" strokeWidth="1" fill="rgba(251, 186, 116, 0.08)" />
                      {completionCheck}
                  </g>
              );
          case 'generic':
          default:
              return (
                  <g>
                      <circle r="12" stroke="#67E8F9" strokeWidth="0.9" fill="rgba(34, 211, 238, 0.08)" />
                      {completionCheck}
                  </g>
              );
      }
  };
  return (
    <aside aria-label={t('bot.assistant_landmark') || 'AlloBot assistant'}>
    <p id="allobot-move-instructions" className="sr-only">{t('bot.move_instructions') || 'Use the arrow keys to move AlloBot. Hold Shift with an arrow key for a larger step.'}</p>
    <div role="status" aria-live="polite" aria-atomic="true" className="sr-only">{keyboardMoveStatus}</div>
    <style>{`
        /* Orbit controls own their essential geometry and state colors so the
           external Allobot module remains polished in desktop/embedded hosts
           that do not provide the app's Tailwind bundle. Tailwind utilities
           remain on the elements as progressive enhancement. */
        .allobot-satellite-control {
            position: absolute;
            box-sizing: border-box;
            display: inline-flex;
            width: 32px;
            height: 32px;
            min-width: 32px;
            min-height: 32px;
            align-items: center;
            justify-content: center;
            padding: 6px;
            border: 2px solid #E0E7FF;
            border-radius: 9999px;
            background: #FFFFFF;
            color: #6366F1;
            box-shadow: 0 4px 10px rgba(15, 23, 42, 0.18);
            opacity: 0;
            transform: scale(0.75);
            transform-origin: center;
            transition: opacity 180ms ease, transform 180ms ease, background-color 180ms ease, color 180ms ease, box-shadow 180ms ease;
            appearance: none;
            cursor: pointer;
            z-index: 50;
        }
        .allobot-satellite--tl { top: -8px; left: -8px; }
        .allobot-satellite--tr { top: -8px; right: -8px; }
        .allobot-satellite--bl { bottom: -4px; left: -8px; }
        .allobot-satellite--br { bottom: -4px; right: -8px; }
        .group:hover .allobot-satellite-control,
        .group:focus-within .allobot-satellite-control,
        .allobot-satellite-control:focus-visible { opacity: 1; }
        .allobot-satellite-control:hover,
        .allobot-satellite-control:focus-visible { transform: scale(1); }
        .allobot-satellite-control[data-allobot-satellite-kind="hide"] {
            background: #E2E8F0;
            color: #475569;
            border-color: #FFFFFF;
        }
        .allobot-satellite-control[data-allobot-satellite-kind="hide"]:hover {
            background: #FEE2E2;
            color: #DC2626;
        }
        .allobot-satellite-control[data-allobot-satellite-state="muted"] {
            background: #F1F5F9;
            color: #475569;
            border-color: #CBD5E1;
        }
        .allobot-satellite-control[data-allobot-satellite-state="listening"] {
            background: #B91C1C;
            color: #FFFFFF;
            border-color: #F87171;
            box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.35), 0 4px 10px rgba(15, 23, 42, 0.2);
        }
        @media (hover: none), (pointer: coarse) {
            .allobot-satellite-control {
                width: 36px;
                height: 36px;
                min-width: 36px;
                min-height: 36px;
                padding: 8px;
                opacity: 1;
                transform: scale(1);
            }
            .allobot-satellite--tl { top: -10px; left: -10px; }
            .allobot-satellite--tr { top: -10px; right: -10px; }
            .allobot-satellite--bl { bottom: -10px; left: -10px; }
            .allobot-satellite--br { bottom: -10px; right: -10px; }
        }
        @keyframes allo-float { 0%, 100% { transform: translateY(0px); } 50% { transform: translateY(-8px); } }
        /* allo-talk keyframe removed — defined but never applied to any element. Audit confirmed dead code. */
        @keyframes allo-backflip { 0% { transform: translateY(0) rotate(0deg); } 40% { transform: translateY(-50px) rotate(-180deg); } 100% { transform: translateY(0) rotate(-360deg); } }
        @keyframes allo-wave { 0%, 100% { transform: rotate(0deg); } 25% { transform: rotate(-20deg); } 75% { transform: rotate(20deg); } }
        @keyframes allo-puff { 0% { transform: scale(1); opacity: 1; filter: blur(0px); } 100% { transform: scale(1.5); opacity: 0; filter: blur(4px); } }
        @keyframes jetpack-flame { 0%, 100% { opacity: 1; transform: scaleY(1); } 50% { opacity: 0.7; transform: scaleY(0.85); } }
        @keyframes history-pulse {
            0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(79, 70, 229, 0.4); }
            70% { transform: scale(1.05); box-shadow: 0 0 0 10px rgba(79, 70, 229, 0); }
            100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(79, 70, 229, 0); }
        }
        .pulse-history {
            animation: history-pulse 2s infinite;
        }
        @keyframes bot-fly-tilt {
            0%, 100% { transform: rotate(12deg) translateY(0px) scale(0.9, 1.1); }
            50% { transform: rotate(12deg) translateY(-10px) scale(0.92, 1.08); }
        }
        @keyframes bot-land {
            0% { transform: scale(0.9, 1.1); } /* Start stretched */
            40% { transform: scale(1.25, 0.75) translateY(5px); } /* Squash down */
            80% { transform: scale(0.95, 1.05) translateY(-2px); } /* Rebound up */
            100% { transform: scale(1, 1) translateY(0); } /* Settle */
        }
        @keyframes jetpack-smoke {
            0% { transform: translate(0, 0) scale(0.5); background-color: #F59E0B; opacity: 0.9; }
            40% { background-color: #fbbf24; opacity: 0.7; }
            100% { transform: translate(var(--drift), 100px) scale(2.5); background-color: #e2e8f0; opacity: 0; }
        }
        @keyframes wind-streak {
            0% { transform: translateX(10px) scaleX(0.2); opacity: 0; }
            30% { opacity: 0.8; }
            100% { transform: translateX(-60px) scaleX(1.8); opacity: 0; }
        }
        .animate-wind-streak { animation: wind-streak 0.6s linear infinite; }
        @keyframes tap-pointer {
            0%, 100% { transform: rotate(0deg); }
        @keyframes help-glow-pulse {
            0%, 100% {
                box-shadow: 0 0 8px 2px rgba(59, 130, 246, 0.6),
                            0 0 15px 4px rgba(59, 130, 246, 0.3);
            }
            50% {
                box-shadow: 0 0 15px 4px rgba(59, 130, 246, 0.9),
                            0 0 25px 8px rgba(59, 130, 246, 0.5),
                            inset 0 0 10px rgba(59, 130, 246, 0.2);
            }
        }
        @keyframes help-breathe {
            0%, 100% {
                box-shadow: 0 0 4px 1px rgba(99, 102, 241, 0.15);
                transform: translateY(-50%) scale(1);
            }
            50% {
                box-shadow: 0 0 8px 3px rgba(99, 102, 241, 0.25);
                transform: translateY(-50%) scale(1.05);
            }
        }
        @keyframes stemTutorialGlow {
            0%, 100% { box-shadow: 0 0 10px 2px rgba(99, 102, 241, 0.3), 0 0 20px 4px rgba(99, 102, 241, 0.15); }
            50% { box-shadow: 0 0 20px 6px rgba(99, 102, 241, 0.6), 0 0 40px 10px rgba(99, 102, 241, 0.3); }
        }
        @keyframes spotlightGlowRing {
            0%, 100% { box-shadow: 0 0 0 2px rgba(139, 92, 246, 0.6), 0 0 20px rgba(139, 92, 246, 0.3); }
            50% { box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.9), 0 0 40px rgba(139, 92, 246, 0.5), inset 0 0 20px rgba(139, 92, 246, 0.1); }
        }
        @keyframes soundwave {
    0% { height: 4px; }
    100% { height: 16px; }
}
.help-mode-interactive {
            position: relative;
            animation: help-glow-pulse 2s ease-in-out infinite;
            cursor: help !important;
            border-radius: 4px;
            transition: all 0.3s ease;
        }
        .help-mode-interactive:hover {
            animation-duration: 1s; /* Speed up on hover */
            z-index: 10;
        }
            50% { transform: rotate(-12deg); }
        }
        @keyframes float-reaction {
            0% { transform: translateY(0) scale(0.5) translateX(50%); opacity: 0; }
            20% { transform: translateY(-30px) scale(1.2) translateX(50%); opacity: 1; }
            100% { transform: translateY(-100px) scale(1) translateX(50%); opacity: 0; }
        }
        @keyframes bot-confetti {
            0% { transform: translate(-50%, -50%) scale(0.5); opacity: 1; }
            100% { transform: translate(calc(-50% + var(--tx)), calc(-50% + var(--ty))) scale(0); opacity: 0; }
        }
        @keyframes dust-left {
            0% { transform: translateX(0) scale(0.5); opacity: 0.6; }
            100% { transform: translateX(-30px) translateY(-5px) scale(1.5); opacity: 0; }
        }
        @keyframes dust-right {
            0% { transform: translateX(0) scale(0.5); opacity: 0.6; }
            100% { transform: translateX(30px) translateY(-5px) scale(1.5); opacity: 0; }
        }
        @keyframes dust-puff {
            0% { transform: scale(0.5) translateY(0); opacity: 0.8; }
            100% { transform: scale(2) translateY(-15px); opacity: 0; }
        }
        .animate-dust-left { animation: dust-left 0.6s ease-out forwards; }
        .animate-dust-right { animation: dust-right 0.6s ease-out forwards; }
        .animate-dust-puff { animation: dust-puff 0.8s ease-out forwards; }
        @keyframes antenna-sway {
            0%, 100% { transform: rotate(-5deg); }
            50% { transform: rotate(5deg); }
        }
        .animate-antenna-sway { animation: antenna-sway 4s ease-in-out infinite; }
        @keyframes antenna-tri-bounce {
            0% { transform: translateY(0); }
            15% { transform: translateY(-12px); animation-timing-function: ease-out; }
            30% { transform: translateY(0); animation-timing-function: ease-in; }
            45% { transform: translateY(-12px); animation-timing-function: ease-out; }
            60% { transform: translateY(0); animation-timing-function: ease-in; }
            75% { transform: translateY(-12px); animation-timing-function: ease-out; }
            90% { transform: translateY(0); animation-timing-function: ease-in; }
            100% { transform: translateY(0); }
        }
        .animate-antenna-tri-bounce { animation: antenna-tri-bounce 1.5s ease-in-out forwards; }
        @keyframes signal-wave {
            0% { transform: scale(0.5); opacity: 0.8; stroke-width: 4; }
            50% { opacity: 0.5; }
            100% { transform: scale(3.5); opacity: 0; stroke-width: 0; }
        }
        .animate-signal-wave { animation: signal-wave 2s ease-out infinite; transform-origin: 50px 5px; }
        @keyframes antenna-spring {
            0% { transform: rotate(var(--start-deg)); }
            20% { transform: rotate(calc(var(--start-deg) * -0.6)); }
            40% { transform: rotate(calc(var(--start-deg) * 0.4)); }
            60% { transform: rotate(calc(var(--start-deg) * -0.2)); }
            80% { transform: rotate(calc(var(--start-deg) * 0.1)); }
            100% { transform: rotate(0deg); }
        }
        .animate-antenna-spring {
            animation: antenna-spring 0.5s ease-out forwards;
            transform-origin: 50px 15px;
        }
        .mouth-transition { transition: d 0.3s cubic-bezier(0.4, 0, 0.2, 1); }
        @keyframes bot-breathe {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.02, 0.98); }
        }
        .animate-bot-breathe { animation: bot-breathe 3s ease-in-out infinite; }
        @keyframes shadow-pulse {
            0%, 100% { transform: translateY(0px) scale(1); opacity: 1; }
            50% { transform: translateY(8px) scale(0.6); opacity: 0.3; }
        }
        .animate-shadow-pulse { animation: shadow-pulse 3s ease-in-out infinite; transform-origin: 50px 90px; }
        @keyframes zzz-float {
            0% { transform: translate(0, 0) scale(0.5); opacity: 0; }
            20% { opacity: 1; }
            100% { transform: translate(20px, -30px) scale(1.2); opacity: 0; }
        }
        .animate-zzz { animation: zzz-float 2.5s infinite linear; }
        .animate-allo-float { animation: allo-float 3s ease-in-out infinite; }
        .animate-allo-puff { animation: allo-puff 0.4s ease-out forwards; }
        .animate-allo-backflip { animation: allo-backflip 1.2s ease-in-out 1; }
        .animate-jetpack-flame { animation: jetpack-flame 0.1s ease-in-out infinite; transform-origin: top; }
        .animate-bot-fly-tilt { animation: bot-fly-tilt 2s ease-in-out infinite; }
        .animate-bot-land { animation: bot-land 0.5s ease-out forwards; }
        .animate-jetpack-smoke { animation: jetpack-smoke 0.8s ease-out forwards; }
        .animate-tap-pointer { animation: tap-pointer 0.8s ease-in-out infinite; transform-origin: 75px 65px; }
        .animate-float-reaction { animation: float-reaction 1.5s ease-out forwards; }
        .animate-bot-confetti { animation: bot-confetti 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards; }
        @keyframes float-hands {
            0%, 100% { transform: translateY(0px); }
            50% { transform: translateY(-5px); }
        }
        .animate-float-hands { animation: float-hands 3.5s ease-in-out infinite; }
        @keyframes gesture-left {
            0%, 100% { transform: translate(0, 0); }
            50% { transform: translate(8px, -6px); }
        }
        @keyframes gesture-right {
            0%, 100% { transform: translate(0, 0); }
            50% { transform: translate(-8px, -6px); }
        }
        .animate-gesture-left { animation: gesture-left 0.8s ease-in-out infinite; }
        .animate-gesture-right { animation: gesture-right 0.8s ease-in-out infinite; }
        @keyframes wave-hello {
            0%, 100% { transform: rotate(0deg); }
            15% { transform: rotate(-14deg); }
            30% { transform: rotate(14deg); }
            45% { transform: rotate(-10deg); }
            60% { transform: rotate(10deg); }
            75% { transform: rotate(-6deg); }
            90% { transform: rotate(3deg); }
        }
        .animate-wave-hello { animation: wave-hello 1.2s ease-in-out; transform-origin: 70px 50px; }
        @keyframes happy-nod {
            0%, 100% { transform: translateY(0) scale(1); }
            25% { transform: translateY(-6px) scale(1.05); }
            50% { transform: translateY(0) scale(1); }
            75% { transform: translateY(-3px) scale(1.02); }
        }
        .animate-happy-nod { animation: happy-nod 0.6s ease-in-out; }
        @keyframes sympathetic-tilt {
            0%, 100% { transform: rotate(0deg); }
            30% { transform: rotate(-5deg); }
            70% { transform: rotate(2deg); }
        }
        .animate-sympathetic-tilt { animation: sympathetic-tilt 0.8s ease-in-out; }
        @keyframes voice-wave {
            0%, 100% { transform: scaleY(0.4); opacity: 0.7; }
            50% { transform: scaleY(1.3); opacity: 1; }
        }
        @keyframes hologram-spin {
            0% { transform: rotateY(0deg); }
            100% { transform: rotateY(360deg); }
        }
        .animate-hologram-3d {
            animation: hologram-spin 8s linear infinite;
            transform-origin: center;
            transform-box: fill-box;
        }
        @keyframes ken-burns {
            0% { transform: scale(1.0) translate(0, 0); }
            100% { transform: scale(1.1) translate(-1%, -1%); }
        }
        .animate-ken-burns {
            animation: ken-burns 20s ease-in-out infinite alternate;
        }
        .sr-only {
            position: absolute;
            width: 1px;
            height: 1px;
            padding: 0;
            margin: -1px;
            overflow: hidden;
            clip: rect(0, 0, 0, 0);
            white-space: nowrap;
            border: 0;
        }
        .sr-only-focusable:focus {
            position: static;
            width: auto;
            height: auto;
            padding: inherit;
            margin: inherit;
            overflow: visible;
            clip: auto;
            white-space: normal;
        }
/* AlloBot accessory idle "alive" motions. Pure translateY/opacity so there are
   no transform-origin quirks and no clobbering of the positioning/entrance
   transforms (these classes live on INNER wrapper groups). Named animate-* so
   they are auto-disabled by the app reduce-motion toggle (.reduce-motion
   [class*="animate-"]) and OS prefers-reduced-motion (block below). */
@keyframes allobotAccessoryArriveLeft { 0% { transform: translateX(-5px) scale(0.96); opacity: 0; } 100% { transform: translateX(0) scale(1); opacity: 1; } }
@keyframes allobotAccessoryArriveRight { 0% { transform: translateX(5px) scale(0.96); opacity: 0; } 100% { transform: translateX(0) scale(1); opacity: 1; } }
.animate-allobot-accessory-arrive-left { transform-box: fill-box; transform-origin: center; animation: allobotAccessoryArriveLeft 0.34s cubic-bezier(0.34, 1.56, 0.64, 1) 1 both; }
.animate-allobot-accessory-arrive-right { transform-box: fill-box; transform-origin: center; animation: allobotAccessoryArriveRight 0.34s cubic-bezier(0.34, 1.56, 0.64, 1) 1 both; }
@keyframes allobotFloat { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-1.6px); } }
@keyframes allobotPerk { 0%, 80%, 100% { transform: translateY(0); } 90% { transform: translateY(-2.5px); } }
@keyframes allobotTwinkle { 0%, 100% { opacity: 0.55; } 50% { opacity: 1; } }
.animate-allobot-float { animation: allobotFloat 4s ease-in-out infinite; }
.animate-allobot-perk { animation: allobotPerk 7s ease-in-out infinite; }
.animate-allobot-twinkle { animation: allobotTwinkle 3s ease-in-out infinite; }
/* Bespoke signatures (rotate around the element's own base). */
@keyframes allobotTick { to { transform: rotate(360deg); } }
@keyframes allobotSway { 0%, 100% { transform: rotate(-5deg); } 50% { transform: rotate(5deg); } }
.animate-allobot-tick { transform-box: fill-box; transform-origin: center bottom; animation: allobotTick 6s steps(12) infinite; }
.animate-allobot-sway { transform-box: fill-box; transform-origin: center bottom; animation: allobotSway 3.5s ease-in-out infinite; }
/* Context micro-interactions: one quiet visual verb per learning prop. */
@keyframes allobotStopwatchHand { to { transform: rotate(360deg); } }
@keyframes allobotInboxDrop { 0%, 72%, 100% { transform: translateY(0); opacity: 1; } 82% { transform: translateY(2px); opacity: 0.55; } 90% { transform: translateY(-1px); opacity: 1; } }
@keyframes allobotProgressPulse { 0%, 100% { transform: scale(1); opacity: 1; } 50% { transform: scale(0.92); opacity: 0.72; } }
@keyframes allobotMazeFlag { 0%, 100% { transform: rotate(-2deg); } 50% { transform: rotate(4deg); } }
@keyframes allobotFolderPage { 0%, 72%, 100% { transform: translateY(0); } 84% { transform: translateY(-2px); } 92% { transform: translateY(-0.5px); } }
.animate-allobot-stopwatch-hand { transform-box: view-box; transform-origin: 0px 4px; animation: allobotStopwatchHand 8s steps(12) infinite; }
.animate-allobot-inbox-drop { animation: allobotInboxDrop 3.4s ease-in-out infinite; }
.animate-allobot-progress-pulse { transform-box: fill-box; transform-origin: center; animation: allobotProgressPulse 2.8s ease-in-out infinite; }
.animate-allobot-maze-flag { transform-box: fill-box; transform-origin: left bottom; animation: allobotMazeFlag 4.2s ease-in-out infinite; }
.animate-allobot-folder-page { animation: allobotFolderPage 4s ease-in-out infinite; }
/* State-reactive: accessory "works" while generating, then a one-shot pop when done.
   Targets the animate-allobot-* wrappers, so the reduce-motion [class*="animate-"]
   override below still wins and disables these too. */
@keyframes allobotWorking { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-3px); } }
@keyframes allobotPop { 0% { transform: translateY(0); } 35% { transform: translateY(-6px); } 70% { transform: translateY(-1px); } 100% { transform: translateY(0); } }
.allobot-thinking .animate-allobot-float, .allobot-thinking .animate-allobot-perk { animation: allobotWorking 0.85s ease-in-out infinite; }
.allobot-pop .animate-allobot-float, .allobot-pop .animate-allobot-perk { animation: allobotPop 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) 1; }
/* Generation signatures. These stay inside the existing hologram so the
   orange body remains the universal working state. Every class includes
   "animate-" so the existing reduced-motion kill switch catches it. */
@keyframes allobotGenerationScan { 0%, 100% { transform: translateX(-12px); opacity: 0.25; } 50% { transform: translateX(12px); opacity: 1; } }
.animate-allobot-generation-scan { transform-box: fill-box; transform-origin: center; animation: allobotGenerationScan 1.5s ease-in-out infinite; }
@keyframes allobotGenerationProgress { to { transform: rotate(360deg); } }
.allobot-generation-progress { transform-box: fill-box; transform-origin: center; transition: stroke-dashoffset 0.35s ease-out; }
.animate-allobot-generation-progress { transform-box: fill-box; transform-origin: center; animation: allobotGenerationProgress 1.6s linear infinite; }
@keyframes allobotGenerationEnter { 0% { transform: translateY(8px) scale(0.72); opacity: 0; } 65% { transform: translateY(-1px) scale(1.04); opacity: 1; } 100% { transform: translateY(0) scale(1); opacity: 1; } }
.animate-allobot-generation-enter { transform-box: fill-box; transform-origin: center; animation: allobotGenerationEnter 0.38s cubic-bezier(0.34, 1.56, 0.64, 1) 1 both; }
[data-allo-generation-phase="1"] .animate-hologram-3d { animation-duration: 10s; }
[data-allo-generation-phase="2"] .animate-hologram-3d { animation-duration: 6.5s; }
[data-allo-generation-phase="1"] .animate-allobot-generation-scan { animation-duration: 1.9s; }
[data-allo-generation-phase="2"] .animate-allobot-generation-spark { animation-duration: 1.8s; }
[data-allo-generation-stage="analyze"] .animate-allobot-generation-scan { animation-duration: 1.25s; }
[data-allo-generation-stage="build"] .animate-allobot-generation-card, [data-allo-generation-stage="build"] .animate-allobot-generation-spark { animation-duration: 1.15s; }
[data-allo-generation-stage="finalize"] .animate-allobot-generation-line, [data-allo-generation-stage="finalize"] .animate-allobot-generation-check { animation-duration: 1.1s; }
@keyframes allobotGenerationCard { 0%, 100% { transform: translateY(2px); opacity: 0.45; } 50% { transform: translateY(-2px); opacity: 1; } }
.animate-allobot-generation-card { transform-box: fill-box; transform-origin: center; animation: allobotGenerationCard 1.8s ease-in-out infinite; }
@keyframes allobotGenerationResolve { 0%, 100% { transform: scaleX(0.65); opacity: 0.3; } 50% { transform: scaleX(1); opacity: 1; } }
.animate-allobot-generation-resolve { transform-box: fill-box; transform-origin: left center; animation: allobotGenerationResolve 1.7s ease-in-out infinite; }
@keyframes allobotGenerationLine { 0%, 100% { opacity: 0.3; } 45%, 70% { opacity: 1; } }
.animate-allobot-generation-line { animation: allobotGenerationLine 1.7s ease-in-out infinite; }
@keyframes allobotGenerationDot { 0%, 100% { transform: scale(0.65); opacity: 0.35; } 50% { transform: scale(1.2); opacity: 1; } }
.animate-allobot-generation-dot { transform-box: fill-box; transform-origin: center; animation: allobotGenerationDot 1.2s ease-in-out infinite; }
@keyframes allobotGenerationQuestion { 0%, 100% { transform: translateY(2px); opacity: 0.45; } 50% { transform: translateY(-2px); opacity: 1; } }
.animate-allobot-generation-question { transform-box: fill-box; transform-origin: center; animation: allobotGenerationQuestion 1.6s ease-in-out infinite; }
@keyframes allobotGenerationClock { 0%, 100% { transform: rotate(-4deg); opacity: 0.7; } 50% { transform: rotate(4deg); opacity: 1; } }
.animate-allobot-generation-clock { transform-box: fill-box; transform-origin: center; animation: allobotGenerationClock 2.4s steps(8, end) infinite; }
@keyframes allobotGenerationCheck { 0% { stroke-dashoffset: 20; opacity: 0.2; } 45%, 100% { stroke-dashoffset: 0; opacity: 1; } }
.animate-allobot-generation-check { animation: allobotGenerationCheck 1.6s ease-out infinite; }
@keyframes allobotGenerationSpark { 0%, 100% { transform: scale(0.65) rotate(-10deg); opacity: 0.35; } 50% { transform: scale(1.1) rotate(10deg); opacity: 1; } }
.animate-allobot-generation-spark { transform-box: fill-box; transform-origin: center; animation: allobotGenerationSpark 1.4s ease-in-out infinite; }
@keyframes allobotGenerationComplete { 0% { transform: translateY(6px) scale(0.65); opacity: 0; } 25% { transform: translateY(-2px) scale(1.08); opacity: 1; } 60% { transform: translateY(0) scale(1); opacity: 1; } 100% { transform: translateY(-4px) scale(1.04); opacity: 0; } }
.animate-allobot-generation-complete { transform-box: fill-box; transform-origin: center; animation: allobotGenerationComplete 0.65s cubic-bezier(0.34, 1.56, 0.64, 1) 1 both; }
@keyframes allobotGenerationCompletionCheck { 0% { stroke-dashoffset: 24; opacity: 0; } 35% { opacity: 1; } 100% { stroke-dashoffset: 0; opacity: 1; } }
.animate-allobot-generation-completion-check { animation: allobotGenerationCompletionCheck 0.45s ease-out 0.08s 1 both; }
.allobot-generation-complete-static { opacity: 1 !important; }
.allobot-generation-complete-static .animate-allobot-generation-completion-check { stroke-dashoffset: 0 !important; opacity: 1 !important; }
.allobot-generation-paused, .allobot-generation-paused * { animation-play-state: paused !important; }
/* Exit transition: the outgoing accessory fades up briefly before the new enters. */
@keyframes allobotExit { to { opacity: 0; transform: translateY(-3px); } }
.allobot-exiting > * { animation: allobotExit 0.2s ease-in forwards; }
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
  [class*="animate-"], [class*="transition-"] {
    animation: none !important;
    transition: none !important;
  }
}
.allobot-motion-disabled *, .allobot-motion-disabled *::before, .allobot-motion-disabled *::after {
  animation: none !important;
  transition: none !important;
}
/* WCAG 2.4.7 Focus Visible — ensure all interactive elements show focus */
*:focus-visible {
  outline: 2px solid #6366f1 !important;
  outline-offset: 2px !important;
  box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.25) !important;
}
[role="button"]:focus-visible, button:focus-visible, a:focus-visible,
input:focus-visible, textarea:focus-visible, select:focus-visible {
  outline: 2px solid #6366f1 !important;
  outline-offset: 2px !important;
}
`}</style>
    <div
      ref={containerRef}
      role="group"
      tabIndex={0} data-help-key="bot_avatar"
      aria-keyshortcuts="ArrowLeft ArrowRight ArrowUp ArrowDown"
      aria-describedby="allobot-move-instructions"
      aria-label={isSleeping ? t('bot.aria_sleeping') : t('bot.aria_active')}
      onKeyDown={handleKeyDown}
      className={`fixed z-[10000] group ${motionDisabled ? 'allobot-motion-disabled' : ''} ${isDragging ? 'cursor-grabbing' : 'cursor-grab'} ${isSleeping ? 'opacity-60 grayscale-[0.5]' : ''} outline-none focus:ring-4 focus:ring-indigo-400 focus:ring-offset-4 rounded-full`}
      style={{
        // The STEAM Lab modal sets an inline zIndex of 10020 (its z-[9999] class is
        // overridden), which buries the bot's z-[10000] — so the bot and its speech
        // bubble/chat were invisible during STEM tools. While the lab is open, lift
        // the bot to 10500: above the lab, below the voice overlays (10999/11500).
        zIndex: showStemLab ? 10500 : undefined,
        top: `${position.y}px`,
        right: `${position.x}px`,
        transform: motionDisabled ? 'translateY(0px) scale(1)' : `translateY(${isHovered && !isDragging && !isSleeping ? '-5px' : '0px'}) scale(${isSquashed ? '1.1, 0.9' : String(pulseScale)})`,
        touchAction: 'none',
        transition: motionDisabled
            ? 'none'
            : (isDragging || isSquashed
                ? 'transform 0.1s cubic-bezier(0.2, 0.8, 0.2, 1)'
                : `top ${moveDuration}ms, right ${moveDuration}ms, transform ${moveDuration}ms cubic-bezier(0.34,1.56,0.64,1), opacity 0.3s, filter 0.3s`),
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onMouseDown={(e) => {
          if (isSleeping) {
              summon();
          } else {
              handleMouseDown(e);
          }
      }}
      onTouchStart={(e) => {
          if (isSleeping) {
              summon();
          } else {
              handleMouseDown(e);
          }
      }}
    >
      <div
        className={motionDisabled ? "" : `${isDragging ? "" : (isFlightActive ? "animate-bot-fly-tilt" : (isLanding ? "animate-bot-land" : (idleAnimation ? `animate-allo-${idleAnimation}` : (isSleeping ? "" : "animate-allo-float"))))} ${isPoofing ? "animate-allo-puff" : ""}`}
        style={motionDisabled ? (isSleeping ? { transform: 'translateY(10px)' } : undefined) : (isDragging ? { transform: `rotate(${dragRotation}deg)`, transition: 'transform 0.2s ease-out' } : (isSleeping ? { transform: 'translateY(10px)' } : undefined))}
      >
          <SpeechBubble
            text={isSleeping ? t('bot.sleeping') : (customMessage || colors.msg)}
            isVisible={(isHovered || effectiveMood === 'thinking' || !!customMessage || isSleeping) && !isDragging && !isPoofing}
            isTruncated={!!customMessage && isTruncated}
            onReadMore={onReadMore}
            onTyping={handleTypingState}
            soundEnabled={soundEnabled && !isSleeping}
            variant={effectiveMood === 'thinking' && !isTalking ? 'thought' : 'speech'}
            disableAnimations={motionDisabled}
            theme={theme}
          />
          {!motionDisabled && reactions.map(r => (
              <ReactionBubble
                  key={r.id}
                  emoji={r.emoji}
                  onComplete={() => setReactions(prev => prev.filter(item => item.id !== r.id))}
              />
          ))}
          {!motionDisabled && bursts.map(b => (
              <BotConfettiBurst
                  key={b.id}
                  onComplete={() => setBursts(prev => prev.filter(item => item.id !== b.id))}
              />
          ))}
          <div
            data-allobot-depth={theme}
            className={`relative ${!motionDisabled && !isFlightActive ? "animate-bot-breathe" : ""} ${!motionDisabled && isCelebrating ? "animate-allo-backflip" : ""}`}
            style={{
                filter: trailFilter,
                transition: motionDisabled ? 'none' : 'filter 0.3s ease',
            }}
          >
              <JetpackParticles active={isFlightActive} />
              <LandingDust active={!motionDisabled && isLanding} />
              {/* A4: sits OUTSIDE the satellite ring on purpose. The satellites
                  are opacity-0 until hover on a fine pointer, and a meter you
                  have to hover to see cannot tell you the mic is picking you up. */}
              <AlloMicMeter active={!!isListening && !isPoofing} motionDisabled={motionDisabled} />
              {!isDragging && !isPoofing && !isSleeping && (
                  <>
                    <button data-help-key="bot_sleep_btn"
                        data-allobot-satellite-kind="hide"
                        type="button"
                        onClick={(e) => {
                             e.preventDefault();
                             handleSleep(e);
                        }}
                        onTouchStart={stopTouch}
                        onPointerDown={(e) => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()}
                        className={`${satellitePos.tr} ${satelliteBase} bg-slate-200 hover:bg-red-100 text-slate-600 hover:text-red-500 border-white focus:ring-2 focus:ring-red-400`}
                        title={onHide ? t('toolbar.hide_bot') : t('bot.sleep_title')}
                        aria-label={onHide ? t('toolbar.hide_bot') : t('bot.sleep_aria')}
                    >
                        <X size={satelliteIconSize} strokeWidth={3} />
                    </button>
                    <button data-help-key="bot_settings_btn"
                        data-allobot-satellite-kind="settings"
                        type="button"
                        onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            if (onVoiceSettingsClick) onVoiceSettingsClick();
                        }}
                        onTouchStart={stopTouch}
                        onPointerDown={(e) => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()}
                        className={`${satellitePos.tl} ${satelliteBase} bg-white hover:bg-indigo-50 text-indigo-500 hover:text-indigo-700 border-indigo-100 focus:ring-2 focus:ring-indigo-400`}
                        title={t('bot.chat_title')}
                        aria-label={t('bot.chat_aria')}
                    >
                        <Settings size={satelliteIconSize} strokeWidth={3} />
                    </button>
                    {onToggleMute && (
                        <button data-help-key="bot_mute_btn"
                            data-allobot-satellite-kind="sound"
                            data-allobot-satellite-state={!soundEnabled ? 'muted' : 'enabled'}
                            type="button"
                            onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                onToggleMute();
                            }}
                            onTouchStart={stopTouch}
                            onPointerDown={(e) => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()}
                            className={`${satellitePos.br} ${satelliteBase} focus:ring-2 focus:ring-indigo-400 ${!soundEnabled ? 'bg-slate-100 text-slate-600 border-slate-200' : 'bg-white hover:bg-indigo-50 text-indigo-500 hover:text-indigo-700 border-indigo-100'}`}
                            title={soundEnabled ? t('bot.mute_on_title') : t('bot.mute_off_title')}
                            aria-label={soundEnabled ? t('bot.mute_on_aria') : t('bot.mute_off_aria')}
                        >
                            {soundEnabled ? <Volume2 size={satelliteIconSize} strokeWidth={3} /> : <VolumeX size={satelliteIconSize} strokeWidth={3} />}
                        </button>
                    )}
                    {onMicClick && (
                        <button data-help-key="bot_mic_btn"
                            data-allobot-satellite-kind="mic"
                            data-allobot-satellite-state={isListening ? 'listening' : 'idle'}
                            type="button"
                            onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                onMicClick();
                            }}
                            onTouchStart={stopTouch}
                            onPointerDown={(e) => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()}
                            // A5: the state was carried by colour alone (red versus not-red).
                            // aria-pressed makes it a real toggle for assistive tech, the
                            // ring makes "live" readable without colour vision, and the
                            // announcement below reports every change to a screen reader.
                            aria-pressed={isListening ? 'true' : 'false'}
                            className={`${satellitePos.bl} ${satelliteBase} focus:ring-2 focus:ring-indigo-400 ${isListening ? 'bg-red-700 text-white border-red-400 ring-2 ring-offset-1 ring-red-500 animate-pulse motion-reduce:animate-none' : 'bg-white hover:bg-indigo-50 text-slate-600 hover:text-indigo-500 border-slate-100'}`}
                            title={isListening ? t('bot.mic_stop_title') : t('bot.mic_start_title')}
                            aria-label={isListening ? t('bot.mic_stop_aria') : t('bot.mic_start_aria')}
                        >
                            {isListening ? <Mic size={satelliteIconSize} strokeWidth={3} /> : <MicOff size={satelliteIconSize} strokeWidth={3} />}
                        </button>
                    )}
                  </>
              )}
              {isSleeping && (
                  <div
                    role="button"
                    tabIndex={0}
                    className="absolute inset-0 z-50 cursor-pointer flex items-center justify-center group-hover:bg-white/10 rounded-full transition-colors motion-reduce:transition-none"
                    onClick={(e) => { e.stopPropagation(); summon(); }}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            e.stopPropagation();
                            summon();
                        }
                    }}
                    title={t('bot.wake_title')}
                    aria-label={t('bot.wake_title')}
                  ></div>
              )}
              <svg width="64" height="64" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="select-none overflow-visible" aria-hidden="true">
                {activeView === 'image' && !isFlightActive && !isDragging && (
                   <g transform="translate(110, 30) scale(0.85) rotate(8)" className="animate-in fade-in zoom-in-95 duration-500" opacity="0.95">
                      <rect x="8" y="5" width="4" height="55" rx="2" fill="#92400E" stroke="#78350F" strokeWidth="0.5" />
                      <rect x="38" y="5" width="4" height="55" rx="2" fill="#92400E" stroke="#78350F" strokeWidth="0.5" />
                      <rect x="22" y="8" width="4" height="52" rx="2" fill="#78350F" transform="rotate(-4 24 35)" />
                      <rect x="3" y="12" width="45" height="32" rx="3" fill="#1F2937" />
                      <rect x="6" y="15" width="39" height="26" rx="2" fill="#FEFCE8" stroke="#E5E7EB" strokeWidth="1" />
                      <circle cx="16" cy="24" r="4" fill="#60A5FA" opacity="0.7" />
                      <circle cx="28" cy="22" r="3" fill="#F472B6" opacity="0.6" />
                      <circle cx="36" cy="32" r="3" fill="#34D399" opacity="0.6" />
                      <ellipse cx="22" cy="33" rx="5" ry="3" fill="#FCD34D" opacity="0.5" />
                      <rect x="0" y="42" width="50" height="4" rx="2" fill="#92400E" stroke="#78350F" strokeWidth="0.5" />
                   </g>
                )}
                {!isFlightActive && !isDragging && (
                    <g
                        data-allobot-ground-shadow={theme}
                        className={isSleeping || motionDisabled ? undefined : "animate-shadow-pulse"}
                    >
                        <ellipse
                            data-allobot-shadow-layer="ambient"
                            cx="50"
                            cy="90"
                            rx="21"
                            ry="4.8"
                            fill="#0F172A"
                            opacity={theme === 'contrast' ? '0.28' : (theme === 'dark' ? '0.24' : '0.16')}
                            filter={theme === 'contrast' ? undefined : `url(#${svgPaintIds.groundShadow})`}
                        />
                        <ellipse
                            data-allobot-shadow-layer="contact"
                            cx="50"
                            cy="89.5"
                            rx="12"
                            ry="1.8"
                            fill={theme === 'contrast' ? '#000000' : '#020617'}
                            opacity={theme === 'contrast' ? '0.58' : (theme === 'dark' ? '0.42' : '0.30')}
                        />
                    </g>
                )}
                    <rect x="25" y="42" width="50" height="8" rx="2" fill={colors.jetpackStroke} />
                    <circle cx="50" cy="46" r="6" fill="#06B6D4" stroke={colors.jetpackStroke} strokeWidth="2" />
                    <circle cx="50" cy="46" r="3" fill="#67E8F9" className="animate-pulse motion-reduce:animate-none" />
                    <path d="M10 36 A10 6 0 0 1 30 36 V 68 L 27 76 H 13 L 10 68 Z" fill={colors.jetpackFill} stroke={colors.jetpackStroke} strokeWidth="2" />
                    <path d="M10 46 H30 M10 60 H30" stroke={colors.jetpackStroke} strokeWidth="1" fill="none" opacity="0.6" />
                    <path d="M70 36 A10 6 0 0 1 90 36 V 68 L 87 76 H 73 L 70 68 Z" fill={colors.jetpackFill} stroke={colors.jetpackStroke} strokeWidth="2" />
                    <path d="M70 46 H90 M70 60 H90" stroke={colors.jetpackStroke} strokeWidth="1" fill="none" opacity="0.6" />
                    {isFlightActive && (
                        <g className="animate-jetpack-flame">
                             <path d="M14 78 Q20 100 26 78 Z" fill="#F59E0B" />
                             <path d="M17 78 Q20 90 23 78 Z" fill="#FEF3C7" />
                             <path d="M74 78 Q80 100 86 78 Z" fill="#F59E0B" />
                             <path d="M77 78 Q80 90 83 78 Z" fill="#FEF3C7" />
                        </g>
                    )}
                {isFlightActive && (
                    <g transform="translate(-10, 0)" className="animate-fade-in" style={{ opacity: 0.6 }}>
                       <rect x="-20" y="20" width="30" height="2" rx="1" fill="white" className="animate-wind-streak" style={{ animationDuration: '0.4s', animationDelay: '0s' }} />
                       <rect x="-10" y="50" width="40" height="1" rx="0.5" fill="white" className="animate-wind-streak" style={{ animationDuration: '0.6s', animationDelay: '0.2s' }} />
                       <rect x="-15" y="80" width="25" height="2" rx="1" fill="white" className="animate-wind-streak" style={{ animationDuration: '0.5s', animationDelay: '0.1s' }} />
                    </g>
                )}
                {effectiveMood === 'thinking' && !isSleeping && !motionDisabled && (
                    <g className={`animate-allobot-generation-enter${generationMotionPaused ? ' allobot-generation-paused' : ''}`}>
                    <g data-allo-generation-family={alloBotGenerationFamily(generationType, activeView)} data-allo-generation-stage={generationStage || 'working'} data-allo-generation-phase={generationAnimationPhase} className="animate-pulse motion-reduce:animate-none" style={{ animationDuration: '2s' }}>
                        <circle
                            cx="50"
                            cy="-25"
                            r="18"
                            pathLength="100"
                            stroke="#FDBA74"
                            strokeWidth="1"
                            strokeOpacity="0.8"
                            strokeDasharray={generationProgressDasharray}
                            strokeDashoffset={generationProgressFraction === null ? 24 : 100 - (generationProgressFraction * 100)}
                            fill="none"
                            className={generationProgressRingClass}
                            aria-hidden="true"
                        />
                        <path
                            d="M 20 -50 L 80 -50 L 54 5 L 46 5 Z"
                            fill={`url(#${svgPaintIds.beam})`}
                            style={{ mixBlendMode: 'screen', pointerEvents: 'none' }}
                            opacity="0.6"
                        >
                            <animate attributeName="opacity" values="0.4; 0.7; 0.4" dur={motionDisabled ? 'indefinite' : '2s'} repeatCount="indefinite" />
                        </path>
                        <path d="M 25 -45 L 75 -45" stroke="#22D3EE" strokeWidth="1" strokeOpacity="0.8">
                             <animate attributeName="d" values="M 46 5 L 54 5; M 20 -50 L 80 -50; M 46 5 L 54 5" dur={motionDisabled ? 'indefinite' : '2s'} repeatCount="indefinite" />
                             <animate attributeName="stroke-opacity" values="0; 1; 0" dur={motionDisabled ? 'indefinite' : '2s'} repeatCount="indefinite" />
                        </path>
                        <g transform="translate(50, -25)" opacity="0.9">
                             <animateTransform
                                attributeName="transform"
                                type="translate"
                                values="50, -25; 50, -32; 50, -25"
                                dur={motionDisabled ? 'indefinite' : '3s'}
                                repeatCount="indefinite"
                             />
                             <g className="animate-hologram-3d">
                                {renderHologramContent()}
                             </g>
                        </g>
                    </g>
                    </g>
                )}
                {accPop && completedGenerationFamily && !isSleeping && (
                    <g transform="translate(50, -25)" data-allo-generation-complete={completedGenerationFamily} data-allo-generation-outcome={completedGenerationOutcome} aria-hidden="true">
                        <g className={motionDisabled ? 'allobot-generation-complete-static' : 'animate-allobot-generation-complete'}>
                            {renderGenerationCompletion(completedGenerationFamily, completedGenerationOutcome)}
                        </g>
                    </g>
                )}
                {isSleeping && (
                    <g className="animate-zzz" style={{ transformOrigin: 'top right' }}>
                        <text x="65" y="10" fontSize="14" fill="#93C5FD" fontWeight="bold" style={{ opacity: 0.8 }}>z</text>
                        <text x="75" y="-5" fontSize="18" fill="#60A5FA" fontWeight="bold" style={STYLE_ANIMATION_DELAY_HALF}>Z</text>
                    </g>
                )}
                <circle cx="50" cy="50" r="45" fill={colors.glow} fillOpacity="0.2" className={isSleeping || motionDisabled ? "" : "animate-pulse motion-reduce:animate-none"} />
                <g
                    className={
                        isSleeping || motionDisabled ? "" :
                        (isMoving ? "transition-transform motion-reduce:transition-none duration-100 ease-out" :
                        (wobbleState.active ? "animate-antenna-spring" : "animate-antenna-sway"))
                    }
                    style={{
                        transformOrigin: '50px 15px',
                        transform: isMoving ? `rotate(${antennaRotation}deg)` : undefined,
                        '--start-deg': `${wobbleState.deg}deg`
                    }}
                >
                    {theme === 'contrast' && (
                        <path
                            d="M50 15V5"
                            stroke="#000000"
                            strokeWidth="7"
                            strokeLinecap="round"
                            data-allobot-antenna-outline="true"
                        />
                    )}
                    <path d="M50 15V5" stroke={colors.antenna} strokeWidth="4" strokeLinecap="round" />
                    {antennaAction === 'signal' && !motionDisabled && !isSleeping && effectiveMood !== 'thinking' && (
                        <g>
                            <circle cx="50" cy="5" r="10" stroke={colors.antenna} strokeWidth="2" fill="none" className="animate-signal-wave" />
                            <circle cx="50" cy="5" r="10" stroke={colors.antenna} strokeWidth="2" fill="none" className="animate-signal-wave" style={STYLE_ANIMATION_DELAY_HALF} />
                            <circle cx="50" cy="5" r="10" stroke={colors.antenna} strokeWidth="2" fill="none" className="animate-signal-wave" style={{ animationDelay: '1.0s' }} />
                        </g>
                    )}
                    <circle
                        cx="50" cy="5" r="5"
                        fill={isSleeping ? "#64748B" : "#FACC15"}
                        stroke={theme === 'contrast' ? '#000000' : 'none'}
                        strokeWidth={theme === 'contrast' ? '2' : '0'}
                        data-allobot-antenna-light={theme}
                        className={
                            effectiveMood === 'thinking' && !motionDisabled && !isSleeping ? "animate-ping" :
                            (!motionDisabled && isTalking ? "animate-pulse motion-reduce:animate-none" :
                            (isSleeping ? "" :
                            (antennaAction === 'bounce' ? "animate-antenna-tri-bounce" : "")))
                        }
                    />
                </g>
                {effectiveMood === 'thinking' && !isSleeping && !motionDisabled && (
                    <g className="animate-pulse motion-reduce:animate-none" style={{ animationDuration: '1.5s' }}>
                        <path
                            d="M 35 40 L 15 5 L 85 5 L 65 40 Z"
                            fill={`url(#${svgPaintIds.hologram})`}
                            opacity="0.6"
                        />
                        <path d="M 15 10 L 85 10" stroke="#22D3EE" strokeWidth="1" opacity="0.4">
                             <animate attributeName="d" values="M 15 10 L 85 10; M 35 35 L 65 35; M 15 10 L 85 10" dur={motionDisabled ? 'indefinite' : '2s'} repeatCount="indefinite" />
                             <animate attributeName="opacity" values="0.4; 0.1; 0.4" dur={motionDisabled ? 'indefinite' : '2s'} repeatCount="indefinite" />
                        </path>
                    </g>
                )}
                <circle
                    cx="50" cy="55" r="35"
                    fill={`url(#${svgPaintIds.body})`}
                    stroke={theme === 'contrast' ? '#000000' : 'none'}
                    strokeWidth={theme === 'contrast' ? '2.5' : '0'}
                    data-allobot-shell={theme}
                />
                <circle cx="50" cy="55" r="35" fill={`url(#${svgPaintIds.rim})`} />
                {accessoryRenderSide && (
                    <g data-allobot-accessory-reflection={accessoryRenderSide} pointerEvents="none">
                        <ellipse
                            cx={accessoryRenderSide === 'left' ? 32 : 68}
                            cy="55"
                            rx="18"
                            ry="26"
                            fill={accessoryAccent}
                            opacity={theme === 'contrast' ? '0.16' : '0.11'}
                        />
                        <path
                            d={accessoryRenderSide === 'left'
                                ? 'M30 28 Q15 39 15 57 Q16 74 29 82'
                                : 'M70 28 Q85 39 85 57 Q84 74 71 82'}
                            stroke={accessoryAccent}
                            strokeWidth="2.6"
                            strokeLinecap="round"
                            fill="none"
                            opacity={theme === 'contrast' ? '0.55' : '0.34'}
                        />
                    </g>
                )}
                {activeView === 'faq' && !isSleeping && !motionDisabled && (
                     <g className="animate-bounce motion-reduce:animate-none" style={{ animationDuration: '2.5s' }}>
                          <text x="50" y="10" fontSize="24" fill="#F59E0B" stroke="#B45309" strokeWidth="1" textAnchor="middle" fontWeight="bold" style={{ filter: 'drop-shadow(0px 2px 2px rgba(0,0,0,0.3))' }}>?</text>
                     </g>
                )}
                <g
                    data-allobot-visor={theme}
                    style={{ transform: `translate(${visorPosition.x + (propGazeX * 0.3)}px, ${visorPosition.y + (propGazeY * 0.3)}px)`, transition: motionDisabled ? 'none' : 'transform 0.1s ease-out' }}
                >
                    <rect
                        x="20"
                        y="30"
                        width="60"
                        height="36"
                        rx="14"
                        fill={theme === 'contrast' ? colors.screenBg : (isTalking ? '#312E81' : colors.screenBg)}
                        className="transition-colors duration-200"
                    />
                    <path
                        d="M 23 38 Q 22 32 36 32 L 68 32 Q 74 32 76 36"
                        fill="none"
                        stroke={`url(#${svgPaintIds.visor})`}
                        strokeWidth="3"
                        strokeLinecap="round"
                        opacity="0.9"
                    />
                    <rect
                        x="20"
                        y="30"
                        width="60"
                        height="36"
                        rx="14"
                        fill="none"
                        stroke={theme === 'contrast' ? colors.glow : (isTalking ? "#6366F1" : "rgba(255,255,255,0.15)")}
                        strokeWidth={theme === 'contrast' ? '3' : '2'}
                    />
                </g>
                <g
                    className={!motionDisabled && !isSleeping && !isDragging ? (isTalking ? "animate-gesture-left" : "animate-float-hands") : ""}
                    style={{ animationDelay: isTalking ? '0s' : '0.2s' }}
                >
                    <circle cx={leftHandX} cy={leftHandY} r="6.5" fill={colors.gradFrom} stroke={theme === 'contrast' ? '#000000' : colors.jetpackStroke} strokeWidth={theme === 'contrast' ? '2' : '1.5'} data-allobot-hand="left" style={{ transition: motionDisabled ? 'none' : 'cx 180ms ease, cy 180ms ease' }} />
                    <circle cx={leftHandX - 2} cy={leftHandY - 2} r="1.35" fill="#FFFFFF" opacity={theme === 'contrast' ? '0.9' : '0.55'} pointerEvents="none" />
                    {activeView === 'image' && !isSleeping && (
                        <g transform="translate(10, 65) rotate(15)">
                            <path
                                d="M -9 0 Q -5 -12 8 -12 Q 18 -10 20 2 Q 22 12 12 16 Q 0 16 -4 10 Q -12 8 -9 0 Z"
                                fill="#D4A373"
                                stroke="#A16207"
                                strokeWidth="1"
                            />
                            <circle cx="14" cy="2" r="2" fill="#1E1B4B" />
                            <circle cx="0" cy="-6" r="2" fill="#EF4444" stroke="rgba(0,0,0,0.1)" strokeWidth="0.5" />
                            <circle cx="6" cy="-8" r="2" fill="#3B82F6" stroke="rgba(0,0,0,0.1)" strokeWidth="0.5" />
                            <circle cx="8" cy="8" r="2" fill="#10B981" stroke="rgba(0,0,0,0.1)" strokeWidth="0.5" />
                            <circle cx="-2" cy="6" r="2" fill="#F59E0B" stroke="rgba(0,0,0,0.1)" strokeWidth="0.5" />
                        </g>
                    )}
                    {heldItem === 'flashlight' && (
                        <circle
                            ref={flashPivotRef}
                            cx="10" cy="65" r="0.5"
                            fill="none"
                            stroke="none"
                            pointerEvents="none"
                            aria-hidden="true"
                        />
                    )}
                    {heldItem === 'flashlight' && (
                        <g transform={`translate(10, 65) rotate(${aimAngle})`}>
                            <path
                                d="M -4 -10 L 4 -10 L 6 5 L 8 8 L -8 8 L -6 5 Z"
                                fill="#94A3B8"
                                stroke="#475569"
                                strokeWidth="1"
                            />
                            <rect x="-2" y="-6" width="4" height="3" rx="1" fill="#334155" />
                            <path
                                d="M -8 8 L 8 8 L 6 10 L -6 10 Z"
                                fill="#FEF08A"
                                stroke="#475569"
                                strokeWidth="0.5"
                            />
                            <ellipse cx="0" cy="9" rx="6" ry="2" fill="#FACC15" fillOpacity="0.8" className="animate-pulse motion-reduce:animate-none" />
                        </g>
                    )}
                </g>
                <g
                    className={!motionDisabled && !isSleeping && !isDragging ? (isTalking ? "animate-gesture-right" : "animate-float-hands") : ""}
                    style={{ animationDelay: isTalking ? '0s' : '0.5s' }}
                >
                    <circle cx={rightHandX} cy={rightHandY} r="6.5" fill={colors.gradFrom} stroke={theme === 'contrast' ? '#000000' : colors.jetpackStroke} strokeWidth={theme === 'contrast' ? '2' : '1.5'} data-allobot-hand="right" style={{ transition: motionDisabled ? 'none' : 'cx 180ms ease, cy 180ms ease' }} />
                    <circle cx={rightHandX - 2} cy={rightHandY - 2} r="1.35" fill="#FFFFFF" opacity={theme === 'contrast' ? '0.9' : '0.55'} pointerEvents="none" />
                </g>
                {heldItem && !isSleeping && !isDragging && (
                    <g
                        id={svgPaintIds.heldItem}
                        data-allobot-held-item="true"
                        data-held-item-side={heldItemRenderSide}
                        className={`animate-in fade-in slide-in-from-bottom-2 duration-300 ${isMoving ? "transition-transform motion-reduce:transition-none duration-100 ease-out" : ""}`}
                        style={{
                            transformOrigin: '90px 65px',
                            transform: isMoving ? `rotate(${propRotation}deg)` : undefined
                        }}
                    >
                        <g transform={heldItemRenderSide === 'left' ? 'translate(100 0) scale(-1 1)' : undefined}>
                        {heldItem === 'pointer' && (
                            <g className="animate-tap-pointer">
                                <line x1="90" y1="65" x2="115" y2="25" stroke="#D4A373" strokeWidth="3" strokeLinecap="round" />
                                <circle cx="115" cy="25" r="4" fill="#EF4444" stroke="#991B1B" strokeWidth="0.5" />
                            </g>
                        )}
                        {heldItem === 'pencil' && activeView !== 'quiz' && (
                             <g transform="translate(90, 65) rotate(45)">
                                  <path d="M -3 -15 L 3 -15 L 3 10 L -3 10 Z" fill="#FBBF24" stroke="#D97706" strokeWidth="1" />
                                  <path d="M -3 -15 L 3 -15 L 0 -22 Z" fill="#FCD34D" />
                                  <path d="M -1 -19 L 1 -19 L 0 -22 Z" fill="#1F2937" />
                                  <rect x="-3" y="10" width="6" height="4" rx="1" fill="#EF4444" stroke="#991B1B" strokeWidth="0.5" />
                                  <rect x="-3" y="8" width="6" height="2" fill="#9CA3AF" />
                             </g>
                        )}
                        {heldItem === 'calculator' && (
                             <g transform="translate(88, 45) rotate(-10)">
                                <rect x="0" y="0" width="18" height="24" rx="2" fill="#1F2937" stroke="#374151" strokeWidth="1" />
                                <rect x="2" y="3" width="14" height="6" fill="#D1FAE5" />
                                <g fill="#6B7280">
                                    <circle cx="4.5" cy="14" r="1.5" />
                                    <circle cx="9" cy="14" r="1.5" />
                                    <circle cx="13.5" cy="14" r="1.5" />
                                    <circle cx="4.5" cy="18" r="1.5" />
                                    <circle cx="9" cy="18" r="1.5" />
                                    <circle cx="13.5" cy="18" r="1.5" fill="#EF4444" />
                                </g>
                             </g>
                        )}
                        {heldItem === 'map' && (
                             <g transform="translate(85, 43) rotate(5)">
                                <path d="M0 2 C 5 0, 15 0, 22 2 L 22 26 C 15 24, 5 24, 0 26 Z" fill="#FEF3C7" stroke="#D97706" strokeWidth="1" />
                                <path d="M2 2 C 6 1, 16 1, 20 2" stroke="#D97706" strokeWidth="0.5" fill="none" opacity="0.5" />
                                <path d="M2 26 C 6 25, 16 25, 20 26" stroke="#D97706" strokeWidth="0.5" fill="none" opacity="0.5" />
                                <path d="M12 9 L18 15 M18 9 L12 15" stroke="#EF4444" strokeWidth="2" strokeLinecap="round" />
                                <path d="M4 20 Q 8 14 12 15" stroke="#92400E" strokeWidth="1.5" strokeDasharray="2 1" fill="none" />
                             </g>
                        )}
                        {heldItem === 'clipboard' && (
                             <g transform="translate(88, 50) rotate(-5)">
                                <rect x="0" y="0" width="18" height="22" fill="#9CA3AF" rx="1" />
                                <rect x="2" y="2" width="14" height="18" fill="white" />
                                <line x1="4" y1="5" x2="14" y2="5" stroke="#CBD5E1" strokeWidth="1" />
                                <line x1="4" y1="9" x2="14" y2="9" stroke="#CBD5E1" strokeWidth="1" />
                                <line x1="4" y1="13" x2="14" y2="13" stroke="#CBD5E1" strokeWidth="1" />
                             </g>
                        )}
                        {heldItem === 'hourglass' && (
                             <g transform="translate(90, 45)">
                                <path d="M0 0 L14 0 L7 10 L0 0 Z" fill="#93C5FD" stroke="#3B82F6" strokeWidth="1" opacity="0.6"/>
                                <path d="M0 20 L14 20 L7 10 L0 20 Z" fill="#93C5FD" stroke="#3B82F6" strokeWidth="1" opacity="0.6"/>
                                <rect x="0" y="0" width="14" height="2" fill="#1F2937" />
                                <rect x="0" y="18" width="14" height="2" fill="#1F2937" />
                                <circle cx="7" cy="15" r="1.5" fill="#FCD34D" />
                             </g>
                        )}
                        {heldItem === 'magnifying-glass' && (
                            <g>
                                <path d="M90 65 L102 53" stroke="#374151" strokeWidth="4" strokeLinecap="round" />
                                <circle cx="106" cy="49" r="14" stroke="#94A3B8" strokeWidth="3" fill="rgba(255, 255, 255, 0.1)" />
                                <circle cx="106" cy="49" r="12" fill="rgba(147, 197, 253, 0.3)" />
                                <path d="M100 45 Q 104 41 110 45" stroke="white" strokeWidth="2" strokeLinecap="round" opacity="0.7" />
                            </g>
                        )}
                        {heldItem === 'book' && (
                             <g transform="translate(90, 45) rotate(-10)">
                                <rect x="0" y="0" width="24" height="32" rx="2" fill="#4B5563" stroke="#1F2937" strokeWidth="1"/>
                                <rect x="3" y="2" width="20" height="28" rx="1" fill="#F8FAFC" />
                                <line x1="7" y1="8" x2="19" y2="8" stroke="#94A3B8" strokeWidth="1.5" strokeLinecap="round" />
                                <line x1="7" y1="14" x2="19" y2="14" stroke="#94A3B8" strokeWidth="1.5" strokeLinecap="round" />
                                <line x1="7" y1="20" x2="19" y2="20" stroke="#94A3B8" strokeWidth="1.5" strokeLinecap="round" />
                                <line x1="7" y1="26" x2="15" y2="26" stroke="#94A3B8" strokeWidth="1.5" strokeLinecap="round" />
                             </g>
                        )}
                        {heldItem === 'globe' && (
                            <g transform="translate(88, 45)">
                                <path d="M10 22 L10 26 M5 26 L15 26" stroke="#4B5563" strokeWidth="2" />
                                <circle cx="10" cy="12" r="10" fill="#3B82F6" />
                                <path d="M3 10 Q 7 5 12 8 T 18 12" stroke="#10B981" strokeWidth="3" fill="none" strokeLinecap="round" />
                                <path d="M5 16 Q 10 18 15 14" stroke="#10B981" strokeWidth="2" fill="none" strokeLinecap="round" />
                                <circle cx="10" cy="12" r="10" stroke="#1D4ED8" strokeWidth="1" fill="none" opacity="0.3" />
                                <ellipse cx="10" cy="12" rx="4" ry="10" stroke="#1D4ED8" strokeWidth="1" fill="none" opacity="0.3" />
                                <line x1="0" y1="12" x2="20" y2="12" stroke="#1D4ED8" strokeWidth="1" opacity="0.3" />
                            </g>
                        )}
                        {heldItem === 'wand' && (
                            <g transform="translate(82, 44) rotate(10)">
                                <rect x="8" y="8" width="4" height="24" fill="#1F2937" rx="1" />
                                <path d="M10 0 L12 6 L18 6 L13 10 L15 16 L10 12 L5 16 L7 10 L2 6 L8 6 Z" fill="#F59E0B" stroke="#D97706" strokeWidth="1" />
                                <circle cx="4" cy="4" r="1" fill="#FCD34D" className="animate-pulse motion-reduce:animate-none" />
                                <circle cx="16" cy="2" r="1" fill="#FCD34D" className="animate-pulse motion-reduce:animate-none" style={{ animationDelay: '0.2s' }} />
                            </g>
                        )}
                        {(heldItem === 'paintbrush' || activeView === 'image') && (
                            <g transform="translate(92, 63) rotate(45)">
                                <rect x="0" y="0" width="4" height="26" rx="1" fill="#D4A373" stroke="#A16207" strokeWidth="0.5" />
                                <rect x="-0.5" y="-8" width="5" height="8" fill="#94A3B8" stroke="#475569" strokeWidth="0.5" />
                                <path d="M0 -8 L-1 -16 Q 2 -20 5 -16 L 4 -8 Z" fill="#FCD34D" stroke="#D97706" strokeWidth="0.5" />
                                <circle cx="2" cy="-18" r="2.5" fill="#3B82F6" className="animate-pulse motion-reduce:animate-none" />
                            </g>
                        )}
                        </g>
                    </g>
                )}
                {isSleeping ? (
                    <g className="transition-all motion-reduce:transition-none duration-500">
                        <path d="M34 49 Q39 53 44 49" stroke={colors.eye} strokeWidth="3" fill="none" strokeLinecap="round" />
                        <path d="M56 49 Q61 53 66 49" stroke={colors.eye} strokeWidth="3" fill="none" strokeLinecap="round" />
                    </g>
                ) : (
                    <g>
                        {/* Keep the eye sockets anchored in the visor; only the pupils
                            track the pointer/prop so Allobot looks rather than sliding
                            its whole face—including its mouth—around the screen. */}
                        <ellipse
                            cx="38" cy="48"
                            rx={eyeRx} ry={eyeRy * blinkScale}
                            fill={colors.eye}
                            className="transition-all motion-reduce:transition-none duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]"
                        />
                        <ellipse
                            cx="62" cy="48"
                            rx={eyeRx} ry={eyeRy * blinkScale}
                            fill={colors.eye}
                            className="transition-all motion-reduce:transition-none duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]"
                        />
                        <g
                            data-allobot-prop-gaze={accessoryRenderSide || 'center'}
                            style={{ transform: `translate(${resolvedGazeX}px, ${resolvedGazeY}px)`, transition: motionDisabled ? 'none' : 'transform 0.1s ease-out' }}
                        >
                            <ellipse cx="38" cy="48" rx="2.5" ry={Math.min(2.6, Math.max(1.6, eyeRy * 0.42)) * blinkScale} fill={colors.screenBg} className="transition-all motion-reduce:transition-none duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]" />
                            <ellipse cx="62" cy="48" rx="2.5" ry={Math.min(2.6, Math.max(1.6, eyeRy * 0.42)) * blinkScale} fill={colors.screenBg} className="transition-all motion-reduce:transition-none duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]" />
                            <circle cx="37.2" cy="47.1" r={0.75 * blinkScale} fill="white" opacity="0.9" />
                            <circle cx="61.2" cy="47.1" r={0.75 * blinkScale} fill="white" opacity="0.9" />
                        </g>
                    </g>
                )}
                <path
                    d={getMouthPath()}
                    stroke={colors.mouth}
                    strokeWidth={theme === 'contrast' ? '2.5' : '2'}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    fill="none"
                    className="mouth-transition"
                />
                {!isSleeping && effectiveMood !== 'idle' && (
                    <g className="transition-all motion-reduce:transition-none duration-300">
                        {effectiveMood === 'happy' && <path d="M33 42 Q38 39 43 42" stroke={colors.eye} strokeWidth="2" fill="none" strokeLinecap="round" />}
                        {effectiveMood === 'sad' && <path d="M33 39 Q38 41 43 43" stroke={colors.eye} strokeWidth="2" fill="none" strokeLinecap="round" />}
                        {effectiveMood === 'thinking' && <path d="M33 42 Q38 42 43 42" stroke={colors.eye} strokeWidth="2" fill="none" strokeLinecap="round" />}
                        {effectiveMood === 'happy' && <path d="M57 42 Q62 39 67 42" stroke={colors.eye} strokeWidth="2" fill="none" strokeLinecap="round" />}
                        {effectiveMood === 'sad' && <path d="M57 43 Q62 41 67 39" stroke={colors.eye} strokeWidth="2" fill="none" strokeLinecap="round" />}
                        {effectiveMood === 'thinking' && <path d="M57 39 Q62 37 67 39" stroke={colors.eye} strokeWidth="2" fill="none" strokeLinecap="round" />}
                    </g>
                )}
                {effectiveAccessory && (
                    <g
                        id={svgPaintIds.accessories}
                        data-allobot-accessories="true"
                        data-accessory-side={accessoryRenderSide || 'center'}
                        data-accessory-preferred-side={accessoryPreferredSide || 'center'}
                        className={`${accExiting ? 'allobot-exiting ' : ''}${effectiveMood === 'thinking' ? 'allobot-thinking' : (accPop ? 'allobot-pop' : '')}`.trim() || undefined}
                    >
                      <g transform={accessoryTranslateX ? `translate(${accessoryTranslateX} 0)` : undefined}>
                        <g
                            key={`${effectiveAccessory}-${accessoryRenderSide || 'center'}`}
                            className={!motionDisabled && accessoryRenderSide ? `animate-allobot-accessory-arrive-${accessoryRenderSide}` : undefined}
                        >
                          <g
                              data-accessory-scale={accessoryScale}
                              style={accessoryRenderSide ? {
                                  transform: `scale(${accessoryScale})`,
                                  transformBox: 'fill-box',
                                  transformOrigin: accessoryRenderSide === 'left' ? 'right center' : 'left center',
                                  filter: accessoryDepthFilter,
                              } : undefined}
                          >
                         {effectiveAccessory === 'grad-cap' && (
                            <g className="animate-in fade-in slide-in-from-top-2 duration-700 origin-center">
                            <g className="animate-allobot-perk" style={{ animationDelay: '1.2s' }}>
                                <path d="M32 30 Q50 36 68 30 V 22 H 32 V 30 Z" fill="#1F2937" />
                                <path d="M15 22 L50 8 L85 22 L50 36 Z" fill="#111827" stroke="#374151" strokeWidth="2" />
                                <path d="M50 22 L82 22 L82 42" stroke="#F59E0B" strokeWidth="2" fill="none" className="drop-shadow-sm"/>
                                <circle cx="82" cy="42" r="2.5" fill="#F59E0B" />
                            </g>
                            </g>
                        )}
                        {effectiveAccessory === 'explorer-hat' && (
                            <g className="animate-in fade-in slide-in-from-top-2 duration-700 origin-center">
                            <g className="animate-allobot-perk" style={{ animationDelay: '3.3s' }}>
                                <ellipse cx="50" cy="22" rx="38" ry="10" fill="#D2B48C" stroke="#8B4513" strokeWidth="1.5" transform="rotate(-5 50 22)" />
                                <path d="M32 22 L35 4 Q50 0 65 4 L68 22 Z" fill="#D2B48C" stroke="#8B4513" strokeWidth="1.5" transform="rotate(-5 50 22)" />
                                <path d="M32 19 Q50 23 68 19" stroke="#3E2723" strokeWidth="4" fill="none" transform="rotate(-5 50 22)" />
                            </g>
                            </g>
                        )}
                        {effectiveAccessory === 'magnifying-glass' && (
                            <g className="animate-in fade-in slide-in-from-bottom-2 duration-500 origin-bottom-right">
                                <path d="M72 78 L84 58" stroke="#374151" strokeWidth="4" strokeLinecap="round" />
                                <circle cx="84" cy="58" r="14" stroke="#94A3B8" strokeWidth="3" fill="rgba(255, 255, 255, 0.1)" />
                                <circle cx="84" cy="58" r="12" fill="rgba(147, 197, 253, 0.3)" />
                                <path d="M78 54 Q 82 50 88 54" stroke="white" strokeWidth="2" strokeLinecap="round" opacity="0.7" />
                            </g>
                        )}
                        {effectiveAccessory === 'artist' && (
                            <g className="animate-in fade-in slide-in-from-top-2 duration-700 origin-center">
                            <g className="animate-allobot-perk" style={{ animationDelay: '5.1s' }}>
                                <path
                                    d="M 25 28 Q 15 28 15 20 Q 15 5 45 2 Q 85 -2 90 10 Q 95 22 80 26 Q 70 29 55 27"
                                    fill="#374151"
                                    stroke="#1F2937"
                                    strokeWidth="1.5"
                                    transform="rotate(-10 50 20)"
                                />
                                <path
                                    d="M 58 4 L 62 0"
                                    stroke="#374151"
                                    strokeWidth="3"
                                    strokeLinecap="round"
                                    transform="rotate(-10 50 20)"
                                />
                            </g>
                            </g>
                        )}
                        {effectiveAccessory === 'hard-hat' && (
                            <g className="animate-in fade-in slide-in-from-top-2 duration-700 origin-center">
                                <path d="M25 26 Q25 6 50 4 Q75 6 75 26 Z" fill="#F59E0B" stroke="#D97706" strokeWidth="1.5" />
                                <path d="M18 26 Q50 32 82 26 Q80 28 50 33 Q20 28 18 26 Z" fill="#D97706" stroke="#B45309" strokeWidth="1" />
                                <path d="M38 8 Q50 5 62 8" stroke="#FCD34D" strokeWidth="2" fill="none" opacity="0.6" />
                                <circle cx="50" cy="18" r="5" fill="#374151" stroke="#1F2937" strokeWidth="1" />
                                <circle cx="50" cy="18" r="3" fill="#FEF3C7" opacity="0.9" />
                                <circle cx="50" cy="18" r="7" fill="#FEF3C7" opacity="0.15" />
                            </g>
                        )}
                        {effectiveAccessory === 'sleep-cap' && (
                            <g className="animate-in fade-in slide-in-from-top-2 duration-700 origin-center">
                                <path d="M30 24 Q28 12 40 6 Q55 0 70 10 Q85 22 80 40 Q78 48 74 52" fill="#6366F1" stroke="#4F46E5" strokeWidth="1.5" />
                                <path d="M35 18 Q50 12 65 18" stroke="#818CF8" strokeWidth="2.5" fill="none" opacity="0.5" />
                                <path d="M40 12 Q52 7 64 14" stroke="#818CF8" strokeWidth="2" fill="none" opacity="0.4" />
                                <circle cx="74" cy="52" r="6" fill="#C4B5FD" stroke="#A78BFA" strokeWidth="1" />
                                <circle cx="72" cy="50" r="2" fill="white" opacity="0.4" />
                                <path d="M28 24 Q50 28 72 22" stroke="#4338CA" strokeWidth="2.5" fill="none" />
                            </g>
                        )}
                        {effectiveAccessory === 'microscope' && (
                            <g className="animate-in fade-in slide-in-from-left-3 duration-500" transform="translate(-28, 8)" data-accessory-placement="side-left" data-accessory-name="Microscope">
                                <ellipse cx="8" cy="82" rx="14" ry="4" fill="#334155" />
                                <rect x="2" y="78" width="12" height="4" rx="1" fill="#475569" />
                                <rect x="6" y="38" width="4" height="42" rx="1" fill="#64748B" />
                                <path d="M8 40 Q8 32 16 28" stroke="#64748B" strokeWidth="4" fill="none" strokeLinecap="round" />
                                <rect x="13" y="22" width="6" height="18" rx="2" fill="#94A3B8" stroke="#475569" strokeWidth="1" />
                                <rect x="11" y="18" width="10" height="6" rx="2" fill="#334155" />
                                <ellipse cx="16" cy="18" rx="5" ry="2" fill="#1e293b" />
                                <ellipse cx="15" cy="17" rx="2" ry="1" fill="white" opacity="0.3" />
                                <rect x="14" y="40" width="4" height="5" rx="1" fill="#334155" />
                                <circle cx="16" cy="46" r="3" fill="#93c5fd" opacity="0.5" stroke="#475569" strokeWidth="1" />
                                <rect x="4" y="48" width="22" height="3" rx="1" fill="#475569" />
                                <rect x="8" y="47" width="12" height="2" rx="0.5" fill="rgba(219, 234, 254, 0.6)" stroke="#93c5fd" strokeWidth="0.5" />
                                <circle cx="2" cy="52" r="3" fill="#64748B" stroke="#475569" strokeWidth="1" />
                                <circle cx="2" cy="52" r="1.5" fill="#94a3b8" />
                                <circle cx="16" cy="46" r="6" fill="rgba(147, 197, 253, 0.15)">
                                    <animate attributeName="opacity" values="0.1;0.25;0.1" dur={motionDisabled ? 'indefinite' : '3s'} repeatCount="indefinite" />
                                </circle>
                            </g>
                        )}
                        {effectiveAccessory === 'historian' && (
                            <g className="animate-in fade-in slide-in-from-left-3 duration-500" transform="translate(-22, 38)" data-accessory-placement="side-left" data-accessory-name="History Sources">
                                <ellipse cx="14" cy="48" rx="18" ry="3" fill="#7C2D12" opacity="0.25" />
                                <g transform="rotate(-14 6 32)">
                                    <rect x="-4" y="14" width="20" height="26" rx="1" fill="#FEF3C7" stroke="#92400E" strokeWidth="1" />
                                    <line x1="0" y1="20" x2="12" y2="20" stroke="#78350F" strokeWidth="0.6" />
                                    <line x1="0" y1="24" x2="12" y2="24" stroke="#78350F" strokeWidth="0.6" />
                                    <line x1="0" y1="28" x2="10" y2="28" stroke="#78350F" strokeWidth="0.6" />
                                    <line x1="0" y1="32" x2="12" y2="32" stroke="#78350F" strokeWidth="0.6" />
                                    <line x1="0" y1="36" x2="9" y2="36" stroke="#78350F" strokeWidth="0.6" />
                                </g>
                                <g>
                                    <rect x="4" y="12" width="20" height="26" rx="1" fill="#FFFBEB" stroke="#7C2D12" strokeWidth="1" />
                                    <circle cx="20" cy="16" r="2" fill="#DC2626" stroke="#7F1D1D" strokeWidth="0.5" />
                                    <path d="M19 15 L21 15 M20 14 L20 16" stroke="#FECACA" strokeWidth="0.4" />
                                    <line x1="7" y1="22" x2="17" y2="22" stroke="#7C2D12" strokeWidth="0.6" />
                                    <line x1="7" y1="26" x2="18" y2="26" stroke="#7C2D12" strokeWidth="0.6" />
                                    <line x1="7" y1="30" x2="15" y2="30" stroke="#7C2D12" strokeWidth="0.6" />
                                    <line x1="7" y1="34" x2="17" y2="34" stroke="#7C2D12" strokeWidth="0.6" />
                                </g>
                                <g transform="rotate(14 22 32)">
                                    <rect x="12" y="14" width="20" height="26" rx="1" fill="#FED7AA" stroke="#9A3412" strokeWidth="1" />
                                    <line x1="16" y1="20" x2="28" y2="20" stroke="#9A3412" strokeWidth="0.6" />
                                    <line x1="16" y1="24" x2="28" y2="24" stroke="#9A3412" strokeWidth="0.6" />
                                    <line x1="16" y1="28" x2="26" y2="28" stroke="#9A3412" strokeWidth="0.6" />
                                </g>
                                <g>
                                    <path d="M 22 8 Q 30 -2 34 -10" stroke="#1F2937" strokeWidth="1.2" fill="none" strokeLinecap="round" />
                                    <path d="M 20 10 Q 28 0 34 -10 Q 32 -2 28 6 Q 24 10 20 10 Z" fill="#0F172A" stroke="#1F2937" strokeWidth="0.5" opacity="0.85">
                                        <animateTransform attributeName="transform" type="rotate" values="0 22 8;3 22 8;0 22 8;-3 22 8;0 22 8" dur={motionDisabled ? 'indefinite' : '6s'} repeatCount="indefinite" />
                                    </path>
                                    <circle cx="22" cy="9" r="1.4" fill="#1E40AF" />
                                </g>
                            </g>
                        )}
                        {effectiveAccessory === 'teacher-stack' && (
                            <g className="animate-in fade-in slide-in-from-left-3 duration-500" transform="translate(-20, 34)" data-accessory-placement="side-left" data-accessory-name="Teacher Resource Stack">
                            <g className="animate-allobot-float" style={{ animationDelay: '3.5s' }}>
                                <ellipse cx="16" cy="52" rx="18" ry="3" fill="#1F2937" opacity="0.18" />
                                <rect x="0" y="40" width="34" height="11" rx="1.5" fill="#FCD34D" stroke="#B45309" strokeWidth="1.2" transform="rotate(-3 17 45)" />
                                <line x1="5" y1="45" x2="24" y2="45" stroke="#B45309" strokeWidth="0.7" transform="rotate(-3 17 45)" />
                                <rect x="2" y="30" width="32" height="11" rx="1.5" fill="#34D399" stroke="#047857" strokeWidth="1.2" transform="rotate(2 18 35)" />
                                <line x1="7" y1="35" x2="26" y2="35" stroke="#047857" strokeWidth="0.7" transform="rotate(2 18 35)" />
                                <rect x="1" y="20" width="32" height="11" rx="1.5" fill="#60A5FA" stroke="#1D4ED8" strokeWidth="1.2" transform="rotate(-2 17 25)" />
                                <line x1="6" y1="25" x2="25" y2="25" stroke="#1D4ED8" strokeWidth="0.7" transform="rotate(-2 17 25)" />
                                <g transform="translate(17, 9)">
                                    <path d="M 0 3 C -7 3 -9 9 -6 14 C -4 17 -2 18 0 17 C 2 18 4 17 6 14 C 9 9 7 3 0 3 Z" fill="#EF4444" stroke="#991B1B" strokeWidth="1" />
                                    <path d="M 0 4 Q -1 6 0 7 Q 1 6 0 4 Z" fill="#B91C1C" opacity="0.6" />
                                    <path d="M 0 4 L 0 -2" stroke="#7C2D12" strokeWidth="1.6" strokeLinecap="round" />
                                    <path d="M 0 -1 Q 6 -4 8 1 Q 3 2 0 -1 Z" fill="#22C55E" stroke="#15803D" strokeWidth="0.6" />
                                    <ellipse cx="-2.5" cy="8" rx="1.8" ry="3" fill="#fff" opacity="0.45" transform="rotate(-20 -2.5 8)" />
                                </g>
                            </g>
                            </g>
                        )}
                        {effectiveAccessory === 'scholar-specs' && (
                            <g className="animate-in fade-in slide-in-from-top-2 duration-500 origin-center">
                            <g className="animate-allobot-float" style={{ animationDelay: '1.0s' }}>
                                <circle cx="38" cy="48" r="9" fill="rgba(219, 234, 254, 0.25)" stroke="#1F2937" strokeWidth="1.5" />
                                <circle cx="62" cy="48" r="9" fill="rgba(219, 234, 254, 0.25)" stroke="#1F2937" strokeWidth="1.5" />
                                <path d="M 47 48 Q 50 45 53 48" stroke="#1F2937" strokeWidth="1.5" fill="none" strokeLinecap="round" />
                                <path d="M 29 47 Q 24 45 22 47" stroke="#1F2937" strokeWidth="1.2" fill="none" strokeLinecap="round" />
                                <path d="M 71 47 Q 76 45 78 47" stroke="#1F2937" strokeWidth="1.2" fill="none" strokeLinecap="round" />
                                <ellipse cx="35" cy="46" rx="2.5" ry="1.4" fill="white" opacity="0.55" />
                                <ellipse cx="59" cy="46" rx="2.5" ry="1.4" fill="white" opacity="0.55" />
                                <g transform="translate(-26, 56)">
                                    <path d="M 0 0 L 28 0 L 28 18 L 0 18 Z" fill="#FFFBEB" stroke="#78350F" strokeWidth="1" />
                                    <path d="M 14 0 L 14 18" stroke="#78350F" strokeWidth="0.8" />
                                    <line x1="3" y1="4" x2="11" y2="4" stroke="#92400E" strokeWidth="0.5" />
                                    <line x1="3" y1="7" x2="12" y2="7" stroke="#92400E" strokeWidth="0.5" />
                                    <line x1="3" y1="10" x2="10" y2="10" stroke="#92400E" strokeWidth="0.5" />
                                    <line x1="3" y1="13" x2="11" y2="13" stroke="#92400E" strokeWidth="0.5" />
                                    <line x1="17" y1="4" x2="25" y2="4" stroke="#92400E" strokeWidth="0.5" />
                                    <line x1="17" y1="7" x2="24" y2="7" stroke="#92400E" strokeWidth="0.5" />
                                    <line x1="17" y1="10" x2="25" y2="10" stroke="#92400E" strokeWidth="0.5" />
                                    <line x1="17" y1="13" x2="23" y2="13" stroke="#92400E" strokeWidth="0.5" />
                                    <path d="M -2 0 L 30 0 L 30 -2 L -2 -2 Z" fill="#7C2D12" stroke="#451A03" strokeWidth="0.8" />
                                </g>
                            </g>
                            </g>
                        )}
                        {effectiveAccessory === 'librarian-kit' && (
                            <g className="animate-in fade-in slide-in-from-top-2 duration-500 origin-center">
                            <g className="animate-allobot-float" style={{ animationDelay: '0.8s' }}>
                                <g>
                                    <circle cx="38" cy="48" r="8.5" fill="rgba(219, 234, 254, 0.22)" stroke="#334155" strokeWidth="1.5" />
                                    <circle cx="62" cy="48" r="8.5" fill="rgba(219, 234, 254, 0.22)" stroke="#334155" strokeWidth="1.5" />
                                    <path d="M46.5 48 Q50 45 53.5 48" stroke="#334155" strokeWidth="1.5" fill="none" strokeLinecap="round" />
                                    <path d="M29.5 48 Q23 49 20 54" stroke="#334155" strokeWidth="1.1" fill="none" strokeLinecap="round" opacity="0.85" />
                                    <path d="M70.5 48 Q77 49 80 54" stroke="#334155" strokeWidth="1.1" fill="none" strokeLinecap="round" opacity="0.85" />
                                    <ellipse cx="35.5" cy="45.5" rx="2.2" ry="1.2" fill="white" opacity="0.55" />
                                    <ellipse cx="59.5" cy="45.5" rx="2.2" ry="1.2" fill="white" opacity="0.55" />
                                </g>
                                <g transform="translate(70, 58) rotate(-7)">
                                    <rect x="0" y="0" width="26" height="20" rx="2" fill={colors.accPaper} stroke={colors.accInk} strokeWidth="1.3" />
                                    <rect x="0" y="0" width="6" height="20" rx="1.5" fill="#6366F1" stroke="#4338CA" strokeWidth="0.8" />
                                    <line x1="9" y1="6" x2="22" y2="6" stroke={colors.accInk} strokeWidth="1" opacity="0.65" />
                                    <line x1="9" y1="10" x2="20" y2="10" stroke={colors.accInk} strokeWidth="1" opacity="0.45" />
                                    <line x1="9" y1="14" x2="22" y2="14" stroke={colors.accInk} strokeWidth="1" opacity="0.45" />
                                    <path d="M18 0 L22 0 L22 8 L20 6 L18 8 Z" fill="#F59E0B" stroke="#B45309" strokeWidth="0.6" />
                                </g>
                                <g transform="translate(-27, 56) rotate(5)">
                                    <rect x="0" y="0" width="30" height="22" rx="2" fill="#FFFBEB" stroke="#92400E" strokeWidth="1.2" />
                                    <rect x="0" y="0" width="30" height="6" rx="2" fill="#FDE68A" stroke="#B45309" strokeWidth="0.7" />
                                    <circle cx="6" cy="13" r="2.2" fill="#A78BFA" stroke="#6D28D9" strokeWidth="0.6" />
                                    <line x1="12" y1="11" x2="25" y2="11" stroke="#92400E" strokeWidth="0.9" opacity="0.65" />
                                    <line x1="12" y1="15" x2="23" y2="15" stroke="#92400E" strokeWidth="0.9" opacity="0.45" />
                                    <line x1="5" y1="19" x2="25" y2="19" stroke="#92400E" strokeWidth="0.8" opacity="0.35" />
                                </g>
                                <path d="M36 76 Q50 84 64 76" stroke="#FDE68A" strokeWidth="3" fill="none" strokeLinecap="round" opacity="0.95" />
                                <circle cx="50" cy="80" r="2.5" fill="#F59E0B" stroke="#92400E" strokeWidth="0.8" />
                            </g>
                            </g>
                        )}
                        {effectiveAccessory === 'thinking-cap' && (
                            <g className="animate-in fade-in slide-in-from-top-2 duration-700 origin-center">
                                <path d="M 28 26 Q 25 8 50 6 Q 75 8 72 26 Z" fill="#7C3AED" stroke="#5B21B6" strokeWidth="1.5" />
                                <path d="M 28 26 Q 50 30 72 26" stroke="#4C1D95" strokeWidth="2" fill="none" />
                                <ellipse cx="50" cy="6" rx="4" ry="2" fill="#A78BFA" opacity="0.5" />
                                <g transform="translate(50, 0)">
                                    <ellipse cx="0" cy="-4" rx="5" ry="6" fill="#FEF08A" stroke="#CA8A04" strokeWidth="1" />
                                    <ellipse cx="-1.5" cy="-6" rx="1.5" ry="2" fill="#FFFBEB" opacity="0.7" />
                                    <rect x="-2.5" y="1" width="5" height="2" rx="0.5" fill="#94A3B8" />
                                    <rect x="-2" y="3" width="4" height="1.5" rx="0.5" fill="#64748B" />
                                    <circle cx="0" cy="-4" r="9" fill="#FEF08A" opacity="0.18">
                                        <animate attributeName="opacity" values="0.1;0.32;0.1" dur={motionDisabled ? 'indefinite' : '2.4s'} repeatCount="indefinite" />
                                        <animate attributeName="r" values="8;11;8" dur={motionDisabled ? 'indefinite' : '2.4s'} repeatCount="indefinite" />
                                    </circle>
                                </g>
                                <g>
                                    <g>
                                        <path d="M 0 -2 L 0.6 -0.6 L 2 0 L 0.6 0.6 L 0 2 L -0.6 0.6 L -2 0 L -0.6 -0.6 Z" fill="#FBBF24" stroke="#D97706" strokeWidth="0.4" transform="translate(70 -8)" />
                                    </g>
                                    <animateTransform attributeName="transform" type="rotate" from="0 50 -2" to="360 50 -2" dur={motionDisabled ? 'indefinite' : '9s'} repeatCount="indefinite" />
                                </g>
                                <g>
                                    <g>
                                        <path d="M 0 -1.6 L 0.5 -0.5 L 1.6 0 L 0.5 0.5 L 0 1.6 L -0.5 0.5 L -1.6 0 L -0.5 -0.5 Z" fill="#F472B6" stroke="#BE185D" strokeWidth="0.4" transform="translate(74 -2)" />
                                    </g>
                                    <animateTransform attributeName="transform" type="rotate" from="120 50 -2" to="480 50 -2" dur={motionDisabled ? 'indefinite' : '11s'} repeatCount="indefinite" />
                                </g>
                                <g>
                                    <g>
                                        <path d="M 0 -1.4 L 0.45 -0.45 L 1.4 0 L 0.45 0.45 L 0 1.4 L -0.45 0.45 L -1.4 0 L -0.45 -0.45 Z" fill="#60A5FA" stroke="#1E40AF" strokeWidth="0.4" transform="translate(72 4)" />
                                    </g>
                                    <animateTransform attributeName="transform" type="rotate" from="240 50 -2" to="600 50 -2" dur={motionDisabled ? 'indefinite' : '8s'} repeatCount="indefinite" />
                                </g>
                            </g>
                        )}
                        {effectiveAccessory === 'sorting-cubes' && (
                            <g data-accessory-placement="head-and-side" data-accessory-name="Sort-of-a-Hat">
                                {/* A playful, original concept-sorting cap: crooked and patchwork, but
                                    category-themed rather than modeled on any existing character. */}
                                <g className="animate-in fade-in slide-in-from-top-2 duration-700 origin-center">
                                    <g className="animate-allobot-perk" style={{ animationDelay: '2.4s' }}>
                                        <ellipse cx="50" cy="26" rx="28" ry="5" fill="#312E81" stroke="#1E1B4B" strokeWidth="1.2" transform="rotate(-2 50 26)" />
                                        <path d="M27 24 Q30 16 39 12 Q44 4 41 -7 Q52 -4 58 7 Q69 11 72 24 Q50 29 27 24 Z" fill="#7C3AED" stroke="#4C1D95" strokeWidth="1.4" />
                                        <path d="M31 21 Q50 26 69 21" stroke="#FBBF24" strokeWidth="3.2" fill="none" />
                                        <path d="M43 8 L50 4 L55 10 L50 15 L42 13 Z" fill="#A78BFA" stroke="#5B21B6" strokeWidth="0.7" transform="rotate(-8 49 10)" />
                                        <text x="48.5" y="12" fontFamily="Arial" fontSize="6" fontWeight="bold" fill="#F5F3FF" textAnchor="middle">A</text>
                                        <circle cx="61" cy="16" r="4" fill="#34D399" stroke="#065F46" strokeWidth="0.7" />
                                        <text x="61" y="18" fontFamily="Arial" fontSize="5.5" fontWeight="bold" fill="#052E16" textAnchor="middle">B</text>
                                        <path d="M35 18 Q38 14 41 18 Q39 21 36 23" stroke="#F9A8D4" strokeWidth="1.1" fill="none" strokeLinecap="round" />
                                        <circle cx="35.5" cy="24" r="0.8" fill="#F9A8D4" />
                                    </g>
                                </g>

                                {/* Sortable objects belong beside the bot, not balanced on its head. */}
                                <g className="animate-in fade-in slide-in-from-left-3 duration-500" transform="translate(-30, 32)">
                                    <g className="animate-allobot-float" style={{ animationDelay: '1.1s' }}>
                                        <ellipse cx="17" cy="49" rx="17" ry="3" fill="#1F2937" opacity="0.18" />
                                        <g transform="translate(3 33) rotate(-6)">
                                            <rect x="0" y="0" width="14" height="14" rx="1.5" fill="#3B82F6" stroke="#1E3A8A" strokeWidth="1" />
                                            <path d="M 0 0 L 14 0 L 14 14" stroke="#60A5FA" strokeWidth="1" fill="none" opacity="0.6" />
                                            <circle cx="4" cy="4" r="1" fill="#DBEAFE" opacity="0.7" />
                                        </g>
                                        <g transform="translate(14 22) rotate(8)">
                                            <rect x="0" y="0" width="14" height="14" rx="1.5" fill="#22C55E" stroke="#14532D" strokeWidth="1" />
                                            <path d="M 0 0 L 14 0 L 14 14" stroke="#4ADE80" strokeWidth="1" fill="none" opacity="0.6" />
                                            <path d="M 3 7 L 6 10 L 11 4" stroke="#DCFCE7" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                                        </g>
                                        <g transform="translate(5 8) rotate(-4)">
                                            <rect x="0" y="0" width="13" height="13" rx="1.5" fill="#EF4444" stroke="#7F1D1D" strokeWidth="1" />
                                            <path d="M 0 0 L 13 0 L 13 13" stroke="#FCA5A5" strokeWidth="1" fill="none" opacity="0.6" />
                                            <path d="M 4 4 L 9 9 M 9 4 L 4 9" stroke="#FEE2E2" strokeWidth="1.4" strokeLinecap="round" />
                                        </g>
                                    </g>
                                </g>
                            </g>
                        )}
                        {effectiveAccessory === 'clarity-crown' && (
                            <g className="animate-in fade-in slide-in-from-top-2 duration-700 origin-center">
                            <g className="animate-allobot-perk" style={{ animationDelay: '4.2s' }}>
                                <path d="M 22 28 L 28 12 L 35 22 L 42 8 L 50 20 L 58 8 L 65 22 L 72 12 L 78 28 Z" fill="#FCD34D" stroke="#B45309" strokeWidth="1.4" />
                                <path d="M 22 28 Q 50 32 78 28" stroke="#92400E" strokeWidth="1.6" fill="none" />
                                <circle cx="28" cy="13" r="2.4" fill="#FDE68A" stroke="#92400E" strokeWidth="0.6" />
                                <g transform="translate(35 17)">
                                    <circle cx="0" cy="0" r="2.2" fill="#FBBF24" stroke="#92400E" strokeWidth="0.4" />
                                    <line x1="-3" y1="0" x2="-2" y2="0" stroke="#92400E" strokeWidth="0.5" />
                                    <line x1="3" y1="0" x2="2" y2="0" stroke="#92400E" strokeWidth="0.5" />
                                    <line x1="0" y1="-3" x2="0" y2="-2" stroke="#92400E" strokeWidth="0.5" />
                                    <line x1="0" y1="3" x2="0" y2="2" stroke="#92400E" strokeWidth="0.5" />
                                </g>
                                <path d="M 42 8 Q 40 12 42 18 Q 44 12 42 8 Z" fill="#60A5FA" stroke="#1E40AF" strokeWidth="0.6" />
                                <ellipse cx="50" cy="15" rx="2.5" ry="3.5" fill="#22C55E" stroke="#14532D" strokeWidth="0.6" />
                                <line x1="50" y1="11" x2="50" y2="18" stroke="#14532D" strokeWidth="0.5" />
                                <path d="M 58 8 Q 56 12 58 18 Q 60 12 58 8 Z" fill="#F472B6" stroke="#BE185D" strokeWidth="0.6" />
                                <circle cx="65" cy="17" r="2.2" fill="#A78BFA" stroke="#5B21B6" strokeWidth="0.5" />
                                <circle cx="72" cy="13" r="2.4" fill="#FDE68A" stroke="#92400E" strokeWidth="0.6" />
                            </g>
                            </g>
                        )}
                        {effectiveAccessory === 'deerstalker' && (
                            <g className="animate-in fade-in slide-in-from-top-2 duration-700 origin-center">
                            <g className="animate-allobot-perk" style={{ animationDelay: '0s' }}>
                                <ellipse cx="50" cy="25" rx="33" ry="6.5" fill="#8C7A6B" stroke="#5C4D40" strokeWidth="1.2" />
                                <path d="M19 23 Q11 25 14 35 Q21 35 25 28 Z" fill="#8C7A6B" stroke="#5C4D40" strokeWidth="1.1" />
                                <path d="M81 23 Q89 25 86 35 Q79 35 75 28 Z" fill="#8C7A6B" stroke="#5C4D40" strokeWidth="1.1" />
                                <path d="M25 25 Q23 5 50 4 Q77 5 75 25 Z" fill="#A6968A" stroke="#5C4D40" strokeWidth="1.4" />
                                <path d="M50 4 L50 25" stroke="#5C4D40" strokeWidth="0.8" opacity="0.45" />
                                <path d="M40 25 Q50 31 60 25 L58 22 Q50 25 42 22 Z" fill="#7A6B5D" stroke="#5C4D40" strokeWidth="1" />
                                <g fill="#5C4D40" opacity="0.5"><circle cx="42" cy="14" r="1" /><circle cx="50" cy="10" r="1" /><circle cx="58" cy="14" r="1" /><circle cx="46" cy="19" r="1" /><circle cx="54" cy="19" r="1" /></g>
                            </g>
                            </g>
                        )}
                        {effectiveAccessory === 'persona-masks' && (
                            <g className="animate-in fade-in slide-in-from-left-3 duration-500" transform="translate(-24, 40)" data-accessory-placement="side-left" data-accessory-name="Persona Masks">
                            <g className="animate-allobot-sway" style={{ animationDelay: '0s' }}>
                                <ellipse cx="14" cy="46" rx="16" ry="3" fill="#1F2937" opacity="0.16" />
                                <g transform="rotate(-8 8 26)">
                                    <path d="M-2 18 Q-2 40 12 40 Q26 40 26 18 Q26 6 12 6 Q-2 6 -2 18 Z" fill="#FCD34D" stroke="#B45309" strokeWidth="1.3" />
                                    <path d="M3 16 Q6 13 9 16 M15 16 Q18 13 21 16" stroke="#7C2D12" strokeWidth="1.2" fill="none" strokeLinecap="round" />
                                    <path d="M6 27 Q12 33 18 27" stroke="#7C2D12" strokeWidth="1.6" fill="none" strokeLinecap="round" />
                                </g>
                                <g transform="translate(16, 2) rotate(8 12 26)">
                                    <path d="M-2 18 Q-2 40 12 40 Q26 40 26 18 Q26 6 12 6 Q-2 6 -2 18 Z" fill="#60A5FA" stroke="#1D4ED8" strokeWidth="1.3" />
                                    <path d="M3 17 Q6 20 9 17 M15 17 Q18 20 21 17" stroke="#1E3A8A" strokeWidth="1.2" fill="none" strokeLinecap="round" />
                                    <path d="M6 32 Q12 27 18 32" stroke="#1E3A8A" strokeWidth="1.6" fill="none" strokeLinecap="round" />
                                </g>
                            </g>
                            </g>
                        )}
                        {effectiveAccessory === 'sentence-frames' && (
                            <g className="animate-in fade-in slide-in-from-top-2 duration-500" transform="translate(76, 36)" data-accessory-placement="side-right" data-accessory-name="Sentence Frames">
                            <g className="animate-allobot-float" style={{ animationDelay: '0.7s' }}>
                                <rect x="0" y="0" width="40" height="30" rx="2.5" fill={colors.accPaper} stroke={colors.accInk} strokeWidth="2" />
                                <rect x="4" y="4" width="32" height="22" rx="1" fill={colors.accPaper} stroke={colors.accInk} strokeWidth="0.8" opacity="0.6" />
                                <rect x="7" y="8" width="9" height="5" rx="1" fill="#60A5FA" />
                                <line x1="18" y1="13" x2="27" y2="13" stroke={colors.accInk} strokeWidth="1.4" opacity="0.7" />
                                <rect x="29" y="8" width="5" height="5" rx="1" fill="#34D399" />
                                <line x1="7" y1="20" x2="14" y2="20" stroke={colors.accInk} strokeWidth="1.4" opacity="0.7" />
                                <rect x="16" y="16" width="9" height="5" rx="1" fill="#F472B6" />
                                <line x1="27" y1="20" x2="34" y2="20" stroke={colors.accInk} strokeWidth="1.4" opacity="0.7" />
                            </g>
                            </g>
                        )}
                        {effectiveAccessory === 'outline-doc' && (
                            <g className="animate-in fade-in slide-in-from-left-3 duration-500" transform="translate(-31, 32)" data-accessory-placement="side-left" data-accessory-name="Outline Document">
                            <g className="animate-allobot-float" style={{ animationDelay: '1.4s' }}>
                                <ellipse cx="18" cy="50" rx="16" ry="3" fill="#1F2937" opacity="0.16" />
                                <rect x="2" y="6" width="34" height="42" rx="2" fill={colors.accPaper} stroke={colors.accInk} strokeWidth="1.5" />
                                <text x="6" y="15" fontFamily="Arial" fontSize="6" fontWeight="bold" fill={colors.accInk}>I.</text>
                                <line x1="13" y1="13" x2="32" y2="13" stroke={colors.accInk} strokeWidth="1.6" />
                                <circle cx="12" cy="20" r="1.1" fill={colors.accInk} opacity="0.7" /><line x1="16" y1="20" x2="31" y2="20" stroke={colors.accInk} strokeWidth="1.2" opacity="0.45" />
                                <circle cx="12" cy="26" r="1.1" fill={colors.accInk} opacity="0.7" /><line x1="16" y1="26" x2="29" y2="26" stroke={colors.accInk} strokeWidth="1.2" opacity="0.45" />
                                <text x="6" y="36" fontFamily="Arial" fontSize="6" fontWeight="bold" fill={colors.accInk}>II.</text>
                                <line x1="13" y1="34" x2="32" y2="34" stroke={colors.accInk} strokeWidth="1.6" />
                                <circle cx="12" cy="41" r="1.1" fill={colors.accInk} opacity="0.7" /><line x1="16" y1="41" x2="30" y2="41" stroke={colors.accInk} strokeWidth="1.2" opacity="0.45" />
                            </g>
                            </g>
                        )}
                        {effectiveAccessory === 'sticky-notes' && (
                            <g className="animate-in fade-in slide-in-from-left-3 duration-500" transform="translate(-30, 34)" data-accessory-placement="side-left">
                                <g className="animate-allobot-float" style={{ animationDelay: '2.5s' }}>
                                    <ellipse cx="18" cy="48" rx="18" ry="3" fill="#1F2937" opacity="0.16" />
                                    <g transform="rotate(-8 13 23)"><rect x="2" y="12" width="24" height="22" rx="1" fill="#FDE047" stroke="#CA8A04" strokeWidth="1" /><path d="M20 34 L26 34 L26 28 Z" fill="#FACC15" /><line x1="6" y1="19" x2="22" y2="19" stroke="#A16207" strokeWidth="1" /><line x1="6" y1="24" x2="19" y2="24" stroke="#A16207" strokeWidth="1" /></g>
                                    <g transform="rotate(7 24 16)"><rect x="13" y="5" width="23" height="22" rx="1" fill="#5EEAD4" stroke="#0D9488" strokeWidth="1" /><path d="M30 27 L36 27 L36 21 Z" fill="#2DD4BF" /><line x1="17" y1="12" x2="32" y2="12" stroke="#0F766E" strokeWidth="1" /><line x1="17" y1="17" x2="29" y2="17" stroke="#0F766E" strokeWidth="1" /></g>
                                    <g transform="rotate(-3 20 35)"><rect x="8" y="25" width="24" height="20" rx="1" fill="#FDA4AF" stroke="#E11D48" strokeWidth="1" /><path d="M26 45 L32 45 L32 39 Z" fill="#FB7185" /><line x1="12" y1="31" x2="28" y2="31" stroke="#BE123C" strokeWidth="1" /><line x1="12" y1="36" x2="25" y2="36" stroke="#BE123C" strokeWidth="1" /></g>
                                </g>
                            </g>
                        )}
                        {effectiveAccessory === 'anchor-easel' && (
                            <g className="animate-in fade-in slide-in-from-left-3 duration-500" transform="translate(-30, 18)" data-accessory-placement="side-left" data-accessory-name="Anchor Chart Easel">
                            <g className="animate-allobot-float" style={{ animationDelay: '2.1s' }}>
                                <line x1="6" y1="20" x2="-2" y2="62" stroke="#92400E" strokeWidth="2.4" strokeLinecap="round" />
                                <line x1="30" y1="20" x2="38" y2="62" stroke="#92400E" strokeWidth="2.4" strokeLinecap="round" />
                                <line x1="22" y1="22" x2="26" y2="62" stroke="#78350F" strokeWidth="2" strokeLinecap="round" />
                                <rect x="0" y="6" width="36" height="32" rx="1.5" fill={colors.accPaper} stroke={colors.accInk} strokeWidth="1.5" />
                                <rect x="0" y="6" width="36" height="8" rx="1.5" fill="#4338CA" />
                                <line x1="5" y1="20" x2="31" y2="20" stroke={colors.accInk} strokeWidth="1.4" opacity="0.5" />
                                <line x1="5" y1="25" x2="28" y2="25" stroke={colors.accInk} strokeWidth="1.4" opacity="0.5" />
                                <path d="M5 31 L9 34 L15 28" stroke="#22C55E" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                                <line x1="19" y1="31" x2="31" y2="31" stroke={colors.accInk} strokeWidth="1.4" opacity="0.5" />
                            </g>
                            </g>
                        )}
                        {effectiveAccessory === 'behavior-watch' && (
                            <g className="animate-in fade-in slide-in-from-left-3 duration-500" transform="translate(-28, 42)" data-accessory-placement="side-left" data-accessory-name="Behavior Timer">
                            <g className="animate-allobot-float" style={{ animationDelay: '2.8s' }}>
                                <ellipse cx="15" cy="42" rx="15" ry="3" fill="#1F2937" opacity="0.16" />
                                <g transform="translate(15, 24)">
                                    <rect x="-2.5" y="-15" width="5" height="5" rx="1.2" fill="#475569" />
                                    <rect x="-5" y="-17.5" width="10" height="3" rx="1" fill="#64748B" />
                                    <circle cx="0" cy="0" r="13" fill="#E2E8F0" stroke="#334155" strokeWidth="2.2" />
                                    <circle cx="0" cy="0" r="10" fill="#F8FAFC" stroke="#94A3B8" strokeWidth="0.8" />
                                    <g stroke="#94A3B8" strokeWidth="0.8"><line x1="0" y1="-9" x2="0" y2="-7.5" /><line x1="9" y1="0" x2="7.5" y2="0" /><line x1="0" y1="9" x2="0" y2="7.5" /><line x1="-9" y1="0" x2="-7.5" y2="0" /></g>
                                    <g className="animate-allobot-tick"><line x1="0" y1="0" x2="0" y2="-7" stroke="#DC2626" strokeWidth="1.5" strokeLinecap="round" /></g>
                                    <line x1="0" y1="0" x2="4.5" y2="3" stroke="#334155" strokeWidth="1.4" strokeLinecap="round" />
                                    <circle cx="0" cy="0" r="1.3" fill="#334155" />
                                </g>
                                <g transform="translate(26, 30)" stroke="#16A34A" strokeWidth="1.4" strokeLinecap="round"><line x1="0" y1="0" x2="0" y2="8" /><line x1="3" y1="0" x2="3" y2="8" /><line x1="6" y1="0" x2="6" y2="8" /><line x1="-2" y1="6" x2="8" y2="2" /></g>
                            </g>
                            </g>
                        )}
                        {effectiveAccessory === 'bard-cap' && (
                            <g className="animate-in fade-in slide-in-from-top-2 duration-700 origin-center">
                            <g className="animate-allobot-perk" style={{ animationDelay: '4.5s' }}>
                                <path d="M22 26 Q20 12 50 8 Q80 12 78 26 Q50 30 22 26 Z" fill="#0D9488" stroke="#0F766E" strokeWidth="1.4" />
                                <path d="M22 24 Q50 30 78 24" stroke="#FCD34D" strokeWidth="3" fill="none" />
                                <ellipse cx="50" cy="13" rx="4" ry="2" fill="#2DD4BF" opacity="0.5" />
                                <circle cx="38" cy="21" r="2.6" fill="#FCD34D" stroke="#A16207" strokeWidth="0.7" />
                                <g className="animate-allobot-sway">
                                    <path d="M38 19 Q29 3 23 -12 Q34 0 41 12 Q41 16 38 19 Z" fill="#F472B6" stroke="#BE185D" strokeWidth="1" />
                                    <path d="M34 11 Q29 1 25 -8" stroke="#FBCFE8" strokeWidth="1" fill="none" opacity="0.85" />
                                </g>
                            </g>
                            </g>
                        )}
                        {effectiveAccessory === 'phoneme-headset' && (
                            <g className="animate-in fade-in slide-in-from-top-2 duration-700 origin-center" data-accessory-placement="head-and-ears" data-accessory-name="Phoneme Phones">
                                <g className="animate-allobot-perk" style={{ animationDelay: '1.8s' }}>
                                    <path d="M18 52 C18 19 29 5 50 5 C71 5 82 19 82 52" stroke="#4F46E5" strokeWidth="5" fill="none" strokeLinecap="round" />
                                    <path d="M23 42 C23 18 33 10 50 10 C67 10 77 18 77 42" stroke="#A5B4FC" strokeWidth="2" fill="none" opacity="0.85" />
                                    <rect x="13" y="42" width="15" height="24" rx="7" fill="#6366F1" stroke="#312E81" strokeWidth="1.4" />
                                    <rect x="17" y="46" width="7" height="16" rx="3.5" fill="#C7D2FE" stroke="#4338CA" strokeWidth="0.8" />
                                    <rect x="72" y="42" width="15" height="24" rx="7" fill="#6366F1" stroke="#312E81" strokeWidth="1.4" />
                                    <rect x="76" y="46" width="7" height="16" rx="3.5" fill="#C7D2FE" stroke="#4338CA" strokeWidth="0.8" />
                                    <path d="M80 61 Q83 71 70 72" stroke="#312E81" strokeWidth="2" fill="none" strokeLinecap="round" />
                                    <circle cx="68" cy="72" r="2.4" fill="#F472B6" stroke="#9D174D" strokeWidth="0.7" />
                                    <g transform="translate(50 3)">
                                        <rect x="-11" y="-5" width="22" height="12" rx="6" fill="#FDF2F8" stroke="#BE185D" strokeWidth="1" />
                                        <text x="0" y="3" fontFamily="Arial" fontSize="7" fontWeight="bold" fill="#9D174D" textAnchor="middle">/m/</text>
                                    </g>
                                    <path d="M89 47 Q94 51 89 55 M92 43 Q101 51 92 59" stroke="#22D3EE" strokeWidth="1.5" fill="none" strokeLinecap="round" />
                                </g>
                            </g>
                        )}
                        {effectiveAccessory === 'choice-fan' && (
                            <g className="animate-in fade-in slide-in-from-left-3 duration-500" transform="translate(-31, 34)" data-accessory-placement="side-left" data-accessory-name="UDL Choice Fan">
                                <g className="animate-allobot-float" style={{ animationDelay: '1.3s' }}>
                                    <ellipse cx="18" cy="50" rx="18" ry="3" fill="#1F2937" opacity="0.16" />
                                    <g transform="rotate(-17 14 43)">
                                        <rect x="2" y="8" width="22" height="38" rx="3" fill="#DBEAFE" stroke="#1D4ED8" strokeWidth="1.2" />
                                        <circle cx="13" cy="20" r="6" fill="#60A5FA" stroke="#1E40AF" strokeWidth="0.8" />
                                        <text x="13" y="23" fontFamily="Arial" fontSize="8" fontWeight="bold" fill="#172554" textAnchor="middle">R</text>
                                        <line x1="7" y1="32" x2="19" y2="32" stroke="#1D4ED8" strokeWidth="1.2" /><line x1="7" y1="37" x2="17" y2="37" stroke="#1D4ED8" strokeWidth="1.2" />
                                    </g>
                                    <g transform="rotate(2 20 42)">
                                        <rect x="9" y="5" width="22" height="40" rx="3" fill="#FEF3C7" stroke="#B45309" strokeWidth="1.2" />
                                        <path d="M20 13 L22 18 L27 18 L23 21 L25 26 L20 23 L15 26 L17 21 L13 18 L18 18 Z" fill="#FBBF24" stroke="#92400E" strokeWidth="0.7" />
                                        <text x="20" y="37" fontFamily="Arial" fontSize="8" fontWeight="bold" fill="#78350F" textAnchor="middle">E</text>
                                    </g>
                                    <g transform="rotate(18 25 43)">
                                        <rect x="15" y="9" width="22" height="38" rx="3" fill="#D1FAE5" stroke="#047857" strokeWidth="1.2" />
                                        <path d="M21 23 L25 27 L33 17" stroke="#059669" strokeWidth="2.4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                                        <text x="26" y="39" fontFamily="Arial" fontSize="8" fontWeight="bold" fill="#064E3B" textAnchor="middle">A</text>
                                    </g>
                                    <circle cx="19" cy="45" r="3" fill="#475569" stroke="#1F2937" strokeWidth="0.8" />
                                </g>
                            </g>
                        )}
                        {effectiveAccessory === 'alignment-target' && (
                            <g className="animate-in fade-in slide-in-from-left-3 duration-500" transform="translate(-31, 31)" data-accessory-placement="side-left" data-accessory-name="Alignment Target">
                                <g className="animate-allobot-float" style={{ animationDelay: '2.2s' }}>
                                    <ellipse cx="18" cy="52" rx="18" ry="3" fill="#1F2937" opacity="0.16" />
                                    <line x1="7" y1="43" x2="2" y2="52" stroke="#475569" strokeWidth="2.2" strokeLinecap="round" />
                                    <line x1="29" y1="43" x2="34" y2="52" stroke="#475569" strokeWidth="2.2" strokeLinecap="round" />
                                    <circle cx="18" cy="25" r="19" fill="#F8FAFC" stroke="#334155" strokeWidth="1.5" />
                                    <circle cx="18" cy="25" r="14" fill="#CCFBF1" stroke="#0F766E" strokeWidth="1" />
                                    <circle cx="18" cy="25" r="8" fill="#5EEAD4" stroke="#0F766E" strokeWidth="1" />
                                    <circle cx="18" cy="25" r="3" fill="#0F766E" />
                                    <path d="M4 38 L9 43 L17 34" stroke="#22C55E" strokeWidth="2.2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                                    <g transform="rotate(-13 25 16)">
                                        <line x1="18" y1="25" x2="34" y2="8" stroke="#F97316" strokeWidth="2" strokeLinecap="round" />
                                        <path d="M34 8 L31 15 L37 13 Z" fill="#FB923C" stroke="#C2410C" strokeWidth="0.7" />
                                    </g>
                                </g>
                            </g>
                        )}
                        {effectiveAccessory === 'wayfinder-sign' && (
                            <g className="animate-in fade-in slide-in-from-left-3 duration-500" transform="translate(-31, 27)" data-accessory-placement="side-left" data-accessory-name="Next-Step Signpost">
                                <g className="animate-allobot-float" style={{ animationDelay: '2.7s' }}>
                                    <ellipse cx="18" cy="58" rx="17" ry="3" fill="#1F2937" opacity="0.16" />
                                    <rect x="16" y="10" width="4" height="48" rx="1.5" fill="#92400E" stroke="#78350F" strokeWidth="0.8" />
                                    <path d="M2 12 H27 L35 19 L27 26 H2 Z" fill="#60A5FA" stroke="#1D4ED8" strokeWidth="1.2" />
                                    <text x="17" y="22" fontFamily="Arial" fontSize="8" fontWeight="bold" fill="#172554" textAnchor="middle">1</text>
                                    <path d="M34 29 H10 L2 36 L10 43 H34 Z" fill="#FCD34D" stroke="#B45309" strokeWidth="1.2" />
                                    <text x="19" y="39" fontFamily="Arial" fontSize="8" fontWeight="bold" fill="#78350F" textAnchor="middle">2</text>
                                    <circle cx="18" cy="8" r="4" fill="#34D399" stroke="#047857" strokeWidth="1" />
                                    <path d="M16 8 L18 10 L22 6" stroke="#ECFDF5" strokeWidth="1.3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                                </g>
                            </g>
                        )}
                        {effectiveAccessory === 'question-cards' && (
                            <g className="animate-in fade-in slide-in-from-left-3 duration-500" transform="translate(-31, 34)" data-accessory-placement="side-left" data-accessory-name="Curiosity Cards">
                                <g className="animate-allobot-float" style={{ animationDelay: '3.1s' }}>
                                    <ellipse cx="18" cy="49" rx="18" ry="3" fill="#1F2937" opacity="0.16" />
                                    <g transform="rotate(-9 14 27)">
                                        <rect x="1" y="9" width="25" height="36" rx="3" fill="#FCE7F3" stroke="#BE185D" strokeWidth="1.2" />
                                        <text x="13.5" y="33" fontFamily="Arial" fontSize="22" fontWeight="bold" fill="#BE185D" textAnchor="middle">?</text>
                                    </g>
                                    <g transform="rotate(8 24 25)">
                                        <rect x="12" y="5" width="25" height="36" rx="3" fill="#EDE9FE" stroke="#6D28D9" strokeWidth="1.2" />
                                        <circle cx="24.5" cy="18" r="5" fill="#A78BFA" stroke="#5B21B6" strokeWidth="0.8" />
                                        <text x="24.5" y="21" fontFamily="Arial" fontSize="8" fontWeight="bold" fill="#3B0764" textAnchor="middle">?</text>
                                        <line x1="17" y1="29" x2="32" y2="29" stroke="#6D28D9" strokeWidth="1.2" /><line x1="17" y1="34" x2="29" y2="34" stroke="#6D28D9" strokeWidth="1.2" />
                                    </g>
                                </g>
                            </g>
                        )}
                        {effectiveAccessory === 'test-prep-kit' && (
                            <g className="animate-in fade-in slide-in-from-left-3 duration-500" transform="translate(-31, 30)" data-accessory-placement="side-left" data-accessory-name="Ready, Set, Prep Kit">
                                <g className="animate-allobot-float" style={{ animationDelay: '1.6s' }}>
                                    <ellipse cx="18" cy="53" rx="18" ry="3" fill="#1F2937" opacity="0.16" />
                                    <rect x="2" y="11" width="29" height="38" rx="3" fill="#FFFBEB" stroke="#92400E" strokeWidth="1.3" transform="rotate(-4 16 30)" />
                                    <rect x="5" y="7" width="29" height="39" rx="3" fill="#EEF2FF" stroke="#4338CA" strokeWidth="1.4" />
                                    <rect x="5" y="7" width="29" height="10" rx="3" fill="#6366F1" />
                                    <text x="19.5" y="14" fontFamily="Arial" fontSize="5.5" fontWeight="bold" fill="#FFFFFF" textAnchor="middle">PREP</text>
                                    <circle cx="11" cy="24" r="2" fill="none" stroke="#4F46E5" strokeWidth="1" /><line x1="16" y1="24" x2="29" y2="24" stroke="#4F46E5" strokeWidth="1" />
                                    <circle cx="11" cy="31" r="2" fill="none" stroke="#4F46E5" strokeWidth="1" /><line x1="16" y1="31" x2="27" y2="31" stroke="#4F46E5" strokeWidth="1" />
                                    <path d="M9 39 L12 42 L17 36" stroke="#16A34A" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                                    <g transform="translate(31 10)">
                                        <rect x="-2" y="-5" width="4" height="4" rx="1" fill="#475569" />
                                        <circle cx="0" cy="4" r="9" fill="#F8FAFC" stroke="#334155" strokeWidth="1.3" />
                                        <g className="animate-allobot-stopwatch-hand">
                                            <line x1="0" y1="4" x2="0" y2="-2" stroke="#DC2626" strokeWidth="1.3" strokeLinecap="round" />
                                            <line x1="0" y1="4" x2="4" y2="6" stroke="#334155" strokeWidth="1.2" strokeLinecap="round" />
                                        </g>
                                        <circle cx="0" cy="4" r="1.2" fill="#334155" />
                                    </g>
                                </g>
                            </g>
                        )}
                        {effectiveAccessory === 'source-inbox' && (
                            <g className="animate-in fade-in slide-in-from-left-3 duration-500" transform="translate(-31, 31)" data-accessory-placement="side-left" data-accessory-name="Source Inbox">
                                <g className="animate-allobot-float" style={{ animationDelay: '2.0s' }}>
                                    <ellipse cx="18" cy="52" rx="18" ry="3" fill="#1F2937" opacity="0.16" />
                                    <rect x="7" y="4" width="26" height="31" rx="2" fill="#FFFFFF" stroke="#475569" strokeWidth="1.2" transform="rotate(5 20 19)" />
                                    <rect x="3" y="7" width="27" height="31" rx="2" fill="#F8FAFC" stroke="#334155" strokeWidth="1.3" transform="rotate(-4 16 22)" />
                                    <line x1="8" y1="15" x2="25" y2="15" stroke="#6366F1" strokeWidth="1.4" /><line x1="8" y1="21" x2="23" y2="21" stroke="#94A3B8" strokeWidth="1.2" /><line x1="8" y1="27" x2="26" y2="27" stroke="#94A3B8" strokeWidth="1.2" />
                                    <path d="M1 31 H11 L15 37 H24 L28 31 H36 L33 49 H4 Z" fill="#FDE68A" stroke="#92400E" strokeWidth="1.4" strokeLinejoin="round" />
                                    <path d="M18 3 V14 M14 10 L18 14 L22 10" stroke="#2563EB" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" className="animate-allobot-inbox-drop" />
                                </g>
                            </g>
                        )}
                        {effectiveAccessory === 'progress-orbit' && (
                            <g className="animate-in fade-in slide-in-from-left-3 duration-500" transform="translate(-31, 32)" data-accessory-placement="side-left" data-accessory-name="Progress Pulse">
                                <g className="animate-allobot-float" style={{ animationDelay: '2.3s' }}>
                                    <ellipse cx="18" cy="51" rx="18" ry="3" fill="#1F2937" opacity="0.16" />
                                    <rect x="0" y="6" width="36" height="42" rx="4" fill="#F8FAFC" stroke="#334155" strokeWidth="1.4" />
                                    <rect x="0" y="6" width="36" height="9" rx="4" fill="#0F766E" />
                                    <circle cx="7" cy="10.5" r="1.5" fill="#99F6E4" /><circle cx="12" cy="10.5" r="1.5" fill="#5EEAD4" />
                                    <circle cx="12" cy="27" r="8" fill="none" stroke="#CCFBF1" strokeWidth="4" />
                                    <path d="M12 19 A8 8 0 1 1 5.5 31.5" fill="none" stroke="#14B8A6" strokeWidth="4" strokeLinecap="round" className="animate-allobot-progress-pulse" />
                                    <path d="M23 39 V29 H28 V39 M29 39 V22 H34 V39" fill="#60A5FA" stroke="#1D4ED8" strokeWidth="0.8" />
                                    <path d="M7 40 L10 43 L16 36" stroke="#22C55E" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                                </g>
                            </g>
                        )}
                        {effectiveAccessory === 'maze-scroll' && (
                            <g className="animate-in fade-in slide-in-from-left-3 duration-500" transform="translate(-31, 31)" data-accessory-placement="side-left" data-accessory-name="Fluency Maze Map">
                                <g className="animate-allobot-float" style={{ animationDelay: '2.6s' }}>
                                    <ellipse cx="18" cy="52" rx="18" ry="3" fill="#1F2937" opacity="0.16" />
                                    <path d="M3 8 Q7 5 11 8 H31 Q35 5 38 9 V45 Q34 48 30 45 H10 Q6 49 2 45 Z" fill="#FEF3C7" stroke="#92400E" strokeWidth="1.4" />
                                    <path d="M8 14 H31 V20 H15 V26 H29 V33 H10 V40 H33" stroke="#B45309" strokeWidth="2" fill="none" strokeLinecap="square" strokeLinejoin="round" />
                                    <circle cx="8" cy="14" r="2.5" fill="#3B82F6" stroke="#1E40AF" strokeWidth="0.8" />
                                    <g transform="translate(31 35)">
                                        <line x1="0" y1="0" x2="0" y2="-13" stroke="#475569" strokeWidth="1.5" />
                                        <path d="M0 -13 H8 L5 -9 L8 -5 H0 Z" fill="#EF4444" stroke="#991B1B" strokeWidth="0.7" className="animate-allobot-maze-flag" />
                                    </g>
                                    <path d="M2 12 Q6 15 10 12 M31 43 Q35 46 38 43" stroke="#FDE68A" strokeWidth="3" fill="none" />
                                </g>
                            </g>
                        )}
                        {effectiveAccessory === 'resource-folder' && (
                            <g className="animate-in fade-in slide-in-from-left-3 duration-500" transform="translate(-31, 34)" data-accessory-placement="side-left" data-accessory-name="Resource Review Folder">
                                <g className="animate-allobot-float" style={{ animationDelay: '2.9s' }}>
                                    <ellipse cx="18" cy="48" rx="18" ry="3" fill="#1F2937" opacity="0.16" />
                                    <path d="M2 13 H15 L19 18 H35 V44 H2 Z" fill="#FCD34D" stroke="#92400E" strokeWidth="1.3" />
                                    <g className="animate-allobot-folder-page">
                                        <rect x="8" y="10" width="23" height="30" rx="2" fill="#FFFFFF" stroke="#475569" strokeWidth="1.2" transform="rotate(4 19 25)" />
                                        <line x1="13" y1="18" x2="27" y2="18" stroke="#6366F1" strokeWidth="1.4" /><line x1="13" y1="24" x2="26" y2="24" stroke="#94A3B8" strokeWidth="1.1" />
                                        <path d="M13 31 L16 34 L22 27" stroke="#16A34A" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                                    </g>
                                    <path d="M1 25 H36 L31 47 H6 Z" fill="#FDE68A" stroke="#92400E" strokeWidth="1.4" strokeLinejoin="round" />
                                </g>
                            </g>
                        )}
                        {effectiveAccessory === 'math-tools' && (
                            <g className="animate-in fade-in slide-in-from-left-3 duration-500" transform="translate(-30, 32)" data-accessory-placement="side-left" data-accessory-name="Math Tools">
                                <g className="animate-allobot-float" style={{ animationDelay: '0.5s' }}>
                                    <ellipse cx="18" cy="48" rx="16" ry="3" fill="#1F2937" opacity="0.16" />
                                    <path d="M2 46 L2 20 L30 46 Z" fill="#93C5FD" stroke="#1D4ED8" strokeWidth="1.4" />
                                    <line x1="2" y1="26" x2="6" y2="26" stroke="#1E3A8A" strokeWidth="0.8" /><line x1="2" y1="32" x2="6" y2="32" stroke="#1E3A8A" strokeWidth="0.8" /><line x1="2" y1="38" x2="6" y2="38" stroke="#1E3A8A" strokeWidth="0.8" />
                                    <path d="M8 22 A 13 13 0 0 1 34 22 Z" fill="#FCD34D" stroke="#B45309" strokeWidth="1.4" />
                                    <path d="M11 22 A 10 10 0 0 1 31 22" fill="#FFFBEB" stroke="#B45309" strokeWidth="0.8" />
                                    <circle cx="21" cy="22" r="1.4" fill="#B45309" />
                                    <line x1="21" y1="22" x2="21" y2="11" stroke="#B45309" strokeWidth="0.7" /><line x1="21" y1="22" x2="13" y2="15" stroke="#B45309" strokeWidth="0.7" /><line x1="21" y1="22" x2="29" y2="15" stroke="#B45309" strokeWidth="0.7" />
                                </g>
                            </g>
                        )}
                        {effectiveAccessory === 'gear' && (
                            <g className="animate-in fade-in slide-in-from-left-3 duration-500" transform="translate(-21, 38)" data-accessory-placement="side-left">
                                <g className="animate-allobot-float" style={{ animationDelay: '1.5s' }}>
                                    <ellipse cx="18" cy="51" rx="17" ry="3" fill="#1F2937" opacity="0.16" />
                                    <g transform="translate(18, 28)">
                                        <g fill="#B0B8C4" stroke="#475569" strokeWidth="1.1">
                                            <rect x="-2.5" y="-15" width="5" height="6" rx="1" /><rect x="-2.5" y="9" width="5" height="6" rx="1" />
                                            <rect x="-15" y="-2.5" width="6" height="5" rx="1" /><rect x="9" y="-2.5" width="6" height="5" rx="1" />
                                            <rect x="-12" y="-12" width="5" height="6" rx="1" transform="rotate(45 -9.5 -9)" /><rect x="7" y="6" width="5" height="6" rx="1" transform="rotate(45 9.5 9)" />
                                            <rect x="7" y="-12" width="5" height="6" rx="1" transform="rotate(-45 9.5 -9)" /><rect x="-12" y="6" width="5" height="6" rx="1" transform="rotate(-45 -9.5 9)" />
                                        </g>
                                        <circle cx="0" cy="0" r="11" fill="#CBD5E1" stroke="#475569" strokeWidth="1.4" />
                                        <circle cx="0" cy="0" r="4.5" fill="#0f172a" stroke="#475569" strokeWidth="1" />
                                        <circle cx="-3" cy="-3" r="1.6" fill="#fff" opacity="0.5" />
                                    </g>
                                </g>
                            </g>
                        )}
                        {effectiveAccessory === 'game-pad' && (
                            <g className="animate-in fade-in slide-in-from-left-3 duration-500" transform="translate(-32, 40)" data-accessory-placement="side-left" data-accessory-name="STEM Game Pad">
                                <g className="animate-allobot-float" style={{ animationDelay: '1.1s' }}>
                                    <ellipse cx="19" cy="34" rx="18" ry="3" fill="#1F2937" opacity="0.16" />
                                    <path d="M5 14 Q0 15 1 24 L4 31 Q7 34 12 31 L26 31 Q31 34 34 31 L37 24 Q38 15 33 14 Q19 11 5 14 Z" fill="#5B6472" stroke="#1F2937" strokeWidth="1.4" />
                                    <rect x="7" y="21" width="9" height="3" rx="1" fill="#1F2937" /><rect x="10" y="18" width="3" height="9" rx="1" fill="#1F2937" />
                                    <circle cx="26" cy="20" r="2.3" fill="#F472B6" stroke="#9D174D" strokeWidth="0.6" />
                                    <circle cx="31" cy="24" r="2.3" fill="#34D399" stroke="#065F46" strokeWidth="0.6" />
                                    <circle cx="21" cy="25" r="2.3" fill="#FBBF24" stroke="#92400E" strokeWidth="0.6" />
                                </g>
                            </g>
                        )}
                          </g>
                        </g>
                      </g>
                    </g>
                )}
                <defs>
                  <radialGradient id={svgPaintIds.body} cx="35%" cy="35%" r="65%" fx="30%" fy="30%">
                    <stop offset="0%" stopColor={colors.gradFrom} />
                    <stop offset="100%" stopColor={colors.gradTo} />
                  </radialGradient>
                  <radialGradient id={svgPaintIds.rim} cx="70%" cy="70%" r="70%">
                    <stop offset="82%" stopColor="#fff" stopOpacity="0" />
                    <stop offset="100%" stopColor="#fff" stopOpacity="0.4" />
                  </radialGradient>
                  <linearGradient id={svgPaintIds.hologram} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#22D3EE" stopOpacity="0" />
                    <stop offset="20%" stopColor="#22D3EE" stopOpacity="0.1" />
                    <stop offset="100%" stopColor="#22D3EE" stopOpacity="0.6" />
                  </linearGradient>
                  <linearGradient id={svgPaintIds.visor} x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="white" stopOpacity="0.4" />
                    <stop offset="100%" stopColor="white" stopOpacity="0" />
                  </linearGradient>
                  <linearGradient id={svgPaintIds.beam} x1="0%" y1="100%" x2="0%" y2="0%">
                    <stop offset="0%" stopColor="#06B6D4" stopOpacity="0.6" />
                    <stop offset="100%" stopColor="#06B6D4" stopOpacity="0" />
                  </linearGradient>
                  <filter id={svgPaintIds.groundShadow} x="-35%" y="-150%" width="170%" height="400%" colorInterpolationFilters="sRGB">
                    <feGaussianBlur stdDeviation="2.4" />
                  </filter>
                </defs>
              </svg>
          </div>
      </div>
    </div>
    </aside>
  );
}));
