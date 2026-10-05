const fs = require('node:fs');
const path = require('node:path');
const results = JSON.parse(fs.readFileSync(path.join(__dirname, 'browser-qa-results.json'), 'utf8'));
const screenshots = results.screenshots.map(file => {
  const image = fs.readFileSync(file);
  return { file: path.basename(file), width: image.readUInt32BE(16), height: image.readUInt32BE(20) };
});
const summary = { finished: results.finished, passed: results.checks.filter(item => item.pass).length, total: results.checks.length, errors: results.errors, screenshots,
  radar: results.checks.filter(item => item.detail?.radarCssWidth).map(item => ({ check: item.name, ...item.detail })),
  measured: results.checks.find(item => /real touchdown/.test(item.name))?.detail };
fs.writeFileSync(path.join(__dirname, 'screenshot-dimensions.json'), JSON.stringify(summary, null, 2) + '\n');
console.log(JSON.stringify(summary, null, 2));
