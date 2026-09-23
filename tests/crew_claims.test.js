// Crew Launch packs · what a pack claims agrees with its evidence, its sources and its answer key.
//
// The 2026-09-23 content review fixed things no structural gate could see: research claims stated
// more strongly than the evidence (a silent phone "still costs", "most" conflicts, the second move
// "always" easier), a quiz item with three defensible answers, a sort whose cards fit two bins, a
// reading that renamed a tool's step without saying so, and a student-led conference described the
// way King does not run it. Each is pinned to what it was changed FROM, across every string in the
// pack (a hedge in the reading with the old claim left in the chart is still the old claim), and the
// shot lists are held to the same claims because their labels and captions ship as text.
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';

const DIR = process.env.CREW_PACK_DIR ? resolve(process.env.CREW_PACK_DIR) : resolve(process.cwd(), 'allopacks');
const GUIDE = process.env.CREW_GUIDE_PATH ? resolve(process.env.CREW_GUIDE_PATH) : resolve(process.cwd(), 'docs/CREW_LAUNCH_TEACHER_GUIDE.md');
const DEARMAN = process.env.CREW_DEARMAN_PATH ? resolve(process.env.CREW_DEARMAN_PATH) : resolve(process.cwd(), 'sel_hub/sel_tool_dearman.js');
const SLUGS = readdirSync(DIR).filter((f) => /^crew_.*\.allopack\.json$/.test(f)).map((f) => f.replace(/^crew_|_grade6_8\.allopack\.json$/g, ''));
const load = (slug) => JSON.parse(readFileSync(resolve(DIR, 'crew_' + slug + '_grade6_8.allopack.json'), 'utf8'));
const shots = (slug) => readFileSync(resolve(DIR, 'crew_' + slug + '_grade6_8.IMAGES.md'), 'utf8');
const res = (p, type) => p.history.find((r) => r.type === type);
const allText = (p) => {
  const out = [];
  (function walk(v) { if (typeof v === 'string') out.push(v); else if (v && typeof v === 'object') Object.values(v).forEach(walk); })(p);
  return out.join('\n');
};

// Claims whose evidence is mixed. `was` is the wording that was removed; it may not come back
// anywhere in the pack or its shot list. `now` is the hedged wording the reading carries.
export const HEDGED = [
  {
    slug: 'attention', week: 9,
    was: /(face down|silent)[^.\n]{0,40}still costs/i,
    now: /Some studies suggest that even a silent phone on the desk takes a little attention/,
    why: 'an unanswered notification measurably disrupts attention (Stothart et al., 2015); the cost of a phone that is merely present (Ward et al., 2017) has not replicated consistently',
  },
  {
    slug: 'perspective', week: 7,
    was: /\bmost (\*\*)?Crew(\*\*)? conflicts\b|\bmost conflicts\b|\bcauses most\b|\bwe usually (attribute|explain)\b/i,
    now: /we often attribute[\s\S]{0,160}That gap is where many \*\*Crew\*\* conflicts start\./,
    why: 'the actor-observer asymmetry is far weaker than its textbook form (Malle, 2006, meta-analysis), and no study counts where Crew conflicts start',
  },
  {
    slug: 'upstander', week: 8,
    was: /second move is always easier/i,
    now: /The second move is usually easier than the first/,
    why: 'seeing one person help makes others more likely to help; that is a tendency, not a law',
  },
];

// An absolute in a shot-list label or caption must be one the pack itself makes: some sentence in
// the pack uses the same absolute and shares at least three of the caption's content words.
const ABSOLUTE = /\b(always|never|every time)\b/gi;
const STOP = new Set(['that', 'this', 'with', 'from', 'than', 'they', 'them', 'their', 'there', 'what', 'when', 'where', 'which', 'your', 'have', 'been', 'into', 'more', 'does', 'will']);
const content = (s) => new Set((s.toLowerCase().match(/[a-z']{4,}/g) || []).filter((w) => !STOP.has(w)));
export function captionProblems(md, packText) {
  const sentences = packText.split(/(?<=[.!?])\s+|\n+/);
  const out = [];
  for (const m of md.matchAll(/(Labels|Caption): ([^\n]*?)(?:\.(?:\s|$)|$)/gm)) {
    const cap = m[2];
    for (const a of cap.matchAll(ABSOLUTE)) {
      if (/\bnot\s+$/i.test(cap.slice(0, a.index))) continue;
      const word = a[1].toLowerCase();
      const words = content(cap);
      const backed = sentences.some((s) => new RegExp('\\b' + word + '\\b', 'i').test(s) && [...content(s)].filter((w) => words.has(w)).length >= 3);
      if (!backed) out.push(m[1] + ' "' + cap + '" says "' + word + '" and no sentence in the pack does');
    }
  }
  return out;
}

describe('Crew claims: hedged where the evidence is mixed', () => {
  it.each(HEDGED.map((c) => [c.week, c]))('week %i', (week, c) => {
    const p = load(c.slug);
    expect(allText(p), c.why).not.toMatch(c.was);
    expect(shots(c.slug), 'shot list: ' + c.why).not.toMatch(c.was);
    expect(res(p, 'simplified').data).toMatch(c.now);
  });
});

describe('Crew claims: a shot list caption claims no more than its pack', () => {
  it.each(SLUGS)('%s', (slug) => {
    expect(captionProblems(shots(slug), allText(load(slug)))).toEqual([]);
  });
});

describe('Crew claims: one defensible answer', () => {
  it('week 2, question 4: Jonah names what happened and owns his part, so only the fix is missing', () => {
    const p = load('repair');
    const reading = res(p, 'simplified').data;
    const q = res(p, 'quiz').data.questions[3];
    expect(reading).toMatch(/Name it: say plainly what happened/);
    expect(reading).toMatch(/Own it: say what part was yours/);
    expect(reading).toMatch(/Fix it: do something that helps/);
    expect(q.options.filter((o) => /^(Naming|Owning|Fixing) it,/.test(o))).toHaveLength(3);
    expect(q.question, 'the stem must NAME what happened, or "Naming it" is also right').toMatch(/fell off the desk/);
    expect(q.question, 'the stem must OWN a part, or "Owning it" is also right').toMatch(/my fault/);
    expect(q.question).toMatch(/sorry/i);
    expect(q.correctAnswer).toMatch(/^Fixing it,/);
  });
  it('week 1 sort: a rule card names the adult who set it; a too-vague card is one the Crew chose', () => {
    const s = res(load('norms'), 'concept-sort').data;
    expect(s.categories.map((c) => c.id)).toEqual(['cn-rule', 'cn-norm', 'cn-vague']);
    expect(s.categories[0].label).toMatch(/given by an adult/);
    const ADULT = /^(School handbook|From the office|From the principal|(Mr|Ms|Mrs|Dr)\. [A-Z][a-z]+ says):/;
    for (const item of s.items) {
      if (item.categoryId === 'cn-rule') expect(item.content, 'a rule that does not say who set it could be a norm').toMatch(ADULT);
      else expect(item.content, 'only a rule comes from an adult').not.toMatch(ADULT);
      if (item.categoryId === 'cn-vague') expect(item.content, 'a vague card that the Crew did not choose could be a rule').toMatch(/^Our Crew agreed: /);
    }
  });
});

// A sort card or a model example has to fit the pack's OWN definition of the word it illustrates.
describe('Crew claims: examples fit the glossary that defines them', () => {
  // Found 2026-09-23: the glossary says an open question "cannot be answered with yes or no", while
  // the model one ("Hey, everything okay this morning?", in four places) and the sort's OPEN QUESTION
  // card ("Hey, did you see the photo I posted?") were yes/no questions.
  it('week 7: every example offered as an open question is one', () => {
    const p = load('perspective');
    expect(res(p, 'glossary').data.find((x) => x.term === 'Open question').def).toMatch(/cannot be answered with yes or no/);
    const sort = res(p, 'concept-sort').data;
    const bin = sort.categories.find((c) => /OPEN QUESTION/.test(c.label)).id;
    const text = allText(p);
    const examples = sort.items.filter((i) => i.categoryId === bin).map((i) => i.content)
      .concat([(res(p, 'simplified').data.match(/ask one \*\*open question\*\*\. "([^"]+)"/) || [])[1]])
      .concat([...text.matchAll(/open question about the moment \("([^"]+)"\)/g)].map((m) => m[1]))
      .concat([...text.matchAll(/a question such as "([^"]+)"/g)].map((m) => m[1]));
    expect(examples.filter((e) => e === undefined)).toEqual([]);
    expect(examples.length).toBeGreaterThanOrEqual(6);
    expect(examples.filter((e) => !/\b(what|why|how|when|where|who|which)\b/i.test(e)), 'a yes/no question offered as an open one').toEqual([]);
    expect(readFileSync(GUIDE, 'utf8')).not.toMatch(/everything okay this morning/);
  });
  // Glossary: ask early is "to request what your part depends on". The sources-page card requested nothing.
  it('week 11: every ASK EARLY card requests something', () => {
    const p = load('teamwork');
    expect(res(p, 'glossary').data.find((x) => x.term === 'Ask early').def).toMatch(/request what your part depends on/);
    const sort = res(p, 'concept-sort').data;
    const bin = sort.categories.find((c) => /^ASK EARLY/.test(c.label)).id;
    const cards = sort.items.filter((i) => i.categoryId === bin).map((i) => i.content);
    expect(cards.length).toBeGreaterThanOrEqual(3);
    for (const c of cards) expect(c, 'an ASK EARLY card that requests nothing').toMatch(/\b(Could|Can|Would) you (send|share|give|get)\b/);
  });
  // Glossary: capture is "writing something down the moment you hear it, in one place", a system
  // part; "Writing the due date on your hand." was filed under WILLPOWER.
  it('week 4: a WILLPOWER card that writes things down does not do it in one place', () => {
    const p = load('system');
    expect(res(p, 'glossary').data.find((x) => x.term === 'Capture').def).toMatch(/in one place/);
    const sort = res(p, 'concept-sort').data;
    const bin = sort.categories.find((c) => /^WILLPOWER/.test(c.label)).id;
    const writing = sort.items.filter((i) => i.categoryId === bin && /\b(writ|note)/i.test(i.content)).map((i) => i.content);
    for (const c of writing) expect(c, 'a one-place capture is a system part').toMatch(/\bone day\b[^.]*\bthe next\b/);
  });
});

describe('Crew claims: what a pack says about a tool or the school matches the tool and the school', () => {
  it('week 5: the reading says DEAR MAN calls its third move Assert, and the tool does', () => {
    expect(readFileSync(DEARMAN, 'utf8')).toMatch(/letter: 'A', label: 'Assert'/);
    expect(res(load('ask'), 'simplified').data).toMatch(/Ask \(DEAR MAN calls this move Assert\): say exactly what you want/);
    expect(readFileSync(GUIDE, 'utf8')).toMatch(/The tool calls the third move Assert; the reading calls\s+it Ask/);
  });
  // King's student and family handbook (grading guide) and "Learning models" page, checked 2026-09-23:
  // conferences in the fall and the spring, led by the student with a portfolio, with the Crew
  // teacher; HOWLs graded on each trimester report card.
  it('week 12: the student-led conference is described the way King runs it', () => {
    const p = load('story');
    const reading = res(p, 'simplified').data;
    expect(reading).toMatch(/\*\*student-led conference\*\* in the fall and in the spring: you, a family member, and your Crew teacher, with a portfolio of your work, and you do the talking\./);
    expect(reading).toMatch(/Your \*\*HOWL\*\* grades are on each \*\*trimester\*\* report card\./);
    const def = res(p, 'glossary').data.find((x) => x.term === 'Student-led conference').def;
    expect(def).toMatch(/in the fall or spring/);
    expect(def).toMatch(/your Crew teacher/);
    expect(allText(p)).not.toMatch(/the end of a \*\*trimester\*\* is when you tell the story/);
  });
});

// Found 2026-09-23: the key was the uniquely longest option in 36 of 60 Crew MCQs, so "pick the
// longest" scored 60% without reading (chance is 25%). A key may not stand out by its length.
export function lengthRows(questions) {
  return questions.filter((q) => Array.isArray(q.options)).map((q) => {
    const k = q.options.indexOf(q.correctAnswer);
    return { q: q.question, key: q.correctAnswer.length, maxOther: Math.max(...q.options.filter((_, j) => j !== k).map((o) => o.length)) };
  });
}
// An option written as a quotation must be one: the words inside the quotes appear in the reading.
export function quotedOptionProblems(p) {
  const reading = res(p, 'simplified').data.replace(/\*\*/g, '');
  const out = [];
  res(p, 'quiz').data.questions.forEach((q, i) => (q.options || []).forEach((o) => {
    const m = o.match(/^"(.*)"$/);
    if (m && !reading.includes(m[1].replace(/(\.\.\.|[.?!,])$/, ''))) out.push('Q' + (i + 1) + ' quotes "' + m[1] + '", which the reading does not say');
  }));
  return out;
}

describe('Crew quizzes: nothing but the reading picks the key', () => {
  const rows = SLUGS.flatMap((slug) => lengthRows(res(load(slug), 'quiz').data.questions).map((r) => ({ slug, ...r })));
  it('no key is more than 10% longer than every distractor', () => {
    expect(rows.filter((r) => r.key > 1.1 * r.maxOther).map((r) => r.slug + ': ' + r.q)).toEqual([]);
  });
  it('the key is the uniquely longest option in at most a third of the items', () => {
    expect(rows.length).toBeGreaterThanOrEqual(60);
    expect(rows.filter((r) => r.key > r.maxOther).length / rows.length).toBeLessThanOrEqual(1 / 3);
  });
  // Fixing the first cue by lengthening one distractor per item left the key second-longest in 28
  // of 60 items, and later the shortest in only 5: "pick the second longest" and "never pick the
  // shortest" are cues too. Every length rank holds between 10% and 40% of the keys.
  it('every length rank (longest, second, third, shortest) holds 10% to 40% of the keys', () => {
    const ranks = [0, 0, 0, 0];
    for (const slug of SLUGS) for (const q of res(load(slug), 'quiz').data.questions) {
      if (Array.isArray(q.options)) ranks[q.options.filter((o) => o.length > q.correctAnswer.length).length]++;
    }
    const total = ranks.reduce((a, b) => a + b, 0);
    expect(ranks.map((n) => n / total).filter((share) => share >= 0.4 || share < 0.1), 'keys per rank ' + ranks.join('/')).toEqual([]);
  });
  it.each(SLUGS)('%s: a quoted option quotes the reading', (slug) => {
    expect(quotedOptionProblems(load(slug))).toEqual([]);
  });
  it('week 12, question 4: no distractor restates half of the key', () => {
    const q = res(load('story'), 'quiz').data.questions[3];
    expect(q.correctAnswer).toMatch(/not believed, and the gap is where next trimester starts/);
    expect(q.options.filter((o) => o !== q.correctAnswer && /believ|honest|next trimester/i.test(o))).toEqual([]);
  });
});

// An independent review of the rewritten items (2026-09-23) found no wrong key and no second
// defensible answer, and these smaller things, each pinned here.
const ABSOLUTE_WORD = /\b(always|never|only|every|all|nothing|perfect|no matter|at all)\b/i;
const EL_IDIOMS = /\bfor a change\b|\bcome up with\b|\ball along\b|\bchang(e|ing) the subject\b|\bany good\b/i;
describe('Crew quizzes: what the independent review found', () => {
  const mcqs = SLUGS.flatMap((slug) => res(load(slug), 'quiz').data.questions.filter((q) => Array.isArray(q.options)).map((q) => ({ slug, q })));
  it('no item where two distractors carry an absolute word and the key carries none ("pick the plain one")', () => {
    const cued = mcqs.filter(({ q }) => !ABSOLUTE_WORD.test(q.correctAnswer) && q.options.filter((o) => o !== q.correctAnswer && ABSOLUTE_WORD.test(o)).length >= 2);
    expect(cued.map(({ slug, q }) => slug + ': ' + q.question)).toEqual([]);
  });
  it('no quiz option leans on an idiom a grade 6-8 English learner cannot work out from the words', () => {
    expect(mcqs.flatMap(({ slug, q }) => q.options.filter((o) => EL_IDIOMS.test(o)).map((o) => slug + ': ' + o))).toEqual([]);
  });
  it('week 12, question 3: no distractor credits a count or a date, which is what the key credits', () => {
    const q = res(load('story'), 'quiz').data.questions[2];
    expect(q.correctAnswer).toMatch(/a count, a date, and a thing that went wrong/);
    expect(q.options.filter((o) => o !== q.correctAnswer && /\bweek \d|\b\d+\b|\bcount\b|\bdate\b/i.test(o))).toEqual([]);
  });
  it('week 8: Jae has no pronoun in the reading, so the quiz gives Jae none', () => {
    const p = load('upstander');
    expect(res(p, 'simplified').data).not.toMatch(/\bJae\b[^.]*\b(he|his|him|she|her)\b/i);
    expect(res(p, 'quiz').data.questions[2].options.filter((o) => /^(He|She) /.test(o))).toEqual([]);
  });
  it('week 8: "again and again" governs being targeted, not a single threat', () => {
    const p = load('upstander');
    expect(allText(p) + readFileSync(GUIDE, 'utf8').replace(/\n/g, ' ')).not.toMatch(/hurt, threatened, or targeted again and again/);
    expect(res(p, 'simplified').data).toMatch(/hurt or threatened, or targeted again and again, the move is to get an adult/);
    expect(res(p, 'quiz').data.questions[4].question).toMatch(/threatened after school/);
  });
  it('week 9: the reading says what a ban is, because question 4 asks "according to the reading"', () => {
    const p = load('attention');
    expect(res(p, 'quiz').data.questions[3].question).toMatch(/boundary and a ban, according to the reading/);
    expect(res(p, 'simplified').data).toMatch(/A ban is a rule someone else makes/);
  });
  it('week 11: question 6 asks for every part of the sentence question 4 teaches', () => {
    const qs = res(load('teamwork'), 'quiz').data.questions;
    expect(qs[3].correctAnswer).toBe('What, where, and by when');
    expect(qs[5].question).toMatch(/with what, where, and by when/);
  });
  it('week 11, question 5: every option is the same kind of sentence (a command)', () => {
    const q = res(load('teamwork'), 'quiz').data.questions[4];
    expect(q.options.filter((o) => /^(You|I|We|They)\b/.test(o))).toEqual([]);
  });
  it('no key is more than 15% shorter than every distractor (the mirror of the long-key cue)', () => {
    const short = mcqs.filter(({ q }) => q.correctAnswer.length < 0.85 * Math.min(...q.options.filter((o) => o !== q.correctAnswer).map((o) => o.length)));
    expect(short.map(({ slug, q }) => slug + ': ' + q.question)).toEqual([]);
  });
  it('no quiz option names students by a behavior (person-first)', () => {
    expect(mcqs.flatMap(({ slug, q }) => q.options.filter((o) => /\b(talkers|troublemakers|slackers|loafers)\b/i.test(o)).map((o) => slug + ': ' + o))).toEqual([]);
  });
  it('week 2, question 3: no distractor "takes back", which is what the key says you may ask for', () => {
    const q = res(load('repair'), 'quiz').data.questions[2];
    expect(q.correctAnswer).toMatch(/the charger back/);
    expect(q.options.filter((o) => o !== q.correctAnswer && /\bback\b/.test(o))).toEqual([]);
  });
  it('week 4, question 5: no distractor is itself a way of fixing the system', () => {
    const q = res(load('system'), 'quiz').data.questions[4];
    expect(q.correctAnswer).toMatch(/^Fix the system/);
    expect(q.options.filter((o) => o !== q.correctAnswer && /\badd\b[^.]*\bsteps?\b/i.test(o))).toEqual([]);
  });
});

// Week 12's reading, quiz, chart and challenge ("Pick one gap across all three") teach ONE gap; the
// directions, the challenge instructions, the memory target and the guide said one gap for EACH
// HOWL, and the FAQ and the shot list said "nine sentences" when the challenge's frame is five.
const NUMBER_WORDS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'];
const GAP_EACH = /one gap for each|For each HOWL[^.;\n]*\band one gap|nine sentences/i;
describe('Crew claims: week 12 teaches one story shape', () => {
  it('one gap in total in the pack, the shot list and the guide', () => {
    const p = load('story');
    const guide = readFileSync(GUIDE, 'utf8');
    const page = guide.slice(guide.indexOf('## Week 12:'), guide.indexOf('\n## ', guide.indexOf('## Week 12:') + 5));
    expect(page.length).toBeGreaterThan(500);
    expect(allText(p)).not.toMatch(GAP_EACH);
    expect(shots('story')).not.toMatch(GAP_EACH);
    expect(page.replace(/\n/g, ' ')).not.toMatch(GAP_EACH);
    expect(res(p, 'simplified').data).toMatch(/Three HOWLs, one \*\*level\*\* each, one piece of evidence each, one gap\./);
    expect(res(p, 'applied-challenge').data.brief.seedDirection).toMatch(/Pick one gap across all three/);
  });
  it('the sentence count the FAQ and the shot list give is the length of the challenge frame', () => {
    const p = load('story');
    const n = res(p, 'applied-challenge').data.supports.frameStarter.split(/(?<=\.)\s+/).filter(Boolean).length;
    expect(n).toBe(5);
    const said = (s) => [...s.matchAll(/\b([a-z]+) sentences\b/gi)].map((m) => NUMBER_WORDS.indexOf(m[1].toLowerCase()));
    expect(said(res(p, 'faq').data.map((x) => x.answer).join(' '))).toEqual([n]);
    expect(said(shots('story'))).toEqual([n]);
  });
});

describe('Crew claims: prose that said something else', () => {
  it('week 9: Nadia catches up, but first she fell behind', () => {
    const reading = res(load('attention'), 'simplified').data;
    expect(reading).not.toMatch(/catches up\*\*, but she caught up/);
    expect(reading).toMatch(/Nadia \*\*catches up\*\*, but first she fell behind\. She was in the room for the second example and not the first\./);
  });
});

describe('the claim checks can fail', () => {
  it('an unhedged claim left in the chart is caught even when the reading is hedged', () => {
    const p = load('attention');
    res(p, 'anchor-chart').data.sections[0].bullets.push('A silent phone on the desk still costs');
    expect(allText(p)).toMatch(HEDGED[0].was);
  });
  it('a caption stronger than its pack is caught; a hedged or backed one is not', () => {
    const pack = 'The second move is usually easier than the first. Giving up is the only move that is never on the list.';
    expect(captionProblems('Caption: the second move is always easier than the first.', pack)).toHaveLength(1);
    expect(captionProblems('Caption: the biggest pull is not always the one you expected.', pack)).toEqual([]);
    expect(captionProblems('Caption: giving up is never a move on the list.', pack)).toEqual([]);
    expect(captionProblems('Labels: Always, Never.', 'Nothing here.')).toHaveLength(2);
  });
  it('a conspicuously long key and a paraphrase in quotes are caught', () => {
    const rows = lengthRows([{ question: 'q', options: ['short one', 'short two', 'the much longer correct answer', 'short'], correctAnswer: 'the much longer correct answer' }]);
    expect(rows[0].key > 1.1 * rows[0].maxOther).toBe(true);
    const p = load('ask');
    res(p, 'quiz').data.questions[3].options[3] = '"If I can do that part, the rest will go faster."';
    expect(quotedOptionProblems(p).join(' ')).toMatch(/Q4 quotes/);
  });
  it('a gap for each HOWL, or a sentence count the frame does not have, is caught', () => {
    expect('one level, one piece of evidence, and one gap for each HOWL').toMatch(GAP_EACH);
    expect('For each HOWL: a level, a piece of evidence, and one gap').toMatch(GAP_EACH);
    expect('For each HOWL, a level and a piece of evidence; then one gap').not.toMatch(GAP_EACH);
    expect('one level and one piece of evidence for each HOWL, then one gap').not.toMatch(GAP_EACH);
  });
});
