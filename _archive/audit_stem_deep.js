const fs = require('fs');
const content = fs.readFileSync('c:\\Users\\cabba\\OneDrive\\Desktop\\UDL-Tool-Updated\\AlloFlowANTI.txt', 'utf8');
const lines = content.split('\n');
const out = [];

// ============================================================
// STEM LAB DEEP AUDIT: Answer/Result tracking
// ============================================================

// 1. Find the math view (activeView === 'math') - where generated problems display
out.push('===== MATH VIEW: ANSWER/RESULT TRACKING =====');
for (let i = 0; i < lines.length; i++) {
    if (lines[i] && (
        lines[i].includes("activeView === 'math'") ||
        lines[i].includes("activeView==='math'")
    )) {
        out.push('L' + (i + 1) + ': ' + lines[i].trim().substring(0, 100));
    }
}

// 2. Check for answer input in math view
out.push('\n===== MATH VIEW: ANSWER INPUTS =====');
const mathTerms = ['studentAnswer', 'mathAnswer', 'userAnswer', 'checkAnswer',
    'submitAnswer', 'gradeAnswer', 'correctAnswer', 'answerInput',
    'mathResult', 'problemResult', 'mathScore', 'stemScore',
    'stemResult', 'assessmentResult', 'problemScore'];
for (const term of mathTerms) {
    const idx = content.indexOf(term);
    if (idx > -1) {
        const line = content.substring(0, idx).split('\n').length;
        out.push(term + ': L' + line + ' - ' + lines[line - 1].trim().substring(0, 90));
    } else {
        out.push(term + ': NOT FOUND');
    }
}

// 3. Find the math content display area
out.push('\n===== MATH CONTENT RENDERING =====');
for (let i = 0; i < lines.length; i++) {
    if (lines[i] && (
        lines[i].includes('mathContent') || lines[i].includes('MathContent') ||
        lines[i].includes('renderMath') || lines[i].includes('MathView')
    )) {
        out.push('L' + (i + 1) + ': ' + lines[i].trim().substring(0, 95));
    }
}

// 4. Solve button / solve mode
out.push('\n===== SOLVE FUNCTIONALITY =====');
const solveTerms = ['solveProblem', 'Solve Problem', 'solveStep', 'showSolution',
    'Set Solve', 'stemLabCreateMode.*solve', 'Freeform Builder',
    'mathSolution', 'stepByStep'];
for (const term of solveTerms) {
    const idx = content.indexOf(term);
    if (idx > -1) {
        const line = content.substring(0, idx).split('\n').length;
        out.push(term + ': L' + line + ' - ' + lines[line - 1].trim().substring(0, 90));
    }
}

// 5. STEM Lab state variables (complete)
out.push('\n===== ALL STEM LAB STATE =====');
const stemStates = ['mathInput', 'setMathInput', 'mathMode', 'setMathMode',
    'mathQuantity', 'mathSubject', 'stemLabTab', 'stemLabTool',
    'stemLabCreateMode', 'showAssessmentBuilder', 'assessmentBlocks',
    'mathProbeGrade', 'showStemLab', 'stemLabHistory', 'mathResults',
    'mathAnswers', 'showMathFeedback'];
for (const term of stemStates) {
    const idx = content.indexOf(term);
    if (idx > -1) {
        const line = content.substring(0, idx).split('\n').length;
        out.push(term + ': L' + line);
    } else {
        out.push(term + ': NOT FOUND');
    }
}

// 6. How does generated math content appear in main view?
out.push('\n===== MATH IN MAIN CONTENT AREA =====');
// The generatedContent.type === 'math' rendering
for (let i = 0; i < lines.length; i++) {
    if (lines[i] && (
        lines[i].includes("type === 'math'") || lines[i].includes("type==='math'")
    )) {
        out.push('L' + (i + 1) + ': ' + lines[i].trim().substring(0, 100));
    }
}

// 7. Check for any interactive math problem components
out.push('\n===== INTERACTIVE MATH COMPONENTS =====');
const interactiveTerms = ['MathProblem', 'ProblemCard', 'AnswerBox', 'AnswerField',
    'gradeSubmission', 'autoGrade', 'selfGrade', 'markCorrect',
    'markIncorrect', 'toggleCorrect'];
for (const term of interactiveTerms) {
    const idx = content.indexOf(term);
    if (idx > -1) {
        const line = content.substring(0, idx).split('\n').length;
        out.push(term + ': L' + line + ' - ' + lines[line - 1].trim().substring(0, 90));
    }
}

// 8. Explore tools - do they track results?
out.push('\n===== EXPLORE TOOLS RESULT TRACKING =====');
const exploreTerms = ['volumeAnswer', 'numberLineAnswer', 'areaAnswer', 'fractionAnswer',
    'volumeResult', 'toolResult', 'explorerResult',
    'volumeScore', 'explorerScore'];
for (const term of exploreTerms) {
    const idx = content.indexOf(term);
    if (idx > -1) {
        const line = content.substring(0, idx).split('\n').length;
        out.push(term + ': L' + line);
    } else {
        out.push(term + ': NOT FOUND');
    }
}

// 9. Math fluency probes (these ARE in AC but check if STEM Lab connects)
out.push('\n===== MATH FLUENCY IN STEM LAB =====');
for (let i = 73196; i < Math.min(73600, lines.length); i++) {
    if (lines[i] && (
        lines[i].includes('fluency') || lines[i].includes('Fluency') ||
        lines[i].includes('timer') || lines[i].includes('Timer') ||
        lines[i].includes('score') || lines[i].includes('Score') ||
        lines[i].includes('result') || lines[i].includes('Result')
    )) {
        out.push('L' + (i + 1) + ': ' + lines[i].trim().substring(0, 90));
    }
}

fs.writeFileSync('c:\\Users\\cabba\\OneDrive\\Desktop\\UDL-Tool-Updated\\_archive\\stem_lab_deep_results.txt', out.join('\n'), 'utf8');
console.log('Written ' + out.length + ' lines');
