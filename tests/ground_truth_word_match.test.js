// The cleanup's ground-truth check (2026-11-09): sampled sentences of the source text must survive into the HTML, or the
// cleanup is reverted. A scan's source text is the vision reading in markdown ("# Title", "## Heading", "* bullet", "| cell |"),
// so the old verbatim match failed on any sentence that crossed a heading: the garden newsletter scan scored 1/5 on HTML that
// matched the page word for word, and the cleanup was thrown away. Runs the REAL check, sliced from the source.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { sliceBetween } from './helpers/anchored_slice.js';

const SRC = readFileSync(resolve(process.cwd(), 'doc_pipeline_source.jsx'), 'utf8');
const BODY = sliceBetween(SRC, '          const _gtWords = ', "          _pipeLog('Verify', 'Ground-truth: '", { file: 'doc_pipeline_source.jsx' });
const check = new Function('extractedText', 'accessibleHtml', BODY + '\nreturn { matched: _matchCount, checked: _totalChecked, rate: _matchRate };');

// The garden scan run (C:\tmp\keyless_1108s\garden, 2026-11-08): its vision reading and its accessible HTML.
const VISION = '# Maple Street School Garden\n\nNewsletter for families, spring term\n\n## What we planted\n\nStudents in grades three and four planted beans, lettuce, carrots and sunflowers in the raised beds behind the library. Each class keeps a watering chart and records how tall the seedlings grow every Friday.\n\n## How families can help\n\n* Bring clean yogurt cups for seed starting.\n* Sign up for one weekend watering visit.\n* Share garden tools you no longer need.\n\n## Harvest schedule\n\n| Crop | Ready in | Used for |\n| --- | --- | --- |\n| Lettuce | May | Cafeteria salad bar |\n| Beans | June | Take-home bags |\n| Carrots | June | Science tasting day |\n\nQuestions? Contact Ms. Okafor in room 112.\n\nPage 1';
const HTML = '<main><h1>Maple Street School Garden</h1> <p>Newsletter for families, spring term</p> <h2>What we planted</h2> <p>Students in grades three and four planted beans, lettuce, carrots and sunflowers in the raised beds behind the library. Each class keeps a watering chart and records how tall the seedlings grow every Friday.</p> <h2>How families can help</h2> <ul><li>Bring clean yogurt cups for seed starting.</li><li>Sign up for one weekend watering visit.</li><li>Share garden tools you no longer need.</li></ul> <h2>Harvest schedule</h2> <table><caption>When each garden crop will be ready and what it will be used for</caption><thead><tr><th>Crop</th><th>Ready in</th><th>Used for</th></tr></thead><tbody><tr><th>Lettuce</th><td>May</td><td>Cafeteria salad bar</td></tr><tr><th>Beans</th><td>June</td><td>Take-home bags</td></tr><tr><th>Carrots</th><td>June</td><td>Science tasting day</td></tr></tbody></table> <p>Questions? Contact Ms. Okafor in room 112.</p> <p>Page 1</p></main>';

describe('cleanup ground-truth check', () => {
  it('passes the garden scan: markdown headings and bullets in the vision text no longer count as missing words', () => {
    const r = check(VISION, HTML);
    expect(r.checked).toBe(5);
    expect(r.matched).toBe(4); // the one miss is the table sentence, which the added caption really does interrupt
    expect(r.rate).toBeGreaterThanOrEqual(0.5); // above the revert threshold
  });
  it('still fails when the sentences are really gone', () => {
    const r = check(VISION, '<main><h1>Maple Street School Garden</h1><p>Questions? Contact Ms. Okafor in room 112.</p></main>');
    expect(r.rate).toBeLessThan(0.5);
  });
  it('ignores entities, curly quotes and punctuation differences, and matches whole words only', () => {
    const src = 'The class\u2019s garden is open every Saturday & Sunday for families. Volunteers water the beds and record the growth each week.';
    expect(check(src, '<p>The class&#8217;s garden is open every Saturday &amp; Sunday for families.</p><p>Volunteers water the beds and record the growth each week.</p>').rate).toBe(1);
    // a sentence whose words only appear glued to other letters is not a match
    expect(check('Volunteers water the beds and record the growth each week.', '<p>Volunteers water the beds and record the growthy each weekend</p>').rate).toBe(0);
  });
});
