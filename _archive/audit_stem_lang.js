const fs = require('fs');
const content = fs.readFileSync('c:\\Users\\cabba\\OneDrive\\Desktop\\UDL-Tool-Updated\\AlloFlowANTI.txt', 'utf8');
const lines = content.split('\n');

// Find STEM Lab Gemini calls
console.log('=== STEM LAB GEMINI CALLS ===');
const stemLabStart = content.indexOf("stemLabTab");
const stemLabGeminiCalls = [];
let pos = 0;

// Find all onCallGemini or callGemini within STEM Lab context
const geminiPatterns = ['onCallGemini', 'callGemini', 'handleCallGemini'];
for (const pat of geminiPatterns) {
    pos = content.indexOf("stemLabTab");
    while ((pos = content.indexOf(pat, pos)) !== -1 && pos < content.length) {
        const l = content.substring(0, pos).split('\n').length;
        const line = lines[l - 1].trim().substring(0, 120);
        // Check if this is near STEM Lab code
        const context = content.substring(Math.max(0, pos - 300), pos);
        if (context.includes('stemLab') || context.includes('STEM') || context.includes('math') || context.includes('areamodel')) {
            console.log('L' + l + ': ' + line);
        }
        pos += pat.length;
    }
}

// Check for targetLanguage or language parameter in STEM Lab generation
console.log('\n=== LANGUAGE PARAMS IN STEM LAB ===');
const langTerms = ['targetLang', 'targetTranslationLang', 'language:', 'outputLanguage', 'lang:'];
for (const term of langTerms) {
    // Look between STEM Lab area (around L60000-74000 based on prior audit)
    let searchPos = 60000;
    let count = 0;
    while (searchPos < lines.length && count < 5) {
        const lineText = lines[searchPos] || '';
        if (lineText.includes(term) && (lineText.includes('stem') || lineText.includes('math') || lineText.includes('STEM'))) {
            console.log(term + ' at L' + (searchPos + 1) + ': ' + lineText.trim().substring(0, 100));
            count++;
        }
        searchPos++;
    }
}

// Find the STEM Lab content generation prompt
console.log('\n=== STEM LAB GENERATION PROMPTS ===');
const prompts = ['Generate', 'generate'];
const stemPromptStart = content.indexOf("activeView === 'math'");
if (stemPromptStart > -1) {
    console.log('Math view starts at L' + content.substring(0, stemPromptStart).split('\n').length);
}

// Find handleGenerateMathContent or similar
const genHandlers = ['handleGenerateMathContent', 'generateMathContent', 'handleStemLabGenerate', 'handleMathGenerate'];
for (const h of genHandlers) {
    const idx = content.indexOf(h);
    if (idx > -1) {
        const l = content.substring(0, idx).split('\n').length;
        console.log(h + ': L' + l + ' - ' + lines[l - 1].trim().substring(0, 100));
    }
}

// Find the Assessment Builder generation
const assessBuild = content.indexOf('handleCompileAssessment');
if (assessBuild > -1) {
    const l = content.substring(0, assessBuild).split('\n').length;
    console.log('handleCompileAssessment: L' + l);
}

// Look for stemLabSubject usage in generation
const stemSubject = content.indexOf('stemLabSubject');
if (stemSubject > -1) {
    const l = content.substring(0, stemSubject).split('\n').length;
    console.log('stemLabSubject first use: L' + l);
}

// Find the actual prompt construction
console.log('\n=== PROMPT CONSTRUCTION ===');
const promptTerms = ['stem_lab_prompt', 'stemLabPrompt', 'Generate a set of', 'Generate problems'];
for (const t of promptTerms) {
    const idx = content.indexOf(t);
    if (idx > -1) {
        const l = content.substring(0, idx).split('\n').length;
        console.log(t + ': L' + l + ' - ' + lines[l - 1].trim().substring(0, 120));
    }
}
