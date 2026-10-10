const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const vm = require('vm');
const repo = 'C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated';
const parser = require(path.join(repo, 'node_modules/@babel/parser'));
const baseline = fs.readFileSync(path.join(__dirname, 'renderer-baseline.js'), 'utf8');
const hash = value => crypto.createHash('sha256').update(value).digest('hex');
if (hash(baseline) !== 'bf89763b349b9cc74a24f440e4a0c2f98b11660de700bb82ac1debe2129723dd') throw new Error('Unexpected renderer baseline');
let tools;
function walk(node) {
  if (!node || typeof node !== 'object') return;
  if (node.type === 'CallExpression' && node.arguments?.[1]?.type === 'ObjectExpression' && node.arguments[1].properties.some(p => p.key?.name === 'id' && p.value?.value === 'diss-lab-tools')) {
    if (tools) throw new Error('Duplicate tools panel');
    tools = node;
  }
  for (const [key, value] of Object.entries(node)) {
    if (key === 'loc') continue;
    if (Array.isArray(value)) value.forEach(walk);
    else if (value && typeof value === 'object') walk(value);
  }
}
walk(parser.parse(baseline));
if (!tools || tools.arguments.length !== 11) throw new Error('Tools shape changed');
const a = tools.arguments.map(n => baseline.slice(n.start, n.end));
const download = `React.createElement("button", { "aria-label": __alloT('stem.dissection.a11y_download_full_canvas_png', 'Download full canvas PNG'), "data-canvas-download": true,
                  onClick: function () {
                    var sourceCanvas = null;
                    var hadCaptureCamera = null;
                    var previousCaptureCamera;
                    try {
                      sourceCanvas = queryDissectionNode('[data-diss-canvas]');
                      if (!sourceCanvas) throw new Error('Canvas unavailable');
                      hadCaptureCamera = Object.prototype.hasOwnProperty.call(sourceCanvas, '_lastCaptureCamera');
                      previousCaptureCamera = sourceCanvas._lastCaptureCamera;
                      var width = sourceCanvas.width;
                      var height = sourceCanvas.height;
                      if (!(width > 0 && height > 0 && isFinite(width) && isFinite(height)) || typeof sourceCanvas._captureFullDissectionEvidence !== 'function') throw new Error('Canvas capture unavailable');
                      var downloadCanvas = document.createElement('canvas');
                      downloadCanvas.width = width;
                      downloadCanvas.height = height;
                      var downloadContext = downloadCanvas.getContext('2d');
                      if (!downloadContext || sourceCanvas._captureFullDissectionEvidence(downloadContext, width, height) !== true) throw new Error('Canvas capture failed');
                      var png = downloadCanvas.toDataURL('image/png');
                      if (typeof png !== 'string' || !/^data:image\\/png;base64,.+/.test(png)) throw new Error('PNG encoding failed');
                      var link = document.createElement('a');
                      link.download = specimen + '_dissection.png';
                      link.href = png;
                      link.click();
                      if (addToast) addToast('Full canvas PNG saved', 'success');
                      setProcedureFeedback('Full canvas saved as ' + link.download + '.');
                    } catch (error) {
                      if (addToast) addToast('Canvas download unavailable', 'error');
                      setProcedureFeedback('Canvas download is unavailable in this view.', 'caution');
                    } finally {
                      if (sourceCanvas && hadCaptureCamera !== null) {
                        if (hadCaptureCamera) sourceCanvas._lastCaptureCamera = previousCaptureCamera;
                        else delete sourceCanvas._lastCaptureCamera;
                      }
                    }
                  },
                  title: 'Download a fresh full-resolution PNG with canvas guides and lens windows',
                  className: "diss-lab-download"
                }, 'Download full canvas PNG')`;
const report = a[8].replace("'\\uD83D\\uDCCB Lab Report'", "'Copy lab report'");
if (report === a[8]) throw new Error('Report label not found');
function group(name, heading, content) {
  return `React.createElement("section", { className: "diss-lab-tool-group", "data-lab-tools-group": "${name}", role: "group", "aria-labelledby": "diss-lab-${name}-heading" },
                React.createElement("h4", { id: "diss-lab-${name}-heading", className: "diss-lab-tool-heading" }, '${heading}'),
                ${content}
              )`;
}
const observe = group('observe', 'Observe and measure', `React.createElement("p", { className: "diss-lab-tool-note" }, 'Choose a tool, then use the specimen canvas.'),
                React.createElement("div", { className: "diss-lab-tool-actions" }, ${a[2]}, ${a[3]}, ${a[5]})`);
const evidence = group('evidence', 'Capture and download', `${a[6]},
                React.createElement("div", { className: "diss-lab-tool-actions" }, ${a[7]}, ${download}),
                React.createElement("p", { className: "diss-lab-tool-note" }, 'Frame contents applies to Capture evidence. PNG downloads always include guides and lens windows.')`);
const records = group('records', 'Report and reset', `${report},
                React.createElement("div", { className: "diss-lab-reset-boundary" }, ${a[9]}, ${a[10]})`);
const panel = `React.createElement(${a[0]}, ${a[1]},
              ${observe},
              ${evidence},
              ${records}
            )`;
const edits = [];
let next = baseline;
function replace(name, before, after) {
  if (next.split(before).length !== 2) throw new Error('Nonunique edit: ' + name);
  next = next.replace(before, after);
  edits.push({name, before, after});
}
replace('Group native tools and replace stale screenshot download', baseline.slice(tools.start, tools.end), panel);
const marker = '/* Organize display settings into readable groups with visible toggle states. */';
const css = `/* Keep observation, evidence and reset actions together without stretching controls. */
[data-dissection-root] #diss-lab-tools { grid-template-columns: repeat(3, minmax(0, 1fr)); align-items: start; }
#diss-lab-tools .diss-lab-tool-group { min-width: 0; padding: .8rem; border: 1px solid #9fb8b0; border-radius: .85rem; background: #fff; }
#diss-lab-tools .diss-lab-tool-heading { margin: 0 0 .7rem; padding-bottom: .6rem; border-bottom: 1px solid #ccdcd5; color: #134e4a; font-size: 1rem; font-weight: 850; line-height: 1.4; overflow-wrap: anywhere; }
#diss-lab-tools .diss-lab-tool-note { margin: .65rem 0; color: #334155; font-size: .875rem; line-height: 1.55; overflow-wrap: anywhere; }
#diss-lab-tools .diss-lab-tool-actions { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); align-items: start; gap: .55rem; }
#diss-lab-tools [data-lab-tools-group="observe"] .diss-lab-tool-actions > button:last-child { grid-column: 1 / -1; }
#diss-lab-tools [data-lab-tools-group="evidence"] .diss-lab-tool-actions { grid-template-columns: minmax(0, 1fr); margin-top: .65rem; }
[data-dissection-root] #diss-lab-tools .diss-lab-tool-group button { font-size: 1rem !important; }
[data-dissection-root] #diss-lab-tools button:is([aria-pressed="true"], [aria-expanded="true"]) { border: 3px solid #0f766e; background: #e0f2ed; color: #134e4a; text-decoration: underline; text-decoration-thickness: 2px; text-underline-offset: .2em; }
[data-dissection-root] #diss-lab-tools button:hover:not(:disabled) { background: #edf5fc; border-color: #1766d2; }
[data-dissection-root] #diss-lab-tools button:disabled { opacity: 1; border-style: dashed; border-color: #94a3b8; background: #f1f5f9; color: #475569; cursor: not-allowed; }
#diss-lab-tools .diss-lab-reset-boundary { margin-top: .8rem; padding: .65rem; border: 1px solid #d8a9a3; border-radius: .7rem; background: #fff7f5; }
[data-dissection-root] #diss-lab-tools #diss-reset-specimen { border-color: #b91c1c; background: #fff7f5; color: #991b1b; }
[data-dissection-root] #diss-lab-tools .diss-reset-confirm { display: grid; grid-template-columns: minmax(0, 1fr); padding: .7rem 0 0; }
[data-dissection-root] #diss-lab-tools .diss-reset-confirm p { grid-column: 1 / -1; font-size: 1rem; }
[data-dissection-root] #diss-lab-tools select:focus-visible { outline: 3px solid #1766d2; outline-offset: 2px; box-shadow: none !important; }
[data-dissection-root][data-text-size="large"] #diss-lab-tools :is(.diss-lab-tool-heading, .diss-lab-tool-group button, .diss-lab-tool-note, .diss-reset-confirm p) { font-size: 1.125rem !important; }
[data-dissection-root][data-high-contrast="true"] #diss-lab-tools :is(.diss-lab-tool-group, .diss-lab-reset-boundary) { border-color: #111827; background: #fff; }
[data-dissection-root][data-high-contrast="true"] #diss-lab-tools :is(.diss-lab-tool-heading, .diss-lab-tool-note) { color: #000; border-color: #111827; }
[data-dissection-root][data-high-contrast="true"] #diss-lab-tools :is(select, .diss-reset-confirm button[data-confirm="true"]):focus-visible { outline-color: #000; }
@container dissection (max-width: 980px) { [data-dissection-root] #diss-lab-tools { grid-template-columns: repeat(2, minmax(0, 1fr)); } #diss-lab-tools [data-lab-tools-group="records"] { grid-column: 1 / -1; } }
@container dissection (max-width: 520px) { [data-dissection-root] #diss-lab-tools { grid-template-columns: minmax(0, 1fr); } }
@media (forced-colors: active) {
  [data-dissection-root] #diss-lab-tools :is(.diss-lab-tool-group, .diss-lab-reset-boundary) { border-color: CanvasText !important; background: Canvas !important; }
  [data-dissection-root] #diss-lab-tools :is(.diss-lab-tool-heading, .diss-lab-tool-note) { color: CanvasText !important; border-color: CanvasText !important; }
  [data-dissection-root] #diss-lab-tools button:is([aria-pressed="true"], [aria-expanded="true"]) { border: 3px solid Highlight !important; }
  [data-dissection-root] #diss-lab-tools button:disabled { border-style: dashed !important; color: GrayText !important; }
  [data-dissection-root] #diss-lab-tools :is(select, .diss-reset-confirm button[data-confirm="true"]):focus-visible { outline-color: Highlight !important; }
}
`;
replace('Style grouped tools and preserve readable native states', marker, css + marker);
new vm.Script(next);
let reversed = next;
for (const e of edits.slice().reverse()) {
  if (reversed.split(e.after).length !== 2) throw new Error('Nonunique reverse edit');
  reversed = reversed.replace(e.after, e.before);
}
if (reversed !== baseline) throw new Error('Source reversal failed');
fs.writeFileSync(path.join(__dirname, 'renderer-next.js'), next);
fs.writeFileSync(path.join(__dirname, 'renderer-edits.json'), JSON.stringify({beforeSha256:hash(baseline),afterSha256:hash(next),edits}, null, 2));
console.log(JSON.stringify({edits:edits.length,beforeSha256:hash(baseline),afterSha256:hash(next),syntax:'passed',reverse:'exact'}));
