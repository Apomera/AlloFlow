// Education Law Navigator — corpus integrity and the no-fabrication contract.
//
// THE INVARIANT THIS FILE EXISTS TO PROTECT: every word of regulation text the
// tool renders was fetched from the publisher and stamped, and the tool never
// substitutes remembered or generated text when the corpus is missing.
// Hallucinated law is worse than no tool, so these are hard assertions, not
// style checks.
import { describe, it, expect, beforeEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const root = process.cwd();
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const TOOL = 'stem_lab/stem_tool_lawnavigator.js';
const src = read(TOOL);
const manifest = JSON.parse(read('law_corpus/manifest.json'));

describe('Law Navigator corpus', () => {
  it('manifest lists documents with provenance on every entry', () => {
    expect(manifest.documents.length).toBeGreaterThanOrEqual(3);
    for (const d of manifest.documents) {
      expect(d.slug, 'slug').toBeTruthy();
      expect(d.citation, d.slug + ' citation').toBeTruthy();
      expect(d.sourceUrl, d.slug + ' sourceUrl').toMatch(/^https:\/\//);
      expect(d.publisher || d.jurisdictionName, d.slug + ' attribution').toBeTruthy();
      expect(d.retrievedAt, d.slug + ' retrievedAt').toMatch(/^\d{4}-\d{2}-\d{2}$/);
      // Ingested documents must carry real sections; pointer documents must
      // carry ZERO sections (never invented stubs). Only eCFR reports its own
      // currency date — a filed state document carries its effective date in
      // the text, and inventing one here would be a fabricated fact.
      if (d.status === 'ingested') {
        expect(d.sectionCount, d.slug).toBeGreaterThan(0);
        if (d.cfrPart) expect(d.currentAsOf, d.slug + ' currentAsOf').toMatch(/^\d{4}-\d{2}-\d{2}$/);
        else expect(d.docUrl, d.slug + ' must name the document it came from').toBeTruthy();
      } else {
        expect(d.sectionCount, d.slug + ' pointer must have no sections').toBe(0);
      }
    }
  });

  it('every corpus file on disk matches its manifest entry', () => {
    for (const d of manifest.documents) {
      const doc = JSON.parse(read('law_corpus/' + d.slug + '.json'));
      expect(doc.slug).toBe(d.slug);
      expect(doc.sections.length).toBe(d.sectionCount);
      expect(doc.sourceUrl).toBe(d.sourceUrl);
      expect(doc.retrievedAt).toBe(d.retrievedAt);
    }
  });

  it('federal text is real: known sections carry their actual headings', () => {
    const idea = JSON.parse(read('law_corpus/idea-part-b.json'));
    const byNum = Object.fromEntries(idea.sections.map((s) => [s.number, s]));
    // Spot-checks against sections the Parenting Lab rights card relies on.
    expect(byNum['300.111'].heading).toMatch(/child find/i);
    expect(byNum['300.502'].heading).toMatch(/independent educational evaluation/i);
    expect(byNum['300.503'].heading).toMatch(/prior notice/i);
    expect(byNum['300.530'].heading).toMatch(/authority of school personnel/i);
    // And the manifestation machinery really is in 300.530's text.
    const t530 = byNum['300.530'].paragraphs.join(' ');
    expect(t530).toMatch(/manifestation/i);
    expect(t530).toMatch(/10 school days/i);
    const s504 = JSON.parse(read('law_corpus/section-504.json'));
    expect(s504.sections.length).toBeGreaterThan(20);
  });

  it('ingested text is free of unresolved XML entities and stray markup', () => {
    for (const slug of ['idea-part-b', 'section-504']) {
      const doc = JSON.parse(read('law_corpus/' + slug + '.json'));
      const sample = doc.sections.slice(0, 40).map((s) => s.heading + ' ' + s.paragraphs.join(' ')).join(' ');
      expect(sample, slug + ' hex entity').not.toMatch(/&#x[0-9a-f]+;/i);
      expect(sample, slug + ' decimal entity').not.toMatch(/&#\d+;/);
      expect(sample, slug + ' tag').not.toMatch(/<[A-Za-z/][^>]*>/);
    }
  });

  it('every federal citation the topic bridge names exists in the corpus', () => {
    const idea = JSON.parse(read('law_corpus/idea-part-b.json'));
    const have = new Set(idea.sections.map((s) => s.number));
    const cited = [...src.matchAll(/federal:\s*\[([^\]]+)\]/g)]
      .flatMap((m) => [...m[1].matchAll(/'([\d.]+)'/g)].map((x) => x[1]));
    expect(cited.length).toBeGreaterThan(10);
    for (const c of cited) expect(have.has(c), 'topic bridge cites missing § ' + c).toBe(true);
  });
});

describe('Maine MUSER corpus', () => {
  const muser = JSON.parse(read('law_corpus/me-muser.json'));

  it('is fully ingested: all 19 sections, I through XIX, in order', () => {
    expect(muser.status).toBe('ingested');
    const ROMAN = ['I','II','III','IV','V','VI','VII','VIII','IX','X','XI','XII','XIII','XIV','XV','XVI','XVII','XVIII','XIX'];
    expect(muser.sections.map((s) => s.number)).toEqual(ROMAN);
    // Sectioning bugs found while building this: an all-caps rule dropped XVI
    // (mixed-case title) and a digits-suffix rule dropped V ("... 3 - 22").
    // Both must stay present with real content.
    const bySec = Object.fromEntries(muser.sections.map((s) => [s.number, s]));
    expect(bySec.V.heading).toMatch(/EVALUATION AND REEVALUATIONS/i);
    expect(bySec.V.paragraphs.length).toBeGreaterThan(50);
    expect(bySec.XVI.heading).toMatch(/DISPUTE RESOLUTION/i);
    expect(bySec.XVI.paragraphs.length).toBeGreaterThan(50);
  });

  it('carries substantial verbatim text with no Word markup leakage', () => {
    const all = muser.sections.flatMap((s) => s.paragraphs);
    expect(all.length).toBeGreaterThan(2000);
    const joined = all.join(' ');
    expect(joined).not.toMatch(/<w:/);          // raw OOXML
    expect(joined).not.toMatch(/&#x[0-9a-f]+;/i);
    expect(joined).not.toMatch(/&(amp|lt|gt|quot);/);
  });

  it('preserves MUSER\'s own state-vs-federal typographic distinction', () => {
    // MUSER italicizes ITS OWN requirements and leaves adopted federal text
    // in plain type. That flag is what makes "what does Maine add?" answerable
    // without anyone paraphrasing the law.
    for (const s of muser.sections) {
      expect(Array.isArray(s.stateRule), s.number + ' stateRule array').toBe(true);
      expect(s.stateRule.length, s.number + ' flags align with paragraphs').toBe(s.paragraphs.length);
    }
    const flagged = muser.sections.reduce((n, s) => n + s.stateRule.filter(Boolean).length, 0);
    const total = muser.sections.reduce((n, s) => n + s.paragraphs.length, 0);
    // Both kinds must be present — all-or-nothing would mean the flag is broken.
    expect(flagged).toBeGreaterThan(200);
    expect(flagged).toBeLessThan(total);
  });

  it('contains the topics the tool bridges, so state panels are not empty', () => {
    const hay = muser.sections.map((s) => s.paragraphs.join(' ').toLowerCase());
    for (const kw of ['manifestation', 'child find', 'prior written notice', 'independent educational evaluation']) {
      expect(hay.some((h) => h.includes(kw)), 'MUSER should mention ' + kw).toBe(true);
    }
  });

  it('records the document it was extracted from, not just a landing page', () => {
    expect(muser.docUrl).toMatch(/\.docx?$/i);
    expect(muser.sourceUrl).toMatch(/^https:\/\/www\.maine\.gov\//);
    expect(muser.note).toMatch(/italic/i);
  });
});

describe('Law Navigator no-fabrication contract', () => {
  it('the tool file contains no regulation text of its own', () => {
    // Regulation prose in the TOOL would mean text that bypassed ingestion.
    // These phrasings are unmistakably statutory and must live only in corpus JSON.
    for (const tell of [
      /\bshall\s+(?:be\s+)?(?:provide|ensure|conduct|afford)/i,
      /\bpursuant to (?:section|paragraph)\b/i,
      /\bnot later than \d+ (?:days|business days)\b/i,
      /\bas used in this part\b/i
    ]) {
      expect(src, 'statutory prose in tool source').not.toMatch(tell);
    }
  });

  it('refuses to render anything when the corpus fails to load', () => {
    // The failure branch must exist and must be explicit about WHY it is empty.
    expect(src).toMatch(/could not be loaded/i);
    expect(src).toContain('will not display anything from memory');
    // And it must not silently fall through to a default document.
    expect(src).toMatch(/if \(loadErr && !manifest\)/);
  });

  it('never renders regulation text without provenance and a currency date', () => {
    expect(src).toContain('current as of');
    expect(src).toContain('retrieved');
    expect(src).toContain('Verbatim text as published');
    // Staleness must be surfaced, not just stored.
    expect(src).toMatch(/STALE_DAYS\s*=\s*\d+/);
    expect(src).toMatch(/more than six months old/i);
  });

  it('the AI explainer is source-anchored and refuses to fill gaps', () => {
    expect(src).toContain('the ONLY source you may use');
    expect(src).toContain('This passage does not say');
    expect(src).toMatch(/do not give legal advice/i);
    expect(src).toContain('[BEGIN REGULATION PASSAGE]');
    expect(src).toContain('[END REGULATION PASSAGE]');
    // Low temperature: this is retrieval-shaped work, not creative work.
    expect(src).toMatch(/callGemini\(prompt, false, false, 0\.\d/);
    // Prompt-injection boundary: a quoted regulation is DATA, never an
    // instruction to the model.
    expect(src).toContain('UNTRUSTED SOURCE TEXT');
    // Verifiability: the model must quote the passage back so a reader can
    // check the explanation against the text on their own screen.
    expect(src).toContain('In the text:');
    // A failed explanation must leave the official text untouched and say so.
    expect(src).toMatch(/official text above is unchanged/i);
  });

  it('an un-ingested state is reported as un-ingested, never as "no rule"', () => {
    expect(src).toContain('not in the corpus yet');
    expect(src).toContain('will not paraphrase a rule it has not fetched');
    expect(src).toContain('never that the state has no rule');
  });

  it('carries a not-legal-advice disclaimer on every view', () => {
    expect(src).toMatch(/not legal advice/i);
    // `disclaimer` is appended in each returned view, so it must appear
    // in the home, compare, doc, and section branches.
    expect((src.match(/disclaimer\b/g) || []).length).toBeGreaterThanOrEqual(5);
  });
});

describe('Law Navigator live mode', () => {
  // Lift the SHIPPED parser/decoder out of the tool and exercise them directly,
  // so these test the code that actually runs, not a copy.
  const lifted = (() => {
    const start = src.indexOf('function parseLiveSection');
    const end = src.indexOf('function fetchLiveSection');
    expect(start, 'parseLiveSection present').toBeGreaterThan(-1);
    expect(end, 'fetchLiveSection present').toBeGreaterThan(start);
    const box = {};
    new Function('box', src.slice(start, end) + '\nbox.parseLiveSection = parseLiveSection; box.decodeXml = decodeXml;')(box);
    return box;
  })();

  it('decodes hex entities, which eCFR uses heavily', () => {
    // The bug caught during ingestion: a decimal-only decoder leaves "&#xA7;"
    // on screen. Section signs and em dashes are everywhere in the CFR.
    expect(lifted.decodeXml('&#xA7; 300.530')).toBe('§ 300.530');
    expect(lifted.decodeXml('a &#x2014; b')).toBe('a — b');
    expect(lifted.decodeXml('&#8212;')).toBe('—');
    expect(lifted.decodeXml('<E T="03">emph</E> text')).toBe('emph text');
    // &amp; decoded last so &amp;#xA7; does not double-decode into a §.
    expect(lifted.decodeXml('AT&amp;T')).toBe('AT&T');
    expect(lifted.decodeXml('&amp;#xA7;')).toBe('&#xA7;');
  });

  it('extracts exactly the requested section from eCFR XML', () => {
    const xml = '<DIV8 N="300.530" TYPE="SECTION"><HEAD>&#xA7; 300.530 Authority.</HEAD>' +
      '<P>(a) First.</P><P>(b) Second.</P></DIV8>' +
      '<DIV8 N="300.531" TYPE="SECTION"><HEAD>Other</HEAD><P>(a) Not this one.</P></DIV8>';
    const got = lifted.parseLiveSection(xml, '300.530');
    expect(got.heading).toBe('§ 300.530 Authority.');
    expect(got.paragraphs).toEqual(['(a) First.', '(b) Second.']);
    expect(got.paragraphs.join(' ')).not.toMatch(/Not this one/);
    expect(lifted.parseLiveSection(xml, '300.999')).toBeNull();
  });

  it('carries the CFR part for eCFR documents and none for other sources', () => {
    // Live mode is an eCFR capability. A state document ingested from a filed
    // .docx has no CFR endpoint, so it must NOT claim one — the tool disables
    // live refresh for it rather than guessing a URL.
    const federal = manifest.documents.filter((d) => d.jurisdiction === 'federal');
    expect(federal.length).toBeGreaterThanOrEqual(2);
    for (const d of federal) expect(d.cfrPart, d.slug + ' cfrPart').toMatch(/^\d+$/);
    for (const d of manifest.documents.filter((x) => x.jurisdiction !== 'federal')) {
      expect(d.cfrPart, d.slug + ' must not claim a CFR part').toBeFalsy();
    }
  });

  it('tries live first and falls back to the stored copy, labeling which is shown', () => {
    expect(src).toContain('Live from eCFR right now');
    expect(src).toContain('Could not reach eCFR — showing the stored copy');
    expect(src).toContain('Verbatim text, fetched live from eCFR');
    // The fallback must be the CACHED section, never nothing and never invented.
    expect(src).toMatch(/var sec = usingLive \? live\.sec : cachedSec/);
    // A live failure is recorded so the UI can explain, not retried forever.
    expect(src).toContain('_liveFailed[liveKey]');
    // And the reader can force a re-check.
    expect(src).toContain('Check again');
  });

  it('live mode is disabled rather than guessed for non-eCFR documents', () => {
    expect(src).toMatch(/var canLive = !!\(smeta && smeta\.cfrPart\)/);
  });
});

describe('Law Navigator reading supports', () => {
  // Lift the SHIPPED definition indexer and run it over the real corpora.
  const box = (() => {
    const a = src.indexOf('function buildDefIndex');
    const b = src.indexOf('function srLive');
    expect(a, 'buildDefIndex present').toBeGreaterThan(-1);
    const o = { _defIndex: {} };
    new Function('box', 'var _defIndex = box._defIndex;' + src.slice(a, b) +
      'box.buildDefIndex = buildDefIndex; box.definedTermsIn = definedTermsIn;')(o);
    return o;
  })();

  it('indexes real defined terms from both corpora', () => {
    for (const slug of ['idea-part-b', 'me-muser']) {
      const doc = JSON.parse(read('law_corpus/' + slug + '.json'));
      const defs = box.buildDefIndex(doc);
      expect(defs.length, slug + ' defined terms').toBeGreaterThan(15);
      // Every entry must quote real corpus text, never a generated gloss.
      for (const d of defs.slice(0, 20)) {
        expect(d.text.length, d.term).toBeGreaterThan(20);
        expect(d.sectionNumber, d.term).toBeTruthy();
      }
    }
  });

  it('rejects substantive sections that merely contain the word "means"', () => {
    // The first attempt swept in headings like "Applicability of §§ 300.146
    // through 300.147". A definition restates its own term before "means".
    const idea = JSON.parse(read('law_corpus/idea-part-b.json'));
    const terms = box.buildDefIndex(idea).map((d) => d.term.toLowerCase());
    for (const noise of ['applicability of', 'use of amounts', 'definition of individualized education program']) {
      expect(terms.some((t) => t.includes(noise)), 'should not index "' + noise + '"').toBe(false);
    }
    // ...while keeping the genuine ones.
    for (const real of ['free appropriate public education', 'parent', 'evaluation']) {
      expect(terms.includes(real), 'should index "' + real + '"').toBe(true);
    }
  });

  it('surfaces terms used in a section without offering its own definition circularly', () => {
    const idea = JSON.parse(read('law_corpus/idea-part-b.json'));
    const parentDef = idea.sections.find((s) => /^§?\s*300\.30\b/.test(s.heading) || s.number === '300.30');
    if (parentDef) {
      const inOwn = box.definedTermsIn(idea, parentDef, 12).map((t) => t.sectionNumber);
      expect(inOwn.includes(parentDef.number), 'a section must not link to itself').toBe(false);
    }
    const muser = JSON.parse(read('law_corpus/me-muser.json'));
    const safeguards = muser.sections.find((s) => s.number === 'XV');
    expect(box.definedTermsIn(muser, safeguards, 12).length).toBeGreaterThan(0);
  });

  it('offers reading controls that change presentation only', () => {
    expect(src).toContain('Reading controls');
    // Size, spacing, typeface, measure, read-aloud.
    expect(src).toMatch(/readSize/);
    expect(src).toMatch(/readSpacing/);
    expect(src).toMatch(/readSerif/);
    expect(src).toMatch(/maxWidth: readWide/);
    expect(src).toContain('ctx.callTTS');
    // The promise that these never touch the words (comment wraps lines).
    expect(src).toMatch(/changes size\/spacing\/typeface\/measure only/i);
    expect(src).toMatch(/exactly as published/i);
  });

  it('labels quoted definitions as the law\'s own words', () => {
    expect(src).toContain('Words this law defines for itself');
    expect(src).toContain('not a plain-language gloss');
  });
});

describe('Law Navigator cross-references, amendments, saved citations', () => {
  // Lift the SHIPPED linkifier and run it over real corpus paragraphs.
  const lk = (() => {
    const a = src.indexOf('var CITE_RE');
    const b = src.indexOf('var backBtn');
    expect(a, 'CITE_RE present').toBeGreaterThan(-1);
    const h = (tag, props, ...kids) => ({ tag, props, kids });
    const o = {};
    new Function('box', 'h', 'pal', '__alloT', 'goToSection', 'd', 'activeSlug', 'setLN', 'setOpenDef', 'announceToSR',
      src.slice(a, b) + '\nbox.linkify = linkifyCitations;'
    )(o, h, { accent: '#000' }, (k, f) => f, () => {}, {}, 'idea-part-b', () => {}, () => {}, () => {});
    return o;
  })();
  const idea = JSON.parse(read('law_corpus/idea-part-b.json'));

  it('linkifies citations WITHOUT altering a single character', () => {
    // The cardinal rule reaches presentation too: wrapping a citation in a
    // button must not add, drop, or reorder any visible text.
    let checked = 0;
    for (const s of idea.sections.slice(0, 120)) {
      for (const p of s.paragraphs) {
        if (!p.includes('§')) continue;
        const out = lk.linkify(p, idea, s.number);
        const rebuilt = out.map((x) => (typeof x === 'string' ? x : x.kids[0])).join('');
        expect(rebuilt, 'text altered in § ' + s.number).toBe(p);
        checked++;
      }
    }
    expect(checked, 'should have exercised real citation-bearing text').toBeGreaterThan(50);
  });

  it('links only to sections that exist, leaving unresolvable ones plain', () => {
    const have = new Set(idea.sections.map((s) => s.number));
    let links = 0;
    for (const s of idea.sections.slice(0, 120)) {
      for (const p of s.paragraphs) {
        for (const piece of lk.linkify(p, idea, s.number)) {
          if (typeof piece === 'string') continue;
          links++;
          const target = (piece.kids[0].match(/(\d+\.\d+[a-z]?)/) || [])[1];
          expect(have.has(target), 'link to missing § ' + target).toBe(true);
        }
      }
    }
    expect(links).toBeGreaterThan(50);
    // A citation to a nonexistent section stays text, not a dead button.
    const mixed = lk.linkify('See § 999.999 and § 300.530.', idea, '300.111');
    const labels = mixed.filter((x) => typeof x !== 'string').map((x) => x.kids[0]);
    expect(labels).toEqual(['§ 300.530']);
  });

  it('unwinds a citation trail instead of dumping the reader at the list', () => {
    expect(src).toContain('navStack');
    expect(src).toMatch(/navStack\.slice\(0, -1\)/);   // pop on back
    expect(src).toContain('Back to § ');
  });

  it('reports amendment date at the title level and refuses to imply more', () => {
    expect(src).toContain('latest_amended_on');
    expect(src).toContain('Title last amended');
    // The honesty trap named in scoping: no-change-seen is not no-change.
    expect(src).toMatch(/absence of a change here is not evidence of none/i);
  });

  it('saves citations to a neutral shared slice, capped, and shows them in Parenting Lab', () => {
    expect(src).toContain('_alloCitations');
    expect(src).toMatch(/\.slice\(-12\)/);   // snapshot-weight cap
    const pl = read('stem_lab/stem_tool_parentinglab.js');
    expect(pl).toContain('_alloCitations');
    expect(pl).toContain('Rules I want to ask about');
    expect(pl).toContain('Bring the citation, not a paraphrase');
  });
});

describe('Law Navigator renders without a network', () => {
  beforeEach(() => resetStemLab());

  it('renders the loading state instead of throwing when the corpus is unreachable', () => {
    // renderTool() swallows render throws and blanks the tool (Rock Cycle
    // lesson), so a crash here would ship as a silently empty pane. In SSR
    // there is no fetch and effects never run: the tool must still produce
    // a real, honest frame.
    const cfg = loadTool(TOOL, 'lawNavigator');
    expect(typeof cfg.render).toBe('function');
    const html = renderTool('lawNavigator', {});
    expect(typeof html).toBe('string');
    expect(html.length).toBeGreaterThan(100);
    expect(html).toMatch(/Loading the official text/i);
    // Crucially: no regulation text and no invented fallback in this state.
    expect(html).not.toMatch(/shall\s+be\s+provided/i);
  });

  it('quest hooks read defensively from empty state', () => {
    const cfg = loadTool(TOOL, 'lawNavigator');
    for (const q of cfg.questHooks) {
      expect(() => q.check({}), q.id).not.toThrow();
      expect(() => q.check(undefined), q.id + ' undefined').not.toThrow();
      expect(() => q.progress({}), q.id + ' progress').not.toThrow();
    }
  });
});

describe('Law Navigator wiring', () => {
  it('is registered, tiled, plugin-flagged, aliased, and loaded in both ANTI copies', () => {
    expect(src).toContain("registerTool('lawNavigator'");
    const mod = read('stem_lab/stem_lab_module.js');
    expect(mod).toContain("id: 'lawNavigator'");
    expect(mod).toContain('lawNavigator: true');
    expect(mod).toMatch(/lawNavigator: '[^']*section 504/);
    for (const anti of ['AlloFlowANTI.txt', 'desktop/web-app/src/AlloFlowANTI.txt']) {
      expect(read(anti), anti).toContain('stem_lab/stem_tool_lawnavigator.js');
    }
    expect(read('build.js')).toContain('stem_lab/stem_tool_lawnavigator.js');
  });

  it('ships the corpus to the desktop mirror', () => {
    for (const d of manifest.documents) {
      expect(fs.existsSync(path.join(root, 'desktop/web-app/public/law_corpus/' + d.slug + '.json')), d.slug).toBe(true);
    }
    expect(read('desktop/web-app/public/stem_lab/stem_tool_lawnavigator.js')).toBe(src);
  });

  it('Parenting Lab points readers at the verbatim text', () => {
    const pl = read('stem_lab/stem_tool_parentinglab.js');
    expect(pl).toContain('Education Law Navigator');
    expect(pl).toContain('verbatim text');
  });
});
