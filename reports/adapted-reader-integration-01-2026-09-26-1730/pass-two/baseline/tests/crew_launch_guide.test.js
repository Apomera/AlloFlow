// Crew Launch teacher guide · every week's page matches the pack a teacher will actually load.
//
// docs/CREW_LAUNCH_TEACHER_GUIDE.md is a run sheet for twelve 40-minute Crew slots at King
// Middle School, one page per allopacks/crew_*_grade6_8 pack. A page that names a resource the
// pack does not have, or a Hub tool the pack does not link, sends a teacher hunting mid-lesson.
// Until 2026-09-22 only weeks 1 to 6 existed; weeks 7 to 12 were "the next writing task".
//
// Checks, derived from the packs (never a hand list):
//   - twelve "## Week N: <title>" pages in order, each title the pack's own;
//   - each page has the same parts: the 40-minute table (six rows, 0 to 40), In the Hub, The
//     commitment, What counts as evidence, Watch for, If you only have 15 minutes;
//   - each page names the pack's chart, sort, memory aid and challenge by their titles, every Hub
//     tool the pack links, and marks the tool whose time the station counts "(station starts)";
//   - the at-a-glance table lists the same title and tools;
//   - the resource count the guide promises is the packs' count;
//   - no em or en dashes (ORIENTATION.md), and no unfinished placeholders.
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = process.cwd();
const GUIDE_PATH = process.env.CREW_GUIDE_PATH ? resolve(process.env.CREW_GUIDE_PATH) : resolve(ROOT, 'docs', 'CREW_LAUNCH_TEACHER_GUIDE.md');
const guide = readFileSync(GUIDE_PATH, 'utf8');

const packs = readdirSync(resolve(ROOT, 'allopacks'))
  .filter((f) => /^crew_.*\.allopack\.json$/.test(f))
  .map((f) => JSON.parse(readFileSync(resolve(ROOT, 'allopacks', f), 'utf8')))
  .map((p) => {
    const m = p.allopack.title.match(/^Crew Launch Week (\d+): (.+)$/);
    const of = (t) => p.history.find((r) => r.type === t);
    const directions = of('directions').data.body;
    const links = [...directions.matchAll(/\[([^\]]+)\]\(#sel-hub\/([A-Za-z]+)\?station=/g)].map((x) => ({ text: x[1], id: x[2] }));
    const timeTool = p.selStations[0].quests.find((q) => q.type === 'timeSpent').toolId;
    return {
      week: Number(m[1]), title: m[2], pack: p, links,
      stationTool: (links.find((l) => l.id === timeTool) || {}).text,
      titles: ['anchor-chart', 'concept-sort', 'memory-aid', 'applied-challenge'].map((t) => of(t).title),
    };
  })
  .sort((a, b) => a.week - b.week);

// The page for week n: from its heading to the next "## " heading.
export function pageFor(text, n) {
  const start = text.search(new RegExp('^## Week ' + n + ': ', 'm'));
  if (start < 0) return null;
  const rest = text.slice(start + 3);
  const end = rest.search(/^## /m);
  return text.slice(start, end < 0 ? undefined : start + 3 + end);
}

const PARTS = ['**The 40 minutes**', '**In the Hub.**', '**The commitment.**', '**What counts as evidence.**', '**Watch for.**', '**If you only have 15 minutes.**'];
const ROWS = ['0 to 10', '10 to 17', '17 to 25', '25 to 33', '33 to 38', '38 to 40'];

export function pageProblems(page, spec) {
  const problems = [];
  if (!page) return ['no page'];
  const heading = page.split('\n')[0];
  if (heading !== '## Week ' + spec.week + ': ' + spec.title) problems.push('heading "' + heading + '" is not the pack title "' + spec.title + '"');
  for (const part of PARTS) if (!page.includes(part)) problems.push('missing ' + part);
  const rows = page.split('\n').filter((l) => /^\| \d+ to \d+ \|/.test(l)).map((l) => l.split('|')[1].trim());
  if (JSON.stringify(rows) !== JSON.stringify(ROWS)) problems.push('40-minute rows are ' + JSON.stringify(rows));
  for (const t of spec.titles) if (!page.includes(t)) problems.push('does not name the pack resource "' + t + '"');
  for (const l of spec.links) if (!page.includes(l.text)) problems.push('does not name the linked Hub tool "' + l.text + '"');
  if (!page.includes(spec.stationTool + ' (station starts)')) problems.push('does not mark "' + spec.stationTool + ' (station starts)"');
  for (const part of PARTS.slice(1)) {
    const i = page.indexOf(part);
    if (i >= 0 && page.slice(i + part.length).trim().length < 40) problems.push(part + ' is empty');
  }
  return problems;
}

describe('Crew Launch teacher guide', () => {
  it('reads twelve packs, weeks 1 to 12', () => {
    expect(packs.map((p) => p.week)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
  });

  it.each(packs.map((p) => [p.week, p]))('week %i has a complete page that matches its pack', (_n, spec) => {
    expect(pageProblems(pageFor(guide, spec.week), spec)).toEqual([]);
  });

  it('pages are in week order', () => {
    const order = [...guide.matchAll(/^## Week (\d+): /gm)].map((m) => Number(m[1]));
    expect(order).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
  });

  it('the at-a-glance table lists every week with its title and linked tools', () => {
    for (const spec of packs) {
      const row = guide.split('\n').find((l) => l.startsWith('| ' + spec.week + ' | '));
      expect(row, 'no glance row for week ' + spec.week).toBeTruthy();
      expect(row).toContain('| ' + spec.title + ' |');
      for (const l of spec.links) expect(row, 'week ' + spec.week + ' row').toContain(l.text);
    }
  });

  it('promises the resource count the packs actually load', () => {
    const counts = new Set(packs.map((p) => p.pack.history.length));
    expect(counts.size).toBe(1);
    const n = [...counts][0];
    const words = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve'];
    const m = guide.match(/Loading a pack puts\s+(\w+)\s+resources/);
    expect(m, 'the "Loading a pack puts N resources" sentence').toBeTruthy();
    expect(m[1]).toBe(words[n]);
  });

  it('has no em or en dashes and no unfinished placeholders', () => {
    const dashes = new RegExp('.{0,30}[' + String.fromCharCode(0x2013, 0x2014) + '].{0,30}', 'g');
    expect([...guide.matchAll(dashes)].map((m) => m[0])).toEqual([]);
    expect(guide).not.toMatch(/\bVERIFY\b|\bTODO\b|next writing task/);
  });
});

describe('the page check can fail', () => {
  const spec = packs.find((p) => p.week === 7);
  const page = pageFor(guide, 7) || '';
  it('flags a missing part', () => {
    expect(pageProblems(page.replace('**Watch for.**', '**Look out.**'), spec).join(' ')).toMatch(/Watch for/);
  });
  it('flags a Hub tool the page does not name', () => {
    expect(pageProblems(page.split(spec.links[1].text).join('the other tool'), spec).join(' ')).toMatch(/linked Hub tool/);
  });
  it('flags a resource title that drifted from the pack', () => {
    expect(pageProblems(page.split(spec.titles[3]).join('The Challenge'), spec).join(' ')).toMatch(/pack resource/);
  });
});
