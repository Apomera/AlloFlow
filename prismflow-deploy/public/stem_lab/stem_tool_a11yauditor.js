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
  // ── Reduced motion CSS (WCAG 2.3.3) — shared across all STEM Lab tools ──
  (function() {
    if (document.getElementById('allo-stem-motion-reduce-css')) return;
    var st = document.createElement('style');
    st.id = 'allo-stem-motion-reduce-css';
    st.textContent = '@media (prefers-reduced-motion: reduce) { *, *::before, *::after { animation-duration: 0.01ms !important; animation-iteration-count: 1 !important; transition-duration: 0.01ms !important; scroll-behavior: auto !important; } }';
    document.head.appendChild(st);
  })();


  // ── Audio (auto-injected) ──
  var _a11yauAC = null;
  function getA11yauAC() { if (!_a11yauAC) { try { _a11yauAC = new (window.AudioContext || window.webkitAudioContext)(); } catch(e) {} } if (_a11yauAC && _a11yauAC.state === "suspended") { try { _a11yauAC.resume(); } catch(e) {} } return _a11yauAC; }
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
    { id: 'first_audit', icon: '\uD83D\uDD0D', name: 'First Audit', desc: 'Complete your first accessibility audit', check: function(s) { return s.auditsCompleted >= 1; } },
    { id: 'five_audits', icon: '\uD83D\uDCCA', name: 'Pattern Spotter', desc: 'Complete 5 audits', check: function(s) { return s.auditsCompleted >= 5; } },
    { id: 'perfect_find', icon: '\uD83C\uDFAF', name: 'Eagle Eye', desc: 'Find a document with score below 30', check: function(s) { return s.worstScore < 30 && s.worstScore >= 0; } },
    { id: 'advocate', icon: '\u270A', name: 'Accessibility Advocate', desc: 'Audit 3 different websites', check: function(s) { return s.uniqueSites >= 3; } },
    { id: 'expert', icon: '\uD83C\uDFC5', name: 'WCAG Expert', desc: 'Learn about all 10 core criteria', check: function(s) { return s.criteriaExplored >= 10; } },
    { id: 'reporter', icon: '\uD83D\uDCCB', name: 'Compliance Reporter', desc: 'Download an audit report', check: function(s) { return s.reportsDownloaded >= 1; } },
    { id: 'change_agent', icon: '\uD83D\uDCE3', name: 'Change Agent', desc: 'Generate your first accessibility complaint', check: function(s) { return s.complaintsGenerated >= 1; } },
    { id: 'social_scout', icon: '\uD83D\uDCF1', name: 'Social Media Scout', desc: 'Audit 3 social media posts', check: function(s) { return s.socialAudits >= 3; } },
    { id: 'title2_expert', icon: '\u2696\uFE0F', name: 'Title II Expert', desc: 'Complete a government website audit', check: function(s) { return s.govAudits >= 1; } },
    { id: 'knowbility_ally', icon: '\u267F', name: 'Knowbility Ally', desc: 'Explore all Knowbility programs', check: function(s) { return s.knowbilityExplored >= 3; } },
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
      var complaintsGenerated = d.complaintsGenerated || 0;
      var socialAudits = d.socialAudits || 0;
      var govAudits = d.govAudits || 0;
      var knowbilityExplored = d.knowbilityExplored || 0;
      var complaintEntity = d.complaintEntity || '';
      var complaintType = d.complaintType || 'ada_coordinator';
      var complaintImpact = d.complaintImpact || '';
      var complaintResult = d.complaintResult || null;
      var complaintLoading = d.complaintLoading || false;
      var socialText = d.socialText || '';
      var socialPlatform = d.socialPlatform || 'instagram';
      var socialRewrite = d.socialRewrite || null;
      var socialRewriteLoading = d.socialRewriteLoading || false;
      var govUrl = d.govUrl || '';
      var govEntityType = d.govEntityType || 'school';

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

      // ── Run social media audit ──
      var runSocialAudit = function() {
        if (!callGemini || !socialText.trim()) return;
        upd('auditLoading', true);
        var prompt = 'You are a social media accessibility expert. Audit this ' + socialPlatform + ' post for accessibility compliance.\n\n' +
          'POST CONTENT:\n"""\n' + socialText.substring(0, 3000) + '\n"""\n\n' +
          'Check ALL of the following:\n' +
          '1. IMAGE ALT TEXT: Does the post describe any images? Are visual elements explained?\n' +
          '2. VIDEO CAPTIONS: If video is mentioned, are captions/transcripts available?\n' +
          '3. HASHTAG CASING: Are hashtags using CamelCase (#AccessibilityMatters) or all lowercase (#accessibilitymatters)? CamelCase is required for screen readers.\n' +
          '4. EMOJI USAGE: Are emojis overused? More than 3-4 emojis in a row blocks screen readers. Are emojis placed at the end of text, not mid-sentence?\n' +
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
          try {
            var cleaned = result.trim();
            if (cleaned.indexOf('```') !== -1) { var parts = cleaned.split('```'); cleaned = parts[1] || parts[0]; if (cleaned.indexOf('\n') !== -1) cleaned = cleaned.split('\n').slice(1).join('\n'); if (cleaned.lastIndexOf('```') !== -1) cleaned = cleaned.substring(0, cleaned.lastIndexOf('```')); }
            var audit = JSON.parse(cleaned);
            var newHistory = auditHistory.concat([{ input: 'Social: ' + socialText.substring(0, 50) + '...', type: 'social', score: audit.score, grade: audit.grade, date: new Date().toISOString() }]);
            updMulti({ auditResult: audit, auditLoading: false, auditHistory: newHistory.slice(-20), auditsCompleted: auditsCompleted + 1, socialAudits: socialAudits + 1 });
            if (awardStemXP) awardStemXP(10);
            if (announceToSR) announceToSR('Social media audit complete. Score: ' + audit.score);
          } catch(e) {
            updMulti({ auditResult: { score: -1, summary: 'Social media audit failed.', issues: [], strengths: [] }, auditLoading: false });
          }
        }).catch(function() {
          updMulti({ auditResult: { score: -1, summary: 'Social media audit failed.', issues: [], strengths: [] }, auditLoading: false });
        });
      };

      // ── Rewrite post accessibly ──
      var rewriteAccessibly = function() {
        if (!callGemini || !socialText.trim()) return;
        upd('socialRewriteLoading', true);
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
          updMulti({ socialRewrite: result.trim(), socialRewriteLoading: false });
          if (announceToSR) announceToSR('Accessible rewrite generated.');
        }).catch(function() {
          updMulti({ socialRewrite: 'Rewrite failed. Please try again.', socialRewriteLoading: false });
        });
      };

      // ── Run government/Title II audit ──
      var runGovAudit = function() {
        if (!callGemini || !govUrl.trim()) return;
        upd('auditLoading', true);
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
          try {
            var cleaned = result.trim();
            if (cleaned.indexOf('```') !== -1) { var parts = cleaned.split('```'); cleaned = parts[1] || parts[0]; if (cleaned.indexOf('\n') !== -1) cleaned = cleaned.split('\n').slice(1).join('\n'); if (cleaned.lastIndexOf('```') !== -1) cleaned = cleaned.substring(0, cleaned.lastIndexOf('```')); }
            var audit = JSON.parse(cleaned);
            var newHistory = auditHistory.concat([{ input: govUrl.substring(0, 100), type: 'gov', score: audit.score, grade: audit.grade, date: new Date().toISOString() }]);
            updMulti({ auditResult: audit, auditLoading: false, auditHistory: newHistory.slice(-20), auditsCompleted: auditsCompleted + 1, govAudits: govAudits + 1 });
            if (awardStemXP) awardStemXP(15);
            if (announceToSR) announceToSR('Title II audit complete. Score: ' + audit.score);
          } catch(e) {
            updMulti({ auditResult: { score: -1, summary: 'Government audit failed.', issues: [], strengths: [] }, auditLoading: false });
          }
        }).catch(function() {
          updMulti({ auditResult: { score: -1, summary: 'Government audit failed.', issues: [], strengths: [] }, auditLoading: false });
        });
      };

      // ── Triangulated accessibility audit (3 parallel passes) ──
      var parseAuditJson = function(result) {
        var cleaned = result.trim();
        if (cleaned.indexOf('`' + '') !== -1) { var parts = cleaned.split('`' + ''); cleaned = parts[1] || parts[0]; if (cleaned.indexOf('\n') !== -1) cleaned = cleaned.split('\n').slice(1).join('\n'); if (cleaned.lastIndexOf('`' + '') !== -1) cleaned = cleaned.substring(0, cleaned.lastIndexOf('`' + '')); }
        return JSON.parse(cleaned);
      };

      var runAudit = function(input, inputType) {
        if (!callGemini) return;
        upd('auditLoading', true);
        var target = inputType === 'url' ? 'a website at URL: ' + input + '. Use your training knowledge of this website\u2019s structure, layout, and common patterns.' : 'the following HTML content';
        var htmlCtx = inputType === 'html' ? 'HTML:\n"""\n' + input.substring(0, 8000) + '\n"""\n\n' : '';
        var audience = 'Target audience: ' + (gradeLevel || '8th grade') + ' students learning about digital accessibility.\nExplain each issue in plain language. For each, explain WHO is affected and WHY.\n\n';
        var jsonSchema = 'Return ONLY JSON:\n{"score": 0-100, "grade": "A/B/C/D/F", "summary": "plain-language summary", "issues": [{"criterion": "X.X.X", "issue": "desc", "severity": "critical|major|minor", "who": "affected", "fix": "how"}], "strengths": ["good things"], "score_breakdown": {"structure": 0-10, "images": 0-10, "contrast": 0-10, "keyboard": 0-10, "forms": 0-10, "language": 0-10, "links": 0-10, "focus": 0-10, "aria": 0-10, "navigation": 0-10}, "recommendation": "fix this first"}';

        var p1 = callGemini('You are a WCAG 2.1 AA STRUCTURAL accessibility expert auditing ' + target + '.\n\n' + htmlCtx + 'Focus ONLY on structural and semantic issues:\n1. Heading hierarchy (1.3.1)\n2. Language declaration (3.1.1)\n3. ARIA roles and properties (4.1.2)\n4. Form labels and instructions (3.3.2)\n5. Semantic HTML usage (1.3.1)\n\n' + audience + jsonSchema, true);
        var p2 = callGemini('You are a WCAG 2.1 AA VISUAL accessibility expert auditing ' + target + '.\n\n' + htmlCtx + 'Focus ONLY on visual and perceivable issues:\n1. Images without alt text (1.1.1)\n2. Color contrast ratios (1.4.3)\n3. Text resize and reflow (1.4.4, 1.4.10)\n4. Focus indicators (2.4.7)\n5. Use of color alone to convey meaning (1.4.1)\n\n' + audience + jsonSchema, true);
        var p3 = callGemini('You are a WCAG 2.1 AA NAVIGATION accessibility expert auditing ' + target + '.\n\n' + htmlCtx + 'Focus ONLY on navigation and operability:\n1. Keyboard access (2.1.1)\n2. Skip navigation links (2.4.1)\n3. Link purpose and descriptive text (2.4.4)\n4. Focus order and tab sequence (2.4.3)\n5. No keyboard traps (2.1.2)\n\n' + audience + jsonSchema, true);

        Promise.all([p1, p2, p3]).then(function(results) {
          try {
            var audits = results.map(function(r) { try { return parseAuditJson(r); } catch(e) { return null; } }).filter(Boolean);
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
              mergedBreakdown[k] = vals.length > 0 ? Math.round(vals.reduce(function(a,b){return a+b;},0) / vals.length) : 5;
            });
            var allStrengths = []; var seenStr = {};
            audits.forEach(function(a) { (a.strengths || []).forEach(function(s) { if (!seenStr[s]) { seenStr[s] = true; allStrengths.push(s); } }); });
            var avgScore = Math.round(audits.reduce(function(s,a){return s+(a.score||0);},0) / audits.length);
            var grade = avgScore >= 90 ? 'A' : avgScore >= 80 ? 'B' : avgScore >= 70 ? 'C' : avgScore >= 60 ? 'D' : 'F';
            var merged = { score: avgScore, grade: grade, summary: (audits[0] || {}).summary || 'Triangulated audit complete.',
              issues: allIssues, strengths: allStrengths, score_breakdown: mergedBreakdown,
              recommendation: (audits[0] || {}).recommendation || '', _triangulated: true, _passCount: audits.length };
            var newHistory = auditHistory.concat([{ input: input.substring(0, 100), type: inputType, score: merged.score, grade: merged.grade, date: new Date().toISOString() }]);
            var newWorst = Math.min(worstScore === 999 ? merged.score : worstScore, merged.score);
            var newUnique = inputType === 'url' ? new Set(newHistory.filter(function(h) { return h.type === 'url'; }).map(function(h) { return h.input; })).size : uniqueSites;
            updMulti({ auditResult: merged, auditLoading: false, auditHistory: newHistory.slice(-20), auditsCompleted: auditsCompleted + 1, worstScore: newWorst, uniqueSites: newUnique });
            if (awardStemXP) awardStemXP(15);
            if (announceToSR) announceToSR('Triangulated audit complete. Score: ' + merged.score + ' out of 100. Grade: ' + merged.grade);
            if (merged.score >= 90 && stemCelebrate) stemCelebrate();
          } catch(e) {
            updMulti({ auditResult: { score: -1, summary: 'Audit failed. Try different content or a simpler URL.', issues: [], strengths: [] }, auditLoading: false });
          }
        }).catch(function() {
          updMulti({ auditResult: { score: -1, summary: 'Audit failed. The content could not be analyzed.', issues: [], strengths: [] }, auditLoading: false });
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

      React.useEffect(function() { checkBadges(); }, [auditsCompleted, criteriaExplored, reportsDownloaded]);

      // ═══ RENDER ═══
      return h('div', { className: 'space-y-4 animate-in fade-in duration-200' },

        // Header
        h('div', { className: 'flex items-center gap-3' },
          h('button', Object.assign({ className: 'p-2 rounded-full hover:bg-teal-100 text-teal-600 transition-colors' }, a11yClick(function() { ctx.setStemLabTool(null); })),
            h(ArrowLeft, { size: 20 })
          ),
          h('div', { className: 'flex-1' },
            h('h2', { className: 'text-xl font-black text-slate-800' }, '\u267F Digital Accessibility Lab'),
            h('p', { className: 'text-xs text-slate-600' }, 'Be an Accessibility Change Agent \u2014 Audit, Learn, Advocate')
          ),
          auditsCompleted > 0 && h('span', { className: 'bg-teal-100 text-teal-700 px-3 py-1 rounded-full text-xs font-bold' }, auditsCompleted + ' audits')
        ),

        // Student-friendly intro (collapsible)
        !d.introHidden && h('div', { className: 'bg-gradient-to-r from-teal-50 to-cyan-50 border-2 border-teal-200 rounded-2xl p-5 relative' },
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
                  h('span', { className: 'font-bold text-teal-800' }, d2.label),
                  h('span', { className: 'text-teal-600 ml-1' }, '\u2014 ' + d2.desc)
                )
              );
            })
          )
        ),

        // Tabs
        h('div', { role: 'tablist', className: 'flex gap-1 bg-teal-50 rounded-xl p-1 border border-teal-200 flex-wrap' },
          [{ id: 'audit', label: '\uD83D\uDD0D Audit' }, { id: 'learn', label: '\uD83D\uDCD6 Learn' }, { id: 'knowbility', label: '\u267F Knowbility' }, { id: 'action', label: '\u2696\uFE0F Take Action' }, { id: 'history', label: '\uD83D\uDCCA History' }, { id: 'badges', label: '\uD83C\uDFC5 Badges' }].map(function(t) {
            return h('button', { 'aria-label': 'Switch to ' + t.label + ' tab',
              key: t.id, role: 'tab', 'aria-selected': tab === t.id,
              onClick: function() { upd('tab', t.id); },
              className: 'flex-1 px-2 py-2 rounded-lg text-[11px] font-bold transition-all min-w-[60px] ' + (tab === t.id ? 'bg-white text-teal-700 shadow-sm' : 'text-teal-600/60 hover:text-teal-700')
            }, t.label);
          })
        ),

        // ═══ AUDIT TAB ═══
        tab === 'audit' && h('div', { className: 'space-y-4' },

          // Input area
          h('div', { className: 'bg-white rounded-2xl border-2 border-teal-200 p-5 space-y-3' },
            h('h3', { className: 'text-sm font-bold text-teal-700 mb-2' }, 'What would you like to audit?'),

            // Input mode tabs
            h('div', { className: 'flex gap-1 bg-slate-100 rounded-lg p-1 mb-3' },
              [
                { id: 'url', icon: '\uD83C\uDF10', label: 'Website' },
                { id: 'html', icon: '\uD83D\uDCBB', label: 'HTML' },
                { id: 'pdf', icon: '\uD83D\uDCC4', label: 'PDF' },
                { id: 'screenshot', icon: '\uD83D\uDCF7', label: 'Screenshot' },
                { id: 'social', icon: '\uD83D\uDCF1', label: 'Social Media' },
                { id: 'gov', icon: '\uD83C\uDFDB\uFE0F', label: 'Gov/School' }
              ].map(function(mode) {
                return h('button', { key: mode.id,
                  onClick: function() { upd('auditInputMode', mode.id); },
                  className: 'flex-1 px-2 py-1.5 rounded-md text-[11px] font-bold transition-all ' + (auditInputMode === mode.id ? 'bg-white text-teal-700 shadow-sm' : 'text-slate-600 hover:text-slate-700')
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
              h('p', { className: 'text-[11px] text-slate-600 mt-1' }, 'The AI will analyze the website\u2019s accessibility based on its known structure and common patterns.'),
              // Quick suggestions
              h('div', { className: 'flex flex-wrap gap-2 pt-2' },
                h('span', { className: 'text-[11px] text-slate-600 font-bold' }, 'Try:'),
                ['https://www.wikipedia.org', 'https://www.google.com', 'https://www.nytimes.com', 'https://www.amazon.com'].map(function(url) {
                  return h('button', { key: url,
                    onClick: function() { upd('auditUrl', url); },
                    className: 'text-[11px] text-teal-600 hover:text-teal-800 font-medium hover:underline'
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
              h('button', { onClick: function() { if (auditHtml.trim()) runAudit(auditHtml.trim(), 'html'); },
                disabled: !auditHtml.trim() || auditLoading,
                className: 'mt-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700 disabled:opacity-40 transition-colors'
              }, auditLoading ? 'Auditing...' : '\uD83D\uDD0D Audit HTML'),
              h('p', { className: 'text-[11px] text-slate-600 mt-1' }, 'Paste any HTML code \u2014 from a school project, a webpage, or generated by a coding tool. The AI will check it for accessibility issues.')
            ),

            // PDF input mode
            auditInputMode === 'pdf' && h('div', { className: 'text-center py-4' },
              h('div', { className: 'text-3xl mb-2' }, '\uD83D\uDCC4'),
              h('p', { className: 'text-sm text-slate-600 mb-3' }, 'Upload a PDF document to check its accessibility'),
              h('p', { className: 'text-[11px] text-slate-600 mb-3' }, 'The AI will check for: tagged structure, reading order, alt text on images, form labels, color contrast, language declaration, and heading hierarchy.'),
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
              h('p', { className: 'text-[11px] text-slate-600 mb-3' }, 'The AI will visually analyze the screenshot for: color contrast issues, missing labels, layout problems, text readability, and visual accessibility barriers.'),
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

          // Social media input mode
          auditInputMode === 'social' && h('div', { className: 'bg-white rounded-2xl border-2 border-pink-200 p-5 space-y-3' },
            h('div', { className: 'flex items-center gap-2 mb-2' },
              h('span', { className: 'text-2xl' }, '\uD83D\uDCF1'),
              h('h3', { className: 'text-sm font-bold text-pink-700' }, 'Social Media Post Audit')
            ),
            // Platform selector
            h('div', { className: 'flex gap-1 bg-pink-50 rounded-lg p-1' },
              [{ id: 'instagram', label: 'Instagram' }, { id: 'twitter', label: 'X/Twitter' }, { id: 'facebook', label: 'Facebook' }, { id: 'linkedin', label: 'LinkedIn' }, { id: 'tiktok', label: 'TikTok' }].map(function(p) {
                return h('button', { key: p.id, onClick: function() { upd('socialPlatform', p.id); },
                  className: 'flex-1 px-2 py-1.5 rounded-md text-[11px] font-bold transition-all ' + (socialPlatform === p.id ? 'bg-white text-pink-700 shadow-sm' : 'text-pink-500/60 hover:text-pink-600')
                }, p.label);
              })
            ),
            h('label', { className: 'text-xs font-bold text-slate-600 block' }, 'Paste the post text (include hashtags, mentions, and any image descriptions)'),
            h('textarea', { value: socialText, onChange: function(e) { upd('socialText', e.target.value); },
              placeholder: 'Paste the full post text here...\n\nInclude:\n\u2022 All text content\n\u2022 Hashtags\n\u2022 Image descriptions (if any)\n\u2022 Link URLs',
              className: 'w-full text-xs p-3 border border-pink-200 rounded-lg outline-none focus:ring-2 focus:ring-pink-300 resize-none h-28', 'aria-label': 'Social media post text'
            }),
            h('div', { className: 'flex gap-2' },
              h('button', { 'aria-label': 'Audit social media post',
                onClick: runSocialAudit, disabled: !socialText.trim() || auditLoading,
                className: 'flex-1 px-4 py-2.5 bg-pink-600 text-white rounded-lg text-xs font-bold hover:bg-pink-700 disabled:opacity-40 transition-all'
              }, auditLoading ? 'Auditing...' : '\uD83D\uDD0D Audit Post'),
              h('button', { 'aria-label': 'Rewrite post accessibly',
                onClick: rewriteAccessibly, disabled: !socialText.trim() || socialRewriteLoading,
                className: 'flex-1 px-4 py-2.5 bg-emerald-700 text-white rounded-lg text-xs font-bold hover:bg-emerald-700 disabled:opacity-40 transition-all'
              }, socialRewriteLoading ? 'Rewriting...' : '\u2728 Rewrite Accessibly')
            ),
            // Rewrite result
            socialRewrite && h('div', { className: 'bg-emerald-50 border border-emerald-200 rounded-xl p-4 space-y-2' },
              h('h4', { className: 'text-xs font-bold text-emerald-700' }, '\u2728 Accessible Version'),
              h('pre', { className: 'text-xs text-slate-700 whitespace-pre-wrap font-sans leading-relaxed' }, socialRewrite),
              h('button', { 'aria-label': 'Copy rewrite', onClick: function() { navigator.clipboard.writeText(socialRewrite); if (addToast) addToast('Copied!', 'success'); },
                className: 'px-3 py-1.5 bg-emerald-100 text-emerald-700 rounded-lg text-[11px] font-bold hover:bg-emerald-200'
              }, '\uD83D\uDCCB Copy to Clipboard')
            ),
            h('p', { className: 'text-[11px] text-slate-600' }, 'Checks: alt text, captions, CamelCase hashtags, emoji placement, readability, contrast, and text-in-images.')
          ),

          // Government/School input mode
          auditInputMode === 'gov' && h('div', { className: 'bg-white rounded-2xl border-2 border-amber-200 p-5 space-y-3' },
            h('div', { className: 'flex items-center gap-2 mb-2' },
              h('span', { className: 'text-2xl' }, '\uD83C\uDFDB\uFE0F'),
              h('h3', { className: 'text-sm font-bold text-amber-700' }, 'Government / School Title II Audit')
            ),
            h('p', { className: 'text-xs text-slate-600 mb-2' }, 'Audit government and school websites for ADA Title II compliance. Includes standard WCAG checks plus Title II-specific requirements.'),
            // Entity type
            h('div', { className: 'flex gap-1 bg-amber-50 rounded-lg p-1 mb-2' },
              [{ id: 'school', label: '\uD83C\uDFEB School' }, { id: 'library', label: '\uD83D\uDCDA Library' }, { id: 'city', label: '\uD83C\uDFD9\uFE0F City/County' }, { id: 'state', label: '\uD83C\uDFDB\uFE0F State' }].map(function(t) {
                return h('button', { key: t.id, onClick: function() { upd('govEntityType', t.id); },
                  className: 'flex-1 px-2 py-1.5 rounded-md text-[11px] font-bold transition-all ' + (govEntityType === t.id ? 'bg-white text-amber-700 shadow-sm' : 'text-amber-500/60 hover:text-amber-600')
                }, t.label);
              })
            ),
            h('label', { className: 'text-xs font-bold text-slate-600 block' }, 'Website URL'),
            h('div', { className: 'flex gap-2' },
              h('input', { type: 'url', value: govUrl, onChange: function(e) { upd('govUrl', e.target.value); },
                onKeyDown: function(e) { if (e.key === 'Enter' && govUrl.trim()) runGovAudit(); },
                placeholder: 'https://www.portlandschools.org', 'aria-label': 'Government website URL',
                className: 'flex-1 text-sm p-2.5 border border-amber-200 rounded-lg outline-none focus:ring-2 focus:ring-amber-300'
              }),
              h('button', { 'aria-label': 'Run Title II audit',
                onClick: runGovAudit, disabled: !govUrl.trim() || auditLoading,
                className: 'px-4 py-2 bg-amber-600 text-white rounded-lg text-xs font-bold hover:bg-amber-700 disabled:opacity-40 transition-colors'
              }, auditLoading ? 'Auditing...' : '\u2696\uFE0F Title II Audit')
            ),
            h('p', { className: 'text-[11px] text-slate-600 mt-1' }, 'Checks WCAG 2.1 AA + ADA Coordinator info, accessibility statement, grievance procedure, PDF tagging, form accessibility, captions, and third-party tools.')
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

            // Title II compliance card (government audits)
            auditResult.title_ii && h('div', { className: 'bg-amber-50 rounded-2xl border-2 border-amber-300 p-4' },
              h('h4', { className: 'text-xs font-bold text-amber-800 uppercase tracking-widest mb-3' }, '\u2696\uFE0F Title II Compliance Checklist'),
              h('div', { className: 'grid grid-cols-2 gap-2' },
                [{ key: 'ada_coordinator', label: 'ADA Coordinator Published' }, { key: 'accessibility_statement', label: 'Accessibility Statement' }, { key: 'grievance_procedure', label: 'Grievance Procedure' }, { key: 'compliant_forms', label: 'Accessible Forms' }, { key: 'tagged_pdfs', label: 'Tagged PDF Documents' }, { key: 'captioned_videos', label: 'Captioned Videos' }].map(function(item) {
                  var pass = auditResult.title_ii[item.key];
                  return h('div', { key: item.key, className: 'flex items-center gap-2 p-2 rounded-lg border ' + (pass ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200') },
                    h('span', { className: 'text-sm' }, pass ? '\u2705' : '\u274C'),
                    h('span', { className: 'text-[11px] font-bold ' + (pass ? 'text-green-700' : 'text-red-700') }, item.label)
                  );
                })
              ),
              h('button', { 'aria-label': 'File complaint about findings', onClick: function() { upd('tab', 'action'); }, className: 'mt-3 w-full px-3 py-2 bg-amber-600 text-white rounded-lg text-xs font-bold hover:bg-amber-700 transition-colors' }, '\u270D\uFE0F Take Action \u2014 Generate Complaint Letter')
            ),

            // Issues
            auditResult.issues && auditResult.issues.length > 0 && h('div', { className: 'bg-white rounded-2xl border border-slate-200 p-4' },
              h('h4', { className: 'text-xs font-bold text-slate-600 uppercase tracking-widest mb-3' }, 'Issues Found (', auditResult.issues.length, ')'),
              h('div', { className: 'space-y-2' },
                auditResult.issues.map(function(issue, i) {
                  var sevColor = issue.severity === 'critical' ? 'bg-red-50 border-red-200' : issue.severity === 'major' ? 'bg-amber-50 border-amber-200' : 'bg-blue-50 border-blue-200';
                  return h('div', { key: i, className: 'p-3 rounded-xl border ' + sevColor },
                    h('div', { className: 'flex items-start gap-2' },
                      h('span', { className: 'text-[11px] font-bold px-1.5 py-0.5 rounded ' + (issue.severity === 'critical' ? 'bg-red-200 text-red-800' : issue.severity === 'major' ? 'bg-amber-200 text-amber-800' : 'bg-blue-200 text-blue-800') }, issue.severity),
                      h('span', { className: 'text-[11px] font-bold text-slate-600' }, 'WCAG ', issue.criterion)
                    ),
                    h('p', { className: 'text-sm text-slate-800 font-medium mt-1' }, issue.issue),
                    issue.who && h('p', { className: 'text-xs text-slate-600 mt-1' }, '👤 Who it affects: ', issue.who),
                    issue.fix && h('p', { className: 'text-xs text-teal-600 mt-1 font-medium' }, '🔧 Fix: ', issue.fix)
                  );
                })
              )
            ),

            // Strengths
            auditResult.strengths && auditResult.strengths.length > 0 && h('div', { className: 'bg-green-50 border border-green-200 rounded-xl p-4' },
              h('h4', { className: 'text-xs font-bold text-green-600 uppercase tracking-widest mb-2' }, '✅ What\'s Good'),
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
              h('button', { 'aria-label': 'Download Report', onClick: downloadReport, className: 'px-4 py-2 bg-indigo-100 text-indigo-700 rounded-lg text-xs font-bold hover:bg-indigo-200 transition-colors' }, '📥 Download Report'),
              h('button', { 'aria-label': 'New Audit', onClick: function() { updMulti({ auditResult: null, auditUrl: '', auditHtml: '' }); }, className: 'px-4 py-2 bg-slate-100 text-slate-600 rounded-lg text-xs font-bold hover:bg-slate-200 transition-colors' }, '🔄 New Audit')
            )
          )
        ),

        // ═══ LEARN WCAG TAB ═══
        tab === 'learn' && h('div', { className: 'space-y-3' },
          h('p', { className: 'text-sm text-slate-600 text-center mb-2' }, 'WCAG 2.1 AA has ', WCAG_CRITERIA.length, ' core criteria. Click any to learn more.'),

          WCAG_CRITERIA.map(function(criterion) {
            var isExpanded = selectedCriterion === criterion.id;
            return h('div', { key: criterion.id,
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
                h('span', { className: 'bg-teal-100 text-teal-700 px-2 py-1 rounded-lg text-xs font-bold shrink-0' }, criterion.id),
                h('div', { className: 'flex-1' },
                  h('div', { className: 'font-bold text-sm text-slate-800' }, criterion.name),
                  h('span', { className: 'text-[11px] text-slate-600 font-bold' }, 'Level ', criterion.level)
                )
              ),
              isExpanded && h('div', { className: 'px-4 pb-4 space-y-2' },
                h('p', { className: 'text-sm text-slate-700 leading-relaxed' }, criterion.desc),
                h('div', { className: 'bg-white rounded-xl p-3 border border-teal-200' },
                  h('p', { className: 'text-xs text-teal-800 font-medium' }, '👤 Impact: ', criterion.impact)
                ),
                callTTS && h('button', { 'aria-label': 'Read aloud',
                  onClick: function() { callTTS(criterion.desc + '. Impact: ' + criterion.impact); },
                  className: 'text-[11px] text-teal-500 hover:text-teal-700 font-bold'
                }, '🔊 Read aloud')
              )
            );
          })
        ),

        // ═══ KNOWBILITY TAB ═══
        tab === 'knowbility' && h('div', { className: 'space-y-4' },
          // Hero banner
          h('div', { className: 'bg-gradient-to-r from-indigo-600 to-purple-700 text-white rounded-2xl p-6 text-center' },
            h('div', { className: 'text-4xl mb-2' }, '\u267F'),
            h('h3', { className: 'text-lg font-black' }, 'Knowbility'),
            h('p', { className: 'text-sm opacity-90 mt-1' }, 'Creating an inclusive digital world since 1999')
          ),
          // History
          h('div', { className: 'bg-white rounded-2xl border-2 border-indigo-200 p-5 space-y-3' },
            h('h4', { className: 'text-sm font-black text-indigo-800 uppercase tracking-widest' }, 'Our Partner\u2019s Story'),
            h('p', { className: 'text-sm text-slate-700 leading-relaxed' },
              parseInt(gradeLevel, 10) <= 5
                ? 'Knowbility is a group of people in Austin, Texas who believe everyone should be able to use the internet \u2014 including people who are blind, deaf, or have other disabilities. They\u2019ve been working on this since 1999, which is over 25 years! They teach people how to build websites the right way and help test if websites actually work for everyone.'
                : 'Knowbility is a 501(c)(3) nonprofit founded in 1999 in Austin, TX. Born from a community effort during the late-1990s tech boom, they recognized that the digital revolution was leaving people with disabilities behind. For over 25 years, they\u2019ve worked to ensure equal access to technology through three pillars: Awareness, Education, and Accessibility Services.'
            ),
            h('div', { className: 'grid grid-cols-3 gap-2 mt-3' },
              [{ num: '25+', label: 'Years' }, { num: '1999', label: 'Founded' }, { num: '501(c)(3)', label: 'Nonprofit' }].map(function(stat) {
                return h('div', { key: stat.label, className: 'text-center p-2 bg-indigo-50 rounded-lg' },
                  h('div', { className: 'text-lg font-black text-indigo-700' }, stat.num),
                  h('div', { className: 'text-[11px] text-indigo-600 font-bold' }, stat.label)
                );
              })
            )
          ),
          // Programs
          h('div', { className: 'space-y-3' },
            h('h4', { className: 'text-sm font-black text-indigo-800 uppercase tracking-widest' }, 'Key Programs'),
            // AccessU
            h('button', { onClick: function() { var n = Math.min(knowbilityExplored + 1, 3); upd('knowbilityExplored', n); if (awardStemXP) awardStemXP(5); }, className: 'w-full text-left bg-white rounded-2xl border-2 border-purple-200 p-4 hover:border-purple-400 transition-all' },
              h('div', { className: 'flex items-start gap-3' },
                h('div', { className: 'text-2xl' }, '\uD83C\uDF93'),
                h('div', { className: 'flex-1' },
                  h('div', { className: 'font-bold text-sm text-purple-800' }, 'John Slatin AccessU'),
                  h('p', { className: 'text-xs text-slate-600 mt-1' }, 'Annual hands-on training conference (hybrid). Named after Dr. John Slatin, it teaches practical skills in coding, usability, and inclusive design. Next session: May 11\u201314, 2026.'),
                  h('div', { className: 'text-[11px] text-purple-500 font-bold mt-2' }, '\uD83D\uDD17 knowbility.org/programs/accessu')
                )
              )
            ),
            // AIR
            h('button', { onClick: function() { var n = Math.min(knowbilityExplored + 1, 3); upd('knowbilityExplored', n); if (awardStemXP) awardStemXP(5); }, className: 'w-full text-left bg-white rounded-2xl border-2 border-teal-200 p-4 hover:border-teal-400 transition-all' },
              h('div', { className: 'flex items-start gap-3' },
                h('div', { className: 'text-2xl' }, '\uD83C\uDF10'),
                h('div', { className: 'flex-1' },
                  h('div', { className: 'font-bold text-sm text-teal-800' }, 'Accessibility Internet Rally (AIR)'),
                  h('p', { className: 'text-xs text-slate-600 mt-1' }, 'An 8-week global online competition pairing volunteer web professionals with nonprofits to build accessible websites. Started as a one-day hackathon and evolved into Knowbility\u2019s signature program.'),
                  h('div', { className: 'text-[11px] text-teal-500 font-bold mt-2' }, '\uD83D\uDD17 knowbility.org/programs/air')
                )
              )
            )
          ),
          // Get Involved
          h('div', { className: 'bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-200 rounded-2xl p-5 space-y-3' },
            h('h4', { className: 'text-sm font-black text-amber-800 uppercase tracking-widest' }, '\uD83E\uDD1D How to Get Involved'),
            h('div', { className: 'space-y-2' },
              [{ icon: '\uD83D\uDE4B', title: 'Volunteer at AccessU', desc: 'Help with registration, room hosting, and support. Earn free conference access for a 4-8 hour shift.' },
               { icon: '\uD83D\uDCBB', title: 'Join an AIR Team', desc: 'Developers, designers, and content creators build accessible websites for nonprofits.' },
               { icon: '\uD83D\uDCDA', title: 'Learn', desc: 'Attend AccessU sessions, use free resources, and build your accessibility skills.' },
               { icon: '\uD83D\uDCE3', title: 'Advocate', desc: 'Use THIS tool to audit and report accessibility barriers. Be a change agent in your community!' }
              ].map(function(item) {
                return h('button', { key: item.title, onClick: function() { var n = Math.min(knowbilityExplored + 1, 3); upd('knowbilityExplored', n); if (awardStemXP) awardStemXP(3); }, className: 'w-full text-left flex items-start gap-3 bg-white rounded-xl p-3 border border-amber-100 hover:border-amber-300 transition-all' },
                  h('span', { className: 'text-lg' }, item.icon),
                  h('div', null,
                    h('div', { className: 'font-bold text-xs text-amber-800' }, item.title),
                    h('p', { className: 'text-[11px] text-slate-600 mt-0.5' }, item.desc)
                  )
                );
              })
            ),
            h('a', { href: 'https://knowbility.org/about/volunteer-with-knowbility?utm_source=alloflow&utm_medium=referral&utm_campaign=stem_lab_volunteer', target: '_blank', rel: 'noopener', className: 'block text-center px-4 py-2.5 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700 transition-colors mt-3' }, '\u267F Visit Knowbility \u2014 Volunteer Today')
          )
        ),

        // ═══ TAKE ACTION TAB ═══
        tab === 'action' && h('div', { className: 'space-y-4' },
          // Title II explainer
          h('div', { className: 'bg-gradient-to-r from-slate-800 to-slate-900 text-white rounded-2xl p-6' },
            h('h3', { className: 'text-lg font-black flex items-center gap-2' }, '\u2696\uFE0F ADA Title II & Digital Accessibility'),
            h('p', { className: 'text-sm opacity-90 mt-2 leading-relaxed' },
              parseInt(gradeLevel, 10) <= 5
                ? 'There\u2019s a law called the ADA (Americans with Disabilities Act) that says government websites \u2014 like your school district\u2019s website, the library, and city hall \u2014 must work for EVERYONE, including people with disabilities. If they don\u2019t, you can ask them to fix it!'
                : parseInt(gradeLevel, 10) <= 8
                  ? 'In April 2024, the U.S. Department of Justice updated Title II of the ADA to require all state and local government websites to meet WCAG 2.1 AA standards. This includes school districts, libraries, courts, DMVs, and public transit. Entities with 50,000+ population must comply by April 24, 2026.'
                  : 'The DOJ\u2019s April 2024 final rule under ADA Title II mandates WCAG 2.1 AA compliance for all state and local government web content and mobile apps. Compliance deadlines: April 24, 2026 (pop \u226550K) and April 26, 2027 (pop <50K). This covers schools, libraries, courts, DMVs, public transit, parks, voting systems, and all third-party vendor content.'
            ),
            h('div', { className: 'flex flex-wrap gap-2 mt-3' },
              ['Schools', 'Libraries', 'City/County Gov', 'Courts', 'Public Transit', 'Parks & Rec', 'DMV', 'Voting'].map(function(e) {
                return h('span', { key: e, className: 'bg-white/15 text-white/90 px-2 py-1 rounded-md text-[11px] font-bold' }, e);
              })
            )
          ),
          // Complaint builder
          h('div', { className: 'bg-white rounded-2xl border-2 border-red-200 p-5 space-y-3' },
            h('h4', { className: 'text-sm font-black text-red-800 flex items-center gap-2' }, '\uD83D\uDCDD Accessibility Complaint Builder'),
            h('p', { className: 'text-xs text-slate-600 mb-2' }, 'Found accessibility barriers? Generate a formal complaint letter to request change. Choose your recipient:'),
            // Recipient selector
            h('div', { className: 'flex gap-2 mb-3' },
              [{ id: 'ada_coordinator', label: '\uD83C\uDFE2 ADA Coordinator' }, { id: 'doj', label: '\uD83C\uDFDB\uFE0F Dept. of Justice' }].map(function(opt) {
                return h('button', { key: opt.id, onClick: function() { upd('complaintType', opt.id); },
                  className: 'flex-1 px-3 py-2 rounded-lg text-xs font-bold border-2 transition-all ' + (complaintType === opt.id ? 'border-red-400 bg-red-50 text-red-700' : 'border-slate-200 text-slate-600 hover:border-red-300')
                }, opt.label);
              })
            ),
            // Entity name
            h('label', { className: 'text-xs font-bold text-slate-600 block' }, 'Entity Name (school, city, agency)'),
            h('input', { type: 'text', value: complaintEntity, onChange: function(e) { upd('complaintEntity', e.target.value); }, placeholder: 'e.g. Portland Public Schools, City of Austin', className: 'w-full text-sm p-2.5 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-red-300 mt-1', 'aria-label': 'Entity name' }),
            // Impact description
            h('label', { className: 'text-xs font-bold text-slate-600 block mt-2' }, 'Describe the impact (who is affected and how)'),
            h('textarea', { value: complaintImpact, onChange: function(e) { upd('complaintImpact', e.target.value); }, placeholder: 'e.g. My child uses a screen reader and cannot navigate the enrollment forms...', className: 'w-full text-xs p-3 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-red-300 resize-none h-20 mt-1', 'aria-label': 'Impact description' }),
            // Auto-populate from last audit
            auditResult && auditResult.issues && h('p', { className: 'text-[11px] text-teal-600 font-bold' }, '\u2705 ' + auditResult.issues.length + ' issues from your last audit will be included automatically'),
            // Generate button
            h('button', {
              'aria-label': 'Generate complaint letter',
              disabled: !complaintEntity.trim() || complaintLoading,
              onClick: function() {
                if (!callGemini) return;
                upd('complaintLoading', true);
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
                  updMulti({ complaintResult: result, complaintLoading: false, complaintsGenerated: complaintsGenerated + 1 });
                  if (awardStemXP) awardStemXP(20);
                  if (announceToSR) announceToSR('Complaint letter generated.');
                }).catch(function() {
                  updMulti({ complaintResult: 'Error generating complaint letter. Please try again.', complaintLoading: false });
                });
              },
              className: 'w-full px-4 py-2.5 bg-red-600 text-white rounded-lg text-xs font-bold hover:bg-red-700 disabled:opacity-40 transition-colors mt-2'
            }, complaintLoading ? 'Generating...' : '\uD83D\uDCDD Generate Complaint Letter'),
            // Result
            complaintResult && h('div', { className: 'mt-3 space-y-2' },
              h('div', { className: 'bg-slate-50 border border-slate-200 rounded-xl p-4 max-h-60 overflow-y-auto' },
                h('pre', { className: 'text-xs text-slate-700 whitespace-pre-wrap font-sans leading-relaxed' }, complaintResult)
              ),
              h('div', { className: 'flex gap-2' },
                h('button', { onClick: function() { navigator.clipboard.writeText(complaintResult); if (addToast) addToast('Copied to clipboard!', 'success'); }, className: 'flex-1 px-3 py-2 bg-indigo-100 text-indigo-700 rounded-lg text-xs font-bold hover:bg-indigo-200' }, '\uD83D\uDCCB Copy to Clipboard'),
                h('button', { 'aria-label': 'Reset complaint', onClick: function() { upd('complaintResult', null); }, className: 'px-3 py-2 bg-slate-100 text-slate-600 rounded-lg text-xs font-bold hover:bg-slate-200' }, '\uD83D\uDD04 New Letter')
              )
            )
          ),
          // Filing guide
          h('div', { className: 'bg-blue-50 border border-blue-200 rounded-2xl p-5' },
            h('h4', { className: 'text-sm font-black text-blue-800 mb-2' }, '\uD83D\uDCCB How to File'),
            h('ol', { className: 'space-y-2 text-xs text-blue-900' },
              h('li', { className: 'flex gap-2' }, h('span', { className: 'font-black text-blue-500' }, '1.'), 'Contact the entity\u2019s ADA Coordinator first \u2014 they can often resolve issues quickly.'),
              h('li', { className: 'flex gap-2' }, h('span', { className: 'font-black text-blue-500' }, '2.'), 'If unresolved, file with the DOJ at ada.gov/file-a-complaint/'),
              h('li', { className: 'flex gap-2' }, h('span', { className: 'font-black text-blue-500' }, '3.'), 'You can also mail: U.S. DOJ, Civil Rights Division, 950 Pennsylvania Ave NW, Washington DC 20530'),
              h('li', { className: 'flex gap-2' }, h('span', { className: 'font-black text-blue-500' }, '4.'), 'ADA Info Line: 1-800-514-0301 (voice) / 1-833-610-1264 (TTY)')
            )
          )
        ),

        // ═══ HISTORY TAB ═══
        tab === 'history' && h('div', { className: 'space-y-3' },
          h('h3', { className: 'text-sm font-bold text-slate-700 text-center' }, 'Audit History'),
          auditHistory.length === 0 && h('p', { className: 'text-sm text-slate-600 text-center py-8' }, 'No audits yet. Run your first audit to see results here.'),
          auditHistory.slice().reverse().map(function(entry, i) {
            var color = entry.score >= 80 ? 'border-green-200 bg-green-50' : entry.score >= 60 ? 'border-amber-200 bg-amber-50' : 'border-red-200 bg-red-50';
            return h('div', { key: i, className: 'flex items-center gap-3 p-3 rounded-xl border ' + color },
              h('div', { className: 'text-2xl font-black ' + (entry.score >= 80 ? 'text-green-600' : entry.score >= 60 ? 'text-amber-600' : 'text-red-600') }, entry.score),
              h('div', { className: 'flex-1 min-w-0' },
                h('div', { className: 'text-xs font-bold text-slate-700 truncate' }, entry.input),
                h('div', { className: 'text-[11px] text-slate-600' }, new Date(entry.date).toLocaleDateString(), ' · Grade: ', entry.grade)
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
                h('div', { className: 'text-[11px] font-bold text-slate-700 mt-1' }, badge.name),
                h('p', { className: 'text-[11px] text-slate-600 mt-0.5' }, badge.desc)
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
