// Which STEM tool strings can a translator actually see?
//
// A tool calls __alloT('some.key', 'English fallback'). When the key is absent from a
// language pack the call returns the fallback, so the page renders correctly in every
// language and nothing anywhere reports a problem -- but that string is permanently
// English and no translator is ever shown it. The failure is invisible by construction.
//
// This compares the keys the tools ASK for against the keys the packs CONTAIN, and
// splits the result by whether the string is part of the accessibility layer
// (sr_ = screen-reader announcement, a11y_ = accessibility label) or ordinary visible
// copy, because those two turn out to behave completely differently.
//
// Usage:
//   node dev-tools/stem_i18n_a11y_coverage.cjs [pack ...]      (default: french arabic)
//   node dev-tools/stem_i18n_a11y_coverage.cjs --tool raptorhunt french
const fs = require('fs');
const path = require('path');

function packLeaves(file) {
  const parsed = JSON.parse(fs.readFileSync(file, 'utf8'));
  const leaves = new Set();
  (function walk(node, prefix) {
    for (const key of Object.keys(node)) {
      const value = node[key];
      const next = prefix ? prefix + '.' + key : key;
      if (value && typeof value === 'object') walk(value, next);
      else leaves.add(next);
    }
  }(parsed, ''));
  return leaves;
}

function toolKeys(file) {
  const src = fs.readFileSync(file, 'utf8');
  return [...new Set([...src.matchAll(/__alloT\(\s*'([^']+)'/g)].map((m) => m[1]))];
}

const isAccessibility = (key) => /\.(sr|a11y)_/.test(key);

const args = process.argv.slice(2);
let only = null;
const packs = [];
for (let i = 0; i < args.length; i += 1) {
  if (args[i] === '--tool') { only = args[i + 1]; i += 1; }
  else packs.push(args[i]);
}
if (!packs.length) packs.push('french', 'arabic');

const tools = fs.readdirSync('stem_lab')
  .filter((f) => /^stem_tool_.*\.js$/.test(f))
  .filter((f) => !only || f.includes(only));

packs.forEach((packName) => {
  const packFile = path.join('lang', packName + '.js');
  let leaves;
  try { leaves = packLeaves(packFile); }
  catch (error) { console.log(packName + ': could not read (' + error.message.slice(0, 60) + ')'); return; }

  let a11yTotal = 0, a11yMissing = 0, otherTotal = 0, otherMissing = 0;
  const rows = [];
  tools.forEach((file) => {
    const keys = toolKeys(path.join('stem_lab', file));
    if (!keys.length) return;
    const a11y = keys.filter(isAccessibility);
    const other = keys.filter((k) => !isAccessibility(k));
    const am = a11y.filter((k) => !leaves.has(k)).length;
    const om = other.filter((k) => !leaves.has(k)).length;
    a11yTotal += a11y.length; a11yMissing += am;
    otherTotal += other.length; otherMissing += om;
    if (a11y.length || om) rows.push({ file, a: a11y.length, am, o: other.length, om });
  });

  const pct = (n, d) => (d ? Math.round((n / d) * 100) : 0);
  console.log('=== ' + packName + ' === (' + tools.length + ' tools, ' + leaves.size + ' keys in pack)');
  console.log('  accessibility keys (sr_ / a11y_): ' + a11yTotal + ' asked for, '
    + a11yMissing + ' absent from the pack  (' + pct(a11yMissing, a11yTotal) + '% untranslated)');
  console.log('  every other key:                  ' + otherTotal + ' asked for, '
    + otherMissing + ' absent from the pack  (' + pct(otherMissing, otherTotal) + '% untranslated)');
  if (only || process.env.I18N_LIST) {
    rows.sort((x, y) => y.am - x.am).slice(0, 20).forEach((r) => console.log(
      '    ' + r.file.replace('stem_tool_', '').replace('.js', '').padEnd(22)
      + 'a11y ' + String(r.am).padStart(4) + '/' + String(r.a).padEnd(6)
      + '  other ' + r.om + '/' + r.o));
  }
  console.log('');
});
