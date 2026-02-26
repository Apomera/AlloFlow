const fs = require('fs');
const f = 'c:\\Users\\cabba\\OneDrive\\Desktop\\UDL-Tool-Updated\\AlloFlowANTI.txt';
let content = fs.readFileSync(f, 'utf8');
const lines = content.split('\n');

// Find lab-goggles rendering (should now not match any accessor, but we want to replace the SVG)
let startLine = -1;
let endLine = -1;
for (let i = 18330; i < 18360; i++) {
    if (lines[i] && lines[i].includes('lab-goggles')) {
        startLine = i;
    }
    if (startLine > -1 && lines[i] && lines[i].trim() === ')}') {
        endLine = i;
        break;
    }
}

if (startLine > -1 && endLine > -1) {
    console.log('Found goggles at lines ' + (startLine + 1) + ' to ' + (endLine + 1));

    const microscopeSvg = `                        {effectiveAccessory === 'microscope' && (
                            <g className="animate-in fade-in slide-in-from-left-3 duration-500" transform="translate(-28, 8)">
                                {/* Microscope base */}
                                <ellipse cx="8" cy="82" rx="14" ry="4" fill="#334155" />
                                <rect x="2" y="78" width="12" height="4" rx="1" fill="#475569" />
                                {/* Stand */}
                                <rect x="6" y="38" width="4" height="42" rx="1" fill="#64748B" />
                                {/* Arm */}
                                <path d="M8 40 Q8 32 16 28" stroke="#64748B" strokeWidth="4" fill="none" strokeLinecap="round" />
                                {/* Body tube */}
                                <rect x="13" y="22" width="6" height="18" rx="2" fill="#94A3B8" stroke="#475569" strokeWidth="1" />
                                {/* Eyepiece */}
                                <rect x="11" y="18" width="10" height="6" rx="2" fill="#334155" />
                                <ellipse cx="16" cy="18" rx="5" ry="2" fill="#1e293b" />
                                <ellipse cx="15" cy="17" rx="2" ry="1" fill="white" opacity="0.3" />
                                {/* Objective lens */}
                                <rect x="14" y="40" width="4" height="5" rx="1" fill="#334155" />
                                <circle cx="16" cy="46" r="3" fill="#93c5fd" opacity="0.5" stroke="#475569" strokeWidth="1" />
                                {/* Stage */}
                                <rect x="4" y="48" width="22" height="3" rx="1" fill="#475569" />
                                {/* Slide */}
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

    const newLines = microscopeSvg.split('\n');
    lines.splice(startLine, endLine - startLine + 1, ...newLines);
    console.log('Replaced goggles with microscope SVG (' + newLines.length + ' lines)');

    fs.writeFileSync(f, lines.join('\n'), 'utf8');
    console.log('Saved!');
} else {
    console.log('Could not find goggles block. startLine=' + startLine + ' endLine=' + endLine);
    for (let i = 18338; i < 18360; i++) {
        console.log('L' + (i + 1) + ': ' + (lines[i] ? lines[i].trim().substring(0, 80) : ''));
    }
}
