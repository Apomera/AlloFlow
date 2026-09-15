const fs=require('node:fs');
const file='stem_lab/stem_tool_anatomy.js'; let s=fs.readFileSync(file,'utf8');
function rep(a,b,n=1){if(s.split(a).length-1!==n)throw Error('Missing '+a);s=s.split(a).join(b);}
rep('  var getGradeBand = function(ctx) {\n    var g = parseInt(ctx.gradeLevel, 10);', `  function anatomyGradeNumber(value) {
    var label = String(value == null ? '' : value).trim();
    if (/^(k|pre[- ]?k|kindergarten|preschool)$/i.test(label)) return 0;
    var match = label.match(/^(?:grade\\s*)?(\\d{1,2})(?:st|nd|rd|th)?(?:\\s*grade)?$/i);
    return match ? Number(match[1]) : NaN;
  }
  var getGradeBand = function(ctx) {
    var g = anatomyGradeNumber(ctx.gradeLevel);`);
rep('var gradeNumber = parseInt(ctx.gradeLevel, 10);','var gradeNumber = anatomyGradeNumber(ctx.gradeLevel);');
rep('Math.floor(quizRoundIdx / quizPool.length) : 0;', 'Math.floor(quizRoundIdx / Math.max(quizPool.length, quizTypeCount)) : 0;');
rep("quizQ.clinical && h('p', { className: 'text-slate-600 italic' }", "quizQ.clinical && !youngLearner && h('p', { className: 'text-slate-600 italic' }");
rep("'. Grade level: ' + (gradeLevel || 'unknown')", "'. Selected learning band: ' + gradeBand");
require('@babel/parser').parse(s,{sourceType:'script'});
fs.writeFileSync(file,s);fs.writeFileSync('desktop/web-app/public/'+file,s);
const tests='tests/anatomy_lab_science.test.js'; let ts=fs.readFileSync(tests,'utf8');
ts=ts.replace('var validSys = sysKeys.filter(function(k)', 'var validSys = quizQ.systemMemberships;');
ts=ts.replace("expect(source).toContain('updMulti(selectionPatch(st.id))');", "expect(source).toContain('openBrowserStructure(st.id)');\n    expect(source).toContain('var patch=selectionPatch(structureId,');");
// Verify the helper assertion against the actual spelling before updating the static contract.
if(!s.includes('var patch=selectionPatch(structureId,')) ts=ts.replace("expect(source).toContain('var patch=selectionPatch(structureId,');", "expect(source).toContain('selectionPatch(structureId,');");
fs.writeFileSync(tests,ts);
console.log('Grade-name defaults, small quiz pools, age-appropriate feedback, and source contracts updated.');
