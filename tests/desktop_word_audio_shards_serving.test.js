import { afterEach, describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const require = createRequire(import.meta.url);
const runtime = require('../desktop/runtime/alloflow-desktop-runtime.cjs');

const ROOT = process.cwd();
const tempDirs = [];
const openServers = [];
const PREV_SHARDS_ENV = process.env.ALLOFLOW_WORD_AUDIO_SHARDS_DIR;
const PREV_BANK_ENV = process.env.ALLOFLOW_WORD_AUDIO_KOKORO_BANK_PATH;
const PREV_VOCAB_DIR_ENV = process.env.ALLOFLOW_PACKETS_VOCAB_DIR;
const PREV_VOCAB_SCRIPT_ENV = process.env.ALLOFLOW_PACKETS_VOCAB_BANK_SCRIPT_PATH;

function makeTempFixture() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'alloflow-word-shards-'));
  tempDirs.push(dir);
  const shardsDir = path.join(dir, 'word_audio_shards');
  fs.mkdirSync(shardsDir, { recursive: true });
  fs.writeFileSync(
    path.join(shardsDir, 'index.json'),
    JSON.stringify({ format: 'alloflow-word-audio-index/1', shards: { 'c-01': { file: 'c-01.json', words: 1 } }, words: { cat: 'c-01' } }),
  );
  fs.writeFileSync(
    path.join(shardsDir, 'c-01.json'),
    JSON.stringify({ format: 'alloflow-word-audio-shard/1', words: { cat: 'data:audio/wav;base64,UklGRg==' } }),
  );
  const bankPath = path.join(dir, 'word_audio_kokoro_bank.json');
  fs.writeFileSync(bankPath, JSON.stringify({ cat: 'data:audio/wav;base64,UklGRg==' }));

  const vocabDir = path.join(dir, 'packets_vocab');
  fs.mkdirSync(vocabDir, { recursive: true });
  fs.writeFileSync(path.join(vocabDir, 'en-1.json'), JSON.stringify({ version: 1, part: 1, words: [] }));
  const vocabScriptPath = path.join(dir, 'packets_vocab_bank_en.js');
  fs.writeFileSync(vocabScriptPath, '/* fixture */ window.AlloVocabBank = {};\n');

  return { dir, shardsDir, bankPath, vocabDir, vocabScriptPath };
}

async function startServer(server) {
  openServers.push(server);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  return `http://127.0.0.1:${address.port}`;
}

afterEach(async () => {
  if (PREV_SHARDS_ENV === undefined) delete process.env.ALLOFLOW_WORD_AUDIO_SHARDS_DIR;
  else process.env.ALLOFLOW_WORD_AUDIO_SHARDS_DIR = PREV_SHARDS_ENV;
  if (PREV_BANK_ENV === undefined) delete process.env.ALLOFLOW_WORD_AUDIO_KOKORO_BANK_PATH;
  else process.env.ALLOFLOW_WORD_AUDIO_KOKORO_BANK_PATH = PREV_BANK_ENV;
  if (PREV_VOCAB_DIR_ENV === undefined) delete process.env.ALLOFLOW_PACKETS_VOCAB_DIR;
  else process.env.ALLOFLOW_PACKETS_VOCAB_DIR = PREV_VOCAB_DIR_ENV;
  if (PREV_VOCAB_SCRIPT_ENV === undefined) delete process.env.ALLOFLOW_PACKETS_VOCAB_BANK_SCRIPT_PATH;
  else process.env.ALLOFLOW_PACKETS_VOCAB_BANK_SCRIPT_PATH = PREV_VOCAB_SCRIPT_ENV;

  while (openServers.length) {
    const server = openServers.pop();
    await new Promise((resolve) => server.close(resolve));
  }
  while (tempDirs.length) {
    fs.rmSync(tempDirs.pop(), { recursive: true, force: true });
  }
});

describe('Desktop & LAN word_audio_shards + word_audio_kokoro_bank.json offline serving', () => {
  it('declares word_audio_shards and word_audio_kokoro_bank.json in electron-builder extraResources', () => {
    const builderCfg = JSON.parse(fs.readFileSync(path.join(ROOT, 'desktop/electron-builder.json'), 'utf8'));
    expect(builderCfg.extraResources).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ from: '../word_audio_shards', to: 'word_audio_shards' }),
        expect.objectContaining({ from: '../word_audio_kokoro_bank.json', to: 'word_audio_kokoro_bank.json' }),
        expect.objectContaining({ from: '../packets_vocab', to: 'packets_vocab' }),
        expect.objectContaining({ from: '../packets_vocab_bank_en.js', to: 'packets_vocab_bank_en.js' }),
      ]),
    );
  });

  it('resolves shards, bank, and packets_vocab paths across dev REPO_ROOT, packaged resourcesPath, and env overrides', () => {
    delete process.env.ALLOFLOW_WORD_AUDIO_SHARDS_DIR;
    delete process.env.ALLOFLOW_WORD_AUDIO_KOKORO_BANK_PATH;
    delete process.env.ALLOFLOW_PACKETS_VOCAB_DIR;
    delete process.env.ALLOFLOW_PACKETS_VOCAB_BANK_SCRIPT_PATH;

    expect(runtime.resolveWordAudioShardsDir('/ignored/resources', true)).toBe(path.join(ROOT, 'word_audio_shards'));
    expect(runtime.resolveWordAudioKokoroBankPath('/ignored/resources', true)).toBe(path.join(ROOT, 'word_audio_kokoro_bank.json'));
    expect(runtime.resolvePacketsVocabDir('/ignored/resources', true)).toBe(path.join(ROOT, 'packets_vocab'));
    expect(runtime.resolvePacketsVocabBankScriptPath('/ignored/resources', true)).toBe(path.join(ROOT, 'packets_vocab_bank_en.js'));

    const fx = makeTempFixture();
    expect(runtime.resolveWordAudioShardsDir(fx.dir, false)).toBe(fx.shardsDir);
    expect(runtime.resolveWordAudioKokoroBankPath(fx.dir, false)).toBe(fx.bankPath);
    expect(runtime.resolvePacketsVocabDir(fx.dir, false)).toBe(fx.vocabDir);
    expect(runtime.resolvePacketsVocabBankScriptPath(fx.dir, false)).toBe(fx.vocabScriptPath);

    process.env.ALLOFLOW_WORD_AUDIO_SHARDS_DIR = fx.shardsDir;
    process.env.ALLOFLOW_WORD_AUDIO_KOKORO_BANK_PATH = fx.bankPath;
    process.env.ALLOFLOW_PACKETS_VOCAB_DIR = fx.vocabDir;
    process.env.ALLOFLOW_PACKETS_VOCAB_BANK_SCRIPT_PATH = fx.vocabScriptPath;
    expect(runtime.resolveWordAudioShardsDir('/ignored/resources', true)).toBe(fx.shardsDir);
    expect(runtime.resolveWordAudioKokoroBankPath('/ignored/resources', true)).toBe(fx.bankPath);
    expect(runtime.resolvePacketsVocabDir('/ignored/resources', true)).toBe(fx.vocabDir);
    expect(runtime.resolvePacketsVocabBankScriptPath('/ignored/resources', true)).toBe(fx.vocabScriptPath);
  });

  it('serves GET/HEAD shard, bank, and packets_vocab routes with nosniff and blocks directory/missing/traversal/POST on both desktop and LAN servers', async () => {
    const fx = makeTempFixture();
    process.env.ALLOFLOW_WORD_AUDIO_SHARDS_DIR = fx.shardsDir;
    process.env.ALLOFLOW_WORD_AUDIO_KOKORO_BANK_PATH = fx.bankPath;
    process.env.ALLOFLOW_PACKETS_VOCAB_DIR = fx.vocabDir;
    process.env.ALLOFLOW_PACKETS_VOCAB_BANK_SCRIPT_PATH = fx.vocabScriptPath;

    for (const [label, serverFactory] of [
      ['desktop', () => runtime.createServer()],
      ['lan', () => runtime.createLanShareServer()],
    ]) {
      const base = await startServer(serverFactory());

      for (const route of [
        '/app/word_audio_shards/index.json',
        '/word_audio_shards/index.json',
        '/app/word_audio_shards/c-01.json',
        '/word_audio_shards/c-01.json',
        '/app/word_audio_kokoro_bank.json',
        '/word_audio_kokoro_bank.json',
        '/app/packets_vocab/en-1.json',
        '/packets_vocab/en-1.json',
        '/app/packets_vocab_bank_en.js',
        '/packets_vocab_bank_en.js',
      ]) {
        const res = await fetch(`${base}${route}`);
        expect(res.status, `${label} GET ${route}`).toBe(200);
        const expectedMime = route.endsWith('.js') ? /javascript/i : /application\/json/i;
        expect(res.headers.get('content-type'), `${label} CT ${route}`).toMatch(expectedMime);
        expect(res.headers.get('x-content-type-options'), `${label} nosniff ${route}`).toBe('nosniff');
        if (route.endsWith('.json')) {
          const data = await res.json();
          expect(typeof data, `${label} json ${route}`).toBe('object');
        } else {
          expect(await res.text()).toContain('AlloVocabBank');
        }

        const headRes = await fetch(`${base}${route}`, { method: 'HEAD' });
        expect(headRes.status, `${label} HEAD ${route}`).toBe(200);
      }

      for (const route of [
        '/app/word_audio_shards', '/app/word_audio_shards/', '/word_audio_shards/', '/app/word_audio_shards/nope.json',
        '/app/packets_vocab', '/app/packets_vocab/', '/packets_vocab/', '/app/packets_vocab/nope.json',
      ]) {
        const res = await fetch(`${base}${route}`);
        expect(res.status, `${label} 404 ${route}`).toBe(404);
      }

      const traversalRes = await fetch(`${base}/app/word_audio_shards/%2e%2e%2fword_audio_kokoro_bank.json`);
      expect([403, 404], `${label} traversal`).toContain(traversalRes.status);

      const postRes = await fetch(`${base}/app/word_audio_shards/index.json`, { method: 'POST' });
      expect(postRes.status, `${label} POST`).toBe(405);
    }
  });

  it('mounts offline word_audio and packets_vocab assets read-only in SchoolBox Docker and returns =404 + nosniff in Nginx for missing .json/.wasm/.js assets', () => {
    for (const [composeFile, prefix] of [
      ['desktop/schoolbox/docker-compose.yml', '../../'],
      ['docker/docker-compose.yml', '../'],
    ]) {
      const yml = fs.readFileSync(path.join(ROOT, composeFile), 'utf8');
      for (const asset of ['word_audio_shards', 'word_audio_kokoro_bank.json', 'packets_vocab', 'packets_vocab_bank_en.js']) {
        expect(yml, `${composeFile} missing ${asset}`).toContain(`${prefix}${asset}:/usr/share/nginx/html/${asset}:ro`);
      }
    }

    for (const nginxFile of ['desktop/schoolbox/nginx.conf', 'docker/nginx.conf']) {
      const conf = fs.readFileSync(path.join(ROOT, nginxFile), 'utf8');
      expect(conf, `${nginxFile} missing json/wasm/audio block`).toMatch(/location ~\* \\\.\(json\|wasm\|onnx\|mp3\|wav\|webm\|ogg\|m4a\)\$/);
      expect(conf, `${nginxFile} missing try_files $uri =404`).toContain('try_files $uri =404;');
      expect(conf, `${nginxFile} missing nosniff`).toContain('add_header X-Content-Type-Options "nosniff" always;');
    }
  });
});
