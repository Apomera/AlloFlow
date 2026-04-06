const fs = require('fs');
const c = fs.readFileSync('stem_lab/stem_tool_behaviorlab.js', 'utf-8');
const lines = c.split('\n');

// Check line 62 for em dash encoding
const l62 = lines[61] || '';
const idx62 = l62.indexOf('Aliases');
if (idx62 >= 0) {
  const section = l62.substring(idx62, idx62 + 20);
  const chars = [...section].map(ch => 'U+' + ch.charCodeAt(0).toString(16).padStart(4, '0'));
  console.log('Line 62:', JSON.stringify(section));
  console.log('Codes:', chars.join(' '));
}

// Check line 762 for arrow encoding
const l762 = lines[761] || '';
const idx762 = l762.indexOf('turnLeft');
if (idx762 >= 0) {
  const section = l762.substring(idx762, idx762 + 80);
  console.log('Line 762:', JSON.stringify(section));
}

// Check line 225 for food emoji
const l225 = lines[224] || '';
console.log('Line 225:', JSON.stringify(l225.substring(0, 120)));

// Count all remaining non-ASCII sequences
let badCount = 0;
const badLines = [];
lines.forEach((line, i) => {
  const matches = line.match(/[\u00c0-\u00ff]{2,}/g);
  if (matches) {
    badCount += matches.length;
    if (badLines.length < 10) badLines.push({ line: i + 1, sample: matches[0], context: line.substring(line.indexOf(matches[0]) - 10, line.indexOf(matches[0]) + 30) });
  }
});
console.log('\nRemaining high-byte sequences:', badCount);
badLines.forEach(b => console.log('  Line', b.line, ':', JSON.stringify(b.context)));
