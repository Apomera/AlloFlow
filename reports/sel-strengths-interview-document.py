from pathlib import Path
import json,hashlib,re,time
root=Path('.')
def write(p,text):
 for attempt in range(5):
  try:p.write_bytes(text.encode('utf-8'));return
  except OSError:
   if attempt==4:raise
   time.sleep(1)
report=root/'reports/sel-strengths-interview'
for name in ['browser','controls','theme','hub','render']:
 raw=(root/f'reports/sel-strengths-interview-{name}.log').read_bytes()
 text=raw.decode('utf-16' if raw.startswith((b'\xff\xfe',b'\xfe\xff')) else 'utf-8-sig')
 write(report/f'{name}.txt',re.sub(r'\x1b\[[0-9;]*m','',text).replace('\r\n','\n').rstrip()+'\n')
src=(root/'sel_hub/sel_tool_strengths.js').read_bytes()
assert src==(root/'desktop/web-app/public/sel_hub/sel_tool_strengths.js').read_bytes()
assert len(list(report.glob('*-phone.png')))==9
for theme in ['light','dark','contrast']:assert json.loads((report/f'{theme}-axe.json').read_text())==[]
validation={'date':'2026-09-19','scope':'Strengths Interview: examples, context and learner-owned interpretation','uniqueSelectedPassed':52,'checks':{'newInterviewBrowser':20,'spotStrengthsRegression':20,'controlContracts':5,'targetedStrengthsTheme':4,'actualHubReopening':3},'filtered':{'theme':292,'hub':107},'firstRun':'All selected checks passed on the first run; no assertion or timeout changes.','renderedTools':72,'phoneCapturesReviewed':9,'scopedAxeScans':3,'axeViolations':0,'sourcePublicByteParity':True,'sourceSHA256':hashlib.sha256(src).hexdigest(),'syntax':'Both modules passed node --check','whitespace':'Scoped git diff --check passed','providers':'Narration and coach interfaces mocked; the new Interview makes no AI request.','deployment':'Local only; no push, deploy or packaged build'}
write(report/'validation.json',json.dumps(validation,indent=2)+'\n')
doc='''# Strengths Interview: examples, context and your perspective

The earlier Interview inferred a strength profile through AI after several answers. Its prompts sometimes treated ease, peer comparison, praise or total absorption as evidence of an authentic strength. Small navigation dots had an unrelated accessible name, and saved answers were not separated by grade. The new Interview supports learner-owned reflection on specific actions and conditions without producing a profile.

## Learning design

Four optional focuses provide 12 grade-adapted questions and 12 worked examples: notice a specific moment, consider support and conditions, consider another perspective, and choose a small experiment. Each example separates the observable action, a possible interpretation and a conclusion to leave open. A follow-up question helps learners name uncertainty, identify useful support, revise a description or decide when to adapt or pause.

Everyday or fictional examples are welcome; disclosure of difficult experiences is unnecessary. Learners can think, draw or write, work alone, or invite a willing partner. Partner guidance includes asking permission, accepting a no, using different communication methods, asking for concrete examples and retaining the right to disagree. Another person's observation can be useful and incomplete. Needing rest, access tools or instruction does not reduce the value of an action, and adults/organizers retain responsibilities for access.

All four focuses are reachable without answering. Navigation announces the current focus and has no completion quota, score or assigned strengths. The small experiment is optional, limited and revisable. A first attempt or someone else's approval does not measure the learner's worth.

## Persistence and prior work

Two notes per focus are stored in `interviewReflectionDrafts[band][focus]`; navigation uses `interviewReflectionSelections[band]`. A read-only preview includes all four focuses in the current grade only. Updates retain unknown nested properties and guard malformed values. Notes remain available after changing focus, grade or reopening the tool. The read-aloud control reads only the authored focus and explanation, never private notes.

Earlier `interviewAnswers`, step, generated result, pending/completion records, selected strengths and earned awards are preserved. An optional history disclosure shows earlier answers and string results separately from new reflections. Because old answers did not store their original grade band, a clearly labeled wording selector lets the learner choose the old question version; it explicitly does not assert a verified match. Unknown answer IDs remain readable. Old generated responses are labeled as earlier interpretations, not authoritative assessments. Historical award criteria remain intact in the wider tool; the new reflection does not mark the earlier activity complete or award points. The existing tool and Interview tab IDs remain unchanged.

The new workflow works without an AI provider and does not send reflection notes to the coach. It does not resume saved analysis requests. Optional notes explain that they are not monitored and do not request help. The wider Strengths coach and other activities remain available.

## Sources and validation

[CASEL's framework](https://casel.org/what-is-sel/) includes self-awareness, recognition of strengths and limitations, considering perspectives and context, seeking support, and reasoned decision-making. Those broad skills inform these authored prompts. This activity is not a validated personality or strengths assessment.

52 unique selected checks passed on the first run: 20 Interview browser cases, 20 Spot Strengths regression cases, five existing control/chart contracts, four targeted Strengths theme checks and three real-hub reopening workflows. Coverage includes all 12 grade/focus combinations, unrestricted keyboard navigation, live focus announcements, independent drafts, read-only current-grade preview, legacy retention, malformed state, unknown properties, offline participation and narration privacy. No assertions or timeouts were changed.

All 72 SEL tools rendered. Nine 320px captures were visually reviewed across light, dark and high contrast; three scoped axe scans found no violations. Controls have 44px targets and 16px input text. Source/public bytes, syntax and scoped whitespace passed. Filtered tests and render enumeration are excluded from the unique count. Logs and screenshots are in `reports/sel-strengths-interview`. Provider interfaces were mocked. No live model call, push, deployment or packaged build is included.
'''
write(root/'docs/sel_strengths_interview_2026-09-19.md',doc)
p=root/'docs/sel_hub_review_2026-09-08.md';s=p.read_text(encoding='utf-8')
s+='''

## Forty-second pass: Strengths Interview with learner-owned interpretations (2026-09-19)

Replaced the AI-inferred strength profile with four optional reflection focuses, 12 grade-adapted prompts and 12 worked examples. Learners distinguish actions from interpretations, consider support and access, weigh another person's view and choose a small revisable experiment. Partner guidance includes permission, alternative communication methods and the right to disagree or work alone. There is no answer quota or assigned profile.

Two notes per focus persist by grade, with a current-grade review preview and clear keyboard navigation. Earlier answers, generated results and awards remain stored separately. Historical question wording is selectable because earlier records did not save a grade band; the interface explains that uncertainty. Read-aloud excludes private notes, and the new Interview needs no AI request. See [the design/source note](sel_strengths_interview_2026-09-19.md) and `reports/sel-strengths-interview/validation.json`.

Validation: all 52 unique selected checks passed on the first run: 20 Interview browser cases, 20 Spot Strengths regressions, five control/chart contracts, four targeted Strengths theme checks and three real-hub reopening workflows. All 72 tools rendered; nine phone captures were reviewed and three scoped axe scans found no violations. Source/public parity, syntax and scoped whitespace passed. Filtered cases and render enumeration are excluded. No assertions or timeouts changed; no live provider call, push, deployment or packaged build.
'''
write(p,s)
