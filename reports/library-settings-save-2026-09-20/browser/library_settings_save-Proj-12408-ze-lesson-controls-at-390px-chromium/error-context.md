# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: library_settings_save.spec.ts >> Project settings prioritize lesson controls at 390px
- Location: tests\e2e\library_settings_save.spec.ts:158:7

# Error details

```
Error: expect(locator).toBeInViewport() failed

Locator: getByRole('group', { name: 'Starting point' })
Expected: in viewport
Error: strict mode violation: getByRole('group', { name: 'Starting point' }) resolved to 2 elements:
    1) <fieldset>…</fieldset> aka getByText('Starting pointGuidedTighter')
    2) <div role="group" aria-label="Starting point" class="mt-3 grid gap-2 sm:grid-cols-3">…</div> aka getByLabel('Starting point')

Call log:
  - Expect "toBeInViewport" with timeout 15000ms
  - waiting for getByRole('group', { name: 'Starting point' })

```

# Page snapshot

```yaml
- generic [ref=e1]:
  - button "Open lesson tools" [ref=e2] [cursor=pointer]
  - main [ref=e3]:
    - dialog "Student Project Settings" [active] [ref=e5]:
      - generic [ref=e6]:
        - generic [ref=e8]:
          - heading "Student Project Settings" [level=3] [ref=e9]
          - paragraph [ref=e10]: Choose a starting point, then adjust only what this lesson needs.
        - button "Close" [ref=e11] [cursor=pointer]
      - generic [ref=e12]:
        - group "Starting point" [ref=e13]:
          - generic [ref=e14]: Starting point
          - group "Starting point" [ref=e15]:
            - button "Guided Tighter guardrails and fewer student choices." [ref=e16] [cursor=pointer]:
              - generic [ref=e18]: Guided
              - generic [ref=e19]: Tighter guardrails and fewer student choices.
            - button "Balanced Recommended Common supports on with advanced choices limited." [ref=e20] [cursor=pointer]:
              - generic [ref=e21]:
                - generic [ref=e22]: Balanced
                - generic [ref=e23]: Recommended
              - generic [ref=e24]: Common supports on with advanced choices limited.
            - button "Open exploration More student control and customization." [ref=e25] [cursor=pointer]:
              - generic [ref=e27]: Open exploration
              - generic [ref=e28]: More student control and customization.
        - group "Everyday controls" [ref=e29]:
          - generic [ref=e30]: Everyday controls
          - paragraph [ref=e31]: The settings teachers change most often for a lesson.
          - generic [ref=e32]:
            - generic [ref=e34] [cursor=pointer]:
              - checkbox "Hide student AI tools Remove student-facing AI controls from this project. Teacher authoring tools remain available." [ref=e35]
              - generic [ref=e36]:
                - generic [ref=e37]: Hide student AI tools
                - generic [ref=e38]: Remove student-facing AI controls from this project. Teacher authoring tools remain available.
            - generic [ref=e40] [cursor=pointer]:
              - checkbox "Include a Work Story with student submissions Students see a plain-language record of how their work came together and choose whether to send it. You see time, revision pattern and which AlloFlow supports were used, never a score, and never what they typed." [ref=e41]
              - generic [ref=e42]:
                - generic [ref=e43]: Include a Work Story with student submissions
                - generic [ref=e44]: Students see a plain-language record of how their work came together and choose whether to send it. You see time, revision pattern and which AlloFlow supports were used, never a score, and never what they typed.
            - generic [ref=e46] [cursor=pointer]:
              - checkbox "Allow students to connect their own AI provider QR and Class Mailbox links stay AI-off by default. Enable only when school or district policy permits student-managed provider accounts and charges. Students must verify their own session-only key; your API key is never shared." [ref=e47]
              - generic [ref=e48]:
                - generic [ref=e49]: Allow students to connect their own AI provider
                - generic [ref=e50]: QR and Class Mailbox links stay AI-off by default. Enable only when school or district policy permits student-managed provider accounts and charges. Students must verify their own session-only key; your API key is never shared.
            - generic [ref=e51] [cursor=pointer]:
              - checkbox "Enable Dictation in Student Mode Allow students to use voice-to-text input." [checked] [ref=e52]
              - generic [ref=e53]:
                - generic [ref=e54]: Enable Dictation in Student Mode
                - generic [ref=e55]: Allow students to use voice-to-text input.
            - generic [ref=e56] [cursor=pointer]:
              - checkbox "Enable Socratic Tutor Allow students to ask AI for hints." [checked] [ref=e57]
              - generic [ref=e58]:
                - generic [ref=e59]: Enable Socratic Tutor
                - generic [ref=e60]: Allow students to ask AI for hints.
            - generic [ref=e61] [cursor=pointer]:
              - checkbox "Allow Adventure Free Response Let students type actions instead of just Multiple Choice." [checked] [ref=e62]
              - generic [ref=e63]:
                - generic [ref=e64]: Allow Adventure Free Response
                - generic [ref=e65]: Let students type actions instead of just Multiple Choice.
            - generic [ref=e66] [cursor=pointer]:
              - checkbox "Allow Interview Free Response Let students type questions instead of just selecting options." [checked] [ref=e67]
              - generic [ref=e68]:
                - generic [ref=e69]: Allow Interview Free Response
                - generic [ref=e70]: Let students type questions instead of just selecting options.
        - group [ref=e71]:
          - generic "Advanced lesson configuration Learner identity, tutor guidance, XP pacing, permissions, and privacy." [ref=e72] [cursor=pointer]:
            - generic [ref=e73]:
              - generic [ref=e74]: Advanced lesson configuration
              - generic [ref=e75]: Learner identity, tutor guidance, XP pacing, permissions, and privacy.
            - generic [ref=e76]: +
        - group [ref=e77]:
          - generic "School connections School Rewards and Principal Evaluation" [ref=e78] [cursor=pointer]:
            - text: School connections
            - generic [ref=e79]: School Rewards and Principal Evaluation
        - button "Report a problem or send feedback" [ref=e80] [cursor=pointer]
      - generic [ref=e81]:
        - paragraph [ref=e82]: Changes apply immediately and are saved with student projects.
        - button "Close" [ref=e83] [cursor=pointer]
```

# Test source

```ts
  61  |           handleMoveToUnit: (id: string, target: string) => { w.__events.push(['unit', id, target]); setHistory(history.map((x: any) => x._artifactInstanceId === id ? { ...x, unitId: target } : x)); },
  62  |           moveItem: (_event: any, id: string, direction: string, neighbor: string) => {
  63  |             w.__events.push(['reorder', id, direction, neighbor]);
  64  |             const next = [...history], from = next.findIndex((x: any) => x._artifactInstanceId === id), to = next.findIndex((x: any) => x._artifactInstanceId === neighbor);
  65  |             [next[from], next[to]] = [next[to], next[from]]; setHistory(next);
  66  |           },
  67  |           handleDeleteHistoryItem: (_event: any, id: string, item: any) => { w.__events.push(['delete', id, item._artifactInstanceId]); setHistory(history.filter((x: any) => x !== item)); },
  68  |           handleRestoreView: (item: any) => w.__events.push(['open', item._artifactInstanceId]),
  69  |           handleDragStart: noop, handleDragEnter: noop, handleDragEnd: noop,
  70  |         };
  71  |         return R.createElement(w.AlloModules.HistoryPanel.HistoryPanel, props);
  72  |       }
  73  |       w.ReactDOM.createRoot(document.getElementById('root')).render(R.createElement(Fixture));
  74  |     });
  75  |     await expect(page.locator('[role="listitem"]')).toHaveCount(3);
  76  |   } else if (screen === 'settings') {
  77  |     await page.addScriptTag({ path: path.join(root, 'view_project_settings_module.js') });
  78  |     await page.evaluate(() => {
  79  |       const w = window as any, R = w.React;
  80  |       w.__alloMakeQrSvg = async () => '<svg viewBox="0 0 10 10"><rect width="10" height="10"/></svg>';
  81  |       function Fixture() {
  82  |         const [settings, setSettings] = R.useState({ allowDictation: true, allowSocraticTutor: true });
  83  |         const [open, setOpen] = R.useState(true);
  84  |         w.__settings = settings;
  85  |         return open && R.createElement(w.AlloModules.ProjectSettingsView, {
  86  |           t: w.__t, isTeacherMode: true, isParentMode: !!w.__options.parent, studentProjectSettings: settings, setStudentProjectSettings: setSettings,
  87  |           handleSetIsProjectSettingsOpenToFalse: () => setOpen(false), onOpenPrincipalEvaluation: () => w.__events.push(['open-evaluation']),
  88  |           onOpenSchoolRewards: () => w.__events.push(['open-rewards']), isEvaluationPortalConnected: !!w.__options.connected,
  89  |           isRewardsPortalConnected: !!w.__options.connected, evaluationPortalUrl: w.__options.connected ? 'https://script.google.com/macros/s/example/exec' : '',
  90  |           onSaveEvaluationPortalUrl: (url: string) => { w.__events.push(['save-evaluation', url]); return { ok: true, url }; },
  91  |           onSaveRewardsPortalUrl: (url: string) => { w.__events.push(['save-rewards', url]); return { ok: true, url }; },
  92  |         });
  93  |       }
  94  |       w.ReactDOM.createRoot(document.getElementById('root')).render(R.createElement(Fixture));
  95  |     });
  96  |     await expect(page.locator('#project-settings-dialog')).toBeVisible();
  97  |   } else {
  98  |     await page.addScriptTag({ path: path.join(root, 'phase_k_helpers_module.js') });
  99  |     await page.addScriptTag({ content: transformSync(`
  100 |       const {useState,useEffect,useRef}=React; const Save=()=>null,X=()=>null;
  101 |       ${focusHook}
  102 |       ${saveDeps}
  103 |       function Fixture(){
  104 |         const [showSaveModal,setShowSaveModal]=useState(true),[saveFileName,setSaveFileName]=useState('My lesson'),[saveEncryptPassword,setSaveEncryptPassword]=useState('');
  105 |         const saveType=window.__options.student?'student':'teacher', t=window.__t,saveModalRef=useRef(null);
  106 |         const handleSetShowSaveModalToFalse=()=>setShowSaveModal(false);
  107 |         useFocusTrap(saveModalRef,showSaveModal,handleSetShowSaveModalToFalse);
  108 |         const executeSaveFile=()=>window.AlloModules.PhaseKHelpers.executeSaveFile(makeSaveDeps({saveFileName,saveType,saveEncryptPassword,setShowSaveModal,t}));
  109 |         return <>${saveMarkup}</>;
  110 |       }
  111 |       ReactDOM.createRoot(document.getElementById('root')).render(<Fixture/>);
  112 |     `, { loader: 'jsx', target: 'es2020' }).code });
  113 |     await expect(page.locator('[data-save-project-backdrop]')).toBeVisible();
  114 |   }
  115 |   return errors;
  116 | }
  117 | 
  118 | for (const width of [1440, 390]) {
  119 |   test(`Library actions and Organize retain resource identity at ${width}px`, async ({ page }, info) => {
  120 |     await page.setViewportSize({ width, height: 900 });
  121 |     const errors = await boot(page, 'history');
  122 |     const rows = page.getByRole('listitem');
  123 |     await expect(page.locator('[data-help-key="history_rename_btn"]')).toHaveCount(0);
  124 |     await expect(page.locator('[draggable="true"]')).toHaveCount(0);
  125 |     await page.screenshot({ path: info.outputPath('library-default.png'), fullPage: true });
  126 |     const actions = rows.nth(1).getByRole('button', { name: /^Actions:/ });
  127 |     await actions.focus(); await page.keyboard.press('Enter');
  128 |     await expect(rows.nth(1).locator('[data-help-key="history_rename_btn"]')).toBeVisible();
  129 |     await rows.nth(1).locator('[data-help-key="history_rename_btn"]').click();
  130 |     await rows.nth(1).locator('input').fill('Habitat comparison');
  131 |     await rows.nth(1).getByRole('button', { name: 'Save', exact: true }).click();
  132 |     await expect(rows.nth(1)).toContainText('Habitat comparison');
  133 |     await rows.nth(1).locator('[data-help-key="history_move_to_unit_btn"]').click();
  134 |     await page.getByRole('menuitem', { name: 'Science', exact: true }).click();
  135 |     await expect(rows.nth(1)).toContainText('Science');
  136 |     await page.keyboard.press('Escape');
  137 |     await expect(rows.nth(1).getByRole('button', { name: /^Actions:/ })).toBeFocused();
  138 |     await page.getByRole('button', { name: 'Organize', exact: true }).click();
  139 |     await expect(page.locator('[draggable="true"]')).toHaveCount(3);
  140 |     await rows.nth(1).locator('[data-help-key="history_item_drag"]').focus();
  141 |     await page.keyboard.press('Alt+ArrowUp');
  142 |     await expect(rows.first()).toContainText('Habitat comparison');
  143 |     await page.locator('input[type="search"]').fill('Habitat');
  144 |     await expect(page.locator('[data-help-key="history_move_down_btn"]')).toBeDisabled();
  145 |     await expect(page.locator('[draggable="true"]')).toHaveCount(0);
  146 |     await page.locator('input[type="search"]').fill('');
  147 |     await page.getByRole('button', { name: 'Done organizing', exact: true }).click();
  148 |     await rows.first().getByRole('button', { name: /^Actions:/ }).click();
  149 |     await rows.first().locator('[data-help-key="resource_delete_button"]').click();
  150 |     await expect(rows).toHaveCount(2);
  151 |     expect(await page.evaluate(() => (window as any).__events)).toEqual([
  152 |       ['unit', 'artifact-resource-1', 'unit-a'], ['reorder', 'artifact-resource-1', 'up', 'artifact-resource-0'], ['delete', 'shared-public-id', 'artifact-resource-1']
  153 |     ]);
  154 |     expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  155 |     expect(errors).toEqual([]);
  156 |   });
  157 | 
  158 |   test(`Project settings prioritize lesson controls at ${width}px`, async ({ page }, info) => {
  159 |     await page.setViewportSize({ width, height: 900 });
  160 |     const errors = await boot(page, 'settings', { connected: true });
> 161 |     await expect(page.getByRole('group', { name: 'Starting point' })).toBeInViewport();
      |                                                                       ^ Error: expect(locator).toBeInViewport() failed
  162 |     await expect(page.locator('#school-rewards-portal-url')).not.toBeVisible();
  163 |     await page.screenshot({ path: info.outputPath('settings-default.png') });
  164 |     await page.locator('#project-school-connections > summary').click();
  165 |     await expect(page.getByRole('button', { name: 'Open district portal', exact: true })).toBeVisible();
  166 |     await expect(page.locator('#principal-evaluation-portal-url')).not.toBeVisible();
  167 |     await page.locator('[aria-labelledby="principal-evaluation-title"] > details > summary').click();
  168 |     await page.locator('#principal-evaluation-portal-url').fill('https://script.google.com/macros/s/updated/exec');
  169 |     await page.locator('[aria-labelledby="principal-evaluation-title"]').getByRole('button', { name: 'Update connection' }).click();
  170 |     expect(await page.evaluate(() => (window as any).__events)).toEqual([['save-evaluation', 'https://script.google.com/macros/s/updated/exec']]);
  171 |     await page.keyboard.press('Escape');
  172 |     await expect(page.getByRole('dialog')).toHaveCount(0);
  173 |     await expect(page.locator('#opener')).toBeFocused();
  174 |     expect(errors).toEqual([]);
  175 |   });
  176 | 
  177 |   test(`Save dialog retains filename and password after stray clicks at ${width}px`, async ({ page }, info) => {
  178 |     await page.setViewportSize({ width, height: 900 });
  179 |     const errors = await boot(page, 'save');
  180 |     const name = page.locator('[data-autofocus]');
  181 |     await expect(name).toBeFocused();
  182 |     await name.fill('Ecosystems lesson');
  183 |     await page.locator('input[type="password"]').fill('draft-password');
  184 |     await page.mouse.click(2, 2);
  185 |     await expect(name).toHaveValue('Ecosystems lesson');
  186 |     await expect(page.locator('input[type="password"]')).toHaveValue('draft-password');
  187 |     await name.focus();
  188 |     await page.mouse.down(); await page.mouse.move(2, 2); await page.mouse.up();
  189 |     await expect(page.getByRole('dialog')).toBeVisible();
  190 |     await page.locator('input[type="password"]').fill('');
  191 |     await page.screenshot({ path: info.outputPath('save-dialog.png') });
  192 |     const downloadEvent = page.waitForEvent('download');
  193 |     await page.getByRole('button', { name: 'Save', exact: true }).click();
  194 |     const download = await downloadEvent;
  195 |     expect(download.suggestedFilename()).toBe('Ecosystems lesson.json');
  196 |     const file = await download.path();
  197 |     const json = JSON.parse(fs.readFileSync(file!, 'utf8'));
  198 |     expect(JSON.stringify(json)).toContain('lesson-1');
  199 |     await expect(page.getByRole('dialog')).toHaveCount(0);
  200 |     expect(errors).toEqual([]);
  201 |   });
  202 | }
  203 | 
  204 | test('Save can still be deliberately cancelled without a download', async ({ page }) => {
  205 |   for (const method of ['Escape', 'Cancel', 'Close']) {
  206 |     const errors = await boot(page, 'save', { student: true });
  207 |     let downloads = 0; const count = () => downloads++;
  208 |     page.on('download', count);
  209 |     await page.locator('[data-autofocus]').fill('Student work');
  210 |     await page.mouse.click(2, 2);
  211 |     await expect(page.getByRole('dialog')).toBeVisible();
  212 |     if (method === 'Escape') await page.keyboard.press('Escape');
  213 |     else await page.getByRole('button', { name: method === 'Close' ? /Close.*save/i : 'Cancel', exact: method !== 'Close' }).click();
  214 |     await expect(page.getByRole('dialog')).toHaveCount(0);
  215 |     expect(downloads).toBe(0); expect(errors).toEqual([]);
  216 |     page.off('download', count);
  217 |   }
  218 | });
  219 | 
  220 | test('School connections remain unavailable in family mode', async ({ page }) => {
  221 |   await boot(page, 'settings', { parent: true });
  222 |   await expect(page.locator('#project-school-connections')).toHaveCount(0);
  223 | });
  224 | 
  225 | test('Student resource order remains keyboard accessible', async ({ page }) => {
  226 |   const errors = await boot(page, 'history', { student: true });
  227 |   await page.getByRole('button', { name: 'Organize', exact: true }).click();
  228 |   await page.getByRole('listitem').nth(1).locator('[data-help-key="history_item_drag"]').focus();
  229 |   await page.keyboard.press('Alt+ArrowUp');
  230 |   await expect(page.getByRole('listitem').first()).toContainText('Compare two habitats');
  231 |   expect(errors).toEqual([]);
  232 | });
  233 | 
```