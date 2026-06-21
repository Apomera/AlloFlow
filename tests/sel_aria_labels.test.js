// SEL aria-label corruption guard (fresh-scan sweep).
//
// A systemic corruption had pasted property keys ('aria-selected'), code
// fragments ('},'), CSS classes, prompt fragments, and bare icon emojis where a
// button's accessible NAME belongs — so screen readers announced garbage instead
// of each control's purpose. The sweep removed/relabeled them. This guards the
// unambiguous patterns against regression across every SEL tool.

import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const dir = path.join(process.cwd(), 'sel_hub');
const files = fs.readdirSync(dir).filter((f) => /^sel_tool_.*\.js$/.test(f));

function scan(re) {
  const hits = [];
  for (const f of files) {
    const src = fs.readFileSync(path.join(dir, f), 'utf8');
    const lines = src.split('\n');
    lines.forEach((ln, i) => { if (re.test(ln)) hits.push(`${f}:${i + 1}  ${ln.trim().slice(0, 80)}`); });
  }
  return hits;
}

describe('SEL aria-label corruption guard', () => {
  it('no aria-label is the literal property key "aria-selected"', () => {
    expect(scan(/'aria-label':\s*'aria-selected'/)).toEqual([]);
  });

  it('no aria-label is the code fragment "},"', () => {
    expect(scan(/'aria-label':\s*'\},'/)).toEqual([]);
  });

  it('no button is aria-labeled with only its icon emoji (e.g. f.emoji / card.icon)', () => {
    // the bug form was `'aria-label': X.emoji,` / `X.icon,` (bare). The correct
    // form `X.emoji + ' ' + X.name` is allowed (it has more than the emoji).
    expect(scan(/'aria-label':\s*[A-Za-z_][\w.]*\.(emoji|icon)\s*,/)).toEqual([]);
  });

  it('no aria-label is a Tailwind-class string (e.g. "text-slate-600 hover:...")', () => {
    expect(scan(/'aria-label':\s*'[^']*(?:[a-z]+-[0-9]|hover:|focus:|space-y-)/)).toEqual([]);
  });

  it('no aria-label is a bare camelCase state key (e.g. "comparisonScenariosRated")', () => {
    expect(scan(/'aria-label':\s*'[a-z]+[A-Z][a-zA-Z]*'/)).toEqual([]);
  });
});
