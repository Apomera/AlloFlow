'use strict';
const source=require('../special_education_5355/item_content.cjs');
const ETS='https://praxis.ets.org/on/demandware.static/-/Library-Sites-ets-praxisLibrary/default/pdfs/5547.pdf';
const EXAM='https://praxis.ets.org/test/special-education-severe-to-profound-5547.html';
const IDEA='https://sites.ed.gov/idea/regs/b';
const CEC='https://exceptionalchildren.org/standards/initial-practice-based-professional-preparation-standards-special-educators';
const domains={development:['development-individualized-needs','Human Developmental and Individualized Learning Needs'],planning:['planning-instruction-environment','Planning and Instruction and the Learning Environment'],assessment:['assessment','Assessment'],professional:['ethical-legal-professional-collaboration','Ethical and Legal Practice, Professionalism, and Collaboration']};
function adapt(v){return String(v).replace(/low functioning/gi,'requiring intensive support').replace(/babyish/gi,'age-inappropriate').replace(/middle school student/gi,'student').replace(/high school learner/gi,'student').replace(/high school student/gi,'student').replace(/disability category/gi,'support profile').replace(/chronological-age respectful/gi,'age-respectful')}
const leadIns={
'development-context-strengths':{A:'When interpreting development, context, and variability for a learner with intensive support needs, ',B:'When new evidence complicates an initial developmental interpretation, '},
'complex-support-profiles':{A:'When analyzing an individualized profile with possible co-occurring needs, ',B:'When a team coordinates intensive supports across an individualized profile, '},
'adaptive-sensory-health-needs':{A:'When removing sensory, physical, communication, or health access barriers, ',B:'When a team evaluates whether an access support works in an authentic routine, '},
'person-centered-iep-transition':{A:'During person-centered IEP and transition planning, ',B:'When aligning goals, services, access, agency, and transition evidence, '},
'systematic-instruction-access':{A:'During explicit, systematic instruction for meaningful participation, ',B:'When a team plans instruction, scaffold fading, and generalization, '},
'positive-environments-intensive-supports':{A:'When designing a predictable, communication-accessible learning environment, ',B:'When a team uses functional evidence to plan positive intensive support, '},
'accessible-assessment-selection':{A:'When selecting and administering an accessible assessment, ',B:'When a team removes an unintended response or communication barrier from assessment, '},
'evaluation-eligibility-interpretation':{A:'During a comprehensive, multidisciplinary evaluation, ',B:'When an evaluation team integrates multiple accessible sources and rules out alternative explanations, '},
'progress-monitoring-functional-data':{A:'When reviewing repeated progress and implementation data, ',B:'When a team uses progress evidence to decide whether intensive support should change, '},
'law-ethics-equity-safeguards':{A:'When applying legal, ethical, and equity safeguards, ',B:'When a team checks a decision against rights, evidence, privacy, and current requirements, '},
'family-team-paraprofessional':{A:'During person-centered collaboration among the learner, family, and school team, ',B:'When coordinating family knowledge and professional roles around an individualized outcome, '},
'professionalism-advocacy-boundaries':{A:'Within a severe-disabilities educator’s professional role, ',B:'When an educator reflects, advocates, or responds to a safety concern within professional scope, '}};
const reviewedVariants={
'complex-support-profiles':{
0:{
A:{
prompt:'A learner with severe or profound disabilities uses AAC to select relevant ideas but needs support organizing them in a shared written paragraph. Which response is best?',
correct:'Model an age-respectful example with AAC access, use a visual organizer, and fade prompts while preserving authorship.',
distractors:[
'Deliver identical remedial drills across every academic subject regardless of the learner’s demonstrated idea-selection strengths.',
'Conclude that the learner lacks grade-level ideas to contribute because spoken verbal output is limited during class.',
'Have an adult staff member select the ideas and compose each finished paragraph to keep pace with class deadlines.',
],
rationale:'The instructional response should presume competence, preserve authorship, and target the observed organization need through accessible communication, explicit modeling, guided participation, and systematic prompt fading.',
distractorNotes:[
'Applying uniform remediation across unaffected domains wastes instructional time and overlooks the learner’s demonstrated strength in selecting relevant ideas through AAC.',
'Equating limited speech with limited conceptual ideas violates presumption of competence and misreads a communication modality difference as a cognitive deficit.',
'Having an adult author the paragraph removes learner voice and agency rather than building organized writing skills through visual scaffolds and prompt fading.',
],
},
B:{
prompt:'A student with multiple disabilities usually activates a switch to continue a preferred activity but has stopped responding and appears unusually drowsy. What should guide the team’s immediate response?',
correct:'Follow the health and safety plan, check for medical or access changes with staff, and document observations.',
distractors:[
'Escalate verbal and hand-over-hand prompting until the student activates the switch for the preferred activity.',
'Discontinue switch-based instruction because the student appears to have lost cause-and-effect understanding.',
'Wait several school days before noting the drowsiness so the team can collect a wider behavioral trend first.',
],
rationale:'A sudden change in alertness and established performance may signal a health, sensory, positioning, fatigue, medication, or access concern. The individualized plan and designated health personnel should guide a timely, documented response before staff make behavioral or ability assumptions.',
distractorNotes:[
'Escalating physical or verbal prompts during unexplained drowsiness ignores a potential medical, seizure, medication, or positioning concern and risks learner safety.',
'Interpreting an abrupt state change as permanent loss of cause-and-effect skill mistakes a likely health or access barrier for cognitive regression.',
'Delaying communication with designated nursing or health staff for several days risks missing an urgent medical change that requires prompt attention.',
],
},
},
3:{
A:{
prompt:'A learner with severe or profound disabilities shows distress during a noisy group routine but participates in a predictable small group with communication and sensory supports. What perspective is most useful?',
correct:'Examine interactions among communication access, sensory load, health, task demands, supports, and consequences.',
distractors:[
'Expect the same level of behavioral distress across every school routine because it stems from disability severity.',
'Attribute the student’s behavioral distress solely to classmates’ social habits during whole-group lessons.',
'Remove the student permanently from all peer-group instruction and shift entirely to solitary adult-led work.',
],
rationale:'An ecological, person-centered analysis uses the contrast across routines to identify access needs, coordinate supports, teach a usable communication response, and monitor safe, meaningful participation.',
distractorNotes:[
'Treating distress as inevitable across all settings ignores the learner’s documented success in the predictable small group with sensory and communication supports.',
'Blaming peers alone overlooks modifiable ecological factors—such as noise level, predictability, and AAC access—that differentiate the two routines.',
'Permanently removing peer-group opportunities violates LRE principles and denies social belonging when targeted environmental supports can enable inclusive participation.',
],
},
B:{
prompt:'A learner with severe or profound disabilities withdraws during an unpredictable activity but participates when the sequence, communication options, and sensory supports are clear. What should the team examine?',
correct:'Compare predictability, communication access, sensory-health factors, task demands, and supports across both routines.',
distractors:[
'Treat task withdrawal as an unavoidable characteristic of severe disability rather than an environmental cue.',
'Eliminate all unfamiliar or novel activities from the student’s schedule to prevent any future withdrawal.',
'Assign a classroom behavior consequence without reviewing communication, sensory, or health access variables.',
],
rationale:'The contrasting conditions provide evidence for individualized support. The team should coordinate relevant expertise, preserve learner assent and communication, adjust access, and monitor participation and well-being.',
distractorNotes:[
'Assuming withdrawal is fixed by severity overlooks clear evidence that the learner engages actively when routines, sensory supports, and communication options are transparent.',
'Eliminating every novel activity narrows life experiences and learning opportunities instead of teaching predictable preview routines and supported transitions.',
'Applying consequences before examining communication, sensory, or health barriers misdiagnoses an access problem as noncompliance and can escalate distress.',
],
},
},
4:{
A:{
prompt:'Which evidence is essential when planning age-respectful support for a learner with severe or profound disabilities?',
correct:'Integrated data on communication, health, sensory-motor access, adaptive-academic skills, preferences, and settings.',
distractors:[
'A single standardized oral reading score collected during a brief general education screening window.',
'The student’s primary eligibility label paired with general impressions of physical appearance and diagnosis.',
'One classroom adult’s personal expectations without input from the learner, family, or related-service specialists.',
],
rationale:'Person-centered planning integrates multiple sources to identify strengths, preferences, access needs, safety considerations, meaningful goals, and supports across environments. Severity labels alone do not determine a program.',
distractorNotes:[
'A single isolated reading score omits communication, health, sensory-motor, and cross-setting adaptive evidence essential for comprehensive person-centered planning.',
'Relying on diagnostic labels or physical impressions stereotypes the learner and fails to document actual strengths, preferences, and individualized access supports.',
'Planning from one adult’s expectations excludes the learner’s voice, family priorities, and interdisciplinary specialist input required under IDEA.',
],
},
B:{
prompt:'A team is reviewing support needs for a learner with severe or profound disabilities. Which evidence should organize the next program decision?',
correct:'Current person-centered data on communication, health, access, participation, preferences, and response to supports.',
distractors:[
'The student’s disability classification report without updated performance or environmental support data.',
'A uniform district curriculum package assigned to all learners who share the same support classification.',
'One isolated classroom observation collected without family, learner, or interdisciplinary team input.',
],
rationale:'The next decision should follow current, representative, interdisciplinary evidence and the learner’s preferences and communication. Coordinated supports should promote dignity, safety, participation, learning, and increasing agency.',
distractorNotes:[
'Relying on static eligibility labels without current performance data misses how the learner responds to supports and ignores evolving goals and preferences.',
'Assigning a standardized package by label violates IDEA individualization and overlooks unique communication, health, and sensory-motor requirements.',
'A single isolated observation lacks cross-setting reliability and omits vital family knowledge, learner preferences, and related-service perspectives.',
],
},
},
}};
const stripIns={
'person-centered-iep-transition':{A:[/^during IEP development,\s*/i]},
'family-team-paraprofessional':{A:[/^in effective co-teaching,\s*/i]}};
const lowerFirst=v=>String(v).replace(/^./,c=>c.toLowerCase());
function composePrompt(id,variant,raw){let body=adapt(raw).trim();for(const pattern of stripIns[id]?.[variant]||[])body=body.replace(pattern,'');return leadIns[id][variant]+lowerFirst(body)}
function questions(parts,id){return parts.flatMap(([b,a,z])=>source[b].questions.slice(a,z)).map((q,index)=>{const variants=reviewedVariants[id]?.[index]||{},a=variants.A||{},b=variants.B||{};return{...q,promptA:a.prompt||composePrompt(id,'A',q.promptA),promptB:b.prompt||composePrompt(id,'B',q.promptB),correct:adapt(q.correct),distractors:q.distractors.map(adapt),rationale:adapt(q.rationale)+' For 5547 preparation, preserve dignity and meaningful participation while coordinating communication, health, sensory, motor, behavioral, academic, adaptive, and transition supports; use individualized evidence rather than assumptions based on disability severity.',distractorNotes:Array.isArray(q.distractorNotes)?q.distractorNotes.map(adapt):undefined,...(a.correct?{correctA:adapt(a.correct),distractorsA:a.distractors.map(adapt),rationaleA:adapt(a.rationale),distractorNotesA:a.distractorNotes.map(adapt)}:{}),...(b.correct?{correctB:adapt(b.correct),distractorsB:b.distractors.map(adapt),rationaleB:adapt(b.rationale),distractorNotesB:b.distractorNotes.map(adapt)}:{})}})}
function bank(id,n,key,label,parts,refs=[]){const[domainId,domain]=domains[key];if(!leadIns[id])throw Error('Missing editorial lead-ins for '+id);return{id,chapterId:'sp5547-ch-'+String(n).padStart(2,'0'),domainId,domain,label,references:[ETS,EXAM,IDEA,CEC,...refs],questions:questions(parts,id)}}
module.exports=[
bank('development-context-strengths',1,'development','Development, Context, Strengths, and Variability',[[0,0,9]]),
bank('complex-support-profiles',2,'development','Complex Disability, Communication, and Learning Profiles',[[1,0,9]]),
bank('adaptive-sensory-health-needs',3,'development','Adaptive, Sensory, Physical, Health, and Safety Needs',[[2,0,8],[3,0,3]]),
bank('person-centered-iep-transition',4,'planning','Person-Centered IEPs, Goals, and Transition Planning',[[3,3,11]]),
bank('systematic-instruction-access',5,'planning','Systematic Instruction, Curriculum Access, and Generalization',[[4,0,11]]),
bank('positive-environments-intensive-supports',6,'planning','Positive Environments, Behavior, Communication, and Intensive Supports',[[5,0,10],[6,0,3]]),
bank('accessible-assessment-selection',7,'assessment','Accessible Assessment Selection and Administration',[[6,3,8]]),
bank('evaluation-eligibility-interpretation',8,'assessment','Evaluation, Eligibility, and Cautious Interpretation',[[7,0,8]]),
bank('progress-monitoring-functional-data',9,'assessment','Progress Monitoring and Functional Data Decisions',[[8,0,6]]),
bank('law-ethics-equity-safeguards',10,'professional','Law, Ethics, Equity, and Procedural Safeguards',[[8,6,7],[9,0,7]]),
bank('family-team-paraprofessional',11,'professional','Family, Team, Related-Service, and Paraprofessional Collaboration',[[10,0,6]]),
bank('professionalism-advocacy-boundaries',12,'professional','Professional Learning, Advocacy, Safety, and Boundaries',[[11,0,6]])];
module.exports.sources={ETS,EXAM,IDEA,CEC};
