import { beforeAll, describe, expect, it } from 'vitest';
import fs from 'node:fs';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';

let Hub;

beforeAll(() => {
  window.React = window.React || {
    useState: (value) => [typeof value === 'function' ? value() : value, () => {}],
    useEffect: () => {},
    useRef: () => ({ current: null }),
    createElement: () => null,
    Fragment: 'fragment',
  };
  loadAlloModule('test_prep_hub_module.js');
  Hub = window.AlloModules.TestPrepHub;
  if (!Hub) throw new Error('TestPrepHub did not register');
});

describe('Test Prep Hub exam-pack contract', () => {
  it('registers the demo and the source-reviewed EPPP pilot', () => {
    const packs = Hub.listPacks();
    const demo = packs.find((pack) => pack.id === 'workplace-safety-foundations-demo');
    const eppp = packs.find((pack) => pack.id === 'eppp-part-one');

    expect(Hub.schemaVersion).toBe(1);
    expect(demo.status).toBe('ready');
    expect(demo.items).toHaveLength(5);
    expect(eppp.status).toBe('ready');
    expect(eppp.items).toHaveLength(416);
    expect(eppp.domains).toHaveLength(8);
    expect(new Set(eppp.items.map((item) => item.domainId)).size).toBe(8);
    expect(eppp.items.every((item) => item.reviewStatus === 'source-reviewed')).toBe(true);
    expect(eppp.items.every((item) => item.references.length > 0)).toBe(true);
    expect(eppp.legacyUrl).toBe('./test_prep/eppp_legacy/index.html?embedded=1');
    expect(eppp.legacyAuditUrl).toBe('./test_prep/eppp_legacy/content_audit.json');
    expect(eppp.curation500Url).toBe('./test_prep/eppp_legacy/curation_500.json');
    expect(eppp.disclaimer).toContain('not official scores or pass predictions');
  });

  it('normalizes imported pack fields and applies safe limits', () => {
    const pack = Hub.normalizePack({
      id: ' My New Pack ',
      title: 'A'.repeat(250),
      status: 'unknown',
      domains: [{ label: 'Core Skills', weight: '0.5' }],
      items: [{
        prompt: 'Question?',
        options: ['One', 'Two'],
        answer: 1,
        domainId: 'Core Skills',
        references: Array.from({ length: 12 }, (_, index) => 'Reference ' + index),
      }],
    });

    expect(pack.id).toBe('my-new-pack');
    expect(pack.title).toHaveLength(180);
    expect(pack.status).toBe('research');
    expect(pack.domains[0]).toMatchObject({ id: 'core-skills', weight: 0.5 });
    expect(pack.items[0]).toMatchObject({ type: 'single-choice', answerIndex: 1, domainId: 'core-skills' });
    expect(pack.items[0].references).toHaveLength(8);
    expect(Hub.normalizePack({ id: 'remote', title: 'Remote', legacyUrl: 'https://example.com/app' }).legacyUrl).toBe('');
    expect(Hub.normalizePack({ id: 'escape', title: 'Escape', legacyUrl: './test_prep/../secret' }).legacyUrl).toBe('');
    expect(Hub.normalizePack({ id: 'remote-audit', title: 'Remote audit', legacyAuditUrl: 'https://example.com/audit.json' }).legacyAuditUrl).toBe('');
  });

  it('rejects invalid answer keys and empty ready packs', () => {
    const badItem = Hub.validatePack({
      id: 'bad',
      title: 'Bad pack',
      status: 'ready',
      items: [{ prompt: 'Question?', choices: ['A', 'B'], answerIndex: 4 }],
    });
    const empty = Hub.validatePack({ id: 'empty', title: 'Empty', status: 'ready', items: [] });

    expect(badItem.valid).toBe(false);
    expect(badItem.errors.join(' ')).toContain('invalid answer index');
    expect(empty.valid).toBe(false);
    expect(empty.errors.join(' ')).toContain('must contain at least one item');
  });

  it('scores by item and domain without inventing a credential score', () => {
    const demo = Hub.listPacks().find((pack) => pack.id === 'workplace-safety-foundations-demo');
    const answers = Object.fromEntries(demo.items.map((item, index) => [item.id, index === 0 ? item.answerIndex : -1]));
    const score = Hub.scoreAttempt(demo, answers);

    expect(score).toMatchObject({ correct: 1, total: 5, percent: 20 });
    expect(score).not.toHaveProperty('scaledScore');
    expect(score).not.toHaveProperty('passed');
    expect(score.byDomain['hazard-awareness'].total).toBe(2);
  });

  it('normalizes stored attempts and excludes impossible records', () => {
    const progress = Hub.normalizeProgress({
      attempts: [
        { id: 'ok', packId: 'Demo Pack', correct: 2, total: 4, percent: 50 },
        { id: 'bad', packId: 'Demo Pack', correct: 9, total: 4, percent: 200 },
      ],
    });
    expect(progress.attempts).toHaveLength(1);
    expect(progress.attempts[0]).toMatchObject({ packId: 'demo-pack', percent: 50 });
  });
});

describe('Test Prep Hub host contract', () => {
  it('is registered, lazy-loaded, gated, and exposed in Learning Tools', () => {
    const app = fs.readFileSync(resolve(process.cwd(), 'AlloFlowANTI.txt'), 'utf8');
    const launcher = fs.readFileSync(resolve(process.cwd(), 'view_learning_hub_modal_source.jsx'), 'utf8');
    const build = fs.readFileSync(resolve(process.cwd(), 'build.js'), 'utf8');

    expect(app).toContain("loadModule('TestPrepHub'");
    expect(app).toContain('moduleKey="TestPrepHub"');
    expect(app).toContain('setIsTestPrepHubOpen={setIsTestPrepHubOpen}');
    expect(launcher).toContain("'Test Prep Hub'");
    expect(launcher).toContain('setIsTestPrepHubOpen(true)');
    expect(build).toContain("filename: 'test_prep_hub_module.js'");

    const legacyIndex = fs.readFileSync(resolve(process.cwd(), 'test_prep/eppp_legacy/index.html'), 'utf8');
    const deployedLegacyIndex = fs.readFileSync(resolve(process.cwd(), 'prismflow-deploy/public/test_prep/eppp_legacy/index.html'), 'utf8');
    expect(legacyIndex).not.toMatch(/js\/auth\.js/i);
    expect(fs.existsSync(resolve(process.cwd(), 'test_prep/eppp_legacy/js/auth.js'))).toBe(false);
    const legacyApp = fs.readFileSync(resolve(process.cwd(), 'test_prep/eppp_legacy/js/app.js'), 'utf8');
    expect(legacyApp).not.toMatch(/AUTH & PAYWALL GATE|renderPaywall/);
    expect(legacyIndex).toContain('alloflow_embed.js');
    const legacyBridge = fs.readFileSync(resolve(process.cwd(), 'test_prep/eppp_legacy/alloflow_embed.js'), 'utf8');
    expect(legacyBridge).toContain('not official EPPP equating');
    expect(deployedLegacyIndex).toBe(legacyIndex);
    expect(fs.existsSync(resolve(process.cwd(), 'dev-tools/import_eppp_legacy.cjs'))).toBe(true);
  });
});

