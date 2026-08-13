(function () {
    'use strict';

    var tools = Array.isArray(window.ALLOFLOW_PUBLIC_TOOLS) ? window.ALLOFLOW_PUBLIC_TOOLS : [];
    var sourceLabels = {
        none: 'No source needed',
        optional: 'Source optional',
        raw: 'Bring text or a file',
        analyzed: 'Analyzed source needed'
    };
    var aiLabels = {
        none: 'Works without AI',
        optional: 'AI optional',
        required: 'AI required'
    };
    var accessLabels = {
        gemini: 'Gemini Canvas',
        desktop: 'Desktop',
        byok: 'Hosted / BYOK'
    };

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
        launch.setAttribute('aria-label', 'Launch AlloFlow with guidance for ' + tool.name);
        actions.appendChild(launch);
        if (tool.detailHref) {
            var details = createElement('a', 'tool-detail-link', 'Related details');
            details.href = tool.detailHref;
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
        categories.forEach(function (value) {
            var option = createElement('option', '', value);
            option.value = value;
            category.appendChild(option);
        });

        search.value = params.get('q') || '';
        if (params.get('category')) category.value = params.get('category');
        if (params.get('source')) source.value = params.get('source');
        if (params.get('ai')) ai.value = params.get('ai');
        if (params.get('access')) access.value = params.get('access');

        function sourceMatches(tool, value) {
            if (!value) return true;
            if (value === 'start-now') return tool.source === 'none' || tool.source === 'optional';
            if (value === 'bring-source') return tool.source === 'raw' || tool.source === 'analyzed';
            return tool.source === value;
        }

        function render() {
            var filtered = tools.filter(function (tool) {
                return matchesQuery(tool, search.value) &&
                    (!category.value || tool.category === category.value) &&
                    sourceMatches(tool, source.value) &&
                    (!ai.value || tool.ai === ai.value) &&
                    (!access.value || (tool.access || []).indexOf(access.value) !== -1);
            });

            results.replaceChildren();
            filtered.forEach(function (tool) { results.appendChild(createToolCard(tool)); });
            count.textContent = filtered.length + (filtered.length === 1 ? ' tool found' : ' tools found');
            empty.hidden = filtered.length !== 0;

            var nextParams = new URLSearchParams();
            if (search.value.trim()) nextParams.set('q', search.value.trim());
            if (category.value) nextParams.set('category', category.value);
            if (source.value) nextParams.set('source', source.value);
            if (ai.value) nextParams.set('ai', ai.value);
            if (access.value) nextParams.set('access', access.value);
            var query = nextParams.toString();
            var nextUrl = window.location.pathname + (query ? '?' + query : '') + window.location.hash;
            window.history.replaceState(null, '', nextUrl);
        }

        [search, category, source, ai, access].forEach(function (control) {
            control.addEventListener(control === search ? 'input' : 'change', render);
        });
        clear.addEventListener('click', function () {
            search.value = '';
            category.value = '';
            source.value = '';
            ai.value = '';
            access.value = '';
            render();
            search.focus();
        });
        render();
    }

    function createCompactResult(tool) {
        var link = createElement('a', 'home-tool-result');
        link.href = launchHref(tool);
        link.setAttribute('aria-label', 'Launch guidance for ' + tool.name);
        var icon = createElement('span', 'home-tool-result-icon', tool.icon || '✨');
        icon.setAttribute('aria-hidden', 'true');
        var copy = createElement('span', 'home-tool-result-copy');
        copy.appendChild(createElement('strong', '', tool.name));
        copy.appendChild(createElement('span', '', tool.summary));
        var state = createElement('span', 'home-tool-result-state');
        state.appendChild(createBadge(sourceLabels[tool.source], 'source'));
        state.appendChild(createBadge(aiLabels[tool.ai], 'ai'));
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

    document.addEventListener('DOMContentLoaded', function () {
        initFullFinder();
        initHomeFinder();
    });
})();
