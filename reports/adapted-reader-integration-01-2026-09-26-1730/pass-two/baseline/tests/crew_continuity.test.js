// Crew Launch packs · a week that remembers an earlier week remembers it correctly.
//
// The twelve packs are one trimester, and later weeks call back to earlier ones: week 10 reopens
// week 4's system and Marcus's story, week 11 reuses week 5's ask, week 12 recaps all eleven weeks.
// Found 2026-09-23: week 12 said "Twelve weeks ago your Crew wrote norms" (week 1 is eleven weeks
// earlier); week 10 said Marcus kept his assignments "in his phone notes" (week 4: "the notes app
// on his laptop") and sent students back to "your September HOWL Tracker goal", which no pack ever
// asked them to set. Each callback below is checked against the week it names, read from that
// week's own pack, so editing either side of a callback breaks the test.
// Also found 2026-09-23: week 10 was "The Halfway Check" ("You are halfway through the trimester")
// although week 12 closes that same trimester, and it said the week-4 system "broke in week two".
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';

const DIR = process.env.CREW_PACK_DIR ? resolve(process.env.CREW_PACK_DIR) : resolve(process.cwd(), 'allopacks');
const GUIDE = process.env.CREW_GUIDE_PATH ? resolve(process.env.CREW_GUIDE_PATH) : resolve(process.cwd(), 'docs/CREW_LAUNCH_TEACHER_GUIDE.md');
const PACKS = readdirSync(DIR).filter((f) => /^crew_.*\.allopack\.json$/.test(f))
  .map((f) => JSON.parse(readFileSync(resolve(DIR, f), 'utf8')))
  .map((p) => ({ week: Number(p.allopack.title.match(/Week (\d+)/)[1]), p }))
  .sort((a, b) => a.week - b.week);
const byWeek = (n) => (PACKS.find((x) => x.week === n) || {}).p;
const res = (p, type) => p.history.find((r) => r.type === type);
// Every string in the pack, joined by newlines. NOT JSON.stringify: there a paragraph break is the
// two characters "\n", so a word at the start of a paragraph follows a letter "n" and a \b before it
// never matches. That blind spot hid "Twelve weeks ago" at the start of week 12's first paragraph
// from this very check until its self-test caught it.
const allText = (p) => {
  const out = [];
  (function walk(v) { if (typeof v === 'string') out.push(v); else if (v && typeof v === 'object') Object.values(v).forEach(walk); })(p);
  return out.join('\n');
};
const NUMBER = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12 };

// Every "<N> weeks ago" and "week <N>" (digits or a word) in a pack's student-facing text, with the
// week it points at.
export function weekReferences(week, p) {
  const text = allText(p);
  const refs = [];
  for (const m of text.matchAll(/\b(one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve) weeks? ago\b/gi)) refs.push({ phrase: m[0], target: week - NUMBER[m[1].toLowerCase()] });
  for (const m of text.matchAll(/\b[Ww]eek[- ](\d{1,2})\b/g)) refs.push({ phrase: m[0], target: Number(m[1]) });
  for (const m of text.matchAll(/\b[Ww]eek[- ](one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve)\b/gi)) refs.push({ phrase: m[0], target: NUMBER[m[1].toLowerCase()] });
  return refs;
}

export function referenceProblems(week, p) {
  return weekReferences(week, p)
    .filter((r) => !(r.target >= 1 && r.target <= week))
    .map((r) => 'week ' + week + ': "' + r.phrase + '" points at week ' + r.target);
}

// The twelve weeks are one trimester (week 12: "the gap is where next trimester starts"), so only
// weeks 5 to 7 can call themselves its middle. Ids like crew_halfway_* are file names, not claims.
const MIDDLE = /\bhalfway\b|\bmid-trimester\b|\bmiddle of (a|the) trimester\b/i;
export function midpointProblems(week, text) {
  if (week >= 5 && week <= 7) return [];
  const m = text.replace(/crew_halfway\w*|crew_launch_halfway\w*/g, '').match(MIDDLE);
  return m ? ['week ' + week + ' calls itself the middle of the trimester: "' + m[0] + '"'] : [];
}

// A pack that reopens the week-4 system cannot have that system break before week 4.
export function systemBreakProblems(week, p) {
  const text = allText(p);
  if (week <= 4 || !/\bweek[- ](4|four)\b/i.test(text)) return [];
  const out = [];
  for (const sentence of text.split(/(?<=[.!?])\s+|\n+/)) {
    if (!/\b(broke|breaks|broken|stopped|died|fell apart)\b/i.test(sentence)) continue;
    for (const r of weekReferences(week, { s: sentence })) {
      if (r.target < 4) out.push('week ' + week + ': "' + sentence.trim().slice(0, 100) + '" has the week-4 system break in week ' + r.target);
    }
  }
  return out;
}

// The guide's glance-table rows ("| 10 | Title |") and its "## Week N:" pages, keyed by week.
export function guideWeeks(md) {
  const rows = [...md.matchAll(/^\| (\d{1,2}) \| ([^|\n]+)\|.*$/gm)].map((m) => ({ week: Number(m[1]), text: m[0] }));
  const pages = md.split(/^(?=## Week \d{1,2}: )/m).filter((s) => /^## Week \d/.test(s))
    .map((s) => ({ week: Number(s.match(/^## Week (\d{1,2})/)[1]), text: s.split(/^## (?!Week)/m)[0] }));
  return rows.concat(pages);
}

// Week 12's recap, in the order the trimester ran; each phrase is checked against its week's title.
const RECAP = [
  ['repaired something', 2, /Repair/],
  ['named your zone', 3, /Where Am I Right Now/],
  ['built a system', 4, /System/],
  ['made an ask', 5, /Asking/],
  ['rated your own work', 6, /Feedback/],
  ['asked a question before deciding', 7, /Two Sides/],
  ['made a small move', 8, /Small Moves/],
  ['set a boundary', 9, /Attention/],
  ['checked your system after six weeks', 10, /Six-Week Check/],
  ['named your part of a whole', 11, /Part of the Whole/],
];
export function recapProblems(p12, weekTitle) {
  const reading = res(p12, 'simplified').data;
  const out = [];
  let last = -1;
  for (const [phrase, week, titleRe] of RECAP) {
    const at = reading.indexOf(phrase);
    if (at < 0) { out.push('week 12 recap is missing "' + phrase + '"'); continue; }
    if (at < last) out.push('week 12 recap lists "' + phrase + '" out of order');
    last = at;
    if (!titleRe.test(weekTitle(week))) out.push('"' + phrase + '" is not what week ' + week + ' ("' + weekTitle(week) + '") taught');
  }
  if (!/In week 1, your \*\*Crew\*\* wrote norms/.test(reading) || !/Norms/.test(weekTitle(1))) out.push('week 12 no longer starts the recap at week 1\'s norms');
  return out;
}

describe('Crew continuity: every week reference points at a week that exists and has happened', () => {
  it.each(PACKS.map((x) => [x.week, x.p]))('week %i', (week, p) => {
    expect(referenceProblems(week, p)).toEqual([]);
  });
});

describe('Crew continuity: only the middle weeks call themselves the middle of the trimester', () => {
  it.each(PACKS.map((x) => [x.week, x.p]))('pack, week %i', (week, p) => {
    expect(midpointProblems(week, allText(p))).toEqual([]);
  });
  it('guide: every glance-table row and week page', () => {
    const weeks = guideWeeks(readFileSync(GUIDE, 'utf8'));
    expect(weeks.length).toBeGreaterThanOrEqual(24);
    expect(weeks.flatMap((w) => midpointProblems(w.week, w.text))).toEqual([]);
  });
  it.each(PACKS.map((x) => [x.week, x.p]))('the week-4 system never breaks before week 4, week %i', (week, p) => {
    expect(systemBreakProblems(week, p)).toEqual([]);
  });
});

describe('Crew continuity: the callbacks tell the earlier week\'s story the way that week told it', () => {
  it('week 12 recaps weeks 2 to 11 in order, starting from week 1\'s norms', () => {
    expect(recapProblems(byWeek(12), (n) => byWeek(n).allopack.title)).toEqual([]);
  });
  it('week 10 remembers week 4\'s Marcus: the notes app on his laptop, a launch check at the end of the day, then moved home', () => {
    const w4 = res(byWeek(4), 'simplified').data, w10 = res(byWeek(10), 'simplified').data;
    expect(w4).toMatch(/Marcus picks the notes app on his laptop/);
    expect(w4).toMatch(/launch check: last two minutes of the day/);
    expect(w10).toMatch(/Marcus built a good system: assignments captured in the notes app on his laptop, a launch check at the end of the school day/);
    expect(w10).toMatch(/moved the launch check home, to 8 pm/);
    expect(allText(byWeek(10))).not.toMatch(/phone notes/);
  });
  it('week 10 reopens the goal week 4 actually set (Goal Setter), not a HOWL Tracker goal nobody set', () => {
    const w4dir = res(byWeek(4), 'directions').data.body;
    expect(w4dir).toMatch(/\[Goal Setter\]\(#sel-hub\/goals\?station=[a-z_]+\) and set one goal/);
    for (const x of PACKS.filter((y) => y.week < 10)) expect(allText(x.p), 'week ' + x.week + ' sets a HOWL Tracker goal; week 10 could name it').not.toMatch(/HOWL Tracker[^.]{0,60}\b(set|write) (a |one )?goal/i);
    const w10 = allText(byWeek(10));
    expect(w10).not.toMatch(/HOWL Tracker goal/);
    expect(res(byWeek(10), 'directions').data.body).toMatch(/Open the goal you set in week 4/);
  });
  it('week 11\'s Lena uses week 5\'s ask, and week 5 is the week on asking', () => {
    expect(res(byWeek(11), 'simplified').data).toMatch(/what she learned in week 5 and asks/);
    expect(byWeek(5).allopack.title).toMatch(/Asking for What You Need/);
  });
});

describe('the continuity checks can fail', () => {
  it('"Twelve weeks ago" in week 12 points at week 0', () => {
    const p = JSON.parse(JSON.stringify(byWeek(12)));
    const r = res(p, 'simplified');
    r.data = r.data.replace('In week 1, your **Crew** wrote norms.', 'Twelve weeks ago your **Crew** wrote norms.');
    expect(referenceProblems(12, p).join(' ')).toMatch(/week 0/);
    expect(recapProblems(p, (n) => byWeek(n).allopack.title).join(' ')).toMatch(/week 1's norms/);
  });
  it('a pack pointing at a future week is caught', () => {
    const p = JSON.parse(JSON.stringify(byWeek(3)));
    res(p, 'simplified').data += ' You will build a system in week 4.';
    expect(referenceProblems(3, p).join(' ')).toMatch(/week 4/);
  });
  it('a recap out of order is caught', () => {
    const p = JSON.parse(JSON.stringify(byWeek(12)));
    const r = res(p, 'simplified');
    r.data = r.data.replace('built a system, made an ask', 'made an ask, built a system');
    expect(recapProblems(p, (n) => byWeek(n).allopack.title).join(' ')).toMatch(/out of order/);
  });
  it('week 10 calling itself halfway is caught; week 6 may', () => {
    const p = JSON.parse(JSON.stringify(byWeek(10)));
    res(p, 'simplified').data = 'You are **halfway** through the trimester. ' + res(p, 'simplified').data;
    expect(midpointProblems(10, allText(p)).join(' ')).toMatch(/week 10 calls itself the middle/);
    expect(midpointProblems(10, 'a mid-trimester review')).toHaveLength(1);
    expect(midpointProblems(6, 'You are halfway through the trimester.')).toEqual([]);
    expect(midpointProblems(10, 'sel_station_crew_launch_halfway and crew_halfway_time')).toEqual([]);
  });
  it('a guide row or page calling week 10 halfway is caught', () => {
    const md = '| 10 | The Halfway Check | Responsibility |\n\n## Week 10: The Six-Week Check\n\nRead. Why halfway matters.\n\n## Week 11: Next\n';
    const found = guideWeeks(md).flatMap((w) => midpointProblems(w.week, w.text));
    expect(found).toHaveLength(2);
  });
  it('the week-4 system breaking "in week two" is caught, in words or digits', () => {
    const p = JSON.parse(JSON.stringify(byWeek(10)));
    res(p, 'simplified').data += ' Some of it broke in week two and you have been getting by.';
    expect(systemBreakProblems(10, p).join(' ')).toMatch(/break in week 2/);
    const q = JSON.parse(JSON.stringify(byWeek(10)));
    res(q, 'simplified').data += ' The launch check stopped in week 3.';
    expect(systemBreakProblems(10, q).join(' ')).toMatch(/break in week 3/);
  });
  it('a future week written as a word is caught', () => {
    const p = JSON.parse(JSON.stringify(byWeek(3)));
    res(p, 'simplified').data += ' In week five you will learn to ask.';
    expect(referenceProblems(3, p).join(' ')).toMatch(/week 5/);
  });
});
