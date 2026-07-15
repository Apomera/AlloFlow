'use strict';
const source=require('../special_education_5355/item_content.cjs');
const ETS='https://praxis.ets.org/on/demandware.static/-/Library-Sites-ets-praxisLibrary/default/pdfs/5547.pdf';
const EXAM='https://praxis.ets.org/test/special-education-severe-to-profound-5547.html';
const IDEA='https://sites.ed.gov/idea/regs/b';
const CEC='https://exceptionalchildren.org/standards/initial-practice-based-professional-preparation-standards-special-educators';
const domains={development:['development-individualized-needs','Human Developmental and Individualized Learning Needs'],planning:['planning-instruction-environment','Planning and Instruction and the Learning Environment'],assessment:['assessment','Assessment'],professional:['ethical-legal-professional-collaboration','Ethical and Legal Practice, Professionalism, and Collaboration']};
function adapt(v){return String(v).replace(/low functioning/gi,'requiring intensive support').replace(/babyish/gi,'age-inappropriate').replace(/middle school student/gi,'student').replace(/high school learner/gi,'student').replace(/high school student/gi,'student').replace(/disability category/gi,'support profile').replace(/chronological-age respectful/gi,'age-respectful')}
function questions(parts){return parts.flatMap(([b,a,z])=>source[b].questions.slice(a,z)).map(q=>({...q,promptA:'For a learner with severe or profound disabilities, '+adapt(q.promptA).replace(/^./,c=>c.toLowerCase()),promptB:'When planning intensive, age-respectful support, '+adapt(q.promptB).replace(/^./,c=>c.toLowerCase()),correct:adapt(q.correct),distractors:q.distractors.map(adapt),rationale:adapt(q.rationale)+' For 5547 preparation, preserve dignity and meaningful participation while coordinating communication, health, sensory, motor, behavioral, academic, adaptive, and transition supports; use individualized evidence rather than assumptions based on disability severity.'}))}
function bank(id,n,key,label,parts,refs=[]){const[domainId,domain]=domains[key];return{id,chapterId:'sp5547-ch-'+String(n).padStart(2,'0'),domainId,domain,label,references:[ETS,EXAM,IDEA,CEC,...refs],questions:questions(parts)}}
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
