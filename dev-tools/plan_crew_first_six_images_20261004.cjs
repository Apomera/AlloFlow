'use strict';
const fs=require('fs');
const slugs=['crew_norms_grade6_8','crew_repair_grade6_8','crew_zones_grade6_8','crew_system_grade6_8','crew_ask_grade6_8','crew_feedback_grade6_8'];
const prefix='Use case: illustration-story. Educational artwork for a middle-school Crew SEL pack. Warm, simple, flat illustration, muted earth palette, clean uncluttered shapes. Fictional diverse students ages 12 to 14 with respectful expressions; no real-person likenesses. No raster text, letters, numbers, labels, captions, logos, or watermarks. Any cards, pages, screens or bubbles are blank or use plain abstract bars, never readable text. ';
const all={};
for(const slug of slugs){
 const text=fs.readFileSync('allopacks/'+slug+'.IMAGES.md','utf8'),assets=[];
 for(const line of text.split('\n')){
  if(/^\| [a-z]+-term-/.test(line)){const parts=line.split('|').map(s=>s.trim());assets.push({id:parts[1],term:parts[2],kind:'term',scene:parts[3],constraints:parts[4],prompt:prefix+'Square glossary illustration. '+parts[3]+'. '+parts[4]+'.'});}
  const m=line.match(/^\d+\. `([^`]+)` - \*([^*]+)\* (.*?) Labels: (.*?)\. Caption: (.*)$/);
  if(m){let scene=m[3].replace('writing on the back of his hand','plain abstract ink bars on the back of his hand').replace('one new sentence inserted','one new abstract line of marks inserted');assets.push({id:m[1],kind:'lesson',title:m[2],scene:m[3],caption:m[5].trim(),plannedLabels:m[4].split(',').map(s=>s.trim()),prompt:prefix+'Wide landscape lesson panel. '+scene+' All labels and captions will be editable native fields outside the artwork.'});}
 }
 if(assets.length!==9)throw Error(slug+' has '+assets.length+' authored assets');
 const folder='allopacks/media/'+slug;fs.mkdirSync(folder,{recursive:true});fs.writeFileSync(folder+'/planned-assets.json',JSON.stringify({slug,sourceShotList:'allopacks/'+slug+'.IMAGES.md',assets},null,2)+'\n');all[slug]=assets;
}
console.log(JSON.stringify(all));
