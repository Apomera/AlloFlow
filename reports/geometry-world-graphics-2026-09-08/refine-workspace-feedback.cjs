const fs = require('node:fs');
const sourcePath = 'stem_lab/stem_tool_geometryworld.js';
let source = fs.readFileSync(sourcePath, 'utf8');
function replace(before, after) {
  if (!source.includes(before)) throw new Error('Missing marker: ' + before.slice(0, 100));
  source = source.replace(before, after);
}
// Reuse the same stroke language throughout workspace and touch controls.
replace('  function renderTouchAction(el, icon, label) {\n    var paths={', '  var WORKSPACE_ICON_PATHS={');
replace("      undo:'M8 4L3 9l5 5M3 9h10a7 7 0 0 1 0 14'\n    };", `      undo:'M8 4L3 9l5 5M3 9h10a7 7 0 0 1 0 14',
      redo:'M16 4l5 5-5 5M21 9H11a7 7 0 0 0 0 14',
      fly:'M12 3v18M6 9l6-6 6 6M4 14l8 7 8-7',
      home:'M3 11l9-8 9 8M5 9v12h5v-7h4v7h5V9',
      clear:'M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7M14 10v7',
      award:'M8 15l-2 7 6-3 6 3-2-7M19 9a7 7 0 1 1-14 0 7 7 0 0 1 14 0ZM12 5l1.2 2.4 2.6.4-1.9 1.9.4 2.6-2.3-1.2-2.3 1.2.4-2.6-1.9-1.9 2.6-.4Z'
    };
  function renderWorkspaceIcon(el, icon) {
    return el('svg',{className:'gw-workspace-icon',viewBox:'0 0 24 24','aria-hidden':'true',focusable:'false',fill:'none',stroke:'currentColor',strokeWidth:1.6,strokeLinecap:'round',strokeLinejoin:'round'},el('path',{d:WORKSPACE_ICON_PATHS[icon] || WORKSPACE_ICON_PATHS.place}));
  }
  function renderWorkspaceAction(el, icon, label, count) {
    return el('span',{className:'gw-utility-content'},renderWorkspaceIcon(el,icon),el('span',{className:'gw-utility-label'},label),typeof count==='number' && el('span',{className:'gw-utility-count','aria-hidden':'true'},count));
  }
  function renderTouchAction(el, icon, label) {`);
replace("el('svg',{viewBox:'0 0 24 24','aria-hidden':'true',focusable:'false',fill:'none',stroke:'currentColor',strokeWidth:1.5,strokeLinecap:'round',strokeLinejoin:'round'},el('path',{d:paths[icon] || paths.place}))", "renderWorkspaceIcon(el,icon)");
replace("lastBadgeNotification && el('div', {", "lastBadgeNotification && !measureResult && !d.showcaseActive && openModals.length === 0 && el('div', {");
const toastStart = source.indexOf("            el('span', { style: { fontSize: '28px' } }, lastBadgeNotification.icon)");
const toastEnd = source.indexOf('\n          ),\n          // Volume-estimate drawer', toastStart);
if (toastStart < 0 || toastEnd < 0) throw new Error('Achievement content not found');
source = source.slice(0, toastStart) + `            el('span', {className:'gw-achievement-medal','aria-hidden':'true'},renderWorkspaceIcon(el,'award')),
            el('div', {className:'gw-achievement-copy'},
              el('div', {className:'gw-achievement-kicker'},'Achievement unlocked'),
              el('div', {className:'gw-achievement-name'},lastBadgeNotification.name),
              el('div', {className:'gw-achievement-description'},lastBadgeNotification.desc)
            )` + source.slice(toastEnd);
replace("className: 'gw-focusable', 'aria-label': __alloT('stem.geometryworld.a11y_toggle_fly_mode', 'Toggle fly mode'),", "className: 'gw-focusable', 'aria-label': __alloT('stem.geometryworld.a11y_toggle_fly_mode', 'Toggle fly mode'), 'aria-pressed':engine.flyMode ? 'true':'false', 'data-gw-utility':'fly',");
replace("}, engine.flyMode ? '\\uD83D\\uDD4A\\uFE0F FLY' : '\\uD83D\\uDD4A\\uFE0F Fly')", "}, renderWorkspaceAction(el,'fly','Fly'))");
replace("className: 'gw-focusable', 'aria-label': __alloT('stem.geometryworld.a11y_undo_last_action', 'Undo last action'),", "className: 'gw-focusable', 'aria-label': __alloT('stem.geometryworld.a11y_undo_last_action', 'Undo last action'), 'data-gw-utility':'undo',");
replace("}, '\\u21A9 ' + engine._undoStack.length)", "}, renderWorkspaceAction(el,'undo','Undo',engine._undoStack.length))");
replace("className: 'gw-focusable', 'aria-label': __alloT('stem.geometryworld.a11y_redo_last_action', 'Redo last action'),", "className: 'gw-focusable', 'aria-label': __alloT('stem.geometryworld.a11y_redo_last_action', 'Redo last action'), 'data-gw-utility':'redo',");
replace("}, '\\u21AA ' + engine._redoStack.length)", "}, renderWorkspaceAction(el,'redo','Redo',engine._redoStack.length))");
replace("}, '\\uD83C\\uDFE0 Home')", "}, renderWorkspaceAction(el,'home','Home'))");
replace("}, '\\uD83D\\uDDD1\\uFE0F Clear Mine')", "}, renderWorkspaceAction(el,'clear','Clear'))");
const css = '.gw-workspace-icon{display:block;width:18px;height:18px;flex:0 0 auto}.gw-utility-content{display:flex;align-items:center;justify-content:center;gap:6px;white-space:nowrap}.gw-utility-label{font-weight:600}.gw-utility-count{min-width:16px;padding:1px 4px;border-radius:5px;background:#d4e8ca16;color:#bacfb9;font-size:10px;font-variant-numeric:tabular-nums}.gw-root .gw-action-bar button{min-height:44px;padding:6px 9px!important}.gw-root .gw-action-bar button[aria-pressed="true"]{background:#d4e8ca!important;color:#173b35!important;border-color:#f1f7e8!important}.gw-root .gw-action-bar button[aria-label="Clear my placed blocks"]{color:#e8c5ae!important}.gw-root .gw-achievement-toast{box-sizing:border-box;max-width:min(360px,calc(100% - 32px));padding:12px 15px!important;gap:12px!important;border:1px solid #a4bb9e!important;border-radius:17px!important;background:#f4f0e4fa!important;box-shadow:0 12px 32px #102f2940!important;pointer-events:none}.gw-achievement-medal{display:grid;width:40px;height:48px;flex:0 0 auto;place-items:center;color:#4d7050}.gw-achievement-medal .gw-workspace-icon{width:34px;height:34px}.gw-achievement-copy{min-width:0}.gw-achievement-kicker{color:#60715b;font-size:10px;font-weight:700;letter-spacing:.08em;text-transform:uppercase}.gw-achievement-name{margin-top:3px;color:#173b35;font-size:15px;font-weight:750;line-height:1.25}.gw-achievement-description{margin-top:3px;color:#516454;font-size:11px;line-height:1.45}@media(max-width:800px){.gw-root[data-touch-active="true"] .gw-action-bar [data-gw-utility="undo"] .gw-utility-label,.gw-root[data-touch-active="true"] .gw-action-bar [data-gw-utility="redo"] .gw-utility-label{display:none}.gw-root[data-touch-active="true"] .gw-action-bar button{padding:6px!important}.gw-root .gw-achievement-toast{top:188px!important;left:12px!important;transform:none!important;max-width:calc(100% - 100px);padding:10px 12px!important}}@media(max-height:520px) and (orientation:landscape){.gw-root .gw-achievement-toast{display:none}}.theme-contrast .gw-root .gw-achievement-toast,[data-stem-theme="contrast"] .gw-root .gw-achievement-toast{background:#000!important;border-color:#ffff00!important}.theme-contrast .gw-achievement-toast *,[data-stem-theme="contrast"] .gw-achievement-toast *{color:#ffff00!important}.theme-contrast .gw-root .gw-action-bar button[aria-pressed="true"],[data-stem-theme="contrast"] .gw-root .gw-action-bar button[aria-pressed="true"]{background:#ffff00!important;color:#000!important}';
replace("      '@media(prefers-reduced-motion:reduce){.gw-root button", '      '+JSON.stringify(css)+",\n      '@media(prefers-reduced-motion:reduce){.gw-root button");
new Function(source);
for (const p of [sourcePath, 'desktop/web-app/public/' + sourcePath]) {
  const fd=fs.openSync(p,'r+');fs.writeFileSync(fd,source);fs.ftruncateSync(fd,Buffer.byteLength(source));fs.closeSync(fd);
}
console.log('Workspace feedback and utility controls refined and mirrored.');
