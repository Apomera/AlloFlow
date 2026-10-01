// Rerun with: node reports/circuit-enhancements-2026-09-27/learning-probes.cjs
// Reads production code and refreshes learning-results.json; no product edits.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const source = fs.readFileSync(path.resolve(__dirname, '../../stem_lab/stem_tool_circuit.js'), 'utf8');
const start = source.indexOf('  function makeOhmQuestion()');
const end = source.indexOf('\n  // ═', start);
const sequence = [0, 0, .999, 0, 0, 0]; let draw = 0;
const math = Object.create(Math); math.random = () => sequence[draw++] ?? .6;
const question = new Function('Math', 'window', source.slice(start, end) + '\nreturn makeOhmQuestion();')(math, { StemLab: {} });
const grading = source.match(/var correct = ([^;]+);\s+var newScore = ohmScore/)[1];
const grade = new Function('opt', 'ohmQuiz', 'return ' + grading);
const modelWindow = {};
new Function('window', source.slice(0, source.indexOf('  var CIRCUIT_LESSONS')) + '\nwindow.StemLab.currentTextForProbe = circuitCurrentText;})();')(modelWindow);
const before = { mode: 'series', voltage: 1, components: [{ id: 1, type: 'resistor', value: 10000 }] };
const after = { ...before, voltage: 2 };
const beforeCurrent = modelWindow.StemLab.solveCircuit(before).current;
const afterCurrent = modelWindow.StemLab.solveCircuit(after).current;
if (!source.includes('var fmt = circuitCurrentText;')) throw Error('Investigation formatter changed; update the probe.');
const format = modelWindow.StemLab.currentTextForProbe;
const result = {
  sourceSha256: crypto.createHash('sha256').update(source).digest('hex'),
  question,
  gradingExpression: grading,
  gradedChoices: question.opts.map(value => ({ value, correct: grade(value, question) })),
  legacyChoice: { answer: .006, chosen: .007, correct: grade(.007, { answer: .006 }) },
  comparison: {
    actualAmps: [beforeCurrent, afterCurrent, afterCurrent - beforeCurrent],
    displayed: [format(beforeCurrent), format(afterCurrent), '+' + format(afterCurrent - beforeCurrent)]
  }
};
if (new Set(question.opts).size !== 4 || result.gradedChoices.filter(choice => choice.correct).length !== 1 || result.legacyChoice.correct) throw Error('Quiz regression');
if (result.comparison.displayed.join('|') !== '100 µA|200 µA|+100 µA') throw Error('Precision regression');
fs.writeFileSync(path.join(__dirname, 'learning-results.json'), JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify(result, null, 2));
