/* Search Module */
const Search = {
    render(container) {
        container.innerHTML = `
        <div class="page-header"><h1>Search</h1><p>Instantly search across all study content, questions, and flashcards</p></div>
        <div class="search-input-wrap">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input type="text" class="search-input" id="search-input" placeholder="Search topics, questions, flashcards..." autofocus>
        </div>
        <div id="search-results" class="search-results"></div>`;

        const input = document.getElementById('search-input');
        let debounce;
        input.addEventListener('input', () => {
            clearTimeout(debounce);
            debounce = setTimeout(() => this.doSearch(input.value.trim()), 200);
        });
    },

    doSearch(query) {
        const el = document.getElementById('search-results');
        if (!query || query.length < 2) { el.innerHTML = ''; return; }

        const results = [];
        const q = query.toLowerCase();

        // Search topics
        EPPPData.domains.forEach(d => {
            d.topics.forEach((t, ti) => {
                if (t.title.toLowerCase().includes(q) || t.summary.toLowerCase().includes(q)) {
                    const idx = t.summary.toLowerCase().indexOf(q);
                    const snippet = idx >= 0 ? '...' + t.summary.substring(Math.max(0,idx-40), idx+80) + '...' : t.summary.substring(0,100) + '...';
                    results.push({type:'Study', title: t.title, domain: d, snippet, action: () => App.navigateTo('study',{domainId:d.id,topicIdx:ti})});
                }
            });
        });

        // Search questions
        EPPPData.domains.forEach(d => {
            d.questions.forEach(question => {
                if (question.q.toLowerCase().includes(q) || question.rationale.toLowerCase().includes(q)) {
                    results.push({type:'Question', title: question.q.substring(0,80)+'...', domain: d,
                        snippet: question.rationale.substring(0,100)+'...',
                        action: () => App.navigateTo('quiz',{domainId:d.id})});
                }
            });
        });

        // Search flashcards
        EPPPData.domains.forEach(d => {
            d.flashcards.forEach(fc => {
                if (fc.front.toLowerCase().includes(q) || fc.back.toLowerCase().includes(q)) {
                    results.push({type:'Flashcard', title: fc.front, domain: d,
                        snippet: fc.back.substring(0,100)+'...',
                        action: () => App.navigateTo('flashcards',{domainId:d.id})});
                }
            });
        });

        if (results.length === 0) {
            el.innerHTML = `<div class="empty-state" style="padding:2rem;">
                <h3>No results found</h3><p>Try different keywords or check spelling.</p>
            </div>`;
            return;
        }

        el.innerHTML = results.slice(0, 20).map(r => {
            const highlighted = r.snippet.replace(new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'), '<mark>$1</mark>');
            return `<div class="card search-result-item" data-idx="${results.indexOf(r)}">
                <div class="flex items-center gap-05 search-result-type">
                    <span class="badge badge-info">${r.type}</span>
                    <span class="badge" style="background:${r.domain.color}22;color:${r.domain.color}">${r.domain.name}</span>
                </div>
                <div class="search-result-title">${r.title}</div>
                <div class="search-result-snippet">${highlighted}</div>
            </div>`;
        }).join('');

        el.querySelectorAll('.search-result-item').forEach(item => {
            item.addEventListener('click', () => {
                const r = results[parseInt(item.dataset.idx)];
                if (r && r.action) r.action();
            });
        });
    }
};
