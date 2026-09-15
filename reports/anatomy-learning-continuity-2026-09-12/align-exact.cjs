const fs=require('node:fs');let file='tests/anatomy_lab_science.test.js',s=fs.readFileSync(file,'utf8');
for(const[a,b]of [
['safeEnumMap(d._structureConfidence, knownStructureIds, CONFIDENCE_LEVELS)','anatomySharedRatings(d, knownStructureIds, Date.now())'],
['Correct — Cross-bridge cycling pulls actin past myosin','Correct — Myosin cross-bridges generate pulling force on actin'],
['Sarcomeres shorten and tendon tension rises.','Cross-bridge forces create tension; during the shortening phase of the climb, sarcomeres shorten.'],
['_regionalAtlasClinical: systemsMotionPerturbation && motionStep.id === requestedScenario.perturbation.affectedStepId','_regionalAtlasClinical: systemsMotionPerturbation && requestedScenarioId === systemsMotionScenarioId && motionStep.id === requestedScenario.perturbation.affectedStepId']]){if(!s.includes(a))throw Error(a);s=s.split(a).join(b);}fs.writeFileSync(file,s);
file='tests/anatomy_next_ui_pass.test.js';s=fs.readFileSync(file,'utf8');s=s.replace("querySelectorAll('#anatomy-mobile-activity option')).toHaveLength(9)","querySelectorAll('#anatomy-mobile-activity option')).toHaveLength(10)");fs.writeFileSync(file,s);console.log('Fixtures aligned.');
