const fs = require('fs');
const f = 'c:\\Users\\cabba\\OneDrive\\Desktop\\UDL-Tool-Updated\\AlloFlowANTI.txt';
let content = fs.readFileSync(f, 'utf8');

// Fix 1: Make \frac regex tolerate commas between args
const oldFrac = '\\\\frac\\\\s*\\\\{([^}]+)\\\\}\\\\s*\\\\{([^}]+)\\\\}';
const newFrac = '\\\\frac\\\\s*\\\\{([^}]+)\\\\}\\\\s*,?\\\\s*\\\\{([^}]+)\\\\}';
if (content.includes(oldFrac)) {
    content = content.replace(oldFrac, newFrac);
    console.log('Fix 1: frac regex tolerates commas now');
} else {
    console.log('Fix 1: pattern not found');
}

// Fix 2: Wrap raw {step.latex} in MathSymbol in the step-by-step solution
// Find instances where step.latex is shown raw (not in <MathSymbol>)
// Target: {step.latex} that appears after text-indigo-700 overflow-x-auto
const rawLatex = '{step.latex}\n';
const instances = content.split(rawLatex);
console.log(`Found ${instances.length - 1} instances of raw {step.latex}`);

// Replace only the raw ones (not the ones already in MathSymbol or value={step.latex})
content = content.replace(
    /(\bfont-mono text-xs text-indigo-700[^>]*>)\s*\n\s*\{step\.latex\}/g,
    '$1\n                                                                                    <MathSymbol text={step.latex} />'
);
console.log('Fix 2: wrapped raw step.latex with MathSymbol');

// Also wrap step.expression in MathSymbol
content = content.replace(
    /(\bfont-mono text-xs text-indigo-700[^>]*>)\s*\n\s*\{step\.expression\}/g,
    '$1\n                                                                                    <MathSymbol text={step.expression} />'
);
console.log('Fix 3: wrapped raw step.expression with MathSymbol');

fs.writeFileSync(f, content, 'utf8');
console.log('Saved');
