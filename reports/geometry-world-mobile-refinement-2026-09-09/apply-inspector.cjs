const fs = require('fs');
const vm = require('vm');
const canonical = 'stem_lab/stem_tool_geometryworld.js';
const mirror = 'desktop/web-app/public/stem_lab/stem_tool_geometryworld.js';
const original = fs.readFileSync(canonical, 'utf8');
let source = original.replace(/\r\n/g, '\n');
function replaceOnce(before, after) {
  if (source.split(before).length !== 2) throw new Error('Expected one inspector anchor: ' + before.slice(0, 100));
  source = source.replace(before, after);
}

replaceOnce('      var measureHistory = d.measureHistory || []; // past measurements\n', `      var measureHistory = d.measureHistory || []; // past measurements
      var measurementDetailsState = React.useState(false);
      var measurementDetailsOpen = measurementDetailsState[0];
      var setMeasurementDetailsOpen = measurementDetailsState[1];
      // Explicit measurements append a timestamp. Connected-build polling may
      // replace the result or change its bounds, but must keep this disclosure open.
      var latestMeasurementStamp = measureHistory.length ? measureHistory[measureHistory.length - 1].t : null;
      var hasMeasurement = !!measureResult;
      React.useEffect(function() {
        setMeasurementDetailsOpen(false);
      }, [activeLesson, hasMeasurement, latestMeasurementStamp]);
`);

replaceOnce("className: 'gw-measure-card', 'aria-label':", "className: 'gw-measure-card', 'data-measurement-compact': isMobile ? 'true' : 'false', 'data-details-open': !isMobile || measurementDetailsOpen ? 'true' : 'false', 'aria-label':");
replaceOnce("setLayerFocus(0); upd('measureResult', null); } }, '\\u00D7')", "setLayerFocus(0); setMeasurementDetailsOpen(false); upd('measureResult', null); } }, '\\u00D7')");

replaceOnce("            measureResult.isComplete !== false && el('div', null, 'L=' + measureResult.L + ' W=' + measureResult.W + ' H=' + measureResult.H),\n", `            measureResult.isComplete !== false && el('div', { className: 'gw-measure-dimensions', 'aria-label': 'Principal dimensions in units' },
              [['Length', measureResult.L], ['Width', measureResult.W], ['Height', measureResult.H]].map(function(dimension) {
                return el('div', { className: 'gw-measure-dimension', key: dimension[0] }, el('span', null, dimension[0]), el('strong', null, dimension[1]));
              })
            ),
            el('div', { className: 'gw-measure-volume', 'data-geometry-occupied-volume': 'true' },
              el('span', null, measureResult.isComplete === false ? 'Occupied volume, at least' : 'Occupied volume'),
              el('span', { className: 'gw-measure-volume-value' }, el('strong', null, measureResult.formattedOccupiedVolume), el('span', null, ' cubic units'))
            ),
            el('details', { className: 'gw-measure-details', open: !isMobile || measurementDetailsOpen,
              onToggle: function(ev) { if (isMobile && ev.currentTarget.open !== measurementDetailsOpen) setMeasurementDetailsOpen(ev.currentTarget.open); }
            },
              el('summary', { className: 'gw-measure-details-toggle gw-focusable' }, __alloT('stem.geometryworld.explore_measurement_details', 'Explore measurement details')),
              el('div', { className: 'gw-measure-details-content' },
`);
replaceOnce("? 'Counted at least ' + measureResult.count + ' cubic units'", "? 'Counted at least ' + measureResult.count + ' connected blocks'");
replaceOnce("            }, '\\uD83E\\uDDF1 Build This!')\n          ),\n          // Secondary setup", "            }, '\\uD83E\\uDDF1 Build This!')\n              )\n            )\n          ),\n          // Secondary setup");

const css = [
  '.gw-root .gw-measure-card{box-sizing:border-box;color:#edf2e3!important;scrollbar-color:#839c86 #173b35}.gw-root .gw-measure-heading{min-height:44px;box-sizing:border-box;padding:6px 8px 6px 12px;gap:6px!important}.gw-root .gw-measure-heading>[role="status"]{color:#edf2e3!important;font-size:12px;line-height:1.3}.gw-root .gw-measure-close{width:44px;height:44px;min-width:44px;min-height:44px;flex:0 0 auto;box-sizing:border-box;background:#224a3e;color:#edf2e3;border-color:#afc7b64d}.gw-measure-dimensions{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:6px;margin:0 0 5px}.gw-measure-dimension{display:flex;align-items:center;justify-content:space-between;gap:5px;padding:7px 8px;border:1px solid #aec9b633;border-radius:7px;background:#e4edda09;color:#bacfb9;font-size:10px;min-width:0}.gw-measure-dimension strong{color:#f5f0e5;font-size:13px;font-variant-numeric:tabular-nums}.gw-measure-volume{display:flex;align-items:baseline;justify-content:space-between;gap:8px;padding:5px 1px 7px;color:#c8dcc1;font-size:11px}.gw-measure-volume-value{white-space:nowrap;color:#c8dcc1;font-size:10px}.gw-measure-volume-value strong{font-size:17px;color:#f5f0e5;font-variant-numeric:tabular-nums}.gw-measure-details{flex-shrink:0;min-width:0;border-top:1px solid #aec9b62e}.gw-measure-details-toggle{display:flex;align-items:center;justify-content:space-between;min-height:44px;box-sizing:border-box;padding:8px 2px;color:#e4edd8;font-size:12px;font-weight:650;cursor:pointer;list-style:none}.gw-measure-details-toggle::-webkit-details-marker{display:none}.gw-measure-details-toggle::after{content:"+";font-size:20px;line-height:1;color:#b9d4ad}.gw-measure-details[open]>.gw-measure-details-toggle::after{content:"−"}.gw-measure-details-toggle:focus-visible{outline:2px solid #f5f0e5;outline-offset:-2px;border-radius:5px}.gw-measure-details-content{display:flex;flex-direction:column;gap:5px;padding:3px 0 4px}.gw-measure-card[data-measurement-compact="false"]>.gw-measure-details>summary{display:none}.gw-measure-card[data-measurement-compact="false"]>.gw-measure-details{padding-top:6px}.gw-measure-card[data-measurement-compact="true"] .gw-measure-details-content button{min-height:44px}.gw-measure-card[data-measurement-compact="true"] .gw-measure-details-content input[type="range"]{min-height:32px}',
  '#geoworld-fs-workspace.gw-root .gw-measure-card[data-measurement-compact="true"][data-details-open="false"]{max-height:min(240px,calc(100% - 140px))!important}#geoworld-fs-workspace.gw-root .gw-measure-card[data-measurement-compact="true"][data-details-open="true"]{max-height:calc(100% - 136px)!important}',
  '.theme-contrast .gw-root :is(.gw-measure-heading,.gw-measure-dimension,.gw-measure-close,.gw-measure-details),[data-stem-theme="contrast"] .gw-root :is(.gw-measure-heading,.gw-measure-dimension,.gw-measure-close,.gw-measure-details){background:#000!important;border-color:#ffff00!important}.theme-contrast .gw-root :is(.gw-measure-dimension,.gw-measure-volume,.gw-measure-details-toggle,.gw-measure-volume-value,.gw-measure-close,.gw-measure-heading>[role="status"]),[data-stem-theme="contrast"] .gw-root :is(.gw-measure-dimension,.gw-measure-volume,.gw-measure-details-toggle,.gw-measure-volume-value,.gw-measure-close,.gw-measure-heading>[role="status"]){color:#ffff00!important}.theme-contrast .gw-root .gw-measure-card strong,[data-stem-theme="contrast"] .gw-root .gw-measure-card strong{color:#ffff00!important}.theme-contrast .gw-root .gw-measure-details-toggle::after,[data-stem-theme="contrast"] .gw-root .gw-measure-details-toggle::after{color:#00ff00}.theme-contrast .gw-root .gw-measure-details-toggle:focus-visible,[data-stem-theme="contrast"] .gw-root .gw-measure-details-toggle:focus-visible{outline-color:#00ff00}'
];
const cssAnchor = "      '@media(prefers-reduced-motion:reduce){.gw-root button{transition:none!important;}.gw-achievement-toast{animation:none!important;}.gw-root *{scroll-behavior:auto!important;}}'";
replaceOnce(cssAnchor, css.map(rule => '      ' + JSON.stringify(rule) + ',').join('\n') + '\n' + cssAnchor);
new vm.Script(source, { filename: canonical });
const output = original.includes('\r\n') ? source.replace(/\n/g, '\r\n') : source;
for (const file of [canonical, mirror]) {
  const fd = fs.openSync(file, 'r+');
  try { fs.writeFileSync(fd, output); fs.ftruncateSync(fd, Buffer.byteLength(output)); } finally { fs.closeSync(fd); }
}
console.log(JSON.stringify({ status: 'ready', bytes: Buffer.byteLength(output), mirrorIdentical: fs.readFileSync(canonical).equals(fs.readFileSync(mirror)) }));
