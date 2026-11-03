import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { glossaryMediaProps } = require('./helpers/glossary_media_fixture.cjs');
const shell = readFileSync('AlloFlowANTI.txt', 'utf8');
// Exercise the functional mutation used by the host, including separate
// generated-content/history copies and its artifact-instance boundary.
const mutation = shell.slice(shell.indexOf('  const onUpdateResource = useCallback('), shell.indexOf('  const handleNoteUpdate = useCallback('));
let browser;
beforeAll(async () => { browser = await chromium.launch({ headless: true }); }, 90_000);
afterAll(async () => { await browser?.close(); }, 90_000);

async function open() {
  const page = await browser.newPage({ viewport: { width: 1200, height: 1000 }, reducedMotion: 'reduce' });
  page.setDefaultTimeout(10_000);
  await page.setContent('<!doctype html><html lang="en"><body><main id="root"></main></body></html>');
  for (const file of ['desktop/web-app/node_modules/react/umd/react.production.min.js', 'desktop/web-app/node_modules/react-dom/umd/react-dom.production.min.js',
    'annotation_suite_module.js', 'word_practice_module.js', 'view_glossary_module.js']) {
    await page.addScriptTag({ content: readFileSync(file, 'utf8') });
  }
  await page.evaluate(({ fixture, mutation }) => {
    const propsFor = new Function('return ' + fixture)();
    const makeUpdate = new Function('_resourceMutationStateRef', 'setHistory', 'setGeneratedContent', '_alloArtifactMatchesInstanceId', 'useCallback', mutation + '\nreturn onUpdateResource;');
    const data = [{ term: 'Lead', def: 'A metal.', entryId: 'metal' }, { term: 'Lead', def: 'To guide.' }];
    const original = { type: 'glossary', id: 'unit-g', _artifactInstanceId: 'current-copy', data };
    const other = { ...original, _artifactInstanceId: 'other-copy', data: structuredClone(data) };
    window.__alloOpenWordPractice = options => {
      window.lastCardWriter = options.onSaveCardAnnotations;
      return AlloModules.WordPractice.open(options);
    };
    function Host() {
      const [resource, setResource] = React.useState(original), [history, setHistory] = React.useState([other, structuredClone(original)]);
      const [teacher, setTeacher] = React.useState(true);
      const live = React.useRef({});
      live.current = { generatedContent: resource, history, isTeacherMode: teacher };
      window.fixtureState = live.current;
      window.changeTeacher = setTeacher;
      window.changeRows = transform => {
        const edit = r => r._artifactInstanceId === 'current-copy' ? { ...r, data: transform(r.data) } : r;
        setResource(edit); setHistory(list => list.map(edit));
      };
      const update = makeUpdate(live, setHistory, setResource, (r, instance) => r?._artifactInstanceId === instance, fn => fn);
      const words = resource.data.map((row, index) => ({ ...row, _originalIdx: index })).filter(row => row.entryId !== 'metal');
      return React.createElement(AlloModules.GlossaryView, propsFor({ generatedContent: resource, history, isTeacherMode: teacher,
        filteredGlossaryData: words, onUpdateResource: update, handleExportFlashcards: () => {}, handleExportGlossaryFile: () => {} }));
    }
    ReactDOM.createRoot(document.getElementById('root')).render(React.createElement(Host));
  }, { fixture: glossaryMediaProps.toString(), mutation });
  await page.locator('[data-glossary-export-toggle]').click();
  await page.getByLabel('Words to present').selectOption('filtered');
  return page;
}

async function present(page) {
  await page.getByRole('button', { name: 'Open presenter', exact: true }).click();
  await page.getByRole('button', { name: 'Present', exact: true }).click();
  await page.getByRole('button', { name: 'Annotate', exact: true }).click();
  await page.locator('[data-allo-anno-workspace]').getByRole('button', { name: /Note$/ }).waitFor();
}
const close = page => page.locator('.awp-dialog').getByRole('button', { name: 'Close', exact: true }).click();
const entry = state => state.generatedContent.data.find(row => row.entryId !== 'metal');

describe('annotating a native glossary', () => {
  it('saves, reopens and clears a note on the same filtered homograph while preserving independent edits and copies', async () => {
    const page = await open();
    try {
      await present(page);
      const target = entry(await page.evaluate(() => fixtureState)).entryId;
      expect(target).toBeTruthy();
      // Move the selected row and change content/media after opening the presenter.
      await page.evaluate(() => changeRows(rows => rows.slice().reverse().map(row => row.entryId === 'metal' ? row : { ...row, def: 'Guide a group.', _ttsAssets: { saved: 'audio-reference' } })));
      await page.locator('[data-allo-anno-workspace]').getByRole('button', { name: /Note$/ }).click();
      await page.locator('.awp-stage').click({ position: { x: 65, y: 65 } });
      await page.getByRole('textbox', { name: 'Note content', exact: true }).fill('Discuss guiding the group.');
      await page.locator('[data-allo-anno-workspace]').getByRole('button', { name: /Note$/ }).click();
      await page.waitForFunction(() => fixtureState.generatedContent.data.some(row => row.annotations?.[0]?.content === 'Discuss guiding the group.'));
      await close(page);
      const state = await page.evaluate(() => fixtureState);
      expect(entry(state)).toMatchObject({ entryId: target, def: 'Guide a group.', _ttsAssets: { saved: 'audio-reference' }, annotations: [{ kind: 'note', content: 'Discuss guiding the group.' }] });
      expect(state.history[1].data).toEqual(state.generatedContent.data);
      expect(state.history[0].data.every(row => !row.annotations)).toBe(true);
      expect(state.generatedContent.data.find(row => row.entryId === 'metal').annotations).toBeUndefined();
      await present(page);
      const sticky = page.getByRole('button', { name: /Sticky note from/ });
      expect(await sticky.count()).toBe(1);
      await sticky.click();
      expect(await page.getByRole('textbox', { name: 'Note content', exact: true }).inputValue()).toBe('Discuss guiding the group.');
      await page.getByRole('button', { name: 'Delete note', exact: true }).click();
      await page.waitForFunction(() => fixtureState.generatedContent.data.some(row => Array.isArray(row.annotations) && row.annotations.length === 0));
      await close(page);
      await present(page);
      expect(await sticky.count()).toBe(0);
    } finally { await page.close(); }
  }, 90_000);

  it('rejects saves after an entry is removed or teacher access is lost', async () => {
    const page = await open();
    try {
      await present(page);
      const id = 'entry:' + entry(await page.evaluate(() => fixtureState)).entryId;
      await page.evaluate(() => {
        window.removedRow = fixtureState.generatedContent.data.find(row => row.entryId !== 'metal');
        changeRows(rows => rows.filter(row => row.entryId === 'metal'));
      });
      await page.waitForFunction(() => fixtureState.generatedContent.data.length === 1);
      expect(await page.evaluate(id => lastCardWriter(id, [], { width: 700, height: 400 }), id)).toBe(false);
      await page.evaluate(() => {
        changeRows(rows => [...rows, removedRow]);
        changeTeacher(false);
      });
      await page.waitForFunction(() => fixtureState.isTeacherMode === false);
      expect(await page.evaluate(id => lastCardWriter(id, [], { width: 700, height: 400 }), id)).toBe(false);
      expect(await page.evaluate(() => fixtureState.history.every(resource => resource.data.every(row => !row.annotations)))).toBe(true);
    } finally { await page.close(); }
  }, 90_000);
});
