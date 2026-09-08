const fs = require('node:fs');
const path = 'stem_lab/stem_tool_geometryworld.js';
let source = fs.readFileSync(path, 'utf8');
const marker = '      function beginMobileJump() {';
if (source.includes('function finishMobileButtonTouch()')) throw new Error('Touch release handler already applied');
if (!source.includes(marker)) throw new Error('Missing touch action helper marker');
source = source.replace(marker, `      // A long press may synthesize click after the original touchstart guard
      // expires. Keep the guard anchored to release as well as first contact.
      function finishMobileButtonTouch() {
        if (engine && engine._lastTouchAction) engine._lastTouchAction.at = Date.now();
      }

${marker}`);
const group = "className: 'gw-touch-actions', role: 'group',";
if (!source.includes(group)) throw new Error('Missing touch action group');
source = source.replace(group, "className: 'gw-touch-actions', onTouchEnd: finishMobileButtonTouch, onTouchCancel: finishMobileButtonTouch, role: 'group',");
new Function(source);
for (const output of [path, 'desktop/web-app/public/' + path]) {
  const fd = fs.openSync(output, 'r+');
  try { fs.writeFileSync(fd, source); fs.ftruncateSync(fd, Buffer.byteLength(source)); }
  finally { fs.closeSync(fd); }
}
console.log('Long touch release guard applied; source and mirror match.');
