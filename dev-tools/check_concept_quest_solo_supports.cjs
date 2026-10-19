const fs = require('fs'), path = require('path'), assert = require('assert/strict');
const { chromium } = require('playwright');
const wr = require('module').createRequire(path.resolve('desktop/web-app/package.json'));
const out = path.resolve(process.argv[2] || 'reports/concept-quest-solo-supports-2026-10-18');
const fallback = process.argv.includes('--fallback');
fs.mkdirSync(out, { recursive: true });

(async () => {
  const css = await wr('postcss')([wr('tailwindcss')({ ...require(path.resolve('desktop/web-app/tailwind.config.js')), content: ['./concept_quest_solo_question_source.jsx'] })]).process('@tailwind base;@tailwind components;@tailwind utilities;', { from: undefined });
  const browser = await chromium.launch({ headless: true }), results = [], errors = [];
  try {
    for (const width of [1280, 320, 390]) {
      for (const scenario of ['mcq', 'multi-select', 'answer-evidence', 'sequence-sense', 'relation-mismatch']) {
        const page = await browser.newPage({ viewport: { width, height: 900 } });
        page.on('pageerror', error => errors.push({ width, scenario, message: error.message }));
        await page.setContent('<!doctype html><html lang="en"><head><title>Solo Quest choice support verification</title><meta name="viewport" content="width=device-width, initial-scale=1"></head><body style="margin:0;background:#f1f5f9;color:#0f172a;padding:16px"><main id="root" style="max-width:760px;margin:auto"></main></body></html>');
        await page.addStyleTag({ content: css.css });
        await page.addScriptTag({ path: 'desktop/web-app/node_modules/react/umd/react.development.js' });
        await page.addScriptTag({ path: 'desktop/web-app/node_modules/react-dom/umd/react-dom.development.js' });
        await page.evaluate(() => { window.AlloModules = {}; window.AlloIcons = {}; });
        await page.addScriptTag({ path: 'concept_quest_solo_module.js' });
        await page.addScriptTag({ path: require.resolve('axe-core/axe.min.js') });
        await page.evaluate(({ scenario, fallback }) => {
          const visual = (label, color = '#0f766e') => 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="320" height="100"><rect width="320" height="100" rx="12" fill="#f0fdfa"/><circle cx="45" cy="50" r="22" fill="' + color + '"/><text x="82" y="55" font-family="Arial" font-size="18" fill="#0f172a">' + label + '</text></svg>');
          const shared = { question: 'Quel choix respecte "x" < 3 && y >= 2 ?', question_en: 'Which choice keeps "x" < 3 && y >= 2? <script>literal text</script>' };
          const fixtures = {
            mcq: { ...shared, type: 'mcq', options: ['x < 3', 'x > 3'], options_en: ['Less than three, including negative values', 'Greater than three'], correctAnswer: 'x < 3', optionImageUrls: [visual('Less than three'), visual('Greater than three')], optionImageAltTexts: ['Number line shaded below three', 'Number line shaded above three'] },
            'multi-select': { type: 'multi-select', question: 'Choisissez tous les conducteurs.', question_en: 'Choose every material that conducts electricity.', options: ['Cuivre', 'Fer', 'Bois'], options_en: ['Copper wire carries electric current', 'Iron also carries electric current', 'Dry wood is an insulator'], correctAnswers: ['Cuivre', 'Fer'], optionImageUrls: [visual('Copper'), visual('Iron'), visual('Wood')], optionImageAltTexts: ['Copper wire', 'Iron nail', 'Dry wooden block'] },
            'answer-evidence': { type: 'answer-evidence', question: 'Quel changement?', question_en: 'What change happened on the cold glass?', answerOptions: ['Évaporation', 'Condensation'], options_en: ['Evaporation: liquid turns into water vapor', 'Condensation: water vapor becomes liquid'], correctAnswer: 'Condensation', evidencePrompt: 'Quelle observation?', evidencePrompt_en: 'Which observation supports your answer?', evidenceOptions: ['Des gouttes', 'Le soleil'], evidenceOptions_en: ['Drops form on the outside of the glass', 'Sunlight shines through the window'], correctEvidence: 'Des gouttes', optionImageUrls: [visual('Vapor'), visual('Condensation')], optionImageAltTexts: ['Vapor rises from warm water', 'Drops on cold glass'], evidenceOptionImageUrls: [visual('Water drops'), visual('Sunshine')], evidenceOptionImageAltTexts: ['Water drops outside a glass', 'Sunlight through a window'] },
            'sequence-sense': { type: 'sequence-sense', question: 'Corrigez les étapes.', question_en: 'Repair the sequence. Keep each illustration with its step.', items: ['Chauffer', 'Fondre', 'Refroidir'], items_en: ['Heat the solid material gently', 'Melt the material into liquid', 'Cool the liquid until it becomes solid'], itemImageUrls: [visual('Heat'), visual('Melt'), visual('Cool')], itemImageAltTexts: ['Heating a solid', 'Melting material', 'Cooling a liquid'], presentedOrder: [1, 0, 2], intentionallyWrongIndex: 0, orderingPrinciple: 'Temperature changes', principleOptions: ['Temperature changes', 'Size'], principleOptions_en: ['Follow the changes in temperature', 'Follow the changes in size'], principleOptionImageUrls: [visual('Temperature'), visual('Size')], principleOptionImageAltTexts: ['Thermometer', 'Ruler'] },
            'relation-mismatch': { type: 'relation-mismatch', question: 'Réparez la paire.', question_en: 'Choose the mismatched pair and the correct partner.', pairs: [{ left: 'Chat', right: 'Plante', left_en: 'Cat: a living animal', leftImageUrl: visual('Cat'), leftImageAltText: 'A cat', rightImageUrl: visual('Plant'), rightImageAltText: 'A flowering plant' }, { left: 'Rose', right: 'Plante' }], pairs_en: [{ left: 'Fallback cat', right: 'Plant: makes food using sunlight' }, { left: 'Rose: a flowering plant', right: 'Plant' }], wrongPairIndex: 0, correctPartnerForWrong: 'Animal', candidatePartners: ['Animal', 'Plante'], candidatePartners_en: ['Animal: eats other living things for energy', 'Plant: uses sunlight to make food'], candidatePartnerImageUrls: [visual('Animal'), visual('Plant')], candidatePartnerImageAltTexts: ['Animal group', 'Plant group'] },
          };
          const solo = window.AlloModules.ConceptQuestSoloEngine;
          if (fallback) {
            if (scenario === 'mcq') fixtures[scenario].correctAnswer = 'missing';
            if (scenario === 'multi-select') fixtures[scenario].correctAnswers = ['missing'];
            if (scenario === 'answer-evidence') fixtures[scenario].correctEvidence = 'missing';
            if (scenario === 'sequence-sense') fixtures[scenario].orderingPrinciple = '';
            if (scenario === 'relation-mismatch') fixtures[scenario].wrongPairIndex = 99;
          }
          window.fixtureItem = solo.normalizeItems({ data: { questions: [fixtures[scenario]] } })[0];
          function App() {
            const [response, setResponse] = React.useState(solo.initialResponse(window.fixtureItem));
            window.fixtureResponse = response;
            return React.createElement(React.Fragment, null,
              React.createElement('h1', { style: { fontSize: '24px', fontWeight: 700 } }, 'Concept Quest'),
              React.createElement('h2', { style: { marginTop: '8px', fontWeight: 700 } }, 'Solo adventure'),
              React.createElement('h3', { style: { margin: '8px 0 16px' } }, scenario),
              React.createElement(window.AlloModules.ConceptQuestSoloQuestion, { item: window.fixtureItem, response, onChange: setResponse, guideOpen: response.guideRevealed, t: key => key }));
          }
          ReactDOM.createRoot(document.getElementById('root')).render(React.createElement(App));
        }, { scenario, fallback });
        const fieldset = page.locator('[data-solo-question-type]');
        await fieldset.waitFor();
        assert.equal(await fieldset.getAttribute('data-solo-question-type'), scenario);
        if (fallback) {
          const stimulus = fieldset.locator('[data-solo-review-stimulus]');
          await stimulus.waitFor();
          assert.equal(await stimulus.locator('input,select,textarea,button').count(), 0);
          assert.equal(await fieldset.getByRole('radio').count(), 0);
          assert.equal(await fieldset.getByRole('checkbox').count(), 0);
          if (scenario === 'mcq') {
            assert.match(await fieldset.innerText(), /"x" < 3 && y >= 2/);
            assert.match(await fieldset.innerText(), /<script>literal text<\/script>/);
            assert.equal(await fieldset.locator('script').count(), 0);
          }
          if (scenario === 'sequence-sense') assert.deepEqual(await stimulus.locator('[data-solo-presented-order] img').evaluateAll(images => images.map(image => image.alt)), ['Melting material', 'Heating a solid', 'Cooling a liquid']);
          await fieldset.getByRole('textbox', { name: 'Your explanation', exact: true }).fill('My reasoning uses the illustrated evidence. I need to review this key.');
          await fieldset.getByRole('button', { name: 'Compare with answer guide', exact: true }).click();
          await fieldset.getByRole('combobox').selectOption('needs-practice');
        } else if (scenario === 'mcq') {
          assert.match(await fieldset.innerText(), /"x" < 3 && y >= 2/);
          assert.match(await fieldset.innerText(), /<script>literal text<\/script>/);
          assert.equal(await fieldset.locator('script').count(), 0);
          await fieldset.getByRole('radio').first().focus();
          await page.keyboard.press('Space');
        } else if (scenario === 'multi-select') {
          await fieldset.getByRole('checkbox').nth(0).check();
          await fieldset.getByRole('checkbox').nth(1).check();
        } else if (scenario === 'answer-evidence') {
          assert.match(await fieldset.locator('[data-solo-choice-field="answerOptions"]').first().innerText(), /liquid turns into water vapor/);
          assert.equal(await fieldset.locator('[data-solo-choice-field="answerOptions"] img').first().getAttribute('alt'), 'Vapor rises from warm water');
          await fieldset.getByRole('group', { name: 'Answer', exact: true }).getByRole('radio').nth(1).check();
          await fieldset.getByRole('group', { name: 'Supporting evidence', exact: true }).getByRole('radio').first().check();
        } else if (scenario === 'sequence-sense') {
          assert.deepEqual(await fieldset.locator('[data-solo-presented-order] img').evaluateAll(images => images.map(image => image.alt)), ['Melting material', 'Heating a solid', 'Cooling a liquid']);
          await fieldset.getByRole('button', { name: 'Move up: Chauffer', exact: true }).click();
          assert.deepEqual(await fieldset.getByRole('list', { name: 'Your order', exact: true }).locator('img').evaluateAll(images => images.map(image => image.alt)), ['Heating a solid', 'Melting material', 'Cooling a liquid']);
          await fieldset.getByRole('combobox').nth(0).selectOption('no');
          await fieldset.getByRole('combobox').nth(1).selectOption('0');
          await fieldset.getByRole('combobox').nth(2).selectOption('Temperature changes');
          assert.equal(await fieldset.locator('[data-solo-choice-supports="principleOptions"] img').first().getAttribute('alt'), 'Thermometer');
        } else {
          await fieldset.getByRole('combobox').nth(0).selectOption('0');
          await fieldset.getByRole('combobox').nth(1).selectOption('Animal');
          assert.equal(await fieldset.locator('[data-solo-choice-supports="candidatePartners"] img').first().getAttribute('alt'), 'Animal group');
        }
        const grade = await page.evaluate(() => window.AlloModules.ConceptQuestSoloEngine.grade(window.fixtureItem, window.fixtureResponse));
        if (fallback) {
          assert.equal(grade.complete, true);
          assert.equal(grade.correct, null);
          assert.equal(grade.gradable, false);
          assert.equal(grade.score, null);
          assert.equal(grade.status, 'self-reviewed');
        } else assert.equal(grade.correct, true, scenario + ' response must retain its source identity');
        const imageHealth = await fieldset.locator('img').evaluateAll(async images => {
          await Promise.all(images.map(image => { image.loading = 'eager'; return image.decode(); }));
          return images.map(image => ({ alt: image.alt, complete: image.complete, width: image.naturalWidth }));
        });
        assert.ok(imageHealth.length >= 2);
        assert.ok(imageHealth.every(image => image.alt.trim() && image.complete && image.width > 0));
        const layout = await page.evaluate(() => ({ viewport: innerWidth, documentWidth: document.documentElement.scrollWidth, overflow: [...document.querySelectorAll('main *')].filter(element => { const rect = element.getBoundingClientRect(); return rect.width > 0 && (rect.right > innerWidth + 1 || rect.left < -1); }).map(element => ({ tag: element.tagName, text: element.textContent.slice(0, 50) })) }));
        assert.ok(layout.documentWidth <= width, JSON.stringify({ width, scenario, layout }));
        assert.deepEqual(layout.overflow, [], JSON.stringify({ width, scenario, layout }));
        const accessibility = await page.evaluate(async () => { const result = await axe.run(document); return { violations: result.violations.map(issue => ({ id: issue.id, impact: issue.impact, description: issue.description, nodes: issue.nodes.map(node => node.target) })), passes: result.passes.length }; });
        const screenshot = path.join(out, `${scenario}${fallback ? '-fallback' : ''}-${width}.png`);
        await page.screenshot({ path: screenshot, fullPage: true, animations: 'disabled' });
        results.push({ width, scenario, fallback, gradeCorrect: grade.correct, gradable: grade.gradable, score: grade.score, images: imageHealth.length, horizontalOverflow: false, accessibility, screenshot });
        assert.deepEqual(accessibility.violations, [], JSON.stringify({ width, scenario, accessibility }));
        await page.close();
      }
    }
    assert.deepEqual(errors, []);
  } finally {
    fs.writeFileSync(path.join(out, 'browser-results.json'), JSON.stringify({ results, errors }, null, 2));
    await browser.close();
  }
  console.log(JSON.stringify({ scenarios: results.length, widths: [1280, 320, 390], violations: results.reduce((sum, result) => sum + result.accessibility.violations.length, 0), errors, report: path.join(out, 'browser-results.json') }));
})().catch(error => { console.error(error); process.exitCode = 1; });
