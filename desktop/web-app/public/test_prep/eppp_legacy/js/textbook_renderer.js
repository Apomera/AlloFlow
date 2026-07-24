/* ============================================================
   PasstheEPPP — Textbook Module Renderer
   Renders textbook chapters with collapsible AI Codas
   ============================================================ */

(function() {
    'use strict';

    // CSS for textbook
    const style = document.createElement('style');
    style.textContent = `
        .textbook-container {
            max-width: 860px;
            margin: 0 auto;
            padding: 20px;
        }
        .textbook-toc {
            background: var(--card-bg, #1e1e2e);
            border-radius: 16px;
            padding: 28px;
            margin-bottom: 32px;
            border: 1px solid rgba(255,255,255,0.06);
        }
        .textbook-toc h2 {
            font-size: 1.5rem;
            margin-bottom: 16px;
            background: linear-gradient(135deg, #a78bfa, #818cf8);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
        }
        .toc-domain {
            margin-bottom: 12px;
        }
        .toc-domain-title {
            font-weight: 600;
            color: #c4b5fd;
            font-size: 0.95rem;
            margin-bottom: 4px;
        }
        .toc-domain-title .weight-badge {
            background: rgba(167, 139, 250, 0.2);
            color: #a78bfa;
            padding: 2px 8px;
            border-radius: 10px;
            font-size: 0.75rem;
            font-weight: 500;
            margin-left: 8px;
        }
        .toc-chapter-list {
            list-style: none;
            padding-left: 16px;
            margin: 0;
        }
        .toc-chapter-list li {
            padding: 4px 0;
        }
        .toc-chapter-list a {
            color: #94a3b8;
            text-decoration: none;
            font-size: 0.9rem;
            transition: color 0.2s;
        }
        .toc-chapter-list a:hover {
            color: #e2e8f0;
        }
        .toc-chapter-list a .ch-num {
            color: #64748b;
            font-size: 0.8rem;
            margin-right: 4px;
        }
        .chapter-card {
            background: var(--card-bg, #1e1e2e);
            border-radius: 16px;
            padding: 0;
            margin-bottom: 32px;
            border: 1px solid rgba(255,255,255,0.06);
            overflow: hidden;
        }
        .chapter-header {
            padding: 28px 28px 20px;
            border-bottom: 1px solid rgba(255,255,255,0.06);
            cursor: pointer;
            transition: background 0.2s;
        }
        .chapter-header:hover {
            background: rgba(255,255,255,0.02);
        }
        .chapter-header .domain-badge {
            display: inline-block;
            background: rgba(167, 139, 250, 0.15);
            color: #a78bfa;
            padding: 3px 12px;
            border-radius: 12px;
            font-size: 0.75rem;
            font-weight: 500;
            margin-bottom: 8px;
        }
        .chapter-header h2 {
            font-size: 1.35rem;
            margin: 4px 0 8px;
            color: #e2e8f0;
        }
        .chapter-header .meta {
            color: #64748b;
            font-size: 0.85rem;
        }
        .chapter-header .expand-icon {
            float: right;
            font-size: 1.2rem;
            color: #64748b;
            transition: transform 0.3s;
            margin-top: 12px;
        }
        .chapter-card.open .chapter-header .expand-icon {
            transform: rotate(180deg);
        }
        .chapter-body {
            display: none;
            padding: 0 28px 28px;
        }
        .chapter-card.open .chapter-body {
            display: block;
        }
        .chapter-section {
            margin-top: 28px;
        }
        .chapter-section h3 {
            font-size: 1.15rem;
            color: #c4b5fd;
            margin-bottom: 12px;
            padding-bottom: 8px;
            border-bottom: 1px solid rgba(196, 181, 253, 0.15);
        }
        .chapter-section p {
            color: #cbd5e1;
            line-height: 1.7;
            margin-bottom: 12px;
            font-size: 0.95rem;
        }
        .chapter-section ul, .chapter-section ol {
            color: #cbd5e1;
            line-height: 1.7;
            margin-bottom: 12px;
            padding-left: 24px;
            font-size: 0.95rem;
        }
        .chapter-section li {
            margin-bottom: 6px;
        }
        .chapter-section table {
            width: 100%;
            border-collapse: collapse;
            margin: 16px 0;
            font-size: 0.88rem;
        }
        .chapter-section th {
            background: rgba(167, 139, 250, 0.12);
            color: #c4b5fd;
            padding: 10px 12px;
            text-align: left;
            font-weight: 600;
            border-bottom: 1px solid rgba(167, 139, 250, 0.2);
        }
        .chapter-section td {
            padding: 10px 12px;
            color: #cbd5e1;
            border-bottom: 1px solid rgba(255,255,255,0.05);
        }
        .chapter-section tr:hover td {
            background: rgba(255,255,255,0.02);
        }
        .chapter-section .formula {
            background: rgba(167, 139, 250, 0.08);
            border-left: 3px solid #a78bfa;
            padding: 12px 16px;
            border-radius: 0 8px 8px 0;
            font-family: 'Georgia', serif;
            font-size: 1.1rem;
            color: #e2e8f0;
            margin: 16px 0;
        }
        .key-terms-box {
            background: rgba(56, 189, 248, 0.08);
            border: 1px solid rgba(56, 189, 248, 0.15);
            border-radius: 12px;
            padding: 16px 20px;
            margin-top: 16px;
        }
        .key-terms-box h4 {
            color: #38bdf8;
            font-size: 0.85rem;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 8px;
        }
        .key-terms-box .term-chip {
            display: inline-block;
            background: rgba(56, 189, 248, 0.12);
            color: #7dd3fc;
            padding: 3px 10px;
            border-radius: 10px;
            font-size: 0.8rem;
            margin: 3px 4px 3px 0;
            cursor: help;
            position: relative;
            transition: background 0.2s, transform 0.15s;
        }
        .key-terms-box .term-chip:hover,
        .key-terms-box .term-chip.term-active {
            background: rgba(56, 189, 248, 0.25);
            transform: translateY(-1px);
        }
        /* JS-driven floating tooltip */
        .term-tooltip {
            position: fixed;
            background: #1e293b;
            color: #e2e8f0;
            padding: 10px 14px;
            border-radius: 8px;
            font-size: 0.82rem;
            line-height: 1.45;
            white-space: normal;
            width: max-content;
            max-width: min(320px, 90vw);
            box-shadow: 0 6px 20px rgba(0,0,0,0.5);
            border: 1px solid rgba(56, 189, 248, 0.25);
            z-index: 10000;
            pointer-events: none;
            animation: termFadeIn 0.15s ease;
        }
        .term-tooltip-arrow {
            position: fixed;
            width: 0; height: 0;
            border: 6px solid transparent;
            border-top-color: #1e293b;
            z-index: 10001;
            pointer-events: none;
        }
        @keyframes termFadeIn { from { opacity:0; transform:translateY(4px); } to { opacity:1; transform:translateY(0); } }

        /* Interactive Elements */
        .interactive-diagram {
            background: #ffffff;
            border-radius: 12px;
            padding: 20px;
            margin: 20px 0;
            text-align: center;
            border: 1px solid rgba(255,255,255,0.1);
        }
        .interactive-diagram svg {
            max-width: 100%;
            height: auto;
        }
        .diagram-caption {
            color: #64748b;
            font-size: 0.85rem;
            margin-top: 12px;
            font-style: italic;
        }
        .knowledge-check {
            background: rgba(167, 139, 250, 0.05);
            border: 1px solid rgba(167, 139, 250, 0.2);
            border-radius: 12px;
            padding: 24px;
            margin: 32px 0 24px 0;
            position: relative;
        }
        .kc-badge {
            position: absolute;
            top: -12px;
            left: 24px;
            background: #a78bfa;
            color: #1e1e2e;
            padding: 4px 12px;
            border-radius: 12px;
            font-size: 0.75rem;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        .kc-question {
            font-size: 1.05rem;
            color: #e2e8f0;
            margin-bottom: 16px;
            margin-top: 8px;
            font-weight: 500;
        }
        .kc-options {
            display: flex;
            flex-direction: column;
            gap: 8px;
        }
        .kc-option {
            background: rgba(255,255,255,0.03);
            border: 1px solid rgba(255,255,255,0.1);
            padding: 12px 16px;
            border-radius: 8px;
            color: #cbd5e1;
            cursor: pointer;
            transition: all 0.2s;
            text-align: left;
            font-size: 0.95rem;
        }
        .kc-option:hover {
            background: rgba(167, 139, 250, 0.1);
            border-color: rgba(167, 139, 250, 0.3);
        }
        .kc-option.correct {
            background: rgba(34, 197, 94, 0.1) !important;
            border-color: rgba(34, 197, 94, 0.5) !important;
            color: #86efac !important;
        }
        .kc-option.incorrect {
            background: rgba(239, 68, 68, 0.1) !important;
            border-color: rgba(239, 68, 68, 0.5) !important;
            color: #fca5a5 !important;
        }
        .kc-feedback {
            margin-top: 16px;
            padding: 16px;
            border-radius: 8px;
            font-size: 0.9rem;
            line-height: 1.5;
            display: none;
        }
        .kc-feedback.show {
            display: block;
            animation: fadeIn 0.3s ease;
        }
        .kc-feedback.success {
            background: rgba(34, 197, 94, 0.1);
            color: #86efac;
            border-left: 3px solid #22c55e;
        }
        .kc-feedback.error {
            background: rgba(239, 68, 68, 0.1);
            color: #fca5a5;
            border-left: 3px solid #ef4444;
        }
        .expandable-case {
            margin: 24px 0;
            border: 1px solid rgba(56, 189, 248, 0.2);
            border-radius: 12px;
            overflow: hidden;
        }
        .case-header {
            padding: 16px 20px;
            background: rgba(56, 189, 248, 0.05);
            cursor: pointer;
            display: flex;
            justify-content: space-between;
            align-items: center;
            color: #38bdf8;
            font-weight: 600;
            user-select: none;
        }
        .case-header:hover {
            background: rgba(56, 189, 248, 0.1);
        }
        .case-body {
            padding: 0 20px;
            max-height: 0;
            overflow: hidden;
            transition: max-height 0.3s ease, padding 0.3s ease;
            background: rgba(255,255,255,0.01);
        }
        .expandable-case.open .case-body {
            padding: 20px;
            max-height: 1000px;
        }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(-5px); } to { opacity: 1; transform: translateY(0); } }

        /* AI Coda — collapsible */
        .ai-coda {
            margin-top: 32px;
            border: 1px solid rgba(250, 204, 21, 0.2);
            border-radius: 12px;
            overflow: hidden;
        }
        .ai-coda-toggle {
            display: flex;
            align-items: center;
            gap: 10px;
            padding: 16px 20px;
            background: rgba(250, 204, 21, 0.06);
            cursor: pointer;
            transition: background 0.2s;
            color: #fbbf24;
            font-weight: 500;
            font-size: 0.95rem;
            border: none;
            width: 100%;
            text-align: left;
        }
        .ai-coda-toggle:hover {
            background: rgba(250, 204, 21, 0.1);
        }
        .ai-coda-toggle .coda-icon {
            font-size: 1.2rem;
        }
        .ai-coda-toggle .coda-arrow {
            margin-left: auto;
            transition: transform 0.3s;
            font-size: 0.8rem;
        }
        .ai-coda.open .coda-arrow {
            transform: rotate(180deg);
        }
        .ai-coda-content {
            display: none;
            padding: 20px;
            border-top: 1px solid rgba(250, 204, 21, 0.1);
        }
        .ai-coda.open .ai-coda-content {
            display: block;
        }
        .ai-coda-content p {
            color: #d4d4d8;
            line-height: 1.7;
            margin-bottom: 12px;
            font-size: 0.93rem;
        }
        .ai-coda-content .study-note {
            background: rgba(34, 197, 94, 0.08);
            border: 1px solid rgba(34, 197, 94, 0.15);
            border-radius: 8px;
            padding: 12px 16px;
            margin-top: 16px;
            font-size: 0.88rem;
            color: #86efac;
            line-height: 1.6;
        }

        /* References */
        .chapter-references {
            margin-top: 28px;
            padding-top: 20px;
            border-top: 1px solid rgba(255,255,255,0.06);
        }
        .chapter-references h4 {
            color: #64748b;
            font-size: 0.85rem;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 12px;
        }
        .chapter-references ul {
            list-style: none;
            padding: 0;
        }
        .chapter-references li {
            color: #94a3b8;
            font-size: 0.82rem;
            line-height: 1.5;
            margin-bottom: 8px;
            padding-left: 20px;
            text-indent: -20px;
        }

        /* Interactive Diagrams */
        .interactive-diagram {
            margin: 24px 0;
            padding: 20px;
            background: rgba(139, 92, 246, 0.04);
            border: 1px solid rgba(139, 92, 246, 0.15);
            border-radius: 14px;
            overflow: hidden;
        }
        .interactive-diagram svg {
            display: block;
            margin: 0 auto;
            max-width: 100%;
            height: auto;
        }
        .diagram-caption {
            text-align: center;
            color: #a78bfa;
            font-size: 0.82rem;
            margin-top: 12px;
            font-style: italic;
            opacity: 0.85;
        }
        /* Animated diagram elements */
        @keyframes pulse-node {
            0%, 100% { r: 6; opacity: 0.9; }
            50% { r: 8; opacity: 1; }
        }
        @keyframes flow-signal {
            0% { stroke-dashoffset: 20; }
            100% { stroke-dashoffset: 0; }
        }
        @keyframes glow-box {
            0%, 100% { filter: drop-shadow(0 0 2px rgba(139,92,246,0.3)); }
            50% { filter: drop-shadow(0 0 8px rgba(139,92,246,0.6)); }
        }
        @keyframes fade-pulse {
            0%, 100% { opacity: 0.5; }
            50% { opacity: 1; }
        }
        @keyframes rotate-slow {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
        }
        @keyframes dash-flow {
            to { stroke-dashoffset: -30; }
        }
        .diagram-node-pulse { animation: pulse-node 2s ease-in-out infinite; }
        .diagram-signal-flow { stroke-dasharray: 6 4; animation: dash-flow 1.5s linear infinite; }
        .diagram-glow { animation: glow-box 3s ease-in-out infinite; }
        .diagram-fade-pulse { animation: fade-pulse 2.5s ease-in-out infinite; }
        .diagram-label { font-family: 'Inter', sans-serif; font-size: 11px; fill: #e2e8f0; }
        .diagram-label-sm { font-family: 'Inter', sans-serif; font-size: 9px; fill: #94a3b8; }
        .diagram-box:hover { filter: brightness(1.3); cursor: pointer; }
        .diagram-box { transition: filter 0.3s; }
        .textbook-study-toolbar { position:sticky;top:8px;z-index:20;display:flex;flex-wrap:wrap;gap:8px;align-items:center;background:#111827;border:1px solid rgba(167,139,250,.3);border-radius:14px;padding:12px 14px;margin-bottom:18px;box-shadow:0 10px 28px rgba(0,0,0,.28); }
        .textbook-study-toolbar button,.section-complete-btn { border:1px solid rgba(167,139,250,.35);background:#312e81;color:#ede9fe;border-radius:9px;padding:7px 10px;font-weight:700;cursor:pointer; }
        .textbook-study-toolbar button:focus-visible,.section-complete-btn:focus-visible,.chapter-header:focus-visible,.case-header:focus-visible,.diagram-study-controls button:focus-visible { outline:3px solid #fbbf24;outline-offset:3px; }
        .textbook-progress { margin-left:auto;color:#c4b5fd;font-size:.84rem;font-weight:700; }
        .section-study-row { display:flex;justify-content:flex-end;margin-top:14px; }
        .section-complete-btn[aria-pressed="true"] { background:#065f46;border-color:#34d399;color:#d1fae5; }
        .diagram-text-alternative { margin-top:10px;padding:10px 12px;border-left:3px solid #38bdf8;background:rgba(56,189,248,.08);color:#cbd5e1;font-size:.86rem;line-height:1.5; }
        .diagram-visual[hidden],.diagram-caption[hidden],.diagram-text-alternative[hidden],.diagram-study-controls[hidden] { display:none !important; }
        .diagram-study-controls { display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin-top:14px;padding:12px;border:1px solid rgba(56,189,248,.25);border-radius:10px;background:rgba(15,23,42,.96);text-align:left; }
        .diagram-study-controls button { border:1px solid rgba(125,211,252,.45);background:#0c4a6e;color:#e0f2fe;border-radius:8px;padding:7px 10px;font-weight:700;cursor:pointer; }
        .diagram-study-controls button[aria-pressed="true"] { background:#5b21b6;border-color:#c4b5fd;color:#fff; }
        .diagram-study-controls button:disabled { opacity:.48;cursor:not-allowed; }
        .diagram-study-status { flex:1 1 100%;color:#bae6fd;font-size:.84rem;line-height:1.45; }
        .textbook-container.hide-diagrams .interactive-diagram svg { display:none; }
        .textbook-container.hide-diagrams .diagram-study-controls { display:none; }
        .textbook-container.reduce-motion svg animate,.textbook-container.reduce-motion svg animateTransform { display:none; }
        .textbook-container.reduce-motion .interactive-diagram * { animation:none !important;transition:none !important; }
        @media (prefers-reduced-motion: reduce) { .interactive-diagram svg animate,.interactive-diagram svg animateTransform { display:none; } .interactive-diagram * { animation:none !important;transition:none !important; } }
        @media (max-width:640px) { .textbook-progress { width:100%;margin-left:0; } .textbook-study-toolbar { position:static; } }

    `;
    document.head.appendChild(style);

    function renderTextbook(containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;

        const chapters = window.TextbookChapters || [];
        if (chapters.length === 0) {
            container.innerHTML = '<p style="color:#94a3b8;text-align:center;padding:40px;">No textbook chapters loaded yet.</p>';
            return;
        }

        // Group chapters by domain
        const domains = {};
        chapters.forEach(function(ch) {
            if (!domains[ch.domain]) {
                domains[ch.domain] = { weight: ch.examWeight, chapters: [], domainNumber: ch.domainNumber || 99 };
            }
            domains[ch.domain].chapters.push(ch);
        });

        // Sort domains by domainNumber (not alphabetically)
        var domainKeys = Object.keys(domains).sort(function(a, b) {
            return (domains[a].domainNumber || 99) - (domains[b].domainNumber || 99);
        });

        let html = '<div class="textbook-container" data-library-version="1">';
        html += '<div class="textbook-study-toolbar" role="toolbar" aria-label="Textbook study controls">';
        html += '<button type="button" data-textbook-action="expand">Expand all</button>';
        html += '<button type="button" data-textbook-action="collapse">Collapse all</button>';
        html += '<button type="button" data-textbook-action="diagrams" aria-pressed="false">Hide diagrams</button>';
        html += '<button type="button" data-textbook-action="motion" aria-pressed="false">Reduce motion</button>';
        html += '<span class="textbook-progress" role="status" aria-live="polite">0 sections complete</span>';
        html += '</div>';

        // Table of contents
        html += '<div class="textbook-toc">';
        html += '<h2>\ud83d\udcda EPPP Textbook — Table of Contents</h2>';
        domainKeys.forEach(function(domainName) {
            const d = domains[domainName];
            html += '<div class="toc-domain">';
            html += '<div class="toc-domain-title">' + domainName + '<span class="weight-badge">' + d.weight + ' of EPPP</span></div>';
            html += '<ul class="toc-chapter-list">';
            d.chapters.forEach(function(ch) {
                html += '<li><a href="#' + ch.id + '" onclick="document.getElementById(\'' + ch.id + '\').scrollIntoView({behavior:\'smooth\'});return false;">' +
                    '<span class="ch-num">' + ch.id.replace('ch-', 'Ch ').replace(/-/g, '.') + '</span> ' +
                    ch.title + '</a></li>';
            });
            html += '</ul></div>';
        });
        html += '</div>';

        // Render each chapter
        chapters.forEach(function(ch) {
            html += '<div class="chapter-card" id="' + ch.id + '">';

            // Header (clickable to expand)
            html += '<button type="button" class="chapter-header" aria-expanded="false" aria-controls="' + ch.id + '-body">';
            html += '<span class="expand-icon">\u25bc</span>';
            html += '<span class="domain-badge">' + ch.domain + ' \u00b7 ' + ch.examWeight + '</span>';
            html += '<h2>' + ch.title + '</h2>';
            html += '<span class="meta">' + ch.id.replace('ch-', 'Chapter ').replace(/-/g, '.') + ' \u00b7 ' + ch.sections.length + ' sections \u00b7 ' + ch.references.length + ' references</span>';
            html += '</button>';

            // Body
            html += '<div class="chapter-body" id="' + ch.id + '-body">';

            // Sections
            ch.sections.forEach(function(sec, sectionIndex) {
                var sectionId = ch.id + '-section-' + sectionIndex;
                html += '<section class="chapter-section" data-section-id="' + sectionId + '">';
                html += '<h3>' + sec.heading + '</h3>';
                html += sec.content;

                // Interactive Diagram
                if (sec.interactiveDiagram) {
                    var diagramLabel = sec.interactiveDiagram.description || (sec.heading + ' diagram');
                    var diagramId = sectionId + '-diagram';
                    var diagramControlIds = diagramId + '-visual';
                    if (sec.interactiveDiagram.description) diagramControlIds += ' ' + diagramId + '-caption ' + diagramId + '-alternative';
                    html += '<figure class="interactive-diagram" role="group" aria-label="' + escapeAttribute(diagramLabel) + '" data-guided-diagram="' + diagramId + '">';
                    html += '<div class="diagram-visual" id="' + diagramId + '-visual">';
                    html += sec.interactiveDiagram.svg.replace('<svg ', '<svg role="img" aria-label="' + escapeAttribute(diagramLabel) + '" focusable="false" ');
                    html += '</div>';
                    if (sec.interactiveDiagram.description) {
                        html += '<div class="diagram-text-alternative" id="' + diagramId + '-alternative"><strong>Text alternative:</strong> ' + sec.interactiveDiagram.description + '</div>';
                    }
                    html += '<div class="diagram-study-controls" role="group" aria-label="Guided diagram reveal controls" hidden>';
                    html += '<button type="button" data-diagram-action="toggle" aria-pressed="false" aria-controls="' + diagramControlIds + '">Start guided reveal</button>';
                    html += '<button type="button" data-diagram-action="previous" aria-controls="' + diagramControlIds + '" disabled>Previous diagram step</button>';
                    html += '<button type="button" data-diagram-action="next" aria-controls="' + diagramControlIds + '" disabled>Next diagram step</button>';
                    html += '<span class="diagram-study-status" role="status" aria-live="polite" aria-atomic="true">Complete diagram and explanation shown.</span>';
                    html += '</div>';
                    if (sec.interactiveDiagram.description) {
                        html += '<figcaption class="diagram-caption" id="' + diagramId + '-caption">' + sec.interactiveDiagram.description + '</figcaption>';
                    }
                    html += '</figure>';
                }

                // Expandable Case Study
                if (sec.expandableCase) {
                    html += '<div class="expandable-case">';
                    html += '<button type="button" class="case-header" aria-expanded="false"><span>\ud83d\udcc4 Clinical Vignette: ' + sec.expandableCase.title + '</span><span aria-hidden="true">▼</span></button>';
                    html += '<div class="case-body">';
                    html += '<p><strong>Presentation:</strong> ' + sec.expandableCase.clinicalDescription + '</p>';
                    html += '<div style="margin-top:12px;padding-top:12px;border-top:1px dashed rgba(255,255,255,0.1);">';
                    html += '<p style="color:#86efac;margin-bottom:8px;"><strong>Diagnosis/Answer:</strong> ' + sec.expandableCase.diagnosis + '</p>';
                    html += '<p style="font-size:0.9rem;opacity:0.9;">' + sec.expandableCase.explanation + '</p>';
                    html += '</div></div></div>';
                }

                // Knowledge Check
                if (sec.knowledgeCheck) {
                    var kcId = 'kc-' + ch.id + '-' + Math.random().toString(36).substr(2, 5);
                    html += '<div class="knowledge-check" id="' + kcId + '">';
                    html += '<div class="kc-badge">Knowledge Check</div>';
                    html += '<div class="kc-question">' + sec.knowledgeCheck.question + '</div>';
                    html += '<div class="kc-options">';
                    sec.knowledgeCheck.options.forEach(function(opt, idx) {
                        html += '<button class="kc-option" onclick="window.handleKCAnswer(this, \'' + kcId + '\', ' + idx + ', ' + sec.knowledgeCheck.answer + ', \'' + encodeURIComponent(sec.knowledgeCheck.rationale) + '\')">' + String.fromCharCode(65 + idx) + '. ' + opt + '</button>';
                    });
                    html += '</div>';
                    html += '<div class="kc-feedback" id="' + kcId + '-feedback"></div>';
                    html += '</div>';
                }

                // Key terms
                if (sec.keyTerms && sec.keyTerms.length > 0) {
                    html += '<div class="key-terms-box">';
                    html += '<h4>\ud83d\udd11 Key Terms <span style="font-size:0.7rem;opacity:0.6;text-transform:none;letter-spacing:0;font-weight:400">(tap or hover for definitions)</span></h4>';
                    sec.keyTerms.forEach(function(t) {
                        var def = window._epppTermDefs && window._epppTermDefs[t.toLowerCase()];
                        if (def) {
                            html += '<span class="term-chip" data-def="' + def.replace(/"/g, '&quot;') + '">' + t + '</span>';
                        } else {
                            html += '<span class="term-chip">' + t + '</span>';
                        }
                    });
                    html += '</div>';
                }
                html += '<div class="section-study-row"><button type="button" class="section-complete-btn" data-section-complete="' + sectionId + '" aria-pressed="false">Mark section complete</button></div>';
                html += '</section>';
            });

            // AI Coda (collapsible)
            if (ch.aiCoda) {
                var codaId = ch.id + '-coda';
                html += '<div class="ai-coda" id="' + codaId + '">';
                html += '<button class="ai-coda-toggle" onclick="this.parentElement.classList.toggle(\'open\')">';
                html += '<span class="coda-icon">\ud83e\udd16</span>';
                html += '<span>Through the AI\'s Lens \u2014 ' + ch.aiCoda.teaser + '</span>';
                html += '<span class="coda-arrow">\u25bc</span>';
                html += '</button>';
                html += '<div class="ai-coda-content">';
                html += ch.aiCoda.content;
                if (ch.aiCoda.studyNote) {
                    html += '<div class="study-note">' + ch.aiCoda.studyNote + '</div>';
                }
                html += '</div></div>';
            }

            // References
            if (ch.references && ch.references.length > 0) {
                html += '<div class="chapter-references">';
                html += '<h4>References</h4>';
                html += '<ul>';
                ch.references.forEach(function(ref) {
                    html += '<li>' + ref + '</li>';
                });
                html += '</ul></div>';
            }

            html += '</div></div>'; // chapter-body, chapter-card
        });

        html += '</div>';
        container.innerHTML = html;

        setupTextbookInteractions(container);

        // ---- JS-driven tooltips for key term chips ----
        setupTermTooltips(container);
    }

    function escapeAttribute(value) {
        return String(value || '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }

    function setupDiagramStudyControls(root) {
        Array.from(root.querySelectorAll('.interactive-diagram')).forEach(function(figure) {
            var visual = figure.querySelector('.diagram-visual');
            var caption = figure.querySelector('.diagram-caption');
            var textAlternative = figure.querySelector('.diagram-text-alternative');
            var controls = figure.querySelector('.diagram-study-controls');
            if (!visual || !controls) return;
            var toggleButton = controls.querySelector('[data-diagram-action="toggle"]');
            var previousButton = controls.querySelector('[data-diagram-action="previous"]');
            var nextButton = controls.querySelector('[data-diagram-action="next"]');
            var status = controls.querySelector('.diagram-study-status');
            var hasExplanation = !!(caption || textAlternative);
            var totalSteps = hasExplanation ? 3 : 2;
            var guided = false;
            var step = totalSteps - 1;

            function updateDiagramStep() {
                figure.classList.toggle('diagram-guided', guided);
                figure.dataset.diagramStep = guided ? String(step + 1) : 'complete';
                visual.hidden = guided && step === 0;
                if (caption) caption.hidden = guided && step < 2;
                if (textAlternative) textAlternative.hidden = guided && step < 2;
                toggleButton.setAttribute('aria-pressed', String(guided));
                toggleButton.textContent = guided ? 'Show complete diagram' : 'Start guided reveal';
                previousButton.disabled = !guided || step === 0;
                nextButton.disabled = !guided || step === totalSteps - 1;
                if (!guided) {
                    status.textContent = 'Complete diagram and explanation shown. Guided reveal is off.';
                } else if (step === 0) {
                    status.textContent = 'Step 1 of ' + totalSteps + ': Preview the topic and predict the important relationships before viewing the diagram.';
                } else if (step === 1 && hasExplanation) {
                    status.textContent = 'Step 2 of ' + totalSteps + ': Study the visual. Trace its labels, contrasts, and directional relationships.';
                } else if (hasExplanation) {
                    status.textContent = 'Step ' + (step + 1) + ' of ' + totalSteps + ': Complete view. Compare the visual with its caption and text alternative.';
                } else {
                    status.textContent = 'Step ' + (step + 1) + ' of ' + totalSteps + ': Complete view. Study the visual and connect it with the section text.';
                }
            }

            controls.hidden = false;
            controls.addEventListener('click', function(event) {
                var button = event.target.closest('[data-diagram-action]');
                if (!button || button.disabled) return;
                if (button.dataset.diagramAction === 'toggle') {
                    guided = !guided;
                    step = guided ? 0 : totalSteps - 1;
                } else if (button.dataset.diagramAction === 'previous') {
                    step = Math.max(0, step - 1);
                } else if (button.dataset.diagramAction === 'next') {
                    step = Math.min(totalSteps - 1, step + 1);
                }
                updateDiagramStep();
            });
            updateDiagramStep();
        });
    }

    function setupTextbookInteractions(root) {
        var shell = root.querySelector('.textbook-container');
        if (!shell) return;
        setupDiagramStudyControls(root);
        var storageKey = 'alloflow_eppp_textbook_progress_v1';
        var completed = {};
        try { completed = JSON.parse(localStorage.getItem(storageKey) || '{}') || {}; } catch (_) { completed = {}; }
        var progress = shell.querySelector('.textbook-progress');
        var sectionButtons = Array.from(shell.querySelectorAll('[data-section-complete]'));
        function updateProgress() {
            var done = sectionButtons.filter(function(btn) { return !!completed[btn.dataset.sectionComplete]; }).length;
            sectionButtons.forEach(function(btn) {
                var isDone = !!completed[btn.dataset.sectionComplete];
                btn.setAttribute('aria-pressed', String(isDone));
                btn.textContent = isDone ? 'Section complete ✓' : 'Mark section complete';
            });
            if (progress) progress.textContent = done + ' of ' + sectionButtons.length + ' sections complete';
        }
        root.addEventListener('click', function(event) {
            var header = event.target.closest('.chapter-header');
            if (header) {
                var card = header.closest('.chapter-card'); var open = !card.classList.contains('open');
                card.classList.toggle('open', open); header.setAttribute('aria-expanded', String(open)); return;
            }
            var caseHeader = event.target.closest('.case-header');
            if (caseHeader) {
                var caseBox = caseHeader.closest('.expandable-case'); var caseOpen = !caseBox.classList.contains('open');
                caseBox.classList.toggle('open', caseOpen); caseHeader.setAttribute('aria-expanded', String(caseOpen)); return;
            }
            var sectionButton = event.target.closest('[data-section-complete]');
            if (sectionButton) {
                var id = sectionButton.dataset.sectionComplete; completed[id] = !completed[id];
                try { localStorage.setItem(storageKey, JSON.stringify(completed)); } catch (_) {}
                updateProgress(); return;
            }
            var action = event.target.closest('[data-textbook-action]');
            if (!action) return;
            if (action.dataset.textbookAction === 'expand' || action.dataset.textbookAction === 'collapse') {
                var openAll = action.dataset.textbookAction === 'expand';
                shell.querySelectorAll('.chapter-card').forEach(function(card) { card.classList.toggle('open', openAll); var h=card.querySelector('.chapter-header'); if(h)h.setAttribute('aria-expanded',String(openAll)); });
            } else if (action.dataset.textbookAction === 'diagrams') {
                var hidden = shell.classList.toggle('hide-diagrams'); action.setAttribute('aria-pressed', String(hidden)); action.textContent = hidden ? 'Show diagrams' : 'Hide diagrams';
            } else if (action.dataset.textbookAction === 'motion') {
                var reduced = shell.classList.toggle('reduce-motion'); action.setAttribute('aria-pressed', String(reduced)); action.textContent = reduced ? 'Allow motion' : 'Reduce motion';
            }
        });
        updateProgress();
    }

    function setupTermTooltips(root) {
        let activeTooltip = null;
        let activeArrow = null;
        let activeChip = null;

        function removeTooltip() {
            if (activeTooltip) { activeTooltip.remove(); activeTooltip = null; }
            if (activeArrow) { activeArrow.remove(); activeArrow = null; }
            if (activeChip) { activeChip.classList.remove('term-active'); activeChip = null; }
        }

        function showTooltip(chip) {
            const def = chip.getAttribute('data-def');
            if (!def) return;
            if (activeChip === chip) { removeTooltip(); return; } // toggle off
            removeTooltip();

            activeChip = chip;
            chip.classList.add('term-active');

            // Create tooltip
            const tip = document.createElement('div');
            tip.className = 'term-tooltip';
            tip.textContent = def;
            document.body.appendChild(tip);
            activeTooltip = tip;

            // Create arrow
            const arrow = document.createElement('div');
            arrow.className = 'term-tooltip-arrow';
            document.body.appendChild(arrow);
            activeArrow = arrow;

            // Position with boundary clamping
            positionTooltip(chip, tip, arrow);
        }

        function positionTooltip(chip, tip, arrow) {
            const rect = chip.getBoundingClientRect();
            const tipRect = tip.getBoundingClientRect();
            const vw = window.innerWidth;
            const vh = window.innerHeight;
            const pad = 8;

            // Preferred: above the chip, centered
            let top = rect.top - tipRect.height - 10;
            let left = rect.left + rect.width / 2 - tipRect.width / 2;

            // If it overflows above, show below
            let arrowOnTop = true; // arrow points down (tooltip above)
            if (top < pad) {
                top = rect.bottom + 10;
                arrowOnTop = false;
            }

            // Clamp horizontal
            if (left < pad) left = pad;
            if (left + tipRect.width > vw - pad) left = vw - pad - tipRect.width;

            tip.style.top = top + 'px';
            tip.style.left = left + 'px';

            // Arrow position
            const arrowLeft = Math.min(Math.max(rect.left + rect.width / 2 - 6, left + 8), left + tipRect.width - 14);
            if (arrowOnTop) {
                arrow.style.top = (top + tipRect.height) + 'px';
                arrow.style.left = arrowLeft + 'px';
                arrow.style.borderTopColor = '#1e293b';
                arrow.style.borderBottomColor = 'transparent';
            } else {
                arrow.style.top = (top - 12) + 'px';
                arrow.style.left = arrowLeft + 'px';
                arrow.style.borderTopColor = 'transparent';
                arrow.style.borderBottomColor = '#1e293b';
            }
        }

        // Event delegation on chip clicks (works for touch + mouse)
        root.addEventListener('click', function(e) {
            const chip = e.target.closest('.term-chip[data-def]');
            if (chip) {
                e.stopPropagation();
                showTooltip(chip);
            } else {
                removeTooltip();
            }
        });

        // Desktop hover support
        root.addEventListener('mouseover', function(e) {
            const chip = e.target.closest('.term-chip[data-def]');
            if (chip && 'ontouchstart' in window === false) {
                showTooltip(chip);
            }
        });
        root.addEventListener('mouseout', function(e) {
            const chip = e.target.closest('.term-chip[data-def]');
            if (chip && 'ontouchstart' in window === false) {
                removeTooltip();
            }
        });

        // Dismiss on scroll or outside tap
        document.addEventListener('scroll', removeTooltip, true);
    }

    // Expose to global
    window.renderTextbook = renderTextbook;

    // Global handler for Knowledge Checks
    window.handleKCAnswer = function(btn, kcId, selectedIdx, correctIdx, rationaleEnc) {
        const container = document.getElementById(kcId);
        if (!container) return;
        
        // Disable all options
        const btns = container.querySelectorAll('.kc-option');
        btns.forEach(b => {
            b.disabled = true;
            b.style.pointerEvents = 'none';
        });
        
        // Mark correct/incorrect
        if (selectedIdx === correctIdx) {
            btns[selectedIdx].classList.add('correct');
        } else {
            btns[selectedIdx].classList.add('incorrect');
            btns[correctIdx].classList.add('correct');
        }
        
        // Show feedback
        const fb = document.getElementById(kcId + '-feedback');
        fb.innerHTML = '<strong>' + (selectedIdx === correctIdx ? 'Correct!' : 'Incorrect.') + '</strong> ' + decodeURIComponent(rationaleEnc);
        fb.className = 'kc-feedback show ' + (selectedIdx === correctIdx ? 'success' : 'error');
    };

    // Auto-render if the textbook container exists
    document.addEventListener('DOMContentLoaded', function() {
        if (document.getElementById('textbook-content')) {
            renderTextbook('textbook-content');
        }
    });
})();
