(function () {
    'use strict';

    var tools = Array.isArray(window.ALLOFLOW_PUBLIC_TOOLS) ? window.ALLOFLOW_PUBLIC_TOOLS : [];
    var sourceLabels = Object.assign(Object.create(null), {
        none: 'No source needed',
        optional: 'Source optional',
        raw: 'Bring text or a file',
        analyzed: 'Analyzed source needed'
    });
    var aiLabels = Object.assign(Object.create(null), {
        none: 'Works without AI',
        optional: 'AI optional',
        required: 'AI required'
    });
    var accessLabels = Object.assign(Object.create(null), {
        gemini: 'Gemini Canvas',
        desktop: 'Desktop',
        byok: 'Hosted / BYOK'
    });

    function safeDetailHref(raw) {
        var s = String(raw == null ? '' : raw).trim();
        if (!s || /[\u0000-\u001f\u007f\\]/.test(s) || s.indexOf('//') === 0) return '';
        try {
            var base = (typeof window !== 'undefined' && window.location && window.location.href) ? window.location.href : 'https://alloflow.dev/';
            var parsed = new URL(s, base);
            if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return '';
            return s;
        } catch (_) {
            return '';
        }
    }

    function normalize(value) {
        return String(value || '')
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-z0-9]+/g, ' ')
            .trim();
    }

    function searchText(tool) {
        return normalize([
            tool.id,
            tool.name,
            tool.summary,
            tool.category,
            tool.location,
            (tool.audiences || []).join(' '),
            (tool.subjects || []).join(' '),
            (tool.grades || []).join(' '),
            (tool.tags || []).join(' '),
            sourceLabels[tool.source],
            aiLabels[tool.ai]
        ].join(' '));
    }

    function matchesQuery(tool, rawQuery) {
        var words = normalize(rawQuery).split(/\s+/).filter(Boolean);
        if (!words.length) return true;
        var haystack = searchText(tool);
        return words.every(function (word) { return haystack.indexOf(word) !== -1; });
    }

    function createElement(tag, className, textValue) {
        var element = document.createElement(tag);
        if (className) element.className = className;
        if (textValue !== undefined) element.textContent = textValue;
        return element;
    }

    function createBadge(label, kind) {
        return createElement('span', 'tool-badge tool-badge-' + kind, label);
    }

    function launchHref(tool) {
        return 'launch.html?tool=' + encodeURIComponent(tool.id);
    }

    function createToolCard(tool) {
        var article = createElement('article', 'tool-result-card');
        article.setAttribute('data-tool-id', tool.id);

        var headingRow = createElement('div', 'tool-card-heading');
        var icon = createElement('span', 'tool-card-icon', tool.icon || '✨');
        icon.setAttribute('aria-hidden', 'true');
        var headingCopy = createElement('div', 'tool-card-heading-copy');
        var heading = createElement('h2', '', tool.name);
        var category = createElement('p', 'tool-card-category', tool.category);
        headingCopy.appendChild(heading);
        headingCopy.appendChild(category);
        headingRow.appendChild(icon);
        headingRow.appendChild(headingCopy);
        article.appendChild(headingRow);

        article.appendChild(createElement('p', 'tool-card-summary', tool.summary));

        var badges = createElement('div', 'tool-badges');
        badges.appendChild(createBadge(sourceLabels[tool.source] || 'Check source needs', 'source'));
        badges.appendChild(createBadge(aiLabels[tool.ai] || 'Check AI needs', 'ai'));
        article.appendChild(badges);

        var meta = createElement('dl', 'tool-card-meta');
        var metaRows = [
            ['Find it in', tool.location],
            ['For', (tool.audiences || []).join(', ')],
            ['Access', (tool.access || []).map(function (mode) { return accessLabels[mode] || mode; }).join(', ')]
        ];
        metaRows.forEach(function (row) {
            var wrapper = createElement('div', 'tool-meta-row');
            wrapper.appendChild(createElement('dt', '', row[0]));
            wrapper.appendChild(createElement('dd', '', row[1]));
            meta.appendChild(wrapper);
        });
        article.appendChild(meta);

        var actions = createElement('div', 'tool-card-actions');
        var launch = createElement('a', 'tool-launch-link', 'Launch with guidance');
        launch.href = launchHref(tool);
        launch.setAttribute('aria-label', 'Launch with guidance for ' + tool.name);
        actions.appendChild(launch);
        var safeDetail = safeDetailHref(tool.detailHref);
        if (safeDetail) {
            var details = createElement('a', 'tool-detail-link', 'Related details');
            details.href = safeDetail;
            details.setAttribute('aria-label', 'View related details for ' + tool.name);
            actions.appendChild(details);
        }
        var feedback = createElement('a', 'tool-feedback-link', 'Share feedback');
        feedback.href = 'feedback.html?tool=' + encodeURIComponent(tool.name);
        feedback.setAttribute('aria-label', 'Share feedback about ' + tool.name);
        actions.appendChild(feedback);
        article.appendChild(actions);
        return article;
    }

    function initFullFinder() {
        var results = document.getElementById('toolResults');
        var search = document.getElementById('toolSearch');
        if (!results || !search) return;

        var category = document.getElementById('toolCategory');
        var source = document.getElementById('toolSource');
        var ai = document.getElementById('toolAi');
        var access = document.getElementById('toolAccess');
        var clear = document.getElementById('clearToolFilters');
        var count = document.getElementById('toolResultCount');
        var empty = document.getElementById('toolEmptyState');
        var params = new URLSearchParams(window.location.search);

        var categories = Array.from(new Set(tools.map(function (tool) { return tool.category; }))).sort();
        if (category) {
            categories.forEach(function (value) {
                var option = createElement('option', '', value);
                option.value = value;
                category.appendChild(option);
            });
        }

        search.value = params.get('q') || '';
        if (category && params.get('category')) category.value = params.get('category');
        if (source && params.get('source')) source.value = params.get('source');
        if (ai && params.get('ai')) ai.value = params.get('ai');
        if (access && params.get('access')) access.value = params.get('access');

        function sourceMatches(tool, value) {
            if (!value) return true;
            if (value === 'start-now') return tool.source === 'none' || tool.source === 'optional';
            if (value === 'bring-source') return tool.source === 'raw' || tool.source === 'analyzed';
            return tool.source === value;
        }

        function render() {
            var catVal = category ? category.value : '';
            var srcVal = source ? source.value : '';
            var aiVal = ai ? ai.value : '';
            var accVal = access ? access.value : '';
            var filtered = tools.filter(function (tool) {
                return matchesQuery(tool, search.value) &&
                    (!catVal || tool.category === catVal) &&
                    sourceMatches(tool, srcVal) &&
                    (!aiVal || tool.ai === aiVal) &&
                    (!accVal || (tool.access || []).indexOf(accVal) !== -1);
            });

            results.replaceChildren();
            filtered.forEach(function (tool) { results.appendChild(createToolCard(tool)); });
            if (count) count.textContent = filtered.length + (filtered.length === 1 ? ' tool found' : ' tools found');
            if (empty) empty.hidden = filtered.length !== 0;

            var nextParams = new URLSearchParams();
            if (search.value.trim()) nextParams.set('q', search.value.trim());
            if (catVal) nextParams.set('category', catVal);
            if (srcVal) nextParams.set('source', srcVal);
            if (aiVal) nextParams.set('ai', aiVal);
            if (accVal) nextParams.set('access', accVal);
            var query = nextParams.toString();
            var nextUrl = window.location.pathname + (query ? '?' + query : '') + window.location.hash;
            try { window.history.replaceState(null, '', nextUrl); } catch (_) {}
        }

        [search, category, source, ai, access].forEach(function (control) {
            if (control) control.addEventListener(control === search ? 'input' : 'change', render);
        });
        if (clear) {
            clear.addEventListener('click', function () {
                search.value = '';
                if (category) category.value = '';
                if (source) source.value = '';
                if (ai) ai.value = '';
                if (access) access.value = '';
                render();
                search.focus();
            });
        }
        render();
    }

    function createCompactResult(tool) {
        var link = createElement('a', 'home-tool-result');
        link.href = launchHref(tool);
        var icon = createElement('span', 'home-tool-result-icon', tool.icon || '✨');
        icon.setAttribute('aria-hidden', 'true');
        var copy = createElement('span', 'home-tool-result-copy');
        copy.appendChild(createElement('strong', '', tool.name));
        copy.appendChild(createElement('span', '', tool.summary));
        var state = createElement('span', 'home-tool-result-state');
        state.appendChild(createBadge(sourceLabels[tool.source] || 'Check source needs', 'source'));
        state.appendChild(createBadge(aiLabels[tool.ai] || 'Check AI needs', 'ai'));
        copy.appendChild(state);
        link.appendChild(icon);
        link.appendChild(copy);
        return link;
    }

    function initHomeFinder() {
        var form = document.getElementById('homeToolFinder');
        var search = document.getElementById('homeToolSearch');
        var results = document.getElementById('homeToolResults');
        if (!form || !search || !results) return;

        function render() {
            var query = search.value;
            var matches = tools.filter(function (tool) {
                return query.trim() ? matchesQuery(tool, query) : tool.featured;
            }).slice(0, 4);
            results.replaceChildren();
            if (!matches.length) {
                results.appendChild(createElement('p', 'home-tool-empty', 'No matching tools found. Try different keywords or browse the full tool finder.'));
                return;
            }
            matches.forEach(function (tool) { results.appendChild(createCompactResult(tool)); });
        }

        form.addEventListener('submit', function (event) {
            event.preventDefault();
            var query = search.value.trim();
            window.location.href = 'tools.html' + (query ? '?q=' + encodeURIComponent(query) : '');
        });
        search.addEventListener('input', render);
        render();
    }

    function bootFinders() {
        initFullFinder();
        initHomeFinder();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', bootFinders, { once: true });
    } else {
        bootFinders();
    }
})();
