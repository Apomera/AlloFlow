// Focused local demo styling, using the app's Tailwind theme and installed tools.
const fs = require('node:fs');
const path = require('node:path');
const req = require('node:module').createRequire(path.resolve(__dirname, '../desktop/web-app/package.json'));
const config = require('../desktop/web-app/tailwind.config.js');
config.content = ['stem_lab/stem_tool_printlab.js', 'stem_lab/stem_tool_artstudio.js', 'dev-tools/print_lab_review_page.mjs'].map(file => path.resolve(__dirname, '..', file));
config.safelist = [];
const output = path.resolve(__dirname, '../reports/school-store-refinements-2026-09-07/tool-preview.css');
req('postcss')([req('tailwindcss')(config)]).process('@tailwind base;\n@tailwind components;\n@tailwind utilities;', { from: undefined }).then(result => {
  fs.mkdirSync(path.dirname(output), { recursive: true });
  if (fs.existsSync(output)) {
    const fd = fs.openSync(output, 'r+');
    try { fs.writeFileSync(fd, result.css); fs.ftruncateSync(fd, Buffer.byteLength(result.css)); } finally { fs.closeSync(fd); }
  } else fs.writeFileSync(output, result.css);
  console.log('Built local design demo stylesheet:', result.css.length, 'characters');
}).catch(error => { console.error(error.message); process.exitCode = 1; });
