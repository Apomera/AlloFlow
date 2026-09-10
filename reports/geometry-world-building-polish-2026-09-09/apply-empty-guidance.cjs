const fs = require('fs');
const vm = require('vm');
const paths = ['stem_lab/stem_tool_geometryworld_builder.js', 'desktop/web-app/public/stem_lab/stem_tool_geometryworld_builder.js'];
const original = fs.readFileSync(paths[0], 'utf8');
let source = original.replace(/\r\n/g, '\n');
function replace(before, after) {
  if (source.split(before).length !== 2) throw new Error('Expected one guidance anchor: ' + before.slice(0, 100));
  source = source.replace(before, after);
}
replace('  function startSandboxMode(ctx) {', `  function firstBlockGuidance(touchActive) {
    return 'Aim at the ground and ' + (touchActive ? 'tap Place' : 'press B') + ' to add your first block.';
  }
  function startSandboxMode(ctx) {`);
replace("    announce(ctx, 'Free Build Sandbox opened. Aim at the ground and place blocks to begin.', 'success');", `    var workspace = typeof document !== 'undefined' && document.getElementById('geoworld-fs-workspace');
    announce(ctx, 'Free Build Sandbox opened. ' + firstBlockGuidance(!!(workspace && workspace.getAttribute('data-touch-active') === 'true')), 'success');`);
replace("      var _editableBusy = React.useState(false), editableBusy = _editableBusy[0], setEditableBusy = _editableBusy[1];", `      var _editableBusy = React.useState(false), editableBusy = _editableBusy[0], setEditableBusy = _editableBusy[1];
      var _hasStudentBuild = React.useState(null), hasStudentBuild = _hasStudentBuild[0], setHasStudentBuild = _hasStudentBuild[1];`);
replace("        function measurementKeys(measurement){return measurement && Array.isArray(measurement.blocks)?measurement.blocks.map(keyFor).sort().join('|'):'';}", `        var previousStudentPresence = null;
        function measurementKeys(measurement){return measurement && Array.isArray(measurement.blocks)?measurement.blocks.map(keyFor).sort().join('|'):'';}`);
replace("        function refresh(){\n          var eng=window[ENGINE_KEY];", `        function refresh(){
          var eng=window[ENGINE_KEY];
          // Reuse this refresh and the engine's cached array. Lifetime placement
          // totals cannot identify an empty build after Undo, Break or Clear.
          var guidanceData = (liveBuilderCtx.current.toolData || {}).geometryWorld || {};
          var studentPresence = guidanceData.activeLesson === 'builderSandbox' && guidanceData.worldActive && eng && typeof eng.getBlocksArr === 'function'
            ? eng.getBlocksArr().some(function(mesh) { return isStudentBlock(mesh && mesh.userData); }) : null;
          if (studentPresence !== previousStudentPresence) {
            previousStudentPresence = studentPresence;
            setHasStudentBuild(studentPresence);
          }`);
replace("          h('p', { className: 'gwe-builder-intro' }, measuredIsStudentBuild\n            ? 'Your outlined creation stays selected as you look around. Inspect it here, or continue in Print Lab.'\n            : 'Aim at a block you placed, then choose Select build to inspect your creation.'),", `          h('p', { className: 'gwe-builder-intro', 'data-gwe-build-guidance': measuredIsStudentBuild ? 'selected' : hasStudentBuild === false ? 'empty' : 'select' }, measuredIsStudentBuild
            ? 'Your outlined creation stays selected as you look around. Inspect it here, or continue in Print Lab.'
            : hasStudentBuild === false
              ? firstBlockGuidance(base.props['data-touch-active'] === 'true') + ' Then choose Select build to inspect your creation.'
              : 'Aim at a block you placed, then choose Select build to inspect your creation.'),`);
new vm.Script(source, {filename: paths[0]});
const result = original.includes('\r\n') ? source.replace(/\n/g, '\r\n') : source;
for (const path of paths) {
  const fd = fs.openSync(path, 'r+');
  try { fs.writeFileSync(fd, result); fs.ftruncateSync(fd, Buffer.byteLength(result)); } finally { fs.closeSync(fd); }
}
console.log(JSON.stringify({syntax:true,mirrorIdentical:fs.readFileSync(paths[0]).equals(fs.readFileSync(paths[1]))}));
