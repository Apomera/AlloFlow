const fs = require('node:fs'), assert = require('node:assert/strict');
function edit(file, change, syntax) {
  const raw = fs.readFileSync(file, 'utf8');
  let source = change(raw.replace(/\r\n/g, '\n'));
  if (syntax) new Function(source);
  const data = Buffer.from(raw.includes('\r\n') ? source.replace(/\n/g, '\r\n') : source);
  const fd = fs.openSync(file, 'r+');
  try { fs.writeSync(fd, data); fs.ftruncateSync(fd, data.length); } finally { fs.closeSync(fd); }
}
function once(source, before, after) {
  assert.equal(source.split(before).length, 2, before.slice(0, 90));
  return source.replace(before, after);
}
edit('stem_lab/stem_tool_geometryworld.js', source => {
  source = once(source, "        worldActive && !d.showcaseActive && openModals.length === 0 && d.placementHint && el('div', {", "        el('div',{className:'gw-feedback-stack'},\n        worldActive && !d.showcaseActive && openModals.length === 0 && d.placementHint && el('div', {");
  source = once(source, "        }, actionFeedback),\n        // ── Measurement history panel", "        }, actionFeedback)\n        ),\n        // ── Measurement history panel");
  const css = '.gw-feedback-stack{display:contents}@media(min-width:801px) and (min-height:521px){#geoworld-fs-workspace .gw-feedback-stack{position:absolute;bottom:186px;left:50%;transform:translateX(-50%);z-index:30;display:flex;flex-direction:column;align-items:center;gap:8px;width:max-content;max-width:min(680px,calc(100% - 36px));pointer-events:none}#geoworld-fs-workspace .gw-feedback-stack>.gw-placement-hint,#geoworld-fs-workspace .gw-feedback-stack>.gw-action-feedback{position:relative!important;top:auto!important;bottom:auto!important;left:auto!important;right:auto!important;transform:none!important;margin:0;max-width:100%!important}}';
  const start = source.indexOf('      ".gw-placement-hint[data-placement-state=');
  assert(start > 0);
  const end = source.indexOf('\n', start);
  return source.slice(0, end) + '\n      ' + JSON.stringify(css) + ',' + source.slice(end);
}, true);
edit('tests/geometry_world_keyboard_access.test.js', source => {
  source = once(source, "el('header', { className: 'gw-toolbar', 'aria-label': __alloT('stem.geometryworld.a11y_geometry_world_lesson_controls', 'Geometry World lesson controls')", "el('header', { className: 'gw-toolbar', 'aria-label': currentLesson.sandbox ? 'Geometry World building tools' : __alloT('stem.geometryworld.a11y_geometry_world_lesson_controls', 'Geometry World lesson controls')");
  return once(source, "className: 'gw-status-cluster', 'aria-label': __alloT('stem.geometryworld.a11y_lesson_status_and_game_menu', 'Lesson status and game menu')", "className: 'gw-status-cluster', 'aria-label': currentLesson.sandbox ? 'Build status and tools' : __alloT('stem.geometryworld.a11y_lesson_status_and_game_menu', 'Lesson status and game menu')");
});
console.log('Stacked desktop feedback and updated contextual-toolbar assertions.');
