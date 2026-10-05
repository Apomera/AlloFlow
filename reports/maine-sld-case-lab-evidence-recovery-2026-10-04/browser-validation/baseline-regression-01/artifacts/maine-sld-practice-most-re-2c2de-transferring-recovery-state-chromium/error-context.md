# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: maine-sld-practice.spec.ts >> most recent finding removal can restore exact roles and literal notes across all five case records and filtered score sources without transferring recovery state
- Location: tests\e2e\maine-sld-practice.spec.ts:694:5

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByTestId('finding-removal-recovery')
Expected: visible
Timeout: 15000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 15000ms
  - waiting for getByTestId('finding-removal-recovery')

```

```yaml
- button "Outside dialog"
- main:
  - dialog "Maine SLD Case Lab":
    - text: Leadership Hub / Professional learning
    - heading "Maine SLD Case Lab" [level=1]
    - paragraph: Examine a fictional record. Weigh the evidence. Explain a defensible decision path.
    - button "Worksheet tools +"
    - button "Leadership Hub"
    - button "Close Maine SLD Case Lab": Close ✕
    - text: Practice case
    - combobox "Practice case":
      - 'option "Alex, Grade 4: evidence and instruction need" [selected]'
      - 'option "Alex variation: general education is adequate"'
      - 'option "Jordan, Grade 5: achievement and family concerns"'
      - 'option "Marisol, Grade 4: multilingual access and evidence gaps"'
      - 'option "Taylor, Grade 5: progress and the instruction it requires"'
    - strong: "0"
    - text: supporting
    - strong: "2"
    - text: complicating
    - strong: 1/9
    - text: form notes
    - navigation "Case activity steps":
      - button "Case record"
      - button "Score record"
      - button "Evidence board"
      - button "Form reasoning"
      - button "Debrief"
      - paragraph: Untimed practice. Discuss in a team or work independently.
      - button "← Leadership Hub"
    - region "Activity content":
      - text: 01 / Read the record
      - 'heading "Alex, Grade 4: evidence and instruction need" [level=2]'
      - paragraph: Begin with the complete case. Test scores are one part of the record.
      - text: Fictional case
      - group: Explore all 5 practice cases
      - heading "Case record" [level=3]
      - paragraph: Alex is age 9, in Grade 4, English-dominant, with 96% attendance. Appropriate core instruction and 12 weeks of explicit decoding intervention (4 x 30 minutes weekly) have documented implementation. Reading increases from 54 to 61 correct words per minute; the fictional grade benchmark is 110.
      - button "Add Alex is age 9, in Grade 4, English-dominant, with 96% attendance. Appropriate core instruction and 12 weeks of explicit decoding intervention (4 x 30 minutes weekly) have documented implementation. Reading increases from 54 to 61 correct words per minute; the fictional grade benchmark is 110. to evidence board": + Add finding
      - paragraph: With audio text, Alex answers grade-level content questions independently. Independent reading stays slow with decoding errors despite extra time. Family reports that Alex discusses stories heard aloud but needs help reading homework directions.
      - button "Remove With audio text, Alex answers grade-level content questions independently. Independent reading stays slow with decoding errors despite extra time. Family reports that Alex discusses stories heard aloud but needs help reading homework directions. from evidence board" [pressed]: Added ✓
      - paragraph: Assume valid testing by qualified evaluators, a documented review finding no primary exclusionary cause, normal vision/hearing screening, and no educationally relevant medical finding. The full score record is simulated for discussion; original reporting and scoring detail remain intentional verification gaps.
      - button "Remove Assume valid testing by qualified evaluators, a documented review finding no primary exclusionary cause, normal vision/hearing screening, and no educationally relevant medical finding. The full score record is simulated for discussion; original reporting and scoring detail remain intentional verification gaps. from evidence board" [pressed]: Added ✓
      - separator
      - heading "Stipulated for this exercise" [level=3]
      - list:
        - listitem: The case, scores, benchmark and intervention history are fictional.
        - listitem: The 12-week duration is not a required waiting period, and no score or benchmark is an eligibility cutoff.
        - listitem: Appropriate core instruction and intervention implementation are assumed for the exercise; actual records would require verification.
        - listitem: No listed exclusionary factor is assumed to be the primary cause; an actual determination requires evidence for each Q3 subpart.
        - listitem: The record intentionally leaves general education sufficiency and the necessary teaching adaptation unresolved.
      - heading "Your task" [level=3]
      - list:
        - listitem: Select two score findings supporting the reading concern and one that complicates the interpretation. Connect each to classroom, intervention or family evidence.
        - listitem: Map Q1-Q9 using scores where relevant and case facts for instruction, observation, medical findings and validity. Record a rationale or verification needed.
        - listitem: Name one score or comparison you should not overinterpret, and explain why.
        - listitem: What one item would you check before relying on this record?
        - listitem: Use one case fact to explain the impact. Identify evidence still needed to decide whether general education is adequate and which teaching adaptation, if any, is necessary.
      - strong: Keep the challenge intact
      - text: All case data stays available. Choose the evidence that matters and explain the weight you give it.
      - button "Continue to score record →"
      - heading "Current source materials" [level=3]
      - paragraph: Maine • content reviewed 2026-10-02. These prompts summarize the forms; use the official wording for actual decisions.
      - link "Maine DOE SLD form and checklist (August 2026) (opens in a new tab)":
        - /url: https://www.maine.gov/doe/sites/maine.gov.doe/files/inline-files/Supervision%20and%20Monitoring%20-%20Specific%20Learner%20Disability%20Checklist%20-%208.13.2026.pdf
      - 'link "MUSER Chapter 101: current rule source (2026) (opens in a new tab)"':
        - /url: https://www.maine.gov/sos/sites/maine.gov.sos/files/inline-files/071c101-2026-129-AMD-EMR.docx
      - 'link "IDEA: specially designed instruction, 34 CFR 300.39 (opens in a new tab)"':
        - /url: https://sites.ed.gov/idea/regs/b/a/300.39
      - link "Maine DOE multilingual learners with disabilities guide (2025) (opens in a new tab)":
        - /url: https://www.maine.gov/doe/sites/maine.gov.doe/files/inline-files/Multilingual%20Learning%20-%20Identifying%20%26%20Serving%20Students%20Who%20are%20Multilingual%20with%20Disabilities%20Policy%20%26%20Resource%20Guide%20-%204.14.2025.pdf
      - link "Maine DOE multilingual learner disability resources (opens in a new tab)":
        - /url: https://www.maine.gov/doe/learning/multilinguallearner/resources/MLdisabilities
      - 'link "IDEA: culturally and linguistically appropriate evaluation, 34 CFR 300.304(c) (opens in a new tab)"':
        - /url: https://sites.ed.gov/idea/regs/b/d/300.304/c/
      - 'link "IDEA: instruction and English proficiency factors, 34 CFR 300.306(b) (opens in a new tab)"':
        - /url: https://sites.ed.gov/idea/regs/b/d/300.306/b/
      - status: Finding removed from your evidence board.
    - text: Progress retained in this tab for up to 12 hours. Download to keep a copy. Fictional records only · 1.1.0
    - button "Restore downloaded Case Lab worksheet"
```

# Test source

```ts
  588 | async function guideRevisionRestore(page:Page,worksheet:any){
  589 |  await page.locator('input[type=file]').setInputFiles({name:'guide-revision-seed.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(worksheet))});
  590 |  await page.getByRole('alertdialog').getByRole('button',{name:'Restore worksheet',exact:true}).click();
  591 | }
  592 | function guideRevisionNoSerializedReturn(value:any){
  593 |  if(!value||typeof value!=='object')return;
  594 |  for(const [key,entry] of Object.entries(value)){
  595 |   expect(['participantReturn','guideQuestion','guideReturn','pendingParticipantReview','pendingGuide','returnContext','evidenceReturn','comparisonReturn','earlierOpen','planningOpen']).not.toContain(key);
  596 |   guideRevisionNoSerializedReturn(entry);
  597 |  }
  598 | }
  599 | async function guideRevisionNoReturnUI(page:Page){
  600 |  for(const id of ['guide-review-return','return-to-reviewed-guide','participant-review-return','evidence-return'])await expect(page.getByTestId(id)).toHaveCount(0);
  601 |  await expect(page.locator('[data-testid^="guide-return-"]')).toHaveCount(0);
  602 | }
  603 | async function guideRevisionOrigin(page:Page,question:string,title:string){
  604 |  const lower=question.toLowerCase();
  605 |  await expect(page.getByTestId('guide-review-return')).toBeVisible();
  606 |  await expect(page.getByTestId('participant-review-return')).toHaveCount(0);
  607 |  await expect(page.locator('[data-testid^="guide-return-"]')).toHaveCount(1);
  608 |  for(const id of ['return-to-reviewed-guide','guide-return-'+lower]){
  609 |   await expect(page.getByTestId(id)).toHaveText('Return to '+question+' guide');
  610 |   await expect(page.getByTestId(id)).toHaveAccessibleName('Return to reviewed '+question+' guide for '+title);
  611 |  }
  612 | }
  613 | 
  614 | test('reviewed guide revisions return by keyboard to all nine originating questions in all five cases while preserving literal notes and an explicit finding detour',async({page})=>{
  615 |  const data=JSON.parse(await readFile(join(ROOT,'maine_sld_case_data.json'),'utf8')),caseIds=data.cases.map((fixture:any)=>fixture.id);
  616 |  expect(data.cases).toHaveLength(5);expect(data.formSteps.map((question:any)=>question.id)).toEqual(guideRevisionQuestions);
  617 |  await page.setViewportSize({width:320,height:844});await open(page,'dark');
  618 |  const worksheet=await guideRevisionDownload(page,'guide-revision-initial-worksheet.json');assertSaveWorksheetSchema(worksheet,caseIds);
  619 |  const notes:Record<string,Record<string,string>>={};
  620 |  for(const fixture of data.cases){
  621 |   notes[fixture.id]={};worksheet.caseWork[fixture.id].debriefRevealed=true;
  622 |   worksheet.caseWork[fixture.id].findings['context-0']={purpose:'review',note:'Participant '+fixture.id+' selected context before guide revision.'};
  623 |   for(const question of guideRevisionQuestions){notes[fixture.id][question]='Participant '+fixture.id+' '+question+' before consulting the guide.';worksheet.caseWork[fixture.id].responses[question]={answer:['Q5','Q6'].includes(question)?'':'more',note:notes[fixture.id][question]};}
  624 |  }
  625 |  worksheet.activeCase='alex';await guideRevisionRestore(page,worksheet);
  626 |  let routeCount=0;
  627 |  for(let caseIndex=0;caseIndex<data.cases.length;caseIndex++){
  628 |   const fixture=data.cases[caseIndex];await page.getByTestId('case-select').selectOption(fixture.id);await guideRevisionReveal(page);
  629 |   const earlier=page.getByTestId('participant-earlier-review'),planning=page.getByTestId('participant-planning-review');
  630 |   const earlierOpen=[0,2,3].includes(caseIndex),planningOpen=[1,2,3].includes(caseIndex);
  631 |   if(earlierOpen)await openEarlierParticipantReview(page);if(planningOpen)await openPlanningReview(page);
  632 |   for(let index=0;index<guideRevisionQuestions.length;index++){
  633 |    const question=guideRevisionQuestions[index],lower=question.toLowerCase(),edit=page.getByTestId('revise-guide-'+lower),target=page.getByTestId(lower+(['Q5','Q6'].includes(question)?'-note':'-response')),note=page.getByTestId(lower+'-note');
  634 |    if(fixture.id==='taylor'&&question==='Q9')await page.setViewportSize({width:844,height:390});
  635 |    await expect(edit).toHaveAccessibleName('Revise your '+question+' reasoning');await expect(edit).toHaveAccessibleDescription(new RegExp(planningEscape(fixture.title)));
  636 |    await edit.focus();await page.keyboard.press('Enter');await expect(page.getByTestId('step-reasoning')).toHaveAttribute('aria-current','step');await expect(target).toBeFocused();await expect(target).toBeInViewport();
  637 |    await expect(note).toHaveValue(notes[fixture.id][question]);if(!['Q5','Q6'].includes(question))await expect(target).toHaveValue('more');await guideRevisionOrigin(page,question,fixture.title);
  638 |    notes[fixture.id][question]='  Participant '+fixture.id+' '+question+' revised evidence.\n<mark data-guide-revision="literal">Keep this as text</mark>\nRemaining uncertainty is recorded here.  ';
  639 |    await note.fill(notes[fixture.id][question]);await expect(note).toHaveValue(notes[fixture.id][question]);
  640 |    if(fixture.id==='taylor'&&question==='Q9'){
  641 |     const nearby=page.getByTestId('guide-return-q9');await nearby.scrollIntoViewIfNeeded();await note.focus();await expect(note).toBeFocused();await expect(nearby).toBeInViewport();
  642 |     const geometry=await page.evaluate(()=>{const main=document.querySelector('.msld-main')!,writer=document.querySelector('[data-testid="q9-note"]')!,button=document.querySelector('[data-testid="guide-return-q9"]')!;const rectangle=(node:Element)=>{const box=node.getBoundingClientRect();return {top:box.top,bottom:box.bottom,left:box.left,right:box.right,height:box.height};};return {viewport:{width:innerWidth,height:innerHeight},main:rectangle(main),writer:rectangle(writer),returnButton:rectangle(button),writerFocused:document.activeElement===writer};});
  643 |     expect(geometry.writerFocused).toBe(true);expect(geometry.writer.top).toBeGreaterThanOrEqual(geometry.main.top-1);expect(geometry.writer.bottom).toBeLessThanOrEqual(geometry.main.bottom+1);expect(geometry.returnButton.top).toBeGreaterThanOrEqual(geometry.main.top-1);expect(geometry.returnButton.bottom).toBeLessThanOrEqual(geometry.main.bottom+1);
  644 |     await writeFile(join(REPORT,'guide-revision-taylor-q9-editor-geometry.json'),JSON.stringify(geometry,null,2));await noActivityHorizontalOverflow(page);await page.screenshot({path:join(REPORT,'guide-revision-writing-taylor-q9-844x390-dark.png'),fullPage:false});await comparisonAxe(page,'axe-guide-revision-editor-844x390-dark',{width:844,height:390,theme:'dark',caseId:fixture.id,question,scope:'Active guide-origin Q9 writer and adjacent return action in the short landscape viewport'});
  645 |    }
  646 |    if(fixture.id==='marisol'&&question==='Q8'){
  647 |     await page.getByTestId('consult-evidence-q8').click();await page.getByTestId('reference-edit-context-0').focus();await page.keyboard.press('Enter');await expect(page.getByTestId('score-note-context-0')).toBeFocused();await expect(page.getByTestId('evidence-return')).toBeVisible();
  648 |     await page.getByTestId('score-note-context-0').fill('Participant Marisol evidence note during the Q8 guide detour.');await page.getByTestId('return-from-evidence').focus();await page.keyboard.press('Enter');await expect(target).toBeFocused();await expect(target).toBeInViewport();await expect(note).toHaveValue(notes[fixture.id][question]);await guideRevisionOrigin(page,question,fixture.title);
  649 |    }
  650 |    const returning=page.getByTestId(index%2?'return-to-reviewed-guide':'guide-return-'+lower);await returning.focus();await page.keyboard.press('Enter');routeCount++;
  651 |    await expect(page.getByTestId('case-select')).toHaveValue(fixture.id);await expect(page.getByTestId('step-debrief')).toHaveAttribute('aria-current','step');await expect(edit).toBeFocused();await expect(edit).toBeInViewport();await expect(page.getByTestId('reveal-debrief')).toHaveCount(0);
  652 |    if(earlierOpen)await expect(earlier).toHaveAttribute('open','');else await expect(earlier).not.toHaveAttribute('open','');if(planningOpen)await expect(planning).toHaveAttribute('open','');else await expect(planning).not.toHaveAttribute('open','');
  653 |    const card=page.getByTestId('reviewed-guide-'+lower);expect(await card.locator(':scope > p').nth(1).evaluate(node=>node.textContent)).toBe(notes[fixture.id][question]);await expect(card.locator('mark[data-guide-revision]')).toHaveCount(0);await guideRevisionNoReturnUI(page);await noActivityHorizontalOverflow(page);await noPageOverflow(page);
  654 |    if(fixture.id==='marisol'&&question==='Q9'){await page.screenshot({path:join(REPORT,'guide-revision-returned-marisol-q9-320-dark.png'),fullPage:false});await comparisonAxe(page,'axe-guide-revision-returned-320-dark',{width:320,theme:'dark',caseId:fixture.id,question,guideRevealed:true,scope:'Exact keyboard return to the originating reviewed guide question with literal participant note'});}
  655 |   }
  656 |  }
  657 |  expect(routeCount).toBe(45);
  658 |  const saved=await guideRevisionDownload(page,'guide-revision-all-five-participant-worksheet.json');assertSaveWorksheetSchema(saved,caseIds);guideRevisionNoSerializedReturn(saved);
  659 |  for(const fixture of data.cases){expect(saved.caseWork[fixture.id].debriefRevealed).toBe(true);for(const question of guideRevisionQuestions){expect(saved.caseWork[fixture.id].responses[question].note).toBe(notes[fixture.id][question]);expect(saved.caseWork[fixture.id].responses[question].answer).toBe(['Q5','Q6'].includes(question)?'':'more');}}
  660 |  expect(saved.caseWork.marisol.findings['context-0'].note).toBe('Participant Marisol evidence note during the Q8 guide detour.');
  661 |  const session=await page.evaluate(() => JSON.parse(sessionStorage.getItem('alloflow_sld_case_lab_session_v1')||'null'));expect(session).not.toBeNull();guideRevisionNoSerializedReturn(session);
  662 |  await page.setViewportSize({width:1366,height:900});await open(page,'light','?tool=maine-sld-practice&case=marisol');await guideRevisionReveal(page);await page.getByTestId('revise-guide-q8').click();await guideRevisionOrigin(page,'Q8',data.cases.find((fixture:any)=>fixture.id==='marisol').title);await expect(page.getByTestId('q8-response')).toBeFocused();await expect(page.getByTestId('q8-response')).toHaveValue('more');await expect(page.getByTestId('q8-note')).toHaveValue(notes.marisol.Q8);await page.getByTestId('guide-return-q8').click();await expect(page.getByTestId('revise-guide-q8')).toBeFocused();await expect(page.getByTestId('revise-guide-q8')).toBeInViewport();await page.screenshot({path:join(REPORT,'guide-revision-returned-marisol-q8-1366-light.png'),fullPage:false});expect(await page.evaluate(()=>(window as any).__errors)).toEqual([]);
  663 | });
  664 | 
  665 | test('reviewed guide narrative status treats whitespace as blank and guide return context clears through navigation case isolation reset restore and reload',async({page})=>{
  666 |  const data=JSON.parse(await readFile(join(ROOT,'maine_sld_case_data.json'),'utf8')),caseIds=data.cases.map((fixture:any)=>fixture.id),marisol=data.cases.find((fixture:any)=>fixture.id==='marisol');await page.setViewportSize({width:1366,height:900});await open(page,'light','?tool=maine-sld-practice&case=marisol');
  667 |  const worksheet=await guideRevisionDownload(page,'guide-revision-cleanup-seed.json');assertSaveWorksheetSchema(worksheet,caseIds);worksheet.activeCase='marisol';
  668 |  for(let index=0;index<data.cases.length;index++){const fixture=data.cases[index],work=worksheet.caseWork[fixture.id];work.debriefRevealed=true;work.responses.Q5.note=index%2?'':' \n\t ';work.responses.Q6.note=index%2?'\t \n':'';work.responses.Q8={answer:'more',note:'Participant '+fixture.id+' isolated Q8 note.'};work.findings['context-0']={purpose:'review',note:'Participant '+fixture.id+' selected evidence.'};}
  669 |  worksheet.caseWork.marisol.responses.Q5.note=' \n\t ';worksheet.caseWork.marisol.responses.Q6.note='\t \n';await guideRevisionRestore(page,worksheet);
  670 |  for(const fixture of data.cases){await page.getByTestId('case-select').selectOption(fixture.id);await guideRevisionReveal(page);for(const question of ['Q5','Q6']){const card=page.getByTestId('reviewed-guide-'+question.toLowerCase());await expect(card.locator(':scope > p')).toHaveCount(1);await expect(card.locator(':scope > p')).toHaveText('Your response: Narrative not yet recorded');await expect(card).not.toContainText('Your response: Narrative recorded');}await openEarlierParticipantReview(page);for(const question of ['Q5','Q6'])await expect(page.getByTestId('review-'+question.toLowerCase())).toContainText('Narrative not yet recorded');await noActivityHorizontalOverflow(page);}
  671 |  await page.getByTestId('case-select').selectOption('marisol');await guideRevisionReveal(page);await page.setViewportSize({width:320,height:844});for(const question of ['q5','q6']){await page.getByTestId('reviewed-guide-'+question).scrollIntoViewIfNeeded();await page.screenshot({path:join(REPORT,'guide-revision-blank-'+question+'-marisol-320-light.png'),fullPage:false});}await page.setViewportSize({width:1366,height:900});
  672 |  await page.getByTestId('revise-guide-q7').click();await guideRevisionOrigin(page,'Q7',marisol.title);await page.getByTestId('consult-evidence-q7').click();await page.getByTestId('reference-edit-context-0').click();await expect(page.getByTestId('score-note-context-0')).toBeFocused();await expect(page.getByTestId('evidence-return')).toBeVisible();await step(page,'scores');await step(page,'evidence');await guideRevisionNoReturnUI(page);await step(page,'reasoning');await guideRevisionNoReturnUI(page);await expect(page.getByTestId('q7-response')).not.toBeFocused();await guideRevisionReveal(page);await expect(page.getByTestId('revise-guide-q7')).not.toBeFocused();
  673 |  await page.getByTestId('revise-guide-q1').click();await guideRevisionOrigin(page,'Q1',marisol.title);await step(page,'debrief');await guideRevisionNoReturnUI(page);await expect(page.getByTestId('revise-guide-q1')).not.toBeFocused();await expect(page.getByRole('heading',{name:/^Suggested reasoning/})).toBeVisible();
  674 |  await page.getByTestId('revise-guide-q8').click();await page.getByTestId('q8-note').fill('Marisol guide revision must stay in Marisol.');await page.getByTestId('case-select').selectOption('taylor');await step(page,'reasoning');await guideRevisionNoReturnUI(page);await expect(page.getByTestId('q8-note')).toHaveValue(worksheet.caseWork.taylor.responses.Q8.note);await page.getByTestId('case-select').selectOption('marisol');await step(page,'reasoning');await guideRevisionNoReturnUI(page);await expect(page.getByTestId('q8-note')).toHaveValue('Marisol guide revision must stay in Marisol.');
  675 |  await guideRevisionReveal(page);await page.getByTestId('revise-guide-q5').click();await expect(page.getByTestId('q5-note')).toHaveValue(worksheet.caseWork.marisol.responses.Q5.note);await worksheetAction(page,page.getByTestId('reset-reflection'));await page.getByRole('alertdialog').getByRole('button',{name:'Keep current work',exact:true}).click();await guideRevisionOrigin(page,'Q5',marisol.title);await worksheetAction(page,page.getByTestId('reset-reflection'));await page.getByRole('alertdialog').getByRole('button',{name:'Reset this case',exact:true}).click();await guideRevisionNoReturnUI(page);await expect(page.getByTestId('q5-note')).toHaveValue('');await page.getByTestId('case-select').selectOption('taylor');await guideRevisionReveal(page);await expect(page.getByTestId('reviewed-guide-q5').locator(':scope > p')).toHaveText('Your response: Narrative not yet recorded');
  676 |  await guideRevisionRestore(page,worksheet);await guideRevisionNoReturnUI(page);await guideRevisionReveal(page);await page.getByTestId('revise-guide-q6').click();const exact='  Participant Marisol revised Q6.\n<em data-guide-revision="literal">Literal uncertainty</em>  ';await page.getByTestId('q6-note').fill(exact);
  677 |  const payload={name:'guide-revision-cleanup.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(worksheet))};await page.locator('input[type=file]').setInputFiles(payload);await page.getByRole('alertdialog').getByRole('button',{name:'Keep current work',exact:true}).click();await guideRevisionOrigin(page,'Q6',marisol.title);await expect(page.getByTestId('q6-note')).toHaveValue(exact);await page.getByTestId('guide-return-q6').focus();await page.keyboard.press('Enter');await expect(page.getByTestId('revise-guide-q6')).toBeFocused();const q6Card=page.getByTestId('reviewed-guide-q6');await expect(q6Card.locator(':scope > p').first()).toHaveText('Your response: Narrative recorded');expect(await q6Card.locator(':scope > p').nth(1).evaluate(node=>node.textContent)).toBe(exact);await expect(q6Card.locator('em[data-guide-revision]')).toHaveCount(0);
  678 |  await page.getByTestId('revise-guide-q6').click();await page.locator('input[type=file]').setInputFiles(payload);await page.getByRole('alertdialog').getByRole('button',{name:'Restore worksheet',exact:true}).click();await guideRevisionNoReturnUI(page);await step(page,'reasoning');await guideRevisionNoReturnUI(page);await expect(page.getByTestId('q6-note')).toHaveValue(worksheet.caseWork.marisol.responses.Q6.note);await guideRevisionReveal(page);await expect(page.getByTestId('participant-earlier-review')).not.toHaveAttribute('open','');await expect(page.getByTestId('participant-planning-review')).not.toHaveAttribute('open','');
  679 |  await page.getByTestId('revise-guide-q8').click();const persisted='Participant Marisol guide Q8 persists as an ordinary note.\nOne uncertainty remains.';await page.getByTestId('q8-note').fill(persisted);await guideRevisionOrigin(page,'Q8',marisol.title);const saved=await guideRevisionDownload(page,'guide-revision-active-origin-worksheet.json');assertSaveWorksheetSchema(saved,caseIds);guideRevisionNoSerializedReturn(saved);expect(saved.caseWork.marisol.responses.Q8.note).toBe(persisted);expect(saved.caseWork.taylor.responses.Q8.note).toBe(worksheet.caseWork.taylor.responses.Q8.note);const session=await page.evaluate(()=>JSON.parse(sessionStorage.getItem('alloflow_sld_case_lab_session_v1')||'null'));expect(session).not.toBeNull();guideRevisionNoSerializedReturn(session);
  680 |  await page.reload();await page.evaluate(()=>(window as any).__mount('light'));await guideRevisionNoReturnUI(page);await step(page,'reasoning');await guideRevisionNoReturnUI(page);await expect(page.getByTestId('q8-response')).not.toBeFocused();await expect(page.getByTestId('q8-note')).toHaveValue(persisted);await guideRevisionReveal(page);await expect(page.getByTestId('revise-guide-q8')).not.toBeFocused();expect(await page.getByTestId('reviewed-guide-q8').locator(':scope > p').nth(1).evaluate(node=>node.textContent)).toBe(persisted);await page.getByTestId('case-select').selectOption('taylor');await step(page,'reasoning');await expect(page.getByTestId('q8-note')).toHaveValue(worksheet.caseWork.taylor.responses.Q8.note);await guideRevisionNoReturnUI(page);await noActivityHorizontalOverflow(page);await noPageOverflow(page);expect(await page.evaluate(()=>(window as any).__errors)).toEqual([]);
  681 | });
  682 | 
  683 | // Single-slot finding recovery is transient; participant worksheet fields remain unchanged.
  684 | const findingRemovalNote=(caseId:string)=>{const begin='  Participant '+caseId+' finding evidence.\n<b data-finding-removal="literal">Keep this as text</b>\n',end='\nRemaining uncertainty.  ';return begin+'R'.repeat(4000-begin.length-end.length)+end;};
  685 | const findingRemovalContext=(fixture:any,index:number)=>({id:'context-'+index,label:typeof fixture.narrative[index]==='string'?fixture.narrative[index]:fixture.narrative[index].body||fixture.narrative[index].text||'',test:'Case record'});
  686 | async function findingRemovalDownload(page:Page,name:string){const pending=page.waitForEvent('download');await worksheetAction(page,page.getByTestId('export-reflection'));const file=await pending;const path=join(REPORT,name);await file.saveAs(path);return {worksheet:JSON.parse(await readFile(path,'utf8')),payload:{name,mimeType:'application/json',buffer:await readFile(path)}};}
  687 | async function findingRemovalRestore(page:Page,payload:any){await page.locator('input[type=file]').setInputFiles(payload);await page.getByRole('alertdialog').getByRole('button',{name:'Restore worksheet',exact:true}).click();}
> 688 | async function findingRemovalAssertRecovery(page:Page,row:any,fixture:any){const recovery=page.getByTestId('finding-removal-recovery');await expect(recovery).toBeVisible();await expect(recovery.getByTestId('undo-finding-removal')).toHaveAccessibleName('Undo removal of '+row.label+' · '+row.test+' · '+fixture.title);return recovery;}
      |                                                                                                                                                               ^ Error: expect(locator).toBeVisible() failed
  689 | function findingRemovalNoSerializedRecovery(value:any){if(!value||typeof value!=='object')return;for(const [key,item] of Object.entries(value)){expect(key).not.toMatch(/undo|removal|recovery|removedFinding/i);findingRemovalNoSerializedRecovery(item);}}
  690 | async function findingRemovalSeed(page:Page,data:any){const initial=await findingRemovalDownload(page,'finding-removal-blank-worksheet.json');const worksheet=initial.worksheet;for(const fixture of data.cases){for(let index=0;index<Math.min(3,fixture.narrative.length);index++)worksheet.caseWork[fixture.id].findings['context-'+index]={purpose:index===0?'supporting':'complicating',note:index===0?findingRemovalNote(fixture.id):'Participant '+fixture.id+' context '+index+' must retain its role and literal note.\n<em>Text only.</em>'};worksheet.caseWork[fixture.id].responses.Q9={answer:'more',note:'Participant '+fixture.id+' existing Q9 reasoning remains independent.'};}worksheet.activeCase='alex';const payload={name:'finding-removal-seed.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(worksheet))};await writeFile(join(REPORT,'finding-removal-seed.json'),payload.buffer);await findingRemovalRestore(page,payload);return {worksheet,payload};}
  691 | async function findingRemovalFocusVisible(page:Page,id:string){await expect(page.getByTestId(id)).toBeFocused();const bounds=await page.getByTestId(id).evaluate(node=>{const main=document.querySelector('.msld-main')!.getBoundingClientRect(),field=node.getBoundingClientRect();return {mainTop:main.top,mainBottom:main.bottom,fieldTop:field.top,fieldBottom:field.bottom};});expect(bounds.fieldTop).toBeGreaterThanOrEqual(bounds.mainTop-1);expect(bounds.fieldBottom).toBeLessThanOrEqual(bounds.mainBottom+1);}
  692 | async function findingRemovalAxe(page:Page,name:string,state:any){await page.addScriptTag({path:join(ROOT,'node_modules','axe-core','axe.min.js')});const violations=await page.evaluate(async()=>{const result=await (window as any).axe.run(document.querySelector('[data-testid="maine-sld-panel"]'),{resultTypes:['violations']});return result.violations.map((item:any)=>({id:item.id,impact:item.impact,nodes:item.nodes.map((node:any)=>node.html)}));});await writeFile(join(REPORT,name),JSON.stringify({...state,violations},null,2));expect(violations).toEqual([]);}
  693 | 
  694 | test('most recent finding removal can restore exact roles and literal notes across all five case records and filtered score sources without transferring recovery state',async({page})=>{
  695 |  const data=JSON.parse(await readFile(join(ROOT,'maine_sld_case_data.json'),'utf8'));await page.setViewportSize({width:1366,height:900});await open(page);const seed=await findingRemovalSeed(page,data);
  696 |  for(const fixture of data.cases){
  697 |   await page.getByTestId('case-select').selectOption(fixture.id);const row=findingRemovalContext(fixture,0);await page.getByTestId('score-pin-'+row.id).click();
  698 |   // This assertion deliberately proves the baseline lacks any recovery action.
  699 |   await findingRemovalAssertRecovery(page,row,fixture);await expect(page.getByTestId('score-pin-'+row.id)).toHaveAttribute('aria-pressed','false');
  700 |   for(const destination of ['scores','case','evidence']){await step(page,destination);await findingRemovalAssertRecovery(page,row,fixture);}
  701 |   const recovery=await findingRemovalAssertRecovery(page,row,fixture);const detail=recovery.locator('details');await expect(detail).not.toHaveAttribute('open','');await detail.locator('summary').click();expect(await detail.textContent()).toContain(findingRemovalNote(fixture.id));await expect(detail.locator('[data-finding-removal]')).toHaveCount(0);await expect(detail).toContainText('Supports the concern');
  702 |   await recovery.getByTestId('undo-finding-removal').focus();await page.keyboard.press('Enter');await expect(page.getByTestId('score-note-context-0')).toBeFocused();await expect(page.getByTestId('score-note-context-0')).toHaveValue(findingRemovalNote(fixture.id));await expect(page.getByTestId('score-purpose-context-0')).toHaveValue('supporting');await expect(page.getByTestId('finding-removal-recovery')).toHaveCount(0);await expect(page.getByTestId('score-note-context-1')).toHaveValue(seed.worksheet.caseWork[fixture.id].findings['context-1'].note);
  703 |  }
  704 |  // Separate case snapshots survive navigation in this open panel and remain one per case.
  705 |  for(const fixture of data.cases){await page.getByTestId('case-select').selectOption(fixture.id);await page.getByTestId('score-pin-context-0').click();await findingRemovalAssertRecovery(page,findingRemovalContext(fixture,0),fixture);}
  706 |  for(const fixture of data.cases){await page.getByTestId('case-select').selectOption(fixture.id);await step(page,'reasoning');await expect(page.getByTestId('finding-removal-recovery')).toHaveCount(0);await expect(page.getByTestId('q9-note')).toHaveValue(seed.worksheet.caseWork[fixture.id].responses.Q9.note);await step(page,'evidence');await findingRemovalAssertRecovery(page,findingRemovalContext(fixture,0),fixture);await page.getByTestId('undo-finding-removal').click();await expect(page.getByTestId('score-note-context-0')).toHaveValue(findingRemovalNote(fixture.id));}
  707 |  const alex=data.cases.find((fixture:any)=>fixture.id==='alex');await page.getByTestId('case-select').selectOption('alex');await step(page,'evidence');await page.getByTestId('remove-finding-context-0').click();await page.getByTestId('remove-finding-context-1').click();await findingRemovalAssertRecovery(page,findingRemovalContext(alex,1),alex);await page.getByTestId('undo-finding-removal').click();await expect(page.getByTestId('score-note-context-1')).toHaveValue(seed.worksheet.caseWork.alex.findings['context-1'].note);await expect(page.getByTestId('score-note-context-0')).toHaveCount(0);await expect(page.getByTestId('undo-finding-removal')).toHaveCount(0);
  708 |  await step(page,'case');await page.getByTestId('score-pin-context-0').click();await step(page,'evidence');await expect(page.getByTestId('score-note-context-0')).toHaveValue('');await page.getByTestId('score-purpose-context-0').selectOption('supporting');await page.getByTestId('score-note-context-0').fill(findingRemovalNote('alex'));
  709 |  let scoreCases=0;for(const fixture of data.cases){const rows=data.scoreRows.filter((row:any)=>(fixture.scoreRowIds||[]).includes(row.id)).concat(fixture.extraScoreRows||fixture.inlineScores||[]);if(!rows.length)continue;scoreCases++;const row=rows[0];await page.getByTestId('case-select').selectOption(fixture.id);await step(page,'scores');await page.getByTestId('score-pin-'+row.id).click();await step(page,'evidence');await page.getByTestId('score-purpose-'+row.id).selectOption('complicating');await page.getByTestId('score-note-'+row.id).fill(findingRemovalNote(fixture.id));await step(page,'scores');await page.getByRole('combobox',{name:/^Assessment/}).selectOption(row.test);await page.getByRole('searchbox',{name:'Search the record'}).fill(row.label);await page.getByTestId('selected-score-filter').check();await expect(page.locator('[data-testid^="score-row-"]')).toHaveCount(1);await page.getByTestId('score-pin-'+row.id).click();await expect(page.getByTestId('selected-score-filter')).toBeFocused();await expect(page.locator('[data-testid^="score-row-"]')).toHaveCount(0);await findingRemovalAssertRecovery(page,row,fixture);await page.getByTestId('undo-finding-removal').click();await expect(page.getByTestId('score-pin-'+row.id)).toBeFocused();await expect(page.getByTestId('selected-score-filter')).toBeChecked();await expect(page.getByRole('combobox',{name:/^Assessment/})).toHaveValue(row.test);await expect(page.getByRole('searchbox',{name:'Search the record'})).toHaveValue(row.label);await expect(page.locator('[data-testid^="score-row-"]')).toHaveCount(1);await step(page,'evidence');await expect(page.getByTestId('score-purpose-'+row.id)).toHaveValue('complicating');await expect(page.getByTestId('score-note-'+row.id)).toHaveValue(findingRemovalNote(fixture.id));}expect(scoreCases).toBe(4);
  710 |  // Case and full-score Undo return to their matching visible source control as well.
  711 |  const taylor=data.cases.find((fixture:any)=>fixture.id==='taylor');await page.getByTestId('case-select').selectOption('taylor');await page.getByTestId('score-pin-context-0').click();await page.getByTestId('undo-finding-removal').focus();await page.keyboard.press('Enter');await expect(page.getByTestId('score-pin-context-0')).toBeFocused();await expect(page.getByTestId('score-pin-context-0')).toHaveAttribute('aria-pressed','true');
  712 |  const taylorScore=(taylor.extraScoreRows||taylor.inlineScores)[0];await step(page,'scores');await page.getByTestId('score-pin-'+taylorScore.id).click();await page.getByTestId('undo-finding-removal').click();await expect(page.getByTestId('score-pin-'+taylorScore.id)).toBeFocused();
  713 |  const saved=await findingRemovalDownload(page,'finding-removal-all-five-restored-worksheet.json');expect(saved.worksheet.format).toBe('alloflow-maine-sld-practice');expect(saved.worksheet.schemaVersion).toBe(1);expect(saved.worksheet.moduleVersion).toBe('1.1.0');expect(Object.keys(saved.worksheet.caseWork).sort()).toEqual(data.cases.map((fixture:any)=>fixture.id).sort());findingRemovalNoSerializedRecovery(saved.worksheet);for(const fixture of data.cases){expect(saved.worksheet.caseWork[fixture.id].findings['context-0']).toEqual(seed.worksheet.caseWork[fixture.id].findings['context-0']);expect(Object.keys(saved.worksheet.caseWork[fixture.id]).sort()).toEqual(Object.keys(seed.worksheet.caseWork[fixture.id]).sort());}
  714 |  const session=await page.evaluate(()=>JSON.parse(sessionStorage.getItem('alloflow_sld_case_lab_session_v1')||'null'));expect(session).not.toBeNull();findingRemovalNoSerializedRecovery(session);expect(await page.evaluate(()=>(window as any).__errors)).toEqual([]);
  715 | });
  716 | 
  717 | test('finding removal recovery keeps neighboring board focus protects newer entries and clears only the required snapshots through reset restore and reload',async({page})=>{
  718 |  const data=JSON.parse(await readFile(join(ROOT,'maine_sld_case_data.json'),'utf8'));await page.setViewportSize({width:320,height:844});await open(page,'dark');const seed=await findingRemovalSeed(page,data),alex=data.cases.find((fixture:any)=>fixture.id==='alex'),jordan=data.cases.find((fixture:any)=>fixture.id==='jordan'),taylor=data.cases.find((fixture:any)=>fixture.id==='taylor');await step(page,'evidence');
  719 |  await page.getByTestId('remove-finding-context-0').focus();await page.keyboard.press('Enter');await findingRemovalFocusVisible(page,'score-purpose-context-1');await findingRemovalAssertRecovery(page,findingRemovalContext(alex,0),alex);await page.getByTestId('undo-finding-removal').scrollIntoViewIfNeeded();await page.screenshot({path:join(REPORT,'finding-removal-recovery-alex-320-dark.png'),fullPage:false});await findingRemovalAxe(page,'axe-finding-removal-recovery-320-dark.json',{width:320,height:844,theme:'dark',state:'Most recent removed finding recovery'});
  720 |  await page.getByTestId('remove-finding-context-2').focus();await page.keyboard.press('Enter');await findingRemovalFocusVisible(page,'score-purpose-context-1');await page.getByTestId('remove-finding-context-1').focus();await page.keyboard.press('Enter');await expect(page.getByRole('heading',{name:'Your evidence board',exact:true})).toBeFocused();await expect(page.getByTestId('score-note-context-1')).toHaveCount(0);await findingRemovalAssertRecovery(page,findingRemovalContext(alex,1),alex);await page.getByTestId('undo-finding-removal').focus();await page.keyboard.press('Enter');await findingRemovalFocusVisible(page,'score-note-context-1');await expect(page.getByTestId('score-purpose-context-1')).toHaveValue('complicating');await expect(page.getByTestId('score-note-context-1')).toHaveValue(seed.worksheet.caseWork.alex.findings['context-1'].note);
  721 |  // A deliberate new selection consumes a same-ID snapshot and keeps newer work.
  722 |  await page.getByTestId('remove-finding-context-1').click();await findingRemovalAssertRecovery(page,findingRemovalContext(alex,1),alex);await step(page,'case');await page.getByTestId('score-pin-context-1').click();await expect(page.getByTestId('finding-removal-recovery')).toHaveCount(0);await step(page,'evidence');await expect(page.getByTestId('score-purpose-context-1')).toHaveValue('review');await expect(page.getByTestId('score-note-context-1')).toHaveValue('');const newer='A newer participant finding must be kept.\n<i>Literal revised evidence.</i>';await page.getByTestId('score-purpose-context-1').selectOption('supporting');await page.getByTestId('score-note-context-1').fill(newer);await step(page,'case');await step(page,'evidence');await expect(page.getByTestId('score-note-context-1')).toHaveValue(newer);await expect(page.getByTestId('undo-finding-removal')).toHaveCount(0);
  723 |  await page.getByTestId('remove-finding-context-1').click();await page.getByTestId('case-select').selectOption('jordan');await page.getByTestId('score-pin-context-0').click();await page.getByTestId('case-select').selectOption('alex');await step(page,'evidence');await findingRemovalAssertRecovery(page,findingRemovalContext(alex,1),alex);await worksheetAction(page,page.getByTestId('reset-reflection'));await page.getByRole('alertdialog').getByRole('button',{name:'Keep current work',exact:true}).click();await findingRemovalAssertRecovery(page,findingRemovalContext(alex,1),alex);await worksheetAction(page,page.getByTestId('reset-reflection'));await page.getByRole('alertdialog').getByRole('button',{name:'Reset this case',exact:true}).click();await expect(page.getByTestId('finding-removal-recovery')).toHaveCount(0);await expect(page.getByTestId('score-note-context-1')).toHaveCount(0);
  724 |  await page.getByTestId('case-select').selectOption('jordan');await findingRemovalAssertRecovery(page,findingRemovalContext(jordan,0),jordan);await page.locator('input[type=file]').setInputFiles(seed.payload);await page.getByRole('alertdialog').getByRole('button',{name:'Keep current work',exact:true}).click();await findingRemovalAssertRecovery(page,findingRemovalContext(jordan,0),jordan);await page.getByTestId('case-select').selectOption('taylor');await page.getByTestId('score-pin-context-0').click();await findingRemovalAssertRecovery(page,findingRemovalContext(taylor,0),taylor);
  725 |  const pendingExport=await findingRemovalDownload(page,'finding-removal-pending-snapshots-worksheet.json');findingRemovalNoSerializedRecovery(pendingExport.worksheet);expect(pendingExport.worksheet.caseWork.jordan.findings['context-0']).toBeUndefined();expect(pendingExport.worksheet.caseWork.taylor.findings['context-0']).toBeUndefined();const pendingSession=await page.evaluate(()=>JSON.parse(sessionStorage.getItem('alloflow_sld_case_lab_session_v1')||'null'));expect(pendingSession).not.toBeNull();findingRemovalNoSerializedRecovery(pendingSession);
  726 |  await findingRemovalRestore(page,seed.payload);for(const fixture of data.cases){await page.getByTestId('case-select').selectOption(fixture.id);await expect(page.getByTestId('finding-removal-recovery')).toHaveCount(0);await step(page,'evidence');await expect(page.getByTestId('score-note-context-0')).toHaveValue(findingRemovalNote(fixture.id));}
  727 |  await page.getByTestId('case-select').selectOption('alex');await step(page,'evidence');await page.getByTestId('remove-finding-context-0').click();await findingRemovalAssertRecovery(page,findingRemovalContext(alex,0),alex);await expect.poll(()=>page.evaluate(()=>JSON.parse(sessionStorage.getItem('alloflow_sld_case_lab_session_v1')||'null')?.state.byCase.alex.findings['context-0']===undefined)).toBe(true);await page.reload();await page.evaluate(()=>(window as any).__mount('dark'));await expect(page.getByTestId('finding-removal-recovery')).toHaveCount(0);await step(page,'evidence');await expect(page.getByTestId('score-note-context-0')).toHaveCount(0);await expect(page.getByTestId('score-note-context-1')).toHaveValue(seed.worksheet.caseWork.alex.findings['context-1'].note);await page.getByTestId('case-select').selectOption('jordan');await expect(page.getByTestId('finding-removal-recovery')).toHaveCount(0);await step(page,'evidence');await expect(page.getByTestId('score-note-context-0')).toHaveValue(findingRemovalNote('jordan'));
  728 |  // Restoring a filtered-out score uses its stable same-step heading and leaves filters intact.
  729 |  await page.setViewportSize({width:844,height:390});const row=data.scoreRows[0];await page.getByTestId('case-select').selectOption('alex');await step(page,'scores');await page.getByTestId('score-pin-'+row.id).click();await step(page,'evidence');await page.getByTestId('score-note-'+row.id).fill('Hidden score restoration retains its participant note.');await page.getByTestId('score-purpose-'+row.id).selectOption('supporting');await step(page,'scores');await page.getByTestId('score-pin-'+row.id).click();await page.getByRole('searchbox',{name:'Search the record'}).fill('No score matches this recovery probe');await page.getByTestId('undo-finding-removal').click();await expect(page.getByRole('heading',{name:'The full score record',exact:true})).toBeFocused();await expect(page.getByRole('searchbox',{name:'Search the record'})).toHaveValue('No score matches this recovery probe');await expect(page.getByTestId('score-pin-'+row.id)).toHaveCount(0);await page.getByRole('button',{name:'Show all scores',exact:true}).click();await expect(page.getByTestId('score-pin-'+row.id)).toHaveAttribute('aria-pressed','true');await step(page,'evidence');await expect(page.getByTestId('score-note-'+row.id)).toHaveValue('Hidden score restoration retains its participant note.');await page.getByTestId('remove-finding-'+row.id).click();await findingRemovalAssertRecovery(page,row,alex);await page.getByTestId('undo-finding-removal').scrollIntoViewIfNeeded();await page.screenshot({path:join(REPORT,'finding-removal-recovery-alex-844x390-dark.png'),fullPage:false});await findingRemovalAxe(page,'axe-finding-removal-recovery-844x390-dark.json',{width:844,height:390,theme:'dark',state:'Score finding removal recovery in short landscape'});expect(await page.evaluate(()=>(window as any).__errors)).toEqual([]);
  730 | });
  731 | 
```