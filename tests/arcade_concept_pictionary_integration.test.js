import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';

const read = file => readFileSync(file, 'utf8');
const hosts = ['AlloFlowANTI.txt', 'desktop/web-app/src/AlloFlowANTI.txt', 'desktop/web-app/src/App.jsx'];
// deploy.sh's accepted Git pin, verified against the exact committed module bytes.
const publishedHaven = {
  commit: '3d1ccc9e03bf21c3dee3b50370b43004577dcb51',
  pin: '3d1ccc9e0',
  sha256: '8961f5c6d47618d8ef09bd5b0e50de1b6a47168b35e8446e269db09737fc9293',
};
// The legacy plugin pin used mixed newlines; bind it to the exact Git LF asset.
const publishedPlugin = {
  pin: 'a225e174ea',
  canonicalSha256: '1c79d80cc3c7d40875311c8cfbb811aed0e33627fe2fff55604108d6a0c05e3f',
};
// Every deploy re-pins the CDN refs to its own commit (deploy.sh step 6). Pins verified against the
// committed module bytes, so a shallow CI checkout that lacks the commit can still check them.
const verifiedHavenPins = [
  { pin: publishedHaven.pin, sha256: publishedHaven.sha256 },
  { pin: '4a23d7b91', sha256: '8961f5c6d47618d8ef09bd5b0e50de1b6a47168b35e8446e269db09737fc9293' }, // deploy 2026-10-16
];
function committedHavenHash(pin) {
  if (!/^[0-9a-f]{7,40}$/.test(String(pin || ''))) return null;
  try {
    const bytes = execFileSync('git', ['show', pin + ':allohaven_module.js'], { maxBuffer: 64 * 1024 * 1024, stdio: ['ignore', 'pipe', 'ignore'] });
    return createHash('sha256').update(bytes).digest('hex');
  } catch (_) { return null; }
}
function matchesHavenPin(pin, bytes) {
  const hash = createHash('sha256').update(bytes).digest('hex');
  return pin === hash.slice(0, 10)
    || verifiedHavenPins.some((entry) => entry.pin === pin && entry.sha256 === hash)
    // A later deploy's commit pin: accept it only when that commit holds these exact bytes.
    || committedHavenHash(pin) === hash;
}
function matchesPluginPin(pin, bytes) {
  const lf = bytes.toString('utf8').replace(/\r\n/g, '\n');
  const canonicalHash = createHash('sha256').update(lf).digest('hex');
  return [bytes, lf, lf.replace(/\n/g, '\r\n')].some(source =>
    createHash('sha256').update(source).digest('hex').slice(0, 10) === pin)
    || (pin === publishedPlugin.pin && canonicalHash === publishedPlugin.canonicalSha256);
}

describe('Pictionary production integration', () => {
  it('ships the same solo plugin and arcade provider context in desktop mirrors', () => {
    for (const file of ['arcade_mode_concept_pictionary.js', 'allohaven_module.js']) {
      expect(read('desktop/web-app/public/' + file)).toBe(read(file));
    }
  });

  it('passes vision through each host and arcade context while honoring student AI privacy', () => {
    expect(read('allohaven_module.js')).toContain('callGeminiVision: props.callGeminiVision || null');
    for (const file of hosts) {
      const text = read(file), start = text.indexOf('{(AlloHaven) => React.createElement(AlloHaven, {');
      expect(start, file).toBeGreaterThan(-1);
      const expression = text.slice(start, start + 1200).match(/callGeminiVision:\s*\(([^)]+)\)/)?.[1];
      expect(expression, file).toBeTruthy();
      const configuredVision = () => 'vision';
      const provider = new Function('studentAiFeaturesHidden', 'callGeminiVision', 'return (' + expression + ');');
      expect(provider(false, configuredVision), file).toBe(configuredVision);
      expect(provider(true, configuredVision), file).toBeNull();
    }
  });

  it('binds plugins and the arcade loader to content or byte-verified release pins, retaining retries', () => {
    const pluginBytes = readFileSync('arcade_mode_concept_pictionary.js');
    const havenBytes = readFileSync('allohaven_module.js'), havenPins = [], pluginPins = [];
    for (const file of hosts) {
      const text = read(file);
      const pluginPin = text.match(/mod === 'arcade_mode_concept_pictionary\.js' \? '([0-9a-f]+)' : pluginCdnVersion/)?.[1];
      expect(matchesPluginPin(pluginPin, pluginBytes), file).toBe(true);
      pluginPins.push(pluginPin);
      expect(text.includes("s.src = pluginCdnBase + mod + '?v=' + modeVersion + retrySuffix"), file).toBe(true);
      const pin = text.match(/allohaven_module\.js\?v=([0-9a-f]+)/)?.[1];
      expect(matchesHavenPin(pin, havenBytes), file).toBe(true);
      havenPins.push(pin);
    }
    expect(new Set(havenPins).size).toBe(1);
    expect(new Set(pluginPins).size).toBe(1);
  });

  it('binds the plugin pin across Git LF and deployed CRLF bytes without accepting content changes', () => {
    const lf = read('arcade_mode_concept_pictionary.js').replace(/\r\n/g, '\n');
    const crlf = lf.replace(/\n/g, '\r\n');
    for (const published of [lf, crlf]) {
      const pin = createHash('sha256').update(published).digest('hex').slice(0, 10);
      expect(matchesPluginPin(pin, Buffer.from(lf))).toBe(true);
      expect(matchesPluginPin(pin, Buffer.from(crlf))).toBe(true);
      expect(matchesPluginPin(pin, Buffer.from(lf + '\n// changed'))).toBe(false);
    }
    expect(matchesPluginPin('0000000000', Buffer.from(lf))).toBe(false);
    expect(createHash('sha256').update(lf).digest('hex')).toBe(publishedPlugin.canonicalSha256);
    expect(matchesPluginPin(publishedPlugin.pin, Buffer.from(lf))).toBe(true);
    expect(matchesPluginPin(publishedPlugin.pin, Buffer.from(crlf))).toBe(true);
    expect(matchesPluginPin(publishedPlugin.pin, Buffer.from(lf + '\n// changed'))).toBe(false);
  });

  it('rejects wrong release pins or modified module bytes under the accepted Git pin', () => {
    const bytes = readFileSync('allohaven_module.js');
    expect(publishedHaven.commit.startsWith(publishedHaven.pin)).toBe(true);
    expect(matchesHavenPin(publishedHaven.pin, bytes)).toBe(true);
    expect(matchesHavenPin('000000000', bytes)).toBe(false);
    expect(matchesHavenPin(publishedHaven.pin, Buffer.concat([bytes, Buffer.from('\n// changed')]))).toBe(false);
    for (const entry of verifiedHavenPins) {
      expect(matchesHavenPin(entry.pin, Buffer.concat([bytes, Buffer.from('\n// changed')]))).toBe(false);
    }
    // A real commit whose module bytes differ (the one that added the module) is refused.
    expect(matchesHavenPin('d23cf5ff6', bytes)).toBe(false);
  });
});
