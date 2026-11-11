// ═══════════════════════════════════════════
// stem_tool_a11yauditor.js — Digital Accessibility Auditor
// WCAG 2.2 AA audit tool for websites, HTML, and documents (ADA Title II's legal baseline is WCAG 2.1 AA)
// Students learn about accessibility by auditing real-world content
// ═══════════════════════════════════════════

window.StemLab = window.StemLab || {
  _registry: {}, _order: [],
  registerTool: function(id, config) { config.id = id; config.ready = config.ready !== false; this._registry[id] = config; if (this._order.indexOf(id) === -1) this._order.push(id); console.log('[StemLab] Registered tool: ' + id); },
  getRegisteredTools: function() { var self = this; return this._order.map(function(id) { return self._registry[id]; }).filter(Boolean); },
  isRegistered: function(id) { return !!this._registry[id]; },
  renderTool: function(id, ctx) { var tool = this._registry[id]; if (!tool || !tool.render) return null; try { return tool.render(ctx); } catch(e) { console.error('[StemLab] Error rendering ' + id, e); return null; } }
};

if (!(window.StemLab.isRegistered && window.StemLab.isRegistered('a11yAuditor'))) {

(function() {
  'use strict';
  // ── Reduced motion CSS (WCAG 2.3.3) — shared across all STEAM Lab tools ──
  (function() {
    if (document.getElementById('allo-stem-motion-reduce-css')) return;
    var st = document.createElement('style');
    st.id = 'allo-stem-motion-reduce-css';
    st.textContent = '@media (prefers-reduced-motion: reduce) { *, *::before, *::after { animation-duration: 0.01ms !important; animation-iteration-count: 1 !important; transition-duration: 0.01ms !important; scroll-behavior: auto !important; } }';
    document.head.appendChild(st);
  })();


  // ── Audio (auto-injected) ──
  var _a11yauAC = null;
  function getA11yauAC() { if (!_a11yauAC) { try { _a11yauAC = (window.StemLab && window.StemLab.audioContext ? window.StemLab.audioContext() : new (window.AudioContext || window.webkitAudioContext)()); } catch(e) {} } if (_a11yauAC && _a11yauAC.state === "suspended") { try { _a11yauAC.resume(); } catch(e) {} } return _a11yauAC; }
  function a11yauTone(f,d,tp,v) { var ac = getA11yauAC(); if (!ac) return; try { var o = ac.createOscillator(); var g = ac.createGain(); o.type = tp||"sine"; o.frequency.value = f; g.gain.setValueAtTime(v||0.07, ac.currentTime); g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime+(d||0.1)); o.connect(g); g.connect(ac.destination); o.start(); o.stop(ac.currentTime+(d||0.1)); } catch(e) {} }
  function sfxA11yauClick() { a11yauTone(600, 0.03, "sine", 0.04); }

  // WCAG 4.1.3: Status live region for dynamic content announcements
  (function() {
    if (document.getElementById('allo-live-a11yauditor')) return;
    var liveRegion = document.createElement('div');
    liveRegion.id = 'allo-live-a11yauditor';
    liveRegion.setAttribute('aria-live', 'polite');
    liveRegion.setAttribute('aria-atomic', 'true');
    liveRegion.setAttribute('role', 'status');
    liveRegion.className = 'sr-only';
    liveRegion.style.cssText = 'position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);border:0';
    document.body.appendChild(liveRegion);
  })();


  // ── 10 of the most common WCAG A/AA criteria (WCAG 2.2 AA has 55 in all) ──
  // descKey: a reworded description gets a NEW key, because a registered key's old
  // English (and its translations) would otherwise keep showing.
  var WCAG_CRITERIA = [
    { id: '1.1.1', name: 'Non-text Content', level: 'A', descKey: 'stem.a11yauditor.crit_1_1_1_desc_v2', desc: 'Images, icons, and graphics need a text alternative (alt text) that does the same job, so screen readers can describe them. Purely decorative images get an empty alt="" so screen readers skip them.', impact: 'Without alt text, blind users have no idea what images contain.' },
    { id: '1.3.1', name: 'Info and Relationships', level: 'A', desc: 'Content structure (headings, lists, tables) must be conveyed through proper HTML tags, not just visual formatting.', impact: 'Screen readers use heading tags to navigate. Without them, navigating a page is like reading a book with no chapters.' },
    { id: '1.4.3', name: 'Contrast (Minimum)', level: 'AA', desc: 'Text must have at least 4.5:1 contrast ratio against its background. Large text needs 3:1.', impact: 'Low contrast text is invisible to people with low vision, color blindness, or anyone using a screen in bright sunlight.' },
    { id: '2.1.1', name: 'Keyboard', level: 'A', desc: 'All functionality must work with a keyboard alone — no mouse required.', impact: 'People who cannot use a mouse (motor disabilities, blindness) rely entirely on keyboard navigation.' },
    { id: '2.4.1', name: 'Bypass Blocks', level: 'A', descKey: 'stem.a11yauditor.crit_2_4_1_desc_v2', desc: 'There must be a way to skip blocks that repeat on every page, such as the main menu. A "Skip to main content" link works, and so do proper headings and page landmarks (<main>, <nav>), which screen-reader users can jump between.', impact: 'Without any way to skip, keyboard users must tab through the entire menu on every single page.' },
    { id: '2.4.4', name: 'Link Purpose (In Context)', level: 'A', descKey: 'stem.a11yauditor.crit_2_4_4_desc_v2', desc: 'The purpose of each link must be clear from its text, or from its text together with its context (the sentence, list item, or table cell around it). Vague links like "Click here" are a common failure.', impact: 'Screen readers often list all links on a page. "Click here" repeated 20 times is useless.' },
    { id: '2.4.7', name: 'Focus Visible', level: 'AA', desc: 'When an element receives keyboard focus, it must have a visible indicator (outline, ring, highlight).', impact: 'Without visible focus, keyboard users cannot tell where they are on the page.' },
    { id: '3.1.1', name: 'Language of Page', level: 'A', desc: 'The page must declare its language (e.g., lang="en") so screen readers pronounce words correctly.', impact: 'Without a language tag, a French screen reader might try to pronounce English words with French pronunciation.' },
    { id: '3.3.2', name: 'Labels or Instructions', level: 'A', descKey: 'stem.a11yauditor.crit_3_3_2_desc_v2', desc: 'When a form asks for input, it must give labels or instructions that tell people what to enter. A visible label is best; placeholder text alone is not enough because it disappears once you type. (Connecting the label to the field in code is covered by 1.3.1 and 4.1.2.)', impact: 'When a screen reader reaches an unlabeled input, it says "edit text" — the user has no idea what to type.' },
    { id: '4.1.2', name: 'Name, Role, Value', level: 'A', desc: 'All interactive elements must expose their name, role, and state to assistive technology.', impact: 'A custom dropdown that looks like a dropdown but isn\'t coded as one is invisible to screen readers.' },
  ];

  // The six Level A/AA criteria WCAG 2.2 (W3C Recommendation, October 2023) added to WCAG 2.1.
  var WCAG22_NEW = [
    { id: '2.4.11', name: 'Focus Not Obscured (Minimum)', level: 'AA', key: 'stem.a11yauditor.wcag22_2_4_11_desc', desc: 'When something gets keyboard focus, it must not be completely hidden by content the page itself adds, such as a sticky header, a cookie banner, or a chat button.' },
    { id: '2.5.7', name: 'Dragging Movements', level: 'AA', key: 'stem.a11yauditor.wcag22_2_5_7_desc', desc: 'Anything you can do by dragging (a slider, reordering a list, moving a map) must also work with single taps or clicks, unless dragging is essential.' },
    { id: '2.5.8', name: 'Target Size (Minimum)', level: 'AA', key: 'stem.a11yauditor.wcag22_2_5_8_desc', desc: 'Buttons and other click or tap targets must be at least 24 by 24 CSS pixels, or have enough space around them. There are exceptions, such as a link inside a sentence.' },
    { id: '3.2.6', name: 'Consistent Help', level: 'A', key: 'stem.a11yauditor.wcag22_3_2_6_desc', desc: 'If a site offers help (contact details, a chat, a help page) on several pages, it appears in the same place relative to the rest of each page.' },
    { id: '3.3.7', name: 'Redundant Entry', level: 'A', key: 'stem.a11yauditor.wcag22_3_3_7_desc', desc: 'Information you already entered earlier in the same process is filled in for you or offered to pick, instead of being typed again, unless re-entering it is essential (for example, for security).' },
    { id: '3.3.8', name: 'Accessible Authentication (Minimum)', level: 'AA', key: 'stem.a11yauditor.wcag22_3_3_8_desc', desc: 'Signing in must not depend on a memory or puzzle test (remembering a password, solving a puzzle) unless there is another way, help such as allowing paste and password managers, or the test is only recognizing objects or your own content.' }
  ];
  var WCAG_CRITERIA_IDS = WCAG_CRITERIA.map(function (c) { return c.id; });
  var KNOWBILITY_ITEMS = ['accessu', 'air', 'volunteer', 'air_team', 'learn', 'advocate'];

  // ── AI answers are INPUT: coerce every field to the shape the render expects before saving
  // or showing it. An "issues": "none found" string, an object where a string belongs, or a
  // score of "85%" used to be saved as-is and then crashed the tool on every later open. ──
  function _str(v, max) {
    if (v == null) return '';
    var s;
    if (typeof v === 'string') s = v;
    else if (typeof v === 'number' || typeof v === 'boolean') s = String(v);
    else if (typeof v === 'object') { s = typeof v.text === 'string' ? v.text : typeof v.description === 'string' ? v.description : ''; if (!s) { try { s = JSON.stringify(v); } catch (e) { s = ''; } } }
    else s = '';
    return s.slice(0, max || 2000);
  }
  function _arr(v) { return Array.isArray(v) ? v : (v == null || v === '' ? [] : [v]); }
  function sanitizeAudit(raw) {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
    var score = typeof raw.score === 'number' ? raw.score : parseFloat(raw.score);
    score = isFinite(score) ? (score < 0 ? -1 : Math.min(100, Math.round(score))) : -1;
    var out = {
      score: score,
      grade: _str(raw.grade, 3) || (score >= 90 ? 'A' : score >= 80 ? 'B' : score >= 70 ? 'C' : score >= 60 ? 'D' : score >= 0 ? 'F' : ''),
      summary: _str(raw.summary, 3000),
      issues: _arr(raw.issues).filter(function (x) { return x != null && x !== ''; }).slice(0, 60).map(function (iss) {
        if (typeof iss !== 'object') return { criterion: '', issue: _str(iss, 1000), severity: 'minor', who: '', fix: '' };
        var sev = _str(iss.severity, 20).toLowerCase();
        return { criterion: _str(iss.criterion, 40), issue: _str(iss.issue, 1000), severity: ['critical', 'major', 'minor'].indexOf(sev) >= 0 ? sev : 'minor', who: _str(iss.who, 500), fix: _str(iss.fix, 1000) };
      }),
      strengths: _arr(raw.strengths).map(function (s) { return _str(s, 500); }).filter(Boolean).slice(0, 30),
      recommendation: _str(raw.recommendation, 1000)
    };
    if (raw.score_breakdown && typeof raw.score_breakdown === 'object' && !Array.isArray(raw.score_breakdown)) {
      var bd = {};
      Object.keys(raw.score_breakdown).slice(0, 20).forEach(function (k) {
        var v = raw.score_breakdown[k]; v = typeof v === 'number' ? v : parseFloat(v);
        if (isFinite(v)) bd[_str(k, 30)] = Math.max(0, Math.min(10, Math.round(v)));
      });
      out.score_breakdown = bd;
    }
    if (raw.title_ii && typeof raw.title_ii === 'object' && !Array.isArray(raw.title_ii)) {
      var t2 = {};
      ['ada_coordinator', 'accessibility_statement', 'grievance_procedure', 'compliant_forms', 'tagged_pdfs', 'captioned_videos'].forEach(function (k) { t2[k] = raw.title_ii[k] === true; });
      out.title_ii = t2;
    }
    if (raw._triangulated) { out._triangulated = true; out._passCount = Math.max(0, Math.min(3, parseInt(raw._passCount, 10) || 0)); }
    return out;
  }
  function sanitizeMeasured(raw) {
    if (!raw || typeof raw !== 'object' || raw.ok !== true) return null;
    function items(list) {
      return _arr(list).filter(function (x) { return x && typeof x === 'object'; }).slice(0, 80).map(function (x) {
        return { key: _str(x.key, 60), criterion: _str(x.criterion, 200), wcag: _str(x.wcag, 20), severity: _str(x.severity, 20), detail: _str(x.detail, 600) };
      });
    }
    return {
      ok: true, findings: items(raw.findings), warnings: items(raw.warnings), bestPractice: items(raw.bestPractice),
      passed: _arr(raw.passed).map(function (s) { return _str(s, 300); }).filter(Boolean).slice(0, 40),
      notChecked: _arr(raw.notChecked).filter(function (x) { return x && typeof x === 'object'; }).slice(0, 20).map(function (x) { return { id: _str(x.id, 40), text: _str(x.text, 600) }; })
    };
  }

  var AUDIT_BADGES = [
    { id: 'first_audit', icon: '\uD83D\uDD0D', name: 'First Audit', desc: 'Complete your first accessibility audit', check: function(s) { return s.auditsCompleted >= 1; } },
    { id: 'five_audits', icon: '\uD83D\uDCCA', name: 'Pattern Spotter', desc: 'Complete 5 audits', check: function(s) { return s.auditsCompleted >= 5; } },
    { id: 'perfect_find', icon: '\uD83C\uDFAF', name: 'Eagle Eye', desc: 'Find a document with score below 30', check: function(s) { return s.worstScore < 30 && s.worstScore >= 0; } },
    { id: 'advocate', icon: '\u270A', name: 'Accessibility Advocate', desc: 'Audit 3 different websites', check: function(s) { return s.uniqueSites >= 3; } },
    { id: 'expert', icon: '\uD83C\uDFC5', name: 'WCAG Expert', descKey: 'stem.a11yauditor.expert_desc_v2', desc: 'Explore all 10 common criteria in Learn', check: function(s) { return s.criteriaExplored >= 10; } },
    { id: 'reporter', icon: '\uD83D\uDCCB', name: 'Compliance Reporter', desc: 'Download an audit report', check: function(s) { return s.reportsDownloaded >= 1; } },
    { id: 'change_agent', icon: '\uD83D\uDCE3', name: 'Change Agent', desc: 'Generate your first accessibility complaint', check: function(s) { return s.complaintsGenerated >= 1; } },
    { id: 'social_scout', icon: '\uD83D\uDCF1', name: 'Social Media Scout', desc: 'Audit 3 social media posts', check: function(s) { return s.socialAudits >= 3; } },
    { id: 'title2_expert', icon: '\u2696\uFE0F', name: 'Title II Expert', desc: 'Complete a government website audit', check: function(s) { return s.govAudits >= 1; } },
    { id: 'knowbility_ally', icon: '\u267F', name: 'Knowbility Ally', descKey: 'stem.a11yauditor.knowbility_ally_desc_v2', desc: 'Explore 3 Knowbility programs or ways to get involved', check: function(s) { return s.knowbilityExplored >= 3; } },
  ];

  /* ============ Deterministic a11y linter (MEASURED ground truth; separate from the AI passes) ============ */
  // Parses the pasted HTML with DOMParser and counts objectively-checkable WCAG failures.
  // CSP-safe, no eval. Exposed on window.__alloA11yPure for unit tests.
  // Three result kinds, kept apart on purpose so a student never reads one as another:
  //   findings     - WCAG failures the code can prove (missing alt, no accessible name, inline contrast...)
  //   warnings     - likely problems that need a person to confirm (generic link text in context, outline:none...)
  //   bestPractice - good habits that are NOT WCAG failures (one h1, no skipped heading levels)
  // plus notChecked, the parts of WCAG this code cannot see, so "no findings" is never read as "passes WCAG".
  var __alloA11yPure = (function () {
    var NAMED = { black:[0,0,0], white:[255,255,255], red:[255,0,0], green:[0,128,0], lime:[0,255,0], blue:[0,0,255], navy:[0,0,128], yellow:[255,255,0], orange:[255,165,0], purple:[128,0,128], gray:[128,128,128], grey:[128,128,128], silver:[192,192,192], maroon:[128,0,0], olive:[128,128,0], teal:[0,128,128], aqua:[0,255,255], cyan:[0,255,255], fuchsia:[255,0,255], magenta:[255,0,255],
      lightgray:[211,211,211], lightgrey:[211,211,211], darkgray:[169,169,169], darkgrey:[169,169,169], dimgray:[105,105,105], dimgrey:[105,105,105], gainsboro:[220,220,220], whitesmoke:[245,245,245], slategray:[112,128,144], slategrey:[112,128,144], lightslategray:[119,136,153], darkslategray:[47,79,79],
      lightblue:[173,216,230], skyblue:[135,206,235], lightskyblue:[135,206,250], deepskyblue:[0,191,255], dodgerblue:[30,144,255], steelblue:[70,130,180], royalblue:[65,105,225], cornflowerblue:[100,149,237], darkblue:[0,0,139], midnightblue:[25,25,112], mediumblue:[0,0,205], powderblue:[176,224,230], aliceblue:[240,248,255],
      lightgreen:[144,238,144], palegreen:[152,251,152], darkgreen:[0,100,0], forestgreen:[34,139,34], seagreen:[46,139,87], limegreen:[50,205,50], yellowgreen:[154,205,50], olivedrab:[107,142,35], mediumseagreen:[60,179,113], springgreen:[0,255,127], honeydew:[240,255,240], mintcream:[245,255,250],
      pink:[255,192,203], lightpink:[255,182,193], hotpink:[255,105,180], deeppink:[255,20,147], darkred:[139,0,0], crimson:[220,20,60], firebrick:[178,34,34], indianred:[205,92,92], salmon:[250,128,114], lightsalmon:[255,160,122], darksalmon:[233,150,122], coral:[255,127,80], tomato:[255,99,71], orangered:[255,69,0], darkorange:[255,140,0],
      gold:[255,215,0], khaki:[240,230,140], darkkhaki:[189,183,107], lightyellow:[255,255,224], lemonchiffon:[255,250,205], beige:[245,245,220], ivory:[255,255,240], wheat:[245,222,179], tan:[210,180,140], burlywood:[222,184,135], brown:[165,42,42], sienna:[160,82,45], chocolate:[210,105,30], peru:[205,133,63], saddlebrown:[139,69,19], linen:[250,240,230], snow:[255,250,250], seashell:[255,245,238], oldlace:[253,245,230], cornsilk:[255,248,220], floralwhite:[255,250,240], ghostwhite:[248,248,255], lavender:[230,230,250], lavenderblush:[255,240,245], mistyrose:[255,228,225], antiquewhite:[250,235,215], papayawhip:[255,239,213], blanchedalmond:[255,235,205], bisque:[255,228,196], moccasin:[255,228,181], navajowhite:[255,222,173], peachpuff:[255,218,185],
      indigo:[75,0,130], violet:[238,130,238], plum:[221,160,221], orchid:[218,112,214], thistle:[216,191,216], darkviolet:[148,0,211], darkorchid:[153,50,204], mediumpurple:[147,112,219], blueviolet:[138,43,226], rebeccapurple:[102,51,153], darkmagenta:[139,0,139], slateblue:[106,90,205], darkslateblue:[72,61,139],
      turquoise:[64,224,208], mediumturquoise:[72,209,204], darkturquoise:[0,206,209], lightseagreen:[32,178,170], darkcyan:[0,139,139], aquamarine:[127,255,212], cadetblue:[95,158,160], lightcyan:[224,255,255], azure:[240,255,255] };
    function _clamp(v, lo, hi) { return Math.min(hi, Math.max(lo, v)); }
    function _num(s, scale) { s = String(s).trim(); if (/%$/.test(s)) return parseFloat(s) / 100 * scale; return parseFloat(s); }
    function _hsl(hh, ss, ll) {
      hh = ((hh % 360) + 360) % 360 / 360; ss = _clamp(ss, 0, 1); ll = _clamp(ll, 0, 1);
      if (ss === 0) { var g = Math.round(ll * 255); return [g, g, g]; }
      var q = ll < 0.5 ? ll * (1 + ss) : ll + ss - ll * ss, p = 2 * ll - q;
      function hue(t2) { if (t2 < 0) t2 += 1; if (t2 > 1) t2 -= 1; if (t2 < 1 / 6) return p + (q - p) * 6 * t2; if (t2 < 1 / 2) return q; if (t2 < 2 / 3) return p + (q - p) * (2 / 3 - t2) * 6; return p; }
      return [Math.round(hue(hh + 1 / 3) * 255), Math.round(hue(hh) * 255), Math.round(hue(hh - 1 / 3) * 255)];
    }
    // Returns [r, g, b, alpha] or null when the value is not a colour this code can read.
    function parseColorAlpha(s) {
      if (s == null) return null;
      s = String(s).replace(/!important/i, '').trim().toLowerCase();
      if (!s) return null;
      if (s === 'transparent') return [0, 0, 0, 0];
      if (NAMED[s]) return NAMED[s].concat([1]);
      var m = s.match(/^#([0-9a-f]{3,4})$/);
      if (m) { var a = m[1]; return [parseInt(a[0] + a[0], 16), parseInt(a[1] + a[1], 16), parseInt(a[2] + a[2], 16), a.length === 4 ? parseInt(a[3] + a[3], 16) / 255 : 1]; }
      m = s.match(/^#([0-9a-f]{6}|[0-9a-f]{8})$/);
      if (m) { var b = m[1]; return [parseInt(b.slice(0, 2), 16), parseInt(b.slice(2, 4), 16), parseInt(b.slice(4, 6), 16), b.length === 8 ? parseInt(b.slice(6, 8), 16) / 255 : 1]; }
      m = s.match(/^(rgba?|hsla?)\(\s*([^)]*)\)$/);
      if (m) {
        var parts = m[2].split(/\s*[,\/]\s*|\s+/).filter(Boolean);
        if (parts.length < 3) return null;
        var alpha = parts.length > 3 ? _num(parts[3], 1) : 1;
        if (!isFinite(alpha)) return null;
        alpha = _clamp(alpha, 0, 1);
        if (m[1].charAt(0) === 'r') {
          var rgb = [0, 1, 2].map(function (i) { return _num(parts[i], 255); });
          if (rgb.some(function (v) { return !isFinite(v); })) return null;
          return rgb.map(function (v) { return Math.round(_clamp(v, 0, 255)); }).concat([alpha]);
        }
        var hh = parseFloat(parts[0]), ss = parseFloat(parts[1]) / 100, ll = parseFloat(parts[2]) / 100;
        if (!isFinite(hh) || !isFinite(ss) || !isFinite(ll)) return null;
        return _hsl(hh, ss, ll).concat([alpha]);
      }
      return null;
    }
    function parseColor(s) { var c = parseColorAlpha(s); return c ? c.slice(0, 3) : null; }
    // Paint `top` (with alpha) over an opaque `under`.
    function composite(top, under) { var a = top[3] == null ? 1 : top[3]; return [0, 1, 2].map(function (i) { return Math.round(top[i] * a + under[i] * (1 - a)); }).concat([1]); }
    function _lin(c) { c = c / 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); }
    function relLum(rgb) { if (!rgb) return null; return 0.2126 * _lin(rgb[0]) + 0.7152 * _lin(rgb[1]) + 0.0722 * _lin(rgb[2]); }
    function contrastRatio(fg, bg) { var l1 = relLum(fg), l2 = relLum(bg); if (l1 == null || l2 == null) return null; var hi = Math.max(l1, l2), lo = Math.min(l1, l2); return (hi + 0.05) / (lo + 0.05); }
    function _all(doc, sel) { try { return [].slice.call(doc.querySelectorAll(sel)); } catch (e) { return []; } }
    function _styleProp(el, prop) {
      var st = (el && el.getAttribute && el.getAttribute('style')) || '';
      var re = new RegExp('(?:^|;)\\s*' + prop + '\\s*:\\s*([^;]+)', 'i'), m = st.match(re);
      return m ? m[1].trim() : null;
    }
    function _hidden(el) {
      for (var n = el; n && n.getAttribute; n = n.parentNode) {
        if (n.hasAttribute('hidden') || n.getAttribute('aria-hidden') === 'true') return true;
        var disp = _styleProp(n, 'display'), vis = _styleProp(n, 'visibility');
        if ((disp && /^none\b/i.test(disp)) || (vis && /^hidden\b/i.test(vis))) return true;
      }
      return false;
    }
    // Text a screen reader would take from an element's content: text nodes, plus the alt of
    // images and the label of nested named elements, skipping anything aria-hidden.
    function _contentName(el, doc, depth) {
      if (!el || depth > 20) return '';
      var out = '';
      for (var i = 0; i < el.childNodes.length; i++) {
        var c = el.childNodes[i];
        if (c.nodeType === 3) { out += c.nodeValue; continue; }
        if (c.nodeType !== 1 || c.getAttribute('aria-hidden') === 'true' || c.hasAttribute('hidden')) continue;
        var tag = c.tagName;
        if (tag === 'IMG' || (tag === 'INPUT' && (c.getAttribute('type') || '').toLowerCase() === 'image')) { out += ' ' + (c.getAttribute('alt') || c.getAttribute('aria-label') || '') + ' '; continue; }
        if (tag === 'SVG' || tag === 'svg') { var tt = c.querySelector && c.querySelector('title'); out += ' ' + (c.getAttribute('aria-label') || (tt ? tt.textContent : '')) + ' '; continue; }
        if (tag === 'SCRIPT' || tag === 'STYLE' || tag === 'TEMPLATE') continue;
        var al = (c.getAttribute('aria-label') || '').trim();
        out += ' ' + (al || _contentName(c, doc, depth + 1)) + ' ';
      }
      return out.replace(/\s+/g, ' ').trim();
    }
    // A simplified version of the W3C accessible-name algorithm for the elements this linter checks.
    // Returns { name, missingIds } where missingIds lists aria-labelledby ids that point at nothing.
    function accessibleName(el, doc, opts) {
      opts = opts || {};
      var missing = [];
      var lb = (el.getAttribute('aria-labelledby') || '').trim();
      if (lb) {
        var txt = lb.split(/\s+/).map(function (id) {
          var ref = doc.getElementById(id);
          if (!ref) { missing.push(id); return ''; }
          return (ref.getAttribute('aria-label') || '').trim() || _contentName(ref, doc, 0) || (ref.getAttribute('alt') || '');
        }).join(' ').replace(/\s+/g, ' ').trim();
        if (txt) return { name: txt, missingIds: missing };
      }
      var al = (el.getAttribute('aria-label') || '').trim();
      if (al) return { name: al, missingIds: missing };
      if (opts.alt && el.hasAttribute('alt')) return { name: (el.getAttribute('alt') || '').trim(), missingIds: missing, altAttr: true };
      if (opts.label) { var lab = opts.label(el); if (lab) return { name: lab, missingIds: missing }; }
      if (opts.value) { var v = (el.getAttribute('value') || '').trim(); if (v) return { name: v, missingIds: missing }; }
      if (opts.content) { var cn = _contentName(el, doc, 0); if (cn) return { name: cn, missingIds: missing }; }
      var ti = (el.getAttribute('title') || '').trim();
      if (ti) return { name: ti, missingIds: missing, fromTitle: true };
      return { name: '', missingIds: missing };
    }
    var GENERIC_LINK_TEXT = ['click here', 'here', 'click', 'read more', 'more', 'learn more', 'more info', 'more information', 'link', 'this link', 'details', 'go', 'continue'];
    // The parts of WCAG this linter cannot judge. Always reported, so silence is never read as a pass.
    var NOT_CHECKED = [
      { id: 'keyboard', text: 'Whether everything works with a keyboard and nothing traps focus (2.1.1, 2.1.2): try it yourself with Tab, Shift+Tab, Enter and Escape.' },
      { id: 'focus', text: 'Focus order and whether the focus indicator is visible on screen (2.4.3, 2.4.7).' },
      { id: 'alt_quality', text: 'Whether alt text is accurate and useful: code can see that alt text exists, not that it describes the image (1.1.1).' },
      { id: 'media', text: 'Captions, transcripts and audio description for video and audio (1.2.x).' },
      { id: 'css_contrast', text: 'Contrast of colours set in <style> blocks, CSS files or class names: only inline style="" colours are measured (1.4.3, 1.4.11).' },
      { id: 'reflow', text: 'Zoom to 200%, reflow on a narrow screen, and text spacing (1.4.4, 1.4.10, 1.4.12).' },
      { id: 'wcag22', text: 'WCAG 2.2 checks such as target size, dragging alternatives and focus hidden behind sticky headers (2.4.11, 2.5.7, 2.5.8).' },
      { id: 'meaning', text: 'Whether colour alone carries meaning, and whether instructions, headings and labels make sense (1.4.1, 2.4.6, 3.3.2).' }
    ];
    function deterministicAudit(html) {
      var findings = [], warnings = [], bestPractice = [], passed = [], notChecked = NOT_CHECKED.slice(), doc;
      if (typeof DOMParser === 'undefined') return { ok: false, findings: [], warnings: [], bestPractice: [], passed: [], notChecked: notChecked, error: 'DOMParser unavailable' };
      var src = String(html || '');
      try { doc = new DOMParser().parseFromString(src, 'text/html'); } catch (e) { return { ok: false, findings: [], warnings: [], bestPractice: [], passed: [], notChecked: notChecked, error: 'Could not parse HTML' }; }
      if (!doc || !doc.body) return { ok: false, findings: [], warnings: [], bestPractice: [], passed: [], notChecked: notChecked };
      function add(key, criterion, wcag, severity, detail) { findings.push({ key: key, criterion: criterion, wcag: wcag, severity: severity, detail: detail }); }
      function warn(key, criterion, wcag, detail) { warnings.push({ key: key, criterion: criterion, wcag: wcag, severity: 'review', detail: detail }); }
      function bp(key, criterion, detail) { bestPractice.push({ key: key, criterion: criterion, wcag: 'best practice', severity: 'minor', detail: detail }); }
      var fullDoc = /<html[\s>]/i.test(src);
      var missingRefs = [];
      function noteMissing(r) { if (r && r.missingIds && r.missingIds.length) missingRefs = missingRefs.concat(r.missingIds); }

      // 1.1.1 images: <img> needs alt (alt="" marks it decorative) or another accessible name.
      var imgs = _all(doc, 'img').filter(function (im) { return !_hidden(im); });
      var noAlt = imgs.filter(function (im) {
        if (im.hasAttribute('alt')) return false;
        var role = (im.getAttribute('role') || '').toLowerCase();
        if (role === 'presentation' || role === 'none') return false;
        var r = accessibleName(im, doc, {}); noteMissing(r);
        return !r.name;
      });
      if (noAlt.length) add('lint_img_alt', 'Images missing alt text', '1.1.1', 'serious', noAlt.length + ' of ' + imgs.length + ' <img> have no alt attribute or other text alternative (use alt="" for purely decorative images)');
      else if (imgs.length) passed.push('All ' + imgs.length + ' images have alt text or another text alternative');
      var imgInputs = _all(doc, 'input').filter(function (c) { return (c.getAttribute('type') || '').toLowerCase() === 'image' && !_hidden(c); });
      var badImgInputs = imgInputs.filter(function (c) { var r = accessibleName(c, doc, { alt: true }); noteMissing(r); return !r.name; });
      if (badImgInputs.length) add('lint_input_image_alt', 'Image buttons missing alt text', '1.1.1', 'serious', badImgInputs.length + ' <input type="image"> with no alt text, so a screen reader cannot say what the button does');

      // Headings: one h1 and no skipped levels are good habits, NOT WCAG failures (axe also files them as best practice).
      var headings = _all(doc, 'h1,h2,h3,h4,h5,h6'), levels = headings.map(function (hd) { return parseInt(hd.tagName.charAt(1), 10); });
      var skips = [];
      for (var i = 1; i < levels.length; i++) { if (levels[i] - levels[i - 1] > 1) skips.push('h' + levels[i - 1] + ' → h' + levels[i]); }
      var h1count = levels.filter(function (l) { return l === 1; }).length;
      if (skips.length) bp('lint_bp_heading_skip', 'Heading level skipped', 'Jumps: ' + skips.join(', ') + '. Not a WCAG failure, but an outline without gaps is easier to navigate.');
      if (headings.length && h1count === 0) bp('lint_bp_no_h1', 'No h1 heading', 'Headings exist but there is no <h1>. Most pages are easier to navigate with one main heading.');
      if (h1count > 1) bp('lint_bp_multi_h1', 'Several h1 headings', h1count + ' <h1> elements. Allowed by WCAG; one main heading is the usual habit.');
      var emptyHeadings = headings.filter(function (hd) { return !_hidden(hd) && !_contentName(hd, doc, 0) && !(hd.getAttribute('aria-label') || '').trim(); }).length;
      if (emptyHeadings) add('lint_empty_heading', 'Empty headings', '1.3.1', 'moderate', emptyHeadings + ' heading element(s) with no text: screen readers announce a heading with nothing in it');
      if (headings.length && !skips.length && h1count === 1) passed.push('Heading outline is sequential under a single h1');

      // 3.3.2 form controls need a label or instructions; 4.1.2 needs a programmatic name.
      var controls = _all(doc, 'input,select,textarea').filter(function (c) {
        var type = (c.getAttribute('type') || '').toLowerCase();
        if (c.tagName === 'INPUT' && ['hidden', 'submit', 'button', 'reset', 'image'].indexOf(type) >= 0) return false;
        return !_hidden(c);
      });
      function labelText(c) {
        var id = c.getAttribute('id'), txt = '';
        if (id) _all(doc, 'label').forEach(function (l) { if (l.getAttribute('for') === id) txt += ' ' + _contentName(l, doc, 0); });
        for (var pn = c.parentNode; pn && pn.tagName; pn = pn.parentNode) { if (pn.tagName === 'LABEL') { txt += ' ' + _contentName(pn, doc, 0); break; } }
        return txt.replace(/\s+/g, ' ').trim();
      }
      var unlabeled = 0, invisibleOnly = 0, placeholderOnly = 0;
      controls.forEach(function (c) {
        var vis = labelText(c);
        if (vis) return;
        var r = accessibleName(c, doc, {}); noteMissing(r);
        if (r.name) { invisibleOnly++; return; }
        if ((c.getAttribute('placeholder') || '').trim()) placeholderOnly++;
        unlabeled++;
      });
      if (unlabeled) add('lint_form_label', 'Form fields without labels', '3.3.2', 'serious', unlabeled + ' control(s) with no label' + (placeholderOnly ? ' (' + placeholderOnly + ' rely on placeholder text, which disappears once you type)' : ''));
      if (invisibleOnly) warn('lint_form_label_invisible', 'Fields named only for screen readers', '3.3.2', invisibleOnly + ' control(s) have an aria-label or title but no visible <label>. Screen readers can name them; sighted users may still need a visible label or instructions.');
      if (controls.length && !unlabeled && !invisibleOnly) passed.push('All ' + controls.length + ' form controls have a visible label');

      // 3.1.1 language and 2.4.2 page title: only meaningful when a whole document was pasted.
      if (fullDoc) {
        var htmlEl = doc.documentElement, lang = htmlEl ? (htmlEl.getAttribute('lang') || '').trim() : '';
        if (!lang) add('lint_lang', 'Missing lang attribute', '3.1.1', 'serious', '<html> has no lang attribute (or it is empty)');
        else passed.push('Page language is declared (lang="' + lang + '")');
        var title = doc.querySelector('title');
        if (!title || !(title.textContent || '').trim()) add('lint_page_title', 'Page has no title', '2.4.2', 'moderate', 'The document has no <title> (or it is empty), so the browser tab and screen readers have nothing to announce');
        else passed.push('Page has a title');
      }

      // 2.4.4 links (only <a href> is a link) and 4.1.2 buttons.
      var links = _all(doc, 'a[href]').filter(function (a) { return !_hidden(a); });
      var emptyLinks = 0, generic = [], byText = {};
      links.forEach(function (a) {
        var r = accessibleName(a, doc, { content: true }); noteMissing(r);
        var nm = r.name;
        if (!nm) { emptyLinks++; return; }
        var norm = nm.toLowerCase().replace(/[\s.,:;!?…>›»→-]+$/g, '').replace(/^[\s«<-]+/, '').trim();
        if (GENERIC_LINK_TEXT.indexOf(norm) >= 0) generic.push(nm);
        var href = (a.getAttribute('href') || '').trim();
        (byText[norm] = byText[norm] || {})[href] = true;
      });
      if (emptyLinks) add('lint_link_empty', 'Links with no text', '2.4.4', 'serious', emptyLinks + ' link(s) with no discernible text');
      if (generic.length) add('lint_link_generic', 'Vague link text', '2.4.4', 'moderate', generic.length + ' link(s) say only "' + generic.slice(0, 3).join('", "') + '". In a list of links this tells a screen-reader user nothing. WCAG 2.4.4 allows the surrounding sentence to explain a link; descriptive link text is the reliable fix.');
      var dupTexts = Object.keys(byText).filter(function (k) { return k && GENERIC_LINK_TEXT.indexOf(k) < 0 && Object.keys(byText[k]).length > 1; });
      if (dupTexts.length) warn('lint_link_same_text', 'Same link text, different places', '2.4.4', dupTexts.length + ' link text(s) go to different addresses (e.g. "' + dupTexts[0] + '"). Check that each one can be told apart.');
      if (links.length && !emptyLinks && !generic.length) passed.push('All ' + links.length + ' links have text');

      var btns = _all(doc, 'button,[role="button"],input[type="button"],input[type="submit"],input[type="reset"]').filter(function (b) { return !_hidden(b); });
      var emptyBtns = btns.filter(function (b) {
        var type = b.tagName === 'INPUT' ? (b.getAttribute('type') || '').toLowerCase() : '';
        if (type === 'submit' || type === 'reset') return false; // browsers supply a default name ("Submit", "Reset")
        var r = accessibleName(b, doc, { content: b.tagName !== 'INPUT', value: b.tagName === 'INPUT' }); noteMissing(r);
        return !r.name;
      }).length;
      if (emptyBtns) add('lint_button_name', 'Buttons with no accessible name', '4.1.2', 'serious', emptyBtns + ' button(s) with no text, image alt text, aria-label or title');
      else if (btns.length) passed.push('All ' + btns.length + ' buttons have an accessible name');

      // 4.1.2 frames need a title so screen-reader users know what is inside.
      var frames = _all(doc, 'iframe,frame').filter(function (f) { return !_hidden(f); });
      var untitled = frames.filter(function (f) { var r = accessibleName(f, doc, {}); noteMissing(r); return !r.name; }).length;
      if (untitled) add('lint_iframe_title', 'Frames without a title', '4.1.2', 'moderate', untitled + ' <iframe> with no title attribute');

      if (missingRefs.length) warn('lint_labelledby_missing', 'Labels that point at nothing', '4.1.2', 'aria-labelledby refers to id(s) that do not exist: ' + missingRefs.slice(0, 4).join(', '));

      // 2.4.3 positive tabindex scrambles the keyboard order.
      var posTab = _all(doc, '[tabindex]').filter(function (el) { return parseInt(el.getAttribute('tabindex'), 10) > 0; }).length;
      if (posTab) add('lint_tabindex_positive', 'Positive tabindex', '2.4.3', 'moderate', posTab + ' element(s) with tabindex greater than 0, which forces a keyboard order that usually does not match the page');

      // 2.1.1 click handlers on things a keyboard cannot reach.
      var clickOnly = _all(doc, '[onclick]').filter(function (el) {
        if (/^(A|BUTTON|INPUT|SELECT|TEXTAREA|SUMMARY|OPTION|LABEL)$/.test(el.tagName) && !(el.tagName === 'A' && !el.hasAttribute('href'))) return false;
        return !el.hasAttribute('tabindex') || !el.getAttribute('role');
      }).length;
      if (clickOnly) add('lint_click_div', 'Click-only controls', '2.1.1', 'serious', clickOnly + ' element(s) such as <div> or <span> have onclick but no role and tabindex, so keyboard users cannot reach or use them. Use a <button>.');

      // 1.4.4 zoom blocked by the viewport tag.
      var vp = doc.querySelector('meta[name="viewport"]');
      if (vp) {
        var vc = (vp.getAttribute('content') || '').toLowerCase().replace(/\s+/g, '');
        var ms = vc.match(/maximum-scale=([\d.]+)/);
        if (/user-scalable=(no|0)(?:,|$)/.test(vc) || (ms && parseFloat(ms[1]) < 2)) add('lint_zoom_blocked', 'Zoom is blocked', '1.4.4', 'serious', 'The viewport meta tag stops people pinch-zooming (user-scalable=no or maximum-scale below 2)');
      }

      // 2.4.7 inline outline removal on things that take focus.
      var focusables = _all(doc, 'a[href],button,input,select,textarea,[tabindex]');
      var noOutline = focusables.filter(function (el) { var o = _styleProp(el, 'outline'), os = _styleProp(el, 'outline-style'); return (o && /^(none|0(px)?)\b/i.test(o)) || (os && /^none\b/i.test(os)); }).length;
      if (noOutline) warn('lint_outline_none', 'Focus outline removed', '2.4.7', noOutline + ' focusable element(s) set outline:none inline. That fails 2.4.7 unless another visible focus style replaces it: check with Tab.');

      // 1.4.2 sound that starts on its own.
      var autoplay = _all(doc, 'video[autoplay],audio[autoplay]').filter(function (m) { return !m.hasAttribute('muted'); }).length;
      if (autoplay) warn('lint_autoplay', 'Media that plays sound by itself', '1.4.2', autoplay + ' <video>/<audio> with autoplay and no muted attribute. If it plays sound for more than 3 seconds there must be a way to pause it or turn it down.');

      // 1.4.3 inline-style contrast, composited down the ancestor chain over a white page.
      var worst = null, fails = 0, checkedEls = 0, unreadable = 0, unreadableSample = '';
      function fontPx(el) {
        var px = null, mult = 1;
        for (var n = el; n && n.getAttribute; n = n.parentNode) {
          var fs = _styleProp(n, 'font-size');
          if (fs) {
            var m2 = fs.match(/^([\d.]+)(px|pt|em|rem|%)?/i);
            if (m2) {
              var v = parseFloat(m2[1]), u = (m2[2] || 'px').toLowerCase();
              if (u === 'px') { px = v * mult; break; }
              if (u === 'pt') { px = v * 4 / 3 * mult; break; }
              if (u === 'rem') { px = v * 16 * mult; break; }
              if (u === 'em') { mult *= v; continue; }
              if (u === '%') { mult *= v / 100; continue; }
            }
            break;
          }
          var tg = n.tagName;
          var dflt = { H1: 32, H2: 24, H3: 18.72, H4: 16, H5: 13.28, H6: 10.72 }[tg];
          if (dflt) { px = dflt * mult; break; }
        }
        return px == null ? 16 * mult : px;
      }
      function isBold(el) {
        for (var n = el; n && n.getAttribute; n = n.parentNode) {
          var fw = _styleProp(n, 'font-weight');
          if (fw) { if (/^(bold|bolder)$/i.test(fw)) return true; var w = parseInt(fw, 10); return isFinite(w) && w >= 700; }
          if (/^(B|STRONG|H1|H2|H3|H4|H5|H6|TH)$/.test(n.tagName)) return true;
        }
        return false;
      }
      function bgOf(el) {
        var raw = _styleProp(el, 'background-color') || _styleProp(el, 'background');
        if (!raw) return { none: true };
        if (/gradient|url\(/i.test(raw)) return { unreadable: raw };
        var c = parseColorAlpha(raw);
        if (!c) { var tok = raw.split(/\s+/).map(parseColorAlpha).filter(Boolean); c = tok.length ? tok[0] : null; }
        return c ? { color: c } : { unreadable: raw };
      }
      _all(doc, 'body *').forEach(function (el) {
        var ownText = [].some.call(el.childNodes, function (c) { return c.nodeType === 3 && c.nodeValue.trim(); });
        if (!ownText || _hidden(el) || /^(SCRIPT|STYLE|TEMPLATE)$/.test(el.tagName)) return;
        var chain = [];
        for (var n = el; n && n.getAttribute && n.tagName !== 'HTML'; n = n.parentNode) chain.unshift(n);
        var fgRaw = null, anyInline = false, bad = null;
        chain.forEach(function (n) { var c = _styleProp(n, 'color'); if (c) { fgRaw = c; anyInline = true; } if (_styleProp(n, 'background-color') || _styleProp(n, 'background')) anyInline = true; });
        if (!anyInline) return;
        var bg = [255, 255, 255, 1];
        chain.forEach(function (n) { var b = bgOf(n); if (b.unreadable) bad = bad || b.unreadable; else if (b.color) bg = composite(b.color, bg); });
        var fg = fgRaw ? parseColorAlpha(fgRaw) : [0, 0, 0, 1];
        if (fgRaw && !fg) bad = bad || fgRaw;
        if (bad) { unreadable++; if (!unreadableSample) unreadableSample = String(bad).slice(0, 40); return; }
        fg = composite(fg, bg);
        checkedEls++;
        var r = contrastRatio(fg, bg), px = fontPx(el), large = px >= 24 || (px >= 18.66 && isBold(el));
        var need = large ? 3 : 4.5;
        if (r != null && r < need) { fails++; if (worst == null || r < worst) worst = r; }
      });
      if (fails) add('lint_contrast', 'Low text contrast (inline styles)', '1.4.3', 'serious', fails + ' element(s) below the minimum (4.5:1, or 3:1 for large text) — worst ' + (Math.round(worst * 100) / 100) + ':1');
      else if (checkedEls) passed.push('Inline text colours on ' + checkedEls + ' element(s) meet the contrast minimum');
      if (unreadable) notChecked.unshift({ id: 'contrast_unreadable', text: unreadable + ' element(s) use inline colours or backgrounds this checker cannot read (for example "' + unreadableSample + '"), such as CSS variables, gradients or images: check their contrast with a contrast checker.' });

      return { ok: true, findings: findings, warnings: warnings, bestPractice: bestPractice, passed: passed, notChecked: notChecked,
        checked: { images: imgs.length, headings: headings.length, controls: controls.length, links: links.length, buttons: btns.length, contrastElements: checkedEls } };
    }
    return { deterministicAudit: deterministicAudit, contrastRatio: contrastRatio, parseColor: parseColor, parseColorAlpha: parseColorAlpha, accessibleName: accessibleName };
  })();
  try { window.__alloA11yPure = __alloA11yPure; } catch (_e) {}

  window.StemLab.registerTool('a11yAuditor', {
    icon: '\uD83E\uDDAE',
    label: 'Digital Accessibility Lab',
    desc: 'Audit websites and documents for WCAG 2.1 AA accessibility compliance. Learn about digital accessibility by analyzing real-world content.',
    color: 'teal',
    category: 'coding',
    gradeRange: '6-12',
    // Quest hooks were absent entirely, so nothing outside the badge tab verified that a
    // student did anything. These mirror the badge checks that require real work (the
    // fields are maintained by the same update sites the badges read); the cross-check
    // one is deliberately about comparing findings across sites, which is the habit
    // this tool exists to build.
    questDataKey: 'a11yAuditor',
    questHooks: [
      { id: 'first_audit', label: 'Complete an accessibility audit', icon: '🔍',
        check: function (d) { return ((d && d.auditsCompleted) || 0) >= 1; },
        progress: function (d) { return Math.min(1, (d && d.auditsCompleted) || 0) + '/1'; } },
      { id: 'learn_criteria', label: 'Explore all 10 common WCAG criteria', icon: '📖',
        check: function (d) { return ((d && d.criteriaExplored) || 0) >= 10; },
        progress: function (d) { return Math.min(10, (d && d.criteriaExplored) || 0) + '/10'; } },
      { id: 'take_action', label: 'Generate an advocacy letter from real findings', icon: '✊',
        check: function (d) { return ((d && d.complaintsGenerated) || 0) >= 1; },
        progress: function (d) { return ((d && d.complaintsGenerated) || 0) >= 1 ? 'Sent' : 'Not yet'; } },
      { id: 'cross_check', label: 'Audit 3 different sites and compare their patterns', icon: '📊',
        check: function (d) { return ((d && d.uniqueSites) || 0) >= 3; },
        progress: function (d) { return Math.min(3, (d && d.uniqueSites) || 0) + '/3'; } }
    ],
    render: function(ctx) {
      var __alloT = function (k, fb) { var v; try { v = (typeof ctx.t === "function") ? ctx.t(k, fb) : null; } catch (e) { v = null; } return (v == null) ? (fb != null ? fb : k) : v; };
      // honor the 2nd-arg English fallback (ctx.t is single-arg & ignores it; see dev-tools/check_i18n_fallback.cjs)
      var t = function (k, fb) { var v; try { v = (typeof ctx.t === 'function') ? ctx.t(k, fb) : null; } catch (e) { v = null; } return (v == null) ? (fb != null ? fb : k) : v; };
      // The accessibility lab was itself unreadable in the accessibility
      // theme: this tool paints no ground, so its header sat on the host
      // surface — a white card in light and dark, pure BLACK in contrast,
      // where the title measured 1.44:1.
      var isContrast = !!ctx.isContrast;
      var onHostInk = isContrast ? ' text-white' : '';
      var React = ctx.React;
      var h = React.createElement;
      var d = (ctx.toolData && ctx.toolData['a11yAuditor']) || {};
      var upd = function(key, val) { ctx.update('a11yAuditor', key, val); };
      var updMulti = function(obj) { ctx.updateMulti('a11yAuditor', obj); };
      var ArrowLeft = ctx.icons.ArrowLeft;
      var Sparkles = ctx.icons.Sparkles;
      var X = ctx.icons.X;
      var addToast = ctx.addToast;
      // Null when the host says text AI is unusable: every AI pass hides; the measured HTML audit still runs.
      var callGemini = (ctx.aiAvailable !== false && typeof ctx.callGemini === 'function') ? ctx.callGemini : null;
      var callTTS = ctx.callTTS;
      var gradeLevel = ctx.gradeLevel;
      var gradeBand = ctx.gradeBand || 'elementary';
      var announceToSR = ctx.announceToSR;
      var a11yClick = ctx.a11yClick;
      var awardStemXP = ctx.awardXP;
      var stemCelebrate = ctx.celebrate;
      var stemBeep = ctx.beep;

      var callGeminiVision = ctx.callGeminiVision;

      // ── Mounted flag to prevent stale setState on unmounted component ──
      var _mounted = React.useRef(true);
      React.useEffect(function() { return function() { _mounted.current = false; }; }, []);

      // `tab` is PERSISTED state and every view is a `tab === '<id>'` branch, so an
      // id this build does not know matched NONE of them: the tool rendered its
      // header and tab strip over an empty body -- a dead end that looks functional.
      // `|| 'audit'` only catches null/empty. Allow-list the ids that actually have a
      // branch. Declared here, at the READ site, because any existing tab-id array
      // is assigned further down and `var` hoists the declaration, not the value.
      var TAB_IDS = ['action', 'audit', 'badges', 'history', 'knowbility', 'learn'];
      var tab = TAB_IDS.indexOf(d.tab) !== -1 ? d.tab : 'audit';
      // Saved state is INPUT: `||` is a NULL guard, not a TYPE guard.
      var _num0 = function (v) { return (typeof v === 'number' && isFinite(v) && v > 0) ? Math.floor(v) : 0; };
      var auditUrl = typeof d.auditUrl === 'string' ? d.auditUrl : '';
      var auditResult = sanitizeAudit(d.auditResult);
      var deterministicAudit = sanitizeMeasured(d.deterministicAudit);
      var auditSource = (d.auditSource && typeof d.auditSource === 'object') ? { type: _str(d.auditSource.type, 20), label: _str(d.auditSource.label, 200) } : null;
      var auditInputMode = d.auditInputMode || 'url'; // 'url' | 'html' | 'pdf' | 'screenshot'
      if (!callGemini) auditInputMode = 'html'; // the only mode with a non-AI (measured) audit
      var auditHistory = Array.isArray(d.auditHistory) ? d.auditHistory.filter(function (e) { return e && typeof e === 'object'; }) : [];
      var selectedCriterion = typeof d.selectedCriterion === 'string' ? d.selectedCriterion : null;
      var badges = Array.isArray(d.badges) ? d.badges.filter(function (b) { return typeof b === 'string'; }) : [];
      var auditsCompleted = _num0(d.auditsCompleted);
      // Exploring counts DISTINCT items: re-opening one criterion 20 times used to reach 10.
      var criteriaSeen = Array.isArray(d.criteriaSeen) ? d.criteriaSeen.filter(function (id) { return WCAG_CRITERIA_IDS.indexOf(id) >= 0; }) : [];
      var criteriaExplored = Math.max(_num0(d.criteriaExplored), criteriaSeen.length);
      var knowbilitySeen = Array.isArray(d.knowbilitySeen) ? d.knowbilitySeen.filter(function (id) { return KNOWBILITY_ITEMS.indexOf(id) >= 0; }) : [];
      var knowbilityExplored = Math.max(_num0(d.knowbilityExplored), knowbilitySeen.length);
      var reportsDownloaded = _num0(d.reportsDownloaded);
      var worstScore = (typeof d.worstScore === 'number' && isFinite(d.worstScore)) ? d.worstScore : 999;
      var uniqueSites = _num0(d.uniqueSites);
      var complaintsGenerated = _num0(d.complaintsGenerated);
      var socialAudits = _num0(d.socialAudits);
      var govAudits = _num0(d.govAudits);
      var complaintEntity = typeof d.complaintEntity === 'string' ? d.complaintEntity : '';
      var complaintType = d.complaintType || 'ada_coordinator';
      var socialPlatform = d.socialPlatform || 'instagram';
      var govUrl = typeof d.govUrl === 'string' ? d.govUrl : '';
      var govEntityType = d.govEntityType || 'school';

      // Session-only state. Loading flags used to live in the saved project: leaving the tool
      // mid-audit left "Auditing..." true forever with nothing running and no way to reset it.
      // The complaint impact text (it invites "My child uses a screen reader...", i.e. disability
      // information), the generated letter, the pasted HTML and the social post are kept for this
      // visit only and never written to the saved project.
      var _legacyStr = function (v) { return typeof v === 'string' ? v : ''; };
      var _ls = React.useState(false), auditLoading = _ls[0], setAuditLoading = _ls[1];
      var _cs = React.useState(false), complaintLoading = _cs[0], setComplaintLoading = _cs[1];
      var _rs = React.useState(false), socialRewriteLoading = _rs[0], setSocialRewriteLoading = _rs[1];
      var _ci = React.useState(_legacyStr(d.complaintImpact)), complaintImpact = _ci[0], setComplaintImpact = _ci[1];
      var _cr = React.useState(_legacyStr(d.complaintResult) || null), complaintResult = _cr[0], setComplaintResult = _cr[1];
      var _ah = React.useState(_legacyStr(d.auditHtml)), auditHtml = _ah[0], setAuditHtml = _ah[1];
      var _st = React.useState(_legacyStr(d.socialText)), socialText = _st[0], setSocialText = _st[1];
      var _sr = React.useState(_legacyStr(d.socialRewrite) || null), socialRewrite = _sr[0], setSocialRewrite = _sr[1];
      var pdfInputRef = React.useRef(null), shotInputRef = React.useRef(null);
      // Remove what older versions saved: stuck loading flags and personal text.
      React.useEffect(function () {
        var stale = ['auditLoading', 'complaintLoading', 'socialRewriteLoading', 'complaintImpact', 'complaintResult', 'auditHtml', 'socialText', 'socialRewrite'].filter(function (k) { return d[k] !== undefined && d[k] !== null && d[k] !== false && d[k] !== ''; });
        if (stale.length) { var clear = {}; stale.forEach(function (k) { clear[k] = undefined; }); updMulti(clear); }
      }, []);

      // ── Audit PDF/Screenshot via Vision ──
      var runVisionAudit = function(base64, mimeType, label) {
        if (!callGeminiVision) { if (addToast) addToast('Vision API not available', 'error'); return; }
        if (auditLoading) return; // guard against double-click triggering parallel AI calls
        setAuditLoading(true);
        updMulti({ deterministicAudit: null });
        var visionPrompt = 'You are a WCAG 2.2 AA accessibility expert. Audit this ' + label + ' for accessibility.\n' +
          'Check: alt text on images, heading structure, color contrast, keyboard access hints, form labels, link text, language declaration, focus indicators, ARIA usage, and ways to bypass repeated content (a skip link, or headings and landmarks).\n' +
          'Target audience: ' + (gradeLevel || '8th grade') + ' students learning about digital accessibility.\n' +
          'Explain each issue in plain language. For each, explain WHO is affected and WHY.\n\n' +
          'Return ONLY JSON:\n' +
          '{"score": 0-100, "grade": "A/B/C/D/F", "summary": "plain-language summary", "issues": [{"criterion": "1.1.1", "issue": "desc", "severity": "critical|major|minor", "who": "affected group", "fix": "how to fix"}], "strengths": ["good things"], "score_breakdown": {"structure": 0-10, "images": 0-10, "contrast": 0-10, "keyboard": 0-10, "forms": 0-10, "language": 0-10, "links": 0-10, "focus": 0-10, "aria": 0-10, "navigation": 0-10}, "recommendation": "fix this first"}';

        callGeminiVision(visionPrompt, base64, mimeType).then(function(result) {
          if (!_mounted.current) return;
          try {
            var cleaned = result.trim();
            if (cleaned.indexOf('```') !== -1) { var parts = cleaned.split('```'); cleaned = parts[1] || parts[0]; if (cleaned.indexOf('\n') !== -1) cleaned = cleaned.split('\n').slice(1).join('\n'); if (cleaned.lastIndexOf('```') !== -1) cleaned = cleaned.substring(0, cleaned.lastIndexOf('```')); }
            var audit = sanitizeAudit(JSON.parse(cleaned));
            if (!audit || audit.score < 0) throw new Error('no score');
            var newHistory = auditHistory.concat([{ input: label, type: 'vision', score: audit.score, grade: audit.grade, date: new Date().toISOString() }]);
            setAuditLoading(false);
            updMulti({ auditResult: audit, auditSource: { type: 'vision', label: label }, auditHistory: newHistory.slice(-20), auditsCompleted: auditsCompleted + 1 });
            if (awardStemXP) awardStemXP(12);
            if (announceToSR) announceToSR('Audit complete. Score: ' + audit.score + ' out of 100.');
          } catch (e) {
            setAuditLoading(false);
            updMulti({ auditResult: { score: -1, summary: 'Audit failed \u2014 could not read the AI answer for the ' + label + '.', issues: [], strengths: [] } });
          }
        }).catch(function() {
          if (!_mounted.current) return;
          setAuditLoading(false);
          updMulti({ auditResult: { score: -1, summary: t('stem.a11yauditor.vision_audit_failed_the_file_may_be_to', 'Vision audit failed. The file may be too large or unsupported.'), issues: [], strengths: [] } });
        });
      };

      // ── Handle file upload (PDF or screenshot) ──
      var handleFileAudit = function(e) {
        var file = e.target.files && e.target.files[0];
        try { e.target.value = ''; } catch (_) {} // choosing the same file again still fires
        if (!file) return;
        var reader = new FileReader();
        reader.onloadend = function() {
          var base64 = reader.result.split(',')[1];
          var mime = file.type || 'application/pdf';
          var label = file.type.startsWith('image/') ? 'screenshot (' + file.name + ')' : 'PDF document (' + file.name + ')';
          runVisionAudit(base64, mime, label);
        };
        reader.readAsDataURL(file);
      };

      // ── Fetch URL HTML then audit ──
      var fetchAndAudit = function(url) {
        if (!callGemini) return;
        if (auditLoading) return; // guard against double-click triggering parallel Gemini calls (~3 in-flight per audit)
        // Use Gemini with grounding/search to analyze the URL
        var fetchPrompt = 'Visit and analyze the website at ' + url + ' for WCAG 2.1 AA accessibility compliance.\n' +
          'Examine the page structure, images, forms, links, color usage, keyboard accessibility, and ARIA implementation.\n' +
          'Use your knowledge of this website\u2019s actual content and structure.\n\n';
        // Fall through to standard audit with URL context
        runAudit(url, 'url');
      };

      // ── Run social media audit ──
      var runSocialAudit = function() {
        if (!callGemini || !socialText.trim()) return;
        if (auditLoading) return; // guard against double-click triggering parallel AI calls
        setAuditLoading(true);
        updMulti({ deterministicAudit: null });
        var prompt = 'You are a social media accessibility expert. Audit this ' + socialPlatform + ' post for accessibility compliance.\n\n' +
          'POST CONTENT:\n"""\n' + socialText.substring(0, 3000) + '\n"""\n\n' +
          'Check ALL of the following:\n' +
          '1. IMAGE ALT TEXT: Does the post describe any images? Are visual elements explained?\n' +
          '2. VIDEO CAPTIONS: If video is mentioned, are captions/transcripts available?\n' +
          '3. HASHTAG CASING: Are multi-word hashtags written in CamelCase (#AccessibilityMatters) rather than all lowercase (#accessibilitymatters)? This is a widely recommended best practice, because screen readers can then read the words separately.\n' +
          '4. EMOJI USAGE: Are emojis used sparingly and placed at the end of text rather than mid-sentence? Screen readers read each emoji\'s full name aloud, so long runs of emoji are tiring to listen to. This is a best practice.\n' +
          'Treat hashtag casing and emoji use as best-practice issues (severity "minor"), not as failures of a law or standard.\n' +
          '5. PLAIN LANGUAGE: Is the text readable at a broad audience level? Jargon-free?\n' +
          '6. COLOR CONTRAST: If the post describes graphics/images with text overlays, note potential contrast issues.\n' +
          '7. LINK ACCESSIBILITY: Are links descriptive or bare URLs?\n' +
          '8. TEXT IN IMAGES: Is important information conveyed only through images/graphics?\n\n' +
          'Target audience: ' + (gradeLevel || '8th grade') + ' students learning about social media accessibility.\n\n' +
          'Return ONLY JSON:\n' +
          '{"score": 0-100, "grade": "A/B/C/D/F", "summary": "plain-language summary",\n' +
          '"issues": [{"criterion": "Alt Text|Captions|Hashtags|Emoji|Readability|Contrast|Links|Text-in-Images", "issue": "description", "severity": "critical|major|minor", "who": "who is affected", "fix": "how to fix it"}],\n' +
          '"strengths": ["good things"],\n' +
          '"score_breakdown": {"alt_text": 0-10, "captions": 0-10, "hashtags": 0-10, "emoji": 0-10, "readability": 0-10, "contrast": 0-10, "links": 0-10, "text_in_images": 0-10},\n' +
          '"recommendation": "fix this first"}';
        callGemini(prompt, true).then(function(result) {
          if (!_mounted.current) return;
          try {
            var cleaned = result.trim();
            if (cleaned.indexOf('```') !== -1) { var parts = cleaned.split('```'); cleaned = parts[1] || parts[0]; if (cleaned.indexOf('\n') !== -1) cleaned = cleaned.split('\n').slice(1).join('\n'); if (cleaned.lastIndexOf('```') !== -1) cleaned = cleaned.substring(0, cleaned.lastIndexOf('```')); }
            var audit = sanitizeAudit(JSON.parse(cleaned));
            if (!audit || audit.score < 0) throw new Error('no score');
            // History keeps the platform, not the post text: the post is kept for this visit only.
            var srcLabel = 'Social media post (' + socialPlatform + ')';
            var newHistory = auditHistory.concat([{ input: srcLabel, type: 'social', score: audit.score, grade: audit.grade, date: new Date().toISOString() }]);
            setAuditLoading(false);
            updMulti({ auditResult: audit, auditSource: { type: 'social', label: srcLabel }, auditHistory: newHistory.slice(-20), auditsCompleted: auditsCompleted + 1, socialAudits: socialAudits + 1 });
            if (awardStemXP) awardStemXP(10);
            if (announceToSR) announceToSR('Social media audit complete. Score: ' + audit.score);
          } catch(e) {
            setAuditLoading(false);
            updMulti({ auditResult: { score: -1, summary: t('stem.a11yauditor.social_media_audit_failed', 'Social media audit failed.'), issues: [], strengths: [] } });
          }
        }).catch(function() {
          if (!_mounted.current) return;
          setAuditLoading(false);
          updMulti({ auditResult: { score: -1, summary: t('stem.a11yauditor.social_media_audit_failed_2', 'Social media audit failed.'), issues: [], strengths: [] } });
        });
      };

      // ── Rewrite post accessibly ──
      var rewriteAccessibly = function() {
        if (!callGemini || !socialText.trim() || socialRewriteLoading) return;
        setSocialRewriteLoading(true);
        var prompt = 'Rewrite this ' + socialPlatform + ' post to be fully accessible. Keep the same message, tone, and intent.\n\n' +
          'ORIGINAL POST:\n"""\n' + socialText.substring(0, 3000) + '\n"""\n\n' +
          'RULES:\n' +
          '- Use CamelCase for all hashtags (e.g. #AccessibilityMatters not #accessibilitymatters)\n' +
          '- Place emojis at the end of text, not mid-sentence. Maximum 3-4 emojis total.\n' +
          '- Add [Image description: ...] note if the post references images\n' +
          '- Use plain language, no jargon\n' +
          '- If links are bare URLs, suggest descriptive link text\n' +
          '- Add [Alt text: ...] suggestion for any images\n' +
          '- Preserve the original voice and personality\n\n' +
          'Return ONLY the rewritten post text, nothing else.';
        callGemini(prompt, true).then(function(result) {
          if (!_mounted.current) return;
          setSocialRewriteLoading(false);
          setSocialRewrite(_str(result, 6000).trim() || null);
          if (announceToSR) announceToSR('Accessible rewrite generated.');
        }).catch(function() {
          if (!_mounted.current) return;
          setSocialRewriteLoading(false);
          setSocialRewrite(t('stem.a11yauditor.rewrite_failed_try_again', 'Rewrite failed. Please try again.'));
        });
      };

      // ── Run government/Title II audit ──
      var runGovAudit = function() {
        if (!callGemini || !govUrl.trim()) return;
        if (auditLoading) return; // guard against double-click triggering parallel AI calls
        setAuditLoading(true);
        updMulti({ deterministicAudit: null });
        var entityLabel = govEntityType === 'school' ? 'school district' : govEntityType === 'library' ? 'public library' : govEntityType === 'city' ? 'city/county government' : 'state agency';
        var prompt = 'You are an ADA Title II digital accessibility compliance expert. Audit this ' + entityLabel + ' website at URL: ' + govUrl + '.\n\n' +
          'This is a government entity subject to the DOJ April 2024 final rule requiring WCAG 2.1 AA compliance.\n\n' +
          'Check ALL standard WCAG 2.1 AA criteria PLUS these Title II-specific requirements:\n' +
          '1. ADA COORDINATOR: Is there a published ADA Coordinator name + contact info?\n' +
          '2. ACCESSIBILITY STATEMENT: Does the site have an accessibility statement/policy page?\n' +
          '3. GRIEVANCE PROCEDURE: Is there a published ADA grievance procedure?\n' +
          '4. FORMS: Are enrollment forms, applications, and public comment forms keyboard-accessible?\n' +
          '5. PDF DOCUMENTS: Are posted PDFs tagged/structured? (common violation for school board minutes, budgets, etc.)\n' +
          '6. VIDEO CONTENT: Do videos have captions and transcripts?\n' +
          '7. PAYMENT PORTALS: Are online payment systems keyboard-accessible?\n' +
          '8. LANGUAGE: Is language declared? Are multilingual options available?\n' +
          '9. THIRD-PARTY CONTENT: Are embedded third-party tools (Google Forms, Zoom, etc.) accessible?\n' +
          '10. MOBILE: Is the site responsive and usable on mobile with screen readers?\n\n' +
          'Target audience: ' + (gradeLevel || '8th grade') + ' students and parents learning about their digital accessibility rights.\n\n' +
          'Return ONLY JSON with the same schema as a standard audit, plus add a "title_ii" object:\n' +
          '{"score": 0-100, "grade": "A/B/C/D/F", "summary": "summary",\n' +
          '"issues": [{"criterion": "...", "issue": "...", "severity": "...", "who": "...", "fix": "..."}],\n' +
          '"strengths": ["..."],\n' +
          '"score_breakdown": {"structure": 0-10, "images": 0-10, "contrast": 0-10, "keyboard": 0-10, "forms": 0-10, "language": 0-10, "links": 0-10, "focus": 0-10, "aria": 0-10, "navigation": 0-10},\n' +
          '"title_ii": {"ada_coordinator": true/false, "accessibility_statement": true/false, "grievance_procedure": true/false, "compliant_forms": true/false, "tagged_pdfs": true/false, "captioned_videos": true/false},\n' +
          '"recommendation": "fix this first"}';
        callGemini(prompt, true).then(function(result) {
          if (!_mounted.current) return;
          try {
            var cleaned = result.trim();
            if (cleaned.indexOf('```') !== -1) { var parts = cleaned.split('```'); cleaned = parts[1] || parts[0]; if (cleaned.indexOf('\n') !== -1) cleaned = cleaned.split('\n').slice(1).join('\n'); if (cleaned.lastIndexOf('```') !== -1) cleaned = cleaned.substring(0, cleaned.lastIndexOf('```')); }
            var audit = sanitizeAudit(JSON.parse(cleaned));
            if (!audit || audit.score < 0) throw new Error('no score');
            var newHistory = auditHistory.concat([{ input: govUrl.substring(0, 100), type: 'gov', score: audit.score, grade: audit.grade, date: new Date().toISOString() }]);
            setAuditLoading(false);
            updMulti({ auditResult: audit, auditSource: { type: 'gov', label: 'Government / school website: ' + govUrl.substring(0, 150) }, auditHistory: newHistory.slice(-20), auditsCompleted: auditsCompleted + 1, govAudits: govAudits + 1 });
            if (awardStemXP) awardStemXP(15);
            if (announceToSR) announceToSR('Title II audit complete. Score: ' + audit.score);
          } catch(e) {
            setAuditLoading(false);
            updMulti({ auditResult: { score: -1, summary: t('stem.a11yauditor.government_audit_failed', 'Government audit failed.'), issues: [], strengths: [] } });
          }
        }).catch(function() {
          if (!_mounted.current) return;
          setAuditLoading(false);
          updMulti({ auditResult: { score: -1, summary: t('stem.a11yauditor.government_audit_failed_2', 'Government audit failed.'), issues: [], strengths: [] } });
        });
      };

      // ── Triangulated accessibility audit (3 parallel passes) ──
      var parseAuditJson = function(result) {
        var cleaned = result.trim();
        if (cleaned.indexOf('`' + '') !== -1) { var parts = cleaned.split('`' + ''); cleaned = parts[1] || parts[0]; if (cleaned.indexOf('\n') !== -1) cleaned = cleaned.split('\n').slice(1).join('\n'); if (cleaned.lastIndexOf('`' + '') !== -1) cleaned = cleaned.substring(0, cleaned.lastIndexOf('`' + '')); }
        return JSON.parse(cleaned);
      };

      var runAudit = function(input, inputType) {
        if (auditLoading) return;
        var _detAudit = (inputType === 'html') ? __alloA11yPure.deterministicAudit(input) : null;
        var _srcLabel = inputType === 'url' ? 'Website: ' + input.substring(0, 150) : 'Pasted HTML (' + input.length + ' characters)';
        if (!callGemini) {
          // AI off: the measured check IS the audit. Count it, record it, and say what it found.
          if (!_detAudit || !_detAudit.ok) return;
          var nFail = _detAudit.findings.length, nWarn = _detAudit.warnings.length;
          var mHistory = auditHistory.concat([{ input: _srcLabel, type: 'measured', measured: true, failures: nFail, toCheck: nWarn, date: new Date().toISOString() }]);
          updMulti({ deterministicAudit: _detAudit, auditResult: null, auditSource: { type: 'measured', label: _srcLabel }, auditHistory: mHistory.slice(-20), auditsCompleted: auditsCompleted + 1 });
          if (awardStemXP) awardStemXP(8);
          if (announceToSR) announceToSR('Measured check complete. ' + nFail + ' failure' + (nFail === 1 ? '' : 's') + ' found, ' + nWarn + ' item' + (nWarn === 1 ? '' : 's') + ' to check by hand. Some things cannot be checked by code; they are listed under Not checked.');
          return;
        }
        setAuditLoading(true);
        updMulti({ deterministicAudit: _detAudit, auditResult: null });
        var target = inputType === 'url' ? 'a website at URL: ' + input + '. Use your training knowledge of this website\u2019s structure, layout, and common patterns.' : 'the following HTML content';
        var htmlCtx = inputType === 'html' ? 'HTML:\n"""\n' + input.substring(0, 8000) + '\n"""\n\n' : '';
        var audience = 'Target audience: ' + (gradeLevel || '8th grade') + ' students learning about digital accessibility.\nExplain each issue in plain language. For each, explain WHO is affected and WHY.\n\n';
        var jsonSchema = 'Return ONLY JSON:\n{"score": 0-100, "grade": "A/B/C/D/F", "summary": "plain-language summary", "issues": [{"criterion": "X.X.X", "issue": "desc", "severity": "critical|major|minor", "who": "affected", "fix": "how"}], "strengths": ["good things"], "score_breakdown": {"structure": 0-10, "images": 0-10, "contrast": 0-10, "keyboard": 0-10, "forms": 0-10, "language": 0-10, "links": 0-10, "focus": 0-10, "aria": 0-10, "navigation": 0-10}, "recommendation": "fix this first"}';

        var p1 = callGemini('You are a WCAG 2.2 AA STRUCTURAL accessibility expert auditing ' + target + '.\n\n' + htmlCtx + 'Focus ONLY on structural and semantic issues:\n1. Heading hierarchy (1.3.1)\n2. Language declaration (3.1.1)\n3. ARIA roles and properties (4.1.2)\n4. Form labels and instructions (3.3.2)\n5. Semantic HTML usage (1.3.1)\n\n' + audience + jsonSchema, true);
        var p2 = callGemini('You are a WCAG 2.2 AA VISUAL accessibility expert auditing ' + target + '.\n\n' + htmlCtx + 'Focus ONLY on visual and perceivable issues:\n1. Images without alt text (1.1.1)\n2. Color contrast ratios (1.4.3)\n3. Text resize and reflow (1.4.4, 1.4.10)\n4. Focus indicators (2.4.7)\n5. Use of color alone to convey meaning (1.4.1)\n\n' + audience + jsonSchema, true);
        var p3 = callGemini('You are a WCAG 2.2 AA NAVIGATION accessibility expert auditing ' + target + '.\n\n' + htmlCtx + 'Focus ONLY on navigation and operability:\n1. Keyboard access (2.1.1)\n2. Ways to bypass repeated blocks (2.4.1): a skip link OR proper headings and landmarks each satisfy it; do not report a missing skip link as a failure when headings or landmarks exist\n3. Link purpose and descriptive text (2.4.4)\n4. Focus order and tab sequence (2.4.3)\n5. No keyboard traps (2.1.2)\n\n' + audience + jsonSchema, true);

        Promise.all([p1, p2, p3]).then(function(results) {
          if (!_mounted.current) return;
          try {
            var audits = results.map(function(r) { try { return sanitizeAudit(parseAuditJson(String(r == null ? '' : r))); } catch(e) { return null; } }).filter(function (a) { return a && a.score >= 0; });
            if (audits.length === 0) throw new Error('All passes failed');
            var allIssues = []; var seenKeys = {};
            audits.forEach(function(a) { (a.issues || []).forEach(function(iss) {
              var key = (iss.criterion || '') + ':' + (iss.issue || '').substring(0, 40);
              if (!seenKeys[key]) { seenKeys[key] = { count: 1, issue: iss }; allIssues.push(iss); }
              else { seenKeys[key].count++; if (iss.severity === 'critical' && seenKeys[key].issue.severity !== 'critical') seenKeys[key].issue.severity = 'critical'; }
            }); });
            allIssues.forEach(function(iss) { var key = (iss.criterion || '') + ':' + (iss.issue || '').substring(0, 40); if (seenKeys[key] && seenKeys[key].count >= 2) iss.issue = '\u2705 ' + iss.issue; });
            var mergedBreakdown = {};
            ['structure','images','contrast','keyboard','forms','language','links','focus','aria','navigation'].forEach(function(k) {
              var vals = audits.map(function(a) { return a.score_breakdown && a.score_breakdown[k]; }).filter(function(v) { return v != null; });
              mergedBreakdown[k] = vals.length > 0 ? Math.round(vals.reduce(function(a,b){return a+b;},0) / vals.length) : null;
            });
            var allStrengths = []; var seenStr = {};
            audits.forEach(function(a) { (a.strengths || []).forEach(function(s) { if (!seenStr[s]) { seenStr[s] = true; allStrengths.push(s); } }); });
            var avgScore = Math.round(audits.reduce(function(s,a){return s+(a.score||0);},0) / audits.length);
            var grade = avgScore >= 90 ? 'A' : avgScore >= 80 ? 'B' : avgScore >= 70 ? 'C' : avgScore >= 60 ? 'D' : 'F';
            var merged = { score: avgScore, grade: grade, summary: (audits[0] || {}).summary || 'Triangulated audit complete.',
              issues: allIssues, strengths: allStrengths, score_breakdown: mergedBreakdown,
              recommendation: (audits[0] || {}).recommendation || '', _triangulated: true, _passCount: audits.length };
            merged = sanitizeAudit(merged);
            var newHistory = auditHistory.concat([{ input: inputType === 'url' ? input.substring(0, 100) : _srcLabel, type: inputType, score: merged.score, grade: merged.grade, date: new Date().toISOString() }]);
            var newWorst = Math.min(worstScore === 999 ? merged.score : worstScore, merged.score);
            var newUnique = inputType === 'url' ? new Set(newHistory.filter(function(h) { return h.type === 'url'; }).map(function(h) { return h.input; })).size : uniqueSites;
            setAuditLoading(false);
            updMulti({ auditResult: merged, auditSource: { type: inputType, label: _srcLabel }, auditHistory: newHistory.slice(-20), auditsCompleted: auditsCompleted + 1, worstScore: newWorst, uniqueSites: newUnique });
            if (awardStemXP) awardStemXP(15);
            if (announceToSR) announceToSR('Triangulated audit complete. Score: ' + merged.score + ' out of 100. Grade: ' + merged.grade);
            if (merged.score >= 90 && stemCelebrate) stemCelebrate();
          } catch(e) {
            setAuditLoading(false);
            updMulti({ auditResult: { score: -1, summary: t('stem.a11yauditor.audit_failed_try_different_content_or_', 'Audit failed. Try different content or a simpler URL.'), issues: [], strengths: [] } });
          }
        }).catch(function() {
          if (!_mounted.current) return;
          setAuditLoading(false);
          updMulti({ auditResult: { score: -1, summary: t('stem.a11yauditor.audit_failed_the_content_could_not_be_', 'Audit failed. The content could not be analyzed.'), issues: [], strengths: [] } });
        });
      };

      // ── Download report ──
      var downloadReport = function() {
        var aiPart = auditResult && auditResult.score >= 0 ? auditResult : null;
        if (!aiPart && !deterministicAudit) return;
        var report = JSON.stringify({
          standard: 'WCAG 2.2 AA (ADA Title II requires WCAG 2.1 AA)',
          disclaimer: 'Not a certified WCAG audit. "measuredChecks" were counted by code from pasted HTML; "aiEstimate" is an AI model’s judgement. Neither covers everything: see measuredChecks.notChecked, and verify with axe, WAVE, or Lighthouse and by testing with a keyboard and a screen reader.',
          tool: 'AlloFlow Digital Accessibility Lab', date: new Date().toISOString(),
          input: auditSource ? auditSource.label : (auditUrl || 'Unknown input'),
          measuredChecks: deterministicAudit || null,
          aiEstimate: aiPart
        }, null, 2);
        var blob = new Blob([report], { type: 'application/json' });
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url; a.download = 'a11y-audit-' + new Date().toISOString().split('T')[0] + '.json';
        document.body.appendChild(a); a.click(); document.body.removeChild(a);
        URL.revokeObjectURL(url);
        updMulti({ reportsDownloaded: reportsDownloaded + 1 });
        if (addToast) addToast('Audit report downloaded!', 'success');
      };

      // Knowbility cards count (and earn XP) once each, not once per click.
      var exploreKnowbility = function (id, xp) {
        if (knowbilitySeen.indexOf(id) >= 0) return;
        var seen = knowbilitySeen.concat([id]);
        updMulti({ knowbilitySeen: seen, knowbilityExplored: Math.max(knowbilityExplored, seen.length) });
        if (awardStemXP) awardStemXP(xp);
      };
      var exploredChip = function (id) {
        return knowbilitySeen.indexOf(id) >= 0 && h('span', { className: 'ml-2 text-[0.625rem] font-bold text-emerald-800 bg-emerald-100 px-1.5 py-0.5 rounded' }, t('stem.a11yauditor.explored', '✓ Explored'));
      };

      // ── Badge checker ──
      var checkBadges = function() {
        var state = { auditsCompleted: auditsCompleted, worstScore: worstScore, uniqueSites: uniqueSites, criteriaExplored: criteriaExplored, reportsDownloaded: reportsDownloaded, complaintsGenerated: complaintsGenerated, socialAudits: socialAudits, govAudits: govAudits, knowbilityExplored: knowbilityExplored };
        var earned = badges.slice();
        AUDIT_BADGES.forEach(function(b) {
          if (earned.indexOf(b.id) < 0 && b.check(state)) {
            earned.push(b.id);
            if (addToast) addToast(b.icon + ' Badge: ' + b.name + '!', 'success');
            if (awardStemXP) awardStemXP(15);
            if (stemCelebrate) stemCelebrate();
          }
        });
        if (earned.length !== badges.length) upd('badges', earned);
      };

      // Every counter a badge reads must be listed, or that badge is never checked (Knowbility
      // Ally, Change Agent, Social Media Scout, Title II Expert, Advocate and Eagle Eye were not).
      React.useEffect(function() { checkBadges(); }, [auditsCompleted, criteriaExplored, reportsDownloaded, complaintsGenerated, socialAudits, govAudits, knowbilityExplored, uniqueSites, worstScore]);

      // Measured (code-only) HTML findings; shown inside AI results, or alone when AI is off.
      var renderMeasuredList = function (items, chipClass, keyPrefix) {
        return h('ul', { className: 'space-y-1.5' }, items.map(function(_fi, _i) {
          return h('li', { key: keyPrefix + _i, className: 'text-sm text-slate-700 flex items-start gap-2' },
            h('span', { className: 'text-[0.625rem] font-bold px-1.5 py-0.5 rounded shrink-0 ' + chipClass(_fi) }, _fi.wcag),
            h('span', null, h('strong', null, _fi.key ? t('stem.a11yauditor.' + _fi.key, _fi.criterion) : _fi.criterion), ' \u2014 ' + _fi.detail)
          );
        }));
      };
      var renderMeasuredPanel = function() {
        if (!deterministicAudit) return null;
        var da = deterministicAudit;
        return h('section', { className: 'bg-indigo-50 rounded-2xl border-2 border-indigo-300 p-4 space-y-3', 'aria-labelledby': 'a11yaud-measured-h' },
          h('div', { className: 'flex items-center gap-2 flex-wrap' },
            h('span', { 'aria-hidden': 'true' }, '\uD83D\uDD2C'),
            h('h4', { id: 'a11yaud-measured-h', className: 'text-xs font-bold text-indigo-800 uppercase tracking-widest' }, t('stem.a11yauditor.measured_checks', 'Measured checks')),
            h('span', { className: 'ml-auto text-[0.625rem] font-bold uppercase tracking-wide text-indigo-700 bg-indigo-100 px-2 py-0.5 rounded-full' }, t('stem.a11yauditor.deterministic_badge', 'Deterministic \u00B7 not AI'))
          ),
          h('p', { className: 'text-[0.6875rem] text-slate-700' }, t('stem.a11yauditor.measured_hint_v2', 'Counted directly from your HTML by code (DOMParser and the WCAG contrast formula), not by AI. Code can prove some failures; it cannot judge everything.')),
          h('div', null,
            h('h5', { className: 'text-xs font-bold text-slate-800 mb-1' }, t('stem.a11yauditor.measured_failures_heading', 'WCAG failures found')),
            da.findings.length === 0
              ? h('p', { className: 'text-sm font-bold text-emerald-800' }, t('stem.a11yauditor.measured_none_v2', 'No failures found in the checks this tool can run. That is not the same as passing WCAG: see "Not checked automatically" below.'))
              : renderMeasuredList(da.findings, function (f) { return f.severity === 'serious' ? 'bg-red-100 text-red-800' : f.severity === 'moderate' ? 'bg-amber-100 text-amber-900' : 'bg-slate-200 text-slate-800'; }, 'f')
          ),
          da.warnings.length > 0 && h('div', null,
            h('h5', { className: 'text-xs font-bold text-slate-800 mb-1' }, t('stem.a11yauditor.measured_warnings_heading', 'Likely problems: check these by hand')),
            renderMeasuredList(da.warnings, function () { return 'bg-amber-100 text-amber-900'; }, 'w')
          ),
          da.bestPractice.length > 0 && h('div', null,
            h('h5', { className: 'text-xs font-bold text-slate-800 mb-1' }, t('stem.a11yauditor.measured_bp_heading', 'Good habits (best practice, not WCAG failures)')),
            renderMeasuredList(da.bestPractice, function () { return 'bg-slate-200 text-slate-800'; }, 'b')
          ),
          da.notChecked.length > 0 && h('div', null,
            h('h5', { className: 'text-xs font-bold text-slate-800 mb-1' }, t('stem.a11yauditor.measured_not_checked_heading', 'Not checked automatically')),
            h('ul', { className: 'list-disc pl-5 space-y-1 text-[0.75rem] text-slate-700' }, da.notChecked.map(function (nc, i) {
              return h('li', { key: 'n' + i }, nc.id && nc.id !== 'contrast_unreadable' ? t('stem.a11yauditor.nc_' + nc.id, nc.text) : nc.text);
            }))
          ),
          h('p', { className: 'text-[0.6875rem] text-slate-700' }, callGemini
            ? t('stem.a11yauditor.measured_scope_ai', 'The AI passes add judgement on the rest. Treat their score as an estimate.')
            : t('stem.a11yauditor.measured_scope_noai', 'To check the rest, test with a keyboard and a screen reader, or a tool like axe or WAVE.'))
        );
      };

      // ═══ RENDER ═══
      return h('div', { className: 'space-y-4 animate-in fade-in duration-200' },

        // Header
        h('div', { className: 'flex items-center gap-3' },
          h('button', Object.assign({
            className: 'p-2 rounded-full hover:bg-teal-100 text-teal-700 transition-colors',
            'aria-label': t('stem.a11yauditor.back_to_stem_tools', 'Back to STEM tools'),
            title: t('stem.a11yauditor.back', 'Back')
          }, a11yClick(function() { ctx.setStemLabTool(null); })),
            h(ArrowLeft, { size: 20 })
          ),
          h('div', { className: 'flex-1' },
            h('h2', { className: 'text-xl font-black text-slate-800' + onHostInk }, t('stem.a11yauditor.digital_accessibility_lab', '\u267F Digital Accessibility Lab')),
            h('p', { className: 'text-xs text-slate-600' + onHostInk }, t('stem.a11yauditor.be_an_accessibility_change_agent_audit', 'Be an Accessibility Change Agent \u2014 Audit, Learn, Advocate'))
          ),
          auditsCompleted > 0 && h('span', { className: 'bg-teal-100 text-teal-700 px-3 py-1 rounded-full text-xs font-bold' }, auditsCompleted + ' audits')
        ),

        // Student-friendly intro (collapsible)
        // The contrast theme recolours text to yellow but cannot recolour a gradient background:
        // this intro measured yellow on pale cyan. Give it a solid black ground there.
        !d.introHidden && h('div', { className: (isContrast ? 'bg-black border-2 border-yellow-300' : 'bg-gradient-to-r from-teal-50 to-cyan-50 border-2 border-teal-200') + ' rounded-2xl p-5 relative' },
          h('button', { onClick: function() { upd('introHidden', true); }, className: 'absolute top-3 right-3 text-teal-700 hover:text-teal-900 text-xs font-bold', 'aria-label': t('stem.a11yauditor.hide_intro', 'Hide intro') }, '\u2716'),
          h('h3', { className: 'text-base font-black text-teal-800 mb-2' }, t('stem.a11yauditor.what_is_digital_accessibility', '\u267F What is Digital Accessibility?')),
          h('p', { className: 'text-sm text-teal-700 leading-relaxed mb-3' },
            parseInt(gradeLevel, 10) <= 5
              ? 'Imagine you visit a website but you can\u2019t see the screen. A special tool called a screen reader reads the page aloud to you. But what if the pictures don\u2019t have descriptions? Or the buttons don\u2019t say what they do? That\u2019s what happens when a website isn\u2019t accessible. In this lab, YOU become a detective \u2014 finding problems that make websites hard to use for people with disabilities!'
              : parseInt(gradeLevel, 10) <= 8
                ? t('stem.a11yauditor.intro_mid_v2', 'About 1.3 billion people worldwide (around 1 in 6) have a significant disability, according to the World Health Organization. Screen readers, keyboard navigation, and voice control are tools people rely on every day. But these tools only work when websites are built correctly. WCAG (Web Content Accessibility Guidelines) are the rules that make the internet work for everyone. In this lab, you\u2019ll audit real websites and learn to spot barriers that block people with disabilities.')
                : t('stem.a11yauditor.intro_high_v2', 'About 16% of people worldwide, roughly 1.3 billion, have a significant disability (World Health Organization). Digital accessibility is guided by WCAG 2.2, the current W3C standard, and required by laws such as the ADA (WCAG 2.1 AA for state and local governments) and Section 508 (WCAG 2.0 AA for U.S. federal agencies). It makes websites, apps, and documents usable by people with visual, auditory, motor, and cognitive disabilities. In this lab, you\u2019ll perform guided accessibility investigations, learn the technical criteria, and understand the human impact of each barrier.')
          ),
          h('div', { className: 'flex flex-wrap gap-2' },
            [
              { icon: '\uD83D\uDC41\uFE0F', label: t('stem.a11yauditor.blind_low_vision', 'Blind & low vision'), desc: t('stem.a11yauditor.need_screen_readers_and_alt_text', 'Need screen readers and alt text') },
              { icon: '\uD83D\uDC42', label: t('stem.a11yauditor.deaf_hard_of_hearing', 'Deaf & hard of hearing'), desc: t('stem.a11yauditor.need_captions_and_transcripts', 'Need captions and transcripts') },
              { icon: '\u270B', label: t('stem.a11yauditor.motor_disabilities', 'Motor disabilities'), desc: t('stem.a11yauditor.need_keyboard_only_navigation', 'Need keyboard-only navigation') },
              { icon: '\uD83E\uDDE0', label: t('stem.a11yauditor.cognitive_disabilities', 'Cognitive disabilities'), desc: t('stem.a11yauditor.need_clear_language_and_structure', 'Need clear language and structure') }
            ].map(function(d2) {
              return h('div', { key: d2.label, className: 'flex items-center gap-2 bg-white rounded-lg px-3 py-1.5 border border-teal-100 text-xs' },
                h('span', null, d2.icon),
                h('div', null,
                  h('span', { className: 'font-bold text-teal-800' }, d2.label),
                  h('span', { className: 'text-teal-700 ml-1' }, '\u2014 ' + d2.desc)
                )
              );
            })
          )
        ),

        // Tabs
        (function () {
          var TABS = [{ id: 'audit', label: t('stem.a11yauditor.audit', '\uD83D\uDD0D Audit') }, { id: 'learn', label: t('stem.a11yauditor.learn', '\uD83D\uDCD6 Learn') }, { id: 'knowbility', label: t('stem.a11yauditor.knowbility', '\u267F Knowbility') }, { id: 'action', label: t('stem.a11yauditor.take_action', '\u2696\uFE0F Take Action') }, { id: 'history', label: t('stem.a11yauditor.history', '\uD83D\uDCCA History') }, { id: 'badges', label: t('stem.a11yauditor.badges', '\uD83C\uDFC5 Badges') }];
          // A leading emoji is decoration: hide it from screen readers so the tab is read as "Audit", not "magnifying glass tilted left Audit".
          var splitIcon = function (label) { var m = /^(\S+)\s+(.+)$/.exec(String(label)); return (m && !/[A-Za-z0-9\u00C0-\u024F\u0370-\u03FF\u0400-\u04FF\u0590-\u06FF\u0900-\u0DFF\u0E00-\u0EFF\u1100-\u11FF\u3040-\u30FF\u3400-\u9FFF\uAC00-\uD7AF]/.test(m[1])) ? [m[1], m[2]] : [null, String(label)]; };
          var go = function (id) {
            try { var el = document.getElementById('a11yaud-tab-' + id); if (el) el.focus(); } catch (_) {}
            if (id !== tab) upd('tab', id);
          };
          var onKey = function (e) {
            var i = TAB_IDS_ORDER.indexOf(tab), n = TAB_IDS_ORDER.length, next = null;
            if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next = TAB_IDS_ORDER[(i + 1) % n];
            else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') next = TAB_IDS_ORDER[(i - 1 + n) % n];
            else if (e.key === 'Home') next = TAB_IDS_ORDER[0];
            else if (e.key === 'End') next = TAB_IDS_ORDER[n - 1];
            if (next) { e.preventDefault(); go(next); }
          };
          var TAB_IDS_ORDER = TABS.map(function (x) { return x.id; });
          return h('div', { role: 'tablist', 'aria-label': t('stem.a11yauditor.sections_label', 'Digital Accessibility Lab sections'), className: 'flex gap-1 bg-teal-50 rounded-xl p-1 border border-teal-200 flex-wrap' },
            TABS.map(function(tb) {
              var parts = splitIcon(tb.label), sel = tab === tb.id;
              return h('button', {
                key: tb.id, id: 'a11yaud-tab-' + tb.id, type: 'button', role: 'tab', 'aria-selected': sel, 'aria-controls': 'a11yaud-panel', tabIndex: sel ? 0 : -1,
                onClick: function() { go(tb.id); }, onKeyDown: onKey,
                className: 'flex-1 px-2 py-2 rounded-lg text-[0.6875rem] font-bold transition-all min-w-[60px] ' + (sel ? 'bg-white text-teal-700 shadow-sm' : 'text-teal-700 hover:text-teal-900')
              }, parts[0] && h('span', { 'aria-hidden': 'true' }, parts[0] + ' '), parts[1]);
            })
          );
        })(),

        h('div', { role: 'tabpanel', id: 'a11yaud-panel', 'aria-labelledby': 'a11yaud-tab-' + tab, tabIndex: -1, className: 'space-y-4' },

        // ── Topic-accent hero band per tab ──
        (function() {
          var TAB_META = {
            audit:      { accent: '#115e59', soft: 'rgba(13,148,136,0.10)',  icon: '\uD83D\uDD0D', title: t('stem.a11yauditor.audit_paste_it_see_what_breaks', 'Audit \u2014 paste it, see what breaks'),         hint: callGemini
              ? t('stem.a11yauditor.audit_hint_ai_v2', 'AI reviews a website, HTML, PDF, screenshot, social post or government site against WCAG 2.2 AA, and pasted HTML is also measured by code. Common findings: missing alt text (1.1.1), color contrast under 4.5:1 (1.4.3), keyboard traps (2.1.2), unlabeled inputs (3.3.2).')
              : t('stem.a11yauditor.audit_hint_noai', 'Paste HTML and the code measures it, with no AI. Common findings: missing alt text (1.1.1), color contrast under 4.5:1 (1.4.3), links with no text (2.4.4), unlabeled inputs (3.3.2).') },
            learn:      { accent: '#1d4ed8', soft: 'rgba(37,99,235,0.10)',   icon: '\uD83D\uDCD6', title: t('stem.a11yauditor.learn_the_four_pour_principles', 'Learn \u2014 the four POUR principles'),         hint: t('stem.a11yauditor.perceivable_operable_understandable_ro', 'Perceivable, Operable, Understandable, Robust. Every WCAG criterion maps to one of these. Disability is a mismatch between body and environment, never a property of the person.') },
            knowbility: { accent: '#9333ea', soft: 'rgba(147,51,234,0.10)',  icon: '\u267F',         title: t('stem.a11yauditor.knowbility_the_field_s_veterans', 'Knowbility \u2014 the field\u2019s veterans'),     hint: t('stem.a11yauditor.knowbility_austin_tx_est_1999_runs_ope', 'Knowbility (Austin TX, est. 1999) runs OpenAIR \u2014 the world\u2019s longest-running accessibility hackathon \u2014 and trains pros via AccessU. They wrote much of the playbook every modern auditor uses.') },
            action:     { accent: '#92400e', soft: 'rgba(217,119,6,0.10)',   icon: '\u2696\uFE0F', title: t('stem.a11yauditor.take_action_advocacy_in_practice', 'Take Action \u2014 advocacy in practice'),          hint: t('stem.a11yauditor.you_don_t_need_a_lawyer_to_file_an_ada', 'You don\u2019t need a lawyer to file an ADA Title II / III complaint. Department of Justice (ada.gov), Section 508 (section508.gov), and state AG offices all accept civilian complaints \u2014 and inaccessible gov sites are illegal.') },
            history:    { accent: '#065f46', soft: 'rgba(5,150,105,0.10)',   icon: '\uD83D\uDCCA', title: t('stem.a11yauditor.history_your_audit_trail', 'History \u2014 your audit trail'),                hint: t('stem.a11yauditor.past_audits_saved_here_so_you_can_trac', 'Past audits saved here so you can track which sites improved (or regressed) over time. Aggregate metrics let you make a sharable case to school IT or a vendor.') },
            badges:     { accent: '#854d0e', soft: 'rgba(202,138,4,0.10)',   icon: '\uD83C\uDFC5', title: t('stem.a11yauditor.badges_audit_milestones', 'Badges \u2014 audit milestones'),                  hint: t('stem.a11yauditor.badges_hint_v2', 'First Audit, Pattern Spotter, Eagle Eye, WCAG Expert, Change Agent and more. Recognition for the unglamorous work of catching barriers before they reach disabled users.') }
          };
          var meta = TAB_META[tab] || TAB_META.audit;
          return h('div', {
            style: {
              margin: '0 0 12px',
              padding: '12px 14px',
              borderRadius: 12,
              background: 'linear-gradient(135deg, ' + meta.soft + ' 0%, rgba(255,255,255,0) 100%)',
              border: '1px solid ' + meta.accent + '55',
              borderLeft: '4px solid ' + meta.accent,
              display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap'
            }
          },
            h('div', { style: { fontSize: 28, flexShrink: 0 }, 'aria-hidden': 'true' }, meta.icon),
            h('div', { style: { flex: 1, minWidth: 220 } },
              // Inline colours bypass the theme; in the contrast theme this band sits on a black surface.
              h('h3', { style: { color: isContrast ? '#ffffff' : meta.accent, fontSize: 15, fontWeight: 900, margin: 0, lineHeight: 1.2 } }, meta.title),
              h('p', { style: { margin: '3px 0 0', color: isContrast ? '#ffffff' : '#475569', fontSize: 11, lineHeight: 1.45, fontStyle: 'italic' } }, meta.hint)
            )
          );
        })(),

        // ═══ AUDIT TAB ═══
        tab === 'audit' && h('div', { className: 'space-y-4' },

          // Input area
          h('div', { className: 'bg-white rounded-2xl border-2 border-teal-200 p-5 space-y-3' },
            h('h3', { className: 'text-sm font-bold text-teal-700 mb-2' }, t('stem.a11yauditor.what_would_you_like_to_audit', 'What would you like to audit?')),

            // Input mode tabs
            h('div', { className: 'flex flex-wrap gap-1 bg-slate-100 rounded-lg p-1 mb-3' },
              [
                { id: 'url', icon: '\uD83C\uDF10', label: t('stem.a11yauditor.website', 'Website') },
                { id: 'html', icon: '\uD83D\uDCBB', label: 'HTML' },
                { id: 'pdf', icon: '\uD83D\uDCC4', label: 'PDF' },
                { id: 'screenshot', icon: '\uD83D\uDCF7', label: t('stem.a11yauditor.screenshot', 'Screenshot') },
                { id: 'social', icon: '\uD83D\uDCF1', label: t('stem.a11yauditor.social_media', 'Social Media') },
                { id: 'gov', icon: '\uD83C\uDFDB\uFE0F', label: 'Gov/School' }
              ].filter(function(mode) { return callGemini || mode.id === 'html'; }).map(function(mode) {
                return h('button', { key: mode.id,
                  'aria-pressed': auditInputMode === mode.id,
                  onClick: function() { upd('auditInputMode', mode.id); },
                  className: 'flex-1 px-2 py-1.5 rounded-md text-[0.6875rem] font-bold transition-all ' + (auditInputMode === mode.id ? 'bg-white text-teal-700 shadow-sm' : 'text-slate-600 hover:text-slate-700')
                }, mode.icon + ' ' + mode.label);
              })
            ),

            // URL input mode
            auditInputMode === 'url' && h('div', null,
              h('label', { className: 'text-xs font-bold text-slate-600 block mb-1' }, t('stem.a11yauditor.website_url', 'Website URL')),
              h('div', { className: 'flex gap-2' },
                h('input', {
                  type: 'url', value: auditUrl,
                  onChange: function(e) { upd('auditUrl', e.target.value); },
                  onKeyDown: function(e) { if (e.key === 'Enter' && auditUrl.trim()) fetchAndAudit(auditUrl.trim()); },
                  placeholder: 'https://example.com',
                  'aria-label': t('stem.a11yauditor.website_url_to_audit', 'Website URL to audit'),
                  className: 'flex-1 text-sm p-2.5 border border-slate-400 rounded-lg outline-none focus:ring-2 focus:ring-teal-700',
                  style: { background: '#ffffff', color: '#0f172a' }
                }),
                // Its accessible name was the stray aria-label "Try:"; the visible text is the name now.
                h('button', { type: 'button',
                  onClick: function() { if (auditUrl.trim()) fetchAndAudit(auditUrl.trim()); },
                  disabled: !auditUrl.trim() || auditLoading,
                  className: 'px-4 py-2 bg-teal-700 text-white rounded-lg text-xs font-bold hover:bg-teal-800 disabled:bg-slate-300 disabled:text-slate-600 transition-colors'
                }, auditLoading ? t('stem.a11yauditor.auditing', 'Auditing\u2026') : [h('span', { key: 'i', 'aria-hidden': 'true' }, '\uD83D\uDD0D '), t('stem.a11yauditor.audit_url_btn', 'Audit URL')])
              ),
              h('p', { className: 'text-[0.6875rem] text-slate-600 mt-1' }, t('stem.a11yauditor.the_ai_will_analyze_the_website_s_acce', 'The AI will analyze the website\u2019s accessibility based on its known structure and common patterns.')),
              // Quick suggestions
              h('div', { className: 'flex flex-wrap gap-2 pt-2' },
                h('span', { className: 'text-[0.6875rem] text-slate-600 font-bold' }, 'Try:'),
                ['https://www.wikipedia.org', 'https://www.google.com', 'https://www.nytimes.com', 'https://www.amazon.com'].map(function(url) {
                  return h('button', { key: url,
                    onClick: function() { upd('auditUrl', url); },
                    className: 'text-[0.6875rem] text-teal-700 hover:text-teal-900 font-medium hover:underline'
                  }, url.replace('https://www.', ''));
                })
              )
            ),

            // HTML input mode
            auditInputMode === 'html' && h('div', null,
              h('label', { className: 'text-xs font-bold text-slate-600 block mb-1' }, t('stem.a11yauditor.paste_html_code', 'Paste HTML Code')),
              h('textarea', {
                value: auditHtml,
                onChange: function(e) { setAuditHtml(e.target.value); },
                placeholder: t('stem.a11yauditor.html_head_title_my_page_title_head_bod', '<html>\n  <head><title>My Page</title></head>\n  <body>\n    <h1>Hello World</h1>\n    <img src="photo.jpg">\n  </body>\n</html>'),
                'aria-label': t('stem.a11yauditor.html_code_to_audit', 'HTML code to audit'),
                className: 'w-full text-xs p-3 border border-slate-400 rounded-lg outline-none focus:ring-2 focus:ring-teal-700 font-mono resize-none h-32'
              }),
              h('button', { type: 'button', onClick: function() { if (auditHtml.trim()) runAudit(auditHtml.trim(), 'html'); },
                disabled: !auditHtml.trim() || auditLoading,
                className: 'mt-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700 disabled:opacity-40 transition-colors'
              }, auditLoading ? t('stem.a11yauditor.auditing', 'Auditing\u2026') : [h('span', { key: 'i', 'aria-hidden': 'true' }, '\uD83D\uDD0D '), t('stem.a11yauditor.audit_html_btn', 'Audit HTML')]),
              h('p', { className: 'text-[0.6875rem] text-slate-600 mt-1' }, callGemini
                ? t('stem.a11yauditor.paste_html_help_ai', 'Paste any HTML code \u2014 from a school project, a webpage, or a coding tool. Code measures what it can, then the AI reviews the rest. Your HTML is kept for this visit only.')
                : t('stem.a11yauditor.paste_html_help_noai', 'Paste any HTML code \u2014 from a school project, a webpage, or a coding tool. Code checks it (no AI) and lists what it could not check. Your HTML is kept for this visit only.'))
            ),

            // PDF input mode
            auditInputMode === 'pdf' && h('div', { className: 'text-center py-4' },
              h('div', { className: 'text-3xl mb-2' }, '\uD83D\uDCC4'),
              h('p', { className: 'text-sm text-slate-600 mb-3' }, t('stem.a11yauditor.upload_a_pdf_document_to_check_its_acc', 'Upload a PDF document to check its accessibility')),
              h('p', { className: 'text-[0.6875rem] text-slate-600 mb-3' }, t('stem.a11yauditor.the_ai_will_check_for_tagged_structure', 'The AI will check for: tagged structure, reading order, alt text on images, form labels, color contrast, language declaration, and heading hierarchy.')),
              // A display:none file input inside a <label> cannot be reached with Tab. A real button opens the picker.
              h('input', {
                type: 'file', accept: 'application/pdf', className: 'hidden', ref: pdfInputRef, tabIndex: -1, 'aria-hidden': 'true',
                onChange: handleFileAudit, disabled: auditLoading
              }),
              h('button', { type: 'button', disabled: auditLoading,
                onClick: function () { if (pdfInputRef.current) pdfInputRef.current.click(); },
                className: 'inline-flex items-center gap-2 px-5 py-2.5 bg-teal-700 text-white rounded-lg text-xs font-bold hover:bg-teal-800 transition-colors disabled:opacity-40'
              }, auditLoading ? t('stem.a11yauditor.auditing', 'Auditing\u2026') : [h('span', { key: 'i', 'aria-hidden': 'true' }, '\uD83D\uDCC2 '), t('stem.a11yauditor.upload_pdf_btn', 'Upload PDF')])
            ),

            // Screenshot input mode
            auditInputMode === 'screenshot' && h('div', { className: 'text-center py-4' },
              h('div', { className: 'text-3xl mb-2' }, '\uD83D\uDCF7'),
              h('p', { className: 'text-sm text-slate-600 mb-3' }, t('stem.a11yauditor.upload_a_screenshot_of_a_website_app_o', 'Upload a screenshot of a website, app, or document')),
              h('p', { className: 'text-[0.6875rem] text-slate-600 mb-3' }, t('stem.a11yauditor.the_ai_will_visually_analyze_the_scree', 'The AI will visually analyze the screenshot for: color contrast issues, missing labels, layout problems, text readability, and visual accessibility barriers.')),
              h('input', {
                type: 'file', accept: 'image/*', className: 'hidden', ref: shotInputRef, tabIndex: -1, 'aria-hidden': 'true',
                onChange: handleFileAudit, disabled: auditLoading
              }),
              h('button', { type: 'button', disabled: auditLoading,
                onClick: function () { if (shotInputRef.current) shotInputRef.current.click(); },
                className: 'inline-flex items-center gap-2 px-5 py-2.5 bg-purple-600 text-white rounded-lg text-xs font-bold hover:bg-purple-700 transition-colors disabled:opacity-40'
              }, auditLoading ? t('stem.a11yauditor.auditing', 'Auditing\u2026') : [h('span', { key: 'i', 'aria-hidden': 'true' }, '\uD83D\uDCF7 '), t('stem.a11yauditor.upload_screenshot_btn', 'Upload Screenshot')])
            )
          ),

          // Social media input mode
          auditInputMode === 'social' && h('div', { className: 'bg-white rounded-2xl border-2 border-pink-200 p-5 space-y-3' },
            h('div', { className: 'flex items-center gap-2 mb-2' },
              h('span', { className: 'text-2xl' }, '\uD83D\uDCF1'),
              h('h3', { className: 'text-sm font-bold text-pink-700' }, t('stem.a11yauditor.social_media_post_audit', 'Social Media Post Audit'))
            ),
            // Platform selector
            h('div', { className: 'flex gap-1 bg-pink-50 rounded-lg p-1' },
              [{ id: 'instagram', label: t('stem.a11yauditor.instagram', 'Instagram') }, { id: 'twitter', label: 'X/Twitter' }, { id: 'facebook', label: t('stem.a11yauditor.facebook', 'Facebook') }, { id: 'linkedin', label: 'LinkedIn' }, { id: 'tiktok', label: 'TikTok' }].map(function(p) {
                return h('button', { key: p.id, 'aria-pressed': socialPlatform === p.id, onClick: function() { upd('socialPlatform', p.id); },
                  className: 'flex-1 px-2 py-1.5 rounded-md text-[0.6875rem] font-bold transition-all ' + (socialPlatform === p.id ? 'bg-white text-pink-700 shadow-sm' : 'text-pink-800 hover:text-pink-900')
                }, p.label);
              })
            ),
            h('label', { className: 'text-xs font-bold text-slate-600 block' }, t('stem.a11yauditor.paste_the_post_text_include_hashtags_m', 'Paste the post text (include hashtags, mentions, and any image descriptions)')),
            h('textarea', { value: socialText, onChange: function(e) { setSocialText(e.target.value); },
              placeholder: t('stem.a11yauditor.paste_the_full_post_text_here_include_', 'Paste the full post text here...\n\nInclude:\n\u2022 All text content\n\u2022 Hashtags\n\u2022 Image descriptions (if any)\n\u2022 Link URLs'),
              className: 'w-full text-xs p-3 border border-pink-600 rounded-lg outline-none focus:ring-2 focus:ring-pink-700 resize-none h-28', 'aria-label': t('stem.a11yauditor.social_media_post_text', 'Social media post text')
            }),
            h('div', { className: 'flex gap-2' },
              h('button', { 'aria-label': t('stem.a11yauditor.audit_social_media_post', 'Audit social media post'),
                onClick: runSocialAudit, disabled: !socialText.trim() || auditLoading,
                className: 'flex-1 px-4 py-2.5 bg-pink-600 text-white rounded-lg text-xs font-bold hover:bg-pink-700 disabled:opacity-40 transition-all'
              }, auditLoading ? 'Auditing...' : '\uD83D\uDD0D Audit Post'),
              h('button', { 'aria-label': t('stem.a11yauditor.rewrite_post_accessibly', 'Rewrite post accessibly'),
                onClick: rewriteAccessibly, disabled: !socialText.trim() || socialRewriteLoading,
                className: 'flex-1 px-4 py-2.5 bg-emerald-700 text-white rounded-lg text-xs font-bold hover:bg-emerald-700 disabled:opacity-40 transition-all'
              }, socialRewriteLoading ? 'Rewriting...' : '\u2728 Rewrite Accessibly')
            ),
            // Rewrite result
            socialRewrite && h('div', { className: 'bg-emerald-50 border border-emerald-200 rounded-xl p-4 space-y-2' },
              h('h4', { className: 'text-xs font-bold text-emerald-700' }, t('stem.a11yauditor.accessible_version', '\u2728 Accessible Version')),
              h('pre', { className: 'text-xs text-slate-700 whitespace-pre-wrap font-sans leading-relaxed' }, socialRewrite),
              h('button', { 'aria-label': t('stem.a11yauditor.copy_rewrite', 'Copy rewrite'), onClick: function() { (window.StemLab && window.StemLab.writeClipboard || function (value) { return navigator.clipboard.writeText(value); })(socialRewrite); if (addToast) addToast('Copied!', 'success'); },
                className: 'px-3 py-1.5 bg-emerald-100 text-emerald-800 rounded-lg text-[0.6875rem] font-bold hover:bg-emerald-200'
              }, t('stem.a11yauditor.copy_to_clipboard', '\uD83D\uDCCB Copy to Clipboard'))
            ),
            h('p', { className: 'text-[0.6875rem] text-slate-600' }, t('stem.a11yauditor.checks_alt_text_captions_camelcase_has', 'Checks: alt text, captions, CamelCase hashtags, emoji placement, readability, contrast, and text-in-images.'))
          ),

          // Government/School input mode
          auditInputMode === 'gov' && h('div', { className: 'bg-white rounded-2xl border-2 border-amber-200 p-5 space-y-3' },
            h('div', { className: 'flex items-center gap-2 mb-2' },
              h('span', { className: 'text-2xl' }, '\uD83C\uDFDB\uFE0F'),
              h('h3', { className: 'text-sm font-bold text-amber-700' }, t('stem.a11yauditor.government_school_title_ii_audit', 'Government / School Title II Audit'))
            ),
            h('p', { className: 'text-xs text-slate-600 mb-2' }, t('stem.a11yauditor.audit_government_and_school_websites_f', 'Audit government and school websites for ADA Title II compliance. Includes standard WCAG checks plus Title II-specific requirements.')),
            // Entity type
            h('div', { className: 'flex gap-1 bg-amber-50 rounded-lg p-1 mb-2' },
              [{ id: 'school', label: t('stem.a11yauditor.school', '\uD83C\uDFEB School') }, { id: 'library', label: t('stem.a11yauditor.library', '\uD83D\uDCDA Library') }, { id: 'city', label: t('stem.a11yauditor.city_county', '\uD83C\uDFD9\uFE0F City/County') }, { id: 'state', label: t('stem.a11yauditor.state', '\uD83C\uDFDB\uFE0F State') }].map(function(t) {
                return h('button', { key: t.id, 'aria-pressed': govEntityType === t.id, onClick: function() { upd('govEntityType', t.id); },
                  className: 'flex-1 px-2 py-1.5 rounded-md text-[0.6875rem] font-bold transition-all ' + (govEntityType === t.id ? 'bg-white text-amber-700 shadow-sm' : 'text-amber-800 hover:text-amber-900')
                }, t.label);
              })
            ),
            h('label', { className: 'text-xs font-bold text-slate-600 block' }, t('stem.a11yauditor.website_url_2', 'Website URL')),
            h('div', { className: 'flex gap-2' },
              h('input', { type: 'url', value: govUrl, onChange: function(e) { upd('govUrl', e.target.value); },
                onKeyDown: function(e) { if (e.key === 'Enter' && govUrl.trim()) runGovAudit(); },
                placeholder: 'https://www.portlandschools.org', 'aria-label': t('stem.a11yauditor.government_website_url', 'Government website URL'),
                className: 'flex-1 text-sm p-2.5 border border-amber-600 rounded-lg outline-none focus:ring-2 focus:ring-amber-700'
              }),
              h('button', { 'aria-label': t('stem.a11yauditor.run_title_ii_audit', 'Run Title II audit'),
                onClick: runGovAudit, disabled: !govUrl.trim() || auditLoading,
                className: 'px-4 py-2 bg-amber-700 text-white rounded-lg text-xs font-bold hover:bg-amber-800 disabled:opacity-40 transition-colors'
              }, auditLoading ? 'Auditing...' : '\u2696\uFE0F Title II Audit')
            ),
            h('p', { className: 'text-[0.6875rem] text-slate-600 mt-1' }, t('stem.a11yauditor.checks_wcag_2_1_aa_ada_coordinator_inf', 'Checks WCAG 2.1 AA + ADA Coordinator info, accessibility statement, grievance procedure, PDF tagging, form accessibility, captions, and third-party tools.'))
          ),

          // Loading
          auditLoading && h('div', { role: 'status', className: 'bg-teal-50 border border-teal-200 rounded-2xl p-8 text-center' },
            h('div', { className: 'text-4xl mb-3 animate-pulse', 'aria-hidden': 'true' }, '♿'),
            h('p', { className: 'text-teal-700 font-bold' }, t('stem.a11yauditor.running_wcag_2_2_review', 'Running a WCAG 2.2 AA accessibility review…')),
            h('p', { className: 'text-xs text-teal-800 mt-1' }, t('stem.a11yauditor.checking_structure_images_contrast_key', 'Checking structure, images, contrast, keyboard access, and more'))
          ),

          // Measured findings show whenever they exist: alone with AI off, and also when the AI passes failed.
          renderMeasuredPanel(),

          // With AI off there is no AI result, so the measured check gets its own report and reset.
          !callGemini && deterministicAudit && h('div', { className: 'flex gap-2 justify-center' },
            h('button', { type: 'button', onClick: downloadReport, className: 'px-4 py-2 bg-indigo-100 text-indigo-700 rounded-lg text-xs font-bold hover:bg-indigo-200 transition-colors' }, t('stem.a11yauditor.download_report_2', '📥 Download Report')),
            h('button', { type: 'button', onClick: function() { setAuditHtml(''); updMulti({ deterministicAudit: null, auditSource: null }); }, className: 'px-4 py-2 bg-slate-100 text-slate-700 rounded-lg text-xs font-bold hover:bg-slate-200 transition-colors' }, t('stem.a11yauditor.new_audit_2', '🔄 New Audit'))
          ),

          // An AI pass that failed used to show nothing at all.
          callGemini && !auditLoading && auditResult && auditResult.score < 0 && h('div', { role: 'alert', className: 'bg-red-50 border-2 border-red-300 rounded-2xl p-4 text-sm text-red-800' },
            h('strong', null, t('stem.a11yauditor.ai_review_failed', 'The AI review did not finish.')), ' ', auditResult.summary,
            deterministicAudit ? ' ' + t('stem.a11yauditor.ai_failed_measured_still', 'The measured checks above still apply.') : ''
          ),

          // Results
          callGemini && auditResult && auditResult.score >= 0 && h('div', { className: 'space-y-4' },

            // Score header. White text needs the 700-level colours: white on green-500 / amber-500 measured about 2.2:1.
            h('div', { className: 'bg-gradient-to-r ' + (auditResult.score >= 80 ? 'from-green-700 to-emerald-800' : auditResult.score >= 60 ? 'from-amber-700 to-orange-800' : auditResult.score >= 40 ? 'from-orange-700 to-red-700' : 'from-red-700 to-rose-800') + ' text-white rounded-2xl p-6 text-center' },
              h('div', { className: 'text-6xl font-black' }, auditResult.score, h('span', { className: 'text-2xl opacity-80' }, '/100')),
              h('div', { className: 'text-3xl font-black mt-1' }, 'Grade: ', auditResult.grade),
              h('div', { className: 'text-[0.8125rem] font-semibold mt-2', style: { maxWidth: '44ch' } },
                t('stem.a11yauditor.this_score_is_generated_by_an_ai_model', 'This score is generated by an AI model reasoning over what it can see — not an automated WCAG test. Verify real contrast ratios, keyboard order, and focus with tools like axe, WAVE, or Lighthouse.')),
              h('p', { className: 'text-sm opacity-90 mt-2 max-w-md mx-auto' }, auditResult.summary)
            ),

            // Score breakdown (the measured panel now renders once, above the AI results)
            auditResult.score_breakdown && h('div', { className: 'bg-white rounded-2xl border border-slate-400 p-4' },
              h('h4', { className: 'text-xs font-bold text-slate-600 uppercase tracking-widest mb-3' }, t('stem.a11yauditor.score_breakdown', 'Score Breakdown')),
              h('div', { className: 'grid grid-cols-2 sm:grid-cols-5 gap-2' },
                Object.entries(auditResult.score_breakdown).filter(function(entry) { return entry[1] != null; }).map(function(entry) {
                  var key = entry[0], val = entry[1];
                  var color = val >= 8 ? 'bg-green-100 text-green-700 border-green-200' : val >= 5 ? 'bg-amber-100 text-amber-700 border-amber-200' : 'bg-red-100 text-red-700 border-red-200';
                  return h('div', { key: key, className: 'text-center p-2 rounded-lg border ' + color },
                    h('div', { className: 'text-lg font-black' }, val, '/10'),
                    h('div', { className: 'text-[0.6875rem] font-bold uppercase' }, key)
                  );
                })
              )
            ),

            // Title II compliance card (government audits)
            auditResult.title_ii && h('div', { className: 'bg-amber-50 rounded-2xl border-2 border-amber-300 p-4' },
              h('h4', { className: 'text-xs font-bold text-amber-800 uppercase tracking-widest mb-3' }, t('stem.a11yauditor.title_ii_things_to_investigate', '\u2696\uFE0F Title II \u2014 Things to Investigate')),
              h('div', { className: 'text-xs opacity-70 mb-2' },
                t('stem.a11yauditor.alloflow_cannot_fetch_or_inspect_a_liv', 'AlloFlow cannot fetch or inspect a live site \u2014 these are AI guesses from training data, not verified findings. Do not claim compliance or file a complaint based on them without checking each one yourself.')),
              h('div', { className: 'grid grid-cols-2 gap-2' },
                [{ key: 'ada_coordinator', label: t('stem.a11yauditor.ada_coordinator_published', 'ADA Coordinator Published') }, { key: 'accessibility_statement', label: t('stem.a11yauditor.accessibility_statement', 'Accessibility Statement') }, { key: 'grievance_procedure', label: t('stem.a11yauditor.grievance_procedure', 'Grievance Procedure') }, { key: 'compliant_forms', label: t('stem.a11yauditor.accessible_forms', 'Accessible Forms') }, { key: 'tagged_pdfs', label: t('stem.a11yauditor.tagged_pdf_documents', 'Tagged PDF Documents') }, { key: 'captioned_videos', label: t('stem.a11yauditor.captioned_videos', 'Captioned Videos') }].map(function(item) {
                  var pass = auditResult.title_ii[item.key];
                  return h('div', { key: item.key, className: 'flex items-center gap-2 p-2 rounded-lg border ' + (pass ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200') },
                    h('span', { className: 'text-sm' }, pass ? '\u2705' : '\u274C'),
                    h('span', { className: 'text-[0.6875rem] font-bold ' + (pass ? 'text-green-700' : 'text-red-700') }, item.label)
                  );
                })
              ),
              h('button', { 'aria-label': t('stem.a11yauditor.file_complaint_about_findings', 'File complaint about findings'), onClick: async function() {
                // Same integrity gate as the Generate button below: the point is
                // that an AI-generated guess is never carried forward as a
                // verified finding, so it fails CLOSED — no dialog, no navigation.
                var confirmApi = typeof window !== 'undefined' && window.AlloFlowUX && window.AlloFlowUX.confirm;
                var unavailable = 'The confirmation step is unavailable right now, so nothing was opened.';
                if (typeof confirmApi !== 'function') { if (addToast) addToast(unavailable, 'warning'); return; }
                var acknowledged = false;
                try {
                  acknowledged = await confirmApi(
                    'These findings are AI-generated guesses, not a verified audit. Only continue if you have independently confirmed each issue is real. Continue?',
                    { title: 'Confirm findings before filing', confirmText: 'I have verified these findings',
                      cancelText: 'Go back', tone: 'warning' }
                  );
                } catch (e) { if (addToast) addToast(unavailable, 'warning'); return; }
                if (!acknowledged) return;
                upd('tab', 'action');
              }, className: 'mt-3 w-full px-3 py-2 bg-amber-700 text-white rounded-lg text-xs font-bold hover:bg-amber-800 transition-colors' }, t('stem.a11yauditor.take_action_generate_complaint_letter', '\u270D\uFE0F Take Action \u2014 Generate Complaint Letter'))
            ),

            // Issues
            auditResult.issues && auditResult.issues.length > 0 && h('div', { className: 'bg-white rounded-2xl border border-slate-400 p-4' },
              h('h4', { className: 'text-xs font-bold text-slate-600 uppercase tracking-widest mb-3' }, t('stem.a11yauditor.issues_found', 'Issues Found ('), auditResult.issues.length, ')'),
              h('div', { className: 'space-y-2' },
                auditResult.issues.map(function(issue, i) {
                  var sevColor = issue.severity === 'critical' ? 'bg-red-50 border-red-200' : issue.severity === 'major' ? 'bg-amber-50 border-amber-200' : 'bg-blue-50 border-blue-200';
                  return h('div', { key: i, className: 'p-3 rounded-xl border ' + sevColor },
                    h('div', { className: 'flex items-start gap-2' },
                      h('span', { className: 'text-[0.6875rem] font-bold px-1.5 py-0.5 rounded ' + (issue.severity === 'critical' ? 'bg-red-200 text-red-800' : issue.severity === 'major' ? 'bg-amber-200 text-amber-800' : 'bg-blue-200 text-blue-800') }, issue.severity),
                      h('span', { className: 'text-[0.6875rem] font-bold text-slate-600' }, 'WCAG ', issue.criterion)
                    ),
                    h('p', { className: 'text-sm text-slate-800 font-medium mt-1' }, issue.issue),
                    issue.who && h('p', { className: 'text-xs text-slate-600 mt-1' }, t('stem.a11yauditor.who_it_affects', '👤 Who it affects: '), issue.who),
                    issue.fix && h('p', { className: 'text-xs text-teal-700 mt-1 font-medium' }, t('stem.a11yauditor.fix', '🔧 Fix: '), issue.fix)
                  );
                })
              )
            ),

            // Strengths
            auditResult.strengths && auditResult.strengths.length > 0 && h('div', { className: 'bg-green-50 border border-green-200 rounded-xl p-4' },
              h('h4', { className: 'text-xs font-bold text-green-800 uppercase tracking-widest mb-2' }, t('stem.a11yauditor.what_s_good', '✅ What\'s Good')),
              auditResult.strengths.map(function(s, i) {
                return h('div', { key: i, className: 'text-xs text-green-700 mb-1 flex items-start gap-2' }, h('span', null, '✓'), ' ', s);
              })
            ),

            // Recommendation
            auditResult.recommendation && h('div', { className: 'bg-indigo-50 border border-indigo-200 rounded-xl p-4 text-center' },
              h('p', { className: 'text-sm text-indigo-800 font-medium' }, '💡 ', auditResult.recommendation)
            ),

            // Action buttons
            h('div', { className: 'flex gap-2 justify-center' },
              h('button', { 'aria-label': t('stem.a11yauditor.download_report', 'Download Report'), onClick: downloadReport, className: 'px-4 py-2 bg-indigo-100 text-indigo-700 rounded-lg text-xs font-bold hover:bg-indigo-200 transition-colors' }, t('stem.a11yauditor.download_report_2', '📥 Download Report')),
              h('button', { 'aria-label': t('stem.a11yauditor.new_audit', 'New Audit'), onClick: function() { setAuditHtml(''); updMulti({ auditResult: null, auditUrl: '', deterministicAudit: null, auditSource: null }); }, className: 'px-4 py-2 bg-slate-100 text-slate-600 rounded-lg text-xs font-bold hover:bg-slate-200 transition-colors' }, t('stem.a11yauditor.new_audit_2', '🔄 New Audit'))
            )
          )
        ),

        // ═══ LEARN WCAG TAB ═══
        tab === 'learn' && h('div', { className: 'space-y-3' },
          h('p', { className: 'text-sm text-slate-600 text-center mb-2' + onHostInk }, t('stem.a11yauditor.learn_intro_v2', 'WCAG 2.2 (the current W3C standard, October 2023) has 55 success criteria at Levels A and AA. Below are 10 of the most common, plus the six that are new in 2.2. Select any criterion to learn more.')),

          // ── Live contrast checker (real WCAG math, client-side) ──
          // The tool's #1 taught concept (1.4.3) was prose-only, and the AI
          // "score" can't truly measure contrast. This computes a REAL ratio
          // from relative luminance — one honest, verifiable measurement.
          (function() {
            var ccFg = d.ccFg || '#717b8c', ccBg = d.ccBg || '#ffffff';
            function _hexToRgb(hx) {
              var m = /^#?([0-9a-f]{6})$/i.exec(hx || '');
              if (!m) return [0, 0, 0];
              var n = parseInt(m[1], 16);
              return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
            }
            function _lum(rgb) {
              var c = rgb.map(function(v) { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); });
              return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
            }
            var l1 = _lum(_hexToRgb(ccFg)), l2 = _lum(_hexToRgb(ccBg));
            var ratio = (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
            function chip(label, pass) {
              return h('div', { className: 'px-2 py-1 rounded-lg text-[0.6875rem] font-bold ' + (pass ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700') }, (pass ? '✅ ' : '❌ ') + label);
            }
            return h('div', { className: 'rounded-2xl border-2 border-teal-300 bg-white p-4 mb-3' },
              h('h4', { className: 'text-sm font-black text-slate-800 mb-1' }, t('stem.a11yauditor.live_contrast_checker', '🎨 Live contrast checker')),
              h('p', { className: 'text-[0.6875rem] text-slate-600 mb-3' }, t('stem.a11yauditor.a_real_wcag_ratio_computed_in_your_bro', 'A REAL WCAG ratio computed in your browser from relative luminance — not an AI guess. Pick a text and a background color.')),
              h('div', { className: 'flex flex-wrap items-center gap-4' },
                h('label', { className: 'flex items-center gap-2 text-xs font-bold text-slate-700' }, t('stem.a11yauditor.text', 'Text'),
                  h('input', { type: 'color', value: ccFg, 'aria-label': t('stem.a11yauditor.text_color', 'Text color'), onChange: function(e) { upd('ccFg', e.target.value); }, className: 'w-9 h-9 rounded cursor-pointer border border-slate-300' })),
                h('label', { className: 'flex items-center gap-2 text-xs font-bold text-slate-700' }, t('stem.a11yauditor.background', 'Background'),
                  h('input', { type: 'color', value: ccBg, 'aria-label': t('stem.a11yauditor.background_color', 'Background color'), onChange: function(e) { upd('ccBg', e.target.value); }, className: 'w-9 h-9 rounded cursor-pointer border border-slate-300' })),
                h('div', { className: 'flex-1 min-w-[140px] rounded-lg border border-slate-300 px-3 py-2 text-center', style: { background: ccBg, color: ccFg } },
                  h('div', { className: 'text-sm' }, t('stem.a11yauditor.sample_text', 'Sample text')),
                  h('div', { className: 'text-2xl font-bold' }, t('stem.a11yauditor.large_heading', 'Large heading')))
              ),
              h('div', { className: 'mt-3 flex flex-wrap items-center gap-2' },
                h('div', { className: 'text-xl font-black text-slate-800' }, ratio.toFixed(2) + ':1'),
                h('span', { className: 'text-[0.6875rem] text-slate-600 mr-1' }, t('stem.a11yauditor.contrast_ratio', 'contrast ratio')),
                chip('AA normal (4.5)', ratio >= 4.5),
                chip('AAA normal (7)', ratio >= 7),
                chip('AA large (3)', ratio >= 3),
                chip('AAA large (4.5)', ratio >= 4.5)
              ),
              h('p', { className: 'text-[0.625rem] text-slate-600 mt-2' }, t('stem.a11yauditor.large_18pt_or_14pt_bold_this_is_the_ex', 'Large = 18pt+ (or 14pt+ bold). This is the exact math axe / WAVE / Lighthouse use.'))
            );
          })(),

          // ── Focus-visible demo (criterion 2.4.7) — taught in prose, now you
          // can FEEL it. Tab between the two buttons: one shows a clear focus
          // ring, the other hides it (a real WCAG failure for keyboard users). ──
          h('div', { className: 'rounded-2xl border-2 border-teal-300 bg-white p-4 mb-3' },
            h('h4', { className: 'text-sm font-black text-slate-800 mb-1' }, t('stem.a11yauditor.focus_visible_demo_2_4_7', '⌨️ Focus-visible demo (2.4.7)')),
            h('p', { className: 'text-[0.6875rem] text-slate-600 mb-3' }, t('stem.a11yauditor.press_tab_to_move_between_these_two_bu', 'Press Tab to move between these two buttons. One shows where keyboard focus is; the other hides it — a keyboard-only user would be lost.')),
            h('div', { className: 'flex flex-wrap gap-5' },
              h('div', { className: 'text-center' },
                // The "good" example must itself pass: an amber-400 ring measured 1.67:1 on white. amber-700 with a white gap is about 5:1.
                h('button', { type: 'button', className: 'px-4 py-2 rounded-lg bg-teal-700 text-white font-bold text-xs hover:bg-teal-800 focus:outline-none focus:ring-4 focus:ring-offset-2 focus:ring-amber-700' }, t('stem.a11yauditor.tab_to_me', 'Tab to me ✅')),
                h('div', { className: 'text-[0.625rem] text-green-700 font-bold mt-1' }, t('stem.a11yauditor.visible_focus_ring', 'Visible focus ring'))),
              h('div', { className: 'text-center' },
                h('button', { type: 'button', className: 'px-4 py-2 rounded-lg bg-slate-600 text-white font-bold text-xs hover:bg-slate-700 focus:outline-none', style: { outline: 'none' } }, t('stem.a11yauditor.tab_to_me_2', 'Tab to me ❌')),
                h('div', { className: 'text-[0.625rem] text-red-600 font-bold mt-1' }, t('stem.a11yauditor.focus_hidden_fails_2_4_7', 'Focus hidden — fails 2.4.7')))
            )
          ),

          WCAG_CRITERIA.map(function(criterion) {
            var isExpanded = selectedCriterion === criterion.id;
            return h('div', { key: criterion.id,
              className: 'rounded-2xl border-2 overflow-hidden transition-all ' + (isExpanded ? 'border-teal-400 bg-teal-50' : 'border-slate-200 bg-white hover:border-teal-300')
            },
              h('button', {
                type: 'button', 'aria-expanded': isExpanded, 'aria-controls': 'a11yaud-crit-' + criterion.id.replace(/\./g, '-'),
                onClick: function() {
                  if (isExpanded) { upd('selectedCriterion', null); return; }
                  // Count and reward each criterion ONCE, however many times it is reopened.
                  if (criteriaSeen.indexOf(criterion.id) < 0) {
                    var seen = criteriaSeen.concat([criterion.id]);
                    updMulti({ selectedCriterion: criterion.id, criteriaSeen: seen, criteriaExplored: Math.max(criteriaExplored, seen.length) });
                    if (awardStemXP) awardStemXP(3);
                  } else upd('selectedCriterion', criterion.id);
                },
                className: 'w-full p-4 text-left flex items-center gap-3'
              },
                h('span', { className: 'bg-teal-100 text-teal-700 px-2 py-1 rounded-lg text-xs font-bold shrink-0' }, criterion.id),
                h('div', { className: 'flex-1' },
                  h('div', { className: 'font-bold text-sm text-slate-800' }, criterion.name),
                  h('span', { className: 'text-[0.6875rem] text-slate-600 font-bold' }, t('stem.a11yauditor.level', 'Level '), criterion.level)
                )
              ),
              isExpanded && h('div', { id: 'a11yaud-crit-' + criterion.id.replace(/\./g, '-'), className: 'px-4 pb-4 space-y-2' },
                h('p', { className: 'text-sm text-slate-700 leading-relaxed' }, __alloT(criterion.descKey || ('stem.a11yauditor.' + (criterion.id) + '_desc'), criterion.desc)),
                h('div', { className: 'bg-white rounded-xl p-3 border border-teal-200' },
                  h('p', { className: 'text-xs text-teal-800 font-medium' }, t('stem.a11yauditor.impact', '👤 Impact: '), criterion.impact)
                ),
                callTTS && h('button', { 'aria-label': t('stem.a11yauditor.read_aloud', 'Read aloud'),
                  onClick: function() { callTTS(__alloT(criterion.descKey || ('stem.a11yauditor.' + (criterion.id) + '_desc'), criterion.desc) + '. Impact: ' + criterion.impact); },
                  className: 'text-[0.6875rem] text-teal-700 hover:text-teal-900 font-bold'
                }, t('stem.a11yauditor.read_aloud_2', '🔊 Read aloud'))
              )
            );
          }),

          // ── New in WCAG 2.2 (October 2023) ──
          h('section', { className: 'rounded-2xl border-2 border-indigo-300 bg-white p-4', 'aria-labelledby': 'a11yaud-wcag22-h' },
            h('h4', { id: 'a11yaud-wcag22-h', className: 'text-sm font-black text-slate-800 mb-1' }, t('stem.a11yauditor.wcag22_heading', 'New in WCAG 2.2')),
            h('p', { className: 'text-[0.75rem] text-slate-700 mb-3' }, t('stem.a11yauditor.wcag22_intro', 'WCAG 2.2 kept everything in WCAG 2.1, added these six Level A and AA criteria, and removed one old criterion, 4.1.1 Parsing, because modern browsers and assistive technology no longer need it. U.S. law for state and local governments (ADA Title II, 2024) still points to WCAG 2.1 AA; a page that meets WCAG 2.2 AA generally meets 2.1 AA too.')),
            h('ul', { className: 'space-y-2' }, WCAG22_NEW.map(function (c) {
              return h('li', { key: c.id, className: 'rounded-xl border border-slate-300 p-3' },
                h('div', { className: 'flex items-center gap-2 flex-wrap' },
                  h('span', { className: 'bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded-lg text-xs font-bold' }, c.id),
                  h('span', { className: 'font-bold text-sm text-slate-800' }, c.name),
                  h('span', { className: 'text-[0.6875rem] text-slate-700 font-bold' }, t('stem.a11yauditor.level', 'Level '), c.level)
                ),
                h('p', { className: 'text-xs text-slate-700 mt-1 leading-relaxed' }, t(c.key, c.desc))
              );
            }))
          )
        ),

        // ═══ KNOWBILITY TAB ═══
        tab === 'knowbility' && h('div', { className: 'space-y-4' },
          // Hero banner
          h('div', { className: 'bg-gradient-to-r from-indigo-600 to-purple-700 text-white rounded-2xl p-6 text-center' },
            h('div', { className: 'text-4xl mb-2' }, '\u267F'),
            h('h3', { className: 'text-lg font-black' }, t('stem.a11yauditor.knowbility_2', 'Knowbility')),
            h('p', { className: 'text-sm opacity-90 mt-1' }, t('stem.a11yauditor.creating_an_inclusive_digital_world_si', 'Creating an inclusive digital world since 1999'))
          ),
          // History
          h('div', { className: 'bg-white rounded-2xl border-2 border-indigo-200 p-5 space-y-3' },
            h('h4', { className: 'text-sm font-black text-indigo-800 uppercase tracking-widest' }, t('stem.a11yauditor.our_partner_s_story', 'Our Partner\u2019s Story')),
            h('p', { className: 'text-sm text-slate-700 leading-relaxed' },
              parseInt(gradeLevel, 10) <= 5
                ? 'Knowbility is a group of people in Austin, Texas who believe everyone should be able to use the internet \u2014 including people who are blind, deaf, or have other disabilities. They\u2019ve been working on this since 1999, which is over 25 years! They teach people how to build websites the right way and help test if websites actually work for everyone.'
                : 'Knowbility is a 501(c)(3) nonprofit founded in 1999 in Austin, TX. Born from a community effort during the late-1990s tech boom, they recognized that the digital revolution was leaving people with disabilities behind. For over 25 years, they\u2019ve worked to ensure equal access to technology through three pillars: Awareness, Education, and Accessibility Services.'
            ),
            h('div', { className: 'grid grid-cols-3 gap-2 mt-3' },
              [{ num: '25+', label: t('stem.a11yauditor.years', 'Years') }, { num: '1999', label: t('stem.a11yauditor.founded', 'Founded') }, { num: '501(c)(3)', label: t('stem.a11yauditor.nonprofit', 'Nonprofit') }].map(function(stat) {
                return h('div', { key: stat.label, className: 'text-center p-2 bg-indigo-50 rounded-lg' },
                  h('div', { className: 'text-lg font-black text-indigo-700' }, stat.num),
                  h('div', { className: 'text-[0.6875rem] text-indigo-600 font-bold' }, stat.label)
                );
              })
            )
          ),
          // Programs
          h('div', { className: 'space-y-3' },
            h('h4', { className: 'text-sm font-black text-indigo-800 uppercase tracking-widest' + onHostInk }, t('stem.a11yauditor.key_programs', 'Key Programs')),
            // AccessU
            // These cards are "mark as explored" buttons. They used to end in fake link text
            // ("knowbility.org/programs/...") that was not a link; the one real link is below.
            h('button', { type: 'button', onClick: function() { exploreKnowbility('accessu', 5); }, className: 'w-full text-left bg-white rounded-2xl border-2 border-purple-600 p-4 hover:border-purple-400 transition-all' },
              h('div', { className: 'flex items-start gap-3' },
                h('div', { className: 'text-2xl', 'aria-hidden': 'true' }, '\uD83C\uDF93'),
                h('div', { className: 'flex-1' },
                  h('div', { className: 'font-bold text-sm text-purple-800' }, t('stem.a11yauditor.john_slatin_accessu', 'John Slatin AccessU'), exploredChip('accessu')),
                  h('p', { className: 'text-xs text-slate-600 mt-1' }, t('stem.a11yauditor.accessu_desc_v2', 'A yearly hands-on training conference (in person and online). Named after Dr. John Slatin, it teaches practical skills in coding, usability, and inclusive design. Check knowbility.org for the next dates.'))
                )
              )
            ),
            // AIR
            h('button', { type: 'button', onClick: function() { exploreKnowbility('air', 5); }, className: 'w-full text-left bg-white rounded-2xl border-2 border-teal-600 p-4 hover:border-teal-400 transition-all' },
              h('div', { className: 'flex items-start gap-3' },
                h('div', { className: 'text-2xl', 'aria-hidden': 'true' }, '\uD83C\uDF10'),
                h('div', { className: 'flex-1' },
                  h('div', { className: 'font-bold text-sm text-teal-800' }, t('stem.a11yauditor.accessibility_internet_rally_air', 'Accessibility Internet Rally (AIR)'), exploredChip('air')),
                  h('p', { className: 'text-xs text-slate-600 mt-1' }, t('stem.a11yauditor.an_8_week_global_online_competition_pa', 'An 8-week global online competition pairing volunteer web professionals with nonprofits to build accessible websites. Started as a one-day hackathon and evolved into Knowbility\u2019s signature program.'))
                )
              )
            ),
            h('a', { href: 'https://knowbility.org/', target: '_blank', rel: 'noopener noreferrer', className: 'inline-block text-xs font-bold text-indigo-800 underline hover:text-indigo-900' + onHostInk },
              t('stem.a11yauditor.knowbility_site_link', 'Read about AccessU and AIR at knowbility.org'), h('span', { className: 'sr-only' }, t('stem.a11yauditor.opens_new_tab', ' (opens in a new tab)')))
          ),
          // Get Involved
          h('div', { className: 'bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-200 rounded-2xl p-5 space-y-3' },
            h('h4', { className: 'text-sm font-black text-amber-800 uppercase tracking-widest' }, t('stem.a11yauditor.how_to_get_involved', '\uD83E\uDD1D How to Get Involved')),
            h('div', { className: 'space-y-2' },
              [{ id: 'volunteer', icon: '\uD83D\uDE4B', title: t('stem.a11yauditor.volunteer_at_accessu', 'Volunteer at AccessU'), desc: t('stem.a11yauditor.help_with_registration_room_hosting_an', 'Help with registration, room hosting, and support. Earn free conference access for a 4-8 hour shift.') },
               { id: 'air_team', icon: '\uD83D\uDCBB', title: t('stem.a11yauditor.join_an_air_team', 'Join an AIR Team'), desc: t('stem.a11yauditor.developers_designers_and_content_creat', 'Developers, designers, and content creators build accessible websites for nonprofits.') },
               { id: 'learn', icon: '\uD83D\uDCDA', title: t('stem.a11yauditor.learn_2', 'Learn'), desc: t('stem.a11yauditor.attend_accessu_sessions_use_free_resou', 'Attend AccessU sessions, use free resources, and build your accessibility skills.') },
               { id: 'advocate', icon: '\uD83D\uDCE3', title: t('stem.a11yauditor.advocate', 'Advocate'), desc: t('stem.a11yauditor.use_this_tool_to_audit_and_report_acce', 'Use THIS tool to audit and report accessibility barriers. Be a change agent in your community!') }
              ].map(function(item) {
                return h('button', { key: item.id, type: 'button', onClick: function() { exploreKnowbility(item.id, 3); }, className: 'w-full text-left flex items-start gap-3 bg-white rounded-xl p-3 border border-amber-600 hover:border-amber-600 transition-all' },
                  h('span', { className: 'text-lg', 'aria-hidden': 'true' }, item.icon),
                  h('div', null,
                    h('div', { className: 'font-bold text-xs text-amber-800' }, item.title, exploredChip(item.id)),
                    h('p', { className: 'text-[0.6875rem] text-slate-600 mt-0.5' }, item.desc)
                  )
                );
              })
            ),
            h('a', { href: 'https://knowbility.org/about/volunteer-with-knowbility?utm_source=alloflow&utm_medium=referral&utm_campaign=stem_lab_volunteer', target: '_blank', rel: 'noopener', className: 'block text-center px-4 py-2.5 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700 transition-colors mt-3' }, t('stem.a11yauditor.visit_knowbility_volunteer_today', '\u267F Visit Knowbility \u2014 Volunteer Today'))
          )
        ),

        // ═══ TAKE ACTION TAB ═══
        tab === 'action' && h('div', { className: 'space-y-4' },
          // Title II explainer
          h('div', { className: 'bg-gradient-to-r from-slate-800 to-slate-900 text-white rounded-2xl p-6' },
            h('h3', { className: 'text-lg font-black flex items-center gap-2' }, t('stem.a11yauditor.ada_title_ii_digital_accessibility', '\u2696\uFE0F ADA Title II & Digital Accessibility')),
            h('p', { className: 'text-sm opacity-90 mt-2 leading-relaxed' },
              parseInt(gradeLevel, 10) <= 5
                ? 'There\u2019s a law called the ADA (Americans with Disabilities Act) that says government websites \u2014 like your school district\u2019s website, the library, and city hall \u2014 must work for EVERYONE, including people with disabilities. If they don\u2019t, you can ask them to fix it!'
                : parseInt(gradeLevel, 10) <= 8
                  ? t('stem.a11yauditor.title2_mid_v2', 'In April 2024, the U.S. Department of Justice updated Title II of the ADA so that state and local government websites and apps must meet WCAG 2.1 AA. This includes school districts, libraries, courts, and public transit. The rule set its first deadline, for governments serving 50,000 or more people, for April 24, 2026. Check ada.gov for the latest.')
                  : t('stem.a11yauditor.title2_high_v2', 'The DOJ\u2019s April 2024 final rule under ADA Title II requires state and local government web content and mobile apps to meet WCAG 2.1 AA. The rule set deadlines of April 24, 2026 for entities serving 50,000 or more people, and April 26, 2027 for smaller ones and special districts; check ada.gov for the current status. It covers schools, libraries, courts, public transit, parks, and content vendors provide on a government\u2019s behalf, with limited exceptions (for example some archived content and some documents posted before the deadline).')
            ),
            h('div', { className: 'flex flex-wrap gap-2 mt-3' },
              ['Schools', 'Libraries', 'City/County Gov', 'Courts', 'Public Transit', 'Parks & Rec', 'DMV', 'Voting'].map(function(e) {
                return h('span', { key: e, className: 'bg-white/15 text-white/90 px-2 py-1 rounded-md text-[0.6875rem] font-bold' }, e);
              })
            )
          ),
          // Complaint builder
          h('div', { className: 'bg-white rounded-2xl border-2 border-red-200 p-5 space-y-3' },
            h('h4', { className: 'text-sm font-black text-red-800 flex items-center gap-2' }, t('stem.a11yauditor.accessibility_complaint_builder', '\uD83D\uDCDD Accessibility Complaint Builder')),
            h('p', { className: 'text-xs text-slate-600 mb-2' }, t('stem.a11yauditor.found_accessibility_barriers_generate_', 'Found accessibility barriers? Generate a formal complaint letter to request change. Choose your recipient:')),
            // Recipient selector
            h('div', { className: 'flex gap-2 mb-3' },
              [{ id: 'ada_coordinator', label: t('stem.a11yauditor.ada_coordinator', '\uD83C\uDFE2 ADA Coordinator') }, { id: 'doj', label: t('stem.a11yauditor.dept_of_justice', '\uD83C\uDFDB\uFE0F Dept. of Justice') }].map(function(opt) {
                return h('button', { key: opt.id, 'aria-pressed': complaintType === opt.id, onClick: function() { upd('complaintType', opt.id); },
                  className: 'flex-1 px-3 py-2 rounded-lg text-xs font-bold border-2 transition-all ' + (complaintType === opt.id ? 'border-red-400 bg-red-50 text-red-700' : 'border-slate-200 text-slate-600 hover:border-red-600')
                }, opt.label);
              })
            ),
            // Entity name
            h('label', { className: 'text-xs font-bold text-slate-600 block' }, t('stem.a11yauditor.entity_name_school_city_agency', 'Entity Name (school, city, agency)')),
            h('input', { type: 'text', value: complaintEntity, onChange: function(e) { upd('complaintEntity', e.target.value); }, placeholder: t('stem.a11yauditor.e_g_portland_public_schools_city_of_au', 'e.g. Portland Public Schools, City of Austin'), className: 'w-full text-sm p-2.5 border border-slate-400 rounded-lg outline-none focus:ring-2 focus:ring-red-700 mt-1', 'aria-label': t('stem.a11yauditor.entity_name', 'Entity name') }),
            // Impact description
            h('label', { className: 'text-xs font-bold text-slate-600 block mt-2' }, t('stem.a11yauditor.describe_the_impact_who_is_affected_an', 'Describe the impact (who is affected and how)')),
            h('textarea', { value: complaintImpact, onChange: function(e) { setComplaintImpact(e.target.value); }, placeholder: t('stem.a11yauditor.e_g_my_child_uses_a_screen_reader_and_', 'e.g. My child uses a screen reader and cannot navigate the enrollment forms...'), className: 'w-full text-xs p-3 border border-slate-400 rounded-lg outline-none focus:ring-2 focus:ring-red-700 resize-none h-20 mt-1', 'aria-label': t('stem.a11yauditor.impact_description', 'Impact description'), 'aria-describedby': 'a11yaud-impact-note' }),
            h('p', { id: 'a11yaud-impact-note', className: 'text-[0.6875rem] text-slate-700' }, t('stem.a11yauditor.impact_privacy_note', 'Kept for this visit only: what you write here and the letter are not saved in your project. Copy the letter before you leave.')),
            // Auto-populate from last audit
            auditResult && auditResult.issues && h('p', { className: 'text-[0.6875rem] text-teal-700 font-bold' }, '\u2705 ' + auditResult.issues.length + ' issues from your last audit will be included automatically'),
            // Generate button
            callGemini && h('button', {
              'aria-label': t('stem.a11yauditor.generate_complaint_letter', 'Generate complaint letter'),
              disabled: !complaintEntity.trim() || complaintLoading,
              onClick: async function() {
                // This gate is a scientific-integrity guard, not a convenience:
                // it exists so an AI-generated guess is never sent to a real
                // organisation as a verified audit finding. So it fails CLOSED —
                // with no dialog service available, no letter is generated.
                var confirmApi = typeof window !== 'undefined' && window.AlloFlowUX && window.AlloFlowUX.confirm;
                var unavailable = 'The confirmation step is unavailable right now, so no letter was generated.';
                if (typeof confirmApi !== 'function') { if (addToast) addToast(unavailable, 'warning'); return; }
                var acknowledged = false;
                try {
                  acknowledged = await confirmApi(
                    'These findings are AI-generated guesses, not a verified audit. Only continue if you have independently confirmed each issue is real. Continue?',
                    { title: 'Confirm findings before generating', confirmText: 'I have verified these findings',
                      cancelText: 'Go back', tone: 'warning' }
                  );
                } catch (e) { if (addToast) addToast(unavailable, 'warning'); return; }
                if (!acknowledged) return;
                if (!callGemini) return;
                // Request-ID guard: a multi-paragraph complaint letter for
                // the wrong entity is high-impact confusion. Prevents stale
                // letters from overwriting a newer entity's letter mid-fetch.
                window.__a11yComplaintReqId = (window.__a11yComplaintReqId || 0) + 1;
                var thisReqId = window.__a11yComplaintReqId;
                setComplaintLoading(true);
                var issuesList = auditResult && auditResult.issues ? auditResult.issues.map(function(i) { return 'WCAG ' + i.criterion + ': ' + i.issue + ' (Severity: ' + i.severity + ')'; }).join('\n') : 'No automated audit data available.';
                var prompt = 'Generate a formal ADA accessibility complaint letter.\n\n' +
                  'RECIPIENT: ' + (complaintType === 'doj' ? 'U.S. Department of Justice, Civil Rights Division, 950 Pennsylvania Avenue NW, Washington DC 20530' : 'ADA Coordinator at ' + complaintEntity) + '\n' +
                  'ENTITY: ' + complaintEntity + '\n' +
                  'IMPACT: ' + (complaintImpact || 'Barriers encountered accessing digital services.') + '\n' +
                  'AUDIT FINDINGS:\n' + issuesList + '\n\n' +
                  'TONE: Constructive and partnership-oriented. Emphasize improving access, not punishment.\n' +
                  'INCLUDE: Specific WCAG violations cited, relevant legal authority (ADA Title II, DOJ 2024 final rule, Section 508), compliance deadlines, and a request for remediation timeline.\n' +
                  'GRADE LEVEL: Write at a ' + (gradeLevel || '8th grade') + ' reading level.\n' +
                  'FORMAT: Return the complete letter ready to send, with proper formatting, date, addresses, and signature line. Include filing instructions at the end.';
                callGemini(prompt, true).then(function(result) {
                  if (!_mounted.current) return;
                  if (thisReqId !== window.__a11yComplaintReqId) return;
                  setComplaintLoading(false);
                  setComplaintResult(_str(result, 20000) || null);
                  updMulti({ complaintsGenerated: complaintsGenerated + 1 });
                  if (awardStemXP) awardStemXP(20);
                  if (announceToSR) announceToSR('Complaint letter generated.');
                }).catch(function() {
                  if (!_mounted.current) return;
                  if (thisReqId !== window.__a11yComplaintReqId) return;
                  setComplaintLoading(false);
                  setComplaintResult(t('stem.a11yauditor.complaint_error', 'Error generating complaint letter. Please try again.'));
                });
              },
              className: 'w-full px-4 py-2.5 bg-red-600 text-white rounded-lg text-xs font-bold hover:bg-red-700 disabled:opacity-40 transition-colors mt-2'
            }, complaintLoading ? 'Generating...' : '\uD83D\uDCDD Generate Complaint Letter'),
            // Result
            complaintResult && h('div', { className: 'mt-3 space-y-2' },
              h('div', { className: 'bg-slate-50 border border-slate-400 rounded-xl p-4 max-h-60 overflow-y-auto' },
                h('pre', { className: 'text-xs text-slate-700 whitespace-pre-wrap font-sans leading-relaxed' }, complaintResult)
              ),
              h('div', { className: 'flex gap-2' },
                h('button', { onClick: function() { (window.StemLab && window.StemLab.writeClipboard || function (value) { return navigator.clipboard.writeText(value); })(complaintResult); if (addToast) addToast('Copied to clipboard!', 'success'); }, className: 'flex-1 px-3 py-2 bg-indigo-100 text-indigo-700 rounded-lg text-xs font-bold hover:bg-indigo-200' }, t('stem.a11yauditor.copy_to_clipboard_2', '\uD83D\uDCCB Copy to Clipboard')),
                h('button', { 'aria-label': t('stem.a11yauditor.reset_complaint', 'Reset complaint'), onClick: function() { setComplaintResult(null); }, className: 'px-3 py-2 bg-slate-100 text-slate-600 rounded-lg text-xs font-bold hover:bg-slate-200' }, t('stem.a11yauditor.new_letter', '\uD83D\uDD04 New Letter'))
              )
            )
          ),
          // Filing guide
          h('div', { className: 'bg-blue-50 border border-blue-200 rounded-2xl p-5' },
            h('h4', { className: 'text-sm font-black text-blue-800 mb-2' }, t('stem.a11yauditor.how_to_file', '\uD83D\uDCCB How to File')),
            h('ol', { className: 'space-y-2 text-xs text-blue-900' },
              h('li', { className: 'flex gap-2' }, h('span', { className: 'font-black text-blue-700' }, '1.'), t('stem.a11yauditor.contact_the_entity_s_ada_coordinator_f', 'Contact the entity\u2019s ADA Coordinator first \u2014 they can often resolve issues quickly.')),
              h('li', { className: 'flex gap-2' }, h('span', { className: 'font-black text-blue-700' }, '2.'), t('stem.a11yauditor.if_unresolved_file_with_the_doj_at_ada', 'If unresolved, file with the DOJ at ada.gov/file-a-complaint/')),
              h('li', { className: 'flex gap-2' }, h('span', { className: 'font-black text-blue-700' }, '3.'), t('stem.a11yauditor.you_can_also_mail_u_s_doj_civil_rights', 'You can also mail: U.S. DOJ, Civil Rights Division, 950 Pennsylvania Ave NW, Washington DC 20530')),
              h('li', { className: 'flex gap-2' }, h('span', { className: 'font-black text-blue-700' }, '4.'), t('stem.a11yauditor.ada_info_line_1_800_514_0301_voice_1_8', 'ADA Info Line: 1-800-514-0301 (voice) / 1-833-610-1264 (TTY)'))
            )
          )
        ),

        // ═══ HISTORY TAB ═══
        tab === 'history' && h('div', { className: 'space-y-3' },
          h('h3', { className: 'text-sm font-bold text-slate-700 text-center' + onHostInk }, t('stem.a11yauditor.audit_history', 'Audit History')),
          auditHistory.length === 0 && h('p', { className: 'text-sm text-slate-600 text-center py-8' + onHostInk }, t('stem.a11yauditor.no_audits_yet_run_your_first_audit_to_', 'No audits yet. Run your first audit to see results here.')),
          auditHistory.slice().reverse().map(function(entry, i) {
            // Saved history is input too: coerce every field before rendering it.
            var input = _str(entry.input, 200), when = new Date(entry.date), dateText = isNaN(when.getTime()) ? '' : when.toLocaleDateString();
            if (entry.measured) {
              var nf = _num0(entry.failures), nw = _num0(entry.toCheck);
              return h('div', { key: i, className: 'flex items-center gap-3 p-3 rounded-xl border border-indigo-200 bg-indigo-50' },
                h('div', { className: 'text-2xl font-black text-indigo-800' }, nf),
                h('div', { className: 'flex-1 min-w-0' },
                  h('div', { className: 'text-xs font-bold text-slate-700 truncate' }, input),
                  h('div', { className: 'text-[0.6875rem] text-slate-700' }, dateText, ' · ', t('stem.a11yauditor.history_measured_line', 'Measured check: failures found'), nw ? ' · ' + nw + ' ' + t('stem.a11yauditor.history_to_check', 'to check by hand') : '')
                )
              );
            }
            var score = (typeof entry.score === 'number' && isFinite(entry.score)) ? Math.round(entry.score) : null;
            var color = score == null ? 'border-slate-300 bg-slate-50' : score >= 80 ? 'border-green-200 bg-green-50' : score >= 60 ? 'border-amber-200 bg-amber-50' : 'border-red-200 bg-red-50';
            return h('div', { key: i, className: 'flex items-center gap-3 p-3 rounded-xl border ' + color },
              h('div', { className: 'text-2xl font-black ' + (score == null ? 'text-slate-700' : score >= 80 ? 'text-green-800' : score >= 60 ? 'text-amber-800' : 'text-red-700') }, score == null ? '—' : score),
              h('div', { className: 'flex-1 min-w-0' },
                h('div', { className: 'text-xs font-bold text-slate-700 truncate' }, input),
                h('div', { className: 'text-[0.6875rem] text-slate-600' }, dateText, t('stem.a11yauditor.grade', ' · Grade: '), _str(entry.grade, 3))
              )
            );
          })
        ),

        // ═══ BADGES TAB ═══
        tab === 'badges' && h('div', { className: 'space-y-3' },
          h('h3', { className: 'text-sm font-bold text-slate-700 text-center' + onHostInk }, t('stem.a11yauditor.badges_2', 'Badges ('), badges.length, '/', AUDIT_BADGES.length, ')'),
          h('div', { className: 'grid grid-cols-2 sm:grid-cols-3 gap-3' },
            AUDIT_BADGES.map(function(badge) {
              var earned = badges.indexOf(badge.id) >= 0;
              return h('div', { key: badge.id, className: 'text-center p-3 rounded-xl border-2 transition-all ' + (earned ? 'bg-amber-50 border-amber-300 shadow-sm' : 'bg-slate-50 border-dashed border-slate-400') },
                h('div', { className: 'text-2xl' + (earned ? '' : ' grayscale') }, badge.icon),
                h('div', { className: 'text-[0.6875rem] font-bold text-slate-700 mt-1' }, badge.name),
                h('p', { className: 'text-[0.6875rem] text-slate-600 mt-0.5' }, __alloT(badge.descKey || ('stem.a11yauditor.' + (badge.id) + '_desc'), badge.desc))
              );
            })
          )
        )
        ) // end tabpanel
      );
    }
  });
})();
}

console.log('[StemLab] stem_tool_a11yauditor.js loaded');
