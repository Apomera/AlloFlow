const fs = require('fs');
const content = fs.readFileSync('c:\\Users\\cabba\\OneDrive\\Desktop\\UDL-Tool-Updated\\AlloFlowANTI.txt', 'utf8');
const lines = content.split('\n');
const out = [];

// ============================================================
// 1. SURVEY MODAL - What does it contain?
// ============================================================
out.push('===== renderSurveyModal =====');
const surveyIdx = content.indexOf('const renderSurveyModal');
if (surveyIdx > -1) {
    const surveyLine = content.substring(0, surveyIdx).split('\n').length;
    out.push('Defined at L' + surveyLine);
    // Show the full function
    for (let i = surveyLine - 1; i < Math.min(surveyLine + 100, lines.length); i++) {
        out.push('L' + (i + 1) + ': ' + lines[i].trim().substring(0, 110));
        // Stop at next const function def
        if (i > surveyLine + 5 && lines[i].match(/^\s+const\s+(render|handle|generate)/)) break;
    }
}

// ============================================================
// 2. AUTO SURVEY PROMPT - What triggers it?
// ============================================================
out.push('\n===== renderAutoSurveyPrompt =====');
const autoIdx = content.indexOf('const renderAutoSurveyPrompt');
if (autoIdx > -1) {
    const autoLine = content.substring(0, autoIdx).split('\n').length;
    out.push('Defined at L' + autoLine);
    for (let i = autoLine - 1; i < Math.min(autoLine + 50, lines.length); i++) {
        out.push('L' + (i + 1) + ': ' + lines[i].trim().substring(0, 110));
        if (i > autoLine + 5 && lines[i].match(/^\s+const\s+(render|handle|generate)/)) break;
    }
}

// ============================================================
// 3. RESEARCH SETUP MODAL - Initial research config
// ============================================================
out.push('\n===== renderResearchSetupModal =====');
const setupIdx = content.indexOf('const renderResearchSetupModal');
if (setupIdx > -1) {
    const setupLine = content.substring(0, setupIdx).split('\n').length;
    out.push('Defined at L' + setupLine);
    for (let i = setupLine - 1; i < Math.min(setupLine + 120, lines.length); i++) {
        out.push('L' + (i + 1) + ': ' + lines[i].trim().substring(0, 110));
        if (i > setupLine + 5 && lines[i].match(/^\s+const\s+(render|handle|generate)/)) break;
    }
}

// ============================================================
// 4. CBM IMPORT MODAL - What data does it accept?
// ============================================================
out.push('\n===== renderCBMImportModal =====');
const cbmIdx = content.indexOf('const renderCBMImportModal');
if (cbmIdx > -1) {
    const cbmLine = content.substring(0, cbmIdx).split('\n').length;
    out.push('Defined at L' + cbmLine);
    for (let i = cbmLine - 1; i < Math.min(cbmLine + 100, lines.length); i++) {
        out.push('L' + (i + 1) + ': ' + lines[i].trim().substring(0, 110));
        if (i > cbmLine + 5 && lines[i].match(/^\s+const\s+(render|handle|generate)/)) break;
    }
}

// ============================================================
// 5. RESEARCH TOOLBAR - What controls does it have?
// ============================================================
out.push('\n===== renderResearchToolbar =====');
const toolbarIdx = content.indexOf('const renderResearchToolbar');
if (toolbarIdx > -1) {
    const toolbarLine = content.substring(0, toolbarIdx).split('\n').length;
    out.push('Defined at L' + toolbarLine);
    for (let i = toolbarLine - 1; i < Math.min(toolbarLine + 100, lines.length); i++) {
        out.push('L' + (i + 1) + ': ' + lines[i].trim().substring(0, 110));
        if (i > toolbarLine + 5 && lines[i].match(/^\s+const\s+(render|handle|generate)/)) break;
    }
}

// ============================================================
// 6. Check for TAM-related terms
// ============================================================
out.push('\n===== TAM / SURVEY CONTENT SEARCH =====');
const tamTerms = ['acceptance', 'TAM', 'perceived usefulness', 'perceived ease',
    'behavioral intention', 'subjective norm', 'facilitating conditions',
    'UTAUT', 'SUS', 'Likert', 'likert', 'survey item', 'fidelity',
    'self-efficacy', 'satisfaction', 'usability'];
for (const term of tamTerms) {
    const idx = content.indexOf(term);
    if (idx > -1) {
        const line = content.substring(0, idx).split('\n').length;
        const lineText = lines[line - 1]?.trim().substring(0, 90);
        out.push(term + ': L' + line + ' - ' + lineText);
    }
}

// ============================================================
// 7. Live session / sync references
// ============================================================
out.push('\n===== LIVE SESSION / SYNC =====');
const liveTerms = ['liveSync', 'LiveSync', 'isLiveListening', 'liveSyncCode',
    'broadcastChannel', 'BroadcastChannel', 'websocket', 'WebSocket',
    'sessionCode', 'shareLink', 'shareSession'];
for (const term of liveTerms) {
    const idx = content.indexOf(term);
    if (idx > -1) {
        out.push(term + ': L' + content.substring(0, idx).split('\n').length);
    }
}

// ============================================================
// 8. Student project settings (what can teacher configure?)
// ============================================================
out.push('\n===== STUDENT PROJECT SETTINGS =====');
const settingsIdx = content.indexOf('studentProjectSettings');
if (settingsIdx > -1) {
    const settingsLine = content.substring(0, settingsIdx).split('\n').length;
    out.push('First ref at L' + settingsLine);
}
// Find the full settings object shape
for (let i = 0; i < lines.length; i++) {
    if (lines[i] && lines[i].includes('allowDictation') && lines[i].includes('allowSocraticTutor')) {
        out.push('Settings shape at L' + (i + 1) + ': ' + lines[i].trim().substring(0, 110));
        // Show next few lines
        for (let j = i + 1; j < Math.min(i + 15, lines.length); j++) {
            if (lines[j]?.includes('allow') || lines[j]?.includes('adventure') || lines[j]?.includes('baseXP')) {
                out.push('  L' + (j + 1) + ': ' + lines[j].trim().substring(0, 90));
            }
        }
        break;
    }
}

fs.writeFileSync('c:\\Users\\cabba\\OneDrive\\Desktop\\UDL-Tool-Updated\\_archive\\research_deep_results.txt', out.join('\n'), 'utf8');
console.log('Written ' + out.length + ' lines');
