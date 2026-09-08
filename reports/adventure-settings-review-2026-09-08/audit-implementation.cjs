const fs = require('fs');
const path = require('path');
const { chromium } = require('@playwright/test');
const outputDir = path.join(__dirname, 'implementation'); fs.mkdirSync(outputDir, { recursive: true });
const root = path.resolve(__dirname, '../..');
const local = p => path.join(root, p);
const source = fs.readFileSync(local('view_adventure_source.jsx'), 'utf8');
const sidebar = fs.readFileSync(local('view_sidebar_panels_source.jsx'), 'utf8');
const postcss = require(local('desktop/web-app/node_modules/postcss'));
const tailwind = require(local('desktop/web-app/node_modules/tailwindcss'));
const strings = JSON.parse(fs.readFileSync(local('ui_strings.js'), 'utf8'));
(async () => {
  const css = (await postcss([tailwind({ content: [local('view_adventure_source.jsx'), local('view_sidebar_panels_source.jsx')], corePlugins: { preflight: true } })]).process('@tailwind base; @tailwind utilities;', { from: undefined })).css;
  const browser = await chromium.launch({ headless: true });
  const results = [];
  try {
    for (const config of [
      { name: 'teacher-desktop', width: 1200, teacher: true },
      { name: 'teacher-phone', width: 375, teacher: true },
      { name: 'student-locked', width: 375, teacher: false, locked: true },
      { name: 'social-setup', width: 1000, teacher: true, social: true },
      { name: 'systems-setup', width: 1000, teacher: true, systems: true },
      { name: 'sidebar-teacher', width: 380, teacher: true, sidebar: true },
      { name: 'sidebar-locked', width: 380, teacher: false, locked: true, sidebar: true }
    ]) {
      if (process.env.AUDIT_SIDEBAR_ONLY && !config.sidebar) continue;
      const page = await browser.newPage({ viewport: { width: config.width, height: 900 } });
      const errors = [];
      page.on('pageerror', e => { errors.push(e.message); console.log('PAGE ERROR', e.message); });
      await page.setContent('<!doctype html><html lang="en"><head><title>Adventure settings review</title></head><body><main id="root"></main></body></html>');
      await page.addStyleTag({ content: css });
      for (const file of ['react/umd/react.development.js', 'react-dom/umd/react-dom.development.js']) await page.addScriptTag({ path: local('desktop/web-app/node_modules/' + file) });
      await page.evaluate(() => { window.react = window.React; });
      await page.addScriptTag({ path: local('desktop/web-app/node_modules/lucide-react/dist/umd/lucide-react.js') });
      const tags = [...new Set([... (source + sidebar).matchAll(/<([A-Z][A-Za-z0-9]*)/g)].map(m => m[1]))];
      await page.evaluate(tags => {
        window.AlloIcons = window.LucideReact;
        for (const name of tags) {
          if (['React','Fragment','Map'].includes(name)) continue;
          window[name] = window.LucideReact[name] || (() => null);
        }
      }, tags);
      await page.addScriptTag({ path: local('view_adventure_module.js') });
      await page.addScriptTag({ path: local('view_sidebar_panels_module.js') });
      const propNames = [...new Set([...source.matchAll(/var \w+ = props\.(\w+)/g)].map(m => m[1]))];
      await page.evaluate(({ config, strings, propNames }) => {
        const R = window.React, noop = () => {};
        const translate = key => key.split('.').reduce((v,k) => v && v[k], strings) || key;
        const props = {}; for (const [key, value] of Object.entries(window.LucideReact)) props[key] = value;
        for (const name of propNames) props[name] = /^(set|handle|open|toggle|stop|prewarm|save|execute)/.test(name) ? noop : /^[A-Z]/.test(name) ? window[name] || (() => null) : /Ref$/.test(name) ? { current: null } : false;
        Object.assign(props, {
          theme: 'light', t: translate, activeView: 'adventure', isTeacherMode: config.teacher,
          adventureInputMode: config.systems ? 'system' : 'choice', adventureLanguageMode: 'English', adventureDifficulty: 'Normal',
          adventureArtStyle: 'auto', adventureTextInput: '', adventureCustomInstructions: '', adventureCustomArtStyle: '', universalImageStyle: '',
          selectedLanguages: ['Spanish'], editingOptionsBuffer: [], sessionData: null, playbackState: {}, adventureEffects: [],
          globalPoints: 100, isZenMode: true, showNewGameSetup: true, hasSavedAdventure: false,
          studentProjectSettings: { adventureUnlockXP: 0, adventureMinXP: 0, allowFreeResponse: true, adventurePermissions: { lockAllSettings: !!config.locked, allowLanguageSwitch: true, allowModeSwitch: true, allowDifficultySwitch: true, allowCloudImageStorage: true } },
          adventureState: { currentScene: null, history: [], inventory: [], systemResources: [], imageCache: [], level: 1, xp: 0, xpToNextLevel: 100, energy: 100, gold: 0, turnCount: 0, episodeTurnLimit: 12, choiceCount: 4, enableAutoClimax: true, climax: { isActive: false }, stats: { decisions: 0, conceptsFound: [] } },
          ErrorBoundary: p => R.createElement(R.Fragment, null, p.children),
          AnimatedNumber: p => R.createElement('span', null, p.value), AdventureAmbience: () => null,
          renderFormattedText: s => s, formatInteractiveText: s => s, splitTextToSentences: s => [s],
          expandedTools: ['adventure'], hasSourceOrAnalysis: true, isProcessing: false,
          isSocialStoryMode: !!config.social, socialStoryFocus: 'Resolving disagreements', isAdventureCloudEnabled: false, enableFactionResources: !!config.systems,
          factionResourceMode: 'manual', safeSetItem: noop, setStudentProjectSettings: noop,
          setIsAdventureCloudEnabled: noop, setSocialStoryFocus: noop,
          ResourceCustomInstructions: p => R.createElement('label', null, 'Custom instructions', R.createElement('textarea', { 'aria-label': p.ariaFallback, value: p.value, onChange: noop, disabled: p.disabled }))
        });
        const appRoot = window.ReactDOM.createRoot(document.querySelector('#root'));
        const render = () => appRoot.render(R.createElement(config.sidebar ? window.AlloModules.AdventurePanel : window.AlloModules.AdventureView, { ...props }));
        for (const name of Object.keys(props)) {
          if (!/^(set|handle)/.test(name)) {
            const setter = 'set' + name[0].toUpperCase() + name.slice(1);
            props[setter] = value => { props[name] = typeof value === 'function' ? value(props[name]) : value; render(); };
          }
        }
        window.__props = props;
        render();
      }, { config, strings, propNames });
      await page.locator('select').first().waitFor({ timeout: 10000 });
      if (config.sidebar) await page.locator('details').evaluateAll(nodes => nodes.forEach(n => n.open = true));
      await page.addScriptTag({ path: local('desktop/web-app/public/vendor/axe-core/axe.min.js') });
      const data = await page.evaluate(async () => ({
        height: document.documentElement.scrollHeight, width: innerWidth, overflow: document.documentElement.scrollWidth > innerWidth,
        controls: [...document.querySelectorAll('input,select,textarea,button')].map(el => ({
          tag: el.tagName, label: el.getAttribute('aria-label') || (el.labels && [...el.labels].map(n => n.textContent.trim()).join(' ')) || el.textContent.trim(), disabled: el.disabled,
          top: Math.round(el.getBoundingClientRect().top), height: Math.round(el.getBoundingClientRect().height), value: el.value
        })),
        violations: (await window.axe.run(document.querySelector('main'), { runOnly: { type: 'tag', values: ['wcag2a','wcag2aa','wcag22aa'] } })).violations.map(v => ({ id: v.id, impact: v.impact, nodes: v.nodes.map(n => ({ target: n.target, summary: n.failureSummary })) }))
      }));
      await page.screenshot({ path: path.join(outputDir, config.name + '.png'), fullPage: true });
      results.push({ name: config.name, errors, ...data }); fs.writeFileSync(path.join(outputDir, config.name + '.json'), JSON.stringify(results.at(-1), null, 2));
      console.log(config.name, JSON.stringify({ height: data.height, overflow: data.overflow, violations: data.violations.map(v => v.id), errors }));
      await page.close();
    }
  } finally { await browser.close(); fs.writeFileSync(path.join(outputDir, 'findings.json'), JSON.stringify(results, null, 2)); }
})().catch(e => { console.error(e); process.exitCode = 1; });



