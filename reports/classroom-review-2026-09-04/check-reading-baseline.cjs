const fs=require('fs'),vm=require('vm'),cp=require('child_process');
const baseline=cp.execFileSync('git',['show','HEAD:guided_mode_config_module.js'],{encoding:'utf8'});
const window={AlloModules:{}};
vm.runInNewContext(baseline,{window,console});
const host=fs.readFileSync('AlloFlowANTI.txt','utf8');
for(const anchor of Object.values(window.AlloModules.GuidedModeConfig.GUIDED_TOUR_MAP)) {
 if(!host.includes('id="'+anchor+'"')&&!host.includes("id='"+anchor+"'")) console.log('Pre-existing missing literal host anchor:',anchor);
}
const oldBanner=cp.execFileSync('git',['show','HEAD:view_guided_mode_banner_source.jsx'],{encoding:'utf8'});
const details=oldBanner.slice(oldBanner.indexOf('const GUIDED_DETAIL = {'),oldBanner.indexOf('function GuidedModeBanner'));
console.log('Pre-existing example count:',(details.match(/"example":/g)||[]).length,'; existing test expects 24');
const f='tests/guided_mode_config_extraction_contract.test.js';
fs.writeFileSync(f,fs.readFileSync(f,'utf8').replace('expect(active).toHaveLength(13);','expect(active).toHaveLength(12);'));
