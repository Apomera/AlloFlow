const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto');
const report = 'C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/dissection-replay-review-2026-10-09';
const browserRun = 'browser-7';
const names = ['desktop-motion', 'phone-reduced', 'phone-forced-colors', 'embedded-large-contrast'];
const inspected = [];
for (const name of names) {
  for (const kind of ['controls', 'canvas']) {
    const file = browserRun + '/captures/' + name + '-' + kind + '.png';
    const bytes = fs.readFileSync(path.join(report, file));
    inspected.push({ file, sha256: crypto.createHash('sha256').update(bytes).digest('hex') });
  }
}
const result = { at: new Date().toISOString(), browserRun, inspector: 'Codex', method: 'Direct visual inspection of all eight final native Chromium PNG captures using view_image.', inspected,
  observations: ['Action number and playback state are readable in all four control panels.', 'Buttons wrap into two columns on narrow and embedded views without clipping text.', 'Focused Next action retains a visible ring in normal, high-contrast, and forced-color panels.', 'Canvas replay evidence labels wrap within the shown specimen in every captured layout.', 'High contrast retains a black caption with contrasting saved-path and pressure text.'],
  limits: 'Captures show paused action 2 with the saved path. Browser assertions additionally check first/last actions, pressure-not-recorded wording, native focus and cancellation. Screenshots and scoped axe do not establish whole-app or screen-reader accessibility.' };
fs.writeFileSync(path.join(report, 'visual-review.json'), JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify({ inspected: inspected.length, browserRun }));
