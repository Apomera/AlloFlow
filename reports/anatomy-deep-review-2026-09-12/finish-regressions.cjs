const fs=require('node:fs');
let source=fs.readFileSync('stem_lab/stem_tool_anatomy.js','utf8');
source=source.replace("lungs: ['respiratory'], liver:","pharynx: ['respiratory', 'digestive'], lungs: ['respiratory'], liver:");
fs.writeFileSync('stem_lab/stem_tool_anatomy.js',source);fs.writeFileSync('desktop/web-app/public/stem_lab/stem_tool_anatomy.js',source);
let file='tests/anatomy_lab_science.test.js';let s=fs.readFileSync(file,'utf8');s=s.replace('Links below describe the selected navigation collection. or through the larger skeletal system.','Links below describe the selected navigation collection. Some involve this structure directly; others involve a wider system process.');fs.writeFileSync(file,s);
file='tests/anatomy_science_enhancements.test.js';s=fs.readFileSync(file,'utf8').replace("[26,'Bladder'","[34,'Bladder'");
s=s.replace("  it('offers both posterior organ structures",`  it('does not use the shared digestive role of the pharynx as an incorrect distractor',()=>{
    const s=session(file,{system:'respiratory',quizIdx:58});const root=s.html();
    expect(root.querySelector('[data-anatomy-quiz-panel]').textContent).toContain('Pharynx');
    expect(root.querySelector('[data-anatomy-quiz-option="digestive"]')).toBeNull();
    s.answer('respiratory');expect(s.data().quizFeedback.correct).toBe(true);
  });
  it('offers both posterior organ structures`);
fs.writeFileSync(file,s);console.log('Completed shared-pharynx membership and corrected the two regression fixtures.');
