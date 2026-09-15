const fs = require('node:fs');
const path = require('node:path');
const target = path.resolve('stem_lab/stem_tool_geometryworld_builder.js');
const original = fs.readFileSync(target, 'utf8');
const newline = original.includes('\r\n') ? '\r\n' : '\n';
let source = original.replace(/\r\n/g, '\n');
function replace(label, before, after) {
  const count = source.split(before).length - 1;
  if (count !== 1) throw new Error(label + ': expected one anchor, got ' + count);
  source = source.replace(before, after);
}
replace('focus ownership',
`      var _hasStudentBuild = React.useState(null), hasStudentBuild = _hasStudentBuild[0], setHasStudentBuild = _hasStudentBuild[1];`,
`      var _hasStudentBuild = React.useState(null), hasStudentBuild = _hasStudentBuild[0], setHasStudentBuild = _hasStudentBuild[1];
      var buildResumeTimerRef = React.useRef(null);
      React.useEffect(function () { return function () { if (buildResumeTimerRef.current) clearTimeout(buildResumeTimerRef.current); }; }, []);`);
replace('resume building action',
`      function applyPrintScale(value) {`,
`      function resumeBuilding(choice) {
        var owner = window[ENGINE_KEY];
        if (owner && owner.releaseInput) owner.releaseInput();
        patchGeometryState(ctx, { sandboxDockCollapsed:true, builderPanel:'build', hudPanel:'' });
        if (buildResumeTimerRef.current) clearTimeout(buildResumeTimerRef.current);
        buildResumeTimerRef.current = setTimeout(function () {
          buildResumeTimerRef.current = null;
          var liveData = (liveBuilderCtx.current.toolData || {}).geometryWorld || {};
          if (window[ENGINE_KEY] !== owner || liveData.activeLesson !== 'builderSandbox' || !liveData.worldActive || !liveData.sandboxDockCollapsed || liveData.showGeometryHome || liveData.showcaseActive) return;
          var workspace = document.getElementById('geoworld-fs-workspace');
          var selector = choice === 'material' ? '.gw-hotbar-item[aria-pressed="true"]' : choice === 'shape' ? '.gw-shape-item[aria-pressed="true"]' : '';
          var target = (selector && workspace && workspace.querySelector(selector)) || document.getElementById('geoworld-fs-wrap');
          if (target && typeof target.focus === 'function') {
            try { target.focus({preventScroll:true}); } catch (_) { target.focus(); }
            if (selector && target.scrollIntoView) target.scrollIntoView({block:'nearest',inline:'nearest'});
          }
          if (choice) announce(liveBuilderCtx.current, choice === 'material' ? 'Material choices are open in the bottom row. Shape choices are just above them.' : 'Shape choices are open above the material row. Choose a shape, then use Rotate for its direction.', 'info');
        }, 40);
      }
      function applyPrintScale(value) {`);
replace('actionable recipe cards',
`              h('div', { className: 'gwe-selection-card' }, h('span', { className: 'gwe-selection-label' }, 'Material'), h('span', { className: 'gwe-selection-value' }, material.emoji + ' ' + material.name)),
              h('div', { className: 'gwe-selection-card' }, h('span', { className: 'gwe-selection-label' }, 'Shape'), h('span', { className: 'gwe-selection-value' }, shape.emoji + ' ' + shape.name), h('span', {className:'gwe-tool-rotation'}, ((Number(data.blockRotation) || 0) * 90) + '\\u00B0 rotation'))`,
`              h('button', { type:'button',className:'gwe-selection-card gwe-choice-card','aria-label':'Change material. Current material: '+material.name,onClick:function(){resumeBuilding('material');} }, h('span', { className: 'gwe-selection-label' }, 'Material',h('span',{className:'gwe-choice-change','aria-hidden':'true'},'Change')), h('span', { className: 'gwe-selection-value' }, material.emoji + ' ' + material.name)),
              h('button', { type:'button',className:'gwe-selection-card gwe-choice-card','aria-label':'Change shape. Current shape: '+shape.name,onClick:function(){resumeBuilding('shape');} }, h('span', { className: 'gwe-selection-label' }, 'Shape',h('span',{className:'gwe-choice-change','aria-hidden':'true'},'Change')), h('span', { className: 'gwe-selection-value' }, shape.emoji + ' ' + shape.name), h('span', {className:'gwe-tool-rotation'}, ((Number(data.blockRotation) || 0) * 90) + '\\u00B0 rotation'))`);
replace('dock collapse',
`          h('button', { type: 'button', className: 'gwe-collapse', onClick: function () { patchGeometryState(ctx, { sandboxDockCollapsed: !collapsed, builderPanel:'build' }); }, 'aria-expanded': collapsed ? 'false' : 'true', 'aria-label': collapsed ? 'Expand Free Build Studio' : 'Collapse Free Build Studio' }, collapsed ? 'Build' : '\\u2212')`,
`          h('button', { type: 'button', className: 'gwe-collapse', onClick: function () { if (!collapsed) resumeBuilding(); else patchGeometryState(ctx, { sandboxDockCollapsed:false, builderPanel:'build' }); }, 'aria-expanded': collapsed ? 'false' : 'true', 'aria-label': collapsed ? 'Expand Free Build Studio' : 'Collapse Free Build Studio' }, collapsed ? 'Build tools' : '\\u2212')`);
replace('creation workflow',
`          h('li', {'aria-current': measuredIsStudentBuild ? undefined : 'step'}, h('span', {'aria-hidden':'true'}, '1'), 'Select'),
          h('li', {'aria-current': measuredIsStudentBuild ? 'step' : undefined}, h('span', {'aria-hidden':'true'}, '2'), 'Inspect'),
          h('li', null, h('span', {'aria-hidden':'true'}, '3'), 'Print Lab')`,
`          h('li', {'aria-current': hasStudentBuild === false ? 'step' : undefined}, h('span', {'aria-hidden':'true'}, '1'), 'Build'),
          h('li', {'aria-current': hasStudentBuild !== false && !hasRetainedSelection ? 'step' : undefined}, h('span', {'aria-hidden':'true'}, '2'), 'Select'),
          h('li', {'aria-current': hasRetainedSelection ? 'step' : undefined}, h('span', {'aria-hidden':'true'}, '3'), 'Print Lab')`);
replace('stage aware quick actions',
`          h('button',{type:'button','aria-label':'Select and measure aimed build',onClick:function(){measureSelectedBuild(ctx);}},hasRetainedSelection ? 'Select another build' : 'Select build'),
          h('button',{type:'button',className:'gwe-primary','aria-label':'Send selected build to Print Lab',onClick:function(){openSelectedBuildInPrintLab(ctx);}},'Send to Print Lab')`,
`          hasStudentBuild === false
            ? h('button',{type:'button',className:'gwe-primary','aria-label':'Start building',onClick:function(){resumeBuilding();}},'Start building')
            : h('button',{type:'button',className:measuredIsStudentBuild ? '' : 'gwe-primary','aria-label':'Select and measure aimed build',onClick:function(){measureSelectedBuild(ctx);}},hasRetainedSelection ? 'Select another build' : 'Select build'),
          h('button',{type:'button',className:measuredIsStudentBuild ? 'gwe-primary' : '',disabled:hasStudentBuild === false,'aria-label':'Send selected build to Print Lab','aria-describedby':hasStudentBuild === false ? 'gwe-build-guidance' : undefined,title:hasStudentBuild === false ? 'Place blocks before selecting a creation for Print Lab' : undefined,onClick:function(){openSelectedBuildInPrintLab(ctx);}},'Send to Print Lab')`);
replace('guidance identity',
`          h('p', { className: 'gwe-builder-intro' + (hasRetainedSelection ? ' gwe-assistive-copy' : ''), 'data-gwe-build-guidance':`,
`          h('p', { id:'gwe-build-guidance',className: 'gwe-builder-intro' + (hasRetainedSelection ? ' gwe-assistive-copy' : ''), 'data-gwe-build-guidance':`);
replace('persistent return footer',
`          renderEditableRecovery()
        )
      ));`,
`          renderEditableRecovery()
        ),
        !collapsed && h('div',{className:'gwe-builder-footer'},
          h('button',{type:'button',className:'gwe-resume-building',onClick:function(){resumeBuilding();}},
            h('svg',{viewBox:'0 0 24 24',width:18,height:18,fill:'none',stroke:'currentColor',strokeWidth:1.7,strokeLinecap:'round',strokeLinejoin:'round','aria-hidden':'true',focusable:'false'},h('path',{d:'M14 5l7 7-7 7M21 12H3'})),
            'Back to building'))
      ));`);
const css = `.gwe-builder-dock .gwe-choice-card{appearance:none;min-height:76px;text-align:left;color:inherit;font:inherit;cursor:pointer}.gwe-choice-card .gwe-selection-label{display:flex;justify-content:space-between;gap:6px}.gwe-choice-change{font-size:10px;font-weight:650;color:#d4e8ca;text-decoration:underline;text-underline-offset:3px}.gwe-builder-dock .gwe-choice-card:hover{background:#315446;border-color:#bad0b886}.gwe-builder-dock .gwe-choice-card:focus-visible,.gwe-builder-dock .gwe-resume-building:focus-visible{outline:3px solid #f1d094;outline-offset:2px}.gwe-builder-footer{flex:0 0 auto;padding:10px 15px 12px;border-top:1px solid #b9d1bf26;background:#173b35}.gwe-resume-building{display:flex;align-items:center;justify-content:center;gap:8px;width:100%;min-height:44px;padding:9px 12px;border:1px solid #acc9af66;border-radius:11px;background:#244c40;color:#f5f0e5;font:inherit;font-size:12px;font-weight:650;cursor:pointer}.gwe-resume-building svg{order:1}.gwe-resume-building:hover{background:#315b49;border-color:#d4e8ca}.gwe-builder-quick-actions button:disabled{cursor:default}.gwe-builder-dock[data-collapsed="true"] .gwe-collapse{padding:8px 12px;white-space:nowrap}@media(max-width:800px){.gwe-builder-dock[data-collapsed="false"]{max-height:min(62%,calc(100% - 118px))}.gwe-builder-footer{padding:8px 13px 10px}.gwe-builder-head{padding-top:8px;padding-bottom:8px}.gwe-builder-quick-actions{padding-top:8px;padding-bottom:9px}.gwe-workflow{padding-top:7px}}@media(max-height:500px){.gwe-builder-dock[data-collapsed="false"]{max-height:calc(100% - 118px)}.gwe-builder-dock[data-collapsed="false"] .gwe-builder-icon,.gwe-builder-dock[data-collapsed="false"] .gwe-builder-eyebrow{display:none}.gwe-builder-head{padding:6px 12px}.gwe-workflow{padding-top:5px}.gwe-builder-quick-actions{padding:6px 12px 8px}.gwe-builder-footer{padding:6px 12px 8px}}.theme-contrast .gwe-choice-change,[data-stem-theme="contrast"] .gwe-choice-change{color:#0f0}.theme-contrast .gwe-builder-footer,[data-stem-theme="contrast"] .gwe-builder-footer{background:#000;border-color:#0ff}`;
replace('dock styles',
`    ].join('');\n    document.head.appendChild(style);`,
`      ,${JSON.stringify(css)}\n    ].join('');\n    document.head.appendChild(style);`);
new Function(source);
const output = source.replace(/\n/g, newline);
if (process.argv.includes('--check')) {
  console.log('Builder dock patch anchors and syntax verified; no production file written.');
} else {
  const fd=fs.openSync(target,'r+');
  try { fs.writeFileSync(fd,output);fs.ftruncateSync(fd,Buffer.byteLength(output)); } finally { fs.closeSync(fd); }
  console.log('Applied builder dock refinement.');
}
