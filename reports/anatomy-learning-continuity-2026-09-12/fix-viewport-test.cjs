const fs=require('node:fs');const file='reports/anatomy-learning-continuity-2026-09-12/final-browser.cjs';let s=fs.readFileSync(file,'utf8');
const old='result.resultRect.top>=0&&result.resultRect.bottom<=844';if(!s.includes(old))throw Error('Viewport assertion missing');
// Chromium layout uses fractional CSS pixels. Allow one rounding pixel at the edge.
s=s.replace(old,'result.resultRect.top>=-1&&result.resultRect.bottom<=845');fs.writeFileSync(file,s);
