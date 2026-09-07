const fs=require('fs');let s=fs.readFileSync('story_forge_source.jsx','utf8');
s=s.replace('const rows = pageList.map((page) => {\n    const proofContext', 'const rows = pageList.map((page) => {\n    const gutterSide = getComicPageGutterSide(page.page, page.layout, printSafety);\n    const proofContext');
s=s.replace("const emptyPanelTargets = targetPanels((paragraph) => !String(paragraph?.text || paragraph?.scaffoldFrame || '').trim());", "const emptyPanelTargets = targetPanels((paragraph) => !getStoryForgeSectionText(paragraph, context.panelDialogue?.[paragraph?.id], true).trim());");
fs.writeFileSync('story_forge_source.jsx',s);
let b=fs.readFileSync('_build_story_forge_module.js','utf8');b=b.replace('_meta = { normalizeStoryForgePlan,', '_meta = { getComicExportProof, normalizeStoryForgePlan,');fs.writeFileSync('_build_story_forge_module.js',b);
const test='tests/story_forge_refinements.test.js';let ts=fs.readFileSync(test,'utf8');ts+=`
describe('comic export proof and recovery', () => {
  it('calculates gutter targets without crashing when a speech bubble is entered', () => {
    const paragraph = { id: 'one', text: '' };
    const context = { panelDialogue: { one: { speech: 'We can cooperate.' } }, panelThumbnails: { one: { letteringSpace: 'top-left' } }, comicPrintSafety: { format: 'letter', gutter: 'standard', includeBleed: true } };
    const proof = api.getComicExportProof([{ page: 1, layout: 'grid', panels: [{ paragraph, idx: 0 }] }], context);
    expect(proof.rows).toHaveLength(1);
    expect(proof.rows[0].issues.some(x => x.key === 'empty-panels')).toBe(false);
  });
  it('restores a reviewed dialogue-only comic without sending it back to an empty draft', () => {
    const draft = { phase: 'export', storyTitle: 'Bridge', artifactType: 'comic', paragraphs: [{ id: 'one', text: '' }], panelDialogue: { one: { speech: 'We can cooperate.' } } };
    draft.reviewedDraftSignature = api.getStoryForgeReviewSignature(draft);
    expect(api.getStoryForgeRestoredPhase(draft)).toBe('export');
  });
});
`;fs.writeFileSync(test,ts);
const p=__dirname+'/verify-comic.cjs';let v=fs.readFileSync(p,'utf8');v=v.replace(/ console.log\('ERRORS'.*?\n/, " await page.getByRole('textbox',{name:/Panel 1 thought/i}).fill('Together we can succeed.');\n");v=v.replace(" assert.ok(prompt.includes('We can cooperate to build a bridge.'));", " assert.ok(prompt.includes('We can cooperate to build a bridge.'));\n assert.ok(prompt.includes('Together we can succeed.'));");fs.writeFileSync(p,v);
