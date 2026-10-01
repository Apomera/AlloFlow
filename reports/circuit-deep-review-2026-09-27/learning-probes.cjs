// Read-only CircuitTool learning probes. Run from any working directory:
// node reports/circuit-deep-review-2026-09-27/learning-probes.cjs
// Source files are never modified; results.json is refreshed beside this script.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const sourcePath = path.resolve(__dirname, '../../stem_lab/stem_tool_circuit.js');
const source = fs.readFileSync(sourcePath, 'utf8');
const lineOf = text => source.slice(0, source.indexOf(text)).split('\n').length;

// Execute the actual question generator with deterministic random draws.
const questionStart = source.indexOf('  function makeOhmQuestion()');
const questionEnd = source.indexOf('\n  // ═', questionStart);
if (questionStart < 0 || questionEnd < 0) throw Error('Question generator boundary changed. Update the probe.');
const sequence = [0, 0, .999, 0, 0, 0];
let randomIndex = 0;
const deterministicMath = Object.create(Math);
deterministicMath.random = () => sequence[randomIndex++] ?? .6;
const question = new Function('Math', source.slice(questionStart, questionEnd) + '\nreturn makeOhmQuestion();')(deterministicMath);
const gradeMatch = source.match(/var correct = (Math\.abs\(opt - ohmQuiz\.answer\)[^;]+);/);
if (!gradeMatch) throw Error('Quiz grading expression changed. Update the probe.');
const grade = new Function('opt', 'ohmQuiz', 'return ' + gradeMatch[1]);
const gradedOptions = question.opts.map(value => ({ value, markedCorrect: grade(value, question) }));

// Run the actual simple DC model and comparison helper, without browser UI.
const modelEnd = source.indexOf('  var CIRCUIT_LESSONS');
if (modelEnd < 0) throw Error('Model boundary changed. Update the probe.');
const modelWindow = {};
new Function('window', source.slice(0, modelEnd) + '})();')(modelWindow);
const before = { mode: 'series', voltage: 1, components: [{ id: 1, type: 'resistor', value: 10000 }] };
const after = { ...before, voltage: 2 };
const beforeCurrent = modelWindow.StemLab.solveCircuit(before).current;
const afterCurrent = modelWindow.StemLab.solveCircuit(after).current;
const deltaCurrent = afterCurrent - beforeCurrent;
const fmtMatch = source.match(/var fmt = (function\(n\) \{ return n\.toFixed\(3\)\+' A'; \});/);
if (!fmtMatch) throw Error('Comparison formatter changed. Update the probe.');
const format = new Function('return ' + fmtMatch[1])();

const results = {
  source: path.relative(path.resolve(__dirname, '../..'), sourcePath).replaceAll('\\', '/'),
  sourceSha256: crypto.createHash('sha256').update(source).digest('hex'),
  quiz: {
    generatorLine: lineOf('  function makeOhmQuestion()'),
    distractorRepairLine: lineOf('    var _fixOpt = function (w)'),
    gradingLine: lineOf('var correct = ' + gradeMatch[1]),
    randomSequence: sequence,
    remainingRandomValue: .6,
    question,
    gradingExpression: gradeMatch[1],
    gradedOptions,
    distinctOptionCount: new Set(question.opts).size,
    wrongOptionsMarkedCorrect: gradedOptions.filter(option => option.value !== question.answer && option.markedCorrect).length
  },
  comparisonPrecision: {
    formatterLine: lineOf('var fmt = ' + fmtMatch[1]),
    before,
    after,
    currentAmps: { before: beforeCurrent, after: afterCurrent, delta: deltaCurrent },
    displayed: { before: format(beforeCurrent), after: format(afterCurrent), delta: '+' + format(deltaCurrent) },
    comparison: modelWindow.StemLab.circuitExperimentDiff(before, after)
  }
};
fs.writeFileSync(path.join(__dirname, 'results.json'), JSON.stringify(results, null, 2) + '\n');
console.log(JSON.stringify(results, null, 2));
