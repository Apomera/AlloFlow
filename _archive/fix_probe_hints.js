const fs = require('fs');
const f = 'c:\\Users\\cabba\\OneDrive\\Desktop\\UDL-Tool-Updated\\AlloFlowANTI.txt';
let content = fs.readFileSync(f, 'utf8');
let changes = 0;

// Find and fix the showLetterHints toggle - uses prev => !prev pattern
const oldHintsToggle = 'setShowLetterHints(prev => !prev)';
const newHintsToggle = '{ if (!isProbeMode) setShowLetterHints(prev => !prev) }';
if (content.includes(oldHintsToggle)) {
    content = content.replace(oldHintsToggle, newHintsToggle);
    console.log('✅ Letter hints toggle disabled during probes');
    changes++;
} else {
    console.log('❌ Letter hints toggle pattern not found');
    // Try alternate patterns
    const alt1 = "setShowLetterHints(!showLetterHints)";
    if (content.includes(alt1)) {
        content = content.replace(alt1, "{ if (!isProbeMode) setShowLetterHints(!showLetterHints) }");
        console.log('✅ Letter hints toggle (alt) disabled during probes');
        changes++;
    }
}

// Force showLetterHints OFF in probe mode via initial state
// Add a useEffect to disable hints when probe starts
const probeHintGuard = `    React.useEffect(() => {
        if (isProbeMode) {
            setShowLetterHints(false);
            setShowWordText(false);
        }
    }, [isProbeMode]);`;

// Insert after the showLetterHints state declaration
const hintStateDecl = "const [showLetterHints, setShowLetterHints] = React.useState(false);";
if (content.includes(hintStateDecl) && !content.includes('if (isProbeMode) {\n            setShowLetterHints(false)')) {
    content = content.replace(hintStateDecl, hintStateDecl + '\n' + probeHintGuard);
    console.log('✅ Probe mode forces hints OFF via useEffect');
    changes++;
}

// Also guard the image visibility - in probe mode, images should not be shown
// Add imageVisibilityMode override for probes
const imgModeDecl = "const [imageVisibilityMode, setImageVisibilityMode] = React.useState('smart');";
if (content.includes(imgModeDecl)) {
    // After this line, add probe override
    const probeImgGuard = `    React.useEffect(() => {
        if (isProbeMode) setImageVisibilityMode('off');
    }, [isProbeMode]);`;
    if (!content.includes("if (isProbeMode) setImageVisibilityMode('off')")) {
        content = content.replace(imgModeDecl, imgModeDecl + '\n' + probeImgGuard);
        console.log('✅ Image visibility set to "off" during probes');
        changes++;
    }
}

fs.writeFileSync(f, content, 'utf8');
console.log('\n=== ' + changes + ' additional fixes applied ===');
console.log('Saved! (' + content.length + ' bytes)');
