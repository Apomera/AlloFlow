// Gemini accepts its key as either ?key= or the x-goog-api-key header. The query-string
// form leaks: URLs land in browser history, proxy and server access logs, and Referer
// headers — places the request body never reaches. utils_pure already redacted "?key=…"
// from error strings, which is the tell that these URLs were being captured somewhere.
//
// These files are duplicated (root module + desktop/web-app/public mirror + *_source.jsx),
// so the check runs over every copy: fixing one and missing its twin is the likely failure.
//
// The second half matters as much as the first: removing the key from the URL without
// adding the header would leave every Gemini call unauthenticated, and the mistake looks
// identical in a diff. Retry paths are the easy ones to miss.
import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

const root = path.resolve(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');

const FILES = [
  'src/aiProvider.js',
  'ai_backend_module.js',
  'desktop/web-app/public/ai_backend_module.js',
  'tts_module.js',
  'desktop/web-app/public/tts_module.js',
  'tts_source.jsx',
  'utils_pure_module.js',
  'desktop/web-app/public/utils_pure_module.js',
  'utils_pure_source.jsx',
];

// Matches a key spliced into a query string, but not the word inside a prose comment.
const KEY_IN_URL = /[?&]key=\$\{/;

describe('Gemini key never travels in the URL', () => {
  it.each(FILES)('%s builds no ?key= query string', (file) => {
    expect(read(file)).not.toMatch(KEY_IN_URL);
  });
});

describe('Gemini requests still authenticate', () => {
  // Every generativelanguage.googleapis.com call must carry the header, including retries.
  it.each([
    ['tts_source.jsx', 3],
    ['tts_module.js', 3],
    ['desktop/web-app/public/tts_module.js', 3],
    ['utils_pure_source.jsx', 2],
    ['utils_pure_module.js', 2],
    ['desktop/web-app/public/utils_pure_module.js', 2],
  ])('%s sends x-goog-api-key on all %i Gemini fetches', (file, count) => {
    const src = read(file);
    expect((src.match(/'x-goog-api-key'/g) || []).length).toBe(count);
  });

  it('aiProvider routes every Gemini fetch through the shared header helper', () => {
    const src = read('src/aiProvider.js');
    expect(src).toMatch(/_geminiHeaders\(base = \{\}\)/);
    expect(src).toMatch(/headers\['x-goog-api-key'\] = this\.apiKey/);
    // No _gemini* method may still send a bare Content-Type-only header object.
    const geminiBodies = src.split(/\n    async /).filter((b) => b.startsWith('_gemini'));
    expect(geminiBodies.length).toBeGreaterThan(3);
    for (const body of geminiBodies) {
      expect(body).not.toMatch(/headers: \{ 'Content-Type': 'application\/json' \},/);
    }
  });

  it('does not attach the Google key to non-Google endpoints', () => {
    // ai_backend talks to the local Flux server and localhost Edge TTS as well; sending
    // the Gemini key to those would hand a user's key to another process.
    const src = read('ai_backend_module.js');
    for (const marker of ['fluxUrl', 'fluxEditUrl']) {
      const idx = src.indexOf(`await fetch(${marker}`);
      expect(idx).toBeGreaterThan(-1);
      expect(src.slice(idx, idx + 400)).not.toContain('x-goog-api-key');
    }
    const ttsLoop = src.indexOf('for (const url of ttsEndpoints)');
    expect(ttsLoop).toBeGreaterThan(-1);
    expect(src.slice(ttsLoop, ttsLoop + 900)).not.toContain('x-goog-api-key');
  });
});

describe('generated modules match their public mirrors', () => {
  it.each(['ai_backend_module.js', 'tts_module.js', 'utils_pure_module.js'])(
    '%s is byte-identical to desktop/web-app/public',
    (file) => {
      expect(read(file)).toBe(read(path.join('desktop/web-app/public', file)));
    },
  );
});
