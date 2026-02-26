const fs = require('fs');
const content = fs.readFileSync('c:\\Users\\cabba\\OneDrive\\Desktop\\UDL-Tool-Updated\\AlloFlowANTI.txt', 'utf8');
const lines = content.split('\n');
const out = [];

// Find each explore tool's implementation
const tools = ['volume', 'numberline', 'areamodel', 'fractions'];
const toolLabels = ['Volume Explorer', 'Number Line', 'Area Model', 'Fraction Tiles'];

for (let t = 0; t < tools.length; t++) {
    out.push('\n===== ' + toolLabels[t].toUpperCase() + ' =====');
    const toolId = tools[t];

    // Find stemLabTool === 'toolId' rendering
    const pattern = "stemLabTool === '" + toolId + "'";
    let pos = 0;
    let count = 0;
    while ((pos = content.indexOf(pattern, pos)) !== -1 && count < 3) {
        const l = content.substring(0, pos).split('\n').length;
        out.push('Render check at L' + l + ': ' + lines[l - 1].trim().substring(0, 100));
        pos += pattern.length;
        count++;
    }

    // Find state variables for this tool
    const stateTerms = [
        toolId + 'Width', toolId + 'Height', toolId + 'Depth',
        toolId + 'Length', toolId + 'Value', toolId + 'Position',
        toolId + 'Answer', toolId + 'Score', toolId + 'Challenge',
        'set' + toolId.charAt(0).toUpperCase() + toolId.slice(1)
    ];

    // Generic state search around the tool rendering area
    const toolStart = content.indexOf(pattern);
    if (toolStart > -1) {
        const toolSection = content.substring(toolStart, Math.min(toolStart + 15000, content.length));
        const toolLines = toolSection.split('\n');

        // Look for state variables, interactivity, inputs
        out.push('--- Interactivity ---');
        for (let i = 0; i < Math.min(300, toolLines.length); i++) {
            const line = toolLines[i].trim();
            if (line.includes('onChange') || line.includes('onClick') ||
                line.includes('onInput') || line.includes('slider') ||
                line.includes('input ') || line.includes('useState') ||
                line.includes('Score') || line.includes('score') ||
                line.includes('answer') || line.includes('Answer') ||
                line.includes('correct') || line.includes('challenge') ||
                line.includes('Challenge') || line.includes('result') ||
                line.includes('submit') || line.includes('check')) {
                const globalLine = content.substring(0, toolStart).split('\n').length + i;
                out.push('L' + globalLine + ': ' + line.substring(0, 100));
            }
        }
    }
}

// Also find the state declarations for all explore tool variables
out.push('\n===== EXPLORE TOOL STATE VARIABLES =====');
const volumeStates = ['volumeW', 'volumeH', 'volumeD', 'setVolumeW', 'volumeShowLayers',
    'volumeRotate', 'volumeExplode', 'numberLineMin', 'numberLineMax',
    'numberLineMarkers', 'areaModelA', 'areaModelB', 'fractionParts',
    'fractionSelected', 'fractionShape', 'fractionCompare'];

for (const term of volumeStates) {
    const idx = content.indexOf(term);
    if (idx > -1) {
        const l = content.substring(0, idx).split('\n').length;
        out.push(term + ': L' + l);
    } else {
        out.push(term + ': NOT FOUND');
    }
}

fs.writeFileSync('c:\\Users\\cabba\\OneDrive\\Desktop\\UDL-Tool-Updated\\_archive\\explore_tools_audit.txt', out.join('\n'), 'utf8');
console.log('Written ' + out.length + ' lines');
