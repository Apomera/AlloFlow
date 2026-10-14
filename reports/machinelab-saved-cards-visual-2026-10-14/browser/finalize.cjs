// Bind the observed native run and direct screenshot review to their exact files.
const fs=require('fs'),path=require('path'),crypto=require('crypto');
const root=path.resolve(__dirname,'../../..'),run='run-01',out=path.join(__dirname,run);
const read=name=>JSON.parse(fs.readFileSync(path.join(out,name),'utf8'));
const sha=file=>crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const write=(name,value)=>fs.writeFileSync(path.join(__dirname,name),JSON.stringify(value,null,2)+'\n');
const results=read('results.json'),native=read('native-exit.json');
if(results.errors.length||native.exitCode!==0||native.error||native.signal||!native.unchanged||results.sourceSha256!==native.frozenSourceSha256||results.scenarios!==10||results.routes.length!==6||results.shots.length!==6)throw Error('Final browser run is not successful.');
const wrapper={sessionId:53391,observedExitCode:0,source:'functions.exec/write_stdin returned exit_code 0 for wrapper session 53391',nativeReceipt:'native-exit.json'};
write(run+'/observed-wrapper-exit.json',wrapper);
const notes={
  'desktop-before-saved-cards':'Baseline has dense full calculation paragraphs for the same checked and viewed windlass records; the checked entry retains its rounded49.9W answer.',
  'desktop-saved-cards':'Cards distinguish the50W calculated value from the49.9W entered answer, and the40W viewed solution from its empty answer. Status, hints, assumptions and honest practice statements remain readable.',
  'desktop-expanded-saved-calculation':'The native disclosure opens beneath the summary values and retains the complete fixed calculation. The keyboard focus outline is visible, and all lines fit.',
  'dark-phone-saved-cards':'At320px in dark mode, calculated and entered values stack and both checked/viewed status labels stay clear. White text, card boundaries and keyboard focus remain visible.',
  'forced-colors-phone-saved-cards':'At320px with forced colors, solid and dashed status boundaries remain distinct. Cards and the native disclosure retain clear borders and a visible keyboard focus ring.',
  'large-text-phone-saved-cards':'At320px with computed saved-region text doubled, labels and assumptions wrap, the result stays readable, and content expands vertically without horizontal clipping.'
};
const images=results.shots.map(shot=>{const file=run+'/'+shot.file,hash=sha(path.join(__dirname,file));if(hash!==shot.sha256)throw Error('Changed screenshot: '+file);return{file,sha256:hash,verdict:'pass',observation:notes[shot.name]};});
write('visual-review.json',{reviewer:'saved_cards_browser',method:'Direct view_image inspection of all six PNGs from final run-01 at original resolution.',sourceSha256:results.sourceSha256,finalRun:run,nativeExitCode:0,observedOuterSession:53391,observedOuterExitCode:0,scenarios:results.scenarios,checks:results.checks.length,routes:results.routes,errors:results.errors,images,limits:['Screenshots crop the first two saved cards; the enlarged-text screenshot shows the first card. The native run asserts every saved card in each scenario.','The200%text case doubles computed font sizes inside the saved-practice region, rather than browser zoom.','Browser harness uses real React, THREE, host module and bundled production source.']});
const files=['run-native.cjs','finalize.cjs',run+'/results.json',run+'/native-exit.json',run+'/observed-wrapper-exit.json',run+'/stdout.log',run+'/stderr.log',run+'/harness-snapshot.cjs',run+'/runner-snapshot.cjs','visual-review.json',...images.map(image=>image.file),...results.exports.map(item=>run+'/'+item.file)];
write('final.json',{status:'passed',finalRun:run,sourceSha256:results.sourceSha256,baselineSha256:results.baselineSha256,checks:results.checks.length,scenarios:results.scenarios,routes:results.routes,screenshots:results.shots.length,exports:results.exports.length,errors:results.errors,observedWrapperExitCode:0,nativeExitCode:0,harness:{file:'dev-tools/ml_saved_cards_visual_qa.cjs',sha256:sha(path.join(root,'dev-tools/ml_saved_cards_visual_qa.cjs'))},artifacts:files.map(file=>({file,sha256:sha(path.join(__dirname,file))})),preservedFailedRuns:[]});
console.log(JSON.stringify({checks:results.checks.length,scenarios:results.scenarios,routes:results.routes.length,screenshots:results.shots.length,exports:results.exports.length,errors:results.errors},null,2));
