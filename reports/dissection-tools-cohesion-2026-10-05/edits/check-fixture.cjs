const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const parser = require('C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/node_modules/@babel/parser');
const fixture = path.join(__dirname, 'dissection-tools-cohesion.spec.ts');
const bytes = fs.readFileSync(fixture);
const errors = [];
try { parser.parse(bytes.toString('utf8'), { sourceType: 'module', plugins: ['typescript'] }); }
catch (error) { errors.push(error); }
const receipt = {
  fixture,
  intendedTarget: 'C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/tests/e2e/dissection-tools-cohesion.spec.ts',
  sha256: crypto.createHash('sha256').update(bytes).digest('hex'),
  bytes: bytes.length,
  createdAt: fs.statSync(fixture).birthtime.toISOString(),
  checkedAt: new Date().toISOString(),
  syntaxCheck: { tool: '@babel/parser with TypeScript plugin', errorCount: errors.length },
  caseCount: 11,
  layoutCases: 6,
  focusedWorkflowCases: 5,
  suitesRun: false,
  repositoryFilesWritten: false,
};
fs.writeFileSync(path.join(__dirname, 'creation-receipt.json'), JSON.stringify(receipt, null, 2) + '\n');
console.log(JSON.stringify(receipt));
for (const error of errors) console.error(error.message);
process.exitCode = errors.length ? 1 : 0;
