import fs from 'node:fs';
import { describe,expect,it } from 'vitest';
import { loadTool,renderTool,resetStemLab } from './helpers/stem_widgets_smoke_harness.js';
const table=JSON.parse(fs.readFileSync('dev-tools/i18n/handtl_anatomy_enhancements_20260912.json','utf8'));
const english=JSON.parse(fs.readFileSync('dev-tools/i18n/stem_anatomy_en.json','utf8'));
const placeholders=s=>[...s.matchAll(/\{\w+\}/g)].map(m=>m[0]).sort();
describe('Anatomy enhancement localization',()=>{
for(const [language,dictionary] of Object.entries(table)){
  it(`ships complete matching ${language} labels with safe placeholders`,()=>{
    for(const prefix of ['','desktop/web-app/public/']){const shipped=JSON.parse(fs.readFileSync(prefix+'lang/'+language+'.js','utf8')).stem.anatomy;for(const [key,value] of Object.entries(dictionary)){expect(shipped[key],key).toBe(value);expect(placeholders(value),key).toEqual(placeholders(english[key]));}}
  });
  it(`renders the ${language} prediction, result, and explanatory labels`,()=>{
    resetStemLab();loadTool('stem_lab/stem_tool_anatomy.js','anatomy');const t=(key,fallback)=>dictionary[key.slice(13)]||fallback;
    const root=document.createElement('div');root.innerHTML=renderTool('anatomy',{anatomy:{_activeTab:'homeoHunt',complexity:3,_feedbackExperiment:{direction:'cool',prediction:'active',revealed:true}}},{t});
    expect(root.querySelector('#anatomy-mobile-activity option:checked').textContent).toBe(dictionary.activity_homeo);
    expect(root.querySelector('#anatomy-feedback-title').textContent).toBe(dictionary.feedback_title);
    expect(root.querySelector('[data-anatomy-feedback-results]').textContent).toContain(dictionary.feedback_cool_mechanism);
    expect(root.querySelector('[data-anatomy-feedback-results]').textContent).not.toContain('undefined');
  });
}
});
