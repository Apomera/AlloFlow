const fs=require('node:fs');
const file='stem_lab/stem_tool_geometryworld_builder.js';
let s=fs.readFileSync(file,'utf8');const nl=s.includes('\r\n')?'\r\n':'\n';s=s.replace(/\r\n/g,'\n');
function replace(a,b){if(!s.includes(a)||s.indexOf(a)!==s.lastIndexOf(a))throw Error('Expected one marker: '+a.slice(0,100));s=s.replace(a,b);}
replace("      var editableReadTokenRef = React.useRef(0);",`      var editableReadTokenRef = React.useRef(0);
      var showcaseFilesRef = React.useRef(null), showcaseFilesTriggerRef = React.useRef(null), showcaseFilesWasOpen = React.useRef(false);
      var editableRecoveryRef = React.useRef(null);
      var _showcaseFilesOpen = React.useState(false), showcaseFilesOpen = _showcaseFilesOpen[0], setShowcaseFilesOpen = _showcaseFilesOpen[1];
      var _showcaseFileNotice = React.useState(''), showcaseFileNotice = _showcaseFileNotice[0], setShowcaseFileNotice = _showcaseFileNotice[1];`);
replace("      React.useEffect(function () { return function () { editableReadTokenRef.current += 1; }; }, []);",`      React.useEffect(function () { return function () { editableReadTokenRef.current += 1; }; }, []);
      React.useEffect(function () {
        if (!data.showcaseActive) {
          if (showcaseFilesWasOpen.current) { editableReadTokenRef.current += 1; setEditablePreview(null); setEditableError(''); setEditableBusy(false); }
          showcaseFilesWasOpen.current = false; setShowcaseFilesOpen(false); return;
        }
        var target = showcaseFilesOpen ? showcaseFilesRef.current : showcaseFilesWasOpen.current ? showcaseFilesTriggerRef.current : null;
        if (target && target.focus) target.focus();
        showcaseFilesWasOpen.current = showcaseFilesOpen;
      }, [data.showcaseActive, showcaseFilesOpen]);
      React.useEffect(function () {
        if (showcaseFilesOpen && editablePreview && editableRecoveryRef.current) editableRecoveryRef.current.focus();
      }, [showcaseFilesOpen, editablePreview]);`);
replace("      function chooseEditableWorld(event) {\n        var file = event.target.files && event.target.files[0];",`      function chooseEditableWorld(event) {
        if (window[ENGINE_KEY] && window[ENGINE_KEY]._showcaseExporting) { event.target.value = ''; return; }
        var file = event.target.files && event.target.files[0];`);
replace("        var result = restoreEditableWorld(liveEngine, editablePreview.value);",`        if (liveEngine && liveEngine._showcaseExporting) return;
        if (liveEngine && liveEngine.endShowcase) liveEngine.endShowcase();
        var result = restoreEditableWorld(liveEngine, editablePreview.value);`);
replace("        patchGeometryState(ctx, { activeLesson: 'builderSandbox', worldActive: true, showLessonIntro: false, tutorialDismissed: true, hudPreset: 'builder', hudPanel: 'inventory', measureResult: null, measureHistory: [], blocksPlaced: result.placedCount });", "        patchGeometryState(ctx, { activeLesson: 'builderSandbox', worldActive: true, showLessonIntro: false, tutorialDismissed: true, hudPreset: 'builder', hudPanel: 'inventory', builderPanel:'build', showcaseActive:false, showcaseSaving:false, actionFeedback:'', sandboxDockCollapsed:false, builderPrintContext:null, builderPrintCheck:null, measureResult: null, measureHistory: [], blocksPlaced: result.placedCount });");
const recoveryStart=s.indexOf("          editableError && h('div', { className: 'gwe-recovery'");
const recoveryEnd=s.indexOf('\n        )\n      ));',recoveryStart);
if(recoveryStart<0||recoveryEnd<0)throw Error('Missing recovery fragment');
let recovery=s.slice(recoveryStart,recoveryEnd);
recovery=recovery.replace("'data-state': 'preview', 'aria-labelledby': 'gwe-recovery-title'", "'data-state': 'preview', 'aria-labelledby': 'gwe-recovery-title', ref:editableRecoveryRef, tabIndex:-1");
s=s.slice(0,recoveryStart)+'          renderEditableRecovery()'+s.slice(recoveryEnd);
replace("      var additions = [];",`      function renderEditableRecovery() {
        return h(React.Fragment, null,
${recovery}
        );
      }
      function closeShowcaseFiles() {
        cancelEditablePreview(); setShowcaseFilesOpen(false); setShowcaseFileNotice('');
      }
      function openShowcaseFiles() {
        var eng = window[ENGINE_KEY]; if (!eng || eng._showcaseExporting) return;
        cancelEditablePreview(); setShowcaseFileNotice(''); setShowcaseFilesOpen(true);
      }
      function chooseShowcaseFile() {
        var eng = window[ENGINE_KEY]; if (!eng || eng._showcaseExporting || editableBusy) return;
        if (editableInputRef.current) editableInputRef.current.click();
      }
      function fileIcon(kind) {
        var paths = { edit:'M5 3h10l4 4v14H5ZM14 3v5h5M9 12l-2 3 2 3M15 12l2 3-2 3', print:'M4 8l8-5 8 5v9l-8 5-8-5ZM4 8l8 5 8-5M12 13v9', open:'M3 7h7l2 3h9l-3 10H3ZM3 7V4h7l2 3h7v3' };
        return h('svg',{className:'gwe-file-icon',viewBox:'0 0 24 24',fill:'none',stroke:'currentColor',strokeWidth:1.5,strokeLinecap:'round',strokeLinejoin:'round','aria-hidden':'true',focusable:'false'},h('path',{d:paths[kind]}));
      }
      var additions = [];
      if (isSandbox && data.worldActive) additions.push(h('input', {key:'gwe-editable-file',ref:editableInputRef,type:'file',accept:'.json,application/json',onChange:chooseEditableWorld,style:{display:'none'},tabIndex:-1,'aria-hidden':'true'}));`);
replace("              h('button', { type: 'button', disabled: editableBusy, onClick: function () { if (editableInputRef.current) editableInputRef.current.click(); } }, editableBusy ? 'Checking file...' : '\\uD83D\\uDCC2 Open editable world'),\n              h('input', { ref: editableInputRef, type: 'file', accept: '.json,application/json', onChange: chooseEditableWorld, style: { display: 'none' }, tabIndex: -1, 'aria-hidden': 'true' })", "              h('button', { type: 'button', disabled: editableBusy, onClick: function () { if (editableInputRef.current) editableInputRef.current.click(); } }, editableBusy ? 'Checking file...' : '\\uD83D\\uDCC2 Open editable world')");
replace("className:'gwe-showcase','data-look':", "className:'gwe-showcase','data-files-open':showcaseFilesOpen?'true':'false','data-look':");
replace("h('div',{className:'gwe-showcase-caption'},", "h('div',{className:'gwe-showcase-caption',inert:showcaseFilesOpen?'':undefined,'aria-hidden':showcaseFilesOpen?'true':undefined},");
replace("className:'gwe-showcase-orbit gwe-showcase-orbit-'+", "inert:showcaseFilesOpen?'':undefined,'aria-hidden':showcaseFilesOpen?'true':undefined,className:'gwe-showcase-orbit gwe-showcase-orbit-'+");
replace("h('div',{className:'gwe-showcase-tools'},", "h('div',{className:'gwe-showcase-tools',inert:showcaseFilesOpen?'':undefined,'aria-hidden':showcaseFilesOpen?'true':undefined},");
replace("data.showcaseSaving?'Saving image...':'Save image')\n          )\n        )\n      ));",`data.showcaseSaving?'Saving image...':'Save image'),
          h('button',{ref:showcaseFilesTriggerRef,id:'gwe-showcase-files-trigger',type:'button','aria-expanded':showcaseFilesOpen,'aria-controls':'gwe-showcase-files',disabled:!!data.showcaseSaving,onClick:openShowcaseFiles},'Use & export')
          )
        ),
        showcaseFilesOpen && h('div',{className:'gwe-showcase-files-backdrop',onClick:function(event){if(event.target===event.currentTarget)closeShowcaseFiles();}},
          h('section',{id:'gwe-showcase-files',className:'gwe-showcase-files',ref:showcaseFilesRef,tabIndex:-1,role:'region','aria-labelledby':'gwe-showcase-files-title',onKeyDown:function(event){event.stopPropagation();trapDialogKeys(event,closeShowcaseFiles);}},
            h('header',{className:'gwe-files-header'},
              h('div',null,h('span',{className:'gwe-files-eyebrow'},'KEEP CREATING'),h('h2',{id:'gwe-showcase-files-title'},'Use your creation'),h('p',null,(measured ? measured.count+' blocks · ' : '')+'Selected creation')),
              h('button',{type:'button',className:'gwe-files-close','aria-label':'Close import and export',onClick:closeShowcaseFiles},'×')
            ),
            h('div',{className:'gwe-files-body'},
              h('section',{className:'gwe-file-card'},
                h('div',{className:'gwe-file-heading'},fileIcon('edit'),h('h3',null,'Edit in AlloFlow')),
                h('p',null,'Keep this creation’s blocks, materials, shapes, and rotations in an editable Geometry World file.'),
                h('button',{type:'button',disabled:!!data.showcaseSaving,onClick:function(){if(saveSelectedEditableWorld(ctx))setShowcaseFileNotice('Editable creation downloaded. Open this JSON in Geometry World to build on it.');}},'Download editable JSON')
              ),
              h('section',{className:'gwe-file-card'},
                h('div',{className:'gwe-file-heading'},fileIcon('print'),h('h3',null,'Prepare a 3D print')),
                h('p',null,'STL in millimeters · '+currentPrintUnit+' mm per block. Open Print Lab to review size and printability.'),
                h('div',{className:'gwe-file-actions'},
                  h('button',{type:'button',disabled:!!data.showcaseSaving,onClick:function(){if(selectedBuildStlDownload(ctx))setShowcaseFileNotice('STL downloaded in millimeters. Import it into your slicer at 100% scale.');}},'Download STL'),
                  h('button',{type:'button',className:'gwe-file-primary',disabled:!!data.showcaseSaving,onClick:function(){openSelectedBuildInPrintLab(ctx);}},'Open in Print Lab')
                ),
                h('p',{className:'gwe-file-note'},'STL contains geometry. Choose the physical filament in Print Lab or your slicer.')
              ),
              h('section',{className:'gwe-file-card gwe-file-import'},
                h('div',{className:'gwe-file-heading'},fileIcon('open'),h('h3',null,'Open an editable model')),
                h('p',null,'Choose an AlloFlow Geometry World JSON file. Review it before replacing the current sandbox.'),
                h('button',{type:'button',disabled:editableBusy || !!data.showcaseSaving,onClick:chooseShowcaseFile},editableBusy?'Checking file...':'Choose editable JSON'),
                renderEditableRecovery()
              ),
              h('div',{className:'gwe-file-photo'},h('div',null,h('strong',null,'Keep a picture'),h('span',null,'High-resolution PNG')),
                h('button',{type:'button',disabled:!!data.showcaseSaving,'aria-busy':!!data.showcaseSaving,onClick:function(){saveShowcaseImage(ctx);}},data.showcaseSaving?'Saving image...':'Save image')
              ),
              showcaseFileNotice && h('p',{className:'gwe-file-status',role:'status','aria-live':'polite'},showcaseFileNotice)
            )
          )
        )
      ));`);
const css='.gwe-showcase-tools{width:min(430px,100%);box-sizing:border-box}.gwe-showcase-actions{display:grid;grid-template-columns:1.2fr .85fr 1fr}.gwe-showcase-actions button{min-width:0;padding:9px 8px;white-space:normal;font-size:12px}.gwe-showcase-files-backdrop{position:absolute;inset:0;z-index:5;display:flex;align-items:center;justify-content:flex-end;padding:20px;box-sizing:border-box;background:#08251d55}.gwe-showcase-files{display:flex;flex-direction:column;width:408px;max-width:100%;max-height:100%;box-sizing:border-box;border:1px solid #a5b9a7;border-radius:22px;background:#f8f6ee;color:#173b35;box-shadow:0 24px 70px #09251d55;text-shadow:none}.gwe-showcase-files:focus{outline:none}.gwe-files-header{flex-shrink:0;display:flex;align-items:flex-start;justify-content:space-between;gap:12px;padding:20px 18px 15px;border-bottom:1px solid #2b534323}.gwe-files-eyebrow{font-size:9px;font-weight:750;letter-spacing:.18em;color:#536c58}.gwe-files-header h2{margin:5px 0 4px;font-size:25px;line-height:1.15;letter-spacing:-.035em;font-weight:750}.gwe-files-header p{margin:0;color:#566c5d;font-size:12px}.gwe-showcase-files button{box-sizing:border-box;min-height:44px;padding:9px 12px;border:1px solid #9ab09d;border-radius:10px;background:#fffdf7;color:#1c4a3b;font:inherit;font-size:12px;font-weight:650;cursor:pointer}.gwe-showcase-files button:hover{background:#e5ecdd;border-color:#477858}.gwe-showcase-files button:focus-visible,.gwe-showcase-files .gwe-recovery:focus{outline:3px solid #8e6229;outline-offset:2px}.gwe-showcase-files button:disabled{opacity:.6;cursor:wait}.gwe-showcase-files .gwe-files-close{flex:0 0 44px;width:44px;padding:0;font-size:24px}.gwe-files-body{display:flex;flex-direction:column;gap:12px;min-height:0;padding:15px 18px 18px;overflow:auto;overscroll-behavior:contain;scrollbar-width:thin;scrollbar-color:#92a58e #f8f6ee}.gwe-file-card{padding:15px;border:1px solid #9db09d66;border-radius:15px;background:#fffef9}.gwe-file-heading{display:flex;align-items:center;gap:10px}.gwe-file-icon{width:27px;height:27px;flex:0 0 27px;color:#537856}.gwe-file-card h3{margin:0;font-size:15px;line-height:1.3;letter-spacing:-.015em}.gwe-file-card p{margin:9px 0 12px;color:#506858;font-size:12px;line-height:1.55}.gwe-file-card>button{width:100%}.gwe-file-actions{display:grid;grid-template-columns:1fr 1.2fr;gap:7px}.gwe-showcase-files .gwe-file-primary{background:#24533e;color:#f8f6ee;border-color:#24533e}.gwe-showcase-files .gwe-file-primary:hover{background:#33654b}.gwe-file-card .gwe-file-note{margin:9px 0 0;font-size:11px;line-height:1.5}.gwe-file-import{border-style:dashed;background:#eef1e7}.gwe-file-photo{display:flex;justify-content:space-between;align-items:center;gap:12px;padding:4px}.gwe-file-photo strong,.gwe-file-photo span{display:block;font-size:12px}.gwe-file-photo span{margin-top:4px;font-size:11px;color:#566c5d}.gwe-file-status{margin:0;padding:10px;border-radius:10px;background:#dde9d5;font-size:12px;line-height:1.5}.gwe-showcase-files .gwe-recovery{margin-top:12px;background:#f8f6ee;border-color:#9ab09d;color:#173b35}.gwe-showcase-files .gwe-recovery p,.gwe-showcase-files .gwe-recovery strong{color:#173b35}.gwe-showcase-files .gwe-recovery[data-state="error"]{background:#fff0df;border-color:#ac703c}.gwe-showcase-files .gwe-recovery-actions{display:flex;flex-wrap:wrap;gap:7px}.gwe-showcase-files .gwe-replace{background:#6a422e;color:#fff9ee;border-color:#6a422e}@media(max-width:520px){.gwe-showcase-tools{width:min(320px,100%)}.gwe-showcase-actions button{padding:8px 5px;font-size:11px}.gwe-showcase-files-backdrop{padding:10px;justify-content:center}.gwe-files-header{padding:16px 14px 12px}.gwe-files-header h2{font-size:23px}.gwe-files-body{padding:12px 14px 14px}.gwe-file-card{padding:12px}}@media(max-height:500px){.gwe-showcase-files-backdrop{padding:8px}.gwe-files-header{padding:10px 14px}.gwe-files-header h2{font-size:21px}.gwe-files-body{padding:10px 14px}}.theme-contrast .gwe-showcase-files,[data-stem-theme="contrast"] .gwe-showcase-files{background:#000;color:#fff;border:2px solid #0ff}.theme-contrast .gwe-showcase-files :is(.gwe-files-header,.gwe-files-body,.gwe-file-card,.gwe-recovery,.gwe-file-status),[data-stem-theme="contrast"] .gwe-showcase-files :is(.gwe-files-header,.gwe-files-body,.gwe-file-card,.gwe-recovery,.gwe-file-status){background:#000;color:#fff;border-color:#0ff}.theme-contrast .gwe-showcase-files :is(p,span,strong,h2,h3,svg),[data-stem-theme="contrast"] .gwe-showcase-files :is(p,span,strong,h2,h3,svg){color:#fff}.theme-contrast .gwe-showcase-files button,[data-stem-theme="contrast"] .gwe-showcase-files button{background:#000;color:#0f0;border:2px solid #0f0}';
replace("    ].join('');\n    document.head.appendChild(style);",'      ,'+JSON.stringify(css)+"\n    ].join('');\n    document.head.appendChild(style);");
s=s.replace(/\n/g,nl);for(const out of [file,'desktop/web-app/public/'+file]){const fd=fs.openSync(out,'r+');fs.writeFileSync(fd,s);fs.ftruncateSync(fd,Buffer.byteLength(s));fs.closeSync(fd);}
console.log('Added Showcase Use & export panel and shared editable import recovery.');
