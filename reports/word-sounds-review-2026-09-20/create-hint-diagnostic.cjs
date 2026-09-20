const fs=require('fs');const source=fs.readFileSync('tests/word_sounds_refinement_runtime.test.js','utf8');const head=source.slice(0,source.indexOf("describe('Word Sounds compiled pack actually played'"));
fs.mkdirSync('reports/word-sounds-review-2026-09-20',{recursive:true});
fs.writeFileSync('tests/word_sounds_analysis_diagnostic.test.js',head+`
// Temporary diagnostic: reproduces current behavior for the review.
import { writeFileSync } from 'node:fs';
it('records the current outcome after showing and hiding labels',async()=>{
 const {host,rows}=await mount('counting');
 await act(async()=>[...host.querySelectorAll('button')].find(b=>b.textContent.includes('👂')).click());
 await act(async()=>[...host.querySelectorAll('button')].find(b=>b.textContent.includes('👁️')).click());
 await act(async()=>host.querySelector('[role="button"][aria-label="Number 3"]').click());
 expect(rows).toHaveLength(1);
 writeFileSync('reports/word-sounds-review-2026-09-20/hint-toggle.json',JSON.stringify(rows[0],null,2));
 expect(rows[0]).toMatchObject({correct:true,textSupported:false,mode:'sound_only',cluesShown:[]});
});
`);
