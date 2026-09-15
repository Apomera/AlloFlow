# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: persona-refinement.spec.ts >> panel supports multiline questions without sending Shift Enter
- Location: tests\e2e\persona-refinement.spec.ts:82:7

# Error details

```
Error: expect(received).toEqual(expected) // deep equality

- Expected  -  1
+ Received  + 10

- Array []
+ Array [
+   Object {
+     "id": "color-contrast",
+     "targets": Array [
+       Array [
+         ".bg-red-50 > .text-xs.font-bold",
+       ],
+     ],
+   },
+ ]
```

# Page snapshot

```yaml
- main [ref=e2]:
  - dialog "Panel Mode" [ref=e4]:
    - heading "Panel Mode" [level=1] [ref=e5]
    - generic [ref=e7]:
      - generic [ref=e8]:
        - generic [ref=e10]: Panel dialogue
        - button "Close" [ref=e11] [cursor=pointer]:
          - img [ref=e12]
      - generic [ref=e15]:
        - button "Turn on Auto-Read" [ref=e16] [cursor=pointer]:
          - img [ref=e17]
          - generic [ref=e21]: Auto-Read
        - button "Turn on Auto-Send (Voice)" [ref=e22] [cursor=pointer]:
          - img [ref=e23]
        - button "Show Suggested Questions (Scaffold)" [ref=e26] [cursor=pointer]:
          - img [ref=e27]
          - generic [ref=e32]: "Hints: Off"
        - button "Switch to Multiple Choice Mode" [pressed] [ref=e33] [cursor=pointer]:
          - img [ref=e34]
          - generic [ref=e36]: Free Text
        - button "Get a topic suggestion (2 remaining)" [ref=e37] [cursor=pointer]:
          - img [ref=e38]
        - button "Saved sessions" [ref=e41] [cursor=pointer]:
          - img [ref=e42]
        - button "Save private Persona session with narration" [ref=e44] [cursor=pointer]:
          - img [ref=e45]
        - button "Generate Summary" [disabled] [ref=e49]:
          - img [ref=e50]
        - button "Keep building rapport to unlock reflection (80% complete)" [disabled] [ref=e53]:
          - img [ref=e54]
      - generic [ref=e59]:
        - group [ref=e60]:
          - generic "Show rapport, objectives, and XP for Ada Lovelace" [ref=e61] [cursor=pointer]:
            - generic [ref=e63]: A
            - generic [ref=e64]: Ada Lovelace
            - generic [ref=e65]: 40%
            - generic [ref=e66]: ▾
        - group [ref=e67]:
          - generic "Show rapport, objectives, and XP for Grace Hopper" [ref=e68] [cursor=pointer]:
            - generic [ref=e70]: G
            - generic [ref=e71]: Grace Hopper
            - generic [ref=e72]: 40%
            - generic [ref=e73]: ▾
      - generic [ref=e75]:
        - log "Interview conversation" [ref=e76]:
          - note [ref=e77]: AI-generated historical simulation. Verify important claims with lesson evidence and trusted sources.
          - paragraph [ref=e78]: Ask, question, or respectfully disagree. Lesson answers are available at every rapport level.
          - generic [ref=e79]:
            - generic "Message from Ada Lovelace. Click any sentence to hear it read aloud." [ref=e80]:
              - paragraph [ref=e81]:
                - button "Sentence 1. Click to read aloud." [ref=e82] [cursor=pointer]: Which idea would you like to explore? Ask a question and connect it to the lesson.
              - generic [ref=e83]:
                - img [ref=e84]
                - text: Click any sentence to listen
            - generic [ref=e88]: Ada Lovelace
        - generic [ref=e89]:
          - generic [ref=e90]: Your question for the panel
          - paragraph [ref=e91]: Ask both figures to compare their ideas, explain a difference, or support a claim with evidence.
          - textbox "Your question for the panel" [active] [ref=e92]:
            - /placeholder: Ask the panel a question...
            - text: What evidence supports your view?
          - generic [ref=e93]:
            - paragraph [ref=e94]: Enter to send · Shift + Enter for a new line.
            - button "Send question" [ref=e95] [cursor=pointer]:
              - img [ref=e96]
              - text: Send question
```

# Test source

```ts
  1   | import { test, expect } from '@playwright/test';
  2   | import fs from 'node:fs';
  3   | import path from 'node:path';
  4   | const local = (file: string) => path.resolve(__dirname, '../..', file);
  5   | const chatSource = fs.readFileSync(local('view_persona_chat_source.jsx'), 'utf8');
  6   | const strings = JSON.parse(fs.readFileSync(local('ui_strings.js'), 'utf8'));
  7   | let css: string;
  8   | test.beforeAll(async () => {
  9   |   const postcss = require(local('desktop/web-app/node_modules/postcss'));
  10  |   const tailwind = require(local('desktop/web-app/node_modules/tailwindcss'));
  11  |   css = (await postcss([tailwind({ content: [local('view_persona_chat_source.jsx'), local('view_persona_workspace_source.jsx'), local('persona_ui_source.jsx')], corePlugins: { preflight: true } })]).process('@tailwind base; @tailwind utilities;', { from: undefined })).css;
  12  | });
  13  | async function load(page: any, screen: string, config: any = {}) {
  14  |   const errors: string[] = [];
  15  |   page.on('pageerror', (error: Error) => errors.push(error.message));
  16  |   await page.route('http://persona.test/**', (route: any) => route.fulfill({ contentType: 'text/html', body: '<!doctype html><html lang="en"><head><meta name="viewport" content="width=device-width, initial-scale=1"><title>Persona review</title></head><body><main id="root" style="height:100vh;min-width:0"></main></body></html>' }));
  17  |   await page.goto('http://persona.test/');
  18  |   await page.addStyleTag({ content: css });
  19  |   for (const file of ['react/umd/react.development.js', 'react-dom/umd/react-dom.development.js']) await page.addScriptTag({ path: local('desktop/web-app/node_modules/' + file) });
  20  |   await page.evaluate(() => { const w = window as any; w.react = w.React; });
  21  |   await page.addScriptTag({ path: local('desktop/web-app/node_modules/lucide-react/dist/umd/lucide-react.js') });
  22  |   await page.evaluate(() => { const w = window as any; w.AlloIcons = w.LucideReact; });
  23  |   for (const file of ['view_persona_chat_module.js', 'view_persona_workspace_module.js', 'app_styles_module.js']) await page.addScriptTag({ path: local(file) });
  24  |   await page.addScriptTag({ path: local('desktop/web-app/public/vendor/axe-core/axe.min.js') });
  25  |   const props = [...new Set([...chatSource.matchAll(/var \w+ = props\.(\w+)/g)].map(m => m[1]))];
  26  |   await page.evaluate(({ screen, config, strings, props }) => {
  27  |     const w = window as any, R = w.React, noop = () => {};
  28  |     const t = (key: string, params: any = {}) => { const value = key.split('.').reduce((o: any, k: string) => o?.[k], strings); return typeof value === 'string' ? value.replace(/\{(\w+)\}/g, (_, k) => params[k] ?? '') : key; };
  29  |     const people = [
  30  |       { name: 'Ada Lovelace', year: '1843', role: 'Mathematician and computing pioneer', context: 'Explore how the analytical engine could work with symbols as well as numbers.', greeting: 'What would you like to explore?', rapport: 40, initialRapport: 40, accumulatedXP: 25, quests: [] },
  31  |       { name: 'Grace Hopper', year: '1952', role: 'Computer scientist', context: 'Ask how compilers helped people express ideas in computer programs.', greeting: 'Let us compare our ideas.', rapport: 40, accumulatedXP: 25, quests: [] },
  32  |       { name: 'Alan Turing', year: '1936', role: 'Mathematician', context: 'Investigate the limits and possibilities of computation.', rapport: 40, quests: [] }
  33  |     ];
  34  |     const candidates = people.slice(0, 2);
  35  |     const defaults: any = {};
  36  |     for (const key of props) defaults[key] = /^(handle|set|generate|stop)/.test(key) ? noop : /Ref$/.test(key) ? { current: null } : false;
  37  |     Object.assign(defaults, { t, theme: config.theme || 'light', isTeacherMode: true, personaInput: '', isPersonaFreeResponse: true,
  38  |       ErrorBoundary: ({ children }: any) => children, studentProjectSettings: {}, generatedContent: { type: 'persona', data: people },
  39  |       personaState: { mode: 'single', selectedCharacter: people[0], selectedCharacters: candidates, chatHistory: [{ role: 'model', text: 'Which idea would you like to explore? Ask a question and connect it to the lesson.', speakerName: people[0].name }], suggestions: [], panelSuggestions: [], isLoading: false, harmonyScore: 40, earnedBadges: [], topicSparkCount: 0, quests: [] },
  40  |       formatInteractiveText: (text: string) => text, splitTextToSentences: (text: string) => [text], playbackState: {}, panelTtsPending: [], personaReflectionInput: '',
  41  |       CharacterColumn: ({ character }: any) => R.createElement('aside', { className: 'p-4' }, R.createElement('h2', null, character.name)),
  42  |       HarmonyMeter: () => R.createElement('div', { className: 'text-sm' }, 'Panel dialogue'),
  43  |       normalizePersonaResumeDays: () => 14, clearPersonaResumeSnapshots: async () => true, addToast: noop, extractPersonaGroundingDisclosure: () => ({ links: [], queries: [] }),
  44  |       personaTeacherEditor: null, personaTeacherEditorRef: { current: null }, getPersonaVoiceOptions: () => [] });
  45  |     for (const key of ['History', 'Sparkles', 'MessageCircleQuestion', 'CheckCircle2', 'Plus', 'RefreshCw', 'Users']) defaults[key] = w.LucideReact[key];
  46  |     Object.assign(defaults, config.props || {});
  47  |     Object.assign(defaults.personaState, config.state || {});
  48  |     w.__calls = { sent: [], selected: [], started: 0, retries: 0 };
  49  |     function App() {
  50  |       const [current, setCurrent] = R.useState(defaults);
  51  |       w.__update = (patch: any) => setCurrent((prev: any) => ({ ...prev, ...patch, personaState: patch.personaState ? { ...prev.personaState, ...patch.personaState } : prev.personaState }));
  52  |       const p = { ...current,
  53  |         setPersonaState: (next: any) => setCurrent((prev: any) => ({ ...prev, personaState: typeof next === 'function' ? next(prev.personaState) : next })),
  54  |         setPersonaInput: (text: string) => w.__update({ personaInput: text }),
  55  |         setIsPersonaFreeResponse: (value: boolean) => w.__update({ isPersonaFreeResponse: value }),
  56  |         setShowPersonaHints: (value: boolean) => w.__update({ showPersonaHints: value }),
  57  |         handleToggleShowPersonaHints: () => w.__update({ showPersonaHints: !current.showPersonaHints }),
  58  |         handlePersonaChatSubmit: (text: string) => w.__calls.sent.push(text || current.personaInput),
  59  |         handlePanelChatSubmit: (text: string) => w.__calls.sent.push(text),
  60  |         handleSelectPersona: (person: any) => w.__calls.selected.push(person.name),
  61  |         handleStartPanelChat: () => w.__calls.started++,
  62  |         generatePanelFollowUps: async () => { w.__calls.retries++; }, generatePersonaFollowUps: async () => { w.__calls.retries++; },
  63  |         handleTogglePanelSelection: (person: any) => { const selected = current.personaState.selectedCharacters; w.__update({ personaState: { selectedCharacters: selected.some((p: any) => p.name === person.name) ? selected.filter((p: any) => p.name !== person.name) : selected.length < 2 ? [...selected, person] : selected } }); }
  64  |       };
  65  |       const View = screen === 'workspace' ? w.AlloModules.PersonaWorkspace.PersonaWorkspaceView : w.AlloModules.PersonaChatView;
  66  |       return R.createElement(R.Fragment, null, R.createElement(w.AlloModules.AppStyles.AppStyles), R.createElement('div', { className: 'allo-docsuite theme-' + p.theme, style: { height: '100%', minWidth: 0 } }, R.createElement(View, p)));
  67  |     }
  68  |     R && w.ReactDOM.createRoot(document.getElementById('root')).render(R.createElement(App));
  69  |   }, { screen, config, strings, props });
  70  |   await expect(page.locator(screen === 'workspace' ? '[data-help-key="persona_panel"]' : '#persona-chat-title')).toHaveCount(1);
  71  |   return errors;
  72  | }
  73  | async function axe(page: any) {
> 74  |   expect(await page.evaluate(async () => (await (window as any).axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag22aa'] } })).violations.map((v: any) => ({ id: v.id, targets: v.nodes.map((n: any) => n.target) })))).toEqual([]);
      |                                                                                                                                                                                                                                                      ^ Error: expect(received).toEqual(expected) // deep equality
  75  | }
  76  | for (const mode of ['single', 'panel']) {
  77  |   test(mode + ' keeps response format stable while a reply is pending', async ({ page }) => {
  78  |     const errors = await load(page, 'chat', { state: { mode, isLoading: true } });
  79  |     await expect(page.locator('[data-help-key="persona_response_mode"]')).toBeDisabled();
  80  |     expect(errors).toEqual([]);
  81  |   });
  82  |   test(mode + ' supports multiline questions without sending Shift Enter', async ({ page }, info) => {
  83  |     await page.setViewportSize({ width: 375, height: 800 });
  84  |     const errors = await load(page, 'chat', { state: { mode } });
  85  |     const input = page.locator('[data-persona-composer] textarea');
  86  |     await input.fill('What evidence supports your view?');
  87  |     await input.evaluate((node: HTMLElement) => {
  88  |       node.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, isComposing: true }));
  89  |       node.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, keyCode: 229 }));
  90  |     });
  91  |     expect(await page.evaluate(() => (window as any).__calls.sent)).toEqual([]);
  92  |     await input.press('Shift+Enter');
  93  |     await expect(input).toHaveValue('What evidence supports your view?\n');
  94  |     expect(await page.evaluate(() => (window as any).__calls.sent)).toEqual([]);
  95  |     await input.press('Enter');
  96  |     expect(await page.evaluate(() => (window as any).__calls.sent)).toEqual(['What evidence supports your view?\n']);
  97  |     await expect(input).toBeInViewport();
  98  |     await expect(page.getByRole('log')).toBeInViewport();
  99  |     expect(await page.getByRole('log').evaluate((node: HTMLElement) => node.clientHeight >= 180)).toBe(true);
  100 |     await expect(page.getByText(strings.persona.auto_read_label, { exact: true })).toBeVisible();
  101 |     await axe(page);
  102 |     await page.screenshot({ path: info.outputPath(mode + '-writing-phone.png'), fullPage: true });
  103 |     expect(errors).toEqual([]);
  104 |   });
  105 | }
  106 | test('panel switches to writing even with existing suggestions, and hints remain optional', async ({ page }) => {
  107 |   const suggestions = Array.from({ length: 6 }, (_, i) => ({ text: 'Compare perspective ' + i }));
  108 |   const errors = await load(page, 'chat', { props: { isPersonaFreeResponse: false }, state: { mode: 'panel', panelSuggestions: suggestions } });
  109 |   await page.locator('[data-help-key="persona_response_mode"]').click();
  110 |   await expect(page.getByRole('textbox')).toBeVisible();
  111 |   await expect(page.getByRole('button', { name: /Compare perspective 0/ })).toHaveCount(0);
  112 |   await page.locator('[data-help-key="persona_show_hints"]').click();
  113 |   await expect(page.getByRole('textbox')).toBeVisible();
  114 |   await expect(page.getByRole('button', { name: /Compare perspective 0/ })).toBeVisible();
  115 |   expect(errors).toEqual([]);
  116 | });
  117 | for (const width of [320, 390, 1100]) {
  118 |   test('workspace explains selection and keeps panel controls reachable at ' + width, async ({ page }, info) => {
  119 |     await page.setViewportSize({ width, height: 800 });
  120 |     const errors = await load(page, 'workspace', { state: { mode: 'panel', selectedCharacters: [] } });
  121 |     await expect(page.locator('[data-persona-mode-guide]')).toBeVisible();
  122 |     const start = page.getByRole('button', { name: strings.common.start_panel_chat, exact: true });
  123 |     await expect(start).toBeDisabled();
  124 |     await page.locator('[data-help-key="persona_select_button"]').nth(0).click();
  125 |     await expect(page.locator('[data-persona-panel-selection]')).toContainText('Ada Lovelace');
  126 |     await expect(start).toBeDisabled();
  127 |     await page.locator('[data-help-key="persona_select_button"]').nth(1).click();
  128 |     await expect(start).toBeEnabled();
  129 |     await expect(start).toBeInViewport();
  130 |     await expect(page.locator('[data-persona-panel-selection]')).toContainText('Grace Hopper');
  131 |     expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  132 |     const card = page.locator('[data-help-key="persona_card"]').nth(1);
  133 |     expect(await card.evaluate((node: HTMLElement) => node.getBoundingClientRect().width <= innerWidth)).toBe(true);
  134 |     await start.click();
  135 |     expect(await page.evaluate(() => (window as any).__calls.started)).toBe(1);
  136 |     await axe(page);
  137 |     await page.screenshot({ path: info.outputPath('workspace-' + width + '.png'), fullPage: true });
  138 |     expect(errors).toEqual([]);
  139 |   });
  140 | }
  141 | test('choice-only panel retains retry when no suggestions are available', async ({ page }) => {
  142 |   const errors = await load(page, 'chat', { props: { isPersonaFreeResponse: false }, state: { mode: 'panel', panelSuggestionsError: 'failed' } });
  143 |   await expect(page.getByRole('textbox')).toHaveCount(0);
  144 |   await page.getByRole('button', { name: strings.persona.retry_choices, exact: true }).click();
  145 |   expect(await page.evaluate(() => (window as any).__calls.retries)).toBe(1);
  146 |   expect(errors).toEqual([]);
  147 | });
  148 | 
```