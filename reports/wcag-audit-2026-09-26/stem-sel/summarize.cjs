// Aggregate out/*.json -> aggregate.json + SUMMARY.md
'use strict';
const fs = require('fs'), path = require('path');
const SP = __dirname, ROOT = '/home/user/AlloFlow';
const WCAG = /^wcag(2a|2aa|21a|21aa|22a|22aa)$/;
const OUTDIR = process.env.OUTDIR || (SP + '/out');
const files = fs.readdirSync(OUTDIR).filter((f) => f.endsWith('.json')).sort();
const STF = process.env.STATUSF || (SP + '/runner_status.json'); const status = fs.existsSync(STF) ? JSON.parse(fs.readFileSync(STF, 'utf8')) : {};
const modules = JSON.parse(fs.readFileSync(SP + '/modules.json', 'utf8'));
const allTools = [...new Set([...modules.stem.filter((f) => /stem_tool_/.test(f)), ...modules.sel.filter((f) => /sel_tool_/.test(f))])];

const srcCache = {};
function lines(f) { return srcCache[f] || (srcCache[f] = fs.readFileSync(path.join(ROOT, f), 'utf8').split('\n')); }
const unesc = (s) => s.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'");
function findLine(file, html) {
  const L = lines(file);
  const cands = [];
  const attr = (n) => { const m = new RegExp('\\b' + n + '="([^"]{3,})"').exec(html); return m ? unesc(m[1]) : null; };
  for (const a of ['aria-label', 'id', 'placeholder', 'title', 'aria-describedby', 'data-testid', 'name', 'alt']) { const v = attr(a); if (v) cands.push([a, v]); }
  const txt = unesc(html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim());
  if (txt.length >= 4) { cands.push(['text', txt.slice(0, 40)]); const w = txt.split(/[^A-Za-z0-9' ,.!?:-]+/).filter((x) => x.trim().length >= 6).sort((a, b) => b.length - a.length); if (w[0]) cands.push(['text', w[0].trim().slice(0, 40)]); }
  const cls = attr('class');
  if (cls) { cands.push(['class', cls]); const toks = cls.split(/\s+/); if (toks.length > 3) cands.push(['class', toks.slice(0, 3).join(' ')]); }
  const st = attr('style');
  if (st) {
    const hex = (m) => { const p = m.match(/\d+(\.\d+)?/g).map(Number); return '#' + p.slice(0, 3).map((n) => n.toString(16).padStart(2, '0')).join(''); };
    const colors = (st.match(/#[0-9a-fA-F]{3,8}|rgb\([^)]*\)/g) || []).map((c) => c.startsWith('rgb') ? hex(c) : c);
    const fs = /font-size: (\d+)px/.exec(st);
    if (colors.length) cands.push(['style-color', colors.join('|') + (fs ? '|fontSize: ' + fs[1] : '')]);
    if (colors.length) cands.push(['style-color', colors[colors.length - 1]]);
  }
  const tag = (/^<([a-z0-9]+)/i.exec(html) || [])[1];
  for (const [kind, v] of cands) {
    if (kind === 'style-color') {
      const cs = v.split('|');
      for (let i = 0; i < L.length; i++) if (cs.every((c) => L[i].toLowerCase().includes(c.toLowerCase()))) return { line: i + 1, via: 'style ' + v, text: L[i].trim().slice(0, 160) };
      continue;
    }
    // try with template-id prefixes stripped (ids often built at runtime)
    const variants = [v];
    if (kind === 'id') { const base = v.replace(/[-_]\d+$/, '').replace(/[-_][a-z0-9]{4,}$/i, ''); if (base.length >= 4 && base !== v) variants.push(base); }
    if (kind === 'text' && v.length > 20) variants.push(v.slice(0, 20));
    for (const vv of variants) {
      for (let i = 0; i < L.length; i++) if (L[i].includes(vv)) return { line: i + 1, via: kind + ' "' + vv.slice(0, 50) + '"', text: L[i].trim().slice(0, 160) };
    }
  }
  return { line: null, via: 'not found (tag ' + tag + ')' };
}

const agg = { tools: {}, errored: [], clean: [], byRule: {}, contrast: {} };
for (const tool of allTools) {
  const base = path.basename(tool, '.js');
  const f = OUTDIR + '/' + base + '.json';
  const t = { file: tool, status: status[tool] || (fs.existsSync(f) ? 'ok' : 'missing'), problems: [], ids: [], states: 0, violations: [], contrast: [] };
  agg.tools[tool] = t;
  if (!fs.existsSync(f)) { t.problems.push('no output: ' + t.status); agg.errored.push(tool); continue; }
  const j = JSON.parse(fs.readFileSync(f, 'utf8'));
  const seen = new Map();
  for (const m of j.modes) {
    if (m.error) t.problems.push(m.mode + ': ' + m.error);
    for (const e of (m.errors || [])) if (!t.problems.includes(e)) t.problems.push(e);
    for (const r of (m.results || [])) {
      if (!t.ids.includes(r.id)) t.ids.push(r.id);
      t.states = Math.max(t.states, r.states.length);
      if (r.health.crash) t.problems.push(m.mode + ': ' + r.id + ' crashed on mount');
      if (r.health.selFallback) t.problems.push(m.mode + ': ' + r.id + ' SEL fallback "could not open"');
      if (r.health.stemErr) t.problems.push(m.mode + ': ' + r.id + ' StemLab render error: ' + r.health.stemErr);
      if (r.health.textLen < 20) t.problems.push(m.mode + ': ' + r.id + ' rendered almost nothing (textLen ' + r.health.textLen + ')');
      for (const c of (r.crashes || [])) { const s = m.mode + ': ' + r.id + ' crashed after ' + c; if (!t.problems.some((p) => p.endsWith('crashed after ' + c))) t.problems.push(s); }
      for (const s of r.states) {
        if (s.error) t.problems.push(m.mode + ': axe error at ' + s.label + ': ' + s.error);
        for (const v of (s.fresh || [])) {
          const key = v.id + '|' + v.html.slice(0, 200) + (v.contrast ? '|' + v.contrast.fg + v.contrast.bg : '');
          if (seen.has(key)) { const e = seen.get(key); if (!e.modes.includes(m.mode)) e.modes.push(m.mode); continue; }
          const e = Object.assign({}, v, { tool, toolId: r.id, state: s.label, modes: [m.mode] });
          seen.set(key, e);
        }
      }
    }
  }
  t.problems = [...new Set(t.problems)];
  for (const e of seen.values()) {
    e.src = findLine(tool, e.html);
    if (e.id === 'color-contrast') t.contrast.push(e); else t.violations.push(e);
  }
  if (!t.ids.length && t.problems.every((p) => /no tool registered/.test(p))) { t.nonTool = true; agg.nonTool = (agg.nonTool || []).concat(tool); continue; }
  const hardFail = !t.ids.length || t.problems.some((p) => /crashed on mount|could not open|almost nothing|no tool registered|harness|no output|TIMEOUT/.test(p));
  if (hardFail) agg.errored.push(tool);
  if (!t.violations.length && !t.contrast.length && !hardFail) agg.clean.push(tool);
}
fs.writeFileSync(process.env.AGG || (SP + '/aggregate.json'), JSON.stringify(agg, null, 1));

// ---------- SUMMARY.md ----------
const tr = (s, n) => { s = String(s || ''); return s.length > n ? s.slice(0, n) + '…' : s; };
const md = [];
const toolsArr = Object.values(agg.tools).filter((t) => !t.nonTool);
const nWcag = (t) => t.violations.filter((v) => v.tags.some((x) => WCAG.test(x))).length;
md.push('# STEM Lab + SEL Hub — axe depth audit (WCAG 2.2 A/AA)', '');
md.push('Generated ' + new Date().toISOString() + ' by `' + SP + '/summarize.cjs` from `out/*.json` (per-tool raw) — harness `probe.cjs`.', '');
md.push('## Method', '',
  '- Tool set = the modules the app actually fetches (`stemToolModules` / `selToolModules` in AlloFlowANTI.txt): ' + new Set(modules.stem.filter((f) => /stem_tool_/.test(f))).size + ' unique STEM (stem_tool_forge.js is listed twice) + ' + modules.sel.filter((f) => /sel_tool_/.test(f)).length + ' SEL tool files. `stem_lab/stem_tool_timeline.js` is on disk but NOT in the manifest, so it was not audited.',
  '- Each tool rendered in Chromium through the REAL hub `renderTool` (stem_lab_module.js / sel_hub_module.js), with the manifest support modules loaded, React 18 UMD production, static Tailwind build of stem_lab + sel_hub, the STEM palette from app_styles_module.js, and a ctx whose `update`/`updateMulti` really set state (the repo probe passes no-ops).',
  '- States walked (same as dev-tools/axe_a11y_depth.cjs): baseline → open every `<details>` → click each `[aria-expanded=false]` toggle one by one → click each `[role=tab]` (max 40) and re-open revealed `<details>`; axe after each. Violations are billed to the FIRST state that exposed them. Run in light and dark (dark = theme-dark host, OS `prefers-color-scheme: dark`).',
  '- axe-core 4.12.1, all rules except page-level ones (region, bypass, landmark-one-main, page-has-heading-one) and AAA color-contrast-enhanced. "WCAG A/AA" below = rules tagged wcag2a/2aa/21a/21aa/22aa; best-practice-only rules are listed separately.',
  '- Source lines are a heuristic grep (aria-label/id/placeholder/text/class/inline colour from the snippet): treat as the likely site, verify before editing.',
  '');
md.push('## Totals', '');
md.push('- Tool files audited: ' + toolsArr.length + ' (' + toolsArr.filter((t) => /^stem/.test(t.file)).length + ' STEM, ' + toolsArr.filter((t) => /^sel/.test(t.file)).length + ' SEL); excluded as not-a-tool (registers nothing): ' + (agg.nonTool || []).join(', '));
md.push('- Harness-errored / did not fully render: ' + agg.errored.filter((f) => !(agg.nonTool || []).includes(f)).length);
md.push('- Clean (no violations of any kind, no harness errors): ' + agg.clean.length);
md.push('- Clean of WCAG A/AA (no contrast, no A/AA rule; best-practice findings allowed): ' + toolsArr.filter((t) => !t.contrast.length && !nWcag(t)).length + ' (' + toolsArr.filter((t) => !t.contrast.length && !nWcag(t) && /^stem/.test(t.file)).length + ' STEM, ' + toolsArr.filter((t) => !t.contrast.length && !nWcag(t) && /^sel/.test(t.file)).length + ' SEL)');
md.push('- Tools that CRASHED on a walked state (real product bugs; audit resumed after remount): ' + toolsArr.filter((t) => t.problems.some((p) => /crashed after/.test(p))).map((t) => path.basename(t.file)).join(', '));
md.push('- Tools with ≥1 non-contrast WCAG A/AA violation: ' + toolsArr.filter((t) => nWcag(t)).length);
md.push('- Tools with ≥1 color-contrast violation: ' + toolsArr.filter((t) => t.contrast.length).length);
md.push('');

md.push(fs.existsSync(SP + '/addendum.md') ? fs.readFileSync(SP + '/addendum.md', 'utf8') : '', '');
// by rule (non-contrast)
const byRule = {};
for (const t of toolsArr) for (const v of t.violations) (byRule[v.id] = byRule[v.id] || []).push(v);
const ruleIsWcag = (r) => byRule[r][0].tags.some((x) => WCAG.test(x));
const rules = Object.keys(byRule).sort((a, b) => byRule[b].length - byRule[a].length);
md.push('## Rule index (non-contrast)', '', '| rule | WCAG A/AA? | tags | nodes | tools |', '|---|---|---|---|---|');
for (const r of rules) md.push('| ' + r + ' | ' + (ruleIsWcag(r) ? 'yes' : 'best-practice') + ' | ' + byRule[r][0].tags.join(' ') + ' | ' + byRule[r].length + ' | ' + new Set(byRule[r].map((v) => v.tool)).size + ' |');
md.push('');
const section = (title, pred) => {
  md.push('## ' + title, '');
  for (const r of rules.filter(pred)) {
    md.push('### ' + r + ' — ' + byRule[r][0].help + ' (' + byRule[r][0].impact + '; ' + byRule[r][0].tags.join(', ') + ')', '');
    const byTool = {};
    for (const v of byRule[r]) (byTool[v.tool] = byTool[v.tool] || []).push(v);
    for (const tool of Object.keys(byTool).sort()) {
      md.push('**' + tool + '** (' + byTool[tool].length + ')', '');
      for (const v of byTool[tool].slice(0, 12)) {
        md.push('- state: `' + tr(v.state, 60) + '` [' + v.modes.join('+') + '] — src: ' + (v.src.line ? '`' + tool + ':' + v.src.line + '` (via ' + tr(v.src.via, 60) + ')' : v.src.via));
        md.push('  - `' + tr(v.html, 220).replace(/`/g, "'") + '`');
        if (v.summary) md.push('  - ' + tr(v.summary, 200));
      }
      if (byTool[tool].length > 12) md.push('- … ' + (byTool[tool].length - 12) + ' more in aggregate.json');
      md.push('');
    }
  }
};
section('Non-contrast WCAG A/AA violations, by rule then tool', ruleIsWcag);
section('Best-practice-only findings (not WCAG A/AA failures)', (r) => !ruleIsWcag(r));

// contrast
md.push('## color-contrast (WCAG 1.4.3 AA), by tool', '');
md.push('Grouped by fg/bg/ratio; one example element per group.', '');
for (const t of toolsArr.filter((x) => x.contrast.length).sort((a, b) => b.contrast.length - a.contrast.length)) {
  md.push('**' + t.file + '** — ' + t.contrast.length + ' nodes', '');
  const g = {};
  for (const v of t.contrast) { const k = (v.contrast.fg + ' on ' + v.contrast.bg + ' = ' + v.contrast.ratio + ' (need ' + v.contrast.need + ')'); (g[k] = g[k] || []).push(v); }
  for (const k of Object.keys(g).sort((a, b) => g[b].length - g[a].length).slice(0, 10)) {
    const v = g[k][0];
    const mo = Math.min.apply(null, g[k].map((x) => x.contrast.minOpacity == null ? 1 : x.contrast.minOpacity));
    const tagc = (g[k].some((x) => x.contrast.disabled) ? ' [inside disabled control — exempt]' : '') + (mo < 1 ? ' [dimmed: ancestor opacity ' + mo + ']' : '') + (g[k].some((x) => x.contrast.darkVariant) ? ' [tailwind dark: variant]' : '');
    md.push('- ' + k + tagc + ' ×' + g[k].length + ' — first at `' + tr(v.state, 50) + '` [' + [...new Set(g[k].flatMap((x) => x.modes))].join('+') + '] — src: ' + (v.src.line ? '`' + t.file + ':' + v.src.line + '`' : v.src.via));
    md.push('  - `' + tr(v.html, 200).replace(/`/g, "'") + '`');
  }
  if (Object.keys(g).length > 10) md.push('- … ' + (Object.keys(g).length - 10) + ' more colour pairs in aggregate.json');
  md.push('');
}

md.push('## Harness errors / render problems (separate from violations)', '');
for (const t of toolsArr.filter((x) => x.problems.length)) {
  md.push('- **' + t.file + '**' + (agg.errored.includes(t.file) ? ' (ERRORED — partial or no audit)' : ' (audited; warnings)') + ':');
  for (const p of t.problems.slice(0, 6)) md.push('  - ' + tr(p, 240));
}
md.push('');
md.push('## Clean tools', '', agg.clean.map((f) => '`' + path.basename(f) + '`').join(', ') || '(none)', '');
fs.writeFileSync(process.env.SUMMARY || (SP + '/SUMMARY.md'), md.join('\n'));
console.log('tools', toolsArr.length, 'errored', agg.errored.length, 'clean', agg.clean.length, 'wcag-noncontrast tools', toolsArr.filter((t) => nWcag(t)).length, 'contrast tools', toolsArr.filter((t) => t.contrast.length).length);
console.log('rules:', rules.map((r) => r + ':' + byRule[r].length + '/' + new Set(byRule[r].map((v) => v.tool)).size + (ruleIsWcag(r) ? '' : '(bp)')).join(' '));
