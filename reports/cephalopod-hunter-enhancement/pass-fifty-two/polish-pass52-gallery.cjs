const fs=require('fs'),path=require('path'),assert=require('assert/strict'),file=path.join(__dirname,'report-pass52.cjs');let s=fs.readFileSync(file,'utf8');
const changes=[
 ['img class="before" src="baseline-views/${id}', 'img class="before${id===\'blueRinged\'?\' portrait\':\'\'}" src="baseline-views/${id}'],
 ['img class="after" src="final-views/${id}', 'img class="after${id===\'blueRinged\'?\' portrait\':\'\'}" src="final-views/${id}'],
 ['img[hidden]{display:none}', 'img[hidden]{display:none}.picture img.portrait,.paired img.portrait{aspect-ratio:350/594;max-height:660px}'],
 ['.paired img{max-height:360px}', '.paired img{max-height:360px}.paired img.portrait{max-height:540px}'],
 ["img.alt=name+', '+label.toLowerCase()+', '+kind+' enhancement';", "img.alt=name+', '+label.toLowerCase()+', '+kind+' enhancement';img.classList.toggle('portrait',species.value==='blueRinged');"],
 ["matchedPairs:pairs,species:","matchedPairs:pairs,nativeMotion:read('native-motion-summary.json'),species:"]
];for(const [a,b]of changes){assert.ok(s.includes(a),a);s=s.replaceAll(a,b);}fs.writeFileSync(file,s);
const finalize=path.join(__dirname,'finalize-pass52.cjs');let f=fs.readFileSync(finalize,'utf8').replace("'report-pass52.cjs','prepare-pass52-preview.cjs'","'report-pass52.cjs','extract-pass52-native-views.cjs','polish-pass52-gallery.cjs','prepare-pass52-preview.cjs'");fs.writeFileSync(finalize,f);console.log({portraitAspectPreserved:true});
