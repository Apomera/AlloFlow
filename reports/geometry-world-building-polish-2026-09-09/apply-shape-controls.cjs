const fs = require('node:fs');
const file = 'stem_lab/stem_tool_geometryworld.js';
let source = fs.readFileSync(file, 'utf8');
const newline = source.includes('\r\n') ? '\r\n' : '\n';
source = source.replace(/\r\n/g, '\n');
function replace(before, after) {
  if (!source.includes(before) || source.indexOf(before) !== source.lastIndexOf(before)) throw Error('Expected one match: ' + before.slice(0, 100));
  source = source.replace(before, after);
}
replace("      var actionFeedback = d.actionFeedback || ''; // brief key action text", `      var actionFeedback = d.actionFeedback || ''; // brief action text
      var shapeActionRef = React.useRef({ timer: null, feedback: '' });
      shapeActionRef.current.feedback = actionFeedback;
      React.useEffect(function() {
        return function() { if (shapeActionRef.current.timer) clearTimeout(shapeActionRef.current.timer); };
      }, []);

      // Every input uses the live placement state, including rapid commands that
      // arrive before React renders. Choosing a shape starts at zero degrees.
      function setBuildShape(action, index) {
        var liveEngine = window[engineKey];
        var state = (liveEngine && liveEngine._placeState) || { selectedShape: selectedShape, blockRotation: blockRotation };
        var currentShape = state.selectedShape || 0;
        var nextShape = action === 'cycle' ? (currentShape + 1) % BLOCK_SHAPES.length : action === 'rotate' ? currentShape : index;
        if (!BLOCK_SHAPES[nextShape] || (action === 'rotate' && BLOCK_SHAPES[nextShape].id === 'cube')) return;
        var nextRotation = action === 'rotate' ? ((state.blockRotation || 0) + 1) % 4 : 0;
        var feedback = BLOCK_SHAPES[nextShape].name + (BLOCK_SHAPES[nextShape].id === 'cube' ? '' : ' \\u00b7 ' + (nextRotation * 90) + '\\u00b0');
        if (liveEngine) liveEngine._placeState = Object.assign({}, state, { selectedShape: nextShape, blockRotation: nextRotation });
        if (shapeActionRef.current.timer) clearTimeout(shapeActionRef.current.timer);
        upd({ selectedShape: nextShape, blockRotation: nextRotation, actionFeedback: feedback });
        shapeActionRef.current.timer = setTimeout(function() {
          shapeActionRef.current.timer = null;
          if (shapeActionRef.current.feedback === feedback) upd('actionFeedback', '');
        }, 1800);
      }`);
replace(`            case 'KeyQ': // Cycle through shapes
              // Read latest shape from engine bridge (closure value is stale after first render)
              var curShape = (engine._placeState && typeof engine._placeState.selectedShape === 'number') ? engine._placeState.selectedShape : 0;
              var nextShape = (curShape + 1) % BLOCK_SHAPES.length;
              upd({ selectedShape: nextShape, blockRotation: 0 });
              upd('actionFeedback', 'Shape: ' + BLOCK_SHAPES[nextShape].name);
              setTimeout(function() { upd('actionFeedback', ''); }, 1200);
              break;
            case 'KeyR': // Rotate block 90° (for half/quarter shapes)
              var curRot = (engine._placeState && typeof engine._placeState.blockRotation === 'number') ? engine._placeState.blockRotation : 0;
              var newRot = (curRot + 1) % 4;
              upd('blockRotation', newRot);
              upd('actionFeedback', 'Rotate: ' + (newRot * 90) + '\\u00b0');
              setTimeout(function() { upd('actionFeedback', ''); }, 1200);
              break;`, `            case 'KeyQ': // Cycle through shapes
              setBuildShape('cycle');
              break;
            case 'KeyR': // Rotate block 90° (for half/quarter shapes)
              setBuildShape('rotate');
              break;`);
replace("          selectedShape > 0 && el('span', {", "          selectedShape > 0 && el('button', {");
replace("            className: 'gw-focusable gw-shape-rotate', role: 'button', tabIndex: 0,", "            type: 'button', className: 'gw-focusable gw-shape-rotate', 'aria-keyshortcuts': 'R',");
replace(`            onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); upd('blockRotation', (blockRotation + 1) % 4); } },
            'aria-pressed': blockRotation > 0 ? 'true' : 'false',
            onClick: function() { upd('blockRotation', (blockRotation + 1) % 4); },`, `            onClick: function() { setBuildShape('rotate'); },`);
replace(`            return el('div', {
              key: bs.id,
              className: 'gw-focusable gw-shape-item',
              role: 'button', tabIndex: 0,`, `            return el('button', {
              key: bs.id,
              type: 'button', className: 'gw-focusable gw-shape-item',`);
replace(`              onClick: function() { upd('selectedShape', i); },
              onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); upd('selectedShape', i); } },`, `              onClick: function() { setBuildShape('select', i); },`);
source = source.replace(/\n/g, newline);
for (const target of [file, 'desktop/web-app/public/' + file]) {
  const fd = fs.openSync(target, 'r+');
  fs.writeFileSync(fd, source); fs.ftruncateSync(fd, Buffer.byteLength(source)); fs.closeSync(fd);
}
console.log('Updated shape controls and desktop mirror.');
