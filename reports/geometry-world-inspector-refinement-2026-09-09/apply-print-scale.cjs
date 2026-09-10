const fs=require('node:fs'),vm=require('node:vm'),crypto=require('node:crypto');
const file='stem_lab/stem_tool_geometryworld_builder.js';let text=fs.readFileSync(file,'utf8');
function replace(from,to){if(!text.includes(from))throw Error('Missing scale anchor: '+from.slice(0,100));text=text.replace(from,to);}
replace('  function compareBlocks(a, b) {',`  function setBuilderPrintScale(ctx, value) {
    // Form input is deliberately stricter than legacy scale normalization: an
    // unfinished or invalid draft must never silently change a saved scale.
    var numeric = typeof value === 'number' || (typeof value === 'string' && value.trim() !== '');
    var unitMm = numeric ? Number(value) : NaN;
    if (!isFinite(unitMm) || unitMm < 0.01 || unitMm > 1000) {
      return {ok:false,error:'Enter a scale from 0.01 to 1,000 millimeters per block.'};
    }
    patchGeometryState(ctx, {builderPrintContext:Object.assign({},printContext(ctx),{unitMm:unitMm})});
    return {ok:true,value:unitMm};
  }
  function compareBlocks(a, b) {`);
replace('    MAX_BLOCKS: MAX_BLOCKS,','    setBuilderPrintScale:setBuilderPrintScale,\n    MAX_BLOCKS: MAX_BLOCKS,');
replace('      var currentPrintUnit = printUnit(printContext(ctx).unitMm);\n','');
replace('      var hasPendingReturn = !!window.__alloGeometryWorldPendingBuild;','      var hasPendingReturn = !!window.__alloGeometryWorldPendingBuild;\n      var currentPrintUnit = printUnit(printContext(ctx).unitMm);');
replace('      var liveBuilderCtx = React.useRef(ctx); liveBuilderCtx.current = ctx;',`      var _scaleDraft=React.useState(String(currentPrintUnit)), scaleDraft=_scaleDraft[0], setScaleDraft=_scaleDraft[1];
      var _scaleError=React.useState(''), scaleError=_scaleError[0], setScaleError=_scaleError[1];
      var scaleInputRef=React.useRef(null);
      React.useEffect(function(){setScaleDraft(String(currentPrintUnit));setScaleError('');},[currentPrintUnit]);
      var liveBuilderCtx = React.useRef(ctx); liveBuilderCtx.current = ctx;`);
replace('      function returnLauncherFocus() {',`      function applyPrintScale(value) {
        var result=setBuilderPrintScale(liveBuilderCtx.current,value);
        if (!result.ok) {setScaleError(result.error);if(scaleInputRef.current)scaleInputRef.current.focus();return;}
        setScaleDraft(String(result.value));setScaleError('');
      }
      function returnLauncherFocus() {`);
replace("              h('summary', null, 'Printer profile & scale'),",`              h('summary', null, 'Adjust print size'),
              h('form',{className:'gwe-scale-editor',noValidate:true,'aria-label':'Print scale',onSubmit:function(event){event.preventDefault();applyPrintScale(scaleDraft);}},
                h('span',{className:'gwe-scale-editor-title'},'Choose a block size'),
                h('div',{className:'gwe-scale-presets',role:'group','aria-label':'Quick print scales'},
                  [5,10,20].map(function(unit){return h('button',{key:unit,type:'button','aria-label':'Use '+unit+' millimeters per block','aria-pressed':currentPrintUnit===unit,onClick:function(){applyPrintScale(unit);}},unit+' mm');})
                ),
                h('label',{htmlFor:'gwe-print-scale-value'},'Millimeters per block'),
                h('div',{className:'gwe-scale-custom'},
                  h('input',{ref:scaleInputRef,id:'gwe-print-scale-value',type:'number',inputMode:'decimal',min:0.01,max:1000,step:'any',value:scaleDraft,'aria-invalid':scaleError?'true':undefined,'aria-describedby':'gwe-print-scale-help'+(scaleError?' gwe-print-scale-error':''),onChange:function(event){setScaleDraft(event.target.value);setScaleError('');}}),
                  h('button',{type:'submit'},'Apply scale')
                ),
                h('p',{id:'gwe-print-scale-help',className:'gwe-scale-help'},'Sets the physical size of STL exports and the model sent to Print Lab.'),
                scaleError && h('p',{id:'gwe-print-scale-error',className:'gwe-scale-error',role:'alert'},scaleError)
              ),`);
replace('Reduce the build or choose a smaller scale in Print Lab.','Choose a smaller block size above, or reduce the build.');
replace("(measured ? measured.count+' blocks · ' : '')", "(measured ? measured.count+' block'+(measured.count===1?'':'s')+' · ' : '')");
const css='.gwe-scale-editor{margin:12px 0 14px;padding:12px;border:1px solid #9eb99d55;border-radius:13px;background:#123b31}.gwe-scale-editor-title{display:block;color:#e8f0dd;font-size:12px;font-weight:700;margin-bottom:8px}.gwe-scale-presets{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:6px;margin-bottom:12px}.gwe-scale-editor button{box-sizing:border-box;min-width:0;min-height:44px;padding:8px;border:1px solid #abc3a76b;border-radius:9px;background:#244b3e;color:#f3f4e9;font:inherit;font-size:12px;font-weight:650;cursor:pointer}.gwe-scale-editor button:hover{background:#355f4b}.gwe-scale-presets button[aria-pressed="true"]{background:#d7e7bf;color:#143b2c;border-color:#d7e7bf;box-shadow:inset 0 0 0 1px #a4c17d}.gwe-scale-editor label{display:block;margin-bottom:6px;color:#e8f0dd;font-size:11px;font-weight:650}.gwe-scale-custom{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:7px}.gwe-scale-custom input{box-sizing:border-box;min-width:0;width:100%;min-height:44px;padding:8px 10px;border:1px solid #b3c9ab;border-radius:9px;background:#fbfcf4;color:#183d2f;font:inherit;font-size:16px;font-variant-numeric:tabular-nums}.gwe-scale-custom input[aria-invalid="true"]{border:2px solid #f4b49c}.gwe-scale-custom button{background:#d7e7bf;color:#143b2c;border-color:#d7e7bf}.gwe-scale-editor .gwe-scale-help{margin:9px 0 0;font-size:11px;line-height:1.5;color:#c7d9c2}.gwe-scale-editor .gwe-scale-error{margin:8px 0 0;font-size:12px;color:#ffd3c2}.gwe-scale-editor :is(input,button):focus-visible{outline:3px solid #f1d094;outline-offset:2px}.theme-contrast .gwe-scale-editor,[data-stem-theme="contrast"] .gwe-scale-editor{background:#000;border:2px solid #0ff}.theme-contrast .gwe-scale-editor :is(span,label,p),[data-stem-theme="contrast"] .gwe-scale-editor :is(span,label,p){color:#fff}.theme-contrast .gwe-scale-editor :is(input,button),[data-stem-theme="contrast"] .gwe-scale-editor :is(input,button){background:#000;color:#0f0;border:2px solid #0f0}.theme-contrast .gwe-scale-presets button[aria-pressed="true"],[data-stem-theme="contrast"] .gwe-scale-presets button[aria-pressed="true"]{background:#0f0;color:#000}.theme-contrast .gwe-scale-custom input[aria-invalid="true"],[data-stem-theme="contrast"] .gwe-scale-custom input[aria-invalid="true"]{border-color:#ff0}';
replace('      ".gwe-recovery{','      '+JSON.stringify(css)+',\n      ".gwe-recovery{');
new vm.Script(text,{filename:file});
for(const dest of [file,'desktop/web-app/public/'+file]){const fd=fs.openSync(dest,'r+');fs.writeFileSync(fd,text);fs.ftruncateSync(fd,Buffer.byteLength(text));fs.closeSync(fd);}
console.log(JSON.stringify({parse:true,hash:crypto.createHash('sha256').update(text).digest('hex')}));
