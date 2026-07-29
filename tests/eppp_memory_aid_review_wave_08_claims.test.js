import { describe, expect, it } from 'vitest';
import fs from 'node:fs';

describe('EPPP memory-aid Wave 08 high-risk compatibility checks', () => {
  const wave = JSON.parse(fs.readFileSync('test_prep/eppp_memory_aid_review_wave_08.json', 'utf8'));
  const byId = new Map(wave.items.map((item) => [item.legacyId, item]));
  it('retains substantive high-risk corrections in the modular artifact', () => {
    expect(byId.get('memory-aid-e28ae2f31191f4cc').content).toContain('digestion is modulated rather than simply stopped');
    expect(byId.get('memory-aid-eb54d90f5b9ae27a').content).toContain('electrical synapses may be bidirectional');
    expect(byId.get('memory-aid-a4ff314c72d7cf75').content).toContain('not a contest');
    expect(byId.get('memory-aid-19505db8fce3750d').content).toContain('not "statistics always wins."');
  });
});