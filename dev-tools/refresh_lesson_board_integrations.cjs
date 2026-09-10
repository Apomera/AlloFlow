const fs = require('fs'), { createHash } = require('crypto'), parser = require('@babel/parser'), traverse = require('@babel/traverse').default;
const write = (file, value) => {
  for (let attempt = 0; attempt < 5; attempt++) {
    try { fs.writeFileSync(file + '.board-tmp', value); fs.renameSync(file + '.board-tmp', file); return; }
    catch (error) { if (attempt === 4) throw error; Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 250); }
  }
};
const modules = ['lesson_board_module.js', 'teacher_module.js', 'view_quiz_module.js', 'mailbox_script_source_module.js', 'view_share_session_surfaces_module.js'];
const hashes = Object.fromEntries(modules.map(file => [file, createHash('sha256').update(fs.readFileSync(file)).digest('hex').slice(0, 10)]));
for (const file of modules) if (!fs.readFileSync(file).equals(fs.readFileSync('desktop/web-app/public/' + file))) throw Error('Module mirror differs: ' + file);
const gs = fs.readFileSync('apps_script/session_mailbox/Code.gs'), version = Number(gs.toString().match(/var VERSION = (\d+);/)[1]), sha = createHash('sha256').update(gs).digest('hex');
for (const file of ['AlloFlowANTI.txt', 'desktop/web-app/src/AlloFlowANTI.txt', 'desktop/web-app/src/App.jsx']) {
  let source = fs.readFileSync(file, 'utf8');
  for (const [module, hash] of Object.entries(hashes)) source = source.replace(new RegExp(module.replaceAll('.', '\\.') + '\\?v=[a-zA-Z0-9_-]+', 'g'), () => module + '?v=' + hash);
  source = source.replace(/const ALLO_MB_SCRIPT_VERSION = \d+;/, () => 'const ALLO_MB_SCRIPT_VERSION = ' + version + ';')
    .replace(/const ALLO_MB_SCRIPT_SHA256 = '[a-f0-9]+';/, () => "const ALLO_MB_SCRIPT_SHA256 = '" + sha + "';")
    .replace(/const ALLO_MB_SCRIPT_BYTES = \d+;/, () => 'const ALLO_MB_SCRIPT_BYTES = ' + gs.length + ';');
  write(file, source);
}
const strings = JSON.parse(fs.readFileSync('ui_strings.js', 'utf8'));
strings.lesson_board = strings.lesson_board || {};
for (const file of ['lesson_board_ui.jsx', 'lesson_board_source.jsx', 'lesson_board_review.jsx', 'lesson_board_authoring.jsx', 'lesson_board_library.jsx']) {
  traverse(parser.parse(fs.readFileSync(file, 'utf8'), { sourceType: 'module', plugins: ['jsx'] }), {
    CallExpression({ node }) {
      if (node.callee.name === 'tr' && node.arguments[1]?.type === 'StringLiteral' && node.arguments[2]?.type === 'StringLiteral') strings.lesson_board[node.arguments[1].value] = node.arguments[2].value;
    },
  });
}
for (const file of ['ui_strings.js', 'desktop/web-app/public/ui_strings.js']) write(file, JSON.stringify(strings, null, 2) + '\n');
console.log(JSON.stringify({ hashes, mailboxVersion: version, strings: Object.keys(strings.lesson_board).length }));
