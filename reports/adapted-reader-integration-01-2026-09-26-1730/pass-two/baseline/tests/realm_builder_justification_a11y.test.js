import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const sourcePath = path.join(process.cwd(), 'arcade_mode_realm_builder.js');

describe('Realm Builder zone justification accessibility', () => {
  it('gives the zone placement justification textarea a programmatic accessible name', () => {
    const source = fs.readFileSync(sourcePath, 'utf8');
    expect(source).toContain("id: 'rb-just'");
    expect(source).toContain("'aria-label': 'Zone placement justification'");
  });
});
