// Crew Launch packs · every place a pack (or the teacher guide) points at another part of the pack,
// the pointer is true.
//
// The directions say "Take the quiz. Question 3 is about Jae at the lunch table." and "win the Word
// Scramble"; the station says "Spend 5 minutes in Perspective Lens"; the guide says "Twelve words,
// then Matching". Each is a claim about ANOTHER resource. A quiz reorder, a game swap or a renamed
// tool breaks the claim while every shape test stays green. Found 2026-09-23: week 5's directions and
// guide said "Question 3 compares two ways of asking" when Q3 asks what is wrong with "I don't get
// it".
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = process.cwd();
const DIR = process.env.CREW_PACK_DIR ? resolve(process.env.CREW_PACK_DIR) : resolve(ROOT, 'allopacks');
const GUIDE = readFileSync(process.env.CREW_GUIDE_PATH ? resolve(process.env.CREW_GUIDE_PATH) : resolve(ROOT, 'docs', 'CREW_LAUNCH_TEACHER_GUIDE.md'), 'utf8');
const FILES = readdirSync(DIR).filter((f) => /^crew_.*\.allopack\.json$/.test(f)).sort();

const GAME_NAME = { wordScramble: /Word Scramble/, matching: /\bMatching\b/, crossword: /\bCrossword\b/, memory: /\bMemory\b/, bingo: /\bBingo\b/ };
const HOUSE = new Set(['Glossary', 'Word Scramble', 'Matching', 'Sentence Frames', 'Quiz', 'Crossword', 'Memory', 'Bingo']);
const NUMBER_WORDS = { nine: 9, ten: 10, eleven: 11, twelve: 12, thirteen: 13, fourteen: 14 };
const STOP = /\b(the|a|an|and|about|of|at|to|is|in|on|what|why|who|how|does|not|mean|says|said|with|for|it)\b/gi;

const of = (pack, type) => pack.history.find((r) => r.type === type);

// "Question N <verb> <phrase>" -> most content words of <phrase> appear in question N.
export function quizPointerProblems(text, questions, where) {
  const out = [];
  for (const m of text.matchAll(/Question (\d+) (is about|asks|compares|is) ([^.;|\n]+)/g)) {
    const q = questions[Number(m[1]) - 1];
    if (!q) { out.push(where + ': "Question ' + m[1] + '" but the quiz has ' + questions.length); continue; }
    const words = m[3].replace(STOP, ' ').split(/[^A-Za-z']+/).filter((w) => w.length > 2);
    const hay = [q.question, ...(q.options || []), q.correctAnswer || '', q.expectedAnswer || ''].join(' ').toLowerCase();
    const hits = words.filter((w) => hay.includes(w.toLowerCase().replace(/'s$/, '')));
    if (hits.length < Math.max(1, Math.ceil(words.length / 2))) out.push(where + ': "Question ' + m[1] + ' ' + m[2] + ' ' + m[3].trim() + '" but Q' + m[1] + ' is "' + q.question + '"');
  }
  return out;
}

export function directionsProblems(pack) {
  const out = [];
  const dir = of(pack, 'directions');
  const body = dir.data.body;
  const game = dir.data.objectives.find((o) => o.kind === 'game');
  const step2 = (body.match(/^2\. [^\n]+/m) || [''])[0];
  if (!GAME_NAME[game.gameType] || !GAME_NAME[game.gameType].test(step2)) out.push('step 2 "' + step2 + '" does not name the goal game ' + game.gameType);
  if (!GAME_NAME[game.gameType] || !GAME_NAME[game.gameType].test(game.label)) out.push('goal "' + game.label + '" does not name ' + game.gameType);
  const titles = new Set(pack.history.map((r) => r.title));
  for (const m of body.matchAll(/\*\*([^*]+)\*\*/g)) {
    const b = m[1].trim();
    if (!HOUSE.has(b) && !titles.has(b)) out.push('bold "' + b + '" is not a resource in the pack');
  }
  out.push(...quizPointerProblems(body, of(pack, 'quiz').data.questions, 'directions'));
  return out;
}

export function stationProblems(pack) {
  const out = [];
  const station = pack.selStations[0];
  const dir = of(pack, 'directions');
  const links = [...dir.data.body.matchAll(/\[([^\]]+)\]\(#sel-hub\/([A-Za-z]+)\?station=([A-Za-z0-9_]+)\)/g)].map((m) => ({ text: m[1], tool: m[2], station: m[3] }));
  if (!links.length) return ['the directions link no Hub tool'];
  for (const l of links) if (l.station !== station.id) out.push('link to ' + l.tool + ' starts station ' + l.station + ', the pack carries ' + station.id);
  const linked = [...new Set(links.map((l) => l.tool))].sort();
  if (JSON.stringify([...station.tools].sort()) !== JSON.stringify(linked)) out.push('station tools ' + JSON.stringify(station.tools) + ' are not the linked tools ' + JSON.stringify(linked));
  const timed = station.quests.find((q) => q.type === 'timeSpent');
  if (!timed) out.push('no timed step');
  else {
    if (timed.toolId !== links[0].tool) out.push('timed step counts ' + timed.toolId + ', the first link opens ' + links[0].tool);
    const text = (links.find((l) => l.tool === timed.toolId) || {}).text;
    if (timed.label !== 'Spend ' + timed.params.minutes + ' minutes in ' + text) out.push('timed step "' + timed.label + '" does not name the link "' + text + '"');
  }
  for (const q of station.quests) if (!station.tools.includes(q.toolId)) out.push('step ' + q.qid + ' uses ' + q.toolId + ', not a station tool');
  const manualQuest = station.quests.find((q) => q.type === 'manualComplete');
  const manualGoal = dir.data.objectives.find((o) => o.kind === 'manual');
  if (!manualQuest || !manualGoal || manualQuest.label !== manualGoal.label) out.push('station commitment and the manual goal differ');
  const shortTitle = pack.allopack.title.replace(/^Crew Launch /, '');
  if (station.name !== 'Crew station: ' + shortTitle) out.push('station name "' + station.name + '" is not "Crew station: ' + shortTitle + '"');
  if (!station.teacherNote.includes(pack.allopack.title)) out.push('teacher note does not name the pack');
  return out;
}

export function guidePageProblems(guide, pack) {
  const out = [];
  const week = Number(pack.allopack.title.match(/Week (\d+)/)[1]);
  const start = guide.search(new RegExp('^## Week ' + week + ': ', 'm'));
  if (start < 0) return ['no guide page for week ' + week];
  const rest = guide.slice(start + 3);
  const end = rest.search(/^## /m);
  const page = guide.slice(start, end < 0 ? undefined : start + 3 + end);
  const row = (page.match(/\| 10 to 17 \| ([^|]+)\|/) || [])[1] || '';
  const n = row.match(/\b(nine|ten|eleven|twelve|thirteen|fourteen) words/i);
  const count = of(pack, 'glossary').data.length;
  if (!n || NUMBER_WORDS[n[1].toLowerCase()] !== count) out.push('guide week ' + week + ' says "' + (n ? n[0] : '?') + '", the glossary has ' + count);
  const game = of(pack, 'directions').data.objectives.find((o) => o.kind === 'game');
  if (!GAME_NAME[game.gameType].test(row)) out.push('guide week ' + week + ' names a different game than ' + game.gameType + ': "' + row.trim() + '"');
  out.push(...quizPointerProblems(page, of(pack, 'quiz').data.questions, 'guide week ' + week));
  return out;
}

describe.each(FILES)('Crew pack pointers: %s', (file) => {
  const pack = JSON.parse(readFileSync(resolve(DIR, file), 'utf8'));
  it('the directions name the right game, real resources, and the right quiz question', () => {
    expect(directionsProblems(pack)).toEqual([]);
  });
  it('the station matches the links: tools, timed step, commitment, name', () => {
    expect(stationProblems(pack)).toEqual([]);
  });
  it('the guide page names the right word count, game and quiz question', () => {
    expect(guidePageProblems(GUIDE, pack)).toEqual([]);
  });
});

describe('the pointer checks can fail', () => {
  const load = (name) => JSON.parse(readFileSync(resolve(DIR, 'crew_' + name + '_grade6_8.allopack.json'), 'utf8'));
  it('a quiz reorder breaks the directions and guide pointers', () => {
    const p = load('upstander');
    const qs = of(p, 'quiz').data.questions;
    [qs[1], qs[2]] = [qs[2], qs[1]];
    expect(directionsProblems(p).join(' ')).toMatch(/Question 3/);
    expect(guidePageProblems(GUIDE, p).join(' ')).toMatch(/Question 3/);
  });
  it('a game swap breaks step 2 and the guide row', () => {
    const p = load('perspective');
    of(p, 'directions').data.objectives.find((o) => o.kind === 'game').gameType = 'matching';
    expect(directionsProblems(p).join(' ')).toMatch(/step 2/);
    expect(guidePageProblems(GUIDE, p).join(' ')).toMatch(/different game/);
  });
  it('a renamed resource breaks a bold pointer', () => {
    const p = load('zones');
    of(p, 'anchor-chart').title = 'Something Else';
    expect(directionsProblems(p).join(' ')).toMatch(/is not a resource/);
  });
  it('a station that counts the wrong tool, or a changed commitment, is caught', () => {
    const p = load('feedback');
    p.selStations[0].quests.find((q) => q.type === 'timeSpent').toolId = 'thoughtRecord';
    expect(stationProblems(p).join(' ')).toMatch(/first link/);
    const q = load('halfway');
    of(q, 'directions').data.objectives.find((o) => o.kind === 'manual').label = 'Something else';
    expect(stationProblems(q).join(' ')).toMatch(/commitment/);
  });
  it('a glossary word added without updating the guide is caught', () => {
    const p = load('ask');
    of(p, 'glossary').data.push({ term: 'Extra', def: 'An extra word.', tier: 'Academic' });
    expect(guidePageProblems(GUIDE, p).join(' ')).toMatch(/glossary has 13/);
  });
});
