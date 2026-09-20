from pathlib import Path
import json,hashlib,re,time
root=Path('.')
report=root/'reports/sel-strengths-spot'
report.mkdir(exist_ok=True)
for name in ['browser','browser-final','phone-final','static','theme','controls','hub','render']:
    raw=(root/f'reports/sel-strengths-spot-{name}.log').read_bytes()
    text=raw.decode('utf-16' if raw.startswith((b'\xff\xfe',b'\xfe\xff')) else 'utf-8-sig')
    text=re.sub(r'\x1b\[[0-9;]*m','',text).replace('\r\n','\n').rstrip()+'\n'
    (report/f'{name}.txt').write_bytes(text.encode('utf-8'))
src=(root/'sel_hub/sel_tool_strengths.js').read_bytes()
assert src==(root/'desktop/web-app/public/sel_hub/sel_tool_strengths.js').read_bytes()
assert len(list(report.glob('*-phone.png')))==9
for theme in ['light','dark','contrast']: assert json.loads((report/f'{theme}-axe.json').read_text())==[]
validation={'date':'2026-09-19','scope':'Strengths Finder Spot Strengths observation practice','uniqueSelectedPassed':51,'checks':{'newBrowser':20,'contextRegression':19,'controlContracts':5,'targetedTheme':4,'actualHub':3},'filtered':{'finalPhone':17,'theme':292,'hub':106},'extraChecksExcludedFromUniqueCount':'Initial broad static selection also ran four viaStrengths theme checks; repeated checks excluded.','initialFailure':'One test counted native details elements as answer groups. Corrected selector to div[role=group]; full 39-case browser run passed. No assertions or timeouts weakened.','finalPolish':'Shortened clipped blank dropdown prompt and marked historical quiz statistic; final phone, controls, theme and hub checks passed.','renderedTools':72,'phoneCapturesReviewed':9,'scopedAxeScans':3,'axeViolations':0,'sourcePublicByteParity':True,'sourceSHA256':hashlib.sha256(src).hexdigest(),'syntax':'Both modules passed node --check','whitespace':'Scoped git diff --check passed','providers':'Mocked narration/coach only; no live model requests','deployment':'Local changes only; no push, deploy or package build'}
(report/'validation.json').write_bytes((json.dumps(validation,indent=2)+'\n').encode('utf-8'))
doc='''# Strengths Finder: Spot Strengths

The earlier match quiz presented one prescribed strength as the answer, gave scores and identity-based praise, and claimed a relationship to a formal VIA assessment without supporting evidence. Spot Strengths replaces that experience with reasoning about observations. The saved tab ID remains `quiz`.

## Learning design

Four contexts provide 12 grade-adapted examples: an offer of help, changing a learning approach, listening in different ways, and making participation possible. Each has three statements to distinguish: an action stated in the example, a qualified possible interpretation, and a conclusion that the example does not establish. Feedback explains the authored reasoning and can be revisited without points or ranking. Changing an answer clears its previous feedback until the learner compares again.

The examples leave motives and fixed traits uncertain. They recognize consent, support and access needs, and avoid equating eye contact with listening or repeated effort with character. A question, changed circumstance and reconsideration prompt make the next step explicit. The interpretations are authored learning examples, not a personality assessment.

Two optional reflection notes let learners separate observations and possible strengths language from questions still worth asking. A separate own-example mode supports transfer without answer classification. Notes and reviewed choices persist independently by grade and context. A read-only preview includes only the current notes. Reading and thinking without answering is valid participation; notes do not request or provide monitored support.

## Interface and compatibility

Labeled native selects, disclosures and textareas support keyboard use, 44px controls and 16px input text. Feedback uses a polite status region. Mobile review shortened a clipped dropdown prompt. Light, dark and high-contrast palettes follow the host theme. Read-aloud narrates only the selected authored example.

New state uses `observationSelections[band]` and `observationDrafts[band:context]`, including per-claim choice/review records. Guards handle malformed objects and values; updates retain unknown draft and answer properties. Earlier quiz progress, answers, scores, selected strengths and earned awards remain stored. Historical badge thresholds retain the earlier eight-question length. The wider tool's existing award logic remains; new activity interactions do not update legacy scores, assign strengths, award points or call the AI coach. Earlier quiz statistics and badge descriptions are labeled as historical.

## Source and verification

[CASEL's SEL framework](https://casel.org/what-is-sel/) describes self-awareness, considering others' perspectives and evaluating choices across developmental stages and contexts. These broad skills inform the practice. Neither the authored categories nor this activity are a validated assessment or equivalent to a formal strengths measure.

51 unique selected checks passed: 20 new browser cases, 19 previous Strengths Scenarios browser cases, five existing control/chart contracts, four targeted Strengths theme checks and three real-hub reopening workflows. The initial new-suite run passed 19/20: one test selector inadvertently counted native disclosures as answer groups. After narrowing that selector, all 39 browser cases passed. Final phone checks were rerun after a shorter dropdown prompt and historical-stat label polish. Assertions and timeouts were not weakened. Repeated and filtered cases, four extra viaStrengths theme checks from an initial broad filter, and render enumeration are excluded from the unique count.

All 72 SEL tools rendered. Nine 320px captures were visually reviewed across three themes; three scoped axe scans found no violations. Source/public bytes, JavaScript syntax and scoped whitespace checks passed. Logs, images and the validation record are in `reports/sel-strengths-spot`. Browser narration/coach interfaces are mocked; no live provider call, push, deployment or packaged build is included.
'''
(root/'docs/sel_strengths_spot_2026-09-19.md').write_bytes(doc.encode('utf-8'))
p=root/'docs/sel_hub_review_2026-09-08.md'
s=p.read_text(encoding='utf-8')
s+='''

## Forty-first pass: Strengths observations and interpretation (2026-09-19)

Strengths Finder's Quiz tab is now Spot Strengths. Four contexts provide 12 grade-adapted examples and three evidence categories per case, with reasoned feedback rather than fixed strength labels, scores or identity praise. Learners consider consent, access, different ways of listening and changing learning approaches; each case includes a question and changed circumstance. Removed the unsupported formal-assessment correlation claim.

Optional observation/question notes and reviewed choices persist by grade and context, with a separate own-example mode and current-notes preview. Legacy quiz records, selected strengths and awards remain stored; historical statistics and badge descriptions are identified as earlier activity. New interactions do not add scores, awards, selected strengths or AI requests. See [the design/source note](sel_strengths_spot_2026-09-19.md) and `reports/sel-strengths-spot/validation.json`.

Validation: 51 unique selected checks passed: 20 new browser cases, 19 previous Strengths context cases, five control/chart contracts, four targeted Strengths theme checks and three actual-hub reopening workflows. The initial 19/20 run exposed a test selector counting native disclosures as answer groups; the corrected selector passed in the full 39-case browser run. Final phone checks passed after shortening a clipped dropdown prompt and clarifying the historical quiz statistic. All 72 tools rendered, nine phone captures were reviewed, and three scoped axe scans reported no violations. Source/public parity, syntax and scoped whitespace passed. Repeated/filtered cases, extra viaStrengths checks and render enumeration are excluded. No live provider call, push, deployment or packaged build.
'''
p.write_bytes(s.encode('utf-8'))
