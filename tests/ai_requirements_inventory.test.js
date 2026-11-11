// ai_requirements.json (which tools need generative AI) vs the tool files, the registry and the
// website catalogue. Runs the logic of dev-tools/check_ai_requirements.cjs against the repo, then
// feeds it bad input to prove each rule can fail: a gate that cannot go red is worse than none.
// Read-only: fixtures are in-memory, nothing is written.
import { describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
const require = createRequire(import.meta.url);
const gate = require('../dev-tools/check_ai_requirements.cjs');
const { scanSource, registerIds, buildRegistry, parseCatalogue, checkInventory, refreshMechanical, resolveCard, rollUp, serialize } = gate;

const ROOT = process.cwd();
const readReal = (rel) => { const p = path.join(ROOT, rel); return fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : null; };
const inventory = JSON.parse(readReal('ai_requirements.json'));

// A tiny fake repo: two STEM tools and one SEL tool.
const QUIET = "window.StemLab.registerTool('quietLab', { render: function (ctx) { ctx.callTTS('hello'); return null; } });";
const TUTOR = "window.StemLab.registerTool('tutorLab', { render: function (ctx) { var callGemini = ctx.callGemini; if (!callGemini) return null; callGemini('explain'); } });";
const CALM = "window.SelHub.registerTool('calm', { render: function () { return null; } });";
const files = () => ({ 'stem_lab/stem_tool_quiet.js': QUIET, 'stem_lab/stem_tool_tutor.js': TUTOR, 'sel_hub/sel_tool_calm.js': CALM });
const registry = () => ({
  stem: new Map([['quietLab', 'stem_lab/stem_tool_quiet.js'], ['tutorLab', 'stem_lab/stem_tool_tutor.js']]),
  sel: new Map([['calm', 'sel_hub/sel_tool_calm.js']])
});
const goodInventory = () => ({
  tools: [
    { id: 'quietLab', family: 'stem', name: 'Quiet Lab', file: 'stem_lab/stem_tool_quiet.js', class: 'none' },
    { id: 'tutorLab', family: 'stem', name: 'Tutor Lab', file: 'stem_lab/stem_tool_tutor.js', class: 'optional', aiAdds: 'a tutor you can ask' },
    { id: 'calm', family: 'sel', name: 'Calm', file: 'sel_hub/sel_tool_calm.js', class: 'none' }
  ]
});
function run(inv, opts) {
  const src = Object.assign(files(), (opts && opts.files) || {});
  return checkInventory({
    inventory: inv, registry: (opts && opts.registry) || registry(), skipMechanical: !(opts && opts.mechanical),
    readFile: (rel) => (rel in src ? src[rel] : null), catalogue: (opts && opts.catalogue) || null
  });
}
const rulesOf = (result) => result.findings.map((f) => f.rule + ':' + f.id);

describe('call-site scanner', () => {
  it.each([
    ["var r = callGemini(prompt, true);", 1],
    ["ctx.callGemini(p).then(done);", 1],
    ["props.onCallGemini(p); window.callGeminiVision(img, p);", 2],
    ["callImagen('a cat', 300); callGeminiImageEdit(img, 'bluer');", 2],
    ["var ask = ctx.callGemini; if (ask) ask('why');", 1],
    ["var cg = (typeof ctx.callGemini === 'function') ? ctx.callGemini : null; cg(p); cg(q);", 2],
    ["ctx.getHint('multtable', q, wrong, right, 2, show);", 1],
    ["ctx.aiChat(prompt, function (r) {}); ctx.generateText(p, {});", 2],
    ["callGemini?.(p);", 1]
  ])('counts %s', (src, n) => {
    expect(scanSource(src).ai).toBe(n);
  });

  it.each([
    ["// callGemini(prompt) was removed here"],
    ["/* callGemini(prompt) */ var x = 1;"],
    ["var callGemini = ctx.callGemini; if (typeof callGemini !== 'function') return;"],
    ["var aiOn = !!ctx.callGemini; h('button', { disabled: !callGemini, style: callGemini ? a : b });"],
    ["function callGemini(prompt) { return fetchIt(prompt); }"],
    ["ctx.callTTS('read this aloud');"],
    ["function getHint(n) { return HINTS[n]; } getHint(2);"]
  ])('does not count %s', (src) => {
    expect(scanSource(src).ai).toBe(0);
  });

  it('tracks read-aloud, microphone and contacted hosts separately from AI', () => {
    const s = scanSource("ctx.callTTS('hi'); var R = window.SpeechRecognition || window.webkitSpeechRecognition;\n" +
      "fetch('https://api.open-meteo.com/v1/forecast?x=1');\n" +
      "h('a', { href: 'https://www.cdc.gov/page' }, 'source');\n" +
      "var u = ['https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/shaders/CopyShader.js'];");
    expect(s.ai).toBe(0);
    expect(s.readAloud).toBe(true);
    expect(s.micCloud).toBe(true);
    expect(s.network).toEqual(['api.open-meteo.com', 'cdn.jsdelivr.net']);
  });

  it('reads registered ids from statements, not from a template held in a string', () => {
    expect(registerIds("  window.StemLab.registerTool('forge', {});\n  \"  window.StemLab.registerTool('myTool', {\",\n  // window.StemLab.registerTool('old', {});"))
      .toEqual(['forge']);
  });
});

describe('the gate can fail (bad input)', () => {
  it('passes the clean fixture', () => {
    expect(run(goodInventory()).findings).toEqual([]);
  });

  it('a "none" tool with an AI call site fails', () => {
    const r = run(goodInventory(), { files: { 'stem_lab/stem_tool_quiet.js': QUIET.replace("ctx.callTTS('hello');", "ctx.callTTS('hello'); ctx.callGemini('sneaky');") } });
    expect(rulesOf(r)).toEqual(['count-vs-class:quietLab']);
  });

  it('an "optional" tool with no call site fails', () => {
    const r = run(goodInventory(), { files: { 'stem_lab/stem_tool_tutor.js': "window.StemLab.registerTool('tutorLab', { render: function () { return null; } });" } });
    expect(rulesOf(r)).toEqual(['count-vs-class:tutorLab']);
  });

  it('read-aloud alone never makes a "none" tool fail', () => {
    expect(scanSource(QUIET).tts).toBe(1);
    expect(run(goodInventory()).findings).toEqual([]);
  });

  it('a registered tool with no record fails', () => {
    const inv = goodInventory();
    inv.tools = inv.tools.filter((t) => t.id !== 'calm');
    expect(rulesOf(run(inv))).toEqual(['missing-record:calm']);
  });

  it('a record with no tool fails, and so does a record pointing at the wrong file', () => {
    const inv = goodInventory();
    inv.tools.push({ id: 'ghost', family: 'stem', name: 'Ghost', file: 'stem_lab/stem_tool_ghost.js', class: 'none' });
    inv.tools[0].file = 'stem_lab/stem_tool_tutor.js';
    const got = rulesOf(run(inv));
    expect(got).toContain('orphan-record:ghost');
    expect(got).toContain('orphan-record:quietLab');
  });

  it('a top-level record whose file is gone fails', () => {
    const inv = goodInventory();
    inv.tools.push({ id: 'wordThing', family: 'app', name: 'Word Thing', file: 'word_thing_module.js', class: 'none' });
    expect(rulesOf(run(inv))).toEqual(['orphan-record:wordThing']);
  });

  it('a catalogue card that disagrees with the inventory fails', () => {
    const r = run(goodInventory(), { catalogue: [{ id: 'tutorLab', ai: 'none' }, { id: 'quietLab', ai: 'none' }] });
    expect(rulesOf(r)).toEqual(['catalogue-mismatch:tutorLab']);
    expect(r.findings[0].message).toMatch(/says ai: "none", the inventory says "optional"/);
  });

  it('a catalogue card the inventory cannot resolve fails', () => {
    expect(rulesOf(run(goodInventory(), { catalogue: [{ id: 'mysteryCard', ai: 'optional' }] }))).toEqual(['catalogue-mismatch:mysteryCard']);
  });

  it('bad records fail: unknown class, optional without aiAdds, duplicate id', () => {
    const inv = goodInventory();
    inv.tools[0].class = 'maybe';
    delete inv.tools[1].aiAdds;
    inv.tools.push(Object.assign({}, inv.tools[2]));
    const got = rulesOf(run(inv));
    expect(got).toContain('bad-record:quietLab');
    expect(got).toContain('bad-record:tutorLab');
    expect(got).toContain('bad-record:calm');
  });

  it('gate:"manual" is skipped AND listed, never silently passed', () => {
    const inv = goodInventory();
    inv.tools[1] = { id: 'tutorLab', family: 'stem', name: 'Tutor Lab', file: 'stem_lab/stem_tool_tutor.js', class: 'none', gate: 'manual', gateNote: 'shares a file' };
    const r = run(inv);
    expect(r.findings).toEqual([]);
    expect(r.skipped).toEqual([{ id: 'tutorLab', why: 'shares a file' }]);
  });

  it('stale mechanical fields fail until refreshed', () => {
    const inv = goodInventory();
    expect(rulesOf(run(inv, { mechanical: true })).every((x) => x.startsWith('stale-mechanical:'))).toBe(true);
    expect(run(inv, { mechanical: true }).findings.length).toBeGreaterThan(0);
    const src = files();
    refreshMechanical(inv, (rel) => src[rel] || null);
    expect(run(inv, { mechanical: true }).findings).toEqual([]);
    expect(inv.tools[0].readAloud).toBe(true);
    expect(inv.tools[1].callSites.text).toBe(1);
  });

  it('--write logic never changes a class: the conflict is reported instead', () => {
    const inv = goodInventory();
    const src = files();
    src['stem_lab/stem_tool_quiet.js'] = QUIET.replace("ctx.callTTS('hello');", "ctx.callGemini('now with AI');");
    const changed = refreshMechanical(inv, (rel) => src[rel] || null);
    expect(changed).toContain('quietLab');
    expect(inv.tools[0].class).toBe('none');
    expect(inv.tools[0].callSites.text).toBe(1);
    expect(rulesOf(run(inv, { files: src, mechanical: true }))).toEqual(['count-vs-class:quietLab']);
  });

  it('catalogue cards can map to a record, several records or a whole family', () => {
    const inv = goodInventory();
    inv.catalogueCards = { cardA: { record: 'tutorLab' }, cardB: { records: ['quietLab', 'tutorLab'] }, hub: { family: 'sel' }, broken: { record: 'nope' } };
    expect(resolveCard('cardA', inv)).toBe('optional');
    expect(resolveCard('cardB', inv)).toBe('optional');
    expect(resolveCard('hub', inv)).toBe('none');
    expect(resolveCard('broken', inv)).toBe(null);
    expect(rollUp(['required', 'required'])).toBe('required');
    expect(rollUp(['none', 'required'])).toBe('optional');
  });

  it('serialises one record per line and round-trips', () => {
    const inv = goodInventory();
    const text = serialize(inv);
    expect(JSON.parse(text)).toEqual(inv);
    expect(text.split('\n').filter((l) => l.includes('"id":')).length).toBe(inv.tools.length);
  });
});

describe('the real inventory', () => {
  const registry = buildRegistry(ROOT);
  const catalogue = parseCatalogue(readReal('tool-catalog-data.js'));
  const result = checkInventory({ inventory, registry, readFile: readReal, catalogue });

  it('finds the registered tools and the catalogue (a check of nothing is not a pass)', () => {
    expect(registry.stem.size).toBeGreaterThan(140);
    expect(registry.sel.size).toBeGreaterThan(60);
    expect(catalogue.length).toBeGreaterThan(25);
    expect(result.records).toBeGreaterThan(220);
  });

  it('agrees with the tool files, the registry and tool-catalog-data.js', () => {
    expect(result.findings.map((f) => '[' + f.rule + '] ' + f.id + ': ' + f.message)).toEqual([]);
  });

  it('keeps the hand-read list short and explained', () => {
    expect(result.skipped.length).toBeLessThanOrEqual(12);
    for (const s of result.skipped) expect(s.why, s.id).toMatch(/\S{3,}/);
  });

  it('every tool in tool_index.json has a record, and deep links only name indexed tools', () => {
    const index = JSON.parse(readReal('tool_index.json')).tools.map((t) => t.id);
    const byId = new Map(inventory.tools.filter((t) => t.family === 'stem').map((t) => [t.id, t]));
    expect(index.filter((id) => !byId.has(id))).toEqual([]);
    expect([...byId.values()].filter((t) => t.deepLink && index.indexOf(t.deepLink) === -1).map((t) => t.id)).toEqual([]);
  });

  it('the tools.html directory badge says what the inventory says', () => {
    const page = readReal('tools.html');
    const byName = new Map(inventory.tools.filter((t) => t.family === 'stem' && t.deepLink).map((t) => [t.name, t]));
    const rows = [...page.matchAll(/<li data-ai="([a-z]+)"><a href="[^"]+">([^<]+)<\/a>.*?<span class="tool-directory-ai">([^<]*)<\/span><\/li>/g)];
    expect(rows.length).toBeGreaterThan(140);
    const unescape = (s) => s.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"');
    const wrong = [];
    for (const [, cls, name, text] of rows) {
      const rec = byName.get(unescape(name));
      const want = !rec ? null : rec.class === 'none' ? 'Works without AI' : rec.class === 'required' ? 'Needs AI' : 'AI adds: ' + rec.aiAdds;
      if (!rec || rec.class !== cls || unescape(text) !== want) wrong.push(name + ' -> ' + cls + ' / ' + text);
    }
    expect(wrong).toEqual([]);
  });

  it('says the directory shows AI needs only next to the badges that back it up', () => {
    const page = readReal('tools.html');
    expect(page).toContain('nothing to install. Each tool shows whether it needs AI.');
    expect(page).toContain('class="tool-directory-ai"');
  });
});

// The finder cards exist three times: tool-catalog-data.js (what the page renders), the static
// cards in tools.html (what a visitor without JavaScript and a crawler see) and the JSON-LD list.
// 2026-11-11: a card injected by tool-finder.js named a tool no file registers, and the
// "Works without AI" filter returned no card at all.
describe('the finder cards', () => {
  const catalogue = parseCatalogue(readReal('tool-catalog-data.js'));
  const page = readReal('tools.html');
  const LABEL = { none: 'Works without AI', optional: 'AI optional', required: 'AI required' };
  const staticCards = [...page.matchAll(/<article class="tool-result-card" data-tool-id="([^"]+)">([\s\S]*?)<\/article>/g)]
    .map((m) => ({ id: m[1], badge: (/tool-badge-ai">([^<]*)</.exec(m[2]) || [])[1], name: (/<h2>([^<]*)<\/h2>/.exec(m[2]) || [])[1] }));

  it('the "Works without AI" filter returns cards, each backed by a counted record', () => {
    const none = catalogue.filter((c) => c.ai === 'none');
    expect(none.length).toBeGreaterThanOrEqual(5);
    const byId = new Map(inventory.tools.map((t) => [t.id, t]));
    for (const card of none) {
      const rec = byId.get(card.id);
      expect(rec && rec.class, card.id).toBe('none');
      expect(rec.gate, card.id + ' must be count-gated, not hand-read').toBeUndefined();
      expect(rec.callSites, card.id).toEqual({ text: 0, vision: 0, image: 0, hint: 0 });
    }
  });

  it('no card is added outside the data file', () => {
    expect(readReal('tool-finder.js')).not.toMatch(/tools\.push\(/);
  });

  it('the static cards are the data cards, in order, with the same AI badge', () => {
    expect(staticCards.map((c) => c.id)).toEqual(catalogue.map((c) => c.id));
    expect(staticCards.filter((c, i) => c.badge !== LABEL[catalogue[i].ai]).map((c) => c.id + ': ' + c.badge)).toEqual([]);
  });

  it('the static count and the structured data list every card once', () => {
    expect(page).toContain('aria-live="polite">' + catalogue.length + ' tools shown</p>');
    const ld = JSON.parse(/<script id="toolCatalogSchema" type="application\/ld\+json">([\s\S]*?)<\/script>/.exec(page)[1]);
    expect(ld.mainEntity.numberOfItems).toBe(catalogue.length);
    expect(ld.mainEntity.itemListElement.map((x) => x.name)).toEqual(catalogue.map((c) => c.name));
    expect(ld.mainEntity.itemListElement.map((x) => x.position)).toEqual(catalogue.map((c, i) => i + 1));
  });
});
