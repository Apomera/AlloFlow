(function () {
    'use strict';

    var tools = Array.isArray(window.ALLOFLOW_PUBLIC_TOOLS) ? window.ALLOFLOW_PUBLIC_TOOLS : [];
    if (!tools.some(function (tool) { return tool.id === 'photosynthesis'; })) {
        tools.push({
            id: 'photosynthesis', name: 'Photosynthesis & Plant Science', icon: '🌱',
            summary: 'Explore how plants use light, water, and carbon dioxide to produce sugars and release oxygen.',
            category: 'STEM', audiences: ['Students', 'Educators'], subjects: ['Biology', 'Plant science'],
            grades: ['Elementary', 'Middle school'], source: 'none', ai: 'optional',
            access: ['gemini', 'desktop', 'byok'], location: 'STEM Lab → Life Science & Genetics',
            tags: ['photosynthesis', 'plants', 'chloroplast', 'sunlight', 'carbon dioxide', 'oxygen', 'teach', 'learn', 'activity'],
            featured: true, detailHref: 'features.html#stem'
        });
    }
    tools.forEach(function (tool) {
        tool.tags = (tool.tags || []).concat(['teach', 'learn', 'activity']);
        if (tool.ai === 'required') tool.tags = tool.tags.concat(['create', 'make', 'generate']);
        if (tool.id === 'exitTicket') tool.tags = tool.tags.concat(['article', 'passage', 'source text', 'from', 'an']);
        if (['a11yAuditor', 'accessLens', 'documentRemediation'].indexOf(tool.id) !== -1) {
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
            launch.href = 'https://alloflow-cdn.pages.dev/app/';
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

    var originalAddEventListener = document.addEventListener.bind(document);
    document.addEventListener = function (type, listener, options) {
        if (type === 'DOMContentLoaded' && document.readyState !== 'loading') {
            window.setTimeout(function () { listener.call(document, new Event('DOMContentLoaded')); }, 0);
            return;
        }
        return originalAddEventListener(type, listener, options);
    };

    var script = document.createElement('script');
    script.src = 'tool-finder-core.js';
    script.async = false;
    script.addEventListener('load', function () {
        document.addEventListener = originalAddEventListener;
        enhanceHostedAccessCard();
    }, { once: true });
    document.head.appendChild(script);
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', enhanceHostedAccessCard, { once: true });
    else enhanceHostedAccessCard();
})();
