import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
const local = (file: string) => path.resolve(__dirname, '../..', file);
const chatSource = fs.readFileSync(local('view_persona_chat_source.jsx'), 'utf8');
const strings = JSON.parse(fs.readFileSync(local('ui_strings.js'), 'utf8'));
let css: string;
test.beforeAll(async () => {
  const postcss = require(local('desktop/web-app/node_modules/postcss'));
  const tailwind = require(local('desktop/web-app/node_modules/tailwindcss'));
  css = (await postcss([tailwind({ content: [local('view_persona_chat_source.jsx'), local('view_persona_workspace_source.jsx'), local('persona_ui_source.jsx')], corePlugins: { preflight: true } })]).process('@tailwind base; @tailwind utilities;', { from: undefined })).css;
});
async function load(page: any, screen: string, config: any = {}) {
  const errors: string[] = [];
  page.on('pageerror', (error: Error) => errors.push(error.message));
  await page.route('http://persona.test/**', (route: any) => route.fulfill({ contentType: 'text/html', body: '<!doctype html><html lang="en"><head><meta name="viewport" content="width=device-width, initial-scale=1"><title>Persona review</title></head><body><main id="root" style="height:100vh;min-width:0"></main></body></html>' }));
  await page.goto('http://persona.test/');
  await page.addStyleTag({ content: css });
  for (const file of ['react/umd/react.development.js', 'react-dom/umd/react-dom.development.js']) await page.addScriptTag({ path: local('desktop/web-app/node_modules/' + file) });
  await page.evaluate(() => { const w = window as any; w.react = w.React; });
  await page.addScriptTag({ path: local('desktop/web-app/node_modules/lucide-react/dist/umd/lucide-react.js') });
  await page.evaluate(() => { const w = window as any; w.AlloIcons = w.LucideReact; });
  for (const file of ['view_persona_chat_module.js', 'view_persona_workspace_module.js', 'app_styles_module.js']) await page.addScriptTag({ path: local(file) });
  await page.addScriptTag({ path: local('desktop/web-app/public/vendor/axe-core/axe.min.js') });
  const props = [...new Set([...chatSource.matchAll(/var \w+ = props\.(\w+)/g)].map(m => m[1]))];
  await page.evaluate(({ screen, config, strings, props }) => {
    const w = window as any, R = w.React, noop = () => {};
    const t = (key: string, params: any = {}) => { const value = key.split('.').reduce((o: any, k: string) => o?.[k], strings); return typeof value === 'string' ? value.replace(/\{(\w+)\}/g, (_, k) => params[k] ?? '') : key; };
    const people = [
      { name: 'Ada Lovelace', year: '1843', role: 'Mathematician and computing pioneer', context: 'Explore how the analytical engine could work with symbols as well as numbers.', greeting: 'What would you like to explore?', rapport: 40, initialRapport: 40, accumulatedXP: 25, quests: [] },
      { name: 'Grace Hopper', year: '1952', role: 'Computer scientist', context: 'Ask how compilers helped people express ideas in computer programs.', greeting: 'Let us compare our ideas.', rapport: 40, accumulatedXP: 25, quests: [] },
      { name: 'Alan Turing', year: '1936', role: 'Mathematician', context: 'Investigate the limits and possibilities of computation.', rapport: 40, quests: [] }
    ];
    const candidates = people.slice(0, 2);
    const defaults: any = {};
    for (const key of props) defaults[key] = /^(handle|set|generate|stop)/.test(key) ? noop : /Ref$/.test(key) ? { current: null } : false;
    Object.assign(defaults, { t, theme: config.theme || 'light', isTeacherMode: true, personaInput: '', isPersonaFreeResponse: true,
      ErrorBoundary: ({ children }: any) => children, studentProjectSettings: {}, generatedContent: { type: 'persona', data: people },
      personaState: { mode: 'single', selectedCharacter: people[0], selectedCharacters: candidates, chatHistory: [{ role: 'model', text: 'Which idea would you like to explore? Ask a question and connect it to the lesson.', speakerName: people[0].name }], suggestions: [], panelSuggestions: [], isLoading: false, harmonyScore: 40, earnedBadges: [], topicSparkCount: 0, quests: [] },
      formatInteractiveText: (text: string) => text, splitTextToSentences: (text: string) => [text], playbackState: {}, panelTtsPending: [], personaReflectionInput: '',
      CharacterColumn: ({ character }: any) => R.createElement('aside', { className: 'p-4' }, R.createElement('h2', null, character.name)),
      HarmonyMeter: () => R.createElement('div', { className: 'text-sm' }, 'Panel dialogue'),
      normalizePersonaResumeDays: () => 14, clearPersonaResumeSnapshots: async () => true, addToast: noop, extractPersonaGroundingDisclosure: () => ({ links: [], queries: [] }),
      personaTeacherEditor: null, personaTeacherEditorRef: { current: null }, getPersonaVoiceOptions: () => [] });
    for (const key of ['History', 'Sparkles', 'MessageCircleQuestion', 'CheckCircle2', 'Plus', 'RefreshCw', 'Users']) defaults[key] = w.LucideReact[key];
    Object.assign(defaults, config.props || {});
    Object.assign(defaults.personaState, config.state || {});
    w.__calls = { sent: [], selected: [], started: 0, retries: 0, archiveLoads: 0, archiveDownloads: [], archiveDeletes: [] };
    let archiveRows = config.archiveRows || [];
    function App() {
      const [current, setCurrent] = R.useState(defaults);
      R.useEffect(() => {
        const node = current.personaScrollRef?.current;
        if (node && node.__alloStickToBottom !== false) node.scrollTop = node.scrollHeight;
      }, [current.personaState.chatHistory]);
      w.__update = (patch: any) => setCurrent((prev: any) => ({ ...prev, ...patch, personaState: patch.personaState ? { ...prev.personaState, ...patch.personaState } : prev.personaState }));
      const p = { ...current,
        setPersonaState: (next: any) => setCurrent((prev: any) => ({ ...prev, personaState: typeof next === 'function' ? next(prev.personaState) : next })),
        setPersonaInput: (text: string) => w.__update({ personaInput: text }),
        setIsPersonaFreeResponse: (value: boolean) => w.__update({ isPersonaFreeResponse: value }),
        setShowPersonaHints: (value: boolean) => w.__update({ showPersonaHints: value }),
        handleToggleShowPersonaHints: () => w.__update({ showPersonaHints: !current.showPersonaHints }),
        handlePersonaChatSubmit: (text: string) => w.__calls.sent.push(text || current.personaInput),
        handlePanelChatSubmit: (text: string) => w.__calls.sent.push(text),
        handleSelectPersona: (person: any) => w.__calls.selected.push(person.name),
        handleStartPanelChat: () => w.__calls.started++,
        handleListPersonaSessionArchive: async () => {
          w.__calls.archiveLoads++;
          if (w.__calls.archiveLoads <= (config.archiveFailures || 0)) throw new Error('Storage temporarily unavailable');
          return { sessions: archiveRows.slice(), unreadable: [] };
        },
        handleDownloadPersonaSessionArchive: async (key: string, format: string) => {
          w.__calls.archiveDownloads.push({ key, format });
          if (w.__calls.archiveDownloads.length <= (config.archiveDownloadFailures || 0)) {
            if (config.archiveActionRejects) throw new Error('Download failed');
            return null;
          }
          if (config.deferArchiveDownload) return await new Promise(resolve => { w.__finishArchiveDownload = resolve; });
          return true;
        },
        handleDeletePersonaSessionArchive: async (key: string) => {
          w.__calls.archiveDeletes.push(key);
          if (w.__calls.archiveDeletes.length <= (config.archiveDeleteFailures || 0)) {
            if (config.archiveActionRejects) throw new Error('Delete failed');
            return null;
          }
          const ok = config.deferArchiveDelete ? await new Promise(resolve => { w.__finishArchiveDelete = resolve; }) : true;
          if (ok === true) archiveRows = archiveRows.filter((row: any) => row.key !== key);
          return ok;
        },
        generatePanelFollowUps: async () => { w.__calls.retries++; }, generatePersonaFollowUps: async () => { w.__calls.retries++; },
        handleTogglePanelSelection: (person: any) => { const selected = current.personaState.selectedCharacters; w.__update({ personaState: { selectedCharacters: selected.some((p: any) => p.name === person.name) ? selected.filter((p: any) => p.name !== person.name) : selected.length < 2 ? [...selected, person] : selected } }); }
      };
      const View = screen === 'workspace' ? w.AlloModules.PersonaWorkspace.PersonaWorkspaceView : w.AlloModules.PersonaChatView;
      return R.createElement(R.Fragment, null, R.createElement(w.AlloModules.AppStyles.AppStyles), R.createElement('div', { className: 'allo-docsuite theme-' + p.theme, style: { height: '100%', minWidth: 0 } }, R.createElement(View, p)));
    }
    R && w.ReactDOM.createRoot(document.getElementById('root')).render(R.createElement(App));
  }, { screen, config, strings, props });
  await expect(page.locator(screen === 'workspace' ? '[data-help-key="persona_panel"]' : '#persona-chat-title')).toHaveCount(1);
  return errors;
}
async function axe(page: any) {
  expect(await page.evaluate(async () => (await (window as any).axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag22aa'] } })).violations.map((v: any) => ({ id: v.id, targets: v.nodes.map((n: any) => n.target) })))).toEqual([]);
}
for (const mode of ['single', 'panel']) {
  test(mode + ' keeps response format stable while a reply is pending', async ({ page }) => {
    const errors = await load(page, 'chat', { state: { mode, isLoading: true } });
    await expect(page.locator('[data-help-key="persona_response_mode"]')).toBeDisabled();
    expect(errors).toEqual([]);
  });
  test(mode + ' supports multiline questions without sending Shift Enter', async ({ page }, info) => {
    await page.setViewportSize({ width: 375, height: 800 });
    const errors = await load(page, 'chat', { state: { mode } });
    const input = page.locator('[data-persona-composer] textarea');
    await input.fill('What evidence supports your view?');
    await input.evaluate((node: HTMLElement) => {
      node.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, isComposing: true }));
      node.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, keyCode: 229 }));
    });
    expect(await page.evaluate(() => (window as any).__calls.sent)).toEqual([]);
    await input.press('Shift+Enter');
    await expect(input).toHaveValue('What evidence supports your view?\n');
    expect(await page.evaluate(() => (window as any).__calls.sent)).toEqual([]);
    await input.press('Enter');
    expect(await page.evaluate(() => (window as any).__calls.sent)).toEqual(['What evidence supports your view?\n']);
    await expect(input).toBeInViewport();
    await expect(page.getByRole('log')).toBeInViewport();
    expect(await page.getByRole('log').evaluate((node: HTMLElement) => node.clientHeight >= 180)).toBe(true);
    await expect(page.getByText(strings.persona.auto_read_label, { exact: true })).toBeVisible();
    await axe(page);
    await page.screenshot({ path: info.outputPath(mode + '-writing-phone.png'), fullPage: true });
    expect(errors).toEqual([]);
  });
}
test('panel switches to writing even with existing suggestions, and hints remain optional', async ({ page }) => {
  const suggestions = Array.from({ length: 6 }, (_, i) => ({ text: 'Compare perspective ' + i }));
  const errors = await load(page, 'chat', { props: { isPersonaFreeResponse: false }, state: { mode: 'panel', panelSuggestions: suggestions } });
  await page.locator('[data-help-key="persona_response_mode"]').click();
  await expect(page.getByRole('textbox')).toBeVisible();
  await expect(page.getByRole('button', { name: /Compare perspective 0/ })).toHaveCount(0);
  await page.locator('[data-help-key="persona_show_hints"]').click();
  await expect(page.getByRole('textbox')).toBeVisible();
  await expect(page.getByRole('button', { name: /Compare perspective 0/ })).toBeVisible();
  expect(errors).toEqual([]);
});
for (const width of [320, 390, 1100]) {
  test('workspace explains selection and keeps panel controls reachable at ' + width, async ({ page }, info) => {
    await page.setViewportSize({ width, height: 800 });
    const errors = await load(page, 'workspace', { state: { mode: 'panel', selectedCharacters: [] } });
    await expect(page.locator('[data-persona-mode-guide]')).toBeVisible();
    const start = page.getByRole('button', { name: strings.common.start_panel_chat, exact: true });
    await expect(start).toBeDisabled();
    await page.locator('[data-help-key="persona_select_button"]').nth(0).click();
    await expect(page.locator('[data-persona-panel-selection]')).toContainText('Ada Lovelace');
    await expect(start).toBeDisabled();
    await page.locator('[data-help-key="persona_select_button"]').nth(1).click();
    await expect(start).toBeEnabled();
    await expect(start).toBeInViewport();
    await expect(page.locator('[data-persona-panel-selection]')).toContainText('Grace Hopper');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    const card = page.locator('[data-help-key="persona_card"]').nth(1);
    expect(await card.evaluate((node: HTMLElement) => node.getBoundingClientRect().width <= innerWidth)).toBe(true);
    await start.click();
    expect(await page.evaluate(() => (window as any).__calls.started)).toBe(1);
    await axe(page);
    await page.screenshot({ path: info.outputPath('workspace-' + width + '.png'), fullPage: true });
    expect(errors).toEqual([]);
  });
}
test('choice-only panel retains retry when no suggestions are available', async ({ page }) => {
  const errors = await load(page, 'chat', { props: { isPersonaFreeResponse: false }, state: { mode: 'panel', panelSuggestionsError: 'failed' } });
  await expect(page.getByRole('textbox')).toHaveCount(0);
  await page.getByRole('button', { name: strings.persona.retry_choices, exact: true }).click();
  expect(await page.evaluate(() => (window as any).__calls.retries)).toBe(1);
  expect(errors).toEqual([]);
});


for (const mode of ['single', 'panel']) {
  test(mode + ' exposes failed hint recovery while keeping the question editable', async ({ page }, info) => {
    await page.setViewportSize({ width: 375, height: 800 });
    const errors = await load(page, 'chat', { props: { showPersonaHints: true, personaInput: 'Keep this draft' }, state: { mode, suggestionsError: 'failed', panelSuggestionsError: 'failed' } });
    const recovery = page.locator('[data-persona-hint-recovery]');
    await expect(recovery).toContainText('could not load');
    await expect(page.getByRole('textbox')).toHaveValue('Keep this draft');
    await recovery.getByRole('button').click();
    expect(await page.evaluate(() => (window as any).__calls.retries)).toBe(1);
    await page.evaluate(() => (window as any).__update({ personaState: { isGeneratingSuggestions: true, isGeneratingPanelSuggestions: true } }));
    await expect(recovery).toContainText('Preparing');
    await expect(recovery.getByRole('button')).toHaveCount(0);
    await page.evaluate(() => (window as any).__update({ personaState: { isGeneratingSuggestions: false, isGeneratingPanelSuggestions: false } }));
    await axe(page);
    await page.screenshot({ path: info.outputPath(mode + '-hint-recovery.png'), fullPage: true });
    expect(errors).toEqual([]);
  });
  test(mode + ' keeps a failed reply visible and permits an explicit resend', async ({ page }, info) => {
    await page.setViewportSize({ width: 375, height: 800 });
    const errors = await load(page, 'chat', { props: { personaAutoSend: true, personaInput: 'Please explain the evidence.' }, state: { mode, turnError: true } });
    const recovery = page.locator('[data-persona-turn-error]');
    await expect(recovery).toContainText('Auto-Send');
    await expect(page.getByRole('textbox')).toHaveValue('Please explain the evidence.');
    await page.getByRole('button', { name: 'Send question', exact: true }).click();
    expect(await page.evaluate(() => (window as any).__calls.sent)).toEqual(['Please explain the evidence.']);
    await axe(page);
    await page.screenshot({ path: info.outputPath(mode + '-reply-recovery.png'), fullPage: true });
    expect(errors).toEqual([]);
  });
}
test('long single interview hints wrap within a phone-sized card', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 800 });
  const question = 'How does this evidence help us compare different ideas and explain our conclusions? '.repeat(4);
  await load(page, 'chat', { props: { showPersonaHints: true }, state: { suggestions: [question] } });
  const hint = page.getByRole('button', { name: question.trim(), exact: true });
  expect(await hint.evaluate((el: HTMLElement) => el.getBoundingClientRect().width <= innerWidth)).toBe(true);
});


for (const mode of ['single', 'panel']) {
  for (const width of [375, 1100]) {
    test(mode + ' preserves reading position and returns to the latest reply at ' + width, async ({ page }, info) => {
      await page.setViewportSize({ width, height: 850 });
      const history = Array.from({ length: 16 }, (_, i) => ({ role: i % 2 ? 'model' : 'user', speakerName: i % 2 ? 'Ada Lovelace' : undefined, text: 'Conversation turn ' + i + '. ' + 'Compare the evidence and explain how it supports this perspective. '.repeat(3) }));
      const errors = await load(page, 'chat', { state: { mode, chatHistory: history } });
      const log = page.getByRole('log');
      await expect.poll(() => log.evaluate((node: HTMLElement) => node.scrollHeight - node.scrollTop - node.clientHeight)).toBeLessThan(3);
      await log.evaluate((node: HTMLElement) => { node.scrollTop = 30; node.dispatchEvent(new Event('scroll')); });
      const control = page.locator('[data-persona-latest-control]');
      await expect(control.getByRole('button', { name: 'Jump to latest', exact: true })).toBeVisible();
      await expect(control.getByRole('button')).toBeInViewport();
      await expect(page.locator('[data-persona-composer] textarea')).toBeInViewport();
      expect(await log.evaluate((node: HTMLElement) => node.clientHeight)).toBeGreaterThanOrEqual(180);
      if (mode === 'single' && width === 375) {
        const details = page.locator('[data-persona-character-details]');
        await expect(details).toHaveAttribute('aria-expanded', 'false');
        await details.click();
        await expect(details).toHaveAttribute('aria-expanded', 'true');
        await expect(page.locator('#persona-character-profile')).toBeInViewport();
        await expect(control.getByRole('button')).toBeInViewport();
        await details.click();
        await expect(page.locator('#persona-character-profile')).toBeHidden();
      }
      const before = await log.evaluate((node: HTMLElement) => node.scrollTop);
      const updated = [...history, { role: 'model', speakerName: 'Ada Lovelace', text: 'A new reply arrived while you were reading earlier messages.' }];
      await page.evaluate(history => (window as any).__update({ personaState: { chatHistory: history } }), updated);
      await expect(control).toContainText('New reply');
      expect(await log.evaluate((node: HTMLElement) => node.scrollTop)).toBe(before);
      await axe(page);
      await page.screenshot({ path: info.outputPath(mode + '-new-reply-' + width + '.png'), fullPage: true });
      await control.getByRole('button').click();
      await expect(log).toBeFocused();
      await expect(control).toHaveCount(0);
      await expect(log.getByText(updated.at(-1)!.text, { exact: false }).first()).toBeInViewport();
      await page.evaluate(history => (window as any).__update({ personaState: { chatHistory: history } }), [...updated, { role: 'model', speakerName: 'Ada Lovelace', text: 'The next reply follows normally.' }]);
      await expect.poll(() => log.evaluate((node: HTMLElement) => node.scrollHeight - node.scrollTop - node.clientHeight)).toBeLessThan(3);
      expect(errors).toEqual([]);
    });
  }
  test(mode + ' saved sessions restore focus and retry a failed load', async ({ page }, info) => {
    await page.setViewportSize({ width: 375, height: 850 });
    const errors = await load(page, 'chat', { state: { mode }, archiveFailures: 1 });
    const trigger = page.getByRole('button', { name: strings.persona.archive_button, exact: true });
    // Some browsers do not focus buttons on pointer activation.
    await page.getByRole('textbox').focus();
    await trigger.evaluate((node: HTMLElement) => node.click());
    const archive = page.locator('[data-persona-archive-dialog]');
    await expect(archive.getByRole('button', { name: strings.common.close, exact: true })).toBeFocused();
    await expect(archive.getByRole('alert')).toContainText(strings.persona.archive_list_failed);
    await archive.getByRole('button', { name: 'Retry loading saved sessions', exact: true }).click();
    await expect(archive).toContainText(strings.persona.archive_empty);
    await expect(archive.getByRole('button', { name: strings.common.close, exact: true })).toBeFocused();
    expect(await page.evaluate(() => (window as any).__calls.archiveLoads)).toBe(2);
    await axe(page);
    await page.screenshot({ path: info.outputPath(mode + '-saved-sessions.png'), fullPage: true });
    await page.keyboard.press('Escape');
    await expect(archive).toHaveCount(0);
    await expect(trigger).toBeFocused();
    await trigger.click();
    await archive.getByRole('button', { name: strings.common.close, exact: true }).click();
    await expect(trigger).toBeFocused();
    expect(errors).toEqual([]);
  });
}

for (const mode of ['single', 'panel']) {
  test(mode + ' saved session downloads recover and serialize rapid actions', async ({ page }, info) => {
    await page.setViewportSize({ width: 375, height: 850 });
    const rows = [
      { key: 'one', title: 'Ada Lovelace: evidence and imagination', messageCount: 8, audioClips: 2, language: 'English' },
      { key: 'two', title: 'Grace Hopper: exploring compilers', messageCount: 4, audioClips: 0 }
    ];
    const errors = await load(page, 'chat', { state: { mode }, archiveRows: rows, archiveDownloadFailures: 1, archiveActionRejects: mode === 'panel', deferArchiveDownload: true });
    const trigger = page.getByRole('button', { name: strings.persona.archive_button, exact: true });
    await trigger.click();
    const archive = page.locator('[data-persona-archive-dialog]');
    const row = archive.getByRole('listitem').nth(0), otherRow = archive.getByRole('listitem').nth(1);
    const download = row.getByRole('button', { name: new RegExp('^' + strings.persona.archive_download_page) });
    await download.click();
    await expect(row.getByRole('alert')).toContainText('could not be downloaded');
    await expect(download).toBeEnabled();
    expect(await page.evaluate(() => (window as any).__calls.archiveDownloads)).toEqual([{ key: 'one', format: 'html' }]);
    await download.evaluate((node: HTMLElement) => { node.click(); node.click(); });
    await expect(row.getByRole('status')).toHaveText('Preparing download…');
    await expect(row.getByRole('alert')).toHaveCount(0);
    for (const button of await archive.getByRole('listitem').getByRole('button').all()) await expect(button).toBeDisabled();
    await otherRow.getByRole('button').first().evaluate((node: HTMLElement) => node.click());
    expect(await page.evaluate(() => (window as any).__calls.archiveDownloads)).toHaveLength(2);
    await expect(download).toHaveAttribute('aria-busy', 'true');
    await axe(page);
    await page.screenshot({ path: info.outputPath(mode + '-archive-download-pending.png'), fullPage: true });
    // Closing and reopening must preserve the pending lock and useful progress.
    await page.keyboard.press('Escape');
    await expect(trigger).toBeFocused();
    await trigger.click();
    await expect(download).toBeDisabled();
    await expect(row.getByRole('status')).toHaveText('Preparing download…');
    await page.evaluate(() => (window as any).__finishArchiveDownload(true));
    await expect(row.getByRole('status')).toHaveText('Download started.');
    await expect(download).toBeEnabled();
    await expect(otherRow.getByRole('button').first()).toBeEnabled();
    await expect(row.getByRole('alert')).toHaveCount(0);
    // The file action uses the JSON format and participates in the same lock.
    await row.getByRole('button', { name: new RegExp('^' + strings.persona.archive_download_file) }).click();
    await expect.poll(() => page.evaluate(() => (window as any).__calls.archiveDownloads.at(-1))).toEqual({ key: 'one', format: 'json' });
    await page.evaluate(() => (window as any).__finishArchiveDownload(true));
    await expect(download).toBeEnabled();
    expect(errors).toEqual([]);
  });
  test(mode + ' saved session deletion can cancel and recover with focus intact', async ({ page }, info) => {
    await page.setViewportSize({ width: 320, height: 800 });
    const errors = await load(page, 'chat', { state: { mode }, archiveRows: [{ key: 'one', title: 'Ada Lovelace: evidence and imagination', messageCount: 8, audioClips: 2 }], archiveDeleteFailures: 1, archiveActionRejects: mode === 'panel', deferArchiveDelete: true });
    await page.getByRole('button', { name: strings.persona.archive_button, exact: true }).click();
    const archive = page.locator('[data-persona-archive-dialog]'), row = archive.getByRole('listitem');
    const remove = row.getByRole('button', { name: new RegExp('^' + strings.persona.archive_delete + ':') });
    const confirm = row.getByRole('button', { name: new RegExp('^' + strings.persona.archive_delete_confirm) });
    await remove.click();
    await expect(row).toContainText('This cannot be undone.');
    await expect(confirm).toBeVisible();
    expect(await page.evaluate(() => (window as any).__calls.archiveDeletes)).toEqual([]);
    await axe(page);
    await page.screenshot({ path: info.outputPath(mode + '-archive-delete-confirm.png'), fullPage: true });
    await row.getByRole('button', { name: 'Cancel deletion', exact: true }).click();
    await expect(remove).toBeFocused();
    await expect(confirm).toHaveCount(0);
    await remove.click();
    await row.getByRole('button', { name: new RegExp('^' + strings.persona.archive_download_page) }).click();
    await expect(confirm).toHaveCount(0);
    await expect(row.getByRole('status')).toHaveText('Download started.');
    await remove.click();
    await confirm.click();
    await expect(row.getByRole('alert')).toContainText('could not be deleted');
    await expect(row).toHaveCount(1);
    await expect(confirm).toHaveCount(0);
    await expect(remove).toBeEnabled();
    await axe(page);
    await page.screenshot({ path: info.outputPath(mode + '-archive-delete-failed.png'), fullPage: true });
    await remove.click();
    await confirm.evaluate((node: HTMLElement) => { node.click(); node.click(); });
    await expect(row.getByRole('status')).toHaveText('Deleting session…');
    await expect(row.getByRole('alert')).toHaveCount(0);
    for (const button of await row.getByRole('button').all()) await expect(button).toBeDisabled();
    expect(await page.evaluate(() => (window as any).__calls.archiveDeletes)).toEqual(['one', 'one']);
    await page.evaluate(() => (window as any).__finishArchiveDelete(true));
    await expect(archive).toContainText(strings.persona.archive_empty);
    await expect(archive.getByRole('button', { name: strings.common.close, exact: true })).toBeFocused();
    expect(await page.evaluate(() => (window as any).__calls.archiveLoads)).toBe(2);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await axe(page);
    expect(errors).toEqual([]);
  });
}
