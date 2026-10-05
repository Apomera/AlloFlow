'use strict';
const fs=require('fs'),path=require('path');
const root=path.resolve(__dirname,'..');
const slugs=['crew_perspective_grade6_8','crew_upstander_grade6_8','crew_attention_grade6_8','crew_halfway_grade6_8','crew_teamwork_grade6_8','crew_story_grade6_8'];
const style='Warm, simple flat educational illustration with clean rounded forms, muted coral, mustard, teal and navy on a pale warm background. A diverse middle-school cast; no faces of real people, school names, brands or logos. All papers, signs, calendars and screens have no words, letters, numerals or readable writing. No raster text, labels, captions or watermark. Native app labels will be added separately.';
for(const slug of slugs){
 const md=fs.readFileSync(path.join(root,'allopacks',slug+'.IMAGES.md'),'utf8'),assets=[];
 for(const line of md.split(/\r?\n/)){
  const m=line.match(/^\| (\S+-term-\S+) \| ([^|]+) \| ([^|]+) \| ([^|]+) \|$/);if(!m)continue;
  assets.push({id:m[1],kind:'term',term:m[2].trim(),title:m[2].trim(),prompt:`Use case: illustration-story. Asset type: square glossary concept illustration for a Grade 6–8 Crew SEL learning pack. Subject: ${m[3].trim()}. Constraints: ${m[4].trim()}. ${style}`});
 }
 for(const line of md.split(/\r?\n/)){
  const m=line.match(/^\d+\. `([^`]+)` - \*([^*]+)\* (.+) Labels: (.+)\. Caption: (.+)\.$/);if(!m)continue;
  assets.push({id:m[1],kind:'lesson',title:m[2],prompt:`Use case: illustration-story. Asset type: wide lesson panel for a Grade 6–8 Crew SEL learning pack. Scene: ${m[3]}. ${style} If the scene mentions labelled shapes, draw plain shapes with blank space for native labels. If tally marks are required, simple strokes are allowed but no numerals.`,caption:m[5]+'.',plannedLabels:m[4].split(', ').map(text=>({text})),afterType:['simplified','anchor-chart','faq'][assets.filter(a=>a.kind==='lesson').length]});
 }
 if(assets.length!==9)throw Error(slug+' has '+assets.length+' planned assets');
 const folder=path.join(root,'allopacks/media',slug);fs.mkdirSync(folder,{recursive:true});
 fs.writeFileSync(path.join(folder,'generation-plan.json'),JSON.stringify({slug,style,assets},null,2)+'\n');
}
console.log(JSON.stringify(slugs));
