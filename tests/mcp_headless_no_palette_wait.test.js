// A headless host has no palette card and nobody to click one, so the pipeline's 20 s
// "boring palette" countdown was pure waiting on every grayscale document remediated over the
// MCP connector (agent-bridge Form 1040 run, 2026-09-13: +25.8s "Detected boring/grayscale
// palette" to +45.8s "User kept original styling (or timed out)"). The driver now stamps
// window.__alloHeadlessHost before pipeline creation and the pipeline keeps the original
// styling immediately when it sees the stamp. The app never sets the stamp, so its palette
// card is unchanged.
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const ROOT = path.resolve(__dirname, '..');
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

const source = read('doc_pipeline_source.jsx');
const builtModule = read('doc_pipeline_module.js');
const driver = read('desktop/mcp/remediation_headless_driver.cjs');

describe('headless host skips the palette prompt wait', () => {
  it('the pipeline defines the top-level helper and checks it before offering the theme prompt', () => {
    expect(source).toContain('function _alloHeadlessHost() {');
    const headlessBranch = source.indexOf("if (_isGrayscale && _colors.length >= 2 && _alloHeadlessHost()) {");
    const promptBranch = source.indexOf("} else if (_isGrayscale && _colors.length >= 2) {");
    const offering = source.indexOf("'Detected boring/grayscale palette — offering theme suggestion'");
    expect(headlessBranch).toBeGreaterThan(0);
    expect(promptBranch).toBeGreaterThan(headlessBranch);
    expect(offering).toBeGreaterThan(promptBranch);
    // The 20 s countdown survives for the app's UI path; it is only bypassed on a headless host.
    expect(source).toContain("window.removeEventListener('alloflow:boring-palette-choice', _onChoice); resolve(null); }, 20000);");
    expect(source).toContain('headless host, keeping original styling (no palette prompt to answer)');
  });

  it('the built module carries the helper (the driver loads the module, not the source)', () => {
    expect(builtModule).toContain('function _alloHeadlessHost() {');
    expect(builtModule).toContain('_alloHeadlessHost()) {');
  });

  it('the helper reads only the explicit stamp', () => {
    const match = /function _alloHeadlessHost\(\) \{[\s\S]*?\n\}/.exec(source);
    expect(match).not.toBeNull();
    const run = (win) => vm.runInNewContext(match[0] + '; _alloHeadlessHost();', win === undefined ? {} : { window: win });
    expect(run(undefined)).toBe(false);
    expect(run({})).toBe(false);
    expect(run({ __alloHeadlessHost: 'yes' })).toBe(false);
    expect(run({ __alloHeadlessHost: true })).toBe(true);
  });

  it('the driver stamps every pipeline page before the host transport profile', () => {
    const stamp = driver.indexOf('w.__alloHeadlessHost = true;');
    const profile = driver.indexOf('if (cfg.hostTransportProfile) {');
    const state = driver.indexOf("w.__docPipelineState = { pdfOcrLanguage: cfg.ocrLanguage || '', pdfDocumentEpoch: cfg.documentEpoch };");
    expect(state).toBeGreaterThan(0);
    expect(stamp).toBeGreaterThan(state);
    expect(profile).toBeGreaterThan(stamp);
  });
});
