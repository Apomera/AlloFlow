// Disposable file:// fixture: no server, application account, or deployment.
const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');
const assert = require('assert/strict');
const { chromium } = require('playwright');
const root = path.resolve(__dirname, '../..');
const script = file => '<script src="' + pathToFileURL(path.join(root, file)).href + '"></script>';
const fixture = path.join(__dirname, 'partial-save-browser-fixture.html');
fs.writeFileSync(fixture, `<!doctype html><html lang="en"><meta charset="utf-8"><title>Disposable reader draft fixture</title>
<style>body{font:16px system-ui;max-width:850px;margin:24px}button{padding:12px;margin:5px}textarea{display:block;width:95%;min-height:90px}label{display:block;margin:12px}fieldset{padding:15px}[role=alertdialog]{background:#fef3c7;padding:12px}img{max-width:64px}</style><div id="root"></div>
${script('desktop/web-app/node_modules/react/umd/react.development.js')}
${script('desktop/web-app/node_modules/react-dom/umd/react-dom.development.js')}
<script>window.AlloIcons=new Proxy({}, {get:()=>()=>null});</script>
${script('instructional_context_module.js')}${script('alt_text_module.js')}${script('view_simplified_module.js')}
<script>
const api=window.AlloModules.InstructionalContext, Editor=window.AlloModules.SimplifiedView.ReadingGlossEditor;
const session=window.draftSession=window.AlloModules.ReaderSupportDrafts.createSession();
const item=api.createSupportedReading('The heron stood in the water.', {id:'browser-fixture'});
const initial=JSON.parse(localStorage.getItem('reader-draft-fixture-supports')||'null') || api.upsertReadingSupport(item,null,{id:'heron',start:4,end:9,quote:'heron',text:'A bird.'});
window.AlloModules.ClassroomImagePicker=({onChoose})=>{const [query,setQuery]=React.useState('heron');return React.createElement('div',{'data-classroom-image-picker':true},React.createElement('input',{'aria-label':'Picture query',value:query,onChange:event=>setQuery(event.target.value)}),React.createElement('button',{onClick:()=>onChoose({dataUrl:'data:image/png;base64,QUJD',alt:'A heron.',source:'upload'})},'Choose fixture picture'));};
window.AlloModules.AltText.shrinkImageDataUrl=async src=>src;
window.addEventListener('beforeunload', event=>session.protectUnload(event));
function App(){const [supports,setSupports]=React.useState(initial),[away,setAway]=React.useState(false);
 const onUpdate=async(owner,action)=>{if(window.deferSave)await new Promise((resolve,reject)=>{window.releaseSave=resolve;window.rejectSave=reject;});if(window.failSave)throw Error('Fixture save failed.');const saved=api.upsertReadingSupport(item,supports,{...action.annotation,...window.partialSave});localStorage.setItem('reader-draft-fixture-supports',JSON.stringify(saved));setSupports(saved);return saved;};
 return React.createElement(React.Fragment,null,React.createElement('button',{id:'leave',onClick:()=>session.request(()=>window.nativeLeave?(window.location.href='about:blank'):setAway(true))},'Leave reader'),away?React.createElement('p',{id:'away'},'Other artifact'):React.createElement(Editor,{item,supports,onUpdate,draftSession:session}));}
ReactDOM.createRoot(document.getElementById('root')).render(React.createElement(App));
</script></html>`);
(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  await context.route(/^https?:/, route => route.abort());
  const page = await context.newPage();
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  const url = pathToFileURL(fixture).href;
  const openEditor = async () => {
    await page.getByRole('button', { name: /Review word supports/ }).click();
    await page.getByRole('button', { name: /^Edit gloss for heron/ }).click();
  };
  const reloadWithChoice = async accept => {
    let dialogType;
    page.once('dialog', async dialog => { dialogType = dialog.type(); await (accept ? dialog.accept() : dialog.dismiss()); });
    try { await page.reload({ waitUntil: 'load', timeout: 3000 }); } catch (error) { if (accept || dialogType !== 'beforeunload' || !(error.name === 'TimeoutError' || String(error.message).includes('ERR_ABORTED'))) throw error; }
    assert.equal(dialogType, 'beforeunload');
  };
  const results = [];
  try {
    await page.goto(url); await openEditor();
    await page.locator('[data-gloss-draft] textarea').fill('My unsaved browser explanation.');
    await page.locator('#leave').click(); await page.getByRole('button', { name: 'Keep editing', exact: true }).click();
    assert.equal(await page.locator('[data-gloss-draft] textarea').evaluate(node => document.activeElement === node), true);
    assert.equal(await page.locator('#away').count(), 0); results.push('Keep editing cancels navigation and restores explanation focus');
    await reloadWithChoice(false);
    assert.equal(await page.locator('[data-gloss-draft] textarea').inputValue(), 'My unsaved browser explanation.');
    results.push('Native reload cancellation preserves explanation draft');
    await page.evaluate(() => { window.deferSave = true; }); await page.locator('#leave').click(); await page.getByRole('button', { name: 'Save and continue', exact: true }).click();
    await page.waitForFunction(() => typeof window.rejectSave === 'function'); await page.getByRole('button', { name: 'Keep editing', exact: true }).click();
    await page.evaluate(() => { window.deferSave = false; window.rejectSave(new Error('Delayed fixture save failed.')); });
    await page.getByText('Delayed fixture save failed.', { exact: true }).waitFor();
    await page.waitForFunction(() => document.activeElement === document.querySelector('[data-gloss-draft] textarea'));
    assert.equal(await page.locator('#away').count(), 0); results.push('Keep editing during a pending save restores focus after the result settles');
    await page.evaluate(() => { window.failSave = true; }); await page.locator('#leave').click(); await page.getByRole('button', { name: 'Save and continue', exact: true }).click();
    await page.getByText('Fixture save failed.', { exact: true }).waitFor(); assert.equal(await page.locator('#away').count(), 0);
    await page.getByRole('button', { name: 'Keep editing', exact: true }).click(); results.push('Failed save retains draft and stays in reader');
    await page.evaluate(() => { window.failSave = false; }); await page.getByRole('button', { name: 'Save word support', exact: true }).click();
    await page.waitForFunction(() => !window.draftSession.hasChanges());
    let unexpectedDialog = false; const handler = async dialog => { unexpectedDialog = true; await dialog.dismiss(); };
    page.on('dialog', handler); await page.reload(); page.off('dialog', handler); assert.equal(unexpectedDialog, false);
    await openEditor(); assert.equal(await page.locator('[data-gloss-draft] textarea').inputValue(), 'My unsaved browser explanation.');
    results.push('Confirmed save reloads without a prompt and restores fixture-persisted explanation');
    await page.getByRole('button', { name: 'Choose a picture', exact: true }).click(); await page.getByRole('textbox', { name: 'Picture query', exact: true }).fill('marsh bird');
    await page.locator('#leave').click(); assert.equal(await page.getByRole('button', { name: 'Save and continue', exact: true }).isDisabled(), true);
    await page.getByRole('button', { name: 'Keep editing', exact: true }).click();
    assert.equal(await page.getByRole('textbox', { name: 'Picture query', exact: true }).inputValue(), 'marsh bird');
    assert.equal(await page.getByRole('textbox', { name: 'Picture query', exact: true }).evaluate(node => node === document.activeElement), true);
    results.push('Unfinished picker retains query and focus when navigation is cancelled');
    await reloadWithChoice(false); assert.equal(await page.getByRole('textbox', { name: 'Picture query', exact: true }).inputValue(), 'marsh bird');
    results.push('Native reload cancellation preserves unfinished picker work');
    await page.getByRole('button', { name: 'Cancel', exact: true }).click();
    await page.getByRole('button', { name: 'Choose a picture', exact: true }).click(); await page.getByRole('button', { name: 'Choose fixture picture', exact: true }).click();
    await page.waitForFunction(() => window.draftSession.hasChanges()); await reloadWithChoice(false);
    assert.equal(await page.locator('[data-gloss-draft] img').getAttribute('src'), 'data:image/png;base64,QUJD');
    results.push('Native reload cancellation preserves picture draft');
    await reloadWithChoice(true); await openEditor(); assert.equal(await page.locator('[data-gloss-draft] img').count(), 0);
    results.push('Explicit native leave discards the unsaved picture');
    await page.locator('[data-gloss-draft] textarea').fill('Saved before browser transition.'); await page.locator('#leave').click();
    await page.getByRole('button', { name: 'Save and continue', exact: true }).click(); await page.locator('#away').waitFor();
    assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('reader-draft-fixture-supports')).annotations[0].text), 'Saved before browser transition.');
    results.push('Save and continue persists the fixture support before unmounting');
    await page.goto(url); await openEditor(); await page.locator('[data-gloss-draft] textarea').fill('Keep this newer wording until confirmed.');
    await page.evaluate(() => { window.partialSave = { text: 'Older returned wording.' }; });
    await page.locator('#leave').click(); await page.getByRole('button', { name: 'Save and continue', exact: true }).click();
    await page.getByText('The save did not confirm all your changes. Your draft is retained. Try saving again.', { exact: true }).waitFor();
    assert.equal(await page.locator('#away').count(), 0); assert.equal(await page.locator('[data-gloss-draft] textarea').inputValue(), 'Keep this newer wording until confirmed.');
    await page.getByRole('button', { name: 'Keep editing', exact: true }).click();
    assert.equal(await page.locator('[data-gloss-draft] textarea').evaluate(node => document.activeElement === node), true);
    await reloadWithChoice(false); assert.equal(await page.locator('[data-gloss-draft] textarea').inputValue(), 'Keep this newer wording until confirmed.');
    results.push('Unconfirmed wording preserves draft and focus, blocks navigation, and protects native reload');
    await page.evaluate(() => { window.partialSave = null; }); await page.locator('#leave').click(); await page.getByRole('button', { name: 'Save and continue', exact: true }).click();
    await page.locator('#away').waitFor(); assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('reader-draft-fixture-supports')).annotations[0].text), 'Keep this newer wording until confirmed.');
    results.push('Retry confirms the retained wording before continuing');
    for (const decision of ['Discard changes', 'Save and continue']) {
      await page.goto(url); await openEditor(); await page.locator('[data-gloss-draft] textarea').fill('Draft before native leave: ' + decision);
      await page.evaluate(() => { window.nativeLeave = true; }); await page.locator('#leave').click();
      let duplicatePrompt = false; const guard = async dialog => { duplicatePrompt = true; await dialog.dismiss(); }; page.on('dialog', guard);
      await page.getByRole('button', { name: decision, exact: true }).click(); await page.waitForURL('about:blank'); page.off('dialog', guard);
      assert.equal(duplicatePrompt, false); results.push('Native leave after ' + decision + ' completes without a duplicate confirmation');
    }
    assert.deepEqual(errors, []);
    const report={browser:await browser.version(),results,pageErrors:errors};
    fs.writeFileSync(path.join(__dirname,'partial-save-browser-results.json'),JSON.stringify(report,null,2)); console.log(JSON.stringify(report,null,2));
  } finally { await context.close(); await browser.close(); }
})().catch(error=>{console.error(error);process.exitCode=1;});
