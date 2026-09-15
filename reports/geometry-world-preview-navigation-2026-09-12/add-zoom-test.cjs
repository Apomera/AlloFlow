const fs=require('node:fs');
const script=fs.readFileSync('reports/geometry-world-preview-navigation-2026-09-12/stabilize-zoom.cjs','utf8');
const header=script.slice(0,script.indexOf("edit('stem_lab/"));
const test=script.slice(script.indexOf("edit('tests/"),script.indexOf("console.log('Preview zoom"));
eval(header+test.replaceAll("  it('"," it('"));
console.log('Added zoom stability regression.');
