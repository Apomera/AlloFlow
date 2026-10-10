const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const previous=path.join(__dirname,'../firstresponse-support-fit-work');
const beforeSHA='69d2407c26ddf3e3c5d7ee112622d0dab8613926e34b7d61af9f2e17f1317242';
let snapshot=fs.readFileSync(path.join(previous,'snapshot-history.cjs'),'utf8').replaceAll('164407bb58546fc91584761e51e9a907d2eacd33442a0a5fae31da0c22ef37c0',beforeSHA);
fs.writeFileSync(path.join(__dirname,'snapshot-history.cjs'),snapshot);
let prepare=fs.readFileSync(path.join(previous,'prepare-history.cjs'),'utf8');
prepare=prepare.replaceAll('164407bb58546fc91584761e51e9a907d2eacd33442a0a5fae31da0c22ef37c0',beforeSHA)
  .replaceAll('firstresponse_support_frame_delta','firstresponse_patient_wrist_finish_delta')
  .replaceAll('revertSupportFrame','revertPatientWristFinish')
  .replaceAll('Support frame','Patient wrist finish')
  .replaceAll('firstresponse_nose_contour_delta','firstresponse_support_frame_delta')
  .replaceAll('revertNoseContour','revertSupportFrame')
  .replaceAll('nose-contour helper','support-frame helper')
  .replace('../firstresponse-nose-contour-work/history-preservation.json','../firstresponse-support-fit-work/history-preservation.json')
  .replace("assert.equal(chain.length, 18, 'eighteen exact historical helper reversals');","assert.equal(chain.length, 19, 'nineteen exact historical helper reversals');");
assert.ok(prepare.includes("const marker = 'function revertSupportFrame(source) {';"));
assert.ok(prepare.includes("source = require('./firstresponse_patient_wrist_finish_delta.cjs').revertPatientWristFinish(source);"));
new Function(snapshot);new Function(prepare);
fs.writeFileSync(path.join(__dirname,'prepare-history.cjs'),prepare);
console.log(JSON.stringify({prepared:true,sharedWrites:0}));
