const fs = require('node:fs');
const parser = require('@babel/parser');
for (const file of ['AlloFlowANTI.txt', 'desktop/web-app/src/AlloFlowANTI.txt', 'desktop/web-app/src/App.jsx']) {
 const s = fs.readFileSync(file, 'utf8');
 parser.parse(s, { sourceType: 'unambiguous', plugins: ['jsx'] });
 if (!s.includes('getAdventureState: () => adventureImageStateRef.current')) throw new Error('Missing live image binding: ' + file);
 console.log('Parsed and verified image binding: ' + file);
}
for (const name of ['adventure_handlers', 'adventure_session_handlers']) {
 const a = fs.readFileSync(name + '_module.js');
 const b = fs.readFileSync('desktop/web-app/public/' + name + '_module.js');
 if (!a.equals(b)) throw new Error('Bundle mismatch: ' + name);
 console.log('Bundle mirror matches: ' + name);
}
