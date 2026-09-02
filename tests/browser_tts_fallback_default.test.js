import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

// The header's "Browser-voice fallback" checkbox and the Phase K read-aloud
// sequencer must agree on the same default: ON unless the teacher stored an
// explicit false. A drift here means the checkbox shows one thing and the
// reader does another.
const header = readFileSync('view_header_source.jsx', 'utf8');
const phaseK = readFileSync('phase_k_helpers_source.jsx', 'utf8');
const headerModule = readFileSync('view_header_module.js', 'utf8');
const phaseKModule = readFileSync('phase_k_helpers_module.js', 'utf8');

describe('browser-voice fallback default', () => {
  it('is on unless explicitly disabled, in both the checkbox and the reader', () => {
    expect(header).toContain('browserTtsFallback !== false; } catch { return true; }');
    expect(header).not.toContain('browserTtsFallback === true');
    expect(phaseK).toContain('browserFallback: config.browserTtsFallback !== false,');
    expect(phaseK).toContain("return { provider: '', browserFallback: true };");
    expect(phaseK).not.toContain('browserTtsFallback === true');
  });

  it('is carried into the built modules', () => {
    expect(headerModule).toContain('browserTtsFallback !== false');
    expect(phaseKModule).toContain('browserTtsFallback !== false');
  });

  it('still respects an explicit provider = off', () => {
    expect(phaseK).toContain("ttsConfig.provider === 'browser' || (ttsConfig.provider !== 'off' && ttsConfig.browserFallback)");
  });
});
