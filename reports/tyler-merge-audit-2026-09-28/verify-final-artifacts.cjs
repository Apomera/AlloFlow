const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const root = 'C:/tmp/tyler_integration_candidate';
const reportPath = path.join(__dirname, 'integration-build.json');
const report = JSON.parse(fs.readFileSync(reportPath));
const merged = JSON.parse(fs.readFileSync(path.join(__dirname, 'integration-merge.json')));
const hash = b => crypto.createHash('sha256').update(b).digest('hex');
const parser = require(path.join(root, 'node_modules/@babel/parser'));
for (const p of ['AlloFlowANTI.txt', 'desktop/web-app/src/App.jsx']) parser.parse(fs.readFileSync(path.join(root, p), 'utf8'), {sourceType:'module', plugins:['jsx']});
for (const item of report.pairs) {
  const source = fs.readFileSync(path.join(root, item.path));
  if (!source.equals(fs.readFileSync(path.join(root, 'desktop/web-app/public', item.path)))) throw new Error('Mirror drift: ' + item.path);
  item.sha256 = hash(source);
}
const packs = merged.results.filter(x => x.path.startsWith('lang/'));
for (const item of packs) {
  if (!fs.readFileSync(path.join(root, item.path)).equals(fs.readFileSync(path.join(root, 'desktop/web-app/public', item.path)))) throw new Error('Language mirror drift: ' + item.path);
}
for (const item of merged.results) {
  if (/^<<<<<<< |^>>>>>>> |^=======\s*$/m.test(fs.readFileSync(path.join(root, item.path), 'utf8'))) throw new Error('Conflict marker: ' + item.path);
}
report.finalVerifiedAt = new Date().toISOString();
report.languagePairs = packs.length;
report.conflictMarkerPathsChecked = merged.results.length;
fs.writeFileSync(reportPath, JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({jsxParsed:2, artifactPairs:report.pairs.length, languagePairs:packs.length, pathsWithoutConflictMarkers:merged.results.length}));
