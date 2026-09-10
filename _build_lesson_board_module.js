const fs = require('fs'), esbuild = require('esbuild');
const bundle = esbuild.buildSync({ entryPoints: ['lesson_board_source.jsx'], bundle: true, write: false, format: 'iife', target: 'es2020', jsxFactory: 'React.createElement', jsxFragment: 'React.Fragment', legalComments: 'none' }).outputFiles[0].text;
const output = '(() => { if (window.AlloModules?.LessonBoardModule) return;\n' + bundle + '\n})();\n';
for (const file of ['lesson_board_module.js', 'desktop/web-app/public/lesson_board_module.js']) { fs.writeFileSync(file + '.build-tmp', output); fs.renameSync(file + '.build-tmp', file); }
console.log('Built lesson board (' + output.length + ' bytes)');
