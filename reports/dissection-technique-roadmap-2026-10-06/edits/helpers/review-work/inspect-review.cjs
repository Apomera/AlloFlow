const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, '..', 'renderer-next.js');
const lines = fs.readFileSync(file, 'utf8').split('\n');
const mode = process.argv[2] || 'model';
const patterns = {
  model: /function (procedureLearningSummary|procedureLearningEntry|procedureActionComplete|procedureLearningGate|nextProcedure)|var (currentLearningGate|procedureProtocol|procedureNext)/,
  render: /function render(TechniqueRoadmap|ProcedureLearningCheckpoint)|Review your specimen investigation|Specimen investigation complete/,
  protocol: /procedureProtocolFor|order:|predictionCorrect|reflectionCorrect/,
};
if (/^\d+:\d+$/.test(mode)) {
  const [start, end] = mode.split(':').map(Number);
  console.log(lines.slice(start - 1, end).map((line, index) => (start + index) + ': ' + line).join('\n'));
} else {
  const regex = patterns[mode];
  if (!regex) throw Error('Unknown reader mode');
  for (let index = 0; index < lines.length; index++) {
    if (regex.test(lines[index])) console.log((index + 1) + ': ' + lines[index]);
  }
}
