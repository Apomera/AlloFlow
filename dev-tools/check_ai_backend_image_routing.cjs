'use strict';

const { AIProvider } = require('../ai_backend_module.js');

let passed = 0;
const failures = [];
const check = (name, cond) => {
  if (cond) passed += 1;
  else {
    failures.push(name);
    console.error('FAIL: ' + name);
  }
};

function setBrowserGlobals(win) {
  global.window = win;
  Object.defineProperty(global, 'navigator', {
    configurable: true,
    value: win.navigator || { gpu: { requestAdapter: async () => ({}) } },
  });
}

(async () => {
  let seenPrompt = '';
  setBrowserGlobals({
    _sdTurbo: {
      ready: true,
      generate: async (prompt) => {
        seenPrompt = prompt;
        return 'data:image/png;base64,LOCAL';
      },
    },
  });
  const localFirst = new AIProvider({
    backend: 'gemini',
    apiKey: 'cloud-key',
    imageProvider: 'sd-local',
    optimizeImage: async (url, width, quality) => `${url}|${width}|${quality}`,
  });
  localFirst._generateImageByBackend = async () => {
    throw new Error('cloud should not run for ready sd-local');
  };
  const localFirstUrl = await localFirst.generateImage('draw an apple', { width: 512, quality: 0.8 });
  check('sd-local uses ready local generator first', localFirstUrl === 'data:image/png;base64,LOCAL|512|0.8');
  check('sd-local forwards prompt', seenPrompt === 'draw an apple');

  let started = false;
  setBrowserGlobals({
    _sdTurbo: { ready: false },
    __loadSdTurbo: async () => {
      started = true;
      return false;
    },
    navigator: { gpu: { requestAdapter: async () => ({}) } },
  });
  const cloudWhilePreparing = new AIProvider({
    backend: 'gemini',
    apiKey: 'cloud-key',
    imageProvider: 'sd-local',
  });
  cloudWhilePreparing._generateImageByBackend = async () => 'cloud-image';
  const preparingUrl = await cloudWhilePreparing.generateImage('draw a map');
  check('sd-local starts loader when not ready', started);
  check('sd-local can use cloud while local prepares when keyed', preparingUrl === 'cloud-image');

  started = false;
  setBrowserGlobals({
    _sdTurbo: { ready: false },
    __loadSdTurbo: async () => {
      started = true;
      return false;
    },
    navigator: { gpu: { requestAdapter: async () => ({}) } },
  });
  const keylessPreparing = new AIProvider({ backend: 'gemini', imageProvider: 'sd-local', apiKey: '' });
  keylessPreparing._generateImageByBackend = async () => {
    throw new Error('cloud should not run without key while sd-local prepares');
  };
  let keylessMessage = '';
  try {
    await keylessPreparing.generateImage('draw a flower');
  } catch (err) {
    keylessMessage = err.message || '';
  }
  check('keyless sd-local starts loader', started);
  check('keyless sd-local reports preparing state', /still preparing/.test(keylessMessage));

  let fallbackCalled = false;
  setBrowserGlobals({
    _sdTurbo: {
      ready: true,
      generate: async () => {
        fallbackCalled = true;
        return 'data:image/png;base64,FALLBACK';
      },
    },
  });
  const rateLimitFallback = new AIProvider({ backend: 'gemini', apiKey: 'cloud-key' });
  rateLimitFallback._generateImageByBackend = async () => {
    const err = new Error('Rate limited: 429');
    err.isRateLimited = true;
    throw err;
  };
  const fallbackUrl = await rateLimitFallback.generateImage('draw a diagram');
  check('rate-limit uses ready SD-Turbo fallback', fallbackCalled && fallbackUrl === 'data:image/png;base64,FALLBACK');

  let safetyLocalCalled = false;
  setBrowserGlobals({
    _sdTurbo: {
      ready: true,
      generate: async () => {
        safetyLocalCalled = true;
        return 'data:image/png;base64,SHOULD_NOT_USE';
      },
    },
  });
  const safetyBlocked = new AIProvider({ backend: 'gemini', apiKey: 'cloud-key' });
  safetyBlocked._generateImageByBackend = async () => {
    throw new Error('No image generated (Likely Safety Block)');
  };
  let safetyMessage = '';
  try {
    await safetyBlocked.generateImage('blocked prompt');
  } catch (err) {
    safetyMessage = err.message || '';
  }
  check('safety blocks do not use local fallback', /Safety Block/.test(safetyMessage) && !safetyLocalCalled);

  console.log('\n[AI image routing] ' + passed + ' passed, ' + failures.length + ' failed');
  process.exit(failures.length ? 1 : 0);
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
