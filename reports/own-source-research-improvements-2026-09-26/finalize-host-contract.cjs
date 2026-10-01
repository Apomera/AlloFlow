// Update only research-owned loader pins and the host's derived dependency list.
const fs = require('fs');
const crypto = require('crypto');
const original = fs.readFileSync('AlloFlowANTI.txt', 'utf8');
let host = original;
for (const name of ['useOwnSources', 'selectedOwnSourceIds', 'documentsOnly']) {
  host = host.replace('get ' + name + '() { return ' + name + '; }, ', '');
}
const modules = ['own_sources_module.js', 'content_engine_module.js', 'quickstart_module.js', 'view_misc_panels_module.js', 'view_sidebar_panels_module.js', 'phase_o_misc_handlers_module.js', 'phase_n_misc_helpers_module.js', 'host_handlers_module.js', 'generate_dispatcher_module.js', 'view_simplified_module.js'];
const pins = {};
for (const file of modules) {
  const hash = crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex').slice(0, 8);
  const pattern = new RegExp(file.replace(/\./g, '\\.') + '\\?v=[a-f0-9]+', 'g');
  const matches = host.match(pattern);
  if (!matches || !matches.length) throw new Error('No loader pin for ' + file);
  host = host.replace(pattern, file + '?v=' + hash);
  pins[file] = hash;
}
const mirrors = ['desktop/web-app/src/AlloFlowANTI.txt', 'desktop/web-app/src/App.jsx'];
for (const file of mirrors) if (fs.readFileSync(file, 'utf8') !== original) throw new Error('Independent mirror change: ' + file);
const source = fs.readFileSync('host_handlers_source.jsx', 'utf8').replace(/^\s*\/\/.*$/gm, '');
const manifestPath = 'dev-tools/host_handlers_wave3_manifest.json';
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
manifest.deps = [...new Set([...source.matchAll(/__d\.([A-Za-z_$][\w$]*)/g)].map(match => match[1]))].sort();
if (process.argv.includes('--patch')) {
  const { structuredPatch } = require('diff');
  let patch = '*** Begin Patch\n';
  const change = (file, before, after) => {
    const diff = structuredPatch(file, file, before.replace(/\r\n/g, '\n'), after.replace(/\r\n/g, '\n'), '', '', { context: 3 });
    if (!diff.hunks.length) return;
    patch += '*** Update File: ' + file + '\n';
    for (const hunk of diff.hunks) patch += '@@\n' + hunk.lines.filter(line => !line.startsWith('\\ No newline')).join('\n') + '\n';
  };
  for (const file of ['AlloFlowANTI.txt', ...mirrors]) change(file, original, host);
  change(manifestPath, fs.readFileSync(manifestPath, 'utf8'), JSON.stringify(manifest, null, 2) + '\n');
  patch += '*** End Patch\n';
  process.stdout.write(patch);
  process.exit(0);
}
fs.writeFileSync('AlloFlowANTI.txt', host);
for (const file of mirrors) fs.writeFileSync(file, host);
fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
fs.writeFileSync(__dirname + '/loader-pins.json', JSON.stringify(pins, null, 2) + '\n');
console.log('Updated research loader pins, three matching hosts, and derived host dependencies.');
