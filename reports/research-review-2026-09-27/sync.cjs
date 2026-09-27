// Sync only these module families and exact host pins; preserve all other edits.
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto');
const root = path.resolve(__dirname, '../..');
const read = file => fs.readFileSync(path.join(root, file));
const report = {};
for (const name of ['content_engine_module.js', 'view_misc_panels_module.js']) {
  const bytes = read(name), hash = crypto.createHash('sha256').update(bytes).digest('hex');
  const mirrors = ['desktop/web-app/public/', 'desktop/app-build/', 'desktop/web-app/build/'].map(prefix => prefix + name).filter(file => fs.existsSync(path.join(root, file)));
  for (const file of mirrors) fs.writeFileSync(path.join(root, file), bytes);
  report[name] = { sha256: hash, pin: hash.slice(0, 8), mirrors };
}
fs.writeFileSync(path.join(root, 'desktop/web-app/src/content_engine_source.jsx'), read('content_engine_source.jsx'));
report.hosts = ['AlloFlowANTI.txt', 'desktop/web-app/src/AlloFlowANTI.txt', 'desktop/web-app/src/App.jsx'];
for (const host of report.hosts) {
  let content = read(host).toString();
  for (const name of ['content_engine_module.js', 'view_misc_panels_module.js']) {
    const pattern = new RegExp(name.replace(/\./g, '\\.') + '\\?v=[a-z0-9]+', 'g');
    if (!pattern.test(content)) throw new Error('Missing module pin: ' + host + ' ' + name);
    content = content.replace(pattern, name + '?v=' + report[name].pin);
  }
  fs.writeFileSync(path.join(root, host), content);
}
fs.writeFileSync(path.join(__dirname, 'artifacts.json'), JSON.stringify(report, null, 2) + '\n');
const delta = {};
for (const match of read('view_misc_panels_source.jsx').toString().matchAll(/sourceText\('(input\.review_[^']+)', '((?:[^'\\]|\\.)*)'\)/g)) delta[match[1]] = match[2].replace(/\\'/g, "'");
fs.writeFileSync(path.join(__dirname, 'ui-strings.delta.json'), JSON.stringify(delta, null, 2) + '\n');
console.log(JSON.stringify(report));
