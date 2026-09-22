#!/usr/bin/env node
'use strict';
// manual_claim_check.cjs - find claims in a STEM tool manual that its tool contradicts.
//
// WHY THIS EXISTS (2026-09-21)
//   Auditing five manuals by hand on 2026-09-20 found four wrong claims that had been
//   published for weeks: the Water Cycle manual promised planetary science from a mode
//   that models a watershed; the EvoLab manual put Homology vs Analogy in a learning path
//   the tool assigns elsewhere, and said three cards sit under Teacher Resources where the
//   tool renders four; the Coaster Lab manual said three missions ship where fifteen do.
//   Every one was a teacher told to look for something that is not there.
//
//   Reading one manual against 2 MB of tool source takes an hour. There are five manuals
//   and 150 tools. This extracts the CHECKABLE claims - the ones naming a mode, a count or
//   a control - and pairs each with the tool text that would settle it.
//
// WHAT IT DOES AND DOES NOT DECIDE
//   Extraction and evidence-gathering are deterministic and need no API key. The judgment
//   step is pluggable:
//
//     --judge=local   (default) mechanical only: a named control that appears nowhere in
//                     the tool source, or a stated count that disagrees with the tool's
//                     own definition array. No model, no cost, no guessing.
//     --judge=jev     one yes/no question per claim to TypeSafe's Jev, with the tool
//                     evidence as state. Text-only, which suits this task. Needs
//                     TYPESAFE_API_KEY. Jev returns a probability and NO rationale, so a
//                     low score means "look here", never "this is wrong".
//
//   A claim this cannot check is reported as unchecked, never as fine. The failure that
//   matters is a wrong claim shipping, so silence must not read as a pass.
//
// CALIBRATION FIRST
//   --selftest replays the known defects out of git history and fails if the extractor
//   does not surface them. Run it before trusting a clean report: a checker that cannot
//   find the bugs we already fixed is telling you nothing.
//
// USAGE
//   node dev-tools/manual_claim_check.cjs                 all catalogued manuals, local judge
//   node dev-tools/manual_claim_check.cjs --manual=manual-evo-lab.html
//   node dev-tools/manual_claim_check.cjs --selftest      prove it catches the known defects
//   node dev-tools/manual_claim_check.cjs --json          machine-readable report

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const CATALOG = path.join(ROOT, 'docs/manuals/catalog.json');

const arg = (name, dflt) => {
  const hit = process.argv.find((a) => a === '--' + name || a.startsWith('--' + name + '='));
  if (!hit) return dflt;
  const eq = hit.indexOf('=');
  return eq === -1 ? true : hit.slice(eq + 1);
};
const JUDGE = String(arg('judge', 'local'));
const AS_JSON = !!arg('json', false);
const ONLY = arg('manual', null);

// -- manual text ---------------------------------------------------------------
// Strip tags but KEEP table structure: a row is the unit carrying "this mode does that",
// and the Water Cycle and EvoLab defects both lived inside one.
function manualText(html) {
  return html
    .replace(/<(script|style)[\s\S]*?<\/\1>/g, ' ')
    .replace(/<\/(td|th)>/g, ' | ')
    .replace(/<\/(tr|p|li|h[1-6])>/g, '\n')
    .replace(/<[^>]+>/g, '')
    // A sentence soft-wrapped across source lines is ONE claim: Coaster Lab split a
    // count from its noun across two lines, and the defect was invisible until this
    // collapsed them. Blank-line separation is preserved so blocks stay distinct.
    .replace(new RegExp("[ \t]*\r?\n(?![ \t]*\r?\n)", "g"), " ")
    .replace(/ /g, ' ')
    .replace(/&mdash;/g, '-').replace(/&ndash;/g, '-')
    .replace(/&rsquo;/g, "'").replace(/&amp;/g, '&')
    .replace(/&nbsp;/g, ' ').replace(/&hellip;/g, '...')
    .replace(/&ldquo;/g, '"').replace(/&rdquo;/g, '"')
    .split('\n').map(function (l) { return l.replace(/[ \t|]+/g, ' ').trim(); }).filter(Boolean);
}

// -- named controls ------------------------------------------------------------
// A manual names a control by BOLDING it, quoting it, putting it in a row header, or
// listing it comma-separated in a table cell. Reading any Title Case run instead
// produced 86 false suspects out of 128 claims: page furniture, table headers and
// whole sentences. This reads the RAW html, while that markup still exists.
function namedControls(html) {
  const out = [];
  const pats = [
    new RegExp('<(?:strong|b)>([^<]{4,40})<\\/(?:strong|b)>', 'g'),
    new RegExp('<th[^>]*>([^<]{4,40})<\\/th>', 'g'),
    new RegExp('&ldquo;([^&]{4,40})&rdquo;', 'g'),
    new RegExp('\\u201c([^\\u201d]{4,40})\\u201d', 'g')
  ];
  const push = function (raw) {
    const name = String(raw).replace(new RegExp('&[a-z]+;', 'g'), ' ').replace(new RegExp('\\s+', 'g'), ' ').trim();
    if (name.length < 4 || name.length > 40) return;
    if (new RegExp('[.!?]$').test(name)) return;      // a sentence, not a label
    if (name.split(' ').length > 5) return;           // a phrase, not a label
    // Emphasis is not a name: a manual bolds a grade band ('9-12') and temperatures
    // ('165°F', '°F/°C') for the reader, while the tool holds those as numbers. Every
    // real control label contains a run of letters; these contain none.
    if (!/[A-Za-z]{2}/.test(name)) return;
    out.push(name);
  };
  for (const re of pats) {
    let m;
    while ((m = re.exec(html))) push(m[1]);
  }
  // A table cell listing 'A, B, C' is an inventory the manual is asserting: EvoLab's
  // learning-path table names each path's modules that way, and the wrong-path defect
  // lived in exactly such a cell. Only cells that look like a LIST of proper names.
  const cellRe = new RegExp('<td[^>]*>([^<]{8,200})<\\/td>', 'g');
  let c;
  while ((c = cellRe.exec(html))) {
    const cell = c[1];
    if (cell.indexOf(',') === -1) continue;
    const parts = cell.split(',').map(function (x) { return x.trim(); });
    if (parts.length < 2) continue;
    const proper = parts.filter(function (x) { return new RegExp('^[A-Z][A-Za-z]').test(x); });
    if (proper.length < 2) continue;   // prose with commas, not a list of names
    proper.forEach(push);
  }
  return out;
}

// -- heading scope --------------------------------------------------------------
// Two sentences in the same manual can quote DIFFERENT correct counts for things
// that share a word. Coaster Lab says 'three guided design challenges' under a
// walkthrough heading (a select with three options) and the tool also ships fifteen
// MISSIONS. Both are right. The wrong version said the same 'three' under the
// <h3>Missions</h3> heading, where fifteen is the answer.
//
// So a count claim carries the heading it sits under, and the heading decides which
// definition it is quoting. Without this the checker either cries wolf on a correct
// sentence or goes silent on a wrong one - it cannot do both on wording alone.
function headingFor(html, index) {
  const before = html.slice(0, index);
  const hRe = new RegExp('<h[1-6][^>]*>([^<]{2,80})<\\/h[1-6]>', 'g');
  let last = null;
  let m;
  while ((m = hRe.exec(before))) last = m[1];
  if (!last) return '';
  return last.replace(new RegExp('&[a-z]+;', 'g'), ' ')
    .replace(new RegExp('^[^A-Za-z]+'), '')
    .replace(new RegExp('\\s+', 'g'), ' ')
    .trim();
}

// Map a count claim's heading onto the definition it is really about. Only when the
// heading NAMES the thing: an unrelated heading leaves the claim scoped as before.
function scopedArrays(arrays, heading) {
  if (!heading) return arrays;
  const h = heading.toLowerCase();
  const keys = Object.keys(arrays);
  const named = keys.filter(function (k) {
    const bare = k.toLowerCase().replace(new RegExp('[^a-z]', 'g'), '');
    if (bare.length < 4) return false;
    return h.indexOf(bare) !== -1 || h.replace(new RegExp('[^a-z]', 'g'), '').indexOf(bare) !== -1;
  });
  if (!named.length) return arrays;
  const out = {};
  named.forEach(function (k) { out[k] = arrays[k]; });
  return out;
}

// -- grouping claims -----------------------------------------------------------
// The EvoLab defect was not a wrong NAME or a wrong COUNT. Every part of
// 'Evidence and ancestry | Common Ancestry, Phylogenetic Tree Builder, Homology vs
// Analogy, Discovery Timeline' was individually true: the path exists, and so does
// every module. Only the RELATIONSHIP was wrong - the tool assigns Homology vs
// Analogy to a different path. A checker that asks 'does this name appear in the
// tool' always answers yes, which is why that defect survived the first two passes.
//
// So: read the manual's table rows as GROUPS (a heading and its members), read the
// tool's own group definitions the same way, and compare membership.
function manualGroups(html) {
  const rows = [];
  const rowRe = new RegExp('<tr>([\\s\\S]{0,2000}?)<\\/tr>', 'g');
  const thRe = new RegExp('<th[^>]*>([^<]{3,60})<\\/th>');
  const tdRe = new RegExp('<td[^>]*>([^<]{3,300})<\\/td>', 'g');
  const clean = function (s) {
    return String(s).replace(new RegExp('&[a-z]+;', 'g'), ' ').replace(new RegExp('\\s+', 'g'), ' ').trim();
  };
  let r;
  while ((r = rowRe.exec(html))) {
    const body = r[1];
    const h = thRe.exec(body);
    if (!h) continue;
    const heading = clean(h[1]).replace(new RegExp('^[^A-Za-z]+'), '');
    if (heading.length < 3) continue;
    const members = [];
    let c;
    tdRe.lastIndex = 0;
    while ((c = tdRe.exec(body))) {
      const cell = clean(c[1]);
      if (cell.indexOf(',') === -1) continue;
      const parts = cell.split(',').map(function (x) { return x.trim().replace(new RegExp('^and '), ''); });
      const proper = parts.filter(function (x) { return new RegExp('^[A-Z][A-Za-z]').test(x) && x.split(' ').length <= 5; });
      if (proper.length >= 2) proper.forEach(function (x) { members.push(x); });
    }
    if (members.length) rows.push({ heading: heading, members: members });
  }
  return rows;
}

// The tool's own groups: an array of objects each carrying a human label and a list
// of member ids, plus the id-to-title map that turns those ids into the names a
// manual would print.
function toolGroups(src) {
  const QCH = String.fromCharCode(39);
  const groups = [];
  const titles = {};
  const titleRe = new RegExp('([a-zA-Z][A-Za-z0-9_]{2,40})\\s*:\\s*' + QCH + '([A-Z][^' + QCH + ']{2,50})' + QCH, 'g');
  let t;
  while ((t = titleRe.exec(src))) if (!titles[t[1]]) titles[t[1]] = t[2];
  const entryRe = new RegExp('label\\s*:\\s*' + QCH + '([^' + QCH + ']{3,60})' + QCH + '([\\s\\S]{0,400}?)modules\\s*:\\s*\\[([^\\]]{0,600})\\]', 'g');
  let m;
  while ((m = entryRe.exec(src))) {
    const ids = m[3].split(',').map(function (x) { return x.trim().replace(new RegExp(QCH, 'g'), '').replace(new RegExp(String.fromCharCode(34), 'g'), ''); }).filter(Boolean);
    if (!ids.length) continue;
    groups.push({ label: m[1].trim(), ids: ids, names: ids.map(function (id) { return titles[id] || id; }) });
  }
  return groups;
}

// Compare membership. Reported only when the manual's heading matches a tool group
// AND the tool assigns the member somewhere else: a member the tool does not know at
// all is a name claim, already covered, and reporting it twice is noise.
function groupMismatches(mrows, tgroups) {
  const out = [];
  const norm = function (s) { return String(s).toLowerCase().replace(new RegExp('[^a-z0-9 ]', 'g'), '').trim(); };
  for (const row of mrows) {
    const g = tgroups.filter(function (x) { return norm(x.label) === norm(row.heading); })[0];
    if (!g) continue;
    for (const member of row.members) {
      if (g.names.some(function (n) { return norm(n) === norm(member); })) continue;
      const owner = tgroups.filter(function (x) {
        return x.names.some(function (n) { return norm(n) === norm(member); });
      })[0];
      if (!owner) continue;   // unknown to the tool: a name claim, not a grouping one
      out.push({
        kind: 'group', name: member, group: row.heading, owner: owner.label,
        text: row.heading + ' lists ' + member + ', but the tool assigns it to ' + owner.label
      });
    }
  }
  return out;
}

// -- described subject ---------------------------------------------------------
// The Water Cycle defect was a third class again. 'Water Worlds' is a REAL mode, so
// the name check passes; the row has no member list, so the grouping check sees
// nothing. The wrongness was in the DESCRIPTION: 'the cycle under different
// planetary conditions', 'a natural bridge to an astronomy unit', about a mode whose
// own blurb is 'Edit a valley and investigate repeatable storms'.
//
// A description that introduces subject vocabulary the tool never uses anywhere is
// the checkable shape of that mistake: 'planetary', 'astronomy' and 'exoplanet'
// appear ZERO times across the tool and both of its kernel files, while 'valley'
// and 'storm' appear dozens of times. Content words only, and only when the tool is
// wholly silent on them, so a mode the manual merely describes in its own words is
// not flagged.
// Only words that NAME A FIELD count. The first version flagged 'inferring', 'bridge'
// and 'linger': ordinary English a tool has no reason to contain. A description is
// suspect when it promises a SUBJECT the tool is silent about, which is what
// 'planetary conditions' and 'an astronomy unit' did to a watershed model.
const SUBJECT_TOPICS = new Set(["planetary","planet","astronomy","astronomical","astrophysics","cosmic","galaxy","galactic","orbital","celestial","lunar","solar","stellar","telescope","constellation","exoplanet","geology","geological","tectonic","seismic","volcanic","mineral","fossil","paleontology","chemistry","chemical","molecular","atomic","isotope","compound","reagent","titration","biology","biological","genetic","genome","cellular","organism","ecosystem","photosynthesis","anatomy","physiology","neural","microbial","bacterial","evolution","evolutionary","economics","economic","political","historical","archaeology","linguistic","grammar","algebra","algebraic","calculus","geometry","geometric","trigonometry","statistical","thermodynamic","electromagnetic","quantum","relativity","nuclear","radioactive","meteorology","atmospheric","climatology","hydrology","oceanography","watershed","engineering","structural","aerodynamic","hydraulic","robotics","circuitry"]);

// Pull the description a manual attaches to a named thing: the cells beside a row
// header. That is where a mode table says what each mode is FOR.
function describedSubjects(html) {
  const out = [];
  const rowRe = new RegExp('<tr>([\\s\\S]{0,2000}?)<\\/tr>', 'g');
  const thRe = new RegExp('<th[^>]*>([^<]{3,60})<\\/th>');
  const tdRe = new RegExp('<td[^>]*>([^<]{3,300})<\\/td>', 'g');
  const clean = function (s) {
    return String(s).replace(new RegExp('&[a-z]+;', 'g'), ' ').replace(new RegExp('\\s+', 'g'), ' ').trim();
  };
  let r;
  while ((r = rowRe.exec(html))) {
    const body = r[1];
    const h = thRe.exec(body);
    if (!h) continue;
    const subject = clean(h[1]).replace(new RegExp('^[^A-Za-z]+'), '');
    if (subject.length < 3) continue;
    const cells = [];
    let c;
    tdRe.lastIndex = 0;
    while ((c = tdRe.exec(body))) cells.push(clean(c[1]));
    // Only the FIRST cell describes the tool. Later columns carry teaching advice, whose
    // vocabulary belongs to the classroom rather than the software: 'a good fit alongside
    // a watershed or town-planning unit' flagged a row that claims nothing about the tool.
    if (cells.length) out.push({ subject: subject, description: cells[0] });
  }
  return out;
}

// A content word the tool never uses, anywhere, in any of its files.
function subjectMismatches(rows, corpus) {
  const out = [];
  const hay = String(corpus).toLowerCase();
  for (const row of rows) {
    const words = row.description.toLowerCase().split(new RegExp('[^a-z]+'))
      .filter(function (w) { return SUBJECT_TOPICS.has(w); });
    const absent = [];
    for (const w of words) {
      // Compare on a shared prefix so plurals and -al/-ic forms do not count as
      // absent when the tool uses the root: planetary/planet, astronomy/astronomer.
      // A single incidental mention is not the tool's subject: this tool says 'our planet'
      // once, in a sentence about gravity, and that was enough to accept a description of
      // 'planetary conditions'. Require the whole word, used more than once.
      // Zero uses, not 'few' uses: a word the tool never says anywhere is the signal. The
      // tool mentions 'our planet' once in a sentence about gravity, which is not a subject;
      // 'planetary' and 'astronomy' appear zero times, while 'storm' appears over a thousand.
      const stem = w.slice(0, Math.max(5, w.length - 2));
      const uses = (hay.match(new RegExp('\\b' + stem + '[a-z]*', 'g')) || []).length;
      if (uses === 0 && absent.indexOf(w) === -1) absent.push(w);
    }
    // One unfamiliar word is a turn of phrase; several is a different subject. Two
    // is the threshold that separates 'planetary ... astronomy' from ordinary prose.
    // One is enough now that only the tool-describing cell is scanned: 'The cycle under
    // different planetary conditions' contains exactly one word the tool never uses, and
    // that word is the whole defect. A stop list keeps ordinary prose out of the count.
    if (absent.length >= 1) {
      out.push({
        kind: 'subject', name: row.subject, absent: absent.slice(0, 6),
        text: row.subject + ': ' + row.description.slice(0, 160)
      });
    }
  }
  return out;
}

// -- claim extraction ----------------------------------------------------------
// Only sentences asserting something a tool's source can settle. Pedagogy ("ask students
// why") is deliberately out of scope: it is advice, not a claim about the tool.
const NUMBER_WORDS = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17, twenty: 20 };
const COUNT_NOUNS = 'modes?|tabs?|panels?|sections?|missions?|challenges?|stations?|journeys?|lenses|worlds?|paths?|puzzles?|recipes?|cards?|steps?|processes|stages?|things|items?|options?|presets?|sliders?|routes?|levels?|modules?';
const NAME_STOP = /^(The|This|That|These|Those|And|But|For|With|When|What|Where|Which|Why|How|If|In|On|At|To|From|By|As|It|You|Your|They|We|Use|See|Open|Read|Ask|Try|Start|Grade|Grades|Section|Step|Note|Tip|Each|Every|Both|Some|Most|Many|Then|Next|First|Last|One|Two|Three|Four|Five|Six|Seven|Eight|Nine|Ten)\b/;

function extractClaims(lines, names, html) {
  const out = [];
  for (const line of lines) {
    // Joining soft-wrapped lines makes real paragraphs long: the Coaster Lab mission
    // claim landed at 415 characters and a 400 limit dropped the whole paragraph
    // silently. Split long blocks on sentence ends instead of discarding them, so a
    // claim is never lost for sitting in a wordy paragraph.
    const units = line.length <= 400 ? [line] : line.split(/(?<=[.!?])s+/);
    for (const unit of units) {
    const line2 = unit.trim();
    if (line2.length < 12 || line2.length > 600) continue;

    const ADJ = '(?:[a-z][a-z-]{1,14}\\s+){0,2}';
    const countRe = new RegExp('\\b(\\d{1,3}|' + Object.keys(NUMBER_WORDS).join('|') + ')\\s+' + ADJ + '(' + COUNT_NOUNS + ')\\b', 'gi');
    let m;
    while ((m = countRe.exec(line2))) {
      const raw = m[1].toLowerCase();
      const n = /^\d+$/.test(raw) ? Number(raw) : NUMBER_WORDS[raw];
      if (!Number.isFinite(n)) continue;
      // 'one' is almost never an inventory claim: 'pick one journey', 'one step at a
      // time', 'one starting path' are prose. Counting them produced three suspects
      // that contradicted nothing, and a report with false alarms gets skimmed.
      if (n < 2) continue;
      // Carry the heading this sentence sits under: two correct counts can share a word,
      // and only the section says which definition is being quoted.
      const at = html ? html.indexOf(line2.slice(0, 40)) : -1;
      const heading = (html && at >= 0) ? headingFor(html, at) : '';
      out.push({ kind: 'count', n: n, noun: m[2].toLowerCase().replace(/s$/, ''), text: line2, heading: heading });
    }

    // A control name is QUOTED or BOLDED by the author. Any Title Case run also matched
    // headings, table headers and sentence openings, so this looks only at deliberate markup.
    // Names come from namedControls, which reads the markup. Deriving them from prose
    // here matched headings and sentence openings and buried the real findings.
    }
  }
  // Carry the sentence the name appeared in: a report that prints only the label tells
  // the reader nothing about what was claimed about it.
  for (const nm of (names || [])) {
    const ctx = lines.find(function (l) { return l.indexOf(nm) !== -1; });
    out.push({ kind: 'name', name: nm, text: ctx || nm });
  }
  const seen = new Set();
  return out.filter(function (c) {
    const k = c.kind + '|' + (c.kind === 'count' ? c.n + c.noun : c.name);
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

// -- tool evidence -------------------------------------------------------------
// Tool sources run to megabytes, past Jev's 32k state budget and past what is useful to
// a reader. Pull what decides these claims: the UI strings the tool renders, and the
// definition arrays it counts from.
function toolEvidence(src) {
  const B = String.fromCharCode(92);
  const Q = String.fromCharCode(39, 34, 96);
  const strings = new Set();
  const strRe = new RegExp('[' + Q + ']([A-Z\u00C0-\u024F][^' + Q + B + 'n]{3,60})[' + Q + ']', 'g');
  let sm;
  while ((sm = strRe.exec(src))) {
    const s = sm[1].trim();
    if (/^[A-Z_]+$/.test(s)) continue;
    if (/[<>{}();=]/.test(s)) continue;
    if (/^(function|return|const|let|var|import|export)/.test(s)) continue;
    strings.add(s);
  }

  // Bracket-walk rather than regex-match the terminator. A lazy regex with a size cap
  // silently truncates: Solar System's journeys array spans 4401 characters and ends
  // with a bracket on the SAME line, so a pattern expecting a newline missed it and a
  // correct 'six journeys' was compared against GUIDED_MISSIONS=9 and called wrong. A
  // false alarm on a correct manual is the expensive failure: it teaches the reader to
  // skim the report.
  const arrays = {};
  const decl = new RegExp('(?:' + B + 'b(?:const|let|var)' + B + 's+)?([A-Za-z][A-Za-z0-9_]{2,40})' + B + 's*=' + B + 's*' + B + '[', 'g');
  let m;
  while ((m = decl.exec(src))) {
    const name = m[1];
    if (Object.prototype.hasOwnProperty.call(arrays, name)) continue;
    const open = src.indexOf('[', m.index + m[0].length - 1);
    if (open < 0) continue;
    let d = 0, end = -1;
    for (let j = open; j < src.length && j < open + 200000; j++) {
      const ch = src[j];
      if (ch === '[' || ch === '{') d++;
      else if (ch === '}') d--;
      else if (ch === ']') { d--; if (d === 0) { end = j; break; } }
    }
    if (end === -1) continue;
    // Count only DIRECT children. Counting every id: or title: anywhere counts nested
    // objects too: journeys holds six entries, one with a nested step of its own, which
    // read as seven and would have contradicted a correct manual.
    let dd = 0, items = 0;
    for (let j = open; j <= end; j++) {
      const ch = src[j];
      if (ch === '[') dd++;
      else if (ch === '{') { if (dd === 1) items++; dd++; }
      else if (ch === '}' || ch === ']') dd--;
    }
    if (items === 0) {
      const inner = src.slice(open + 1, end);
      items = (inner.match(new RegExp('^' + B + 's*[' + Q + ']', 'gm')) || []).length;
    }
    if (items > 0) arrays[name] = items;
  }
  // A count can be quoted from a SELECT's options, not a definition array: Coaster Lab
  // has three guided design challenges in a select AND fifteen missions in MISSIONS.
  // Both numbers are right, and comparing three against fifteen called a correct
  // sentence a defect. Option groups count as definitions, keyed by the control id.
  const selRe = new RegExp('id="([A-Za-z0-9_-]{3,40})"[^>]*>([^<]*(?:<option[^>]*>[^<]*</option>[^<]*){2,})', 'g');
  let sel;
  while ((sel = selRe.exec(src))) {
    const opts = (sel[2].match(new RegExp('<option', 'g')) || []).length;
    const key = sel[1].replace(new RegExp('^[a-z]+-'), '');
    if (opts > 1 && !Object.prototype.hasOwnProperty.call(arrays, key)) arrays[key] = opts;
  }
  return { strings: strings, arrays: arrays };
}
// -- the local judge -----------------------------------------------------------
// Mechanical only. Reports SUSPECT when the source positively fails to support a claim,
// and UNCHECKED when it has no way to tell - never "fine".
function judgeLocal(claim, ev) {
  if (claim.kind === 'name') {
    const bare = function (s) {
      return String(s)
        .replace(new RegExp('[^\\p{L}\\p{N}]+', 'gu'), ' ')
        .replace(new RegExp('^[\\d ]+'), '')
        .replace(new RegExp('\\s+', 'g'), ' ')
        .trim().toLowerCase();
    };
    const want = bare(claim.name);
    if (want.length >= 4) {
      // Whole-name equality, or the name as a complete word-run inside a longer string.
      // A bare substring test matched almost anything and hid two known defects.
      for (const s of ev.strings) {
        const hay = bare(s);
        if (hay === want) return { verdict: 'supported', why: 'tool renders this text' };
        if (hay.indexOf(want + ' ') === 0 || hay.indexOf(' ' + want) === hay.length - want.length - 1) {
          return { verdict: 'supported', why: 'tool renders this text' };
        }
      }
    }
    return { verdict: 'suspect', why: 'no string in the tool source contains this name' };
  }
  if (claim.kind === 'count') {
    // A manual's noun and the tool's array name often differ: Coaster Lab's manual says
    // 'design challenges' where the tool defines MISSIONS. Without a bridge the claim
    // extracts fine and then finds nothing to compare against, which reads as a pass.
    const SYNONYMS = {
      challenge: ['mission', 'challenge', 'quest'],
      mission: ['mission', 'challenge'],
      mode: ['mode', 'tab', 'section', 'view'],
      tab: ['tab', 'mode', 'section'],
      panel: ['panel', 'tab', 'section'],
      card: ['card', 'resource', 'panel'],
      journey: ['journey', 'mission', 'quest'],
      station: ['station', 'stop'],
      lens: ['lens', 'mode'],
      module: ['module', 'tool'],
      preset: ['preset', 'scenario'],
      process: ['process', 'stage', 'step'],
      stage: ['stage', 'process', 'step'],
      puzzle: ['puzzle', 'question'],
      world: ['world', 'planet'],
      path: ['path', 'track', 'route']
    };
    // Narrow to the definitions the claim's own section names, so 'three' under a
    // Missions heading is measured against MISSIONS and not against a same-named select.
    ev = { strings: ev.strings, arrays: scopedArrays(ev.arrays, claim.heading || '') };
    const stem = claim.noun.replace(/y$/, '');
    const words = SYNONYMS[claim.noun] || [stem];
    const keys = Object.keys(ev.arrays);
    const direct = keys.filter(function (k) { return new RegExp(stem, 'i').test(k); });
    const pool = direct.length ? direct : keys.filter(function (k) {
      return words.some(function (w) { return new RegExp(w, 'i').test(k); });
    });
    if (!pool.length) return { verdict: 'unchecked', why: 'no definition array matches "' + claim.noun + '"' };
    const near = pool.map(function (k) { return [k, ev.arrays[k]]; });
    if (near.some(function (x) { return x[1] === claim.n; })) {
      return { verdict: 'supported', why: near.map(function (x) { return x[0] + '=' + x[1]; }).join(', ') };
    }
    // A single-element local named for the noun is almost always a loop variable, not
    // the definition the manual is quoting: Coaster Lab has a one-element `challenge`
    // beside MISSIONS=15. Trusting it turned a real fifteen-versus-three defect into a
    // meaningless one-versus-three. Widen to synonyms before giving up on the claim.
    const plausible = near.filter(function (x) { return x[1] > 1; });
    if (!plausible.length) {
      const wider = keys.filter(function (k) {
        return words.some(function (w) { return new RegExp(w, 'i').test(k); }) && ev.arrays[k] > 1;
      }).map(function (k) { return [k, ev.arrays[k]]; });
      if (wider.some(function (x) { return x[1] === claim.n; })) {
        return { verdict: 'supported', why: wider.map(function (x) { return x[0] + '=' + x[1]; }).join(', ') };
      }
      if (wider.length > 1) {
        return { verdict: 'unchecked', why: wider.length + ' arrays match "' + claim.noun + '" (' + wider.map(function (x) { return x[0] + '=' + x[1]; }).join(', ') + '); none is clearly the one quoted' };
      }
      if (wider.length) {
        return { verdict: 'suspect', why: 'tool defines ' + wider.map(function (x) { return x[0] + '=' + x[1]; }).join(', ') + ', manual says ' + claim.n };
      }
      return { verdict: 'unchecked', why: 'only single-element arrays match "' + claim.noun + '" (likely loop variables)' };
    }
    // Several same-named arrays and no match means a FAMILY of arrays, not the one the
    // manual quotes: Water Cycle has cloudSliders, temperatureProfileSliders and
    // survivalSliders, while 'five sliders' describes one mode's panel that no single
    // array holds. Ambiguous evidence is reported as ambiguous, not as a contradiction.
    if (plausible.length > 1) {
      return { verdict: 'unchecked', why: plausible.length + ' arrays match "' + claim.noun + '" (' + plausible.map(function (x) { return x[0] + '=' + x[1]; }).join(', ') + '); none is clearly the one quoted' };
    }
    return { verdict: 'suspect', why: 'tool defines ' + plausible.map(function (x) { return x[0] + '=' + x[1]; }).join(', ') + ', manual says ' + claim.n };
  }
  return { verdict: 'unchecked', why: 'unsupported claim kind' };
}

// -- the Jev judge -------------------------------------------------------------
// Text-only, which is why this task suits it. One yes/no question per claim under a
// shared state. Returns a probability and NO rationale: a low number means "a person
// should look here", never "this is wrong".
async function judgeJev(claims, ev, label) {
  const key = process.env.TYPESAFE_API_KEY;
  if (!key) throw new Error('judge=jev needs TYPESAFE_API_KEY in the environment');
  const state = {
    tool: label,
    rendered_text: Array.from(ev.strings).slice(0, 400),
    definition_counts: ev.arrays
  };
  const questions = {};
  claims.forEach(function (c, i) {
    questions['c' + i] = {
      type: 'noul',
      instructions: 'The tool evidence supports this statement from its manual: "' + c.text.slice(0, 300) + '"'
    };
  });
  const res = await fetch('https://api.typesafe.ai/v1/systemone', {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: 'Bearer ' + key },
    body: JSON.stringify({ model: 'jev-latest', state: state, questions: questions })
  });
  if (!res.ok) throw new Error('Jev HTTP ' + res.status + ' ' + (await res.text()).slice(0, 200));
  const body = await res.json();
  return claims.map(function (c, i) {
    const a = (body.answers || {})['c' + i] || {};
    const p = typeof a.noul === 'number' ? a.noul : null;
    return Object.assign({}, c, {
      verdict: p === null ? 'unchecked' : (p < 0.5 ? 'suspect' : 'supported'),
      why: p === null ? 'no answer returned'
        : 'jev p=' + p.toFixed(3) + ' (a ranking until calibration is measured on this corpus)',
      p: p
    });
  });
}

// -- run -----------------------------------------------------------------------
async function checkOne(item) {
  const manualPath = path.join(ROOT, item.href);
  const srcPath = path.join(ROOT, item.canonicalSource);
  if (!fs.existsSync(manualPath) || !fs.existsSync(srcPath)) {
    return { id: item.id, error: 'missing manual or tool source' };
  }
  const rawHtml = fs.readFileSync(manualPath, 'utf8');
  const lines = manualText(rawHtml);
  const claims = extractClaims(lines, namedControls(rawHtml), rawHtml);
  const toolSrc = fs.readFileSync(srcPath, 'utf8');
  const ev = toolEvidence(toolSrc);
  // Grouping claims are settled without a model: the manual's table rows and the
  // tool's own group definitions are both machine-readable, so membership can be
  // compared directly. This is the class the name and count checks cannot see.
  // A mode can live in sibling files: Water Worlds is a kernel and a view beside the
  // tool. Scanning only the tool would call their vocabulary absent and flag correct
  // descriptions, so the corpus is the tool plus every sibling sharing its directory
  // and a name stem.
  const toolDir = path.dirname(srcPath);
  const stemName = path.basename(srcPath, '.js').replace('stem_tool_', '');
  let corpus = toolSrc;
  try {
    for (const fname of fs.readdirSync(toolDir)) {
      if (!fname.endsWith('.js') || fname === path.basename(srcPath)) continue;
      if (fname.indexOf(stemName.slice(0, 5)) === -1) continue;
      corpus += String.fromCharCode(10) + fs.readFileSync(path.join(toolDir, fname), 'utf8');
    }
  } catch (e) { /* a tool with no siblings is normal */ }
  const subjectFindings = subjectMismatches(describedSubjects(rawHtml), corpus)
    .map(function (s) { return Object.assign({}, s, { verdict: 'suspect', why: 'the tool never uses: ' + s.absent.join(', ') }); });
  const groupFindings = groupMismatches(manualGroups(rawHtml), toolGroups(toolSrc))
    .map(function (g) { return Object.assign({}, g, { verdict: 'suspect', why: 'tool assigns it to ' + g.owner }); });
  const judged = JUDGE === 'jev'
    ? await judgeJev(claims, ev, item.title)
    : claims.map(function (c) { return Object.assign({}, c, judgeLocal(c, ev)); });
  const all = judged.concat(groupFindings, subjectFindings);
  return { id: item.id, href: item.href, source: item.canonicalSource, claims: all };
}

function report(results) {
  if (AS_JSON) { console.log(JSON.stringify(results, null, 2)); return 0; }
  let suspect = 0;
  for (const r of results) {
    if (r.error) { console.log('\n' + r.id + ': ' + r.error); continue; }
    const s = r.claims.filter(function (c) { return c.verdict === 'suspect'; });
    const u = r.claims.filter(function (c) { return c.verdict === 'unchecked'; });
    suspect += s.length;
    console.log('\n' + r.id + '  (' + r.claims.length + ' claims, ' + s.length + ' suspect, ' + u.length + ' unchecked)');
    for (const c of s.slice(0, 12)) {
      console.log('  SUSPECT  ' + (c.kind === 'count' ? c.n + ' ' + c.noun : '"' + c.name + '"'));
      console.log('           ' + c.why);
      console.log('           ' + c.text.slice(0, 150));
    }
  }
  console.log('\n' + suspect + ' suspect claim(s) across ' + results.length + ' manual(s).');
  console.log('Suspect = a place to LOOK, not a proven defect. Unchecked is not a pass.');
  return suspect;
}

// -- selftest ------------------------------------------------------------------
// Replay the known-wrong claims out of git and require the extractor to surface each.
// A checker that cannot find the defects we already fixed is worthless, and a green
// report from one is worse than no report because it is believed.
function selftest() {
  const CASES = [
    { commit: 'd2af9c72d^', file: 'manual-water-cycle.html', src: 'stem_lab/stem_tool_watercycle.js', want: /planetary conditions/i, label: 'Water Cycle: planetary claim' },
    { commit: '2383aea1b^', file: 'manual-evo-lab.html', src: 'stem_lab/stem_tool_evolab.js', want: /Homology vs Analogy/i, label: 'EvoLab: path membership' },
    { commit: '2383aea1b^', file: 'manual-coaster-lab.html', src: 'stem_lab/stem_tool_coasterlab.js', want: /built-in design challenges/i, label: 'Coaster Lab: mission count' }
  ];
  let pass = 0;
  let ran = 0;
  for (const c of CASES) {
    let old;
    try {
      old = execFileSync('git', ['show', c.commit + ':' + c.file], { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
    } catch (e) {
      console.log('  SKIP      ' + c.label + ' (cannot read that revision)');
      continue;
    }
    if (!c.want.test(old)) { console.log('  SKIP      ' + c.label + ' (defect absent from that revision)'); continue; }
    ran++;
    const claims = extractClaims(manualText(old), namedControls(old), old);
    const ev = toolEvidence(fs.readFileSync(path.join(ROOT, c.src), 'utf8'));
    const judged = claims.map(function (x) { return Object.assign({}, x, judgeLocal(x, ev)); });
    const toolSrc = fs.readFileSync(path.join(ROOT, c.src), 'utf8');
    const groupFindings = groupMismatches(manualGroups(old), toolGroups(toolSrc))
      .map(function (g) { return Object.assign({}, g, { verdict: 'suspect', why: 'tool assigns it to ' + g.owner }); });
    // Run every judge checkOne runs: a selftest that skips one measures a different
    // program, which is how the grouping class went uncovered the first time.
    let corpus = toolSrc;
    try {
      const dir = path.dirname(path.join(ROOT, c.src));
      const stemName = path.basename(c.src, '.js').replace('stem_tool_', '');
      for (const fname of fs.readdirSync(dir)) {
        if (!fname.endsWith('.js') || fname === path.basename(c.src)) continue;
        if (fname.indexOf(stemName.slice(0, 5)) === -1) continue;
        corpus += String.fromCharCode(10) + fs.readFileSync(path.join(dir, fname), 'utf8');
      }
    } catch (e) { /* no siblings is normal */ }
    const subjectFindings = subjectMismatches(describedSubjects(old), corpus)
      .map(function (s) { return Object.assign({}, s, { verdict: 'suspect', why: 'the tool never uses: ' + s.absent.join(', ') }); });
    const all = judged.concat(groupFindings, subjectFindings);
    const hit = all.some(function (x) { return x.verdict === 'suspect' && c.want.test(x.text); });
    console.log((hit ? '  CATCHES   ' : '  MISSES    ') + c.label);
    if (hit) pass++;
  }
  console.log('\nselftest: ' + pass + ' of ' + ran + ' replayable defects surfaced.');
  return { pass: pass, ran: ran };
}

(async function () {
  if (arg('selftest', false)) {
    const r = selftest();
    process.exit(r.ran > 0 && r.pass === r.ran ? 0 : 1);
  }
  const catalog = JSON.parse(fs.readFileSync(CATALOG, 'utf8'));
  let items = catalog.items.filter(function (i) { return i.format === 'STEM tool teacher manual'; });
  if (ONLY) items = items.filter(function (i) { return i.href === ONLY || i.id === ONLY; });
  if (!items.length) { console.error('no catalogued manual matches ' + ONLY); process.exit(2); }
  const results = [];
  for (const it of items) results.push(await checkOne(it));
  report(results);
})().catch(function (e) { console.error('manual_claim_check: ' + e.message); process.exit(1); });
