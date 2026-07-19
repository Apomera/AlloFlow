'use strict';

// Editorial corrections for the nine score-4 source items in the 2026-07-18
// EPPP-guided warning docket. Correct concepts and answer positions are fixed.
const corrections = {
  'ec5025-b1-059': {
    prompt: 'Which statement accurately compares two ways that groups establish expectations?',
    choices: [
      'A teacher-created expectation and a municipal requirement both carry the same legal authority and court enforcement.',
      'A group agreement cannot be revised after adoption, whereas a government requirement changes whenever one person objects.',
      'A classroom agreement guides a school community, while an ordinance is enacted by authorized local government and has legal consequences.',
      'A government requirement is legitimate only when every affected person voted for it, while a class agreement needs no participation.'
    ],
    rationale: 'Classroom agreements and laws can both organize shared life, but their authority differs. A classroom agreement is established within a school community; a city ordinance is enacted under governmental authority and carries legally established consequences.',
    choiceRationales: [
      'This confuses a local instructional expectation with a law. Classroom agreements may carry school consequences, but they do not have the legal status or court enforcement of municipal ordinances.',
      'Both classroom agreements and laws can be revised through appropriate processes. Individual objection alone does not automatically change a law, and adoption does not make an agreement permanent.',
      'Correct. The statement distinguishes a school-community agreement from an enactment of authorized local government while recognizing that each can structure conduct in its own setting.',
      'Legitimacy does not require a unanimous vote by every affected person. Laws derive authority from constitutional and legislative processes, while sound classroom agreements invite meaningful participation.'
    ]
  },
  'ec5025-b2-059': {
    prompt: 'Children compare a classroom agreement with a city rule. Which explanation is most accurate?',
    choices: [
      'Both expectations come from the federal government and are enforced through the same judicial process.',
      'Neither expectation can be revised after adoption, because changing a rule removes its authority.',
      'The class agreement operates within the school community; the city rule is enacted under local governmental authority and carries legal consequences.',
      'The city rule has authority only if every resident supports it, but the class agreement requires no discussion.'
    ],
    rationale: 'The two expectations differ in source and legal status. A classroom agreement guides participation within a school community, whereas a city ordinance is created through authorized local-government processes and can carry legal penalties.',
    choiceRationales: [
      'Class agreements are not federal enactments, and municipal ordinances arise from local rather than federal authority. School and court enforcement processes also differ substantially.',
      'Rules and laws can be amended through legitimate procedures. Revision does not inherently remove authority; it can improve an expectation as needs and evidence change.',
      'Correct. This response identifies both the setting of a classroom agreement and the governmental source and legal force of a municipal requirement.',
      'Government authority does not depend on unanimous resident support, and a developmentally appropriate class agreement should include explanation and meaningful student participation.'
    ]
  },
  'ec5025-b1-070': {
    prompt: 'A child says, “The ice probably melted because the tray was near the sunny window.” How should the teacher classify the statement?',
    choices: [
      'It is a direct observation because the child used a complete sentence to report what happened.',
      'It is an inference because the child used observed melting and location information to propose an explanation.',
      'It is a measurement because the child compared the tray with the window without using a number.',
      'It is a controlled conclusion because one observation rules out other possible causes of the melting.'
    ],
    rationale: 'The child interprets observations to propose a cause, so the statement is an inference. An observation would report what senses or tools detected, such as liquid water in the tray; a supported causal conclusion would require additional evidence.',
    choiceRationales: [
      'Sentence form does not determine whether a claim is an observation. The causal word “because” shows that the child is interpreting evidence rather than merely reporting sensed information.',
      'Correct. The child combines observable information about melting and location with prior knowledge about sunlight to offer a tentative explanation, which is an inference.',
      'A qualitative comparison can be evidence, but calling the location relevant does not itself constitute measurement. The statement proposes a cause from observations.',
      'A single uncontrolled observation cannot rule out room temperature, elapsed time, or other causes. The statement is a plausible inference, not a conclusive experiment.'
    ]
  },
  'ec5025-b2-070': {
    prompt: 'During a nature walk, a child says, “These tracks may belong to a rabbit.” Which teacher response uses science terms accurately?',
    choices: [
      '“That is an observation because any statement made outdoors records information exactly as the senses receive it.”',
      '“That is an inference; the track shapes are observations, and naming a possible animal interprets that evidence.”',
      '“That is a measurement because comparing the tracks with an animal does not require a measuring tool.”',
      '“That is a proven conclusion because recognizing a familiar pattern eliminates the need for additional evidence.”'
    ],
    rationale: 'The visible shapes and locations of tracks are observations. Inferring that a rabbit made them interprets those observations using prior knowledge, and the tentative wording appropriately leaves room for further evidence.',
    choiceRationales: [
      'The setting does not classify a statement. Reporting visible track features would be observation, but assigning them to an unseen animal adds interpretation.',
      'Correct. This response separates evidence gathered through sight from the tentative explanation formed by connecting that evidence with prior knowledge.',
      'The child is not quantifying or systematically comparing an attribute. Identifying a possible track maker is an interpretation of observed evidence.',
      'Pattern recognition can support an inference but does not prove the animal’s identity. Other animals or altered tracks remain possibilities until more evidence is gathered.'
    ]
  },
  'ec5025-b1-088': {
    prompt: 'A child says an adult asked them to keep a physical interaction that felt uncomfortable secret. What should an early-childhood teacher reinforce first?',
    choices: [
      'The child should wait for another incident before telling anyone, so the first report can be compared with later events.',
      'The child should decide whether the adult intended harm before seeking help from a trusted person at school or home.',
      'The child should confront the adult alone and request an explanation before involving another responsible adult.',
      'The child can say no, move away when possible, and tell a trusted adult; unsafe touch secrets do not need to be kept.'
    ],
    rationale: 'Developmentally appropriate safety instruction emphasizes bodily autonomy, immediate help seeking, and freedom from blame. A child should tell a trusted adult about unsafe or uncomfortable contact, even when someone labels it a secret.',
    choiceRationales: [
      'Waiting can leave the child without needed protection and support. A report of uncomfortable or unsafe contact should be taken seriously and addressed through current safeguarding procedures.',
      'A child is not responsible for judging an adult’s intent before asking for help. Discomfort or a boundary violation is enough reason to contact a trusted adult.',
      'Requiring a child to confront an adult alone can increase risk and improperly shifts responsibility to the child. Trusted-adult support should be available promptly.',
      'Correct. This teaches bodily autonomy and a concrete help-seeking sequence without blaming the child or requiring secrecy about conduct that feels unsafe or uncomfortable.'
    ]
  },
  'ec5025-b2-088': {
    prompt: 'Which message best supports children’s body-safety knowledge during a developmentally appropriate lesson?',
    choices: [
      'Children should first determine whether a person meant to cause harm before they describe an uncomfortable interaction.',
      'Children should reserve safety reports for encounters with unfamiliar people because familiar adults can be presumed safe.',
      'Children should solve a boundary concern privately with the person involved before asking another adult for assistance.',
      'Children may refuse unwanted contact and tell a trusted adult; they may keep telling trusted adults until someone helps.'
    ],
    rationale: 'Body-safety education should give children clear, usable actions: recognize discomfort, assert a boundary when possible, leave, and seek help from trusted adults. The guidance applies regardless of whether the other person is familiar.',
    choiceRationales: [
      'Children do not need to evaluate another person’s intent before reporting discomfort. That requirement can delay help and place an adult responsibility on the child.',
      'Unsafe behavior can involve familiar or unfamiliar people. Limiting reports to strangers creates inaccurate safety knowledge and may suppress important disclosures.',
      'Private confrontation can expose a child to added pressure or risk. Children should have immediate access to responsible, trusted adults who can provide protection and follow procedures.',
      'Correct. The message combines bodily autonomy with persistent, concrete help seeking and does not restrict safety support according to a person’s familiarity.'
    ]
  },
  'ec5025-b1-093': {
    prompt: 'A collage includes rough paper, smooth foil, dark blue shapes, and pale yellow lines. Which analysis uses visual-art vocabulary accurately?',
    choices: [
      'The rough and smooth surfaces create texture, while the light and dark qualities of colors create differences in value.',
      'The rough and smooth surfaces create melody, while the blue and yellow areas establish the work’s dramatic setting.',
      'The light and dark qualities create tempo, while each flat colored area must be classified as three-dimensional form.',
      'The blue and yellow areas create meter, while the surface differences show the monetary value of each material.'
    ],
    rationale: 'Texture describes actual or implied surface quality, and value describes relative lightness or darkness. Melody, tempo, and meter are music concepts; a flat enclosed area is shape rather than three-dimensional form.',
    choiceRationales: [
      'Correct. The response identifies surface quality as texture and relative lightness or darkness as value, applying each visual-art element to evidence in the collage.',
      'Melody is an ordered sequence of pitches, not a surface quality. Dramatic setting belongs to theater analysis and does not name the color relationship described.',
      'Tempo describes musical speed rather than lightness or darkness. A flat colored area is a shape; form refers to actual or represented three-dimensional volume.',
      'Meter organizes musical beats, and artistic value in this context means lightness or darkness rather than the material’s purchase price.'
    ]
  },
  'ec5025-b2-093': {
    prompt: 'Children examine a sculpture with curved edges, hollow spaces, and a bumpy surface. Which description is most precise?',
    choices: [
      'The work combines three-dimensional form, negative space, and tactile texture to create visual relationships.',
      'The work combines musical dynamics, dramatic conflict, and tempo because its surface changes across the object.',
      'The work consists only of flat shapes because curved edges prevent an object from occupying three-dimensional space.',
      'The work’s negative space identifies its purchase price, while its texture determines the artist’s cultural identity.'
    ],
    rationale: 'A sculpture occupies three-dimensional space and therefore has form. Open or hollow areas can function as negative space, and a physically bumpy surface has tactile texture.',
    choiceRationales: [
      'Correct. Form names the sculpture’s three-dimensional volume, negative space identifies its openings, and tactile texture describes a surface that can be felt.',
      'Dynamics and tempo are music terms, while dramatic conflict is a theater concept. None accurately identifies the sculpture’s volume, openings, or surface quality.',
      'Curved edges do not make an object flat. A sculpture has height, width, and depth, so three-dimensional form is the appropriate element.',
      'Negative space refers to unoccupied areas around or within forms, not cost. Surface texture alone cannot establish an artist’s cultural identity.'
    ]
  },
  'ec5025-b1-098': {
    prompt: 'A teacher plans to introduce a textile tradition from a particular community. Which preparation best supports accurate cultural context?',
    choices: [
      'Select one attractive example and present it as the design used by every person from that community today.',
      'Use sources from community knowledge holders, identify the weaving’s time and purpose, and acknowledge variation among makers.',
      'Remove information about makers and use because visual qualities alone provide all context children need for the activity.',
      'Invite children to copy a sacred design freely because classroom art activities are separate from community meanings.'
    ],
    rationale: 'Culturally responsive arts instruction locates a work in a specific time, community, purpose, and maker perspective. Credible community-connected sources and attention to variation reduce stereotyping and tokenism.',
    choiceRationales: [
      'One example cannot represent every maker or current community member. Treating it as universal erases differences in time, purpose, identity, and artistic choice.',
      'Correct. Community-connected sourcing, specific historical and functional context, and recognition of variation support accurate study without reducing a tradition to a token example.',
      'Formal visual analysis is useful but cannot replace cultural and historical context. Omitting makers and purposes strips the work of information needed for accurate interpretation.',
      'Educational use does not erase community meaning or permissions. Sacred or restricted designs require careful consultation, context, and respect rather than automatic copying.'
    ]
  }
};

function applySourceReviewCorrections(items) {
  const seen = new Set();
  for (const item of items) {
    const correction = corrections[item.id];
    if (!correction) continue;
    if (correction.choices.length !== 4 || correction.choiceRationales.length !== 4) {
      throw new Error(`Invalid source-review correction for ${item.id}`);
    }
    Object.assign(item, correction, {
      reviewStatus: 'source-reviewed',
      qaStatus: 'qa-passed',
      qaReviewedAt: '2026-07-18'
    });
    seen.add(item.id);
  }
  return seen;
}

module.exports = { corrections, applySourceReviewCorrections };
