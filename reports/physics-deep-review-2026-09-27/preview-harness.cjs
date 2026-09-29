// Shared local physics report fixture. Load this prelude in the audit VM.
const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
const read=file=>fs.readFileSync(file,'utf8');
const gate=read('dev-tools/check_stem_layout_defects.cjs');
let shell=gate.slice(gate.indexOf('const SHELL = `')+15,gate.indexOf('`;\n',gate.indexOf('const SHELL = `')));
shell=shell.replace('var init = {}; init[id] = state || {};','var init = state || {};');
shell=shell.replace('var ctx = {','window.__reviewState = pair[0]; var ctx = {');
shell=shell.replace('t: function (k, fb) {','t: function (k, fb) { var translated=k.split(".").reduce(function(o,p){return o&&o[p];},window.__strings); if(typeof translated==="string")return translated;');
const styles=read('app_styles_module.js');
const start=styles.indexOf(':root, .theme-default {');
const contrast=styles.indexOf('.theme-contrast {',start);
const palette=styles.slice(start,styles.indexOf('}',styles.indexOf('--allo-stem-button-border',contrast))+1);
const script=source=>'<script>'+source.replace(/<\/script/gi,'<\\/script')+'</script>';
const tools=[{file:'physics',id:'physics'}];
function html(tool,theme='default') {
  return '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>'+tool.file+' preview</title><style>'+read('reports/physics-deep-review-2026-09-27/preview-tailwind.css')+palette+'</style></head><body style="margin:0;font-family:system-ui"><main id="slot" style="padding:12px" data-stem-theme="'+theme+'" class="theme-'+theme+'"></main>'+script('window.__strings='+read('ui_strings.js')+';')+
    ['desktop/web-app/node_modules/react/umd/react.production.min.js','desktop/web-app/node_modules/react-dom/umd/react-dom.production.min.js','stem_lab/stem_lab_module.js','stem_lab/stem_tool_'+tool.file+'.js','app_styles_module.js'].map(file=>script(read(file))).join('')+
    script('const styleHost=document.createElement("div");document.body.appendChild(styleHost);ReactDOM.createRoot(styleHost).render(React.createElement(window.AlloModules.AppStyles.AppStyles,{}));')+
    script(shell)+script('window.__mount('+JSON.stringify(tool.id)+','+(theme==='dark')+',{},'+(theme==='contrast')+');')+'</body></html>';
}
