'use strict';

// Confirmed constitutional, case-law, institutional, and internal-consistency fixes for:
//   test_prep/ap_us_government_foundation_pilot_learning_library.json
//
// Every rule's `find` string matches EXACTLY ONCE in JSON.stringify(lib, null, 2)
// (and in the raw library JSON), preserves valid JSON, keeps contentBlocks/runs
// mirrors synchronized with flat fields, and is idempotent when re-applied.

module.exports = {
  ap_us_government_foundation_pilot: [
    // 1a-c. Article V constitutional error + internal contradiction with quickReference[1]:
    // Congress can propose constitutional amendments (2/3 of both houses), not pass/ratify them unilaterally (3/4 of states must ratify).
    {
      pathHint: 'chapters[1].sections[1].contentBlocks[6].rows[3].cells[1].text (ap-usg-ch-02-section-02)',
      find: '"kind": "cell",\n                      "text": "Congress can alter appellate jurisdiction, pass constitutional amendments, or reshape courts via Senate confirmation of nominees."',
      replace:
        '"kind": "cell",\n                      "text": "Congress can alter appellate jurisdiction, propose constitutional amendments, or reshape courts via Senate confirmation of nominees."',
      reason:
        'Constitutional error under Article V and internal contradiction with quickReference[1].decisionRules[1]: Congress cannot pass/enact constitutional amendments on its own; it can only propose amendments (by a two-thirds vote of both houses) for ratification by three-fourths of the states.',
    },
    {
      pathHint: 'chapters[1].sections[1].contentBlocks[6].rows[3].cells[1].runs[0].text (ap-usg-ch-02-section-02)',
      find: '"type": "text",\n                          "text": "Congress can alter appellate jurisdiction, pass constitutional amendments, or reshape courts via Senate confirmation of nominees."',
      replace:
        '"type": "text",\n                          "text": "Congress can alter appellate jurisdiction, propose constitutional amendments, or reshape courts via Senate confirmation of nominees."',
      reason:
        'Keep contentBlocks table cell run synchronized with the Article V correction ("propose constitutional amendments") in ap-usg-ch-02-section-02.',
    },
    {
      pathHint: 'chapters[1].sections[1].workedDataExample.rows[2][1] (ap-usg-ch-02-section-02)',
      find: '"Supreme Court judicial review",\n                "Congress can alter appellate jurisdiction, pass constitutional amendments, or reshape courts via Senate confirmation of nominees."',
      replace:
        '"Supreme Court judicial review",\n                "Congress can alter appellate jurisdiction, propose constitutional amendments, or reshape courts via Senate confirmation of nominees."',
      reason:
        'Keep workedDataExample synchronized with the Article V correction ("propose constitutional amendments") in ap-usg-ch-02-section-02.',
    },

    // 2a-c. Institutional/constitutional error (Article I, Sec. 7 & Sec. 9):
    // A single House oversight committee cannot unilaterally cut discretionary federal funding; Congress exercises the power of the purse through appropriations legislation.
    {
      pathHint: 'chapters[1].sections[2].contentBlocks[2].items[1].text (ap-usg-ch-02-section-03)',
      find: '"text": "A House oversight committee subpoenas agency officials and cuts discretionary funding when an independent regulatory commission misses statutory deadlines.",\n                  "runs":',
      replace:
        '"text": "A House oversight committee subpoenas agency officials and Congress cuts discretionary funding when an independent regulatory commission misses statutory deadlines.",\n                  "runs":',
      reason:
        'Institutional and constitutional error (Article I, Sections 7 and 9): a single House oversight committee can subpoena officials and hold hearings, but it cannot unilaterally cut discretionary funding; cutting appropriations requires bicameral legislation passed by Congress.',
    },
    {
      pathHint: 'chapters[1].sections[2].contentBlocks[2].items[1].runs[0].text (ap-usg-ch-02-section-03)',
      find: '"type": "text",\n                      "text": "A House oversight committee subpoenas agency officials and cuts discretionary funding when an independent regulatory commission misses statutory deadlines."',
      replace:
        '"type": "text",\n                      "text": "A House oversight committee subpoenas agency officials and Congress cuts discretionary funding when an independent regulatory commission misses statutory deadlines."',
      reason:
        'Keep contentBlocks list item run synchronized with the congressional appropriations authority correction in ap-usg-ch-02-section-03.',
    },
    {
      pathHint: 'chapters[1].sections[2].examples[1] (ap-usg-ch-02-section-03)',
      find: '"After Congress passes clean-air legislation, the EPA uses discretionary authority and notice-and-comment rulemaking to set enforceable emissions thresholds.",\n            "A House oversight committee subpoenas agency officials and cuts discretionary funding when an independent regulatory commission misses statutory deadlines."',
      replace:
        '"After Congress passes clean-air legislation, the EPA uses discretionary authority and notice-and-comment rulemaking to set enforceable emissions thresholds.",\n            "A House oversight committee subpoenas agency officials and Congress cuts discretionary funding when an independent regulatory commission misses statutory deadlines."',
      reason:
        'Keep examples[1] synchronized with the congressional appropriations authority correction in ap-usg-ch-02-section-03.',
    },

    // 3. Required SCOTUS case holding accuracy (Shaw v. Reno, 1993) + internal consistency with chapters[1].sections[0] & playbooks[2]:
    {
      pathHint: 'quickReference[1].formulas[0] (ap-usgov-reference-02)',
      find: 'Shaw v. Reno (1993) struck down racial gerrymandering under the 14th Amendment Equal Protection Clause.',
      replace:
        'Shaw v. Reno (1993) subjected predominantly racial gerrymandering to strict scrutiny under the 14th Amendment Equal Protection Clause.',
      reason:
        'Case-law accuracy error: in Shaw v. Reno, 509 U.S. 630 (1993), the Supreme Court did not strike down North Carolina\'s map or categorically ban all race-conscious redistricting; it reversed dismissal and held that redistricting drawn predominantly on the basis of race must withstand strict scrutiny under the 14th Amendment Equal Protection Clause (the map was later struck down on remand/appeal in Shaw v. Hunt, 1996).',
    },

    // 4. Internal contradiction in Unit 4 study session plan:
    // Unit 4 (Political Ideologies, Socialization, Public Opinion Polling, Economic Policy) has no required SCOTUS cases and erroneously pointed to the SCOTUS playbook instead of the dedicated Unit 4 Polling/MOE playbook.
    {
      pathHint: 'studySessionPlans[3].steps[4].action (ap-us-government-foundation-pilot-session-ch-04)',
      find: '"action": "For any missed item, run the \\"Anchoring Required SCOTUS Precedents to Their Exact Clause and Scope\\" misconception playbook and log one concrete check to use on the next set."',
      replace:
        '"action": "For any missed item, run the \\"Checking Margins of Error, Sampling Bias, and Subgroup Evidence in Polls\\" misconception playbook and log one concrete check to use on the next set."',
      reason:
        'Internal contradiction: Unit 4 (American Political Ideologies and Beliefs) contains zero required SCOTUS cases and has its own dedicated Unit 4 misconception playbook ("Checking Margins of Error, Sampling Bias, and Subgroup Evidence in Polls", ap-usg-pb-polling-margin-of-error-data), whereas "Anchoring Required SCOTUS Precedents to Their Exact Clause and Scope" targets Unit 1 and Unit 3 SCOTUS items.',
    },
  ],
};
