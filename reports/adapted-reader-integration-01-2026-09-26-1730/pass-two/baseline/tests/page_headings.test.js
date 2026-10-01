// One h1 per page, and the resource title under it.
//
// WHY (2026-09-24 audit): the header's "AlloFlow" h1 and a hidden "AlloFlow" h1
// in <main> were both on the page, and the resource's title was an h3 with no
// h2 above it, so screen-reader users navigating by headings met a broken
// outline on every resource.
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const hosts = { ANTI: readFileSync(process.env.ALLO_ANTI_CANDIDATE || 'AlloFlowANTI.txt', 'utf8'), 'App.jsx': readFileSync('desktop/web-app/src/App.jsx', 'utf8') };
const header = readFileSync('view_header_source.jsx', 'utf8');

it('the header holds the page h1', () => {
  expect(header).toMatch(/<h1 className=/);
});

describe.each(Object.entries(hosts))('%s', (_, source) => {
  it('adds its own h1 only when Focus view hides the header', () => {
    expect(source).toContain('{!isZenMode && <HeaderBar');
    expect(source).toContain('{isZenMode && <h1 className="sr-only">AlloFlow</h1>}');
    expect(source.split('<h1 className="sr-only">AlloFlow</h1>')).toHaveLength(2);
  });
  it('titles the resource with an h2', () => {
    expect(source).toContain('<h2 className={`text-lg font-bold text-slate-700 flex items-center gap-2 truncate');
    expect(source).not.toContain('<h3 className={`text-lg font-bold text-slate-700 flex items-center gap-2 truncate');
  });
});
