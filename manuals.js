(function () {
    'use strict';

    const controls = document.querySelector('[data-manual-controls]');
    const search = document.querySelector('[data-manual-search]');
    const status = document.querySelector('[data-manual-status]');
    const cards = Array.from(document.querySelectorAll('[data-manual-card]'));
    const groups = Array.from(document.querySelectorAll('[data-manual-group]'));
    const filters = Array.from(document.querySelectorAll('[data-manual-filter]'));

    if (!controls || !search || !status || cards.length === 0) return;

    let activeAudience = 'all';

    const resetButton = document.createElement('button');
    resetButton.type = 'button';
    resetButton.className = 'manual-reset-btn';
    resetButton.textContent = 'Reset search & filters';
    resetButton.setAttribute('data-manual-reset', 'true');
    resetButton.hidden = true;
    if (status.parentNode) {
        status.parentNode.insertBefore(resetButton, status.nextSibling);
    }

    function normalize(value) {
        return String(value || '').toLocaleLowerCase().replace(/\s+/g, ' ').trim();
    }

    function syncUrl() {
        if (!window.history || typeof window.history.replaceState !== 'function' || typeof URLSearchParams !== 'function') return;
        try {
            const params = new URLSearchParams(window.location.search || '');
            const q = search.value.trim();
            if (q) params.set('q', q); else params.delete('q');
            if (activeAudience && activeAudience !== 'all') params.set('audience', activeAudience); else params.delete('audience');
            const qs = params.toString();
            window.history.replaceState(null, '', window.location.pathname + (qs ? '?' + qs : '') + (window.location.hash || ''));
        } catch (_) {}
    }

    function applyInitialQuery() {
        if (typeof URLSearchParams !== 'function') return;
        try {
            const params = new URLSearchParams(window.location.search || '');
            const q = params.get('q');
            if (q) search.value = String(q).slice(0, 120);
            const aud = normalize(params.get('audience'));
            const matchingBtn = aud ? filters.find(function (b) { return normalize(b.dataset.manualFilter) === aud; }) : null;
            if (matchingBtn) {
                activeAudience = matchingBtn.dataset.manualFilter;
                filters.forEach(function (candidate) {
                    candidate.setAttribute('aria-pressed', String(candidate === matchingBtn));
                });
            }
        } catch (_) {}
    }

    function update(skipUrlSync) {
        const query = normalize(search.value);
        const queryTokens = query.split(' ').filter(Boolean);
        let visibleCount = 0;

        cards.forEach(function (card) {
            const audiences = normalize(card.dataset.audience).split(' ');
            const searchable = normalize(card.textContent + ' ' + (card.dataset.keywords || ''));
            const audienceMatch = activeAudience === 'all' || audiences.includes(activeAudience);
            const queryMatch = queryTokens.every(function (token) { return searchable.includes(token); });
            const visible = audienceMatch && queryMatch;
            card.hidden = !visible;
            if (visible) visibleCount += 1;
        });

        groups.forEach(function (group) {
            group.hidden = !group.querySelector('[data-manual-card]:not([hidden])');
        });

        resetButton.hidden = activeAudience === 'all' && query === '';

        const audienceLabel = activeAudience === 'all'
            ? 'all audiences'
            : filters.find(function (button) { return button.dataset.manualFilter === activeAudience; }).textContent;
        status.textContent = visibleCount === 0
            ? 'No guides match that search. Use Reset search & filters or choose another audience.'
            : 'Showing ' + visibleCount + ' of ' + cards.length + ' guides for ' + audienceLabel + '.';
        if (!skipUrlSync) syncUrl();
    }

    filters.forEach(function (button) {
        button.addEventListener('click', function () {
            activeAudience = button.dataset.manualFilter;
            filters.forEach(function (candidate) {
                candidate.setAttribute('aria-pressed', String(candidate === button));
            });
            update(false);
        });
    });

    resetButton.addEventListener('click', function () {
        activeAudience = 'all';
        search.value = '';
        filters.forEach(function (candidate) {
            candidate.setAttribute('aria-pressed', String(candidate.dataset.manualFilter === 'all'));
        });
        update(false);
        search.focus();
    });

    search.addEventListener('input', function () { update(false); });
    search.addEventListener('keydown', function (event) {
        if (event.isComposing || event.keyCode === 229) return;
        if (event.key === 'Escape' && search.value) {
            event.preventDefault();
            search.value = '';
            update(false);
        }
    });
    controls.hidden = false;
    applyInitialQuery();
    update(true);

    const backBtn = document.querySelector('.back-to-top');
    if (backBtn) {
        const syncBackBtn = function () {
            backBtn.classList.toggle('visible', window.scrollY > 500);
        };
        window.addEventListener('scroll', syncBackBtn, { passive: true });
        syncBackBtn();
    }
}());
