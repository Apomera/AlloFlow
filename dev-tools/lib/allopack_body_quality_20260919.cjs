'use strict';
const {factHash}=require('./allopack_fact_review.cjs');
const sources=[
 'https://www.nhlbi.nih.gov/health/heart/heart-beats',
 'https://www.nhlbi.nih.gov/health/heart',
 'https://www.niddk.nih.gov/health-information/digestive-diseases/digestive-system-how-it-works'
];
function refine(pack){
 const get=t=>{const r=pack.history.find(r=>r.type===t);if(!r)throw new Error('Body Systems is missing '+t);return r.data;};
 const outline=get('outline');outline.branches[1].items[2]='Blood carries oxygen and nutrients to cells, along with other materials';outline.branches[3].title='Nervous — helping coordinate';outline.branches[5].items[1]='Fear can change heart rate through nerve and hormone signals';
 get('anchor-chart').sections[3].bullets=['Systems exchange materials and signals','During activity, breathing and heart rate often increase','These linked responses do not follow one fixed relay order'];
 const memory=get('memory-aid');memory.reasoningRequired=true;
 const [six,relay,handoffs]=memory.cards;
 six.coachPrompts=['How does the nervous system help coordinate the body? Which other signals also help?'];
 relay.scaffoldSteps=['Arrange the four places oxygen travels through in order.','Choose words, pictures, pointing, a communication device, or optional motions for your cue.','Use your cue to trace the pathway and explain where oxygen crosses a thin wall.'];
 relay.studentPrompt='Create your own four-step oxygen pathway using a response format that works for you.';
 Object.assign(handoffs,{target:'How systems respond to changing activity',essentialFacts:[
  'Working muscles use more energy. Breathing and blood flow often increase to support oxygen delivery and carbon-dioxide removal.',
  'Nervous pathways, hormones and local signals help coordinate changing demands; the heart has its own pacemaker.',
  'Body systems work together continuously; a relay cue does not prove a fixed order of signals.'
 ],scaffoldStarter:'During ____, muscles use more ____. Breathing and blood flow may ____. Several signals help ____.',scaffoldSteps:[
  'Choose an imagined example of physical activity or an example from the lesson.',
  'Connect changing energy needs with breathing, circulation, and coordinating signals.',
  'Explain that your story is a model, not a measurement of which signal came first.'
 ],coachPrompts:['Where does your story show systems working together?','Which parts explain the science, and which would need separate measurements to test?'],studentPrompt:'Describe or draw an imagined activity and the linked responses of body systems.',reasoningPrompt:'Explain one useful connection and one limit of your story model.',hookFact:{text:'Nerves and hormones can change heart rate in response to a perceived threat.',sourceTitle:'The Relay Race (revised lesson)'}});
 const challenge=get('applied-challenge');
 challenge.instructions='Investigate the supplied fictional observations. Compare breathing and pulse estimates, connect the pattern to lesson facts, and explain what the numbers cannot show. No exercise or personal measurements are needed.';
 challenge.fitReason='Comparing two measurements gives students evidence to discuss interacting systems while distinguishing an observed pattern from a causal explanation.';
 Object.assign(challenge.brief,{
  context:'Fictional classroom dataset, invented for calculation practice; these are not measurements of real people or health targets. Three cases each have counts from matched 15-second windows at rest, just after one minute of gentle activity, and two minutes after activity ended. Each pair below is breaths / pulse beats. Case A: rest 4 / 18; just after 6 / 24; two minutes after 4 / 19. Case B: rest 3 / 17; just after 5 / 22; two minutes after 4 / 18. Case C: rest 4 / 20; just after 5 / 23; two minutes after 4 / 20. Multiply each count by four to estimate a rate per minute. These examples illustrate possible patterns, not predictions for every person.',
  role:'Student evidence analysts',audience:'Classmates comparing observations and explanations',
  drivingQuestion:'What changes appear in the fictional breathing and pulse counts, and how far can those observations support an explanation about interacting systems?',
  seedDirection:'Label the data fictional. Convert each 15-second count to a per-minute estimate, then compare each case with its own resting values.',
  openQuestions:['How much does each estimated rate change from rest to just after activity?','At the two-minute observation, which estimates match the resting value and which remain higher?','Why can three observation times not establish the exact time of recovery or the order of coordinating signals?'],
  stakeholders:['Students using different response formats','Classmates checking calculations','The teacher supporting evidence-based explanations'],
  criteria:['A table of estimated breaths per minute and pulse beats per minute for all three fictional cases at all three times','A comparison of each case with its own resting values, with units shown','An explanation using respiratory and circulatory systems and their coordination, clearly separated from what was counted','One limit of the data and one follow-up question; explain relevant lesson vocabulary accurately'],
  constraints:['Use the supplied fictional data; no exercise or personal measurements are required.','Keep breaths per minute and pulse beats per minute in separate labeled columns.','Do not use the invented values to judge anyone\'s health, fitness, or expected response.','Do not claim the counts measure oxygen use, prove a causal mechanism, or reveal the first coordinating signal.','Complete in one class period; respond in writing, speech, drawings with explanations, or a communication device.'],
  deliverable:'A labeled results table for the three fictional cases, a short explanation linking a pattern to lesson facts, and a statement of what remains unknown.'
 });
 challenge.brief.lockedLessonFacts[3]='Working muscles use more energy. Breathing and blood flow often increase to support oxygen delivery and carbon-dioxide removal.';
 challenge.supports={
  parallelExample:{context:'Fictional example: an animal model has 5 breaths counted in a 20-second window and 7 in another 20-second window.',move:'A student multiplies each count by three: estimated rates are 15 and 21 breaths per minute. The estimate increased by 6 breaths per minute. The student reports the change but does not claim that the counts alone explain its cause.',whyItHelps:'Match the conversion to the counting window, retain units, and separate a numerical pattern from a causal explanation. Our main dataset uses 15-second windows, so its multiplier is four.'},
  frameStarter:'In fictional Case ____, the estimated ____ rate changed from ____ to ____ per minute. This is consistent with ____. The counts alone cannot show ____.',
  frameChoices:['Compare each case with its own resting estimates','Compare the two-minute estimate with rest without claiming an exact recovery time','Draw two graphs with separate labels and units','Explain how a counting error of one beat or breath changes a per-minute estimate'],
  coachPrompts:['Which part of your claim comes from the numbers, and which comes from the lesson?','Does a faster pulse directly measure the volume of blood pumped or the oxygen used?','Which questions would need different measurements or a different investigation?']
 };
 challenge.coachHint='Use count × 4 for each 15-second sample. Compare like units, separate evidence from explanation, and state the limits of three fictional observation times.';
 const quiz=get('quiz');quiz.questions[1].question='Which pair correctly matches the oxygen and glucose pathways described in the lesson?';quiz.questions[1].options=['Oxygen enters through the digestive system; glucose enters through the lungs','Both oxygen and glucose enter the blood directly from inhaled air','Glucose comes from bones; oxygen is made by the heart','Oxygen crosses from lung air sacs into blood; glucose is absorbed from the small intestine into blood'];quiz.questions[1].correctAnswer=quiz.questions[1].options[3];
 quiz.questions[6].question='Explain how the digestive and circulatory systems help deliver glucose from food to a working muscle. What does the muscle cell do with it?';quiz.questions[6].expectedAnswer='Digestion breaks down carbohydrates, and glucose is absorbed from the small intestine into blood. Circulation carries it to muscles. In aerobic cellular respiration, muscle cells use glucose and oxygen to make ATP for cell work, including contraction. Many dietary fats take a different initial route through lymph before reaching blood.';
 quiz.reflections[1].text='Choose an imagined activity or an example from the lesson. Which body systems work together?';
 get('note-taking').cues[6].text='How can breathing and circulation adjust during activity?';
 const d=get('directions'),suffix=d.body.includes('\n\nPicture panels:')?d.body.slice(d.body.indexOf('\n\nPicture panels:')):'';
 d.body='**Due:** (your teacher will tell you)\n\nFollow how body systems exchange materials and signals. The relay is a model: systems work continuously and overlap.\n\n1. Read **The Relay Race** and trace oxygen from lung air sacs to a muscle cell.\n2. Use the **Glossary**, **Matching**, and **Memory** games to practice the terms.\n3. Study **Who Does What** and sort the jobs in **Which System Handles This?**. Explain how other systems can help.\n4. Use **The Handoff Map** and **Cornell Notes** to connect ideas.\n5. Complete the quiz, then review any answers you want to revise.\n6. Create a cue in **Remember the Relay Team**. Explain both its usefulness and its limits.\n7. Complete **Investigation: What Changes When You Move?** with the supplied fictional data. No exercise or personal measurements are needed.\n\nYou may write, speak, draw with explanations, or use your communication device. Use observations to support a claim and identify what remains uncertain.'+suffix;
 d.objectives.find(o=>o.id==='bs-goal-trace').label='I explained how two systems work together in an imagined activity or lesson example';
 for(const node of [...memory.cards,challenge.brief]){node.factVerified=false;node.factReview={status:'pending-educator-review',sources:sources.slice(),factsHash:factHash(node.essentialFacts||node.lockedLessonFacts)};}
 return pack;
}
module.exports={refine,sources};
