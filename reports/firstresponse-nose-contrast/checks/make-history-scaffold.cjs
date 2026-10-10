const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),vm=require('node:vm');
const from=path.join(__dirname,'../firstresponse-face-detail-work/prepare-history.cjs'),target=path.join(__dirname,'prepare-history.cjs');
assert.ok(!fs.existsSync(target),'new history scaffold must not overwrite work');
let source=fs.readFileSync(from,'utf8');
const replacements=[
 ['8c045e6d8056e834d795ed4bfecb0418758c6a5c3e9d2ce4f05d69ec14dca940','9de34818d5428c3b453f8617c4bd5622c711fbe79acd77fd2ef4fd35119f3f76'],
 ['firstresponse_mouth_refinement_delta','firstresponse_nose_contrast_delta'],
 ['revertMouthRefinement','revertNoseContrast'],
 ['Mouth refinement','Nose contrast'],
 ["const helperFile = 'tests/helpers/firstresponse_arm_finish_delta.cjs';","const helperFile = 'tests/helpers/firstresponse_mouth_refinement_delta.cjs';"],
 ["const marker = 'function revertArmFinish(source) {';","const marker = 'function revertMouthRefinement(source) {';"],
 ['all original arm finish helper statements','all original mouth refinement helper statements'],
 ['../firstresponse-arm-finish-work/history-preservation.json','../firstresponse-face-detail-work/history-preservation.json'],
 ["assert.equal(chain.length, 11, 'eleven exact historical helper reversals');","assert.equal(chain.length, 12, 'twelve exact historical helper reversals');"],
 ['let mouth = require(helperPath);','let nose = require(helperPath);'],
 ['mouth.revertNoseContrast','nose.revertNoseContrast'],
 ['mouth = require(helperPath);','nose = require(helperPath);']
];
for(const[old,next]of replacements){assert.ok(source.includes(old),'scaffold target exists: '+old);source=source.split(old).join(next);}
new vm.Script(source,{filename:target});fs.writeFileSync(target,source);assert.equal(fs.readFileSync(target,'utf8'),source);console.log(JSON.stringify({historyScaffoldPrepared:true,sharedWrites:0,runAfterCandidateFreeze:'node prepare-history.cjs --selftest'}));
