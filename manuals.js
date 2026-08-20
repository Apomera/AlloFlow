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

    function normalize(value) {
        return String(value || '').toLocaleLowerCase().replace(/\s+/g, ' ').trim();
    }

    function update() {
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

        const audienceLabel = activeAudience === 'all'
            ? 'all audiences'
            : filters.find(function (button) { return button.dataset.manualFilter === activeAudience; }).textContent;
        status.textContent = visibleCount === 0
            ? 'No guides match that search. Clear the search or choose another audience.'
            : 'Showing ' + visibleCount + ' of ' + cards.length + ' guides for ' + audienceLabel + '.';
    }

    filters.forEach(function (button) {
        button.addEventListener('click', function () {
            activeAudience = button.dataset.manualFilter;
            filters.forEach(function (candidate) {
                candidate.setAttribute('aria-pressed', String(candidate === button));
            });
            update();
        });
    });

    search.addEventListener('input', update);
    controls.hidden = false;
    update();
}());
