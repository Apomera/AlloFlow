// The desktop runtime never looked at the machine it was running on: no
// os.cpus(), no os.totalmem() anywhere. Threads were left entirely to llama.cpp
// (which takes every physical core and makes the Electron UI stutter) and
// context came from a fixed per-model-name table, so a 64GB workstation and an
// 8GB laptop both got 4096 tokens. Separately, the launch line never passed
// -ngl, which made the documented "swap in a CUDA/Vulkan binaryUrl, zero code
// changes" GPU path a no-op: a GPU build with no -ngl offloads nothing.
import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const RUNTIME = path.join(process.cwd(), 'desktop', 'runtime', 'alloflow-desktop-runtime.cjs');
const source = fs.readFileSync(RUNTIME, 'utf8');

// The runtime is a long-running server module; rather than boot it, exercise the
// pure sizing helpers by extracting them. They are self-contained by design.
function loadHelper(name) {
  const start = source.indexOf(`function ${name}(`);
  if (start < 0) throw new Error(`${name} not found in the runtime`);
  let depth = 0;
  let i = source.indexOf('{', start);
  const open = i;
  for (; i < source.length; i += 1) {
    if (source[i] === '{') depth += 1;
    else if (source[i] === '}') {
      depth -= 1;
      if (depth === 0) break;
    }
  }
  return source.slice(start, i + 1);
}

const PROFILES_SRC = source.slice(
  source.indexOf('const LOCAL_ENGINE_MODEL_PROFILES'),
  source.indexOf('];', source.indexOf('const LOCAL_ENGINE_MODEL_PROFILES')) + 2,
);

// eslint-disable-next-line no-new-func
const sandbox = new Function(`
  const LOCAL_ENGINE_CONTEXT_FALLBACK = 4096;
  const LOCAL_ENGINE_AUTO_CONTEXT_CAP = 16384;
  ${PROFILES_SRC}
  ${loadHelper('resolveAutoThreads')}
  ${loadHelper('resolveAutoContextSize')}
  return { LOCAL_ENGINE_MODEL_PROFILES, resolveAutoThreads, resolveAutoContextSize };
`)();

const { LOCAL_ENGINE_MODEL_PROFILES, resolveAutoThreads, resolveAutoContextSize } = sandbox;
const qwen3b = LOCAL_ENGINE_MODEL_PROFILES.find((p) => p.id === 'alloflow-qwen2.5-3b');
const hw = (cores, totalMemGb) => ({ cores, totalMemGb });

describe('thread sizing leaves the machine usable', () => {
  it.each([
    [1, 1],
    [2, 1],
    [4, 3],
    [8, 6],
    [16, 8],
    [32, 8],
  ])('%i logical cores -> %i threads', (cores, expected) => {
    expect(resolveAutoThreads(hw(cores, 16))).toBe(expected);
  });

  it('never returns zero or more threads than cores', () => {
    for (let cores = 1; cores <= 64; cores += 1) {
      const threads = resolveAutoThreads(hw(cores, 16));
      expect(threads).toBeGreaterThanOrEqual(1);
      expect(threads).toBeLessThanOrEqual(cores);
    }
  });
});

describe('context sizing follows the hardware, within the model band', () => {
  it('leaves a small machine on the conservative profile floor', () => {
    // 8GB is the laptop the floor was chosen for; it must not be pushed higher.
    expect(resolveAutoContextSize(qwen3b, hw(4, 8))).toBe(qwen3b.contextSize);
  });

  it('spends real headroom on a roomy machine', () => {
    const big = resolveAutoContextSize(qwen3b, hw(16, 32));
    expect(big).toBeGreaterThan(qwen3b.contextSize);
    expect(big).toBeLessThanOrEqual(qwen3b.maxContextSize);
  });

  it('is monotonic in RAM', () => {
    const sizes = [8, 12, 16, 32, 64].map((gb) => resolveAutoContextSize(qwen3b, hw(8, gb)));
    for (let i = 1; i < sizes.length; i += 1) {
      expect(sizes[i]).toBeGreaterThanOrEqual(sizes[i - 1]);
    }
  });

  it('never exceeds what the model architecture supports', () => {
    for (const profile of LOCAL_ENGINE_MODEL_PROFILES) {
      const huge = resolveAutoContextSize(profile, hw(64, 512));
      expect(huge).toBeLessThanOrEqual(profile.maxContextSize);
      expect(huge).toBeGreaterThanOrEqual(profile.contextSize);
    }
  });

  it('caps the automatic size even when RAM would allow far more', () => {
    // localExcerpt() caps source at ~1500 tokens, so a bigger window buys this
    // app nothing while the memory cost is real. An explicit contextSize still
    // wins — that path never reaches this helper.
    for (const profile of LOCAL_ENGINE_MODEL_PROFILES) {
      expect(resolveAutoContextSize(profile, hw(64, 1024))).toBeLessThanOrEqual(16384);
    }
  });

  it('a quantized KV cache buys more context from the same RAM', () => {
    const f16 = resolveAutoContextSize(qwen3b, hw(8, 16), '');
    const q8 = resolveAutoContextSize(qwen3b, hw(8, 16), 'q8_0');
    expect(q8).toBeGreaterThanOrEqual(f16);
  });

  it('falls back to the floor when RAM cannot be read', () => {
    expect(resolveAutoContextSize(qwen3b, { cores: 8, totalMemGb: 0 })).toBe(qwen3b.contextSize);
  });
});

describe('llama-server launch line', () => {
  it('passes -ngl so a GPU binary actually offloads', () => {
    expect(source).toContain("args.push('-ngl', String(Math.floor(gpuLayers)))");
  });

  it('always passes an explicit thread count', () => {
    expect(source).toContain("args.push('-t', String(threads))");
  });

  it('applies the KV cache type to both K and V', () => {
    expect(source).toContain("args.push('--cache-type-k', kvCacheType, '--cache-type-v', kvCacheType)");
  });
});

describe('settings API safety', () => {
  it('accepts the hardware knobs', () => {
    for (const field of ['gpuLayers', 'kvCacheType', 'flashAttention', 'batchSize', 'binaryUrl', 'binarySha256']) {
      expect(source).toContain(`'${field}'`);
    }
  });

  it('still refuses extraArgs, which would let a later --host escape loopback', () => {
    const allowlist = source.slice(
      source.indexOf("assertAllowedObject(input.localEngine"),
      source.indexOf("'local engine');", source.indexOf("assertAllowedObject(input.localEngine")),
    );
    expect(allowlist).not.toContain('extraArgs');
    expect(allowlist).toContain('gpuLayers');
  });

  it('requires a checksum before a custom binary can be downloaded and spawned', () => {
    expect(source).toContain('A custom engine binary URL also needs its SHA-256 checksum');
  });
});
