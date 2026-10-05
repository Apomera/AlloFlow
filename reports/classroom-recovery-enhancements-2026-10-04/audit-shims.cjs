const fs = require('node:fs');
const host = fs.readFileSync('AlloFlowANTI.txt', 'utf8');
const manifest = JSON.parse(fs.readFileSync('dev-tools/host_handlers_wave3_manifest.json'));
const hooked = new Set(manifest.useCallbackHandlers || []);
const failures = [];
for (const name of manifest.handlers) {
  const shim = hooked.has(name)
    ? new RegExp(`const ${name} = (React\\.)?useCallback\\((async )?\\(\\.\\.\\.__a\\) => _alloHostHandlers\\(\\)\\.${name}\\(\\.\\.\\.__a\\)(, \\[[\\s\\S]*?\\])?\\);`)
    : new RegExp(`(const ${name} = (async )?\\(\\.\\.\\.__a\\) => _alloHostHandlers\\(\\)\\.${name}\\(\\.\\.\\.__a\\);|function ${name}\\(\\.\\.\\.__a\\) \\{ return _alloHostHandlers\\(\\)\\.${name}\\(\\.\\.\\.__a\\); \\}|const ${name} = \\(\\.\\.\\.__a\\) => \\{\\s*const handlers = _alloHostHandlersOptional\\(\\);\\s*return handlers \\? handlers\\.${name}\\(\\.\\.\\.__a\\) : undefined;\\s*\\};)`);
  if (!shim.test(host)) failures.push({ name, source: host.split('\n').filter(line => line.includes('const ' + name + ' =')).map(line => line.slice(0, 220)) });
}
fs.writeFileSync(__dirname + '/all-shim-audit.json', JSON.stringify({ completedAt: new Date().toISOString(), failures }, null, 2) + '\n');
console.log(JSON.stringify({ failures }));
