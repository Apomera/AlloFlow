const fs = require('fs');
const esbuild = require('esbuild');
const bundle = esbuild.buildSync({ entryPoints: ['connected_escape_room_source.jsx'], bundle: true, write: false, format: 'iife', target: 'es2020', jsxFactory: 'React.createElement', jsxFragment: 'React.Fragment', legalComments: 'none' }).outputFiles[0].text;
const output = "(() => { if (window.AlloModules?.ConnectedEscapeRoomModule) return;\n" + bundle + "\n})();\n";
for (const file of ['connected_escape_room_module.js', 'desktop/web-app/public/connected_escape_room_module.js']) {
  fs.writeFileSync(file + '.build-tmp', output);
  fs.renameSync(file + '.build-tmp', file);
}
console.log('Built connected escape room (' + output.length + ' bytes)');
