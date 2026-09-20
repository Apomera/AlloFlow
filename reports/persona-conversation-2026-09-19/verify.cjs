const fs = require('node:fs');
const crypto = require('node:crypto');
const parser = require('@babel/parser');
const moduleFile = 'view_persona_chat_module.js';
const data = fs.readFileSync(moduleFile);
parser.parse(fs.readFileSync('view_persona_chat_source.jsx', 'utf8'), { sourceType: 'script', plugins: ['jsx'] });
parser.parse(data.toString(), { sourceType: 'script' });
if (!data.equals(fs.readFileSync('desktop/web-app/public/' + moduleFile))) throw Error('Chat module mirrors differ');
const hash = crypto.createHash('sha256').update(data).digest('hex').slice(0, 10);
for (const file of ['AlloFlowANTI.txt', 'desktop/web-app/src/App.jsx', 'desktop/web-app/src/AlloFlowANTI.txt']) {
  let source = fs.readFileSync(file, 'utf8');
  if (process.argv.includes('--refresh')) {
    const updated = source.replace(/https:\/\/alloflow-cdn\.pages\.dev\/view_persona_chat_module\.js\?v=[a-zA-Z0-9.-]+/g, 'https://alloflow-cdn.pages.dev/' + moduleFile + '?v=' + hash);
    if (updated !== source) fs.writeFileSync(file, updated);
    source = updated;
  }
  if (!source.includes("'./" + moduleFile + "'") && !source.includes('https://alloflow-cdn.pages.dev/' + moduleFile + '?v=' + hash)) throw Error('Stale chat loader: ' + file);
}
const strings = fs.readFileSync('ui_strings.js');
if (!strings.equals(fs.readFileSync('desktop/web-app/public/ui_strings.js'))) throw Error('English strings mirrors differ');
const navigation = JSON.parse(strings).persona.navigation;
for (const key of ['latest', 'new_reply', 'new_reply_announcement', 'archive_retry']) if (!navigation[key]) throw Error('Missing string: ' + key);
console.log('Verified JSX and bundle syntax, matching chat module and English string mirrors, and current chat loaders (' + hash + ').');
