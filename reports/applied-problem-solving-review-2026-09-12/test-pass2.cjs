const fs=require('fs');
const p='tests/applied_challenge_interaction.test.js';let s=fs.readFileSync(p,'utf8').replace(/\r\n/g,'\n');
s=s.replace("describe('Applied Challenge Studio interactions', () => {",`describe('Applied Challenge Studio interactions', () => {
  it('links a chosen fact without writing student reasoning and focuses the new row', async () => {
    await renderChallenge();
    await clickButton('Connect to my evidence');
    expect(latest.data.evidenceLedger).toHaveLength(1);
    expect(latest.data.evidenceLedger[0]).toMatchObject({ claim: '', evidence: '', status: 'needs-check' });
    expect(latest.data.evidenceLedger[0].factId).toMatch(/^fact-/);
    expect(document.activeElement.id).toBe('aps-ledger-claim-' + latest.data.evidenceLedger[0].id);
    await clickButton('Connect to my evidence');
    expect(latest.data.evidenceLedger).toHaveLength(1);
  });

  it('brings evidence and detailed checks into the review and returns focus to an edit', async () => {
    const value=baseData();value.workspace={...value.workspace,questionAccepted:true,artifactUrl:'https://example.org/model',artifactDescription:'My model explains the two options.'};
    value.evidenceLedger=[{id:'review-row',claim:'LEDGER CLAIM SENTINEL',evidence:'LEDGER SUPPORT SENTINEL',tradeoff:'A limit'}];
    value.validationCycles=[{id:'review-check',source:'self',plan:{testQuestion:'PLAN SENTINEL'},observation:{evidence:'OBSERVATION SENTINEL'},decision:{action:'keep',reasoning:'DECISION SENTINEL'}}];
    await renderChallenge({data:value});await clickButton('5.');await clickButton('Review my response');
    expect(document.activeElement.id).toBe('aps-review-heading');
    for(const text of ['LEDGER CLAIM SENTINEL','LEDGER SUPPORT SENTINEL','PLAN SENTINEL','OBSERVATION SENTINEL','DECISION SENTINEL','My model explains the two options.'])expect(host.textContent).toContain(text);
    expect(host.textContent).not.toContain('Add a written response, or a link');
    await clickButton('Edit Build');expect(document.activeElement.id).toBe('applied-workspace-response');
  });
`);
fs.writeFileSync(p,s);
const strings='reports/applied-problem-solving-review-2026-09-12/sync-strings.cjs';s=fs.readFileSync(strings,'utf8');s=s.replace("'panel.ai_role':'Who frames the problem?',",`'panel.ai_role':'Who frames the problem?',
 'ready.feedback_needs_draft':'Add a written response, or link your work and explain its reasoning, before requesting feedback.',
 'ready.stress_needs_draft':'Add a written response, or link your work and explain its reasoning, before stress-testing it.',
 'review.part.question':'Working question','review.part.response':'My response','review.part.evidence':'Lesson connection','review.part.check':'What I checked','review.part.decision':'Keep or revise, and why','review.part.transfer':'Where else this could help',`);fs.writeFileSync(strings,s);
