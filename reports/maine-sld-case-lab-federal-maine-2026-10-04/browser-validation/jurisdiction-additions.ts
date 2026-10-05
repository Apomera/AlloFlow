
// Federal/Maine jurisdiction guide: one append-only informational scenario.
async function jurisdictionKeyboardOpen(page:Page,location:string){
 const guide=page.getByTestId('jurisdiction-guide-'+location),summary=guide.locator('summary');
 await expect(summary).toHaveText('How IDEA and Maine requirements connect');
 await expect(guide).not.toHaveAttribute('open','');await summary.focus();await page.keyboard.press('Enter');
 await expect(guide).toHaveAttribute('open','');await expect(summary).toBeFocused();
 await page.keyboard.press('Space');await expect(guide).not.toHaveAttribute('open','');await page.keyboard.press('Enter');await expect(guide).toHaveAttribute('open','');
 return guide;
}
async function jurisdictionCheckGuide(guide:any,data:any){
 for(const name of ['Federal IDEA foundation','Maine implementation','Using the practice outside Maine'])await expect(guide.getByRole('heading',{level:4,name,exact:true})).toBeVisible();
 await expect(guide).toContainText('they are not a national form');await expect(guide).toContainText('MUSER VII.3 excludes SLD');await expect(guide).toContainText('Transfer prompt:');
 await expect(guide.locator('input,select,textarea,button')).toHaveCount(0);
 const links=[['34 CFR 300.304','https://sites.ed.gov/idea/regs/b/d/300.304'],['34 CFR 300.307','https://sites.ed.gov/idea/regs/b/d/300.307'],['34 CFR 300.309','https://sites.ed.gov/idea/regs/b/d/300.309'],['34 CFR 300.8(a)','https://sites.ed.gov/idea/regs/b/a/300.8'],['current MUSER Chapter 101',data.sources.find((s:any)=>s.id==='muser').url],['Maine DOE SLD form and checklist',data.sources.find((s:any)=>s.id==='sld-form').url]];
 await expect(guide.locator('a')).toHaveCount(6);
 for(const [name,href] of links){const link=guide.getByRole('link',{name:name+' (opens in a new tab)',exact:true});await expect(link).toHaveAttribute('href',href);await expect(link).toHaveAttribute('target','_blank');await expect(link).toHaveAttribute('rel','noopener noreferrer');}
}
async function jurisdictionCapture(page:Page,location:string,name:string){
 const guide=page.getByTestId('jurisdiction-guide-'+location);
 await guide.locator('summary').evaluate(node=>node.scrollIntoView({block:'start'}));await noPageOverflow(page);await noActivityHorizontalOverflow(page);
 await page.screenshot({path:join(REPORT,name),fullPage:false});
}
test('federal and Maine jurisdiction disclosures work by keyboard without grading or changing participant worksheet work',async({page})=>{
 const data=JSON.parse(await readFile(join(ROOT,'maine_sld_case_data.json'),'utf8'));
 await page.setViewportSize({width:1366,height:900});await open(page,'light');await step(page,'scores');await page.getByTestId('score-pin-'+firstScore).click();await step(page,'evidence');
 const findingNote='  Participant literal evidence. <mark data-jurisdiction="literal">Keep the original note</mark>\nSecond paragraph.  ',q8Note='  Participant Q8 evidence remains uncertain. <b>literal Q8</b>  ',q9Note='Participant Q9 instructional need requires more discussion.\n<em>literal Q9</em>',summaryNote='  Participant independent summary before reading jurisdiction guidance.  ';
 await page.getByTestId('score-purpose-'+firstScore).selectOption('complicating');await page.getByTestId('score-note-'+firstScore).fill(findingNote);await step(page,'reasoning');await page.getByTestId('q8-response').selectOption('more');await page.getByTestId('q8-note').fill(q8Note);await page.getByTestId('q9-response').selectOption('general-ed');await page.getByTestId('q9-note').fill(q9Note);await page.getByTestId('reflection-summary').fill(summaryNote);
 const before=await findingRemovalDownload(page,'jurisdiction-before-worksheet.json');
 await step(page,'case');let guide=await jurisdictionKeyboardOpen(page,'case');await jurisdictionCheckGuide(guide,data);await jurisdictionCapture(page,'case','jurisdiction-case-1366-light.png');
 for(const viewport of [{width:320,height:740},{width:844,height:390}]){
  await page.setViewportSize(viewport);await open(page,'dark');await step(page,'case');guide=await jurisdictionKeyboardOpen(page,'case');await jurisdictionCheckGuide(guide,data);await jurisdictionCapture(page,'case','jurisdiction-case-'+viewport.width+'x'+viewport.height+'-dark.png');
  if(viewport.width===320)await findingRemovalAxe(page,'axe-jurisdiction-case-320-dark.json',{...viewport,theme:'dark',state:'Expanded informational federal/Maine guide on Case step',scope:'Active Maine SLD panel'});
 }
 await page.setViewportSize({width:1366,height:900});await open(page,'light');await step(page,'reasoning');guide=await jurisdictionKeyboardOpen(page,'reasoning');await jurisdictionCheckGuide(guide,data);await jurisdictionCapture(page,'reasoning','jurisdiction-reasoning-1366-light.png');await findingRemovalAxe(page,'axe-jurisdiction-reasoning-1366-light.json',{width:1366,height:900,theme:'light',state:'Expanded informational federal/Maine guide on Reasoning step',scope:'Active Maine SLD panel'});
 await expect(page.getByTestId('q8-response')).toHaveValue('more');await expect(page.getByTestId('q8-note')).toHaveValue(q8Note);await expect(page.getByTestId('q9-response')).toHaveValue('general-ed');await expect(page.getByTestId('q9-note')).toHaveValue(q9Note);await expect(page.getByTestId('reflection-summary')).toHaveValue(summaryNote);
 await page.getByTestId('case-select').selectOption('marisol');await step(page,'case');guide=await jurisdictionKeyboardOpen(page,'case');await jurisdictionCheckGuide(guide,data);await step(page,'reasoning');await expect(page.getByTestId('q8-response')).toHaveValue('');await expect(page.getByTestId('q9-response')).toHaveValue('');await expect(page.getByTestId('reflection-summary')).toHaveValue('');
 await page.getByTestId('case-select').selectOption('alex');await step(page,'evidence');await expect(page.getByTestId('score-purpose-'+firstScore)).toHaveValue('complicating');await expect(page.getByTestId('score-note-'+firstScore)).toHaveValue(findingNote);
 const after=await findingRemovalDownload(page,'jurisdiction-after-worksheet.json');expect(after.worksheet.caseWork).toEqual(before.worksheet.caseWork);expect(after.worksheet.reviewed).toEqual(before.worksheet.reviewed);expect(after.worksheet.schemaVersion).toBe(before.worksheet.schemaVersion);expect(after.worksheet.moduleVersion).toBe(before.worksheet.moduleVersion);expect(after.worksheet.activeCase).toBe('alex');expect(Object.keys(after.worksheet).sort()).toEqual(['activeCase','caseWork','exportedAt','format','moduleVersion','reviewed','schemaVersion'].sort());for(const work of Object.values(after.worksheet.caseWork))expect(Object.keys(work as any).sort()).toEqual(['checkAnswers','checkSubmitted','debriefRevealed','findings','reflections','responses'].sort());
 await expect(page.getByTestId('maine-sld-panel').locator('mark[data-jurisdiction],b,em').filter({hasText:'literal'})).toHaveCount(0);expect(await page.evaluate(()=>(window as any).__errors)).toEqual([]);
});
