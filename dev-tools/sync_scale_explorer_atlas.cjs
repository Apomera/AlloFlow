// Update only Scale Explorer's new English keys and its desktop source mirror.
// This deliberately leaves all other tools' in-progress strings untouched.
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync('stem_lab/stem_tool_scaleexplorer.js', 'utf8');
const additions = {};
for (const m of source.matchAll(/S\('(atlas_[a-z_]+)', ('(?:\\.|[^'\\])*')/g)) {
  additions[m[1]] = vm.runInNewContext(m[2]);
}
const realms = vm.runInNewContext('(' + source.match(/var REALMS = (\[[\s\S]*?\n  \]);/)[1] + ')');
for (const realm of realms) additions['atlas_realm_' + realm.id] = realm.name;
const inquiries = vm.runInNewContext('(' + source.match(/var INQUIRY_THEMES = (\[[\s\S]*?\n  \]);/)[1] + ')');
for (const inquiry of inquiries) {
  additions['atlas_inquiry_theme_' + inquiry.id] = inquiry.title;
  additions['atlas_inquiry_reflect_' + inquiry.id] = inquiry.reflect;
}
for (const file of ['ui_strings.js', 'desktop/web-app/public/ui_strings.js', 'desktop/web-app/build/ui_strings.js', 'desktop/app-build/ui_strings.js']) {
  if (!fs.existsSync(file)) continue;
  const raw = fs.readFileSync(file, 'utf8');
  const m = /^( +)"scaleExplorer": (\{)/m.exec(raw);
  if (!m) throw new Error('Missing section in ' + file);
  const start = m.index + m[0].length - 1;
  let end = start, depth = 0, quoted = false;
  for (; end < raw.length; end++) {
    const c = raw[end];
    if (quoted) { if (c === '\\') end++; else if (c === '"') quoted = false; continue; }
    if (c === '"') quoted = true;
    else if (c === '{') depth++;
    else if (c === '}' && --depth === 0) break;
  }
  const existing = JSON.parse(raw.slice(start, end + 1));
  const next = JSON.stringify(Object.assign(existing, additions), null, 2).replace(/\n/g, '\n' + m[1]);
  const result = raw.slice(0, start) + next + raw.slice(end + 1);
  JSON.parse(result);
  if (raw !== result) fs.writeFileSync(file, result);
}
fs.copyFileSync('stem_lab/stem_tool_scaleexplorer.js', 'desktop/web-app/public/stem_lab/stem_tool_scaleexplorer.js');
console.log('Synchronized Scale Explorer and ' + Object.keys(additions).length + ' atlas strings.');
