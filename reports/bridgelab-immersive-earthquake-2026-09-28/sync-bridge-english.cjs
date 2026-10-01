const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..', '..');
const source = fs.readFileSync(path.join(root, 'stem_lab', 'stem_tool_bridgelab.js'), 'utf8');
const calls = /__alloT\(\s*("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*')\s*,\s*("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*')\s*\)/g;
const entries = new Map();
for (const match of source.matchAll(calls)) {
  const key = vm.runInNewContext(match[1]);
  const value = vm.runInNewContext(match[2]);
  if (!key.startsWith('stem.bridgelab.')) continue;
  const leaf = key.slice('stem.bridgelab.'.length);
  if (entries.has(leaf) && entries.get(leaf) !== value) throw new Error(`Conflicting fallback: ${key}`);
  entries.set(leaf, value);
}

function section(raw) {
  const start = /^([ \t]*)"bridgelab"\s*:\s*\{/m.exec(raw);
  if (!start) throw new Error('Bridge Lab English object not found');
  const open = start.index + start[0].lastIndexOf('{');
  let depth = 1, quoted = false, escaped = false;
  for (let index = open + 1; index < raw.length; index++) {
    const character = raw[index];
    if (quoted) {
      if (escaped) escaped = false;
      else if (character === '\\') escaped = true;
      else if (character === '"') quoted = false;
    } else if (character === '"') quoted = true;
    else if (character === '{') depth++;
    else if (character === '}' && --depth === 0) return { open, close: index, indent: start[1] + '  ' };
  }
  throw new Error('Bridge Lab English object is incomplete');
}

const reports = [];
for (const relative of ['ui_strings.js', 'desktop/web-app/public/ui_strings.js']) {
  const file = path.join(root, relative);
  const raw = fs.readFileSync(file, 'utf8');
  const before = JSON.parse(raw.replace(/^\uFEFF/, ''));
  const bridge = before.stem.bridgelab;
  const missing = [...entries].filter(([key]) => !Object.prototype.hasOwnProperty.call(bridge, key));
  const changed = [...entries].filter(([key, value]) => Object.prototype.hasOwnProperty.call(bridge, key) && bridge[key] !== value);
  const location = section(raw);
  const newline = raw.includes('\r\n') ? '\r\n' : '\n';
  let body = raw.slice(location.open + 1, location.close);
  for (const [key, value] of changed) {
    const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const pattern = new RegExp('(^[ \\t]*"' + escapedKey + '"\\s*:\\s*)"(?:\\\\.|[^"\\\\])*"', 'm');
    if (!pattern.test(body)) throw new Error(`Cannot safely update ${key}`);
    body = body.replace(pattern, (_, prefix) => prefix + JSON.stringify(value));
  }
  if (missing.length) {
    const end = body.trimEnd().length;
    body = body.slice(0, end) + ',' + newline + missing.sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => location.indent + JSON.stringify(key) + ': ' + JSON.stringify(value)).join(',' + newline) + body.slice(end);
  }
  const output = raw.slice(0, location.open + 1) + body + raw.slice(location.close);
  const after = JSON.parse(output.replace(/^\uFEFF/, ''));
  for (const [key, value] of entries) if (after.stem.bridgelab[key] !== value) throw new Error(`Fallback mismatch: ${key}`);
  const restored = JSON.parse(JSON.stringify(after));
  for (const [key] of missing) delete restored.stem.bridgelab[key];
  for (const [key] of changed) restored.stem.bridgelab[key] = before.stem.bridgelab[key];
  if (JSON.stringify(restored) !== JSON.stringify(before)) throw new Error('An unrelated registry entry changed');
  if (process.argv.includes('--apply') && output !== raw) fs.writeFileSync(file, output, 'utf8');
  reports.push({ file: relative, added: missing.length, refreshed: changed.length,
    addedKeys: missing.map(([key]) => key), refreshedKeys: changed.map(([key]) => key) });
}
console.log(JSON.stringify({ apply: process.argv.includes('--apply'), literalKeys: entries.size, files: reports }, null, 2));
