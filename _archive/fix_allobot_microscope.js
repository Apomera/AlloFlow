const fs = require('fs');
const f = 'c:\\Users\\cabba\\OneDrive\\Desktop\\UDL-Tool-Updated\\AlloFlowANTI.txt';
let content = fs.readFileSync(f, 'utf8');

// ============================================================
// 1. Change accessory name from 'lab-goggles' to 'microscope'
// ============================================================
const oldCase = `case 'math':\r\n        case 'stem':\r\n            return 'lab-goggles';`;
const newCase = `case 'math':\r\n        case 'stem':\r\n            return 'microscope';`;

if (content.includes(oldCase)) {
    content = content.replace(oldCase, newCase);
    console.log('✅ Step 1: Changed lab-goggles -> microscope in accessor');
} else {
    console.log('❌ Step 1: Could not find lab-goggles case');
}

// ============================================================
// 2. Replace the goggles SVG with a microscope SVG
//    Positioned to the LEFT of the bot body
// ============================================================
const oldGoggles = `{effectiveAccessory === 'lab-goggles' && (
                            <g className="animate-in fade-in slide-in-from-top-2 duration-500 origin-center">
                                {/* Strap */}
                                <path d="M20 42 Q15 36 18 30 Q22 24 30 26" stroke="#64748B" strokeWidth="2" fill="none" />
                                <path d="M80 42 Q85 36 82 30 Q78 24 70 26" stroke="#64748B" strokeWidth="2" fill="none" />
                                <path d="M30 26 Q50 22 70 26" stroke="#94A3B8" strokeWidth="3" fill="none" />
                                {/* Left lens */}
                                <ellipse cx="38" cy="38" rx="12" ry="10" fill="rgba(147, 197, 253, 0.25)" stroke="#475569" strokeWidth="2" />
                                <ellipse cx="36" cy="36" rx="4" ry="3" fill="white" opacity="0.3" transform="rotate(-15 36 36)" />
                                {/* Right lens */}
                                <ellipse cx="62" cy="38" rx="12" ry="10" fill="rgba(167, 243, 208, 0.25)" stroke="#475569" strokeWidth="2" />
                                <ellipse cx="60" cy="36" rx="4" ry="3" fill="white" opacity="0.3" transform="rotate(-15 60 36)" />
                                {/* Bridge */}
                                <path d="M50 38 Q50 33 50 38" stroke="#475569" strokeWidth="2.5" />
                                <rect x="47" y="34" width="6" height="4" rx="1" fill="#475569" />
                            </g>
                        )}`;

const newMicroscope = `{effectiveAccessory === 'microscope' && (
                            <g className="animate-in fade-in slide-in-from-left-3 duration-500" transform="translate(-28, 8)">
                                {/* Microscope base */}
                                <ellipse cx="8" cy="82" rx="14" ry="4" fill="#334155" />
                                <rect x="2" y="78" width="12" height="4" rx="1" fill="#475569" />
                                {/* Stand/arm */}
                                <rect x="6" y="38" width="4" height="42" rx="1" fill="#64748B" />
                                {/* Arm connector */}
                                <path d="M8 40 Q8 32 16 28" stroke="#64748B" strokeWidth="4" fill="none" strokeLinecap="round" />
                                {/* Body tube */}
                                <rect x="13" y="22" width="6" height="18" rx="2" fill="url(#microscopeGrad)" stroke="#475569" strokeWidth="1" />
                                {/* Eyepiece */}
                                <rect x="11" y="18" width="10" height="6" rx="2" fill="#334155" />
                                <ellipse cx="16" cy="18" rx="5" ry="2" fill="#1e293b" />
                                <ellipse cx="15" cy="17" rx="2" ry="1" fill="white" opacity="0.3" />
                                {/* Objective lens */}
                                <rect x="14" y="40" width="4" height="5" rx="1" fill="#334155" />
                                <circle cx="16" cy="46" r="3" fill="#93c5fd" opacity="0.5" stroke="#475569" strokeWidth="1" />
                                {/* Stage */}
                                <rect x="4" y="48" width="22" height="3" rx="1" fill="#475569" />
                                {/* Slide on stage */}
                                <rect x="8" y="47" width="12" height="2" rx="0.5" fill="rgba(219, 234, 254, 0.6)" stroke="#93c5fd" strokeWidth="0.5" />
                                {/* Focus knob */}
                                <circle cx="2" cy="52" r="3" fill="#64748B" stroke="#475569" strokeWidth="1" />
                                <circle cx="2" cy="52" r="1.5" fill="#94a3b8" />
                                {/* Light glow */}
                                <circle cx="16" cy="46" r="6" fill="rgba(147, 197, 253, 0.15)">
                                    <animate attributeName="opacity" values="0.1;0.25;0.1" dur="3s" repeatCount="indefinite" />
                                </circle>
                            </g>
                        )}`;

if (content.includes(oldGoggles)) {
    content = content.replace(oldGoggles, newMicroscope);
    console.log('✅ Step 2: Replaced goggles SVG with microscope SVG');
} else {
    console.log('❌ Step 2: Could not find goggles SVG exactly');
}

// ============================================================
// 3. Add microscope gradient definition to defs
// ============================================================
const defsSection = '<defs>';
const defsIdx = content.indexOf(defsSection, 18350);
if (defsIdx > -1 && defsIdx < 18400) {
    const gradDef = `<defs>
                <linearGradient id="microscopeGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#94A3B8" />
                    <stop offset="100%" stopColor="#64748B" />
                </linearGradient>`;
    content = content.substring(0, defsIdx) + gradDef + content.substring(defsIdx + defsSection.length);
    console.log('✅ Step 3: Added microscope gradient to defs');
} else {
    console.log('❌ Step 3: Could not find defs section near expected location');
}

fs.writeFileSync(f, content, 'utf8');
console.log('Done! Saved (' + content.length + ' bytes)');
