const fs = require('fs');
let c = fs.readFileSync('stem_tool_science.js', 'utf8');

// Fix the wavelength annotation on the canvas (uses 1/freq instead of speed/freq)
const old = "ctx.fillText('\\u03BB = ' + (1 / freq).toFixed(2) + ' m'";
const rep = "var canvasWL = parseFloat(canvasEl.dataset.waveSpeed || '343') / freq; ctx.fillText('\\u03BB = ' + canvasWL.toFixed(1) + ' m'";

if (c.includes(old)) {
  c = c.replace(old, rep);
  fs.writeFileSync('stem_tool_science.js', c);
  console.log('Fixed wavelength annotation');
} else {
  console.log('Pattern not found, dumping nearby text...');
  const idx = c.indexOf('toFixed(2)');
  if (idx > -1) console.log(c.substring(idx - 100, idx + 50));
}
