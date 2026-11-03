// Guided chat must not report "URL Content Fetched" when the import failed
// (2026-11-01 review of Katie Novak's feedback). handleUrlFetch resolves
// true/false; the chat advances only when the host did not report false.
// URL_INTAKE_HOST_MODULE / URL_INTAKE_CHAT_MODULE point at candidate builds.
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createRequire } from 'node:module';
import { loadAlloModule } from './setup.js';

const require = createRequire(import.meta.url);
const HOST_MODULE = process.env.URL_INTAKE_HOST_MODULE || 'host_handlers_module.js';
const CHAT_MODULE = process.env.URL_INTAKE_CHAT_MODULE || 'udl_chat_module.js';

beforeAll(() => {
  window.React = global.React = require(resolve(process.cwd(), 'desktop/web-app/node_modules/react'));
  loadAlloModule(HOST_MODULE);
});

function host(fetchAndCleanUrl, overrides = {}) {
  const deps = {
    urlToFetch: '', sourceTopic: '', t: key => key, callGemini: vi.fn(),
    fetchAndCleanUrl: vi.fn(fetchAndCleanUrl),
    setIsExtracting: vi.fn(), setGenerationStep: vi.fn(), setError: vi.fn(), addToast: vi.fn(),
    setInputText: vi.fn(), recordSourceProvenance: vi.fn(), setShowUrlInput: vi.fn(), setUrlToFetch: vi.fn(),
    warnLog: vi.fn(), flyToElement: vi.fn(), ...overrides,
  };
  return { deps, handleUrlFetch: window.AlloModules.createHostHandlers(deps).handleUrlFetch };
}

describe('handleUrlFetch reports whether the source was imported', () => {
  it('resolves true and replaces the source when text comes back', async () => {
    const { deps, handleUrlFetch } = host(async () => 'Source: https://example.org/a\n\nArticle body.');
    await expect(handleUrlFetch('https://example.org/a')).resolves.toBe(true);
    expect(deps.setInputText).toHaveBeenCalledWith('Source: https://example.org/a\n\nArticle body.');
    expect(deps.setIsExtracting).toHaveBeenLastCalledWith(false);
  });

  it('resolves false and shows the error when every import method fails', async () => {
    const { deps, handleUrlFetch } = host(async () => { throw new Error('Failed to fetch readable content.'); });
    await expect(handleUrlFetch('https://example.org/missing')).resolves.toBe(false);
    expect(deps.setInputText).not.toHaveBeenCalled();
    expect(deps.setError).toHaveBeenLastCalledWith('Failed to fetch readable content.');
    expect(deps.setIsExtracting).toHaveBeenLastCalledWith(false);
  });

  it('resolves false with an error instead of staying silent when no text comes back', async () => {
    const { deps, handleUrlFetch } = host(async () => null);
    await expect(handleUrlFetch('https://example.org/empty')).resolves.toBe(false);
    expect(deps.setInputText).not.toHaveBeenCalled();
    expect(deps.setError).toHaveBeenLastCalledWith('quick_start.error_extract');
  });

  it('resolves false without fetching when there is no URL', async () => {
    const { deps, handleUrlFetch } = host(async () => 'unused');
    await expect(handleUrlFetch('   ')).resolves.toBe(false);
    expect(deps.fetchAndCleanUrl).not.toHaveBeenCalled();
  });
});

describe('guided chat link intake', () => {
  const chat = readFileSync(resolve(process.cwd(), CHAT_MODULE), 'utf8');
  const at = (needle, from = 0) => {
    const index = chat.indexOf(needle, from);
    expect(index, 'anchor not found: ' + needle).toBeGreaterThanOrEqual(0);
    return index;
  };

  it('records "URL Content Fetched." only after the host did not report a failure', () => {
    const start = at('I see a link! Fetching content');
    const fetched = at('"URL Content Fetched."', start);
    const branch = chat.slice(start, fetched);
    const failed = branch.indexOf('await handleUrlFetch(textToSend) === false');
    expect(failed, 'failure check before the success record').toBeGreaterThanOrEqual(0);
    const failureMessage = branch.indexOf("sendBotMsg(t('quick_start.error_extract'))", failed);
    const elseAt = branch.indexOf('} else {', failed);
    expect(failureMessage).toBeGreaterThan(failed);
    expect(elseAt).toBeGreaterThan(failureMessage);
    expect(chat.indexOf('URL Content Fetched', fetched + '"URL Content Fetched."'.length)).toBe(-1);
  });
});
