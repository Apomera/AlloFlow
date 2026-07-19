'use strict';
const q=(skillId,prompt,correct,distractors,rationale,difficulty,cognitiveLevel)=>({skillId,prompt,correct,distractors,rationale,difficulty,cognitiveLevel});
const s='audiologic-rehabilitation-education';
module.exports=[
q(s,'During conversation, a listener repeatedly says “What?” but still misses the repaired message. Which partner strategy is more effective?','Restate the message with different words, add context, and confirm the specific information that was missed.',[
['Repeat the identical sentence at the same rate and distance without checking comprehension.','An unchanged repetition may preserve the same acoustic and linguistic barriers.'],
['Remove visual cues during repair so the listener must rely on another repetition of the auditory signal.','Removing visual information and merely repeating the signal does not target the breakdown and can further reduce access.'],
['End the conversation whenever one repair request occurs.','Withdrawing communication prevents collaborative repair and participation.']],
'Effective repair changes the message or communication conditions rather than merely increasing repetitions. Rephrasing, key-word emphasis, context, proximity, visual access, and confirmation target the breakdown while preserving the listener’s autonomy.','application','application'),
q(s,'At the start of rehabilitation, a client identifies hearing a grandchild in the car as the highest-priority difficulty. How should this goal be used?','Translate it into a specific measurable outcome and revisit it after technology, strategy, and environmental interventions.',[
['Replace it with the clinician’s preferred laboratory task because personal priorities are not measurable.','Individual priorities can be operationalized and are central to person-centered validation.'],
['Record the goal but avoid using it to guide intervention or outcome review.','A stated goal should inform planning and later evaluation rather than remain decorative documentation.'],
['Promise complete success without considering road noise, safety, seating, or communication partners.','Outcome counseling should address context and uncertainty rather than guarantee performance.']],
'Tools such as individualized goal inventories connect intervention to activities the person values. Baseline difficulty, desired change, strategies, technology, partner actions, and follow-up ratings make the goal useful for shared decisions and outcome validation.','application','analysis'),
q(s,'Which client is most likely to benefit from a group audiologic-rehabilitation format in addition to individual care?','A client seeking communication-strategy practice, peer problem solving, and partner involvement around shared listening challenges.',[
['A client with an acute neurologic red flag who needs emergency referral before routine rehabilitation.','Urgent medical triage takes priority over group communication work.'],
['A client whose only need is sterile repair of an internal implanted component.','Internal hardware management requires an implant team rather than a rehabilitation group.'],
['A client who has not consented to share experiences in any group setting.','Group participation requires informed choice and privacy expectations.']],
'Groups can provide structured strategy teaching, role play, peer modeling, partner education, and normalization of lived experience. They complement individualized device and counseling needs but do not replace urgent care, technical services, or consent.','application','analysis'),
q(s,'A client understands speech much better when watching the talker’s face. How should rehabilitation use this strength?','Teach integration of auditory and visual cues while improving lighting, sight lines, and repair strategies.',[
['Block the talker’s face during every activity so visual benefit is eliminated.','Removing an effective cue does not reflect the client’s functional goal unless used selectively for a defined training purpose.'],
['Conclude that amplification is unnecessary because visual cues help.','Visual benefit does not determine whether auditory technology is indicated.'],
['Treat lipreading as an exact one-to-one transcription of every speech sound.','Many speech sounds look similar, so visual speech is supportive but inherently ambiguous.']],
'Auditory-visual integration is a functional communication resource, not a sign of failure. Training can improve attention to facial, contextual, and acoustic cues while partners optimize lighting, pace, positioning, and confirmation of critical details.','application','application'),
q(s,'After hearing-aid orientation, a client nods but cannot demonstrate battery charging or wax-filter replacement. What should the audiologist do?','Use teach-back and hands-on demonstration, simplify the steps, provide accessible supports, and reassess performance.',[
['Document mastery because the client agreed verbally during the explanation.','Agreement does not demonstrate that the person can complete the procedure.'],
['Repeat the same rapid technical explanation without allowing practice.','Unchanged instruction does not address the observed learning barrier.'],
['Remove the devices permanently because one teaching attempt was unsuccessful.','Skills can improve with accessible instruction, repetition, adaptation, and support.']],
'Teach-back asks the learner to show or explain a task in their own way, revealing what needs clarification without blaming the client. Chunked steps, pictures, large print, accessible video, caregiver support by consent, and repeated practice promote safe independent use.','application','application'),
q(s,'A high-school student who uses hearing technology will enter college next year. Which transition activity is most important?','Practice requesting accommodations, maintaining devices and backups, and navigating disability-access requirements.',[
['Have school staff make every decision without involving the student.','Transition planning should build self-determination and direct participation.'],
['Wait until a device fails during the first college examination to discuss backup access.','Proactive planning reduces predictable interruption and avoids crisis-only support.'],
['Assume the high-school IEP transfers unchanged to every postsecondary setting.','Postsecondary processes and responsibilities differ and require current planning.']],
'Transition support shifts increasing responsibility to the student while maintaining needed coaching. Self-advocacy, technology care, backup plans, communication disclosure choices, current documentation, and knowledge of the receiving setting’s process promote continuity of access.','application','analysis'),
q(s,'A student performs well in the clinic but reports missing teacher directions in science lab. What is the best next educational-audiology step?','Observe the lab task and document acoustics, distance, visual access, technology, and communication demands.',[
['Dismiss the report because clinic speech testing was completed in quiet.','Quiet clinic performance does not reproduce a noisy, mobile laboratory environment.'],
['Recommend preferential seating without learning where instruction and group work occur.','A generic seating suggestion may not fit a dynamic classroom and should follow task analysis.'],
['Repeat tympanometry until it directly measures understanding of multistep lab directions.','Tympanometry cannot assess functional classroom comprehension.']],
'Ecological assessment explains why controlled clinic results may not predict participation. Direct observation, acoustic information, student and teacher report, remote-microphone function, safety demands, and trial accommodations support targeted recommendations.','application','analysis'),
q(s,'A family uses a language the audiologist does not speak and requests counseling about communication options. Which approach is most appropriate?','Arrange a qualified interpreter, speak directly to the family, provide balanced accessible information, and elicit cultural and communication priorities.',[
['Use a young sibling as the default interpreter for complex consent and counseling.','A child interpreter creates accuracy, role, privacy, and family-burden concerns.'],
['Provide one communication option as culturally superior before asking about family goals.','Biased prescription undermines informed family-centered choice.'],
['Address every statement to the interpreter because the family is not part of the clinical conversation.','The clinician should communicate with the family while the interpreter facilitates language access.']],
'Qualified language access supports accuracy, confidentiality, consent, and equitable participation. Cultural humility requires curiosity about the family’s language, identity, resources, values, and goals while presenting options without steering or assumptions.','advanced','analysis'),
];
