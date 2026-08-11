// Drive Machine Lab's real click handlers in a browser and assert what they do.
//
//   node dev-tools/ml_interaction_smoke.cjs        (exit 0 = pass, 2 = fail)
//
// WHY. Every existing test is server-side render only: it proves the markup and
// the pure model are right, and it never once runs an onClick. So fire(),
// loose(), submitTyped(), markProven() and importArch() — which award XP, count
// streaks, accumulate crank work, flip the animation flag and mutate the wall —
// had never executed anywhere. This is the harness that actually presses the
// buttons.
//
// THREE and OrbitControls are preloaded from vendor/ and the REAL host module
// is used, so the interactions run against the same viewer lifecycle the app
// has, not a stub that cannot fail.
const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const react = read('desktop/web-app/node_modules/react/umd/react.production.min.js');
const reactDom = read('desktop/web-app/node_modules/react-dom/umd/react-dom.production.min.js');
const three = read('vendor/three-r128/three.min.js');
const orbit = read('vendor/three-r128/OrbitControls.js');
const host = read('stem_lab/stem_lab_module.js');
const tool = read('stem_lab/stem_tool_machinelab.js');

const SHELL = `
window.__xp = 0; window.__toasts = []; window.__announced = []; window.__celebrations = 0;
window.__state = null;
window.__mount = function (state, opts) {
  opts = opts || {};
  var Icons = new Proxy({}, { get: function () { return function () { return React.createElement('span'); }; } });
  var cfg = window.StemLab._registry.machineLab;
  var Host = function () {
    var pair = React.useState({ machineLab: state, archStudio: opts.archStudio || null });
    window.__state = function () { return pair[0].machineLab; };
    var ctx = {
      React: React, toolData: pair[0], setToolData: pair[1],
      isDark: false, isContrast: false,
      gradeBand: opts.band || 'g68', gradeLevel: '7th Grade',
      setStemLabTool: function(){}, setStemLabTab: function(){}, setToolSnapshots: function(){},
      addToast: function (m) { window.__toasts.push(m); },
      announceToSR: function (m) { window.__announced.push(m); },
      awardXP: function (n) { window.__xp += (n || 0); },
      beep: function(){}, celebrate: function () { window.__celebrations++; }, canvasNarrate: function(){},
      canvasA11yDesc: function(){}, callTTS: null, callImagen: null,
      callGemini: (opts.gemini === 'ok') ? function () { return Promise.resolve('The counterweight falls and the arm throws.'); }
              : (opts.gemini === 'reject') ? function () { return Promise.reject(new Error('throttled')); }
              : (opts.gemini === 'throw') ? function () { throw new Error('sync boom'); }
              : (opts.gemini === 'hang') ? function () { return new Promise(function () {}); }
              : null,
      callGeminiVision: null, stemLabTab: 'explore', stemLabTool: null,
      toolSnapshots: [], props: {}, srOnly: {},
      a11yClick: function (f) { return { onClick: f }; }, icons: Icons,
      t: function (k, fb) { return fb != null ? fb : k; },
      getXP: function () { return window.__xp; }
    };
    return cfg.render(ctx);
  };
  ReactDOM.unmountComponentAtNode(document.getElementById('slot'));
  ReactDOM.render(React.createElement(Host), document.getElementById('slot'));
  return true;
};
// Click a button by its visible text. Deliberately goes through the real DOM
// event path rather than calling the handler directly, so a control that is
// present but unreachable (disabled, covered, not actually a button) fails.
window.__click = function (text) {
  var btns = Array.prototype.slice.call(document.querySelectorAll('button'));
  var hit = btns.filter(function (b) { return (b.textContent || '').trim().indexOf(text) !== -1; })[0];
  if (!hit) return 'no-button:' + text;
  if (hit.disabled) return 'disabled:' + text;
  hit.click();
  return 'ok';
};
window.__type = function (ariaLabel, value) {
  var el = document.querySelector('input[aria-label="' + ariaLabel + '"]');
  if (!el) return 'no-input';
  var setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
  setter.call(el, value);
  el.dispatchEvent(new Event('input', { bubbles: true }));
  return 'ok';
};
`;

const BASE = {
  view: 'machines', bench: 'lever', machine: 'trebuchet',
  cwMass: 1200, cwDrop: 3.2, beamLong: 4.5, beamShort: 1.2, slingLength: 2.0, armMass: 60,
  projMass: 25, projDiameter: 0.24, releaseAngle: 45, launchElevation: 2,
  winchHandleR: 0.45, winchDrumR: 0.08, winchPulleys: 2,
  gravity: 9.81, drag: true, windZ: 0,
  torsionTurns: 12, torsionArmLength: 1.1, torsionDraw: 0.85, torsionArmMass: 6,
  ballistaStringMass: 0.35, onagerSling: 1.0,
  loadDistance: 0.5, leverEffortArm: 2.0, leverLoadArm: 1.0, leverLoad: 400,
  pulleySegments: 2, pulleyLoad: 400,
  windlassHandleR: 0.45, windlassDrumR: 0.10, windlassLoad: 400,
  rampLength: 4.0, rampHeight: 1.0, rampLoad: 400,
  wedgeLength: 0.30, wedgeThickness: 0.06, wedgeLoad: 800,
  screwHandleR: 0.15, screwPitch: 0.005, screwLoad: 2000,
  standoff: 80, wallPreset: 'curtain', provenBenches: {}, shotHistory: [], machinesFired: []
};

const results = [];
function check(name, cond, detail) {
  results.push({ name, ok: !!cond, detail: detail === undefined ? '' : String(detail) });
}

(async () => {
  const { chromium } = require('playwright');
  const tmp = path.join(require('os').tmpdir(), 'ml-interact.html');
  fs.writeFileSync(tmp, `<!doctype html><html lang="en"><head><meta charset="utf-8">
<style>body{margin:0;background:#f8fafc;font-family:system-ui}</style></head>
<body><main id="slot"></main>
<script>${three}<\/script><script>${orbit}<\/script>
<script>${react}<\/script><script>${reactDom}<\/script>
<script>window.React = React;<\/script>
<script>${host}<\/script><script>${tool}<\/script><script>${SHELL}<\/script>
</body></html>`, 'utf8');

  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const pg = await b.newPage({ viewport: { width: 1180, height: 1400 } });
  const errors = [];
  pg.on('pageerror', (e) => errors.push(String((e && e.message) || e)));
  pg.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
  await pg.goto('file://' + tmp.replace(/\\/g, '/'));
  await pg.waitForTimeout(1200);

  const S = (o) => Object.assign({}, BASE, o);

  // ── 1. Bench prediction: a correct answer proves the bench and awards XP ──
  await pg.evaluate((s) => window.__mount(s, {}), S({ view: 'machines', bench: 'lever' }));
  await pg.waitForTimeout(300);
  // Lever: 2 m effort arm / 1 m load arm = MA 2, load 400 N -> effort 200 N.
  await pg.evaluate(() => window.__type('Your predicted effort force in newtons', '200'));
  await pg.waitForTimeout(150);
  let r = await pg.evaluate(() => window.__click('Check'));
  await pg.waitForTimeout(300);
  let st = await pg.evaluate(() => window.__state());
  let xp = await pg.evaluate(() => window.__xp);
  check('bench Check button is reachable', r === 'ok', r);
  check('correct prediction marks the bench proven', st && st.provenBenches && st.provenBenches.lever === true);
  check('correct prediction awards XP', xp > 0, 'xp=' + xp);
  check('correct prediction sets an ok result', st && st.benchResult && st.benchResult.ok === true);
  check('correct prediction starts a streak', st && st.benchStreak === 1, st && st.benchStreak);

  // ── 2. A wrong answer must reset the streak and NOT re-award ──
  const xpBefore = await pg.evaluate(() => window.__xp);
  await pg.evaluate(() => window.__type('Your predicted effort force in newtons', '999'));
  await pg.waitForTimeout(150);
  await pg.evaluate(() => window.__click('Check'));
  await pg.waitForTimeout(300);
  st = await pg.evaluate(() => window.__state());
  xp = await pg.evaluate(() => window.__xp);
  check('wrong prediction reports failure', st && st.benchResult && st.benchResult.ok === false);
  check('wrong prediction resets the streak', st && st.benchStreak === 0, st && st.benchStreak);
  check('wrong prediction awards no XP', xp === xpBefore, xp + ' vs ' + xpBefore);
  check('a proven bench stays proven after a later miss', st && st.provenBenches.lever === true);

  // ── 3. A blank answer must not score as zero ──
  await pg.evaluate(() => window.__type('Your predicted effort force in newtons', '   '));
  await pg.waitForTimeout(150);
  await pg.evaluate(() => window.__click('Check'));
  await pg.waitForTimeout(250);
  st = await pg.evaluate(() => window.__state());
  check('blank answer is rejected, not scored', st && st.benchResult && st.benchResult.ok === false);

  // ── 4. Fire on the test range ──
  await pg.evaluate((s) => window.__mount(s, {}), S({ view: 'range' }));
  await pg.waitForTimeout(300);
  r = await pg.evaluate(() => window.__click('Fire'));
  await pg.waitForTimeout(400);
  st = await pg.evaluate(() => window.__state());
  check('Fire button is reachable', r === 'ok', r);
  check('firing records a shot', st && st.lastShot && st.lastShot.range > 0, st && st.lastShot && st.lastShot.range);
  check('firing advances the shot id', st && st.shotId === 1, st && st.shotId);
  check('firing sets the animation flag', st && st.animating === true);
  check('firing appends to the shot log', st && st.shotHistory && st.shotHistory.length === 1);
  check('firing records which machine was used', st && (st.machinesFired || []).indexOf('trebuchet') !== -1);
  const announced = await pg.evaluate(() => window.__announced.join(' | '));
  check('firing announces the result to a screen reader', /Fired\. Range/.test(announced), announced.slice(0, 80));

  // The animation must switch itself off, or the 3D loop runs at 60 fps forever.
  await pg.waitForTimeout(2200);
  st = await pg.evaluate(() => window.__state());
  check('the animation flag clears itself after the swing', st && st.animating === false, st && st.animating);

  // ── 5a. A shot that cannot reach must say so and leave the wall alone ──
  // Found by this harness: a 45-degree lob at a 6 m wall sails clean over, and
  // a heavy stone at 60 m standoff never arrives at all. Both are the tool
  // behaving correctly, and both are worth pinning.
  await pg.evaluate(() => { window.__toasts = []; window.__announced = []; });
  await pg.evaluate((s) => window.__mount(s, {}), S({ view: 'siege', wallPreset: 'curtain', standoff: 200, projMass: 120, projDiameter: 0.4 }));
  await pg.waitForTimeout(400);
  await pg.evaluate(() => window.__click('Loose'));
  await pg.waitForTimeout(300);
  st = await pg.evaluate(() => window.__state());
  check('an unreachable target reports falling short', st && st.siegeFeedback && /Short by/.test(st.siegeFeedback.message), st && st.siegeFeedback && st.siegeFeedback.message.slice(0, 40));
  check('a short shot still costs the crew a shot', st && st.shotsFired === 1, st && st.shotsFired);
  check('a short shot does no damage', !st.wallBlocks || st.wallBlocks.every((x) => x.state === 'intact'));

  // ── 5b. Batter it flat until it breaches ──
  // A wall is battered with DIRECT fire. A high lob is for throwing things over
  // it, which is a different job and is why the release angle is shallow here.
  await pg.evaluate(() => { window.__toasts = []; window.__announced = []; });
  await pg.evaluate((s) => window.__mount(s, {}), S({ view: 'siege', wallPreset: 'curtain', standoff: 25, releaseAngle: 12, projMass: 90, projDiameter: 0.4 }));
  await pg.waitForTimeout(400);
  r = await pg.evaluate(() => window.__click('Loose'));
  await pg.waitForTimeout(350);
  st = await pg.evaluate(() => window.__state());
  check('Loose button is reachable', r === 'ok', r);
  check('loosing counts the shot', st && st.shotsFired === 1, st && st.shotsFired);
  check('loosing accumulates crank work', st && st.totalCrankWork > 0, st && st.totalCrankWork);
  check('loosing gives feedback', st && st.siegeFeedback && !!st.siegeFeedback.message);
  check('a direct hit strikes the wall', st && st.siegeFeedback && /Struck the/.test(st.siegeFeedback.message), st && st.siegeFeedback && st.siegeFeedback.message.slice(0, 50));
  check('loosing builds a wall in state', st && Array.isArray(st.wallBlocks) && st.wallBlocks.length > 0);

  let looses = 1, guard = 0, breached = false;
  while (guard++ < 60) {
    const res = await pg.evaluate(() => window.__click('Loose'));
    if (res !== 'ok') break;                 // button disabled once breached
    looses++;
    await pg.waitForTimeout(120);
    st = await pg.evaluate(() => window.__state());
    if (st && st.breached) { breached = true; break; }
  }
  st = await pg.evaluate(() => window.__state());
  check('repeated shots eventually breach the wall', breached || (st && st.breached), 'after ' + looses + ' shots');
  check('the shot counter tracks the loosing', st && st.shotsFired === looses, st && st.shotsFired + ' vs ' + looses);
  const disabled = await pg.evaluate(() => window.__click('Loose'));
  check('the Loose button disables once breached', disabled.indexOf('disabled') === 0 || disabled.indexOf('no-button') === 0, disabled);
  const toasts = await pg.evaluate(() => window.__toasts.join(' | '));
  check('a breach raises a toast', /Breach/.test(toasts), toasts.slice(0, 80));
  const parties = await pg.evaluate(() => window.__celebrations);
  check('a breach is celebrated, not just toasted', parties > 0, parties + ' celebrations');

  // ── 6. Rebuild resets the siege ──
  await pg.evaluate(() => window.__click('Rebuild the wall'));
  await pg.waitForTimeout(300);
  st = await pg.evaluate(() => window.__state());
  check('rebuilding clears the shot count', st && st.shotsFired === 0, st && st.shotsFired);
  check('rebuilding clears the breach', st && st.breached === false);
  check('rebuilding restores a full wall', st && st.wallBlocks && st.wallBlocks.every((x) => x.state === 'intact'));

  // ── 7. Import a build from archStudio ──
  const archBlocks = [];
  for (let x = 0; x < 5; x++) for (let y = 0; y < 3; y++) for (let z = 0; z < 2; z++) {
    archBlocks.push({ x, y, z, shape: 'block', material: 'stone', color: '#94a3b8' });
  }
  await pg.evaluate(([s, a]) => window.__mount(s, { archStudio: { blocks: a } }),
    [S({ view: 'siege' }), archBlocks]);
  await pg.waitForTimeout(400);
  r = await pg.evaluate(() => window.__click('Your own build'));
  await pg.waitForTimeout(350);
  st = await pg.evaluate(() => window.__state());
  check('the import button is reachable when a build exists', r === 'ok', r);
  check('importing switches the target', st && st.wallPreset === 'imported', st && st.wallPreset);
  check('importing produces 15 columns from a 5x3x2 build', st && st.wallBlocks && st.wallBlocks.length === 15, st && st.wallBlocks && st.wallBlocks.length);
  check('imported blocks carry the depth multiplier', st && st.wallBlocks && st.wallBlocks[0].budgetMul === 2, st && st.wallBlocks && st.wallBlocks[0].budgetMul);
  check('importing reports success', st && st.siegeFeedback && st.siegeFeedback.ok === true);

  // ── 8. Navigation and machine switching ──
  await pg.evaluate(() => window.__click('Compare'));
  await pg.waitForTimeout(300);
  st = await pg.evaluate(() => window.__state());
  check('the nav switches views', st && st.view === 'compare', st && st.view);
  await pg.evaluate(() => window.__click('Field Manual'));
  await pg.waitForTimeout(250);
  st = await pg.evaluate(() => window.__state());
  check('the nav reaches the Field Manual', st && st.view === 'learn', st && st.view);

  await pg.evaluate((s) => window.__mount(s, {}), S({ view: 'build' }));
  await pg.waitForTimeout(300);
  await pg.evaluate(() => window.__click('Onager'));
  await pg.waitForTimeout(300);
  st = await pg.evaluate(() => window.__state());
  check('the machine picker switches machine', st && st.machine === 'onager', st && st.machine);

  // ── 9. The AI tutor. callGemini was hardcoded null in every harness, so the
  //    success, failure, sync-throw and hang paths had never run anywhere.
  const cfgTimeout = await pg.evaluate(() => window.StemLab._registry.machineLab._aiTimeoutMs);
  check('the tutor declares a finite timeout', Number.isFinite(cfgTimeout) && cfgTimeout > 0 && cfgTimeout <= 60000, cfgTimeout + ' ms');

  await pg.evaluate((s) => window.__mount(s, { gemini: 'ok' }), S({ view: 'learn' }));
  await pg.waitForTimeout(300);
  r = await pg.evaluate(() => window.__click('Explain'));
  await pg.waitForTimeout(400);
  st = await pg.evaluate(() => window.__state());
  check('the Explain button is reachable', r === 'ok', r);
  check('a successful answer is shown', st && /counterweight falls/.test(st.aiText || ''), (st && st.aiText || '').slice(0, 40));
  check('a successful answer clears the loading flag', st && st.aiLoading === false);

  await pg.evaluate((s) => window.__mount(s, { gemini: 'reject' }), S({ view: 'learn' }));
  await pg.waitForTimeout(300);
  await pg.evaluate(() => window.__click('Explain'));
  await pg.waitForTimeout(400);
  st = await pg.evaluate(() => window.__state());
  check('a rejected call reports an error', st && !!st.aiError, st && st.aiError);
  check('a rejected call re-enables the button', st && st.aiLoading === false);
  const reEnabled = await pg.evaluate(() => window.__click('Explain'));
  check('the student can retry after a failure', reEnabled === 'ok', reEnabled);

  await pg.evaluate((s) => window.__mount(s, { gemini: 'throw' }), S({ view: 'learn' }));
  await pg.waitForTimeout(300);
  await pg.evaluate(() => window.__click('Explain'));
  await pg.waitForTimeout(400);
  st = await pg.evaluate(() => window.__state());
  check('a call that throws synchronously is caught', st && !!st.aiError && st.aiLoading === false);

  await pg.evaluate((s) => window.__mount(s, {}), S({ view: 'learn' }));
  await pg.waitForTimeout(300);
  await pg.evaluate(() => window.__click('Explain'));
  await pg.waitForTimeout(300);
  st = await pg.evaluate(() => window.__state());
  check('an absent tutor says so instead of hanging', st && /not available/.test(st.aiError || ''), st && st.aiError);

  // The hang path: the button must stay disabled while in flight (so the state
  // is real) and the timeout is what eventually frees it. Only the in-flight
  // half is worth waiting for here; the timeout value is asserted above.
  await pg.evaluate((s) => window.__mount(s, { gemini: 'hang' }), S({ view: 'learn' }));
  await pg.waitForTimeout(300);
  await pg.evaluate(() => window.__click('Explain'));
  await pg.waitForTimeout(500);
  st = await pg.evaluate(() => window.__state());
  // While loading the button relabels itself "Thinking...", so it is that
  // label which must be present and disabled, not "Explain".
  const whileHung = await pg.evaluate(() => window.__click('Thinking'));
  const noExplain = await pg.evaluate(() => window.__click('Explain'));
  check('a hanging call marks itself in flight', st && st.aiLoading === true);
  check('a hanging call relabels the button', noExplain === 'no-button:Explain', noExplain);
  check('a hanging call disables the button until it settles', whileHung.indexOf('disabled') === 0, whileHung);

  check('no page errors during any interaction', errors.length === 0, errors.slice(0, 3).join(' | '));

  await b.close();

  const failed = results.filter((x) => !x.ok);
  results.forEach((x) => console.log((x.ok ? '  ok   ' : '  FAIL ') + x.name + (x.detail ? '   [' + x.detail + ']' : '')));
  console.log('\n' + (results.length - failed.length) + '/' + results.length + ' interaction checks passed');
  if (failed.length) { console.error('\n' + failed.length + ' FAILED'); process.exit(2); }
})();
