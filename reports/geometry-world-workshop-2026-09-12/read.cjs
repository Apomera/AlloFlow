const fs = require('fs');
const [file, ...ranges] = process.argv.slice(2);
const lines = fs.readFileSync(file, 'utf8').split('\n');
for (const range of ranges.length ? ranges : ['1:160']) {
  const [a, b] = range.split(':').map(Number);
  console.log(lines.slice(a - 1, b || a).map((line, i) => `${a + i}: ${line.length > 800 ? line.slice(0, 800) + '…' : line}`).join('\n'));
}
