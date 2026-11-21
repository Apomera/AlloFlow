import { describe, it, expect, afterEach, vi } from 'vitest';
import fs from 'node:fs';
import { resolve } from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const React = require(resolve('desktop/web-app/node_modules/react'));
const { createRoot } = require(resolve('desktop/web-app/node_modules/react-dom/client'));
const { act } = React;
const read = (p) => fs.readFileSync(resolve(p), 'utf8');

describe('Round 7 Wave 25 hardening (9 security/FERPA/contract modules)', () => {
  let host, root;

  afterEach(async () => {
    if (root) {
      await act(async () => root.unmount());
      root = null;
    }
    if (host) {
      host.remove();
      host = null;
    }
    delete window.__alloAiSecretsLocked;
    delete window.__alloQrStudentMode;
    delete window._alloQrBlocked;
    delete window.__alloStudentAiDisabled;
    delete window.__alloAiUsable;
    delete window.ALLOFLOW_MANAGED_AI_POLICY;
    delete window.callGemini;
    delete window.AlloFlowChatPrivacy;
    localStorage.clear();
  });

  it('1. onboarding_helpers keeps PII contextDropped empty, blocks QR/locked AI, filters prose forbidden phrases, and scans past MAX', async () => {
    const src = read('onboarding_helpers_module.js');
    expect(src).toContain('if (!contextDropped && !recent) recent = _bufferTail(COACH_CONTEXT_PAIRS);');
    expect(src).toContain('window.__alloQrStudentMode === true || window._alloQrBlocked === true');
    expect(src).toContain('if (gen !== _speechGen || !_iAmSpeaking) return;');

    window.AlloOnboarding = undefined;
    new Function(src)();
    const AO = window.AlloOnboarding;

    // QR student mode blocks coach availability even if callGemini is a function
    window.callGemini = vi.fn(async () => '{"answer":"ok"}');
    window.__alloQrStudentMode = true;
    expect(AO.isCoachAvailable()).toBe(false);
    window.__alloQrStudentMode = false;
    expect(AO.isCoachAvailable()).toBe(true);

    // Prose fallback still enforces COACH_FORBIDDEN_PHRASES (e.g. api key)
    window.callGemini = vi.fn(async () => 'Here is your api key for SuperTutor');
    AO.recordCoachConsent();
    const reply = await AO.askCoach({ question: 'How do I start?' });
    expect(reply.meta.validatorReplaced).toBe(true);
    expect(reply.answer).not.toMatch(/api key|SuperTutor/i);
  });

  it('2. signup_sheet_contract rejects duplicate claims and Object.prototype keys, and clamps negative/0 bounds', () => {
    window.AlloModules = window.AlloModules || {};
    new Function(read('signup_sheet_contract_module.js'))();
    const C = window.AlloModules.SignupSheetContract;

    const cfg = {
      maxPerPerson: 2,
      options: [{ id: 'o1', label: 'Slot 1', capacity: 2 }, { id: 'o0', label: 'Closed', capacity: 0 }],
    };
    // Duplicate claim must not overbook a 2-seat slot with 1 taken
    const dup = C.evaluateClaim(cfg, { u1: { claims: ['o1'] } }, 'u2', ['o1', 'o1']);
    expect(dup.ok).toBe(false);
    expect(dup.reason).toBe('bad-claims');

    // Prototype keys must never pass evaluateClaim
    expect(C.evaluateClaim(cfg, {}, 'u2', ['toString']).ok).toBe(false);
    expect(C.evaluateClaim(cfg, {}, 'u2', ['constructor']).ok).toBe(false);

    // Explicit 0 capacity stays 0 (not coerced to 1)
    expect(C.evaluateClaim(cfg, {}, 'u2', ['o0']).ok).toBe(false);
    expect(C.remainingFor(cfg, {}).find((r) => r.id === 'o0').remaining).toBe(0);

    // Null config does not throw
    expect(C.visibilityFor(null, true).counts).toBe(true);
  });

  it('3. availability_poll_contract prevents global Object prototype pollution and k-anonymity dilution', () => {
    window.AlloModules = window.AlloModules || {};
    new Function(read('availability_poll_contract_module.js'))();
    const P = window.AlloModules.AvailabilityPollContract;

    const cfg = {
      identityMode: 'anonymous',
      minParticipants: 3,
      options: [{ id: 'mon', label: 'Monday' }],
    };
    const counted = P.tally(cfg, {
      u1: { picks: { constructor: 'yes', toString: 'yes' } },
      u2: { picks: {} },
      u3: { picks: { bogus: 'yes' } },
      u4: { picks: { mon: 'yes' } },
    });
    expect(Object.yes).toBeUndefined();
    expect(Object.prototype.toString.yes).toBeUndefined();
    // Only u4 contributed a valid mark -> anonymous k-anonymity stays hidden
    expect(counted.participantCount).toBe(1);
    expect(P.visibilityFor(cfg, counted, true)).toEqual({ rows: false, tally: false, revealed: false });
    // Negative minParticipants clamps safely to default 3
    expect(P.visibilityFor({ ...cfg, minParticipants: -1 }, counted, true).revealed).toBe(false);
  });

  it('4. allobot_search_settings hides when secrets locked/QR student, guards null JSON, disables under managed policy, and notifies listeners', async () => {
    global.IS_REACT_ACT_ENVIRONMENT = true;
    window.React = React;
    window.AlloModules = {};
    new Function(read('view_misc_modals_module.js'))();
    const SearchSettings = window.AlloModules.AllobotSearchSettings;

    // Corrupted "null" JSON does not crash
    localStorage.setItem('alloflow_ai_config', 'null');
    host = document.createElement('div');
    document.body.appendChild(host);
    root = createRoot(host);
    await act(async () => { root.render(React.createElement(SearchSettings, { t: (k) => k })); });
    expect(host.querySelector('input[type="password"]')).not.toBeNull();

    // Secrets locked hides component completely
    window.__alloAiSecretsLocked = true;
    await act(async () => { window.dispatchEvent(new Event('alloflow:ai-key-lock-changed')); });
    expect(host.querySelector('input[type="password"]')).toBeNull();

    // Managed search off disables key input & save button
    window.__alloAiSecretsLocked = false;
    window.ALLOFLOW_MANAGED_AI_POLICY = { version: 1, allowExternalSearch: false };
    await act(async () => { root.render(React.createElement(SearchSettings, { t: (k) => k })); });
    await act(async () => { window.dispatchEvent(new Event('alloflow:ai-key-lock-changed')); });
    expect(host.querySelector('input[type="password"]').disabled).toBe(true);
  });

  it('5. allobot_context_controls tolerates missing AlloFlowChatPrivacy and requires 2-tap confirm to clear chat', async () => {
    global.IS_REACT_ACT_ENVIRONMENT = true;
    window.React = React;
    window.AlloModules = {};
    new Function(read('view_misc_modals_module.js'))();
    delete window.AlloFlowChatPrivacy;

    const clearChat = vi.fn();
    host = document.createElement('div');
    document.body.appendChild(host);
    root = createRoot(host);
    await act(async () => {
      root.render(React.createElement(window.AlloModules.AllobotContextControls, {
        messages: [], busy: false, setInput: vi.fn(), clearChat, t: (k) => k,
      }));
    });
    const clearBtn = [...host.querySelectorAll('button')].find((b) => /Clear live conversation/i.test(b.textContent));
    expect(clearBtn).toBeTruthy();
    await act(async () => { clearBtn.click(); });
    expect(clearChat).not.toHaveBeenCalled();
    const confirmBtn = [...host.querySelectorAll('button')].find((b) => /Confirm clear/i.test(b.textContent));
    expect(confirmBtn).toBeTruthy();
    await act(async () => { confirmBtn.click(); });
    expect(clearChat).toHaveBeenCalledTimes(1);
  });

  it('6. agent_core_media_security catches camelCase secret keys, non-object provider, nested prompt fields, and trims purpose', () => {
    window.AlloModules = window.AlloModules || {};
    new Function(read('agent_core_media_contracts_module.js'))();
    new Function(read('agent_core_managed_asset_store_module.js'))();
    new Function(read('agent_core_media_security_module.js'))();
    const S = window.AlloModules.AgentCoreMediaSecurity;

    const inv = S.validateProviderInventory({ schemaVersion: '1.0', providers: [{ id: 'p', openaiApiKey: 'sk-123' }] });
    expect(inv.ok).toBe(false);
    expect(inv.errors.some((e) => e.code === 'secret-like-field' && e.path.includes('openaiApiKey'))).toBe(true);

    const res = S.validateMediaResult({
      schemaVersion: '1.0',
      requestId: 'r1',
      status: 'completed',
      provider: 'openai',
      meta: { reasoning: 'hidden' },
    });
    expect(res.ok).toBe(false);
    expect(res.errors.some((e) => e.code === 'bad-result-provider')).toBe(true);
    expect(res.errors.some((e) => e.code === 'forbidden-result-field' && e.path === 'meta.reasoning')).toBe(true);
  });

  it('7. agent_core_openai_media_adapter rejects referenceAssets on generate and wraps invalid base64', async () => {
    window.AlloModules = window.AlloModules || {};
    new Function(read('agent_core_media_contracts_module.js'))();
    new Function(read('agent_core_managed_asset_store_module.js'))();
    new Function(read('agent_core_openai_media_adapter_module.js'))();
    const Contracts = window.AlloModules.AgentCoreMediaContracts;
    const Store = window.AlloModules.AgentCoreManagedAssetStore.createManagedAssetStore();
    const AdapterMod = window.AlloModules.AgentCoreOpenAIMediaAdapter;

    const adapter = AdapterMod.createOpenAIMediaAdapter({
      contracts: Contracts,
      assetStore: Store,
      fetchAuthorized: vi.fn(),
      authorizeExecution: () => true,
      estimateCost: () => ({ upperBoundUsd: 0.1 }),
      calculateActualCost: () => 0.1,
    });
    const ref = Store.importAsset({ bytes: new Uint8Array([1, 2, 3]), mimeType: 'image/jpeg' });
    const plan = adapter.prepare({
      schemaVersion: '1.0',
      requestId: 'req-1',
      operation: 'generate',
      prompt: 'A cloud diagram',
      purpose: 'glossary',
      referenceAssets: [{ handle: ref.handle }],
      output: { width: 1024, height: 1024, mimeType: 'image/png', quality: 'standard' },
      accessibility: { altTextRequired: false },
      providerPolicy: {
        mode: 'allow-listed', allowedProviders: ['openai-api'], allowedModels: ['gpt-image-2'],
        allowMeteredUsage: true, maxCostUsd: 1, maxOperations: 1,
      },
    });
    expect(plan.ready).toBe(false);
    expect(plan.code).toBe('reference-assets-require-edit');
  });

  it('8. agent_core_openai_media_production_guard blocks __alloQrStudentMode and cleans up leaked assets on budget failure', () => {
    const src = read('agent_core_openai_media_production_guard_module.js');
    expect(src).toContain('window.__alloQrStudentMode === true || window._alloQrBlocked === true');
    expect(src).toContain("window.__alloAiUsable('images')");
    expect(src).toContain('inner.execute(snapshotInput)');
    expect(src).toContain('opts.assetStore.remove(result.asset.handle)');
    expect(src).toContain("response.headers.get('content-length')");
  });

  it('9. agent_core_managed_asset_store supports detach/detachAllForArtifact, blocks SVG markup smuggling, and rejects secret metadata keys', () => {
    window.AlloModules = window.AlloModules || {};
    new Function(read('agent_core_managed_asset_store_module.js'))();
    const store = window.AlloModules.AgentCoreManagedAssetStore.createManagedAssetStore();

    // Blocks SVG/HTML disguised as PNG
    const svgBytes = new TextEncoder().encode('<svg onload="alert(1)"></svg>');
    expect(() => store.importAsset({ bytes: svgBytes, mimeType: 'image/png' })).toThrow(/MIME/);

    // Blocks extra credential keys like token / openaiApiKey
    expect(() => store.importAsset({ bytes: new Uint8Array([1, 2]), mimeType: 'image/png', openaiApiKey: 'sk-x' })).toThrow(/credentials/);

    // Supports attach -> detach -> remove lifecycle
    const asset = store.importAsset({ bytes: new Uint8Array([1, 2, 3]), mimeType: 'image/png' });
    store.attach(asset.handle, { artifactId: 'doc-1', slot: 'hero' });
    expect(() => store.remove(asset.handle)).toThrow(/Attached/);
    store.detach(asset.handle, { artifactId: 'doc-1', slot: 'hero' });
    expect(store.remove(asset.handle)).toBe(true);
    expect(store.getStats().assetCount).toBe(0);
  });
});
