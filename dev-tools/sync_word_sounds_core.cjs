// Embed the canonical core in both standalone CDN entry points: no load-order dependency.
const fs=require('node:fs');
const core=fs.readFileSync('word_sounds_core.js','utf8').trim();
const block='// BEGIN GENERATED WORD SOUNDS CORE\n'+core+'\nconst WS_CORE = createWordSoundsCore();\n// END GENERATED WORD SOUNDS CORE';
// OneDrive can reject opening an existing file for overwrite. Replace it
// atomically, retaining a recoverable original if the rename fails.
const writeAtomic = (file, content) => {
 const next = file + '.core-' + process.pid + '.next', previous = file + '.core-' + process.pid + '.previous';
 fs.writeFileSync(next, content);
 let moved = false;
 try {
  fs.renameSync(file, previous); moved = true;
  fs.renameSync(next, file);
  fs.unlinkSync(previous);
 } catch (error) {
  if (!fs.existsSync(file) && moved && fs.existsSync(previous)) fs.renameSync(previous, file);
  if (fs.existsSync(next)) fs.unlinkSync(next);
  throw error;
 }
};
for(const file of ['word_sounds_module.js','word_sounds_setup_source.jsx','word_sounds_readiness_contract.js','word_sounds_di_loader.js']){
 const source=fs.readFileSync(file,'utf8');
 const pattern=/\/\/ BEGIN GENERATED WORD SOUNDS CORE[\s\S]*?\/\/ END GENERATED WORD SOUNDS CORE/;
 const next=pattern.test(source)?source.replace(pattern,()=>block):file.endsWith('.jsx')?block+'\n'+source:/(?:readiness_contract|di_loader)\.js$/.test(file)?source.replace("  'use strict';",()=>"  'use strict';\n"+block):source.replace('    // word_sounds_module.js',()=>block+'\n    // word_sounds_module.js');
 if(process.argv.includes('--check')){if(next!==source)throw Error('Stale embedded core: '+file);}else if(next!==source)writeAtomic(file,next);
}
