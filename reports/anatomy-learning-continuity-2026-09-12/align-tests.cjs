const fs=require('node:fs');
function edit(file,changes){let s=fs.readFileSync(file,'utf8');for(const[a,b]of changes){if(!s.includes(a))throw Error('Missing '+a);s=s.split(a).join(b);}fs.writeFileSync(file,s);}
edit('tests/anatomy_lab_science.test.js',[
['safeEnumMap(d._structureConfidence, knownStructureIds, CONFIDENCE_LEVELS)','anatomySharedRatings(d, knownStructureIds, Date.now())'],
['Cross-bridge cycling pulls actin past myosin, shortening sarcomeres and generating tension.','Myosin cross-bridges generate pulling force on actin. An active muscle can generate tension while shortening, holding its length, or lengthening.'],
['Sarcomeres shorten and tendon tension rises.','Cross-bridge forces create tension; during the shortening phase of the climb, sarcomeres shorten.'],
['_regionalAtlasClinical: systemsMotionPerturbation && motionStep.id === requestedScenario.perturbation.affectedStepId','_regionalAtlasClinical: systemsMotionPerturbation && requestedScenarioId === systemsMotionScenarioId && motionStep.id === requestedScenario.perturbation.affectedStepId']]);
edit('tests/anatomy_next_ui_pass.test.js',[["querySelectorAll('#anatomy-mobile-activity option')).toHaveLength(9)","querySelectorAll('#anatomy-mobile-activity option')).toHaveLength(10)"]]);
console.log('Updated obsolete science copy and activity-count fixtures.');
