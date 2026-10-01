// "Surprise me" had grown a second feature inside it: a seed -> standard
// resolver that duplicated the one in Target Standard, and that duplication was
// what crowded the panel. These tests pin the split — a zero-input random draw
// in front, the resolver collapsed behind a disclosure — and pin the sampling
// rules the random draw depends on.
import { describe, expect, it, beforeAll } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');

describe('the random draw is a real primitive, not a re-search', () => {
  let provider;
  beforeAll(() => {
    const root = {};
    // eslint-disable-next-line no-new-func
    new Function('window', 'self', 'globalThis', read('standards_provider_module.js')).call(root, root, root, root);
    const api = root.AlloModules.StandardsProvider;
    for (const f of ['ccss-ela', 'ccss-math', 'ma-science-grade-5']) {
      api.registerLocalSnapshot(JSON.parse(read(path.join('standards_snapshots', `${f}.json`))));
    }
    provider = api.getRegisteredProvider();
  });

  it('exposes sampleStandards on the provider', () => {
    expect(typeof provider.sampleStandards).toBe('function');
  });

  it('draws from the teacher\'s own grade when the snapshot covers it', () => {
    const drawn = provider.sampleStandards({ gradeLevel: 'Grade 3', count: 5 });
    expect(drawn.gradeFiltered).toBe(true);
    expect(drawn.standards.length).toBe(5);
    for (const record of drawn.standards) expect(record.code).toMatch(/(^|\.)3(\.|$)/);
  });

  it('reads the grade out of whatever the selector hands over', () => {
    for (const label of ['Grade 3', '3rd grade', 'Kindergarten', 'K', 'Grade 11']) {
      expect(provider.sampleStandards({ gradeLevel: label }).gradeFiltered).toBe(true);
    }
  });

  it('lets a banded standard serve every grade it spans', () => {
    const drawn = provider.sampleStandards({ gradeLevel: 'Grade 11', count: 20 });
    expect(drawn.standards.some((r) => /11-12/.test(r.code))).toBe(true);
  });

  it('never mistakes a high-school sub-part index for a grade', () => {
    // HSA-SSE.B.3.c is algebra, not grade 3. The embedded number is a part
    // index, and only the HS prefix distinguishes them.
    const drawn = provider.sampleStandards({ gradeLevel: 'Grade 3', count: 20 });
    expect(drawn.standards.filter((r) => /^HS/i.test(r.code))).toEqual([]);
  });

  it('widens to the whole corpus rather than returning nothing', () => {
    const drawn = provider.sampleStandards({ gradeLevel: 'Grade 99' });
    expect(drawn.gradeFiltered).toBe(false);
    expect(drawn.standards.length).toBe(1);
  });

  it('actually varies — a draw that repeats is not a surprise', () => {
    const seen = new Set();
    for (let i = 0; i < 30; i += 1) seen.add(provider.sampleStandards({ gradeLevel: 'Grade 3' }).standards[0].code);
    expect(seen.size).toBeGreaterThan(10);
  });

  it('hands out copies, so a caller cannot edit the loaded snapshot', () => {
    const first = provider.sampleStandards({ gradeLevel: 'Grade 3' }).standards[0];
    const code = first.code;
    first.code = 'MUTATED';
    const again = provider.resolveStandard(code);
    expect(again.status).toBe('resolved');
    expect(again.match.code).toBe(code);
  });
});

describe('the panel leads with the surprise and hides the resolver', () => {
  const misc = read('view_misc_panels_module.js');

  it('offers a draw that needs no input at all', () => {
    expect(misc).toContain('onClick: rollTheDice');
    expect(misc).toContain('provider.sampleStandards');
  });

  it('keeps the seed box collapsed until asked for', () => {
    expect(misc).toContain('const [seedOpen, setSeedOpen] = React.useState(false);');
    expect(misc).toContain('seedOpen && /* @__PURE__ */ React.createElement("div", { className: "mt-1 flex gap-1" }');
  });

  it('marks the disclosure for assistive technology', () => {
    expect(misc).toContain('"aria-expanded": seedOpen');
  });

  it('is mirrored to the desktop copy, which is a separate file on disk', () => {
    expect(read('desktop/web-app/public/view_misc_panels_module.js')).toBe(misc);
    expect(read('desktop/web-app/public/standards_provider_module.js')).toBe(read('standards_provider_module.js'));
  });
});
