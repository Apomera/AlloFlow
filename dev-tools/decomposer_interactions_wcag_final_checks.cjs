'use strict';
const crypto = require('node:crypto');
module.exports = async ({ page, result, check, active, nativeFocus, audit, capture, mount, settle }) => {
  result.interactions = [];
  const activate = async locator => { await nativeFocus(locator); await page.keyboard.press('Enter'); await settle(); };
  const focusCheck = async (name, id) => {
    const row = await active(); result.interactions.push({ name, ...row });
    check(name, row.id === id && row.hit && row.inViewport && row.outline !== 'none' && parseFloat(row.outlineWidth) > 0, row);
  };
  const fit = async name => {
    const row = await page.evaluate(() => ({ viewport: innerWidth, width: document.documentElement.scrollWidth }));
    check(name + ' reflows without horizontal page overflow', row.width <= row.viewport + 1, row);
  };
  const belongs = async (name, selector) => check(name + ' belongs to its named tab panel', await page.locator(selector).evaluateAll(elements => elements.length > 0 && elements.every(element => {
    const panel = element.closest('[role=tabpanel]');
    const tab = panel && document.getElementById(panel.getAttribute('aria-labelledby'));
    return !!tab && tab.getAttribute('aria-selected') === 'true' && tab.getAttribute('aria-controls') === panel.id;
  })));
  const sample = async name => { await fit(name); await audit(name); };
  const pauseButton = () => page.locator('[data-decomposer-motion-control]');
  const frameHash = () => page.locator('canvas').first().evaluate(canvas => canvas.toDataURL());
  const hash = value => crypto.createHash('sha256').update(value).digest('hex');
  const readouts = async name => {
    const rows = await page.locator('.decomposer-comparison-readouts > div,.decomposer-molecule-readouts > div').evaluateAll(cells => cells.map(cell => {
      const box = cell.getBoundingClientRect(), range = document.createRange(); range.selectNodeContents(cell);
      const lines = [...range.getClientRects()].filter(rect => rect.width > 0 && rect.height > 0);
      return { text: cell.textContent, width: box.width, fits: lines.every(rect => rect.left >= box.left - 1 && rect.right <= box.right + 1) };
    }));
    check(name + ' readings fit their individual cells', rows.length > 0 && rows.every(row => row.fits), rows);
  };

  await mount({ tab: 'explore' }, 1280, 'normal');
  await page.locator('#stem-decomposer-tab-explore').focus(); await page.keyboard.press('End'); await settle();
  check('Tab End activates the final tab with one tab stop', await page.evaluate(() => document.activeElement.id === 'stem-decomposer-tab-decompHunt' && document.querySelectorAll('[role=tab][tabindex="0"]').length === 1));
  await page.keyboard.press('Home'); await settle(); await page.keyboard.press('Tab'); await settle();
  check('Tab from the active tab reaches its complete panel', await page.evaluate(() => document.activeElement.id === 'stem-decomposer-panel-explore'));

  await belongs('Compare control', '#stem-decomposer-compare-open');
  await activate(page.locator('#stem-decomposer-compare-open')); await focusCheck('Compare opening focuses its selector', 'stem-decomposer-compare-select');
  await page.locator('#stem-decomposer-compare-select').selectOption('Table Salt'); await settle();
  check('Comparison uses the selected real material', await page.evaluate(() => decomposerData.compareTo === 'Table Salt'));
  await sample('1280-comparison'); await page.setViewportSize({ width: 320, height: 1000 }); await settle(); await sample('320-comparison');
  await readouts('320 comparison'); await capture('320-comparison', page.locator('#stem-decomposer-compare-select').locator('xpath=../..'));
  await activate(page.getByRole('button', { name: 'Close', exact: true })); await focusCheck('Comparison close returns to its opener', 'stem-decomposer-compare-open');

  await mount({ tab: 'quiz' }, 1280, 'normal'); await belongs('Quiz start', '#stem-decomposer-quiz-start');
  await activate(page.locator('#stem-decomposer-quiz-start')); await focusCheck('Quiz Start focuses the new question', 'stem-decomposer-quiz-question');
  let question = await page.evaluate(() => decomposerData.quizQ);
  const wrong = question.opts.find(option => option !== question.answer);
  await activate(page.getByRole('button', { name: wrong, exact: true })); await focusCheck('Wrong answer focuses readable feedback', 'stem-decomposer-quiz-feedback');
  check('Quiz feedback has a valid name and complete explanation', await page.locator('#stem-decomposer-quiz-feedback').evaluate(element => {
    const title = document.getElementById(element.getAttribute('aria-labelledby'));
    const explanation = document.getElementById(element.getAttribute('aria-describedby'));
    return !!title && /Incorrect/i.test(title.textContent) && !!explanation && explanation.textContent.trim().length > 0;
  }));
  check('An incorrect answer preserves the score and locks answers', await page.evaluate(() => (decomposerData.quizScore || 0) === 0 && [...document.querySelectorAll('[data-decomposer-quiz-option]')].every(button => button.disabled)));
  await page.setViewportSize({ width: 320, height: 1000 }); await settle(); await sample('320-quiz-wrong');
  await capture('320-quiz-feedback', page.locator('#stem-decomposer-quiz-question').locator('xpath=..'));
  await activate(page.getByRole('button', { name: 'Next Question', exact: true })); await focusCheck('Quiz Next focuses its replacement question', 'stem-decomposer-quiz-question');
  question = await page.evaluate(() => decomposerData.quizQ);
  await activate(page.getByRole('button', { name: question.answer, exact: true })); await focusCheck('Correct answer focuses readable feedback', 'stem-decomposer-quiz-feedback');
  check('A correct answer updates the original scoring rules', await page.evaluate(() => decomposerData.quizScore === 1 && decomposerData.quizStreak === 1));
  await sample('320-quiz-correct');
  await activate(page.getByRole('button', { name: 'Reset Quiz', exact: true })); await focusCheck('Reset restores the Start Quiz focus', 'stem-decomposer-quiz-start');

  await page.evaluate(() => { window.qaAiMode = 'unavailable'; });
  await mount({ tab: 'tutor' }, 320, 'normal'); await belongs('Tutor input', '#stem-decomposer-tutor-input');
  check('Unavailable tutoring is explained and request controls are disabled', await page.evaluate(() => /unavailable/i.test(document.querySelector('#stem-decomposer-tutor-status').textContent) && document.querySelector('#stem-decomposer-tutor-input').disabled && [...document.querySelectorAll('[data-decomposer-tutor-question]')].every(button => button.disabled)));
  const suggestions = await page.locator('[data-decomposer-tutor-question]').evaluateAll(buttons => buttons.map(button => ({ text: button.textContent.trim(), name: button.getAttribute('aria-label') || button.textContent.trim() })));
  check('Suggested question names match their visible question text', suggestions.length === 4 && suggestions.every(row => row.name === row.text), suggestions);
  check('Tutor Send has a descriptive accessible name', await page.getByRole('button', { name: 'Send question', exact: true }).count() === 1);
  await sample('320-tutor-unavailable');

  await page.evaluate(() => { window.qaAiMode = 'complete'; });
  await mount({ tab: 'tutor' }, 320, 'normal');
  const input = page.locator('#stem-decomposer-tutor-input'); await input.fill('What is water made of?');
  await activate(page.getByRole('button', { name: 'Send question', exact: true }));
  await page.waitForFunction(() => qaAiCalls.length === 1); await focusCheck('Submitting keeps useful input focus', 'stem-decomposer-tutor-input');
  check('Tutor waiting state is exposed to assistive technology', await page.evaluate(() => document.querySelector('#stem-decomposer-tutor-log').getAttribute('aria-busy') === 'true' && document.querySelector('#stem-decomposer-tutor-status').getAttribute('role') === 'status' && /preparing/i.test(document.querySelector('#stem-decomposer-tutor-status').textContent)));
  await input.fill('A second question while waiting'); await input.press('Enter'); await input.press('Enter'); await settle();
  check('Waiting Enter presses cannot create duplicate requests', await page.evaluate(() => qaAiCalls.length === 1 && document.querySelector('[data-decomposer-tutor-question]').disabled));
  await page.locator('[data-decomposer-material="Table Salt"]').focus();
  await page.evaluate(() => qaAiResolve()); await page.waitForFunction(() => decomposerData.aiLoading === false && decomposerData.aiMessages.length === 2); await settle();
  check('Tutor reply is announced without moving the learner’s next focus', await page.evaluate(() => document.activeElement.dataset.decomposerMaterial === 'Table Salt' && document.querySelector('#stem-decomposer-tutor-log').getAttribute('aria-busy') === 'false' && /Local QA response/.test(document.querySelector('#stem-decomposer-tutor-status').textContent) && decomposerData.aiQuestions === 1));
  await sample('320-tutor-reply'); await capture('320-tutor-reply', page.locator('#stem-decomposer-tutor-log').locator('xpath=..'));
  await mount({ tab: 'tutor' }, 1280, 'normal'); await page.locator('#stem-decomposer-tutor-input').fill('Local failure test'); await page.locator('#stem-decomposer-tutor-input').press('Enter'); await page.waitForFunction(() => qaAiCalls.length === 1); await settle();
  await focusCheck('Failure-test submission first establishes input focus', 'stem-decomposer-tutor-input');
  await page.locator('[data-decomposer-material="Water"]').focus(); await page.evaluate(() => qaAiReject()); await page.waitForFunction(() => decomposerData.aiLoading === false); await settle();
  const failure = await page.evaluate(() => ({ material: document.activeElement.dataset.decomposerMaterial, status: document.querySelector('#stem-decomposer-tutor-status').textContent, busy: document.querySelector('#stem-decomposer-tutor-log').getAttribute('aria-busy') }));
  check('Tutor failure is announced, releases busy state and preserves focus', failure.material === 'Water' && /try again/i.test(failure.status) && failure.busy === 'false', failure);
  await sample('1280-tutor-error');

  for (const pair of [['Baking Soda', 'Acetic Acid'], ['Ozone', 'Calcium Carbonate']]) {
    await mount({ tab: 'reactions' }, 320, 'normal');
    for (const material of pair) await activate(page.locator('[data-decomposer-reactant="' + material + '"]'));
    await belongs('Reaction Mix', '#stem-decomposer-reaction-mix');
    check('Mix accessible name contains the visible material names', (await page.locator('#stem-decomposer-reaction-mix').innerText()).includes(pair[0]) && (await page.locator('#stem-decomposer-reaction-mix').innerText()).includes(pair[1]));
    await activate(page.locator('#stem-decomposer-reaction-mix')); await focusCheck(pair.join(' + ') + ' focuses its result and description', 'stem-decomposer-reaction-result');
    check('Reaction result has a readable description', await page.locator('#stem-decomposer-reaction-description').innerText().then(text => text.trim().length > 20));
    await sample('320-reaction-' + pair[0]);
    if (pair[0] === 'Baking Soda') await capture('320-reaction-result', page.locator('#stem-decomposer-reaction-result').locator('xpath=../../..'));
    await activate(page.getByRole('button', { name: 'Try Another Combo', exact: true })); await focusCheck('Reaction reset returns to the material palette', 'stem-decomposer-reactant-0');
  }

  result.motion = [];
  for (const tab of ['states', 'visualize']) {
    await mount({ tab, motionPaused: false, _simTemp: 25 }, 1280, 'normal');
    const first = await frameHash(); await page.waitForTimeout(160); const moving = await frameHash();
    check(tab + ' particle illustration advances while running', first !== moving);
    await activate(pauseButton()); const paused = await frameHash(); await page.waitForTimeout(160); const held = await frameHash();
    check(tab + ' Pause freezes the actual rendered pixels', paused === held && await pauseButton().getAttribute('aria-pressed') === 'true');
    if (tab === 'states') {
      const range = page.getByRole('slider', { name: 'Temperature', exact: true }); await nativeFocus(range); await page.keyboard.press('End'); await settle();
      check('Temperature exposes its real model value in Celsius', await range.getAttribute('aria-valuetext') === '500 degrees Celsius' && await page.evaluate(() => decomposerData._simTemp === 500));
      const arrangement = await page.locator('canvas').first().evaluate(canvas => ({ phase: canvas._prevState, x: new Set(canvas._particles.map(particle => Math.round(particle.x))).size, y: new Set(canvas._particles.map(particle => Math.round(particle.y))).size }));
      check('Paused gas keeps a dispersed arrangement rather than a solid lattice', arrangement.phase === 'gas' && arrangement.x > 6 && arrangement.y > 5, arrangement);
    } else {
      await activate(page.locator('[data-decomposer-transform]'));
      check('Atom action name and pressed state describe decomposition', /Reassemble/.test(await page.locator('[data-decomposer-transform]').innerText()) && await page.locator('[data-decomposer-transform]').getAttribute('aria-pressed') === 'true');
    }
    const changed = await frameHash(); await page.waitForTimeout(160); const stillChanged = await frameHash();
    check(tab + ' semantic changes repaint once while paused', changed !== held && changed === stillChanged);
    await activate(pauseButton()); const resumed = await frameHash(); await page.waitForTimeout(160); const later = await frameHash();
    check(tab + ' Resume restarts actual illustration motion', resumed !== later);
    await activate(pauseButton());
    const viewsBeforeResize = await page.evaluate(() => decomposerData.canvasViews || 0);
    await page.setViewportSize({ width: 320, height: 1000 }); await settle(); await sample('320-' + tab + '-paused');
    const resized = await page.locator('canvas').first().evaluate(canvas => ({ cssWidth: canvas.clientWidth, bufferWidth: canvas.width, dpr: devicePixelRatio, paused: canvas.dataset.motionPaused, views: decomposerData.canvasViews || 0 }));
    check(tab + ' drawing buffer follows its resized visible width', Math.abs(resized.bufferWidth - resized.cssWidth * resized.dpr) <= 2, resized);
    check(tab + ' resizing preserves pause and visualization credit', resized.paused === 'true' && resized.views === viewsBeforeResize, resized);
    const resizedImage = await frameHash(); await page.waitForTimeout(160);
    check(tab + ' resized illustration remains paused', resizedImage === await frameHash());
    if (tab === 'visualize') await readouts('320 atom view');
    await capture('320-' + tab + '-paused', page.locator('canvas').first().locator('xpath=../..'));
    result.motion.push({ tab, beforeHash: hash(first), runningHash: hash(moving), pausedHash: hash(paused), heldHash: hash(held), changedHash: hash(changed), changedHeldHash: hash(stillChanged), resumedHash: hash(resumed), laterHash: hash(later) });
    await page.emulateMedia({ reducedMotion: 'reduce' }); await page.evaluate(tab => mountDecomposer({ tab }), tab); await settle();
    const reduced = await frameHash(); await page.waitForTimeout(160);
    check(tab + ' reduced-motion preference starts with static pixels and a Resume control', reduced === await frameHash() && /Resume particle motion/.test(await pauseButton().innerText()));
  }

  for (const [tab, selector] of [['quiz', '#stem-decomposer-quiz-start'], ['tutor', '#stem-decomposer-tutor-input'], ['reactions', '[data-decomposer-reactant]'], ['states', 'input[type=range]'], ['visualize', 'canvas']]) {
    await mount({ tab, motionPaused: true }, 320, 'spacing'); await belongs(tab, selector); await sample('320-spacing-' + tab);
  }
  for (const tab of ['explore', 'quiz', 'tutor', 'states', 'visualize', 'reactions']) {
    await mount({ tab, motionPaused: true, quizMode: tab === 'quiz', quizQ: tab === 'quiz' ? { text: 'Which formula is water?', opts: ['H₂O', 'NaCl'], answer: 'H₂O', answered: true, chosen: 'H₂O' } : null, quizScore: tab === 'quiz' ? 1 : 0 }, 1280, 'app-contrast');
    await sample('1280-app-contrast-' + tab);
    const selected = await page.locator('[role=tab][aria-selected=true]').evaluate(element => ({ selected: getComputedStyle(element).backgroundColor, other: getComputedStyle(document.querySelector('[role=tab][aria-selected=false]')).backgroundColor }));
    check(tab + ' active tab remains visually distinct in the contrast theme', selected.selected !== selected.other, selected);
    if (tab === 'quiz') await capture('1280-app-contrast-quiz', page.locator('#stem-decomposer-quiz-question').locator('xpath=..'));
  }
  await mount({ tab: 'states', motionPaused: true }, 1280, 'forced-colors'); await sample('1280-forced-colors-states');
  await capture('1280-forced-colors-states', page.locator('canvas').locator('xpath=../..'));
  await mount({ tab: 'scenes', activeScene: 'kitchen', huntTarget: 'k_faucet', huntWrongGuess: 'k_salt' }, 320, 'normal');
  await activate(page.locator('[data-decomposer-dismiss=feedback]'));
  check('Hunt dismissal remains usable inside the expanded panel', await page.evaluate(() => document.activeElement.dataset.decomposerObject === 'k_salt' && document.querySelector('[role=tabpanel]').contains(document.activeElement)));
  await sample('320-hunt-regression');
};
