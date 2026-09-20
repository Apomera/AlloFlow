const fs = require('fs'), { createHash } = require('crypto'), parser = require('@babel/parser'), traverse = require('@babel/traverse').default;
const write = (file, value) => {
  for (let attempt = 0; attempt < 5; attempt++) {
    try { fs.writeFileSync(file + '.board-tmp', value); fs.renameSync(file + '.board-tmp', file); return; }
    catch (error) { if (attempt === 4) throw error; Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 250); }
  }
};
const boardOnly = process.argv.includes('--board-only') || process.argv.includes('--board-visuals');
const liveOnly = process.argv.includes('--board-live');
const modules = boardOnly ? ['lesson_board_module.js', ...(process.argv.includes('--board-visuals') ? ['view_quiz_module.js'] : [])] : liveOnly ? ['lesson_board_module.js', 'mailbox_script_source_module.js'] : ['lesson_board_module.js', 'teacher_module.js', 'view_quiz_module.js', 'mailbox_script_source_module.js', 'view_share_session_surfaces_module.js'];
const hashes = Object.fromEntries(modules.map(file => [file, createHash('sha256').update(fs.readFileSync(file)).digest('hex').slice(0, 10)]));
for (const file of modules) if (!fs.readFileSync(file).equals(fs.readFileSync('desktop/web-app/public/' + file))) throw Error('Module mirror differs: ' + file);
const gs = fs.readFileSync('apps_script/session_mailbox/Code.gs'), version = Number(gs.toString().match(/var VERSION = (\d+);/)[1]), sha = createHash('sha256').update(gs).digest('hex');
for (const file of ['AlloFlowANTI.txt', 'desktop/web-app/src/AlloFlowANTI.txt', 'desktop/web-app/src/App.jsx']) {
  let source = fs.readFileSync(file, 'utf8');
  for (const [module, hash] of Object.entries(hashes)) source = source.replace(new RegExp(module.replaceAll('.', '\\.') + '\\?v=[a-zA-Z0-9_-]+', 'g'), () => module + '?v=' + hash);
  if (!boardOnly) source = source.replace(/const ALLO_MB_SCRIPT_VERSION = \d+;/, () => 'const ALLO_MB_SCRIPT_VERSION = ' + version + ';')
    .replace(/const ALLO_MB_SCRIPT_SHA256 = '[a-f0-9]+';/, () => "const ALLO_MB_SCRIPT_SHA256 = '" + sha + "';")
    .replace(/const ALLO_MB_SCRIPT_BYTES = \d+;/, () => 'const ALLO_MB_SCRIPT_BYTES = ' + gs.length + ';');
  write(file, source);
}
const fallbacks = {};
const add = (key, value) => { if (fallbacks[key] && fallbacks[key] !== value) throw Error('Conflicting board string: ' + key); fallbacks[key] = value; };
for (const file of ['lesson_board_session_guide.jsx', 'lesson_board_plan_review.jsx', 'lesson_board_map.jsx', 'lesson_board_sandbox_ui.jsx', 'lesson_board_ui.jsx', 'lesson_board_source.jsx', 'lesson_board_review.jsx', 'lesson_board_authoring.jsx', 'lesson_board_library.jsx', 'lesson_board_setup.jsx', 'lesson_board_play_extras.jsx', 'lesson_board_followthrough.jsx', 'lesson_board_roles.js', 'lesson_board_strategy_ui.jsx', 'lesson_board_support_ui.jsx', 'lesson_board_visual_ui.jsx', 'lesson_board_guide_ui.jsx', 'lesson_board_image.jsx', 'lesson_board_finale_ui.jsx', 'lesson_board_replay_ui.jsx', 'lesson_board_world_ui.jsx', 'lesson_board_sharing.js', 'lesson_board_sharing_ui.jsx']) {
  traverse(parser.parse(fs.readFileSync(file, 'utf8'), { sourceType: 'module', plugins: ['jsx'] }), {
    CallExpression({ node }) {
      if (node.callee.name === 'tr' && node.arguments[1]?.type === 'StringLiteral' && node.arguments[2]?.type === 'StringLiteral') add(node.arguments[1].value, node.arguments[2].value);
    },
    ObjectExpression({node}) {
      const fields = Object.fromEntries(node.properties.filter(p => p.type === 'ObjectProperty' && p.key.type === 'Identifier' && p.value.type === 'StringLiteral').map(p => [p.key.name, p.value.value]));
      if (fields.key && fields.label) add(fields.key, fields.label);
      if (fields.helpKey && fields.help) add(fields.helpKey, fields.help);
      if (fields.descriptionKey && fields.description) add(fields.descriptionKey, fields.description);
    },
    ArrayExpression({node}) {
      const values = node.elements.map(item => item?.type === 'StringLiteral' ? item.value : null);
      if (['choose_mission_step','create_inspect_step','explore_build_step'].includes(values[0])) add(values[0], values[1]);
      if (['blueprint_choice','blueprint_order','blueprint_settings'].includes(values[1])) add(values[1], values[2]);
    }
  });
}
for (const file of ['ui_strings.js', 'desktop/web-app/public/ui_strings.js']) {
  const strings = JSON.parse(fs.readFileSync(file, 'utf8'));
  strings.lesson_board = { ...strings.lesson_board, ...fallbacks };
  write(file, JSON.stringify(strings, null, 2) + '\n');
}
console.log(JSON.stringify({ hashes, ...(boardOnly ? {} : {mailboxVersion: version}), strings: Object.keys(fallbacks).length }));
