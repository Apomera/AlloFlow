// ═══════════════════════════════════════════
// stem_tool_a11yauditor.js — Digital Accessibility Auditor
// WCAG 2.1 AA audit tool for websites, HTML, and documents
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

  // ── WCAG 2.1 AA Criteria Reference ──
  var WCAG_CRITERIA = [
    { id: '1.1.1', name: 'Non-text Content', level: 'A', desc: 'All images, icons, and graphics must have text alternatives (alt text) so screen readers can describe them to blind users.', impact: 'Without alt text, blind users have no idea what images contain.' },
    { id: '1.3.1', name: 'Info and Relationships', level: 'A', desc: 'Content structure (headings, lists, tables) must be conveyed through proper HTML tags, not just visual formatting.', impact: 'Screen readers use heading tags to navigate. Without them, navigating a page is like reading a book with no chapters.' },
    { id: '1.4.3', name: 'Contrast (Minimum)', level: 'AA', desc: 'Text must have at least 4.5:1 contrast ratio against its background. Large text needs 3:1.', impact: 'Low contrast text is invisible to people with low vision, color blindness, or anyone using a screen in bright sunlight.' },
    { id: '2.1.1', name: 'Keyboard', level: 'A', desc: 'All functionality must work with a keyboard alone — no mouse required.', impact: 'People who cannot use a mouse (motor disabilities, blindness) rely entirely on keyboard navigation.' },
    { id: '2.4.1', name: 'Bypass Blocks', level: 'A', desc: 'Pages must have a "Skip to content" link so keyboard users can bypass repeated navigation.', impact: 'Without skip links, keyboard users must tab through the entire menu on every single page.' },
    { id: '2.4.4', name: 'Link Purpose', level: 'A', desc: 'The purpose of each link must be clear from its text. "Click here" is not descriptive.', impact: 'Screen readers often list all links on a page. "Click here" repeated 20 times is useless.' },
    { id: '2.4.7', name: 'Focus Visible', level: 'AA', desc: 'When an element receives keyboard focus, it must have a visible indicator (outline, ring, highlight).', impact: 'Without visible focus, keyboard users cannot tell where they are on the page.' },
    { id: '3.1.1', name: 'Language of Page', level: 'A', desc: 'The page must declare its language (e.g., lang="en") so screen readers pronounce words correctly.', impact: 'Without a language tag, a French screen reader might try to pronounce English words with French pronunciation.' },
    { id: '3.3.2', name: 'Labels or Instructions', level: 'A', desc: 'Form inputs must have visible labels that are programmatically associated (not just placeholder text).', impact: 'When a screen reader reaches an unlabeled input, it says "edit text" — the user has no idea what to type.' },
    { id: '4.1.2', name: 'Name, Role, Value', level: 'A', desc: 'All interactive elements must expose their name, role, and state to assistive technology.', impact: 'A custom dropdown that looks like a dropdown but isn\'t coded as one is invisible to screen readers.' },
  ];

  var AUDIT_BADGES = [
    { id: 'first_audit', icon: '🔍', name: 'First Audit', desc: 'Complete your first accessibility audit', check: function(s) { return s.auditsCompleted >= 1; } },
    { id: 'five_audits', icon: '📊', name: 'Pattern Spotter', desc: 'Complete 5 audits', check: function(s) { return s.auditsCompleted >= 5; } },
    { id: 'perfect_find', icon: '🎯', name: 'Eagle Eye', desc: 'Find a document with score below 30', check: function(s) { return s.worstScore < 30 && s.worstScore >= 0; } },
    { id: 'advocate', icon: '✊', name: 'Accessibility Advocate', desc: 'Audit 3 different websites', check: function(s) { return s.uniqueSites >= 3; } },
    { id: 'expert', icon: '🏅', name: 'WCAG Expert', desc: 'Learn about all 10 core criteria', check: function(s) { return s.criteriaExplored >= 10; } },
    { id: 'reporter', icon: '📋', name: 'Compliance Reporter', desc: 'Download an audit report', check: function(s) { return s.reportsDownloaded >= 1; } },
  ];

  window.StemLab.registerTool('a11yAuditor', {
    icon: '♿',
    label: 'Digital Accessibility Lab',
    desc: 'Audit websites and documents for WCAG 2.1 AA accessibility compliance. Learn about digital accessibility by analyzing real-world content.',
    color: 'teal',
    category: 'coding',
    render: function(ctx) {
      var React = ctx.React;
      var h = React.createElement;
      var d = (ctx.toolData && ctx.toolData['a11yAuditor']) || {};
      var upd = function(key, val) { ctx.update('a11yAuditor', key, val); };
      var updMulti = function(obj) { ctx.updateMulti('a11yAuditor', obj); };
      var ArrowLeft = ctx.icons.ArrowLeft;
      var Sparkles = ctx.icons.Sparkles;
      var X = ctx.icons.X;
      var addToast = ctx.addToast;
      var callGemini = ctx.callGemini;
      var callTTS = ctx.callTTS;
      var gradeLevel = ctx.gradeLevel;
      var gradeBand = ctx.gradeBand || 'elementary';
      var announceToSR = ctx.announceToSR;
      var a11yClick = ctx.a11yClick;
      var awardStemXP = ctx.awardXP;
      var stemCelebrate = ctx.celebrate;
      var stemBeep = ctx.beep;

      var callGeminiVision = ctx.callGeminiVision;

      var tab = d.tab || 'audit';
      var auditUrl = d.auditUrl || '';
      var auditHtml = d.auditHtml || '';
      var auditResult = d.auditResult || null;
      var auditLoading = d.auditLoading || false;
      var auditInputMode = d.auditInputMode || 'url'; // 'url' | 'html' | 'pdf' | 'screenshot'
      var auditHistory = d.auditHistory || [];
      var selectedCriterion = d.selectedCriterion || null;
      var badges = d.badges || [];
      var auditsCompleted = d.auditsCompleted || 0;
      var criteriaExplored = d.criteriaExplored || 0;
      var reportsDownloaded = d.reportsDownloaded || 0;
      var worstScore = d.worstScore !== undefined ? d.worstScore : 999;
      var uniqueSites = d.uniqueSites || 0;

      // ── Audit PDF/Screenshot via Vision ──
      var runVisionAudit = function(base64, mimeType, label) {
        if (!callGeminiVision) { if (addToast) addToast('Vision API not available', 'error'); return; }
        upd('auditLoading', true);
        var visionPrompt = 'You are a WCAG 2.1 AA accessibility expert. Audit this ' + label + ' for accessibility compliance.\n' +
          'Check: alt text on images, heading structure, color contrast, keyboard access hints, form labels, link text, language declaration, focus indicators, ARIA usage, skip navigation.\n' +
          'Target audience: ' + (gradeLevel || '8th grade') + ' students learning about digital accessibility.\n' +
          'Explain each issue in plain language. For each, explain WHO is affected and WHY.\n\n' +
          'Return ONLY JSON:\n' +
          '{"score": 0-100, "grade": "A/B/C/D/F", "summary": "plain-language summary", "issues": [{"criterion": "1.1.1", "issue": "desc", "severity": "critical|major|minor", "who": "affected group", "fix": "how to fix"}], "strengths": ["good things"], "score_breakdown": {"structure": 0-10, "images": 0-10, "contrast": 0-10, "keyboard": 0-10, "forms": 0-10, "language": 0-10, "links": 0-10, "focus": 0-10, "aria": 0-10, "navigation": 0-10}, "recommendation": "fix this first"}';

        callGeminiVision(visionPrompt, base64, mimeType).then(function(result) {
          try {
            var cleaned = result.trim();
            if (cleaned.indexOf('```') !== -1) { var parts = cleaned.split('```'); cleaned = parts[1] || parts[0]; if (cleaned.indexOf('\n') !== -1) cleaned = cleaned.split('\n').slice(1).join('\n'); if (cleaned.lastIndexOf('```') !== -1) cleaned = cleaned.substring(0, cleaned.lastIndexOf('```')); }
            var audit = JSON.parse(cleaned);
            var newHistory = auditHistory.concat([{ input: label, type: 'vision', score: audit.score, grade: audit.grade, date: new Date().toISOString() }]);
            updMulti({ auditResult: audit, auditLoading: false, auditHistory: newHistory.slice(-20), auditsCompleted: auditsCompleted + 1 });
            if (awardStemXP) awardStemXP(12);
            if (announceToSR) announceToSR('Audit complete. Score: ' + audit.score + ' out of 100.');
          } catch (e) {
            updMulti({ auditResult: { score: -1, summary: 'Audit failed \u2014 could not parse the ' + label + '.', issues: [], strengths: [] }, auditLoading: false });
          }
        }).catch(function() {
          updMulti({ auditResult: { score: -1, summary: 'Vision audit failed. The file may be too large or unsupported.', issues: [], strengths: [] }, auditLoading: false });
        });
      };

      // ── Handle file upload (PDF or screenshot) ──
      var handleFileAudit = function(e) {
        var file = e.target.files && e.target.files[0];
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
        upd('auditLoading', true);
        // Use Gemini with grounding/search to analyze the URL
        var fetchPrompt = 'Visit and analyze the website at ' + url + ' for WCAG 2.1 AA accessibility compliance.\n' +
          'Examine the page structure, images, forms, links, color usage, keyboard accessibility, and ARIA implementation.\n' +
          'Use your knowledge of this website\u2019s actual content and structure.\n\n';
        // Fall through to standard audit with URL context
        runAudit(url, 'url');
      };

      // ── Run accessibility audit ──
      var runAudit = function(input, inputType) {
        if (!callGemini) return;
        upd('auditLoading', true);

        var prompt = 'You are a WCAG 2.1 AA accessibility expert auditing ' +
          (inputType === 'url' ? 'a website at URL: ' + input + '. Use your training knowledge of this website\u2019s structure, layout, and common patterns.' : 'the following HTML content') + '.\n\n' +
          (inputType === 'html' ? 'HTML:\n"""\n' + input.substring(0, 8000) + '\n"""\n\n' : '') +
          'Perform a thorough accessibility audit checking these WCAG 2.1 AA criteria:\n' +
          '1. Non-text Content (1.1.1) — images without alt text\n' +
          '2. Info & Relationships (1.3.1) — heading hierarchy, semantic structure\n' +
          '3. Color Contrast (1.4.3) — text contrast ratios\n' +
          '4. Keyboard Access (2.1.1) — all functions keyboard-operable\n' +
          '5. Bypass Blocks (2.4.1) — skip navigation links\n' +
          '6. Link Purpose (2.4.4) — descriptive link text\n' +
          '7. Focus Visible (2.4.7) — visible focus indicators\n' +
          '8. Language (3.1.1) — page language declared\n' +
          '9. Labels (3.3.2) — form inputs labeled\n' +
          '10. Name/Role/Value (4.1.2) — ARIA roles correct\n\n' +
          'Target audience: ' + (gradeLevel || '8th grade') + ' students learning about digital accessibility.\n' +
          'Explain each issue in plain language a student can understand.\n' +
          'For each issue, explain WHO is affected and WHY it matters.\n\n' +
          'Return ONLY JSON:\n' +
          '{\n' +
          '  "score": 0-100,\n' +
          '  "grade": "A/B/C/D/F",\n' +
          '  "summary": "One-paragraph plain-language summary for students",\n' +
          '  "issues": [{"criterion": "1.1.1", "issue": "description", "severity": "critical|major|minor", "who": "who is affected", "fix": "how to fix it"}],\n' +
          '  "strengths": ["things done well"],\n' +
          '  "score_breakdown": {"structure": 0-10, "images": 0-10, "contrast": 0-10, "keyboard": 0-10, "forms": 0-10, "language": 0-10, "links": 0-10, "focus": 0-10, "aria": 0-10, "navigation": 0-10},\n' +
          '  "recommendation": "One sentence: what should be fixed first?"\n' +
          '}';

        callGemini(prompt, true).then(function(result) {
          try {
            var cleaned = result.trim();
            if (cleaned.indexOf('```') !== -1) { var parts = cleaned.split('```'); cleaned = parts[1] || parts[0]; if (cleaned.indexOf('\n') !== -1) cleaned = cleaned.split('\n').slice(1).join('\n'); if (cleaned.lastIndexOf('```') !== -1) cleaned = cleaned.substring(0, cleaned.lastIndexOf('```')); }
            var audit = JSON.parse(cleaned);
            var newHistory = auditHistory.concat([{ input: input.substring(0, 100), type: inputType, score: audit.score, grade: audit.grade, date: new Date().toISOString() }]);
            var newWorst = Math.min(worstScore === 999 ? audit.score : worstScore, audit.score);
            var newUnique = inputType === 'url' ? new Set(newHistory.filter(function(h) { return h.type === 'url'; }).map(function(h) { return h.input; })).size : uniqueSites;
            updMulti({
              auditResult: audit,
              auditLoading: false,
              auditHistory: newHistory.slice(-20),
              auditsCompleted: auditsCompleted + 1,
              worstScore: newWorst,
              uniqueSites: newUnique,
            });
            if (awardStemXP) awardStemXP(10);
            if (announceToSR) announceToSR('Audit complete. Score: ' + audit.score + ' out of 100. Grade: ' + audit.grade);
            if (audit.score >= 90 && stemCelebrate) stemCelebrate();
          } catch (e) {
            updMulti({ auditResult: { score: -1, summary: 'Audit failed — try different content or a simpler URL.', issues: [], strengths: [] }, auditLoading: false });
          }
        }).catch(function() {
          updMulti({ auditResult: { score: -1, summary: 'Audit failed — the content could not be analyzed.', issues: [], strengths: [] }, auditLoading: false });
        });
      };

      // ── Download report ──
      var downloadReport = function() {
        if (!auditResult) return;
        var report = JSON.stringify({ standard: 'WCAG 2.1 AA', tool: 'AlloFlow Digital Accessibility Lab', date: new Date().toISOString(), input: auditUrl || 'HTML content', result: auditResult }, null, 2);
        var blob = new Blob([report], { type: 'application/json' });
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url; a.download = 'a11y-audit-' + new Date().toISOString().split('T')[0] + '.json';
        document.body.appendChild(a); a.click(); document.body.removeChild(a);
        URL.revokeObjectURL(url);
        updMulti({ reportsDownloaded: reportsDownloaded + 1 });
        if (addToast) addToast('Audit report downloaded!', 'success');
      };

      // ── Badge checker ──
      var checkBadges = function() {
        var state = { auditsCompleted: auditsCompleted, worstScore: worstScore, uniqueSites: uniqueSites, criteriaExplored: criteriaExplored, reportsDownloaded: reportsDownloaded };
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

      React.useEffect(function() { checkBadges(); }, [auditsCompleted, criteriaExplored, reportsDownloaded]);

      // ═══ RENDER ═══
      return h('div', { className: 'space-y-4 animate-in fade-in duration-200' },

        // Header
        h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'flex items-center gap-3' },
          h('button', Object.assign({ className: 'p-2 rounded-full hover:bg-teal-100 text-teal-600 transition-colors' }, a11yClick(function() { ctx.setStemLabTool(null); })),
            h(ArrowLeft, { size: 20 })
          ),
          h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'flex-1' },
            h('h2', { className: 'text-xl font-black text-slate-800' }, '♿ Digital Accessibility Lab'),
            h('p', { className: 'text-xs text-slate-500' }, 'Audit websites and documents for WCAG 2.1 AA compliance')
          ),
          auditsCompleted > 0 && h('span', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'bg-teal-100 text-teal-700 px-3 py-1 rounded-full text-xs font-bold' }, auditsCompleted + ' audits')
        ),

        // Student-friendly intro (collapsible)
        !d.introHidden && h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'bg-gradient-to-r from-teal-50 to-cyan-50 border-2 border-teal-200 rounded-2xl p-5 relative' },
          h('button', { onClick: function() { upd('introHidden', true); }, className: 'absolute top-3 right-3 text-teal-400 hover:text-teal-600 text-xs font-bold', 'aria-label': 'Hide intro' }, '\u2716'),
          h('h3', { className: 'text-base font-black text-teal-800 mb-2' }, '\u267F What is Digital Accessibility?'),
          h('p', { className: 'text-sm text-teal-700 leading-relaxed mb-3' },
            parseInt(gradeLevel, 10) <= 5
              ? 'Imagine you visit a website but you can\u2019t see the screen. A special tool called a screen reader reads the page aloud to you. But what if the pictures don\u2019t have descriptions? Or the buttons don\u2019t say what they do? That\u2019s what happens when a website isn\u2019t accessible. In this lab, YOU become a detective \u2014 finding problems that make websites hard to use for people with disabilities!'
              : parseInt(gradeLevel, 10) <= 8
                ? 'Over 1 billion people worldwide have disabilities that affect how they use technology. Screen readers, keyboard navigation, and voice control are tools people rely on every day. But these tools only work when websites are built correctly. WCAG (Web Content Accessibility Guidelines) are the rules that make the internet work for everyone. In this lab, you\u2019ll audit real websites and learn to spot barriers that block people with disabilities.'
                : '15% of the global population has a disability. Digital accessibility \u2014 governed by WCAG 2.1 AA standards and enforced by laws like the ADA and Section 508 \u2014 ensures websites, apps, and documents are usable by people with visual, auditory, motor, and cognitive disabilities. In this lab, you\u2019ll perform professional-grade accessibility audits, learn the technical criteria, and understand the human impact of each barrier.'
          ),
          h('div', { className: 'flex flex-wrap gap-2' },
            [
              { icon: '\uD83D\uDC41\uFE0F', label: 'Blind & low vision', desc: 'Need screen readers and alt text' },
              { icon: '\uD83D\uDC42', label: 'Deaf & hard of hearing', desc: 'Need captions and transcripts' },
              { icon: '\u270B', label: 'Motor disabilities', desc: 'Need keyboard-only navigation' },
              { icon: '\uD83E\uDDE0', label: 'Cognitive disabilities', desc: 'Need clear language and structure' }
            ].map(function(d2) {
              return h('div', { key: d2.label, className: 'flex items-center gap-2 bg-white rounded-lg px-3 py-1.5 border border-teal-100 text-xs' },
                h('span', null, d2.icon),
                h('div', null,
                  h('span', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'font-bold text-teal-800' }, d2.label),
                  h('span', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'text-teal-600 ml-1' }, '\u2014 ' + d2.desc)
                )
              );
            })
          )
        ),

        // Tabs
        h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, role: 'tablist', 'aria-label': 'Accessibility Lab sections', className: 'flex gap-1 bg-teal-50 rounded-xl p-1 border border-teal-200' },
          [{ id: 'audit', label: '🔍 Audit' }, { id: 'learn', label: '📖 Learn WCAG' }, { id: 'history', label: '📊 History' }, { id: 'badges', label: '🏅 Badges' }].map(function(t) {
            return h('button', { 'aria-label': 'Change tab',
              key: t.id, role: 'tab', 'aria-selected': tab === t.id,
              onClick: function() { upd('tab', t.id); },
              className: 'flex-1 px-3 py-2 rounded-lg text-xs font-bold transition-all ' + (tab === t.id ? 'bg-white text-teal-700 shadow-sm' : 'text-teal-600/60 hover:text-teal-700')
            }, t.label);
          })
        ),

        // ═══ AUDIT TAB ═══
        tab === 'audit' && h('div', { className: 'space-y-4' },

          // Input area
          h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'bg-white rounded-2xl border-2 border-teal-200 p-5 space-y-3' },
            h('h3', { className: 'text-sm font-bold text-teal-700 mb-2' }, 'What would you like to audit?'),

            // Input mode tabs
            h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'flex gap-1 bg-slate-100 rounded-lg p-1 mb-3' },
              [
                { id: 'url', icon: '\uD83C\uDF10', label: 'Website URL' },
                { id: 'html', icon: '\uD83D\uDCBB', label: 'HTML Code' },
                { id: 'pdf', icon: '\uD83D\uDCC4', label: 'PDF Document' },
                { id: 'screenshot', icon: '\uD83D\uDCF7', label: 'Screenshot' }
              ].map(function(mode) {
                return h('button', { 'aria-label': 'Change audit input mode',
                  key: mode.id,
                  onClick: function() { upd('auditInputMode', mode.id); },
                  className: 'flex-1 px-2 py-1.5 rounded-md text-[11px] font-bold transition-all ' + (auditInputMode === mode.id ? 'bg-white text-teal-700 shadow-sm' : 'text-slate-500 hover:text-slate-700')
                }, mode.icon + ' ' + mode.label);
              })
            ),

            // URL input mode
            auditInputMode === 'url' && h('div', null,
              h('label', { className: 'text-xs font-bold text-slate-600 block mb-1' }, 'Website URL'),
              h('div', { className: 'flex gap-2' },
                h('input', {
                  type: 'url', value: auditUrl,
                  onChange: function(e) { upd('auditUrl', e.target.value); },
                  onKeyDown: function(e) { if (e.key === 'Enter' && auditUrl.trim()) fetchAndAudit(auditUrl.trim()); },
                  placeholder: 'https://example.com',
                  'aria-label': 'Website URL to audit',
                  className: 'flex-1 text-sm p-2.5 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-teal-300'
                }),
                h('button', { 'aria-label': 'Try:',
                  onClick: function() { if (auditUrl.trim()) fetchAndAudit(auditUrl.trim()); },
                  disabled: !auditUrl.trim() || auditLoading,
                  className: 'px-4 py-2 bg-teal-700 text-white rounded-lg text-xs font-bold hover:bg-teal-700 disabled:opacity-40 transition-colors'
                }, auditLoading ? 'Auditing...' : '\uD83D\uDD0D Audit URL')
              ),
              h('p', { className: 'text-[10px] text-slate-400 mt-1' }, 'The AI will analyze the website\u2019s accessibility based on its known structure and common patterns.'),
              // Quick suggestions
              h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'flex flex-wrap gap-2 pt-2' },
                h('span', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'text-[10px] text-slate-500 font-bold' }, 'Try:'),
                ['https://www.wikipedia.org', 'https://www.google.com', 'https://www.nytimes.com', 'https://www.amazon.com'].map(function(url) {
                  return h('button', { 'aria-label': 'Change audit url',
                    key: url,
                    onClick: function() { upd('auditUrl', url); },
                    className: 'text-[10px] text-teal-600 hover:text-teal-800 font-medium hover:underline'
                  }, url.replace('https://www.', ''));
                })
              )
            ),

            // HTML input mode
            auditInputMode === 'html' && h('div', null,
              h('label', { className: 'text-xs font-bold text-slate-600 block mb-1' }, 'Paste HTML Code'),
              h('textarea', {
                value: auditHtml,
                onChange: function(e) { upd('auditHtml', e.target.value); },
                placeholder: '<html>\n  <head><title>My Page</title></head>\n  <body>\n    <h1>Hello World</h1>\n    <img src="photo.jpg">\n  </body>\n</html>',
                'aria-label': 'HTML code to audit',
                className: 'w-full text-xs p-3 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-teal-300 font-mono resize-none h-32'
              }),
              h('button', { 'aria-label': 'A11yauditor action',
                onClick: function() { if (auditHtml.trim()) runAudit(auditHtml.trim(), 'html'); },
                disabled: !auditHtml.trim() || auditLoading,
                className: 'mt-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700 disabled:opacity-40 transition-colors'
              }, auditLoading ? 'Auditing...' : '\uD83D\uDD0D Audit HTML'),
              h('p', { className: 'text-[10px] text-slate-400 mt-1' }, 'Paste any HTML code \u2014 from a school project, a webpage, or generated by a coding tool. The AI will check it for accessibility issues.')
            ),

            // PDF input mode
            auditInputMode === 'pdf' && h('div', { className: 'text-center py-4' },
              h('div', { className: 'text-3xl mb-2' }, '\uD83D\uDCC4'),
              h('p', { className: 'text-sm text-slate-600 mb-3' }, 'Upload a PDF document to check its accessibility'),
              h('p', { className: 'text-[10px] text-slate-400 mb-3' }, 'The AI will check for: tagged structure, reading order, alt text on images, form labels, color contrast, language declaration, and heading hierarchy.'),
              h('label', { className: 'inline-flex items-center gap-2 px-5 py-2.5 bg-teal-700 text-white rounded-lg text-xs font-bold hover:bg-teal-700 cursor-pointer transition-colors ' + (auditLoading ? 'opacity-40 pointer-events-none' : '') },
                h('input', {
                  type: 'file', accept: 'application/pdf', className: 'hidden',
                  onChange: handleFileAudit, disabled: auditLoading,
                  'aria-label': 'Upload PDF for accessibility audit'
                }),
                auditLoading ? 'Auditing...' : '\uD83D\uDCC2 Upload PDF'
              )
            ),

            // Screenshot input mode
            auditInputMode === 'screenshot' && h('div', { className: 'text-center py-4' },
              h('div', { className: 'text-3xl mb-2' }, '\uD83D\uDCF7'),
              h('p', { className: 'text-sm text-slate-600 mb-3' }, 'Upload a screenshot of a website, app, or document'),
              h('p', { className: 'text-[10px] text-slate-400 mb-3' }, 'The AI will visually analyze the screenshot for: color contrast issues, missing labels, layout problems, text readability, and visual accessibility barriers.'),
              h('label', { className: 'inline-flex items-center gap-2 px-5 py-2.5 bg-purple-600 text-white rounded-lg text-xs font-bold hover:bg-purple-700 cursor-pointer transition-colors ' + (auditLoading ? 'opacity-40 pointer-events-none' : '') },
                h('input', {
                  type: 'file', accept: 'image/*', className: 'hidden',
                  onChange: handleFileAudit, disabled: auditLoading,
                  'aria-label': 'Upload screenshot for accessibility audit'
                }),
                auditLoading ? 'Auditing...' : '\uD83D\uDCF7 Upload Screenshot'
              )
            )
          ),

          // Loading
          auditLoading && h('div', { className: 'bg-teal-50 border border-teal-200 rounded-2xl p-8 text-center' },
            h('div', { className: 'text-4xl mb-3 animate-pulse' }, '♿'),
            h('p', { className: 'text-teal-700 font-bold' }, 'Running WCAG 2.1 AA accessibility audit...'),
            h('p', { className: 'text-xs text-teal-500 mt-1' }, 'Checking structure, images, contrast, keyboard access, and more')
          ),

          // Results
          auditResult && auditResult.score >= 0 && h('div', { className: 'space-y-4' },

            // Score header
            h('div', { className: 'bg-gradient-to-r ' + (auditResult.score >= 80 ? 'from-green-500 to-emerald-600' : auditResult.score >= 60 ? 'from-amber-500 to-orange-600' : auditResult.score >= 40 ? 'from-orange-500 to-red-500' : 'from-red-600 to-rose-700') + ' text-white rounded-2xl p-6 text-center' },
              h('div', { className: 'text-6xl font-black' }, auditResult.score, h('span', { className: 'text-2xl opacity-80' }, '/100')),
              h('div', { className: 'text-3xl font-black mt-1' }, 'Grade: ', auditResult.grade),
              h('p', { className: 'text-sm opacity-90 mt-2 max-w-md mx-auto' }, auditResult.summary)
            ),

            // Score breakdown radar
            auditResult.score_breakdown && h('div', { className: 'bg-white rounded-2xl border border-slate-200 p-4' },
              h('h4', { className: 'text-xs font-bold text-slate-600 uppercase tracking-widest mb-3' }, 'Score Breakdown'),
              h('div', { className: 'grid grid-cols-2 sm:grid-cols-5 gap-2' },
                Object.entries(auditResult.score_breakdown).map(function(entry) {
                  var key = entry[0], val = entry[1];
                  var color = val >= 8 ? 'bg-green-100 text-green-700 border-green-200' : val >= 5 ? 'bg-amber-100 text-amber-700 border-amber-200' : 'bg-red-100 text-red-700 border-red-200';
                  return h('div', { key: key, className: 'text-center p-2 rounded-lg border ' + color },
                    h('div', { className: 'text-lg font-black' }, val, '/10'),
                    h('div', { className: 'text-[11px] font-bold uppercase' }, key)
                  );
                })
              )
            ),

            // Issues
            auditResult.issues && auditResult.issues.length > 0 && h('div', { className: 'bg-white rounded-2xl border border-slate-200 p-4' },
              h('h4', { className: 'text-xs font-bold text-slate-600 uppercase tracking-widest mb-3' }, 'Issues Found (', auditResult.issues.length, ')'),
              h('div', { className: 'space-y-2' },
                auditResult.issues.map(function(issue, i) {
                  var sevColor = issue.severity === 'critical' ? 'bg-red-50 border-red-200' : issue.severity === 'major' ? 'bg-amber-50 border-amber-200' : 'bg-blue-50 border-blue-200';
                  return h('div', { key: i, className: 'p-3 rounded-xl border ' + sevColor },
                    h('div', { className: 'flex items-start gap-2' },
                      h('span', { className: 'text-[10px] font-bold px-1.5 py-0.5 rounded ' + (issue.severity === 'critical' ? 'bg-red-200 text-red-800' : issue.severity === 'major' ? 'bg-amber-200 text-amber-800' : 'bg-blue-200 text-blue-800') }, issue.severity),
                      h('span', { className: 'text-[10px] font-bold text-slate-500' }, 'WCAG ', issue.criterion)
                    ),
                    h('p', { className: 'text-sm text-slate-800 font-medium mt-1' }, issue.issue),
                    issue.who && h('p', { className: 'text-xs text-slate-500 mt-1' }, '👤 Who it affects: ', issue.who),
                    issue.fix && h('p', { className: 'text-xs text-teal-600 mt-1 font-medium' }, '🔧 Fix: ', issue.fix)
                  );
                })
              )
            ),

            // Strengths
            auditResult.strengths && auditResult.strengths.length > 0 && h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'bg-green-50 border border-green-200 rounded-xl p-4' },
              h('h4', { className: 'text-xs font-bold text-green-600 uppercase tracking-widest mb-2' }, '✅ What\'s Good'),
              auditResult.strengths.map(function(s, i) {
                return h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, key: i, className: 'text-xs text-green-700 mb-1 flex items-start gap-2' }, h('span', null, '✓'), ' ', s);
              })
            ),

            // Recommendation
            auditResult.recommendation && h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'bg-indigo-50 border border-indigo-200 rounded-xl p-4 text-center' },
              h('p', { className: 'text-sm text-indigo-800 font-medium' }, '💡 ', auditResult.recommendation)
            ),

            // Action buttons
            h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'flex gap-2 justify-center' },
              h('button', { 'aria-label': 'Download Report', onClick: downloadReport, className: 'px-4 py-2 bg-indigo-100 text-indigo-700 rounded-lg text-xs font-bold hover:bg-indigo-200 transition-colors' }, '📥 Download Report'),
              h('button', { 'aria-label': 'New Audit', onClick: function() { updMulti({ auditResult: null, auditUrl: '', auditHtml: '' }); }, className: 'px-4 py-2 bg-slate-100 text-slate-600 rounded-lg text-xs font-bold hover:bg-slate-200 transition-colors' }, '🔄 New Audit')
            )
          )
        ),

        // ═══ LEARN WCAG TAB ═══
        tab === 'learn' && h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'space-y-3' },
          h('p', { className: 'text-sm text-slate-600 text-center mb-2' }, 'WCAG 2.1 AA has ', WCAG_CRITERIA.length, ' core criteria. Click any to learn more.'),

          WCAG_CRITERIA.map(function(criterion) {
            var isExpanded = selectedCriterion === criterion.id;
            return h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, key: criterion.id,
              className: 'rounded-2xl border-2 overflow-hidden transition-all ' + (isExpanded ? 'border-teal-400 bg-teal-50' : 'border-slate-200 bg-white hover:border-teal-300')
            },
              h('button', Object.assign({
                onClick: function() {
                  upd('selectedCriterion', isExpanded ? null : criterion.id);
                  if (!isExpanded) {
                    var newCount = Math.min(criteriaExplored + 1, 10);
                    upd('criteriaExplored', newCount);
                    if (awardStemXP) awardStemXP(3);
                  }
                },
                className: 'w-full p-4 text-left flex items-center gap-3'
              }, a11yClick ? {} : {}),
                h('span', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'bg-teal-100 text-teal-700 px-2 py-1 rounded-lg text-xs font-bold shrink-0' }, criterion.id),
                h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'flex-1' },
                  h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'font-bold text-sm text-slate-800' }, criterion.name),
                  h('span', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'text-[10px] text-slate-500 font-bold' }, 'Level ', criterion.level)
                )
              ),
              isExpanded && h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'px-4 pb-4 space-y-2' },
                h('p', { className: 'text-sm text-slate-700 leading-relaxed' }, criterion.desc),
                h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'bg-white rounded-xl p-3 border border-teal-200' },
                  h('p', { className: 'text-xs text-teal-800 font-medium' }, '👤 Impact: ', criterion.impact)
                ),
                callTTS && h('button', { 'aria-label': 'Read aloud',
                  onClick: function() { callTTS(criterion.desc + '. Impact: ' + criterion.impact); },
                  className: 'text-[10px] text-teal-500 hover:text-teal-700 font-bold'
                }, '🔊 Read aloud')
              )
            );
          })
        ),

        // ═══ HISTORY TAB ═══
        tab === 'history' && h('div', { className: 'space-y-3' },
          h('h3', { className: 'text-sm font-bold text-slate-700 text-center' }, 'Audit History'),
          auditHistory.length === 0 && h('p', { className: 'text-sm text-slate-400 text-center py-8' }, 'No audits yet. Run your first audit to see results here.'),
          auditHistory.slice().reverse().map(function(entry, i) {
            var color = entry.score >= 80 ? 'border-green-200 bg-green-50' : entry.score >= 60 ? 'border-amber-200 bg-amber-50' : 'border-red-200 bg-red-50';
            return h('div', { key: i, className: 'flex items-center gap-3 p-3 rounded-xl border ' + color },
              h('div', { className: 'text-2xl font-black ' + (entry.score >= 80 ? 'text-green-600' : entry.score >= 60 ? 'text-amber-600' : 'text-red-600') }, entry.score),
              h('div', { className: 'flex-1 min-w-0' },
                h('div', { className: 'text-xs font-bold text-slate-700 truncate' }, entry.input),
                h('div', { className: 'text-[10px] text-slate-500' }, new Date(entry.date).toLocaleDateString(), ' · Grade: ', entry.grade)
              )
            );
          })
        ),

        // ═══ BADGES TAB ═══
        tab === 'badges' && h('div', { className: 'space-y-3' },
          h('h3', { className: 'text-sm font-bold text-slate-700 text-center' }, 'Badges (', badges.length, '/', AUDIT_BADGES.length, ')'),
          h('div', { className: 'grid grid-cols-2 sm:grid-cols-3 gap-3' },
            AUDIT_BADGES.map(function(badge) {
              var earned = badges.indexOf(badge.id) >= 0;
              return h('div', { key: badge.id, className: 'text-center p-3 rounded-xl border-2 transition-all ' + (earned ? 'bg-amber-50 border-amber-300 shadow-sm' : 'bg-slate-50 border-slate-200 opacity-50') },
                h('div', { className: 'text-2xl' }, badge.icon),
                h('div', { className: 'text-[10px] font-bold text-slate-700 mt-1' }, badge.name),
                h('p', { className: 'text-[11px] text-slate-500 mt-0.5' }, badge.desc)
              );
            })
          )
        )
      );
    }
  });
})();
}

console.log('[StemLab] stem_tool_a11yauditor.js loaded');
