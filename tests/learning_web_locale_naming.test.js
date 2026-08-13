import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

describe('Learning Web locale naming', () => {
  it('uses the Unit Path product name consistently in every locale pack', () => {
    const directory = resolve(process.cwd(), 'lang');
    const files = readdirSync(directory).filter((name) => name.endsWith('.js'));
    expect(files.length).toBeGreaterThan(50);
    for (const name of files) {
      const source = readFileSync(resolve(directory, name), 'utf8');
      if (source.includes('"throughline_title"')) {
        expect(source, name).toContain('"throughline_title": "Learning Web: Unit Path"');
        expect(source, name).not.toContain('"throughline_title": "Throughline"');
      }
      if (source.includes('"open_mind_map"')) {
        expect(source, name).toContain('"open_mind_map": "Open Learning Web: Unit Path"');
        expect(source, name).toContain('"open_mind_map_done": "Learning Web: Unit Path opened."');
        expect(source, name).not.toContain('"open_mind_map": "Open Throughline"');
      }
    }
  }, 30000);
});
