const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const target = path.join(root, 'stem_lab/stem_tool_sourcebook.js');
let output = fs.readFileSync(target, 'utf8').replace(/\r\n/g, '\n');
for (const name of ["commons-provider","smk-and-source-identity","yale-provider","rijks-provider","public-catalog-providers","catalog-verification","reference-board","palette-history"]) {
  const start = `  // BEGIN SOURCEBOOK HELPER: ${name}`;
  const end = `  // END SOURCEBOOK HELPER: ${name}`;
  const first = output.indexOf(start);
  const last = output.indexOf(end, first);
  if (first < 0 || last < 0) throw new Error(`Missing helper boundary: ${name}`);
  const helper = fs.readFileSync(path.join(__dirname, 'sourcebook', `${name}.js`), 'utf8').replace(/\r\n/g, '\n').trimEnd();
  output = output.slice(0, first) + start + '\n' + helper + '\n' + output.slice(last);
}
const mirror = path.join(root, 'desktop/web-app/public/stem_lab/stem_tool_sourcebook.js');
if (process.argv.includes('--check')) {
  if (fs.readFileSync(target, 'utf8').replace(/\r\n/g, '\n') !== output || !fs.readFileSync(target).equals(fs.readFileSync(mirror))) {
    throw new Error('Sourcebook helper or deployment mirror drift. Run node dev-tools/build_sourcebook_helpers.cjs');
  }
  console.log('Sourcebook helpers and deployment mirror match.');
} else {
  if (fs.readFileSync(target, 'utf8') !== output) fs.writeFileSync(target, output);
  if (fs.readFileSync(mirror, 'utf8') !== output) fs.writeFileSync(mirror, output);
}
