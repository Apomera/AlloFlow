'use strict';

const correction = (prompt, choices, rationale, choiceRationales) => ({
  prompt,
  choices,
  rationale,
  choiceRationales,
});

const bilateralChoices = [
  'Above the cochlear nuclei, ascending auditory projections remain strictly ipsilateral through the cortex.',
  'Ascending auditory projections become extensively bilateral above the cochlear nuclei.',
  'The facial nerve regenerates bilateral sensory input whenever one central auditory pathway is damaged.',
  'Vestibular projections replace the damaged cochlear signal before it reaches the auditory brainstem.',
];
const bilateralRationale = 'Above the cochlear nuclei, substantial crossing and bilateral ascending projections allow input from either ear to reach structures on both sides. This organization supports binaural processing and helps explain why one rostral central lesion seldom eliminates all audibility from one ear.';
const bilateralFeedback = [
  'Not the best answer. Central auditory projections do not remain confined to the stimulated side after the cochlear nuclei; multiple crossings distribute information to both sides of the ascending system.',
  `Correct. ${bilateralRationale}`,
  'Not the best answer. The facial nerve supplies the stapedius efferent limb and facial motor functions; it does not regenerate bilateral afferent auditory input after a central lesion.',
  'Not the best answer. Vestibular and cochlear afferents share cranial nerve VIII proximally, but vestibular projections do not replace damaged auditory input or account for preserved cortical audibility.',
];

const reflexChoices = [
  'Outer-hair-cell motility, the vestibulo-ocular pathway, and trigeminal sensory output.',
  'Cochlear and eighth-nerve afferent input, brainstem connections, and facial-nerve efferent output.',
  'Cortical language analysis, optic-nerve input, and hypoglossal motor output.',
  'Middle-ear pressure alone, without an afferent signal or an efferent motor branch.',
];
const reflexRationale = 'An acoustic reflex begins with cochlear activation and afferent transmission through cranial nerve VIII to brainstem circuitry. The efferent limb travels through cranial nerve VII to the stapedius; the measurement therefore samples a bilateral brainstem arc while remaining dependent on valid middle-ear recording conditions.';
const reflexFeedback = [
  'Not the best answer. Outer-hair-cell activity and the vestibulo-ocular pathway are not the afferent and efferent limbs that produce a measured stapedius contraction.',
  `Correct. ${reflexRationale}`,
  'Not the best answer. Cortical language, visual afferent, and tongue-motor systems are not the brainstem auditory-facial arc responsible for the stapedius response.',
  'Not the best answer. Middle-ear mechanics affect whether the response can be recorded, but pressure alone cannot replace the sensory input, brainstem connection, and motor output.',
];

const mixedChoices = [
  'A purely conductive loss in which both cochleae retain sensitivity within the expected range.',
  'A mixed loss containing both sensorineural and conductive components.',
  'A purely sensorineural loss with no clinically meaningful air–bone separation.',
  'A nonauditory vestibular disorder that leaves air- and bone-conduction thresholds unrelated.',
];
const mixedRationale = 'Elevated bone-conduction thresholds indicate a sensorineural component, while additional, repeatable air–bone gaps indicate a conductive component. With appropriate masking and cross-checks, the combined configuration is classified as mixed rather than purely conductive or purely sensorineural.';
const mixedFeedback = [
  'Not the best answer. A purely conductive loss would preserve bone-conduction sensitivity within the expected range rather than elevate the masked bone thresholds.',
  `Correct. ${mixedRationale}`,
  'Not the best answer. A purely sensorineural loss would not include the repeatable clinically significant air–bone gaps described in the scenario.',
  'Not the best answer. A vestibular disorder does not account for the internally consistent air- and bone-conduction configuration on an audiogram.',
];

const corrections = {
  'aud5343-b1-006': correction(
    'A patient has a focal lesion above the cochlear nuclei yet retains some audibility for signals presented to either ear. Which neural organization best accounts for this finding?',
    bilateralChoices,
    bilateralRationale,
    bilateralFeedback,
  ),
  'aud5343-b2-006': correction(
    'After confirmed damage to one rostral auditory pathway, stimulation of either ear still evokes cortical responses. Which feature of the ascending system most directly explains the preserved bilateral access?',
    bilateralChoices,
    bilateralRationale,
    bilateralFeedback,
  ),
  'aud5343-b1-013': correction(
    'A 2000 Hz tone becomes less detectable when nearby noise activates overlapping cochlear filters, even though attention to the task is stable. Which mechanism best explains the threshold shift?',
    [
      'Energetic masking from physical overlap between masker and target excitation.',
      'Informational masking from uncertainty about which auditory object is the target.',
      'Binaural summation from combining matching signals delivered to both ears.',
      'Auditory adaptation from continued stimulation after the competing noise ends.',
    ],
    'Energetic masking occurs when masker energy overlaps the auditory-filter excitation used to detect the target, reducing the target’s effective signal-to-masker relationship. The scenario holds attention stable and locates the interference in overlapping cochlear excitation rather than uncertainty or postexposure adaptation.',
    [
      'Correct. The nearby masker activates overlapping auditory filters and reduces physical detectability of the target, which is the defining mechanism of energetic masking in this scenario.',
      'Not the best answer. Informational masking reflects uncertainty, similarity, or difficulty selecting an auditory object beyond energetic overlap; the scenario instead specifies cochlear-filter interference with stable attention.',
      'Not the best answer. Binaural summation can improve detection when related information is combined across ears and does not describe a nearby noise making this target less detectable.',
      'Not the best answer. Adaptation concerns response change with continued stimulation or aftereffects and does not account for the simultaneous overlapping masker described here.',
    ],
  ),
  'aud5343-b1-030': correction(
    'An infant passed newborn hearing screening, but later develops caregiver concerns and a risk factor associated with delayed-onset change. What is the appropriate next step?',
    [
      'Treat the original pass as conclusive regardless of the current concern or documented risk.',
      'Arrange age-appropriate audiologic surveillance or evaluation based on the current concern and risk.',
      'Wait for a confirmed language delay before gathering additional auditory information.',
      'Repeat newborn screening indefinitely instead of obtaining age-appropriate diagnostic data.',
    ],
    'A newborn screening pass describes hearing-screen status at one time and does not rule out progressive, delayed-onset, or subsequently acquired change. New caregiver concern or a recognized risk indicator warrants age-appropriate surveillance or comprehensive evaluation under the current EHDI and clinical pathway.',
    [
      'Not the best answer. A prior pass does not override a new functional concern or risk indicator because auditory status can change after the newborn period.',
      'Correct. Current concern and delayed-onset risk call for developmentally appropriate surveillance or diagnostic evaluation rather than reliance on the earlier screen.',
      'Not the best answer. Waiting for a confirmed language delay can postpone identification; hearing status should be evaluated when a relevant concern or risk emerges.',
      'Not the best answer. Repeating an infant screening protocol indefinitely does not provide the age-appropriate diagnostic information needed to resolve current concern.',
    ],
  ),
  'aud5343-b2-025': correction(
    'A performing musician wants to reduce cumulative sound exposure while maintaining communication and sound quality. Which counseling plan is most appropriate?',
    [
      'Combine measured level and duration estimates with distance, breaks, monitoring, and individually fitted protection.',
      'Use maximum labeled attenuation at each rehearsal without checking fit, audibility, or communication access.',
      'Rely on temporary threshold changes to determine when cumulative exposure has become hazardous.',
      'Address paid performances but omit rehearsal and recreational exposure from the risk estimate.',
    ],
    'Hearing-risk counseling should consider the measured or estimated sound level, duration, repetition, distance, recovery opportunities, individual susceptibility, and the musician’s communication and sound-quality goals. Appropriately selected and fitted protection plus monitoring supports practical risk reduction without promising zero risk.',
    [
      'Correct. The plan addresses cumulative dose and several controllable exposure variables while matching protection to the musician’s fit, communication, and sound-quality needs.',
      'Not the best answer. Unchecked maximum attenuation can create poor fit, overprotection, and communication barriers while failing to establish the attenuation actually achieved.',
      'Not the best answer. Temporary symptoms or threshold changes are warning evidence, not a safe real-time boundary for deciding when hazardous cumulative exposure has occurred.',
      'Not the best answer. Total risk can include rehearsals and recreational listening as well as paid performances, so omitting those exposures understates cumulative dose.',
    ],
  ),
  'aud5343-b1-046': correction(
    'Ipsilateral and contralateral acoustic-reflex patterns are obtained with a valid probe seal. Which neural elements are necessary for the measured stapedius response?',
    reflexChoices,
    reflexRationale,
    reflexFeedback,
  ),
  'aud5343-b2-046': correction(
    'A present stapedius reflex requires sensory input from the stimulated ear and motor output to the probe ear. Which pathway description is accurate?',
    reflexChoices,
    reflexRationale,
    reflexFeedback,
  ),
  'aud5343-b1-058': correction(
    'Masked testing shows elevated bone-conduction thresholds plus poorer air-conduction thresholds separated by significant air–bone gaps. How should this configuration be classified?',
    mixedChoices,
    mixedRationale,
    mixedFeedback,
  ),
  'aud5343-b2-058': correction(
    'A repeatable audiogram shows impaired bone thresholds and additional air–bone gaps after appropriate masking. Which broad hearing-loss type best fits both findings?',
    mixedChoices,
    mixedRationale,
    mixedFeedback,
  ),
  'aud5343-b2-077': correction(
    'A cochlear-implant recipient’s comfort levels and speech access change during the months after activation. Which follow-up plan best addresses these changes?',
    [
      'Reassess electrode function, map levels, audibility, comfort, and functional outcomes, then adjust programming as indicated.',
      'Retain the activation-day program and address changed performance through communication practice alone.',
      'Raise stimulation levels on all channels without measuring comfort, audibility, or electrode status.',
      'Replace outcome measures with device-use hours and postpone mapping until hardware failure.',
    ],
    'Cochlear-implant programming is longitudinal because electrode status, neural response, loudness judgments, auditory experience, and communication demands can change after activation. Follow-up combines integrity and map measures with aided audibility, comfort, speech and functional outcomes, and recipient priorities before making targeted adjustments.',
    [
      'Correct. The plan integrates device integrity, psychophysical map information, auditory access, comfort, and meaningful outcomes before changing programming.',
      'Not the best answer. Communication practice can complement implant care but cannot substitute for reassessing a map when access or comfort has changed.',
      'Not the best answer. Uniformly raising channels without measurement can create discomfort, distort loudness relationships, and overlook an electrode-specific issue.',
      'Not the best answer. Device-use hours provide limited context and cannot replace map, integrity, audibility, comfort, and functional outcome measures.',
    ],
  ),
};

const expectedAnswerIndices = {
  'aud5343-b1-006': 1,
  'aud5343-b1-013': 0,
  'aud5343-b1-030': 1,
  'aud5343-b1-046': 1,
  'aud5343-b1-058': 1,
  'aud5343-b2-006': 1,
  'aud5343-b2-025': 0,
  'aud5343-b2-046': 1,
  'aud5343-b2-058': 1,
  'aud5343-b2-077': 0,
};

module.exports = { corrections, expectedAnswerIndices };
