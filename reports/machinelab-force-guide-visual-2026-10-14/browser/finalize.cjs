// Bind the observed native run and direct screenshot review to their exact files.
const fs=require('fs'),path=require('path'),crypto=require('crypto');
const root=path.resolve(__dirname,'../../..'),run='run-01',out=path.join(__dirname,run);
const read=name=>JSON.parse(fs.readFileSync(path.join(out,name),'utf8'));
const sha=file=>crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const write=(name,value)=>fs.writeFileSync(path.join(__dirname,name),JSON.stringify(value,null,2)+'\n');
const results=read('results.json'),native=read('native-exit.json');
if(results.errors.length||native.exitCode!==0||native.error||native.signal||!native.unchanged||results.sourceSha256!==native.frozenSourceSha256||results.scenarios!==11||results.routes.length!==6||results.shots.length!==6)throw Error('Final browser run is not successful.');
const wrapper={sessionId:88036,observedExitCode:0,source:'functions.exec/write_stdin returned exit_code 0 for wrapper session 88036',nativeReceipt:'native-exit.json'};
write(run+'/observed-wrapper-exit.json',wrapper);
const notes={
  'desktop-before-force-guide':'Baseline shows the same windlass quantities with smaller headings, readings and equations; input/output patterns are present only in the bars and explanatory text.',
  'desktop-force-guide':'Input and useful-output sections have clear headings and matching solid/striped swatches. All six values fit, equations are prominent, and power results are emphasized while paired bars retain matching track lengths.',
  'intermediate-force-guide':'At the 600px viewport, all three cards stack in each section. The sub-one lever correctly shows larger input force and smaller hand speed; the output bars reverse that ordering with aligned zero origins.',
  'dark-phone-force-guide':'At 320px in dark mode, the screw values and equations wrap within the cards. Solid and striped keys match the bars, including the correctly tiny effort-force and load-speed bars.',
  'forced-colors-phone-force-guide':'At 320px with forced colors, section and card boundaries remain visible. Solid black input and striped useful output remain distinct in both heading swatches and quantitative bars.',
  'large-text-phone-force-guide':'At 320px with guide text doubled, headings, values, units, equations and explanatory text wrap in reading order. The region expands vertically with no horizontal clipping; numerical bar proportions remain unchanged.'
};
const images=results.shots.map(shot=>{const file=run+'/'+shot.file,hash=sha(path.join(__dirname,file));if(hash!==shot.sha256)throw Error('Changed screenshot: '+file);return{file,sha256:hash,verdict:'pass',observation:notes[shot.name]};});
write('visual-review.json',{reviewer:'force_guide_browser',method:'Direct view_image inspection of all six PNGs from final run-01, requesting original resolution.',sourceSha256:results.sourceSha256,finalRun:run,nativeExitCode:0,observedOuterSession:88036,observedOuterExitCode:0,scenarios:results.scenarios,checks:results.checks.length,routes:results.routes,errors:results.errors,images,limits:['Screenshots crop the complete force-speed guide, not the whole application. All six station routes receive numeric, bar-geometry, semantic, visual-style and keyboard-navigation assertions.','The enlarged-text case doubles computed font sizes inside the guide rather than browser zoom; the 264 by 4631px image was resized for display by the image tool.','Browser harness uses real React, THREE, host module and bundled production source. No production edits were made during the native run.']});
const files=['run-native.cjs','finalize.cjs',run+'/results.json',run+'/native-exit.json',run+'/observed-wrapper-exit.json',run+'/stdout.log',run+'/stderr.log',run+'/harness-snapshot.cjs',run+'/runner-snapshot.cjs','visual-review.json',...images.map(image=>image.file)];
write('final.json',{status:'passed',finalRun:run,sourceSha256:results.sourceSha256,baselineSha256:results.baselineSha256,checks:results.checks.length,scenarios:results.scenarios,routes:results.routes,screenshots:results.shots.length,errors:results.errors,observedWrapperExitCode:0,nativeExitCode:0,harness:{file:'dev-tools/ml_force_guide_visual_qa.cjs',sha256:sha(path.join(root,'dev-tools/ml_force_guide_visual_qa.cjs'))},artifacts:files.map(file=>({file,sha256:sha(path.join(__dirname,file))})),preservedFailedRuns:[]});
console.log(JSON.stringify({checks:results.checks.length,scenarios:results.scenarios,routes:results.routes.length,screenshots:results.shots.length,errors:results.errors},null,2));
