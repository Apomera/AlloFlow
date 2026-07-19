'use strict';
const q = (skillId, prompt, correct, distractors, rationale, difficulty, cognitiveLevel) => ({ skillId, prompt, correct, distractors, rationale, difficulty, cognitiveLevel });
const s = 'vestibular-tinnitus-apd-assessment';
module.exports = [
q(s,'Caloric responses are bilaterally weak, and the audiologist wants information about vestibulo-ocular reflex function over a broader, midfrequency range. Which test is most useful?','Rotary-chair testing, interpreted with caloric, head-impulse, visual, and clinical findings.',[
['Pure-tone bone conduction, which directly measures horizontal-canal gain.','Bone-conduction audiometry estimates auditory sensitivity and not vestibulo-ocular reflex gain.'],
['Speech-recognition testing in quiet, which identifies bilateral vestibular loss.','Word recognition does not measure rotational VOR function.'],
['Tympanometry, which determines semicircular-canal symmetry during rotation.','Tympanometry measures middle-ear admittance and does not test canal symmetry during rotation.']],
'Calorics primarily sample very low-frequency horizontal-canal function, whereas rotary-chair stimuli assess VOR gain, phase, and symmetry at other frequencies. Together with vHIT and functional findings, rotary chair can help distinguish bilateral weakness from technical or frequency-limited results.','advanced','analysis'),
q(s,'A patient reads an eye chart clearly while still, but visual acuity drops several lines during active head movement. What mechanism may be impaired?','Possible impairment of vestibulo-ocular-reflex gaze stabilization, considered with visual and task factors.',[
['Middle-ear pressure equalization through the Eustachian tube during swallowing.','Dynamic visual acuity during head movement does not primarily test middle-ear pressure regulation.'],
['Cochlear frequency selectivity measured by distortion-product emissions.','The task evaluates gaze stability rather than outer-hair-cell frequency selectivity.'],
['Speech-language comprehension measured with an open-set word list.','Reading an eye chart during motion is not a spoken-language comprehension task.']],
'Dynamic visual acuity depends on the VOR keeping the retinal image stable as the head moves. A meaningful decline can support gaze-instability concern, but baseline vision, head speed, attention, corrective lenses, and other neurologic factors must be considered.','application','analysis'),
q(s,'Computerized dynamic posturography shows instability when visual and surface cues are unreliable. What can this test most directly characterize?','Sensory organization for postural stability under the tested visual and surface conditions.',[
['The exact anatomical vestibular lesion site without any other examination.','Posturography reflects functional sensory organization and is not a stand-alone lesion-localization tool.'],
['The degree of sensorineural hearing loss at each octave frequency.','Postural sway conditions do not estimate frequency-specific hearing thresholds.'],
['The specific cause of tinnitus based solely on center-of-pressure movement.','Balance-platform data do not establish tinnitus etiology.']],
'Posturography challenges visual, somatosensory, and vestibular contributions to balance and quantifies functional sway strategies. It can guide rehabilitation and document change, but it does not independently localize or diagnose the underlying disorder.','advanced','analysis'),
q(s,'A patient reports brief vertigo when lying back with the head turned right. Which bedside maneuver is most appropriate to evaluate suspected right posterior-canal BPPV?','A right Dix-Hallpike maneuver with observation of latency, direction, duration, and symptom reproduction.',[
['A left-ear word-recognition test at a comfortable listening level.','Speech recognition does not provoke or characterize posterior-canal positional nystagmus.'],
['A tympanometric pressure sweep performed while the patient remains seated upright.','Middle-ear admittance testing does not evaluate canalith-related positional vertigo.'],
['A sustained pure tone presented through a forehead bone oscillator.','Bone-conducted auditory testing is not the indicated positional maneuver.']],
'The Dix-Hallpike positions the posterior canal relative to gravity and allows the examiner to observe the expected canal-plane nystagmus and symptoms. Medical, cervical, vascular, mobility, and consent considerations must be checked before performing it.','application','application'),
q(s,'Horizontal nystagmus is strongest when a patient’s head is rolled to either side while supine. Which procedure and interpretation are most relevant?','Use the supine roll test and compare geotropic or apogeotropic direction and side intensity to evaluate horizontal-canal BPPV.',[
['Use a Stenger test and compare which ear receives the louder pure tone.','The Stenger procedure addresses certain asymmetric auditory responses, not positional horizontal nystagmus.'],
['Use acoustic-reflex decay and assign the stronger side to the poorer vestibular nerve.','Reflex decay is an auditory brainstem measure and does not lateralize horizontal-canal BPPV.'],
['Use an OAE suppression task and diagnose a middle-ear disorder from nystagmus.','OAE suppression does not characterize positional nystagmus or establish middle-ear disease.']],
'The supine roll maneuver stimulates the horizontal canals, and nystagmus direction and relative intensity help identify canalithiasis or cupulolithiasis patterns and the likely side. Findings must be matched to the complete positional examination.','advanced','analysis'),
q(s,'A client reports new pulse-synchronous unilateral tinnitus. Which response is most appropriate?','Arrange timely medical evaluation while documenting laterality, pulse synchrony, associated symptoms, and audiologic findings.',[
['Begin sound enrichment and defer medical consideration because tinnitus is usually benign.','Pulse-synchronous unilateral tinnitus is a referral feature that should not be managed as routine tinnitus alone.'],
['Diagnose a specific vascular condition from the client’s description without examination.','The symptom warrants evaluation but does not identify a single cause by history alone.'],
['Mask the tinnitus at maximum device output before obtaining case history.','Unverified high output is unsafe and does not address the red-flag referral need.']],
'Pulsatile or pulse-synchronous tinnitus can have vascular or other medical causes requiring timely evaluation. The audiologist documents the pattern, checks hearing and related red flags within scope, and coordinates referral without prematurely naming an etiology.','advanced','analysis'),
q(s,'A tinnitus program uses a validated self-report questionnaire before treatment and again three months later. What is the main purpose of this repeated measure?','To quantify perceived impact and evaluate meaningful change alongside goals and clinical findings.',[
['To calculate an exact tinnitus pitch from the total questionnaire score.','Impact scales do not directly encode the acoustic pitch of a tinnitus percept.'],
['To replace hearing assessment and red-flag review for every participant.','A questionnaire complements rather than replaces audiologic and medical triage.'],
['To prove that identical scores represent identical tinnitus causes.','Similar impact ratings do not establish a shared etiology.']],
'A standardized impact measure supports baseline characterization, shared goal setting, and longitudinal outcome evaluation. Score interpretation should consider measurement error, meaningful-change guidance, individual priorities, and other clinical evidence rather than implying acoustic or etiologic precision.','application','analysis'),
q(s,'An auditory-processing test battery for a multilingual adolescent relies heavily on unfamiliar English vocabulary. What is the central validity concern?','Language demands may confound the auditory construct, so linguistically appropriate assessment and multidisciplinary interpretation are needed.',[
['Vocabulary difficulty proves a peripheral cochlear loss even when audiometry is normal.','Language performance cannot by itself establish cochlear pathology.'],
['Using more unfamiliar words removes cultural and linguistic bias from the battery.','Increasing unfamiliar language demands can magnify rather than remove construct-irrelevant bias.'],
['A single low score identifies the exact auditory pathway site responsible for classroom difficulty.','One confounded score cannot localize a pathway or explain complex functional difficulty.']],
'An APD measure should assess the intended auditory process without excessive language, attention, or cultural loading. Language history, peripheral hearing, cognition, education, and functional evidence must be integrated, with qualified language support when appropriate.','advanced','analysis'),
];
