// key_concept_map_source.jsx — Concept Map / Mind Map view CDN module
// Extracted from AlloFlowANTI.txt 2026-04-21 (v2 audit recommendation A).
// Contents:
//   _CONCEPT_ACCENTS — 6-color accent palette (indigo/teal/rose/amber/violet/sky)
//   _conceptAccentFor — modular picker from _CONCEPT_ACCENTS
//   KeyConceptMapView — SVG-overlay Bezier curves from a center bubble to branch cards
//
// Used by renderOutlineContent when view type is 'Key Concept Map' or 'Mind Map'.
// Pure props-driven: takes { branches, main, main_en, BranchItem } — no component state.
// BranchItem is itself a component, passed in as a prop from renderOutlineContent.
//
// Dependencies: React (hooks: useRef, useState, useLayoutEffect), ResizeObserver,
// requestAnimationFrame, window — all standard browser/React globals.

const _CONCEPT_ACCENTS = [
    { badge: '#4f46e5', ring: 'rgba(99,102,241,0.28)',  border: '#6366f1' }, // indigo
    { badge: '#0d9488', ring: 'rgba(20,184,166,0.28)',  border: '#14b8a6' }, // teal
    { badge: '#e11d48', ring: 'rgba(244,63,94,0.28)',   border: '#f43f5e' }, // rose
    { badge: '#d97706', ring: 'rgba(245,158,11,0.28)',  border: '#f59e0b' }, // amber
    { badge: '#7c3aed', ring: 'rgba(139,92,246,0.28)',  border: '#8b5cf6' }, // violet
    { badge: '#0284c7', ring: 'rgba(14,165,233,0.28)',  border: '#0ea5e9' }, // sky
];
const _conceptAccentFor = (i) => _CONCEPT_ACCENTS[i % _CONCEPT_ACCENTS.length];

const KeyConceptMapView = React.memo(({ branches, main, main_en, BranchItem }) => {
    const containerRef = useRef(null);
    const centerRef = useRef(null);
    const leftRefs = useRef([]);
    const rightRefs = useRef([]);
    const [lines, setLines] = useState([]);
    const [dims, setDims] = useState({ w: 0, h: 0 });

    const mid = Math.ceil(branches.length / 2);
    const left = branches.slice(0, mid);
    const right = branches.slice(mid);

    React.useLayoutEffect(() => {
        const compute = () => {
            const c = containerRef.current;
            const center = centerRef.current;
            if (!c || !center) return;
            const cRect = c.getBoundingClientRect();
            const centerRect = center.getBoundingClientRect();
            const centerX = centerRect.left + centerRect.width / 2 - cRect.left;
            const centerY = centerRect.top + centerRect.height / 2 - cRect.top;
            const centerR = centerRect.width / 2;

            const newLines = [];
            const buildLine = (el, side, idx, branchIdx) => {
                if (!el) return;
                const r = el.getBoundingClientRect();
                const cardY = r.top + r.height / 2 - cRect.top;
                // Connect to the side of the card nearest the bubble so the line lands on the edge.
                const cardX = side === 'left' ? (r.right - cRect.left) : (r.left - cRect.left);
                // Anchor the line on the bubble's circumference along the direction vector to the card.
                const dx = cardX - centerX, dy = cardY - centerY;
                const dist = Math.hypot(dx, dy) || 1;
                const bubbleX = centerX + (dx / dist) * centerR;
                const bubbleY = centerY + (dy / dist) * centerR;
                // Bezier control points pull horizontally so curves enter the bubble tangent-ish
                // and exit the card horizontally — reads as a graceful S-curve rather than a V.
                const midX = (bubbleX + cardX) / 2;
                const cp1x = midX, cp1y = bubbleY;
                const cp2x = midX, cp2y = cardY;
                newLines.push({
                    key: side + '-' + idx,
                    d: `M ${bubbleX} ${bubbleY} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${cardX} ${cardY}`,
                    bubbleX, bubbleY, cardX, cardY,
                    accent: _conceptAccentFor(branchIdx),
                    // Stagger the draw animation so lines appear one after another left→right.
                    delayMs: 120 + branchIdx * 110,
                });
            };
            leftRefs.current.forEach((el, i) => buildLine(el, 'left', i, i));
            rightRefs.current.forEach((el, i) => buildLine(el, 'right', i, i + mid));
            setLines(newLines);
            setDims({ w: cRect.width, h: cRect.height });
        };
        // Run twice on mount — once for initial sync paint, once after fonts/images settle.
        compute();
        const rafId = requestAnimationFrame(compute);
        const ro = new ResizeObserver(compute);
        if (containerRef.current) ro.observe(containerRef.current);
        window.addEventListener('resize', compute);
        return () => { cancelAnimationFrame(rafId); ro.disconnect(); window.removeEventListener('resize', compute); };
    }, [branches.length, main, main_en, mid]);

    return (
        <div ref={containerRef} className="max-w-7xl mx-auto relative my-12 px-4 flex flex-col md:flex-row items-stretch justify-center">
            {/* One-off keyframes for line-draw + bubble breathe. Scoped via unique prefix so
                this doesn't clash with any other animation in the app. */}
            <style>{`
                @keyframes alloflow-concept-draw {
                    from { stroke-dashoffset: var(--allo-draw-len, 2000); }
                    to   { stroke-dashoffset: 0; }
                }
                @keyframes alloflow-concept-dot-in {
                    0%   { opacity: 0; transform: scale(0.2); }
                    100% { opacity: 1; transform: scale(1); }
                }
                @keyframes alloflow-concept-breathe {
                    0%, 100% { box-shadow: 0 0 50px rgba(99,102,241,0.45), 0 10px 30px rgba(67,56,202,0.25), inset 0 -10px 30px rgba(30,27,75,0.25); }
                    50%      { box-shadow: 0 0 70px rgba(99,102,241,0.6),  0 12px 34px rgba(67,56,202,0.32), inset 0 -10px 30px rgba(30,27,75,0.25); }
                }
                @media (prefers-reduced-motion: reduce) {
                    .alloflow-concept-line-primary, .alloflow-concept-endpoint, .alloflow-concept-bubble {
                        animation: none !important;
                    }
                }
                @media print {
                    .alloflow-concept-line-primary, .alloflow-concept-endpoint, .alloflow-concept-bubble {
                        animation: none !important;
                        stroke-dasharray: none !important;
                    }
                    .alloflow-concept-bubble {
                        box-shadow: none !important;
                    }
                }
            `}</style>

            {/* Soft radial backdrop — subtle "halo" behind the whole map, reinforces the center */}
            <div
                className="hidden md:block absolute inset-0 pointer-events-none"
                aria-hidden="true"
                style={{
                    zIndex: 0,
                    background: 'radial-gradient(ellipse 55% 65% at 50% 50%, rgba(165,180,252,0.18) 0%, rgba(199,210,254,0.08) 35%, transparent 70%)',
                }}
            />

            {/* SVG overlay — pointer-events-none so cards remain interactive */}
            <svg
                className="hidden md:block absolute inset-0 pointer-events-none"
                style={{ zIndex: 5, overflow: 'visible' }}
                width={dims.w || '100%'}
                height={dims.h || '100%'}
                viewBox={`0 0 ${dims.w || 1} ${dims.h || 1}`}
                aria-hidden="true"
            >
                <defs>
                    <linearGradient id="alloflow-concept-line" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="#6366f1" stopOpacity="0.9" />
                        <stop offset="100%" stopColor="#a5b4fc" stopOpacity="0.55" />
                    </linearGradient>
                    <filter id="alloflow-concept-line-glow" x="-20%" y="-20%" width="140%" height="140%">
                        <feGaussianBlur stdDeviation="1.5" />
                    </filter>
                </defs>
                {lines.map(l => (
                    <g key={l.key}>
                        {/* Soft outer glow — always drawn in full */}
                        <path d={l.d} fill="none" stroke="#c7d2fe" strokeWidth={6} strokeLinecap="round" opacity={0.35} filter="url(#alloflow-concept-line-glow)" />
                        {/* Primary stroke — animated draw-in */}
                        <path
                            d={l.d}
                            fill="none"
                            stroke="url(#alloflow-concept-line)"
                            strokeWidth={2.5}
                            strokeLinecap="round"
                            className="alloflow-concept-line-primary"
                            style={{
                                strokeDasharray: '2000 2000',
                                animation: `alloflow-concept-draw 0.9s ease-out ${l.delayMs}ms forwards`,
                                strokeDashoffset: 2000,
                            }}
                        />
                        {/* Endpoint dot at the card — color matches the card's accent badge */}
                        <circle
                            cx={l.cardX}
                            cy={l.cardY}
                            r={5}
                            fill={l.accent.border}
                            stroke="#ffffff"
                            strokeWidth={2}
                            className="alloflow-concept-endpoint"
                            style={{
                                transformOrigin: `${l.cardX}px ${l.cardY}px`,
                                animation: `alloflow-concept-dot-in 0.35s ease-out ${l.delayMs + 800}ms both`,
                                opacity: 0,
                            }}
                        />
                        {/* Endpoint dot at the bubble edge — softer, smaller */}
                        <circle
                            cx={l.bubbleX}
                            cy={l.bubbleY}
                            r={3}
                            fill="#ffffff"
                            opacity={0.85}
                            className="alloflow-concept-endpoint"
                            style={{
                                transformOrigin: `${l.bubbleX}px ${l.bubbleY}px`,
                                animation: `alloflow-concept-dot-in 0.3s ease-out ${l.delayMs}ms both`,
                                opacity: 0,
                            }}
                        />
                    </g>
                ))}
            </svg>

            {/* Left column */}
            <div className="flex-1 flex flex-col justify-between gap-8 py-4 z-10">
                {left.map((b, i) => {
                    const a = _conceptAccentFor(i);
                    return (
                        <div
                            key={i}
                            ref={el => { leftRefs.current[i] = el; }}
                            className="flex items-center justify-end group w-full"
                        >
                            <div
                                tabIndex={0}
                                role="group"
                                aria-label={`Branch ${i + 1}: ${b.title || ''}`}
                                className="w-full max-w-xs relative rounded-2xl transition-all duration-200 hover:scale-[1.02] focus:outline-none focus:ring-4"
                                style={{ boxShadow: `0 0 0 0 ${a.ring}`, '--tw-ring-color': a.ring }}
                                onMouseEnter={(e) => { e.currentTarget.style.boxShadow = `0 0 0 4px ${a.ring}`; }}
                                onMouseLeave={(e) => { e.currentTarget.style.boxShadow = `0 0 0 0 ${a.ring}`; }}
                                onFocus={(e) => { e.currentTarget.style.boxShadow = `0 0 0 4px ${a.ring}`; }}
                                onBlur={(e) => { e.currentTarget.style.boxShadow = `0 0 0 0 ${a.ring}`; }}
                            >
                                <div
                                    className="absolute -top-3 -right-3 w-9 h-9 rounded-full text-white text-sm font-black flex items-center justify-center shadow-lg border-[3px] border-white z-20"
                                    style={{ backgroundColor: a.badge }}
                                    aria-hidden="true"
                                >
                                    {i + 1}
                                </div>
                                <BranchItem branch={b} bIdx={i} />
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Center bubble */}
            <div className="flex items-center justify-center px-8 z-20 my-4 md:my-0 shrink-0">
                <div
                    ref={centerRef}
                    className="alloflow-concept-bubble relative w-52 h-52 rounded-full flex flex-col items-center justify-center text-center border-[6px] border-white transition-transform duration-500 hover:scale-105"
                    style={{
                        background: 'radial-gradient(circle at 30% 30%, #818cf8 0%, #6366f1 45%, #4338ca 100%)',
                        boxShadow: '0 0 50px rgba(99,102,241,0.45), 0 10px 30px rgba(67,56,202,0.25), inset 0 -10px 30px rgba(30,27,75,0.25)',
                        animation: 'alloflow-concept-breathe 4.2s ease-in-out infinite',
                    }}
                >
                    <h3 className="font-black text-white text-base leading-tight relative z-10 drop-shadow-lg line-clamp-4 px-3">
                        {main}
                    </h3>
                    {main_en && <p className="text-[11px] text-indigo-100 mt-1.5 opacity-95 relative z-10 font-bold line-clamp-1 px-3">({main_en})</p>}
                </div>
            </div>

            {/* Right column */}
            <div className="flex-1 flex flex-col justify-between gap-8 py-4 z-10">
                {right.map((b, i) => {
                    const idx = i + mid;
                    const a = _conceptAccentFor(idx);
                    return (
                        <div
                            key={idx}
                            ref={el => { rightRefs.current[i] = el; }}
                            className="flex items-center justify-start group w-full"
                        >
                            <div
                                tabIndex={0}
                                role="group"
                                aria-label={`Branch ${idx + 1}: ${b.title || ''}`}
                                className="w-full max-w-xs relative rounded-2xl transition-all duration-200 hover:scale-[1.02] focus:outline-none focus:ring-4"
                                style={{ boxShadow: `0 0 0 0 ${a.ring}`, '--tw-ring-color': a.ring }}
                                onMouseEnter={(e) => { e.currentTarget.style.boxShadow = `0 0 0 4px ${a.ring}`; }}
                                onMouseLeave={(e) => { e.currentTarget.style.boxShadow = `0 0 0 0 ${a.ring}`; }}
                                onFocus={(e) => { e.currentTarget.style.boxShadow = `0 0 0 4px ${a.ring}`; }}
                                onBlur={(e) => { e.currentTarget.style.boxShadow = `0 0 0 0 ${a.ring}`; }}
                            >
                                <div
                                    className="absolute -top-3 -left-3 w-9 h-9 rounded-full text-white text-sm font-black flex items-center justify-center shadow-lg border-[3px] border-white z-20"
                                    style={{ backgroundColor: a.badge }}
                                    aria-hidden="true"
                                >
                                    {idx + 1}
                                </div>
                                <BranchItem branch={b} bIdx={idx} />
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
});


// ─── Registration ───────────────────────────────────────────────────────────
window.AlloModules = window.AlloModules || {};
window.AlloModules.KeyConceptMapView = KeyConceptMapView;
console.log('[KeyConceptMapModule] KeyConceptMapView registered.');
