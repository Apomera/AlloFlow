(function () {
    'use strict';

    var tools = Array.isArray(window.ALLOFLOW_PUBLIC_TOOLS) ? window.ALLOFLOW_PUBLIC_TOOLS : [];
    // Every card lives in tool-catalog-data.js, where check_ai_requirements.cjs can see it. A
    // "Photosynthesis & Plant Science" card used to be injected here for a tool id that no file
    // registers; the tool it meant is the Tree Life Lab card (id treeLab) in the data file.
    tools.forEach(function (tool) {
        tool.tags = (tool.tags || []).concat(['teach', 'learn', 'activity']);
        if (tool.ai === 'required') tool.tags = tool.tags.concat(['create', 'make', 'generate']);
        if (tool.id === 'exitTicket') tool.tags = tool.tags.concat(['article', 'passage', 'source text', 'from', 'an']);
        if (['a11yAuditor', 'documentRemediation'].indexOf(tool.id) !== -1) {
            tool.detailHref = 'remediation.html';
        }
    });

    function enhanceHostedAccessCard() {
        var cards = document.querySelectorAll('.tool-access-card');
        cards.forEach(function (card) {
            var heading = card.querySelector('h3');
            if (!heading || heading.textContent.trim() !== 'Hosted / BYOK' || card.hasAttribute('data-hosted-enhanced')) return;
            card.setAttribute('data-hosted-enhanced', 'true');
            var paragraph = card.querySelector('p');
            if (paragraph) {
                paragraph.textContent = 'Open the Cloudflare-hosted browser app with no embedded AI credential. AI features need a supported provider you configure; ordinary settings and keys remain in this browser\'s unencrypted local storage, so avoid shared or student devices and remove keys after use; needed prompts or content go to that provider.';
            }
            var existing = card.querySelector('a');
            if (existing) existing.remove();
            var actions = document.createElement('div');
            actions.style.display = 'flex';
            actions.style.flexWrap = 'wrap';
            actions.style.gap = '10px 18px';
            actions.style.marginTop = '16px';
            var launch = document.createElement('a');
            launch.href = 'https://alloflow.dev/app/';
            launch.target = '_blank';
            launch.rel = 'noopener noreferrer';
            launch.textContent = 'Open browser app';
            var details = document.createElement('a');
            details.href = 'ways-to-use.html#cloudflare-heading';
            details.textContent = 'How BYOK and data flow work';
            actions.appendChild(launch);
            actions.appendChild(details);
            card.appendChild(actions);
        });
    }

    var resyncStemBridge = null;

    function enhanceToolDirectory() {
        if (typeof document === 'undefined' || typeof document.querySelector !== 'function') return;
        var section = document.querySelector('.tool-directory-section');
        if (!section || section.hasAttribute('data-dir-enhanced')) return;
        var countLine = section.querySelector('.tool-directory-count');
        var groups = Array.prototype.slice.call(section.querySelectorAll('.tool-directory-group'));
        if (!countLine || !groups.length) return;
        section.setAttribute('data-dir-enhanced', 'true');

        function tokenMatches(haystack, token) {
            if (!token) return true;
            if (haystack.indexOf(token) !== -1) return true;
            if (token.length >= 5 && token.slice(-2) === 'es' && haystack.indexOf(token.slice(0, -2)) !== -1) return true;
            if (token.length >= 4 && token.slice(-1) === 's' && token.slice(-2) !== 'ss' && haystack.indexOf(token.slice(0, -1)) !== -1) return true;
            return false;
        }

        function safeUrl(raw) {
            var s = String(raw || '').trim();
            if (!s || /[\u0000-\u001f\u007f\\]/.test(s) || s.indexOf('//') === 0) return '';
            try {
                var base = (typeof window !== 'undefined' && window.location && window.location.href) ? window.location.href : 'https://apomera.github.io/AlloFlow/';
                var parsed = new URL(s, base);
                if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return '';
                return s;
            } catch (_) {
                return '';
            }
        }

        var allItems = [];
        var noAiCount = 0;
        var optAiCount = 0;
        groups.forEach(function (group) {
            var heading = group.querySelector('h3');
            var groupTitle = heading ? heading.textContent.trim() : '';
            var groupId = heading ? heading.id : '';
            var items = Array.prototype.slice.call(group.querySelectorAll('li[data-ai]'));
            items.forEach(function (li) {
                var ai = li.getAttribute('data-ai') || '';
                if (ai === 'none') noAiCount++;
                else optAiCount++;
                var primaryLink = li.querySelector('a:first-child');
                var aboutLink = li.querySelector('a.tool-directory-about');
                allItems.push({
                    el: li,
                    group: group,
                    groupId: groupId,
                    groupTitle: groupTitle,
                    ai: ai,
                    name: primaryLink ? primaryLink.textContent.trim() : li.textContent.trim(),
                    href: primaryLink ? safeUrl(primaryLink.getAttribute('href')) : '',
                    aboutHref: aboutLink ? safeUrl(aboutLink.getAttribute('href')) : '',
                    text: (groupTitle + ' ' + li.textContent).toLowerCase().replace(/\s+/g, ' ').trim()
                });
            });
        });

        var controls = document.createElement('div');
        controls.className = 'tool-dir-controls';
        controls.setAttribute('role', 'search');
        controls.setAttribute('aria-label', 'Filter the shareable STEM tool directory');

        var searchWrap = document.createElement('div');
        searchWrap.className = 'tool-dir-search-row';
        var label = document.createElement('label');
        label.htmlFor = 'toolDirSearch';
        label.className = 'sr-only';
        label.textContent = 'Filter all ' + allItems.length + ' shareable STEM links';
        var input = document.createElement('input');
        input.id = 'toolDirSearch';
        input.type = 'search';
        input.autocomplete = 'off';
        input.placeholder = 'Filter all ' + allItems.length + ' STEM links (e.g., water, circuit, DNA, math, music)…';
        var clearBtn = document.createElement('button');
        clearBtn.type = 'button';
        clearBtn.className = 'tool-dir-clear';
        clearBtn.textContent = 'Reset';
        clearBtn.hidden = true;
        searchWrap.appendChild(label);
        searchWrap.appendChild(input);
        searchWrap.appendChild(clearBtn);

        var pills = document.createElement('div');
        pills.className = 'tool-dir-pills';
        pills.setAttribute('role', 'group');
        pills.setAttribute('aria-label', 'Filter STEM directory by AI requirement');

        var filterDefs = [
            { id: 'all', label: 'All STEM links (' + allItems.length + ')' },
            { id: 'none', label: 'Works without AI (' + noAiCount + ')' },
            { id: 'optional', label: 'AI optional (' + optAiCount + ')' }
        ];
        var activeAi = 'all';
        var pillButtons = filterDefs.map(function (def) {
            var btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'tool-dir-pill' + (def.id === 'all' ? ' is-active' : '');
            btn.setAttribute('data-ai-filter', def.id);
            btn.setAttribute('aria-pressed', def.id === 'all' ? 'true' : 'false');
            btn.textContent = def.label;
            pills.appendChild(btn);
            return btn;
        });

        var status = document.createElement('p');
        status.id = 'toolDirStatus';
        status.className = 'tool-dir-status';
        status.setAttribute('role', 'status');
        status.setAttribute('aria-live', 'polite');

        var empty = document.createElement('div');
        empty.className = 'tool-dir-empty';
        empty.hidden = true;
        var emptyText = document.createElement('p');
        emptyText.textContent = 'No STEM directory links match that filter.';
        var emptyReset = document.createElement('button');
        emptyReset.type = 'button';
        emptyReset.className = 'tool-clear-button';
        emptyReset.textContent = 'Show all ' + allItems.length + ' STEM links';
        empty.appendChild(emptyText);
        empty.appendChild(emptyReset);

        controls.appendChild(searchWrap);
        controls.appendChild(pills);
        controls.appendChild(status);
        countLine.insertAdjacentElement('afterend', controls);
        var jumpNav = section.querySelector('.tool-directory-jump');
        (jumpNav || controls).insertAdjacentElement('afterend', empty);

        function applyDirectoryFilter() {
            var query = input.value.trim().toLowerCase().replace(/\s+/g, ' ');
            var tokens = query ? query.split(' ') : [];
            var shown = 0;
            var groupCounts = Object.create(null);

            allItems.forEach(function (item) {
                var matchesAi = activeAi === 'all' || (activeAi === 'none' ? item.ai === 'none' : item.ai !== 'none');
                var matchesQuery = !tokens.length || tokens.every(function (t) { return tokenMatches(item.text, t); });
                var visible = matchesAi && matchesQuery;
                item.el.hidden = !visible;
                if (visible) {
                    shown++;
                    groupCounts[item.groupId] = (groupCounts[item.groupId] || 0) + 1;
                }
            });

            var visibleGroups = 0;
            groups.forEach(function (group) {
                var heading = group.querySelector('h3');
                var gid = heading ? heading.id : '';
                var hasItems = (groupCounts[gid] || 0) > 0;
                group.hidden = !hasItems;
                if (hasItems) visibleGroups++;
            });

            if (jumpNav) {
                var jumpLinks = jumpNav.querySelectorAll('a[href^="#"]');
                jumpLinks.forEach(function (a) {
                    var targetId = a.getAttribute('href').slice(1);
                    var li = a.closest('li');
                    if (li) li.hidden = (groupCounts[targetId] || 0) === 0;
                });
                jumpNav.hidden = visibleGroups === 0;
            }

            var isFiltered = Boolean(query) || activeAi !== 'all';
            clearBtn.hidden = !isFiltered;
            empty.hidden = shown > 0;
            if (!isFiltered) {
                status.textContent = 'Showing all ' + shown + ' shareable STEM links across ' + visibleGroups + ' areas.';
            } else {
                var scope = activeAi === 'none' ? ' no-AI' : (activeAi === 'optional' ? ' AI-optional' : '');
                status.textContent = 'Showing ' + shown + ' of ' + allItems.length + scope + ' STEM links across ' + visibleGroups + ' ' + (visibleGroups === 1 ? 'area' : 'areas') + '.';
            }
        }

        function resetDirectory() {
            input.value = '';
            activeAi = 'all';
            pillButtons.forEach(function (b) {
                var on = b.getAttribute('data-ai-filter') === 'all';
                b.classList.toggle('is-active', on);
                b.setAttribute('aria-pressed', String(on));
            });
            applyDirectoryFilter();
        }

        pillButtons.forEach(function (btn) {
            btn.addEventListener('click', function () {
                activeAi = btn.getAttribute('data-ai-filter') || 'all';
                pillButtons.forEach(function (b) {
                    var on = b === btn;
                    b.classList.toggle('is-active', on);
                    b.setAttribute('aria-pressed', String(on));
                });
                applyDirectoryFilter();
            });
        });

        input.addEventListener('input', applyDirectoryFilter);
        input.addEventListener('keydown', function (e) {
            if (e.isComposing || e.keyCode === 229) return;
            if (e.key === 'Escape' && input.value) {
                e.preventDefault();
                input.value = '';
                applyDirectoryFilter();
            }
        });
        clearBtn.addEventListener('click', function () { resetDirectory(); input.focus(); });
        emptyReset.addEventListener('click', function () { resetDirectory(); input.focus(); });
        applyDirectoryFilter();

        // Bridge the main #toolSearch bar to matching tools in the 152-tool STEM directory
        // so searches like "fractions" or "planets" never hit a dead-end "0 tools found" wall.
        var mainSearch = document.getElementById('toolSearch');
        var mainAi = document.getElementById('toolAi');
        var mainClear = document.getElementById('clearToolFilters');
        var resultsHeading = document.querySelector('.tool-results-heading');
        var mainResults = document.getElementById('toolResults');
        if (mainSearch && resultsHeading && !document.getElementById('toolStemBridge')) {
            var bridge = document.createElement('section');
            bridge.id = 'toolStemBridge';
            bridge.className = 'tool-stem-bridge';
            bridge.setAttribute('aria-label', 'Matching labs in the 152-tool STEM directory');
            bridge.hidden = true;

            var bridgeHeader = document.createElement('div');
            bridgeHeader.className = 'tool-stem-bridge-head';
            var bridgeTitle = document.createElement('p');
            bridgeTitle.className = 'tool-stem-bridge-title';
            var bridgeJump = document.createElement('button');
            bridgeJump.type = 'button';
            bridgeJump.className = 'tool-stem-bridge-jump';
            bridgeHeader.appendChild(bridgeTitle);
            bridgeHeader.appendChild(bridgeJump);

            var bridgeList = document.createElement('div');
            bridgeList.className = 'tool-stem-bridge-links';

            bridge.appendChild(bridgeHeader);
            bridge.appendChild(bridgeList);
            resultsHeading.insertAdjacentElement('afterend', bridge);

            function syncStemBridge() {
                var rawQ = mainSearch.value.trim();
                var normQ = rawQ.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
                var tokens = normQ ? normQ.split(/\s+/).filter(Boolean) : [];
                var aiFilter = mainAi ? mainAi.value : '';
                if (!tokens.length || aiFilter === 'required') {
                    bridge.hidden = true;
                    return;
                }
                var matches = allItems.filter(function (item) {
                    var aiOk = !aiFilter || (aiFilter === 'none' ? item.ai === 'none' : item.ai !== 'none');
                    return aiOk && tokens.every(function (t) { return tokenMatches(item.text, t); });
                });
                if (!matches.length) {
                    bridge.hidden = true;
                    return;
                }

                var topCount = mainResults ? mainResults.querySelectorAll('.tool-result-card').length : 0;
                var noun = matches.length === 1 ? 'interactive lab' : 'interactive labs';
                bridgeTitle.textContent = topCount === 0
                    ? ('Found ' + matches.length + ' matching ' + noun + ' in the ' + allItems.length + '-tool STEM Directory:')
                    : ('Also in the ' + allItems.length + '-tool STEM Directory: ' + matches.length + ' matching ' + noun);
                bridgeJump.textContent = 'Filter & jump to ' + (matches.length === 1 ? 'match' : 'all ' + matches.length) + ' in STEM Directory \u2193';

                bridgeList.replaceChildren();
                matches.slice(0, 4).forEach(function (item) {
                    var link = document.createElement('a');
                    link.className = 'tool-stem-bridge-chip';
                    link.href = item.aboutHref || item.href || '#directory-heading';
                    link.textContent = item.name;
                    bridgeList.appendChild(link);
                });
                bridge.hidden = false;
            }

            bridgeJump.addEventListener('click', function () {
                input.value = mainSearch.value.trim();
                var aiFilter = mainAi ? mainAi.value : '';
                activeAi = (aiFilter === 'none' || aiFilter === 'optional') ? aiFilter : 'all';
                pillButtons.forEach(function (b) {
                    var on = b.getAttribute('data-ai-filter') === activeAi;
                    b.classList.toggle('is-active', on);
                    b.setAttribute('aria-pressed', String(on));
                });
                applyDirectoryFilter();
                var heading = document.getElementById('directory-heading');
                var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
                if (heading && typeof heading.scrollIntoView === 'function') {
                    heading.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
                }
                input.focus({ preventScroll: true });
            });

            mainSearch.addEventListener('input', function () { setTimeout(syncStemBridge, 0); });
            mainSearch.addEventListener('keydown', function (e) {
                if (e.isComposing || e.keyCode === 229) return;
                if (e.key === 'Escape') setTimeout(syncStemBridge, 0);
            });
            if (mainAi) mainAi.addEventListener('change', function () { setTimeout(syncStemBridge, 0); });
            if (mainClear) mainClear.addEventListener('click', function () { setTimeout(syncStemBridge, 0); });
            resyncStemBridge = syncStemBridge;
            setTimeout(syncStemBridge, 0);
        }
    }

    function runEnhancements() {
        enhanceHostedAccessCard();
        enhanceToolDirectory();
        if (typeof resyncStemBridge === 'function') resyncStemBridge();
    }

    var script = document.createElement('script');
    script.src = 'tool-finder-core.js';
    script.async = false;
    script.addEventListener('load', function () {
        runEnhancements();
    }, { once: true });
    document.head.appendChild(script);
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', runEnhancements, { once: true });
    else runEnhancements();
})();
