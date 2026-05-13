const fs = require('fs');
const path = require('path');
const dir = path.join(__dirname, 'stem_lab');
const files = fs.readdirSync(dir).filter(f => f.endsWith('.js'));
const results = [];

files.forEach(file => {
  const content = fs.readFileSync(path.join(dir, file), 'utf-8');
  const lines = content.split('\n');
  lines.forEach((line, idx) => {
    const re = /"aria-label":\s*"(Action|Function|Button|Toggle)"/g;
    let m;
    while ((m = re.exec(line)) !== null) {
      // Look for the visible button text - scan forward from the match
      const after = line.substring(m.index);
      // Try to find: }, "ButtonText") or }, emoji + " text")
      let btnText = '?';
      
      // Pattern 1: }, "literal text")
      const p1 = after.match(/}\s*,\s*"([^"]{1,60})"\s*\)/);
      if (p1) btnText = p1[1];
      
      // Pattern 2: }, variable + " text")  
      if (btnText === '?') {
        const p2 = after.match(/}\s*,\s*([^\)]{1,40})\)/);
        if (p2) btnText = p2[1].trim().substring(0,50);
      }
      
      // Also look at next few lines for the text
      if (btnText === '?') {
        for (let i = 1; i <= 5 && idx + i < lines.length; i++) {
          const nl = lines[idx + i].trim();
          const p3 = nl.match(/^"([^"]{1,60})"\s*\)/);
          const p4 = nl.match(/^},\s*"([^"]{1,60})"\s*\)/);
          if (p3) { btnText = p3[1]; break; }
          if (p4) { btnText = p4[1]; break; }
        }
      }
      
      results.push({ file, line: idx + 1, label: m[1], text: btnText });
    }
  });
});

// Output as simple TSV
console.log('FILE\tLINE\tLABEL\tBUTTON_TEXT');
results.forEach(r => console.log(`${r.file}\t${r.line}\t${r.label}\t${r.text}`));
console.log(`\nTotal: ${results.length}`);
