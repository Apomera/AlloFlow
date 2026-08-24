// Build the clinical review packet for the PM passage bank as a single HTML
// page, GENERATED from pm_bank/PM_PASSAGES_DRAFT_WAVE1.json so the packet
// text cannot drift from the bank text (the i18n byte-for-byte lesson).
//
//   node dev-tools/build_pm_review_packet.cjs <out.html>
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = process.cwd();
const out = process.argv[2];
if (!out) { console.error('usage: node dev-tools/build_pm_review_packet.cjs <out.html>'); process.exit(2); }

const bank = JSON.parse(fs.readFileSync(path.join(ROOT, 'pm_bank', 'PM_PASSAGES_DRAFT_WAVE1.json'), 'utf8'));
const math = JSON.parse(fs.readFileSync(path.join(ROOT, 'pm_bank', 'PM_MATH_FORMS_DRAFT.json'), 'utf8'));

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const GRADE_BAND_NOTE = {
  '1': 'Target: 80–120 words · Spache 1.3–2.0 (proposed) · decodability ≤5% outside inventory',
  '2': 'Target: 120–180 words · Spache 2.0–2.8 (proposed) · decodability ≤5% outside inventory',
  '3': 'Target: 150–220 words · Spache 2.8–3.8 (proposed)',
  '4': 'Target: 180–250 words · Dale–Chall grade band (proposed)',
  '5': 'Target: 200–250 words · Dale–Chall grade band (proposed)',
  '6': 'Target: 220–280 words · Dale–Chall grade band (proposed)',
};

let passageHtml = '';
for (const grade of Object.keys(bank.passages)) {
  passageHtml += `<section class="grade" id="grade-${grade}">
  <h3><span class="gnum">Grade ${grade}</span> <span class="gnote">${esc(GRADE_BAND_NOTE[grade])}</span></h3>\n`;
  for (const p of bank.passages[grade]) {
    const m = p.metrics || {};
    const chips = [
      `<span class="chip">${m.wordCount} words</span>`,
      `<span class="chip">${m.sentenceCount} sentences · mean ${m.meanSentenceLen}</span>`,
      (grade === '1' || grade === '2')
        ? `<span class="chip">syll/word within band</span>`
        : `<span class="chip">FK ${m.fkGrade}</span>`,
      m.decodability ? `<span class="chip">${m.decodability.pct}% outside inventory${m.decodability.outside.length ? ' (' + esc(m.decodability.outside.join(', ')) + ')' : ''}</span>` : '',
      m.properNouns && m.properNouns.length ? `<span class="chip">names: ${esc(m.properNouns.join(', '))}</span>` : '<span class="chip">no proper nouns</span>',
      `<span class="chip flag">readability: provisional</span>`,
    ].filter(Boolean).join('');
    passageHtml += `<article class="passage" id="${p.id}">
    <header><h4>${esc(p.title)}</h4><span class="pid">${p.id}</span></header>
    <p class="topic">Topic: ${esc(p.topic)}</p>
    <div class="chips">${chips}</div>
    <div class="ptext">${esc(p.text)}</div>
  </article>\n`;
  }
  passageHtml += '</section>\n';
}

let mathRows = '';
for (const g of Object.keys(math.templates)) {
  const t = math.templates[g];
  const mix = Object.entries(t.mix).map(([op, n]) => `${op} ${n}`).join(' · ');
  mathRows += `<tr><td>Grade ${g}</td><td>${Object.keys(math.PM_MATH_FORMS[g]).length}</td><td>${t.problemCount}</td><td>${mix}</td><td>${t.reviewNote ? '<span class="flag-inline">spec-proposed — confirm</span>' : 'derived from existing forms'}</td></tr>\n`;
}

const html = `<title>AlloFlow PM Bank Review</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Source+Serif+4:opsz,wght@8..60,400;8..60,600;8..60,700&family=IBM+Plex+Sans:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap">
<style>
:root{
  --paper:#FAFBFC; --ink:#1C2733; --dim:#5B6B7A; --accent:#0E6E6B;
  --rule:#D8DEE4; --card:#FFFFFF; --flagbg:#F6EBD4; --flagink:#7A5308;
  --chipbg:#EEF2F5;
}
@media (prefers-color-scheme: dark){ :root:not([data-theme="light"]){
  --paper:#131A21; --ink:#E4EAF0; --dim:#93A3B1; --accent:#4FC1BC;
  --rule:#2A3540; --card:#1A232C; --flagbg:#33290F; --flagink:#D9A648;
  --chipbg:#222D37;
}}
:root[data-theme="dark"]{
  --paper:#131A21; --ink:#E4EAF0; --dim:#93A3B1; --accent:#4FC1BC;
  --rule:#2A3540; --card:#1A232C; --flagbg:#33290F; --flagink:#D9A648;
  --chipbg:#222D37;
}
body{background:var(--paper);color:var(--ink);font-family:'IBM Plex Sans',system-ui,sans-serif;
  line-height:1.55;margin:0;padding:2.2rem 1.2rem 5rem;}
main{max-width:44rem;margin:0 auto;}
h1,h2,h3,h4{font-family:'Source Serif 4',Georgia,serif;text-wrap:balance;line-height:1.15;}
h1{font-size:2.1rem;font-weight:700;margin:.2rem 0 .3rem;}
h2{font-size:1.35rem;font-weight:600;margin:2.6rem 0 .7rem;color:var(--accent);}
.eyebrow{font-size:.72rem;letter-spacing:.13em;text-transform:uppercase;color:var(--accent);font-weight:600;}
.subtitle{color:var(--dim);margin:.1rem 0 0;}
.banner{border:1px solid var(--flagink);background:var(--flagbg);color:var(--flagink);
  border-radius:8px;padding:.7rem .9rem;font-size:.86rem;margin:1.4rem 0 0;}
ol.q{padding-left:1.2rem;} ol.q li{margin:.7rem 0;}
ol.q b{color:var(--accent);}
.method{color:var(--dim);font-size:.92rem;}
table{border-collapse:collapse;width:100%;font-size:.86rem;margin:.6rem 0;}
th{font-size:.72rem;letter-spacing:.08em;text-transform:uppercase;color:var(--dim);
  text-align:left;padding:.35rem .55rem;border-bottom:2px solid var(--rule);}
td{padding:.42rem .55rem;border-bottom:1px solid var(--rule);
  font-variant-numeric:tabular-nums;vertical-align:top;}
.tablewrap{overflow-x:auto;}
.flag-inline{color:var(--flagink);font-weight:600;}
.grade h3{font-size:1.15rem;margin:2.2rem 0 .4rem;display:flex;flex-wrap:wrap;gap:.6rem;align-items:baseline;
  border-bottom:2px solid var(--accent);padding-bottom:.35rem;}
.gnote{font-family:'IBM Plex Sans',sans-serif;font-size:.78rem;color:var(--dim);font-weight:400;}
.passage{background:var(--card);border:1px solid var(--rule);border-radius:10px;
  padding:1rem 1.15rem;margin:.9rem 0;}
.passage header{display:flex;justify-content:space-between;align-items:baseline;gap:1rem;}
.passage h4{margin:0;font-size:1.06rem;font-weight:600;}
.pid{font-family:'IBM Plex Mono',monospace;font-size:.74rem;color:var(--dim);}
.topic{color:var(--dim);font-size:.83rem;margin:.15rem 0 .5rem;}
.chips{display:flex;flex-wrap:wrap;gap:.35rem;margin:0 0 .7rem;}
.chip{background:var(--chipbg);border-radius:999px;padding:.13rem .6rem;font-size:.74rem;
  font-family:'IBM Plex Mono',monospace;color:var(--dim);}
.chip.flag{background:var(--flagbg);color:var(--flagink);}
.ptext{font-family:'Source Serif 4',Georgia,serif;font-size:1.02rem;line-height:1.62;
  border-top:1px solid var(--rule);padding-top:.7rem;}
.sign td{height:2.1rem;}
footer{margin-top:3rem;color:var(--dim);font-size:.8rem;border-top:1px solid var(--rule);padding-top:.8rem;}
a{color:var(--accent);}
</style>
<main>
<p class="eyebrow">Clinical review packet · draft — not in use with students</p>
<h1>Progress-Monitoring Form Bank</h1>
<p class="subtitle">Wave 1, batches 1–2 — 60 ORF passages (10 × grades 1–6) and 120 generated math computation forms, for review by Aaron, Dr.&nbsp;Sarah&nbsp;Howorth, and Dr.&nbsp;Garry&nbsp;Wickerd.</p>
<div class="banner">Every readability figure on this page is <b>provisional</b>: Spache and Dale–Chall are list-based formulas, and no score is reported until the reviewers supply or approve the word lists. Grades 1–2 are screened on sentence structure and a provisional phonics inventory; grades 3–6 on Flesch–Kincaid as a stand-in. The machine screen is a filter, not a verdict — your read is the verdict.</div>

<h2>What we need from you</h2>
<ol class="q">
<li><b>Confirm or adjust the readability bands.</b> Each grade header below shows the proposed band (Spache for 1–3, Dale–Chall for 4–6). These are conventional cut-points, not sacred ones. A yes, or adjusted numbers, closes this question.</li>
<li><b>Approve or replace the grade 1–2 taught-pattern inventory.</b> The decodability screen (≤5% of tokens outside taught patterns + sight words) currently runs against a conventional mid-year inventory, summarized below. Approving it — or naming a program-specific scope-and-sequence to swap in — closes this question. A swap re-screens every passage automatically; nothing needs re-authoring unless it newly fails.</li>
<li><b>Grade-6 math mix.</b> Grades 1–5 math forms copy the operation mix of the existing benchmark forms. Grade 6 has no existing form, so its mix is proposed: 6 addition, 6 subtraction, 8 multiplication, 5 division per 25-problem form.</li>
</ol>

<h2>Provisional decodability inventory (grades 1–2)</h2>
<p class="method">Grade 1: closed syllables (CVC/CCVC/CVCC), digraphs <i>sh ch th wh ck</i>, doubled finals, and their <i>-s/-es/-ed/-ing</i> forms. Grade 2 adds: three-consonant blends, silent-e, vowel teams (<i>ai ay ee ea oa ow oo ue ew igh</i>), r-controlled vowels, final <i>-y/-le</i>, and two-closed-syllable words. Sight words are a conventional high-frequency list of about 230 words plus a small schoolroom annex flagged for your attention: <i>school, teacher, book, friend, paper, write</i>. Each passage card lists exactly which words counted against its 5% budget, so every screening decision is auditable.</p>

<h2>Math computation forms</h2>
<div class="tablewrap"><table>
<tr><th>Grade</th><th>Forms</th><th>Problems each</th><th>Operation mix</th><th>Mix source</th></tr>
${mathRows}</table></div>
<p class="method">Forms are generated deterministically, every answer machine-verified, no duplicate problems within a form, no negative differences, no fractional quotients. Operand ranges for grades 1–5 are taken from the existing benchmark forms so the new forms are equivalent by construction.</p>

<h2>The passages</h2>
<p class="method">All 30 pass the machine screen: word count in band, structure/FK in band, ≤3 proper nouns, dialogue under 15%, no banned-content flags, no topic repeated within a grade. Field checking (5–8 readers per grade, WCPM outlier screen) happens after this review.</p>
${passageHtml}

<h2>Sign-off</h2>
<div class="tablewrap"><table class="sign">
<tr><th>Reviewer</th><th>Role</th><th>Bands (Q1)</th><th>Inventory (Q2)</th><th>G6 math (Q3)</th><th>Date</th></tr>
<tr><td>Aaron</td><td>Maintainer, school psychologist</td><td></td><td></td><td></td><td></td></tr>
<tr><td>Dr. Sarah Howorth</td><td>Clinical review</td><td></td><td></td><td></td><td></td></tr>
<tr><td>Dr. Garry Wickerd</td><td>Clinical review</td><td></td><td></td><td></td><td></td></tr>
</table></div>

<footer>Source of truth: <span style="font-family:'IBM Plex Mono',monospace">PM_BANK_FORM_SPEC.md · pm_bank/PM_PASSAGES_DRAFT_WAVE1.json · pm_bank/PM_MATH_FORMS_DRAFT.json</span>. This page is generated from the bank files by <span style="font-family:'IBM Plex Mono',monospace">dev-tools/build_pm_review_packet.cjs</span>; the packet text cannot drift from the bank text. Batches 3–4 (10 more passages per grade) follow the same pipeline once the two questions close.</footer>
</main>
`;

fs.writeFileSync(out, html, 'utf8');
console.log('wrote ' + out + ' (' + (html.length / 1024).toFixed(0) + 'KB)');
