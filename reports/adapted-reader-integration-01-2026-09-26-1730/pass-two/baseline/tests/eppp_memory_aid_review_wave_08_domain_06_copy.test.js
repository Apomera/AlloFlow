import fs from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('EPPP memory-aid Wave 08 Domain 6 copy regressions', () => {
  const module = JSON.parse(fs.readFileSync(
    resolve(process.cwd(), 'dev-tools/eppp_memory_aid_wave08/domain_06.json'),
    'utf8',
  ));
  const serialized = JSON.stringify(module);

  it('preserves required possessives in learner and provenance copy', () => {
    expect(serialized).not.toMatch(/Rogerss|an individuals symptoms|the clients perception|the familys goals/);
    expect(serialized).toContain("Rogers' primary peer-reviewed article");
    expect(serialized).toContain("Rogers' six-condition theory");
    expect(serialized).toContain("an individual's symptoms");
    expect(serialized).toContain("the client's perception");
    expect(serialized).toContain("the family's goals");
  });
});
