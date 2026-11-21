'use strict';const special=require('../special_education_5355/item_content.cjs'),reading=require('../teaching_reading_5205/item_content.cjs'),core=require('../praxis_core_5752/item_content.cjs'),readingOverrides=require('./reading_overrides.cjs');
const ETS='https://praxis.ets.org/on/demandware.static/-/Library-Sites-ets-praxisLibrary/default/pdfs/5383.pdf',EXAM='https://praxis.ets.org/test/special-education-teaching-students-with-learning-disabilities-5383.html',IDEA='https://sites.ed.gov/idea/regs/b/d/300.309',IES_READ='https://ies.ed.gov/ncee/wwc/PracticeGuide/29',IES_MATH='https://ies.ed.gov/ncee/wwc/PracticeGuide/26';
const domains={development:['development-characteristics-learning-disabilities','Development and Characteristics of Students with Learning Disabilities'],planning:['planning-managing-learning-environment','Planning and Managing the Learning Environment'],instruction:['instruction','Instruction'],identification:['identification-eligibility-placement','Identification, Eligibility, and Placement'],professional:['foundations-professional-responsibilities','Foundations and Professional Responsibilities']};
const adapt=v=>String(v).replace(/babyish/gi,'age-inappropriate').replace(/low functioning/gi,'described only by a global support-needs label').replace(/disability category/gi,'individual learning profile').replace(/student with a disability/gi,'student with a learning disability').replace(/learners? with disabilities/gi,'students with learning disabilities');
const lowerFirst=v=>String(v).replace(/^./,c=>c.toLowerCase());
function composePrompt(lead,raw,strip=[]){let body=adapt(raw).trim();for(const pattern of strip)body=body.replace(pattern,'');return lead+lowerFirst(body)}
function qs(id,parts,leadA,leadB,options={}){const{stripA=[],stripB=[],overrideA={},overrideB={},variantA={},variantB={}}=options;const bankOv=readingOverrides[id]||{};return parts.flatMap(([src,b,a,z])=>src[b].questions.slice(a,z)).map((q,index)=>{const ov=bankOv[index]||{},a=variantA[index]||{},b=variantB[index]||{},baseCorrect=ov.correct||q.correct,baseDistractors=ov.distractors||q.distractors,baseNotes=ov.distractorNotes||q.distractorNotes,rationale=adapt(ov.rationale||q.rationale)+' For 5383 preparation, connect the response to the learner’s uneven skill profile, explicit and systematic instruction, appropriate access, culturally and linguistically responsive evidence, and observable progress rather than assuming that a learning-disability label predicts performance.';const coreVarB=q.variantB&&!b.correct?q.variantB:null;return{...q,promptA:a.prompt||overrideA[index]||composePrompt(leadA,q.promptA,stripA),promptB:b.prompt||overrideB[index]||composePrompt(leadB,q.promptB,stripB),correct:adapt(baseCorrect),distractors:baseDistractors.map(adapt),rationale,distractorNotes:Array.isArray(baseNotes)?baseNotes.map(adapt):undefined,difficulty:q.difficulty||'application',...(a.correct?{correctA:adapt(a.correct),distractorsA:a.distractors.map(adapt),rationaleA:adapt(a.rationale),distractorNotesA:a.distractorNotes.map(adapt)}:{}),...(b.correct?{correctB:adapt(b.correct),distractorsB:b.distractors.map(adapt),rationaleB:adapt(b.rationale),distractorNotesB:b.distractorNotes.map(adapt)}:(coreVarB?{correctB:adapt(coreVarB.correct),distractorsB:coreVarB.distractors.map(adapt),rationaleB:adapt(coreVarB.rationale),distractorNotesB:coreVarB.distractorNotes.map(adapt)}:{}))}})}
function bank(id,n,key,label,parts,a,b,refs=[],options={}){const[domainId,domain]=domains[key];return{id,chapterId:'ld5383-ch-'+String(n).padStart(2,'0'),domainId,domain,label,references:[ETS,EXAM,IDEA,...refs],questions:qs(id,parts,a,b,options)}}
const coexistingA={
0:'A student with a specific learning disability reads grade-level text accurately but cannot organize written paragraphs. Which response is best?',
1:'A student with a learning disability and autism covers their ears during fire-drill announcements and then misses directions. Which support is most responsive?',
2:'A student with a learning disability and ADHD begins work when directions are chunked and a checklist is visible. What does this pattern suggest?',
3:'A student with a learning disability and an emotional or behavioral disability argues mainly during unpredictable peer-group tasks. What perspective is most useful?',
4:'When a team must distinguish a specific learning disability from broader intellectual and adaptive needs, which evidence is essential?',
5:'A student with a learning disability understands grade-level ideas but has difficulty producing clear speech. What is the most appropriate instructional assumption?',
6:'A student with a learning disability also has visual and motor disabilities. How should the team plan access?',
7:'A student with dyslexia reads familiar words from memory but struggles to decode new words. Which instruction most directly addresses the need?'};
const coexistingB={
0:'A learner with a specific learning disability calculates accurately but has persistent difficulty decoding unfamiliar words. What should guide support?',
1:'A learner with a learning disability and autism becomes distressed when a loud timer signals transitions. What is the best initial support?',
2:'A learner with a learning disability and ADHD completes projects with interim deadlines but misses work when given one distant due date. Which interpretation is best?',
3:'A learner with a learning disability and an emotional or behavioral disability withdraws during competitive activities but participates during structured cooperative routines. What should the team examine?',
4:'When a team must distinguish a specific learning disability from broader intellectual and adaptive needs, which evidence is most central?',
5:'A learner with a learning disability uses an AAC system and needs extra response time during discussion. Which teacher response is best?',
6:'A student with a learning disability has hearing, mobility, and health-related needs that interact during laboratory work. What is the best approach?',
7:'A learner with a learning disability has persistent word-reading difficulty and guesses unfamiliar words from pictures and first letters. What is the strongest instructional focus?'};
const coexistingVariantA={
3:{
prompt:'A student with a learning disability argues mainly during unpredictable peer-group reading tasks but participates when roles and steps are explicit. What perspective is most useful?',
correct:'Analyze interactions among literacy demands, peer roles, expectations, supports, and consequences across contexts.',
distractors:[
'Expect the same level of arguing across every academic period because the behavior reflects an internal trait.',
'Conclude that classmates’ reading habits directly caused the student’s underlying specific learning disability.',
'Replace all collaborative peer-group literacy routines with isolated individual seatwork for the school year.',
],
rationale:'An ecological and instructional analysis uses the contrast between routines to identify barriers, teach participation and self-advocacy strategies, clarify roles, and monitor both literacy access and behavior.',
distractorNotes:[
'Treating arguing as invariant across classes ignores the student’s documented engagement when peer roles and task steps are explicit.',
'Peer social interactions do not cause a neurobiological learning disability, and blaming classmates misses modifiable instructional and structural supports.',
'Eliminating collaborative literacy permanently restricts inclusive peer learning instead of teaching clear roles, scaffolds, and participation routines.',
],
},
4:{
prompt:'Which evidence best identifies an individualized learning-disability profile for instructional planning?',
correct:'Multiple measures of academic skills, error patterns, language context, instruction, response data, and strengths.',
distractors:[
'A single low standardized reading comprehension score collected during one fall screening administration.',
'General impressions of physical appearance paired with family medical records from early childhood visits.',
'One general education teacher’s classroom expectations reviewed without student work samples or progress data.',
],
rationale:'Instructional planning for a learning disability uses converging, culturally and linguistically responsive evidence to identify specific strengths, needs, error patterns, access barriers, and response to explicit instruction.',
distractorNotes:[
'A single low reading score cannot map an uneven learning-disability profile, rule out language or instructional factors, or identify error patterns.',
'Physical appearance and early medical records do not document current academic skill patterns, instructional history, or response to targeted teaching.',
'One teacher’s informal expectations lack objective work samples, error analysis, and cross-setting evidence required for individualized planning.',
],
}};
const coexistingVariantB={
3:{
prompt:'A student with a learning disability withdraws during timed competitive reading but engages during structured cooperative reading. What should the team examine?',
correct:'Compare task demands, time pressure, peer structure, skill access, learner input, and supports across both routines.',
distractors:[
'Treat task withdrawal as a fixed, unchangeable characteristic associated with the student’s learning-disability label.',
'Discontinue all partner and small-group reading routines so the student completes every literacy task alone.',
'Assign a loss-of-privilege behavior consequence without examining time pressure or reading access barriers.',
],
rationale:'Contrasting routines help the team identify the conditions affecting participation. The next step is to analyze skill and context data, provide explicit access and coping supports, and monitor whether engagement and literacy outcomes improve.',
distractorNotes:[
'Assuming withdrawal is fixed by the eligibility label ignores clear evidence that the student participates actively during structured cooperative reading.',
'Ending all peer reading removes valuable collaborative literacy models and belonging when adjusting time pressure and roles can restore participation.',
'Using punitive classroom consequences before analyzing timed-task pressure misreads an instructional reading-access barrier as deliberate student noncompliance.',
],
},
4:{
prompt:'After one low reading score, a team suspects a learning disability. What additional evidence is most important before planning instruction?',
correct:'Skill and error analysis, language context, instructional history, progress data, strengths, and multi-task evidence.',
distractors:[
'Re-administering the identical standardized reading test repeatedly without examining underlying error patterns.',
'Selecting an instructional eligibility label based primarily on informal visual impressions and past report cards.',
'Relying on one teacher’s classroom pacing expectations without reviewing authentic student work or progress probes.',
],
rationale:'A defensible instructional decision requires multiple sources that clarify the learner’s specific academic pattern and response to instruction. The team should not convert one score or impression into a global assumption.',
distractorNotes:[
'Repeating one total score without diagnostic error analysis fails to show whether the barrier involves decoding, fluency, vocabulary, language, or comprehension.',
'Informal visual impressions and summary report-card grades cannot substitute for culturally responsive, multi-source academic and instructional-response evidence.',
'Using one teacher’s pacing expectations without direct student work samples or progress data misses the specific strengths and skill gaps needed for planning.',
],
}};
const accessA={
0:'A student with a learning disability and low vision receives a worksheet containing a dense, unlabeled diagram. What is the best access response?',
1:'A student with a learning disability who is deaf uses sign language and will join a fast-paced seminar. Which plan best supports communication access?',
2:'A student with a learning disability and a physical disability needs support positioning materials during science lab. What is the teacher’s best action?',
3:'A student with a learning disability has a documented seizure action plan. During a classroom seizure, what should staff do first?',
4:'When a documented individualized need includes adaptive behavior, which IEP goal is most useful?'};
const accessB={
0:'A learner with a learning disability who is blind is assigned a graph available only as a small image. What should the team provide?',
1:'A hard-of-hearing student with a learning disability is entering a discussion-heavy class. What should the IEP team consider?',
2:'A learner with a learning disability and limited motor control cannot safely reach equipment in a standard workstation. Which response is best?',
3:'A learner with a learning disability and a health condition experiences the event described in the school emergency plan. What is the correct response?',
4:'When a documented individualized need includes practical daily functioning, which target is most appropriate?'};
const iepA={
3:'While developing an individualized program for a student with a learning disability, the learner’s goal targets independent paragraph planning, but the service description addresses only oral reading. What should the team do?',
4:'While developing an individualized program for a student with a learning disability, the learner may use a calculator on a test that measures multistep problem solving rather than computation. This is best described as what?',
5:'During IEP development for a student with a learning disability, when should the team consider assistive technology?',
7:'While developing an individualized program for a student with a learning disability, the learner can make progress in general education with supplementary aids, but scheduling would be easier in a separate class. What should govern placement?'};
const literacyA={
9:'During explicit literacy instruction for a student with a learning disability, what combination of supports best promotes engagement with grade-level text?'};
const literacyB={
9:'A capable student with a learning disability avoids reading because assigned texts feel irrelevant and successful reading is rare. Which response best supports engagement while preserving meaningful literacy instruction?'};
const writingB={
1:'When teaching a recursive writing process to a student with a learning disability, the learner has strong ideas but writes little because spelling and handwriting are effortful. What should the teacher examine?',
7:'When teaching a recursive writing process to a student with a learning disability, the learner inserts quotations but does not connect them to a claim. What feedback is most useful?'};
const collaborationA={
3:'During collaborative planning for a student with a learning disability, an occupational therapist recommends a classroom positioning support. How should the teacher proceed?'};
module.exports=[
bank('development-variability-context',1,'development','Development, Variability, Language, and Context',[[special,0,0,9]],'When interpreting a student’s uneven learning profile, ','When distinguishing a learning difference from a learning disability, '),
bank('ld-characteristics-coexisting-needs',2,'development','Learning-Disability Characteristics and Coexisting Needs',[[special,1,0,8]],'','',[],{overrideA:coexistingA,overrideB:coexistingB,variantA:coexistingVariantA,variantB:coexistingVariantB}),
bank('individualized-curriculum-planning',3,'planning','Individualized Curriculum, IEP Goals, and Accessible Resources',[[special,3,0,11]],'While developing an individualized program for a student with a learning disability, ','When aligning present levels, measurable goals, services, and curriculum access, ',[],{stripA:[/^during IEP development,\s*/i],overrideA:iepA}),
bank('positive-environment-self-regulation',4,'planning','Positive Learning Environments, Self-Regulation, and Behavior',[[special,5,0,10]],'In an inclusive class serving students with learning disabilities, ','When planning a safe, equitable, predictable learning environment, '),
bank('adaptive-technology-routines',5,'planning','Assistive Technology, Adaptive Access, and Learning Routines',[[special,2,0,5]],'','',[],{overrideA:accessA,overrideB:accessB}),
bank('structured-literacy-comprehension',6,'instruction','Structured Literacy, Fluency, Vocabulary, and Comprehension',[[reading,2,0,9],[reading,7,0,1]],'During explicit, systematic word-reading intervention for a student with a learning disability, ','When progress data identify a specific word-reading barrier, ',[IES_READ],{stripA:[/^during systematic K[–-]6 phonics instruction,\s*/i],stripB:[/^during (?:explicit K-6 decoding and word-analysis instruction|an explicit upper-elementary decoding lesson|a recursive decoding lesson),\s*/i],overrideA:literacyA,overrideB:literacyB}),
bank('written-expression-spelling',7,'instruction','Written Expression, Spelling, Sentence Construction, and Revision',[[reading,10,0,8]],'During explicit written-expression instruction for a student with a learning disability, ','When teaching a recursive writing process to a student with a learning disability, ',[IES_READ],{stripA:[/^during elementary writing instruction connected to reading,\s*/i],stripB:[/^while teaching a recursive writing process,\s*/i],overrideB:writingB}),
bank('mathematics-intervention-strategies',8,'instruction','Mathematics Concepts, Procedures, Problem Solving, and Strategy Instruction',[[core,6,0,7],[core,7,0,3]],'While diagnosing a student’s mathematics strategy and selecting a worked example, ','During explicit mathematics intervention with representations and guided practice, ',[IES_MATH]),
bank('evaluation-identification-placement',9,'identification','Evaluation, Identification, Eligibility, and Placement',[[special,6,0,8],[special,7,0,4]],'When evaluating possible learning disabilities, ','When an eligibility team interprets multiple sources and rules out alternative explanations, '),
bank('law-ethics-nondiscrimination',10,'professional','Law, Ethics, Nondiscrimination, and Educational Rights',[[special,9,0,7]],'When applying educational rights for students with learning disabilities, ','When checking an ethical, legal, or equitable special-education decision, '),
bank('family-school-collaboration',11,'professional','Family, General-Education, Specialist, and Community Collaboration',[[special,10,0,6]],'During collaborative planning for a student with a learning disability, ','When coordinating family, general-education, specialist, and community knowledge, ',[],{stripA:[/^in effective co-teaching,\s*/i],overrideA:collaborationA}),
bank('professional-practice-advocacy',12,'professional','Professional Learning, Advocacy, Supervision, and Boundaries',[[special,11,0,4]],'','When an educator advocates within professional scope and current requirements, ',[],{overrideA:{
0:'After finishing an instructional literacy unit for students with learning disabilities, which reflection question is most useful?',
1:'When building professional competence in progress monitoring for learning disabilities, how should a teacher choose professional development?',
2:'When a student with a learning disability lacks an accessible communication tool needed to participate, what is an appropriate advocacy step?',
3:'If a student reveals information suggesting immediate risk of harm and asks the teacher to keep it secret, what should the teacher do?',
}})];module.exports.sources={ETS,EXAM,IDEA,IES_READ,IES_MATH};
