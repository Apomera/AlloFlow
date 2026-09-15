const fs=require('fs'),path=require('path');const root=path.resolve(__dirname,'../..');
const read=f=>fs.readFileSync(path.join(root,f),'utf8').replace(/\r\n/g,'\n');
let tests=read('tests/applied_challenge_interaction.test.js');
if(tests.includes('caps session recovery'))throw Error('Already integrated');
fs.writeFileSync(path.join(root,'tests/applied_challenge_interaction.test.js'),tests+'\n'+fs.readFileSync(path.join(__dirname,'pass3-interactions.txt'),'utf8'));
let gen=read('generate_dispatcher_source.jsx');const anchor="              'Brief rules:',";if(!gen.includes(anchor))throw Error('Generation anchor missing');
gen=gen.replace(anchor,`              'Before returning, review task quality: could a learner meet the criteria without applying the central lesson concept? If yes, revise the deliverable or criteria to require that reasoning.',
              'Check that two defensible approaches involve a meaningful tradeoff, not just cosmetic choices. Preserve the learner\'s role in deciding and framing.',
              'Check that creating AND checking the product fits the supplied time and materials. When these are unspecified, use a bounded paper-based comparison or plan and label unresolved feasibility questions; do not assume purchases, outside access, experiments, or recruitment.',
${anchor}`.replace("learner's", "learner\\'s"));
fs.writeFileSync(path.join(root,'generate_dispatcher_source.jsx'),gen);fs.writeFileSync(path.join(root,'desktop/web-app/src/generate_dispatcher_source.jsx'),gen);
let doc=read('doc_pipeline_source.jsx');
const docAnchor="          const feedbackHtml = fb ? '<section class=\"ace-panel ace-feedback\"><h3 class=\"ace-h3\">' + esc(L.feedback) + '</h3>'";
if(!doc.includes(docAnchor))throw Error('Document feedback anchor missing');
doc=doc.replace(docAnchor,docAnchor+"\n              + pre(typeof challengeApi?.coverageText === 'function' ? challengeApi.coverageText(fb.coverage, t) : tx('applied_challenge.coverage.unknown', 'The input coverage of this older feedback was not recorded.'))");
fs.writeFileSync(path.join(root,'doc_pipeline_source.jsx'),doc);
console.log('Integrated pass 3 regressions, generation guidance and export disclosure.');
