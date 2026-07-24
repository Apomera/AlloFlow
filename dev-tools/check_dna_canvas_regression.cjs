#!/usr/bin/env node
'use strict';

const assert = require('assert');
const path = require('path');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '..');
const REACT_UMD = path.join(ROOT, 'desktop/web-app', 'node_modules', 'react', 'umd', 'react.development.js');
const REACT_DOM_UMD = path.join(ROOT, 'desktop/web-app', 'node_modules', 'react-dom', 'umd', 'react-dom.development.js');
const DNA_TOOL = path.join(ROOT, 'stem_lab', 'stem_tool_dna.js');

async function setDNA(page, state) {
  await page.evaluate(function(nextState) {
    window.__setDNAState(nextState);
  }, state);
}

async function canvasTick(locator, key) {
  return locator.evaluate(function(cv, property) { return cv[property] || 0; }, key);
}

(async function run() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1000, height: 800 },
    deviceScaleFactor: 2,
    reducedMotion: 'no-preference'
  });
  const page = await context.newPage();
  const pageErrors = [];
  page.on('pageerror', function(error) { pageErrors.push(error.message); });

  try {
    await page.setContent([
      '<!doctype html><html><head><style>',
      'html,body,#root{width:100%;height:100%;margin:0}',
      'canvas{display:block;min-width:760px}',
      '</style></head><body><div id="root"></div></body></html>'
    ].join(''));
    await page.addScriptTag({ path: REACT_UMD });
    await page.addScriptTag({ path: REACT_DOM_UMD });
    await page.addScriptTag({ path: DNA_TOOL });
    await page.evaluate(function() {
      var noop = function() {};
      var Icon = function() { return null; };
      var icons = new Proxy({}, { get: function() { return Icon; } });
      function Harness() {
        var statePair = React.useState({
          dnaLab: {
            tab: 'translate',
            transPlaying: false,
            transStep: 0,
            builtProtein: [{ codon: 'UGA', aa: 'Stop', pos: 9 }]
          }
        });
        var toolData = statePair[0];
        var setToolData = statePair[1];
        window.__setDNAState = function(nextDNAState) {
          setToolData({ dnaLab: nextDNAState });
        };
        window.__dnaState = toolData.dnaLab;
        return window.StemLab.renderTool('dnaLab', {
          React: React,
          toolData: toolData,
          setToolData: setToolData,
          t: function(key, fallback) { return fallback || key; },
          icons: icons,
          addToast: noop,
          announceToSR: noop,
          a11yClick: function(handler) { return { onClick: handler }; },
          canvasNarrate: noop,
          awardXP: noop,
          getXP: function() { return 0; },
          setStemLabTool: noop,
          setToolSnapshots: noop,
          toolSnapshots: [],
          celebrate: noop,
          beep: noop,
          callGemini: null,
          callTTS: null,
          gradeLevel: '8th Grade'
        });
      }
      ReactDOM.createRoot(document.getElementById('root')).render(React.createElement(Harness));
    });

    const translation = page.locator('canvas[aria-label="Ribosome Translation Simulator"]');
    await translation.waitFor();
    await page.waitForTimeout(100);
    assert.deepStrictEqual(pageErrors, [], 'Translation canvas threw: ' + pageErrors.join(' | '));

    await setDNA(page, { tab: 'replicate', replStep: 0, replPlaying: true, speed: 0.25 });
    const replication = page.locator('canvas[aria-label^="Replication:"]');
    await replication.waitFor();
    await replication.scrollIntoViewIfNeeded();
    await page.waitForTimeout(180);
    const replBefore = await canvasTick(replication, '_dnaReplTick');
    await setDNA(page, { tab: 'replicate', replStep: 1, replPlaying: true, speed: 0.25 });
    await page.waitForTimeout(70);
    const replAfter = await canvasTick(replication, '_dnaReplTick');
    assert(replBefore >= 3, 'Replication loop did not advance before re-render');
    assert(replAfter > replBefore, 'Replication phase reset or stalled across re-render');
    await replication.evaluate(function(cv) { cv.style.transform = 'translateY(-5000px)'; });
    await page.waitForTimeout(120);
    const offscreenBefore = await canvasTick(replication, '_dnaReplTick');
    await page.waitForTimeout(160);
    const offscreenAfter = await canvasTick(replication, '_dnaReplTick');
    assert.strictEqual(offscreenAfter, offscreenBefore, 'Offscreen replication continued consuming animation frames');
    await replication.evaluate(function(cv) { cv.style.transform = ''; });
    await replication.scrollIntoViewIfNeeded();


    await setDNA(page, { tab: 'replicate', replStep: 1, replPlaying: false, speed: 1 });
    await page.waitForTimeout(80);
    const pausedBefore = await canvasTick(replication, '_dnaReplTick');
    await page.waitForTimeout(160);
    const pausedAfter = await canvasTick(replication, '_dnaReplTick');
    assert.strictEqual(pausedAfter, pausedBefore, 'Paused replication continued consuming animation frames');

    await setDNA(page, { tab: 'replicate', replStep: 0, replPlaying: true, speed: 1 });
    await page.waitForTimeout(100);
    await setDNA(page, { tab: 'build', replStep: 0, replPlaying: true, speed: 1 });
    await page.waitForTimeout(550);
    const stepAfterTabSwitch = await page.evaluate(function() { return window.__dnaState.replStep; });
    assert.strictEqual(stepAfterTabSwitch, 0, 'Replication timer fired after leaving the tab');

    await page.emulateMedia({ reducedMotion: 'reduce' });
    await setDNA(page, { tab: 'build', dnaSequence: 'ATGCGTACCTGAAACTGA' });
    const helix = page.locator('canvas[aria-label^="DNA helix:"]');
    await helix.waitFor();
    await helix.scrollIntoViewIfNeeded();
    await page.waitForTimeout(100);
    const reducedBefore = await canvasTick(helix, '_dnaTick');
    await page.waitForTimeout(160);
    const reducedAfter = await canvasTick(helix, '_dnaTick');
    assert.strictEqual(reducedAfter, reducedBefore, 'Reduced-motion mode continued the helix animation');

    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await setDNA(page, { tab: 'forensics', forensicCase: 0, forensicGelRun: true });
    const gel = page.locator('canvas[aria-label="Gel electrophoresis results"]');
    await gel.waitFor();
    await gel.scrollIntoViewIfNeeded();
    await page.waitForTimeout(3250);
    const gelDone = await canvasTick(gel, '_dnaForensicTick');
    await page.waitForTimeout(180);
    const gelSettled = await canvasTick(gel, '_dnaForensicTick');
    assert.strictEqual(gelSettled, gelDone, 'Completed forensic gel continued consuming animation frames');

    const crisprSequence = 'ATGCGTACCTGAACCGGAACTGA';
    await setDNA(page, {
      tab: 'crispr',
      dnaSequence: crisprSequence,
      crisprPhase: 'scanning',
      crisprScanPos: 0,
      speed: 1
    });
    const crispr = page.locator('canvas[aria-label^="CRISPR:"]');
    await crispr.waitFor();
    await crispr.scrollIntoViewIfNeeded();
    await page.waitForTimeout(150);
    const crisprBefore = await canvasTick(crispr, '_dnaCrisprTick');
    await page.waitForTimeout(350);
    const crisprAfter = await canvasTick(crispr, '_dnaCrisprTick');
    assert(crisprAfter > crisprBefore, 'CRISPR phase reset or stalled across scan updates');

    const dprSizing = await crispr.evaluate(function(cv) {
      return { pixelWidth: cv.width, cssWidth: cv.offsetWidth, dpr: window.devicePixelRatio };
    });
    assert(Math.abs(dprSizing.pixelWidth - dprSizing.cssWidth * dprSizing.dpr) <= 2,
      'Canvas backing resolution does not match CSS width and devicePixelRatio');
    assert.deepStrictEqual(pageErrors, [], 'DNA canvas page errors: ' + pageErrors.join(' | '));

    console.log(JSON.stringify({
      offscreenTick: offscreenAfter,
      pass: true,
      replicationTicks: [replBefore, replAfter],
      pausedTick: pausedAfter,
      reducedMotionTick: reducedAfter,
      completedGelTick: gelSettled,
      crisprTicks: [crisprBefore, crisprAfter],
      dprSizing: dprSizing
    }));
  } finally {
    await context.close();
    await browser.close();
  }
})().catch(function(error) {
  console.error(error && error.stack ? error.stack : error);
  process.exit(1);
});
