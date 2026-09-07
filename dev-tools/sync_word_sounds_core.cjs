// Embed the canonical core in both standalone CDN entry points: no load-order dependency.
const fs=require('node:fs');
const core=fs.readFileSync('word_sounds_core.js','utf8').trim();
const block='// BEGIN GENERATED WORD SOUNDS CORE\n'+core+'\nconst WS_CORE = createWordSoundsCore();\n// END GENERATED WORD SOUNDS CORE';
for(const file of ['word_sounds_module.js','word_sounds_setup_source.jsx']){
 const source=fs.readFileSync(file,'utf8');
 const pattern=/\/\/ BEGIN GENERATED WORD SOUNDS CORE[\s\S]*?\/\/ END GENERATED WORD SOUNDS CORE/;
 const next=pattern.test(source)?source.replace(pattern,()=>block):file.endsWith('.jsx')?block+'\n'+source:source.replace('    // word_sounds_module.js',()=>block+'\n    // word_sounds_module.js');
 if(process.argv.includes('--check')){if(next!==source)throw Error('Stale embedded core: '+file);}else fs.writeFileSync(file,next);
}
