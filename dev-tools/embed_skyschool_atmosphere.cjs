'use strict';
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm'), crypto = require('node:crypto');
const root = path.resolve(__dirname, '..');
const files = ['stem_lab/stem_tool_flightsim.js', 'desktop/web-app/public/stem_lab/stem_tool_flightsim.js'].map(file => path.join(root, file));
const source = fs.readFileSync(files[0], 'utf8');
const start = '  // BEGIN GENERATED ATMOSPHERE', end = '  // END GENERATED ATMOSPHERE';
const helpers = ['skyschool-atmosphere.js', 'skyschool-clouds.js', 'skyschool-sky-life.js', 'skyschool-celestial.js', 'skyschool-water-reflection.js', 'skyschool-canvas-atmosphere.js', 'skyschool-precipitation.js'];
const block = start + '\n' + helpers.map(file => fs.readFileSync(path.join(__dirname, file), 'utf8').trimEnd().replace(/\r\n/g, '\n')).join('\n\n') + '\n' + end + '\n\n';
const first = source.indexOf(start), last = source.indexOf(end);
let next;
if (first < 0 && last < 0) {
  const marker = '  // Shared directional relief lighting for both renderers.';
  if (source.split(marker).length !== 2) throw Error('Missing unique atmosphere insertion point');
  next = source.replace(marker, () => block + marker);
} else {
  if (first < 0 || last < first || source.indexOf(start, first + 1) >= 0 || source.indexOf(end, last + 1) >= 0) throw Error('Invalid atmosphere markers');
  next = source.slice(0, first) + block + source.slice(last + end.length).replace(/^\r?\n\r?\n/, '');
}
new vm.Script(next);
if (process.argv.includes('--check')) {
  if (next !== source || files.some(file => fs.readFileSync(file, 'utf8') !== next)) throw Error('Atmosphere embed or simulator mirror differs');
} else {
  for (const file of files) {
    const temporary = file + '.atmosphere-stage';
    fs.writeFileSync(temporary, next);
    if (process.platform === 'win32') require('node:child_process').execFileSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command',
      "Move-Item -LiteralPath '" + temporary.replace(/'/g, "''") + "' -Destination '" + file.replace(/'/g, "''") + "' -Force"], { windowsHide: true });
    else fs.renameSync(temporary, file);
  }
}
console.log(JSON.stringify({ status: 'verified', bytes: Buffer.byteLength(next), sha256: crypto.createHash('sha256').update(next).digest('hex') }));
