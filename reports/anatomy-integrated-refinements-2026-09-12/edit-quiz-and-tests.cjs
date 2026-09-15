const fs=require('fs');let s=fs.readFileSync('stem_lab/stem_tool_anatomy.js','utf8');
s=s.replace("((quizSeed((seed || d._quizSeed || 'practice-v3')+'|'+quizQuestionContext+'|'+index) >>> 16) & 1) === 0","quizBinaryTruth(index,seed)");
s=s.replace("((quizSeed('practice-v3|'+quizQuestionContext+'|'+quizRoundIdx) >>> 16) & 1) === 0","quizBinaryTruth(quizRoundIdx)");
s=s.replace('        function quizQuestionSnapshot(index, pool, seed) {',`        function quizBinaryTruth(index,seed) {
          var binaryIndex=Math.floor(index/4),block=Math.floor(binaryIndex/8);
          return stableQuizShuffle([true,true,true,true,false,false,false,false],(seed||d._quizSeed||'practice-v3')+'|'+quizQuestionContext+'|truth|'+block)[binaryIndex%8];
        }
        function quizQuestionSnapshot(index, pool, seed) {`);
fs.writeFileSync('stem_lab/stem_tool_anatomy.js',s);fs.writeFileSync('desktop/web-app/public/stem_lab/stem_tool_anatomy.js',s);
function edit(file,pairs){let t=fs.readFileSync(file,'utf8');for(const [a,b]of pairs){if(!t.includes(a))throw Error(file+': '+a.slice(0,80));t=t.replaceAll(a,b);}fs.writeFileSync(file,t);}
edit('tests/anatomy_learning_reliability.test.js',[
 ['return { data: () => data.anatomy, announcements, button, html,','return { data: () => data.anatomy, announcements, button, html, captureQuestion: () => find(render(), n => n.props?.[\'data-anatomy-quiz-panel\']).props.ref({}),'],
 ['for (const [index, correctId] of','for (const [index, expectedId] of'],
 ['const s = session(file, { quizIdx: index });','const s = session(file, { quizIdx: index }); s.captureQuestion();\n          const correctId=index%4===1?(s.data()._quizQuestion.binaryTrue?\'true\':\'false\'):expectedId;']
]);
edit('tests/anatomy_lab_science.test.js',[
 ["'Score 7 - Question 7/19'","'Continuous practice · 7 correct / 7 answered · Question 26'"],
 ["'quizPool[quizRoundIdx % quizPool.length]'","'var quizQ2 = quizQ;'"],
 ["'_quizAttempts: quizAttempts + 1'","'_quizAttempts:attempts+1'"],
 ["'alternates True/False claims across successive True/False rounds'","'keeps True/False claims independent of fixed round parity'"],
 ["expect(source).toContain('Math.floor(quizRoundIdx / quizTypeCount) % 2');","expect(source).not.toContain('Math.floor(quizRoundIdx / quizTypeCount) % 2');\n    expect(source).toContain('binaryTrue: quizBinaryTruth(index,seed)');"],
 ["'updMulti(Object.assign(quizPatch, confidenceEvidencePatch(quizQ.id, correct)));'","'confidenceEvidencePatch(quizQ.id,correct,state)'"],
 ['"updMulti({ quizIdx: 0, quizScore: 0, quizFeedback: null, _quizAttempts: 0, _quizQuestion: quizQuestionSnapshot(0, rankedQuizPool) })"','"quizIdx:0,quizScore:0,quizFeedback:null,_quizAttempts:0,_quizSeed:seed"'],
 ["'Question 1/19'","'Question 1'"],
 ["'Array.isArray(d.vocabLookedUp)'","'normalizeVocabulary(d.vocabLookedUp)'"],
 ["'Score 0 - Question 1/19'","'Continuous practice · 0 correct / 0 answered · Question 1'"],
 ["'var quizPatch = {'","'var quizPatch={'"],
 ["'_totalCorrect = totalCorrect + 1'","'_totalCorrect=priorCorrect+1'"],
 ["Links below describe the selected navigation collection. Some involve this structure directly; others involve a wider system process.","These links connect the selected structure with an authored body-system process."]
]);
let test=fs.readFileSync('tests/anatomy_lab_science.test.js','utf8');const begin=test.indexOf("it('builds an accessible structure-centered relationship map'"),end=test.indexOf("it('does not render a relationship map",begin);test=test.slice(0,begin)+test.slice(begin,end).replaceAll('skull','femur')+test.slice(end);fs.writeFileSync('tests/anatomy_lab_science.test.js',test);
edit('tests/anatomy_mobile_a11y_polish.test.js',[
 ['source.slice(start, start + 1600)','source.slice(start, source.indexOf("function ", start + 10))'],
 ['"\'text-[0.6875rem] text-rose-700 italic leading-relaxed\'"',"'.anatomy-clinical-note{padding:12px;border:1px solid #cbd5e1;border-radius:10px;background:#f8fafc;color:#334155'"],
 ["root.querySelector('.anatomy-structure-detail p.text-rose-700')","root.querySelector('.anatomy-structure-detail .anatomy-clinical-note')"]
]);
