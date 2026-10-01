const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const candidate = 'C:/tmp/tyler_integration_candidate';
const main = 'C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated';
const report = __dirname;
const sha = data => crypto.createHash('sha256').update(data).digest('hex');
const entries = [];
for (const rel of ['ui_strings.js', 'desktop/web-app/public/ui_strings.js']) {
  const file = path.join(candidate, rel);
  const before = fs.readFileSync(file, 'utf8');
  const data = JSON.parse(before);
  const additions = {
    nav_home_behavior_tools: 'Home behavior tools',
    home_behavior_tools_tooltip: 'Home behavior tools: BehaviorLens for families (home logs, token boards, coping choices, and notes to share with school)',
  };
  if (Object.keys(additions).some(key => Object.hasOwn(data.header, key))) throw new Error('Catalog keys already present: ' + rel);
  const anchor = '    "nav_educator_tools": "Educator tools"';
  if (before.split(anchor).length !== 2) throw new Error('Catalog anchor changed: ' + rel);
  const newline = before.includes('\r\n') ? '\r\n' : '\n';
  const replacement = anchor + ',' + newline + Object.entries(additions).map(([key, value]) => `    ${JSON.stringify(key)}: ${JSON.stringify(value)}`).join(',' + newline);
  const after = before.replace(anchor, replacement);
  JSON.parse(after);
  fs.writeFileSync(file, after);
  entries.push({ path: rel, action: 'add-header-catalog-keys', before: sha(before), after: sha(after) });
}
function copyMissing(rel) {
  const from = path.join(main, rel);
  const to = path.join(candidate, rel);
  if (fs.statSync(from).isDirectory()) {
    for (const entry of fs.readdirSync(from)) copyMissing(rel + '/' + entry);
    return;
  }
  if (fs.existsSync(to)) return;
  const bytes = fs.readFileSync(from);
  fs.mkdirSync(path.dirname(to), { recursive: true });
  fs.writeFileSync(to, bytes, { flag: 'wx' });
  entries.push({ path: rel, action: 'materialize-missing-current-main-fixture', bytes: bytes.length, sha256: sha(bytes) });
}
for (const rel of ['stem_lab/stem_lab_module.js', 'stem_lab/stem_tool_printingpress.js', 'app', 'desktop/web-app/public/app']) copyMissing(rel);
if (!fs.readFileSync(path.join(candidate, 'ui_strings.js')).equals(fs.readFileSync(path.join(candidate, 'desktop/web-app/public/ui_strings.js')))) throw new Error('Catalog mirrors differ');
fs.writeFileSync(path.join(report, 'runtime-check-input-repairs.json'), JSON.stringify({ recordedAt: new Date().toISOString(), candidate, entries }, null, 2) + '\n');
console.log(JSON.stringify({ catalogFiles: 2, fixtureFiles: entries.length - 2, fixtureBytes: entries.reduce((sum, row) => sum + (row.bytes || 0), 0) }));
