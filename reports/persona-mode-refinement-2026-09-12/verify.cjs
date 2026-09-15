const fs = require('node:fs');
const crypto = require('node:crypto');
const parser = require('@babel/parser');
for (const name of ['personas', 'view_persona_chat', 'view_persona_workspace']) {
  parser.parse(fs.readFileSync(name + '_source.jsx', 'utf8'), { sourceType: 'script', plugins: ['jsx'] });
  const file = name + '_module.js', root = fs.readFileSync(file);
  if (!root.equals(fs.readFileSync('desktop/web-app/public/' + file))) throw Error('Bundle mirror mismatch: ' + name);
  const hash = crypto.createHash('sha256').update(root).digest('hex').slice(0, 10);
  if (!fs.readFileSync('AlloFlowANTI.txt', 'utf8').includes('https://alloflow-cdn.pages.dev/' + file + '?v=' + hash)) throw Error('Stale canonical module version: ' + name);
  for (const host of ['desktop/web-app/src/App.jsx', 'desktop/web-app/src/AlloFlowANTI.txt']) {
    if (!fs.readFileSync(host, 'utf8').includes("'./" + file + "'")) throw Error('Desktop local loader missing: ' + name);
  }
  console.log('Verified source, mirrors, and loaders: ' + name);
}
if (!fs.readFileSync('ui_strings.js').equals(fs.readFileSync('desktop/web-app/public/ui_strings.js'))) throw Error('English UI strings differ');
console.log('Verified English UI string mirrors.');
